/**
 * Vitrine de White Labels — editorial model for the canonical V2 contract. Pure data and pure operations only: no
 * React, assets, transport or browser storage, so the offline checks can load it.
 */

export const SHOWCASE_SCHEMA_VERSION = 2
export const MARKDOWN_VERSION = 1
export const MIN_IMAGES = 1
export const MAX_IMAGES = 4
/** Technical contract bound; not a commercial plan/entitlement limit. */
export const MAX_SECTIONS = 50

/** Logical owner of the configuration (WL6 / homologacao in the homolog environment). */
export type ShowcaseOwner = { environmentKey: 'homolog'; whitelabelId: 6; slug: 'homologacao' }

/**
 * One ordered image association. `associationId` identifies the association;
 * `assetRef` identifies the durable owner-scoped media. Bytes, Base64 or signed URLs are
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

export type CardLogo = { assetRef: string; alt: string; fileName: string; origin: 'upload' }
export type CardColors = { panel: string; divider: string }
export type CardSource = {
  whitelabelId: string
  slug: string
  name: string
  baseUrl?: string | null
  logical: { whitelabelId: number; slug: string } | null
}
export type DefaultField = 'logo' | 'colors' | 'shortDescription'
export type CopiedDefaults = {
  fields: DefaultField[]
  missing: DefaultField[]
  sourceVersion: number | null
  copiedAt: string
  provenance: 'manual'
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

export type TextSection = ShowcaseIntroduction & { type: 'text'; instanceId: string }
export type CardSection = CardInstance & { type: 'card' }
export type ShowcaseSection = TextSection | CardSection

export type ShowcaseDocument = {
  schemaVersion: typeof SHOWCASE_SCHEMA_VERSION
  owner: ShowcaseOwner
  banner: { images: ImageAssociation[] }
  sections: ShowcaseSection[]
}

export type StoredShowcase = {
  configured: boolean
  revision: number | null
  savedAt: string | null
  document: ShowcaseDocument
  warnings?: { code: 'SOURCE_INACTIVE'; instanceId: string; sourceWhitelabelId: number }[]
}

export const SHOWCASE_OWNER: ShowcaseOwner = { environmentKey: 'homolog', whitelabelId: 6, slug: 'homologacao' }

/** Optional section starts blank; editorial content is entered by the operator. */
export const APPROVED_INTRODUCTION: ShowcaseIntroduction = { title: '', subtitle: '', bodyMarkdown: '', markdownVersion: MARKDOWN_VERSION }
export function emptyShowcaseDocument(): ShowcaseDocument {
  return { schemaVersion: SHOWCASE_SCHEMA_VERSION, owner: { ...SHOWCASE_OWNER }, banner: { images: [] }, sections: [] }
}

export const showcaseCards = (document: ShowcaseDocument): CardSection[] => document.sections.filter((section): section is CardSection => section.type === 'card')

/** Only an explicit new text action allocates an ID. Reads always retain the server ID. */
export function createTextSection(): TextSection {
  return { type: 'text', instanceId: newUuid(), ...APPROVED_INTRODUCTION }
}

/* ---------- identity ---------- */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
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

/** No institutional identity is imported across tenants in V1. */
export function createCardInstance(input: { source: CardSource; defaults?: SourceDefaults | null; copyLogo?: (ref: string) => string; now?: string }): CardInstance {
  return {
    instanceId: newUuid(), source: { ...input.source, logical: null },
    copiedDefaults: { fields: [], missing: ['logo', 'shortDescription'], sourceVersion: null, copiedAt: input.now ?? new Date().toISOString(), provenance: 'manual' },
    internalTitle: input.source.name, displayName: input.source.name, shortDescription: '', logo: null,
    colors: { ...DEFAULT_COLORS }, images: [],
  }
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
