import { useCallback, useEffect, useRef, useState } from 'react'
import { registerPrototypeNavigationGuard } from './prototypeNavigation'

export type PendingNavigation = { hash: string; destination: string; resume?: () => void }

/**
 * Shared unsaved-change protection for tenant pages with local drafts
 * (Config. do Whitelabel, E-mails). While `hasUnsaved` is true it asks before:
 * in-app links (capture-phase click on `a[href^="#/"]`), browser Back/Forward
 * (prototype hash switch guard), and programmatic switches made through
 * `requestNavigation` (e.g. the Whitelabel selector). Reload / tab close use the
 * browser's own prompt. The page renders the confirmation for `pending`.
 */
export function useUnsavedChangesGuard(hasUnsaved: boolean, onDiscard: () => void) {
  const [pending, setPending] = useState<PendingNavigation | null>(null)
  const hasUnsavedRef = useRef(hasUnsaved)
  useEffect(() => {
    hasUnsavedRef.current = hasUnsaved
  })

  /** Navigates now, or asks first when the page holds unsaved edits. */
  const requestNavigation = useCallback((hash: string, destination: string) => {
    if (hasUnsavedRef.current) setPending({ hash, destination })
    else window.location.hash = hash
  }, [])

  useEffect(
    () =>
      registerPrototypeNavigationGuard(({ hash, resume }) => {
        if (!hasUnsavedRef.current) return true
        setPending({ hash, resume, destination: 'sair desta página pelo histórico do navegador' })
        return false
      }),
    [],
  )

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!hasUnsavedRef.current || event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const link = (event.target as Element | null)?.closest?.('a[href^="#/"]')
      if (!link) return
      const hash = link.getAttribute('href') ?? ''
      if (hash === window.location.hash) return
      event.preventDefault()
      event.stopPropagation()
      setPending({ hash, destination: 'sair desta página' })
    }
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedRef.current) return
      event.preventDefault()
      event.returnValue = ''
    }
    document.addEventListener('click', onClick, true)
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      document.removeEventListener('click', onClick, true)
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [])

  const stay = useCallback(() => setPending(null), [])

  /** Drops the local drafts and completes the pending navigation. */
  function discardAndContinue() {
    if (!pending) return
    const { hash, resume } = pending
    setPending(null)
    onDiscard()
    hasUnsavedRef.current = false
    if (resume) resume()
    else window.location.hash = hash
  }

  return { pending, requestNavigation, stay, discardAndContinue }
}
