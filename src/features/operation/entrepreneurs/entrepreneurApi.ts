import type { StatusTone } from '../../../components/ui/StatusPill'
import { ApiError } from '../../../lib/api'
import { authenticatedGet } from '../../../lib/apiClient'
import { ACCESS_META, type BusinessTone } from '../../whitelabel-accounts/accountModel'
import { isServerWhitelabelId } from '../../whitelabels/whitelabelApi'

/*
 * Entrepreneur reads — Control Plane (Nest) → Core `/internal/super-admin/v1/entrepreneurs`,
 * passed through by Nest without mapping. Shapes observed on the homologation
 * API (2026-10-14, read-only GETs, field names / types / enum tokens only):
 *
 *   GET /entrepreneurs?page&perPage&search                       → { data: Entrepreneur[], meta }
 *   GET /entrepreneurs/:id                                       → { data: Entrepreneur }   (wrapped, same fields)
 *   GET /whitelabels/:whitelabelId/accounts?tipo=empreendedores  → { data: Entrepreneur[], meta }
 *
 * - `meta` = { page, perPage, total, lastPage }; perPage ≤ 100; newest first.
 * - The global list rejects unknown params (`whitelabelId` → 400). Tenant
 *   separation uses the scoped Accounts read, which Nest forwards to the same
 *   Core endpoint with `whitelabelId`: identical projection, same ids.
 * - ONE identity only: the Core Entrepreneur id. No account / user id.
 *   Entrepreneur ids overlap numerically with Investor ids (separate tables),
 *   so an id is only meaningful together with its domain.
 * - NO Company in the contract (no companyId, name, legal name, CNPJ, company
 *   status or relationship). "Empresas" is NOT represented here.
 * - No KYC, opportunity or finance field. `businessState`
 *   (`profile_complete` / `incomplete`) is profile completeness, not KYC.
 */

export const ENTREPRENEUR_PAGE_SIZE = 8

export type EntrepreneurRecord = {
  /** Core Entrepreneur id (number on the wire). Never an `emp_proto_*` prototype id. */
  id: string
  fullName: string | null
  email: string | null
  /** As sent (observed: 11 digits, "+" and 13 digits, other lengths). */
  phone: string | null
  /** Core Whitelabel id (number on the wire) — the entrepreneur's tenant. */
  whitelabelId: string
  /** Account access state token (observed: `active`). */
  accessState: string | null
  /** Profile completeness token (observed: `profile_complete`, `incomplete`). */
  businessState: string | null
  /** Nullable in the contract (9 of 58 records had none). */
  emailVerifiedAt: string | null
  createdAt: string | null
  updatedAt: string | null
}

export type EntrepreneurListResult = {
  rows: EntrepreneurRecord[]
  page: number
  perPage: number
  total: number
  lastPage: number
}

/** Core Entrepreneur ids are numeric; anything else is never sent to the API. */
export function isServerEntrepreneurId(id: string | undefined): id is string {
  return typeof id === 'string' && /^\d{1,18}$/.test(id)
}

/** Ids from the prototype modules (Oportunidades, Compliance still link with them). */
export function isPrototypeId(id: string) {
  return /_proto_/.test(id)
}

const malformed = (code?: string) => new ApiError(200, code ? { code } : {}, { kind: 'malformed' })

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const text = (value: unknown) => (typeof value === 'string' && value.trim() !== '' ? value.trim() : null)
const token = (value: unknown) => (typeof value === 'string' && /^[A-Za-z][A-Za-z0-9_-]{0,39}$/.test(value) ? value : null)
const date = (value: unknown) => (typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : null)

function numericId(value: unknown) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? String(value) : null
}

/**
 * Strict on identity (numeric id, numeric Whitelabel id, `type: entrepreneur`),
 * tolerant on display fields (missing → null → "não informado"). Nothing is
 * filled from prototype data, and no Company is derived.
 */
export function parseEntrepreneur(value: unknown): EntrepreneurRecord {
  if (!isRecord(value)) throw malformed()
  const id = numericId(value.id)
  const whitelabelId = numericId(value.whitelabelId)
  if (!id || !whitelabelId) throw malformed()
  if (value.type !== 'entrepreneur') throw malformed()
  return {
    id,
    fullName: text(value.fullName),
    email: text(value.email),
    phone: text(value.phone),
    whitelabelId,
    accessState: token(value.accessState),
    businessState: token(value.businessState),
    emailVerifiedAt: date(value.emailVerifiedAt),
    createdAt: date(value.createdAt),
    updatedAt: date(value.updatedAt),
  }
}

