import { ApiError } from '../../../lib/api'
import { authenticatedGet } from '../../../lib/apiClient'

/*
 * FINANCE READ V1 — authoritative read adapters (GET only).
 *
 * Control Plane (Nest `backend-super-admin-Loor` `aea5392`, Finance changes in
 * `b414963`) → Core `/internal/super-admin/v1/{investments|payments|wallets}`,
 * passed through by Nest without mapping. Contract: Backend
 * `docs/finance-read-contract-v1.md`, checked against the source and against
 * live homolog GETs on 2026-10-17 (structure only — docs/finance-read-integration-v1.md):
 *
 *   GET /investments                 { data, meta, money }           filters: search, status, whitelabelId, investorId, opportunityId; sort createdAt|updatedAt|status
 *   GET /investments/:id             { data, money }                 + anonymous, riskAcceptanceAt, investor, opportunity, payment
 *   GET /payments                    { data, meta, money, domain }   filters: search, status, whitelabelId, investorId, opportunityId; sort createdAt|updatedAt|status|amount
 *   GET /payments/:id                { data, money, domain }         + expirationAt, liquidationAt, externalEndToEndId
 *   GET /wallets                     { data, meta, money, domain }   filters: search, whitelabelId; sort createdAt|name (others → 400)
 *   GET /wallets/:id                 { data, money }                 + summary (Backend aggregate); :id = whitelabelId
 *   GET /wallets/:id/movements       { data, meta, money, domain }   filters: kind, category, opportunityId; search/sort/order → 400
 *   GET /wallets/:id/investments     { data, meta, money }           alias of /investments?whitelabelId=:id (server-forced)
 *
 * Roles (source): SUPER_ADMIN, FINANCIAL_ADMIN, READ_ONLY. Money: integer
 * centavos in BRL, declared by every envelope (`money`). Amounts are never
 * signed; a movement's direction is `kind`. Unknown query keys → 400.
 *
 * Parsing is strict on identity, money and privacy (a response that fails
 * them is rejected as a whole — nothing partial is shown) and tolerant on
 * display text (missing → null → "não informado"). No value is ever filled
 * from prototype data, and nothing here can write.
 */

export const FINANCE_PAGE_SIZE = 20
export const FINANCE_SEARCH_MAX_LENGTH = 120

/* ---------- vocabularies (Backend enums; filters only offer these) ---------- */

export const INVESTMENT_STATUSES = ['waiting_payment', 'processing', 'paid', 'processing_refund', 'refunded', 'expired', 'failed'] as const
export type InvestmentStatus = (typeof INVESTMENT_STATUSES)[number]

export const PAYMENT_STATUSES = ['waiting_payment', 'paid', 'expired', 'refunded'] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export const MOVEMENT_KINDS = ['in', 'out'] as const
export type MovementKind = (typeof MOVEMENT_KINDS)[number]

export const MOVEMENT_CATEGORIES = ['investment_paid', 'installment_paid', 'refund', 'entrepreneur_cashout', 'investor_payout'] as const
export type MovementCategory = (typeof MOVEMENT_CATEGORIES)[number]

/** Sort keys the Backend documents. Others are silently ignored (Investments / Payments) or rejected (Wallets) — never sent. */
export const INVESTMENT_SORT_KEYS = ['createdAt', 'updatedAt', 'status'] as const
export type InvestmentSortKey = (typeof INVESTMENT_SORT_KEYS)[number]
export const PAYMENT_SORT_KEYS = ['createdAt', 'updatedAt', 'status', 'amount'] as const
export type PaymentSortKey = (typeof PAYMENT_SORT_KEYS)[number]
export const WALLET_SORT_KEYS = ['createdAt', 'name'] as const
export type WalletSortKey = (typeof WALLET_SORT_KEYS)[number]
export type SortOrder = 'asc' | 'desc'

