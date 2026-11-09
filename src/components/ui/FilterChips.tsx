import styles from './FilterChips.module.css'

type Chip<T extends string> = { value: T; label: string }

type FilterChipsProps<T extends string> = {
  /** Group label for assistive technology. */
  label: string
  options: Chip<T>[]
  value: T
  onChange: (value: T) => void
}

/** Single-choice quick filters rendered as pressed/unpressed toggle buttons. */
export function FilterChips<T extends string>({ label, options, value, onChange }: FilterChipsProps<T>) {
  return (
    <div className={styles.group} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={styles.chip}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
