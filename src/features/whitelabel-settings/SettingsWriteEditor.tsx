import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import { Dialog } from '../../components/ui/Dialog'
import { OutlineButton } from '../../components/ui/OutlineButton'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { useUnsavedChangesGuard } from '../../app/useUnsavedChangesGuard'
import { getSessionVersion, subscribeSession, useSessionOperator } from '../../lib/authSession'
import type { SettingsRead } from './settingsReadApi'
import { beginNextSettingsWrite, executeSettingsWrite, getSettingsWriteAttempt, reconcileSettingsWrite, settingsWriteKey, settingsWriteLocked, subscribeSettingsWrites, type SettingsWriteAttempt } from './settingsWriteClient'
import { canWriteSettings, isSettingsField, normalizeSettingValue, sameSetting, settingsFieldLabel, settingsFieldValue, settingsTextLimit, type SettingsField, type SettingValue } from './settingsWriteContract'
import styles from './SettingsWriteEditor.module.css'

/** Empty until the separate live-persistence acceptance gate releases explicit fields. */
export type SettingsWriteEditorProps = { id: string; data: SettingsRead; onReload: () => void; releasedFields?: readonly SettingsField[] }
function useAttempt(id: string, field: SettingsField, version: number) {
  const [, update] = useState(0)
  useEffect(() => subscribeSettingsWrites(() => update(n => n + 1)), [])
  return getSettingsWriteAttempt(settingsWriteKey(id, field), version)
}
const busy = (a: SettingsWriteAttempt | null) => !!a && ['checking', 'sending', 'reconciling'].includes(a.phase)
const verified = (a: SettingsWriteAttempt | null) => !!a && ['confirmed', 'readback_matches'].includes(a.phase)
const statusMessage = (a: SettingsWriteAttempt) => ({
  checking: 'Conferindo o valor atual antes de enviar.', sending: 'Solicitação enviada uma vez. Aguarde a leitura de confirmação.',
  reconciling: 'Consultando o valor persistido, sem repetir a gravação.', confirmed: 'HTTP 200 e valor confirmado pela leitura autoritativa.',
  readback_matches: 'A leitura confirma o valor esperado. A resposta de gravação não foi confirmada integralmente; não houve reenvio.',
  uncertain: 'Resultado incerto. Não salve novamente. Consulte o resultado por GET antes de qualquer nova alteração.',
  rejected: 'A alteração não foi confirmada. Revise o contexto e os campos antes de preparar uma nova solicitação.',
  stale: 'O valor mudou desde a abertura. Feche, atualize a leitura e prepare novamente; nada foi enviado.',
})[a.phase]

