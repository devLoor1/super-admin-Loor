import { useSyncExternalStore } from 'react'
import type { OperationActivity } from '../../operation/shared/operationActivity'

/*
 * "Atividade da sessão" for Finance Core records (INV-…, PG-…, WAL-… ids).
 * In-memory only: survives in-app navigation, lost on reload. Local feedback
 * for this browser session — NOT an audit trail, never sent anywhere and
 * unrelated to the future Auditoria domain. Only reads and navigation
 * requests are recorded: no financial action exists to record.
 */

export type FinanceCoreActivity = OperationActivity

type State = Record<string, FinanceCoreActivity[]>

let state: State = {}
let sequence = 0
const listeners = new Set<() => void>()
const NONE: FinanceCoreActivity[] = []
/** Repeated identical entries within this window are ignored (e.g. a re-mounted view). */
const DEDUPE_MS = 1500

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const getState = () => state

export function useFinanceCoreActivity(recordId: string): FinanceCoreActivity[] {
  return useSyncExternalStore(subscribe, getState)[recordId] ?? NONE
}

/** Newest first. Callers pass only ids and labels — never amounts typed by a user or secrets. */
export function addFinanceCoreActivity(recordId: string, entry: Omit<FinanceCoreActivity, 'id' | 'at'>) {
  const list = state[recordId] ?? NONE
  const latest = list[0]
  const now = Date.now()
  if (latest && latest.title === entry.title && latest.detail === entry.detail && now - Date.parse(latest.at) < DEDUPE_MS) return
  sequence += 1
  const created: FinanceCoreActivity = { ...entry, id: `fc_act_${sequence}`, at: new Date(now).toISOString() }
  state = { ...state, [recordId]: [created, ...list] }
  listeners.forEach((listener) => listener())
}
