import type { NavItem } from '../components/shell/navigation'

/** Presentation eligibility, never authorization or saved Menu Visibility configuration. */
export const PROTOTYPE_PRESENTATION = true // Dedicated offline mock, including built previews.
export const MOCK_ONLY_VIEWS: ReadonlySet<string> = new Set(['emails', 'finance', 'finance-modalities', 'finance-catalogs'])
/** SA-BE-001 accepted subset. Backend authorization and fresh state checks still apply. */
export const opportunityEditorialAvailable = (status: string, roles: readonly string[]) => status === 'review' && roles.includes('SUPER_ADMIN')
export const opportunityActionAvailable = (action: string, development = PROTOTYPE_PRESENTATION) => development || ['create', 'image', 'patch', 'archive'].includes(action)
/** Candidate lifecycle commands still require their release gates and authoritative Backend RBAC. */
export const administratorLifecycleAvailable = (roles: readonly string[]) => roles.includes('SUPER_ADMIN')
const MOCK_MENU_IDS = new Set(['sistema', 'ajuda', 'whitelabel-emails', 'finance-gateways', 'finance-modalities', 'finance-catalogs'])
export function viewAvailable(view: string, development = PROTOTYPE_PRESENTATION) { return development || !MOCK_ONLY_VIEWS.has(view) }
export function readinessHref(id: string, candidate?: string, development = PROTOTYPE_PRESENTATION) {
  if (development) return candidate
  if (id === 'financeiro') return '#/finance/investments'
  if (id === 'contas' && (!candidate || candidate.includes('_proto_'))) return '#/whitelabels/select/accounts'
  if (id === 'whitelabel-settings' && (!candidate || !/^#\/whitelabels\/[1-9]\d*\/settings$/.test(candidate))) return '#/whitelabels/select/settings'
  return candidate?.includes('_proto_') ? undefined : candidate
}
/** Applied AFTER the existing persisted preference policy, including its error fallback. No registry edits. */
export function readinessNavigation(items: NavItem[], development = PROTOTYPE_PRESENTATION): NavItem[] {
  if (development) return items
  return items.filter(i => !MOCK_MENU_IDS.has(i.id)).flatMap(i => {
    const href = readinessHref(i.id, i.href, development)
    const children = i.children ? readinessNavigation(i.children, development) : undefined
    return href ? [{ ...i, href, children }] : []
  })
}
export function readinessTabs<T extends { value: string }>(tabs: T[], development = PROTOTYPE_PRESENTATION) {
  return development ? tabs : tabs.filter(t => t.value !== 'activity' && t.value !== 'atividade')
}
