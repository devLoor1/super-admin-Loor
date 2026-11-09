import { SHOWCASE_SIMULATION, showcaseOwnerSettingsHref, type SimulatedEnvironment } from './showcaseMapping'

/**
 * Presentation gates of the offline prototype. They decide what this mock
 * renders; they are NOT authorization. Real enforcement (owner, role and
 * environment on reads, writes, media references and the public projection)
 * belongs to the Backend and is still to be qualified.
 */

/** Same reading rule as the existing Settings read gate (SUPER_ADMIN or READ_ONLY). */
export const canViewShowcase = (roles: readonly string[] | undefined) => !!roles?.some(role => role === 'SUPER_ADMIN' || role === 'READ_ONLY')

/** Same writing rule as the existing write clients and mock transport (SUPER_ADMIN only). */
export const canEditShowcase = (roles: readonly string[] | undefined) => !!roles?.includes('SUPER_ADMIN')

export type ShowcaseContext = { tenantId: string; tenantSlug?: string | null; environment: SimulatedEnvironment }

/** The showcase exists only for the mapped owner fixture inside the simulated homolog environment. */
export function showcaseAvailableFor(context: ShowcaseContext) {
  const { mockTenant } = SHOWCASE_SIMULATION
  if (context.environment !== 'homolog') return false
  if (context.tenantId !== mockTenant.id) return false
  return context.tenantSlug === undefined || context.tenantSlug === mockTenant.slug
}

/**
 * Destination of the "Configurações" quick action of the Whitelabels list (D2):
 * the owner's Settings page, under the SAME rule as the Settings entry block
 * (reading profile + mapped owner fixture + simulated homolog environment).
 * Anything else keeps the previous behavior (no destination). Reading only:
 * editing is still decided by the Vitrine screens and their mutators.
 */
export function showcaseSettingsEntryHref(context: ShowcaseContext & { roles: readonly string[] | undefined }) {
  return canViewShowcase(context.roles) && showcaseAvailableFor(context) ? showcaseOwnerSettingsHref(context.tenantId) : null
}

export type ShowcaseActor = { roles: readonly string[] | undefined }

export class ShowcasePermissionError extends Error {
  constructor() {
    super('Perfil sem permissão de edição nesta simulação.')
    this.name = 'ShowcasePermissionError'
  }
}

/** Handler-level guard: every mutation path calls it, not only the disabled controls. */
export function assertCanEdit(actor: ShowcaseActor) {
  if (!canEditShowcase(actor.roles)) throw new ShowcasePermissionError()
}
