import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import { Dialog } from '../../components/ui/Dialog'
import { OutlineButton } from '../../components/ui/OutlineButton'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { useUnsavedChangesGuard } from '../../app/useUnsavedChangesGuard'
import { getSessionVersion, subscribeSession, useSessionOperator } from '../../lib/authSession'
import { getSettingsRead, type SettingsRead } from './settingsReadApi'
import { beginNextSettingsWrite, executeSettingsWrite, executeSettingsReset, getSettingsWriteAttempt, reconcileSettingsWrite, settingsWriteKey, settingsWriteLocked, subscribeSettingsWrites, type SettingsWriteAttempt } from './settingsWriteClient'
import { canWriteSettings, isSettingsField, normalizeSettingValue, settingsFieldLabel, settingsFieldValue, settingsFieldBaseline, settingsTextLimit, type SettingsField, type SettingValue } from './settingsWriteContract'
import styles from './SettingsWriteEditor.module.css'

/** The caller supplies only qualified SET-01 fields; provenance is also required for each editable cell. */
export type SettingsWriteEditorProps = { id: string; data: SettingsRead; onReload: () => void; releasedFields?: readonly SettingsField[] }
function useAttempt(id: string, field: SettingsField, version: number) {
  const [, update] = useState(0)
  useEffect(() => subscribeSettingsWrites(() => update(n => n + 1)), [])
  return getSettingsWriteAttempt(settingsWriteKey(id, field), version)
}
const busy = (a: SettingsWriteAttempt | null) => !!a && ['checking', 'sending', 'reconciling'].includes(a.phase)
const verified = (a: SettingsWriteAttempt | null) => a?.phase === 'confirmed'
const statusMessage = (a: SettingsWriteAttempt) => ({
  checking: 'Conferindo o valor atual antes de enviar.', sending: 'Solicitação enviada uma vez. Aguarde a leitura de confirmação.',
  reconciling: 'Consultando o valor persistido, sem repetir a gravação.', confirmed: 'HTTP 200 e valor confirmado pela leitura autoritativa.',
  readback_matches: 'A leitura corresponde ao esperado, mas a resposta não foi confirmada. O resultado permanece pendente; outras gravações ficam bloqueadas e não houve reenvio.',
  uncertain: 'Resultado incerto. Não salve novamente. Consulte o resultado por GET antes de qualquer nova alteração.',
  rejected: 'A alteração não foi confirmada. Revise o contexto e os campos antes de preparar uma nova solicitação.',
  stale: 'O valor mudou desde a abertura. Feche, atualize a leitura e prepare novamente; nada foi enviado.',
})[a.phase]

