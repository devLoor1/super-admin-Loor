import styles from './StatusPill.module.css'

export type StatusTone = 'success' | 'warning' | 'neutral' | 'muted' | 'danger'

/** Dot + text status label. The text always carries the meaning; colour only reinforces it. */
export function StatusPill({ tone, label }: { tone: StatusTone; label: string }) {
  return (
    <span className={styles.pill} data-tone={tone}>
      <span className={styles.dot} aria-hidden="true" />
      {label}
    </span>
  )
}
