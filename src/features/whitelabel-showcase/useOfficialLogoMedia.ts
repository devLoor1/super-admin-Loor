import { useEffect, useReducer, useState, useSyncExternalStore } from 'react'
import { subscribeSession } from '../../lib/authSession'
import { createOfficialLogoRegistry, type OfficialLogoHandle } from '../official-logo-refresh/officialLogoRefresh'
import { showcaseSessionKey } from './showcaseAccess'

let registry = createOfficialLogoRegistry()
let sessionKey = showcaseSessionKey()
subscribeSession(() => { const next = showcaseSessionKey(); if (next === sessionKey) return; sessionKey = next; registry.dispose(); registry = createOfficialLogoRegistry() })

/** Decoded, revalidated bytes live only in this tab; they never become an assetRef. */
export function useOfficialLogoMedia(urls: readonly (string | null | undefined)[]) {
  const session = useSyncExternalStore(subscribeSession, showcaseSessionKey, showcaseSessionKey)
  const key = JSON.stringify([session, [...new Set(urls.filter((url): url is string => !!url))].sort()])
  const [entries, setEntries] = useState<{ key: string; handles: Map<string, OfficialLogoHandle> }>({ key: '', handles: new Map() })
  const [, render] = useReducer(value => value + 1, 0)
  useEffect(() => {
    const current = registry
    const handles = new Map<string, OfficialLogoHandle>()
    const cleanups: Array<() => void> = []
    for (const url of (JSON.parse(key) as [string, string[]])[1]) {
      const handle = current.retain(url)
      handles.set(url, handle)
      cleanups.push(handle.subscribe(render))
    }
    const visibility = () => { for (const handle of handles.values()) handle.setActive(!document.hidden) }
    const refresh = () => { if (!document.hidden) void current.refreshDue() }
    setEntries({ key, handles })
    visibility()
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('focus', refresh)
    window.addEventListener('online', refresh)
    return () => {
      document.removeEventListener('visibilitychange', visibility)
      window.removeEventListener('focus', refresh)
      window.removeEventListener('online', refresh)
      cleanups.forEach(cleanup => cleanup())
      handles.forEach(handle => handle.release())
    }
  }, [key])
  return (url: string | null | undefined) => url && entries.key === key ? entries.handles.get(url)?.getSnapshot() : undefined
}
