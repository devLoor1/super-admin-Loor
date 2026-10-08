import { useLayoutEffect } from 'react'

/*
 * URL-backed list context (e.g. `#/compliance/kyc?status=pending`). Routing
 * utility only — it holds no business state and no domain data.
 *
 * Lists keep the URL as the single source of truth for their URL-backed
 * filters: a change REPLACES the current history entry (no entry per
 * filter tweak; Back still returns to the previous page), goes through the
 * normal hash router (so reload, Back / Forward and the session guard behave
 * as for any route) and keeps the reader's scroll position, which the router
 * would otherwise reset to the top.
 */

let pendingScroll: number | null = null

/** `#/<path>` plus the non-empty params, in the given order. */
export function buildHash(path: string, params: Record<string, string | undefined>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value)
  }
  const query = search.toString()
  return `#/${path}${query ? `?${query}` : ''}`
}

/** Same page, new URL-backed context: replace the entry and keep the scroll position. */
export function replaceRouteKeepingScroll(hash: string) {
  if (window.location.hash === hash) return
  pendingScroll = window.scrollY
  window.location.replace(hash)
}

/** Restores the scroll position saved by `replaceRouteKeepingScroll` once the new route renders. */
export function useRestoreReplacedScroll(routeKey: string) {
  useLayoutEffect(() => {
    if (pendingScroll === null) return
    const top = pendingScroll
    pendingScroll = null
    window.scrollTo(0, top)
  }, [routeKey])
}
