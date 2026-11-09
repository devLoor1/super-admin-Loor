import { ApiError } from '../../../lib/api'
import { authenticatedGet } from '../../../lib/apiClient'
import { isPositiveCoreId } from '../shared/coreIds'

/*
 * OPPORTUNITIES READ V1 — authoritative read adapter (GET only).
 *
 * Control Plane (Nest `backend-super-admin-Loor` `aea5392`; filters fixed in
 * `33e4646`) → Core `/internal/super-admin/v1/opportunities`, body passed
 * through by Nest. Contract: Backend `docs/opportunities-read-contract-v1.md`,
 * checked against the source and live homolog GETs on 2026-10-18 (structure
 * only — docs/opportunities-companies-read-integration-v1.md):
 *
 *   GET /opportunities       { data, meta }   page, perPage (≤ 100), search (name | businessName),
 *                                             whitelabelId, status, modality, sort, order
 *   GET /opportunities/:id   { data }         + description, about, quotaQuantity, reasonForArchiving
 *
 * Roles (source): SUPER_ADMIN, SUPPORT_ADMIN, READ_ONLY. Unknown query keys,
 * invalid enums, perPage > 100 → 400. Unknown `sort` keys are silently ignored
 * by the Backend, so only documented keys are ever sent. A page past the end
 * answers an empty page with `meta.page` = requested (not clamped).
 *
 * The contract has NO money, investment, investor count, fundraising progress
 * or Company field, and NO Entrepreneur filter. Nothing here invents them.
 * Identity is strict (a response that contradicts the request or an applied
 * filter is rejected whole); display text is tolerant (missing → null).
 */

export const OPPORTUNITY_PAGE_SIZE = 20
export const OPPORTUNITY_SEARCH_MAX_LENGTH = 120

/* ---------- vocabularies (Backend enums; filters only offer these) ---------- */

export const OPPORTUNITY_STATUSES = ['review', 'active', 'finished', 'archived'] as const
export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number]

/** Modality only — Segment and Resource Use are independent dimensions ("Capital de Giro" is never a modality). */
export const OPPORTUNITY_MODALITIES = ['equity', 'debt'] as const
export type OpportunityModality = (typeof OPPORTUNITY_MODALITIES)[number]

/** Documented sort keys (`dueAt`: nulls first ascending, last descending — Backend order). */
export const OPPORTUNITY_SORT_KEYS = ['createdAt', 'updatedAt', 'name', 'status', 'dueAt'] as const
export type OpportunitySortKey = (typeof OPPORTUNITY_SORT_KEYS)[number]
export type SortOrder = 'asc' | 'desc'

export const isOneOf = <T extends string>(list: readonly T[], value: unknown): value is T =>
  typeof value === 'string' && (list as readonly string[]).includes(value)

/* ---------- records ---------- */

export type OpportunityRecord = {
  /** Core ids (numbers on the wire), kept as strings. Equal numbers across domains do NOT identify the same entity. */
  id: string
  whitelabelId: string
  entrepreneurId: string
  name: string | null
  businessName: string | null
  /** Backend tokens, kept as sent (unknown tokens are shown as sent, never mapped to a known one). */
  status: string
  modality: string
  /** `reached_minimum_goal` | `did_not_reach_minimum_goal` | null — a goal flag, not a progress amount. */
  fundraisingCompletion: string | null
  isPrivate: boolean | null
  segment: { id: string; name: string | null } | null
  resourceUse: { code: string; name: string | null } | null
  dueAt: string | null
  openedAt: string | null
  endedAt: string | null
  createdAt: string | null
  updatedAt: string | null
}

export type OpportunityDetail = OpportunityRecord & {
  description: string | null
  about: string | null
  /** Number of quotas as sent (a count, not money). */
  quotaQuantity: number | null
  reasonForArchiving: string | null
}

export type PagedResult<T> = { rows: T[]; page: number; perPage: number; total: number; lastPage: number }

/* ---------- parsing helpers ---------- */

export type OpportunityRejection = 'SCOPE_MISMATCH' | 'IDENTITY_MISMATCH' | 'PAGE_MISMATCH'

const malformed = (code?: OpportunityRejection) => new ApiError(200, code ? { code } : {}, { kind: 'malformed' })

function fail(code?: OpportunityRejection): never {
  throw malformed(code)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const text = (value: unknown) => (typeof value === 'string' && value.trim() !== '' ? value.trim() : null)
const token = (value: unknown) => (typeof value === 'string' && /^[A-Za-z][A-Za-z0-9_-]{0,39}$/.test(value) ? value : null)
const requiredToken = (value: unknown) => token(value) ?? fail()
const date = (value: unknown) => (typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : null)

function numericId(value: unknown) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? String(value) : null
}

const requiredId = (value: unknown) => numericId(value) ?? fail()

function count(value: unknown, minimum: number) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum) fail()
  return value
}

/** Opportunity ids: anything else (e.g. a legacy prototype slug) is never sent to the API. */
export const isServerOpportunityId = isPositiveCoreId

