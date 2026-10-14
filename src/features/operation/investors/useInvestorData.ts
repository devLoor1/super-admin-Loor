import { useRemote } from '../../../lib/useRemoteResource'
import { type WhitelabelListResult, type WhitelabelRecord } from '../../whitelabels/whitelabelApi'
import {
  getInvestor,
  getInvestorWhitelabel,
  listInvestors,
  listWhitelabelOptions,
  type InvestorDetail,
  type InvestorListParams,
  type InvestorListResult,
} from './investorApi'

/**
 * Global (`GET /investors`) or Whitelabel-scoped
 * (`GET /whitelabels/:id/accounts?tipo=investidores`) list, chosen by
 * `params.whitelabelId`. Never a client filter over a global page.
 */
export function useInvestorList(params: InvestorListParams) {
  return useRemote<InvestorListResult>(JSON.stringify(params), (signal) => listInvestors(params, signal))
}

/** `GET /investors/:id`. Non-numeric ids (e.g. `inv_proto_*`) resolve to not-found without a request. */
export function useInvestorDetail(id: string | null) {
  return useRemote<InvestorDetail>(id, (signal) => getInvestor(id!, signal))
}

/** Authoritative Whitelabel registry (`GET /whitelabels?perPage=100`) for names and the selector. */
export function useWhitelabelOptions() {
  return useRemote<WhitelabelListResult>('whitelabel-options', (signal) => listWhitelabelOptions(signal))
}

/** `GET /whitelabels/:id` — confirms a Whitelabel the registry page did not include. */
export function useWhitelabelRecord(id: string | null) {
  return useRemote<WhitelabelRecord>(id, (signal) => getInvestorWhitelabel(id!, signal))
}
