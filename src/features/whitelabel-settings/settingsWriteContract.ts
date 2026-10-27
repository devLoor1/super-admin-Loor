import { ApiError } from '../../lib/api'
import { FEATURE_LABELS, isSettingsTenantId, parseSettingProvenance, type ReadValue, type SettingsRead, type SettingProvenance } from './settingsReadApi'

export const SETTINGS_COPY_LABELS = { 'login.title': 'Título de login', 'login.subtitle': 'Subtítulo de login', 'login.bullets': 'Destaques de login' } as const
export type SettingsCopyField = keyof typeof SETTINGS_COPY_LABELS
export type SettingsField = SettingsCopyField | `features.${keyof typeof FEATURE_LABELS}`
export type SettingValue = string | string[] | boolean
export type SettingBaseline = ReadValue<SettingValue>
export type QualifiedSettingBaseline = { value: SettingBaseline; provenance: SettingProvenance }
export type SettingsWriteCommand = { tenantId: string; field: SettingsField; baseline: QualifiedSettingBaseline; value: SettingValue }
export type SettingsResetCommand = Omit<SettingsWriteCommand, 'value'>
export const SETTINGS_FIELDS: readonly SettingsField[] = [...Object.keys(SETTINGS_COPY_LABELS), ...Object.keys(FEATURE_LABELS).map(key => `features.${key}`)] as SettingsField[]
export const canWriteSettings = (roles: readonly string[] | undefined) => roles?.includes('SUPER_ADMIN') === true
export const settingsInputError = () => new ApiError(422, { code: 'SETTINGS_INPUT_INVALID' })
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
const tokenLike = /\bbearer\s+\S+|(?:^|[^\w-])eyJ[\w-]+\.[\w-]+\.[\w-]*|-----BEGIN [A-Z0-9 ]+-----/i

