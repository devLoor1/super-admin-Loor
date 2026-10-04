import type { ReactNode, SelectHTMLAttributes } from 'react'
import { ChevronDown, type LucideIcon } from 'lucide-react'
import styles from './SelectField.module.css'

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  id: string
  /** Accessible label (visually hidden). */
  label: string
  icon?: LucideIcon
  children: ReactNode
}

/** Native <select> styled for dark panels (keeps native keyboard and screen-reader behaviour). */
export function SelectField({ id, label, icon: Icon, className, children, ...selectProps }: SelectFieldProps) {
  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      {Icon ? <Icon className={styles.icon} size={17} strokeWidth={1.7} aria-hidden="true" /> : null}
      <label htmlFor={id} className="visually-hidden">
        {label}
      </label>
      <select id={id} className={styles.select} data-has-icon={Icon ? true : undefined} {...selectProps}>
        {children}
      </select>
      <ChevronDown className={styles.chevron} size={16} strokeWidth={1.8} aria-hidden="true" />
    </div>
  )
}
