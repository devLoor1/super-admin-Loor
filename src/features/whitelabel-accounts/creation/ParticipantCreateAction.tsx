import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import { ArrowRight, CheckCircle2, Mail, Phone, Plus, UserRound } from 'lucide-react'
import { participantCreationAvailable } from '../../../app/presentationAvailability'
import { useUnsavedChangesGuard } from '../../../app/useUnsavedChangesGuard'
import { pushRouteKeepingScroll } from '../../../app/routeQuery'
import { FormField } from '../../../components/form/FormField'
import { Dialog } from '../../../components/ui/Dialog'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import { PrimaryButton } from '../../../components/ui/PrimaryButton'
import { getSessionVersion, subscribeSession, useSessionOperator } from '../../../lib/authSession'
import type { WhitelabelRecord } from '../../whitelabels/whitelabelApi'
import { accountsPageHref } from '../accountsRoute'
import { creationBusy, creationLocked, creationState, createParticipant, discardParticipantDraft, nextParticipant, reconcileParticipant, saveParticipantDraft, subscribeParticipants, type CreationAttempt } from './participantCreationClient'
import { participantInput, participantLabel, type ParticipantDraft, type ParticipantErrors, type ParticipantKind } from './participantCreationContract'
import css from './ParticipantCreation.module.css'

export function ParticipantCreateAction({ whitelabel, kind }: { whitelabel: WhitelabelRecord; kind: ParticipantKind }) {
  const operator = useSessionOperator(), version = useSyncExternalStore(subscribeSession, getSessionVersion, () => -1)
  if (!participantCreationAvailable(kind, operator?.roles ?? [])) return null
  return <CreationScope key={`${version}:${whitelabel.id}:${kind}`} whitelabel={whitelabel} kind={kind} version={version} />
}

