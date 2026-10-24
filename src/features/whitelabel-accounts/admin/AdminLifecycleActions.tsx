import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import { administratorLifecycleAvailable } from '../../../app/presentationAvailability'
import { useUnsavedChangesGuard } from '../../../app/useUnsavedChangesGuard'
import { Dialog } from '../../../components/ui/Dialog'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import { PrimaryButton } from '../../../components/ui/PrimaryButton'
import { ApiError } from '../../../lib/api'
import { describeApiError } from '../../../lib/apiErrors'
import { getSessionVersion, subscribeSession, useSessionOperator } from '../../../lib/authSession'
import { useRemote } from '../../../lib/useRemoteResource'
import { pushRouteKeepingScroll } from '../../../app/routeQuery'
import { accountsPageHref } from '../accountsRoute'
import type { AdminRecord } from '../accountsApi'
import type { WhitelabelRecord } from '../../whitelabels/whitelabelApi'
import { adminAttempt, adminAttemptLocked, beginNextAdminCommand, executeAdmin, reconcileAdmin, subscribeAdminAttempts, type AdminAttempt, type AdminCommand } from './adminLifecycleClient'
import { adminPatch, getAdmin, hasOtherActiveAdmin, supportedAdmin } from './adminLifecycleContract'
import css from './AdminLifecycle.module.css'

