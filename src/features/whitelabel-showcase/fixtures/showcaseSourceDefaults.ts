import { assertCanEdit, type ShowcaseActor } from '../showcaseAccess'
import type { SourceDefaults } from '../showcaseModel'

/**
 * SIMULATED source defaults (logo, palette, short description), keyed by mock
 * slug. Discovery found no canonical global logo/palette/short-description
 * contract; these values are fixtures of this offline prototype and must never
 * be presented as verified Backend fields.
 *
 * - `nova-plataforma-demo`: complete simulated defaults (illustrative IMPULSO identity).
 * - `finapop-demo`: partial defaults (no logo) → manual completion.
 * - `homolog-loor-demo` (owner, logical `homologacao`) and `loor-demo`: none.
 */

const INITIAL: Record<string, SourceDefaults> = {
  'nova-plataforma-demo': {
    version: 1,
    logo: { sourceAssetRef: 'origem-simulada:nova-plataforma-demo:logo:v1', fileName: 'impulso-logo.png' },
    colors: { panel: '#B64225', divider: '#F1C16E' },
    shortDescription: 'Desenvolvimento regional.',
  },
  'finapop-demo': {
    version: 1,
    logo: null,
    colors: { panel: '#3F37BD', divider: '#14B8A6' },
    shortDescription: 'Descrição curta simulada da origem — substitua pelo texto aprovado.',
  },
}

let defaults: Record<string, SourceDefaults> = structuredClone(INITIAL)
const listeners = new Set<() => void>()

export function getSourceDefaults(mockSlug: string): SourceDefaults | null {
  const value = defaults[mockSlug]
  return value ? structuredClone(value) : null
}

export function subscribeSourceDefaults(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Simulates a later branding change at the source. Existing cards are never touched,
 * but new cards and "Restaurar padrões" read these values, so the command is guarded
 * like any other write of this module (mock gate, not Backend authorization).
 */
export function simulateSourceBrandingChange(actor: ShowcaseActor, mockSlug = 'nova-plataforma-demo') {
  assertCanEdit(actor)
  const current = defaults[mockSlug]
  if (!current) return null
  const version = current.version + 1
  defaults = {
    ...defaults,
    [mockSlug]: {
      version,
      logo: current.logo ? { ...current.logo, sourceAssetRef: current.logo.sourceAssetRef.replace(/:v\d+$/, `:v${version}`) } : null,
      colors: version % 2 === 0 ? { panel: '#7A2E19', divider: '#E8A94F' } : { panel: '#B64225', divider: '#F1C16E' },
      shortDescription: version % 2 === 0 ? 'Desenvolvimento regional sustentável.' : 'Desenvolvimento regional.',
    },
  }
  listeners.forEach(listener => listener())
  return structuredClone(defaults[mockSlug])
}

export function resetSourceDefaultsForChecks() {
  defaults = structuredClone(INITIAL)
}
