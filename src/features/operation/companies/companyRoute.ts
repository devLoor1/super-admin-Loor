import { buildHash } from '../../../app/routeQuery'
import { isPositiveCoreId } from '../shared/coreIds'
import { COMPANY_SEARCH_MAX_LENGTH, COMPANY_SORT_KEYS, COMPANY_STATUSES, isOneOf, type CompanySortKey, type CompanyStatus, type SortOrder } from './companyApi'

/*
 * URL-backed Empresas context (contextual page under Operação ›
 * Empreendedores, no menu entry of its own):
 *
 *   #/operation/companies?whitelabel=&status=&search=&page=&sort=&order=
 *   #/operation/companies/:companyId?returnTo=
 *
 * Every filter mirrors a documented `GET /companies` parameter (`whitelabel`
 * is a Core Whitelabel id). The prototype-era `?previa=` state preview no
 * longer exists: it is reported as ignored and can never pin or fabricate a
 * state.
 */

export type CompanyListProps = {
  whitelabel?: string
  status?: string
  search?: string
  page?: string
  sort?: string
  order?: string
  previa?: string
  routeKey?: string
}

export type CompanyRouteState = {
  whitelabelId?: string
  status?: CompanyStatus
  page: number
  search: string
  sort: CompanySortKey
  order: SortOrder
}

const clip = (value: string) => (value.length > 32 ? `${value.slice(0, 32)}…` : value)

/** Valid URL values apply; invalid ones are reported (and dropped on the next change). */
export function parseCompanyRoute(params: Omit<CompanyListProps, 'routeKey'>) {
  const ignored: string[] = []
  let whitelabelId: string | undefined
  if (params.whitelabel !== undefined) {
    if (isPositiveCoreId(params.whitelabel)) whitelabelId = params.whitelabel
    else ignored.push(`Whitelabel "${clip(params.whitelabel)}"`)
  }
  let status: CompanyStatus | undefined
  if (params.status !== undefined) {
    if (isOneOf(COMPANY_STATUSES, params.status)) status = params.status
    else ignored.push(`status "${clip(params.status)}"`)
  }
  let page = 1
  if (params.page !== undefined) {
    if (/^[1-9]\d{0,5}$/.test(params.page)) page = Number(params.page)
    else ignored.push(`página "${clip(params.page)}"`)
  }
  let sort: CompanySortKey = 'createdAt'
  if (params.sort !== undefined) {
    if (isOneOf(COMPANY_SORT_KEYS, params.sort)) sort = params.sort
    else ignored.push(`ordenação "${clip(params.sort)}"`)
  }
  let order: SortOrder = 'desc'
  if (params.order !== undefined) {
    if (params.order === 'asc' || params.order === 'desc') order = params.order
    else ignored.push(`direção "${clip(params.order)}"`)
  }
  if (params.previa !== undefined) ignored.push(`prévia "${clip(params.previa)}"`)
  const search = (params.search ?? '').trim().slice(0, COMPANY_SEARCH_MAX_LENGTH)
  const state: CompanyRouteState = { whitelabelId, status, page, search, sort, order }
  return { state, ignored }
}

export function companiesHref(state: Partial<CompanyRouteState> = {}) {
  return buildHash('operation/companies', {
    whitelabel: state.whitelabelId,
    status: state.status,
    search: state.search?.trim() || undefined,
    sort: state.sort && state.sort !== 'createdAt' ? state.sort : undefined,
    order: state.order && state.order !== 'desc' ? state.order : undefined,
    page: state.page && state.page > 1 ? String(state.page) : undefined,
  })
}

const DEFAULT_LIST_HASH = '#/operation/companies'

/** Only this internal list route is an allowed return destination (re-parsed: invalid values never survive). */
export function companyListReturnHash(context?: string) {
  if (!context || !/^#\/operation\/companies(?:\?|$)/.test(context)) return DEFAULT_LIST_HASH
  const params = Object.fromEntries(new URLSearchParams(context.split('?')[1] ?? ''))
  const { state } = parseCompanyRoute({ ...params, previa: undefined })
  return companiesHref(state)
}

/** The list context travels in the URL (`?returnTo=`), so it survives detail reloads. */
export function companyHref(id: string, listContext?: string) {
  const returnTo = companyListReturnHash(listContext)
  return buildHash(`operation/companies/${encodeURIComponent(id)}`, {
    returnTo: returnTo === DEFAULT_LIST_HASH ? undefined : returnTo,
  })
}
