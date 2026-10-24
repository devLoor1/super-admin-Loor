import { ApiError } from '../../../lib/api'
import { authenticatedGet } from '../../../lib/apiClient'
import { isAccountsWhitelabelId, isServerAccountId, parseAdmin, parseAccountList, type AdminRecord } from '../accountsApi'

export type AdminRef = { whitelabelId: string; id: string }
export const adminInputError = () => new ApiError(422, { code: 'ADMIN_INPUT_INVALID' })
const bag = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
export function adminPath(ref: AdminRef) {
  if (!isAccountsWhitelabelId(ref.whitelabelId) || !isServerAccountId(ref.id)) throw adminInputError()
  return `/whitelabels/${ref.whitelabelId}/admins/${ref.id}`
}
export function adminBase(tenant: string) { if (!isAccountsWhitelabelId(tenant)) throw adminInputError(); return `/whitelabels/${tenant}/admins` }
/** Only the documented dedicated GET transport envelope, never an arbitrary recursive unwrap. */
function readEnvelope(raw: unknown) {
  if (!bag(raw) || raw.status !== 200 || !bag(raw.data)) throw new ApiError(200, {}, { kind: 'malformed' })
  return raw.data
}
export function adminReceipt(raw: unknown, tenant: string, id?: string) {
  if (!bag(raw) || !bag(raw.data)) throw new ApiError(200, {}, { kind: 'malformed' })
  const record = parseAdmin(raw.data)
  if (record.whitelabelId !== tenant || id && record.id !== id || record.isSuperAdmin !== false || !record.nameReadbackAvailable) throw new ApiError(200, { code: 'SCOPE_MISMATCH' }, { kind: 'malformed' })
  return record
}
export async function getAdmin(ref: AdminRef, signal?: AbortSignal) {
  return adminReceipt(readEnvelope(await authenticatedGet(adminPath(ref), { signal })), ref.whitelabelId, ref.id)
}
export async function listAdmins(tenant: string, page = 1, search = '', signal?: AbortSignal) {
  const raw = await authenticatedGet(adminBase(tenant), { signal, query: { page, perPage: 100, search: search || undefined } })
  const result = parseAccountList(readEnvelope(raw), 'admin', tenant)
  if (result.page !== page || result.perPage !== 100) throw new ApiError(200, {}, { kind: 'malformed' })
  return { ...result, rows: result.rows.map(row => row.record as AdminRecord) }
}
export const emailValue = (raw: unknown) => {
  if (typeof raw !== 'string') throw adminInputError()
  const value = raw.trim().toLowerCase()
  if (value.length > 256 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw adminInputError()
  return value
}
export function createAdminPayload(input: { email: string; password: string }) {
  if (typeof input.password !== 'string' || input.password.length < 8 || input.password.length > 60) throw adminInputError()
  return { email: emailValue(input.email), password: input.password }
}
export function adminPatch(record: AdminRecord, changes: Record<string, unknown>) {
  const body: { name?: string; email?: string } = {}
  if (!record.nameReadbackAvailable) throw adminInputError()
  for (const [key, value] of Object.entries(changes)) {
    if (key === 'name') {
      if (typeof value !== 'string' || value.trim().length > 128) throw adminInputError()
      if ((value.trim() || null) !== record.name) body.name = value.trim()
    } else if (key === 'email') { const normalized = emailValue(value); if (normalized !== record.email) body.email = normalized }
    else throw adminInputError()
  }
  return body
}
export const supportedAdmin = (row: AdminRecord) => row.isSuperAdmin === false && row.nameReadbackAvailable &&
  (row.accessState === 'active' && row.businessState === 'active' || row.accessState === 'paused' && row.businessState === 'disabled')
/** Fail closed on incomplete/unstable pages; no email substring is treated as an exact identity. */
export async function findAdminByEmail(tenant: string, email: string, signal?: AbortSignal) {
  const normalized = emailValue(email), seen = new Set<string>()
  let total: number | undefined, last = 1, match: AdminRecord | null = null
  for (let page = 1; page <= last; page++) {
    const result = await listAdmins(tenant, page, normalized, signal)
    if (result.lastPage > 20 || total !== undefined && total !== result.total || page > 1 && last !== result.lastPage) throw new ApiError(409, { code: 'ADMIN_SEARCH_UNCERTAIN' })
    total = result.total; last = result.lastPage
    for (const row of result.rows) {
      if (seen.has(row.id)) throw new ApiError(409, { code: 'ADMIN_SEARCH_UNCERTAIN' })
      seen.add(row.id)
      if (row.email?.toLowerCase() === normalized) { if (match) throw new ApiError(409, { code: 'ADMIN_SEARCH_UNCERTAIN' }); match = row }
    }
  }
  if (seen.size !== total) throw new ApiError(409, { code: 'ADMIN_SEARCH_UNCERTAIN' })
  return match ? getAdmin({ whitelabelId: tenant, id: match.id }, signal) : null
}
/** Best-effort frontend protection, not an atomic Core last-admin guarantee. */
export async function hasOtherActiveAdmin(ref: AdminRef, signal?: AbortSignal) {
  adminPath(ref)
  let last = 1
  for (let page = 1; page <= last; page++) {
    const result = await listAdmins(ref.whitelabelId, page, '', signal)
    last = result.lastPage
    if (last > 20) throw new ApiError(409, { code: 'ADMIN_COUNT_UNCERTAIN' })
    for (const row of result.rows) if (row.id !== ref.id && row.isSuperAdmin === false && row.accessState === 'active' && row.businessState === 'active') {
      const fresh = await getAdmin({ whitelabelId: ref.whitelabelId, id: row.id }, signal)
      if (fresh.accessState === 'active' && fresh.businessState === 'active') return true
    }
  }
  return false
}
