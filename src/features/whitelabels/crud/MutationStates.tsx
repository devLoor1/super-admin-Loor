import type { ReactNode } from 'react'
import { CheckCircle2, CircleAlert, Clock3, Lock, TriangleAlert } from 'lucide-react'
import { WHITELABEL_MUTATIONS, type WhitelabelAction } from './whitelabelMutationContract'
import type { MutationOutcomeView } from './whitelabelMutationOutcome'
import styles from './WhitelabelCrud.module.css'

/**
 * Shown wherever a prepared flow stops before persistence: the integration is
 * not released, nothing was sent and nothing was saved.
 */
export function PendingBackendNotice({ action, id, children }: { action: WhitelabelAction; id: string; children?: ReactNode }) {
  const meta = WHITELABEL_MUTATIONS[action]
  return (
    <div className={styles.pending} id={id} data-backend-pending={action}>
      <Clock3 size={16} strokeWidth={1.9} aria-hidden="true" />
      <div>
        <p className={styles.pendingTitle}>{meta.pendingLabel}</p>
        <p className={styles.pendingText}>
          {meta.reason} Nada foi enviado ao Control Plane e nenhum dado foi salvo.
        </p>
        {children}
      </div>
    </div>
  )
}

/**
 * Final commit button while the integration is not released: focusable
 * (`aria-disabled`) so its pending description is announced, but it never
 * submits anything — for every role, SUPER_ADMIN included.
 */
export function PendingActionButton({
  label,
  describedBy,
  tone = 'primary',
}: {
  label: string
  describedBy: string
  tone?: 'primary' | 'danger'
}) {
  return (
    <button
      type="button"
      className={styles.pendingAction}
      data-tone={tone}
      aria-disabled="true"
      aria-describedby={describedBy}
      data-pending-action
      onClick={(event) => event.preventDefault()}
    >
      <Lock size={15} strokeWidth={1.9} aria-hidden="true" />
      {label} (pendente)
    </button>
  )
}

const OUTCOME_ICON = { success: CheckCircle2, danger: CircleAlert, warning: TriangleAlert } as const

/**
 * Prepared presentation of a future write outcome (confirmed / rejected /
 * uncertain / stale). Display only: no screen renders it in this version —
 * it is reviewed through the mock-only harness.
 */
export function MutationOutcomeNotice({ view }: { view: MutationOutcomeView }) {
  const Icon = OUTCOME_ICON[view.tone]
  return (
    <div className={styles.outcome} data-tone={view.tone} data-outcome={view.state} role={view.tone === 'success' ? 'status' : 'alert'}>
      <Icon size={16} strokeWidth={1.9} aria-hidden="true" />
      <div>
        <p className={styles.outcomeTitle}>{view.title}</p>
        <p className={styles.outcomeText}>{view.description}</p>
        <p className={styles.outcomeNext}>
          <strong>Próximo passo:</strong> {view.next}
        </p>
        {view.correlationId ? (
          <p className={styles.outcomeMeta}>
            Código de diagnóstico: <code>{view.correlationId}</code>
          </p>
        ) : null}
      </div>
    </div>
  )
}
