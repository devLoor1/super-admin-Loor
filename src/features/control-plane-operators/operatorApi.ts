import { ApiError } from '../../lib/api'
import { authenticatedGet } from '../../lib/apiClient'
import { getOperator } from '../../lib/authSession'

export const OPERATOR_PAGE_SIZE = 20
export type OperatorOrder = 'asc' | 'desc'
export type OperatorQuery = { page: number; search: string; order: OperatorOrder }
export type ControlPlaneOperator = {
  id: string; name: string; emailMasked: string; status: string; roles: string[]
  roleDetails: { slug: string; name: string }[]
  lastLoginAt: string | null; createdAt: string; updatedAt: string
}
export type OperatorPage = { rows: ControlPlaneOperator[]; page: number; perPage: number; total: number; lastPage: number }

export const canReadOperators = (roles: readonly string[] | undefined) => roles?.includes('SUPER_ADMIN') === true
export const isOperatorId = (value: unknown): value is string => typeof value === 'string' && /^c[a-z0-9]{24}$/.test(value)
export const operatorHasControl = (value: string) => [...value].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)
const fail = (): never => { throw new ApiError(200, {}, { kind: 'malformed' }) }
const object = (v: unknown): Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v) ? v as Record<string, unknown> : fail()
const integer = (v: unknown, min: number) => typeof v === 'number' && Number.isSafeInteger(v) && v >= min ? v : fail()
const token = (v: unknown) => typeof v === 'string' && /^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(v) ? v : fail()
function text(v: unknown) {
  if (typeof v !== 'string' || !v.trim() || v.length > 512 || operatorHasControl(v)) return fail()
  return v.trim().replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[contato oculto]')
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b|\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, '[documento oculto]')
}
function maskedEmail(v: unknown) {
  if (typeof v !== 'string' || v.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return fail()
  // Drop the raw contact before it reaches component state. Do not retain the domain.
  return '••••@••••'
}
export function operatorDate(v: unknown): string {
  if (typeof v !== 'string') return fail()
  const p = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|[+-](\d{2}):(\d{2}))$/.exec(v)
  if (!p) return fail()
  const [, y, m, d, h, min, sec, oh = '0', om = '0'] = p
  if (+m < 1 || +m > 12 || +d < 1 || +d > new Date(Date.UTC(+y, +m, 0)).getUTCDate() || +h > 23 || +min > 59 || +sec > 59 || +oh > 23 || +om > 59 || !Number.isFinite(Date.parse(v))) return fail()
  return v
}
export function parseOperator(value: unknown): ControlPlaneOperator {
  const r = object(value)
  if (!isOperatorId(r.id) || !Array.isArray(r.roles) || !Array.isArray(r.roleDetails) || r.roles.length > 50 || r.roleDetails.length !== r.roles.length) return fail()
  const roles = r.roles.map(token)
  const roleDetails = r.roleDetails.map(v => { const role = object(v); return { slug: token(role.slug), name: text(role.name) } })
  if (new Set(roles).size !== roles.length || new Set(roleDetails.map(r => r.slug)).size !== roles.length || roleDetails.some(r => !roles.includes(r.slug))) return fail()
  // Explicit allow-list projection: never spread Backend records or credential fields.
  return { id: r.id, name: text(r.name), emailMasked: maskedEmail(r.email), status: token(r.status), roles, roleDetails,
    lastLoginAt: r.lastLoginAt === null ? null : operatorDate(r.lastLoginAt), createdAt: operatorDate(r.createdAt), updatedAt: operatorDate(r.updatedAt) }
}
export function parseOperatorPage(value: unknown, query: OperatorQuery): OperatorPage {
  const body = object(value), m = object(body.meta)
  if (!Array.isArray(body.data)) return fail()
  const page = integer(m.page, 1), perPage = integer(m.perPage, 1), total = integer(m.total, 0), lastPage = integer(m.lastPage, 1)
  if (page !== query.page || perPage !== OPERATOR_PAGE_SIZE || lastPage !== Math.max(1, Math.ceil(total / perPage))) return fail()
  const rows = body.data.map(parseOperator)
  if (rows.length !== Math.min(perPage, Math.max(0, total - (page - 1) * perPage)) || new Set(rows.map(r => r.id)).size !== rows.length) return fail()
  for (let i = 1; i < rows.length; i++) {
    const delta = Date.parse(rows[i].createdAt) - Date.parse(rows[i - 1].createdAt)
    if (query.order === 'asc' ? delta < 0 : delta > 0) return fail()
  }
  return { rows, page, perPage, total, lastPage }
}
export function parseOperatorDetail(value: unknown, expectedId: string): ControlPlaneOperator {
  const row = parseOperator(object(value).data)
  if (!isOperatorId(expectedId) || row.id !== expectedId) return fail()
  return row
}
function requireOperatorAccess() {
  if (!canReadOperators(getOperator()?.roles)) throw new ApiError(403, { code: 'OPERATOR_READ_DENIED' })
}
export async function listOperators(query: OperatorQuery, signal?: AbortSignal) {
  requireOperatorAccess()
  if (!Number.isSafeInteger(query.page) || query.page < 1 || query.page > 999999 || !['asc', 'desc'].includes(query.order) || typeof query.search !== 'string' || query.search.length > 120 || operatorHasControl(query.search)) throw new ApiError(400, { code: 'INVALID_OPERATOR_QUERY' })
  return parseOperatorPage(await authenticatedGet('/operators', { query: { page: query.page, perPage: OPERATOR_PAGE_SIZE, search: query.search.trim(), order: query.order }, signal }), query)
}
export async function getOperatorDetail(id: string, signal?: AbortSignal) {
  requireOperatorAccess()
  if (!isOperatorId(id)) throw new ApiError(404, { code: 'INVALID_OPERATOR_ID' })
  return parseOperatorDetail(await authenticatedGet(`/operators/${encodeURIComponent(id)}`, { signal }), id)
}
