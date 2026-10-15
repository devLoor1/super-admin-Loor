import type { StatusTone } from '../../components/ui/StatusPill'
import { ApiError } from '../../lib/api'
import { authenticatedGet } from '../../lib/apiClient'
import { parseEntrepreneur, parseEntrepreneurDetail, type EntrepreneurRecord } from '../operation/entrepreneurs/entrepreneurApi'
import { parseInvestor, parseInvestorDetail, type InvestorDetail, type InvestorRecord } from '../operation/investors/investorApi'
import { isServerWhitelabelId } from '../whitelabels/whitelabelApi'
import type { BusinessTone } from './accountModel'

/*
 * Accounts reads — Control Plane (Nest) `AccountsController`, tenant-scoped.
 * Contract observed on homolog (2026-10-15, read-only GETs, structure /
 * tokens / counts only) and in `backend-super-admin-Loor` `0177437`:
 *
 *   GET /whitelabels/:whitelabelId/accounts?tipo=investidores|empreendedores|administradores&page&perPage(≤100)&search
 *     → { data: Row[], meta: { page, perPage, total, lastPage } }
 *   GET /whitelabels/:whitelabelId/accounts/:accountId?tipo=…  → { data: Row }   (other tenant / unknown id → 404)
 *
 * - `tipo` is the ONLY type vocabulary (DTO enum); missing `tipo` = investidores.
 *   Unknown `tipo` or query keys → 400. `access` and `sort` are accepted but
 *   have no effect observed (live: access=paused returned active rows) — never sent.
 *   Investor `order=asc` does affect date order; no ordering control is part of this V1.
 * - investidores / empreendedores rows ARE the Investor / Entrepreneur
 *   projections (same Core ids; the detail body equals `GET /investors/:id`
 *   / `GET /entrepreneurs/:id`), so the existing parsers are reused.
 * - administradores: Core tenant admins `{ id, type: 'admin', whitelabelId,
 *   email, fullName (null on all 4), accessState, businessState, invitation,
 *   isSuperAdmin, createdAt, updatedAt }`.
 * - Ids are per domain: an investor, an entrepreneur and an admin may share a
 *   number. An account is identified by (tipo, id) inside its Whitelabel.
 * - No separate user id, no role list, no Company, no KYC field.
 */

export type AccountKind = 'investor' | 'entrepreneur' | 'admin'

export const ACCOUNT_KINDS: { kind: AccountKind; tipo: string; label: string; singular: string }[] = [
  { kind: 'investor', tipo: 'investidores', label: 'Investidores', singular: 'Investidor' },
  { kind: 'entrepreneur', tipo: 'empreendedores', label: 'Empreendedores', singular: 'Empreendedor' },
  { kind: 'admin', tipo: 'administradores', label: 'Administradores', singular: 'Administrador' },
]

export const kindMeta = (kind: AccountKind) => ACCOUNT_KINDS.find((item) => item.kind === kind)!
export const kindFromTipo = (tipo: string | undefined) => ACCOUNT_KINDS.find((item) => item.tipo === tipo)?.kind

export const ACCOUNT_PAGE_SIZE = 8

export type AdminRecord = {
  /** Core tenant-admin id (number on the wire). Its own id space. */
  id: string
  whitelabelId: string
  email: string | null
  fullName: string | null
  accessState: string | null
  /** Token as sent (observed: `active`); meaning not defined by the contract. */
  businessState: string | null
  /** Observed: `accepted`. */
  invitation: string | null
  /** Core flag as sent (observed: false on all). Meaning not defined by the contract. */
  isSuperAdmin: boolean | null
  createdAt: string | null
  updatedAt: string | null
}

export type AccountRow =
  | { kind: 'investor'; record: InvestorRecord }
  | { kind: 'entrepreneur'; record: EntrepreneurRecord }
  | { kind: 'admin'; record: AdminRecord }

