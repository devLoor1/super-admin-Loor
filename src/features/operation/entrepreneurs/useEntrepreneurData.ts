import { useRemote } from '../../../lib/useRemoteResource'
import {
  getEntrepreneur,
  listEntrepreneurs,
  type EntrepreneurListParams,
  type EntrepreneurListResult,
  type EntrepreneurRecord,
} from './entrepreneurApi'

/**
 * Global (`GET /entrepreneurs`) or Whitelabel-scoped
 * (`GET /whitelabels/:id/accounts?tipo=empreendedores`) list, chosen by
 * `params.whitelabelId`. Never a client filter over a global page.
 */
export function useEntrepreneurList(params: EntrepreneurListParams) {
  return useRemote<EntrepreneurListResult>(JSON.stringify(params), (signal) => listEntrepreneurs(params, signal))
}

/** `GET /entrepreneurs/:id`. Non-numeric ids (e.g. `emp_proto_*`) resolve to not-found without a request. */
export function useEntrepreneurDetail(id: string | null) {
  return useRemote<EntrepreneurRecord>(id, (signal) => getEntrepreneur(id!, signal))
}
