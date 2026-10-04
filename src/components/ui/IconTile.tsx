import type { LucideIcon } from 'lucide-react'
import styles from './IconTile.module.css'

export type Tone = 'blue' | 'violet' | 'teal' | 'amber' | 'indigo' | 'plum' | 'neutral'

type IconTileProps = {
  icon: LucideIcon
  /** Module identity tone. Not a status colour. */
  tone?: Tone
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const ICON_SIZE = { sm: 17, md: 20, lg: 22 } as const

/** Rounded, tinted square that frames a module icon. Decorative. */
export function IconTile({ icon: Icon, tone = 'neutral', size = 'md', className }: IconTileProps) {
  return (
    <span
      className={[styles.tile, className].filter(Boolean).join(' ')}
      data-tone={tone}
      data-size={size}
      aria-hidden="true"
    >
      <Icon size={ICON_SIZE[size]} strokeWidth={1.6} />
    </span>
  )
}
