import type { StatusTone } from '../../components/ui/StatusPill'
import type { AuditRecord } from './auditApi'
import { businessText } from '../operation/shared/businessPresentation'

/*
 * Presentation of real Control Plane audit rows. Pure functions, no state, no
 * logging. Labels are derived from the recorded tokens (unknown tokens are
 * shown as sent); they describe the event only — an event never proves that
 * the referenced feature is integrated anywhere else.
 */

/** Action tokens written by `backend-super-admin-Loor` (source `0177437`). Only LOGIN_* observed live. */
const ACTION_LABEL: Record<string, string> = {
  LOGIN_SUCCESS: 'Login realizado',
  LOGIN_FAILURE: 'Tentativa de login recusada',
  CREATE_WHITELABEL: 'Whitelabel criado',
  UPDATE_WHITELABEL: 'Whitelabel atualizado',
  CREATE_ADMIN: 'Administrador criado',
  PAUSE_ACCOUNT: 'Conta pausada',
  REACTIVATE_ACCOUNT: 'Conta reativada',
  TEST_SMTP: 'Teste de envio SMTP',
  UPDATE_SMTP: 'Configuração SMTP atualizada',
  UPDATE_GATEWAY: 'Gateway atualizado',
  UPDATE_PLATFORM_CONFIG: 'Configuração da plataforma atualizada',
  APPROVE_OPPORTUNITY: 'Oportunidade aprovada',
  DENY_OPPORTUNITY: 'Oportunidade negada',
}

export const actionLabel = (action: string) => (Object.hasOwn(ACTION_LABEL, action) ? ACTION_LABEL[action] : safeAuditText(action) ?? 'Não informado')

const RESULT_META: Record<string, { label: string; tone: StatusTone }> = {
  success: { label: 'Sucesso', tone: 'success' },
  failed: { label: 'Falha', tone: 'danger' },
}

export function resultMeta(result: string | null): { label: string; tone: StatusTone } {
  if (!result) return { label: 'Não informado', tone: 'muted' }
  return Object.hasOwn(RESULT_META, result) ? RESULT_META[result] : { label: safeAuditText(result) ?? 'Não informado', tone: 'muted' }
}

const RESOURCE_LABEL: Record<string, string> = {
  whitelabel: 'Whitelabel',
  whitelabel_admin: 'Administrador do Whitelabel',
  smtp: 'Configuração SMTP',
  gateway: 'Gateway',
  platform_config: 'Configuração da plataforma',
  opportunity: 'Oportunidade',
  investor: 'Investidor',
  entrepreneur: 'Empreendedor',
  admin: 'Administrador',
}

export const resourceLabel = (type: string) => (Object.hasOwn(RESOURCE_LABEL, type) ? RESOURCE_LABEL[type] : safeAuditText(type) ?? 'Não informado')

/* ---------- sanitization of recorded data (beforeData / afterData) ---------- */

/**
 * Keys whose values are never displayed. A superset of the Control Plane's
 * write-time list (password|secret|token|api key|authorization|credential),
 * which misses e.g. SMTP "pass", documents, card / bank data and private keys.
 */
const SENSITIVE_KEY = new RegExp(
  [
    'password|passwd|passphrase|(^|[_-])(pass|pwd)([_-]|$)',
    'senha',
    'secret',
    'segredo',
    'token',
    'authorization',
    'auth[_-]?header',
    'bearer',
    'cookie',
    'session',
    'credential',
    'credencial',
    '(api|private|secret|access|signing|encryption|pix|client)[_-]?key',
    'chave',
    'otp',
    'mfa',
    '2fa',
    '(^|[_-])(pin|rg)([_-]|$)',
    'cvv',
    'cvc',
    '(^|[_-])card([_-]|$)|card[_-]?(number|holder|data)',
    'cart(a|ão|ao)',
    'iban',
    'account[_-]?number',
    'bank[_-]?account',
    'conta[_-]?banc',
    'ag(e|ê)ncia',
    'cpf',
    'cnpj',
    'passport',
    'passaporte',
    'cnh',
    'document',
    'documento',
    'identity',
    'identidade',
    'biometr',
    'selfie',
    'payload',
    'signature',
    'assinatura',
  ].join('|'),
  'i',
)

