import { ApiError } from '../../lib/api'
import { describeApiError } from '../../lib/apiErrors'
import type { RemoteState } from '../../lib/useRemoteResource'
import { isServerOpportunityId, listOpportunities, type OpportunityRecord, type PagedResult } from '../operation/opportunities/opportunityApi'

export const OPPORTUNITY_TIMEZONE = 'America/Sao_Paulo'
export const DAILY_WINDOW = 30
export const DAILY_TICK_OFFSETS = [0, 6, 12, 18, 24, 29] as const
export const DAILY_PLOT = { width: 456, height: 154, lastX: 442, intervals: 5 } as const
export type DailyOpportunityBucket = { date: string; label: string; count: number }
export type DailyOpportunitySeries = {
  buckets: DailyOpportunityBucket[]; start: string; end: string; periodTotal: number; sourceTotal: number
}
export type DailyOpportunityRead = DailyOpportunitySeries & { consultedAt: string }
type CreationList = PagedResult<Pick<OpportunityRecord, 'id' | 'createdAt'>>
export type DailyOpportunityView =
  | { status: 'loading' }
  | { status: 'unavailable'; title: string; description: string; retryable: boolean; correlationId?: string }
  | ({ status: 'ready' } & DailyOpportunityRead)

const malformed = (reason: string) => new ApiError(200, { code: `DAILY_OPPORTUNITIES_${reason}` }, { kind: 'malformed' })
const leapYear = (year: number) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
function validCalendarDate(year: number, month: number, day: number) {
  const days = [31, leapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1]
}

/** Strict ISO instant: no naive/local interpretation or Date.parse rollover normalization. */
export function opportunityCreationInstant(value: unknown): number | null {
  if (typeof value !== 'string') return null
  const match = /^(\d{4})-(\d{2})-(\d{2})T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.exec(value)
  if (!match || !validCalendarDate(...match.slice(1, 4).map(Number) as [number, number, number])) return null
  const instant = Date.parse(value)
  return Number.isFinite(instant) ? instant : null
}

const SAO_PAULO_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: OPPORTUNITY_TIMEZONE, calendar: 'gregory', numberingSystem: 'latn',
  year: 'numeric', month: '2-digit', day: '2-digit', era: 'short',
})

/** Explicit timezone, independent of the browser's locale/timezone (including historical DST). */
export function saoPauloDateKey(instant: Date | number): string {
  const parts = SAO_PAULO_DATE.formatToParts(instant)
  const part = (name: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === name)!.value
  const year = part('era') === 'BC' ? 1 - Number(part('year')) : Number(part('year'))
  return `${String(year).padStart(4, '0')}-${part('month')}-${part('day')}`
}

function calendarCarrier(key: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  if (!match || !validCalendarDate(...match.slice(1).map(Number) as [number, number, number])) throw malformed('REFERENCE_DATE')
  // UTC is a calendar arithmetic carrier, NOT the timezone used to group source instants.
  return Date.parse(`${key}T12:00:00Z`)
}

export function dailyDateLabel(key: string) { return `${key.slice(8, 10)}/${key.slice(5, 7)}` }
export function dailyFullDateLabel(key: string) { return `${dailyDateLabel(key)}/${key.slice(0, 4)}` }

/** Complete global current population only. Unknown-date records are never silently omitted. */
export function buildDailyOpportunities(source: CreationList, referenceDate: string): DailyOpportunitySeries {
  if (source.page !== 1 || source.perPage !== 100 || source.lastPage !== 1
    || !Number.isSafeInteger(source.total) || source.total < 0 || source.total > 100 || source.rows.length !== source.total) throw malformed('COVERAGE')
  const end = calendarCarrier(referenceDate)
  const buckets = Array.from({ length: DAILY_WINDOW }, (_, index) => {
    const date = new Date(end + (index - DAILY_WINDOW + 1) * 86_400_000).toISOString().slice(0, 10)
    return { date, label: dailyDateLabel(date), count: 0 }
  })
  const byDay = new Map(buckets.map((bucket) => [bucket.date, bucket]))
  const ids = new Set<string>()
  for (const row of source.rows) {
    if (!isServerOpportunityId(row.id) || ids.has(row.id)) throw malformed('IDENTITY')
    ids.add(row.id)
    const instant = opportunityCreationInstant(row.createdAt)
    if (instant === null) throw malformed('CREATED_AT')
    const bucket = byDay.get(saoPauloDateKey(instant))
    if (bucket) bucket.count += 1
  }
  return { buckets, start: buckets[0].date, end: referenceDate,
    periodTotal: buckets.reduce((sum, bucket) => sum + bucket.count, 0), sourceTotal: source.total }
}

/** One supported, unfiltered, bounded read; discard record identities/text after validation. */
export async function getDailyOpportunities(signal?: AbortSignal): Promise<DailyOpportunityRead> {
  const source = await listOpportunities({ page: 1, perPage: 100, search: '', sort: 'createdAt', order: 'desc' }, signal)
  const consulted = new Date()
  return { ...buildDailyOpportunities(source, saoPauloDateKey(consulted)), consultedAt: consulted.toISOString() }
}

/** Five integer intervals; zero series has a meaningful 0..5 scale, never division by zero. */
export function dailyOpportunityGeometry(buckets: DailyOpportunityBucket[]) {
  const maximum = Math.max(0, ...buckets.map((bucket) => bucket.count))
  const step = Math.max(1, Math.ceil(maximum / DAILY_PLOT.intervals))
  const top = step * DAILY_PLOT.intervals
  const points = buckets.map((bucket, index) => ({
    x: index / (DAILY_WINDOW - 1) * DAILY_PLOT.lastX,
    y: DAILY_PLOT.height * (1 - bucket.count / top),
  }))
  return { top, ticks: Array.from({ length: DAILY_PLOT.intervals + 1 }, (_, index) => top - index * step),
    points, path: points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`).join(' ') }
}

export function dailyOpportunityView(state: RemoteState<DailyOpportunityRead>): DailyOpportunityView {
  if (state.status === 'success') return { status: 'ready', ...state.data }
  if (state.status !== 'error') return { status: 'loading' }
  const view = describeApiError(state.error, 'as novas oportunidades por dia')
  const code = state.error instanceof ApiError ? state.error.code : undefined
  const descriptions: Record<string, string> = {
    DAILY_OPPORTUNITIES_COVERAGE: 'Não foi possível confirmar a lista global completa em uma consulta de até 100 oportunidades. Nenhuma série parcial foi exibida.',
    DAILY_OPPORTUNITIES_CREATED_AT: 'Uma oportunidade não informou uma data de criação válida com fuso horário explícito. Nenhum registro sem data foi ignorado para montar a série.',
  }
  return { status: 'unavailable', title: view.title, description: descriptions[code ?? ''] ?? view.description,
    retryable: view.retryable, correlationId: view.correlationId }
}
