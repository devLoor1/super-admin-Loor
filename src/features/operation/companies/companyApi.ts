import { ApiError } from '../../../lib/api'
import { authenticatedGet } from '../../../lib/apiClient'
import { isPositiveCoreId } from '../shared/coreIds'

/*
 * COMPANIES READ V1 — authoritative read adapter (GET only).
 *
 * Control Plane (Nest `backend-super-admin-Loor` `aea5392`; filters and the
 * no-company case fixed in `33e4646`) → Core
 * `/internal/super-admin/v1/{companies|entrepreneurs/:id/company}`, body
 * passed through by Nest. Contract: Backend `docs/arthur-demands-backend-v1.md`
 * (Demanda 2 — Empresas), checked against the source and live homolog GETs on
 * 2026-10-18 (structure only — docs/opportunities-companies-read-integration-v1.md):
 *
 *   GET /companies                         { data, meta, cardinality }   page, perPage (≤ 100), search
 *                                                                        (legalName | tradeName | cnpj), whitelabelId,
 *                                                                        status, sort (createdAt|updatedAt|legalName|cnpj), order
 *   GET /companies/:id                     { data, cardinality }         + phone, email, validationSource, validatedAt
 *   GET /entrepreneurs/:id/company         { data | null, cardinality }  optional whitelabelId (tenant-scoped lookup)
 *     - Entrepreneur with a Company        → 200 { data: Company }
 *     - Entrepreneur WITHOUT a Company     → 200 { data: null }          (absence of a row — never invent one)
 *     - unknown Entrepreneur               → 404 E_ENTREPRENEUR_NOT_FOUND
 *     - invalid id                         → 400 E_VALIDATION
 *
 * Cardinality (documented): Entrepreneur → Company 0..1, Company → Entrepreneur 1
 * (`entrepreneur_company_informations.entrepreneur_id` UNIQUE). The link is
 * `company.entrepreneurId`; Company, Entrepreneur and Whitelabel ids are
 * independent namespaces (equal numbers never identify the same entity).
 * Roles (source): SUPER_ADMIN, SUPPORT_ADMIN, READ_ONLY.
 */

export const COMPANY_PAGE_SIZE = 10
export const COMPANY_SEARCH_MAX_LENGTH = 120

/** Official `EntrepreneurCompany.validationStatus` vocabulary (filters only offer these). */
export const COMPANY_STATUSES = ['pending', 'validated', 'invalid', 'not_found', 'unavailable'] as const
export type CompanyStatus = (typeof COMPANY_STATUSES)[number]

/** Documented sort keys (`tradeName` and unknown keys are silently ignored by the Backend — never sent). */
export const COMPANY_SORT_KEYS = ['createdAt', 'updatedAt', 'legalName', 'cnpj'] as const
export type CompanySortKey = (typeof COMPANY_SORT_KEYS)[number]
export type SortOrder = 'asc' | 'desc'

export const isOneOf = <T extends string>(list: readonly T[], value: unknown): value is T =>
  typeof value === 'string' && (list as readonly string[]).includes(value)

export type CompanyRecord = {
  /** Core Company id (number on the wire). Independent of the Entrepreneur and Whitelabel ids. */
  id: string
  /** The authoritative relationship: the one Entrepreneur this Company belongs to. */
  entrepreneurId: string
  /** Core Whitelabel id (tenant scope). */
  whitelabelId: string
  legalName: string | null
  tradeName: string | null
  /** CNPJ as sent by the Backend (digits). Shown to authorized operators; never logged or stored. */
  cnpj: string | null
  /** Validation status token, kept as sent (unknown tokens are shown as sent). */
  status: string
  createdAt: string | null
  updatedAt: string | null
}

export type CompanyDetail = CompanyRecord & {
  phone: string | null
  email: string | null
  validationSource: string | null
  validatedAt: string | null
}

export type PagedResult<T> = { rows: T[]; page: number; perPage: number; total: number; lastPage: number }

export type CompanyRejection = 'SCOPE_MISMATCH' | 'IDENTITY_MISMATCH' | 'CARDINALITY_MISMATCH' | 'PAGE_MISMATCH'

const malformed = (code?: CompanyRejection) => new ApiError(200, code ? { code } : {}, { kind: 'malformed' })

function fail(code?: CompanyRejection): never {
  throw malformed(code)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const text = (value: unknown) => (typeof value === 'string' && value.trim() !== '' ? value.trim() : null)
const token = (value: unknown) => (typeof value === 'string' && /^[A-Za-z][A-Za-z0-9_-]{0,39}$/.test(value) ? value : null)
const date = (value: unknown) => (typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : null)

function numericId(value: unknown) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? String(value) : null
}

const requiredId = (value: unknown) => numericId(value) ?? fail()

function count(value: unknown, minimum: number) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum) fail()
  return value
}

/**
 * The documented cardinality travels with every envelope. When present it must
 * still say Entrepreneur → Company 0..1: the screens rely on it (one Company per
 * Entrepreneur at most), so a different model is rejected rather than shown.
 */
function assertCardinality(body: Record<string, unknown>) {
  const cardinality = body.cardinality
  if (cardinality === undefined) return
  if (!isRecord(cardinality) || cardinality.entrepreneurToCompany !== '0..1' || cardinality.companyToEntrepreneur !== '1') fail('CARDINALITY_MISMATCH')
}

