import type { InputHTMLAttributes, ReactNode, Ref } from 'react'
import type { LucideIcon } from 'lucide-react'
import styles from './FormField.module.css'

export type FormFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  id: string
  label: string
  /** Leading decorative icon inside the control. */
  icon: LucideIcon
  /** Validation message. When set, the field renders its error state. */
  error?: string
  /** Optional element rendered at the end of the control (e.g. a visibility toggle). */
  trailing?: ReactNode
  ref?: Ref<HTMLInputElement>
}

/**
 * Labelled text input with a leading icon and an inline error message.
 * The visible border lives on the wrapper so the icon and trailing button
 * share the input's focus / error styling (:focus-within).
 */
export function FormField({ id, label, icon: Icon, error, trailing, ref, ...inputProps }: FormFieldProps) {
  const errorId = `${id}-error`

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={styles.control} data-invalid={error ? true : undefined}>
        <Icon className={styles.icon} size={20} strokeWidth={1.5} aria-hidden="true" />
        <input
          ref={ref}
          id={id}
          className={styles.input}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          {...inputProps}
        />
        {trailing}
      </div>
      {error ? (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      ) : null}
    </div>
  )
}
