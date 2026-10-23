import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import { ShieldAlert } from 'lucide-react'
import { Dialog } from '../../../components/ui/Dialog'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import { PrimaryButton } from '../../../components/ui/PrimaryButton'
import { useUnsavedChangesGuard } from '../../../app/useUnsavedChangesGuard'
import { getSessionVersion, subscribeSession, useSessionOperator } from '../../../lib/authSession'
import type { AccountDetail } from '../accountsApi'
import { ACCESS_REASON_LIMIT, accessCommand, accessWriter, eligibleAccessAction, expectedAccess } from './accountAccessContract'
import { accessAttempt, accessAttemptLocked, changeAccountAccess, reconcileAccountAccess, subscribeAccessAttempts, type AccessAttempt } from './accountAccessClient'
import styles from './AccountAccessActions.module.css'

function feedback(attempt: AccessAttempt) {
  switch (attempt.phase) {
    case 'checking': return 'Conferindo a identidade e o acesso atual antes de enviar…'
    case 'sending': return 'Solicitação enviada uma vez. Aguarde a conferência do resultado.'
    case 'reconciling': return 'Consultando o estado autoritativo da conta…'
    case 'confirmed': return attempt.responseAccepted
      ? 'Solicitação aceita. O estado esperado foi confirmado pelo GET. O teste de login e a auditoria são verificações separadas.'
      : 'O GET confirma o estado esperado, mas a resposta da operação não foi confirmada. Nenhum reenvio foi feito; a auditoria pode estar pendente.'
    case 'unchanged': return 'O GET ainda mostra o estado anterior. Isso não prova que a solicitação interrompida não será aplicada. Reenvio bloqueado; confira novamente.'
    case 'uncertain': return 'Resultado inconclusivo. A operação pode ter sido aplicada. Não repita nem recarregue para tentar novamente; use somente a conferência por GET.'
    case 'stale': return 'O acesso mudou antes do envio. Nenhum POST foi enviado. Confira os dados atualizados.'
    case 'rejected': return attempt.errorStatus === 403 ? 'Sem permissão para alterar o acesso (403). Nada foi apresentado como salvo.' : 'A solicitação não foi aceita ou não pôde ser preparada. Confira os dados e a permissão antes de uma nova confirmação.'
  }
}

