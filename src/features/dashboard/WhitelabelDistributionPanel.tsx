import { Panel } from '../../components/ui/Panel'
import { OutlineButton } from '../../components/ui/OutlineButton'
import type { RemoteState } from '../../lib/useRemoteResource'
import { formatKpi, freshnessLabel, type DashboardOverview } from './dashboardApi'
import { DISTRIBUTION_CIRCUMFERENCE, DISTRIBUTION_RADIUS, investorDistributionView, type DistributionView } from './investorDistribution'
import { useInvestorDistributionRegistry } from './useInvestorDistribution'
import styles from './WhitelabelDistributionPanel.module.css'

const SIZE = 177
const OUTER = SIZE / 2
const THICKNESS = 28.5

/** The complete textual legend is the accessible chart; the SVG never repeats it. */
export function InvestorDistributionContent({ view, onRetry }: { view: DistributionView; onRetry: () => void }) {
  return (
    <figure className={styles.figure} data-investor-distribution={view.status} aria-busy={view.status === 'loading'}>
      <div className={styles.body}>
        <div className={styles.donut} aria-hidden="true">
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true" focusable="false">
            <circle cx={OUTER} cy={OUTER} r={DISTRIBUTION_RADIUS} fill="none" stroke="var(--surface-track)" strokeWidth={THICKNESS} />
            {view.status === 'ready' ? view.segments.filter((row) => row.count > 0).map((row) => (
              <circle key={row.id} data-segment-id={row.id} cx={OUTER} cy={OUTER} r={DISTRIBUTION_RADIUS}
                fill="none" stroke={row.color} strokeWidth={THICKNESS} strokeLinecap="butt"
                strokeDasharray={`${row.length} ${DISTRIBUTION_CIRCUMFERENCE - row.length}`}
                strokeDashoffset={-row.offset} transform={`rotate(-90 ${OUTER} ${OUTER})`} />
            )) : null}
          </svg>
          <div className={styles.center}>
            <span className={styles.centerValue}>{view.status === 'ready' ? formatKpi(view.total) : '—'}</span>
            <span className={styles.centerLabel}>{view.status === 'ready' ? 'Investidores' : view.status === 'loading' ? 'Carregando' : 'Indisponível'}</span>
          </div>
        </div>
        {view.status === 'ready' ? (
          <div className={styles.legendViewport} role="region" aria-label="Investidores por Whitelabel: lista completa" tabIndex={0}>
            {view.total === 0 ? <p className={styles.message}>Nenhum investidor cadastrado.</p> : null}
            <ul className={styles.legend}>
              {view.segments.map((row) => (
                <li key={row.id} className={styles.legendRow} data-tenant-id={row.id}>
                  <span className={styles.dot} style={{ background: row.color }} aria-hidden="true" />
                  <div>
                    <span className={styles.legendName}>{row.name}</span>
                    <span className={styles.legendValue}>{formatKpi(row.count)} investidores · {row.percentage}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : view.status === 'loading' ? <p className={styles.message} role="status">Consultando o registro completo e o total global…</p> : (
          <div className={styles.message} role="status">
            <strong>{view.title}</strong>
            <p>{view.description}</p>
            {view.correlationId ? <p>Código de diagnóstico: <code>{view.correlationId}</code></p> : null}
            {view.retry ? <OutlineButton onClick={onRetry}>Tentar novamente{view.retry === 'both' ? ': duas fontes' : ''}</OutlineButton> : null}
          </div>
        )}
      </div>
      <figcaption className={styles.caption}>
        {view.status === 'ready' ? <>
          <span className="visually-hidden">Distribuição de investidores cadastrados por todos os Whitelabels. Total global: {formatKpi(view.total)} investidores. </span>
          Registro consultado: {freshnessLabel(view.consultedAt).replace('Atualizado', 'consultado')}. Total global: {freshnessLabel(view.overviewFreshness)}.
          {' '}Consultas independentes, sem atualização contínua. Percentuais arredondados.
        </> : 'Participações exibidas somente após cobertura completa e reconciliação com o total global.'}
      </figcaption>
    </figure>
  )
}

export function WhitelabelDistributionPanel({ className, overview, onReloadOverview }: {
  className?: string; overview: RemoteState<DashboardOverview>; onReloadOverview: () => void
}) {
  const registry = useInvestorDistributionRegistry()
  const view = investorDistributionView(registry.state, overview)
  function retry() {
    if (view.status !== 'unavailable') return
    if (view.retry === 'registry' || view.retry === 'both') registry.reload()
    if (view.retry === 'overview' || view.retry === 'both') onReloadOverview()
  }

  return (
    <Panel
      className={className}
      title="Distribuição de investidores por Whitelabel"
      subtitle="Participação no total de investidores cadastrados."
    >
      <InvestorDistributionContent view={view} onRetry={retry} />
    </Panel>
  )
}
