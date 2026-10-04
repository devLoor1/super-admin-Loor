import { useId, type ReactNode } from 'react'
import styles from './Panel.module.css'

type PanelProps = {
  title: string
  subtitle?: string
  /** Optional controls aligned to the right of the heading. */
  actions?: ReactNode
  className?: string
  children: ReactNode
}

/** Dark surface card with a heading row — the base container for dashboard panels. */
export function Panel({ title, subtitle, actions, className, children }: PanelProps) {
  const headingId = useId()

  return (
    <section className={[styles.panel, className].filter(Boolean).join(' ')} aria-labelledby={headingId}>
      <div className={styles.header}>
        <div className={styles.heading}>
          <h2 id={headingId} className={styles.title}>
            {title}
          </h2>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        </div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
      {children}
    </section>
  )
}
