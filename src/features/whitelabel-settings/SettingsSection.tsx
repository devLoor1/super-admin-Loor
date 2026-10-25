import type { ReactNode } from 'react'
import { StatusPill } from '../../components/ui/StatusPill'
import styles from './SettingsSection.module.css'

/** Read-only section shared by the authoritative Whitelabel Settings projection. */
export function SettingsSection({ id, title, subtitle, children }: {
  id: string
  title: string
  subtitle: string
  status?: 'readonly'
  children: ReactNode
}) {
  return (
    <section id={id} className={styles.section} aria-labelledby={`${id}-title`} data-detail-stage={id}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <div className={styles.titleRow}>
            <h2 id={`${id}-title`} className={styles.title} tabIndex={-1}>{title}</h2>
            <StatusPill tone="muted" label="Somente leitura" />
          </div>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>
      </header>
      <div className={styles.body}>{children}</div>
    </section>
  )
}
