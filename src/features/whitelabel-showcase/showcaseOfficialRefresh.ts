import { OFFICIAL_LOGO_REFRESH_MS } from '../official-logo-refresh/officialLogoRefresh'
import { refreshOfficialShowcaseMedia } from './showcaseRepository'
import { refreshSelectedOfficialPreviews } from './showcaseOfficialLogos'

const users = new Map<object, readonly string[]>()
let stop: (() => void) | null = null

/** All card editors/previews share one visible-document reader and abort on exit. */
export function retainOfficialDocumentRefresh(keys: readonly string[] = []) {
  const owner = {}
  users.set(owner, keys)
  if (users.size === 1) {
    let pending: AbortController | null = null
    const tick = () => {
      if (document.hidden || pending) return
      const controller = new AbortController()
      pending = controller
      const read = async () => {
        await refreshOfficialShowcaseMedia(controller.signal).catch(() => undefined)
        if (!controller.signal.aborted) await refreshSelectedOfficialPreviews([...users.values()].flat(), controller.signal)
      }
      void read().finally(() => {
        if (pending === controller) pending = null
      })
    }
    const visibility = () => { if (document.hidden) pending?.abort(); else tick() }
    const interval = window.setInterval(tick, OFFICIAL_LOGO_REFRESH_MS)
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('focus', tick)
    window.addEventListener('online', tick)
    tick()
    stop = () => {
      pending?.abort()
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', visibility)
      window.removeEventListener('focus', tick)
      window.removeEventListener('online', tick)
    }
  }
  let released = false
  return () => {
    if (released) return
    released = true
    users.delete(owner)
    if (users.size === 0) { stop?.(); stop = null }
  }
}
