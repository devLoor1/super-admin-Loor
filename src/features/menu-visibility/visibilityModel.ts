import { MENU_ENTRIES, MENU_VISIBILITY_IDS, menuEntry, type MenuId } from './menuRegistry'

/*
 * Menu Visibility — pure model (no React, no I/O).
 *
 * Stored PREFERENCE: every known ID keeps its own boolean.
 * EFFECTIVE visibility: an entry is shown only if its own preference AND every
 * ancestor's effective visibility are true (childEffective = parentVisible &&
 * childVisible). Changing a parent never rewrites its children's preferences:
 * a child hidden only by its parent comes back when the parent is shown again.
 */

export type VisibilityMap = Readonly<Record<MenuId, boolean>>

export type EffectiveState =
  | { state: 'visible' }
  | { state: 'hidden' }
  /** Own preference is "visible", but an ancestor is hidden. */
  | { state: 'hidden-by-parent'; hiddenBy: MenuId }

/** Complete map with one value for every known ID (in registry order). */
export function mapFrom(visible: (id: MenuId) => boolean): VisibilityMap {
  const map = {} as Record<MenuId, boolean>
  for (const id of MENU_VISIBILITY_IDS) map[id] = visible(id)
  return Object.freeze(map)
}

/** New map where only `id` changes; children and every other ID keep their preference. */
export function setPreference(map: VisibilityMap, id: MenuId, visible: boolean): VisibilityMap {
  if (map[id] === visible) return map
  return Object.freeze({ ...map, [id]: visible })
}

export function effectiveState(map: VisibilityMap, id: MenuId): EffectiveState {
  if (!map[id]) return { state: 'hidden' }
  const parentId = menuEntry(id).parentId
  if (!parentId) return { state: 'visible' }
  const parent = effectiveState(map, parentId)
  if (parent.state === 'visible') return { state: 'visible' }
  return { state: 'hidden-by-parent', hiddenBy: parent.state === 'hidden-by-parent' ? parent.hiddenBy : parentId }
}

export function isEffectivelyVisible(map: VisibilityMap, id: MenuId) {
  return effectiveState(map, id).state === 'visible'
}

/** Effective visibility of every known ID (what a future central resolver would apply). */
export function effectiveMap(map: VisibilityMap): VisibilityMap {
  return mapFrom((id) => isEffectivelyVisible(map, id))
}

export type PreferenceChange = Readonly<{ id: MenuId; from: boolean; to: boolean }>

/** Stored-preference differences, in sidebar order. */
export function preferenceChanges(base: VisibilityMap, draft: VisibilityMap): PreferenceChange[] {
  return MENU_ENTRIES.filter((entry) => base[entry.id] !== draft[entry.id]).map((entry) => ({
    id: entry.id,
    from: base[entry.id],
    to: draft[entry.id],
  }))
}

export type EffectConsequence = Readonly<{
  id: MenuId
  /** Own preference, unchanged between base and draft. */
  preference: boolean
  from: boolean
  to: boolean
  /** Ancestor responsible for the draft result when it is hidden by a parent. */
  hiddenBy?: MenuId
}>

/**
 * Entries whose EFFECTIVE visibility changes although their own preference did
 * not (e.g. Wallet stays "visible" but is hidden because Financeiro is hidden).
 */
export function effectConsequences(base: VisibilityMap, draft: VisibilityMap): EffectConsequence[] {
  return MENU_ENTRIES.flatMap((entry): EffectConsequence[] => {
    if (base[entry.id] !== draft[entry.id]) return []
    const from = isEffectivelyVisible(base, entry.id)
    const to = isEffectivelyVisible(draft, entry.id)
    if (from === to) return []
    const state = effectiveState(draft, entry.id)
    return [{ id: entry.id, preference: draft[entry.id], from, to, hiddenBy: state.state === 'hidden-by-parent' ? state.hiddenBy : undefined }]
  })
}

export function isDirty(base: VisibilityMap, draft: VisibilityMap) {
  return MENU_VISIBILITY_IDS.some((id) => base[id] !== draft[id])
}

export function countEffectivelyHidden(map: VisibilityMap) {
  return MENU_VISIBILITY_IDS.filter((id) => !isEffectivelyVisible(map, id)).length
}
