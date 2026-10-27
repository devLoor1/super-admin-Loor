import { ApiError, apiRequest } from '../../lib/api'
import { getAccessToken, getOperator, getSessionVersion, handleUnauthorized } from '../../lib/authSession'
import { canWriteEmailTemplates, emailTemplatePath, getEmailTemplate, getEmailTemplates, parseEmailTemplateRow, type EmailTemplate } from './emailTemplatesApi'
import { safeSmtpCorrelation } from './smtpReadApi'

type Editable = Pick<EmailTemplate, 'name' | 'subject' | 'body_html' | 'active'>
export type TemplateWrite = { tenant: string; type: string; baseline: EmailTemplate | null; baselineList: EmailTemplate[]; value: Editable; operation: 'save' | 'delete' }
export type TemplateAttempt = { tenant: string; type: string; session: number; phase: 'checking' | 'sending' | 'reading' | 'confirmed' | 'stale' | 'rejected' | 'uncertain' | 'readback_matches'; status?: number; correlationId?: string; result?: EmailTemplate; deletedId?: number }
const attempts = new Map<string, TemplateAttempt>(), commands = new Map<string, TemplateWrite>(), listeners = new Set<() => void>()
const key = (tenant: string, type: string) => `${tenant}:${type}`
const same = (first: unknown, second: unknown) => JSON.stringify(first) === JSON.stringify(second)
export const templateBusy = (a?: TemplateAttempt) => !!a && ['checking', 'sending', 'reading'].includes(a.phase)
export const templateLocked = (a?: TemplateAttempt) => !!a && ['checking', 'sending', 'reading', 'uncertain', 'readback_matches'].includes(a.phase)
export const subscribeTemplateWrites = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
export const getTemplateAttempt = (tenant: string, type: string, session: number) => { const attempt = attempts.get(key(tenant, type)); return attempt?.session === session ? attempt : undefined }
const publish = (a: TemplateAttempt) => { attempts.set(key(a.tenant, a.type), a); listeners.forEach(listener => listener()) }
export function beginNextTemplateWrite(tenant: string, type: string, session: number) {
  auth(session); const id = key(tenant, type)
  if (templateLocked(attempts.get(id))) throw new ApiError(409, {})
  attempts.delete(id); commands.delete(id); listeners.forEach(listener => listener())
}
function auth(session: number) { const token = getAccessToken(); if (!token || getSessionVersion() !== session) throw new ApiError(401, {}); if (!canWriteEmailTemplates(getOperator()?.roles)) throw new ApiError(403, {}); return token }
const current = (session: number, token: string) => getSessionVersion() === session && getAccessToken() === token
function validate(command: TemplateWrite) {
  emailTemplatePath(command.tenant)
  if (!/^[a-z][a-z0-9_]{0,79}$/.test(command.type) || command.baselineList.some(row => row.type !== command.type || (row.wtlb_id !== null && String(row.wtlb_id) !== command.tenant))) throw new ApiError(422, {})
  if (command.baseline && (command.baseline.is_default || String(command.baseline.wtlb_id) !== command.tenant || command.baseline.type !== command.type)) throw new ApiError(403, {})
  if (command.baseline && !command.baselineList.some(row => same(row, command.baseline))) throw new ApiError(409, {})
  if (command.operation === 'delete') { if (!command.baseline) throw new ApiError(422, {}); return }
  if (Object.keys(command.value).some(field => !['name', 'subject', 'body_html', 'active'].includes(field))) throw new ApiError(422, {})
  if (typeof command.value.active !== 'boolean' || !command.value.name.trim() || command.value.name.length > 256 || !command.value.subject.trim() || command.value.subject.length > 512 || !command.value.body_html || command.value.body_html.length > 150000) throw new ApiError(422, {})
}
function matching(row: EmailTemplate, command: TemplateWrite) { return row.type === command.type && String(row.wtlb_id) === command.tenant && !row.is_default && Object.entries(command.value).every(([field, value]) => row[field as keyof Editable] === value) }
async function reconcile(command: TemplateWrite, result?: EmailTemplate) {
  const rows = await getEmailTemplates(command.tenant, command.type)
  if (command.operation === 'delete') return { matches: rows.every(row => row.id !== command.baseline!.id) }
  const row = result ? rows.find(item => item.id === result.id) : command.baseline ? rows.find(item => item.id === command.baseline!.id) : rows.find(item => !command.baselineList.some(old => old.id === item.id) && matching(item, command))
  if (!row || !matching(row, command)) return { matches: false }
  const detail = await getEmailTemplate(command.tenant, row.id)
  return { matches: matching(detail, command), result: detail }
}
/** Single dispatch followed by authoritative reads; no automatic retry or atomic-version claim. */
export async function executeTemplateWrite(command: TemplateWrite, session: number) {
  validate(command); const token = auth(session), id = key(command.tenant, command.type)
  if (templateLocked(attempts.get(id))) throw new ApiError(409, {})
  let attempt: TemplateAttempt = { tenant: command.tenant, type: command.type, session, phase: 'checking' }
  publish(attempt)
  try { const rows = await getEmailTemplates(command.tenant, command.type); if (!same(rows, command.baselineList)) { publish({ ...attempt, phase: 'stale' }); return }; if (command.baseline && !same(await getEmailTemplate(command.tenant, command.baseline.id), command.baseline)) { publish({ ...attempt, phase: 'stale' }); return }; if (!current(session, token)) throw new ApiError(401, {}); auth(session) }
  catch { publish({ ...attempt, phase: 'rejected' }); return }
  commands.set(id, command); attempt = { ...attempt, phase: 'sending' }; publish(attempt)
  let receipt = false, result: EmailTemplate | undefined
  const method = command.operation === 'delete' ? 'DELETE' : command.baseline ? 'PATCH' : 'POST'
  const expectedStatus = method === 'POST' ? 201 : 200
  const body = command.operation === 'delete' ? undefined : command.baseline ? Object.fromEntries(Object.entries(command.value).filter(([field, value]) => value !== command.baseline![field as keyof Editable])) : { ...command.value, type: command.type }
  if (method === 'PATCH' && Object.keys(body ?? {}).length === 0) { publish({ ...attempt, phase: 'rejected' }); return }
  try {
    const raw = await apiRequest<{ data: unknown }>(emailTemplatePath(command.tenant, command.baseline ? `/${command.baseline.id}` : ''), { method, body, token, timeoutMs: 20_000, successStatus: expectedStatus })
    if (!current(session, token)) throw new DOMException('Session changed', 'AbortError')
    if (method === 'DELETE') { const data = raw?.data as Record<string, unknown> | undefined; if (!data || data.id !== command.baseline?.id || String(data.whitelabelId) !== command.tenant || data.deleted !== true) throw new ApiError(200, {}, { kind: 'malformed' }) }
    else { result = parseEmailTemplateRow(raw?.data, command.tenant); if (!matching(result, command) || (command.baseline && result.id !== command.baseline.id)) throw new ApiError(expectedStatus, {}, { kind: 'malformed' }) }
    receipt = true; attempt = { ...attempt, status: expectedStatus }
  } catch (error) {
    if (error instanceof ApiError) { attempt = { ...attempt, status: error.status, correlationId: safeSmtpCorrelation(error.correlationId) }; if (error.status === 401) handleUnauthorized(token, session); if (error.kind === 'http' && [400, 403, 404, 409, 422].includes(error.status)) { publish({ ...attempt, phase: 'rejected' }); return } }
  }
  if (!current(session, token)) { publish({ ...attempt, phase: 'uncertain' }); return }
  publish({ ...attempt, phase: 'reading' })
  try { const readback = await reconcile(command, result); if (!current(session, token)) throw new Error('Scope changed'); publish({ ...attempt, phase: readback.matches ? receipt ? 'confirmed' : 'readback_matches' : 'uncertain', result: readback.result, deletedId: method === 'DELETE' && readback.matches ? command.baseline!.id : undefined }) }
  catch { publish({ ...attempt, phase: 'uncertain' }) }
}
export async function reconcileTemplateWrite(tenant: string, type: string, session: number) {
  const token = auth(session), id = key(tenant, type), attempt = attempts.get(id), command = commands.get(id)
  if (!attempt || !command || attempt.session !== session || templateBusy(attempt)) return
  publish({ ...attempt, session, phase: 'reading' })
  try { const readback = await reconcile(command, attempt.result); if (!current(session, token)) throw new Error('Scope changed'); publish({ ...attempt, session, phase: readback.matches ? 'readback_matches' : 'uncertain', result: readback.result }) }
  catch { publish({ ...attempt, session, phase: 'uncertain' }) }
}
