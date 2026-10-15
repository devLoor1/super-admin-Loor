import { useRemote } from '../../lib/useRemoteResource'
import {
  getAccount,
  listAccounts,
  type AccountDetail,
  type AccountListParams,
  type AccountListResult,
  type AccountRef,
} from './accountsApi'

/** `GET /whitelabels/:id/accounts?tipo=…` — one request per (Whitelabel, tipo, page, search). */
export function useAccountList(params: AccountListParams | null) {
  return useRemote<AccountListResult>(params ? `list:${JSON.stringify(params)}` : null, (signal) => listAccounts(params!, signal))
}

/**
 * `GET /whitelabels/:id/accounts/:accountId?tipo=…` — keyed by (Whitelabel, tipo, id):
 * an investor and an admin with the same number are different requests.
 */
export function useAccountDetail(ref: AccountRef | null) {
  return useRemote<AccountDetail>(ref ? `detail:${ref.whitelabelId}:${ref.kind}:${ref.accountId}` : null, (signal) =>
    getAccount(ref!, signal),
  )
}

/** Whitelabel registry (selector) and tenant confirmation — the shared Operation implementation. */
export { useWhitelabelOptions, useWhitelabelRecord } from '../operation/shared/whitelabelContext'
