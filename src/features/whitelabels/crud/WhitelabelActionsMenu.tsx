import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Ban, EllipsisVertical, Lock, Pencil, Power, Trash2 } from 'lucide-react'
import type { WhitelabelStatus } from '../whitelabelApi'
import { WHITELABEL_MUTATIONS, WRITE_ACCESS_NOTE, type WhitelabelWriteAccess, type LifecycleOperation } from './whitelabelMutationContract'
import styles from './WhitelabelCrud.module.css'

/**
 * Detail header actions (WAI-ARIA menu button).
 *
 * - "Editar nome": opens the name-only review for SUPER_ADMIN; for any other
 *   role it is an `aria-disabled` item with the reason, and does nothing.
 * - Lifecycle is independently guarded and SUPER_ADMIN-only, with explicit
 *   review before dispatch. DELETE is offered as logical deactivation only.
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
  onLifecycle,
}: {
  name: string
  status: WhitelabelStatus
  access: WhitelabelWriteAccess
  triggerClassName: string
  onEditName: () => void
  onLifecycle?: (operation: LifecycleOperation) => void
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

  const lifecycleActions: LifecycleOperation[] = status === 'active' ? ['deactivate', 'logical-delete'] : ['activate']
  const lifecycleAllowed = access === 'super-admin' && WHITELABEL_MUTATIONS.lifecycle.available && !!onLifecycle

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
              <span className={styles.menuItemNote}>Revisão e confirmação</span>
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
        {lifecycleActions.map((operation, index) => <button key={operation}
          ref={(element) => {
            itemRefs.current[index + 1] = element
          }}
          type="button"
          role="menuitem"
          tabIndex={-1}
          className={styles.menuItem}
          aria-disabled={!lifecycleAllowed || undefined}
          aria-describedby={`${lifecycleNoteId}-${operation}`}
          data-menu-lifecycle={operation}
          onClick={() => { if (lifecycleAllowed) { setOpen(false); onLifecycle?.(operation) } }}
        >
          {operation === 'logical-delete' ? <Trash2 size={15} aria-hidden="true" /> : operation === 'deactivate' ? <Ban size={15} strokeWidth={1.8} aria-hidden="true" /> : <Power size={15} strokeWidth={1.8} aria-hidden="true" />}
          <span>
            {operation === 'activate' ? 'Ativar Whitelabel' : operation === 'deactivate' ? 'Desativar Whitelabel' : 'Excluir logicamente'}
            <span id={`${lifecycleNoteId}-${operation}`} className={styles.menuItemNote} aria-hidden="true">
              {access !== 'super-admin' ? WRITE_ACCESS_NOTE[access] : !lifecycleAllowed ? WHITELABEL_MUTATIONS.lifecycle.pendingLabel : operation === 'logical-delete' ? 'Torna inativo; não remove o registro' : 'Conferir identidade e estado antes de confirmar'}
            </span>
          </span>
        </button>)}
      </div>
    </div>
  )
}
