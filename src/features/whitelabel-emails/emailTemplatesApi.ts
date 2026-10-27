import { ApiError, apiRequest } from '../../lib/api'
import { authenticatedGet } from '../../lib/apiClient'
import { getAccessToken, getOperator, getSessionVersion, handleUnauthorized } from '../../lib/authSession'
import { isSmtpTenantId, safeSmtpCorrelation } from './smtpReadApi'

export type EmailTemplateType = { type: string; label: string; description: string; available_variables: string[]; required_variables: string[]; capabilityVersion: 1 }
export type EmailTemplate = { id: number; wtlb_id: number | null; name: string; type: string; subject: string; body_html: string; available_variables: string[]; active: boolean; is_default: boolean; created_at: string | null; updated_at: string | null; version: string; capabilityVersion: 1 }
export type EmailPreview = { subject: string; body_html: string; renderSource: 'core-email-template-service'; sampleData: true; externalImagesBlocked: true; capabilityVersion: 1 }
export type EmailPreviewCommand = { type: string; subject: string; body_html: string; brandingDraft?: { primary_color?: string | null; logo_url?: string | null } }
const invalid = (): never => { throw new ApiError(200, {}, { kind: 'malformed' }) }
const object = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : invalid()
const own = (value: Record<string, unknown>, key: string): unknown => Object.getOwnPropertyDescriptor(value, key)?.value
const string = (value: unknown, max: number, empty = false): string => typeof value === 'string' && value.length <= max && (empty || value.length > 0) && !Array.from(value).some(char => char.charCodeAt(0) < 32 && !['\t', '\r', '\n'].includes(char)) ? value : invalid()
const bool = (value: unknown): boolean => typeof value === 'boolean' ? value : invalid()
const positive = (value: unknown): number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : invalid()
const list = (value: unknown): string[] => Array.isArray(value) && value.length <= 100 && value.every(v => typeof v === 'string' && /^[a-zA-Z][a-zA-Z0-9_]{0,79}$/.test(v)) && new Set(value).size === value.length ? [...value] : invalid()
const date = (value: unknown): string | null => value === null ? null : typeof value === 'string' && value.length <= 40 && Number.isFinite(Date.parse(value)) ? value : invalid()
const typeName = (value: unknown): string => typeof value === 'string' && /^[a-z][a-z0-9_]{0,79}$/.test(value) ? value : invalid()
export const canReadEmailTemplates = (roles: readonly string[] | undefined) => roles?.some(role => role === 'SUPER_ADMIN' || role === 'READ_ONLY') === true
export const canWriteEmailTemplates = (roles: readonly string[] | undefined) => roles?.includes('SUPER_ADMIN') === true
const rejectPrivateKeys = (row: Record<string, unknown>) => { if (Object.keys(row).some(key => /^(password|username|token|access_token|refresh_token|credentials|authorization|client_secret)$/i.test(key))) invalid() }
export function parseEmailTypes(raw: unknown): EmailTemplateType[] {
  const data = own(object(raw), 'data')
  if (!Array.isArray(data) || data.length > 100) return invalid()
  const result = data.map(value => { const row = object(value); rejectPrivateKeys(row); if (own(row, 'capabilityVersion') !== 1) return invalid(); const available = list(own(row, 'available_variables')), required = list(own(row, 'required_variables')); if (required.some(key => !available.includes(key))) return invalid(); return { type: typeName(own(row, 'type')), label: string(own(row, 'label'), 256), description: string(own(row, 'description'), 2000, true), available_variables: available, required_variables: required, capabilityVersion: 1 as const } })
  if (new Set(result.map(item => item.type)).size !== result.length) return invalid()
  return result
}
export function parseEmailTemplateRow(raw: unknown, tenant: string): EmailTemplate {
  if (!isSmtpTenantId(tenant)) return invalid()
  const row = object(raw); rejectPrivateKeys(row)
  if (own(row, 'capabilityVersion') !== 1) return invalid()
  const tenantId = own(row, 'wtlb_id') === null ? null : positive(own(row, 'wtlb_id')), isDefault = bool(own(row, 'is_default'))
  if (tenantId === null ? !isDefault : String(tenantId) !== tenant || isDefault) return invalid()
  return { id: positive(own(row, 'id')), wtlb_id: tenantId, name: string(own(row, 'name'), 256), type: typeName(own(row, 'type')), subject: string(own(row, 'subject'), 512), body_html: string(own(row, 'body_html'), 150000), available_variables: list(own(row, 'available_variables')), active: bool(own(row, 'active')), is_default: isDefault, created_at: date(own(row, 'created_at')), updated_at: date(own(row, 'updated_at')), version: string(own(row, 'version'), 256), capabilityVersion: 1 }
}
export function parseEmailTemplateList(raw: unknown, tenant: string, type: string): EmailTemplate[] {
  const data = own(object(raw), 'data'); if (!Array.isArray(data) || data.length > 1000) return invalid()
  const rows = data.map(row => parseEmailTemplateRow(row, tenant)); if (rows.some(row => row.type !== type) || new Set(rows.map(row => row.id)).size !== rows.length) return invalid(); return rows
}
export function parseEmailPreview(raw: unknown): EmailPreview {
  const row = object(own(object(raw), 'data')); rejectPrivateKeys(row)
  if (own(row, 'renderSource') !== 'core-email-template-service' || own(row, 'sampleData') !== true || own(row, 'externalImagesBlocked') !== true || own(row, 'capabilityVersion') !== 1) return invalid()
  return { subject: string(own(row, 'subject'), 2048), body_html: string(own(row, 'body_html'), 250000), renderSource: 'core-email-template-service', sampleData: true, externalImagesBlocked: true, capabilityVersion: 1 }
}
export function emailTemplatePath(tenant: string, suffix = '') { if (!isSmtpTenantId(tenant)) throw new ApiError(404, { code: 'INVALID_WHITELABEL_ID' }); return `/whitelabels/${tenant}/emails/templates${suffix}` }
function authorizeRead() { if (!canReadEmailTemplates(getOperator()?.roles)) throw new ApiError(403, { code: 'EMAIL_READ_FORBIDDEN' }) }
function safeError(error: unknown): never { if (error instanceof ApiError) throw new ApiError(error.status, {}, { kind: error.kind, correlationId: safeSmtpCorrelation(error.correlationId) }); throw error }
export async function getEmailTypes(tenant: string, signal?: AbortSignal) { authorizeRead(); try { return parseEmailTypes(await authenticatedGet(emailTemplatePath(tenant, '/types'), { signal })) } catch (error) { return safeError(error) } }
export async function getEmailTemplates(tenant: string, type: string, signal?: AbortSignal) { authorizeRead(); typeName(type); try { return parseEmailTemplateList(await authenticatedGet(emailTemplatePath(tenant), { query: { type }, signal }), tenant, type) } catch (error) { return safeError(error) } }
export async function getEmailTemplate(tenant: string, id: number, signal?: AbortSignal) { authorizeRead(); positive(id); try { const raw = await authenticatedGet(emailTemplatePath(tenant, `/${id}`), { signal }); const result = parseEmailTemplateRow(own(object(raw), 'data'), tenant); if (result.id !== id) return invalid(); return result } catch (error) { return safeError(error) } }

