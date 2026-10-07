import { useSyncExternalStore } from 'react'

/*
 * Session activity for Operation records (opportunity, investor or
 * entrepreneur ids). In-memory only: survives in-app navigation, lost on
 * reload. It is local feedback for this browser session — NOT an audit
 * trail and never sent anywhere.
 */

export type OperationActivity = {
  id: string
  at: string
  title: string
  detail?: string
}

type State = Record<string, OperationActivity[]>

let state: State = {}
let sequence = 0
const listeners = new Set<() => void>()
const NONE: OperationActivity[] = []
/** Repeated identical entries within this window are ignored (e.g. a re-mounted view). */
const DEDUPE_MS = 1500

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const getState = () => state

export function useOperationActivity(subjectId: string): OperationActivity[] {
  return useSyncExternalStore(subscribe, getState)[subjectId] ?? NONE
}

/** Newest first. */
export function addOperationActivity(subjectId: string, entry: Omit<OperationActivity, 'id' | 'at'>) {
  const list = state[subjectId] ?? NONE
  const latest = list[0]
  const now = Date.now()
  if (latest && latest.title === entry.title && latest.detail === entry.detail && now - Date.parse(latest.at) < DEDUPE_MS) return
  sequence += 1
  const created: OperationActivity = { ...entry, id: `op_act_${sequence}`, at: new Date(now).toISOString() }
  state = { ...state, [subjectId]: [created, ...list] }
  listeners.forEach((listener) => listener())
}

const TIME = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
export const formatActivityTime = (iso: string) => TIME.format(new Date(iso))
