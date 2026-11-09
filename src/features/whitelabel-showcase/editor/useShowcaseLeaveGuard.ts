import { useCallback, useEffect, useRef, useState } from 'react'
import { registerPrototypeLogoutGuard, registerPrototypeNavigationGuard } from '../../../app/prototypeNavigation'
import { holdLogoutWhenNeeded } from './showcaseNavigation'

/**
 * Unsaved-change protection for the Vitrine screens. Same mechanism as the
 * shared `useUnsavedChangesGuard` (in-app links, Back/Forward, reload/close),
 * but it lets the caller decide per destination: moving between the Vitrine
 * screens keeps the tab-memory draft, leaving them asks first.
 *
 * Reload/close of the TAB DRAFT is protected once per tab by
 * `installDraftUnloadProtection` (whatever screen is shown). `protectLocal`
 * only covers state held by the screen itself, e.g. card fields not yet applied.
 * `assessLogout` (optional) is asked BEFORE a voluntary logout clears the session
 * and unmounts the screen; cancelling keeps session, route and fields.
 */
export type LeavePrompt = { title: string; description: string; confirmLabel: string; onConfirm: () => void }
type Pending = { hash: string; resume?: () => void; prompt: LeavePrompt }

export function useShowcaseLeaveGuard(assess: (hash: string) => LeavePrompt | null, protectLocal: boolean, assessLogout?: () => LeavePrompt | null) {
  const [pending, setPending] = useState<Pending | null>(null)
  const assessRef = useRef(assess)
  const localRef = useRef(protectLocal)
  const logoutRef = useRef(assessLogout)
  const logoutAware = !!assessLogout
  // Destination already confirmed by the operator: the next guard pass must let it through.
  const bypass = useRef<string | null>(null)
  useEffect(() => {
    assessRef.current = assess
    localRef.current = protectLocal
    logoutRef.current = assessLogout
  })

  useEffect(() => {
    if (!logoutAware) return
    return registerPrototypeLogoutGuard(holdLogoutWhenNeeded(() => logoutRef.current?.() ?? null, held => setPending(held)))
  }, [logoutAware])

  useEffect(() => registerPrototypeNavigationGuard(({ hash, resume }) => {
    if (bypass.current === hash) {
      bypass.current = null
      return true
    }
    const prompt = assessRef.current(hash)
    if (!prompt) return true
    setPending({ hash, resume, prompt })
    return false
  }), [])

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const link = (event.target as Element | null)?.closest?.('a[href^="#/"]')
      if (!link) return
      const hash = link.getAttribute('href') ?? ''
      if (hash === window.location.hash) return
      const prompt = assessRef.current(hash)
      if (!prompt) return
      event.preventDefault()
      event.stopPropagation()
      setPending({ hash, prompt })
    }
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!localRef.current) return
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

  /** Programmatic navigation that respects the guard. */
  const request = useCallback((hash: string) => {
    const prompt = assessRef.current(hash)
    if (prompt) setPending({ hash, prompt })
    else window.location.hash = hash
  }, [])

  const cancel = useCallback(() => setPending(null), [])
  const confirm = useCallback(() => {
    if (!pending) return
    setPending(null)
    pending.prompt.onConfirm()
    bypass.current = pending.hash
    if (pending.resume) pending.resume()
    else window.location.hash = pending.hash
  }, [pending])

  return { pending: pending?.prompt ?? null, request, cancel, confirm }
}
