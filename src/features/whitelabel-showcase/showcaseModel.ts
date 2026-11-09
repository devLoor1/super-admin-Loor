/**
 * Vitrine de White Labels — conceptual versioned document (PROPOSAL vocabulary,
 * not an existing Backend contract). Pure data and pure operations only: no
 * React, assets, transport or browser storage, so the offline checks can load it.
 */

export const SHOWCASE_SCHEMA_VERSION = 1
export const MARKDOWN_VERSION = 1
export const MIN_IMAGES = 1
export const MAX_IMAGES = 4

/** Logical owner of the configuration (WL6 / homologacao in the homolog environment). */
export type ShowcaseOwner = { environmentKey: 'homolog'; whitelabelId: 6; slug: 'homologacao' }

/**
 * One ordered image association. `associationId` identifies the association;
 * `assetRef` identifies the (synthetic) media. Bytes, Base64 or signed URLs are
 * never part of the document.
 */
export type ImageAssociation = {
  associationId: string
  assetRef: string
  /** Informative text alternative. Ignored (rendered as alt="") when `decorative`. */
  alt: string
  /** Explicitly decorative images may use an empty alternative. */
  decorative: boolean
  fileName: string
}

export type CardLogo = {
  assetRef: string
  alt: string
  fileName: string
  /** How this owner-scoped reference was obtained. */
  origin: 'upload' | 'exemplo-aprovado' | 'copia-simulada-da-origem'
  /** Present when copied from a (simulated) canonical source logo. */
  copiedFrom?: { sourceAssetRef: string; version: number }
}

export type CardColors = { panel: string; divider: string }

/** Content source. Mock identity plus, for the mapped owner fixture, its logical identity. */
export type CardSource = {
  whitelabelId: string
  slug: string
  name: string
  logical: { whitelabelId: number; slug: string } | null
}

export type DefaultField = 'logo' | 'colors' | 'shortDescription'

export type CopiedDefaults = {
  /** Qualified fields copied when the card was created or explicitly restored. */
  fields: DefaultField[]
  /** Fields the source did not provide (filled manually). */
  missing: DefaultField[]
  sourceVersion: number | null
  copiedAt: string
  /** Defaults are fixtures of this mock, never verified Backend fields. */
  provenance: 'fixture-simulada'
}

export type CardInstance = {
  /** Stable UUID of this card. Independent from the source id/slug. */
  instanceId: string
  source: CardSource
  copiedDefaults: CopiedDefaults
  /** Editor-only label that distinguishes repeated sources. Never published. */
  internalTitle: string
  /** Public name: logo text alternative suggestion, accessible names and dialog title. */
  displayName: string
  shortDescription: string
  logo: CardLogo | null
  colors: CardColors
  images: ImageAssociation[]
}

export type ShowcaseIntroduction = {
  title: string
  subtitle: string
  bodyMarkdown: string
  markdownVersion: typeof MARKDOWN_VERSION
}

export type ShowcaseDocument = {
  schemaVersion: typeof SHOWCASE_SCHEMA_VERSION
  owner: ShowcaseOwner
  banner: { images: ImageAssociation[] }
  introduction: ShowcaseIntroduction | null
  cards: CardInstance[]
}

export type StoredShowcase = { revision: number; savedAt: string; document: ShowcaseDocument }

export const SHOWCASE_OWNER: ShowcaseOwner = { environmentKey: 'homolog', whitelabelId: 6, slug: 'homologacao' }

/** Approved initial copy (PROPOSTA.md §5), used when the section is (re)created empty. */
export const APPROVED_INTRODUCTION: ShowcaseIntroduction = {
  title: 'Conheça as plataformas LOØR',
  subtitle: 'Diferentes identidades, uma base em comum.',
  bodyMarkdown: 'Explore as identidades apresentadas nesta vitrine. Cada espaço reúne imagens e informações sobre a proposta de uma White Label.\n\n**Escolha um card** para conhecer sua apresentação.',
  markdownVersion: MARKDOWN_VERSION,
}

/* ---------- identity ---------- */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
export const isUuid = (value: string) => UUID_PATTERN.test(value)