export const isOneOf = <T extends string>(list: readonly T[], value: unknown): value is T =>
  typeof value === 'string' && (list as readonly string[]).includes(value)

/* ---------- records ---------- */

export type InvestmentRecord = {
  /** Core ids (numbers on the wire), kept as strings. */
  id: string
  whitelabelId: string
  investorId: string
  opportunityId: string
  /** Integer centavos. `null` = no amount (e.g. failed investments) — NEVER zero. */
  amountCents: number | null
  currency: 'BRL'
  quoteQuantity: number | null
  /** Backend token; unknown tokens are kept and shown as sent. */
  status: string
  createdAt: string | null
  updatedAt: string | null
}

export type InvestmentPaymentSummary = {
  id: string
  status: string
  provider: string | null
  amountCents: number
  paymentAt: string | null
}

export type InvestmentDetail = InvestmentRecord & {
  anonymous: boolean | null
  riskAcceptanceAt: string | null
  investor: { id: string; fullName: string | null; email: string | null } | null
  opportunity: { id: string; name: string | null } | null
  /** `null` when no payment exists (e.g. failed). Payment status is NOT the investment status. */
  payment: InvestmentPaymentSummary | null
}

export type PaymentRecord = {
  id: string
  whitelabelId: string
  investmentId: string
  investorId: string
  opportunityId: string
  amountCents: number
  currency: 'BRL'
  paymentMethod: string | null
  type: string | null
  provider: string | null
  status: string
  txid: string | null
  paymentAt: string | null
  createdAt: string | null
  updatedAt: string | null
}

export type PaymentDetail = PaymentRecord & {
  expirationAt: string | null
  liquidationAt: string | null
  externalEndToEndId: string | null
}

export type WalletRecord = {
  /** `:id` of `/wallets/:id` — by contract equal to `whitelabelId` (checked on every row). */
  id: string
  whitelabelId: string
  ownerType: 'whitelabel'
  ownerId: string
  name: string | null
  slug: string | null
  currency: 'BRL'
  /** Backend authoritative balance in centavos; `null` = unavailable (never shown as zero, never computed here). */
  authoritativeBalanceCents: number | null
  balanceTimestamp: string | null
  createdAt: string | null
  updatedAt: string | null
}

/** Backend aggregate, shown as sent. A missing value is unavailable (never zero, never recomputed here). */
export type WalletSummary = {
  totalInCents: number | null
  totalOutCents: number | null
  authoritativeBalanceCents: number | null
  countIn: number | null
  countOut: number | null
}

export type WalletDetail = WalletRecord & { summary: WalletSummary | null }

export type MovementRecord = {
  /** Composite string id (`investment:103`, `refund:12`, …). */
  id: string
  kind: MovementKind
  category: string
  /** Positive magnitude in centavos; the direction is `kind`. */
  amountCents: number
  currency: 'BRL'
  date: string | null
  description: string | null
  counterparty: { type: string | null; name: string | null; document: string | null } | null
  opportunity: { id: string; name: string | null } | null
  reference: Record<string, string | number | null>
  provider: string | null
  /** Opaque source status (not a global enum). */
  status: string | null
}

export type PagedResult<T> = { rows: T[]; page: number; perPage: number; total: number; lastPage: number }

/* ---------- parsing helpers ---------- */

/** Codes of a response rejected by the client (shown with specific copy; never partially displayed). */
export type FinanceRejection =
  | 'MONEY_UNIT_MISMATCH'
  | 'UNMASKED_DOCUMENT'
  | 'SCOPE_MISMATCH'
  | 'IDENTITY_MISMATCH'
  | 'WALLET_IDENTITY_MISMATCH'
  | 'BALANCE_MISMATCH'

const malformed = (code?: FinanceRejection) => new ApiError(200, code ? { code } : {}, { kind: 'malformed' })

function fail(code?: FinanceRejection): never {
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

function requiredId(value: unknown) {
  const id = numericId(value)
  if (!id) throw malformed()
  return id
}

/** Integer centavos ≥ 0 (amounts are never signed). */
function cents(value: unknown) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw malformed()
  return value
}

