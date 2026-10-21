import { useEffect, useRef, useState } from 'react'
import { Power, Ban, Trash2 } from 'lucide-react'
import { Dialog } from '../../../components/ui/Dialog'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import { PrimaryButton } from '../../../components/ui/PrimaryButton'
import { useRemote } from '../../../lib/useRemoteResource'
import { getWhitelabel, type WhitelabelRecord } from '../whitelabelApi'
import { buildLifecycleCommand, isLifecycleCommand } from './whitelabelCommands'
import { isCommandStale } from './whitelabelMutationOutcome'
import { WHITELABEL_LIFECYCLE_ENABLED, type LifecycleOperation } from './whitelabelMutationContract'
import { useWhitelabelMutation } from './useWhitelabelMutation'
import { OperationalMutationState } from './OperationalMutationState'
import dialogStyles from '../../whitelabel-settings/dialogs/SettingsDialogs.module.css'
import styles from './WhitelabelCrud.module.css'

const COPY = {
  activate: { title: 'Ativar Whitelabel', confirm: 'Confirmar ativação', icon: Power,
    effect: 'O tenant ficará ativo e poderá voltar a ser disponibilizado pelos mecanismos normais de resolução da plataforma.' },
  deactivate: { title: 'Desativar Whitelabel', confirm: 'Confirmar desativação', icon: Ban,
    effect: 'O tenant ficará inativo. O registro e sua identidade permanecem armazenados; a reativação continua possível.' },
  'logical-delete': { title: 'Excluir logicamente', confirm: 'Confirmar exclusão lógica', icon: Trash2,
    effect: 'Isto não é exclusão física. O resultado é inativo: o registro e sua identidade permanecem armazenados, sem exclusão em cascata. A reativação continua tecnicamente possível.' },
} as const

