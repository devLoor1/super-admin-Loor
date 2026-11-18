import { ApiError, apiRequest } from '../../lib/api'
import { getAccessToken, getOperator, getSessionVersion, handleUnauthorized } from '../../lib/authSession'
import { WHITELABEL_WRITES_ENABLED, WHITELABEL_WRITE_ROLE } from '../whitelabels/crud/whitelabelMutationContract'

/** Same create write gate as CRUD — Product must enable the env before implantation UI can POST. */
export const PROVISIONING_WRITES_ENABLED = WHITELABEL_WRITES_ENABLED

export const PROVISIONING_STEP_KEYS = [
  'CREATE_TENANT',
  'APPLY_SETTINGS_TEMPLATE',
  'UPLOAD_BRAND',
  'INITIAL_ADMIN',
  'TERMS',
  'SMTP',
  'GATEWAY_CONFIG',
  'FE_DEPLOY_CHECK',
  'DNS_CHECK',
  'VALIDATE',
  'DELIVER',
] as const

export type ProvisioningStepKey = (typeof PROVISIONING_STEP_KEYS)[number]

export const PROVISIONING_STATUSES = [
  'PENDING',
  'RUNNING',
  'WAITING_MANUAL_ACTION',
  'FAILED',
  'COMPLETED',
  'CANCELLED',
] as const

export type ProvisioningStatus = (typeof PROVISIONING_STATUSES)[number]

export const PROVISIONING_STEP_STATUSES = [
  'PENDING',
  'RUNNING',
  'WAITING_MANUAL_ACTION',
  'SUCCESS',
  'FAILED',
  'SKIPPED',
] as const

export type ProvisioningStepStatus = (typeof PROVISIONING_STEP_STATUSES)[number]

/** Legacy keys kept for typing; shared-frontend homolog no longer parks on them. */
export const MANUAL_GATE_KEYS = ['FE_DEPLOY_CHECK', 'DNS_CHECK'] as const
export type ManualGateKey = (typeof MANUAL_GATE_KEYS)[number]

export type ProvisioningStep = {
  key: ProvisioningStepKey
  status: ProvisioningStepStatus
  attempts: number
  payload: unknown
  result: unknown
  lastErrorCode: string | null
  lastErrorMessage: string | null
  startedAt: string | null
  completedAt: string | null
}

export type FrontendEnvironment = 'investor' | 'entrepreneur' | 'admin'

export type ProvisioningDelivery = {
  name: string
  slug: string
  baseUrl: string
  whitelabelId: number | null
  enabledEnvironments?: EnvironmentCapability[]
  admin: { email: string; name: string | null } | null
  /** Confirmed on FE_DEPLOY_CHECK / DNS_CHECK. Only contracted envs appear. */
  urls: {
    primary: string
    investor?: string | null
    entrepreneur?: string | null
    admin?: string | null
  }
  /** Homolog naming convention only — not live until gates confirm. */
  suggestedUrls: {
    investor?: string
    entrepreneur?: string
    admin?: string
    note: string
  }
  credentialsNote: string
  /** Safe summary only (no URLs/bytes): which branding Core received. */
  branding: { email: boolean; mainAreaAssetRef?: string } | null
  generatedAt: string
  correlationId: string | null
}

