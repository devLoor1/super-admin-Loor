import type { ComponentProps } from 'react'
import styles from './Switch.module.css'

type SwitchProps = Omit<ComponentProps<'button'>, 'role' | 'onChange'> & {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

/**
 * Accessible on/off switch (`role="switch"` + `aria-checked`). Name it with
 * `aria-label` or `aria-labelledby`; the visual track never carries meaning alone.
 */
export function Switch({ checked, onCheckedChange, className, disabled, ...props }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={[styles.switch, className].filter(Boolean).join(' ')}
      onClick={() => onCheckedChange(!checked)}
      {...props}
    >
      <span className={styles.thumb} aria-hidden="true" />
    </button>
  )
}
