import type { BusinessTone } from './accountModel'
import styles from './AccountBadges.module.css'

/**
 * Business/validation state: a squared badge without a dot, so it never reads
 * as the access state (rounded StatusPill with a dot). Text carries the meaning.
 */
export function BusinessBadge({ tone, label }: { tone: BusinessTone; label: string }) {
  return (
    <span className={styles.badge} data-tone={tone}>
      {label}
    </span>
  )
}

/** Initials monogram for a person account. Decorative (the name is always shown). */
export function AccountAvatar({ initials, size = 'md' }: { initials: string; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span className={styles.avatar} data-size={size} aria-hidden="true">
      {initials}
    </span>
  )
}
