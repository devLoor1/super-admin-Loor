import { useRemote } from '../../lib/useRemoteResource'
import {
  getWhitelabel,
  listWhitelabels,
  type WhitelabelListParams,
  type WhitelabelListResult,
  type WhitelabelRecord,
} from './whitelabelApi'

export type { RemoteState } from '../../lib/useRemoteResource'

/** `GET /whitelabels` for the URL-backed page / search / status. */
export function useWhitelabelList(params: WhitelabelListParams) {
  return useRemote<WhitelabelListResult>(JSON.stringify(params), (signal) => listWhitelabels(params, signal))
}

/**
 * `GET /whitelabels/:id`. Ids that are not Core numeric ids (e.g. old
 * `wl_proto_*` links) resolve to not-found without calling the API.
 */
export function useWhitelabelDetail(id: string | null) {
  return useRemote<WhitelabelRecord>(id, (signal) => getWhitelabel(id!, signal))
}
