import { useSyncExternalStore } from 'react'
import { PROTOTYPE_SETTINGS } from './prototypeSettings'
import type { WhitelabelSettings } from './settingsModel'

/*
 * In-memory session store for the prototype settings. Local saves survive
 * navigation inside the prototype and are lost on reload. Nothing is
 * persisted, sent or shared.
 */

let state: Record<string, WhitelabelSettings> = PROTOTYPE_SETTINGS
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const getState = () => state

export function useWhitelabelSettings(whitelabelId: string): WhitelabelSettings | undefined {
  return useSyncExternalStore(subscribe, getState)[whitelabelId]
}

/** Applies a local change and stamps the session's last local change. */
export function updateWhitelabelSettings(
  whitelabelId: string,
  change: (settings: WhitelabelSettings) => Partial<WhitelabelSettings>,
) {
  const current = state[whitelabelId]
  if (!current) return
  state = { ...state, [whitelabelId]: { ...current, ...change(current), lastLocalChange: new Date().toISOString() } }
  listeners.forEach((listener) => listener())
}
