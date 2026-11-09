import { useSyncExternalStore } from 'react'
import { getSessionVersion, subscribeSession } from '../../lib/authSession'
import { useRemote } from '../../lib/useRemoteResource'
import { getDailyOpportunities } from './dailyOpportunities'

export function useDailyOpportunities() {
  const version = useSyncExternalStore(subscribeSession, getSessionVersion, () => 0)
  return useRemote(`dashboard-daily-opportunities:${version}`, getDailyOpportunities)
}
