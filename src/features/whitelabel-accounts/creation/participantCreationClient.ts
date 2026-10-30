import { participantCreationAvailable } from '../../../app/presentationAvailability'
import { ApiError, apiRequest } from '../../../lib/api'
import { getAccessToken, getOperator, getSessionVersion, handleUnauthorized, subscribeSession } from '../../../lib/authSession'
import { getWhitelabel } from '../../whitelabels/whitelabelApi'
import { getAccount, isAccountsWhitelabelId, isServerAccountId, listAccounts } from '../accountsApi'
import { refreshAccountReads } from '../access/accountAccessRefresh'
import { EMPTY_PARTICIPANT, matchesParticipant, participantInput, participantPath, participantReceipt, returnedParticipantId, resendReceipt, type ParticipantDraft, type ParticipantKind, type ParticipantPayload, type ParticipantReceipt } from './participantCreationContract'

export type ParticipantScope = { tenant: string; kind: ParticipantKind }
type Phase = 'checking' | 'sending' | 'reconciling' | 'confirmed' | 'readback_matches' | 'uncertain' | 'rejected'
export type CreationAttempt = { phase: Phase; id?: string; receipt?: ParticipantReceipt; status?: number; code?: string; correlationId?: string }
export type CreationState = { draft: Readonly<ParticipantDraft>; attempt: CreationAttempt | null }
type Operation = { key: string; payload: Readonly<ParticipantPayload>; accepted: boolean }
export type DeliveryState = { phase: 'sending' | 'reported' | 'verified' | 'limited' | 'uncertain' | 'rejected'; sent?: boolean; until?: number; status?: number; code?: string; correlationId?: string }
const EMPTY: CreationState = Object.freeze({ draft: EMPTY_PARTICIPANT, attempt: null })
const FOREIGN: CreationState = Object.freeze({ draft: EMPTY_PARTICIPANT, attempt: { phase: 'uncertain' } })
const states = new Map<string, CreationState>(), operations = new Map<string, Operation>(), deliveries = new Map<string, DeliveryState>()
const heldScopes = new Set<string>(), listeners = new Set<() => void>()
// Navigation can preserve the in-memory operation; a reload cannot. Warn even after the modal closes.
if (typeof window !== 'undefined') window.addEventListener?.('beforeunload', event => {
  if (heldScopes.size || [...states.values()].some(s => creationLocked(s.attempt) && s.attempt?.phase !== 'confirmed')) { event.preventDefault(); event.returnValue = '' }
})
const scopeKey = (s: ParticipantScope) => `${s.tenant}:${s.kind}`
const deliveryKey = (s: ParticipantScope, id: string) => `${scopeKey(s)}:${id}`
const emit = () => { for (const fn of listeners) fn() }
export const creationBusy = (a: CreationAttempt | null) => !!a && ['checking', 'sending', 'reconciling'].includes(a.phase)
export const creationLocked = (a: CreationAttempt | null) => !!a && a.phase !== 'rejected'
export function subscribeParticipants(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn) } }
export const creationState = (s: ParticipantScope): CreationState => heldScopes.has(scopeKey(s)) ? FOREIGN : states.get(scopeKey(s)) ?? EMPTY
export const deliveryState = (s: ParticipantScope, id: string) => deliveries.get(deliveryKey(s, id)) ?? null
function setState(s: ParticipantScope, patch: Partial<CreationState>) { states.set(scopeKey(s), { ...creationState(s), ...patch }); emit() }
function setAttempt(s: ParticipantScope, a: CreationAttempt) { setState(s, { attempt: a }) }
export function saveParticipantDraft(s: ParticipantScope, patch: Partial<ParticipantDraft>) {
  if (!creationLocked(creationState(s).attempt)) setState(s, { draft: { ...creationState(s).draft, ...patch }, attempt: null })
}
export function discardParticipantDraft(s: ParticipantScope) { if (!creationLocked(creationState(s).attempt)) { states.delete(scopeKey(s)); operations.delete(scopeKey(s)); emit() } }
/** A confirmed previous operation is never replayed; starting another account is an explicit action. */
export function nextParticipant(s: ParticipantScope) { if (creationState(s).attempt?.phase === 'confirmed') { states.delete(scopeKey(s)); operations.delete(scopeKey(s)); emit() } }
let epoch = getSessionVersion()
subscribeSession(() => {
  if (epoch === getSessionVersion() && getOperator()?.roles.includes('SUPER_ADMIN')) return
  for (const [key, value] of states) if (creationLocked(value.attempt) && value.attempt?.phase !== 'confirmed') heldScopes.add(key)
  // Keep only non-identifying locks when the operator changes. Never transfer drafts or receipts.
  states.clear(); operations.clear(); deliveries.clear(); epoch = getSessionVersion(); emit()
})
function authorize(s: ParticipantScope, version: number) {
  const token = getAccessToken()
  if (!token || version !== getSessionVersion()) throw new ApiError(401, { code: 'NO_SESSION' })
  if (!participantCreationAvailable(s.kind, getOperator()?.roles ?? [])) throw new ApiError(403, { code: 'PARTICIPANT_FORBIDDEN' })
  if (!isAccountsWhitelabelId(s.tenant)) throw new ApiError(400, { code: 'INVALID_WHITELABEL_ID' })
  return token
}
const current = (version: number, token: string) => version === getSessionVersion() && token === getAccessToken() && getOperator()?.roles.includes('SUPER_ADMIN')
const metadata = (e: unknown) => e instanceof ApiError ? { status: e.status, code: e.code, correlationId: e.correlationId && /^[\w.-]{1,128}$/.test(e.correlationId) ? e.correlationId : undefined } : {}
const definitelyRejected = (e: unknown) => e instanceof ApiError && e.kind === 'http' && [400, 401, 403, 404, 409, 422, 429].includes(e.status)
function putDelivery(s: ParticipantScope, id: string, value: DeliveryState) { deliveries.set(deliveryKey(s, id), value); emit() }