export type ProvisioningRecord = {
  id: string
  whitelabelId: number | null
  name: string
  slug: string
  baseUrl: string
  status: ProvisioningStatus
  currentStep: ProvisioningStepKey | null
  requestedBy: string | null
  correlationId: string | null
  templateFromWhitelabelId: number | null
  errorCode: string | null
  errorMessage: string | null
  progress: { completed: number; total: number; percentage: number }
  steps: ProvisioningStep[]
  delivery: ProvisioningDelivery | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export const MAIN_AREA_PAGES = ['login', 'register', 'quick_profile'] as const
export type MainAreaPage = (typeof MAIN_AREA_PAGES)[number]

/**
 * Client branding applied by UPLOAD_BRAND (runtime settings only).
 * Institutional logo / favicon / PWA icons are build-time (`VITE_*`) and are NOT part of this contract.
 * The main_area image is never inside this JSON: it travels as multipart field `mainAreaImage`.
 */
export type ProvisioningBranding = {
  email?: { primary_color?: string | null; logo_url?: string | null }
  loginBrandPanelTextColor?: string
  mainArea?: { pages?: MainAreaPage[] }
}

export const MAIN_AREA_IMAGE_FIELD = 'mainAreaImage'
export const MAIN_AREA_IMAGE_MAX_BYTES = 20 * 1024 * 1024
export const MAIN_AREA_IMAGE_TYPES = ['image/jpeg', 'image/png'] as const

export type EnvironmentCapability = 'INVESTOR' | 'ENTREPRENEUR' | 'ADMIN'

export type FrontendUrlMode = 'HOSTNAME' | 'PATH'

export type CreateProvisioningBody = {
  name: string
  slug: string
  baseUrl: string
  /** Contracted FE environments. Omitted on legacy clients → Nest defaults to all three. */
  enabledEnvironments?: EnvironmentCapability[]
  /** PATH = shared Netlify /w/{slug} (homolog demo). HOSTNAME = {slug}.*.loor.vc. */
  urlMode?: FrontendUrlMode
  templateFromWhitelabelId?: number
  initialAdmin?: { name?: string; email: string; temporaryPassword: string }
  terms?: { title: string; contentMarkdown: string }
  smtp?: Record<string, unknown>
  gateway?: { items: unknown[] }
  branding?: ProvisioningBranding
  skipFeDeployCheck?: boolean
  skipDnsCheck?: boolean
}

export type RetryProvisioningBody = {
  stepKey?: ProvisioningStepKey
  smtp?: Record<string, unknown>
  initialAdmin?: { name?: string; email: string; temporaryPassword: string }
  gateway?: { items: unknown[] }
  branding?: ProvisioningBranding
}

export type ManualDnsHostBody = {
  url: string
  status: 'ok'
  https: true
}

export type CompleteManualBody = {
  checklist: {
    investor?: boolean
    entrepreneur?: boolean
    admin?: boolean
    resolves?: boolean
    https?: boolean
  }
  /** Required for FE_DEPLOY_CHECK. */
  urls?: Record<FrontendEnvironment, string>
  /** Required for DNS_CHECK. */
  hosts?: Record<FrontendEnvironment, ManualDnsHostBody>
  note?: string
}

/** Infrastructure bases only — never a client slug. Overridable via VITE_*_BASE_URL. */
const SHARED_PATH_ORIGINS: Record<FrontendEnvironment, string> = {
  investor: String(import.meta.env.VITE_INVESTOR_BASE_URL || 'https://homolog.loor.vc').replace(/\/+$/, ''),
  entrepreneur: String(import.meta.env.VITE_ENTREPRENEUR_BASE_URL || 'https://homolog.empresa.loor.vc').replace(/\/+$/, ''),
  admin: String(import.meta.env.VITE_ADMIN_BASE_URL || 'https://homolog.admin.loor.vc').replace(/\/+$/, ''),
}

/** Homolog URL convention (PATH = shared Netlify demo; HOSTNAME = future wildcards). */
export function suggestedFrontendUrls(
  slug: string,
  mode: FrontendUrlMode = 'PATH',
): Record<FrontendEnvironment, string> {
  const safe = slug.trim().toLowerCase()
  if (mode === 'PATH') {
    return {
      investor: safe ? `${SHARED_PATH_ORIGINS.investor}/w/${safe}` : '',
      entrepreneur: safe ? `${SHARED_PATH_ORIGINS.entrepreneur}/w/${safe}` : '',
      admin: safe ? `${SHARED_PATH_ORIGINS.admin}/w/${safe}` : '',
    }
  }
  return {
    investor: safe ? `https://${safe}.investor.loor.vc` : '',
    entrepreneur: safe ? `https://${safe}.empresa.loor.vc` : '',
    admin: safe ? `https://${safe}.admin.loor.vc` : '',
  }
}

/** Investor baseUrl suggestion for PATH mode (empty when slug is blank). */
export function suggestedPathInvestorBaseUrl(slug: string): string {
  return suggestedFrontendUrls(slug, 'PATH').investor
}

/**
 * Auto-fill URL base from slug in PATH mode when the field is empty or still
 * equals the previous suggestion (so a manual edit is not overwritten).
 */
export function nextBaseUrlAfterSlugChange(input: {
  slug: string
  previousSlug: string
  baseUrl: string
  urlMode?: FrontendUrlMode
}): string {
  const mode = input.urlMode ?? defaultProvisioningUrlMode()
  if (mode !== 'PATH') return input.baseUrl
  const current = input.baseUrl.trim()
  const previousSuggested = suggestedPathInvestorBaseUrl(input.previousSlug).trim()
  if (current && current !== previousSuggested) return input.baseUrl
  return suggestedPathInvestorBaseUrl(input.slug)
}

/** Homolog SA defaults to PATH until wildcard DNS exists. */
export function defaultProvisioningUrlMode(): FrontendUrlMode {
  const raw = String(import.meta.env.VITE_PROVISIONING_URL_MODE || 'PATH').trim().toUpperCase()
  return raw === 'HOSTNAME' ? 'HOSTNAME' : 'PATH'
}

export function isHttpsOrigin(value: string): boolean {
  try {
    const url = new URL(value.trim())
    return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password
  } catch {
    return false
  }
}

const invalid = (): never => {
  throw new ApiError(200, {}, { kind: 'malformed' })
}

const object = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : invalid()

const own = (value: Record<string, unknown>, key: string): unknown =>
  Object.getOwnPropertyDescriptor(value, key)?.value

const text = (value: unknown, max: number, empty = false): string => {
  if (typeof value !== 'string' || value.length > max) return invalid()
  if (!empty && !value.length) return invalid()
  if ([...value].some((char) => char.charCodeAt(0) < 32 && !['\t', '\r', '\n'].includes(char))) return invalid()
  return value
}

const nullableText = (value: unknown, max: number): string | null =>
  value === null || value === undefined ? null : text(value, max, true)

const enumOf = <T extends string>(value: unknown, allowed: readonly T[]): T =>
  typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : invalid()

const positiveInt = (value: unknown): number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : invalid()

const nullablePositive = (value: unknown): number | null =>
  value === null || value === undefined ? null : positiveInt(value)

const iso = (value: unknown): string | null => {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string' || value.length > 64 || !Number.isFinite(Date.parse(value))) return invalid()
  return value
}

const requiredIso = (value: unknown): string => {
  const next = iso(value)
  return next ?? invalid()
}

/** Exact secret field names only — do not match `credentialsNote` / similar safe labels. */
const SECRET_FIELD = /^(password|passwd|secret|token|access_token|refresh_token|api[_-]?key|authorization|credentials|client_secret|private[_-]?key|temporaryPassword)$/i

function rejectSecrets(row: Record<string, unknown>) {
  for (const key of Object.keys(row)) {
    if (SECRET_FIELD.test(key)) invalid()
  }
}

function parseStep(raw: unknown): ProvisioningStep {
  const row = object(raw)
  rejectSecrets(row)
  return {
    key: enumOf(own(row, 'key'), PROVISIONING_STEP_KEYS),
    status: enumOf(own(row, 'status'), PROVISIONING_STEP_STATUSES),
    attempts: typeof own(row, 'attempts') === 'number' && Number.isSafeInteger(own(row, 'attempts')) && (own(row, 'attempts') as number) >= 0
      ? (own(row, 'attempts') as number)
      : invalid(),
    payload: own(row, 'payload') ?? null,
    result: own(row, 'result') ?? null,
    lastErrorCode: nullableText(own(row, 'lastErrorCode'), 128),
    lastErrorMessage: nullableText(own(row, 'lastErrorMessage'), 2000),
    startedAt: iso(own(row, 'startedAt')),
    completedAt: iso(own(row, 'completedAt')),
  }
}

function parseEnabledEnvironments(raw: unknown): EnvironmentCapability[] | undefined {
  if (raw === undefined || raw === null) return undefined
  if (!Array.isArray(raw)) return invalid()
  const allowed = ['INVESTOR', 'ENTREPRENEUR', 'ADMIN'] as const
  const out: EnvironmentCapability[] = []
  for (const item of raw) {
    if (typeof item !== 'string' || !(allowed as readonly string[]).includes(item)) return invalid()
    if (!out.includes(item as EnvironmentCapability)) out.push(item as EnvironmentCapability)
  }
  return out
}

function parseDeliveryBranding(raw: unknown): ProvisioningDelivery['branding'] {
  if (raw === null || raw === undefined) return null
  const row = object(raw)
  rejectSecrets(row)
  const email = own(row, 'email')
  if (typeof email !== 'boolean') return invalid()
  const ref = own(row, 'mainAreaAssetRef')
  return { email, ...(ref === undefined || ref === null ? {} : { mainAreaAssetRef: text(ref, 128) }) }
}

function parseDelivery(raw: unknown): ProvisioningDelivery | null {
  if (raw === null || raw === undefined) return null
  const row = object(raw)
  rejectSecrets(row)
  const adminRaw = own(row, 'admin')
  let admin: ProvisioningDelivery['admin'] = null
  if (adminRaw !== null && adminRaw !== undefined) {
    const adminRow = object(adminRaw)
    rejectSecrets(adminRow)
    admin = {
      email: text(own(adminRow, 'email'), 191),
      name: nullableText(own(adminRow, 'name'), 191),
    }
  }
  const urls = object(own(row, 'urls'))
  const suggested = object(own(row, 'suggestedUrls'))
  return {
    name: text(own(row, 'name'), 120),
    slug: text(own(row, 'slug'), 80),
    baseUrl: text(own(row, 'baseUrl'), 512),
    whitelabelId: nullablePositive(own(row, 'whitelabelId')),
    admin,
    urls: {
      primary: text(own(urls, 'primary'), 512),
      ...(own(urls, 'investor') === undefined ? {} : { investor: nullableText(own(urls, 'investor'), 512) }),
      ...(own(urls, 'entrepreneur') === undefined
        ? {}
        : { entrepreneur: nullableText(own(urls, 'entrepreneur'), 512) }),
      ...(own(urls, 'admin') === undefined ? {} : { admin: nullableText(own(urls, 'admin'), 512) }),
    },
    suggestedUrls: {
      ...(own(suggested, 'investor') === undefined
        ? {}
        : { investor: text(own(suggested, 'investor'), 512) }),
      ...(own(suggested, 'entrepreneur') === undefined
        ? {}
        : { entrepreneur: text(own(suggested, 'entrepreneur'), 512) }),
      ...(own(suggested, 'admin') === undefined ? {} : { admin: text(own(suggested, 'admin'), 512) }),
      note: text(own(suggested, 'note'), 500, true),
    },
    enabledEnvironments: parseEnabledEnvironments(own(row, 'enabledEnvironments')),
    credentialsNote: text(own(row, 'credentialsNote'), 500, true),
    branding: parseDeliveryBranding(own(row, 'branding')),
    generatedAt: requiredIso(own(row, 'generatedAt')),
    correlationId: nullableText(own(row, 'correlationId'), 128),
  }
}

export function parseProvisioning(raw: unknown): ProvisioningRecord {
  const envelope = object(raw)
  const row = object(own(envelope, 'data') ?? envelope)
  rejectSecrets(row)
  const progress = object(own(row, 'progress'))
  const stepsRaw = own(row, 'steps')
  if (!Array.isArray(stepsRaw) || stepsRaw.length > 32) return invalid()
  const current = own(row, 'currentStep')
  return {
    id: text(own(row, 'id'), 64),
    whitelabelId: nullablePositive(own(row, 'whitelabelId')),
    name: text(own(row, 'name'), 120),
    slug: text(own(row, 'slug'), 80),
    baseUrl: text(own(row, 'baseUrl'), 512),
    status: enumOf(own(row, 'status'), PROVISIONING_STATUSES),
    currentStep: current === null || current === undefined ? null : enumOf(current, PROVISIONING_STEP_KEYS),
    requestedBy: nullableText(own(row, 'requestedBy'), 64),
    correlationId: nullableText(own(row, 'correlationId'), 128),
    templateFromWhitelabelId: nullablePositive(own(row, 'templateFromWhitelabelId')),
    errorCode: nullableText(own(row, 'errorCode'), 128),
    errorMessage: nullableText(own(row, 'errorMessage'), 2000),
    progress: {
      completed: typeof own(progress, 'completed') === 'number' ? (own(progress, 'completed') as number) : invalid(),
      total: typeof own(progress, 'total') === 'number' ? (own(progress, 'total') as number) : invalid(),
      percentage: typeof own(progress, 'percentage') === 'number' ? (own(progress, 'percentage') as number) : invalid(),
    },
    steps: stepsRaw.map(parseStep),
    delivery: parseDelivery(own(row, 'delivery')),
    startedAt: iso(own(row, 'startedAt')),
    completedAt: iso(own(row, 'completedAt')),
    createdAt: requiredIso(own(row, 'createdAt')),
    updatedAt: requiredIso(own(row, 'updatedAt')),
  }
}

export function canReadProvisioning(roles: readonly string[] | undefined) {
  return roles?.some((role) => role === 'SUPER_ADMIN' || role === 'SUPPORT_ADMIN' || role === 'READ_ONLY') === true
}

export function canWriteProvisioning(roles: readonly string[] | undefined) {
  return roles?.includes(WHITELABEL_WRITE_ROLE) === true
}

export function canStartProvisioning(roles: readonly string[] | undefined) {
  return PROVISIONING_WRITES_ENABLED && canWriteProvisioning(roles)
}

function authorizeRead() {
  if (!canReadProvisioning(getOperator()?.roles)) throw new ApiError(403, { code: 'PROVISIONING_READ_FORBIDDEN' })
}

function authorizeWrite() {
  if (!canWriteProvisioning(getOperator()?.roles)) throw new ApiError(403, { code: 'PROVISIONING_WRITE_FORBIDDEN' })
  if (!PROVISIONING_WRITES_ENABLED) throw new ApiError(403, { code: 'PROVISIONING_WRITES_DISABLED' })
}

function safeError(error: unknown): never {
  if (error instanceof ApiError) throw error
  throw error
}

async function authed<T>(
  path: string,
  options: { method?: 'GET' | 'POST'; body?: unknown; successStatus?: number; signal?: AbortSignal },
  parse: (raw: unknown) => T,
  write: boolean,
): Promise<T> {
  if (write) authorizeWrite()
  else authorizeRead()
  const token = getAccessToken()
  const session = getSessionVersion()
  if (!token) throw new ApiError(401, { code: 'NO_SESSION' })
  try {
    const raw = await apiRequest(path, {
      method: options.method ?? 'GET',
      body: options.body,
      token,
      signal: options.signal,
      timeoutMs: 180_000,
      successStatus: options.successStatus ?? 200,
    })
    if (getSessionVersion() !== session || getAccessToken() !== token) {
      throw new DOMException('Session changed', 'AbortError')
    }
    return parse(raw)
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) handleUnauthorized(token, session)
    return safeError(error)
  }
}

