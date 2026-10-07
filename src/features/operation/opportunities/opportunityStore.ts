import { useSyncExternalStore } from 'react'
import { tidy, type Opportunity, type OpportunityDraft, type OpportunityStatus } from './opportunityModel'
import { PROTOTYPE_OPPORTUNITIES } from './prototypeOpportunities'

/*
 * In-memory session store for Opportunities. Survives in-app navigation,
 * lost on reload; nothing is persisted or sent. There is deliberately no
 * delete action. Other Operation modules (Entrepreneurs, Investors) only READ
 * this store to show live relationships — they never mutate it.
 */

let opportunities: Opportunity[] = PROTOTYPE_OPPORTUNITIES
let sequence = 0
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const getSnapshot = () => opportunities

function emit(next: Opportunity[]) {
  opportunities = next
  listeners.forEach((listener) => listener())
}

export function useOpportunities(): Opportunity[] {
  return useSyncExternalStore(subscribe, getSnapshot)
}

export function useOpportunity(id: string): Opportunity | undefined {
  return useSyncExternalStore(subscribe, getSnapshot).find((item) => item.id === id)
}

const clean = (draft: OpportunityDraft) => ({
  name: tidy(draft.name),
  description: draft.description.trim(),
  whitelabelId: draft.whitelabelId,
  entrepreneurId: draft.entrepreneurId || null,
  modality: draft.modality || 'equity',
  segmentIds: [...draft.segmentIds],
  resourceUseIds: [...draft.resourceUseIds],
})

/** Local creation; every new opportunity starts as Rascunho in this prototype. */
export function createOpportunity(draft: OpportunityDraft): Opportunity {
  sequence += 1
  const created: Opportunity = {
    id: `opp_local_${sequence}`,
    ...clean(draft),
    status: 'draft',
    updatedAt: new Date().toISOString(),
  }
  emit([created, ...opportunities])
  return created
}

export function updateOpportunity(id: string, draft: OpportunityDraft) {
  emit(
    opportunities.map((item) =>
      item.id === id ? { ...item, ...clean(draft), status: draft.status, updatedAt: new Date().toISOString() } : item,
    ),
  )
}

/** Prototype status switch — no transition graph is enforced. */
export function setOpportunityStatus(id: string, status: OpportunityStatus) {
  emit(opportunities.map((item) => (item.id === id ? { ...item, status, updatedAt: new Date().toISOString() } : item)))
}
