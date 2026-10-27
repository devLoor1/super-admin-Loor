import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import { Dialog } from '../../components/ui/Dialog'
import { OutlineButton } from '../../components/ui/OutlineButton'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { useUnsavedChangesGuard } from '../../app/useUnsavedChangesGuard'
import { getSessionVersion, subscribeSession, useSessionOperator } from '../../lib/authSession'
import { getSmtpRead, type SmtpSaved } from './smtpReadApi'
import { canWriteSmtp, rebaseSmtpDraft, smtpChanges, smtpMetadata, type SmtpMetadata, type SmtpMetadataField, type SmtpPatch } from './smtpWriteContract'
import { beginNextSmtpWrite, executeSmtpWrite, getSmtpWriteAttempt, reconcileSmtpWrite, smtpWriteBusy, smtpWriteLocked, smtpWriteVerified, subscribeSmtpWrites, type SmtpWriteAttempt } from './smtpWriteClient'
import styles from './SmtpMetadataEditor.module.css'

const labels: Record<SmtpMetadataField, string> = { host: 'Host', port: 'Porta', secure: 'Conexão segura (secure)', fromEmail: 'E-mail do remetente', fromName: 'Nome do remetente', tlsRejectUnauthorized: 'Verificar certificado TLS', active: 'Servidor próprio ativo' }
const messages: Record<SmtpWriteAttempt['phase'], string> = {
  checking: 'Conferindo o registro atual antes de enviar.', sending: 'PATCH enviado uma vez. Aguarde a confirmação.', reconciling: 'Consultando o estado por GET, sem reenviar a alteração.',
  confirmed: 'HTTP 200 e metadados confirmados pela leitura autoritativa.', readback_matches: 'A leitura coincide com os metadados esperados, mas não confirma integralmente o resultado do PATCH. A operação permanece pendente; não envie outra alteração.',
  stale: 'O registro mudou. Nada foi enviado. Seu rascunho foi preservado; atualize a leitura e revise os valores atuais.', rejected: 'A alteração não foi confirmada. Revise a configuração antes de uma nova solicitação.',
  uncertain: 'Resultado incerto. Não envie outra alteração. Uma leitura sem mudança não prova que o PATCH anterior não poderá concluir.',
}
function useAttempt(id: string, session: number) {
  const [, refresh] = useState(0)
  useEffect(() => subscribeSmtpWrites(() => refresh(n => n + 1)), [])
  return getSmtpWriteAttempt(id, session)
}
export function SmtpMetadataEditor({ id, data, onReload }: { id: string; data: SmtpSaved; onReload: () => void }) {
  const operator = useSessionOperator(), session = useSyncExternalStore(subscribeSession, getSessionVersion, getSessionVersion)
  if (!canWriteSmtp(operator?.roles) || data.tenantId !== id) return null
  return <Editor key={`${id}:${session}`} id={id} data={data} session={session} onReload={onReload} />
}
function Editor({ id, data, session, onReload }: { id: string; data: SmtpSaved; session: number; onReload: () => void }) {
  const [open, setOpen] = useState(false), attempt = useAttempt(id, session)
  function edit() {
    if (smtpWriteVerified(attempt)) beginNextSmtpWrite(id, session)
    setOpen(true)
  }
  return <section className={styles.section} aria-label="Edição de metadados SMTP">
    <p>Edite somente os metadados da configuração existente. Credenciais são preservadas por omissão; nenhum teste de conexão ou envio é executado.</p>
    <OutlineButton onClick={edit}>{smtpWriteLocked(attempt) && !smtpWriteVerified(attempt) ? 'Consultar resultado SMTP' : 'Editar metadados SMTP'}</OutlineButton>
    {attempt && !open && <p role="status">{messages[attempt.phase]}</p>}
    {open && <Draft id={id} data={data} session={session} onClose={() => setOpen(false)} onReload={onReload} />}
  </section>
}
const display = (value: unknown) => value === null ? 'Não informado (null)' : value === '' ? 'Texto vazio' : typeof value === 'boolean' ? value ? 'Sim' : 'Não' : String(value)
function Draft({ id, data, session, onClose, onReload }: { id: string; data: SmtpSaved; session: number; onClose: () => void; onReload: () => void }) {
  const [baseline, setBaseline] = useState(data), [initial] = useState(() => smtpMetadata(data)), [draft, setDraft] = useState<SmtpMetadata>(initial)
  const [discard, setDiscard] = useState(false), [error, setError] = useState(false), [refreshing, setRefreshing] = useState(false), [staleReviewed, setStaleReviewed] = useState(false)
  const [conflicts, setConflicts] = useState<SmtpMetadataField[]>([]), [conflictsReviewed, setConflictsReviewed] = useState(false)
  const attempt = useAttempt(id, session), pending = smtpWriteBusy(attempt) || refreshing, verified = smtpWriteVerified(attempt), locked = smtpWriteLocked(attempt)
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial)
  const guard = useUnsavedChangesGuard((dirty && !verified) || pending, onClose)
  const controller = useRef<AbortController | null>(null), inputId = useId(), errorId = useId()
  let changes: SmtpPatch | null = null
  try { changes = smtpChanges(baseline, draft) } catch { /* Safe, field-level validation below. */ }
  const phase = attempt?.phase
  useEffect(() => { if (phase === 'stale') setStaleReviewed(false) }, [phase])
  useEffect(() => () => controller.current?.abort(), [])
  function close() { if (pending) return; if (dirty && !verified) setDiscard(true); else { if (verified) onReload(); onClose() } }
  function update(field: SmtpMetadataField, value: SmtpMetadata[SmtpMetadataField]) { setDraft(current => ({ ...current, [field]: value })); setConflictsReviewed(false) }
  async function save() {
    if (!changes || locked || pending || conflicts.length > 0 && !conflictsReviewed) return
    setError(false); controller.current = new AbortController()
    try { await executeSmtpWrite({ tenantId: id, baseline, changes }, session, controller.current.signal) } catch { setError(true) }
  }
  async function reconcile() { try { await reconcileSmtpWrite(id, session) } catch { setError(true) } }
  async function refreshBaseline() {
    setRefreshing(true); setError(false); controller.current = new AbortController()
    try {
      const fresh = await getSmtpRead(id, controller.current.signal)
      if (session !== getSessionVersion() || fresh.state !== 'saved') throw Error('Unavailable')
      const rebased = rebaseSmtpDraft(baseline, draft, fresh)
      setBaseline(fresh); setDraft(rebased.draft); setConflicts(rebased.conflicts); setConflictsReviewed(false); setStaleReviewed(true)
    } catch { setError(true) } finally { setRefreshing(false) }
  }
  return <>
    <Dialog title="Editar metadados SMTP" description={`Whitelabel ${id} · configuração ${baseline.id}. Somente os campos alterados serão enviados.`} onClose={close} footer={<>
      <OutlineButton onClick={close} disabled={pending}>{verified ? 'Concluir' : 'Cancelar'}</OutlineButton>
      {(attempt?.phase === 'uncertain' || attempt?.phase === 'readback_matches') && <OutlineButton onClick={() => { void reconcile() }}>Consultar por GET</OutlineButton>}
      {attempt?.phase === 'stale' && <OutlineButton onClick={() => { void refreshBaseline() }} disabled={pending}>Atualizar leitura, manter rascunho</OutlineButton>}
      {!locked && <PrimaryButton onClick={() => { void save() }} disabled={!changes || pending || attempt?.phase === 'stale' && !staleReviewed || conflicts.length > 0 && !conflictsReviewed}>Salvar metadados</PrimaryButton>}
    </>}>
      <div className={styles.content}>
        <p>Versão informativa, sem bloqueio atômico no servidor. A leitura é conferida antes do PATCH. Usuário e senha não são consultados, editados ou enviados. Configurado não significa entrega verificada.</p>
        <fieldset className={styles.fields} disabled={locked || pending} aria-describedby={errorId}>
          <legend>Metadados editáveis</legend>
          {(['host', 'port', 'fromEmail', 'fromName'] as const).map(field => <label key={field} htmlFor={`${inputId}-${field}`}>{labels[field]}
            <input id={`${inputId}-${field}`} type={field === 'port' ? 'number' : field === 'fromEmail' ? 'email' : 'text'} min={field === 'port' ? 1 : undefined} max={field === 'port' ? 65535 : undefined} maxLength={field === 'port' ? undefined : 256} value={draft[field] ?? ''} disabled={field === 'fromName' && draft.fromName === null} onChange={event => update(field, field === 'port' ? Number(event.target.value) : event.target.value)} />
            <small>Atual: {display(baseline[field])}</small>
          </label>)}
          <label className={styles.checkbox}><input type="checkbox" checked={draft.fromName === null} onChange={event => update('fromName', event.target.checked ? null : '')} /> Limpar nome do remetente (null)</label>
          {(['secure', 'tlsRejectUnauthorized', 'active'] as const).map(field => <label key={field} className={styles.checkbox}><input type="checkbox" checked={draft[field]} onChange={event => update(field, event.target.checked)} /> {labels[field]} · atual: {display(baseline[field])}</label>)}
        </fieldset>
        {conflicts.length > 0 && <div role="alert" className={styles.content}><p>Os campos que você editou também mudaram no servidor: {conflicts.map(field => labels[field]).join(', ')}. Os valores atuais estão apresentados acima; seu rascunho foi preservado.</p><label className={styles.checkbox}><input type="checkbox" checked={conflictsReviewed} disabled={locked || pending} onChange={event => setConflictsReviewed(event.target.checked)} /> Revisei os valores atuais e confirmo somente minhas alterações nestes campos.</label></div>}
        <p id={errorId}>{changes ? `Campos alterados: ${Object.keys(changes).map(field => labels[field as SmtpMetadataField]).join(', ')}.` : 'Altere ao menos um metadado válido. Host/e-mail devem ser válidos; porta entre 1 e 65535; textos até 256 caracteres, sem HTML ou controles.'}</p>
        {attempt && <div role="status" aria-live="polite"><p>{messages[attempt.phase]}</p>{attempt.status !== undefined && <p>HTTP {attempt.status || 'sem resposta'}</p>}{attempt.correlationId && <p className={styles.meta}>Referência: {attempt.correlationId}</p>}</div>}
        {error && <p role="alert">Esta etapa não pôde ser concluída. Nenhuma alteração é reenviada automaticamente.</p>}
      </div>
    </Dialog>
    {(discard || guard.pending) && <Dialog title="Descartar rascunho SMTP?" description="O descarte não desfaz uma solicitação já enviada." tone="warning" onClose={() => { setDiscard(false); guard.stay() }} footer={<><OutlineButton onClick={() => { setDiscard(false); guard.stay() }}>Continuar editando</OutlineButton><PrimaryButton disabled={pending} onClick={() => { if (guard.pending) guard.discardAndContinue(); else onClose() }}>Descartar rascunho</PrimaryButton></>}><p>{pending ? 'Aguarde a conclusão da solicitação antes de sair.' : 'Somente as edições locais serão descartadas.'}</p></Dialog>}
  </>
}