/**
 * Multipart request for Nest: `payload` = JSON string of the DTO (never contains the File) and the
 * image as `mainAreaImage`. Without a file the caller keeps the plain JSON POST.
 */
export function buildProvisioningFormData(body: CreateProvisioningBody | RetryProvisioningBody, file: File): FormData {
  const form = new FormData()
  form.append('payload', JSON.stringify(body))
  form.append(MAIN_AREA_IMAGE_FIELD, file, file.name)
  return form
}

export function createProvisioning(body: CreateProvisioningBody, signal?: AbortSignal, mainAreaImage?: File | null) {
  return authed(
    '/whitelabel-provisionings',
    { method: 'POST', body: mainAreaImage ? buildProvisioningFormData(body, mainAreaImage) : body, successStatus: 201, signal },
    parseProvisioning,
    true,
  )
}

export function getProvisioning(id: string, signal?: AbortSignal) {
  if (!id.trim() || id.length > 64) throw new ApiError(404, { code: 'INVALID_PROVISIONING_ID' })
  return authed(`/whitelabel-provisionings/${encodeURIComponent(id)}`, { signal }, parseProvisioning, false)
}

export function getWhitelabelProvisioning(whitelabelId: string, signal?: AbortSignal) {
  if (!/^[1-9]\d*$/.test(whitelabelId)) throw new ApiError(404, { code: 'INVALID_WHITELABEL_ID' })
  return authed(`/whitelabels/${encodeURIComponent(whitelabelId)}/provisioning`, { signal }, parseProvisioning, false)
}

