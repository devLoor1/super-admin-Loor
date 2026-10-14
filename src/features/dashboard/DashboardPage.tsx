import { Building, ChartNoAxesColumnIncreasing, CircleAlert, CreditCard, RotateCw, ShieldCheck, Users, type LucideIcon } from 'lucide-react'
import { AppShell } from '../../components/shell/AppShell'
import { moduleUnavailable, usePrototypeNotice } from '../../components/shell/prototypeNotice'
import type { Tone } from '../../components/ui/IconTile'
import { OutlineButton } from '../../components/ui/OutlineButton'
import { describeApiError } from '../../lib/apiErrors'
import { ActivityPanel } from './ActivityPanel'
import { GlobalOverviewPanel } from './GlobalOverviewPanel'
import { MetricCard, type MetricReading } from '../../components/ui/MetricCard'
import { OperationalStatusPanel } from './OperationalStatusPanel'
import { QuickActionsPanel } from './QuickActionsPanel'
import { RecentEventsPanel } from './RecentEventsPanel'
import { WhitelabelDistributionPanel } from './WhitelabelDistributionPanel'
import { formatKpi, freshnessLabel, type DashboardOverview } from './dashboardApi'
import { useDashboardOverview } from './useDashboardOverview'
import styles from './DashboardPage.module.css'

/**
 * Global Dashboard V1 — the Super Admin control plane overview.
 *
 * Whitelabels and Investidores read `GET /dashboard` (Control Plane, global
 * scope); their meaning is proven in docs/dashboard-read-integration-v1.md.
 * Every other panel keeps its data-ready state ("—", "Sem dados",
 * "Aguardando integração"): no metric, series, distribution, health or event
 * is inferred, and nothing comes from prototype data.
 */
export function DashboardPage() {
  return (
    <AppShell activeNav="dashboard" title="Dashboard Global" location="Visão geral">
      <DashboardContent />
    </AppShell>
  )
}

type KpiSource = keyof DashboardOverview['kpis']

const METRICS: { id: string; label: string; module: string; icon: LucideIcon; tone: Tone; source?: KpiSource }[] = [
  { id: 'whitelabels', label: 'Whitelabels', module: 'Plataformas', icon: Building, tone: 'blue', source: 'whitelabels' },
  { id: 'investidores', label: 'Investidores', module: 'Operação', icon: Users, tone: 'violet', source: 'investors' },
  // No authoritative source in the Dashboard contract: these stay "Aguardando integração".
  { id: 'oportunidades', label: 'Oportunidades', module: 'Operação', icon: ChartNoAxesColumnIncreasing, tone: 'teal' },
  { id: 'pagamentos', label: 'Pagamentos', module: 'Financeiro', icon: CreditCard, tone: 'amber' },
  { id: 'kyc', label: 'KYC', module: 'Compliance', icon: ShieldCheck, tone: 'indigo' },
]

/** KPI cards whose module now exists open it; the rest keep the prototype notice. */
const DESTINATIONS: Record<string, string> = {
  whitelabels: '#/whitelabels',
  investidores: '#/operation/investors',
  oportunidades: '#/operation/opportunities',
  pagamentos: '#/finance/payments',
  // The card keeps its "Aguardando integração" state: it only opens the KYC list.
  kyc: '#/compliance/kyc',
}

function DashboardContent() {
  const notify = usePrototypeNotice()
  const overview = useDashboardOverview()
  const error = overview.state.status === 'error' ? describeApiError(overview.state.error, 'os indicadores do Dashboard') : null

  function reading(source: KpiSource | undefined): MetricReading | undefined {
    if (!source) return undefined
    if (overview.state.status === 'success') {
      const { kpis, freshness } = overview.state.data
      const value = kpis[source]
      return value === null
        ? { state: 'unavailable', status: 'Não informado pelo Control Plane' }
        : { state: 'ready', value: formatKpi(value), status: freshnessLabel(freshness) }
    }
    if (error) return { state: 'unavailable', status: error.retryable ? 'Indisponível no momento' : error.title }
    return { state: 'loading' }
  }

  return (
    <div className={styles.dashboard}>
      <section aria-labelledby="kpi-heading" data-dashboard-kpis>
        <h2 id="kpi-heading" className="visually-hidden">
          Indicadores globais
        </h2>
        <ul className={styles.kpis}>
          {METRICS.map((metric) => (
            <li key={metric.id} className={styles.kpiCell} data-kpi={metric.id}>
              <MetricCard
                label={metric.label}
                icon={metric.icon}
                tone={metric.tone}
                reading={reading(metric.source)}
                onOpen={() => DESTINATIONS[metric.id]
                  ? window.location.assign(DESTINATIONS[metric.id])
                  : notify(moduleUnavailable(metric.module))}
              />
            </li>
          ))}
        </ul>
        {error ? (
          <div className={styles.kpiError} role="alert" data-dashboard-error>
            <CircleAlert size={16} strokeWidth={1.9} aria-hidden="true" />
            <p className={styles.kpiErrorText}>
              <strong>{error.title}.</strong> {error.description}
              {error.correlationId ? (
                <>
                  {' '}
                  Código de diagnóstico: <code className={styles.kpiErrorCode}>{error.correlationId}</code>
                </>
              ) : null}
            </p>
            {error.retryable ? (
              <OutlineButton onClick={overview.reload} className={styles.kpiRetry}>
                <RotateCw size={14} strokeWidth={1.8} aria-hidden="true" />
                Tentar novamente
              </OutlineButton>
            ) : null}
          </div>
        ) : null}
      </section>

      <GlobalOverviewPanel />

      <div className={styles.middle}>
        <ActivityPanel className={styles.activity} />
        <WhitelabelDistributionPanel className={styles.distribution} />
        <OperationalStatusPanel className={styles.status} />
      </div>

      <div className={styles.bottom}>
        <RecentEventsPanel />
        <QuickActionsPanel />
      </div>
    </div>
  )
}