/** A balance position: integer centavos (the Backend decides its sign; never recomputed here). */
function signedCents(value: unknown) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) throw malformed()
  return value
}

/** `null` stays `null` (unavailable); anything else must be valid centavos. */
function nullableCents(value: unknown) {
  return value === null || value === undefined ? null : cents(value)
}

function currency(value: unknown): 'BRL' {
  if (value !== 'BRL') throw malformed('MONEY_UNIT_MISMATCH')
  return 'BRL'
}

/** Every envelope declares the unit; anything but BRL centavos would make every amount ambiguous. */
function assertMoney(body: Record<string, unknown>) {
  const money = body.money
  if (!isRecord(money) || money.currency !== 'BRL' || money.unit !== 'centavos') throw malformed('MONEY_UNIT_MISMATCH')
}

function count(value: unknown, minimum: number) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum) throw malformed()
  return value
}

/**
 * A masked document as the Backend sends it (`***.***.***-12`, or a CNPJ masked the same way):
 * at least 3 masked positions, no more visible digits than masked ones and at
 * most 6 visible digits. Blank / absent is not a document. A full or barely
 * masked CPF / CNPJ rejects the WHOLE response: it is never rendered, stored or
 * logged, and frontend masking is not accepted as a substitute for the Backend's.
 */
export function isMaskedDocument(value: unknown) {
  if (value === null || value === undefined) return true
  if (typeof value !== 'string') return false
  if (value.trim() === '') return true
  const digits = value.replace(/\D/g, '').length
  const masked = (value.match(/[*•x]/gi) ?? []).length
  return masked >= 3 && digits <= masked && digits <= 6
}

/** A CPF / CNPJ written anywhere else (dots, spaces, hyphen or a bare 11 / 14-digit run) is an unmasked document as well. */
const CPF_PATTERN = '\\d{3}[.\\s]?\\d{3}[.\\s]?\\d{3}[-.\\s]?\\d{2}'
const CNPJ_PATTERN = '\\d{2}[.\\s]?\\d{3}[.\\s]?\\d{3}[/\\s]?\\d{4}[-.\\s]?\\d{2}'
const DOCUMENT_IN_TEXT = new RegExp(`(?<!\\d)(?:${CPF_PATTERN}|${CNPJ_PATTERN})(?!\\d)`)
/** A transaction reference that IS a document (nothing else around it). */
const DOCUMENT_ONLY = new RegExp(`^\\D{0,3}(?:${CPF_PATTERN}|${CNPJ_PATTERN})\\D{0,3}$`)

function assertNoDocumentInText(...values: unknown[]) {
  if (values.some((value) => (typeof value === 'string' || typeof value === 'number') && DOCUMENT_IN_TEXT.test(String(value)))) fail('UNMASKED_DOCUMENT')
}

function parsePage<T>(body: unknown, parseRow: (value: unknown) => T, rowId: (row: T) => string, options: { clamped?: boolean } = {}): PagedResult<T> {
  if (!isRecord(body) || !Array.isArray(body.data) || !isRecord(body.meta)) throw malformed()
  const { meta } = body
  const page = count(meta.page, 1)
  const perPage = count(meta.perPage, 1)
  const total = count(meta.total, 0)
  const lastPage = Math.max(1, count(meta.lastPage, 0))
  // Structure first, then the money declaration, then the rows.
  assertMoney(body)
  const result: PagedResult<T> = { rows: body.data.map(parseRow), page, perPage, total, lastPage }
  const expectedLast = Math.max(1, Math.ceil(result.total / result.perPage))
  if (
    result.rows.length > result.perPage ||
    result.rows.length > result.total ||
    result.lastPage !== expectedLast ||
    (result.total > 0 && result.page <= result.lastPage && result.rows.length === 0) ||
    (options.clamped === true && result.page > result.lastPage) ||
    new Set(result.rows.map(rowId)).size !== result.rows.length
  ) {
    throw malformed()
  }
  return result
}