export function retryProvisioning(id: string, body: RetryProvisioningBody = {}, signal?: AbortSignal, mainAreaImage?: File | null) {
  if (!id.trim()) throw new ApiError(404, { code: 'INVALID_PROVISIONING_ID' })
  return authed(
    `/whitelabel-provisionings/${encodeURIComponent(id)}/retry`,
    { method: 'POST', body: mainAreaImage ? buildProvisioningFormData(body, mainAreaImage) : body, signal },
    parseProvisioning,
    true,
  )
}

export function completeProvisioningStep(
  id: string,
  stepKey: ManualGateKey,
  body: CompleteManualBody,
  signal?: AbortSignal,
) {
  if (!id.trim()) throw new ApiError(404, { code: 'INVALID_PROVISIONING_ID' })
  if (!(MANUAL_GATE_KEYS as readonly string[]).includes(stepKey)) {
    throw new ApiError(400, { code: 'E_STEP_NOT_MANUAL' })
  }
  return authed(
    `/whitelabel-provisionings/${encodeURIComponent(id)}/steps/${encodeURIComponent(stepKey)}/complete`,
    { method: 'POST', body, signal },
    parseProvisioning,
    true,
  )
}

export function isTerminalProvisioningStatus(status: ProvisioningStatus) {
  return status === 'FAILED' || status === 'WAITING_MANUAL_ACTION' || status === 'COMPLETED' || status === 'CANCELLED'
}

/** Always false — FE/DNS readiness is automatic on the Control Plane. */
export function isManualGate(_key: string): _key is ManualGateKey {
  return false
}
