import { ApiError } from '../../lib/api'
import { getAccessToken, getOperator, getSessionVersion } from '../../lib/authSession'
import { SHOWCASE_ENABLED, showcaseEnvironment, showcaseOwnerSettingsHref, type ShowcaseEnvironment } from './showcaseMapping'

export const canViewShowcase = (roles: readonly string[] | undefined) => !!roles?.some(role => role === 'SUPER_ADMIN' || role === 'READ_ONLY')
export const canEditShowcase = (roles: readonly string[] | undefined) => !!roles?.includes('SUPER_ADMIN')
export type ShowcaseContext = { tenantId: string; tenantSlug?: string | null; environment?: ShowcaseEnvironment }
export function showcaseAvailableFor(context: ShowcaseContext) {
  return SHOWCASE_ENABLED && showcaseEnvironment() === 'homolog' && (context.environment === undefined || context.environment === 'homolog')
    && context.tenantId === '6' && context.tenantSlug === 'homologacao'
}
export function showcaseSettingsEntryHref(context: ShowcaseContext & { roles: readonly string[] | undefined }) {
  return canViewShowcase(context.roles) && showcaseAvailableFor(context) ? showcaseOwnerSettingsHref(context.tenantId) : null
}
export type ShowcaseActor = { roles: readonly string[] | undefined; sessionVersion?: number }
export class ShowcasePermissionError extends ApiError {
  constructor() { super(403, { code: 'E_FORBIDDEN', message: 'Perfil sem permissão para esta operação.' }); this.name = 'ShowcasePermissionError' }
}
export function assertCanRead(actor?: ShowcaseActor) {
  if (!SHOWCASE_ENABLED) throw new ApiError(404, { code: 'E_SHOWCASE_NOT_AVAILABLE' })
  if (!getAccessToken() || (actor?.sessionVersion !== undefined && actor.sessionVersion !== getSessionVersion())) throw new ApiError(401, { code: 'NO_SESSION' })
  if (!canViewShowcase(getOperator()?.roles) || (actor && !canViewShowcase(actor.roles))) throw new ShowcasePermissionError()
}
export function assertCanEdit(actor: ShowcaseActor) {
  assertCanRead(actor)
  if (!canEditShowcase(getOperator()?.roles) || !canEditShowcase(actor.roles)) throw new ShowcasePermissionError()
}

/** Display-only /auth/me refreshes do not discard drafts or unresolved attempts. */
export function showcaseSessionKey() {
  const operator = getOperator()
  return JSON.stringify([getSessionVersion(), operator?.id ?? null, [...new Set(operator?.roles ?? [])].sort()])
}
