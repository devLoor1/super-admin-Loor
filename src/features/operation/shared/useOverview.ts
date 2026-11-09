import { useSyncExternalStore } from 'react'
import { getSessionVersion, subscribeSession } from '../../../lib/authSession'
import { useRemote } from '../../../lib/useRemoteResource'
import { isPositiveCoreId } from './coreIds'
import { getInvestorOverview } from '../investors/investorOverviewApi'
import { getEntrepreneurOverview } from '../entrepreneurs/entrepreneurOverviewApi'

export function useInvestorOverview(id: string) {
  const session = useSyncExternalStore(subscribeSession, getSessionVersion, () => 0)
  return useRemote(isPositiveCoreId(id) ? `investor-overview:${session}:${id}` : null, signal => getInvestorOverview(id, signal))
}
export function useEntrepreneurOverview(id: string) {
  const session = useSyncExternalStore(subscribeSession, getSessionVersion, () => 0)
  return useRemote(isPositiveCoreId(id) ? `entrepreneur-overview:${session}:${id}` : null, signal => getEntrepreneurOverview(id, signal))
}
