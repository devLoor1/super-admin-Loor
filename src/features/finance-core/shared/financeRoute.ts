import { buildHash } from '../../../app/routeQuery'
import {
  FINANCE_SEARCH_MAX_LENGTH,
  INVESTMENT_SORT_KEYS,
  INVESTMENT_STATUSES,
  MOVEMENT_CATEGORIES,
  MOVEMENT_KINDS,
  PAYMENT_SORT_KEYS,
  PAYMENT_STATUSES,
  WALLET_SORT_KEYS,
  isOneOf,
  isServerFinanceId,
  type InvestmentSortKey,
  type InvestmentStatus,
  type MovementCategory,
  type MovementKind,
  type PaymentSortKey,
  type PaymentStatus,
  type SortOrder,
  type WalletSortKey,
} from './financeApi'

/*
 * URL-backed Finance Read state. Every list filter mirrors a documented
 * Backend query parameter, so reload, Back / Forward and direct links
 * reproduce the same server request. Invalid values are reported and
 * dropped — they are never sent.
 *
 *   #/finance/investments?status=&whitelabel=&investidor=&oportunidade=&search=&page=&sort=&order=
 *   #/finance/payments?   (same keys; Payment statuses)
 *   #/finance/wallets?search=&page=&sort=&order=
 *   #/finance/wallets/:id?aba=&mpage=&tipo=&categoria=&oportunidade=&ipage=&istatus=&movimento=
 */

export type RawParams = Record<string, string | undefined>

/** URL params handed to the Investments / Payments list pages by the router (validated by the page). */
export type FinanceListProps = {
  status?: string
  whitelabel?: string
  investidor?: string
  oportunidade?: string
  search?: string
  page?: string
  sort?: string
  order?: string
  /** Prototype-era `?wallet=` link parameter: reported as ignored, never mapped to a filter. */
  wallet?: string
  /** Raw query string: identity of the URL-backed context (scroll restore, search draft). */
  routeKey?: string
}

/** URL params handed to the Wallets list page by the router (validated by the page). */
export type WalletListProps = Pick<FinanceListProps, 'search' | 'page' | 'sort' | 'order' | 'routeKey'>

const clip = (value: string) => (value.length > 32 ? `${value.slice(0, 32)}…` : value)

function pageParam(value: string | undefined, label: string, ignored: string[]) {
  if (value === undefined) return 1
  if (/^[1-9]\d{0,5}$/.test(value)) return Number(value)
  ignored.push(`${label} "${clip(value)}"`)
  return 1
}

function idParam(value: string | undefined, label: string, ignored: string[]) {
  if (value === undefined) return undefined
  if (isServerFinanceId(value)) return value
  ignored.push(`${label} "${clip(value)}"`)
  return undefined
}

function enumParam<T extends string>(list: readonly T[], value: string | undefined, label: string, ignored: string[]) {
  if (value === undefined) return undefined
  if (isOneOf(list, value)) return value
  ignored.push(`${label} "${clip(value)}"`)
  return undefined
}

function orderParam(value: string | undefined, ignored: string[]): SortOrder {
  if (value === undefined) return 'desc'
  if (value === 'asc' || value === 'desc') return value
  ignored.push(`direção "${clip(value)}"`)
  return 'desc'
}

const searchParam = (value: string | undefined) => (value ?? '').trim().slice(0, FINANCE_SEARCH_MAX_LENGTH)
const pageText = (page: number | undefined) => (page && page > 1 ? String(page) : undefined)

/* ---------- Investments / Payments lists ---------- */

type ListBase = {
  page: number
  search: string
  whitelabelId?: string
  investorId?: string
  opportunityId?: string
  order: SortOrder
}
export type InvestmentListRoute = ListBase & { status?: InvestmentStatus; sort: InvestmentSortKey }
export type PaymentListRoute = ListBase & { status?: PaymentStatus; sort: PaymentSortKey }

function parseListBase(params: RawParams, ignored: string[]) {
  // The prototype linked lists by `?wallet=`; no Backend filter matches it, so it is only reported.
  if (params.wallet !== undefined) ignored.push(`wallet "${clip(params.wallet)}"`)
  return {
    page: pageParam(params.page, 'página', ignored),
    search: searchParam(params.search),
    whitelabelId: idParam(params.whitelabel, 'Whitelabel', ignored),
    investorId: idParam(params.investidor, 'investidor', ignored),
    opportunityId: idParam(params.oportunidade, 'oportunidade', ignored),
    order: orderParam(params.order, ignored),
  }
}

export function parseInvestmentListRoute(params: RawParams) {
  const ignored: string[] = []
  const state: InvestmentListRoute = {
    ...parseListBase(params, ignored),
    status: enumParam(INVESTMENT_STATUSES, params.status, 'status', ignored),
    sort: enumParam(INVESTMENT_SORT_KEYS, params.sort, 'ordenação', ignored) ?? 'createdAt',
  }
  return { state, ignored }
}

export function parsePaymentListRoute(params: RawParams) {
  const ignored: string[] = []
  const state: PaymentListRoute = {
    ...parseListBase(params, ignored),
    status: enumParam(PAYMENT_STATUSES, params.status, 'status', ignored),
    sort: enumParam(PAYMENT_SORT_KEYS, params.sort, 'ordenação', ignored) ?? 'createdAt',
  }
  return { state, ignored }
}

function listParams(state: Partial<InvestmentListRoute | PaymentListRoute>) {
  return {
    status: state.status,
    whitelabel: state.whitelabelId,
    investidor: state.investorId,
    oportunidade: state.opportunityId,
    search: state.search?.trim() || undefined,
    sort: state.sort && state.sort !== 'createdAt' ? state.sort : undefined,
    order: state.order && state.order !== 'desc' ? state.order : undefined,
    page: pageText(state.page),
  }
}

