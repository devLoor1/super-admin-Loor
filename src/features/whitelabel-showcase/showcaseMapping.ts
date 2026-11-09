/**
 * Simulation mapping — Vitrine de White Labels (offline mock only).
 *
 * The approved owner of the showcase configuration is the LOØR homologation
 * White Label WL6 / slug `homologacao`. This mock never stores or contacts that
 * real identity: a fictitious mock tenant (numeric id 4, slug
 * `homolog-loor-demo`) stands in for it. The mapping below is the single,
 * explicit translation between the two. It is NOT a production API contract,
 * a tenant resolver or server-side authorization.
 */
export const SHOWCASE_SIMULATION = {
  /** Logical target approved by Product (documentation/labels only). */
  logicalOwner: {
    environmentKey: 'homolog',
    environmentLabel: 'Homologação LOØR',
    whitelabelId: 6,
    slug: 'homologacao',
    label: 'Homolog Loor',
  },
  /** Fictitious row of the in-memory mock database that represents the logical owner. */
  mockTenant: {
    id: '4',
    numericId: 4,
    slug: 'homolog-loor-demo',
    name: 'Homolog Loor · Demo',
  },
} as const

export type SimulatedEnvironment = 'homolog' | 'outro'

export const SIMULATED_ENVIRONMENT_LABELS: Record<SimulatedEnvironment, string> = {
  homolog: 'Homologação LOØR (simulada)',
  outro: 'Outro ambiente (simulado)',
}

/** Logical slug typed by an operator → mock slug actually searched in the in-memory database. */
export function mockSlugForInput(input: string) {
  const slug = input.trim().toLowerCase()
  return slug === SHOWCASE_SIMULATION.logicalOwner.slug ? SHOWCASE_SIMULATION.mockTenant.slug : slug
}

/** Mock source → logical identity, only for the mapped owner fixture. */
export function logicalSourceFor(mockId: string, mockSlug: string) {
  const { mockTenant, logicalOwner } = SHOWCASE_SIMULATION
  return mockId === mockTenant.id && mockSlug === mockTenant.slug
    ? { whitelabelId: logicalOwner.whitelabelId, slug: logicalOwner.slug }
    : null
}

/** Settings page of the owner fixture, where the "Plataforma → Vitrine de White Labels" block lives. */
export const showcaseOwnerSettingsHref = (tenantId: string) => `#/whitelabels/${encodeURIComponent(tenantId)}/settings`
export const showcaseEditorHref = (tenantId: string, tab?: string) =>
  `#/whitelabels/${encodeURIComponent(tenantId)}/settings/plataforma/vitrine${tab ? `?aba=${tab}` : ''}`
export const showcaseCardHref = (tenantId: string, instanceId: string) =>
  `#/whitelabels/${encodeURIComponent(tenantId)}/settings/plataforma/vitrine/cards/${encodeURIComponent(instanceId)}`
export const showcasePublicHref = (tenantId: string, draft = false) =>
  `#/mock/vitrine-publica/${encodeURIComponent(tenantId)}${draft ? '?versao=rascunho' : ''}`

/** Hashes that belong to the showcase family (editor, card editor, simulated public page). */
export function isShowcaseFamilyHash(hash: string) {
  const path = hash.replace(/^#\/?/, '').split('?')[0]
  return /^whitelabels\/[^/]+\/settings\/plataforma\/vitrine(?:\/cards\/[^/]+)?$/.test(path) || /^mock\/vitrine-publica\/[^/]+$/.test(path)
}
