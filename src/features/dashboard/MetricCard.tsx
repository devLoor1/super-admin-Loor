import { ArrowRight, type LucideIcon } from 'lucide-react'
import { IconTile, type Tone } from '../../components/ui/IconTile'
import styles from './MetricCard.module.css'

type MetricCardProps = {
  label: string
  icon: LucideIcon
  tone: Tone
  onOpen: () => void
}

/**
 * KPI card in its data-ready state. There is deliberately no value: the card
 * shows "—" (announced as "Sem dados") until a real integration exists.
 */
export function MetricCard({ label, icon, tone, onOpen }: MetricCardProps) {
  return (
    <article className={styles.card}>
      <IconTile icon={icon} tone={tone} size="lg" className={styles.tile} />
      <h3 className={styles.label}>{label}</h3>
      <p className={styles.value}>
        <span aria-hidden="true">—</span>
        <span className="visually-hidden">Sem dados</span>
      </p>
      <p className={styles.status}>Aguardando integração</p>
      {/* The arrow button's hit area stretches over the whole card. */}
      <button type="button" className={styles.open} onClick={onOpen} aria-label={`Abrir ${label}`}>
        <ArrowRight size={15} strokeWidth={1.8} aria-hidden="true" />
      </button>
    </article>
  )
}
