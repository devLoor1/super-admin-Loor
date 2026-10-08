import type { AuditEvent, AuditFieldMap, AuditValue } from './auditModel'

/*
 * Rendering helpers for Auditoria events: field labels, defensive
 * redaction, a field-oriented before / after diff and the sanitized raw view.
 * Pure functions — no state, no side effect.
 */

/** Field keys whose values are never displayed, whatever a record contains. */
const SENSITIVE_KEY =
  /(pass(word)?|senha|secret|segredo|token|authorization|auth[_-]?headers?|bearer|api[_-]?key|chave[_-]?api|cookie|credential|credencial|private|privad|cpf|cnpj|document|identity|identidade|biometr|payload)/i

export const isSensitiveKey = (key: string) => SENSITIVE_KEY.test(key)

const isRedactedMarker = (value: AuditValue | undefined): value is { readonly redacted: true } =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && 'redacted' in value

/** Flat, explicitly supported values only. Unknown structured payloads fail closed. */
const isSafeValue = (value: unknown) =>
  value === null ||
  typeof value === 'string' ||
  typeof value === 'boolean' ||
  (typeof value === 'number' && Number.isFinite(value)) ||
  (Array.isArray(value) && value.every((entry) => typeof entry === 'string'))

export const FIELD_LABEL: Record<string, string> = {
  status: 'Status',
  note: 'Observação',
  modality: 'Modalidade',
  segments: 'Segmentos',
  resourceUses: 'Usos dos recursos',
  name: 'Nome',
  domain: 'Domínio',
  slug: 'Slug',
  email: 'E-mail',
  role: 'Perfil',
  invitation: 'Convite',
  access: 'Acesso',
  slogan: 'Slogan / subtítulo',
  primaryColor: 'Cor primária',
  ctaLabel: 'Texto do botão principal',
  host: 'Host',
  port: 'Porta',
  security: 'Segurança',
  password: 'Senha SMTP',
  provider: 'Provedor',
  gatewayRole: 'Papel',
  environment: 'Ambiente',
  active: 'Ativo',
  clientId: 'Client ID',
  apiKey: 'Chave de API',
  webhookSecret: 'Segredo do webhook',
}

export const fieldLabel = (key: string) => Object.hasOwn(FIELD_LABEL, key) ? FIELD_LABEL[key] : key

/** Display text of a stored value. Sensitive values are masked, never shown. */
export function formatAuditValue(key: string, value: AuditValue | undefined): { text: string; sensitive: boolean; empty: boolean } {
  if (value === undefined || value === null) return { text: '—', sensitive: false, empty: true }
  if (isRedactedMarker(value) || isSensitiveKey(key) || !isSafeValue(value)) return { text: '••••••••', sensitive: true, empty: false }
  if (typeof value === 'boolean') return { text: value ? 'Sim' : 'Não', sensitive: false, empty: false }
  if (Array.isArray(value)) return value.length ? { text: value.join(', '), sensitive: false, empty: false } : { text: '—', sensitive: false, empty: true }
  return { text: String(value), sensitive: false, empty: false }
}

export type DiffRow = {
  key: string
  label: string
  before: AuditValue | undefined
  after: AuditValue | undefined
  sensitive: boolean
}

/** Union of the recorded fields (new value order first). Only fields the event recorded are listed. */
export function diffRows(event: Pick<AuditEvent, 'oldValue' | 'newValue'>): DiffRow[] {
  const keys = [...Object.keys(event.newValue ?? {}), ...Object.keys(event.oldValue ?? {})].filter(
    (key, index, list) => list.indexOf(key) === index,
  )
  return keys.map((key) => {
    const before = event.oldValue?.[key]
    const after = event.newValue?.[key]
    return {
      key,
      label: fieldLabel(key),
      before,
      after,
      sensitive: formatAuditValue(key, before).sensitive || formatAuditValue(key, after).sensitive,
    }
  })
}

/** "Com alterações": the event recorded at least one field before / after. */
export const hasChanges = (event: Pick<AuditEvent, 'oldValue' | 'newValue'>) => diffRows(event).length > 0

function sanitizeMap(map: AuditFieldMap | null) {
  if (!map) return null
  return Object.fromEntries(
    Object.entries(map).map(([key, value]) => [key, isRedactedMarker(value) || isSensitiveKey(key) || !isSafeValue(value) ? '[redacted]' : value]),
  )
}

/** Secondary raw view: the stored record with every sensitive value replaced by "[redacted]". */
export function sanitizedRaw(event: AuditEvent) {
  return JSON.stringify(
    {
      id: event.id,
      action: event.action,
      module: event.module,
      result: event.result,
      actorId: event.actorId,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      whitelabelId: event.whitelabelId,
      oldValue: sanitizeMap(event.oldValue),
      newValue: sanitizeMap(event.newValue),
      correlationId: event.correlationId,
      ip: event.ip,
      userAgent: event.userAgent,
      createdAt: event.createdAt,
    },
    null,
    2,
  )
}
