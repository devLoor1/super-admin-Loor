const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '')
  || 'http://localhost:3334/api'

export type ApiErrorBody = {
  statusCode?: number
  code?: string
  message?: string | string[]
  correlationId?: string
}

export class ApiError extends Error {
  status: number
  code?: string
  correlationId?: string

  constructor(status: number, body: ApiErrorBody) {
    const message = Array.isArray(body.message)
      ? body.message.join(', ')
      : body.message || `HTTP ${status}`
    super(message)
    this.status = status
    this.code = body.code
    this.correlationId = body.correlationId
  }
}

function correlationId() {
  return crypto.randomUUID()
}

export async function apiRequest<T>(
  path: string,
  options: {
    method?: string
    body?: unknown
    token?: string | null
  } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Correlation-ID': correlationId(),
  }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (options.token) headers.Authorization = `Bearer ${options.token}`

  const response = await fetch(`${API_BASE}${path.startsWith('/') ? path : `/${path}`}`, {
    method: options.method || 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  const text = await response.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = { message: text }
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, (data || {}) as ApiErrorBody)
  }

  return data as T
}

export { API_BASE }
