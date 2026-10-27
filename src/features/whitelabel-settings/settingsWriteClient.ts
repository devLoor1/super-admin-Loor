import { ApiError, apiRequest } from '../../lib/api'
import { getAccessToken, getOperator, getSessionVersion, handleUnauthorized } from '../../lib/authSession'
import { getSettingsRead } from './settingsReadApi'
import { canWriteSettings, isSettingsField, parseSettingReceipt, parseSettingResetReceipt, sameSettingBaseline, settingPayload, settingResetPath, settingsFieldBaseline, type SettingsField, type SettingsWriteCommand, type SettingsResetCommand } from './settingsWriteContract'

export type SettingsWriteAttempt = { phase: 'checking' | 'sending' | 'reconciling' | 'confirmed' | 'readback_matches' | 'uncertain' | 'rejected' | 'stale'; version: number; field: SettingsField; operation: 'save' | 'reset'; receiptConfirmed?: true; deleted?: boolean; status?: number; code?: string; correlationId?: string }
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

/** A fresh read and local lock provide best-effort conflict protection, not an atomic server precondition. */
async function execute(command: SettingsWriteCommand | SettingsResetCommand, operation: 'save' | 'reset', version: number, signal: AbortSignal | undefined, releasedFields: readonly SettingsField[]) {
  const payload = operation === 'save' ? settingPayload(command as SettingsWriteCommand) : undefined
  const path = settingResetPath(command), token = authorize(version, command.field, releasedFields), key = settingsWriteKey(command.tenantId, command.field)
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError')
  if (settingsWriteLocked(attempts.get(key) ?? null) || [...attempts].some(([k, a]) => k.startsWith(`${command.tenantId}:`) && ['checking', 'sending', 'reconciling', 'uncertain', 'readback_matches'].includes(a.phase))) throw new ApiError(409, { code: 'SETTINGS_ATTEMPT_LOCKED' })
  let attempt: SettingsWriteAttempt = { phase: 'checking', version, field: command.field, operation }
  publish(key, attempt)
  try {
    const fresh = await getSettingsRead(command.tenantId, signal)
    if (!sameSettingBaseline(settingsFieldBaseline(fresh, command.field), command.baseline)) { publish(key, { ...attempt, phase: 'stale' }); return }
    if (operation === 'save' && command.baseline.provenance.stored && JSON.stringify(command.baseline.provenance.storedValue) === JSON.stringify(payload!.value)) { publish(key, { ...attempt, phase: 'rejected', code: 'SETTINGS_NO_CHANGE' }); return }
    if (signal?.aborted || !current(version, token)) throw new DOMException('Scope changed', 'AbortError')
    authorize(version, command.field, releasedFields)
  } catch (error) { publish(key, { ...attempt, phase: 'rejected', ...metadata(error) }); return }
  attempt = { ...attempt, phase: 'sending' }; publish(key, attempt)
  let accepted = false
  let resetReceipt: ReturnType<typeof parseSettingResetReceipt> | null = null
  try {
    const raw = operation === 'save'
      ? await apiRequest<unknown>(`/whitelabels/${command.tenantId}/settings`, { method: 'PUT', body: payload, token, signal, timeoutMs: 20_000, successStatus: 200 })
      : await apiRequest<unknown>(path, { method: 'DELETE', token, signal, timeoutMs: 20_000, successStatus: 200 })
    if (!current(version, token)) throw new DOMException('Session replaced', 'AbortError')
    if (operation === 'save') parseSettingReceipt(raw, command.field, payload!.value)
    else { resetReceipt = parseSettingResetReceipt(raw, command.field); attempt = { ...attempt, deleted: resetReceipt.deleted } }
    accepted = true; attempt = { ...attempt, status: 200, receiptConfirmed: true }
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
    const actual = settingsFieldBaseline(fresh, command.field).provenance
    if (operation === 'save') return actual.stored && actual.source === 'stored' && JSON.stringify(actual.storedValue) === JSON.stringify(payload!.value) && JSON.stringify(actual.effectiveValue) === JSON.stringify(payload!.value)
    return !actual.stored && (resetReceipt === null || JSON.stringify(actual) === JSON.stringify(resetReceipt.provenance))
  })
  if (signal?.aborted || !current(version, token)) { publish(key, { ...attempt, phase: 'uncertain' }); return }
  publish(key, { ...attempt, phase: 'reconciling' })
  try { const matches = await recovery.get(key)!(); publish(key, { ...attempt, phase: matches ? accepted ? 'confirmed' : 'readback_matches' : 'uncertain' }) }
  catch { publish(key, { ...attempt, phase: 'uncertain' }) }
}
/** One cell, one PUT, receipt and authoritative read; never automatically resends. */
export async function executeSettingsWrite(command: SettingsWriteCommand, version: number, signal?: AbortSignal, releasedFields: readonly SettingsField[] = []) {
  return execute(command, 'save', version, signal, releasedFields)
}
/** Reset removes an override through DELETE; it never writes today's default as a replacement. */
export async function executeSettingsReset(command: SettingsResetCommand, version: number, signal?: AbortSignal, releasedFields: readonly SettingsField[] = []) {
  return execute(command, 'reset', version, signal, releasedFields)
}
/** Explicit recovery issues GET only and never repeats a PUT. */
export async function reconcileSettingsWrite(tenantId: string, field: SettingsField, version: number, releasedFields: readonly SettingsField[] = []) {
  authorize(version, field, releasedFields)
  const key = settingsWriteKey(tenantId, field), attempt = attempts.get(key)
  if (!attempt || attempt.version !== version || !['uncertain', 'readback_matches'].includes(attempt.phase) || !recovery.has(key)) return
  publish(key, { ...attempt, phase: 'reconciling' })
  try { const matches = await recovery.get(key)!(); publish(key, { ...attempt, phase: matches ? attempt.receiptConfirmed ? 'confirmed' : 'readback_matches' : 'uncertain' }) }
  catch { publish(key, { ...attempt, phase: 'uncertain' }) }
}
/** Operator acknowledgement after a verified readback; never clears unknown outcomes. */
export function beginNextSettingsWrite(tenantId: string, field: SettingsField, version: number, releasedFields: readonly SettingsField[] = []) {
  authorize(version, field, releasedFields)
  const key = settingsWriteKey(tenantId, field), attempt = attempts.get(key)
  if (!attempt || attempt.version !== version || attempt.phase !== 'confirmed') throw new ApiError(409, { code: 'SETTINGS_ATTEMPT_LOCKED' })
  attempts.delete(key); recovery.delete(key); for (const fn of listeners) fn()
}