/** `{ data, meta }`: metadata must be consistent and identities unique; an empty page inside the range is malformed. */
export function parsePage<T>(body: unknown, parseRow: (value: unknown) => T, rowId: (row: T) => string): PagedResult<T> {
  if (!isRecord(body) || !Array.isArray(body.data) || !isRecord(body.meta)) fail()
  const { meta } = body
  const page = count(meta.page, 1)
  const perPage = count(meta.perPage, 1)
  const total = count(meta.total, 0)
  const lastPage = Math.max(1, count(meta.lastPage, 0))
  const rows = body.data.map(parseRow)
  if (
    rows.length > perPage ||
    rows.length > total ||
    lastPage !== Math.max(1, Math.ceil(total / perPage)) ||
    (total > 0 && page <= lastPage && rows.length === 0) ||
    new Set(rows.map(rowId)).size !== rows.length
  ) {
    fail()
  }
  return { rows, page, perPage, total, lastPage }
}

/* ---------- opportunities ---------- */

export function parseOpportunity(value: unknown): OpportunityRecord {
  if (!isRecord(value)) fail()
  const segment = isRecord(value.segment) ? value.segment : null
  const resourceUse = isRecord(value.resourceUse) ? value.resourceUse : null
  const segmentId = segment ? numericId(segment.id) : null
  const resourceCode = resourceUse ? token(resourceUse.code) : null
  return {
    id: requiredId(value.id),
    whitelabelId: requiredId(value.whitelabelId),
    entrepreneurId: requiredId(value.entrepreneurId),
    name: text(value.name),
    businessName: text(value.businessName),
    status: requiredToken(value.status),
    modality: requiredToken(value.modality),
    fundraisingCompletion: token(value.fundraisingCompletion),
    isPrivate: typeof value.isPrivate === 'boolean' ? value.isPrivate : null,
    segment: segment && segmentId ? { id: segmentId, name: text(segment.name) } : null,
    resourceUse: resourceUse && resourceCode ? { code: resourceCode, name: text(resourceUse.name) } : null,
    dueAt: date(value.dueAt),
    openedAt: date(value.openedAt),
    endedAt: date(value.endedAt),
    createdAt: date(value.createdAt),
    updatedAt: date(value.updatedAt),
  }
}

/** Observed `{ data: {...} }` (Nest re-wraps nothing): the wrapper is required. */
export function parseOpportunityDetail(body: unknown): OpportunityDetail {
  if (!isRecord(body) || !isRecord(body.data)) fail()
  const data = body.data
  const quotas = data.quotaQuantity
  return {
    ...parseOpportunity(data),
    description: text(data.description),
    about: text(data.about),
    quotaQuantity: typeof quotas === 'number' && Number.isSafeInteger(quotas) && quotas >= 0 ? quotas : null,
    reasonForArchiving: text(data.reasonForArchiving),
  }
}

export type OpportunityQuery = {
  page: number
  search: string
  whitelabelId?: string
  status?: OpportunityStatus
  modality?: OpportunityModality
  sort: OpportunitySortKey
  order: SortOrder
  perPage?: number
}

/** Rows that contradict an applied server filter mean the filter cannot be trusted: nothing is shown. */
function assertScope(rows: OpportunityRecord[], params: OpportunityQuery) {
  for (const [key, expected] of [['whitelabelId', params.whitelabelId], ['status', params.status], ['modality', params.modality]] as const) {
    if (expected !== undefined && rows.some((row) => row[key] !== expected)) fail('SCOPE_MISMATCH')
  }
}

export async function listOpportunities(params: OpportunityQuery, signal?: AbortSignal) {
  if (params.whitelabelId !== undefined && !isPositiveCoreId(params.whitelabelId)) throw new ApiError(400, { code: 'INVALID_FILTER' })
  const perPage = params.perPage ?? OPPORTUNITY_PAGE_SIZE
  const body = await authenticatedGet('/opportunities', {
    signal,
    query: {
      page: params.page,
      perPage,
      search: params.search || undefined,
      whitelabelId: params.whitelabelId,
      status: params.status,
      modality: params.modality,
      sort: params.sort,
      order: params.order,
    },
  })
  const result = parsePage(body, parseOpportunity, (row) => row.id)
  // The Backend echoes the requested page (also past the end): another page would be shown under the wrong number.
  if (result.page !== params.page || result.perPage !== perPage) fail('PAGE_MISMATCH')
  assertScope(result.rows, params)
  return result
}

export async function getOpportunity(id: string, signal?: AbortSignal) {
  if (!isServerOpportunityId(id)) throw new ApiError(404, { code: 'INVALID_OPPORTUNITY_ID' })
  const detail = parseOpportunityDetail(await authenticatedGet(`/opportunities/${encodeURIComponent(id)}`, { signal }))
  if (detail.id !== id) fail('IDENTITY_MISMATCH')
  return detail
}
