import { administratorLifecycleAvailable } from '../../../app/presentationAvailability'
import { ApiError, apiRequest } from '../../../lib/api'
import { getAccessToken, getOperator, getSessionVersion, handleUnauthorized } from '../../../lib/authSession'
import { getTenantWhitelabel } from '../../operation/shared/whitelabelContext'
import type { AdminRecord } from '../accountsApi'
import { refreshAccountReads } from '../access/accountAccessRefresh'
import { adminBase, adminInputError, adminPatch, adminPath, adminReceipt, createAdminPayload, findAdminByEmail, getAdmin, hasOtherActiveAdmin, supportedAdmin, type AdminRef } from './adminLifecycleContract'

export type AdminCommand = { action: 'create'; whitelabelId: string; email: string; password: string } |
  { action: 'update'; ref: AdminRef; baseline: AdminRecord; changes: Record<string, unknown> } |
  { action: 'activate' | 'deactivate'; ref: AdminRef; from: 'active' | 'paused' }
export type AdminAttempt = { phase: 'checking' | 'sending' | 'reconciling' | 'confirmed' | 'readback_matches' | 'uncertain' | 'rejected' | 'stale'; action: AdminCommand['action']; version: number; id?: string; status?: number; code?: string; correlationId?: string }
const attempts = new Map<string, AdminAttempt>(), recoveries = new Map<string, () => Promise<AdminRecord | null>>(), listeners = new Set<() => void>()
const locked = new Set(['checking', 'sending', 'reconciling', 'confirmed', 'readback_matches', 'uncertain'])
const foreign: AdminAttempt = { phase: 'uncertain', action: 'update', version: -1 }
export const adminAttemptLocked = (a: AdminAttempt | null) => !!a && locked.has(a.phase)
export const adminCommandKey = (c: AdminCommand) => c.action === 'create' ? `${c.whitelabelId}:create:${c.email.trim().toLowerCase()}` : `${c.ref.whitelabelId}:admin:${c.ref.id}`
export function subscribeAdminAttempts(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn) } }
export function adminAttempt(key: string, version: number) { const a = attempts.get(key); return !a ? null : a.version === version ? a : adminAttemptLocked(a) ? foreign : null }
function publish(key: string, a: AdminAttempt) { attempts.set(key, a); for (const fn of listeners) fn() }
function authorize(version: number) {
  const token = getAccessToken()
  if (!token || version !== getSessionVersion()) throw new ApiError(401, { code: 'NO_SESSION' })
  if (!administratorLifecycleAvailable(getOperator()?.roles ?? [])) throw new ApiError(403, { code: 'ADMIN_WRITE_FORBIDDEN' })
  return token
}
const current = (version: number, token: string) => version === getSessionVersion() && token === getAccessToken()
const expected = (row: AdminRecord, action: AdminCommand['action'], body: Record<string, unknown>) => action === 'update'
  ? Object.entries(body).every(([key, value]) => (key === 'name' ? row.name : row.email) === (key === 'name' && value === '' ? null : value))
  : row.accessState === (action === 'deactivate' ? 'paused' : 'active') && row.businessState === (action === 'deactivate' ? 'disabled' : 'active')