/** A detail envelope: `{ data, money }` (direct objects are not accepted: the money declaration is required). */
function detailData(body: unknown) {
  if (!isRecord(body) || !isRecord(body.data)) throw malformed()
  assertMoney(body)
  return body.data
}

/* ---------- investments ---------- */

export function parseInvestment(value: unknown): InvestmentRecord {
  if (!isRecord(value)) throw malformed()
  const quote = value.quoteQuantity
  return {
    id: requiredId(value.id),
    whitelabelId: requiredId(value.whitelabelId),
    investorId: requiredId(value.investorId),
    opportunityId: requiredId(value.opportunityId),
    amountCents: nullableCents(value.amountCents),
    currency: currency(value.currency),
    quoteQuantity: typeof quote === 'number' && Number.isFinite(quote) && quote >= 0 ? quote : null,
    status: requiredToken(value.status),
    createdAt: date(value.createdAt),
    updatedAt: date(value.updatedAt),
  }
}

export function parseInvestmentDetail(body: unknown): InvestmentDetail {
  const data = detailData(body)
  const base = parseInvestment(data)
  const investor = isRecord(data.investor) ? data.investor : null
  const opportunity = isRecord(data.opportunity) ? data.opportunity : null
  const payment = isRecord(data.payment) ? data.payment : null
  // Embedded relations must describe the record's own references.
  if (investor && numericId(investor.id) !== base.investorId) throw malformed('IDENTITY_MISMATCH')
  if (opportunity && numericId(opportunity.id) !== base.opportunityId) throw malformed('IDENTITY_MISMATCH')
  assertNoDocumentInText(investor?.fullName, opportunity?.name)
  return {
    ...base,
    anonymous: typeof data.anonymous === 'boolean' ? data.anonymous : null,
    riskAcceptanceAt: date(data.riskAcceptanceAt),
    investor: investor ? { id: base.investorId, fullName: text(investor.fullName), email: text(investor.email) } : null,
    opportunity: opportunity ? { id: base.opportunityId, name: text(opportunity.name) } : null,
    payment: payment
      ? {
          id: requiredId(payment.id),
          status: requiredToken(payment.status),
          provider: token(payment.provider),
          amountCents: cents(payment.amountCents),
          paymentAt: date(payment.paymentAt),
        }
      : null,
  }
}

export type InvestmentQuery = {
  page: number
  search: string
  status?: InvestmentStatus
  whitelabelId?: string
  investorId?: string
  opportunityId?: string
  sort: InvestmentSortKey
  order: SortOrder
  perPage?: number
}

/** Rows that contradict an applied server filter mean the filter cannot be trusted: nothing is shown. */
function assertScope<T>(rows: T[], checks: [keyof T, string | undefined][]) {
  for (const [key, expected] of checks) {
    if (expected !== undefined && rows.some((row) => row[key] !== expected)) throw malformed('SCOPE_MISMATCH')
  }
}

function investmentQuery(params: Omit<InvestmentQuery, 'whitelabelId'>) {
  return {
    page: params.page,
    perPage: params.perPage ?? FINANCE_PAGE_SIZE,
    search: params.search || undefined,
    status: params.status,
    investorId: params.investorId,
    opportunityId: params.opportunityId,
    sort: params.sort,
    order: params.order,
  }
}

export async function listInvestments(params: InvestmentQuery, signal?: AbortSignal) {
  for (const id of [params.whitelabelId, params.investorId, params.opportunityId]) {
    if (id !== undefined && !isServerFinanceId(id)) throw new ApiError(400, { code: 'INVALID_FILTER' })
  }
  const body = await authenticatedGet('/investments', { signal, query: { ...investmentQuery(params), whitelabelId: params.whitelabelId } })
  const result = parsePage(body, parseInvestment, (row) => row.id)
  assertScope(result.rows, [['whitelabelId', params.whitelabelId], ['investorId', params.investorId], ['opportunityId', params.opportunityId], ['status', params.status]])
  return result
}

