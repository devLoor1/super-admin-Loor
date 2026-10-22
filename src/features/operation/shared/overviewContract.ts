import { ApiError } from '../../../lib/api'
import { kycReadDate, kycReadMask, kycReadName } from '../../compliance-kyc/kycReadApi'

// Explicit safe projections only. Raw overview objects are never retained in UI state.
export const malformedOverview = (): never => { throw new ApiError(200, {}, { kind: 'malformed' }) }
export const object = (v: unknown): Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v) ? v as Record<string, unknown> : malformedOverview()
export const section = (v: unknown) => v == null ? null : object(v)
export const integer = (v: unknown, minimum = 0): number => typeof v === 'number' && Number.isSafeInteger(v) && v >= minimum ? v : malformedOverview()
export const id = (v: unknown) => String(integer(v, 1))
export const token = (v: unknown) => typeof v === 'string' && /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(v) ? v : null
export const text = kycReadName
export const date = kycReadDate
export const mask = kycReadMask
export const bool = (v: unknown) => typeof v === 'boolean' ? v : null
export const cents = (v: unknown) => v == null ? null : integer(v)
export function records(v: unknown, cap: number) {
  if (!Array.isArray(v) || v.length > cap) return malformedOverview()
  const rows = v.map(object)
  if (new Set(rows.map(r => id(r.id))).size !== rows.length) return malformedOverview()
  return rows
}
export function profile(value: unknown, expectedId: string) {
  const p = object(value), profileId = id(p.id), whitelabelId = id(p.whitelabelId)
  if (profileId !== expectedId) return malformedOverview()
  return { id: profileId, whitelabelId, fullName: text(p.fullName), createdAt: date(p.createdAt), status: token(p.status), personalInformationFilled: bool(p.personalInformationFilled) }
}
export function account(value: unknown) {
  const a = section(value)
  return a ? { accessState: token(a.accessState), reason: text(a.reason), pausedAt: date(a.pausedAt), emailVerifiedAt: date(a.emailVerifiedAt), createdAt: date(a.createdAt), updatedAt: date(a.updatedAt), lastLoginAt: date(a.lastLoginAt) } : null
}
export function money(value: number | null) {
  return value === null ? 'Não disponível' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100)
}
