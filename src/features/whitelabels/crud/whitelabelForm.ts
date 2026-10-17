import { formatWhitelabelDate, type WhitelabelRecord } from '../whitelabelApi'

/*
 * Whitelabel create / name-only edit rules — PURE (nothing here talks to the
 * Control Plane).
 *
 * Mirrors the Nest DTOs of `backend-super-admin-Loor` (rechecked at `aea5392`;
 * the DTOs are unchanged since `46bf79d`):
 *
 *   CreateWhitelabelDto  name    @IsString @MinLength(2) @MaxLength(120)
 *                        slug    @IsString @Matches(/^[a-z0-9-]+$/) @MaxLength(80)
 *                        baseUrl @IsUrl({ require_tld: false })
 *                        — all three REQUIRED; unknown keys → 400 (forbidNonWhitelisted)
 *   UpdateWhitelabelDto  the same three fields, each @IsOptional
 *                        — this UI edits `name` ONLY; slug / baseUrl stay read-only
 *
 * The Control Plane stays the authority: anything accepted here can still be
 * refused on submit (400 / 422). The URL rule below is deliberately a STRICTER
 * SUBSET of class-validator's `IsUrl({ require_tld: false })`, independently
 * checked against validator.js 13.15.35 (class-validator 0.14.4's locked
 * dependency). Finite tests are not a proof for every possible string — see
 * docs/whitelabel-crud-safe-preparation-v1.md §B.3. Browser URL parsing is
 * never the validator: `new URL()` only runs as an extra filter that can
 * reject a value, never accept one.
 */

export const NAME_MIN = 2
export const NAME_MAX = 120
export const SLUG_MAX = 80
/** `@Matches(/^[a-z0-9-]+$/)` of both DTOs. */
export const SLUG_PATTERN = /^[a-z0-9-]+$/
/** validator.js `isURL` default `max_allowed_length` (13.15.35). */
export const BASE_URL_MAX = 2084

export type CreateFieldKey = 'name' | 'slug' | 'baseUrl'
export const CREATE_FIELDS: readonly CreateFieldKey[] = Object.freeze(['name', 'slug', 'baseUrl'])

export type CreateDraft = Record<CreateFieldKey, string>
/** The edit draft has no slug / baseUrl: there is no hidden path to change them. */
export type NameDraft = { name: string }

export const EMPTY_CREATE_DRAFT: Readonly<CreateDraft> = Object.freeze({ name: '', slug: '', baseUrl: '' })

export const FIELD_LABELS: Readonly<Record<CreateFieldKey, string>> = Object.freeze({
  name: 'Nome',
  slug: 'Identificador (slug)',
  baseUrl: 'URL base',
})

/** Whitespace normalization for names: trims and collapses internal runs. */
export const tidyName = (value: string) => value.replace(/\s+/g, ' ').trim()
/** Slug / URL: surrounding whitespace only. Never rewritten (no lower-casing, no trailing slash). */
export const tidy = (value: string) => value.trim()

const text = (value: unknown) => (typeof value === 'string' ? value : '')

/** The exact values a create command would carry. Returns a new object; the draft is never changed. */
export function normalizeCreateDraft(draft: Readonly<CreateDraft>): CreateDraft {
  return { name: tidyName(text(draft.name)), slug: tidy(text(draft.slug)), baseUrl: tidy(text(draft.baseUrl)) }
}

/**
 * Character count as class-validator `MinLength` / `MaxLength` count it
 * (validator.js `isLength`): a surrogate pair, or a variation selector that
 * follows a character, does not add a character.
 */
export function dtoLength(value: string) {
  const presentation = value.match(/[^️︎][️︎]/g)?.length ?? 0
  const surrogatePairs = value.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g)?.length ?? 0
  return value.length - presentation - surrogatePairs
}

export function nameError(name: string): string | undefined {
  if (!name) return 'Informe o nome do Whitelabel.'
  const length = dtoLength(name)
  if (length < NAME_MIN) return `Use pelo menos ${NAME_MIN} caracteres.`
  if (length > NAME_MAX) return `Use no máximo ${NAME_MAX} caracteres.`
  return undefined
}

export function slugError(slug: string): string | undefined {
  if (!slug) return 'Informe o identificador (slug).'
  if (slug.length > SLUG_MAX) return `Use no máximo ${SLUG_MAX} caracteres.`
  if (!SLUG_PATTERN.test(slug)) return 'Use apenas letras minúsculas sem acento, números e hífens.'
  return undefined
}

/* ---------- URL base: stricter subset of IsUrl({ require_tld: false }) ---------- */

export type BaseUrlIssue = 'required' | 'length' | 'characters' | 'scheme' | 'credentials' | 'port' | 'host'

const OCTET = '(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])'
/** validator.js IPv4 form (no leading zeros). */
const IPV4 = new RegExp(`^${OCTET}(?:\\.${OCTET}){3}$`)
/** ASCII DNS label: 1–63 letters, digits or inner hyphens (no underscore, no accents). */
const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i

/**
 * Accepted: `http://` or `https://`, a host that is an IPv4 address or ASCII
 * DNS labels (single-label hosts such as `localhost` included — `require_tld:
 * false`; the last label is not all digits), an optional port 1–65535, then any
 * path / query / fragment without whitespace, `<` or `>`.
 *
 * Refused here although IsUrl would accept them (stricter on purpose: every
 * live Whitelabel uses an absolute http(s) URL, and the URL builds tenant
 * links): no scheme (`plataforma.com.br`), `ftp://`, credentials
 * (`user:pass@`), IPv6 literals, non-ASCII host names, an empty port (`host:`).
 */