export function AdminFeedback({ error }: { error: unknown }) {
  const view = describeApiError(error, 'o administrador')
  const duplicate = error instanceof ApiError && error.code === 'E_EMAIL_TAKEN'
  return <div className={css.feedback} role="alert"><p>{duplicate ? 'Este e-mail já pertence a um administrador. Nenhum novo administrador foi confirmado.' : error instanceof ApiError && error.code === 'ADMIN_INPUT_INVALID' ? 'Revise os campos. E-mail válido, nome até 128 caracteres e senha inicial entre 8 e 60 caracteres.' : view.title}</p>{view.correlationId && <p>Diagnóstico: {view.correlationId}</p>}</div>
}
function AttemptFeedback({ value, onReconcile }: { value: AdminAttempt; onReconcile: () => void }) {
  return <div className={css.feedback} role="status" data-admin-phase={value.phase}>
    <p>{value.phase === 'confirmed' ? 'Operação aceita; persistência confirmada por resposta e GET.' : value.phase === 'readback_matches' ? 'O GET corresponde ao esperado, mas a resposta da operação não foi confirmada. Não reenviar.' : value.phase === 'uncertain' ? 'Resultado incerto. A operação pode ter sido aplicada; não repetir nem recarregar para reenviar.' : value.phase === 'stale' ? 'O registro mudou antes do envio. Nenhuma alteração foi enviada.' : value.phase === 'rejected' ? value.code === 'LAST_ACTIVE_ADMIN_PROTECTED' ? 'Desativação bloqueada: não foi confirmado outro administrador ativo.' : value.code === 'E_EMAIL_TAKEN' ? 'E-mail já utilizado. Criação/edição recusada.' : 'Operação recusada ou pré-condição inválida. Nada foi apresentado como salvo.' : 'Conferindo identidade, enviando uma vez e consultando o resultado…'}</p>
    {value.id && <p>Administrador #{value.id}</p>}{value.status && <p>HTTP {value.status}</p>}{value.correlationId && <p>Diagnóstico: {value.correlationId}</p>}
    {['uncertain', 'readback_matches'].includes(value.phase) && <OutlineButton onClick={onReconcile}>Reconciliar por GET</OutlineButton>}
  </div>
}
export function AdminCreateAction({ whitelabel }: { whitelabel: WhitelabelRecord }) {
  const roles = useSessionOperator()?.roles ?? [], version = useSyncExternalStore(subscribeSession, getSessionVersion, () => -1)
  if (!administratorLifecycleAvailable(roles)) return null
  return <CreateScope key={`${version}:${whitelabel.id}`} whitelabel={whitelabel} version={version} />
}
function CreateScope({ whitelabel, version }: { whitelabel: WhitelabelRecord; version: number }) {
  const [open, setOpen] = useState(false), [email, setEmail] = useState(''), [secretPresent, setSecretPresent] = useState(false), [error, setError] = useState<unknown>(null)
  const [created, setCreated] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null), cancel = useRef<HTMLButtonElement>(null), request = useRef<AbortController | null>(null), busyRef = useRef(false)
  const key = `${whitelabel.id}:create:${email.trim().toLowerCase()}`, formId = useId()
  const attempt = useSyncExternalStore(subscribeAdminAttempts, () => adminAttempt(key, version), () => null)
  const busy = !!attempt && ['checking', 'sending', 'reconciling'].includes(attempt.phase)
  useEffect(() => () => request.current?.abort(), [])
  const reset = () => { if (input.current) input.current.value = ''; setSecretPresent(false); setEmail(''); setOpen(false) }
  const guard = useUnsavedChangesGuard(open && !busy && (!!email || secretPresent), reset)
  // Navigate after the cleared form/guard has committed, never from the old dirty render.
  useEffect(() => { if (created) pushRouteKeepingScroll(accountsPageHref(whitelabel.id, { kind: 'admin', accountId: created })) }, [created, whitelabel.id])
  const [discard, setDiscard] = useState(false)
  function close() { if (!busy) { if (email || secretPresent) setDiscard(true); else reset() } }
  async function submit() {
    if (busyRef.current || adminAttemptLocked(attempt)) return
    busyRef.current = true; setError(null); request.current = new AbortController()
    try {
      const pending = executeAdmin({ action: 'create', whitelabelId: whitelabel.id, email, password: input.current?.value ?? '' }, version, request.current.signal)
      if (input.current) input.current.value = ''; setSecretPresent(false)
      await pending
      const result = adminAttempt(key, version)
      if (result?.phase === 'confirmed' && result.id) { setCreated(result.id); reset() }
    } catch (cause) { if (!request.current.signal.aborted) setError(cause) }
    finally { busyRef.current = false; if (input.current) input.current.value = ''; setSecretPresent(false) }
  }
  return <section className={`${css.panel} ${css.create}`} data-admin-create>
    <h3>Administradores do Whitelabel</h3><p>Credenciais iniciais; sem convite, envio de e-mail ou permissões inventadas.</p>
    {created && <p role="status">Administrador #{created} criado e confirmado por GET. A senha inicial foi removida do formulário.</p>}
    <div><OutlineButton disabled={busy || adminAttemptLocked(attempt)} onClick={() => { setError(null); setOpen(true) }}>Criar administrador</OutlineButton></div>
    {attempt && <AttemptFeedback value={attempt} onReconcile={() => void reconcileAdmin(key, version).catch(setError)} />}
    {!!error && <AdminFeedback error={error} />}
    {open && !discard && !guard.pending && <Dialog title="Criar administrador do Whitelabel?" description={`${whitelabel.name} · Whitelabel #${whitelabel.id}`} initialFocusRef={cancel} onClose={close} footer={<><OutlineButton ref={cancel} disabled={busy} onClick={close}>Cancelar</OutlineButton><PrimaryButton type="submit" form={formId} disabled={busy || adminAttemptLocked(attempt)}>Confirmar criação</PrimaryButton></>}>
      <form id={formId} className={css.form} onSubmit={event => { event.preventDefault(); void submit() }}>
        <p>O Core cria a conta com e-mail e senha. O nome é definido depois, pela edição suportada. O novo administrador poderá acessar este Whitelabel; funções do Control Plane não são atribuídas.</p>
        <label className={css.field}><span>E-mail do novo administrador</span><input type="email" required maxLength={256} autoComplete="off" value={email} disabled={busy || adminAttemptLocked(attempt)} onChange={event => setEmail(event.target.value)} /></label>
        <label className={css.field}><span>Senha inicial (8–60 caracteres)</span><input ref={input} type="password" required minLength={8} maxLength={60} autoComplete="new-password" disabled={busy || adminAttemptLocked(attempt)} onChange={event => setSecretPresent(!!event.target.value)} /></label>
        <p>A senha será limpa no envio e não será exibida novamente. Nenhum convite ou mensagem é enviado por esta integração. Resultado incerto exige GET, nunca nova criação automática.</p>
        {!!error && <AdminFeedback error={error} />}
        {attempt && <AttemptFeedback value={attempt} onReconcile={() => void reconcileAdmin(key, version).catch(setError)} />}
      </form>
    </Dialog>}
    {(discard || guard.pending) && <Dialog title="Descartar dados não enviados?" onClose={() => { setDiscard(false); guard.stay() }} footer={<><OutlineButton onClick={() => { setDiscard(false); guard.stay() }}>Continuar preenchendo</OutlineButton><OutlineButton onClick={() => { reset(); setDiscard(false); if (guard.pending) guard.discardAndContinue() }}>Descartar</OutlineButton></>}>E-mail e senha inicial serão removidos deste formulário.</Dialog>}
  </section>
}
export function AdminLifecycleActions({ record, tenantId, current = true }: { record: AdminRecord; tenantId: string; current?: boolean }) {
  const roles = useSessionOperator()?.roles ?? [], version = useSyncExternalStore(subscribeSession, getSessionVersion, () => -1)
  if (!current || record.whitelabelId !== tenantId || !administratorLifecycleAvailable(roles)) return null
  return <AdminScope key={`${version}:${tenantId}:${record.id}`} record={record} version={version} />
}
function AdminScope({ record, version }: { record: AdminRecord; version: number }) {
  const [open, setOpen] = useState<'update' | 'activate' | 'deactivate' | null>(null), [name, setName] = useState(record.name ?? ''), [email, setEmail] = useState(record.email ?? ''), [error, setError] = useState<unknown>(null)
  const ref = { whitelabelId: record.whitelabelId, id: record.id }, key = `${record.whitelabelId}:admin:${record.id}`
  const attempt = useSyncExternalStore(subscribeAdminAttempts, () => adminAttempt(key, version), () => null)
  const busyRef = useRef(false), scope = useRef<AbortController | null>(null), cancel = useRef<HTMLButtonElement>(null), formId = useId()
  useEffect(() => { const controller = new AbortController(); scope.current = controller; return () => controller.abort() }, [])
  const supported = supportedAdmin(record), busy = !!attempt && ['checking', 'sending', 'reconciling'].includes(attempt.phase)
  const other = useRemote(supported && record.accessState === 'active' ? `admin-other:${version}:${record.whitelabelId}:${record.id}:${record.updatedAt}` : null, signal => hasOtherActiveAdmin(ref, signal))
  const dirty = open === 'update' && (name !== (record.name ?? '') || email !== (record.email ?? ''))
  const guard = useUnsavedChangesGuard(dirty && !busy, () => setOpen(null)), [discard, setDiscard] = useState(false)
  function close() { if (!busy) { if (dirty) setDiscard(true); else setOpen(null) } }
  async function submit() {
    if (!open || !supported || busyRef.current || adminAttemptLocked(attempt)) return
    busyRef.current = true; setError(null)
    try {
      const command: AdminCommand = open === 'update' ? { action: 'update', ref, baseline: record, changes: { name, email } } : { action: open, ref, from: record.accessState as 'active' | 'paused' }
      await executeAdmin(command, version, scope.current?.signal); setOpen(null)
    } catch (cause) { if (!scope.current?.signal.aborted) setError(cause) }
    finally { busyRef.current = false }
  }
  async function next() {
    if (busyRef.current) return
    busyRef.current = true
    try { await getAdmin(ref, scope.current?.signal); beginNextAdminCommand(key, version); other.reload(); setError(null) } catch (cause) { setError(cause) }
    finally { busyRef.current = false }
  }
  let changed = false
  try { changed = Object.keys(adminPatch(record, { name, email })).length > 0 } catch { /* Client validation is shown on submit; never an optimistic success. */ }
  return <section className={css.panel} data-admin-lifecycle>
    <h3>Gerenciar administrador</h3><p>Whitelabel #{ref.whitelabelId} · Administrador #{ref.id}. Apenas nome, e-mail e acesso. Não altera funções, senha, KYC ou finanças.</p>
    {!supported ? <p>Estado ou nome autoritativo não confirmado. Ações indisponíveis.</p> : <div className={css.actions}>
      <OutlineButton disabled={busy || adminAttemptLocked(attempt)} onClick={() => { setName(record.name ?? ''); setEmail(record.email ?? ''); setError(null); setOpen('update') }}>Editar nome / e-mail</OutlineButton>
      <OutlineButton disabled={busy || adminAttemptLocked(attempt) || record.accessState === 'active' && (other.state.status !== 'success' || !other.state.data)} onClick={() => setOpen(record.accessState === 'active' ? 'deactivate' : 'activate')}>{record.accessState === 'active' ? 'Desativar administrador' : 'Ativar administrador'}</OutlineButton>
    </div>}
    {supported && record.accessState === 'active' && <p>{other.state.status === 'success' && other.state.data ? 'Outro administrador ativo confirmado. O estado será conferido novamente antes do envio.' : 'Desativação bloqueada enquanto outro administrador ativo não for confirmado.'} Esta proteção não é uma trava atômica do Core.</p>}
    {!!error && <AdminFeedback error={error} />}
    {attempt && <><AttemptFeedback value={attempt} onReconcile={() => void reconcileAdmin(key, version).catch(setError)} />{attempt.phase === 'confirmed' && <OutlineButton onClick={() => void next()}>Atualizar e preparar outra ação</OutlineButton>}</>}
    {open && !discard && !guard.pending && <Dialog title={open === 'update' ? 'Confirmar edição do administrador?' : open === 'activate' ? 'Confirmar ativação do administrador?' : 'Confirmar desativação do administrador?'} description={`Whitelabel #${ref.whitelabelId} · Administrador #${ref.id}`} initialFocusRef={cancel} onClose={close} footer={<><OutlineButton ref={cancel} disabled={busy} onClick={close}>Cancelar</OutlineButton><PrimaryButton type="submit" form={formId} disabled={busy || adminAttemptLocked(attempt) || open === 'update' && !changed}>Confirmar uma vez</PrimaryButton></>}>
      <form id={formId} className={css.form} onSubmit={event => { event.preventDefault(); void submit() }}>
        <p>{open === 'deactivate' ? 'O administrador perderá o acesso ao login e a requisições autenticadas existentes. Não há garantia atômica de proteção do último administrador.' : open === 'activate' ? 'O bloqueio de acesso será retirado. Isso não envia convite, altera senha ou concede funções do Control Plane.' : 'Somente campos alterados de nome e e-mail serão enviados. Alterar e-mail muda o identificador de login; senha e campos omitidos são preservados.'}</p>
        {open === 'update' && <><label className={css.field}><span>Nome do administrador</span><input value={name} maxLength={128} disabled={busy} onChange={event => setName(event.target.value)} /></label><label className={css.field}><span>E-mail do administrador</span><input type="email" required maxLength={256} value={email} disabled={busy} onChange={event => setEmail(event.target.value)} /></label></>}
        <p>Nenhuma repetição automática. Resposta e GET serão reconciliados antes de confirmar persistência.</p>{!!error && <AdminFeedback error={error} />}
      </form>
    </Dialog>}
    {(discard || guard.pending) && <Dialog title="Descartar edição não enviada?" onClose={() => { setDiscard(false); guard.stay() }} footer={<><OutlineButton onClick={() => { setDiscard(false); guard.stay() }}>Continuar editando</OutlineButton><OutlineButton onClick={() => { setOpen(null); setDiscard(false); if (guard.pending) guard.discardAndContinue() }}>Descartar</OutlineButton></>}>As alterações locais não serão enviadas.</Dialog>}
  </section>
}
