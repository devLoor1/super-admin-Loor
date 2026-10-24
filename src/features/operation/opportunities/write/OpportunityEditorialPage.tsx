import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { opportunityEditorialAvailable } from '../../../../app/presentationAvailability'
import { useUnsavedChangesGuard } from '../../../../app/useUnsavedChangesGuard'
import { Dialog } from '../../../../components/ui/Dialog'
import { OutlineButton } from '../../../../components/ui/OutlineButton'
import { PrimaryButton } from '../../../../components/ui/PrimaryButton'
import { getSessionVersion, subscribeSession, useSessionOperator } from '../../../../lib/authSession'
import { useRemote } from '../../../../lib/useRemoteResource'
import { BackLink, OperationShell } from '../../shared/OperationUi'
import { getEditable, reasonPayload, validId, type EditableOpportunity } from './opportunityWriteContract'
import { attemptLocked, beginNextOpportunityCommand, executeOpportunity, getOpportunityAttempt, reconcileOpportunity, subscribeOpportunityAttempts, type Command } from './opportunityWriteClient'
import { WriteFeedback } from './OpportunityWritePage'
import css from './OpportunityWrite.module.css'

/** Published scope: review/about-only PATCH and archive. No upload, create or provider controls. */
export function OpportunityEditorialPage({ opportunityId }: { opportunityId?: string }) {
  const roles = useSessionOperator()?.roles ?? []
  const version = useSyncExternalStore(subscribeSession, getSessionVersion, getSessionVersion)
  return <OperationShell section="opportunities" title="Edição editorial" trail={[`Oportunidade #${opportunityId ?? ''}`]}>
    {!roles.includes('SUPER_ADMIN') ? <p role="alert">Acesso não permitido. Somente SUPER_ADMIN pode editar ou arquivar.</p>
      : !opportunityId || !validId(opportunityId) ? <p role="alert">Identificador de oportunidade inválido.</p>
        : <EditorialScope key={`${version}:${opportunityId}`} id={opportunityId} version={version} />}
  </OperationShell>
}

function EditorialScope({ id, version }: { id: string; version: number }) {
  const detail = useRemote(`opportunity-editorial:${version}:${id}`, signal => getEditable(id, undefined, signal))
  return <>
    <BackLink href={`#/operation/opportunities/${id}`} label="Voltar para consulta" />
    {detail.state.status === 'error' ? <WriteFeedback error={detail.state.error} retry={detail.reload} />
      : detail.state.status !== 'success' ? <p role="status">Consultando oportunidade…</p>
        : <OpportunityEditorialEditor key={`${detail.state.data.whitelabelId}:${id}`} initial={detail.state.data} version={version} />}
  </>
}

