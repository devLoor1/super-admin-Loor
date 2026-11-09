import { ApiError } from '../../lib/api'
import { describeApiError, type ApiErrorView } from '../../lib/apiErrors'
import type { RemoteState } from '../../lib/useRemoteResource'
import { AUDIT_PAGE_SIZE, listAuditEvents, type AuditListResult } from '../governance-audit/auditApi'
import { actionLabel, actorName, resourceText, resultMeta } from '../governance-audit/auditPresent'
import { formatDateTime } from '../operation/shared/operationModel'

/** Only approved display fields enter Dashboard state; no raw Audit metadata. */
export type RecentAuditRow = {
  id: string
  event: string
  resource: string
  whitelabel: string
  operator: string
  result: ReturnType<typeof resultMeta>
  createdAt: string
  dateTime: string
}
export type RecentAuditPreview = { rows: RecentAuditRow[]; total: number; consultedAt: string }
export type RecentAuditView =
  | { status: 'loading' }
  | ({ status: 'ready' } & RecentAuditPreview)
  | ({ status: 'unavailable' } & ApiErrorView)

/** The existing adapter validates identities/actions/ISO dates; require a complete latest page too. */
export function projectRecentAuditEvents(source: AuditListResult, consultedAt: string): RecentAuditPreview {
  const instants = source.rows.map((row) => Date.parse(row.createdAt))
  if (source.page !== 1 || source.perPage !== AUDIT_PAGE_SIZE || !Number.isSafeInteger(source.total) || source.total < 0
    || source.lastPage !== Math.max(1, Math.ceil(source.total / AUDIT_PAGE_SIZE))
    || source.rows.length !== Math.min(AUDIT_PAGE_SIZE, source.total)
    || new Set(source.rows.map((row) => row.id)).size !== source.rows.length
    || instants.some((instant, index) => !Number.isFinite(instant) || (index > 0 && instant > instants[index - 1]))
    || !Number.isFinite(Date.parse(consultedAt))) {
    throw new ApiError(200, {}, { kind: 'malformed' })
  }
  return {
    total: source.total,
    consultedAt,
    // Preserve API order, including ties. No speculative module/actor/tenant enrichment.
    rows: source.rows.map((record) => ({
      id: record.id,
      event: actionLabel(record.action),
      resource: resourceText(record) ?? 'Sem recurso registrado',
      whitelabel: record.whitelabelId ? `Whitelabel ID ${record.whitelabelId}` : 'Sem Whitelabel',
      operator: actorName(record),
      result: resultMeta(record.result),
      createdAt: record.createdAt,
      dateTime: formatDateTime(record.createdAt)!,
    })),
  }
}

export async function getRecentAuditEvents(signal: AbortSignal): Promise<RecentAuditPreview> {
  const source = await listAuditEvents({ page: 1, search: '', order: 'desc' }, signal)
  return projectRecentAuditEvents(source, new Date().toISOString())
}

export function recentAuditView(state: RemoteState<RecentAuditPreview>): RecentAuditView {
  if (state.status === 'success') return { status: 'ready', ...state.data }
  if (state.status !== 'error') return { status: 'loading' }
  return { status: 'unavailable', ...describeApiError(state.error, 'os eventos recentes de auditoria') }
}
