import type { ButtonHTMLAttributes } from 'react'
import styles from './OutlineButton.module.css'

/** Low-emphasis bordered button for panel-level actions on dark surfaces. */
export function OutlineButton({ className, type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={[styles.button, className].filter(Boolean).join(' ')} {...props} />
}
