import { ApiError, apiRequest, type ApiQuery } from './api'
import { getAccessToken, getSessionVersion, handleUnauthorized } from './authSession'

/** Bounded wait; a cold/unavailable service can be retried explicitly by the user. */
const READ_TIMEOUT_MS = 20_000

/**
 * Authenticated Control Plane read. Screens call this instead of touching
 * the token or sessionStorage:
 * - forwards the current Bearer token (and a fresh X-Correlation-ID);
 * - an authoritative 401 ends the session centrally (`handleUnauthorized`)
 *   and is rethrown so the caller can stop — never retried;
 * - GET only: no write surface exists in this integration unit.
 */
export async function authenticatedGet<T = unknown>(
  path: string,
  options: { query?: ApiQuery; signal?: AbortSignal } = {},
): Promise<T> {
  const token = getAccessToken()
  const sessionVersion = getSessionVersion()
  if (!token) throw new ApiError(401, { code: 'NO_SESSION' })
  try {
    const data = await apiRequest<T>(path, { token, query: options.query, signal: options.signal, timeoutMs: READ_TIMEOUT_MS })
    if (getAccessToken() !== token || getSessionVersion() !== sessionVersion) {
      throw new DOMException('The session changed while this read was pending', 'AbortError')
    }
    return data
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) handleUnauthorized(token, sessionVersion)
    throw error
  }
}
