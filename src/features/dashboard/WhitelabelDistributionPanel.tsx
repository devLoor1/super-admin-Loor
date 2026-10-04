import { useId } from 'react'
import { Panel } from '../../components/ui/Panel'
import styles from './WhitelabelDistributionPanel.module.css'

/** Legend dot colours from the approved image. Not bound to ring segments until real data exists. */
const LEGEND_COLORS = ['#848eec', '#6264f1', '#aea7fa', '#9e94f0', '#a176f6']
/** Skeleton bar lengths (px) — purely visual, they encode nothing. */
const LEGEND_BARS = [71, 77, 71, 91, 78]

const SIZE = 177
const OUTER = SIZE / 2
const THICKNESS = 28.5
const RADIUS = OUTER - THICKNESS / 2

/**
 * Empty distribution container. An unsegmented, muted ring avoids implying
 * fabricated shares. Legend slots are decorative skeletons, not tenant rows.
 */
export function WhitelabelDistributionPanel({ className }: { className?: string }) {
  const placeholderId = useId()

  return (
    <Panel
      className={className}
      title="Distribuição por Whitelabel"
      subtitle="Participação no volume total da plataforma."
    >
      <div className={styles.body}>
        <figure className={styles.donut}>
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true" focusable="false">
            <defs>
              <linearGradient id={placeholderId} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#495287" />
                <stop offset="1" stopColor="#303650" />
              </linearGradient>
            </defs>
            <circle
              cx={OUTER}
              cy={OUTER}
              r={RADIUS}
              fill="none"
              stroke={`url(#${placeholderId})`}
              strokeWidth={THICKNESS}
            />
          </svg>
          <figcaption className={styles.center}>
            <span className={styles.centerValue} aria-hidden="true">
              —
            </span>
            <span className={styles.centerLabel}>Sem dados</span>
            <span className="visually-hidden"> — distribuição por whitelabel ainda não disponível.</span>
          </figcaption>
        </figure>

        <ul className={styles.legend} aria-hidden="true">
          {LEGEND_COLORS.map((color, index) => (
            <li key={color} className={styles.legendRow}>
              <span className={styles.dot} style={{ background: color }} />
              <span className={styles.skeleton} style={{ width: LEGEND_BARS[index] }} />
              <span className={styles.legendValue}>—</span>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  )
}
