import { ApiError } from '../../lib/api'
import { authenticatedGet } from '../../lib/apiClient'
import { readAppContent } from './appContentRead'
import { readPlatformPresentation } from './platformPresentationRead'

/** Core SettingsQueryService + PlatformSettingService projection. Never retain the raw settings bag. */
export type ReadValue<T> = { state: 'missing' } | { state: 'null' } | { state: 'value'; value: T }
type Bag = Record<string, unknown> | null | undefined
const malformed = () => new ApiError(200, {}, { kind: 'malformed' })
const object = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v)
export const isSettingsTenantId = (id: string) => /^[1-9]\d{0,15}$/.test(id) && Number.isSafeInteger(Number(id))
export const canReadSettings = (roles: readonly string[] | undefined) => !!roles?.some(r => r === 'SUPER_ADMIN' || r === 'READ_ONLY')
function bag(parent: Bag, key: string): Bag {
  if (parent === null) return null
  if (!parent || !Object.hasOwn(parent, key)) return undefined
  const v = parent[key]
  if (v === null || object(v)) return v
  throw malformed()
}
function field<T>(parent: Bag, key: string, valid: (v: unknown) => v is T): ReadValue<T> {
  if (parent === null) return { state: 'null' }
  if (!parent || !Object.hasOwn(parent, key)) return { state: 'missing' }
  const v = parent[key]
  if (v === null) return { state: 'null' }
  if (!valid(v)) throw malformed()
  return { state: 'value', value: v }
}
const text = (v: unknown): v is string => typeof v === 'string' && v.length <= 200_000
const bool = (v: unknown): v is boolean => typeof v === 'boolean'
const number = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v > 0
const date = (v: unknown): v is string => text(v) && !Number.isNaN(Date.parse(v))
const color = (v: unknown): v is string => text(v) && /^#[\da-f]{6}$/i.test(v)
const url = (v: unknown): v is string => {
  if (!text(v)) return false
  if (v === '') return true
  try { const u = new URL(v); return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password && !u.search && !u.hash } catch { return false }
}
export const FEATURE_LABELS = {
  investor_profile_enabled: 'Perfil do investidor',
  anonymous_invest_default: 'Investimento anônimo como padrão',
  wallet_visible: 'Wallet visível',
  opportunity_show_entrepreneur: 'Exibir empreendedor na oportunidade',
  opportunity_show_whatsapp: 'Exibir WhatsApp na oportunidade',
  opportunity_show_total_investors: 'Exibir total de investidores',
  opportunity_show_investor_profile: 'Exibir perfil do investidor na oportunidade',
  opportunity_show_warranty_amount: 'Exibir valor da garantia',
} as const
export type QualifiedSetting = 'login.title' | 'login.subtitle' | 'login.bullets' | `features.${keyof typeof FEATURE_LABELS}`
export type QualifiedSettingValue = string | string[] | boolean
export type SettingProvenance = { stored: boolean; storedValue: QualifiedSettingValue | null; effectiveValue: QualifiedSettingValue | null; source: 'stored' | 'default' | 'absent'; version: string | null }
export const QUALIFIED_SETTINGS: readonly QualifiedSetting[] = ['login.title', 'login.subtitle', 'login.bullets', ...Object.keys(FEATURE_LABELS).map(key => `features.${key}` as QualifiedSetting)]
export function isQualifiedSetting(value: string): value is QualifiedSetting { return QUALIFIED_SETTINGS.includes(value as QualifiedSetting) }
export function qualifiedSettingValue(field: QualifiedSetting, value: unknown): value is QualifiedSettingValue | null {
  return value === null || (field.startsWith('features.') ? typeof value === 'boolean' : field === 'login.bullets' ? Array.isArray(value) && value.length <= 3 && value.every(text) : text(value))
}
/** Only the eleven released cells are retained. Unknown configuration provenance is never copied. */
export function parseSettingProvenance(raw: unknown, field: QualifiedSetting): SettingProvenance {
  if (!object(raw) || typeof raw.stored !== 'boolean' || !Object.hasOwn(raw, 'storedValue') || !Object.hasOwn(raw, 'effectiveValue') || !Object.hasOwn(raw, 'version')
    || !qualifiedSettingValue(field, raw.storedValue) || !qualifiedSettingValue(field, raw.effectiveValue)
    || !['stored', 'default', 'absent'].includes(String(raw.source))
    || !(raw.version === null || typeof raw.version === 'string' && raw.version.length > 0 && raw.version.length <= 512 && !/[\p{Cc}\p{Cf}]/u.test(raw.version))) throw malformed()
  if (raw.stored ? raw.source !== 'stored' : raw.storedValue !== null || raw.source === 'stored' || raw.version !== null) throw malformed()
  if (raw.source === 'absent' && raw.effectiveValue !== null || raw.source === 'default' && raw.effectiveValue === null) throw malformed()
  return { stored: raw.stored, storedValue: Array.isArray(raw.storedValue) ? [...raw.storedValue] : raw.storedValue, effectiveValue: Array.isArray(raw.effectiveValue) ? [...raw.effectiveValue] : raw.effectiveValue, source: raw.source as SettingProvenance['source'], version: raw.version }
}
function readProvenance(data: Record<string, unknown>) {
  const result: Partial<Record<QualifiedSetting, SettingProvenance>> = {}
  if (!Object.hasOwn(data, 'provenance')) return result
  if (!Array.isArray(data.provenance) || data.provenance.length > 200) throw malformed()
  for (const entry of data.provenance) {
    if (!object(entry) || typeof entry.page !== 'string' || typeof entry.key !== 'string') throw malformed()
    const field = `${entry.page}.${entry.key}`
    if (!isQualifiedSetting(field)) continue
    if (Object.hasOwn(result, field)) throw malformed()
    result[field] = parseSettingProvenance(entry, field)
  }
  return result
}
function effective<T>(provenance: SettingProvenance | undefined, fallback: ReadValue<T>): ReadValue<T> {
  if (!provenance) return fallback
  if (provenance.source === 'absent') return { state: 'missing' }
  return provenance.effectiveValue === null ? { state: 'null' } : { state: 'value', value: provenance.effectiveValue as T }
}
export const TERMINOLOGY_LABELS = {
  'investmentPortfolio.label.singular': 'Carteira — singular',
  'investmentPortfolio.label.plural': 'Carteira — plural',
  'investmentOffering.label.singular': 'Oportunidade — singular',
  'investmentOffering.label.plural': 'Oportunidade — plural',
  'investorRole.label.singular': 'Investidor — singular',
  'investorRole.label.plural': 'Investidor — plural',
} as const
export type TermsRead = {
  id: number; revision: number; title: ReadValue<string>; content: ReadValue<string>
  publishedAt: ReadValue<string>; updatedAt: ReadValue<string>
}
function terms(v: unknown): TermsRead {
  if (!object(v) || v.configured !== true || !number(v.revision_id) || !number(v.revision)) throw malformed()
  return { id: v.revision_id, revision: v.revision, title: field(v, 'title', text), content: field(v, 'content_markdown', text), publishedAt: field(v, 'published_at', date), updatedAt: field(v, 'updated_at', date) }
}
function termField(parent: Bag, key: string): ReadValue<TermsRead> {
  if (parent === null) return { state: 'null' }
  if (!parent || !Object.hasOwn(parent, key)) return { state: 'missing' }
  return parent[key] === null ? { state: 'null' } : { state: 'value', value: terms(parent[key]) }
}
export function parseSettingsRead(raw: unknown, id: string) {
  if (!isSettingsTenantId(id) || !object(raw) || !object(raw.data)) throw malformed()
  const { data } = raw
  if (!object(data.whitelabel) || data.whitelabel.id !== Number(id) || !object(data.settings)) throw malformed()
  const w = data.whitelabel, s = data.settings
  const provenance = readProvenance(data)
  const theme = bag(bag(s, 'quick_profile'), 'theme'), login = bag(s, 'login'), flags = bag(s, 'features')
  const terminology = bag(bag(s, 'terminology'), 'config')
  if (terminology && (terminology.capabilityId !== 'platform.terminology' || terminology.version !== 1 || terminology.locale !== 'pt-BR')) throw malformed()
  const values = bag(terminology, 'values'), legal = bag(data, 'terms')
  const history = legal && Object.hasOwn(legal, 'history') ? legal.history : undefined
  if (history !== undefined && history !== null && (!Array.isArray(history) || history.length > 20)) throw malformed()
  const active = field(w, 'isActive', (v): v is boolean | 0 | 1 => typeof v === 'boolean' || v === 0 || v === 1)
  const bullets = field(login, 'bullets', (v): v is string[] => Array.isArray(v) && v.length <= 3 && v.every(text))
  return {
    id,
    name: field(w, 'name', text), slug: field(w, 'slug', text), baseUrl: field(w, 'baseUrl', url),
    active: active.state === 'value' ? { state: 'value' as const, value: Boolean(active.value) } : active,
    identity: { primaryColor: field(theme, 'primaryColor', color), backgroundColor: field(theme, 'backgroundColor', color), textColor: field(theme, 'textColor', color) },
    experience: { title: effective(provenance['login.title'], field(login, 'title', text)), subtitle: effective(provenance['login.subtitle'], field(login, 'subtitle', text)), sideTitle: field(theme, 'sideTitle', text), sideSubtitle: field(theme, 'sideSubtitle', text), bullets: effective(provenance['login.bullets'], bullets) },
    features: Object.fromEntries(Object.keys(FEATURE_LABELS).map(k => [k, effective(provenance[`features.${k}` as QualifiedSetting], field(flags, k, bool))])) as Record<keyof typeof FEATURE_LABELS, ReadValue<boolean>>,
    provenance,
    terminology: Object.fromEntries(Object.keys(TERMINOLOGY_LABELS).map(k => [k, field(values, k, text)])) as Record<keyof typeof TERMINOLOGY_LABELS, ReadValue<string>>,
    app: { entry: readAppContent(s, 'entry'), authenticated: readAppContent(s, 'authenticated') },
    platformPresentation: readPlatformPresentation(s),
    terms: { current: termField(legal, 'current'), history: history === undefined ? { state: 'missing' as const } : history === null ? { state: 'null' as const } : { state: 'value' as const, value: (history as unknown[]).map(terms) } },
  }
}
export type SettingsRead = ReturnType<typeof parseSettingsRead>
export async function getSettingsRead(id: string, signal?: AbortSignal) {
  if (!isSettingsTenantId(id)) throw new ApiError(404, { code: 'INVALID_WHITELABEL_ID' })
  return parseSettingsRead(await authenticatedGet(`/whitelabels/${id}/settings`, { signal }), id)
}
