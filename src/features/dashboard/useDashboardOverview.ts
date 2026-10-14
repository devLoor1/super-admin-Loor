import { useRemote } from '../../lib/useRemoteResource'
import { getDashboardOverview, type DashboardOverview } from './dashboardApi'

/** One `GET /dashboard` per Dashboard visit (and per explicit retry) — no polling, no retry loop. */
export function useDashboardOverview() {
  return useRemote<DashboardOverview>('dashboard-overview', (signal) => getDashboardOverview(signal))
}
