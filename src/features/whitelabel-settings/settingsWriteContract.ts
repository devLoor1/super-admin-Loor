import { ApiError } from '../../lib/api'
import { FEATURE_LABELS, isSettingsTenantId, type ReadValue, type SettingsRead } from './settingsReadApi'

export const SETTINGS_COPY_LABELS = { 'login.title': 'Título de login', 'login.subtitle': 'Subtítulo de login', 'login.bullets': 'Destaques de login' } as const
export type SettingsCopyField = keyof typeof SETTINGS_COPY_LABELS
export type SettingsField = SettingsCopyField | `features.${keyof typeof FEATURE_LABELS}`
export type SettingValue = string | string[] | boolean
export type SettingBaseline = ReadValue<SettingValue>
export type SettingsWriteCommand = { tenantId: string; field: SettingsField; baseline: SettingBaseline; value: SettingValue }
export const SETTINGS_FIELDS: readonly SettingsField[] = [...Object.keys(SETTINGS_COPY_LABELS), ...Object.keys(FEATURE_LABELS).map(key => `features.${key}`)] as SettingsField[]
export const canWriteSettings = (roles: readonly string[] | undefined) => roles?.includes('SUPER_ADMIN') === true
export const settingsInputError = () => new ApiError(422, { code: 'SETTINGS_INPUT_INVALID' })
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
const tokenLike = /\bbearer\s+\S+|(?:^|[^\w-])eyJ[\w-]+\.[\w-]+\.[\w-]*|-----BEGIN [A-Z0-9 ]+-----/i

export function isSettingsField(value: unknown): value is SettingsField { return typeof value === 'string' && SETTINGS_FIELDS.includes(value as SettingsField) }
export function settingsFieldLabel(field: SettingsField): string {
  return field.startsWith('features.') ? FEATURE_LABELS[field.slice(9) as keyof typeof FEATURE_LABELS] : SETTINGS_COPY_LABELS[field as SettingsCopyField]
}
/** Defensive editor limits. Core's generic row store does not enforce these bounds. */
export function settingsTextLimit(field: SettingsField) { return field === 'login.subtitle' ? 1000 : 240 }
function safeCopy(value: unknown, max: number): string {
  if (typeof value !== 'string' || value.length > max || !value.trim() || tokenLike.test(value) || /[<>]/.test(value)) throw settingsInputError()
  if (/[\p{Cc}\p{Cf}]/u.test(value)) throw settingsInputError()
  return value.normalize('NFC').trim()
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
function isBaseline(field: SettingsField, value: unknown): value is SettingBaseline {
  if (!object(value) || !['missing', 'null', 'value'].includes(String(value.state))) return false
  if (value.state !== 'value') return Object.keys(value).length === 1
  if (Object.keys(value).some(key => !['state', 'value'].includes(key))) return false
  const current = value.value
  return field.startsWith('features.') ? typeof current === 'boolean' : field === 'login.bullets'
    ? Array.isArray(current) && current.length <= 3 && current.every(v => typeof v === 'string' && v.length <= 200_000)
    : typeof current === 'string' && current.length <= 200_000
}
export const sameSetting = (left: SettingBaseline, right: SettingBaseline) => JSON.stringify(left) === JSON.stringify(right)
/** A reversible smoke needs an existing value that the new-value validator can restore byte-for-byte. */
export function isExactlyRestorableSetting(field: SettingsField, baseline: SettingBaseline) {
  if (baseline.state !== 'value') return false
  try { return sameSetting(baseline, { state: 'value', value: normalizeSettingValue(field, baseline.value) }) } catch { return false }
}
export function settingPayload(command: SettingsWriteCommand) {
  if (!isSettingsTenantId(command.tenantId) || !isSettingsField(command.field) || !isBaseline(command.field, command.baseline)) throw settingsInputError()
  const [page, key] = command.field.split('.')
  return { page, key, value: normalizeSettingValue(command.field, command.value) }
}
export function parseSettingReceipt(raw: unknown, field: SettingsField, expected: SettingValue) {
  const [page, key] = field.split('.')
  if (!object(raw) || !object(raw.data)) throw new ApiError(200, {}, { kind: 'malformed' })
  const row = raw.data
  if (typeof row.id !== 'number' || !Number.isSafeInteger(row.id) || row.id <= 0 || row.page !== page || row.key !== key || JSON.stringify(row.value) !== JSON.stringify(expected)) throw new ApiError(200, {}, { kind: 'malformed' })
  return { id: row.id }
}
