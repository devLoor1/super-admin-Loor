import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { StatusPill } from '../../components/ui/StatusPill'
import { EntityAvatar } from '../../components/ui/EntityAvatar'
import { STATUS_META, type Whitelabel } from '../whitelabels/prototypeWhitelabels'
import styles from './WhitelabelContextSelector.module.css'

type Props = {
  current: Whitelabel
  options: Whitelabel[]
  onSelect: (id: string) => void
}

/**
 * Compact card naming the tenant context of the page. Opens a small list to
 * switch the illustrative Whitelabel (local only: the account dataset and the
 * URL change; nothing is persisted or authorized).
 */
export function WhitelabelContextSelector({ current, options, onSelect }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([])
  const listId = useId()

  // Close on outside press; move focus into the list when it opens.
  useEffect(() => {
    if (!open) return
    const selectedIndex = Math.max(0, options.findIndex((option) => option.id === current.id))
    optionRefs.current[selectedIndex]?.focus()
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open, options, current.id])

  function close(returnFocus: boolean) {
    setOpen(false)
    if (returnFocus) triggerRef.current?.focus()
  }

  function onListKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    const index = optionRefs.current.findIndex((element) => element === document.activeElement)
    const last = options.length - 1
    const next =
      event.key === 'ArrowDown' ? (index >= last ? 0 : index + 1)
      : event.key === 'ArrowUp' ? (index <= 0 ? last : index - 1)
      : event.key === 'Home' ? 0
      : event.key === 'End' ? last
      : null
    if (event.key === 'Escape') {
      event.preventDefault()
      close(true)
      return
    }
    if (next === null) return
    event.preventDefault()
    optionRefs.current[next]?.focus()
  }

  const status = STATUS_META[current.status]

  return (
    <div
      ref={rootRef}
      className={styles.root}
      onBlur={(event) => {
        // Tabbing out of the control closes the list.
        if (open && !event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false)
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault()
            setOpen(true)
          }
        }}
      >
        <EntityAvatar initial={current.initial} tone={current.avatarTone} size="md" />
        <span className={styles.text}>
          <span className="visually-hidden">Whitelabel em exibição: </span>
          <span className={styles.nameRow}>
            <span className={styles.name}>{current.name}</span>
            <StatusPill tone={status.tone} label={status.label} />
          </span>
          <span className={styles.meta}>
            {current.domain}
            <span className={styles.metaDot} aria-hidden="true">
              •
            </span>
            ID: {current.id}
          </span>
          <span className="visually-hidden">. Trocar Whitelabel</span>
        </span>
        <ChevronDown className={styles.chevron} data-open={open || undefined} size={18} strokeWidth={1.8} aria-hidden="true" />
      </button>

      <div className={styles.popover} hidden={!open}>
        <p className={styles.popoverTitle} id={`${listId}-title`}>
          Trocar Whitelabel em exibição
        </p>
        <ul id={listId} className={styles.list} aria-labelledby={`${listId}-title`} onKeyDown={onListKeyDown}>
          {options.map((option, index) => {
            const selected = option.id === current.id
            const optionStatus = STATUS_META[option.status]
            return (
              <li key={option.id}>
                <button
                  ref={(element) => {
                    optionRefs.current[index] = element
                  }}
                  type="button"
                  className={styles.option}
                  aria-current={selected ? 'true' : undefined}
                  onClick={() => {
                    close(true)
                    if (!selected) onSelect(option.id)
                  }}
                >
                  <EntityAvatar initial={option.initial} tone={option.avatarTone} size="md" />
                  <span className={styles.optionText}>
                    <span className={styles.optionName}>{option.name}</span>
                    <span className={styles.optionMeta}>
                      {option.domain} · {optionStatus.label}
                    </span>
                  </span>
                  {selected ? <Check className={styles.check} size={16} strokeWidth={2} aria-hidden="true" /> : null}
                  {selected ? <span className="visually-hidden">(em exibição)</span> : null}
                </button>
              </li>
            )
          })}
        </ul>
        <p className={styles.popoverNote}>Troca local do protótipo: apenas os dados ilustrativos exibidos mudam.</p>
      </div>
    </div>
  )
}
