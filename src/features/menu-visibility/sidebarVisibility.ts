import { PRIMARY_NAV, UTILITY_NAV, type NavItem } from '../../components/shell/navigation'
import { isMenuId } from './menuRegistry'
import { isProtectedMenuId } from './visibilityPolicy'
import { resolveVisibility } from './visibilityResolver'
import type { VisibilitySnapshot } from './visibilityResource'
import type { VisibilityMap } from './visibilityModel'

/** Filters existing objects only; labels, hrefs, active state and tenant overrides stay owned by the shell. */
export function filterSidebarItems(items: NavItem[], map?: VisibilityMap): NavItem[] {
  const resolved = map ? resolveVisibility(map) : undefined
  return items.filter(item => isMenuId(item.id) && (resolved ? resolved.byId[item.id].sidebarVisible : isProtectedMenuId(item.id)))
    .map(item => ({ ...item, ...(item.children ? { children: filterSidebarItems(item.children, map) } : {}) }))
}

export function sidebarNavigation(snapshot: VisibilitySnapshot) {
  const { state, lastData } = snapshot
  if (state.status === 'error') {
    // Recoverable, explicitly labelled navigation fallback — NOT persisted preferences or RBAC.
    return { mode: 'fallback' as const, primary: PRIMARY_NAV, utility: UTILITY_NAV }
  }
  const data = state.status === 'success' ? state.data : lastData
  return {
    mode: data ? state.status === 'success' ? 'loaded' as const : 'refreshing' as const : 'loading' as const,
    primary: filterSidebarItems(PRIMARY_NAV, data?.map),
    utility: filterSidebarItems(UTILITY_NAV, data?.map),
  }
}
