const TOKEN_KEY = 'loor_sa_access_token'
const OPERATOR_KEY = 'loor_sa_operator'

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

export function getAccessToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY)
}

export function getOperator(): SessionOperator | null {
  const raw = sessionStorage.getItem(OPERATOR_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as SessionOperator
  } catch {
    return null
  }
}

export function isAuthenticated(): boolean {
  return Boolean(getAccessToken())
}

export function persistSession(payload: LoginResponse) {
  sessionStorage.setItem(TOKEN_KEY, payload.accessToken)
  sessionStorage.setItem(OPERATOR_KEY, JSON.stringify(payload.operator))
}

export function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(OPERATOR_KEY)
}

/** Clear Control Plane session and return to the login screen. */
export function logout() {
  clearSession()
  window.location.hash = '#/login'
}

export async function loginWithCredentials(email: string, password: string) {
  const { apiRequest } = await import('./api')
  const payload = await apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
  })
  persistSession(payload)
  return payload
}
