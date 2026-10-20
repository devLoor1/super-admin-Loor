import type { RemoteState } from '../../lib/useRemoteResource'
import type { MenuVisibilityRead } from './menuVisibilityApi'

export type VisibilitySnapshot = Readonly<{
  state: RemoteState<MenuVisibilityRead>
  /** Last authoritative GET in THIS session, never an invented/default map. */
  lastData?: MenuVisibilityRead
}>

/** Shared read cache; no storage, writes, routing or retry loop. */
export function createVisibilityResource(read: (signal: AbortSignal) => Promise<MenuVisibilityRead>) {
  let session: string | null = null
  let generation = 0
  let controller: AbortController | undefined
  let pending: Promise<MenuVisibilityRead> | undefined
  let snapshot: VisibilitySnapshot = Object.freeze({ state: { status: 'idle' } })
  const listeners = new Set<() => void>()
  const publish = (next: VisibilitySnapshot) => { snapshot = Object.freeze(next); listeners.forEach(fn => fn()) }
  const cancelled = () => new DOMException('Visibility session/read changed', 'AbortError')

  function load(fresh: boolean): Promise<MenuVisibilityRead> {
    if (session === null) return Promise.reject(cancelled())
    if (!fresh && pending) return pending
    if (!fresh && snapshot.state.status === 'success') return Promise.resolve(snapshot.state.data)
    controller?.abort()
    const active = new AbortController()
    controller = active
    const key = session
    const attempt = ++generation
    const lastData = snapshot.state.status === 'success' ? snapshot.state.data : snapshot.lastData
    publish({ state: { status: 'loading' }, lastData })
    const current = () => session === key && generation === attempt && !active.signal.aborted
    pending = Promise.resolve().then(() => read(active.signal)).then(data => {
      if (!current()) throw cancelled()
      publish({ state: { status: 'success', data }, lastData: data })
      return data
    }, error => {
      if (!current()) throw cancelled()
      publish({ state: { status: 'error', error }, lastData })
      throw error
    }).finally(() => { if (attempt === generation) pending = undefined })
    return pending
  }

  const ensure = () => {
    if (session !== null && snapshot.state.status === 'idle') void load(false).catch(() => undefined)
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); ensure(); return () => { listeners.delete(listener) } },
    setSession(next: string | null) {
      if (next === session) return
      controller?.abort()
      generation++
      pending = undefined
      session = next
      publish({ state: { status: 'idle' } })
      if (listeners.size) ensure()
    },
    /** Cancels any older GET: post-PUT confirmation must never reuse a pre-PUT read. */
    revalidate: () => load(true),
    ensure,
  }
}
