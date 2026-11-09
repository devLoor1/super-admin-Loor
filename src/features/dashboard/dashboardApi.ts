import { ApiError } from '../../lib/api'
import { authenticatedGet } from '../../lib/apiClient'

/*
 * Dashboard read — Control Plane (Nest) → Core `/internal/super-admin/v1/dashboard`,
 * passed through by Nest without mapping. Shape observed on the homologation
 * API (2026-10-14, read-only GETs, field names / types / aggregate counts only):
 *
 *   GET /dashboard → { data: {
 *     scope: 'global',
 *     freshness: ISO datetime (observed advancing across reads; cache policy unspecified),
 *     kpis: { whitelabels, whitelabelsActive, investors, entrepreneurs, tenantAdmins },   numbers
 *     events: [],                                       empty; item contract unknown
 *     operationalStatus: { core: 'ok', note: 'Aggregate counts only; service health probes are not included.' },
 *   } }
 *
 * Only the fields whose meaning was PROVEN are read here:
 * - `kpis.whitelabels` = `GET /whitelabels` `meta.total` (6 = 6 on homolog);
 * - `kpis.investors`   = `GET /investors` `meta.total` = Σ registry `counts.investors` (4,762 on homolog).
 *
 * Deliberately NOT read (see docs/dashboard-read-integration-v1.md):
 * - `whitelabelsActive`: "active" definition unproven (every homolog tenant is active, nothing discriminates it);
 * - `tenantAdmins`: 6, but the registry `counts.admins` sum is 4 — counted population unknown;
 * - `entrepreneurs`: proven (= `GET /entrepreneurs` total) but the approved Dashboard has no card for it;
 * - `events`: always empty, item shape and meaning (audit? activity?) unknown;
 * - `operationalStatus`: meaning unestablished — the note itself excludes service health probes.
 */

export type DashboardOverview = {
  /** Always `'global'`: any other scope is rejected, so tenant numbers never look global. */
  scope: 'global'
  /** Timestamp supplied with the aggregate response; not a business-record modification time. */
  freshness: string | null
  kpis: {
    /** Whitelabels in the registry (same count as the Whitelabels list). `null` = not supplied. */
    whitelabels: number | null
    /** Investors across all Whitelabels (same count as the Investidores list). `null` = not supplied. */
    investors: number | null
  }
}

const malformed = (code?: string) => new ApiError(200, code ? { code } : {}, { kind: 'malformed' })

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** A count is a non-negative safe integer; anything else is "not supplied", never a guessed number. */
function count(value: unknown) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null
}

/** Require an explicit instant, not a browser-dependent date or assumed timezone. */
function timestamp(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const match = /^(\d{4})-(\d{2})-(\d{2})T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.exec(value)
  if (!match || !Number.isFinite(Date.parse(value))) return null
  const [year, month, day] = match.slice(1, 4).map(Number)
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1] ? value : null
}

/**
 * Strict on the envelope and scope, per-field on the counts: a missing or
 * invalid count makes only that card unavailable. Zero stays zero.
 */
export function parseDashboardOverview(value: unknown): DashboardOverview {
  if (!isRecord(value) || !isRecord(value.data)) throw malformed()
  const { data } = value
  if (data.scope !== 'global') throw malformed('DASHBOARD_SCOPE_NOT_GLOBAL')
  if (!isRecord(data.kpis)) throw malformed()
  const freshness = timestamp(data.freshness)
  return {
    scope: 'global',
    freshness,
    kpis: { whitelabels: count(data.kpis.whitelabels), investors: count(data.kpis.investors) },
  }
}

/** `GET /dashboard` — global aggregates. No query is sent (no tenant or period contract exists). */
export async function getDashboardOverview(signal?: AbortSignal) {
  return parseDashboardOverview(await authenticatedGet('/dashboard', { signal }))
}

const TIME_FORMAT = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })

/** The API's aggregate timestamp, explicitly displayed in Brasília time; no polling claim. */
export function freshnessLabel(freshness: string | null) {
  const instant = timestamp(freshness)
  return instant ? `Atualizado às ${TIME_FORMAT.format(new Date(instant))} (Brasília)` : 'Dados do Control Plane'
}

const COUNT_FORMAT = new Intl.NumberFormat('pt-BR')
export const formatKpi = (value: number) => COUNT_FORMAT.format(value)
