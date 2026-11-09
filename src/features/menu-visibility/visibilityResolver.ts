import { MENU_ENTRIES, MENU_TREE, type MenuArea, type MenuEntry, type MenuId } from './menuRegistry'
import { effectiveState, type VisibilityMap } from './visibilityModel'
import { isProtectedMenuId, policyViolations, VISIBILITY_SCOPE, type PolicyViolation } from './visibilityPolicy'

/*
 * Menu Visibility — pure SIDEBAR visibility resolver (Stage B rules, Stage C integration).
 *
 * Input: a map of stored preferences (a persisted reference or a draft).
 * Output: per approved ID, the stored preference, whether it would appear in
 * the sidebar, why not, and protected-module policy violations.
 *
 * No API calls, routing, redirects, permission checks, browser storage or DOM
 * access. Used by the management preview and real sidebar, never by the route
 * resolver, login landing, dashboard shortcuts or contextual links
 * (VISIBILITY_SCOPE — rules 4 and 5).
 *
 * Rules applied:
 * - hierarchy comes from the real navigation (`menuRegistry` ← `navigation.ts`);
 *   Sistema, Configurações and Ajuda are independent top-level entries (rule 3);
 * - a child appears only if its own preference AND its parent's effective
 *   visibility are true; a parent never rewrites child preferences (rule 8);
 * - Dashboard and Configurações always appear (rules 1, 2, 6). A stored
 *   `false` on them is reported as a policy violation, not hidden and not
 *   silently changed.
 */

export type SidebarReason =
  /** Own preference true and (for a child) parent visible. */
  | 'visible'
  /** Own preference false. */
  | 'hidden-own-preference'
  /** Own preference true, but an ancestor is hidden. */
  | 'hidden-by-parent'
  /** Protected module whose stored preference is false: shown anyway, flagged as a violation. */
  | 'protected-always-visible'

export type ResolvedMenuEntry = Readonly<{
  id: MenuId
  area: MenuArea
  parentId: MenuId | null
  /** Stored preference exactly as given (never normalized). */
  preference: boolean
  /** Whether the module would appear in the SIDEBAR under the approved rules. */
  sidebarVisible: boolean
  reason: SidebarReason
  /** Ancestor responsible for `hidden-by-parent`. */
  hiddenBy: MenuId | null
  protected: boolean
  /** Protected module stored as hidden (rules 1 / 2 broken by the input map). */
  policyViolation: boolean
  /** Rule 4 / 5: what visibility never affects, recorded per module. */
  directRoute: 'unaffected'
  shortcuts: 'unaffected'
  internalLinks: 'unaffected'
}>

export type SidebarNode = Readonly<{ id: MenuId; children: readonly SidebarNode[] }>

export type VisibilityResolution = Readonly<{
  /** Every approved ID, in real sidebar order. */
  entries: readonly ResolvedMenuEntry[]
  byId: Readonly<Record<MenuId, ResolvedMenuEntry>>
  /** The sidebar that the map would produce (visible entries only). */
  sidebar: Readonly<Record<MenuArea, readonly SidebarNode[]>>
  hidden: readonly ResolvedMenuEntry[]
  violations: readonly PolicyViolation[]
  scope: typeof VISIBILITY_SCOPE
}>

function resolveEntry(map: VisibilityMap, entry: MenuEntry): ResolvedMenuEntry {
  const isProtected = isProtectedMenuId(entry.id)
  const preference = map[entry.id]
  const base = {
    id: entry.id,
    area: entry.area,
    parentId: entry.parentId,
    preference,
    protected: isProtected,
    policyViolation: isProtected && preference === false,
    directRoute: 'unaffected',
    shortcuts: 'unaffected',
    internalLinks: 'unaffected',
  } as const
  if (isProtected) {
    return Object.freeze({ ...base, sidebarVisible: true, reason: preference ? 'visible' : 'protected-always-visible', hiddenBy: null })
  }
  const state = effectiveState(map, entry.id)
  if (state.state === 'visible') return Object.freeze({ ...base, sidebarVisible: true, reason: 'visible', hiddenBy: null })
  if (state.state === 'hidden') return Object.freeze({ ...base, sidebarVisible: false, reason: 'hidden-own-preference', hiddenBy: null })
  return Object.freeze({ ...base, sidebarVisible: false, reason: 'hidden-by-parent', hiddenBy: state.hiddenBy })
}

export function resolveVisibility(map: VisibilityMap): VisibilityResolution {
  const entries = MENU_ENTRIES.map((entry) => resolveEntry(map, entry))
  const byId = Object.freeze(Object.fromEntries(entries.map((entry) => [entry.id, entry]))) as Record<MenuId, ResolvedMenuEntry>
  const tree = (items: readonly MenuEntry[]): SidebarNode[] =>
    items
      .filter((item) => byId[item.id].sidebarVisible)
      .map((item) => Object.freeze({ id: item.id, children: Object.freeze(tree(item.children)) }))
  return Object.freeze({
    entries: Object.freeze(entries),
    byId,
    sidebar: Object.freeze({ primary: Object.freeze(tree(MENU_TREE.primary)), utility: Object.freeze(tree(MENU_TREE.utility)) }),
    hidden: Object.freeze(entries.filter((entry) => !entry.sidebarVisible)),
    violations: Object.freeze(policyViolations(map)),
    scope: VISIBILITY_SCOPE,
  })
}

/** Count of approved modules that would be absent from the sidebar. */
export function countSidebarHidden(map: VisibilityMap) {
  return resolveVisibility(map).hidden.length
}
