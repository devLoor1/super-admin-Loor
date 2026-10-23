import type { AccountRef } from '../accountsApi'

// Invalidation only. Never stores records, reasons or invented account history.
const listeners = new Set<(ref: AccountRef) => void>()
export function subscribeAccountRefresh(listener: (ref: AccountRef) => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
export function refreshAccountReads(ref: AccountRef) { for (const listener of listeners) listener(ref) }
