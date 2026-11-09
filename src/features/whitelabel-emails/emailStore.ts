import { useSyncExternalStore } from 'react'
import { PROTOTYPE_EMAIL_SETTINGS } from './prototypeEmails'
import type { EmailActivity, WhitelabelEmailSettings } from './emailModel'

/*
 * In-memory session store for the prototype e-mail settings and the session's
 * local activity feed. Local saves survive navigation inside the prototype and
 * are lost on reload. Nothing is persisted, sent or shared; no secret is stored.
 */

type State = {
  settings: Record<string, WhitelabelEmailSettings>
  activity: Record<string, EmailActivity[]>
}

let state: State = { settings: PROTOTYPE_EMAIL_SETTINGS, activity: {} }
let sequence = 0
const listeners = new Set<() => void>()
const NO_ACTIVITY: EmailActivity[] = []

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const getState = () => state

function emit(next: State) {
  state = next
  listeners.forEach((listener) => listener())
}

export function useWhitelabelEmailSettings(whitelabelId: string): WhitelabelEmailSettings | undefined {
  return useSyncExternalStore(subscribe, getState).settings[whitelabelId]
}

export function useEmailActivity(whitelabelId: string): EmailActivity[] {
  return useSyncExternalStore(subscribe, getState).activity[whitelabelId] ?? NO_ACTIVITY
}

export function updateWhitelabelEmailSettings(
  whitelabelId: string,
  change: (settings: WhitelabelEmailSettings) => Partial<WhitelabelEmailSettings>,
) {
  const current = state.settings[whitelabelId]
  if (!current) return
  emit({ ...state, settings: { ...state.settings, [whitelabelId]: { ...current, ...change(current) } } })
}

/** Adds session-local feedback (newest first). Callers must never pass secrets. */
export function addEmailActivity(whitelabelId: string, entries: Omit<EmailActivity, 'id' | 'at'>[]) {
  if (!entries.length) return
  const at = new Date().toISOString()
  const created = entries.map((entry) => ({ ...entry, id: `mail_act_${++sequence}`, at }))
  emit({ ...state, activity: { ...state.activity, [whitelabelId]: [...created, ...(state.activity[whitelabelId] ?? [])] } })
}
