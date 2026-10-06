import { useEffect, useId, useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react'
import { X, type LucideIcon } from 'lucide-react'
import styles from './Dialog.module.css'

type DialogProps = {
  title: string
  /** Short context under the title (also the dialog's accessible description). */
  description?: ReactNode
  icon?: LucideIcon
  /** Identity tone of the header icon; not a status colour on its own. */
  tone?: 'warning' | 'violet' | 'teal'
  onClose: () => void
  children: ReactNode
  footer: ReactNode
  /** Element focused when the dialog opens (defaults to the first focusable). */
  initialFocusRef?: RefObject<HTMLElement | null>
  /** Focus target when the opener no longer exists after closing. */
  fallbackFocus?: () => HTMLElement | null
  size?: 'md' | 'lg'
}

/**
 * Modal dialog built on the native <dialog> element: top layer, inert
 * background and focus containment are provided by the browser. React owns
 * Escape/close requests so guarded drafts can remain open.
 * Mount it to open; unmount (via `onClose`) to close. Focus returns to the
 * element that opened it, or to `fallbackFocus` if that element is gone.
 */
export function Dialog({
  title,
  description,
  icon: Icon,
  tone = 'violet',
  onClose,
  children,
  footer,
  initialFocusRef,
  fallbackFocus,
  size = 'md',
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  const fallbackRef = useRef(fallbackFocus)
  // Backdrop clicks close only when the press also started on the backdrop
  // (selecting text inside and releasing outside must not close the dialog).
  const pressedBackdrop = useRef(false)

  useEffect(() => {
    fallbackRef.current = fallbackFocus
  })

  useLayoutEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (!dialog.open) dialog.showModal()
    initialFocusRef?.current?.focus()
    return () => {
      if (dialog.open) dialog.close()
      // Wait for React to commit the change that removed the dialog.
      window.requestAnimationFrame(() => {
        const target = opener?.isConnected && opener.getClientRects().length ? opener : fallbackRef.current?.()
        target?.focus()
      })
    }
    // Opening happens once per mount.
  }, [initialFocusRef])

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      data-size={size}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onKeyDown={(event) => {
        // Repeated native close requests can cease being cancelable. Handle
        // Escape before that default so a guarded draft never closes invisibly.
        if (event.key !== 'Escape') return
        event.preventDefault()
        event.stopPropagation()
        onClose()
      }}
      onCancel={(event) => {
        // Escape: let React own the open state.
        event.preventDefault()
        onClose()
      }}
      onPointerDown={(event) => {
        pressedBackdrop.current = event.target === event.currentTarget
      }}
      onClick={(event) => {
        // A click on the backdrop targets the <dialog> element itself.
        if (event.target === event.currentTarget && pressedBackdrop.current) onClose()
        pressedBackdrop.current = false
      }}
    >
      <div className={styles.surface}>
        <header className={styles.header}>
          {Icon ? (
            <span className={styles.icon} data-tone={tone} aria-hidden="true">
              <Icon size={20} strokeWidth={1.7} />
            </span>
          ) : null}
          <div className={styles.heading}>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className={styles.description}>
                {description}
              </p>
            ) : null}
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Fechar">
            <X size={18} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </header>
        <div className={styles.body}>{children}</div>
        <footer className={styles.footer}>{footer}</footer>
      </div>
    </dialog>
  )
}
