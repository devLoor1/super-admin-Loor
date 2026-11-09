import { useRemote } from '../../lib/useRemoteResource'
import { useEffect } from 'react'
import { subscribeAccountRefresh } from './access/accountAccessRefresh'
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
  const remote = useRemote<AccountListResult>(params ? `list:${JSON.stringify(params)}` : null, (signal) => listAccounts(params!, signal))
  const { reload } = remote
  useEffect(() => subscribeAccountRefresh(ref => { if (ref.whitelabelId === params?.whitelabelId && ref.kind === params.kind) reload() }), [params?.whitelabelId, params?.kind, reload])
  return remote
}

/**
 * `GET /whitelabels/:id/accounts/:accountId?tipo=…` — keyed by (Whitelabel, tipo, id):
 * an investor and an admin with the same number are different requests.
 */
export function useAccountDetail(ref: AccountRef | null) {
  const remote = useRemote<AccountDetail>(ref ? `detail:${ref.whitelabelId}:${ref.kind}:${ref.accountId}` : null, (signal) =>
    getAccount(ref!, signal),
  )
  const { reload } = remote
  useEffect(() => subscribeAccountRefresh(changed => { if (changed.whitelabelId === ref?.whitelabelId && changed.kind === ref.kind && changed.accountId === ref.accountId) reload() }), [ref?.whitelabelId, ref?.kind, ref?.accountId, reload])
  return remote
}

/** Whitelabel registry (selector) and tenant confirmation — the shared Operation implementation. */
export { useWhitelabelOptions, useWhitelabelRecord } from '../operation/shared/whitelabelContext'
