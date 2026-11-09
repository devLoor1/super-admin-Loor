import { buildHash } from '../../app/routeQuery'
import { kindFromTipo, kindMeta, type AccountKind } from './accountsApi'

/*
 * URL-backed Accounts context:
 *   #/whitelabels/:whitelabelId/accounts?tipo=&page=&search=&conta=
 *
 * `tipo` uses the Control Plane vocabulary (investidores | empreendedores |
 * administradores) and is sent as-is to the API; `page` / `search` mirror the
 * API query; `conta` is the selected account id inside that `tipo` (ids are
 * per domain, so an account is always (tipo, id)). Reload, Back / Forward and
 * direct links reproduce the same reads.
 */

export const ACCOUNT_SEARCH_MAX_LENGTH = 120

export type AccountsRouteState = {
  kind: AccountKind
  page: number
  search: string
  /** Raw `?conta=` (validated by the detail read: non-numeric → not found, no request). */
  accountId?: string
}

const clip = (value: string) => (value.length > 32 ? `${value.slice(0, 32)}…` : value)

/** Valid URL values apply; an unknown `tipo` or page is reported and dropped on the next change. */
export function parseAccountsRoute(params: { tipo?: string; page?: string; search?: string; conta?: string }) {
  const ignored: string[] = []
  let kind: AccountKind = 'investor'
  if (params.tipo !== undefined) {
    const parsed = kindFromTipo(params.tipo)
    if (parsed) kind = parsed
    else ignored.push(`tipo "${clip(params.tipo)}"`)
  }
  let page = 1
  if (params.page !== undefined) {
    if (/^[1-9]\d{0,5}$/.test(params.page)) page = Number(params.page)
    else ignored.push(`página "${clip(params.page)}"`)
  }
  const search = (params.search ?? '').trim().slice(0, ACCOUNT_SEARCH_MAX_LENGTH)
  const conta = params.conta?.trim()
  const accountId = conta ? conta.slice(0, 64) : undefined
  const state: AccountsRouteState = { kind, page, search, accountId }
  return { state, ignored }
}

export function accountsPageHref(whitelabelId: string, state: Partial<AccountsRouteState> = {}) {
  return buildHash(`whitelabels/${encodeURIComponent(whitelabelId)}/accounts`, {
    tipo: kindMeta(state.kind ?? 'investor').tipo,
    page: state.page && state.page > 1 ? String(state.page) : undefined,
    search: state.search?.trim() || undefined,
    conta: state.accountId || undefined,
  })
}
