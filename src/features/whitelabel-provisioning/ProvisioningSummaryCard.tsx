import { describeApiError } from '../../lib/apiErrors'
import { ApiError } from '../../lib/api'
import { useRemote } from '../../lib/useRemoteResource'
import { OutlineButton } from '../../components/ui/OutlineButton'
import { getWhitelabelProvisioning } from './provisioningApi'
import { STEP_LABELS } from './provisioningLabels'
import { provisioningHref } from './provisioningRoute'
import { ProvisioningStatusBadge } from './ProvisioningUi'
import styles from './Provisioning.module.css'

/**
 * Read-only implantation summary for the Whitelabel detail (`GET /whitelabels/:id/provisioning`).
 * A 404 means the tenant was not created through an implantation; a 403 hides the card.
 */
export function ProvisioningSummaryCard({ whitelabelId }: { whitelabelId: string }) {
  const { state, reload } = useRemote(`prov-summary:${whitelabelId}`, async (signal) => getWhitelabelProvisioning(whitelabelId, signal))

  if (state.status === 'error' && state.error instanceof ApiError && state.error.status === 403) return null

  return (
    <section className={styles.summary} aria-labelledby={`prov-summary-${whitelabelId}`} aria-busy={state.status === 'loading' || undefined} data-detail-stage="provisioning">
      <div className={styles.summaryHead}>
        <h3 id={`prov-summary-${whitelabelId}`} className={styles.summaryTitle}>Implantação</h3>
        {state.status === 'success' ? <ProvisioningStatusBadge status={state.data.status} /> : null}
      </div>

      {state.status === 'loading' || state.status === 'idle' ? (
        <span className={styles.skeleton} style={{ width: '60%' }} aria-hidden="true" />
      ) : null}

      {state.status === 'success' ? (
        <>
          <div className={styles.progressWrap} style={{ marginTop: 0 }}>
            <div className={styles.progressMeta}>
              <span>
                {state.data.progress.completed} de {state.data.progress.total} etapas
                {state.data.currentStep ? ` · ${STEP_LABELS[state.data.currentStep]}` : ''}
              </span>
              <span>{Math.min(100, Math.max(0, Math.round(state.data.progress.percentage)))}%</span>
            </div>
            <div className={styles.progressBar} role="progressbar" aria-label="Progresso da implantação" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.max(0, Math.round(state.data.progress.percentage)))}>
              <div className={styles.progressFill} data-status={state.data.status} style={{ width: `${Math.min(100, Math.max(0, Math.round(state.data.progress.percentage)))}%` }} />
            </div>
          </div>
          <a className={styles.link} href={provisioningHref(state.data.id)}>Ver implantação</a>
        </>
      ) : null}

      {state.status === 'error' ? <ErrorBody error={state.error} onRetry={reload} /> : null}
    </section>
  )
}

function ErrorBody({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const view = describeApiError(error, 'a implantação')
  if (view.notFound) return <p className={styles.muted}>Nenhuma implantação registrada para este Whitelabel.</p>
  return (
    <div role="alert">
      <p className={styles.muted}>{view.description}</p>
      {view.retryable ? <OutlineButton onClick={onRetry}>Tentar novamente</OutlineButton> : null}
    </div>
  )
}