export const investmentsHref = (state: Partial<InvestmentListRoute> = {}) => buildHash('finance/investments', listParams(state))
export const paymentsHref = (state: Partial<PaymentListRoute> = {}) => buildHash('finance/payments', listParams(state))

/* ---------- Wallets list ---------- */

export type WalletListRoute = { page: number; search: string; sort: WalletSortKey; order: SortOrder }

export function parseWalletListRoute(params: RawParams) {
  const ignored: string[] = []
  const sort = enumParam(WALLET_SORT_KEYS, params.sort, 'ordenação', ignored) ?? 'name'
  const state: WalletListRoute = {
    page: pageParam(params.page, 'página', ignored),
    search: searchParam(params.search),
    sort,
    order: params.order === undefined ? (sort === 'name' ? 'asc' : 'desc') : orderParam(params.order, ignored),
  }
  return { state, ignored }
}

export function walletsHref(state: Partial<WalletListRoute> = {}) {
  const sort = state.sort ?? 'name'
  const defaultOrder = sort === 'name' ? 'asc' : 'desc'
  return buildHash('finance/wallets', {
    search: state.search?.trim() || undefined,
    sort: sort !== 'name' ? sort : undefined,
    order: state.order && state.order !== defaultOrder ? state.order : undefined,
    page: pageText(state.page),
  })
}

/* ---------- Wallet detail ---------- */

export const WALLET_TABS = ['visao-geral', 'movimentacoes', 'investimentos', 'atividade'] as const
export type WalletTab = (typeof WALLET_TABS)[number]

export type WalletDetailRoute = {
  tab: WalletTab
  movementPage: number
  kind?: MovementKind
  category?: MovementCategory
  opportunityId?: string
  investmentPage: number
  investmentStatus?: InvestmentStatus
  movementId?: string
  returnTo?: string
}

export function parseWalletDetailRoute(params: RawParams) {
  const ignored: string[] = []
  const state: WalletDetailRoute = {
    tab: enumParam(WALLET_TABS, params.aba, 'aba', ignored) ?? 'visao-geral',
    movementPage: pageParam(params.mpage, 'página de movimentações', ignored),
    kind: enumParam(MOVEMENT_KINDS, params.tipo, 'tipo', ignored),
    category: enumParam(MOVEMENT_CATEGORIES, params.categoria, 'categoria', ignored),
    opportunityId: idParam(params.oportunidade, 'oportunidade', ignored),
    investmentPage: pageParam(params.ipage, 'página de investimentos', ignored),
    investmentStatus: enumParam(INVESTMENT_STATUSES, params.istatus, 'status do investimento', ignored),
    movementId: movementParam(params.movimento, ignored),
    returnTo: params.returnTo,
  }
  return { state, ignored }
}

/** Movement ids are composite strings (`investment:103`); an implausible value is reported, never kept. */
function movementParam(value: string | undefined, ignored: string[]) {
  if (value === undefined) return undefined
  if (/^[a-z][a-z0-9_]{0,39}:[A-Za-z0-9_-]{1,39}$/.test(value)) return value
  ignored.push(`movimentação "${clip(value)}"`)
  return undefined
}

export function walletHref(id: string, state: Partial<WalletDetailRoute> = {}) {
  return buildHash(`finance/wallets/${encodeURIComponent(id)}`, {
    aba: state.tab && state.tab !== 'visao-geral' ? state.tab : undefined,
    mpage: pageText(state.movementPage),
    tipo: state.kind,
    categoria: state.category,
    oportunidade: state.opportunityId,
    ipage: pageText(state.investmentPage),
    istatus: state.investmentStatus,
    movimento: state.movementId,
    returnTo: walletReturnParam(state.returnTo),
  })
}

function walletReturnParam(context: string | undefined) {
  if (!context) return undefined
  const back = walletListReturnHash(context)
  return back === '#/finance/wallets' ? undefined : back
}

/* ---------- detail ↔ list return context (only the module's own list routes are allowed) ---------- */

function returnHash(prefix: 'investments' | 'payments' | 'wallets', context: string | undefined) {
  const fallback = `#/finance/${prefix}`
  if (!context || !new RegExp(`^#/finance/${prefix}(?:\\?|$)`).test(context)) return fallback
  const params = Object.fromEntries(new URLSearchParams(context.split('?')[1] ?? ''))
  if (prefix === 'investments') return investmentsHref(parseInvestmentListRoute(params).state)
  if (prefix === 'payments') return paymentsHref(parsePaymentListRoute(params).state)
  return walletsHref(parseWalletListRoute(params).state)
}

export const investmentListReturnHash = (context?: string) => returnHash('investments', context)
export const paymentListReturnHash = (context?: string) => returnHash('payments', context)
export const walletListReturnHash = (context?: string) => returnHash('wallets', context)

function detailHref(path: string, prefix: 'investments' | 'payments', context?: string) {
  const back = returnHash(prefix, context)
  return buildHash(path, { returnTo: back === `#/finance/${prefix}` ? undefined : back })
}

export const investmentHref = (id: string, listContext?: string) => detailHref(`finance/investments/${encodeURIComponent(id)}`, 'investments', listContext)
export const paymentHref = (id: string, listContext?: string) => detailHref(`finance/payments/${encodeURIComponent(id)}`, 'payments', listContext)

/** Operation › Investidores reads the Core Investor by the same numeric id. */
export const investorProfileHref = (id: string) => `#/operation/investors/${encodeURIComponent(id)}`
/** Whitelabel registry (Plataformas › Whitelabels) by Core id. */
export const whitelabelRecordHref = (id: string) => `#/whitelabels?id=${encodeURIComponent(id)}`