/** No names, contact data, old reasons, local access histories or unrelated mutations. */
export function AccountAccessActions({ detail, tenantId, current = true }: { detail: AccountDetail; tenantId: string; current?: boolean }) {
  const operator = useSessionOperator()
  const version = useSyncExternalStore(subscribeSession, getSessionVersion, () => -1)
  const ref = { whitelabelId: tenantId, kind: detail.kind, accountId: detail.record.id }
  const attempt = useSyncExternalStore(subscribeAccessAttempts, () => accessAttempt(ref, version), () => null)
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [discard, setDiscard] = useState(false)
  const [invalid, setInvalid] = useState(false)
  const fieldId = useId()
  const input = useRef<HTMLTextAreaElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  const request = useRef<AbortController | null>(null)
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false; request.current?.abort() } }, [])
  const busy = !!attempt && ['checking', 'sending', 'reconciling'].includes(attempt.phase)
  const dirty = open && !busy && reason.trim().length > 0
  const guard = useUnsavedChangesGuard(dirty, () => { setReason(''); setOpen(false) })
  const action = eligibleAccessAction(detail, tenantId)
  const mismatch = attempt?.phase === 'confirmed' && expectedAccess(attempt.action) !== detail.record.accessState
  const permitted = current && accessWriter(operator?.roles) && detail.kind !== 'admin' && detail.record.whitelabelId === tenantId
  if (!permitted) return null
  function close() {
    if (busy) return
    if (dirty) setDiscard(true)
    else { setOpen(false); setReason(''); setInvalid(false) }
  }
  async function submit() {
    if (!action || busy || accessAttemptLocked(attempt) || mismatch) return
    let command
    try { command = accessCommand(detail, tenantId, reason) } catch { setInvalid(true); input.current?.focus(); return }
    request.current = new AbortController()
    try {
      const pending = changeAccountAccess(command, version, request.current.signal)
      setReason('') // Sensitive reason is only retained by the in-flight request, never by the attempt ledger.
      await pending
      if (alive.current) setOpen(false)
    } catch { if (alive.current) { setInvalid(true); setOpen(false) } }
  }
  async function reconcile() { try { await reconcileAccountAccess(ref, version) } catch { /* No mutation or optimistic success. */ } }
  const discardDialog = guard.pending || discard
  return <section className={styles.actions} aria-labelledby={`access-${fieldId}`} data-account-access="available">
    <h3 id={`access-${fieldId}`}>Gerenciar acesso</h3>
    <p>Somente o acesso de {detail.kind === 'investor' ? 'Investidor' : 'Empreendedor'} #{detail.record.id}, no Whitelabel #{tenantId}. Cadastro, KYC, empresa e finanças não são alterados.</p>
    {!action ? <p>Estado de acesso desconhecido ou não elegível. Nenhuma alteração disponível.</p> :
      <OutlineButton disabled={busy || accessAttemptLocked(attempt) || mismatch} onClick={() => { setInvalid(false); setOpen(true) }}>
        {action === 'pause' ? 'Pausar acesso' : 'Reativar acesso'}
      </OutlineButton>}
    {attempt ? <div className={styles.feedback} role="status" aria-live="polite" data-access-phase={attempt.phase}>
      <p>{feedback(attempt)}</p>
      {attempt.correlationId ? <p>Diagnóstico: <code>{attempt.correlationId}</code></p> : null}
      {['uncertain', 'unchanged'].includes(attempt.phase) ? <OutlineButton onClick={reconcile}>Conferir estado (GET)</OutlineButton> : null}
    </div> : null}
    {open && !discardDialog ? <Dialog title={action === 'pause' ? 'Confirmar pausa de acesso' : 'Confirmar reativação de acesso'} icon={ShieldAlert} tone="warning"
      description={`Whitelabel #${tenantId} · ${detail.kind === 'investor' ? 'Investidor' : 'Empreendedor'} #${detail.record.id}`}
      onClose={close} initialFocusRef={action === 'pause' ? input : cancel}
      fallbackFocus={() => document.getElementById('account-detail')}
      footer={<><OutlineButton ref={cancel} disabled={busy} onClick={close}>Cancelar</OutlineButton>
        <PrimaryButton disabled={busy} onClick={submit}>{busy ? 'Conferindo…' : action === 'pause' ? 'Confirmar pausa' : 'Confirmar reativação'}</PrimaryButton></>}>
      <div className={styles.body} aria-busy={busy}>
        <p>{action === 'pause' ? 'A conta perderá acesso ao login e às requisições autenticadas, inclusive com tokens existentes.' : 'O bloqueio de acesso será retirado. Isso não aprova cadastro, KYC, empresa ou qualquer operação financeira.'}</p>
        <p>A solicitação será enviada uma vez, sem repetição automática. Depois será feita uma consulta autoritativa.</p>
        {action === 'pause' ? <><label htmlFor={fieldId}>Motivo da pausa (obrigatório)</label>
          <textarea ref={input} id={fieldId} value={reason} disabled={busy} maxLength={ACCESS_REASON_LIMIT} rows={4} required aria-invalid={invalid} aria-describedby={`${fieldId}-help`}
            onChange={event => { setReason(event.target.value); setInvalid(false) }} />
          <p id={`${fieldId}-help`}>{invalid ? 'Informe um motivo não vazio. ' : ''}Até 500 caracteres (limite de armazenamento). Não inclua documentos, senhas ou informações financeiras.</p></> : null}
        {busy && attempt ? <p role="status">{feedback(attempt)}</p> : null}
      </div>
    </Dialog> : null}
    {discardDialog ? <Dialog title="Descartar motivo não enviado?" onClose={() => { setDiscard(false); guard.stay() }}
      footer={<><OutlineButton onClick={() => { setDiscard(false); guard.stay() }}>Continuar preenchendo</OutlineButton>
        <PrimaryButton onClick={() => { setReason(''); setOpen(false); setDiscard(false); if (guard.pending) guard.discardAndContinue() }}>Descartar</PrimaryButton></>}>
      <p>O motivo existe apenas neste formulário e ainda não foi enviado.</p>
    </Dialog> : null}
  </section>
}
