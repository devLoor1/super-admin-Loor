import { ApiError } from '../../lib/api'
import { businessText } from '../operation/shared/businessPresentation'
import { isSmtpTenantId, parseSmtpRead, validSmtpEmail, validSmtpHost, type SmtpSaved } from './smtpReadApi'

export const SMTP_METADATA_FIELDS = ['host', 'port', 'secure', 'fromEmail', 'fromName', 'tlsRejectUnauthorized', 'active'] as const
export type SmtpMetadataField = typeof SMTP_METADATA_FIELDS[number]
export type SmtpMetadata = Pick<SmtpSaved, SmtpMetadataField>
export type SmtpPatch = Partial<SmtpMetadata>
export type SmtpWriteCommand = { tenantId: string; baseline: SmtpSaved; changes: SmtpPatch }
export const canWriteSmtp = (roles: readonly string[] | undefined) => roles?.includes('SUPER_ADMIN') === true
const invalid = (): never => { throw new ApiError(422, { code: 'SMTP_INPUT_INVALID' }) }
const unsafe = (value: string) => /[<>\p{Cc}\p{Cf}]/u.test(value) || businessText(value, 256) === null

/** No normalization: exact original safe metadata, including null/empty, stays restorable. */
export function validSmtpMetadataField(field: SmtpMetadataField, value: unknown): boolean {
  if (field === 'port') return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 65535
  if (field === 'secure' || field === 'tlsRejectUnauthorized' || field === 'active') return typeof value === 'boolean'
  if (field === 'fromName' && (value === null || value === '')) return true
  if (typeof value !== 'string' || value.length > 256 || unsafe(value)) return false
  if (field === 'host') return validSmtpHost(value)
  if (field === 'fromEmail') return validSmtpEmail(value)
  return field === 'fromName'
}
export function smtpMetadata(row: SmtpSaved): SmtpMetadata {
  return { host: row.host, port: row.port, secure: row.secure, fromEmail: row.fromEmail, fromName: row.fromName, tlsRejectUnauthorized: row.tlsRejectUnauthorized, active: row.active }
}
export function smtpPatch(command: SmtpWriteCommand): SmtpPatch {
  const { tenantId, baseline, changes } = command
  if (!isSmtpTenantId(tenantId) || baseline.state !== 'saved' || baseline.tenantId !== tenantId || !changes || typeof changes !== 'object' || Array.isArray(changes)) return invalid()
  const payload: Record<string, unknown> = {}
  for (const key of Object.keys(changes)) {
    if (!SMTP_METADATA_FIELDS.includes(key as SmtpMetadataField)) return invalid()
    const field = key as SmtpMetadataField, value = changes[field]
    if (!validSmtpMetadataField(field, value)) return invalid()
    if (value !== baseline[field]) payload[field] = value
  }
  if (!Object.keys(payload).length) throw new ApiError(422, { code: 'SMTP_NO_CHANGE' })
  return payload as SmtpPatch
}
export function smtpChanges(baseline: SmtpSaved, draft: SmtpMetadata): SmtpPatch {
  return smtpPatch({ tenantId: baseline.tenantId, baseline, changes: draft })
}
/** Preserve operator edits, not the stale values of untouched fields. */
export function rebaseSmtpDraft(baseline: SmtpSaved, draft: SmtpMetadata, fresh: SmtpSaved): { draft: SmtpMetadata; conflicts: SmtpMetadataField[] } {
  if (baseline.tenantId !== fresh.tenantId || baseline.id !== fresh.id) return invalid()
  const rebased = smtpMetadata(fresh), conflicts: SmtpMetadataField[] = []
  for (const field of SMTP_METADATA_FIELDS) {
    if (draft[field] === baseline[field]) continue
    Object.assign(rebased, { [field]: draft[field] })
    if (fresh[field] !== baseline[field] && fresh[field] !== draft[field]) conflicts.push(field)
  }
  return { draft: rebased, conflicts }
}
/** Informational versions help detect stale drafts; they are never sent as a lock. */
export function sameSmtpBaseline(a: SmtpSaved, b: SmtpSaved): boolean {
  return a.tenantId === b.tenantId && a.id === b.id && a.version === b.version && a.updatedAt === b.updatedAt && sameSmtpResult(a, b, {})
}
export function sameSmtpResult(actual: SmtpSaved, baseline: SmtpSaved, patch: SmtpPatch): boolean {
  return actual.tenantId === baseline.tenantId && actual.id === baseline.id && actual.createdAt === baseline.createdAt
    && actual.hasUsername === baseline.hasUsername && actual.hasPassword === baseline.hasPassword && actual.configured === baseline.configured
    && SMTP_METADATA_FIELDS.every(field => actual[field] === (Object.hasOwn(patch, field) ? patch[field] : baseline[field]))
}
export function parseSmtpReceipt(raw: unknown, baseline: SmtpSaved, patch: SmtpPatch): SmtpSaved {
  const row = parseSmtpRead(raw, baseline.tenantId)
  if (row.state !== 'saved' || !sameSmtpResult(row, baseline, patch)) throw new ApiError(200, {}, { kind: 'malformed' })
  return row
}