export async function createParticipant(s: ParticipantScope, version: number) {
  const token = authorize(s, version), before = creationState(s)
  if (creationLocked(before.attempt)) return
  const input = participantInput(s.kind, before.draft)
  if (Object.keys(input.errors).length) throw new ApiError(400, { code: 'PARTICIPANT_INPUT_INVALID' })
  // Lock synchronously, before any await. Key and exact payload remain together until resolved.
  const operation: Operation = { key: crypto.randomUUID(), payload: Object.freeze({ ...input.payload }), accepted: false }
  operations.set(scopeKey(s), operation); setAttempt(s, { phase: 'checking' })
  try {
    const tenant = await getWhitelabel(s.tenant)
    if (tenant.id !== s.tenant || tenant.status !== 'active') throw new ApiError(409, { code: 'E_WHITELABEL_INACTIVE' })
    if (!current(version, token)) return
    authorize(s, version)
  } catch (e) { if (current(version, token)) setAttempt(s, { phase: 'rejected', ...metadata(e) }); return }
  setAttempt(s, { phase: 'sending' })
  try {
    const raw = await apiRequest<unknown>(`/whitelabels/${s.tenant}/${participantPath(s.kind)}`, { method: 'POST', token, body: operation.payload, idempotencyKey: operation.key, successStatus: 201, timeoutMs: 20_000 })
    if (!current(version, token)) return
    // Capture the scoped id even if another receipt field is malformed; GET can still reconcile it.
    const id = returnedParticipantId(raw, s.tenant, s.kind)
    setAttempt(s, { phase: 'reconciling', id, status: 201 })
    const receipt = participantReceipt(raw, s.tenant, s.kind, operation.payload)
    operation.accepted = true
    setAttempt(s, { phase: 'reconciling', id, receipt, status: 201 })
    putDelivery(s, receipt.id, { phase: 'reported', sent: receipt.sent, until: Date.now() + 300_000 })
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) handleUnauthorized(token, version)
    if (!current(version, token)) return
    setAttempt(s, { ...creationState(s).attempt!, phase: definitelyRejected(e) ? 'rejected' : 'uncertain', ...metadata(e) })
    if (definitelyRejected(e)) return
  }
  if (current(version, token)) await reconcileParticipant(s, version)
}

