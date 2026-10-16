import { MENU_VISIBILITY_IDS } from './menuRegistry'
import {
  describeVisibilityError,
  MENU_VISIBILITY_CONTRACT,
  parseMenuVisibilityResponse,
  putRequestPreview,
  type MenuVisibilityConfig,
  type MenuVisibilityPutBody,
  type VisibilityErrorView,
} from './menuVisibilityContract'
import { preferenceChanges, type PreferenceChange, type VisibilityMap } from './visibilityModel'
import { policyViolations, type PolicyViolation } from './visibilityPolicy'
import { ApiError } from '../../lib/api'

/*
 * Menu Visibility — FUTURE update design (Stage B preparation). PURE: no
 * request code, no transport, nothing here can reach the Control Plane.
 *
 * The implemented Backend (`46bf79d`) accepts `PUT /api/homolog/menu-visibility`
 * with the COMPLETE 23-ID map, SUPER_ADMIN only, no version / ETag
 * (last write wins), and writes its Audit outside the save transaction.
 * It does not yet reject `dashboard: false` / `configuracoes: false`.
 *
 * `buildUpdateCandidate` prepares what a future save would carry and why it
 * cannot be sent; `interpretSaveOutcome` / `reconcileReadback` define how a
 * future response must be read. Both are exercised only by tests with an
 * injected mock transport. In Stage B preparation `sendable` is always false.
 */

export type CandidateIssue =
  /** Rule 1 / 2: a protected module is hidden in the candidate. */
  | Readonly<{ kind: 'protected-hidden'; violation: PolicyViolation }>
  /** Nothing differs from the persisted reference. */
  | Readonly<{ kind: 'no-changes' }>
  /** The operator's role cannot edit (rule 7). */
  | Readonly<{ kind: 'read-only' }>

export type UpdateBlocker =
  | 'stage-b-not-enabled'
  | 'server-protected-ids-not-enforced'
  | 'server-concurrency-not-implemented'
  | 'server-audit-not-atomic'

/** Backend changes required before any save may be enabled (docs: Stage B activation blockers). */
export const STAGE_B_ACTIVATION_BLOCKERS: readonly UpdateBlocker[] = Object.freeze([
  'stage-b-not-enabled',
  'server-protected-ids-not-enforced',
  'server-concurrency-not-implemented',
  'server-audit-not-atomic',
])

export type MenuVisibilityUpdateCandidate = Readonly<{
  /** Documentation string only (`PUT /api/homolog/menu-visibility`). */
  endpoint: typeof MENU_VISIBILITY_CONTRACT.putEndpoint
  /** Complete 23-ID map in registry order — the shape the Backend requires. */
  body: MenuVisibilityPutBody
  changes: readonly PreferenceChange[]
  issues: readonly CandidateIssue[]
  /** True only when the candidate itself satisfies the Product rules. */
  valid: boolean
  /** Always false in Stage B preparation: nothing is ever sent. */
  sendable: false
  blockedBy: readonly UpdateBlocker[]
}>

/** A typed caller is not a runtime guarantee. Reject, never fill or strip IDs. */
function assertCompleteMap(value: unknown): asserts value is VisibilityMap {
  if (
    typeof value !== 'object' || value === null || Array.isArray(value)
    || Reflect.ownKeys(value).length !== MENU_VISIBILITY_IDS.length
    || !MENU_VISIBILITY_IDS.every((id) => Object.prototype.hasOwnProperty.call(value, id) && typeof (value as Record<string, unknown>)[id] === 'boolean')
  ) throw new TypeError('Menu Visibility candidate requires exactly the 23 approved boolean preferences.')
}

