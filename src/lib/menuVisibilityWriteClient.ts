import { ApiError, apiRequest } from './api'
import { getAccessToken, getOperator, getSessionVersion, handleUnauthorized } from './authSession'
import { buildUpdateCandidate } from '../features/menu-visibility/menuVisibilityUpdate'
import type { MenuVisibilityConfig } from '../features/menu-visibility/menuVisibilityContract'
import type { VisibilityMap } from '../features/menu-visibility/visibilityModel'
import { expectedAccess } from '../features/menu-visibility/visibilityPolicy'

/** Build-time only. URL, storage and UI state have no activation authority. */
export const MENU_VISIBILITY_WRITES_ENABLED = true // Dedicated mock: changes only this tab's simulation.

/** Includes operator/roles hydration changes even when the canonical session version stays the same. */
export function menuVisibilitySessionKey() {
  const operator = getOperator()
  return JSON.stringify([getSessionVersion(), operator?.id ?? null, [...(operator?.roles ?? [])].sort()])
}

/** One allowlisted write over the canonical transport, never a parallel auth/fetch layer. */
export async function authenticatedMenuVisibilityWrite(reference: MenuVisibilityConfig, draft: VisibilityMap, expectedSession: string) {
  // Deliberately before token access, candidate processing or any network call.
  if (!MENU_VISIBILITY_WRITES_ENABLED) throw new ApiError(403, { code: 'MENU_VISIBILITY_WRITES_DISABLED' })
  const sessionVersion = getSessionVersion()
  const token = getAccessToken()
  if (!token || menuVisibilitySessionKey() !== expectedSession) throw new ApiError(401, { code: 'NO_SESSION' })
  if (expectedAccess(getOperator()?.roles) !== 'edit') throw new ApiError(403, { code: 'MENU_VISIBILITY_WRITE_FORBIDDEN' })
  const candidate = buildUpdateCandidate(reference, draft, 'edit')
  if (!candidate.valid) throw new ApiError(400, { code: 'MENU_VISIBILITY_INVALID_CANDIDATE' })
  try {
    const response = await apiRequest<unknown>('/homolog/menu-visibility', { method: 'PUT', body: candidate.body, token, timeoutMs: 20_000, successStatus: 200 })
    if (menuVisibilitySessionKey() !== expectedSession || getAccessToken() !== token) throw new ApiError(0, {}, { kind: 'network' })
    return response
  } catch (error) {
    if (error instanceof ApiError && error.status === 401 && menuVisibilitySessionKey() === expectedSession) handleUnauthorized(token, sessionVersion)
    throw error
  }
}
