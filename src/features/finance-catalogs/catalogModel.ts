import type { StatusTone } from '../../components/ui/StatusPill'

/*
 * Segmentos e usos dos recursos V1 — frontend prototype model.
 *
 * Two INDEPENDENT catalogs that a future Opportunity flow will use:
 *   - Segment       (`seg_…` ids)
 *   - ResourceUse   (`ru_…` ids)
 * They are shown on one screen but share no ids, no records and no links. A
 * Segment and a Resource Use may have the same name (e.g. "Capital de Giro")
 * and remain unrelated. Neither is a modality (modalities are Equity and Debt,
 * see finance-gateways/financeModel.ts).
 *
 * Deliberately NOT modelled (Product/Backend decisions): hierarchy, codes,
 * ordering, Opportunity links or cardinality, global vs Whitelabel ownership,
 * what "inactive" means operationally, delete restrictions after use.
 */

export type CatalogStatus = 'active' | 'inactive'

export type Segment = {
  kind: 'segment'
  id: `seg_${string}`
  name: string
  description: string
  status: CatalogStatus
}

export type ResourceUse = {
  kind: 'resource_use'
  id: `ru_${string}`
  name: string
  description: string
  status: CatalogStatus
}

export type CatalogKind = Segment['kind'] | ResourceUse['kind']
export type CatalogItem = Segment | ResourceUse
export type ItemOf<K extends CatalogKind> = Extract<CatalogItem, { kind: K }>

/** Editable fields — the same three for both catalogs (separate records and flows). */
export type CatalogDraft = { name: string; description: string; status: CatalogStatus }

export const STATUS_META: Record<CatalogStatus, { label: string; tone: StatusTone }> = {
  active: { label: 'Ativo', tone: 'success' },
  inactive: { label: 'Inativo', tone: 'muted' },
}

/** Presentation copy per catalog (labels only — no shared data). */
export const CATALOG_META: Record<
  CatalogKind,
  {
    title: string
    singular: string
    /** "o segmento" / "o uso do recurso" — for sentences. */
    withArticle: string
    plural: string
    subtitle: string
    newLabel: string
    searchLabel: string
    idPrefix: string
  }
> = {
  segment: {
    title: 'Segmentos',
    singular: 'segmento',
    withArticle: 'o segmento',
    plural: 'segmentos',
    subtitle: 'Segmentos de atuação que poderão ser escolhidos na criação de Oportunidades.',
    newLabel: 'Novo segmento',
    searchLabel: 'Buscar segmentos',
    idPrefix: 'cat-seg',
  },
  resource_use: {
    title: 'Usos dos recursos',
    singular: 'uso do recurso',
    withArticle: 'o uso do recurso',
    plural: 'usos dos recursos',
    subtitle: 'Destinações dos recursos que poderão ser escolhidas na criação de Oportunidades.',
    newLabel: 'Novo uso do recurso',
    searchLabel: 'Buscar usos dos recursos',
    idPrefix: 'cat-ru',
  },
}

// Prototype presentation constraints only; Product/Backend must define the real limits.
export const NAME_MAX = 60
export const DESCRIPTION_MAX = 160
export const PAGE_SIZE = 6

/** Collapses whitespace; used for saving and display. */
export const tidy = (value: string) => value.trim().replace(/\s+/g, ' ')

/** Case-, accent- and spacing-insensitive key for the same-catalog duplicate check. */
export const normalizeName = (value: string) =>
  tidy(value)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('pt-BR')

export const draftOf = (item?: CatalogItem): CatalogDraft =>
  item ? { name: item.name, description: item.description, status: item.status } : { name: '', description: '', status: 'active' }

/**
 * Frontend validation. The duplicate check only looks at the SAME catalog
 * (`siblings`): a Segment and a Resource Use may share a name. It is a
 * prototype UX rule — the definitive rule needs Product/Backend validation.
 */
export function validateDraft(draft: CatalogDraft, siblings: CatalogItem[], editingId: string | undefined, singular: string) {
  const errors: Partial<Record<keyof CatalogDraft, string>> = {}
  const name = tidy(draft.name)
  if (!name) errors.name = 'Informe o nome.'
  else if (name.length < 2) errors.name = 'Use pelo menos 2 caracteres.'
  else if (name.length > NAME_MAX) errors.name = `Use no máximo ${NAME_MAX} caracteres.`
  else if (siblings.some((item) => item.id !== editingId && normalizeName(item.name) === normalizeName(name)))
    errors.name = `Já existe um ${singular} com este nome neste catálogo.`
  if (tidy(draft.description).length > DESCRIPTION_MAX) errors.description = `Use no máximo ${DESCRIPTION_MAX} caracteres.`
  return errors
}

/** Field-level summary of an update, for session activity (no ids, no values beyond the visible ones). */
export function describeChanges(before: CatalogItem, after: CatalogDraft) {
  const changes: string[] = []
  if (before.name !== tidy(after.name)) changes.push(`Nome: ${before.name} → ${tidy(after.name)}`)
  if (before.description !== tidy(after.description)) changes.push('Descrição alterada')
  if (before.status !== after.status) changes.push(`Status: ${STATUS_META[before.status].label} → ${STATUS_META[after.status].label}`)
  return changes.join('; ')
}

/* ---------- Session activity + drafts ---------- */

export type CatalogActivityKind = 'created' | 'updated' | 'deleted'

/** Session-only feedback — not an audit trail (no operator, no persistence). */
export type CatalogActivity = {
  id: string
  catalog: CatalogKind
  kind: CatalogActivityKind
  title: string
  detail?: string
  at: string
}

export type CatalogDraftKey = 'segment-form' | 'resource-use-form'

export const DRAFT_KEY: Record<CatalogKind, CatalogDraftKey> = {
  segment: 'segment-form',
  resource_use: 'resource-use-form',
}

export const DRAFT_LABEL: Record<CatalogDraftKey, string> = {
  'segment-form': 'Formulário de segmento',
  'resource-use-form': 'Formulário de uso do recurso',
}

export type StatusFilter = CatalogStatus | 'all'
export type SortKey = 'name' | 'status'
export type SortState = { key: SortKey; direction: 'ascending' | 'descending' }

const COLLATOR = new Intl.Collator('pt-BR', { sensitivity: 'base' })

export function sortItems<T extends CatalogItem>(items: T[], sort: SortState) {
  const sign = sort.direction === 'ascending' ? 1 : -1
  return [...items].sort((a, b) => {
    const primary = sort.key === 'status' ? COLLATOR.compare(STATUS_META[a.status].label, STATUS_META[b.status].label) : 0
    return (primary || COLLATOR.compare(a.name, b.name)) * sign
  })
}

const TIME = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
export const formatTime = (iso: string) => TIME.format(new Date(iso))
