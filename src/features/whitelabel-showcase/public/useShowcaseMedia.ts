import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import { ensureMedia, getMediaSnapshot, subscribeMedia } from '../showcaseMedia'

/** Resolve durable references for this document; URL renewal never changes its revision. */
export function useShowcaseMedia(refs: readonly string[]) {
  useSyncExternalStore(subscribeMedia, getMediaSnapshot, getMediaSnapshot)
  const key = JSON.stringify([...new Set(refs)].sort())
  const attempted = useRef(new Set<string>())
  useEffect(() => {
    const references = JSON.parse(key) as string[]
    for (const ref of references) void ensureMedia(ref).catch(() => undefined)
  }, [key])
  return useCallback((assetRef: string) => {
    // One renewal per reference in this mounted document, including failed renewals.
    // A failed URL must not cause an unbounded request/error cycle.
    if (attempted.current.has(assetRef)) return
    attempted.current.add(assetRef)
    void ensureMedia(assetRef, true).catch(() => undefined)
  }, [])
}