export function newUuid(): string {
  const cryptoApi = globalThis.crypto
  if (typeof cryptoApi?.randomUUID === 'function') return cryptoApi.randomUUID()
  const bytes = new Uint8Array(16)
  cryptoApi.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/* ---------- immutable helpers ---------- */

export function cloneDocument<T>(value: T): T {
  return structuredClone(value)
}

/** Order-sensitive structural equality for plain JSON-like documents. */
export function sameDocument(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return [...items]
  const next = [...items]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

export function newImageAssociation(assetRef: string, fileName: string, alt = '', decorative = false): ImageAssociation {
  return { associationId: newUuid(), assetRef, fileName, alt, decorative }
}

/** Replacing creates a new association/reference in the same position; others are untouched. */
export function replaceImage(images: readonly ImageAssociation[], associationId: string, assetRef: string, fileName: string): ImageAssociation[] {
  return images.map(image => image.associationId === associationId
    ? { ...newImageAssociation(assetRef, fileName, '', image.decorative), alt: '' }
    : image)
}

/** Removing only detaches the association; the media itself is never deleted here. */
export function removeImage(images: readonly ImageAssociation[], associationId: string) {
  return images.filter(image => image.associationId !== associationId)
}

export function addImage(images: readonly ImageAssociation[], image: ImageAssociation) {
  return images.length >= MAX_IMAGES ? [...images] : [...images, image]
}

/* ---------- cards ---------- */

export const DEFAULT_COLORS: CardColors = { panel: '#0A1E85', divider: '#87DBBE' }

export type SourceDefaults = {
  version: number
  logo: { sourceAssetRef: string; fileName: string } | null
  colors: CardColors | null
  shortDescription: string | null
}

export const DEFAULT_FIELD_LABELS: Record<DefaultField, string> = {
  logo: 'Logotipo',
  colors: 'Cores da marca',
  shortDescription: 'Descrição curta',
}

export function availableDefaultFields(defaults: SourceDefaults | null): DefaultField[] {
  if (!defaults) return []
  return (['logo', 'colors', 'shortDescription'] as const).filter(field => defaults[field] !== null && defaults[field] !== '')
}

/**
 * New, independent card instance. Only qualified (here: simulated) defaults are
 * copied; missing fields stay empty for explicit manual completion. The canonical
 * logo becomes an owner-scoped copy reference supplied by the caller.
 */
export function createCardInstance(input: {
  source: CardSource
  defaults: SourceDefaults | null
  copyLogo: (sourceAssetRef: string) => string
  now?: string
}): CardInstance {
  const { source, defaults, copyLogo } = input
  const fields = availableDefaultFields(defaults)
  const missing = (['logo', 'colors', 'shortDescription'] as const).filter(field => !fields.includes(field))
  const logo = defaults?.logo
    ? { assetRef: copyLogo(defaults.logo.sourceAssetRef), alt: source.name, fileName: defaults.logo.fileName, origin: 'copia-simulada-da-origem' as const, copiedFrom: { sourceAssetRef: defaults.logo.sourceAssetRef, version: defaults.version } }
    : null
  return {
    instanceId: newUuid(),
    source: { ...source, logical: source.logical ? { ...source.logical } : null },
    copiedDefaults: { fields, missing, sourceVersion: defaults?.version ?? null, copiedAt: input.now ?? new Date().toISOString(), provenance: 'fixture-simulada' },
    internalTitle: source.name,
    displayName: source.name,
    shortDescription: defaults?.shortDescription ?? '',
    logo,
    colors: defaults?.colors ? { ...defaults.colors } : { ...DEFAULT_COLORS },
    images: [],
  }
}

export type RestoreChange = { field: DefaultField; label: string; current: string; next: string }

/** Fields an explicit restore would replace on one card. Missing defaults never erase values. */
export function restorePlan(card: CardInstance, defaults: SourceDefaults | null): RestoreChange[] {
  if (!defaults) return []
  const changes: RestoreChange[] = []
  if (defaults.logo && card.logo?.copiedFrom?.sourceAssetRef !== defaults.logo.sourceAssetRef) {
    changes.push({ field: 'logo', label: DEFAULT_FIELD_LABELS.logo, current: card.logo ? card.logo.fileName : 'Sem logotipo', next: `${defaults.logo.fileName} (versão ${defaults.version} da origem)` })
  } else if (defaults.logo && card.logo?.copiedFrom && card.logo.copiedFrom.version !== defaults.version) {
    changes.push({ field: 'logo', label: DEFAULT_FIELD_LABELS.logo, current: `${card.logo.fileName} (cópia da versão ${card.logo.copiedFrom.version})`, next: `${defaults.logo.fileName} (versão ${defaults.version} da origem)` })
  }
  if (defaults.colors && (defaults.colors.panel.toUpperCase() !== card.colors.panel.toUpperCase() || defaults.colors.divider.toUpperCase() !== card.colors.divider.toUpperCase())) {
    changes.push({ field: 'colors', label: DEFAULT_FIELD_LABELS.colors, current: `${card.colors.panel} · ${card.colors.divider}`, next: `${defaults.colors.panel} · ${defaults.colors.divider}` })
  }
  if (defaults.shortDescription && defaults.shortDescription !== card.shortDescription) {
    changes.push({ field: 'shortDescription', label: DEFAULT_FIELD_LABELS.shortDescription, current: card.shortDescription || 'Vazia', next: defaults.shortDescription })
  }
  return changes
}

/** Applies the confirmed restore to ONE card. Photos, order, names and CTA are never touched. */
export function applyRestore(card: CardInstance, defaults: SourceDefaults, fields: readonly DefaultField[], copyLogo: (sourceAssetRef: string) => string, now = new Date().toISOString()): CardInstance {
  const next: CardInstance = cloneDocument(card)
  if (fields.includes('logo') && defaults.logo) {
    next.logo = { assetRef: copyLogo(defaults.logo.sourceAssetRef), alt: card.logo?.alt || card.displayName, fileName: defaults.logo.fileName, origin: 'copia-simulada-da-origem', copiedFrom: { sourceAssetRef: defaults.logo.sourceAssetRef, version: defaults.version } }
  }
  if (fields.includes('colors') && defaults.colors) next.colors = { ...defaults.colors }
  if (fields.includes('shortDescription') && defaults.shortDescription) next.shortDescription = defaults.shortDescription
  const copied = new Set([...next.copiedDefaults.fields, ...fields])
  next.copiedDefaults = { ...next.copiedDefaults, fields: [...copied] as DefaultField[], missing: next.copiedDefaults.missing.filter(field => !copied.has(field)), sourceVersion: defaults.version, copiedAt: now }
  return next
}

export function moveCard(cards: readonly CardInstance[], instanceId: string, delta: -1 | 1) {
  const index = cards.findIndex(card => card.instanceId === instanceId)
  return index < 0 ? [...cards] : moveItem(cards, index, index + delta)
}

/* ---------- colors ---------- */

export const isHexColor = (value: string) => /^#[0-9a-f]{6}$/i.test(value)

function channels(hex: string) {
  return [1, 3, 5].map(offset => Number.parseInt(hex.slice(offset, offset + 2), 16))
}

/** Lower trapezoid tone derived from the panel color (≈12.5% darker). */
export function lowerPanelColor(panel: string) {
  if (!isHexColor(panel)) return panel
  return `#${channels(panel).map(value => Math.round(value * 0.875).toString(16).padStart(2, '0')).join('')}`
}

/** WCAG contrast ratio of white text on the given background. */
export function whiteTextContrast(background: string) {
  if (!isHexColor(background)) return 0
  const [r, g, b] = channels(background).map(value => {
    const channel = value / 255
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return 1.05 / (luminance + 0.05)
}

/* ---------- presentation helpers ---------- */

/** Chip shown in the list: the part of the internal title that distinguishes repetitions. */
export function internalTitleChip(card: Pick<CardInstance, 'internalTitle' | 'displayName'>) {
  const title = card.internalTitle.trim()
  const prefix = `${card.displayName.trim()} — `
  return title.startsWith(prefix) ? title.slice(prefix.length) : title
}

export function sourceLabel(source: CardSource) {
  return source.logical ? source.logical.slug : source.slug
}
