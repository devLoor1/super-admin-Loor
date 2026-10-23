import { buildHash } from '../../app/routeQuery'
import type { AuditOrder } from './auditApi'
import { auditInstant } from './auditDates'
import { isCredentialAuditText, safeAuditText } from './auditPresent'

export const AUDIT_SEARCH_MAX_LENGTH = 80
export const AUDIT_FILTER_KEYS = ['search', 'order', 'operatorId', 'action', 'resourceType', 'resourceId', 'whitelabelId', 'result', 'from', 'to', 'page'] as const
export type AuditFilterKey = typeof AUDIT_FILTER_KEYS[number]
export type AuditRouteState = { page: number; search: string; order: AuditOrder } & Partial<Record<Exclude<AuditFilterKey, 'page' | 'search' | 'order'>, string>>
export type AuditRouteParams = Partial<Record<AuditFilterKey | 'actor' | 'whitelabel', string>> & { rawQuery?: string }
export type AuditFilterIssue = { key: string; message: string }
export const AUDIT_FILTER_LABELS: Record<AuditFilterKey, string> = {
  search: 'Busca', order: 'Ordem', operatorId: 'ID do operador', action: 'Código da ação', resourceType: 'Tipo de recurso', resourceId: 'ID do recurso',
  whitelabelId: 'ID do Whitelabel', result: 'Resultado', from: 'Data inicial', to: 'Data final', page: 'Página',
}
const aliases: Record<string, string> = { actor: 'operatorId', whitelabel: 'whitelabelId' }
const operator = /^c[a-z0-9]{24}$/
const positive = /^[1-9]\d{0,14}$/
const token = /^[A-Za-z][A-Za-z0-9_.:-]{0,79}$/
const controls = (s: string) => [...s].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)
const safe = (s: string, max: number) => s.length <= max && !controls(s) && !isCredentialAuditText(s) && safeAuditText(s) === s

/** Retain duplicates/unknowns. Invalid restrictions never trigger an unfiltered read. */
export function parseAuditRoute(input: AuditRouteParams) {
  const query = input.rawQuery !== undefined ? new URLSearchParams(input.rawQuery) : new URLSearchParams(Object.entries(input).filter((e): e is [string, string] => typeof e[1] === 'string'))
  const state: AuditRouteState = { page: 1, search: '', order: 'desc' }
  const issues: AuditFilterIssue[] = []
  const seen = new Set<string>()
  for (const [original, raw] of query) {
    const key = Object.hasOwn(aliases, original) ? aliases[original] : original
    const label = Object.hasOwn(AUDIT_FILTER_LABELS, key) ? AUDIT_FILTER_LABELS[key as AuditFilterKey] : 'Parâmetro desconhecido'
    if (!(AUDIT_FILTER_KEYS as readonly string[]).includes(key)) { issues.push({ key: original, message: 'Parâmetro da URL não suportado. Remova-o para consultar.' }); continue }
    if (seen.has(key)) { issues.push({ key: original, message: `${label}: parâmetros duplicados ou conflitantes.` }); continue }
    seen.add(key)
    const value = raw.trim()
    if (!value) continue
    let valid = true
    switch (key) {
      case 'page': valid = /^[1-9]\d{0,5}$/.test(value); if (valid) state.page = Number(value); break
      case 'order': valid = value === 'asc' || value === 'desc'; if (valid) state.order = value as AuditOrder; break
      case 'search': valid = safe(value, AUDIT_SEARCH_MAX_LENGTH); if (valid) state.search = value; break
      case 'operatorId': valid = operator.test(value); if (valid) state.operatorId = value; break
      case 'whitelabelId': valid = positive.test(value) && Number.isSafeInteger(Number(value)); if (valid) state.whitelabelId = value; break
      case 'action': case 'resourceType': valid = token.test(value) && safe(value, 80); if (valid) state[key] = value; break
      case 'resourceId': valid = /^[A-Za-z0-9_.:-]{1,128}$/.test(value) && safe(value, 128); if (valid) state.resourceId = value; break
      case 'result': valid = value === 'success' || value === 'failed'; if (valid) state.result = value; break
      case 'from': case 'to': { const instant = auditInstant(value); valid = instant !== null; if (instant) state[key] = instant; break }
    }
    if (!valid) issues.push({ key: original, message: `${label}: valor inválido ou filtro legado não suportado. Nenhuma consulta será enviada.` })
  }
  if (state.from && state.to && Date.parse(state.from) > Date.parse(state.to)) issues.push({ key: 'to', message: 'A data final deve ser igual ou posterior à data inicial.' })
  return { state, issues, valid: issues.length === 0, ignored: issues.map(i => i.message) }
}

export function auditListHref(state: Partial<AuditRouteState> = {}) {
  const values: Record<string, string | undefined> = {}
  for (const key of AUDIT_FILTER_KEYS) {
    const value = state[key]
    values[key] = key === 'page' ? (Number(value) > 1 ? String(value) : undefined) : key === 'order' ? (value === 'asc' ? 'asc' : undefined) : typeof value === 'string' ? value.trim() || undefined : undefined
  }
  return buildHash('audit', values)
}

/** Preserve invalid restrictions until explicitly corrected or removed. */
export function updateAuditQuery(raw: string, patch: Partial<Record<AuditFilterKey, string | number | undefined>>) {
  const params = new URLSearchParams(raw)
  for (const [key, value] of Object.entries(patch)) {
    params.delete(key)
    for (const [alias, canonical] of Object.entries(aliases)) if (canonical === key) params.delete(alias)
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  const parsed = parseAuditRoute({ rawQuery: params.toString() })
  return parsed.valid ? auditListHref(parsed.state) : `#/audit${params.size ? `?${params}` : ''}`
}
export function removeAuditFilter(raw: string, key: string) {
  const params = new URLSearchParams(raw)
  params.delete(key)
  for (const [alias, canonical] of Object.entries(aliases)) if (canonical === key) params.delete(alias)
  params.delete('page')
  const parsed = parseAuditRoute({ rawQuery: params.toString() })
  return parsed.valid ? auditListHref(parsed.state) : `#/audit${params.size ? `?${params}` : ''}`
}
export function auditHasFilters(state: AuditRouteState) {
  return AUDIT_FILTER_KEYS.some(key => key !== 'page' && key !== 'order' && !!state[key])
}

/** Only internal list destinations; invalid restrictions remain visible. */
export function auditListReturnHash(context?: string) {
  if (!context || !/^#\/audit(?:\?|$)/.test(context) || context.length > 4096 || controls(context) || context.slice(1).includes('#')) return '#/audit'
  const rawQuery = context.includes('?') ? context.slice(context.indexOf('?') + 1) : ''
  const parsed = parseAuditRoute({ rawQuery })
  return parsed.valid ? auditListHref(parsed.state) : `#/audit?${new URLSearchParams(rawQuery)}`
}
export function auditEventHref(id: string, listContext?: string) {
  const returnTo = auditListReturnHash(listContext)
  return buildHash(`audit/${encodeURIComponent(id)}`, { returnTo: returnTo === '#/audit' ? undefined : returnTo })
}
