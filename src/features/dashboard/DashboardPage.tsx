import { Building, ChartNoAxesColumnIncreasing, CreditCard, ShieldCheck, Users, type LucideIcon } from 'lucide-react'
import { AppShell } from '../../components/shell/AppShell'
import { moduleUnavailable, usePrototypeNotice } from '../../components/shell/prototypeNotice'
import type { Tone } from '../../components/ui/IconTile'
import { ActivityPanel } from './ActivityPanel'
import { GlobalOverviewPanel } from './GlobalOverviewPanel'
import { MetricCard } from './MetricCard'
import { OperationalStatusPanel } from './OperationalStatusPanel'
import { QuickActionsPanel } from './QuickActionsPanel'
import { RecentEventsPanel } from './RecentEventsPanel'
import { WhitelabelDistributionPanel } from './WhitelabelDistributionPanel'
import styles from './DashboardPage.module.css'

/**
 * Global Dashboard V1 — the Super Admin control plane overview.
 *
 * DATA-READY / EMPTY STATES ONLY: every panel shows where real data will live
 * ("—", "Sem dados", "Aguardando integração") without inventing metrics.
 */
export function DashboardPage() {
  return (
    <AppShell activeNav="dashboard" title="Dashboard Global" location="Visão geral">
      <DashboardContent />
    </AppShell>
  )
}

const METRICS: { id: string; label: string; module: string; icon: LucideIcon; tone: Tone }[] = [
  { id: 'whitelabels', label: 'Whitelabels', module: 'Plataformas', icon: Building, tone: 'blue' },
  { id: 'investidores', label: 'Investidores', module: 'Operação', icon: Users, tone: 'violet' },
  { id: 'oportunidades', label: 'Oportunidades', module: 'Operação', icon: ChartNoAxesColumnIncreasing, tone: 'teal' },
  { id: 'pagamentos', label: 'Pagamentos', module: 'Financeiro', icon: CreditCard, tone: 'amber' },
  { id: 'kyc', label: 'KYC', module: 'Compliance', icon: ShieldCheck, tone: 'indigo' },
]

function DashboardContent() {
  const notify = usePrototypeNotice()

  return (
    <div className={styles.dashboard}>
      <section aria-labelledby="kpi-heading">
        <h2 id="kpi-heading" className="visually-hidden">
          Indicadores globais
        </h2>
        <ul className={styles.kpis}>
          {METRICS.map((metric) => (
            <li key={metric.id} className={styles.kpiCell}>
              <MetricCard
                label={metric.label}
                icon={metric.icon}
                tone={metric.tone}
                onOpen={() => notify(moduleUnavailable(metric.module))}
              />
            </li>
          ))}
        </ul>
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
