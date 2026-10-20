import { ApiError } from '../../lib/api'
import { MENU_VISIBILITY_IDS } from './menuRegistry'
import { describeVisibilityError, parseMenuVisibilityResponse, putRequestPreview, validVisibilityVersion, type MenuVisibilityConfig, type MenuVisibilityPutBody, type VisibilityErrorView } from './menuVisibilityContract'
import { preferenceChanges, type PreferenceChange, type VisibilityMap } from './visibilityModel'
import { policyViolations, type PolicyViolation } from './visibilityPolicy'

// Pure review/reconciliation. No transport, auth, storage, routing or enforcement.
export type CandidateIssue =
  | { kind: 'protected-hidden'; violation: PolicyViolation }
  | { kind: 'no-changes' | 'read-only' | 'registry-drift' }
/** Shared operational activation risks, not a veto on a separately authorized,
 * sequential single-operator change/readback/restore smoke test. */
export const STAGE_B_ACTIVATION_BLOCKERS = Object.freeze([
  'live-write-authorization-pending', 'server-concurrency-not-atomic', 'server-audit-best-effort',
] as const)

export type UpdateCandidate = Readonly<{
  endpoint: 'PUT /api/homolog/menu-visibility'
  body: MenuVisibilityPutBody
  changes: readonly PreferenceChange[]
  issues: readonly CandidateIssue[]
  valid: boolean
  /** Pure review alone grants no network capability. */
  sendable: false
  blockedBy: typeof STAGE_B_ACTIVATION_BLOCKERS
}>

export function assertCompleteMap(value: unknown): asserts value is VisibilityMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Invalid visibility map')
  const keys = Reflect.ownKeys(value)
  if (keys.length !== MENU_VISIBILITY_IDS.length || keys.some(key => typeof key !== 'string' || !MENU_VISIBILITY_IDS.includes(key as typeof MENU_VISIBILITY_IDS[number]))) throw new TypeError('Invalid visibility map')
  for (const id of MENU_VISIBILITY_IDS) {
    if (!Object.prototype.hasOwnProperty.call(value, id) || typeof (value as VisibilityMap)[id] !== 'boolean') throw new TypeError('Invalid visibility map')
  }
}

export function buildUpdateCandidate(reference: MenuVisibilityConfig, draft: VisibilityMap, mode: 'edit' | 'read'): UpdateCandidate {
  assertCompleteMap(reference.map)
  assertCompleteMap(draft)
  if (!validVisibilityVersion(reference.version) || reference.version === Number.MAX_SAFE_INTEGER) throw new TypeError('Invalid visibility version')
  const changes = preferenceChanges(reference.map, draft)
  const issues: CandidateIssue[] = policyViolations(draft).map(violation => ({ kind: 'protected-hidden', violation }))
  if (!changes.length) issues.push({ kind: 'no-changes' })
  if (mode !== 'edit') issues.push({ kind: 'read-only' })
  if (reference.unknownIds.length) issues.push({ kind: 'registry-drift' })
  const body = putRequestPreview(draft, reference.version)
  Object.freeze(body.visibility)
  Object.freeze(body)
  return Object.freeze({ endpoint: 'PUT /api/homolog/menu-visibility', body, changes: Object.freeze(changes), issues: Object.freeze(issues), valid: issues.length === 0, sendable: false, blockedBy: STAGE_B_ACTIVATION_BLOCKERS })
}

export type SaveTransportResult = { ok: true; body: unknown } | { ok: false; error: unknown }
export type SaveResolution =
  | { state: 'acknowledged'; config: MenuVisibilityConfig }
  | { state: 'conflicted'; view: VisibilityErrorView }
  | { state: 'rejected'; view: VisibilityErrorView }
  | { state: 'uncertain'; view: VisibilityErrorView }

export function sameVisibility(a: VisibilityMap, b: VisibilityMap) {
  return MENU_VISIBILITY_IDS.every(id => a[id] === b[id])
}

export function interpretSaveOutcome(candidate: UpdateCandidate, result: SaveTransportResult, operatorId?: string): SaveResolution {
  if (result.ok) {
    try {
      const config = parseMenuVisibilityResponse(result.body)
      if (config.version !== candidate.body.version + 1 || !config.saved || !config.updatedBy || (operatorId !== undefined && config.updatedBy !== operatorId) || config.unknownIds.length || !sameVisibility(config.map, candidate.body.visibility)) throw new Error('Unconfirmed acknowledgement')
      return { state: 'acknowledged', config }
    } catch {
      return { state: 'uncertain', view: describeVisibilityError(new ApiError(200, {}, { kind: 'malformed' }), 'save') }
    }
  }
  const error = result.error
  const view = describeVisibilityError(error, 'save')
  if (error instanceof ApiError && error.kind === 'http') {
    if (error.status === 409) return { state: 'conflicted', view }
    if (error.status >= 400 && error.status < 500) return { state: 'rejected', view }
  }
  return { state: 'uncertain', view }
}

export type ReadbackDecision = 'applied' | 'not-confirmed' | 'diverged' | 'conflicted'

/** Matching maps alone never establish attribution, including a newer identical map. */
export function reconcileReadback(candidate: UpdateCandidate, reference: MenuVisibilityConfig, readback: MenuVisibilityConfig, result: SaveResolution): ReadbackDecision {
  if (result.state === 'conflicted') return 'conflicted'
  if (result.state === 'acknowledged' && readback.version === result.config.version && readback.updatedBy === result.config.updatedBy && readback.updatedAt === result.config.updatedAt && !readback.unknownIds.length && sameVisibility(readback.map, candidate.body.visibility)) return 'applied'
  if (readback.version < reference.version || readback.unknownIds.length || (!sameVisibility(readback.map, reference.map) && !sameVisibility(readback.map, candidate.body.visibility)) || readback.version > candidate.body.version + 1) return 'diverged'
  return 'not-confirmed'
}
