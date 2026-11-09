import { useSyncExternalStore } from 'react'
import { EMPTY_RULES, type ModalityActivity, type ModalityId, type ModalityRuleConfig } from './modalitiesModel'
import { PROTOTYPE_MODALITY_RULES } from './prototypeModalities'

/*
 * In-memory session store for the prototype rule configuration and this
 * page's session activity. Survives in-app navigation, lost on reload.
 * Modality enablement is NOT stored here: it is the Finance store's
 * `settings.modalities` (single source shared with Gateways e contas).
 */

type State = {
  rules: Record<string, Record<ModalityId, ModalityRuleConfig>>
  activity: Record<string, ModalityActivity[]>
}

let state: State = { rules: PROTOTYPE_MODALITY_RULES, activity: {} }
let sequence = 0
const listeners = new Set<() => void>()
const NO_ACTIVITY: ModalityActivity[] = []

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const getState = () => state

function emit(next: State) {
  state = next
  listeners.forEach((listener) => listener())
}

export function useModalityRules(whitelabelId: string): Record<ModalityId, ModalityRuleConfig> | undefined {
  return useSyncExternalStore(subscribe, getState).rules[whitelabelId]
}

export function useModalityActivity(whitelabelId: string): ModalityActivity[] {
  return useSyncExternalStore(subscribe, getState).activity[whitelabelId] ?? NO_ACTIVITY
}

export function saveModalityRules(whitelabelId: string, modalityId: ModalityId, config: ModalityRuleConfig) {
  const current = state.rules[whitelabelId] ?? { equity: EMPTY_RULES, debt: EMPTY_RULES }
  emit({ ...state, rules: { ...state.rules, [whitelabelId]: { ...current, [modalityId]: config } } })
}

/** Session-only feedback, newest first. */
export function addModalityActivity(whitelabelId: string, entry: Omit<ModalityActivity, 'id' | 'at'>) {
  sequence += 1
  const created: ModalityActivity = { ...entry, id: `mod_act_${sequence}`, at: new Date().toISOString() }
  emit({ ...state, activity: { ...state.activity, [whitelabelId]: [created, ...(state.activity[whitelabelId] ?? [])] } })
}