/** Explicit recorded e-mail fields remain subject to validation and credential detection. */
const EMAIL_KEY = /^(email|e_mail|e-mail)$/i

const REDACTED_MARKERS = new Set(['[REDACTED]', '[redacted]'])
const TOKEN_LIKE = /\bbearer\s+\S+|(?:^|[^\w-])eyJ[\w-]+\.[\w-]+\.[\w-]*|-----BEGIN [A-Z0-9 ]+-----/i
const EMAIL_IN_TEXT = /[^\s@<>"'(),;:]+@[^\s@<>"'(),;:]+\.[^\s@<>"'(),;:]+/g
const MAX_DEPTH = 5
const MAX_ENTRIES = 100
const MAX_TEXT = 300
const MAX_INPUT_TEXT = 32_768
const MAX_NODES = 500
const MAX_CHARACTERS = 32_768
export const isCredentialAuditText = (value: string) => TOKEN_LIKE.test(value)

export const isSensitiveAuditKey = (key: string) => SENSITIVE_KEY.test(
  key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').normalize('NFD').replace(/\p{M}/gu, ''),
)

export type SanitizedNode =
  | { kind: 'empty' }
  | { kind: 'text'; text: string; truncated?: boolean }
  | { kind: 'masked'; reason: 'redacted-by-backend' | 'sensitive-key' | 'token-like' | 'email' | 'unsupported'; text: string }
  | { kind: 'object'; entries: { key: string; node: SanitizedNode }[]; omitted: number }
  | { kind: 'array'; items: SanitizedNode[]; omitted: number }
  | { kind: 'too-deep' }

/** Full recorded business e-mail; malformed or credential-like values stay hidden. */
export function auditEmail(value: string) {
  if (value.length > 254 || TOKEN_LIKE.test(value)) return '••••••••'
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? value.trim() : '••••••••'
}

/** Keep incidental contacts in unqualified free-form metadata minimized. */
export function maskEmail(value: string) {
  if (value.length > 254 || TOKEN_LIKE.test(value)) return '••••••••'
  const match = /^([^\s@])[^\s@]*@([^\s@]+\.[^\s@]+)$/.exec(value.trim())
  return match ? `${match[1]}•••@${match[2]}` : '••••••••'
}

/** Structure-preserving, fail-closed rendering model of recorded JSON. */
export function sanitizeAuditData(value: unknown, key = '', depth = 0): SanitizedNode {
  // One budget for the entire tree, not 100^depth independently renderable nodes.
  const budget = { nodes: MAX_NODES, characters: MAX_CHARACTERS }
  try {
    return walkData(value, key, depth, budget)
  } catch {
    // Non-JSON objects/proxies must not crash the view or escape sanitization.
    return { kind: 'masked', reason: 'unsupported', text: '••••••••' }
  }
}