/** No sample recipient, token or user-provided variables are sent. Samples belong to the server. */
export async function previewEmail(tenant: string, command: EmailPreviewCommand, signal?: AbortSignal) {
  authorizeRead(); typeName(command.type); string(command.subject, 512); string(command.body_html, 150000)
  const token = getAccessToken(), session = getSessionVersion(); if (!token) throw new ApiError(401, { code: 'NO_SESSION' })
  const body: EmailPreviewCommand = { type: command.type, subject: command.subject, body_html: command.body_html }
  if (command.brandingDraft) {
    const branding: NonNullable<EmailPreviewCommand['brandingDraft']> = {}
    const color = command.brandingDraft.primary_color, logo = command.brandingDraft.logo_url
    if (color !== undefined) { if (color !== null && !/^#[0-9a-fA-F]{6}$/.test(color)) throw new ApiError(422, {}); branding.primary_color = color }
    if (logo !== undefined) {
      if (logo !== null) { try { const url = new URL(logo); if (typeof logo !== 'string' || logo.length > 2048 || url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('Invalid URL') } catch { throw new ApiError(422, {}) } }
      branding.logo_url = logo
    }
    body.brandingDraft = branding
  }
  try { const raw = await apiRequest(emailTemplatePath(tenant, '/preview'), { method: 'POST', body, token, signal, timeoutMs: 20_000, successStatus: 200 }); if (getSessionVersion() !== session || getAccessToken() !== token) throw new DOMException('Session changed', 'AbortError'); return parseEmailPreview(raw) }
  catch (error) { if (error instanceof ApiError && error.status === 401) handleUnauthorized(token, session); return safeError(error) }
}

/** Belt-and-braces document boundary. Returned HTML never enters the application shell. */
export function emailPreviewDocument(body: string) {
  // Detached template content is inert, including image loading. Unlike an
  // ordinary parsed document it cannot start requests before sanitization.
  const parsed = document.createElement('template')
  parsed.innerHTML = body
  parsed.content.querySelectorAll('script,style,iframe,frame,frameset,object,embed,link,meta,base,form,input,button,textarea,select,svg,math,img,video,audio,source').forEach(node => node.remove())
  parsed.content.querySelectorAll('*').forEach(node => { for (const attribute of [...node.attributes]) if (/^on/i.test(attribute.name) || ['href', 'src', 'srcset', 'action', 'formaction', 'ping', 'target', 'download', 'background'].includes(attribute.name.toLowerCase()) || attribute.name.toLowerCase() === 'style' && /url\s*\(|@import|expression|behavior\s*:|-moz-binding/i.test(attribute.value)) node.removeAttribute(attribute.name) })
  // Server strips executable markup; CSP plus an empty sandbox also blocks scripts,
  // forms, child frames, network/tracking images and link navigation capabilities.
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'none'; style-src 'unsafe-inline'; font-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'; object-src 'none'; navigate-to 'none'"><meta name="referrer" content="no-referrer"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;background:#f4f6f8;overflow-wrap:anywhere}body{padding:16px;font-family:Arial,sans-serif}img{display:none!important}a{pointer-events:none!important;cursor:default!important}*{max-width:100%;box-sizing:border-box}</style></head><body>${parsed.innerHTML}</body></html>`
}
