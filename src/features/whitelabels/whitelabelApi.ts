import type { StatusTone } from '../../components/ui/StatusPill'
import { ApiError } from '../../lib/api'
import { authenticatedGet } from '../../lib/apiClient'

/*
 * Whitelabel reads — Control Plane (Nest) contract, read-only.
 *
 *   GET /whitelabels?page&perPage&search&active   → { data: ControlPlaneWhitelabel[], meta }
 *   GET /whitelabels/:id                           → ControlPlaneWhitelabel (direct object)
 *
 * Only query parameters the Backend validates are sent (unknown ones are a
 * 400). `sort` / `order` are not sent: the Core sort keys are not part of
 * the published contract yet.
 *
 * Every field below is Backend-authoritative except where noted; nothing is
 * filled from the prototype rows. Missing optional values stay `null` and
 * render as "sem dados".
 */

export type WhitelabelStatus = 'active' | 'inactive'
export type WhitelabelStatusFilter = 'all' | WhitelabelStatus

export type WhitelabelRecord = {
  /** Core numeric id as a string (`idKey`). Never a `wl_proto_*` prototype id. */
  id: string
  name: string
  slug: string
  baseUrl: string | null
  /** Hostname derived by the Backend from `baseUrl`. */
  domain: string | null
  /** Only active | inactive exists in the API (no setup / draft lifecycle). */
  status: WhitelabelStatus
  /** Backend `admins` (= counts.admins). */
  admins: number | null
  /** Explicit Control Plane counts.investors; absent/invalid is never authoritative zero. */
  investorCount?: number | null
  /** Always null today: Core exposes no applications aggregate. */
  applications: number | null
  /** Always null today: Core exposes no integrations aggregate. */
  integrations: number | null
  createdAt: string | null
  updatedAt: string | null
}

export type WhitelabelListResult = {
  rows: WhitelabelRecord[]
  page: number
  perPage: number
  total: number
  lastPage: number
}

export const WHITELABEL_PAGE_SIZE = 10

export const WHITELABEL_STATUS_META: Record<WhitelabelStatus, { label: string; tone: StatusTone }> = {
  active: { label: 'Ativo', tone: 'success' },
  inactive: { label: 'Inativo', tone: 'muted' },
}

/** Backend Whitelabel ids are Core numeric ids; anything else is never sent to the API. */
export function isServerWhitelabelId(id: string | undefined): id is string {
  return typeof id === 'string' && /^\d{1,18}$/.test(id)
}

const malformed = () => new ApiError(200, {}, { kind: 'malformed' })

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const optionalString = (value: unknown) => (typeof value === 'string' && value.trim() !== '' ? value : null)

function optionalCount(value: unknown) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null
}

function optionalDate(value: unknown) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : null
}

/** Strict mapping: a record without a usable id, name or status is a malformed response. */
export function parseWhitelabel(value: unknown): WhitelabelRecord {
  if (!isRecord(value)) throw malformed()
  const id = typeof value.idKey === 'string' ? value.idKey : Number.isSafeInteger(value.id) ? String(value.id) : null
  if (!isServerWhitelabelId(id ?? undefined)) throw malformed()
  if (Number.isSafeInteger(value.id) && String(value.id) !== id) throw malformed()
  if (typeof value.name !== 'string' || value.name.trim() === '') throw malformed()
  const status: WhitelabelStatus | null =
    value.status === 'active' || value.status === 'inactive'
      ? value.status
      : typeof value.isActive === 'boolean'
        ? value.isActive ? 'active' : 'inactive'
        : null
  if (!status) throw malformed()
  if (typeof value.isActive === 'boolean' && (status === 'active') !== value.isActive) throw malformed()
  return {
    id: id!,
    name: value.name.trim(),
    slug: typeof value.slug === 'string' ? value.slug : '',
    baseUrl: optionalString(value.baseUrl),
    domain: optionalString(value.domain),
    status,
    admins: optionalCount(value.admins),
    ...(isRecord(value.counts) && Object.prototype.hasOwnProperty.call(value.counts, 'investors')
      ? { investorCount: optionalCount(value.counts.investors) } : {}),
    applications: optionalCount(value.applications),
    integrations: optionalCount(value.integrations),
    createdAt: optionalDate(value.createdAt),
    updatedAt: optionalDate(value.updatedAt),
  }
}

function count(value: unknown, minimum: number) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < minimum) throw malformed()
  return value
}

export function parseWhitelabelList(value: unknown): WhitelabelListResult {
  if (!isRecord(value) || !Array.isArray(value.data) || !isRecord(value.meta)) throw malformed()
  const { meta } = value
  // Only an empty Core result may use lastPage=0; nonempty coverage cannot be normalized to complete.
  if (meta.total !== 0 && meta.lastPage === 0) throw malformed()
  const result = {
    rows: value.data.map(parseWhitelabel),
    page: count(meta.page, 1),
    perPage: count(meta.perPage, 1),
    total: count(meta.total, 0),
    // Some Core versions report lastPage 0 for an empty result.
    lastPage: Math.max(1, count(meta.lastPage, 0)),
  }
  // An empty in-range page with a nonzero total would otherwise leave the UI
  // stuck loading forever. Empty out-of-range pages remain valid and are clamped.
  if (result.rows.length > result.perPage || result.rows.length > result.total
    || (result.total > 0 && result.page <= result.lastPage && result.rows.length === 0)
    || (result.total === 0 && result.lastPage !== 1)
    || new Set(result.rows.map((row) => row.id)).size !== result.rows.length) throw malformed()
  return result
}

export type WhitelabelListParams = {
  page: number
  search: string
  status: WhitelabelStatusFilter
}

export async function listWhitelabels(params: WhitelabelListParams, signal?: AbortSignal) {
  const body = await authenticatedGet('/whitelabels', {
    signal,
    query: {
      page: params.page,
      perPage: WHITELABEL_PAGE_SIZE,
      search: params.search || undefined,
      active: params.status === 'all' ? undefined : String(params.status === 'active'),
    },
  })
  return parseWhitelabelList(body)
}

export async function getWhitelabel(id: string, signal?: AbortSignal) {
  if (!isServerWhitelabelId(id)) throw new ApiError(404, { code: 'INVALID_WHITELABEL_ID' })
  const body = await authenticatedGet(`/whitelabels/${encodeURIComponent(id)}`, { signal })
  return parseWhitelabel(body)
}

/* ---------- presentation helpers (frontend-derived, not Backend data) ---------- */

const DATE_FORMAT = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'America/Sao_Paulo',
})

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
})

/** Backend ISO timestamp → dd/mm/aaaa (Brasília); null stays null. */
export function formatWhitelabelDate(value: string | null, withTime = false) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return (withTime ? DATE_TIME_FORMAT : DATE_FORMAT).format(date)
}

const AVATAR_TONES = ['blue', 'violet'] as const

/** Deterministic avatar presentation from the id — decoration only, not a Backend field. */
export function whitelabelAvatar(record: Pick<WhitelabelRecord, 'id' | 'name'>) {
  const initial = record.name.trim().charAt(0).toLocaleUpperCase('pt-BR')
  const tone = AVATAR_TONES[Number(record.id.slice(-3)) % AVATAR_TONES.length]
  return { initial: /\p{L}|\p{N}/u.test(initial) ? initial : undefined, tone }
}
