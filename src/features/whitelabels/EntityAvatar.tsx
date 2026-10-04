import { Building } from 'lucide-react'
import styles from './EntityAvatar.module.css'

type EntityAvatarProps = {
  initial?: string
  tone: 'blue' | 'violet' | 'neutral'
  size?: 'md' | 'lg'
}

/** Square monogram (or neutral building icon) identifying a whitelabel. Decorative. */
export function EntityAvatar({ initial, tone, size = 'md' }: EntityAvatarProps) {
  return (
    <span className={styles.avatar} data-tone={tone} data-size={size} aria-hidden="true">
      {initial ?? <Building size={size === 'lg' ? 24 : 17} strokeWidth={1.6} />}
    </span>
  )
}
