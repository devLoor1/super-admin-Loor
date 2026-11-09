import { ApiError, apiRequest, isAbortError } from '../../../lib/api'
import { getAccessToken, getOperator, getSessionVersion, handleUnauthorized } from '../../../lib/authSession'
import { getAccount, type AccountRef } from '../accountsApi'
import { accessKey, accessWriter, expectedAccess, validAccessRef, validateAccessCommand, type AccessCommand, type AccessRef } from './accountAccessContract'
import { refreshAccountReads } from './accountAccessRefresh'

export type AccessAttempt = {
  phase: 'checking' | 'sending' | 'reconciling' | 'confirmed' | 'unchanged' | 'uncertain' | 'rejected' | 'stale'
  version: number
  action: AccessCommand['action']
  from: AccessCommand['from']
  responseAccepted: boolean
  correlationId?: string
  errorStatus?: number
}
const attempts = new Map<string, AccessAttempt>()
const listeners = new Set<() => void>()
const locks = new Set(['checking', 'sending', 'reconciling', 'uncertain', 'unchanged'])
export const accessAttemptLocked = (value: AccessAttempt | null) => !!value && locks.has(value.phase)
const foreignAttempt: AccessAttempt = { phase: 'uncertain', version: -1, action: 'pause', from: 'active', responseAccepted: false }
export function accessAttempt(ref: AccountRef, version: number) {
  const value = attempts.get(accessKey(ref))
  // No prior operator's result/correlation data is exposed after session replacement.
  return !value ? null : value.version === version ? value : accessAttemptLocked(value) ? foreignAttempt : null
}
export function subscribeAccessAttempts(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } }
function publish(ref: AccountRef, value: AccessAttempt) { attempts.set(accessKey(ref), value); for (const listener of listeners) listener() }
function authorize(version: number) {
  const token = getAccessToken()
  if (!token || getSessionVersion() !== version) throw new ApiError(401, { code: 'NO_SESSION' })
  if (!accessWriter(getOperator()?.roles)) throw new ApiError(403, { code: 'WRITE_FORBIDDEN' })
  return token
}
function current(version: number, token: string) { return getSessionVersion() === version && getAccessToken() === token }
function verifyReceipt(body: unknown, command: AccessCommand) {
  const row = body && typeof body === 'object' && 'data' in body ? (body as { data: unknown }).data : null
  if (!row || typeof row !== 'object' || !('accountId' in row) || !('whitelabelId' in row) || !('accountType' in row) || !('accessState' in row) ||
      row.accountId !== Number(command.accountId) || row.whitelabelId !== Number(command.whitelabelId) || row.accountType !== command.kind || row.accessState !== expectedAccess(command.action)) {
    throw new ApiError(201, {}, { kind: 'malformed' })
  }
  // Deliberately do not return/store response.reason, note or arbitrary fields.
}
async function readback(ref: AccessRef, attempt: AccessAttempt, token: string) {
  publish(ref, { ...attempt, phase: 'reconciling' })
  try {
    const detail = await getAccount(ref)
    if (!current(attempt.version, token)) throw new DOMException('Session replaced', 'AbortError')
    const state = detail.record.accessState
    publish(ref, { ...attempt, phase: state === expectedAccess(attempt.action) ? 'confirmed' : state === attempt.from ? 'unchanged' : 'uncertain' })
    refreshAccountReads(ref)
  } catch {
    publish(ref, { ...attempt, phase: 'uncertain' })
  }
}
/** Single public mutation workflow; POST is private, narrowly built and never retried. */
export async function changeAccountAccess(input: AccessCommand, version: number, signal?: AbortSignal) {
  const command = validateAccessCommand(input)
  const token = authorize(version)
  if (accessAttemptLocked(attempts.get(accessKey(command)) ?? null)) throw new ApiError(409, { code: 'ACCESS_ATTEMPT_LOCKED' })
  let attempt: AccessAttempt = { phase: 'checking', version, action: command.action, from: command.from, responseAccepted: false }
  publish(command, attempt) // Synchronous lock before the first await, including double-clicks/direct calls.
  try {
    const fresh = await getAccount(command, signal)
    if (!current(version, token) || signal?.aborted) throw new DOMException('Cancelled before submission', 'AbortError')
    authorize(version)
    if (fresh.kind !== command.kind || fresh.record.accessState !== command.from) {
      publish(command, { ...attempt, phase: 'stale' }); refreshAccountReads(command); return
    }
  } catch (error) {
    publish(command, { ...attempt, phase: 'rejected', errorStatus: error instanceof ApiError ? error.status : undefined })
    if (isAbortError(error)) return
    return
  }
  attempt = { ...attempt, phase: 'sending' }
  publish(command, attempt)
  try {
    const body = await apiRequest<unknown>(`/whitelabels/${command.whitelabelId}/accounts/${command.accountId}/${command.action}`, {
      method: 'POST', token, query: { tipo: command.kind === 'investor' ? 'investidores' : 'empreendedores' },
      ...(command.action === 'pause' ? { body: { reason: command.reason } } : {}), timeoutMs: 20_000, successStatus: 201,
    })
    if (!current(version, token)) throw new ApiError(0, {}, { kind: 'network' })
    verifyReceipt(body, command)
    attempt = { ...attempt, responseAccepted: true }
  } catch (error) {
    attempt = { ...attempt, correlationId: error instanceof ApiError ? error.correlationId : undefined, errorStatus: error instanceof ApiError ? error.status : undefined }
    if (error instanceof ApiError && error.status === 401) handleUnauthorized(token, version)
    if (current(version, token) && error instanceof ApiError && error.kind === 'http' && [400, 403, 404, 422].includes(error.status)) {
      publish(command, { ...attempt, phase: 'rejected' }); return
    }
    // Core commits BEFORE awaited CP Audit: even HTTP500/502 may be a committed mutation.
  }
  if (!current(version, token)) { publish(command, { ...attempt, phase: 'uncertain' }); return }
  await readback(command, attempt, token)
}
/** Explicit GET-only recovery. Unchanged does NOT prove a timed-out request cannot commit later. */
export async function reconcileAccountAccess(ref: AccountRef, version: number) {
  const token = authorize(version)
  if (!validAccessRef(ref)) throw new ApiError(400, { code: 'INVALID_ACCESS_COMMAND' })
  const previous = attempts.get(accessKey(ref))
  if (!previous || ['checking', 'sending', 'reconciling'].includes(previous.phase)) return
  await readback(ref, { ...previous, version, correlationId: previous.version === version ? previous.correlationId : undefined }, token)
}
