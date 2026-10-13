import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { isAbortError } from '../../lib/api'
import {
  getWhitelabel,
  listWhitelabels,
  type WhitelabelListParams,
  type WhitelabelListResult,
  type WhitelabelRecord,
} from './whitelabelApi'

export type RemoteState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: unknown }

type Settled<T> = { key: string; state: RemoteState<T> }

/**
 * One request per key (+ retry attempt). A newer key or unmount aborts the
 * previous request, so late responses never overwrite current data and no
 * request is repeated automatically (no retry loop, no storm after a 401).
 */
function useRemote<T>(key: string | null, load: (signal: AbortSignal) => Promise<T>) {
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<Settled<T> | null>(null)
  // Last successful data for any key: lets a reloading list keep its footer in place.
  const [lastData, setLastData] = useState<T | null>(null)
  const requestKey = key === null ? null : `${key}#${attempt}`
  // `load` is derived from `key`; the key (not the function identity) is the request identity.
  const loadRef = useRef(load)
  useLayoutEffect(() => {
    loadRef.current = load
  })

  useEffect(() => {
    if (requestKey === null) return
    const controller = new AbortController()
    loadRef.current(controller.signal).then(
      (data) => {
        if (controller.signal.aborted) return
        setSettled({ key: requestKey, state: { status: 'success', data } })
        setLastData(data)
      },
      (error: unknown) => {
        if (controller.signal.aborted || isAbortError(error)) return
        setSettled({ key: requestKey, state: { status: 'error', error } })
      },
    )
    return () => controller.abort()
  }, [requestKey])

  const reload = useCallback(() => setAttempt((value) => value + 1), [])
  const state: RemoteState<T> =
    requestKey === null ? { status: 'idle' } : settled?.key === requestKey ? settled.state : { status: 'loading' }
  return { state, reload, lastData }
}

/** `GET /whitelabels` for the URL-backed page / search / status. */
export function useWhitelabelList(params: WhitelabelListParams) {
  return useRemote<WhitelabelListResult>(JSON.stringify(params), (signal) => listWhitelabels(params, signal))
}

/**
 * `GET /whitelabels/:id`. Ids that are not Core numeric ids (e.g. old
 * `wl_proto_*` links) resolve to not-found without calling the API.
 */
export function useWhitelabelDetail(id: string | null) {
  return useRemote<WhitelabelRecord>(id, (signal) => getWhitelabel(id!, signal))
}
