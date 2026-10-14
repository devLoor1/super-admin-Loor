import { ArrowRight, type LucideIcon } from 'lucide-react'
import { IconTile, type Tone } from './IconTile'
import styles from './MetricCard.module.css'

/**
 * Integration state of a KPI read from the Control Plane. Without it the card
 * stays in its data-ready state ("—" + "Aguardando integração").
 * - `ready`: an authoritative value (zero included) — never a placeholder;
 * - `unavailable`: the read failed or did not supply this value — "—", never 0.
 */
export type MetricReading =
  | { state: 'loading' }
  | { state: 'ready'; value: string; status: string }
  | { state: 'unavailable'; status: string }

type MetricCardProps = {
  label: string
  icon: LucideIcon
  tone: Tone
  onOpen: () => void
  density?: 'default' | 'compact'
  reading?: MetricReading
}

/**
 * KPI card. In its data-ready state there is deliberately no value: the card
 * shows "—" (announced as "Sem dados") until a real integration exists.
 */
export function MetricCard({ label, icon, tone, onOpen, density = 'default', reading }: MetricCardProps) {
  const state = reading?.state
  return (
    <article className={styles.card} data-density={density} data-state={state} aria-busy={state === 'loading' || undefined}>
      <IconTile icon={icon} tone={tone} size="lg" className={styles.tile} />
      <h3 className={styles.label}>{label}</h3>
      <p className={styles.value}>
        {reading?.state === 'ready' ? (
          reading.value
        ) : reading?.state === 'loading' ? (
          <>
            <span className={styles.skeleton} aria-hidden="true" />
            <span className="visually-hidden">Carregando</span>
          </>
        ) : (
          <>
            <span aria-hidden="true">—</span>
            <span className="visually-hidden">{reading ? 'Indisponível' : 'Sem dados'}</span>
          </>
        )}
      </p>
      <p className={styles.status}>
        {!reading ? 'Aguardando integração' : reading.state === 'loading' ? 'Carregando…' : reading.status}
      </p>
      {/* The arrow button's hit area stretches over the whole card. */}
      <button type="button" className={styles.open} onClick={onOpen} aria-label={`Abrir ${label}`}>
        <ArrowRight size={15} strokeWidth={1.8} aria-hidden="true" />
      </button>
    </article>
  )
}
