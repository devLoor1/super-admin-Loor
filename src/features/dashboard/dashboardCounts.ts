import type { MetricReading } from '../../components/ui/MetricCard'
import { ApiError } from '../../lib/api'
import { describeApiError } from '../../lib/apiErrors'
import type { RemoteState } from '../../lib/useRemoteResource'
import { listPayments } from '../finance-core/shared/financeApi'
import { listOpportunities } from '../operation/opportunities/opportunityApi'
import { formatKpi } from './dashboardApi'

export type DashboardCount = { total: number; consultedAt: string }

// These list adapters validate the server envelope and meta.total. Never count
// the one returned row, paginate, or inherit a module's current filters.
function countResult(result: { page: number; perPage: number; total: number }): DashboardCount {
  if (result.page !== 1 || result.perPage !== 1) {
    throw new ApiError(200, { code: 'DASHBOARD_COUNT_PAGE_MISMATCH' }, { kind: 'malformed' })
  }
  return { total: result.total, consultedAt: new Date().toISOString() }
}

/** All registered Opportunities: review, active, finished and archived. */
export async function getDashboardOpportunityCount(signal?: AbortSignal): Promise<DashboardCount> {
  return countResult(await listOpportunities({ page: 1, perPage: 1, search: '', sort: 'createdAt', order: 'desc' }, signal))
}

/** All investment PIX-charge records, not paid Investments, money or Wallet. */
export async function getDashboardPaymentCount(signal?: AbortSignal): Promise<DashboardCount> {
  return countResult(await listPayments({ page: 1, perPage: 1, search: '', sort: 'createdAt', order: 'desc' }, signal))
}

const CONSULTED_TIME = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })

/** Source-specific consultation time; never borrow GET /dashboard freshness. */
export function dashboardCountReading(state: RemoteState<DashboardCount>): MetricReading {
  if (state.status === 'success') {
    return { state: 'ready', value: formatKpi(state.data.total), status: `Consultado às ${CONSULTED_TIME.format(new Date(state.data.consultedAt))} (Brasília)` }
  }
  if (state.status === 'error') {
    const error = describeApiError(state.error, 'o indicador')
    return { state: 'unavailable', status: error.retryable ? 'Indisponível no momento' : error.title }
  }
  return { state: 'loading' }
}
