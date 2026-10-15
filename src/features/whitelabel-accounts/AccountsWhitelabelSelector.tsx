import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Check, ChevronDown, RotateCw } from 'lucide-react'
import { EntityAvatar } from '../../components/ui/EntityAvatar'
import { StatusPill } from '../../components/ui/StatusPill'
import { WHITELABEL_STATUS_META, whitelabelAvatar, type WhitelabelRecord } from '../whitelabels/whitelabelApi'
import styles from './WhitelabelContextSelector.module.css'
import own from './AccountsWhitelabelSelector.module.css'

type Props = {
  /** Confirmed tenant (`GET /whitelabels/:id`), or null while unknown / not chosen. */
  current: WhitelabelRecord | null
  /** Shown while the tenant is being confirmed (`Whitelabel #id`). */
  pendingId?: string
  /** Control Plane registry (`GET /whitelabels?perPage=100`); null while loading or failed. */
  options: WhitelabelRecord[] | null
  optionsStatus: 'loading' | 'error' | 'success'
  onRetryOptions: () => void
  onSelect: (id: string) => void
}

/**
 * Tenant context of the Accounts page — the same compact card as the
 * prototype selector (shared styles), fed by the Control Plane registry.
 * Choosing an option navigates to that Whitelabel's Accounts route; nothing
 * is written.
 */
export function AccountsWhitelabelSelector({ current, pendingId, options, optionsStatus, onRetryOptions, onSelect }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([])
  const listId = useId()
  const rows = useMemo(() => options ?? [], [options])

  // Close on outside press; move focus into the list when it opens.
  useEffect(() => {
    if (!open) return
    const selectedIndex = Math.max(0, rows.findIndex((option) => option.id === current?.id))
    optionRefs.current[selectedIndex]?.focus()
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open, rows, current?.id])

  function close(returnFocus: boolean) {
    setOpen(false)
    if (returnFocus) triggerRef.current?.focus()
  }

  function onPopoverKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      close(true)
      return
    }
    const index = optionRefs.current.findIndex((element) => element === document.activeElement)
    if (index === -1 || rows.length === 0) return
    const last = rows.length - 1
    const next =
      event.key === 'ArrowDown' ? (index >= last ? 0 : index + 1)
      : event.key === 'ArrowUp' ? (index <= 0 ? last : index - 1)
      : event.key === 'Home' ? 0
      : event.key === 'End' ? last
      : null
    if (next === null) return
    event.preventDefault()
    optionRefs.current[next]?.focus()
  }

  const avatar = current ? whitelabelAvatar(current) : null
  const status = current ? WHITELABEL_STATUS_META[current.status] : null

  return (
    <div
      ref={rootRef}
      className={styles.root}
      data-wl-selector
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
        <EntityAvatar initial={avatar?.initial} tone={avatar?.tone ?? 'neutral'} size="md" />
        <span className={styles.text}>
          {current && status ? (
            <>
              <span className="visually-hidden">Whitelabel em exibição: </span>
              <span className={styles.nameRow}>
                <span className={styles.name}>{current.name}</span>
                <StatusPill tone={status.tone} label={status.label} />
              </span>
              <span className={styles.meta}>
                {current.domain ?? current.slug}
                <span className={styles.metaDot} aria-hidden="true">
                  •
                </span>
                ID: {current.id}
              </span>
              <span className="visually-hidden">. Trocar Whitelabel</span>
            </>
          ) : (
            <>
              <span className={styles.nameRow}>
                <span className={styles.name}>{pendingId ? `Whitelabel #${pendingId}` : 'Selecionar Whitelabel'}</span>
              </span>
              <span className={styles.meta}>{pendingId ? 'Confirmando no Control Plane…' : 'Whitelabels do Control Plane'}</span>
            </>
          )}
        </span>
        <ChevronDown className={styles.chevron} data-open={open || undefined} size={18} strokeWidth={1.8} aria-hidden="true" />
      </button>

      <div className={styles.popover} hidden={!open} onKeyDown={onPopoverKeyDown}>
        <p className={styles.popoverTitle} id={`${listId}-title`}>
          Trocar Whitelabel em exibição
        </p>
        {optionsStatus === 'loading' ? (
          <p className={own.status} role="status">
            Carregando Whitelabels…
          </p>
        ) : optionsStatus === 'error' ? (
          <div className={own.status} role="alert">
            <p>Não foi possível carregar a lista de Whitelabels.</p>
            <button type="button" className={own.retry} onClick={onRetryOptions}>
              <RotateCw size={13} strokeWidth={1.9} aria-hidden="true" />
              Tentar novamente
            </button>
          </div>
        ) : rows.length === 0 ? (
          <p className={own.status}>Nenhum Whitelabel cadastrado no Control Plane.</p>
        ) : null}
        <ul id={listId} className={`${styles.list} ${own.list}`} aria-labelledby={`${listId}-title`} hidden={rows.length === 0}>
          {rows.map((option, index) => {
            const selected = option.id === current?.id
            const optionAvatar = whitelabelAvatar(option)
            return (
              <li key={option.id}>
                <button
                  ref={(element) => {
                    optionRefs.current[index] = element
                  }}
                  type="button"
                  className={styles.option}
                  aria-current={selected ? 'true' : undefined}
                  data-wl-option={option.id}
                  onClick={() => {
                    close(true)
                    if (!selected) onSelect(option.id)
                  }}
                >
                  <EntityAvatar initial={optionAvatar.initial} tone={optionAvatar.tone} size="md" />
                  <span className={styles.optionText}>
                    <span className={styles.optionName}>{option.name}</span>
                    <span className={styles.optionMeta}>
                      {option.domain ?? option.slug} · {WHITELABEL_STATUS_META[option.status].label} · ID {option.id}
                    </span>
                  </span>
                  {selected ? <Check className={styles.check} size={16} strokeWidth={2} aria-hidden="true" /> : null}
                  {selected ? <span className="visually-hidden">(em exibição)</span> : null}
                </button>
              </li>
            )
          })}
        </ul>
        <p className={styles.popoverNote}>Abre as contas do Whitelabel escolhido. Somente leitura.</p>
      </div>
    </div>
  )
}
