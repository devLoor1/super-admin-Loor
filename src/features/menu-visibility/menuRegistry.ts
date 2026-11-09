import type { LucideIcon } from 'lucide-react'
import { PRIMARY_NAV, UTILITY_NAV, type NavItem } from '../../components/shell/navigation'

/*
 * Menu Visibility — stable registry.
 *
 * IDs: the allow-list approved in the Backend requirement for global module
 * visibility. Only these IDs can ever be configured; nothing else is invented.
 * Labels, icons, order and hierarchy are NOT duplicated: they are read from
 * the real navigation (`navigation.ts`), which stays the single source of
 * navigation identity and receives no visibility state.
 *
 * A navigation entry outside the allow-list (e.g. a future contextual page)
 * is simply not visibility-controlled until an ID is approved for it.
 * Companies has no approved ID: `operation-companies` is deliberately absent.
 */
export const MENU_VISIBILITY_IDS = [
  'dashboard',
  'plataformas',
  'whitelabels',
  'contas',
  'whitelabel-settings',
  'whitelabel-emails',
  'operacao',
  'operation-opportunities',
  'operation-investors',
  'operation-entrepreneurs',
  'financeiro',
  'finance-gateways',
  'finance-modalities',
  'finance-catalogs',
  'finance-investments',
  'finance-payments',
  'finance-wallets',
  'compliance',
  'compliance-kyc',
  'auditoria',
  'sistema',
  'configuracoes',
  'ajuda',
] as const

export type MenuId = (typeof MENU_VISIBILITY_IDS)[number]

const APPROVED: ReadonlySet<string> = new Set(MENU_VISIBILITY_IDS)

export function isMenuId(value: unknown): value is MenuId {
  return typeof value === 'string' && APPROVED.has(value)
}

/** Where the entry lives in the real sidebar. */
export type MenuArea = 'primary' | 'utility'

export type MenuEntry = Readonly<{
  id: MenuId
  label: string
  icon: LucideIcon
  area: MenuArea
  /** Parent in the real navigation (one level), or null for a top-level / utility entry. */
  parentId: MenuId | null
  children: readonly MenuEntry[]
}>

function build(items: readonly NavItem[], area: MenuArea, parentId: MenuId | null): MenuEntry[] {
  return items.flatMap((item): MenuEntry[] => {
    if (!isMenuId(item.id)) return []
    const entry: MenuEntry = Object.freeze({
      id: item.id,
      label: item.label,
      icon: item.icon,
      area,
      parentId,
      children: Object.freeze(build(item.children ?? [], area, item.id)),
    })
    return [entry]
  })
}

/** Registry tree in real sidebar order: primary navigation, then utilities. */
export const MENU_TREE: Readonly<Record<MenuArea, readonly MenuEntry[]>> = Object.freeze({
  primary: Object.freeze(build(PRIMARY_NAV, 'primary', null)),
  utility: Object.freeze(build(UTILITY_NAV, 'utility', null)),
})

/** Every registry entry, depth-first in sidebar order. */
export const MENU_ENTRIES: readonly MenuEntry[] = Object.freeze(
  [...MENU_TREE.primary, ...MENU_TREE.utility].flatMap((entry) => [entry, ...entry.children]),
)

const BY_ID = new Map(MENU_ENTRIES.map((entry) => [entry.id, entry]))

export function menuEntry(id: MenuId): MenuEntry {
  const entry = BY_ID.get(id)
  if (!entry) throw new Error(`Menu ID without a navigation entry: ${id}`)
  return entry
}

/** "Investidores (Operação)" for a child; the label alone for a top-level entry. */
export function menuLabelWithParent(id: MenuId) {
  const entry = menuEntry(id)
  return entry.parentId ? `${entry.label} (${menuEntry(entry.parentId).label})` : entry.label
}
