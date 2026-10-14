import { useRemote } from '../../../lib/useRemoteResource'
import {
  getInvestor,
  listInvestors,
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

/** Whitelabel registry / tenant lookup — shared with Empreendedores. */
export { useWhitelabelOptions, useWhitelabelRecord } from '../shared/whitelabelContext'
