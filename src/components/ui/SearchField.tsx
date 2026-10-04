import type { InputHTMLAttributes } from 'react'
import { Search } from 'lucide-react'
import styles from './SearchField.module.css'

type SearchFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  id: string
  /** Accessible label (visually hidden; the placeholder is only a hint). */
  label: string
}

/** Labelled search input with a leading icon, for dark panels. */
export function SearchField({ id, label, className, ...inputProps }: SearchFieldProps) {
  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      <Search className={styles.icon} size={18} strokeWidth={1.7} aria-hidden="true" />
      <label htmlFor={id} className="visually-hidden">
        {label}
      </label>
      <input id={id} type="search" autoComplete="off" spellCheck={false} className={styles.input} {...inputProps} />
    </div>
  )
}