export async function getInvestment(id: string, signal?: AbortSignal) {
  if (!isServerFinanceId(id)) throw new ApiError(404, { code: 'INVALID_FINANCE_ID' })
  const detail = parseInvestmentDetail(await authenticatedGet(`/investments/${encodeURIComponent(id)}`, { signal }))
  if (detail.id !== id) throw malformed('IDENTITY_MISMATCH')
  return detail
}

/* ---------- payments ---------- */

export function parsePayment(value: unknown): PaymentRecord {
  if (!isRecord(value)) throw malformed()
  return {
    id: requiredId(value.id),
    whitelabelId: requiredId(value.whitelabelId),
    investmentId: requiredId(value.investmentId),
    investorId: requiredId(value.investorId),
    opportunityId: requiredId(value.opportunityId),
    amountCents: cents(value.amountCents),
    currency: currency(value.currency),
    paymentMethod: token(value.paymentMethod),
    type: token(value.type),
    provider: token(value.provider),
    status: requiredToken(value.status),
    txid: text(value.txid),
    paymentAt: date(value.paymentAt),
    createdAt: date(value.createdAt),
    updatedAt: date(value.updatedAt),
  }
}

export function parsePaymentDetail(body: unknown): PaymentDetail {
  const data = detailData(body)
  return {
    ...parsePayment(data),
    expirationAt: date(data.expirationAt),
    liquidationAt: date(data.liquidationAt),
    externalEndToEndId: text(data.externalEndToEndId),
  }
}

export type PaymentQuery = {
  page: number
  search: string
  status?: PaymentStatus
  whitelabelId?: string
  investorId?: string
  opportunityId?: string
  sort: PaymentSortKey
  order: SortOrder
  perPage?: number
}

export async function listPayments(params: PaymentQuery, signal?: AbortSignal) {
  for (const id of [params.whitelabelId, params.investorId, params.opportunityId]) {
    if (id !== undefined && !isServerFinanceId(id)) throw new ApiError(400, { code: 'INVALID_FILTER' })
  }
  const body = await authenticatedGet('/payments', {
    signal,
    query: {
      page: params.page,
      perPage: params.perPage ?? FINANCE_PAGE_SIZE,
      search: params.search || undefined,
      status: params.status,
      whitelabelId: params.whitelabelId,
      investorId: params.investorId,
      opportunityId: params.opportunityId,
      sort: params.sort,
      order: params.order,
    },
  })
  const result = parsePage(body, parsePayment, (row) => row.id)
  assertScope(result.rows, [['whitelabelId', params.whitelabelId], ['investorId', params.investorId], ['opportunityId', params.opportunityId], ['status', params.status]])
  return result
}

export async function getPayment(id: string, signal?: AbortSignal) {
  if (!isServerFinanceId(id)) throw new ApiError(404, { code: 'INVALID_FINANCE_ID' })
  const detail = parsePaymentDetail(await authenticatedGet(`/payments/${encodeURIComponent(id)}`, { signal }))
  if (detail.id !== id) throw malformed('IDENTITY_MISMATCH')
  return detail
}

/* ---------- wallets ---------- */

export function parseWallet(value: unknown): WalletRecord {
  if (!isRecord(value)) throw malformed()
  const id = requiredId(value.id)
  const whitelabelId = requiredId(value.whitelabelId)
  const ownerId = requiredId(value.ownerId)
  // Contract: one wallet per Whitelabel, `:id` = whitelabelId = ownerId. Anything else is an unknown identity model.
  if (value.ownerType !== 'whitelabel' || id !== whitelabelId || ownerId !== whitelabelId) throw malformed('WALLET_IDENTITY_MISMATCH')
  const balance = value.authoritativeBalanceCents
  return {
    id,
    whitelabelId,
    ownerType: 'whitelabel',
    ownerId,
    name: text(value.name),
    slug: text(value.slug),
    currency: currency(value.currency),
    authoritativeBalanceCents: balance === null || balance === undefined ? null : signedCents(balance),
    balanceTimestamp: date(value.balanceTimestamp),
    createdAt: date(value.createdAt),
    updatedAt: date(value.updatedAt),
  }
}

