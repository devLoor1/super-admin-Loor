import { useSyncExternalStore } from 'react'
import {
  tidy,
  type CatalogActivity,
  type CatalogDraft,
  type ResourceUse,
  type Segment,
} from './catalogModel'
import { PROTOTYPE_RESOURCE_USES, PROTOTYPE_SEGMENTS } from './prototypeCatalogs'

/*
 * In-memory session store. Segments and Resource Uses are two SEPARATE
 * collections with separate id sequences and separate actions; nothing here
 * links, copies or synchronises one to the other. Survives in-app navigation,
 * lost on reload. Nothing is persisted or sent.
 */

type State = {
  segments: Record<string, Segment[]>
  resourceUses: Record<string, ResourceUse[]>
  activity: Record<string, CatalogActivity[]>
}

let state: State = { segments: PROTOTYPE_SEGMENTS, resourceUses: PROTOTYPE_RESOURCE_USES, activity: {} }
const sequence = { segment: 0, resourceUse: 0, activity: 0 }
const listeners = new Set<() => void>()
const NONE_SEGMENTS: Segment[] = []
const NONE_USES: ResourceUse[] = []
const NONE_ACTIVITY: CatalogActivity[] = []

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const getState = () => state

function emit(next: State) {
  state = next
  listeners.forEach((listener) => listener())
}

const clean = (draft: CatalogDraft) => ({ name: tidy(draft.name), description: tidy(draft.description), status: draft.status })

/**
 * Read-only view of both catalogs for every Whitelabel (used by Operation to
 * resolve the references an Opportunity holds). Still two separate maps.
 * Detached, frozen records prevent callers from mutating the store; activity
 * updates keep the same snapshot and do not re-render catalog readers.
 */
type CatalogSnapshot = Readonly<{
  segments: Readonly<Record<string, readonly Readonly<Segment>[]>>
  resourceUses: Readonly<Record<string, readonly Readonly<ResourceUse>[]>>
}>

function readonlyCatalog<T extends Segment | ResourceUse>(catalog: Record<string, T[]>) {
  return Object.freeze(Object.fromEntries(Object.entries(catalog).map(([tenant, items]) => [
    tenant,
    Object.freeze(items.map((item) => Object.freeze({ ...item }))),
  ])))
}

let catalogSnapshot: CatalogSnapshot | undefined
let snapshotSegments: State['segments'] | undefined
let snapshotResourceUses: State['resourceUses'] | undefined

function getCatalogSnapshot(): CatalogSnapshot {
  if (!catalogSnapshot || snapshotSegments !== state.segments || snapshotResourceUses !== state.resourceUses) {
    snapshotSegments = state.segments
    snapshotResourceUses = state.resourceUses
    catalogSnapshot = Object.freeze({
      segments: readonlyCatalog(state.segments),
      resourceUses: readonlyCatalog(state.resourceUses),
    })
  }
  return catalogSnapshot
}

export function useCatalogsSnapshot(): CatalogSnapshot {
  return useSyncExternalStore(subscribe, getCatalogSnapshot)
}

/* ---------- Segments ---------- */

export function useSegments(whitelabelId: string): Segment[] {
  return useSyncExternalStore(subscribe, getState).segments[whitelabelId] ?? NONE_SEGMENTS
}

export function createSegment(whitelabelId: string, draft: CatalogDraft): Segment {
  sequence.segment += 1
  const created: Segment = { kind: 'segment', id: `seg_local_${sequence.segment}`, ...clean(draft) }
  emit({ ...state, segments: { ...state.segments, [whitelabelId]: [...(state.segments[whitelabelId] ?? []), created] } })
  return created
}

export function updateSegment(whitelabelId: string, id: Segment['id'], draft: CatalogDraft) {
  const list = state.segments[whitelabelId] ?? []
  emit({ ...state, segments: { ...state.segments, [whitelabelId]: list.map((item) => (item.id === id ? { ...item, ...clean(draft) } : item)) } })
}

/** Local removal only — no cascade, no Opportunity is touched. */
export function deleteSegment(whitelabelId: string, id: Segment['id']) {
  const list = state.segments[whitelabelId] ?? []
  emit({ ...state, segments: { ...state.segments, [whitelabelId]: list.filter((item) => item.id !== id) } })
}

/* ---------- Resource Uses ---------- */

export function useResourceUses(whitelabelId: string): ResourceUse[] {
  return useSyncExternalStore(subscribe, getState).resourceUses[whitelabelId] ?? NONE_USES
}

export function createResourceUse(whitelabelId: string, draft: CatalogDraft): ResourceUse {
  sequence.resourceUse += 1
  const created: ResourceUse = { kind: 'resource_use', id: `ru_local_${sequence.resourceUse}`, ...clean(draft) }
  emit({
    ...state,
    resourceUses: { ...state.resourceUses, [whitelabelId]: [...(state.resourceUses[whitelabelId] ?? []), created] },
  })
  return created
}

export function updateResourceUse(whitelabelId: string, id: ResourceUse['id'], draft: CatalogDraft) {
  const list = state.resourceUses[whitelabelId] ?? []
  emit({
    ...state,
    resourceUses: { ...state.resourceUses, [whitelabelId]: list.map((item) => (item.id === id ? { ...item, ...clean(draft) } : item)) },
  })
}

/** Local removal only — no cascade, no Opportunity is touched. */
export function deleteResourceUse(whitelabelId: string, id: ResourceUse['id']) {
  const list = state.resourceUses[whitelabelId] ?? []
  emit({ ...state, resourceUses: { ...state.resourceUses, [whitelabelId]: list.filter((item) => item.id !== id) } })
}

/* ---------- Session activity ---------- */

export function useCatalogActivity(whitelabelId: string): CatalogActivity[] {
  return useSyncExternalStore(subscribe, getState).activity[whitelabelId] ?? NONE_ACTIVITY
}

/** Session-only feedback, newest first. */
export function addCatalogActivity(whitelabelId: string, entry: Omit<CatalogActivity, 'id' | 'at'>) {
  sequence.activity += 1
  const created: CatalogActivity = { ...entry, id: `cat_act_${sequence.activity}`, at: new Date().toISOString() }
  emit({ ...state, activity: { ...state.activity, [whitelabelId]: [created, ...(state.activity[whitelabelId] ?? [])] } })
}
