import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Info, X } from 'lucide-react'
import { PrototypeNoticeContext } from './prototypeNotice'
import styles from './PrototypeNoticeProvider.module.css'

const VISIBLE_MS = 4200

/**
 * Hosts the prototype notice toast. The live region is always mounted so
 * screen readers announce each new message.
 */
export function PrototypeNoticeProvider({
  children,
  interactionBlocked = false,
}: {
  children: ReactNode
  interactionBlocked?: boolean
}) {
  const [notice, setNotice] = useState<{ id: number; message: string } | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const notify = useCallback((message: string) => {
    window.clearTimeout(timer.current)
    setNotice((current) => ({ id: (current?.id ?? 0) + 1, message }))
    timer.current = window.setTimeout(() => setNotice(null), VISIBLE_MS)
  }, [])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  return (
    <PrototypeNoticeContext.Provider value={notify}>
      {children}
      <div className={styles.region} role="status" aria-live="polite">
        {notice ? (
          <div key={notice.id} className={styles.toast} data-blocked={interactionBlocked || undefined}>
            <Info className={styles.icon} size={18} strokeWidth={1.7} aria-hidden="true" />
            <p className={styles.message}>{notice.message}</p>
            <button
              type="button"
              className={styles.close}
              disabled={interactionBlocked}
              onClick={() => setNotice(null)}
              aria-label="Fechar aviso"
            >
              <X size={16} strokeWidth={1.8} aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>
    </PrototypeNoticeContext.Provider>
  )
}
