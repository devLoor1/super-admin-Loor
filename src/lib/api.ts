const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '')
  || 'http://localhost:3334/api'

export type ApiErrorBody = {
  statusCode?: number
  code?: string
  message?: string | string[]
  correlationId?: string
  retryAfterSeconds?: number
}

/**
 * - `http`: the Control Plane answered with a non-2xx status.
 * - `network`: no response (offline, DNS, CORS, server unreachable).
 * - `timeout`: no response within the request's time budget.
 * - `malformed`: a 2xx response whose body is not the expected JSON.
 */
export type ApiErrorKind = 'http' | 'network' | 'timeout' | 'malformed'

const KIND_MESSAGES: Record<Exclude<ApiErrorKind, 'http'>, string> = {
  network: 'Falha de conexão com o Control Plane.',
  timeout: 'O Control Plane não respondeu a tempo.',
  malformed: 'Resposta inesperada do Control Plane.',
}

export class ApiError extends Error {
  /** HTTP status; 0 when no response was received (network / timeout). */
  status: number
  kind: ApiErrorKind
  code?: string
  /** Server correlation id (body, then response header) or the id this request sent. */
  correlationId?: string
  retryAfterSeconds?: number

  constructor(
    status: number,
    body: ApiErrorBody,
    options: { kind?: ApiErrorKind; correlationId?: string; retryAfterSeconds?: number } = {},
  ) {
    const kind = options.kind ?? 'http'
    const responseMessage = typeof body.message === 'string'
      ? body.message
      : Array.isArray(body.message) && body.message.every((item) => typeof item === 'string')
        ? body.message.join(', ')
        : undefined
    const message = kind !== 'http'
      ? KIND_MESSAGES[kind]
      : responseMessage || `HTTP ${status}`
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.kind = kind
    this.code = typeof body.code === 'string' ? body.code : undefined
    this.retryAfterSeconds = options.retryAfterSeconds ?? retryDelay(body.retryAfterSeconds)
    // Error JSON is untrusted too: objects must never reach a React text child.
    this.correlationId = typeof body.correlationId === 'string' && body.correlationId.trim()
      ? body.correlationId.trim().slice(0, 128)
      : options.correlationId
  }
}

/** True when the caller cancelled the request (component unmounted, newer request). */
export function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

export type ApiQuery = Record<string, string | number | boolean | null | undefined>

/** Supported cooldown metadata only; never guess a deadline from a missing value. */
export function retryDelay(value: unknown, now = Date.now()): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? Math.ceil(value) : undefined
  if (typeof value !== 'string' || !value.trim()) return undefined
  if (/^\d+(?:\.\d+)?$/.test(value.trim())) return retryDelay(Number(value))
  // Retry-After's HTTP-date representation, not arbitrary text/numeric dates.
  if (!/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), /i.test(value)) return undefined
  const date = Date.parse(value)
  return Number.isFinite(date) ? Math.max(0, Math.ceil((date - now) / 1000)) : undefined
}

function correlationId() {
  return crypto.randomUUID()
}

function queryString(query: ApiQuery | undefined) {
  if (!query) return ''
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    params.set(key, String(value))
  }
  const text = params.toString()
  return text ? `?${text}` : ''
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Low-level Control Plane transport. It knows nothing about the session:
 * authenticated reads go through `authenticatedGet` (src/lib/apiClient.ts),
 * which supplies the token and the central 401 handling.
 *
 * Never logs requests, headers or bodies.
 */
export async function apiRequest<T>(
  path: string,
  options: {
    method?: string
    body?: unknown
    token?: string | null
    query?: ApiQuery
    signal?: AbortSignal
    /** Optional time budget; when exceeded the request fails with `kind: 'timeout'`. */
    timeoutMs?: number
    /** A write must receive its documented success status, otherwise its result is uncertain. */
    successStatus?: number
    /** UUID for one logical participant creation, retained by its in-memory ledger. */
    idempotencyKey?: string
  } = {},
): Promise<T> {
  const requestId = correlationId()
  if (options.idempotencyKey !== undefined && !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(options.idempotencyKey)) throw new ApiError(400, { code: 'INVALID_IDEMPOTENCY_KEY' })
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Correlation-ID': requestId,
  }
  const multipart = typeof FormData !== 'undefined' && options.body instanceof FormData
  if (options.body !== undefined && !multipart) headers['Content-Type'] = 'application/json'
  if (options.token) headers.Authorization = `Bearer ${options.token}`
  if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey

  const controller = new AbortController()
  let timedOut = false
  const timer = options.timeoutMs
    ? window.setTimeout(() => {
        timedOut = true
        controller.abort()
      }, options.timeoutMs)
    : undefined
  const callerSignal = options.signal
  const forwardAbort = () => controller.abort()
  if (callerSignal?.aborted) controller.abort()
  else callerSignal?.addEventListener('abort', forwardAbort, { once: true })

  let response: Response
  let text: string
  try {
    response = await fetch(`${API_BASE}${path.startsWith('/') ? path : `/${path}`}${queryString(options.query)}`, {
      method: options.method || 'GET',
      headers,
      body: multipart ? options.body as FormData : options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    })
    text = await response.text()
  } catch (error) {
    if (timedOut) throw new ApiError(0, {}, { kind: 'timeout', correlationId: requestId })
    if (callerSignal?.aborted) throw error
    throw new ApiError(0, {}, { kind: 'network', correlationId: requestId })
  } finally {
    window.clearTimeout(timer)
    callerSignal?.removeEventListener('abort', forwardAbort)
  }

  const echoedId = response.headers.get('X-Correlation-ID') || requestId
  let data: unknown = null
  let parsed = true
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      parsed = false
    }
  }

  if (!response.ok) {
    // Non-JSON error bodies (proxy / HTML pages) are never surfaced as messages.
    const body = parsed && isJsonObject(data) ? (data as ApiErrorBody) : {}
    throw new ApiError(response.status, body, { correlationId: echoedId, retryAfterSeconds: retryDelay(response.headers.get('Retry-After')) ?? retryDelay(body.retryAfterSeconds) })
  }

  if (!parsed || (options.successStatus !== undefined && response.status !== options.successStatus)) {
    throw new ApiError(response.status, {}, { kind: 'malformed', correlationId: echoedId })
  }

  return data as T
}

export { API_BASE }
