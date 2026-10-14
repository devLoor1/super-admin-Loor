import type { StatusTone } from '../../../components/ui/StatusPill'
import { ApiError } from '../../../lib/api'
import { authenticatedGet } from '../../../lib/apiClient'
import { ACCESS_META, type BusinessTone } from '../../whitelabel-accounts/accountModel'
import { isServerWhitelabelId } from '../../whitelabels/whitelabelApi'

/*
 * Investor reads — Control Plane (Nest) → Core `/internal/super-admin/v1/investors`,
 * passed through by Nest without mapping. Shapes below were observed on the
 * homologation API (2026-10-13, read-only GETs, field names/types only):
 *
 *   GET /investors?page&perPage&search                        → { data: Investor[], meta }
 *   GET /investors/:id                                        → { data: InvestorDetail }   (wrapped)
 *   GET /whitelabels/:whitelabelId/accounts?tipo=investidores → { data: Investor[], meta }
 *
 * - `meta` = { page, perPage, total, lastPage }; perPage ≤ 100; newest first.
 * - The global list rejects unknown params (`whitelabelId` → 400), so
 *   Whitelabel separation uses the scoped Accounts read. Nest forwards it to
 *   the same Core investors endpoint with `whitelabelId`, so its rows are the
 *   SAME investor projection: a row `id` is the Core Investor id (verified
 *   live against `GET /investors/:id`). No separate account / user id is
 *   exposed by either projection.
 * - No KYC, investment, wallet or payment field exists in these contracts.
 *   `businessState` is the investor registration validation (the Accounts
 *   "Validação" concept), not a Compliance KYC decision.
 */

export const INVESTOR_PAGE_SIZE = 8

/** Investor projection shared by the global list and the Whitelabel-scoped read. */
export type InvestorRecord = {
  /** Core Investor id (number on the wire). Never a `inv_proto_*` prototype id. */
  id: string
  fullName: string | null
  email: string | null
  /** Digits only, as sent by the Core. */
  phone: string | null
  /** Core Whitelabel id (number on the wire) — the investor's tenant. */
  whitelabelId: string
  /** Account access state token (observed: `active`). */
  accessState: string | null
  /** Registration validation token (observed: `approved`, `waiting`). */
  businessState: string | null
  emailVerifiedAt: string | null
  termsAcceptedAt: string | null
  termsRevisionId: string | null
  createdAt: string | null
  updatedAt: string | null
}

/** Detail adds profile flags that the list projection omits. */
export type InvestorDetail = InvestorRecord & {
  /** Observed: `pessoa_fisica`. */
  investorType: string | null
  /** Observed as 0 / 1. */
  personalInformationFilled: boolean | null
  reasonForDeny: string | null
}

export type InvestorListResult = {
  rows: InvestorRecord[]
  page: number
  perPage: number
  total: number
  lastPage: number
}

/** Core Investor ids are numeric; anything else is never sent to the API. */
export function isServerInvestorId(id: string | undefined): id is string {
  return typeof id === 'string' && /^\d{1,18}$/.test(id)
}

/** Ids from the prototype modules (Financeiro, Compliance, Auditoria still link with them). */
export function isPrototypeId(id: string) {
  return /_proto_/.test(id)
}

const malformed = () => new ApiError(200, {}, { kind: 'malformed' })

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const text = (value: unknown) => (typeof value === 'string' && value.trim() !== '' ? value.trim() : null)
const token = (value: unknown) => (typeof value === 'string' && /^[A-Za-z][A-Za-z0-9_-]{0,39}$/.test(value) ? value : null)
const date = (value: unknown) => (typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : null)

function numericId(value: unknown) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? String(value) : null
}

function optionalReference(value: unknown) {
  if (typeof value === 'number' && Number.isSafeInteger(value)) return String(value)
  return text(value)
}

/**
 * Strict on identity (numeric id, numeric Whitelabel id, `type: investor`),
 * tolerant on display fields (missing → null → "sem dados"). Nothing is
 * filled from prototype data.
 */
export function parseInvestor(value: unknown): InvestorRecord {
  if (!isRecord(value)) throw malformed()
  const id = numericId(value.id)
  const whitelabelId = numericId(value.whitelabelId)
  if (!id || !whitelabelId) throw malformed()
  if (value.type !== undefined && value.type !== 'investor') throw malformed()
  const phone = typeof value.phone === 'string' && /^\+?\d{8,15}$/.test(value.phone.trim()) ? value.phone.trim() : text(value.phone)
  return {
    id,
    fullName: text(value.fullName),
    email: text(value.email),
    phone,
    whitelabelId,
    accessState: token(value.accessState),
    businessState: token(value.businessState),
    emailVerifiedAt: date(value.emailVerifiedAt),
    termsAcceptedAt: date(value.termsAcceptedAt),
    termsRevisionId: optionalReference(value.termsRevisionId),
    createdAt: date(value.createdAt),
    updatedAt: date(value.updatedAt),
  }
}

