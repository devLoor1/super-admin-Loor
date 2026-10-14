import { buildHash } from '../../app/routeQuery'
import type { AuditOrder } from './auditApi'
import { safeAuditText } from './auditPresent'

/*
 * URL-backed Auditoria context: `#/audit?search=&order=&page=` — exactly the
 * query the Control Plane supports, so reload, Back / Forward and links
 * reproduce the same request. The prototype's context filters (`resourceType`,
 * `resourceId`, `whitelabel`, `actor`, `action`; still used by links from
 * prototype modules) have no Backend support: they are ignored with a visible
 * note — never applied to a page of results on the client.
 */

export const AUDIT_SEARCH_MAX_LENGTH = 80

export type AuditRouteState = { page: number; search: string; order: AuditOrder }

export type AuditRouteParams = {
  page?: string
  search?: string
  order?: string
  resourceType?: string
  resourceId?: string
  whitelabel?: string
  actor?: string
  action?: string
}

const clip = (value: string) => {
  const safe = safeAuditText(value) ?? 'não informado'
  return safe.length > 32 ? `${safe.slice(0, 32)}…` : safe
}

const UNSUPPORTED: { key: keyof AuditRouteParams; label: string }[] = [
  { key: 'resourceType', label: 'tipo de recurso' },
  { key: 'resourceId', label: 'recurso' },
  { key: 'whitelabel', label: 'Whitelabel' },
  { key: 'actor', label: 'ator' },
  { key: 'action', label: 'ação' },
]

export function parseAuditRoute(params: AuditRouteParams) {
  const ignored: string[] = []
  let page = 1
  if (params.page !== undefined) {
    if (/^[1-9]\d{0,5}$/.test(params.page)) page = Number(params.page)
    else ignored.push(`página “${clip(params.page)}”`)
  }
  let order: AuditOrder = 'desc'
  if (params.order !== undefined) {
    if (params.order === 'asc' || params.order === 'desc') order = params.order
    else ignored.push(`ordem “${clip(params.order)}”`)
  }
  for (const { key, label } of UNSUPPORTED) {
    const value = params[key]
    if (value) ignored.push(`${label} “${clip(value)}”`)
  }
  const search = (params.search ?? '').trim().slice(0, AUDIT_SEARCH_MAX_LENGTH)
  const state: AuditRouteState = { page, search, order }
  return { state, ignored }
}

export function auditListHref(state: Partial<AuditRouteState> = {}) {
  return buildHash('audit', {
    search: state.search?.trim() || undefined,
    order: state.order === 'asc' ? 'asc' : undefined,
    page: state.page && state.page > 1 ? String(state.page) : undefined,
  })
}

const DEFAULT_LIST_HASH = '#/audit'

/** Only the internal Auditoria list is an allowed return destination. */
export function auditListReturnHash(context?: string) {
  if (!context || !/^#\/audit(?:\?|$)/.test(context)) return DEFAULT_LIST_HASH
  const params = new URLSearchParams(context.split('?')[1] ?? '')
  const { state } = parseAuditRoute({
    page: params.get('page') ?? undefined,
    search: params.get('search') ?? undefined,
    order: params.get('order') ?? undefined,
  })
  return auditListHref(state)
}

/** The list context travels in the URL (`?returnTo=`), so it survives a detail reload. */
export function auditEventHref(id: string, listContext?: string) {
  const returnTo = auditListReturnHash(listContext)
  return buildHash(`audit/${encodeURIComponent(id)}`, { returnTo: returnTo === DEFAULT_LIST_HASH ? undefined : returnTo })
}