export function parseWalletDetail(body: unknown): WalletDetail {
  const data = detailData(body)
  const base = parseWallet(data)
  let summary: WalletSummary | null = null
  if (isRecord(data.summary)) {
    const raw = data.summary
    const balance = raw.authoritativeBalanceCents
    summary = {
      totalInCents: nullableCents(raw.totalInCents),
      totalOutCents: nullableCents(raw.totalOutCents),
      authoritativeBalanceCents: balance === null || balance === undefined ? null : signedCents(balance),
      countIn: raw.countIn === null || raw.countIn === undefined ? null : count(raw.countIn, 0),
      countOut: raw.countOut === null || raw.countOut === undefined ? null : count(raw.countOut, 0),
    }
    // Two "authoritative" balances for one wallet that disagree (including one missing): show neither.
    if (summary.authoritativeBalanceCents !== base.authoritativeBalanceCents) throw malformed('BALANCE_MISMATCH')
  }
  return { ...base, summary }
}

export type WalletQuery = { page: number; search: string; sort: WalletSortKey; order: SortOrder; perPage?: number }

export async function listWallets(params: WalletQuery, signal?: AbortSignal) {
  const body = await authenticatedGet('/wallets', {
    signal,
    query: { page: params.page, perPage: params.perPage ?? FINANCE_PAGE_SIZE, search: params.search || undefined, sort: params.sort, order: params.order },
  })
  return parsePage(body, parseWallet, (row) => row.id)
}

export async function getWallet(id: string, signal?: AbortSignal) {
  if (!isServerFinanceId(id)) throw new ApiError(404, { code: 'INVALID_FINANCE_ID' })
  const detail = parseWalletDetail(await authenticatedGet(`/wallets/${encodeURIComponent(id)}`, { signal }))
  if (detail.id !== id) throw malformed('WALLET_IDENTITY_MISMATCH')
  return detail
}

/** Tenant names for Finance screens: the wallet projection carries each Whitelabel's name (readable by every Finance role). */
export async function listFinanceTenants(signal?: AbortSignal) {
  return listWallets({ page: 1, search: '', sort: 'name', order: 'asc', perPage: 100 }, signal)
}

/* ---------- wallet movements ---------- */

/** Transaction references (opaque ids, shown partially): letters and digits mix freely, so only a whole-value document is refused. */
const TRANSACTION_REFERENCE_KEY = /txid|end_to_end|endtoend|e2e/i
const DOCUMENT_REFERENCE_KEY = /document|cpf|cnpj|tax/i

/** Free-form origin references (keys vary by category). Every value passes the same privacy gate as the counterparty document. */
function reference(value: unknown): Record<string, string | number | null> {
  if (!isRecord(value)) return {}
  const out: Record<string, string | number | null> = {}
  for (const [key, item] of Object.entries(value)) {
    if (!/^[a-z][a-z0-9_]{0,39}$/.test(key)) continue
    if (item === null) {
      out[key] = null
      continue
    }
    if (typeof item !== 'string' && !(typeof item === 'number' && Number.isFinite(item))) continue
    const textValue = String(item)
    if (DOCUMENT_REFERENCE_KEY.test(key) && !isMaskedDocument(textValue)) fail('UNMASKED_DOCUMENT')
    if (TRANSACTION_REFERENCE_KEY.test(key) ? DOCUMENT_ONLY.test(textValue) : DOCUMENT_IN_TEXT.test(textValue)) fail('UNMASKED_DOCUMENT')
    out[key] = item
  }
  return out
}

