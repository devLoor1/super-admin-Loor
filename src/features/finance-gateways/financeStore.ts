import { useSyncExternalStore } from 'react'
import { PROTOTYPE_FINANCE } from './prototypeFinance'
import type { FinanceActivity, WhitelabelFinanceSettings } from './financeModel'

/*
 * In-memory session store for the prototype finance configuration and the
 * session's local activity. Survives navigation inside the prototype, lost on
 * reload. Nothing is persisted or sent; no secret or full banking number is kept.
 */

type State = {
  settings: Record<string, WhitelabelFinanceSettings>
  activity: Record<string, FinanceActivity[]>
}

let state: State = { settings: PROTOTYPE_FINANCE, activity: {} }
let sequence = 0
const listeners = new Set<() => void>()
const NO_ACTIVITY: FinanceActivity[] = []

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const getState = () => state

function emit(next: State) {
  state = next
  listeners.forEach((listener) => listener())
}

export function useFinanceSettings(whitelabelId: string): WhitelabelFinanceSettings | undefined {
  return useSyncExternalStore(subscribe, getState).settings[whitelabelId]
}

/**
 * Read-only view of every Whitelabel's configuration (used by Pagamentos / PIX
 * to resolve the gateway a payment references). Never mutate the result.
 */
export function useAllFinanceSettings(): Readonly<Record<string, WhitelabelFinanceSettings>> {
  return useSyncExternalStore(subscribe, getState).settings
}

export function useFinanceActivity(whitelabelId: string): FinanceActivity[] {
  return useSyncExternalStore(subscribe, getState).activity[whitelabelId] ?? NO_ACTIVITY
}

export function updateFinanceSettings(
  whitelabelId: string,
  change: (settings: WhitelabelFinanceSettings) => Partial<WhitelabelFinanceSettings>,
) {
  const current = state.settings[whitelabelId]
  if (!current) return
  emit({ ...state, settings: { ...state.settings, [whitelabelId]: { ...current, ...change(current) } } })
}

/** Unique local id for records created in this session. */
export function nextLocalId(prefix: string) {
  sequence += 1
  return `${prefix}_local_${sequence}`
}

/** Adds session-local feedback (newest first). Callers must never pass secrets or full banking data. */
export function addFinanceActivity(whitelabelId: string, entry: Omit<FinanceActivity, 'id' | 'at'>) {
  const created: FinanceActivity = { ...entry, id: nextLocalId('fin_act'), at: new Date().toISOString() }
  emit({ ...state, activity: { ...state.activity, [whitelabelId]: [created, ...(state.activity[whitelabelId] ?? [])] } })
}
