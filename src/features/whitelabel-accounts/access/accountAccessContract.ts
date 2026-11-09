import { ApiError } from '../../../lib/api'
import { isAccountsWhitelabelId, isServerAccountId, type AccountDetail, type AccountRef } from '../accountsApi'

export type AccessKind = 'investor' | 'entrepreneur'
export type AccessAction = 'pause' | 'reactivate'
export type AccessRef = AccountRef & { kind: AccessKind }
export type AccessCommand = AccessRef & { action: AccessAction; from: 'active' | 'paused'; reason?: string }
// Core requires nonblank text; 500 is the storage column limit, not a Core min-length rule.
export const ACCESS_REASON_LIMIT = 500
export const accessWriter = (roles: readonly string[] | undefined) => !!roles?.some(role => role === 'SUPER_ADMIN' || role === 'SUPPORT_ADMIN')
export const accessKey = (ref: AccountRef) => `${ref.whitelabelId}:${ref.kind}:${ref.accountId}`
export const expectedAccess = (action: AccessAction) => action === 'pause' ? 'paused' : 'active'
export function validAccessRef(ref: AccountRef): ref is AccessRef {
  return !!ref && (ref.kind === 'investor' || ref.kind === 'entrepreneur') && isAccountsWhitelabelId(ref.whitelabelId) && isServerAccountId(ref.accountId)
}
export function eligibleAccessAction(detail: AccountDetail, tenantId: string): AccessAction | null {
  const ref = { kind: detail.kind, whitelabelId: tenantId, accountId: detail.record.id }
  if (!validAccessRef(ref) || detail.record.whitelabelId !== tenantId) return null
  return detail.record.accessState === 'active' ? 'pause' : detail.record.accessState === 'paused' ? 'reactivate' : null
}
/** Rebuilt at the transport boundary too: no type alias, route, body, or Admin smuggling. */
export function validateAccessCommand(value: AccessCommand): AccessCommand {
  if (!value || !validAccessRef(value) || Object.keys(value).some(k => !['whitelabelId', 'kind', 'accountId', 'action', 'from', 'reason'].includes(k)) ||
      !((value.action === 'pause' && value.from === 'active') || (value.action === 'reactivate' && value.from === 'paused'))) {
    throw new ApiError(400, { code: 'INVALID_ACCESS_COMMAND' })
  }
  if (value.action === 'reactivate' && value.reason !== undefined) throw new ApiError(400, { code: 'INVALID_ACCESS_COMMAND' })
  const reason = typeof value.reason === 'string' ? value.reason.trim() : ''
  if (value.action === 'pause' && (!reason || reason.length > ACCESS_REASON_LIMIT)) throw new ApiError(422, { code: 'E_REASON_REQUIRED' })
  return { whitelabelId: value.whitelabelId, accountId: value.accountId, kind: value.kind, action: value.action, from: value.from,
    ...(value.action === 'pause' ? { reason } : {}) }
}
export function accessCommand(detail: AccountDetail, tenantId: string, reason: string): AccessCommand {
  const action = eligibleAccessAction(detail, tenantId)
  if (!action || (detail.kind !== 'investor' && detail.kind !== 'entrepreneur')) throw new ApiError(400, { code: 'INVALID_ACCESS_COMMAND' })
  return validateAccessCommand({ whitelabelId: tenantId, accountId: detail.record.id, kind: detail.kind, action,
    from: action === 'pause' ? 'active' : 'paused', ...(action === 'pause' ? { reason } : {}) })
}