export type AccountDetail =
  | { kind: 'investor'; record: InvestorDetail }
  | { kind: 'entrepreneur'; record: EntrepreneurRecord }
  | { kind: 'admin'; record: AdminRecord }

export type AccountListResult = { rows: AccountRow[]; page: number; perPage: number; total: number; lastPage: number }

const malformed = (code?: string) => new ApiError(200, code ? { code } : {}, { kind: 'malformed' })

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const text = (value: unknown) => (typeof value === 'string' && value.trim() !== '' ? value.trim() : null)
const token = (value: unknown) => (typeof value === 'string' && /^[A-Za-z][A-Za-z0-9_-]{0,39}$/.test(value) ? value : null)
const date = (value: unknown) => (typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : null)
const numericId = (value: unknown) => (typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? String(value) : null)

/** Strict on identity (numeric id / Whitelabel id, `type: admin`); tolerant on display fields. */
export function parseAdmin(value: unknown): AdminRecord {
  if (!isRecord(value)) throw malformed()
  const id = numericId(value.id)
  const whitelabelId = numericId(value.whitelabelId)
  if (!id || !whitelabelId || value.type !== 'admin') throw malformed()
  return {
    id,
    whitelabelId,
    email: text(value.email),
    fullName: text(value.fullName),
    accessState: token(value.accessState),
    businessState: token(value.businessState),
    invitation: token(value.invitation),
    isSuperAdmin: typeof value.isSuperAdmin === 'boolean' ? value.isSuperAdmin : null,
    createdAt: date(value.createdAt),
    updatedAt: date(value.updatedAt),
  }
}

/** Each kind's row parser; investor / entrepreneur reuse the Operation parsers (same projection). */
function parseRow(kind: AccountKind, value: unknown): AccountRow {
  if (kind === 'investor') {
    if (isRecord(value) && value.type !== 'investor') throw malformed()
    return { kind, record: parseInvestor(value) }
  }
  if (kind === 'entrepreneur') {
    if (isRecord(value) && value.type !== 'entrepreneur') throw malformed()
    return { kind, record: parseEntrepreneur(value) }
  }
  return { kind, record: parseAdmin(value) }
}

function count(value: unknown, minimum: number) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum) throw malformed()
  return value
}

/** Every row must be of the requested kind and belong to the requested Whitelabel. */
export function parseAccountList(value: unknown, kind: AccountKind, whitelabelId: string): AccountListResult {
  if (!isRecord(value) || !Array.isArray(value.data) || !isRecord(value.meta)) throw malformed()
  const { meta } = value
  const result: AccountListResult = {
    rows: value.data.map((row) => parseRow(kind, row)),
    page: count(meta.page, 1),
    perPage: count(meta.perPage, 1),
    total: count(meta.total, 0),
    lastPage: Math.max(1, count(meta.lastPage, 0)),
  }
  if (
    result.perPage > 100 ||
    result.rows.length > result.perPage ||
    result.rows.length > result.total ||
    (result.page > result.lastPage && result.rows.length > 0) ||
    (result.total > 0 && result.page <= result.lastPage && result.rows.length === 0) ||
    result.lastPage !== Math.max(1, Math.ceil(result.total / result.perPage)) ||
    new Set(result.rows.map((row) => row.record.id)).size !== result.rows.length
  ) {
    throw malformed()
  }
  if (result.rows.some((row) => row.record.whitelabelId !== whitelabelId)) throw malformed('SCOPE_MISMATCH')
  return result
}

export function parseAccountDetail(value: unknown, kind: AccountKind): AccountDetail {
  if (kind === 'investor') {
    const inner = isRecord(value) && isRecord(value.data) ? value.data : value
    if (isRecord(inner) && inner.type !== 'investor') throw malformed()
    return { kind, record: parseInvestorDetail(value) }
  }
  if (kind === 'entrepreneur') {
    const inner = isRecord(value) && isRecord(value.data) ? value.data : value
    if (isRecord(inner) && inner.type !== 'entrepreneur') throw malformed()
    return { kind, record: parseEntrepreneurDetail(value) }
  }
  return { kind, record: parseAdmin(isRecord(value) && isRecord(value.data) ? value.data : value) }
}

