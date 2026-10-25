import { ApiError, apiRequest } from '../../lib/api'
import { getAccessToken, getOperator, getSessionVersion, handleUnauthorized } from '../../lib/authSession'
import { getSettingsRead } from './settingsReadApi'
import { canWriteSettings, isSettingsField, parseSettingReceipt, sameSetting, settingPayload, settingsFieldValue, type SettingsField, type SettingsWriteCommand } from './settingsWriteContract'

export type SettingsWriteAttempt = { phase: 'checking' | 'sending' | 'reconciling' | 'confirmed' | 'readback_matches' | 'uncertain' | 'rejected' | 'stale'; version: number; field: SettingsField; status?: number; code?: string; correlationId?: string }
const attempts = new Map<string, SettingsWriteAttempt>(), recovery = new Map<string, () => Promise<boolean>>(), listeners = new Set<() => void>()
const locked = new Set<SettingsWriteAttempt['phase']>(['checking', 'sending', 'reconciling', 'confirmed', 'readback_matches', 'uncertain'])
export const settingsWriteKey = (tenantId: string, field: SettingsField) => `${tenantId}:${field}`
export const settingsWriteLocked = (attempt: SettingsWriteAttempt | null) => !!attempt && locked.has(attempt.phase)
export function subscribeSettingsWrites(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn) } }
export function getSettingsWriteAttempt(key: string, version: number) { const a = attempts.get(key); return a?.version === version ? a : a && settingsWriteLocked(a) ? { ...a, phase: 'uncertain' as const, version: -1 } : null }
function publish(key: string, attempt: SettingsWriteAttempt) { attempts.set(key, attempt); for (const fn of listeners) fn() }
function authorize(version: number, field: SettingsField, releasedFields: readonly SettingsField[]) {
  if (!isSettingsField(field) || !releasedFields.includes(field)) throw new ApiError(403, { code: 'SETTINGS_WRITES_NOT_RELEASED' })
  const token = getAccessToken()
  if (!token || version !== getSessionVersion()) throw new ApiError(401, { code: 'NO_SESSION' })
  if (!canWriteSettings(getOperator()?.roles)) throw new ApiError(403, { code: 'SETTINGS_WRITE_FORBIDDEN' })
  return token
}
const current = (version: number, token: string) => version === getSessionVersion() && token === getAccessToken()
const safeCodes = new Set(['NO_SESSION', 'INVALID_WHITELABEL_ID', 'SETTINGS_INPUT_INVALID', 'SETTINGS_WRITES_NOT_RELEASED', 'SETTINGS_WRITE_FORBIDDEN', 'SETTINGS_NO_CHANGE', 'SETTINGS_ATTEMPT_LOCKED', 'E_WHITELABEL_NOT_FOUND', 'E_VALIDATION', 'E_PLATFORM_SETTING_EXISTS'])
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
/** Error metadata is untrusted input too; never retain arbitrary server strings or messages. */
function metadata(error: unknown) {
  if (!(error instanceof ApiError)) return {}
  return {
    status: error.status,
    ...(error.code && safeCodes.has(error.code) ? { code: error.code } : {}),
    ...(error.correlationId && uuid.test(error.correlationId) ? { correlationId: error.correlationId } : {}),
  }
}

