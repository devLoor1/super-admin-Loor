import { buildHash } from '../../../app/routeQuery'
import { COMPANY_CONTRACT } from './companyContract'

/*
 * URL-backed Empresas context (contextual page under Operação › Empreendedores,
 * no menu entry of its own):
 *
 *   #/operation/companies?whitelabel=&page=&search=&previa=
 *   #/operation/companies/:companyId?returnTo=&previa=
 *
 * `whitelabel` / `page` / `search` mirror the candidate `GET /companies`
 * query, so reload, Back / Forward and direct links keep the same context.
 * While the prototype source is active, `whitelabel` holds an illustrative
 * reference (`wl_proto_cmp_*`), never a Core id sent anywhere.
 *
 * `previa` is a PROTOTYPE-ONLY state preview (carregando, vazio, indisponivel,
 * erro) so the read states can be reviewed without any request. It is removed
 * together with the prototype source.
 */

export const COMPANY_SEARCH_MAX_LENGTH = 120
export const COMPANY_PAGE_SIZE = 10

export type CompanyPreview = 'loading' | 'empty' | 'unavailable' | 'error'

const PREVIEW_FROM_PARAM: Record<string, CompanyPreview> = {
  carregando: 'loading',
  vazio: 'empty',
  indisponivel: 'unavailable',
  erro: 'error',
}

const PARAM_FROM_PREVIEW: Record<CompanyPreview, string> = {
  loading: 'carregando',
  empty: 'vazio',
  unavailable: 'indisponivel',
  error: 'erro',
}

export const PREVIEW_LABEL: Record<CompanyPreview, string> = {
  loading: 'carregando',
  empty: 'lista vazia',
  unavailable: 'contrato indisponível',
  error: 'erro de leitura',
}

export type CompanyRouteState = {
  whitelabel?: string
  page: number
  search: string
  preview?: CompanyPreview
}

const clip = (value: string) => (value.length > 32 ? `${value.slice(0, 32)}…` : value)

/** Valid preview values for a screen; anything else is reported as ignored. */
export function parseCompanyPreview(value: string | undefined, allowed: readonly CompanyPreview[], ignored: string[]) {
  if (value === undefined) return undefined
  const preview = PREVIEW_FROM_PARAM[value]
  if (!COMPANY_CONTRACT.integrated && preview && allowed.includes(preview)) return preview
  ignored.push(`prévia "${clip(value)}"`)
  return undefined
}

const LIST_PREVIEWS: readonly CompanyPreview[] = ['loading', 'empty', 'unavailable', 'error']

/** Valid URL values apply; invalid ones are reported (and dropped on the next change). */
export function parseCompanyRoute(params: { whitelabel?: string; page?: string; search?: string; previa?: string }) {
  const ignored: string[] = []
  let whitelabel: string | undefined
  if (params.whitelabel !== undefined) {
    if (/^[\w-]{1,64}$/.test(params.whitelabel)) whitelabel = params.whitelabel
    else ignored.push(`Whitelabel "${clip(params.whitelabel)}"`)
  }
  let page = 1
  if (params.page !== undefined) {
    if (/^[1-9]\d{0,5}$/.test(params.page)) page = Number(params.page)
    else ignored.push(`página "${clip(params.page)}"`)
  }
  const search = (params.search ?? '').trim().slice(0, COMPANY_SEARCH_MAX_LENGTH)
  const preview = parseCompanyPreview(params.previa, LIST_PREVIEWS, ignored)
  const state: CompanyRouteState = { whitelabel, page, search, preview }
  return { state, ignored }
}

export function companiesHref(state: Partial<CompanyRouteState> = {}) {
  return buildHash('operation/companies', {
    whitelabel: state.whitelabel,
    page: state.page && state.page > 1 ? String(state.page) : undefined,
    search: state.search?.trim() || undefined,
    previa: state.preview ? PARAM_FROM_PREVIEW[state.preview] : undefined,
  })
}

const DEFAULT_LIST_HASH = '#/operation/companies'

/** Only this internal list route is an allowed return destination. */
export function companyListReturnHash(context?: string) {
  if (!context || !/^#\/operation\/companies(?:\?|$)/.test(context)) return DEFAULT_LIST_HASH
  const params = new URLSearchParams(context.split('?')[1] ?? '')
  const { state } = parseCompanyRoute({
    whitelabel: params.get('whitelabel') ?? undefined,
    page: params.get('page') ?? undefined,
    search: params.get('search') ?? undefined,
    previa: params.get('previa') ?? undefined,
  })
  return companiesHref(state)
}

/** The list context travels in the URL (`?returnTo=`), so it survives detail reloads. */
export function companyHref(id: string, listContext?: string) {
  const returnTo = companyListReturnHash(listContext)
  return buildHash(`operation/companies/${encodeURIComponent(id)}`, {
    returnTo: returnTo === DEFAULT_LIST_HASH ? undefined : returnTo,
  })
}

/** Detail URL with a prototype state preview (or none). */
export function companyDetailPreviewHref(id: string, preview: CompanyPreview | undefined, returnTo?: string) {
  const list = companyListReturnHash(returnTo)
  return buildHash(`operation/companies/${encodeURIComponent(id)}`, {
    returnTo: list === DEFAULT_LIST_HASH ? undefined : list,
    previa: preview ? PARAM_FROM_PREVIEW[preview] : undefined,
  })
}