export function baseUrlIssue(value: string): BaseUrlIssue | null {
  if (!value) return 'required'
  if (value.length > BASE_URL_MAX) return 'length'
  if (/[\s<>]/.test(value)) return 'characters'
  const match = /^https?:\/\/([^/?#]*)/i.exec(value)
  if (!match) return 'scheme'
  const authority = match[1]
  if (authority.includes('@')) return 'credentials'
  const parts = authority.split(':')
  const host = parts[0]
  if (parts.length > 2) return host.startsWith('[') ? 'host' : 'port'
  if (parts.length === 2) {
    const port = parts[1]
    if (!/^\d{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535) return 'port'
  }
  if (!IPV4.test(host)) {
    const labels = host.split('.')
    if (!labels.every((label) => LABEL.test(label)) || /^\d+$/.test(labels[labels.length - 1])) return 'host'
  }
  try {
    new URL(value)
  } catch {
    return 'host'
  }
  return null
}

const BASE_URL_MESSAGES: Record<BaseUrlIssue, string> = {
  required: 'Informe a URL base.',
  length: `Use no máximo ${BASE_URL_MAX} caracteres.`,
  characters: 'Remova espaços e os caracteres < e >.',
  scheme: 'Use a URL completa, iniciando com https:// ou http://.',
  credentials: 'Não inclua usuário ou senha na URL base.',
  port: 'A porta, quando informada, deve ser um número de 1 a 65535.',
  host: 'Informe um endereço válido (ex.: plataforma.com.br ou localhost), sem acentos, sublinhados ou ponto final.',
}

export function baseUrlError(baseUrl: string): string | undefined {
  const issue = baseUrlIssue(baseUrl)
  return issue ? BASE_URL_MESSAGES[issue] : undefined
}

/* ---------- validation ---------- */

export type CreateErrors = Partial<Record<CreateFieldKey, string>>

export function validateCreate(draft: Readonly<CreateDraft>): CreateErrors {
  const value = normalizeCreateDraft(draft)
  const errors: CreateErrors = {}
  const name = nameError(value.name)
  const slug = slugError(value.slug)
  const baseUrl = baseUrlError(value.baseUrl)
  if (name) errors.name = name
  if (slug) errors.slug = slug
  if (baseUrl) errors.baseUrl = baseUrl
  return errors
}

export const firstInvalid = (errors: CreateErrors) => CREATE_FIELDS.find((key) => errors[key])

export function isCreateDirty(draft: Readonly<CreateDraft>) {
  const value = normalizeCreateDraft(draft)
  return Boolean(value.name || value.slug || value.baseUrl)
}

/* ---------- name-only edit ---------- */

/** The authoritative name (`GET /whitelabels/:id`) as the edit form's starting point. */
export function nameDraftFromRecord(record: WhitelabelRecord): NameDraft {
  return { name: record.name }
}

export type NameChange = Readonly<{ before: string; after: string }>

/**
 * The normalized name differs from the authoritative one. Whitespace-only
 * differences are not a change (both sides are compared normalized).
 */
export function nameChange(record: WhitelabelRecord, draft: Readonly<NameDraft>): NameChange | null {
  const after = tidyName(text(draft.name))
  return after === tidyName(record.name) ? null : Object.freeze({ before: record.name, after })
}

/** The record was renamed or updated in the Control Plane after the edit started. */
export function isRecordStale(base: WhitelabelRecord, latest: WhitelabelRecord | null | undefined) {
  if (!latest || latest.id !== base.id) return false
  return latest.name !== base.name || latest.updatedAt !== base.updatedAt
}

export type ReadOnlyFact = Readonly<{ key: string; label: string; value: string | null; note: string; identity?: true }>

/** Shown read-only in the name edit: identity, tenant resolution, lifecycle and Backend-derived values. */
export function readOnlyFacts(record: WhitelabelRecord): ReadOnlyFact[] {
  return [
    { key: 'id', label: 'ID', value: record.id, note: 'Imutável; define o destino da edição' },
    {
      key: 'slug',
      label: 'Identificador (slug)',
      value: record.slug || null,
      note: 'Somente leitura: alterar o slug afeta a resolução do tenant e exige autorização separada',
      identity: true,
    },
    {
      key: 'baseUrl',
      label: 'URL base',
      value: record.baseUrl,
      note: 'Somente leitura: alterar a URL base afeta a resolução do tenant e os links enviados; exige autorização separada',
      identity: true,
    },
    { key: 'status', label: 'Status', value: record.status === 'active' ? 'Ativo' : 'Inativo', note: 'Ativação e desativação não estão disponíveis' },
    { key: 'domain', label: 'Domínio', value: record.domain, note: 'Derivado pelo Control Plane' },
    { key: 'createdAt', label: 'Criado em', value: formatWhitelabelDate(record.createdAt, true), note: 'Imutável' },
    { key: 'updatedAt', label: 'Última atualização', value: formatWhitelabelDate(record.updatedAt, true), note: 'Definida pelo Backend' },
  ].map((fact) => Object.freeze(fact as ReadOnlyFact))
}
