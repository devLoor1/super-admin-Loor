import { ApiError, apiRequest } from '../../lib/api'
import { authenticatedGet } from '../../lib/apiClient'
import { getAccessToken, getOperator, getSessionVersion, handleUnauthorized } from '../../lib/authSession'
import { isSettingsTenantId } from './settingsReadApi'
import { record, type ConfigCell } from './configurationContract'

export type PlatformAsset = { ref: string; tenantId: string; url: string | null; mime: string | null; size: number | null; updatedAt: string | null }
export const assetReference = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v)
export function assetFileError(file: File): string | null {
  if (!file.size || file.size > 20 * 1024 * 1024) return 'Escolha uma imagem não vazia de até 20 MiB.'
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (!(file.type === 'image/png' && extension === 'png' || file.type === 'image/jpeg' && (extension === 'jpg' || extension === 'jpeg'))) return 'Use PNG ou JPEG com extensão e conteúdo correspondentes.'
  return null
}
export function parsePlatformAsset(raw: unknown, tenant: string, ref?: string): PlatformAsset {
  if (!record(raw) || !record(raw.data)) throw new ApiError(200, {}, { kind: 'malformed' })
  const d = raw.data
  if (!isSettingsTenantId(tenant) || d.wtlb_id !== Number(tenant) || d.slot !== 'main_area' || !assetReference(d.asset_ref) || ref && d.asset_ref !== ref || !(d.mime === null || d.mime === 'image/jpeg' || d.mime === 'image/png') || !(d.size_bytes === null || typeof d.size_bytes === 'number' && Number.isSafeInteger(d.size_bytes) && d.size_bytes > 0 && d.size_bytes <= 20 * 1024 * 1024) || !(d.url === null || typeof d.url === 'string')) throw new ApiError(200, {}, { kind: 'malformed' })
  if (d.url !== null) {
    try { const u = new URL(d.url); if (u.protocol !== 'https:' || u.username || u.password || u.hash) throw new Error('url') } catch { throw new ApiError(200, {}, { kind: 'malformed' }) }
  }
  return { ref: d.asset_ref, tenantId: tenant, url: d.url, mime: d.mime, size: d.size_bytes, updatedAt: typeof d.updated_at === 'string' ? d.updated_at : null }
}
export async function getPlatformAsset(tenant: string, ref: string, signal?: AbortSignal) {
  if (!isSettingsTenantId(tenant) || !assetReference(ref)) throw new ApiError(422, { code: 'INVALID_ASSET' })
  return parsePlatformAsset(await authenticatedGet('/whitelabels/' + tenant + '/platform/assets/' + encodeURIComponent(ref), { signal }), tenant, ref)
}
export type AssetAttempt = { phase: 'sending' | 'confirmed' | 'rejected' | 'uncertain'; operation: 'upload' | 'replace' | 'delete'; ref?: string; cell?: ConfigCell; status?: number; correlationId?: string; session: number; receipt?: PlatformAsset | true }
const ledger = new Map<string, AssetAttempt>(), listeners = new Set<() => void>()
export const assetAttempt = (tenant: string) => ledger.get(tenant)
export const subscribeAssets = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn) } }
const publish = (tenant: string, attempt: AssetAttempt) => { ledger.set(tenant, attempt); for (const fn of listeners) fn() }
export const assetLocked = (tenant: string) => ['sending', 'uncertain'].includes(assetAttempt(tenant)?.phase ?? '')
function authorize(tenant: string, session: number) {
  const token = getAccessToken()
  if (!token || getSessionVersion() !== session) throw new ApiError(401, { code: 'NO_SESSION' })
  if (!getOperator()?.roles.includes('SUPER_ADMIN')) throw new ApiError(403, { code: 'FORBIDDEN' })
  if (!isSettingsTenantId(tenant)) throw new ApiError(422, { code: 'INVALID_ASSET' })
  return token
}
function currentSession(token: string, session: number) {
  if (getSessionVersion() !== session || getAccessToken() !== token) throw new ApiError(0, {}, { kind: 'network' })
}
// Signed URL tokens may change between reads. Compare the durable asset metadata.
function matchesUpdatedAt(current: string | null, receipt: string | null) {
  if (current === receipt) return true
  if (!current || !receipt) return false
  const readTime = Date.parse(current), writeTime = Date.parse(receipt)
  if (!Number.isFinite(readTime) || !Number.isFinite(writeTime)) return false
  // Core's immediate receipt retains milliseconds; persisted GET truncates them.
  // Accept only that one-way precision loss (or an equivalent timezone), not drift.
  return readTime === writeTime || readTime % 1000 === 0 && readTime === Math.floor(writeTime / 1000) * 1000
}
function matchesReceipt(asset: PlatformAsset, receipt: PlatformAsset) {
  return asset.ref === receipt.ref && asset.tenantId === receipt.tenantId && asset.mime === receipt.mime && asset.size === receipt.size && matchesUpdatedAt(asset.updatedAt, receipt.updatedAt)
}
async function readOutcome(tenant: string, attempt: AssetAttempt): Promise<PlatformAsset | null> {
  if (!attempt.ref) throw new ApiError(409, { code: 'ASSET_ID_UNKNOWN' })
  if (attempt.operation === 'delete') {
    try { await getPlatformAsset(tenant, attempt.ref) } catch (error) { if (error instanceof ApiError && error.kind === 'http' && error.status === 404) return null; throw error }
    throw new ApiError(200, {}, { kind: 'malformed' })
  }
  const current = await getPlatformAsset(tenant, attempt.ref)
  if (!attempt.receipt || attempt.receipt === true || !matchesReceipt(current, attempt.receipt)) throw new ApiError(200, {}, { kind: 'malformed' })
  return current
}
/** Explicit GET recovery for a known reference; never repeats a mutation. */
export async function reconcilePlatformAsset(tenant: string, session: number): Promise<PlatformAsset | null> {
  const token = authorize(tenant, session), attempt = ledger.get(tenant)
  if (!attempt || attempt.session !== session || attempt.phase !== 'uncertain' || !attempt.ref) throw new ApiError(409, { code: 'ASSET_RECOVERY_REQUIRED' })
  const asset = await readOutcome(tenant, attempt)
  currentSession(token, session)
  // Without a valid mutation receipt, absence alone cannot confirm a deletion.
  if (!attempt.receipt) throw new ApiError(409, { code: 'ASSET_RECEIPT_UNKNOWN' })
  publish(tenant, { ...attempt, phase: 'confirmed' })
  return asset
}
/** One multipart dispatch. A failed readback never turns an accepted upload into a rejection. */
export async function mutatePlatformAsset(tenant: string, operation: AssetAttempt['operation'], session: number, file?: File, ref?: string, cell?: ConfigCell): Promise<PlatformAsset | null> {
  const token = authorize(tenant, session)
  if (operation !== 'upload' && !assetReference(ref)) throw new ApiError(422, { code: 'INVALID_ASSET' })
  if (assetLocked(tenant)) throw new ApiError(409, { code: 'ASSET_RECOVERY_REQUIRED' })
  if (operation !== 'delete' && (!file || assetFileError(file))) throw new ApiError(422, { code: 'INVALID_IMAGE' })
  const form = new FormData()
  if (file) form.append('image', file)
  if (operation === 'upload') form.append('slot', 'main_area')
  const status = operation === 'upload' ? 201 : 200
  let accepted = false
  publish(tenant, { phase: 'sending', operation, ref, cell, session })
  try {
    const raw = await apiRequest<unknown>('/whitelabels/' + tenant + '/platform/assets' + (ref ? '/' + encodeURIComponent(ref) : ''), { method: operation === 'upload' ? 'POST' : operation === 'replace' ? 'PUT' : 'DELETE', ...(operation !== 'delete' ? { body: form } : {}), token, timeoutMs: 45_000, successStatus: status })
    accepted = true
    // Retain a trustworthy returned identity immediately, even if other fields are malformed.
    if (operation === 'upload' && record(raw) && record(raw.data) && raw.data.wtlb_id === Number(tenant) && raw.data.slot === 'main_area' && assetReference(raw.data.asset_ref)) publish(tenant, { ...ledger.get(tenant)!, ref: raw.data.asset_ref, status })
    if (operation === 'delete') {
      if (!record(raw) || raw.data !== null) throw new ApiError(200, {}, { kind: 'malformed' })
      publish(tenant, { ...ledger.get(tenant)!, receipt: true, status })
    } else {
      const receipt = parsePlatformAsset(raw, tenant, ref)
      publish(tenant, { ...ledger.get(tenant)!, ref: receipt.ref, receipt, status })
    }
    currentSession(token, session)
    const result = await readOutcome(tenant, ledger.get(tenant)!)
    currentSession(token, session)
    publish(tenant, { ...ledger.get(tenant)!, phase: 'confirmed' })
    return result
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) handleUnauthorized(token, session)
    const rejected = !accepted && error instanceof ApiError && error.kind === 'http' && [400, 403, 404, 413, 415, 422].includes(error.status)
    publish(tenant, { ...ledger.get(tenant)!, phase: rejected ? 'rejected' : 'uncertain', ...(error instanceof ApiError ? { status: error.status, ...(error.correlationId && /^[a-f0-9-]{36}$/i.test(error.correlationId) ? { correlationId: error.correlationId } : {}) } : {}) })
    throw error
  }
}
