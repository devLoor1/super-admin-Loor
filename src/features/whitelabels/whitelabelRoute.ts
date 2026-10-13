import { buildHash } from '../../app/routeQuery'
import type { WhitelabelStatusFilter } from './whitelabelApi'

/*
 * URL-backed Whitelabels context: `#/whitelabels?id=&page=&search=&status=`.
 * `id` is a Backend (Core numeric) id; page / search / status mirror the
 * query sent to `GET /whitelabels`, so reload, Back / Forward and direct
 * links reproduce the same server request.
 */

export const SEARCH_MAX_LENGTH = 120

export type WhitelabelRouteState = {
  id?: string
  page: number
  search: string
  status: WhitelabelStatusFilter
}

const clip = (value: string) => (value.length > 32 ? `${value.slice(0, 32)}…` : value)

/** Valid URL values apply; invalid ones are reported (and dropped on the next change). */
export function parseWhitelabelRoute(params: { id?: string; page?: string; search?: string; status?: string }) {
  const ignored: string[] = []
  let page = 1
  if (params.page !== undefined) {
    if (/^[1-9]\d{0,5}$/.test(params.page)) page = Number(params.page)
    else ignored.push(`página "${clip(params.page)}"`)
  }
  let status: WhitelabelStatusFilter = 'all'
  if (params.status !== undefined) {
    if (params.status === 'active' || params.status === 'inactive') status = params.status
    else ignored.push(`status "${clip(params.status)}"`)
  }
  const search = (params.search ?? '').trim().slice(0, SEARCH_MAX_LENGTH)
  const state: WhitelabelRouteState = { id: params.id, page, search, status }
  return { state, ignored }
}

export function whitelabelsHref(state: Partial<WhitelabelRouteState> = {}) {
  return buildHash('whitelabels', {
    id: state.id,
    page: state.page && state.page > 1 ? String(state.page) : undefined,
    search: state.search?.trim() || undefined,
    status: state.status && state.status !== 'all' ? state.status : undefined,
  })
}