/** One explicit command; passwords never enter ledgers, recovery closures, storage or logs. */
export async function executeAdmin(command: AdminCommand, version: number, signal?: AbortSignal) {
  if (!['create', 'update', 'activate', 'deactivate'].includes(command.action)) throw adminInputError()
  const token = authorize(version), key = adminCommandKey(command)
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError')
  if (adminAttemptLocked(attempts.get(key) ?? null)) throw new ApiError(409, { code: 'ADMIN_ATTEMPT_LOCKED' })
  const tenant = command.action === 'create' ? command.whitelabelId : command.ref.whitelabelId
  let body: Record<string, unknown>, path: string, baseline: AdminRecord | undefined
  if (command.action === 'create') {
    path = adminBase(tenant); body = createAdminPayload(command); command.password = ''
  } else {
    path = adminPath(command.ref); body = command.action === 'update' ? adminPatch(command.baseline, command.changes) : {}
    if (command.action === 'update' && !Object.keys(body).length) throw adminInputError()
    if (command.action !== 'update') path += `/${command.action}`
  }
  let a: AdminAttempt = { phase: 'checking', action: command.action, version, ...(command.action === 'create' ? {} : { id: command.ref.id }) }
  publish(key, a)
  try {
    if (command.action === 'create') {
      await getTenantWhitelabel(tenant, signal)
      if (await findAdminByEmail(tenant, body.email as string, signal)) throw new ApiError(422, { code: 'E_EMAIL_TAKEN' })
    } else {
      baseline = await getAdmin(command.ref, signal)
      if (!supportedAdmin(baseline)) throw adminInputError()
      if (command.action === 'update') {
        if (command.baseline.id !== command.ref.id || command.baseline.whitelabelId !== tenant || command.baseline.accessState !== baseline.accessState || Object.keys(body).some(k => command.baseline[k as 'name' | 'email'] !== baseline![k as 'name' | 'email'])) { publish(key, { ...a, phase: 'stale' }); return }
      } else {
        if (baseline.accessState !== command.from || command.from !== (command.action === 'activate' ? 'paused' : 'active')) { publish(key, { ...a, phase: 'stale' }); return }
        if (command.action === 'deactivate' && !await hasOtherActiveAdmin(command.ref, signal)) throw new ApiError(409, { code: 'LAST_ACTIVE_ADMIN_PROTECTED' })
      }
    }
    if (!current(version, token) || signal?.aborted) throw new DOMException('Scope changed', 'AbortError')
    authorize(version)
  } catch (error) { if (body) delete body.password; publish(key, { ...a, phase: 'rejected', ...errorMeta(error) }); return }
  a = { ...a, phase: 'sending' }; publish(key, a)
  const createEmail = command.action === 'create' ? body.email as string : null
  // Recovery captures only supported expected fields, never the secret-bearing create body.
  const wanted = command.action === 'create' ? {} : { ...body }
  let accepted = false
  try {
    const raw = await apiRequest<unknown>(path, { method: command.action === 'create' ? 'POST' : 'PATCH', token,
      ...(command.action === 'deactivate' ? {} : { body }), signal, timeoutMs: 20_000, successStatus: command.action === 'create' ? 201 : 200 })
    delete body.password
    if (command.action === 'create' && raw && typeof raw === 'object' && 'data' in raw && raw.data && typeof raw.data === 'object' && 'id' in raw.data && typeof raw.data.id === 'number' && Number.isSafeInteger(raw.data.id) && raw.data.id > 0 && 'whitelabelId' in raw.data && raw.data.whitelabelId === Number(tenant)) { a = { ...a, id: String(raw.data.id) }; publish(key, a) }
    if (!current(version, token)) throw new DOMException('Session replaced', 'AbortError')
    const row = adminReceipt(raw, tenant, a.id)
    a = { ...a, id: row.id, status: command.action === 'create' ? 201 : 200 }; publish(key, a)
    accepted = command.action === 'create' ? row.email === createEmail && expected(row, 'create', {}) : expected(row, command.action, wanted)
  } catch (error) {
    delete body.password; a = { ...a, ...errorMeta(error) }
    if (error instanceof ApiError && error.status === 401) handleUnauthorized(token, version)
    if (current(version, token) && error instanceof ApiError && error.kind === 'http' && [400, 403, 404, 409, 422].includes(error.status)) { publish(key, { ...a, phase: 'rejected' }); return }
  }
  const action = command.action, knownId = a.id
  recoveries.set(key, async () => {
    const row = knownId ? await getAdmin({ whitelabelId: tenant, id: knownId }) : createEmail ? await findAdminByEmail(tenant, createEmail) : null
    if (!current(version, token)) throw new DOMException('Session replaced', 'AbortError')
    return row && (action === 'create' ? row.email === createEmail && expected(row, action, {}) : expected(row, action, wanted)) ? row : null
  })
  if (!current(version, token) || signal?.aborted) { publish(key, { ...a, phase: 'uncertain' }); return }
  publish(key, { ...a, phase: 'reconciling' })
  try {
    const row = await recoveries.get(key)!()
    publish(key, { ...a, ...(row ? { id: row.id } : {}), phase: row ? accepted ? 'confirmed' : 'readback_matches' : 'uncertain' })
    if (row) refreshAccountReads({ whitelabelId: tenant, kind: 'admin', accountId: row.id })
  } catch { publish(key, { ...a, phase: 'uncertain' }) }
}
function errorMeta(error: unknown) { return error instanceof ApiError ? { status: error.status, code: error.code, correlationId: error.correlationId } : {} }
export async function reconcileAdmin(key: string, version: number) {
  authorize(version); const a = attempts.get(key)
  if (!a || a.version !== version || ['checking', 'sending', 'reconciling'].includes(a.phase) || !recoveries.has(key)) return
  try { const row = await recoveries.get(key)!(); publish(key, { ...a, ...(row ? { id: row.id } : {}), phase: row ? 'readback_matches' : 'uncertain' }) }
  catch { publish(key, { ...a, phase: 'uncertain' }) }
}
export function beginNextAdminCommand(key: string, version: number) {
  authorize(version); const a = attempts.get(key)
  if (!a || a.version !== version || a.phase !== 'confirmed') throw new ApiError(409, { code: 'ADMIN_ATTEMPT_LOCKED' })
  attempts.delete(key); recoveries.delete(key); for (const fn of listeners) fn()
}