export function parseInvestorDetail(value: unknown): InvestorDetail {
  // Observed wrapped (`{ data: {...} }`); a direct object is also accepted.
  const record = isRecord(value) && isRecord(value.data) ? value.data : value
  const base = parseInvestor(record)
  const source = record as Record<string, unknown>
  const filled = source.personalInformationFilled
  return {
    ...base,
    investorType: token(source.investorType),
    personalInformationFilled: filled === 1 || filled === true ? true : filled === 0 || filled === false ? false : null,
    reasonForDeny: text(source.reasonForDeny),
  }
}

function count(value: unknown, minimum: number) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum) throw malformed()
  return value
}

/** `scopeWhitelabelId`: every row must belong to it, or the scope is not trustworthy. */
export function parseInvestorList(value: unknown, scopeWhitelabelId?: string): InvestorListResult {
  if (!isRecord(value) || !Array.isArray(value.data) || !isRecord(value.meta)) throw malformed()
  const { meta } = value
  const result: InvestorListResult = {
    rows: value.data.map(parseInvestor),
    page: count(meta.page, 1),
    perPage: count(meta.perPage, 1),
    total: count(meta.total, 0),
    lastPage: Math.max(1, count(meta.lastPage, 0)),
  }
  if (result.rows.length > result.perPage || result.rows.length > result.total
    || result.lastPage !== Math.max(1, Math.ceil(result.total / result.perPage))
    || (result.total > 0 && result.page <= result.lastPage && result.rows.length === 0)
    || new Set(result.rows.map((row) => row.id)).size !== result.rows.length) throw malformed()
  if (scopeWhitelabelId !== undefined && result.rows.some((row) => row.whitelabelId !== scopeWhitelabelId)) {
    throw new ApiError(200, { code: 'SCOPE_MISMATCH' }, { kind: 'malformed' })
  }
  return result
}

export type InvestorListParams = {
  /** Core Whitelabel id → server-scoped read; undefined → global list. */
  whitelabelId?: string
  page: number
  search: string
}

export async function listInvestors(params: InvestorListParams, signal?: AbortSignal) {
  const query = { page: params.page, perPage: INVESTOR_PAGE_SIZE, search: params.search || undefined }
  if (params.whitelabelId !== undefined) {
    if (!isServerWhitelabelId(params.whitelabelId)) throw new ApiError(404, { code: 'INVALID_WHITELABEL_ID' })
    const body = await authenticatedGet(`/whitelabels/${encodeURIComponent(params.whitelabelId)}/accounts`, {
      signal,
      query: { tipo: 'investidores', ...query },
    })
    return parseInvestorList(body, params.whitelabelId)
  }
  return parseInvestorList(await authenticatedGet('/investors', { signal, query }))
}

export async function getInvestor(id: string, signal?: AbortSignal) {
  if (!isServerInvestorId(id)) throw new ApiError(404, { code: 'INVALID_INVESTOR_ID' })
  const detail = parseInvestorDetail(await authenticatedGet(`/investors/${encodeURIComponent(id)}`, { signal }))
  if (detail.id !== id) throw malformed()
  return detail
}

/** Whitelabel registry / tenant lookup — shared with Empreendedores (operation/shared/whitelabelContext.ts). */
export { listWhitelabelOptions, getTenantWhitelabel as getInvestorWhitelabel } from '../shared/whitelabelContext'

/* ---------- presentation (derived from Backend tokens; unknown tokens shown as sent) ---------- */

export function accessMeta(state: string | null): { label: string; tone: StatusTone } | null {
  if (!state) return null
  if (state === 'active' || state === 'paused') return ACCESS_META[state]
  return { label: state, tone: 'muted' }
}

const VALIDATION_META: Record<string, { label: string; tone: BusinessTone }> = {
  approved: { label: 'Aprovada', tone: 'positive' },
  waiting: { label: 'Aguardando', tone: 'pending' },
}

export function validationMeta(state: string | null): { label: string; tone: BusinessTone } | null {
  if (!state) return null
  return Object.hasOwn(VALIDATION_META, state) ? VALIDATION_META[state] : { label: state, tone: 'neutral' }
}

export function investorTypeLabel(value: string | null) {
  if (!value) return null
  return value === 'pessoa_fisica' ? 'Pessoa física' : value
}

/**
 * Masked like the approved Accounts / Investors design: area code + last 4
 * digits only — "(11) •••••-5678". The full number is never rendered.
 */
export function maskPhone(value: string | null) {
  if (!value) return null
  const digits = value.replace(/\D/g, '')
  if (digits.length < 6) return '••••'
  const last = digits.slice(-4)
  if (digits.length === 11 || digits.length === 10) return `(${digits.slice(0, 2)}) ${'•'.repeat(digits.length - 6)}-${last}`
  return `${'•'.repeat(Math.min(digits.length - 4, 9))}-${last}`
}

const COUNT_FORMAT = new Intl.NumberFormat('pt-BR')
export const formatCount = (value: number) => COUNT_FORMAT.format(value)
