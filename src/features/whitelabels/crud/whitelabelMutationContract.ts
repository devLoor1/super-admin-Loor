/*
 * Whitelabel Operational V1 — contract and build-time activation boundary.
 *
 * Real Create/name-only transports are implemented behind a default-OFF guard.
 * Nest 88b7bf7 contract/controller/DTOs were inspected; only a live GET was
 * performed. No production write has been exercised or authorized here.
 *
 *   POST   /api/whitelabels                  { name, slug, baseUrl }   SUPER_ADMIN   → prepared (create review)
 *   PATCH  /api/whitelabels/:id              { name }                  SUPER_ADMIN   → prepared (name-only edit review)
 *   PATCH  /api/whitelabels/:id/activate     —                         SUPER_ADMIN   → NOT offered
 *   PATCH  /api/whitelabels/:id/deactivate   —                         SUPER_ADMIN   → NOT offered
 *   DELETE /api/whitelabels/:id              alias of deactivate       SUPER_ADMIN   → NOT offered
 *
 * Enabling a live write requires separate controlled activation authorization.
 */

export type WhitelabelMutationOperation = 'create' | 'update-name'
export type WhitelabelAction = WhitelabelMutationOperation | 'lifecycle'

export type MutationAvailability = Readonly<{ available: boolean; pendingLabel: string; reason: string }>

/** Build-time only. Missing, false or any other value fails closed; no URL/storage override. */
export const WHITELABEL_WRITES_ENABLED = import.meta.env.VITE_WHITELABEL_WRITES_ENABLED === 'true'

/** Default configuration disables every write, including for SUPER_ADMIN. Lifecycle stays off. */
export const WHITELABEL_MUTATIONS: Readonly<Record<WhitelabelAction, MutationAvailability>> = Object.freeze({
  create: Object.freeze({
    available: WHITELABEL_WRITES_ENABLED,
    pendingLabel: 'Criação aguardando liberação da integração.',
    reason: 'O envio da criação ainda não foi autorizado para o Control Plane.',
  }),
  'update-name': Object.freeze({
    available: WHITELABEL_WRITES_ENABLED,
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
  Object.freeze({ id: 'E', label: 'Smoke de escrita real ainda exige autorização e plano de isolamento/limpeza' }),
  Object.freeze({ id: 'F', label: 'Audit é best-effort e não participa de transação atômica com o Core' }),
  Object.freeze({ id: 'G', label: 'Concorrência last-write-wins; não há versão ou ETag neste ciclo' }),
  Object.freeze({ id: 'H', label: '409 E_SLUG_TAKEN confirmado na fonte; smoke de escrita real pendente' }),
])