export function SettingsWriteEditor({ id, data, onReload, releasedFields = [] }: SettingsWriteEditorProps) {
  const operator = useSessionOperator()
  const version = useSyncExternalStore(subscribeSession, getSessionVersion, () => 0)
  const fields = releasedFields.filter(field => isSettingsField(field) && !!data.provenance[field])
  // A keyed child cannot transfer a draft across tenants or replacement sessions.
  if (!canWriteSettings(operator?.roles) || data.id !== id || fields.length === 0) return null
  return <ReleasedEditor key={`${id}:${version}`} id={id} data={data} version={version} fields={fields} onReload={onReload} />
}
function ReleasedEditor({ id, data, version, fields, onReload }: { id: string; data: SettingsRead; version: number; fields: SettingsField[]; onReload: () => void }) {
  const [selected, setSelected] = useState<SettingsField>(fields[0])
  const [open, setOpen] = useState(false)
  const [operation, setOperation] = useState<'save' | 'reset'>('save')
  const field = fields.includes(selected) ? selected : fields[0]
  const attempt = useAttempt(id, field, version)
  const selectId = useId()
  function openEditor(next: 'save' | 'reset') {
    if (verified(attempt)) beginNextSettingsWrite(id, field, version, fields)
    setOperation(next)
    setOpen(true)
  }
  return <section className={styles.section} aria-label="Edição de configuração qualificada">
    <h2>Editar textos e funcionalidades</h2>
    <p>Uma configuração por solicitação. A conferência por GET e o bloqueio local reduzem conflitos, sem travamento atômico no servidor.</p>
    <div className={styles.row}>
      <label htmlFor={selectId}>Configuração</label>
      <select id={selectId} value={field} onChange={e => { if (isSettingsField(e.target.value)) setSelected(e.target.value) }}>
        {fields.map(f => <option key={f} value={f}>{settingsFieldLabel(f)}</option>)}
      </select>
      <OutlineButton onClick={() => openEditor('save')}>{settingsWriteLocked(attempt) && !verified(attempt) ? 'Consultar resultado' : 'Editar configuração'}</OutlineButton>
      <OutlineButton onClick={() => openEditor('reset')} disabled={!data.provenance[field]?.stored || settingsWriteLocked(attempt) && !verified(attempt)}>Remover substituição</OutlineButton>
    </div>
    {attempt && !open && <p role="status">{statusMessage(attempt)}</p>}
    {open && <SettingDraft key={`${field}:${operation}`} id={id} data={data} field={field} operation={operation} version={version} fields={fields} onClose={() => setOpen(false)} onReload={onReload} />}
  </section>
}
function initialValue(data: SettingsRead, field: SettingsField): SettingValue {
  const provenance = data.provenance[field]
  const current = provenance?.stored ? provenance.storedValue === null ? { state: 'null' as const } : { state: 'value' as const, value: provenance.storedValue } : settingsFieldValue(data, field)
  if (field.startsWith('features.')) return current.state === 'value' && typeof current.value === 'boolean' ? current.value : false
  if (field === 'login.bullets') return Array.from({ length: 3 }, (_, i) => current.state === 'value' && Array.isArray(current.value) ? current.value[i] ?? '' : '')
  return current.state === 'value' && typeof current.value === 'string' ? current.value : ''
}
function SettingDraft({ id, data, field, operation, version, fields, onClose, onReload }: { id: string; data: SettingsRead; field: SettingsField; operation: 'save' | 'reset'; version: number; fields: SettingsField[]; onClose: () => void; onReload: () => void }) {
  const [baseline, setBaseline] = useState(() => settingsFieldBaseline(data, field))
  const [initial] = useState(() => initialValue(data, field))
  const [value, setValue] = useState<SettingValue>(initial)
  const [discard, setDiscard] = useState(false)
  const [error, setError] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [referenceUpdated, setReferenceUpdated] = useState(false)
  const attempt = useAttempt(id, field, version)
  const pendingWrite = busy(attempt) || refreshing, locked = settingsWriteLocked(attempt)
  const dirty = operation === 'save' && JSON.stringify(value) !== JSON.stringify(initial)
  const guard = useUnsavedChangesGuard(pendingWrite || dirty && !verified(attempt), onClose)
  const controller = useRef<AbortController | null>(null)
  const inputId = useId(), hintId = useId(), errorId = useId()
  let normalized: SettingValue | null = null
  try { normalized = normalizeSettingValue(field, value) } catch { /* Validation is shown without reflecting server text. */ }
  const changed = operation === 'reset' ? baseline.provenance.stored : normalized !== null && (!baseline.provenance.stored || JSON.stringify(baseline.provenance.storedValue) !== JSON.stringify(normalized))
  useEffect(() => { if (attempt?.phase === 'stale') setReferenceUpdated(false) }, [attempt])
  useEffect(() => () => controller.current?.abort(), [])
  function close() { if (pendingWrite) return; if (dirty && !locked) setDiscard(true); else { onClose(); if (verified(attempt)) onReload() } }
  async function submit() {
    if (locked || pendingWrite || attempt?.phase === 'stale' && !referenceUpdated || operation === 'save' && normalized === null || !changed) return
    setError(false)
    setReferenceUpdated(false)
    controller.current = new AbortController()
    try { if (operation === 'reset') await executeSettingsReset({ tenantId: id, field, baseline }, version, controller.current.signal, fields)
      else await executeSettingsWrite({ tenantId: id, field, baseline, value: normalized! }, version, controller.current.signal, fields) }
    catch { setError(true) }
  }
  async function reconcile() { try { await reconcileSettingsWrite(id, field, version, fields) } catch { setError(true) } }
  async function refreshBaseline() {
    if (pendingWrite) return
    setError(false)
    setRefreshing(true)
    controller.current = new AbortController()
    try {
      const fresh = await getSettingsRead(id, controller.current.signal)
      if (getSessionVersion() !== version || controller.current.signal.aborted) return
      setBaseline(settingsFieldBaseline(fresh, field))
      setReferenceUpdated(true)
    } catch { setError(true) }
    finally { setRefreshing(false) }
  }
  return <>
    <Dialog title={settingsFieldLabel(field)} description={`Whitelabel ${id}. Alteração isolada, confirmada por uma nova leitura.`} onClose={close} footer={<>
      <OutlineButton onClick={close} disabled={pendingWrite}>{verified(attempt) ? 'Concluir' : 'Cancelar'}</OutlineButton>
      {['uncertain', 'readback_matches'].includes(attempt?.phase ?? '') && attempt?.version === version && <OutlineButton onClick={() => { void reconcile() }}>Consultar por GET</OutlineButton>}
      {attempt?.phase === 'stale' && <OutlineButton disabled={pendingWrite} onClick={() => { void refreshBaseline() }}>Recarregar referência e preservar rascunho</OutlineButton>}
      {!locked && <PrimaryButton disabled={pendingWrite || attempt?.phase === 'stale' && !referenceUpdated || operation === 'save' && normalized === null || !changed} onClick={() => { void submit() }}>{operation === 'reset' ? 'Confirmar remoção da substituição' : 'Salvar esta configuração'}</PrimaryButton>}
    </>}>
      <div className={styles.content}>
        <p id={hintId}>Não altera outras configurações. Não publica Termos nem executa ações financeiras.</p>
        <p className={styles.notice}>{baseline.provenance.stored ? 'Existe uma substituição armazenada para este Whitelabel.' : baseline.provenance.source === 'default' ? 'Valor herdado do padrão. Salvar cria uma substituição própria.' : 'Sem valor armazenado nem padrão informado. Salvar cria uma substituição própria.'} {operation === 'reset' ? 'Esta ação remove a substituição por DELETE; o valor efetivo passa a ser o padrão informado pelo servidor, ou ausente.' : 'Remover a substituição permite voltar à origem padrão ou ausente, sem gravar uma cópia do padrão.'}</p>
        {operation === 'save' && <fieldset className={styles.fields} disabled={locked || refreshing} aria-describedby={`${hintId}${normalized === null ? ` ${errorId}` : ''}`}>
          <legend>Novo valor</legend>
          {typeof value === 'boolean' ? <label htmlFor={inputId}><input id={inputId} type="checkbox" checked={value} onChange={e => setValue(e.target.checked)} /> {value ? 'Habilitado' : 'Desabilitado'}</label> : Array.isArray(value) ? value.map((v, index) => <label key={index} htmlFor={`${inputId}-${index}`}>Destaque {index + 1}<input id={`${inputId}-${index}`} value={v} onChange={e => setValue(value.map((item, i) => i === index ? e.target.value : item))} maxLength={settingsTextLimit(field)} aria-invalid={normalized === null} /></label>) : <label htmlFor={inputId}>{settingsFieldLabel(field)}<input id={inputId} value={value} onChange={e => setValue(e.target.value)} maxLength={settingsTextLimit(field)} aria-invalid={normalized === null} /></label>}
        </fieldset>}
        {operation === 'save' && normalized === null && <p id={errorId} role="alert">Preencha os textos sem HTML, credenciais ou caracteres de controle, dentro do limite. São necessários três destaques completos.</p>}
        <p>Será enviada somente a configuração <code>{field}</code> do Whitelabel {id}, após nova conferência autoritativa.</p>
        {refreshing && <p role="status">Recarregando referência sem alterar o rascunho…</p>}
        {referenceUpdated && <p role="status">Referência atualizada. Revise o rascunho preservado antes de salvar.</p>}
        {attempt && <div role="status" aria-live="polite"><p>{statusMessage(attempt)}</p>{attempt.operation === 'reset' && attempt.deleted !== undefined && <p>{attempt.deleted ? 'A substituição foi removida.' : 'Nenhuma substituição existia para remover (deleted: false).'}</p>}{attempt.status !== undefined && <p>HTTP {attempt.status || 'sem resposta'}</p>}{attempt.correlationId && <p className={styles.meta}>Referência: {attempt.correlationId}</p>}</div>}
        {error && <p role="alert">Não foi possível concluir esta etapa. Nenhuma solicitação é reenviada automaticamente.</p>}
      </div>
    </Dialog>
    {(discard || guard.pending) && <Dialog title="Descartar alteração?" description="O rascunho local ainda não foi confirmado." tone="warning" onClose={() => { setDiscard(false); guard.stay() }} footer={<><OutlineButton onClick={() => { setDiscard(false); guard.stay() }}>Continuar editando</OutlineButton><PrimaryButton disabled={pendingWrite} onClick={() => { if (pendingWrite) return; if (guard.pending) guard.discardAndContinue(); else onClose() }}>Descartar rascunho</PrimaryButton></>}><p>O descarte afeta somente o rascunho. Ele não desfaz uma solicitação já enviada. Durante o envio, aguarde a conclusão antes de sair.</p></Dialog>}
  </>
}