export function buildUpdateCandidate(reference: VisibilityMap, draft: VisibilityMap, mode: 'edit' | 'read'): MenuVisibilityUpdateCandidate {
  assertCompleteMap(reference)
  assertCompleteMap(draft)
  const changes = preferenceChanges(reference, draft).map((change) => Object.freeze(change))
  const issues: CandidateIssue[] = [
    ...policyViolations(draft).map((violation) => Object.freeze({ kind: 'protected-hidden' as const, violation })),
    ...(changes.length === 0 ? [Object.freeze({ kind: 'no-changes' as const })] : []),
    ...(mode !== 'edit' ? [Object.freeze({ kind: 'read-only' as const })] : []),
  ]
  const body = putRequestPreview(draft)
  Object.freeze(body.visibility)
  return Object.freeze({
    endpoint: MENU_VISIBILITY_CONTRACT.putEndpoint,
    body: Object.freeze(body),
    changes: Object.freeze(changes),
    issues: Object.freeze(issues),
    valid: issues.length === 0,
    sendable: false,
    blockedBy: STAGE_B_ACTIVATION_BLOCKERS,
  })
}

/* ---------- future response handling (design; tests only) ---------- */

/** What a future transport would hand back: a parsed 2xx body, or the error it threw. */
export type SaveTransportResult = Readonly<{ ok: true; body: unknown }> | Readonly<{ ok: false; error: unknown }>

export type SaveResolution =
  /** 2xx, valid envelope, and the stored map equals the candidate exactly. */
  | Readonly<{ state: 'confirmed'; config: MenuVisibilityConfig }>
  /** The server refused: nothing should be considered applied. */
  | Readonly<{ state: 'rejected'; reason: 'invalid' | 'forbidden' | 'conflict' | 'session' | 'other'; view: VisibilityErrorView }>
  /**
   * No confirmation (timeout, network, 5xx — including the Backend's
   * Audit-after-save failure — malformed body, or a 2xx that does not echo
   * the candidate). The change may or may not be stored: the only next step
   * is an authoritative read-back. Never an automatic retry.
   */
  | Readonly<{ state: 'uncertain'; next: 'authoritative-readback'; view: VisibilityErrorView }>

const sameMap = (a: Record<string, boolean>, b: Record<string, boolean>) => MENU_VISIBILITY_IDS.every((id) => a[id] === b[id])

export function interpretSaveOutcome(candidate: MenuVisibilityUpdateCandidate, result: SaveTransportResult): SaveResolution {
  if (result.ok) {
    try {
      const config = parseMenuVisibilityResponse(result.body)
      if (sameMap(config.map, candidate.body.visibility)) return Object.freeze({ state: 'confirmed', config })
    } catch {
      // fall through: an unreadable 2xx proves nothing
    }
    return Object.freeze({
      state: 'uncertain',
      next: 'authoritative-readback',
      view: describeVisibilityError(new ApiError(200, {}, { kind: 'malformed' }), 'save'),
    })
  }
  const view = describeVisibilityError(result.error, 'save')
  if (result.error instanceof ApiError && result.error.kind === 'http' && result.error.status < 500) {
    const reason =
      result.error.status === 400 || result.error.status === 422
        ? 'invalid'
        : result.error.status === 403
          ? 'forbidden'
          : result.error.status === 409
            ? 'conflict'
            : result.error.status === 401
              ? 'session'
              : 'other'
    return Object.freeze({ state: 'rejected', reason, view })
  }
  return Object.freeze({ state: 'uncertain', next: 'authoritative-readback', view })
}

/**
 * After an uncertain outcome, compare a fresh authoritative GET with the
 * candidate and the reference the draft started from:
 * - `applied`: the server now stores the candidate;
 * - `not-applied`: the server still stores the original reference;
 * - `diverged`: something else is stored (e.g. a concurrent save — the
 *   Backend has no version / ETag) — the draft must be reviewed again.
 */
export function reconcileReadback(
  candidate: MenuVisibilityUpdateCandidate,
  reference: VisibilityMap,
  readback: MenuVisibilityConfig,
): 'applied' | 'not-applied' | 'diverged' {
  if (sameMap(readback.map, candidate.body.visibility)) return 'applied'
  if (sameMap(readback.map, reference)) return 'not-applied'
  return 'diverged'
}
