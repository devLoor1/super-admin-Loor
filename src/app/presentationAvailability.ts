import type { NavItem } from '../components/shell/navigation'

/** Operational eligibility is identical locally and in official homolog; Backend RBAC remains authoritative. */
export const MOCK_ONLY_VIEWS: ReadonlySet<string> = new Set(['finance', 'finance-modalities', 'finance-catalogs'])
/** SA-BE-001 accepted subset. Backend authorization and fresh state checks still apply. */
export const opportunityEditorialAvailable = (status: string, roles: readonly string[]) => status === 'review' && roles.includes('SUPER_ADMIN')
export const opportunityActionAvailable = (action: string) => ['create', 'image', 'patch', 'archive'].includes(action)
export const administratorLifecycleAvailable = (roles: readonly string[]) => roles.includes('SUPER_ADMIN')
const UNAVAILABLE_MENU_IDS = new Set(['sistema', 'ajuda', 'finance-gateways', 'finance-modalities', 'finance-catalogs'])
export function viewAvailable(view: string) { return !MOCK_ONLY_VIEWS.has(view) }
export function readinessHref(id: string, candidate?: string) {
  if (id === 'financeiro') return '#/finance/investments'
  if (id === 'contas' && (!candidate || candidate.includes('_proto_'))) return '#/whitelabels/select/accounts'
  if (id === 'whitelabel-settings' && (!candidate || !/^#\/whitelabels\/[1-9]\d*\/settings(?:\?area=(?:platform|app|identity|terms))?$/.test(candidate))) return '#/whitelabels/select/settings'
  if (id === 'whitelabel-emails' && (!candidate || !/^#\/whitelabels\/[1-9]\d*\/emails(?:\?section=smtp)?$/.test(candidate))) return '#/whitelabels/select/emails?section=smtp'
  return candidate?.includes('_proto_') ? undefined : candidate
}
/** Applied AFTER persisted preference policy, including its error fallback. No registry edits. */
export function readinessNavigation(items: NavItem[]): NavItem[] {
  return items.filter(i => !UNAVAILABLE_MENU_IDS.has(i.id)).flatMap(i => {
    const href = readinessHref(i.id, i.href)
    const children = i.children ? readinessNavigation(i.children) : undefined
    return href ? [{ ...i, href, children }] : []
  })
}
export function readinessTabs<T extends { value: string }>(tabs: T[]) {
  return tabs.filter(t => t.value !== 'activity' && t.value !== 'atividade')
}
