type NavigationRequest = { hash: string; resume: () => void }
type NavigationGuard = (request: NavigationRequest) => boolean

let guard: NavigationGuard | undefined

/** One local page guard; this is not a production router or persistence layer. */
export function registerPrototypeNavigationGuard(next: NavigationGuard) {
  guard = next
  return () => {
    if (guard === next) guard = undefined
  }
}

/**
 * Keep drafts mounted while a same-document Back/Forward transition is declined.
 * Tagged history entries let us restore the actual entry, not push a duplicate.
 * Untagged entries (from before the app loaded) use a safe URL-only restoration.
 */
export function subscribePrototypeNavigation(onAccepted: () => void) {
  const key = 'superAdminPrototypeRouteIndex'
  const readIndex = (): number | undefined => {
    const value: unknown = window.history.state?.[key]
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined
  }
  const stamp = (index: number) => window.history.replaceState({ ...window.history.state, [key]: index }, '')
  let acceptedIndex = readIndex() ?? 0
  let sequence = acceptedIndex
  let acceptedHash = window.location.hash
  let restoring = false
  stamp(acceptedIndex)

  const onChange = () => {
    const hash = window.location.hash
    if (restoring) {
      if (hash === acceptedHash) restoring = false
      return
    }
    const targetIndex = readIndex()
    if (hash === acceptedHash) {
      if (targetIndex !== undefined) acceptedIndex = targetIndex
      return
    }
    const delta = targetIndex === undefined ? undefined : targetIndex - acceptedIndex
    const resume = delta ? () => window.history.go(delta) : () => { window.location.hash = hash }
    if (guard && !guard({ hash, resume })) {
      if (delta) {
        restoring = true
        window.history.go(-delta)
      } else {
        window.history.replaceState({ ...window.history.state, [key]: acceptedIndex }, '', acceptedHash || window.location.pathname)
      }
      return
    }
    acceptedIndex = targetIndex ?? ++sequence
    sequence = Math.max(sequence, acceptedIndex)
    acceptedHash = hash
    stamp(acceptedIndex)
    onAccepted()
  }
  window.addEventListener('popstate', onChange)
  window.addEventListener('hashchange', onChange)
  return () => {
    window.removeEventListener('popstate', onChange)
    window.removeEventListener('hashchange', onChange)
  }
}