/**
 * Core ids are positive integers in canonical form; anything else (prototype
 * `inv_proto_*`, `01`, `1e3`) is never sent and resolves to not-found.
 */
export const isServerAccountId = (id: string | undefined): id is string =>
  typeof id === 'string' && /^[1-9]\d{0,17}$/.test(id) && Number.isSafeInteger(Number(id))

/** Accounts never coerces zero, leading-zero, exponent or unsafe tenant ids. */
export const isAccountsWhitelabelId = (id: string | undefined): id is string =>
  isServerWhitelabelId(id) && isServerAccountId(id)

export type AccountListParams = { whitelabelId: string; kind: AccountKind; page: number; search: string }

/** Only `tipo`, `page`, `perPage` and `search` are sent (the supported keys). */
export async function listAccounts(params: AccountListParams, signal?: AbortSignal) {
  if (!isAccountsWhitelabelId(params.whitelabelId)) throw new ApiError(404, { code: 'INVALID_WHITELABEL_ID' })
  const body = await authenticatedGet(`/whitelabels/${encodeURIComponent(params.whitelabelId)}/accounts`, {
    signal,
    query: { tipo: kindMeta(params.kind).tipo, page: params.page, perPage: ACCOUNT_PAGE_SIZE, search: params.search || undefined },
  })
  const result = parseAccountList(body, params.kind, params.whitelabelId)
  if (result.page !== params.page || result.perPage !== ACCOUNT_PAGE_SIZE) throw malformed()
  return result
}

export type AccountRef = { whitelabelId: string; kind: AccountKind; accountId: string }

/** Detail inside the tenant; the Core answers 404 for an account of another Whitelabel. */
export async function getAccount(ref: AccountRef, signal?: AbortSignal) {
  if (!isAccountsWhitelabelId(ref.whitelabelId)) throw new ApiError(404, { code: 'INVALID_WHITELABEL_ID' })
  if (!isServerAccountId(ref.accountId)) throw new ApiError(404, { code: 'INVALID_ACCOUNT_ID' })
  const body = await authenticatedGet(
    `/whitelabels/${encodeURIComponent(ref.whitelabelId)}/accounts/${encodeURIComponent(ref.accountId)}`,
    { signal, query: { tipo: kindMeta(ref.kind).tipo } },
  )
  const detail = parseAccountDetail(body, ref.kind)
  // Identity and tenant must be exactly the requested ones.
  if (detail.record.id !== ref.accountId || detail.record.whitelabelId !== ref.whitelabelId) throw malformed('SCOPE_MISMATCH')
  return detail
}

/* ---------- presentation (tokens as sent when unknown; never KYC, never Company) ---------- */

const INVITATION_META: Record<string, { label: string; tone: BusinessTone }> = {
  accepted: { label: 'Convite aceito', tone: 'positive' },
  pending: { label: 'Convite pendente', tone: 'pending' },
}

export function invitationMeta(value: string | null): { label: string; tone: BusinessTone } | null {
  if (!value) return null
  return Object.hasOwn(INVITATION_META, value) ? INVITATION_META[value] : { label: value, tone: 'neutral' }
}

/** Admin `businessState` has no defined meaning in the contract: shown as sent, neutral. */
export const rawTokenMeta = (value: string | null): { label: string; tone: BusinessTone } | null =>
  value ? { label: value, tone: 'neutral' } : null

/** Display name: the recorded full name, else the e-mail (admins have no name), else a neutral fallback. */
export function accountDisplayName(row: AccountRow | AccountDetail) {
  return row.record.fullName ?? row.record.email ?? 'Nome não informado'
}

export type AccessView = { label: string; tone: StatusTone }
