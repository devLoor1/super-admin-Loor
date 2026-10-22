import { useSyncExternalStore } from 'react'
import { getSessionVersion, subscribeSession } from '../../lib/authSession'
import { useRemote } from '../../lib/useRemoteResource'
import { getKycReadCase, isKycReadId, listKycReadCases } from './kycReadApi'

export function useKycReadList(page: number) {
  const session = useSyncExternalStore(subscribeSession, getSessionVersion, () => 0)
  return useRemote(`kyc-list:${session}:${page}`, signal => listKycReadCases(page, signal))
}
export function useKycReadDetail(id: string) {
  const session = useSyncExternalStore(subscribeSession, getSessionVersion, () => 0)
  return useRemote(isKycReadId(id) ? `kyc-detail:${session}:${id}` : null, signal => getKycReadCase(id, signal))
}
