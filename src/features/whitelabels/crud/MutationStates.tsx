import type { ReactNode } from 'react'
import { CircleAlert, Clock3, Link2Off, Lock, RotateCw } from 'lucide-react'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import { WHITELABEL_MUTATIONS, type MutationErrorView, type WhitelabelMutationAction } from './whitelabelMutationContract'
import styles from './WhitelabelCrud.module.css'

/**
 * "UI pronta, ação do Backend indisponível": shown wherever a flow stops
 * before persistence. States plainly that nothing was sent or saved.
 */
export function PendingBackendNotice({ action, id, children }: { action: WhitelabelMutationAction; id: string; children?: ReactNode }) {
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
 * Final commit button of a flow while its Backend action is unavailable:
 * focusable (`aria-disabled`) so its pending description is announced, but
 * it never submits anything.
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

/**
 * Prepared presentation of a future mutation failure (400 / 403 / 404 / 409 /
 * 5xx / network / timeout). Not bound to any request in this version.
 */
export function MutationErrorNotice({ error, onRetry }: { error: MutationErrorView; onRetry?: () => void }) {
  const Icon = error.kind === 'dependencies' ? Link2Off : CircleAlert
  return (
    <div className={styles.errorNotice} role="alert" data-mutation-error={error.kind}>
      <Icon size={16} strokeWidth={1.9} aria-hidden="true" />
      <div>
        <p className={styles.errorTitle}>{error.title}</p>
        <p className={styles.errorText}>{error.description}</p>
        {error.kind === 'dependencies' ? (
          <p className={styles.errorText}>Os vínculos são verificados pelo Backend; nenhuma contagem é calculada nesta tela.</p>
        ) : null}
        {error.correlationId ? (
          <p className={styles.errorMeta}>
            Código de diagnóstico: <code>{error.correlationId}</code>
          </p>
        ) : null}
        {error.retryable && onRetry ? (
          <OutlineButton className={styles.errorRetry} onClick={onRetry}>
            <RotateCw size={14} strokeWidth={1.8} aria-hidden="true" />
            Tentar novamente
          </OutlineButton>
        ) : null}
      </div>
    </div>
  )
}
