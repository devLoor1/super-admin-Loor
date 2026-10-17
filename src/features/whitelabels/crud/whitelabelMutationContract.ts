/*
 * Whitelabel mutation contract — TYPES, AVAILABILITY AND PRESENTATION ONLY.
 *
 * NO LIVE MUTATIONS ARE ENABLED. Nothing in `crud/` sends a request: there is
 * no `fetch`, no `apiRequest`, no authenticated mutation client and no
 * production transport. The Control Plane contract this prepares (Nest
 * `backend-super-admin-Loor` `aea5392`, controller/DTOs unchanged since
 * `46bf79d`, source-confirmed, never live-write-verified):
 *
 *   POST   /api/whitelabels                  { name, slug, baseUrl }   SUPER_ADMIN   → prepared (create review)
 *   PATCH  /api/whitelabels/:id              { name }                  SUPER_ADMIN   → prepared (name-only edit review)
 *   PATCH  /api/whitelabels/:id/activate     —                         SUPER_ADMIN   → NOT offered
 *   PATCH  /api/whitelabels/:id/deactivate   —                         SUPER_ADMIN   → NOT offered
 *   DELETE /api/whitelabels/:id              alias of deactivate       SUPER_ADMIN   → NOT offered
 *
 * Enabling a write later requires an explicit authorization, a reviewed
 * transport in the shared API layer, and flipping that action below.
 */

export type WhitelabelMutationOperation = 'create' | 'update-name'
export type WhitelabelAction = WhitelabelMutationOperation | 'lifecycle'

export type MutationAvailability = Readonly<{ available: false; pendingLabel: string; reason: string }>

/** Every Whitelabel write is disabled — for every role, SUPER_ADMIN included. */
export const WHITELABEL_MUTATIONS: Readonly<Record<WhitelabelAction, MutationAvailability>> = Object.freeze({
  create: Object.freeze({
    available: false,
    pendingLabel: 'Criação aguardando liberação da integração.',
    reason: 'O envio da criação ainda não foi autorizado para o Control Plane.',
  }),
  'update-name': Object.freeze({
    available: false,
    pendingLabel: 'Edição aguardando liberação da integração.',
    reason: 'O envio da alteração de nome ainda não foi autorizado para o Control Plane.',
  }),
  lifecycle: Object.freeze({
    available: false,
    pendingLabel: 'Ativação e desativação indisponíveis.',
    reason:
      'Os efeitos da desativação no tenant (cadastro, recuperação de senha e Whitelabel padrão) ainda exigem validação do ambiente e decisões de Produto.',
  }),
})

/* ---------- role-aware presentation (no new RBAC: the Backend guard decides) ---------- */

/**
 * - `super-admin`: the operator may open the create / name-edit review flows
 *   (the final submit stays disabled while the integration is not released);
 * - `read-only`: any other known session — writes are SUPER_ADMIN only;
 * - `unknown`: no operator data in this session yet.
 */
export type WhitelabelWriteAccess = 'super-admin' | 'read-only' | 'unknown'

/** Control Plane `RoleSlug` that passes the write guard (`@Roles('SUPER_ADMIN')`). */
export const WHITELABEL_WRITE_ROLE = 'SUPER_ADMIN'

export function whitelabelWriteAccess(roles: readonly string[] | null | undefined): WhitelabelWriteAccess {
  if (!Array.isArray(roles)) return 'unknown'
  return roles.includes(WHITELABEL_WRITE_ROLE) ? 'super-admin' : 'read-only'
}

export const WRITE_ACCESS_NOTE: Readonly<Record<Exclude<WhitelabelWriteAccess, 'super-admin'>, string>> = Object.freeze({
  'read-only': 'Criar ou editar Whitelabels é permitido somente ao perfil Super Admin.',
  unknown: 'Perfil do operador não confirmado nesta sessão: criar ou editar Whitelabels exige o perfil Super Admin.',
})

/* ---------- open blockers (kept from the contract gate; none is resolved here) ---------- */

export const WHITELABEL_OPEN_BLOCKERS = Object.freeze([
  Object.freeze({ id: 'A', label: 'Efeitos da desativação no tenant (cadastro, configurações públicas)' }),
  Object.freeze({ id: 'B', label: 'Isolamento da recuperação de senha com tenant inativo: entrega Backend ainda não validada no ambiente' }),
  Object.freeze({ id: 'C', label: 'Política e efeitos de desativar o Whitelabel padrão' }),
  Object.freeze({ id: 'D', label: 'Edição de slug / URL base muda a resolução do tenant' }),
  Object.freeze({ id: 'E', label: 'Comportamento de escrita do Core não confirmado (validação, envelope, status repetido, null)' }),
  Object.freeze({ id: 'F', label: 'Audit best-effort após o Core na nova fonte Nest: consistência e versão implantada ainda não validadas' }),
  Object.freeze({ id: 'G', label: 'Política de concorrência / versão / ETag de Whitelabels ainda não confirmada' }),
  Object.freeze({ id: 'H', label: 'Código de slug duplicado (E_SLUG_TAKEN) depende do Core: não confirmado' }),
])