export function OpportunityEditorialEditor({ initial, version }: { initial: EditableOpportunity; version: number }) {
  const roles = useSessionOperator()?.roles ?? []
  const [record, setRecord] = useState(initial)
  const [about, setAbout] = useState(typeof initial.values.about === 'string' ? initial.values.about : '')
  const [reason, setReason] = useState('')
  const [modal, setModal] = useState<'patch' | 'archive' | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false), cancelRef = useRef<HTMLButtonElement>(null), scope = useRef<AbortController | null>(null)
  useEffect(() => { const controller = new AbortController(); scope.current = controller; return () => controller.abort() }, [])
  const key = `${record.whitelabelId}:${record.id}`
  const attempt = useSyncExternalStore(subscribeOpportunityAttempts, () => getOpportunityAttempt(key, version), () => null)
  const locked = busy || attemptLocked(attempt)
  const dirty = about !== (record.values.about ?? '') || reason !== ''
  const guard = useUnsavedChangesGuard(dirty && attempt?.phase !== 'confirmed', () => {})
  const allowed = opportunityEditorialAvailable(record.status, roles)

  async function confirm() {
    if (busyRef.current || locked || !modal || !allowed) return
    busyRef.current = true; setBusy(true); setError(null)
    try {
      const command: Command = modal === 'patch'
        ? { action: 'patch', tenantId: record.whitelabelId, id: record.id, baseline: record, changes: { about } }
        : { action: 'archive', tenantId: record.whitelabelId, id: record.id, reason: reasonPayload(reason).reason as string }
      await executeOpportunity(command, version, scope.current?.signal)
      if (getOpportunityAttempt(key, version)?.phase === 'confirmed') {
        const current = await getEditable(record.id, record.whitelabelId, scope.current?.signal)
        setRecord(current); setAbout(typeof current.values.about === 'string' ? current.values.about : ''); setReason('')
      }
    } catch (cause) { if (!scope.current?.signal.aborted) setError(cause) }
    finally { busyRef.current = false; setBusy(false); setModal(null) }
  }
  async function prepareNext() {
    if (busyRef.current) return
    busyRef.current = true; setBusy(true)
    try {
      const current = await getEditable(record.id, record.whitelabelId, scope.current?.signal)
      beginNextOpportunityCommand(key, version); setRecord(current); setAbout(typeof current.values.about === 'string' ? current.values.about : ''); setReason(''); setError(null)
    } catch (cause) { setError(cause) }
    finally { busyRef.current = false; setBusy(false) }
  }
  return <div className={css.editor} data-opportunity-editorial>
    <p className={css.context}>Oportunidade #{record.id} · Whitelabel #{record.whitelabelId} · {record.status}</p>
    <p className={css.notice}>Escopo disponível: editar somente Sobre e arquivar oportunidades em revisão. Cada envio exige confirmação e consulta autoritativa. Criação, aprovação e operações de provedor indisponíveis.</p>
    {!!error && <WriteFeedback error={error} />}
    {attempt && <div role="status" className={css.notice}>Comando {attempt.action}: <strong>{attempt.phase}</strong>{attempt.status && <> · HTTP {attempt.status}</>}{attempt.correlationId && <> · Correlação {attempt.correlationId}</>}
      {attempt.phase === 'confirmed' && <><p>Persistência confirmada por resposta e GET.</p>{allowed && <OutlineButton disabled={busy} onClick={() => void prepareNext()}>Atualizar e preparar próximo comando</OutlineButton>}</>}
      {attempt.phase === 'stale' && <p>O registro mudou. Reabra a consulta antes de preparar outra alteração.</p>}
      {attempt.phase === 'rejected' && <p role="alert">Comando recusado ou pré-condição inválida. Consulte o registro antes de corrigir os dados.</p>}
      {['uncertain', 'readback_matches'].includes(attempt.phase) && <><p>Resultado incerto ou apenas leitura consistente. Não repetir o comando. Preserve ID e correlação; uma leitura sem alteração não prova ausência de efeitos.</p><OutlineButton disabled={busy} onClick={() => void reconcileOpportunity(key, version).catch(setError)}>Reconciliar por GET</OutlineButton></>}
    </div>}
    {!allowed ? <p role="status">Estado {record.status}: somente consulta. Nenhuma edição ou ação de arquivamento disponível.</p> : <>
      <form className={css.card} onSubmit={event => { event.preventDefault(); if (!locked && about !== (record.values.about ?? '')) setModal('patch') }}>
        <fieldset disabled={locked}><legend>Sobre a oportunidade</legend>
          <label className={css.field}><span>Sobre</span><textarea value={about} onChange={event => setAbout(event.target.value)} /></label>
          <div className={css.actions}><PrimaryButton type="submit" disabled={locked || about === (record.values.about ?? '')}>Revisar alteração</PrimaryButton></div>
        </fieldset>
      </form>
      <section className={css.card} aria-label="Arquivamento">
        <label className={css.field}><span>Motivo do arquivamento (mínimo 20 caracteres)</span><textarea value={reason} disabled={locked} onChange={event => setReason(event.target.value)} /></label>
        <p className={css.hint}>O arquivamento encerra a revisão. Alterações não salvas em Sobre não serão enviadas junto.</p>
        <OutlineButton disabled={locked || reason.trim().length < 20} onClick={() => { try { reasonPayload(reason); setModal('archive') } catch (cause) { setError(cause) } }}>Revisar arquivamento</OutlineButton>
      </section>
    </>}
    {modal && <Dialog title={modal === 'patch' ? 'Confirmar alteração de Sobre?' : 'Confirmar arquivamento?'} description={`Oportunidade #${record.id} · Whitelabel #${record.whitelabelId}`} initialFocusRef={cancelRef} onClose={() => { if (!busy) setModal(null) }} footer={<><OutlineButton ref={cancelRef} disabled={busy} onClick={() => setModal(null)}>Cancelar</OutlineButton><PrimaryButton disabled={locked} onClick={() => void confirm()}>Confirmar uma vez</PrimaryButton></>}>
      <p>{modal === 'patch' ? 'Somente o campo Sobre será enviado.' : 'Esta oportunidade será arquivada com o motivo informado.'} Nenhuma aprovação ou operação de provedor será executada.</p>
      <p>Se houver falha ou resultado incerto, consulte o registro. Não há reenvio automático.</p>
    </Dialog>}
    {guard.pending && <Dialog title="Descartar alterações locais?" description="Nenhuma alteração será enviada ao sair." onClose={guard.stay} footer={<><OutlineButton onClick={guard.stay}>Continuar editando</OutlineButton><OutlineButton onClick={guard.discardAndContinue}>Descartar e sair</OutlineButton></>}>O rascunho será descartado.</Dialog>}
  </div>
}
