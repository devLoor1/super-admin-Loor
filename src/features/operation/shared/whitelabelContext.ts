import { ApiError } from '../../../lib/api'
import { authenticatedGet } from '../../../lib/apiClient'
import { useRemote } from '../../../lib/useRemoteResource'
import { getWhitelabel, parseWhitelabelList, type WhitelabelListResult, type WhitelabelRecord } from '../../whitelabels/whitelabelApi'

/*
 * Authoritative Whitelabel context for the Operation participant reads
 * (Investidores, Empreendedores): the registry for names and the selector,
 * and a direct lookup to confirm one tenant. Moved unchanged from the
 * Investor module so both screens share one implementation.
 */

/** `GET /whitelabels?page=1&perPage=100` — names for rows and the Whitelabel selector. */
export async function listWhitelabelOptions(signal?: AbortSignal): Promise<WhitelabelListResult> {
  return parseWhitelabelList(await authenticatedGet('/whitelabels', { signal, query: { page: 1, perPage: 100 } }))
}

/** A tenant-name lookup must describe the requested tenant, never a different one. */
export async function getTenantWhitelabel(id: string, signal?: AbortSignal) {
  const record = await getWhitelabel(id, signal)
  if (record.id !== id) throw new ApiError(200, {}, { kind: 'malformed' })
  return record
}

export function useWhitelabelOptions() {
  return useRemote<WhitelabelListResult>('whitelabel-options', (signal) => listWhitelabelOptions(signal))
}

/** `GET /whitelabels/:id` — confirms a Whitelabel the registry page did not include, or names a record's tenant. */
export function useWhitelabelRecord(id: string | null) {
  return useRemote<WhitelabelRecord>(id, (signal) => getTenantWhitelabel(id!, signal))
}