/** Explicit review after GET; the shared runner performs another freshness GET immediately before dispatch. */
export function WhitelabelLifecycleDialog({ record, selectedId, operation, onClose, onConfirmed, onInspectRecord, fallbackFocus }: {
  record: WhitelabelRecord; selectedId: string | null; operation: LifecycleOperation; onClose: () => void
  onConfirmed?: (record: WhitelabelRecord) => void; onInspectRecord?: (record: WhitelabelRecord) => void; fallbackFocus?: () => HTMLElement | null
}) {
  const preflight = useRemote(`lifecycle:${record.id}:${operation}`, signal => getWhitelabel(record.id, signal))
  const [confirmed, setConfirmed] = useState(false)
  const [slug, setSlug] = useState('')
  const titleRef = useRef<HTMLHeadingElement>(null)
  const mutation = useWhitelabelMutation(`whitelabel:${record.id}`, onConfirmed)
  const latest = preflight.state.status === 'success' ? preflight.state.data : null
  const initial = buildLifecycleCommand({ selectedId, record, operation })
  const fresh = latest && initial.ok && !isCommandStale(initial.command, latest)
  const built = fresh ? buildLifecycleCommand({ selectedId, record: latest, operation }) : null
  const attempted = mutation.command && isLifecycleCommand(mutation.command) ? mutation.command : null
  const command = attempted ?? (built?.ok ? built.command : null)
  const effectiveOperation = attempted?.operation ?? operation
  const identity = attempted ? { ...record, ...attempted.baseline, id: attempted.targetId } : record
  const copy = COPY[effectiveOperation]
  const protectedAttempt = mutation.busy || (mutation.hasAttempt && mutation.state.phase !== 'verified')

  useEffect(() => {
    if (!protectedAttempt) return
    const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', guard)
    return () => window.removeEventListener('beforeunload', guard)
  }, [protectedAttempt])

  function close() {
    if (mutation.isBusy() || mutation.busy) return
    // reset deliberately refuses unresolved attempts; closing cannot erase their target/outcome.
    mutation.reset()
    onClose()
  }
  function review() {
    if (!mutation.reset()) return
    setConfirmed(false); setSlug(''); preflight.reload()
  }
  const ready = WHITELABEL_LIFECYCLE_ENABLED && built?.ok && confirmed
    && (operation !== 'logical-delete' || slug === record.slug) && !mutation.hasAttempt && !mutation.busy

  return <Dialog title={copy.title} description={`${identity.name} · ID ${identity.id} · ${identity.slug}`} icon={copy.icon}
    tone={effectiveOperation === 'activate' ? 'teal' : 'warning'} size="lg" onClose={close} initialFocusRef={titleRef} fallbackFocus={fallbackFocus}
    footer={<><OutlineButton onClick={close} disabled={mutation.busy}>{mutation.hasAttempt ? 'Fechar' : 'Cancelar'}</OutlineButton>
      {!mutation.hasAttempt ? <PrimaryButton disabled={!ready} onClick={() => { if (ready && built?.ok) mutation.send(built.command) }}>{copy.confirm}</PrimaryButton> : null}</>}>
    <div className={styles.review} data-wl-lifecycle={effectiveOperation} data-wl-target={record.id}>
      <h3 ref={titleRef} tabIndex={-1} className={styles.reviewHeading}>Conferência do alvo e do resultado</h3>
      <p>{copy.effect}</p>
      <p className={dialogStyles.hint}>Não implica apagar dados relacionados nem bloquear universalmente todos os acessos do tenant. Sem controle de versão ou idempotência: alterações concorrentes continuam possíveis.</p>
      <dl className={styles.facts}>
        {Object.entries({ Nome: identity.name, 'ID numérico': identity.id, 'Identificador (slug)': identity.slug, 'URL base': identity.baseUrl ?? '—',
          'Estado revisado': command?.baseline.status ?? latest?.status ?? 'Aguardando GET', 'Estado solicitado': command?.expectedStatus ?? (operation === 'activate' ? 'active' : 'inactive') }).map(([label, value]) =>
          <div key={label} className={styles.fact}><dt>{label}</dt><dd className={styles.factValue}>{value}</dd></div>)}
      </dl>
      {!mutation.hasAttempt ? <>
        {preflight.state.status === 'loading' ? <p role="status">Conferindo registro atual por GET…</p> : null}
        {preflight.state.status === 'error' ? <div role="alert"><p>Não foi possível conferir o alvo. Nada foi enviado.</p><OutlineButton onClick={preflight.reload}>Conferir novamente</OutlineButton></div> : null}
        {latest && !built?.ok ? <p role="alert">A identidade ou o estado não corresponde mais à revisão. Nada foi enviado. Feche e reabra a ação a partir do registro atual.</p> : null}
        {built?.ok ? <div className={styles.lifecycleConfirmation}>
          <label className={styles.lifecycleCheck}><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />
            <span>Conferi nome, ID e slug. Confirmo tornar este Whitelabel {built.command.expectedStatus === 'active' ? 'ativo' : 'inativo'}{operation === 'logical-delete' ? ', sem remoção física ou cascata' : ''}.</span></label>
          {operation === 'logical-delete' ? <div className={dialogStyles.field}><label htmlFor="wl-delete-slug" className={dialogStyles.label}>Digite o slug para confirmar a exclusão lógica</label>
            <input id="wl-delete-slug" className={dialogStyles.input} value={slug} onChange={event => setSlug(event.target.value)} autoComplete="off" spellCheck={false} /></div> : null}
        </div> : null}
      </> : <OperationalMutationState mutation={mutation} onReview={review} onInspectRecord={onInspectRecord ? value => { onInspectRecord(value); close() } : undefined} />}
      {command ? <details className={styles.payload}><summary>{mutation.hasAttempt ? 'Solicitação revisada' : 'Requisição prevista (não enviada)'}</summary>
        <p className={styles.payloadRoute}>{command.route}</p><p>Sem corpo. Slug, nome e URL base não são enviados nem alterados.</p></details> : null}
    </div>
  </Dialog>
}
