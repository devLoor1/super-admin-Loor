import { useRemote } from '../../lib/useRemoteResource'
import { getDashboardOverview, type DashboardOverview } from './dashboardApi'
import { getDashboardOpportunityCount, getDashboardPaymentCount, type DashboardCount } from './dashboardCounts'

/** One `GET /dashboard` per Dashboard visit (and per explicit retry) — no polling, no retry loop. */
export function useDashboardOverview() {
  return useRemote<DashboardOverview>('dashboard-overview', (signal) => getDashboardOverview(signal))
}

/** Separate request states/retries: permissions or failures never erase another KPI. */
export function useDashboardOpportunityCount() {
  return useRemote<DashboardCount>('dashboard-opportunity-count', getDashboardOpportunityCount)
}

export function useDashboardPaymentCount() {
  return useRemote<DashboardCount>('dashboard-payment-count', getDashboardPaymentCount)
}