/** GET-only recovery: a matching account is not proof of this operation's origin. No POST retry. */
export async function reconcileParticipant(s: ParticipantScope, version: number) {
  const token = authorize(s, version), a = creationState(s).attempt, op = operations.get(scopeKey(s))
  if (!a || !op || ['checking', 'sending', 'confirmed', 'rejected'].includes(a.phase)) return
  setAttempt(s, { ...a, phase: 'reconciling' })
  try {
    let id = a.id
    if (!id) {
      const result = await listAccounts({ whitelabelId: s.tenant, kind: s.kind, page: 1, search: op.payload.email })
      const exact = result.rows.filter(row => row.record.email === op.payload.email)
      if (exact.length === 1) id = exact[0].record.id
    }
    if (!current(version, token)) return
    const detail = id ? await getAccount({ whitelabelId: s.tenant, kind: s.kind, accountId: id }) : null
    if (!current(version, token)) return
    const matches = detail && matchesParticipant(detail, s.tenant, s.kind, op.payload)
    setState(s, { attempt: { ...a, id: matches ? id : a.id, phase: matches ? op.accepted ? 'confirmed' : 'readback_matches' : 'uncertain' }, ...(matches && op.accepted ? { draft: EMPTY_PARTICIPANT } : {}) })
    if (matches && id) refreshAccountReads({ whitelabelId: s.tenant, kind: s.kind, accountId: id })
  } catch (e) { if (current(version, token)) setAttempt(s, { ...a, phase: 'uncertain', ...metadata(e) }) }
}

export function resendLocked(d: DeliveryState | null, now = Date.now()) {
  return !!d && (['sending', 'verified', 'uncertain'].includes(d.phase) || d.phase === 'limited' && d.until === undefined || d.until !== undefined && d.until > now)
}
export async function resendParticipant(s: ParticipantScope, id: string, version: number) {
  const token = authorize(s, version)
  if (!isServerAccountId(id) || resendLocked(deliveryState(s, id))) return
  putDelivery(s, id, { phase: 'sending' })
  let dispatched = false
  try {
    const tenant = await getWhitelabel(s.tenant), detail = await getAccount({ whitelabelId: s.tenant, kind: s.kind, accountId: id })
    if (!current(version, token)) return
    if (detail.kind === 'admin') throw new ApiError(400, {})
    if (detail.record.emailVerifiedAt) { putDelivery(s, id, { phase: 'verified' }); refreshAccountReads({ whitelabelId: s.tenant, kind: s.kind, accountId: id }); return }
    if (tenant.status !== 'active' || detail.record.accessState !== 'active') throw new ApiError(409, { code: 'ACCOUNT_NOT_ACTIVE' })
    authorize(s, version); dispatched = true
    const raw = await apiRequest<unknown>(`/whitelabels/${s.tenant}/${participantPath(s.kind)}/${id}/resend-access`, { method: 'POST', token, successStatus: 200, timeoutMs: 20_000 })
    if (!current(version, token)) return
    putDelivery(s, id, { phase: 'reported', sent: resendReceipt(raw, s.kind, id), until: Date.now() + 300_000, status: 200 })
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) handleUnauthorized(token, version)
    if (!current(version, token)) return
    const meta = metadata(e)
    if (e instanceof ApiError && e.code === 'E_ALREADY_VERIFIED') { putDelivery(s, id, { phase: 'verified', ...meta }); refreshAccountReads({ whitelabelId: s.tenant, kind: s.kind, accountId: id }) }
    else if (e instanceof ApiError && e.status === 429) putDelivery(s, id, { phase: 'limited', ...meta, ...(e.retryAfterSeconds === undefined ? {} : { until: Date.now() + e.retryAfterSeconds * 1000 }) })
    else putDelivery(s, id, { phase: !dispatched || definitelyRejected(e) ? 'rejected' : 'uncertain', ...meta })
  }
}
