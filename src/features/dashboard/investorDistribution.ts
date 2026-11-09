import { ApiError } from '../../lib/api'
import { describeApiError } from '../../lib/apiErrors'
import type { RemoteState } from '../../lib/useRemoteResource'
import { isPositiveCoreId } from '../operation/shared/coreIds'
import { listWhitelabelOptions } from '../operation/shared/whitelabelContext'
import type { WhitelabelListResult } from '../whitelabels/whitelabelApi'
import { formatKpi, type DashboardOverview } from './dashboardApi'

export const DISTRIBUTION_RADIUS = 74.25
export const DISTRIBUTION_CIRCUMFERENCE = 2 * Math.PI * DISTRIBUTION_RADIUS
export type InvestorRegistryRead = { registry: WhitelabelListResult; consultedAt: string }
export type InvestorSegment = {
  id: string; name: string; count: number; ratio: number; percentage: string
  color: string; length: number; offset: number
}
export type InvestorDistribution = { total: number; segments: InvestorSegment[] }
export type DistributionRetry = 'registry' | 'overview' | 'both' | null
export type DistributionView =
  | { status: 'loading' }
  | { status: 'unavailable'; title: string; description: string; retry: DistributionRetry; correlationId?: string }
  | ({ status: 'ready'; consultedAt: string; overviewFreshness: string | null } & InvestorDistribution)

const validCount = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
const invalid = (reason: string) => new ApiError(200, { code: `DISTRIBUTION_${reason}` }, { kind: 'malformed' })

/** Bounded V1: never mistake a filtered/partial first page for the global registry. */
export function validateInvestorRegistry(registry: WhitelabelListResult) {
  if (registry.page !== 1 || registry.perPage !== 100 || registry.lastPage !== 1
    || !validCount(registry.total) || registry.total > 100 || registry.rows.length !== registry.total) throw invalid('COVERAGE')
  const ids = new Set<string>()
  for (const row of registry.rows) {
    if (!isPositiveCoreId(row.id) || ids.has(row.id) || typeof row.name !== 'string' || !row.name.trim()) throw invalid('IDENTITY')
    ids.add(row.id)
    if (!validCount(row.investorCount)) throw invalid('COUNT')
  }
}

export async function getInvestorDistributionRegistry(signal?: AbortSignal): Promise<InvestorRegistryRead> {
  const registry = await listWhitelabelOptions(signal)
  validateInvestorRegistry(registry)
  return { registry, consultedAt: new Date().toISOString() }
}

const PERCENT = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
export function investorPercentage(ratio: number) {
  return ratio > 0 && ratio < 0.0005 ? '< 0,1%' : `${PERCENT.format(ratio * 100)}%`
}

/** Golden-angle palette keyed to canonical identity, not rank or current count. */
export function investorColor(id: string) {
  const hue = (255 + Number(BigInt(id) % 1_000_003n) * 137.508) % 360
  return `hsl(${hue.toFixed(2)} 64% 72%)`
}

/** Count descending, numeric ID ascending on ties; geometry never uses rounded labels. */
export function buildInvestorDistribution(registry: WhitelabelListResult, total: number | null): InvestorDistribution {
  validateInvestorRegistry(registry)
  if (!validCount(total)) throw invalid('TOTAL')
  let sum = 0
  for (const row of registry.rows) {
    sum += row.investorCount!
    if (!Number.isSafeInteger(sum)) throw invalid('SUM')
  }
  if (sum !== total) throw invalid('MISMATCH')
  let preceding = 0
  const segments = [...registry.rows].sort((a, b) => b.investorCount! - a.investorCount!
    || (BigInt(a.id) < BigInt(b.id) ? -1 : 1)).map((row) => {
    const count = row.investorCount!
    const ratio = total === 0 ? 0 : count / total
    const offset = total === 0 ? 0 : preceding / total * DISTRIBUTION_CIRCUMFERENCE
    preceding += count
    return { id: row.id, name: row.name, count, ratio, percentage: investorPercentage(ratio),
      color: investorColor(row.id), length: ratio * DISTRIBUTION_CIRCUMFERENCE, offset }
  })
  return { total, segments }
}

function unavailable(error: unknown, source: 'registry' | 'overview'): DistributionView {
  const view = describeApiError(error, source === 'registry' ? 'a distribuição por Whitelabel' : 'o total global de investidores')
  const descriptions: Record<string, string> = {
    DISTRIBUTION_COVERAGE: 'Não foi possível confirmar todos os Whitelabels em uma única consulta de até 100 registros. Nenhuma participação foi calculada.',
    DISTRIBUTION_COUNT: 'Um Whitelabel não informou uma contagem válida de investidores. Nenhum valor ausente foi convertido em zero.',
    DISTRIBUTION_TOTAL: 'O total global de investidores não foi informado. Nenhuma participação foi calculada.',
  }
  return { status: 'unavailable', title: view.title,
    description: error instanceof ApiError ? descriptions[error.code ?? ''] ?? view.description : view.description,
    retry: view.retryable ? source : null, correlationId: view.correlationId }
}

export function investorDistributionView(registry: RemoteState<InvestorRegistryRead>, overview: RemoteState<DashboardOverview>): DistributionView {
  if (registry.status === 'error') return unavailable(registry.error, 'registry')
  if (overview.status === 'error') return unavailable(overview.error, 'overview')
  if (registry.status !== 'success' || overview.status !== 'success') return { status: 'loading' }
  try {
    return { status: 'ready', ...buildInvestorDistribution(registry.data.registry, overview.data.kpis.investors),
      consultedAt: registry.data.consultedAt, overviewFreshness: overview.data.freshness }
  } catch (error) {
    if (error instanceof ApiError && error.code === 'DISTRIBUTION_MISMATCH') {
      const sum = registry.data.registry.rows.reduce((acc, row) => acc + row.investorCount!, 0)
      return { status: 'unavailable', title: 'Totais ainda não reconciliados', retry: 'both',
        description: `Whitelabels: ${formatKpi(sum)} investidores; total global: ${formatKpi(overview.data.kpis.investors!)}. As consultas não são um retrato atômico. Atualize as duas fontes para conferir novamente.` }
    }
    return unavailable(error, error instanceof ApiError && error.code === 'DISTRIBUTION_TOTAL' ? 'overview' : 'registry')
  }
}