export function parseCompany(value: unknown): CompanyRecord {
  if (!isRecord(value)) fail()
  return {
    id: requiredId(value.id),
    entrepreneurId: requiredId(value.entrepreneurId),
    whitelabelId: requiredId(value.whitelabelId),
    legalName: text(value.legalName),
    tradeName: text(value.tradeName),
    cnpj: text(value.cnpj),
    status: token(value.status) ?? fail(),
    createdAt: date(value.createdAt),
    updatedAt: date(value.updatedAt),
  }
}

function parseCompanyFields(data: Record<string, unknown>): CompanyDetail {
  return {
    ...parseCompany(data),
    phone: text(data.phone),
    email: text(data.email),
    validationSource: token(data.validationSource),
    validatedAt: date(data.validatedAt),
  }
}

/** `GET /companies/:id` → `{ data, cardinality }` (the wrapper is required). */
export function parseCompanyDetail(body: unknown): CompanyDetail {
  if (!isRecord(body) || !isRecord(body.data)) fail()
  assertCardinality(body)
  return parseCompanyFields(body.data)
}

export function parseCompanyList(body: unknown): PagedResult<CompanyRecord> {
  if (!isRecord(body) || !Array.isArray(body.data) || !isRecord(body.meta)) fail()
  assertCardinality(body)
  const { meta } = body
  const page = count(meta.page, 1)
  const perPage = count(meta.perPage, 1)
  const total = count(meta.total, 0)
  const lastPage = Math.max(1, count(meta.lastPage, 0))
  const rows = body.data.map(parseCompany)
  if (
    rows.length > perPage ||
    rows.length > total ||
    lastPage !== Math.max(1, Math.ceil(total / perPage)) ||
    (total > 0 && page <= lastPage && rows.length === 0) ||
    new Set(rows.map((row) => row.id)).size !== rows.length
  ) {
    fail()
  }
  // 0..1: two Companies for one Entrepreneur contradict the documented model.
  if (new Set(rows.map((row) => row.entrepreneurId)).size !== rows.length) fail('CARDINALITY_MISMATCH')
  return { rows, page, perPage, total, lastPage }
}

export type CompanyQuery = {
  page: number
  search: string
  whitelabelId?: string
  status?: CompanyStatus
  sort: CompanySortKey
  order: SortOrder
  perPage?: number
}

/** A pasted, formatted CNPJ ("00.000.000/0000-00") is searched by its digits, as the Backend matches CNPJ digits. */
export function parseCompanySearch(search: string) {
  const value = search.trim()
  return /^[\d\s./-]+$/.test(value) && /\d/.test(value) ? value.replace(/\D/g, '') : value
}

export async function listCompanies(params: CompanyQuery, signal?: AbortSignal) {
  if (params.whitelabelId !== undefined && !isPositiveCoreId(params.whitelabelId)) throw new ApiError(400, { code: 'INVALID_FILTER' })
  const perPage = params.perPage ?? COMPANY_PAGE_SIZE
  const body = await authenticatedGet('/companies', {
    signal,
    query: {
      page: params.page,
      perPage,
      search: parseCompanySearch(params.search) || undefined,
      whitelabelId: params.whitelabelId,
      status: params.status,
      sort: params.sort,
      order: params.order,
    },
  })
  const result = parseCompanyList(body)
  if (result.page !== params.page || result.perPage !== perPage) fail('PAGE_MISMATCH')
  for (const [key, expected] of [['whitelabelId', params.whitelabelId], ['status', params.status]] as const) {
    if (expected !== undefined && result.rows.some((row) => row[key] !== expected)) fail('SCOPE_MISMATCH')
  }
  return result
}

export async function getCompany(id: string, signal?: AbortSignal) {
  if (!isPositiveCoreId(id)) throw new ApiError(404, { code: 'INVALID_COMPANY_ID' })
  const detail = parseCompanyDetail(await authenticatedGet(`/companies/${encodeURIComponent(id)}`, { signal }))
  if (detail.id !== id) fail('IDENTITY_MISMATCH')
  return detail
}

/**
 * `GET /entrepreneurs/:id/company` → `{ data: Company | null, cardinality }`.
 * ONLY an explicit `data: null` means "Entrepreneur without a Company"; a body
 * without `data` is malformed (never read as absence). The returned Company
 * must belong to the requested Entrepreneur (and to the requested Whitelabel
 * when the lookup is tenant-scoped). 404 `E_ENTREPRENEUR_NOT_FOUND` (unknown
 * Entrepreneur, or one outside the requested Whitelabel) propagates as an error.
 */
export function parseEntrepreneurCompany(body: unknown, entrepreneurId: string, whitelabelId?: string): CompanyDetail | null {
  if (!isRecord(body) || !('data' in body)) fail()
  assertCardinality(body)
  if (body.data === null) return null
  if (!isRecord(body.data)) fail()
  const company = parseCompanyFields(body.data)
  if (company.entrepreneurId !== entrepreneurId) fail('IDENTITY_MISMATCH')
  if (whitelabelId !== undefined && company.whitelabelId !== whitelabelId) fail('SCOPE_MISMATCH')
  return company
}

export async function getEntrepreneurCompany(entrepreneurId: string, whitelabelId: string | undefined, signal?: AbortSignal) {
  if (!isPositiveCoreId(entrepreneurId)) throw new ApiError(400, { code: 'E_VALIDATION' })
  if (whitelabelId !== undefined && !isPositiveCoreId(whitelabelId)) throw new ApiError(400, { code: 'E_VALIDATION' })
  const body = await authenticatedGet(`/entrepreneurs/${encodeURIComponent(entrepreneurId)}/company`, {
    signal,
    query: { whitelabelId },
  })
  return parseEntrepreneurCompany(body, entrepreneurId, whitelabelId)
}
