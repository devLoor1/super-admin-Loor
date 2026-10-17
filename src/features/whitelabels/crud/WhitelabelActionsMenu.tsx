import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Ban, EllipsisVertical, Lock, Pencil, Power } from 'lucide-react'
import type { WhitelabelStatus } from '../whitelabelApi'
import { WHITELABEL_MUTATIONS, WRITE_ACCESS_NOTE, type WhitelabelWriteAccess } from './whitelabelMutationContract'
import styles from './WhitelabelCrud.module.css'

/**
 * Detail header actions (WAI-ARIA menu button).
 *
 * - "Editar nome": opens the name-only review for SUPER_ADMIN; for any other
 *   role it is an `aria-disabled` item with the reason, and does nothing.
 * - "Desativar" / "Ativar": always `aria-disabled`, with no handler at all —
 *   activation, deactivation and DELETE (a deactivation alias) are not offered.
 *
 * Escape / Tab / outside press close the menu; disabled items stay focusable
 * so their reason is announced.
 */
export function WhitelabelActionsMenu({
  name,
  status,
  access,
  triggerClassName,
  onEditName,
}: {
  name: string
  status: WhitelabelStatus
  access: WhitelabelWriteAccess
  triggerClassName: string
  onEditName: () => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const menuId = useId()
  const editNoteId = `${menuId}-edit-note`
  const lifecycleNoteId = `${menuId}-lifecycle-note`

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

  const lifecycleLabel = status === 'active' ? 'Desativar Whitelabel' : 'Ativar Whitelabel'

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
        {access === 'super-admin' ? (
          <button
            ref={(element) => {
              itemRefs.current[0] = element
            }}
            type="button"
            role="menuitem"
            tabIndex={-1}
            className={styles.menuItem}
            data-menu-edit
            onClick={() => {
              setOpen(false)
              onEditName()
            }}
          >
            <Pencil size={15} strokeWidth={1.8} aria-hidden="true" />
            <span>
              Editar nome
              <span className={styles.menuItemNote}>Revisão; o envio aguarda liberação</span>
            </span>
          </button>
        ) : (
          <button
            ref={(element) => {
              itemRefs.current[0] = element
            }}
            type="button"
            role="menuitem"
            tabIndex={-1}
            className={styles.menuItem}
            aria-disabled="true"
            aria-describedby={editNoteId}
            data-menu-edit
            data-restricted={access}
          >
            <Lock size={15} strokeWidth={1.8} aria-hidden="true" />
            <span>
              Editar nome
              <span id={editNoteId} className={styles.menuItemNote} aria-hidden="true">
                {WRITE_ACCESS_NOTE[access]}
              </span>
            </span>
          </button>
        )}
        <button
          ref={(element) => {
            itemRefs.current[1] = element
          }}
          type="button"
          role="menuitem"
          tabIndex={-1}
          className={styles.menuItem}
          aria-disabled="true"
          aria-describedby={lifecycleNoteId}
          data-menu-lifecycle={status === 'active' ? 'deactivate' : 'activate'}
        >
          {status === 'active' ? <Ban size={15} strokeWidth={1.8} aria-hidden="true" /> : <Power size={15} strokeWidth={1.8} aria-hidden="true" />}
          <span>
            {lifecycleLabel}
            <span id={lifecycleNoteId} className={styles.menuItemNote} aria-hidden="true">
              {WHITELABEL_MUTATIONS.lifecycle.pendingLabel} Efeitos no tenant ainda não confirmados.
            </span>
          </span>
        </button>
      </div>
    </div>
  )
}
