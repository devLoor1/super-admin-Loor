import { AlertTriangle, LayoutGrid, Landmark, Link2, type LucideIcon } from 'lucide-react'
import { IconTile, type Tone } from '../../../components/ui/IconTile'
import {
  MODALITIES,
  displayStatusOf,
  modalityDisplay,
  setupOf,
  type WhitelabelFinanceSettings,
} from '../financeModel'
import styles from './FinanceSections.module.css'

type Card = { label: string; value: number; detail: string; icon: LucideIcon; tone: Tone }

/**
 * Counts derived strictly from this Whitelabel's local prototype state (never
 * production data). Pendências = local configuration gaps only.
 */
export function SummaryCards({ settings }: { settings: WhitelabelFinanceSettings }) {
  const { gateways, bankAccounts } = settings
  const configured = gateways.filter((gateway) => displayStatusOf(gateway) === 'configured').length
  const activeAccounts = bankAccounts.filter((account) => account.status === 'active').length
  const enabled = MODALITIES.filter((modality) => modalityDisplay(settings, modality.id) === 'enabled').length
  const pending =
    gateways.filter((gateway) => gateway.active && setupOf(gateway) !== 'configured').length +
    MODALITIES.filter((modality) => modalityDisplay(settings, modality.id) === 'dependency_pending').length

  const cards: Card[] = [
    {
      label: 'Gateways configurados',
      value: configured,
      detail: `de ${gateways.length} ${gateways.length === 1 ? 'cadastrado' : 'cadastrados'} no protótipo`,
      icon: Link2,
      tone: 'violet',
    },
    {
      label: 'Contas bancárias ativas',
      value: activeAccounts,
      detail: `de ${bankAccounts.length} ${bankAccounts.length === 1 ? 'cadastrada' : 'cadastradas'}`,
      icon: Landmark,
      tone: 'teal',
    },
    {
      label: 'Modalidades habilitadas',
      value: enabled,
      detail: `de ${MODALITIES.length} conceitos (protótipo)`,
      icon: LayoutGrid,
      tone: 'blue',
    },
    {
      label: 'Pendências locais',
      value: pending,
      detail: pending ? 'Configuração incompleta' : 'Nenhuma pendência local',
      icon: AlertTriangle,
      tone: pending ? 'amber' : 'neutral',
    },
  ]

  return (
    <section className={styles.summary} aria-labelledby="fin-summary-title" data-detail-stage>
      <h2 id="fin-summary-title" className="visually-hidden">
        Resumo da configuração local
      </h2>
      {cards.map((card) => (
        <article key={card.label} className={styles.summaryCard}>
          <IconTile icon={card.icon} tone={card.tone} size="lg" />
          <div className={styles.summaryText}>
            <h3 className={styles.summaryLabel}>{card.label}</h3>
            <p className={styles.summaryValue}>{card.value}</p>
            <p className={styles.summaryDetail}>{card.detail}</p>
          </div>
        </article>
      ))}
      <p className={styles.summaryNote}>Contagens da configuração local deste protótipo — não são dados de produção.</p>
    </section>
  )
}
