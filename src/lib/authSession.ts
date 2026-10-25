import { useSyncExternalStore } from 'react'
import { ApiError, apiRequest, isAbortError } from './api'

/*
 * Control Plane operator session (tab-scoped sessionStorage, Bearer token).
 *
 * - Login: `POST /auth/login` stores the token + operator.
 * - Hydration: a session restored from storage is checked once with
 *   `GET /auth/me` (in the background, so startup stays responsive); the
 *   response refreshes the operator shown in the shell.
 * - Authoritative 401 (from `/auth/me` or any authenticated read): the
 *   session is cleared once, the Login screen explains why, no retry.
 * - Logout is local only: the Control Plane exposes no logout/revocation
 *   endpoint, so the token simply stops being used (it stays valid on the
 *   server until it expires — server-side revocation is a Backend/Product
 *   decision, not implemented here).
 *
 * No refresh tokens, no localStorage, no passwords stored, nothing logged.
 */

const TOKEN_KEY = 'loor_sa_mock_session'
const OPERATOR_KEY = 'loor_sa_mock_operator'

/** Background validation must not remain pending for a minute. No automatic retry. */
const VALIDATION_TIMEOUT_MS = 15_000
const LOGIN_TIMEOUT_MS = 20_000

export type SessionOperator = {
  id: string
  name: string
  email: string
  roles: string[]
}

export type LoginResponse = {
  accessToken: string
  tokenType: string
  expiresIn?: string
  operator: SessionOperator
}

/** Why the Login screen is shown, when it is not a first visit. */
export type AuthNotice = 'session_expired'

// Used only when browser storage fails. Null tombstones also keep logout safe
// if removing an existing storage entry fails; nothing persists outside this tab.
const volatileStorage = new Map<string, string | null>()
let sessionVersion = 0

export function getSessionVersion() {
  return sessionVersion
}

function readStorage(key: string): string | null {
  if (volatileStorage.has(key)) return volatileStorage.get(key) ?? null
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value)
    volatileStorage.delete(key)
  } catch {
    // Storage unavailable (blocked / private mode): the session lives only until reload.
    volatileStorage.set(key, value)
  }
}

function removeStorage(key: string) {
  volatileStorage.set(key, null)
  try {
    sessionStorage.removeItem(key)
    volatileStorage.delete(key)
  } catch {
    // Nothing stored.
  }
}

/* ---------- change notifications ---------- */

const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

/** Called whenever the token or the operator changes (login, hydration, logout, 401). */
export function subscribeSession(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/* ---------- reads ---------- */

export function getAccessToken(): string | null {
  return readStorage(TOKEN_KEY) || null
}

function parseOperator(value: unknown): SessionOperator | null {
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>
  if (typeof record.id !== 'string' || typeof record.name !== 'string' || typeof record.email !== 'string') return null
  if (!Array.isArray(record.roles) || !record.roles.every((role) => typeof role === 'string')) return null
  const roles = record.roles as string[]
  return { id: record.id, name: record.name, email: record.email, roles }
}

// Cached by raw value so repeated reads return the same object (useSyncExternalStore).
let cachedOperatorRaw: string | null | undefined
let cachedOperator: SessionOperator | null = null

export function getOperator(): SessionOperator | null {
  const raw = readStorage(OPERATOR_KEY)
  if (raw !== cachedOperatorRaw) {
    cachedOperatorRaw = raw
    try {
      cachedOperator = raw ? parseOperator(JSON.parse(raw)) : null
    } catch {
      cachedOperator = null
    }
  }
  return cachedOperator
}

/** A token is present. The server is the authority on whether it is still valid. */
export function isAuthenticated(): boolean {
  return Boolean(getAccessToken())
}

/** Current operator, re-rendering on login / hydration / logout. */
export function useSessionOperator() {
  return useSyncExternalStore(subscribeSession, getOperator, () => null)
}

/* ---------- writes ---------- */

// Token issued by a login in this page load: already proven, no `/auth/me` needed.
let verifiedToken: string | null = null
let authNotice: AuthNotice | null = null

export function persistSession(payload: LoginResponse) {
  sessionVersion += 1
  writeStorage(TOKEN_KEY, payload.accessToken)
  writeStorage(OPERATOR_KEY, JSON.stringify(payload.operator))
  emit()
}

export function clearSession() {
  sessionVersion += 1
  verifiedToken = null
  removeStorage(TOKEN_KEY)
  removeStorage(OPERATOR_KEY)
  emit()
}

/** Clear the Control Plane session locally and return to the login screen. */
export function logout() {
  authNotice = null
  clearSession()
  window.location.hash = '#/login'
}

/** Reason to show on the Login screen (read-only; see `clearAuthNotice`). */
export function peekAuthNotice(): AuthNotice | null {
  return authNotice
}

export function clearAuthNotice() {
  authNotice = null
}

/**
 * Central response to an authoritative 401. Idempotent: only the first 401
 * for the current token clears the session; 401s for a token that is no
 * longer current (a request started before logout / re-login) are ignored.
 * Navigation to Login is done by the App's session guard.
 */
export function handleUnauthorized(usedToken: string | null, usedVersion: number) {
  const current = getAccessToken()
  if (!current || usedVersion !== sessionVersion || usedToken !== current) return
  authNotice = 'session_expired'
  clearSession()
}

function isLoginResponse(value: unknown): value is LoginResponse {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return typeof record.accessToken === 'string' && record.accessToken !== ''
    && record.tokenType === 'Bearer' && parseOperator(record.operator) !== null
}

export async function loginWithCredentials(email: string, password: string) {
  const payload = await apiRequest<unknown>('/auth/login', {
    method: 'POST',
    body: { email, password },
    timeoutMs: LOGIN_TIMEOUT_MS,
  })
  if (!isLoginResponse(payload)) throw new ApiError(200, {}, { kind: 'malformed' })
  const session: LoginResponse = { ...payload, operator: parseOperator(payload.operator)! }
  authNotice = null
  verifiedToken = session.accessToken
  persistSession(session)
  return session
}

/**
 * - `valid`: the server confirmed the token (operator refreshed).
 * - `invalid`: the server answered 401 — the session was cleared.
 * - `unverified`: no authoritative answer (network, timeout, 5xx, 403,
 *   malformed, cancelled). The session is kept; every authenticated read is
 *   still checked by the server and a later 401 ends the session.
 */
export type SessionValidation = 'valid' | 'invalid' | 'unverified'

/** Validate / hydrate the stored session with `GET /auth/me` (once per restored token). */
export async function validateSession(signal?: AbortSignal): Promise<SessionValidation> {
  const token = getAccessToken()
  const usedVersion = getSessionVersion()
  if (!token) return 'invalid'
  if (token === verifiedToken) return 'valid'
  try {
    const me = await apiRequest<unknown>('/auth/me', { token, signal, timeoutMs: VALIDATION_TIMEOUT_MS })
    if (signal?.aborted || getAccessToken() !== token || getSessionVersion() !== usedVersion) return 'unverified'
    const operator = parseOperator(me)
    if (!operator) return 'unverified'
    verifiedToken = token
    if (JSON.stringify(operator) !== readStorage(OPERATOR_KEY)) {
      writeStorage(OPERATOR_KEY, JSON.stringify(operator))
      emit()
    }
    return 'valid'
  } catch (error) {
    if (isAbortError(error)) return 'unverified'
    if (error instanceof ApiError && error.status === 401) {
      handleUnauthorized(token, usedVersion)
      return 'invalid'
    }
    return 'unverified'
  }
}
