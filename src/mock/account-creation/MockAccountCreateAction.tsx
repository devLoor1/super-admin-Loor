import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import { ArrowRight, CheckCircle2, Mail, Phone, Plus, UserRound } from 'lucide-react'
import { useUnsavedChangesGuard } from '../../app/useUnsavedChangesGuard'
import { pushRouteKeepingScroll } from '../../app/routeQuery'
import { FormField } from '../../components/form/FormField'
import { Dialog } from '../../components/ui/Dialog'
import { OutlineButton } from '../../components/ui/OutlineButton'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { DiscardChangesDialog } from '../../features/operation/shared/DiscardChangesDialog'
import { refreshAccountReads } from '../../features/whitelabel-accounts/access/accountAccessRefresh'
import { getAccount, parseAccountDetail, type AccountDetail } from '../../features/whitelabel-accounts/accountsApi'
import { accountsPageHref } from '../../features/whitelabel-accounts/accountsRoute'
import type { WhitelabelRecord } from '../../features/whitelabels/whitelabelApi'
import { ApiError, apiRequest, isAbortError } from '../../lib/api'
import { getAccessToken, getSessionVersion, handleUnauthorized, useSessionOperator } from '../../lib/authSession'
import { discardAccountDraft, getAccountDraft, hasAccountDraft, saveAccountDraft, subscribeAccountDrafts } from './accountCreationDrafts'
import { participantLabel, validateAccountCreation, type AccountCreationDraft, type AccountCreationErrors, type ParticipantKind } from './accountCreationModel'
import css from './MockAccountCreation.module.css'

/** Only imported by the permanent mock Accounts page. Administrator creation keeps its existing command. */
export function MockAccountCreateAction({ whitelabel, kind }: { whitelabel: WhitelabelRecord; kind: ParticipantKind }) {
  const operator = useSessionOperator()
  if (!operator?.roles.includes('SUPER_ADMIN')) return null
  return <CreationScope key={`${whitelabel.id}:${kind}`} whitelabel={whitelabel} kind={kind} />
}