export function parseMovement(value: unknown): MovementRecord {
  if (!isRecord(value)) throw malformed()
  const id = text(value.id)
  if (!id || id.length > 80) throw malformed()
  if (!isOneOf(MOVEMENT_KINDS, value.kind)) throw malformed()
  const counterparty = isRecord(value.counterparty) ? value.counterparty : null
  if (counterparty && !isMaskedDocument(counterparty.document)) throw malformed('UNMASKED_DOCUMENT')
  const opportunity = isRecord(value.opportunity) ? value.opportunity : null
  assertNoDocumentInText(value.description, counterparty?.name, opportunity?.name, value.status)
  return {
    id,
    kind: value.kind,
    category: requiredToken(value.category),
    amountCents: cents(value.amountCents),
    currency: currency(value.currency),
    date: date(value.date),
    description: text(value.description),
    counterparty: counterparty
      ? { type: token(counterparty.type), name: text(counterparty.name), document: text(counterparty.document) }
      : null,
    opportunity: opportunity && numericId(opportunity.id) ? { id: numericId(opportunity.id)!, name: text(opportunity.name) } : null,
    reference: reference(value.reference),
    provider: token(value.provider),
    // Source statuses are opaque free text, not restricted to the other domains' token grammar.
    status: text(value.status),
  }
}

export type MovementQuery = { page: number; kind?: MovementKind; category?: MovementCategory; opportunityId?: string }

/** `search` / `sort` / `order` are rejected by the Backend and never sent. A page past the end is clamped by the server (`meta.page`). */
export async function listWalletMovements(walletId: string, params: MovementQuery, signal?: AbortSignal) {
  if (!isServerFinanceId(walletId)) throw new ApiError(404, { code: 'INVALID_FINANCE_ID' })
  if (params.opportunityId !== undefined && !isServerFinanceId(params.opportunityId)) throw new ApiError(400, { code: 'INVALID_FILTER' })
  const body = await authenticatedGet(`/wallets/${encodeURIComponent(walletId)}/movements`, {
    signal,
    query: { page: params.page, perPage: FINANCE_PAGE_SIZE, kind: params.kind, category: params.category, opportunityId: params.opportunityId },
  })
  const result = parsePage(body, parseMovement, (row) => row.id, { clamped: true })
  assertScope(result.rows, [['kind', params.kind], ['category', params.category]])
  if (params.opportunityId !== undefined && result.rows.some((row) => row.opportunity?.id !== params.opportunityId)) throw malformed('SCOPE_MISMATCH')
  return result
}

/* ---------- wallet investments (alias) ---------- */

export type WalletInvestmentQuery = { page: number; status?: InvestmentStatus; sort: InvestmentSortKey; order: SortOrder }

/** `GET /wallets/:id/investments` — the server forces `whitelabelId = :id`; every row must carry it. */
export async function listWalletInvestments(walletId: string, params: WalletInvestmentQuery, signal?: AbortSignal) {
  if (!isServerFinanceId(walletId)) throw new ApiError(404, { code: 'INVALID_FINANCE_ID' })
  const body = await authenticatedGet(`/wallets/${encodeURIComponent(walletId)}/investments`, {
    signal,
    query: { page: params.page, perPage: FINANCE_PAGE_SIZE, status: params.status, sort: params.sort, order: params.order },
  })
  const result = parsePage(body, parseInvestment, (row) => row.id)
  assertScope(result.rows, [['whitelabelId', walletId], ['status', params.status]])
  return result
}

/* ---------- identity ---------- */

/** Finance Core ids are positive integers; anything else is never sent to the API. */
export function isServerFinanceId(id: string | undefined): id is string {
  return typeof id === 'string' && /^[1-9]\d{0,15}$/.test(id) && Number(id) <= Number.MAX_SAFE_INTEGER
}
