import { useSyncExternalStore } from 'react'
import { getSessionVersion, subscribeSession } from '../../lib/authSession'
import { useRemote } from '../../lib/useRemoteResource'
import { getInvestorDistributionRegistry } from './investorDistribution'

/** One unfiltered registry read per visit/retry; a new operator cannot inherit old chart data. */
export function useInvestorDistributionRegistry() {
  const sessionVersion = useSyncExternalStore(subscribeSession, getSessionVersion, () => 0)
  return useRemote(`dashboard-investor-registry:${sessionVersion}`, getInvestorDistributionRegistry)
}