export function isSettingsField(value: unknown): value is SettingsField { return typeof value === 'string' && SETTINGS_FIELDS.includes(value as SettingsField) }
export function settingsFieldLabel(field: SettingsField): string {
  return field.startsWith('features.') ? FEATURE_LABELS[field.slice(9) as keyof typeof FEATURE_LABELS] : SETTINGS_COPY_LABELS[field as SettingsCopyField]
}
/** SET-01 scalar limits; restoration must preserve the captured value exactly. */
export function settingsTextLimit(field: SettingsField) { return field === 'login.subtitle' ? 1000 : 240 }
function safeCopy(value: unknown, max: number): string {
  if (typeof value !== 'string' || value.length > max || !value.trim() || tokenLike.test(value) || /[<>]/.test(value)) throw settingsInputError()
  if (/[\p{Cc}\p{Cf}]/u.test(value)) throw settingsInputError()
  return value
}
export function normalizeSettingValue(field: SettingsField, value: unknown): SettingValue {
  if (!isSettingsField(field)) throw settingsInputError()
  if (field.startsWith('features.')) { if (typeof value !== 'boolean') throw settingsInputError(); return value }
  if (field === 'login.bullets') {
    if (!Array.isArray(value) || value.length !== 3) throw settingsInputError()
    return value.map(item => safeCopy(item, settingsTextLimit(field)))
  }
  return safeCopy(value, settingsTextLimit(field))
}
/** The baseline is an exact read, not normalized editor input; empty/null/missing stay distinct. */
export function settingsFieldValue(data: SettingsRead, field: SettingsField): SettingBaseline {
  if (!isSettingsField(field)) throw settingsInputError()
  const value = field === 'login.title' ? data.experience.title : field === 'login.subtitle' ? data.experience.subtitle
    : field === 'login.bullets' ? data.experience.bullets : data.features[field.slice(9) as keyof typeof FEATURE_LABELS]
  return value.state === 'value' ? { state: 'value', value: Array.isArray(value.value) ? [...value.value] : value.value } : { state: value.state }
}
function isReadValue(field: SettingsField, value: unknown): value is SettingBaseline {
  if (!object(value) || !['missing', 'null', 'value'].includes(String(value.state))) return false
  if (value.state !== 'value') return Object.keys(value).length === 1
  if (Object.keys(value).some(key => !['state', 'value'].includes(key))) return false
  const current = value.value
  return field.startsWith('features.') ? typeof current === 'boolean' : field === 'login.bullets'
    ? Array.isArray(current) && current.length <= 3 && current.every(v => typeof v === 'string' && v.length <= 200_000)
    : typeof current === 'string' && current.length <= 200_000
}
export const sameSetting = (left: SettingBaseline, right: SettingBaseline) => JSON.stringify(left) === JSON.stringify(right)
export function settingsFieldBaseline(data: SettingsRead, field: SettingsField): QualifiedSettingBaseline {
  const provenance = data.provenance[field]
  if (!provenance) throw new ApiError(200, { code: 'SETTINGS_PROVENANCE_REQUIRED' }, { kind: 'malformed' })
  return { value: settingsFieldValue(data, field), provenance: parseSettingProvenance(provenance, field) }
}
export const sameSettingBaseline = (left: QualifiedSettingBaseline, right: QualifiedSettingBaseline) => JSON.stringify(left) === JSON.stringify(right)
function isBaseline(field: SettingsField, value: unknown): value is QualifiedSettingBaseline {
  if (!object(value) || Object.keys(value).some(key => !['value', 'provenance'].includes(key)) || !isReadValue(field, value.value)) return false
  try {
    const provenance = parseSettingProvenance(value.provenance, field)
    const effective: SettingBaseline = provenance.source === 'absent' ? { state: 'missing' } : provenance.effectiveValue === null ? { state: 'null' } : { state: 'value', value: provenance.effectiveValue }
    return sameSetting(value.value, effective)
  } catch { return false }
}
/** Absence/default is restorable with DELETE; stored scalar values round-trip without normalization. */
export function isExactlyRestorableSetting(field: SettingsField, baseline: QualifiedSettingBaseline) {
  if (!isBaseline(field, baseline)) return false
  if (!baseline.provenance.stored) return true
  try { return JSON.stringify(normalizeSettingValue(field, baseline.provenance.storedValue)) === JSON.stringify(baseline.provenance.storedValue) } catch { return false }
}
export function settingPayload(command: SettingsWriteCommand) {
  if (!isSettingsTenantId(command.tenantId) || !isSettingsField(command.field) || !isBaseline(command.field, command.baseline)) throw settingsInputError()
  const [page, key] = command.field.split('.')
  return { page, key, value: normalizeSettingValue(command.field, command.value) }
}
export function settingResetPath(command: SettingsResetCommand) {
  if (!isSettingsTenantId(command.tenantId) || !isSettingsField(command.field) || !isBaseline(command.field, command.baseline)) throw settingsInputError()
  const [page, key] = command.field.split('.')
  return `/whitelabels/${command.tenantId}/settings/${encodeURIComponent(page)}/${encodeURIComponent(key)}/override`
}
export function parseSettingResetReceipt(raw: unknown, field: SettingsField) {
  const [page, key] = field.split('.')
  if (!object(raw) || !object(raw.data) || typeof raw.data.deleted !== 'boolean' || raw.data.page !== page || raw.data.key !== key || raw.data.stored !== false) throw new ApiError(200, {}, { kind: 'malformed' })
  const provenance = parseSettingProvenance({ stored: raw.data.stored, storedValue: null, effectiveValue: raw.data.effectiveValue, source: raw.data.source, version: raw.data.version }, field)
  return { deleted: raw.data.deleted, provenance }
}
export function parseSettingReceipt(raw: unknown, field: SettingsField, expected: SettingValue) {
  const [page, key] = field.split('.')
  if (!object(raw) || !object(raw.data)) throw new ApiError(200, {}, { kind: 'malformed' })
  const row = raw.data
  if (typeof row.id !== 'number' || !Number.isSafeInteger(row.id) || row.id <= 0 || row.page !== page || row.key !== key || JSON.stringify(row.value) !== JSON.stringify(expected)) throw new ApiError(200, {}, { kind: 'malformed' })
  return { id: row.id }
}
