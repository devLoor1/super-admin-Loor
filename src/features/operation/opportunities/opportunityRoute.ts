import { buildHash } from '../../../app/routeQuery'
import { isPositiveCoreId } from '../shared/coreIds'
import {
  OPPORTUNITY_MODALITIES,
  OPPORTUNITY_SEARCH_MAX_LENGTH,
  OPPORTUNITY_SORT_KEYS,
  OPPORTUNITY_STATUSES,
  isOneOf,
  type OpportunityModality,
  type OpportunitySortKey,
  type OpportunityStatus,
  type SortOrder,
} from './opportunityApi'

/*
 * URL-backed Oportunidades context. Every filter mirrors a documented Backend
 * query parameter, so reload, Back / Forward and direct links reproduce the
 * same server request. Invalid values are reported and dropped — never sent:
 *
 *   #/operation/opportunities?whitelabel=&status=&modalidade=&search=&page=&sort=&order=
 *   #/operation/opportunities/:id?returnTo=
 *
 * `?empreendedor=` (prototype-era context) is reported as unsupported: the
 * Control Plane has no Entrepreneur filter (`entrepreneurId` → 400), and the
 * list is never filtered on the client.
 */

export type RawParams = Record<string, string | undefined>

/** URL params handed to the list page by the router (validated here). */
export type OpportunityListProps = {
  whitelabel?: string
  status?: string
  modalidade?: string
  search?: string
  page?: string
  sort?: string
  order?: string
  empreendedor?: string
  /** Raw query string: identity of the URL-backed context (scroll restore, search draft). */
  routeKey?: string
}

export type OpportunityListRoute = {
  page: number
  search: string
  whitelabelId?: string
  status?: OpportunityStatus
  modality?: OpportunityModality
  sort: OpportunitySortKey
  order: SortOrder
}

const clip = (value: string) => (value.length > 32 ? `${value.slice(0, 32)}…` : value)

export function parseOpportunityListRoute(params: RawParams) {
  const ignored: string[] = []
  const unsupported: string[] = []
  let page = 1
  if (params.page !== undefined) {
    if (/^[1-9]\d{0,5}$/.test(params.page)) page = Number(params.page)
    else ignored.push(`página "${clip(params.page)}"`)
  }
  let whitelabelId: string | undefined
  if (params.whitelabel !== undefined) {
    if (isPositiveCoreId(params.whitelabel)) whitelabelId = params.whitelabel
    else ignored.push(`Whitelabel "${clip(params.whitelabel)}"`)
  }
  let status: OpportunityStatus | undefined
  if (params.status !== undefined) {
    if (isOneOf(OPPORTUNITY_STATUSES, params.status)) status = params.status
    else ignored.push(`status "${clip(params.status)}"`)
  }
  let modality: OpportunityModality | undefined
  if (params.modalidade !== undefined) {
    if (isOneOf(OPPORTUNITY_MODALITIES, params.modalidade)) modality = params.modalidade
    else ignored.push(`modalidade "${clip(params.modalidade)}"`)
  }
  let sort: OpportunitySortKey = 'createdAt'
  if (params.sort !== undefined) {
    if (isOneOf(OPPORTUNITY_SORT_KEYS, params.sort)) sort = params.sort
    else ignored.push(`ordenação "${clip(params.sort)}"`)
  }
  let order: SortOrder = 'desc'
  if (params.order !== undefined) {
    if (params.order === 'asc' || params.order === 'desc') order = params.order
    else ignored.push(`direção "${clip(params.order)}"`)
  }
  if (params.empreendedor !== undefined) unsupported.push(`empreendedor "${clip(params.empreendedor)}"`)
  const search = (params.search ?? '').trim().slice(0, OPPORTUNITY_SEARCH_MAX_LENGTH)
  const state: OpportunityListRoute = { page, search, whitelabelId, status, modality, sort, order }
  return { state, ignored, unsupported }
}

export function opportunitiesHref(state: Partial<OpportunityListRoute> = {}) {
  return buildHash('operation/opportunities', {
    whitelabel: state.whitelabelId,
    status: state.status,
    modalidade: state.modality,
    search: state.search?.trim() || undefined,
    sort: state.sort && state.sort !== 'createdAt' ? state.sort : undefined,
    order: state.order && state.order !== 'desc' ? state.order : undefined,
    page: state.page && state.page > 1 ? String(state.page) : undefined,
  })
}

const DEFAULT_LIST_HASH = '#/operation/opportunities'

/** Only this internal list route is an allowed return destination (re-parsed: invalid values never survive). */
export function opportunityListReturnHash(context?: string) {
  if (!context || !/^#\/operation\/opportunities(?:\?|$)/.test(context)) return DEFAULT_LIST_HASH
  const params = Object.fromEntries(new URLSearchParams(context.split('?')[1] ?? ''))
  return opportunitiesHref(parseOpportunityListRoute(params).state)
}

/** The list context travels in the URL (`?returnTo=`), so it survives detail reloads. */
export function opportunityHref(id: string, listContext?: string) {
  const returnTo = opportunityListReturnHash(listContext)
  return buildHash(`operation/opportunities/${encodeURIComponent(id)}`, {
    returnTo: returnTo === DEFAULT_LIST_HASH ? undefined : returnTo,
  })
}
