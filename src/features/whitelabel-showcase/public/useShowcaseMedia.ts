import { useEffect, useSyncExternalStore } from 'react'
import { ensureMedia, getMediaSnapshot, mediaUrl, subscribeMedia } from '../showcaseMedia'
import { refreshShowcaseMedia } from '../showcaseRepository'
import { isUuid } from '../showcaseModel'

/** Resolve durable references for this document; URL renewal never changes its revision. */
export function useShowcaseMedia(refs: readonly string[]) {
  useSyncExternalStore(subscribeMedia, getMediaSnapshot, getMediaSnapshot)
  const key = JSON.stringify([...new Set(refs)].sort())
  // Capture the URL rendered now: a delayed error from an old render must not
  // request recovery of a newer URL already present in the shared registry.
  const displayedUrls = new Map(refs.map(ref => [ref, mediaUrl(ref)]))
  useEffect(() => {
    const references = JSON.parse(key) as string[]
    for (const ref of references) if (isUuid(ref)) void ensureMedia(ref).catch(() => undefined)
  }, [key])
  return (assetRef: string) => {
    const failedUrl = displayedUrls.get(assetRef)
    if (!failedUrl) return
    // The repository shares one document recovery budget across images and
    // mounted previews. It updates only transient media, never the draft.
    void refreshShowcaseMedia(assetRef, failedUrl).catch(() => undefined)
  }
}