function CreationScope({ whitelabel, kind }: { whitelabel: WhitelabelRecord; kind: ParticipantKind }) {
  const label = participantLabel(kind), formId = useId()
  const draft = useSyncExternalStore(subscribeAccountDrafts, () => getAccountDraft(whitelabel.id, kind))
  const dirty = hasAccountDraft(whitelabel.id, kind)
  const [open, setOpen] = useState(false), [stage, setStage] = useState<'details' | 'review'>('details')
  const [discard, setDiscard] = useState(false), [errors, setErrors] = useState<AccountCreationErrors>({}), [feedback, setFeedback] = useState('')
  const [busy, setBusy] = useState(false), [receipt, setReceipt] = useState<AccountDetail | null>(null), [navigateId, setNavigateId] = useState<string | null>(null)
  const busyRef = useRef(false), scope = useRef<AbortController | null>(null), nameInput = useRef<HTMLInputElement>(null), reviewTitle = useRef<HTMLHeadingElement>(null), receiptTitle = useRef<HTMLHeadingElement>(null)
  const discardDraft = () => { scope.current?.abort(); discardAccountDraft(whitelabel.id, kind); setOpen(false); setDiscard(false); setErrors({}); setFeedback('') }
  const guard = useUnsavedChangesGuard(open && dirty && !receipt, discardDraft)
  useEffect(() => () => scope.current?.abort(), [])
  useEffect(() => { if (navigateId) pushRouteKeepingScroll(accountsPageHref(whitelabel.id, { kind, accountId: navigateId })) }, [navigateId, whitelabel.id, kind])
  const suspended = discard || !!guard.pending
  useEffect(() => {
    if (!open || suspended) return
    const target = receipt ? receiptTitle.current : stage === 'review' ? reviewTitle.current : nameInput.current
    target?.focus()
  }, [open, stage, receipt, suspended])
  function edit(field: keyof AccountCreationDraft, value: string) {
    saveAccountDraft(whitelabel.id, kind, { [field]: value })
    setErrors(current => ({ ...current, [field]: undefined })); setFeedback('')
  }
  function close() { if (!busyRef.current) { if (dirty && !receipt) setDiscard(true); else setOpen(false) } }
  function payload() { const { full_name, email, phone, investor_type } = draft; return { full_name, email, phone, ...(kind === 'investor' ? { investor_type } : {}) } }
  function review() {
    const result = validateAccountCreation(kind, payload()); setErrors(result.errors)
    if (Object.keys(result.errors).length) {
      setFeedback('Revise os campos destacados antes de continuar.')
      window.requestAnimationFrame(() => document.getElementById(`${formId}-${Object.keys(result.errors)[0]}`)?.focus())
    } else { setFeedback(''); setStage('review') }
  }
  async function create() {
    if (busyRef.current) return
    const result = validateAccountCreation(kind, payload())
    if (Object.keys(result.errors).length) { setErrors(result.errors); setStage('details'); return }
    const token = getAccessToken(), version = getSessionVersion()
    if (!token) { setFeedback('A sessão de demonstração terminou. Entre novamente.'); return }
    busyRef.current = true; setBusy(true); setFeedback(''); scope.current = new AbortController()
    try {
      const raw = await apiRequest<{ data: unknown; mockOnly: boolean }>(`/mock/account-creation/whitelabels/${whitelabel.id}/${kind}`, { method: 'POST', body: payload(), token, signal: scope.current.signal, successStatus: 201 })
      if (version !== getSessionVersion() || token !== getAccessToken()) throw new DOMException('Session changed', 'AbortError')
      if (raw.mockOnly !== true) throw new Error('Synthetic result unavailable')
      const created = parseAccountDetail(raw, kind)
      if (created.record.whitelabelId !== whitelabel.id) throw new Error('Wrong synthetic tenant')
      const confirmed = await getAccount({ whitelabelId: whitelabel.id, kind, accountId: created.record.id }, scope.current.signal)
      if (confirmed.record.email !== result.values.email || confirmed.record.fullName !== result.values.full_name) throw new Error('Synthetic readback mismatch')
      discardAccountDraft(whitelabel.id, kind); setReceipt(confirmed)
      refreshAccountReads({ whitelabelId: whitelabel.id, kind, accountId: confirmed.record.id })
    } catch (cause) {
      if (isAbortError(cause)) return
      if (cause instanceof ApiError && cause.status === 401) handleUnauthorized(token, version)
      setFeedback(cause instanceof ApiError && cause.code === 'MOCK_EMAIL_TAKEN'
        ? `Este e-mail já está em uso por outro ${label} neste Whitelabel. Edite o cadastro para usar outro e-mail.`
        : cause instanceof ApiError && cause.status === 403 ? 'Seu perfil não pode criar contas nesta demonstração.'
          : 'A criação local não foi confirmada. Consulte as contas antes de tentar novamente.')
    } finally { busyRef.current = false; setBusy(false); guard.stay() }
  }
  const fields = [draft.full_name && 'Nome', draft.email && 'E-mail', draft.phone && 'Telefone', kind === 'investor' && draft.investor_type !== 'pessoa_fisica' && 'Tipo de investidor'].filter(Boolean) as string[]
  return <section className={css.createPanel} aria-label={`Cadastro de ${label}`} data-mock-account-create={kind}>
    <div className={css.createHeading}><div><h3>Novo {label}</h3><p>Comece pelos dados de contato. As próximas etapas ficam separadas.</p></div>
      <PrimaryButton onClick={() => { setOpen(true); setReceipt(null); setNavigateId(null); setStage('details'); setErrors({}); setFeedback('') }}><Plus size={16} aria-hidden="true" />{dirty ? 'Retomar rascunho' : `Criar ${label}`}</PrimaryButton>
    </div>
    <p className={css.mockNote}>{dirty ? 'Rascunho guardado nesta aba, exclusivo deste Whitelabel e tipo de conta.' : 'Simulação offline · use apenas dados fictícios.'}</p>
    {open && !discard && !guard.pending && <Dialog title={receipt ? `${kind === 'investor' ? 'Investidor' : 'Empreendedor'} criado na demonstração` : `Criar ${label}`} description={`${whitelabel.name} · Whitelabel #${whitelabel.id}`} icon={receipt ? CheckCircle2 : UserRound} initialFocusRef={nameInput} onClose={close} size="lg" footer={receipt ? <><OutlineButton onClick={() => setOpen(false)}>Fechar</OutlineButton><PrimaryButton onClick={() => { setOpen(false); setNavigateId(receipt.record.id) }}>Abrir conta criada<ArrowRight size={15} aria-hidden="true" /></PrimaryButton></> : <>
      <OutlineButton disabled={busy} onClick={close}>Cancelar</OutlineButton>
      {dirty && <OutlineButton disabled={busy} onClick={() => { setOpen(false); setFeedback('') }}>Guardar rascunho</OutlineButton>}
      {stage === 'review' && <OutlineButton disabled={busy} onClick={() => setStage('details')}>Editar dados</OutlineButton>}
      <PrimaryButton type="submit" form={formId} disabled={busy}>{busy ? 'Criando e conferindo…' : stage === 'review' ? 'Criar conta simulada' : 'Revisar cadastro'}</PrimaryButton>
    </>}>
      {receipt ? <div className={css.receipt} role="status"><CheckCircle2 size={30} aria-hidden="true" /><h3 ref={receiptTitle} tabIndex={-1}>{receipt.record.fullName}</h3><p>Conta #{receipt.record.id} registrada e conferida por leitura na memória desta aba.</p><PendingNotice /><p>A conta pode ser aberta na lista e no perfil de {label}. “Restaurar dados” remove todos os cadastros simulados.</p></div>
        : <form id={formId} noValidate className={css.form} onSubmit={event => { event.preventDefault(); if (stage === 'details') review(); else void create() }} aria-busy={busy}>
          <ol className={css.progress} aria-label="Etapas do cadastro"><li aria-current={stage === 'details' ? 'step' : undefined}><span>1</span>Dados iniciais</li><li aria-current={stage === 'review' ? 'step' : undefined}><span>2</span>Revisão</li></ol>
          {stage === 'details' ? <>
            <p className={css.guidance}>Este cadastro prepara um {label} no Whitelabel selecionado. Use um e-mail como <strong>pessoa@example.invalid</strong>.</p>
            {kind === 'investor' && <fieldset className={css.types}><legend>Tipo de investidor</legend><label><input type="radio" name={`${formId}-type`} checked={draft.investor_type === 'pessoa_fisica'} onChange={() => edit('investor_type', 'pessoa_fisica')} disabled={busy} />Pessoa física</label><label><input type="radio" name={`${formId}-type`} checked={draft.investor_type === 'pessoa_juridica'} onChange={() => edit('investor_type', 'pessoa_juridica')} disabled={busy} />Pessoa jurídica</label></fieldset>}
            <fieldset className={css.contactGroup}><legend>Contato inicial</legend><div className={css.contactFields}>
            <div className={css.contactName}><FormField ref={nameInput} id={`${formId}-full_name`} label={kind === 'investor' && draft.investor_type === 'pessoa_juridica' ? 'Nome completo do responsável' : 'Nome completo'} icon={UserRound} value={draft.full_name} maxLength={256} autoComplete="off" required disabled={busy} error={errors.full_name} onChange={event => edit('full_name', event.target.value)} /></div>
            <FormField id={`${formId}-email`} label="E-mail" icon={Mail} type="email" value={draft.email} maxLength={254} autoComplete="off" placeholder="pessoa@example.invalid" required disabled={busy} error={errors.email} onChange={event => edit('email', event.target.value)} />
            <FormField id={`${formId}-phone`} label="Telefone com DDD" icon={Phone} type="tel" value={draft.phone} maxLength={24} autoComplete="off" placeholder="(11) 90000-0000" required disabled={busy} error={errors.phone} onChange={event => edit('phone', event.target.value)} />
            </div></fieldset>
            <p className={css.guidance}>{kind === 'entrepreneur' ? 'Empresa, dados bancários e validação ficam para o onboarding.' : draft.investor_type === 'pessoa_juridica' ? 'CNPJ, dados da pessoa jurídica e validação ficam para a conclusão do perfil.' : 'CPF, perfil de investimento e validação ficam para o onboarding.'}</p>
          </> : <section className={css.review}><h3 ref={reviewTitle} tabIndex={-1}>Confira o cadastro inicial</h3><dl><dt>Whitelabel</dt><dd>{whitelabel.name} · #{whitelabel.id}</dd><dt>Nome</dt><dd>{draft.full_name.trim()}</dd><dt>E-mail</dt><dd>{draft.email.trim().toLowerCase()}</dd><dt>Telefone</dt><dd>{draft.phone}</dd>{kind === 'investor' && <><dt>Tipo</dt><dd>{draft.investor_type === 'pessoa_fisica' ? 'Pessoa física' : 'Pessoa jurídica'}</dd></>}</dl><PendingNotice /></section>}
          {feedback && <p className={css.feedback} role="alert">{feedback}</p>}
        </form>}
    </Dialog>}
    {guard.pending && busy && <Dialog title="Conferindo criação local" description="Aguarde a conclusão antes de sair desta página." onClose={guard.stay} footer={<OutlineButton onClick={guard.stay}>Continuar aguardando</OutlineButton>}><p className={css.guidance}>A criação pode já ter sido aplicada à memória. Estamos consultando o registro; nenhuma opção de descarte é oferecida durante essa conferência.</p></Dialog>}
    {(discard || guard.pending) && !busy && !receipt && <DiscardChangesDialog fields={fields.length ? fields : ['Cadastro inicial']} destination={guard.pending?.destination ?? 'cancelar este cadastro'} onStay={() => { setDiscard(false); guard.stay() }} onDiscard={() => { if (guard.pending) guard.discardAndContinue(); else discardDraft() }} />}
  </section>
}

function PendingNotice() { return <div className={css.pending}><strong>Próximas etapas, ainda pendentes</strong><ul><li>Verificação de e-mail</li><li>Aceite dos termos pelo próprio titular</li><li>Definição de credenciais e conclusão do perfil</li></ul><p>Nenhum e-mail é enviado, senha é provisionada ou KYC é concluído por esta simulação.</p></div> }
