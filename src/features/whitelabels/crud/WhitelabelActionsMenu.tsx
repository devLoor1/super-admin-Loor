import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { EllipsisVertical, Pencil, ShieldAlert } from 'lucide-react'
import styles from './WhitelabelCrud.module.css'

/**
 * Detail header actions (WAI-ARIA menu button): "Editar dados" and the
 * destructive "Desativar ou remover…". Both open review-only flows — the
 * Backend actions are pending. Escape / Tab / outside press close the menu.
 */
export function WhitelabelActionsMenu({
  name,
  triggerClassName,
  onEdit,
  onLifecycle,
}: {
  name: string
  triggerClassName: string
  onEdit: () => void
  onLifecycle: () => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    itemRefs.current[0]?.focus()
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  function close(returnFocus: boolean) {
    setOpen(false)
    if (returnFocus) triggerRef.current?.focus()
  }

  function choose(action: () => void) {
    setOpen(false)
    action()
  }

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const items = itemRefs.current.filter((item): item is HTMLButtonElement => item !== null)
    const index = items.findIndex((item) => item === document.activeElement)
    const last = items.length - 1
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
    if (event.key === 'Tab') {
      close(false)
      return
    }
    if (next === null) return
    event.preventDefault()
    items[next]?.focus()
  }

  return (
    <div ref={rootRef} className={styles.menuRoot}>
      <button
        ref={triggerRef}
        type="button"
        className={triggerClassName}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Ações de ${name}`}
        data-wl-actions
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if ((event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') && !open) {
            event.preventDefault()
            setOpen(true)
          }
        }}
      >
        <EllipsisVertical size={18} strokeWidth={1.9} aria-hidden="true" />
      </button>
      <div id={menuId} role="menu" aria-label={`Ações de ${name}`} className={styles.menu} hidden={!open} onKeyDown={onMenuKeyDown}>
        <button
          ref={(element) => {
            itemRefs.current[0] = element
          }}
          type="button"
          role="menuitem"
          tabIndex={-1}
          className={styles.menuItem}
          data-menu-edit
          onClick={() => choose(onEdit)}
        >
          <Pencil size={15} strokeWidth={1.8} aria-hidden="true" />
          <span>
            Editar dados
            <span className={styles.menuItemNote}>Revisão — gravação pendente no Backend</span>
          </span>
        </button>
        <button
          ref={(element) => {
            itemRefs.current[1] = element
          }}
          type="button"
          role="menuitem"
          tabIndex={-1}
          className={styles.menuItem}
          data-tone="danger"
          data-menu-lifecycle
          onClick={() => choose(onLifecycle)}
        >
          <ShieldAlert size={15} strokeWidth={1.8} aria-hidden="true" />
          <span>
            Desativar ou remover…
            <span className={styles.menuItemNote}>Regra definitiva pendente no Backend</span>
          </span>
        </button>
      </div>
    </div>
  )
}
