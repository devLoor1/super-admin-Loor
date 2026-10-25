import { ApiError } from '../../lib/api'
import { authenticatedGet } from '../../lib/apiClient'
import { getOperator } from '../../lib/authSession'
import { businessText } from '../operation/shared/businessPresentation'

export type SmtpSaved = {
  state: 'saved'; tenantId: string; id: string
  host: string; port: number; secure: boolean
  hasPassword: boolean; configured: boolean; active: boolean
  fromEmail: string; fromName: string | null; tlsRejectUnauthorized: boolean
  createdAt: string | null; updatedAt: string | null
}
export type SmtpRead = { state: 'missing'; tenantId: string } | SmtpSaved

export const canReadSmtp = (roles: readonly string[] | undefined) => roles?.some(role => role === 'SUPER_ADMIN' || role === 'READ_ONLY') === true
export const isSmtpTenantId = (id: unknown): id is string => typeof id === 'string' && /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id))
export const safeSmtpCorrelation = (value: string | undefined) => value && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value) ? value : undefined
const malformed = (): never => { throw new ApiError(200, {}, { kind: 'malformed' }) }
const object = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : malformed()
const idNumber = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? String(value) : malformed()
const boolean = (value: unknown) => typeof value === 'boolean' ? value : malformed()
// Current Core database booleans are serialized as 0/1 for these three fields.
const storedBoolean = (value: unknown) => value === 0 ? false : value === 1 ? true : boolean(value)
const text = (value: unknown, maximum = 256) => businessText(value, maximum) ?? malformed()

export function validSmtpHost(value: string) {
  if (!value || value.length > 256 || /[\s/@?#\\]/.test(value)) return false
  try {
    const url = new URL(`smtp://${value}`)
    return Boolean(url.hostname) && !url.username && !url.password && !url.port && !url.pathname && !url.search && !url.hash
  } catch { return false }
}
export const validSmtpEmail = (value: string) => value.length <= 256 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value)
function date(value: unknown): string | null {
  if (value === null) return null
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) return malformed()
  const parts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|[+-](\d{2}):(\d{2}))$/.exec(value)!
  const [,y,m,d,h,min,s,oh='0',om='0'] = parts
  if (+m < 1 || +m > 12 || +d < 1 || +d > new Date(Date.UTC(+y,+m,0)).getUTCDate() || +h > 23 || +min > 59 || +s > 59 || +oh > 23 || +om > 59) return malformed()
  return value
}

/** Projection intentionally does not read/store username or any password/config bag. */
export function parseSmtpRead(value: unknown, tenantId: string): SmtpRead {
  if (!isSmtpTenantId(tenantId)) return malformed()
  const envelope = object(value)
  if (!Object.hasOwn(envelope, 'data')) return malformed()
  if (envelope.data === null) return { state: 'missing', tenantId }
  const row = object(envelope.data)
  if (idNumber(row.whitelabelId) !== tenantId) return malformed()
  // An unexpected secret in a response is a contract error, never component state.
  if (Object.keys(row).some(key => /^(password|password_hash|passwordHash|credentials|auth|authorization|api_?key|client_?secret|access_?token|refresh_?token|token)$/i.test(key))) return malformed()
  const host = text(row.host), fromEmail = text(row.fromEmail)
  if (!validSmtpHost(host) || !validSmtpEmail(fromEmail) || typeof row.port !== 'number' || !Number.isInteger(row.port) || row.port < 1 || row.port > 65535) return malformed()
  const hasPassword = boolean(row.hasPassword), configured = boolean(row.configured)
  if (configured && !hasPassword) return malformed()
  let fromName: string | null
  if (row.fromName === null) fromName = null
  else if (row.fromName === '') fromName = ''
  else fromName = text(row.fromName)
  return { state: 'saved', tenantId, id: idNumber(row.id), host, port: row.port, secure: storedBoolean(row.secure), hasPassword, configured,
    active: storedBoolean(row.active), fromEmail, fromName, tlsRejectUnauthorized: storedBoolean(row.tlsRejectUnauthorized), createdAt: date(row.createdAt), updatedAt: date(row.updatedAt) }
}

export async function getSmtpRead(id: string, signal?: AbortSignal) {
  if (!isSmtpTenantId(id)) throw new ApiError(404, { code: 'INVALID_WHITELABEL_ID' })
  if (!canReadSmtp(getOperator()?.roles)) throw new ApiError(403, { code: 'SMTP_READ_FORBIDDEN' })
  try {
    return parseSmtpRead(await authenticatedGet(`/whitelabels/${id}/emails/smtp`, { signal }), id)
  } catch (error) {
    // The shared transport accepts server error messages; SMTP resource state
    // retains only status/kind and a canonical correlation ID, never that text.
    if (error instanceof ApiError) throw new ApiError(error.status, {}, { kind: error.kind, correlationId: safeSmtpCorrelation(error.correlationId) })
    throw error
  }
}
