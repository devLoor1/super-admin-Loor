import { formatWhitelabelDate, type WhitelabelRecord } from '../whitelabelApi'

/*
 * Whitelabel create / edit form schema (presentation only — nothing here
 * talks to the Control Plane).
 *
 * Field candidates and limits come from the DRAFT Control Plane DTOs in
 * `backend-super-admin-Loor` `0177437` (`CreateWhitelabelDto`,
 * `UpdateWhitelabelDto`). The Backend team is still validating those
 * contracts, so every limit below is a UX mirror of the draft, not a
 * confirmed business rule (see docs/whitelabel-crud-frontend-v1.md).
 */

export const NAME_MIN = 2
export const NAME_MAX = 120
export const SLUG_MAX = 80
/** Draft DTO: `@Matches(/^[a-z0-9-]+$/)`. */
export const SLUG_PATTERN = /^[a-z0-9-]+$/

export type WhitelabelFieldKey = 'name' | 'slug' | 'baseUrl'

/**
 * A — required in this provisional review UI (mirrors the draft DTO);
 * B — optional in this review UI (final requirement not confirmed);
 * C — Backend contract pending (shown read-only / not collected).
 */
export type FieldClass = 'A' | 'B' | 'C'

export const FIELD_META: Record<WhitelabelFieldKey, { label: string; createClass: FieldClass; editClass: FieldClass }> = {
  name: { label: 'Nome', createClass: 'A', editClass: 'A' },
  slug: { label: 'Identificador (slug)', createClass: 'A', editClass: 'C' },
  baseUrl: { label: 'URL base', createClass: 'B', editClass: 'B' },
}

export type WhitelabelDraft = Record<WhitelabelFieldKey, string>

export const EMPTY_DRAFT: WhitelabelDraft = { name: '', slug: '', baseUrl: '' }

/** Whitespace normalization: trims and collapses internal runs (names only). */
export const tidyName = (value: string) => value.replace(/\s+/g, ' ').trim()
export const tidy = (value: string) => value.trim()

export function normalizeDraft(draft: WhitelabelDraft): WhitelabelDraft {
  return { name: tidyName(draft.name), slug: tidy(draft.slug), baseUrl: tidy(draft.baseUrl) }
}

/** Authoritative values of a loaded Whitelabel (`GET /whitelabels/:id`) as the edit form's starting point. */
export function draftFromRecord(record: WhitelabelRecord): WhitelabelDraft {
  return { name: record.name, slug: record.slug, baseUrl: record.baseUrl ?? '' }
}

/** Absolute http(s) URL — the read model stores full URLs and the Backend derives the domain from it. */
export function isHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return (url.protocol === 'https:' || url.protocol === 'http:') && url.hostname !== '' && !/\s/.test(value)
  } catch {
    return false
  }
}

export type DraftErrors = Partial<Record<WhitelabelFieldKey, string>>

function nameError(name: string) {
  if (!name) return 'Informe o nome do Whitelabel.'
  if (name.length < NAME_MIN) return `Use pelo menos ${NAME_MIN} caracteres.`
  if (name.length > NAME_MAX) return `Use no máximo ${NAME_MAX} caracteres.`
  return undefined
}

function baseUrlError(baseUrl: string) {
  if (baseUrl && !isHttpUrl(baseUrl)) return 'Informe uma URL completa, iniciando com https:// ou http://.'
  return undefined
}

export function validateCreate(draft: WhitelabelDraft): DraftErrors {
  const value = normalizeDraft(draft)
  const errors: DraftErrors = {}
  errors.name = nameError(value.name)
  if (!value.slug) errors.slug = 'Informe o identificador (slug).'
  else if (value.slug.length > SLUG_MAX) errors.slug = `Use no máximo ${SLUG_MAX} caracteres.`
  else if (!SLUG_PATTERN.test(value.slug)) errors.slug = 'Use apenas letras minúsculas sem acento, números e hífens.'
  errors.baseUrl = baseUrlError(value.baseUrl)
  return clean(errors)
}

/** Only name and URL base are edit candidates (draft `UpdateWhitelabelDto`); the slug stays read-only. */
export function validateEdit(record: WhitelabelRecord, draft: WhitelabelDraft): DraftErrors {
  const value = normalizeDraft(draft)
  const errors: DraftErrors = {}
  errors.name = nameError(value.name)
  if (!value.baseUrl && record.baseUrl) {
    errors.baseUrl = 'A remoção da URL base ainda não tem contrato no Backend. Mantenha uma URL ou cancele.'
  } else {
    errors.baseUrl = baseUrlError(value.baseUrl)
  }
  return clean(errors)
}

function clean(errors: DraftErrors): DraftErrors {
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message)) as DraftErrors
}

export const firstInvalid = (errors: DraftErrors, order: WhitelabelFieldKey[]) => order.find((key) => errors[key])

export function isCreateDirty(draft: WhitelabelDraft) {
  const value = normalizeDraft(draft)
  return Boolean(value.name || value.slug || value.baseUrl)
}

export type FieldChange = { key: 'name' | 'baseUrl'; label: string; before: string | null; after: string | null }

/** Edit candidates whose normalized value differs from the authoritative record. */
export function changedFields(record: WhitelabelRecord, draft: WhitelabelDraft): FieldChange[] {
  const value = normalizeDraft(draft)
  const changes: FieldChange[] = []
  if (value.name !== tidyName(record.name)) changes.push({ key: 'name', label: FIELD_META.name.label, before: record.name, after: value.name })
  if (value.baseUrl !== (record.baseUrl ?? '')) {
    changes.push({ key: 'baseUrl', label: FIELD_META.baseUrl.label, before: record.baseUrl, after: value.baseUrl || null })
  }
  return changes
}

/** Read-only facts shown in the edit form: identity, timestamps and Backend-derived values are never editable. */
export function readOnlyFacts(record: WhitelabelRecord) {
  return [
    { label: 'ID', value: record.id, note: 'Imutável' },
    { label: 'Identificador (slug)', value: record.slug || null, note: 'Preservado; possibilidade de alteração ainda não confirmada' },
    { label: 'Status', value: record.status === 'active' ? 'Ativo' : 'Inativo', note: 'Valor atual; regra de alteração ainda pendente no Backend' },
    { label: 'Domínio', value: record.domain, note: 'Valor atual do Control Plane; não editado nesta revisão' },
    { label: 'Criado em', value: formatWhitelabelDate(record.createdAt, true), note: 'Imutável' },
    { label: 'Última atualização', value: formatWhitelabelDate(record.updatedAt, true), note: 'Definida pelo Backend' },
  ]
}