function walkData(value: unknown, key: string, depth: number, budget: { nodes: number; characters: number }): SanitizedNode {
  budget.nodes -= 1
  if (value === null || value === undefined) return { kind: 'empty' }
  if (key && isSensitiveAuditKey(key)) return { kind: 'masked', reason: 'sensitive-key', text: '••••••••' }
  if (typeof value === 'string') {
    if (value.length > MAX_INPUT_TEXT) return { kind: 'masked', reason: 'unsupported', text: '••••••••' }
    if (REDACTED_MARKERS.has(value.trim())) return { kind: 'masked', reason: 'redacted-by-backend', text: '[redacted]' }
    if (TOKEN_LIKE.test(value.trim())) return { kind: 'masked', reason: 'token-like', text: '••••••••' }
    const maskedEmail = key && EMAIL_KEY.test(key) ? auditEmail(value) : value.replace(EMAIL_IN_TEXT, maskEmail)
    const limit = Math.min(MAX_TEXT, budget.characters)
    budget.characters -= Math.min(maskedEmail.length, limit)
    const rendered = maskedEmail.slice(0, limit)
    if (maskedEmail !== value) return { kind: 'masked', reason: 'email', text: rendered }
    if (value.trim() === '') return { kind: 'empty' }
    return value.length > limit ? { kind: 'text', text: `${rendered}…`, truncated: true } : { kind: 'text', text: rendered }
  }
  if (typeof value === 'boolean') return { kind: 'text', text: value ? 'Sim' : 'Não' }
  if (typeof value === 'number') return Number.isFinite(value) ? { kind: 'text', text: String(value) } : { kind: 'masked', reason: 'unsupported', text: '••••••••' }
  if (depth >= MAX_DEPTH) return { kind: 'too-deep' }
  if (Array.isArray(value)) {
    const items: SanitizedNode[] = []
    for (let index = 0; index < Math.min(value.length, MAX_ENTRIES) && budget.nodes > 0 && budget.characters > 0; index += 1) {
      items.push(walkData(value[index], key, depth + 1, budget))
    }
    return {
      kind: 'array',
      items,
      omitted: value.length - items.length,
    }
  }
  if (typeof value === 'object') {
    if (![Object.prototype, null].includes(Object.getPrototypeOf(value))) return { kind: 'masked', reason: 'unsupported', text: '••••••••' }
    const keys = Object.keys(value)
    const entries: { key: string; node: SanitizedNode }[] = []
    for (let index = 0; index < Math.min(keys.length, MAX_ENTRIES) && budget.nodes > 0 && budget.characters > 0; index += 1) {
      const childKey = keys[index]
      // Property names are untrusted too; do not read accessor values.
      const displayKey = safeAuditText(childKey)?.slice(0, 120) ?? 'Campo não informado'
      budget.characters -= Math.min(displayKey.length, budget.characters)
      const descriptor = Object.getOwnPropertyDescriptor(value, childKey)
      if (!descriptor || !('value' in descriptor)) budget.nodes -= 1
      entries.push({
        key: displayKey,
        node: descriptor && 'value' in descriptor
          ? walkData(descriptor.value, childKey, depth + 1, budget)
          : { kind: 'masked', reason: 'unsupported', text: '••••••••' },
      })
    }
    return {
      kind: 'object',
      entries,
      omitted: keys.length - entries.length,
    }
  }
  return { kind: 'masked', reason: 'unsupported', text: '••••••••' }
}

/** Free-form metadata follows the same value-pattern protection as before/after. */
export function safeAuditText(value: string | null): string | null {
  const node = sanitizeAuditData(value)
  return node.kind === 'text' || node.kind === 'masked' ? node.text : null
}

/** True when the node tree holds at least one displayable or masked value. */
export function hasRecordedData(node: SanitizedNode): boolean {
  if (node.kind === 'empty') return false
  if (node.kind === 'object') return node.entries.length > 0 || node.omitted > 0
  if (node.kind === 'array') return node.items.length > 0 || node.omitted > 0
  return true
}

/** JSON-like text of the SANITIZED tree (masked values replaced) for the secondary raw view. */
export function sanitizedJson(node: SanitizedNode): unknown {
  switch (node.kind) {
    case 'empty':
      return null
    case 'text':
      return node.text
    case 'masked':
      return node.reason === 'email' ? node.text : '[oculto]'
    case 'too-deep':
      return '[estrutura muito profunda — omitida]'
    case 'array':
      return [...node.items.map(sanitizedJson), ...(node.omitted ? [`[+${node.omitted} itens omitidos]`] : [])]
    case 'object':
      return Object.fromEntries([
        ...node.entries.map(({ key, node: child }) => [key, sanitizedJson(child)]),
        ...(node.omitted ? [['…', `[+${node.omitted} campos omitidos]`]] : []),
      ])
  }
}

/* ---------- actor / resource text ---------- */

export const actorName = (record: Pick<AuditRecord, 'actorId' | 'actor'>) =>
  record.actorId ? businessText(record.actor?.name, 160) ?? 'Operador sem nome' : 'Não identificado'

/** Authorized operator contact exactly as recorded; no independent actor enrichment. */
export const actorEmail = (record: Pick<AuditRecord, 'actor'>) => (record.actor?.email ? auditEmail(record.actor.email) : null)

/** "Whitelabel · 4" from the recorded tokens; null when the event records no resource. */
export const resourceText = (record: Pick<AuditRecord, 'resourceType' | 'resourceId'>) =>
  record.resourceType || record.resourceId
    ? [record.resourceType ? resourceLabel(record.resourceType) : 'Recurso', safeAuditText(record.resourceId)].filter(Boolean).join(' · ')
    : null
