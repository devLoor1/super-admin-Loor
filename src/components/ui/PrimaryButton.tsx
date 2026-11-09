import type { ButtonHTMLAttributes } from 'react'
import styles from './PrimaryButton.module.css'

/** High-emphasis action on dark surfaces (one per panel). */
export function PrimaryButton({ className, type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={[styles.button, className].filter(Boolean).join(' ')} {...props} />
}
