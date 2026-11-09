import { useSyncExternalStore } from 'react'
import { getSessionVersion, subscribeSession } from '../../lib/authSession'
import { useRemote } from '../../lib/useRemoteResource'
import { getRecentAuditEvents } from './recentAuditEvents'

/** One bounded read per mount/retry; no lastData, polling or separate Audit history. */
export function useRecentAuditEvents() {
  const version = useSyncExternalStore(subscribeSession, getSessionVersion, () => 0)
  return useRemote(`dashboard-recent-audit:${version}`, getRecentAuditEvents)
}
