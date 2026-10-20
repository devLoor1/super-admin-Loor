import { MENU_VISIBILITY_IDS, type MenuId } from './menuRegistry'
import { setPreference, type VisibilityMap } from './visibilityModel'

/*
 * Menu Visibility — APPROVED PRODUCT RULES (Stage B preparation; pure, no I/O).
 *
 * Received from the project collaborators and approved for frontend
 * preparation (docs/menu-visibility-stage-b-preparation.md):
 *
 *   1. Dashboard cannot be hidden (stored preference must stay true).
 *   2. Configurações cannot be hidden (keeps this management screen reachable).
 *   3. Sistema, Configurações and Ajuda are independent (no parent / child).
 *   4. Hidden modules stay reachable through direct URLs (Backend RBAC still applies).
 *   5. Dashboard shortcuts and internal links stay available.
 *   6. No recovery screen: Dashboard and Configurações are always visible.
 *   7. SUPER_ADMIN reads + edits; SUPPORT_ADMIN / READ_ONLY read only;
 *      FINANCIAL_ADMIN / COMPLIANCE_ADMIN have no access (Backend 403).
 *   8. Child preferences are kept independently of their parent.
 *
 * The frontend applies these rules to the management draft and the isolated
 * preview only. Backend 88b7bf7 also enforces protected IDs (E_MENU_LOCKED).
 * A malformed authoritative value is still reported, never silently rewritten.
 */

/** Rules 1, 2 and 6: modules that can never be hidden. */
export const PROTECTED_MENU_IDS = Object.freeze(['dashboard', 'configuracoes'] as const)

export type ProtectedMenuId = (typeof PROTECTED_MENU_IDS)[number]

export const PROTECTED_EXPLANATION: Readonly<Record<ProtectedMenuId, string>> = Object.freeze({
  dashboard: 'Sempre visível — módulo obrigatório.',
  configuracoes: 'Sempre visível — acesso à gestão de módulos.',
})

const PROTECTED: ReadonlySet<string> = new Set(PROTECTED_MENU_IDS)

export function isProtectedMenuId(id: MenuId): id is ProtectedMenuId {
  return PROTECTED.has(id)
}

/** A protected module whose preference is `false` (persisted by the server or present in a map). */
export type PolicyViolation = Readonly<{ id: ProtectedMenuId; preference: false }>

/** Rule 1 / 2 violations in a map, in registry order. Reports; never corrects. */
export function policyViolations(map: VisibilityMap): PolicyViolation[] {
  return PROTECTED_MENU_IDS.filter((id) => map[id] === false).map((id) => Object.freeze({ id, preference: false as const }))
}

/**
 * Draft setter that applies rules 1 / 2: hiding a protected module is
 * refused (the same map comes back, so the control can be locked rather than
 * silently discarding an edit). Showing it is always allowed. Every other ID
 * changes only its own preference (rule 8 — see `setPreference`).
 */
export function setDraftPreference(map: VisibilityMap, id: MenuId, visible: boolean): VisibilityMap {
  if (!visible && isProtectedMenuId(id)) return map
  return setPreference(map, id, visible)
}

/**
 * Explicit operator action for a server reference that breaks rules 1 / 2:
 * sets the protected modules back to visible IN THE DRAFT. The persisted
 * value is untouched; the change appears in the review like any other.
 */
export function restoreProtectedInDraft(map: VisibilityMap): VisibilityMap {
  return PROTECTED_MENU_IDS.reduce((current, id) => setPreference(current, id, true), map)
}

/**
 * Rules 4 and 5 as data: Menu Visibility decides whether a module appears in
 * the SIDEBAR. It never blocks a direct URL, removes a shortcut or internal
 * link, changes the post-login landing, or grants / revokes access.
 */
export const VISIBILITY_SCOPE = Object.freeze({
  sidebar: 'affected',
  directRoutes: 'unaffected',
  dashboardShortcuts: 'unaffected',
  internalLinks: 'unaffected',
  postLoginLanding: 'unaffected',
  authorization: 'unaffected',
} as const)

/* ---------- Rule 7: role-dependent management presentation ---------- */

export type MenuVisibilityAccess = 'edit' | 'read' | 'none'

/** Backend role slugs (Control Plane `RoleSlug`, as returned by login / `GET /auth/me`). */
export const MENU_VISIBILITY_ROLE_ACCESS: Readonly<Record<string, MenuVisibilityAccess>> = Object.freeze({
  SUPER_ADMIN: 'edit',
  SUPPORT_ADMIN: 'read',
  READ_ONLY: 'read',
  FINANCIAL_ADMIN: 'none',
  COMPLIANCE_ADMIN: 'none',
})

const RANK: Record<MenuVisibilityAccess, number> = { none: 0, read: 1, edit: 2 }

/**
 * Access the approved rule gives an operator: the most permissive of their
 * known roles. Unknown roles grant nothing. The Backend stays the authority:
 * `none` is enforced by its 403 on the GET, not by hiding the screen here.
 */
export function expectedAccess(roles: readonly string[] | null | undefined): MenuVisibilityAccess {
  let access: MenuVisibilityAccess = 'none'
  for (const role of roles ?? []) {
    const granted = Object.prototype.hasOwnProperty.call(MENU_VISIBILITY_ROLE_ACCESS, role) ? MENU_VISIBILITY_ROLE_ACCESS[role] : 'none'
    if (RANK[granted] > RANK[access]) access = granted
  }
  return access
}

/**
 * Presentation after a successful GET: editing controls only for SUPER_ADMIN.
 * Anyone else the Backend let read (or an operator whose roles are unknown)
 * sees the configuration read-only — never an editable draft.
 */
export function presentationMode(roles: readonly string[] | null | undefined): 'edit' | 'read' {
  return expectedAccess(roles) === 'edit' ? 'edit' : 'read'
}

/** All approved stable IDs that are NOT protected (the only ones a draft may hide). */
export const HIDEABLE_MENU_IDS: readonly MenuId[] = Object.freeze(MENU_VISIBILITY_IDS.filter((id) => !PROTECTED.has(id)))
