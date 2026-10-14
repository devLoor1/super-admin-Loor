import { ApiError } from '../../lib/api'
import { authenticatedGet } from '../../lib/apiClient'
import { getSessionVersion } from '../../lib/authSession'
import { isCredentialAuditText } from './auditPresent'

/*
 * Audit read — the Control Plane's OWN audit log (Nest + Prisma `audit_logs`,
 * not a Core pass-through). Contract observed on the homologation API
 * (2026-10-14, read-only GETs, structure and tokens only) and confirmed in
 * `backend-super-admin-Loor` `0177437` (`src/modules/audit/*`):
 *
 *   GET /audit?page&perPage(≤100)&search&order(asc|desc) → { data: AuditLog[], meta: { page, perPage, total, lastPage } }
 *
 * - Unknown query keys → 400. `sort` is accepted but ignored (order is always
 *   `createdAt`), so it is never sent. `search` is a case-insensitive
 *   substring match on `action`, `resourceType` and `resourceId` only.
 * - There is NO detail endpoint (no `GET /audit/:id`): the list returns the
 *   complete stored row, which the detail screen presents for rows this
 *   session has loaded. Nothing is fetched by id.
 * - Each row: id (cuid), superAdminId (nullable), action (token), resourceType,
 *   resourceId, whitelabelId (nullable), beforeData / afterData (JSON,
 *   nullable; the Control Plane redacts password/secret/token/api key/
 *   authorization/credential keys at write time as "[REDACTED]"), result,
 *   ip, userAgent, correlationId, createdAt, superAdmin { id, name, email } | null.
 * - Observed: 33 events, only LOGIN_SUCCESS / LOGIN_FAILURE; result `success` /
 *   `failed`; resource, tenant and beforeData always null; afterData `{ email }`
 *   on failed logins for unknown e-mails.
 */

export const AUDIT_PAGE_SIZE = 8

export type AuditActor = {
  /** Control Plane operator id (SuperAdmin). */
  id: string
  name: string | null
  email: string | null
}

export type AuditRecord = {
  /** Control Plane audit id (cuid). */
  id: string
  /** Action token as recorded (e.g. `LOGIN_SUCCESS`). */
  action: string
  /** Result token as recorded (`success` / `failed` observed). */
  result: string | null
  actorId: string | null
  actor: AuditActor | null
  resourceType: string | null
  resourceId: string | null
  /** Tenant id recorded with the event; null = not tied to a Whitelabel. */
  whitelabelId: string | null
  /** Raw recorded JSON — only ever rendered through the sanitizer. */
  beforeData: unknown
  afterData: unknown
  ip: string | null
  userAgent: string | null
  correlationId: string | null
  createdAt: string
}

export type AuditListResult = { rows: AuditRecord[]; page: number; perPage: number; total: number; lastPage: number }

export type AuditOrder = 'desc' | 'asc'

const malformed = () => new ApiError(200, {}, { kind: 'malformed' })

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const text = (value: unknown, max = 512) => {
  if (typeof value !== 'string' || value.trim() === '') return null
  // Inspect before truncation: a clipped JWT must not evade pattern masking.
  if (value.length > 32_768 || isCredentialAuditText(value)) return '••••••••'
  return value.trim().slice(0, max)
}
const identifier = (value: unknown) => (typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value) ? value : null)

function count(value: unknown, minimum: number) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum) throw malformed()
  return value
}

function timestamp(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const parts = /^(\d{4})-(\d{2})-(\d{2})T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.exec(value)
  if (!parts || !Number.isFinite(Date.parse(value))) return null
  const [year, month, day] = parts.slice(1, 4).map(Number)
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1] ? value : null
}

/** Strict on identity and time; tolerant (null) on descriptive fields. */
export function parseAuditRecord(value: unknown): AuditRecord {
  if (!isRecord(value)) throw malformed()
  const id = identifier(value.id)
  const action = typeof value.action === 'string' && /^[A-Za-z][A-Za-z0-9_.:-]{0,79}$/.test(value.action) && !isCredentialAuditText(value.action) ? value.action : null
  const createdAt = timestamp(value.createdAt)
  if (!id || !action || !createdAt) throw malformed()

  const actorId = value.superAdminId == null ? null : identifier(value.superAdminId)
  if (value.superAdminId != null && !actorId) throw malformed()
  let actor: AuditActor | null = null
  if (isRecord(value.superAdmin)) {
    // The actor object must describe the recorded operator, never another one.
    if (identifier(value.superAdmin.id) !== actorId) throw malformed()
    actor = { id: actorId!, name: text(value.superAdmin.name, 160), email: text(value.superAdmin.email, 254) }
  } else if (value.superAdmin != null) {
    throw malformed()
  }

  const whitelabelId =
    typeof value.whitelabelId === 'number' && Number.isSafeInteger(value.whitelabelId) && value.whitelabelId > 0 ? String(value.whitelabelId) : null

  return {
    id,
    action,
    result: text(value.result, 40),
    actorId,
    actor,
    resourceType: text(value.resourceType, 80),
    resourceId: text(value.resourceId, 128),
    whitelabelId,
    beforeData: value.beforeData ?? null,
    afterData: value.afterData ?? null,
    ip: text(value.ip, 64),
    userAgent: text(value.userAgent, 512),
    correlationId: text(value.correlationId, 64),
    createdAt,
  }
}

export function parseAuditList(value: unknown): AuditListResult {
  if (!isRecord(value) || !Array.isArray(value.data) || !isRecord(value.meta)) throw malformed()
  const { meta } = value
  const result: AuditListResult = {
    rows: value.data.map(parseAuditRecord),
    page: count(meta.page, 1),
    perPage: count(meta.perPage, 1),
    total: count(meta.total, 0),
    lastPage: Math.max(1, count(meta.lastPage, 0)),
  }
  if (
    result.perPage > 100 ||
    result.rows.length > result.perPage ||
    result.rows.length > result.total ||
    (result.total > 0 && result.page <= result.lastPage && result.rows.length === 0) ||
    result.lastPage !== Math.max(1, Math.ceil(result.total / result.perPage)) ||
    new Set(result.rows.map((row) => row.id)).size !== result.rows.length
  ) {
    throw malformed()
  }
  return result
}

export type AuditListParams = { page: number; search: string; order: AuditOrder }

/** `GET /audit` — only `page`, `perPage`, `search` and `order` (the supported keys). */
export async function listAuditEvents(params: AuditListParams, signal?: AbortSignal) {
  const body = await authenticatedGet('/audit', {
    signal,
    query: {
      page: params.page,
      perPage: AUDIT_PAGE_SIZE,
      search: params.search || undefined,
      order: params.order === 'asc' ? 'asc' : undefined,
    },
  })
  const result = parseAuditList(body)
  rememberAuditRecords(result.rows)
  return result
}

/*
 * Rows loaded by this session, kept in memory only (never storage), so the
 * detail screen can present a row the operator opened from the list. Tied to
 * the session version: after logout / another login nothing is shown.
 */
const loaded = new Map<string, { version: number; record: AuditRecord }>()
const MAX_REMEMBERED = 500

function rememberAuditRecords(rows: AuditRecord[]) {
  const version = getSessionVersion()
  for (const record of rows) {
    loaded.delete(record.id)
    loaded.set(record.id, { version, record })
  }
  while (loaded.size > MAX_REMEMBERED) loaded.delete(loaded.keys().next().value!)
}

/** The full row as returned by the list, if this session loaded it. */
export function loadedAuditRecord(id: string): AuditRecord | null {
  const entry = loaded.get(id)
  return entry && entry.version === getSessionVersion() ? entry.record : null
}