/** One row, one PUT, no automatic resend. Release readiness is separate from authoritative Backend RBAC. */
export async function executeSettingsWrite(command: SettingsWriteCommand, version: number, signal?: AbortSignal, releasedFields: readonly SettingsField[] = []) {
  const payload = settingPayload(command), token = authorize(version, command.field, releasedFields), key = settingsWriteKey(command.tenantId, command.field)
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError')
  if (settingsWriteLocked(attempts.get(key) ?? null)) throw new ApiError(409, { code: 'SETTINGS_ATTEMPT_LOCKED' })
  let attempt: SettingsWriteAttempt = { phase: 'checking', version, field: command.field }
  publish(key, attempt)
  try {
    const fresh = await getSettingsRead(command.tenantId, signal)
    if (!sameSetting(settingsFieldValue(fresh, command.field), command.baseline)) { publish(key, { ...attempt, phase: 'stale' }); return }
    if (sameSetting(command.baseline, { state: 'value', value: payload.value })) { publish(key, { ...attempt, phase: 'rejected', code: 'SETTINGS_NO_CHANGE' }); return }
    if (signal?.aborted || !current(version, token)) throw new DOMException('Scope changed', 'AbortError')
    authorize(version, command.field, releasedFields)
  } catch (error) { publish(key, { ...attempt, phase: 'rejected', ...metadata(error) }); return }
  attempt = { ...attempt, phase: 'sending' }; publish(key, attempt)
  let accepted = false
  try {
    const raw = await apiRequest<unknown>(`/whitelabels/${command.tenantId}/settings`, { method: 'PUT', body: payload, token, signal, timeoutMs: 20_000, successStatus: 200 })
    if (!current(version, token)) throw new DOMException('Session replaced', 'AbortError')
    parseSettingReceipt(raw, command.field, payload.value)
    accepted = true; attempt = { ...attempt, status: 200 }
  } catch (error) {
    attempt = { ...attempt, ...metadata(error) }
    if (error instanceof ApiError && error.status === 401) handleUnauthorized(token, version)
    if (current(version, token) && error instanceof ApiError && error.kind === 'http' && [400, 403, 404, 409, 422].includes(error.status)) { publish(key, { ...attempt, phase: 'rejected' }); return }
  }
  // Audit persistence follows Core persistence in Nest. A 5xx can still mean that this row changed.
  // Recovery retains only this allow-listed non-secret expected value, never the raw settings bag.
  recovery.set(key, async () => {
    const fresh = await getSettingsRead(command.tenantId)
    if (!current(version, token)) throw new DOMException('Session replaced', 'AbortError')
    return sameSetting(settingsFieldValue(fresh, command.field), { state: 'value', value: payload.value })
  })
  if (signal?.aborted || !current(version, token)) { publish(key, { ...attempt, phase: 'uncertain' }); return }
  publish(key, { ...attempt, phase: 'reconciling' })
  try { const matches = await recovery.get(key)!(); publish(key, { ...attempt, phase: matches ? accepted ? 'confirmed' : 'readback_matches' : 'uncertain' }) }
  catch { publish(key, { ...attempt, phase: 'uncertain' }) }
}
/** Explicit recovery issues GET only and never repeats a PUT. */
export async function reconcileSettingsWrite(tenantId: string, field: SettingsField, version: number, releasedFields: readonly SettingsField[] = []) {
  authorize(version, field, releasedFields)
  const key = settingsWriteKey(tenantId, field), attempt = attempts.get(key)
  if (!attempt || attempt.version !== version || ['checking', 'sending', 'reconciling'].includes(attempt.phase) || !recovery.has(key)) return
  publish(key, { ...attempt, phase: 'reconciling' })
  try { const matches = await recovery.get(key)!(); publish(key, { ...attempt, phase: matches ? 'readback_matches' : 'uncertain' }) }
  catch { publish(key, { ...attempt, phase: 'uncertain' }) }
}
/** Operator acknowledgement after a verified readback; never clears unknown outcomes. */
export function beginNextSettingsWrite(tenantId: string, field: SettingsField, version: number, releasedFields: readonly SettingsField[] = []) {
  authorize(version, field, releasedFields)
  const key = settingsWriteKey(tenantId, field), attempt = attempts.get(key)
  if (!attempt || attempt.version !== version || !['confirmed', 'readback_matches'].includes(attempt.phase)) throw new ApiError(409, { code: 'SETTINGS_ATTEMPT_LOCKED' })
  attempts.delete(key); recovery.delete(key); for (const fn of listeners) fn()
}