/** Observed wrapped (`{ data: {...} }`); a direct object is also accepted. */
export function parseEntrepreneurDetail(value: unknown): EntrepreneurRecord {
  return parseEntrepreneur(isRecord(value) && isRecord(value.data) ? value.data : value)
}

function count(value: unknown, minimum: number) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum) throw malformed()
  return value
}

/** `scopeWhitelabelId`: every row must belong to it, or the scope is not trustworthy. */
export function parseEntrepreneurList(value: unknown, scopeWhitelabelId?: string): EntrepreneurListResult {
  if (!isRecord(value) || !Array.isArray(value.data) || !isRecord(value.meta)) throw malformed()
  const { meta } = value
  const result: EntrepreneurListResult = {
    rows: value.data.map(parseEntrepreneur),
    page: count(meta.page, 1),
    perPage: count(meta.perPage, 1),
    total: count(meta.total, 0),
    lastPage: Math.max(1, count(meta.lastPage, 0)),
  }
  if (result.rows.length > result.perPage || result.rows.length > result.total
    || (result.total > 0 && result.page <= result.lastPage && result.rows.length === 0)
    || result.lastPage !== Math.max(1, Math.ceil(result.total / result.perPage))
    || new Set(result.rows.map((row) => row.id)).size !== result.rows.length) throw malformed()
  if (scopeWhitelabelId !== undefined && result.rows.some((row) => row.whitelabelId !== scopeWhitelabelId)) {
    throw malformed('SCOPE_MISMATCH')
  }
  return result
}

export type EntrepreneurListParams = {
  /** Core Whitelabel id → server-scoped read; undefined → global list. */
  whitelabelId?: string
  page: number
  search: string
}

export async function listEntrepreneurs(params: EntrepreneurListParams, signal?: AbortSignal) {
  const query = { page: params.page, perPage: ENTREPRENEUR_PAGE_SIZE, search: params.search || undefined }
  if (params.whitelabelId !== undefined) {
    if (!isServerWhitelabelId(params.whitelabelId)) throw new ApiError(404, { code: 'INVALID_WHITELABEL_ID' })
    const body = await authenticatedGet(`/whitelabels/${encodeURIComponent(params.whitelabelId)}/accounts`, {
      signal,
      query: { tipo: 'empreendedores', ...query },
    })
    return parseEntrepreneurList(body, params.whitelabelId)
  }
  return parseEntrepreneurList(await authenticatedGet('/entrepreneurs', { signal, query }))
}

export async function getEntrepreneur(id: string, signal?: AbortSignal) {
  if (!isServerEntrepreneurId(id)) throw new ApiError(404, { code: 'INVALID_ENTREPRENEUR_ID' })
  const detail = parseEntrepreneurDetail(await authenticatedGet(`/entrepreneurs/${encodeURIComponent(id)}`, { signal }))
  if (detail.id !== id) throw malformed()
  return detail
}

/* ---------- presentation (derived from Backend tokens; unknown tokens shown as sent) ---------- */

export function accessMeta(state: string | null): { label: string; tone: StatusTone } | null {
  if (!state) return null
  if (state === 'active' || state === 'paused') return ACCESS_META[state]
  return { label: state, tone: 'muted' }
}

const PROFILE_META: Record<string, { label: string; tone: BusinessTone }> = {
  profile_complete: { label: 'Cadastro completo', tone: 'positive' },
  incomplete: { label: 'Cadastro incompleto', tone: 'pending' },
}

/** Profile completeness (`businessState`) — never a KYC or Company status. */
export function profileMeta(state: string | null): { label: string; tone: BusinessTone } | null {
  if (!state) return null
  return Object.hasOwn(PROFILE_META, state) ? PROFILE_META[state] : { label: state, tone: 'neutral' }
}

export { formatPhone } from '../shared/businessPresentation'

const COUNT_FORMAT = new Intl.NumberFormat('pt-BR')
export const formatCount = (value: number) => COUNT_FORMAT.format(value)