export function SettingsWriteEditor({ id, data, onReload, releasedFields = [] }: SettingsWriteEditorProps) {
  const operator = useSessionOperator()
  const version = useSyncExternalStore(subscribeSession, getSessionVersion, () => 0)
  const fields = releasedFields.filter(isSettingsField)
  // A keyed child cannot transfer a draft across tenants or replacement sessions.
  if (!canWriteSettings(operator?.roles) || data.id !== id || fields.length === 0) return null
  return <ReleasedEditor key={`${id}:${version}`} id={id} data={data} version={version} fields={fields} onReload={onReload} />
}
function ReleasedEditor({ id, data, version, fields, onReload }: { id: string; data: SettingsRead; version: number; fields: SettingsField[]; onReload: () => void }) {
  const [selected, setSelected] = useState<SettingsField>(fields[0])
  const [open, setOpen] = useState(false)
  const field = fields.includes(selected) ? selected : fields[0]
  const attempt = useAttempt(id, field, version)
  const selectId = useId()
  function openEditor() {
    if (verified(attempt)) beginNextSettingsWrite(id, field, version, fields)
    setOpen(true)
  }
  return <section className={styles.section} aria-label="Edição de configuração qualificada">
    <p>Uma configuração por solicitação. O servidor permanece responsável por autenticação e autorização.</p>
    <div className={styles.row}>
      <label htmlFor={selectId}>Configuração</label>
      <select id={selectId} value={field} onChange={e => { if (isSettingsField(e.target.value)) setSelected(e.target.value) }}>
        {fields.map(f => <option key={f} value={f}>{settingsFieldLabel(f)}</option>)}
      </select>
      <OutlineButton onClick={openEditor}>{settingsWriteLocked(attempt) && !verified(attempt) ? 'Consultar resultado' : 'Editar configuração'}</OutlineButton>
    </div>
    {attempt && !open && <p role="status">{statusMessage(attempt)}</p>}
    {open && <SettingDraft key={field} id={id} data={data} field={field} version={version} fields={fields} onClose={() => setOpen(false)} onReload={onReload} />}
  </section>
}
function initialValue(data: SettingsRead, field: SettingsField): SettingValue {
  const current = settingsFieldValue(data, field)
  if (field.startsWith('features.')) return current.state === 'value' && typeof current.value === 'boolean' ? current.value : false
  if (field === 'login.bullets') return Array.from({ length: 3 }, (_, i) => current.state === 'value' && Array.isArray(current.value) ? current.value[i] ?? '' : '')
  return current.state === 'value' && typeof current.value === 'string' ? current.value : ''
}
function SettingDraft({ id, data, field, version, fields, onClose, onReload }: { id: string; data: SettingsRead; field: SettingsField; version: number; fields: SettingsField[]; onClose: () => void; onReload: () => void }) {
  const [baseline] = useState(() => settingsFieldValue(data, field))
  const [initial] = useState(() => initialValue(data, field))
  const [value, setValue] = useState<SettingValue>(initial)
  const [review, setReview] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)
  const [discard, setDiscard] = useState(false)
  const [error, setError] = useState(false)
  const attempt = useAttempt(id, field, version)
  const pendingWrite = busy(attempt), locked = settingsWriteLocked(attempt)
  const phase = attempt?.phase
  const dirty = JSON.stringify(value) !== JSON.stringify(initial)
  const guard = useUnsavedChangesGuard(dirty && !verified(attempt), onClose)
  const controller = useRef<AbortController | null>(null)
  const reload = useRef(onReload)
  const inputId = useId(), hintId = useId(), errorId = useId()
  let normalized: SettingValue | null = null
  try { normalized = normalizeSettingValue(field, value) } catch { /* Validation is shown without reflecting server text. */ }
  const changed = normalized !== null && !sameSetting(baseline, { state: 'value', value: normalized })
  useEffect(() => { reload.current = onReload }, [onReload])
  useEffect(() => { if (phase === 'confirmed' || phase === 'readback_matches') reload.current() }, [phase])
  useEffect(() => () => controller.current?.abort(), [])
  function close() { if (pendingWrite) return; if (dirty && !verified(attempt)) setDiscard(true); else onClose() }
  async function submit() {
    if (locked || normalized === null || !changed || !acknowledged || !review) return
    setError(false)
    controller.current = new AbortController()
    try { await executeSettingsWrite({ tenantId: id, field, baseline, value: normalized }, version, controller.current.signal, fields) }
    catch { setError(true) }
  }
  async function reconcile() { try { await reconcileSettingsWrite(id, field, version, fields) } catch { setError(true) } }
  return <>
    <Dialog title={settingsFieldLabel(field)} description={`Whitelabel ${id}. Alteração isolada, confirmada por uma nova leitura.`} onClose={close} footer={<>
      <OutlineButton onClick={close} disabled={pendingWrite}>{verified(attempt) ? 'Concluir' : 'Cancelar'}</OutlineButton>
      {attempt?.phase === 'uncertain' && attempt.version === version && <OutlineButton onClick={() => { void reconcile() }}>Consultar por GET</OutlineButton>}
      {!locked && !review && <PrimaryButton disabled={normalized === null || !changed} onClick={() => { setReview(true); setAcknowledged(false) }}>Revisar alteração</PrimaryButton>}
      {!locked && review && <PrimaryButton disabled={!acknowledged || normalized === null || !changed} onClick={() => { void submit() }}>Confirmar e salvar uma vez</PrimaryButton>}
    </>}>
      <div className={styles.content}>
        <p id={hintId}>Não altera outras configurações. Não publica Termos nem executa ações financeiras.</p>
        <p className={styles.notice}>{baseline.state === 'missing' ? 'Valor ausente. Salvar cria uma configuração própria do tenant; esta API não oferece apagar ou restaurar herança.' : baseline.state === 'null' ? 'Valor nulo explícito. Salvar o substitui por um valor próprio; não há comando de reset nesta interface.' : 'A leitura contém o valor efetivo. Não há reset ou troca automática para o padrão.'}</p>
        <fieldset className={styles.fields} disabled={locked || review} aria-describedby={`${hintId}${normalized === null ? ` ${errorId}` : ''}`}>
          <legend>Novo valor</legend>
          {typeof value === 'boolean' ? <label htmlFor={inputId}><input id={inputId} type="checkbox" checked={value} onChange={e => setValue(e.target.checked)} /> {value ? 'Habilitado' : 'Desabilitado'}</label> : Array.isArray(value) ? value.map((v, index) => <label key={index} htmlFor={`${inputId}-${index}`}>Destaque {index + 1}<input id={`${inputId}-${index}`} value={v} onChange={e => setValue(value.map((item, i) => i === index ? e.target.value : item))} maxLength={settingsTextLimit(field)} aria-invalid={normalized === null} /></label>) : <label htmlFor={inputId}>{settingsFieldLabel(field)}<input id={inputId} value={value} onChange={e => setValue(e.target.value)} maxLength={settingsTextLimit(field)} aria-invalid={normalized === null} /></label>}
        </fieldset>
        {normalized === null && <p id={errorId} role="alert">Preencha os textos sem HTML, credenciais ou caracteres de controle, dentro do limite. São necessários três destaques completos.</p>}
        {review && !locked && <div className={styles.review}><p>Será enviado somente <code>{field}</code> para o Whitelabel {id}. O valor será conferido novamente antes do envio.</p><label><input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} /> Confirmo esta alteração para este tenant.</label><OutlineButton onClick={() => setReview(false)}>Voltar à edição</OutlineButton></div>}
        {attempt && <div role="status" aria-live="polite"><p>{statusMessage(attempt)}</p>{attempt.status !== undefined && <p>HTTP {attempt.status || 'sem resposta'}</p>}{attempt.correlationId && <p className={styles.meta}>Referência: {attempt.correlationId}</p>}</div>}
        {error && <p role="alert">Não foi possível concluir esta etapa. Nenhuma solicitação é reenviada automaticamente.</p>}
      </div>
    </Dialog>
    {(discard || guard.pending) && <Dialog title="Descartar alteração?" description="O rascunho local ainda não foi confirmado." tone="warning" onClose={() => { setDiscard(false); guard.stay() }} footer={<><OutlineButton onClick={() => { setDiscard(false); guard.stay() }}>Continuar editando</OutlineButton><PrimaryButton onClick={() => { if (guard.pending) guard.discardAndContinue(); else onClose() }}>Descartar rascunho</PrimaryButton></>}><p>O descarte afeta somente o rascunho. Ele não desfaz uma solicitação já enviada.</p></Dialog>}
  </>
}
