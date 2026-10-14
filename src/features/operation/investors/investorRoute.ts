import { buildHash } from '../../../app/routeQuery'
import { isServerWhitelabelId } from '../../whitelabels/whitelabelApi'

/*
 * URL-backed Investors context: `#/operation/investors?whitelabel=&page=&search=`.
 * `whitelabel` is a Core Whitelabel id and selects the server-scoped read;
 * page / search mirror the API query, so reload, Back / Forward and direct
 * links reproduce the same request.
 */

export const INVESTOR_SEARCH_MAX_LENGTH = 120

export type InvestorRouteState = {
  whitelabelId?: string
  page: number
  search: string
}

const clip = (value: string) => (value.length > 32 ? `${value.slice(0, 32)}…` : value)

/** Valid URL values apply; invalid ones are reported (and dropped on the next change). */
export function parseInvestorRoute(params: { whitelabel?: string; page?: string; search?: string }) {
  const ignored: string[] = []
  let whitelabelId: string | undefined
  if (params.whitelabel !== undefined) {
    if (isServerWhitelabelId(params.whitelabel)) whitelabelId = params.whitelabel
    else ignored.push(`Whitelabel "${clip(params.whitelabel)}"`)
  }
  let page = 1
  if (params.page !== undefined) {
    if (/^[1-9]\d{0,5}$/.test(params.page)) page = Number(params.page)
    else ignored.push(`página "${clip(params.page)}"`)
  }
  const search = (params.search ?? '').trim().slice(0, INVESTOR_SEARCH_MAX_LENGTH)
  const state: InvestorRouteState = { whitelabelId, page, search }
  return { state, ignored }
}

export function investorsHref(state: Partial<InvestorRouteState> = {}) {
  return buildHash('operation/investors', {
    whitelabel: state.whitelabelId,
    page: state.page && state.page > 1 ? String(state.page) : undefined,
    search: state.search?.trim() || undefined,
  })
}

const DEFAULT_LIST_HASH = '#/operation/investors'

/** Only this internal list route is an allowed return destination. */
export function investorListReturnHash(context?: string) {
  if (!context || !/^#\/operation\/investors(?:\?|$)/.test(context)) return DEFAULT_LIST_HASH
  const params = new URLSearchParams(context.split('?')[1] ?? '')
  const { state } = parseInvestorRoute({
    whitelabel: params.get('whitelabel') ?? undefined,
    page: params.get('page') ?? undefined,
    search: params.get('search') ?? undefined,
  })
  return investorsHref(state)
}

/** Persist the exact list context in the URL, including after detail reload. */
export function investorHref(id: string, listContext?: string) {
  const returnTo = investorListReturnHash(listContext)
  return buildHash(`operation/investors/${encodeURIComponent(id)}`, {
    returnTo: returnTo === DEFAULT_LIST_HASH ? undefined : returnTo,
  })
}