function CreationScope({ whitelabel, kind, version }: { whitelabel: WhitelabelRecord; kind: ParticipantKind; version: number }) {
  const scope = { tenant: whitelabel.id, kind }, label = participantLabel(kind), formId = useId()
  const { draft, attempt } = useSyncExternalStore(subscribeParticipants, () => creationState(scope), () => creationState(scope))
  const busy = creationBusy(attempt), locked = creationLocked(attempt), confirmed = attempt?.phase === 'confirmed'
  const dirty = !!(draft.full_name || draft.email || draft.phone || draft.investor_type !== 'pessoa_fisica')
  const [open, setOpen] = useState(false), [stage, setStage] = useState<'details' | 'review'>('details'), [discard, setDiscard] = useState(false)
  const [errors, setErrors] = useState<ParticipantErrors>({}), [feedback, setFeedback] = useState(''), [navigateId, setNavigateId] = useState<string | null>(null)
  const nameInput = useRef<HTMLInputElement>(null), reviewTitle = useRef<HTMLHeadingElement>(null), resultTitle = useRef<HTMLHeadingElement>(null)
  const discardDraft = () => { discardParticipantDraft(scope); setOpen(false); setDiscard(false); setErrors({}); setFeedback('') }
  const guard = useUnsavedChangesGuard(open && !confirmed && (dirty || locked), discardDraft)
  const suspended = discard || !!guard.pending
  useEffect(() => { if (navigateId) pushRouteKeepingScroll(accountsPageHref(whitelabel.id, { kind, accountId: navigateId })) }, [navigateId, whitelabel.id, kind])
  useEffect(() => { if (open && !suspended) (locked ? resultTitle.current : stage === 'review' ? reviewTitle.current : nameInput.current)?.focus() }, [open, stage, locked, suspended])
  function edit(field: keyof ParticipantDraft, value: string) { saveParticipantDraft(scope, { [field]: value }); setErrors(e => ({ ...e, [field]: undefined })); setFeedback('') }
  function close() { if (!busy) { if (dirty && !locked) setDiscard(true); else setOpen(false) } }
  function review() {
    const result = participantInput(kind, draft); setErrors(result.errors)
    if (Object.keys(result.errors).length) { setFeedback('Revise os campos destacados.'); requestAnimationFrame(() => document.getElementById(`${formId}-${Object.keys(result.errors)[0]}`)?.focus()) }
    else { setStage('review'); setFeedback('') }
  }
  async function create() {
    if (locked) return
    try { await createParticipant(scope, version) } catch { setFeedback('Não foi possível iniciar. Confira os dados e a autorização da sessão. Nenhum sucesso foi presumido.') }
  }
  const normalized = participantInput(kind, draft).payload
  return <section className={css.createPanel} aria-label={`Cadastro de ${label}`} data-participant-create={kind}>
    <div className={css.createHeading}><div><h3>Novo {label}</h3><p>Comece pelos dados de contato. O titular conclui o acesso e o cadastro.</p></div>
      <PrimaryButton disabled={whitelabel.status !== 'active'} onClick={() => { setOpen(true); setNavigateId(null); setStage('details'); setErrors({}); setFeedback('') }}><Plus size={16} aria-hidden="true" />{locked ? 'Ver resultado do cadastro' : dirty ? 'Retomar rascunho' : `Criar ${label}`}</PrimaryButton>
    </div>
    <p className={css.scopeNote}>{whitelabel.status !== 'active' ? 'Criação indisponível para este Whitelabel.' : dirty ? 'Rascunho em memória nesta aba, exclusivo deste Whitelabel, tipo e sessão.' : 'Um link será enviado para que o participante defina a própria senha.'}</p>
    {open && !suspended && <Dialog title={`Cadastro de ${label}`} description={`${whitelabel.name} · Whitelabel #${whitelabel.id}`} icon={confirmed ? CheckCircle2 : UserRound} initialFocusRef={nameInput} onClose={close} size="lg" footer={locked ? <>
      <OutlineButton disabled={busy} onClick={close}>Fechar</OutlineButton>
      {confirmed && <OutlineButton onClick={() => { nextParticipant(scope); setStage('details') }}>Novo cadastro</OutlineButton>}
      {(confirmed || attempt?.phase === 'readback_matches') && attempt?.id && <PrimaryButton onClick={() => { setOpen(false); setNavigateId(attempt.id!) }}>Abrir conta<ArrowRight size={15} aria-hidden="true" /></PrimaryButton>}
    </> : <>
      <OutlineButton onClick={close}>Cancelar</OutlineButton>{dirty && <OutlineButton onClick={() => setOpen(false)}>Guardar rascunho</OutlineButton>}
      {stage === 'review' && <OutlineButton onClick={() => setStage('details')}>Editar dados</OutlineButton>}
      <PrimaryButton type="submit" form={formId}>{stage === 'review' ? `Criar ${label} e enviar acesso` : 'Revisar cadastro'}</PrimaryButton>
    </>}>
      {locked && attempt ? <div className={css.receipt}><h3 ref={resultTitle} tabIndex={-1}>{confirmed ? 'Conta criada e conferida' : busy ? 'Conferindo o cadastro…' : 'Conferência necessária'}</h3><CreationFeedback attempt={attempt} />
        {attempt.receipt && <p>{attempt.receipt.sent ? 'O servidor informou o envio da mensagem de acesso. Isso não confirma recebimento nem conclusão do cadastro.' : 'A conta foi persistida, mas o envio da mensagem não foi confirmado. Abra a conta para consultar e reenviar quando permitido.'}</p>}
        {['uncertain', 'readback_matches'].includes(attempt.phase) && <OutlineButton onClick={() => { void reconcileParticipant(scope, version).catch(() => setFeedback('A consulta não foi autorizada. Preserve o resultado; não repita a criação.')) }}>Consultar resultado por GET</OutlineButton>}
        <PendingNotice />{feedback && <p role="alert" className={css.feedback}>{feedback}</p>}
      </div> : <form id={formId} noValidate className={css.form} onSubmit={e => { e.preventDefault(); if (stage === 'details') review(); else void create() }}>
        <ol className={css.progress} aria-label="Etapas do cadastro"><li aria-current={stage === 'details' ? 'step' : undefined}><span>1</span>Dados iniciais</li><li aria-current={stage === 'review' ? 'step' : undefined}><span>2</span>Revisão</li></ol>
        {stage === 'details' ? <>
          <p className={css.guidance}>Cadastre o contato no Whitelabel selecionado. Nenhuma senha deve ser informada aqui.</p>
          {kind === 'investor' && <fieldset className={css.types}><legend>Tipo de investidor</legend><label><input type="radio" name={`${formId}-type`} checked={draft.investor_type === 'pessoa_fisica'} onChange={() => edit('investor_type', 'pessoa_fisica')} />Pessoa física</label><label><input type="radio" name={`${formId}-type`} checked={draft.investor_type === 'pessoa_juridica'} onChange={() => edit('investor_type', 'pessoa_juridica')} />Pessoa jurídica</label></fieldset>}
          <fieldset className={css.contactGroup}><legend>Contato inicial</legend><div className={css.contactFields}>
            <div className={css.contactName}><FormField ref={nameInput} id={`${formId}-full_name`} label={kind === 'investor' && draft.investor_type === 'pessoa_juridica' ? 'Nome completo do responsável' : 'Nome completo'} icon={UserRound} value={draft.full_name} maxLength={256} autoComplete="off" required error={errors.full_name} onChange={e => edit('full_name', e.target.value)} /></div>
            <FormField id={`${formId}-email`} label="E-mail" icon={Mail} type="email" value={draft.email} maxLength={254} autoComplete="off" required error={errors.email} onChange={e => edit('email', e.target.value)} />
            <FormField id={`${formId}-phone`} label="Telefone com DDD" icon={Phone} type="tel" value={draft.phone} maxLength={30} autoComplete="off" required error={errors.phone} onChange={e => edit('phone', e.target.value)} />
          </div></fieldset>
          <p className={css.guidance}>{kind === 'entrepreneur' ? 'Empresa, dados bancários e validação ficam para o onboarding.' : 'Documentos, perfil de investimento e validação ficam para o onboarding.'}</p>
        </> : <section className={css.review}><h3 ref={reviewTitle} tabIndex={-1}>Confira o cadastro inicial</h3><dl><dt>Whitelabel</dt><dd>{whitelabel.name} · #{whitelabel.id}</dd><dt>Nome</dt><dd>{normalized.fullName}</dd><dt>E-mail</dt><dd>{normalized.email}</dd><dt>Telefone enviado</dt><dd>{normalized.phone}</dd>{kind === 'investor' && <><dt>Tipo</dt><dd>{draft.investor_type === 'pessoa_fisica' ? 'Pessoa física' : 'Pessoa jurídica'}</dd></>}</dl><PendingNotice /></section>}
        {attempt && <CreationFeedback attempt={attempt} />}{feedback && <p role="alert" className={css.feedback}>{feedback}</p>}
      </form>}
    </Dialog>}
    {guard.pending && locked && <Dialog title="Preservar resultado da criação" onClose={guard.stay} footer={<><OutlineButton onClick={guard.stay}>Continuar conferindo</OutlineButton>{!busy && <OutlineButton onClick={guard.discardAndContinue}>Sair preservando resultado</OutlineButton>}</>}><p className={css.guidance}>Cancelar a tela não desfaz a criação. O resultado permanece em memória nesta aba. Não recarregue para tentar enviar novamente.</p></Dialog>}
    {(discard || guard.pending) && !locked && <Dialog title="Descartar rascunho?" onClose={() => { setDiscard(false); guard.stay() }} footer={<><OutlineButton onClick={() => { setDiscard(false); guard.stay() }}>Continuar editando</OutlineButton><PrimaryButton onClick={() => { if (guard.pending) guard.discardAndContinue(); else discardDraft() }}>Descartar</PrimaryButton></>}><p className={css.guidance}>Os dados iniciais ainda não enviados serão removidos apenas deste Whitelabel e tipo de conta.</p></Dialog>}
  </section>
}

export function PendingNotice() { return <div className={css.pending}><strong>Próximas etapas do participante</strong><ul><li>Confirmar e-mail e definir a própria senha</li><li>Aceitar os termos vigentes do Whitelabel</li><li>Completar o perfil e suas validações</li></ul><p>A criação e o envio de acesso não comprovam essas etapas, aprovação de KYC ou habilitação para operações.</p></div> }
function CreationFeedback({ attempt: a }: { attempt: CreationAttempt }) {
  const text = a.phase === 'confirmed' ? 'Persistência confirmada pela resposta de criação e pela consulta da conta.' : a.phase === 'readback_matches' ? 'Existe uma conta compatível, mas não foi possível confirmar que esta operação a criou. Não reenviar.' : a.phase === 'uncertain' ? 'Resultado incerto. A criação pode ter ocorrido. O envio está bloqueado; consulte por GET sem repetir o POST.' : a.phase === 'rejected' ? a.code === 'E_EMAIL_TAKEN' ? 'E-mail já utilizado. Isso não comprova que este pedido criou a conta.' : a.status === 403 ? 'Seu perfil não possui autorização para esta operação.' : a.code === 'E_WHITELABEL_INACTIVE' ? 'O Whitelabel não está ativo.' : 'Cadastro recusado ou pré-condição indisponível. Revise os dados e o contexto antes de uma nova operação.' : 'Verificando contexto e consultando o resultado. Nenhum reenvio automático.'
  return <div className={css.feedback} role="status" data-creation-phase={a.phase}><p>{text}</p>{a.id && <p>Conta #{a.id}</p>}{a.status ? <p>HTTP {a.status}</p> : null}{a.correlationId && <p>Diagnóstico: {a.correlationId}</p>}</div>
}
