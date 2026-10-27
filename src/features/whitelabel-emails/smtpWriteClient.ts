import { ApiError, apiRequest } from '../../lib/api'
import { getAccessToken, getOperator, getSessionVersion, handleUnauthorized } from '../../lib/authSession'
import { getSmtpRead, safeSmtpCorrelation } from './smtpReadApi'
import { canWriteSmtp, parseSmtpReceipt, sameSmtpBaseline, sameSmtpResult, smtpPatch, type SmtpWriteCommand } from './smtpWriteContract'

export type SmtpWriteAttempt = { phase: 'checking' | 'sending' | 'reconciling' | 'confirmed' | 'readback_matches' | 'stale' | 'rejected' | 'uncertain'; session: number; status?: number; correlationId?: string }
const attempts = new Map<string, SmtpWriteAttempt>(), recovery = new Map<string, (session: number, token: string) => Promise<boolean>>(), listeners = new Set<() => void>()
export const smtpWriteBusy = (a: SmtpWriteAttempt | null) => !!a && ['checking', 'sending', 'reconciling'].includes(a.phase)
export const smtpWriteVerified = (a: SmtpWriteAttempt | null) => a?.phase === 'confirmed'
export const smtpWriteLocked = (a: SmtpWriteAttempt | null) => !!a && !['stale', 'rejected'].includes(a.phase)
export function subscribeSmtpWrites(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } }
export function getSmtpWriteAttempt(id: string, session: number) { const a = attempts.get(id); return a?.session === session ? a : a && smtpWriteLocked(a) ? { ...a, session: -1, phase: 'uncertain' as const } : null }
function publish(id: string, attempt: SmtpWriteAttempt) { attempts.set(id, attempt); for (const listener of listeners) listener() }
function authorize(session: number) {
  const token = getAccessToken()
  if (!token || session !== getSessionVersion()) throw new ApiError(401, { code: 'NO_SESSION' })
  if (!canWriteSmtp(getOperator()?.roles)) throw new ApiError(403, { code: 'SMTP_WRITE_FORBIDDEN' })
  return token
}
const current = (session: number, token: string) => getSessionVersion() === session && getAccessToken() === token
const metadata = (error: unknown) => error instanceof ApiError ? { status: error.status, correlationId: safeSmtpCorrelation(error.correlationId) } : {}

/** One changed-fields PATCH. No credential, create, send, version header or automatic retry path. */
export async function executeSmtpWrite(command: SmtpWriteCommand, session: number, signal?: AbortSignal) {
  const patch = smtpPatch(command), token = authorize(session), id = command.tenantId
  if (smtpWriteLocked(attempts.get(id) ?? null)) throw new ApiError(409, { code: 'SMTP_ATTEMPT_LOCKED' })
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError')
  let attempt: SmtpWriteAttempt = { phase: 'checking', session }
  publish(id, attempt)
  try {
    const fresh = await getSmtpRead(id, signal)
    if (fresh.state !== 'saved' || !sameSmtpBaseline(fresh, command.baseline)) { publish(id, { ...attempt, phase: 'stale' }); return }
    if (signal?.aborted || !current(session, token)) throw new DOMException('Scope changed', 'AbortError')
    authorize(session)
  } catch (error) { publish(id, { ...attempt, phase: 'rejected', ...metadata(error) }); return }
  attempt = { ...attempt, phase: 'sending' }; publish(id, attempt)
  let accepted = false
  try {
    const raw = await apiRequest<unknown>(`/whitelabels/${id}/emails/smtp`, { method: 'PATCH', body: patch, token, signal, timeoutMs: 20_000, successStatus: 200 })
    if (!current(session, token)) throw new DOMException('Session replaced', 'AbortError')
    parseSmtpReceipt(raw, command.baseline, patch)
    accepted = true; attempt = { ...attempt, status: 200 }
  } catch (error) {
    attempt = { ...attempt, ...metadata(error) }
    if (error instanceof ApiError && error.status === 401) handleUnauthorized(token, session)
    if (current(session, token) && error instanceof ApiError && error.kind === 'http' && [400, 403, 404, 409, 422].includes(error.status)) { publish(id, { ...attempt, phase: 'rejected' }); return }
  }
  // Retains only the allow-listed, credential-free baseline/patch for same-field GET reconciliation.
  recovery.set(id, async (recoverySession, recoveryToken) => {
    const fresh = await getSmtpRead(id)
    if (!current(recoverySession, recoveryToken)) throw new DOMException('Session replaced', 'AbortError')
    return fresh.state === 'saved' && sameSmtpResult(fresh, command.baseline, patch)
  })
  if (signal?.aborted || !current(session, token)) { publish(id, { ...attempt, phase: 'uncertain' }); return }
  publish(id, { ...attempt, phase: 'reconciling' })
  try { const matches = await recovery.get(id)!(session, token); publish(id, { ...attempt, phase: matches ? accepted ? 'confirmed' : 'readback_matches' : 'uncertain' }) }
  catch { publish(id, { ...attempt, phase: 'uncertain' }) }
}
/** An unchanged GET cannot establish that an uncertain PATCH will never commit. */
export async function reconcileSmtpWrite(id: string, session: number) {
  const token = authorize(session)
  const attempt = attempts.get(id)
  if (!attempt || smtpWriteBusy(attempt) || !recovery.has(id)) return
  // A replacement SUPER_ADMIN session may explicitly reconcile the same resource,
  // but cannot inherit a draft, resume an in-flight request or dispatch another PATCH.
  const resumed = { ...attempt, session }
  publish(id, { ...resumed, phase: 'reconciling' })
  try { const matches = await recovery.get(id)!(session, token); publish(id, { ...resumed, phase: matches ? 'readback_matches' : 'uncertain' }) }
  catch { publish(id, { ...resumed, phase: 'uncertain' }) }
}
export function beginNextSmtpWrite(id: string, session: number) {
  authorize(session)
  const attempt = attempts.get(id)
  if (!attempt || attempt.session !== session || !smtpWriteVerified(attempt)) throw new ApiError(409, { code: 'SMTP_ATTEMPT_LOCKED' })
  attempts.delete(id); recovery.delete(id); for (const listener of listeners) listener()
}
