import { ApiError } from '../../lib/api'
import { emptyShowcaseDocument, isUuid, MARKDOWN_VERSION, SHOWCASE_OWNER, type ShowcaseDocument, type StoredShowcase, type ImageAssociation, type CardInstance } from './showcaseModel'
import { safeHttpUrl, parseShowcaseMarkdown } from './showcaseMarkdown'
import { validateShowcase } from './showcaseValidation'

export const malformedShowcase = () => new ApiError(200, {}, { kind: 'malformed' })
export const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw malformedShowcase()
  return value as Record<string, unknown>
}
const text = (value: unknown): string => { if (typeof value !== 'string') throw malformedShowcase(); return value }
const uuid = (value: unknown): string => { const id = text(value); if (!isUuid(id)) throw malformedShowcase(); return id }
const list = (value: unknown): unknown[] => { if (!Array.isArray(value)) throw malformedShowcase(); return value }
const positive = (value: unknown): number => { if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) throw malformedShowcase(); return value }
function image(value: unknown): ImageAssociation {
  const item = object(value)
  if (typeof item.decorative !== 'boolean') throw malformedShowcase()
  const alt = text(item.alt)
  if (item.decorative ? alt !== '' : !alt.trim()) throw malformedShowcase()
  return { associationId: uuid(item.associationId), assetRef: uuid(item.assetRef), alt, decorative: item.decorative, fileName: '' }
}
function intro(value: unknown) {
  if (value === null) return null
  const item = object(value)
  const result = { title: text(item.title), subtitle: item.subtitle == null ? '' : text(item.subtitle), bodyMarkdown: text(item.bodyMarkdown), markdownVersion: MARKDOWN_VERSION as typeof MARKDOWN_VERSION }
  if (!result.title.trim() || !result.bodyMarkdown.trim() || parseShowcaseMarkdown(result.bodyMarkdown).issues.length) throw malformedShowcase()
  return result
}
function card(value: unknown): CardInstance {
  const item = object(value), source = object(item.source), colors = object(item.colors), logo = object(item.logo)
  const name = text(item.displayName)
  return {
    instanceId: uuid(item.instanceId),
    source: { whitelabelId: String(positive(source.whitelabelId)), slug: text(source.slug), name, logical: null, baseUrl: typeof source.baseUrl === 'string' && safeHttpUrl(source.baseUrl) ? source.baseUrl : null },
    displayName: name, shortDescription: text(item.shortDescription),
    internalTitle: item.internalTitle === undefined ? '' : text(item.internalTitle),
    copiedDefaults: { fields: [], missing: [], sourceVersion: null, copiedAt: '', provenance: 'manual' },
    colors: { panel: text(colors.panel), divider: text(colors.divider) },
    logo: { assetRef: uuid(logo.assetRef), alt: text(logo.alt), fileName: '', origin: 'upload' },
    images: list(item.images).map(image),
  }
}
export function decodeShowcaseDocument(value: unknown): ShowcaseDocument {
  const doc = object(value)
  if (doc.schemaVersion !== 1) throw malformedShowcase()
  const result: ShowcaseDocument = { schemaVersion: 1, owner: { ...SHOWCASE_OWNER }, banner: { images: list(object(doc.banner).images).map(image) }, introduction: intro(doc.intro), cards: list(doc.cards).map(card) }
  if (validateShowcase(result, () => true).length) throw malformedShowcase()
  return result
}
export function encodeShowcaseDocument(document: ShowcaseDocument) {
  if (validateShowcase(document, () => true).length) throw new ApiError(422, { code: 'E_SHOWCASE_VALIDATION' })
  const association = (item: ImageAssociation) => ({ associationId: item.associationId, assetRef: item.assetRef, alt: item.alt, decorative: item.decorative })
  return {
    schemaVersion: 1 as const,
    banner: { images: document.banner.images.map(association) },
    intro: document.introduction ? { title: document.introduction.title, subtitle: document.introduction.subtitle || null, bodyMarkdown: document.introduction.bodyMarkdown } : null,
    cards: document.cards.map(item => ({
      instanceId: item.instanceId,
      source: { whitelabelId: Number(item.source.whitelabelId), slug: item.source.slug, ...(item.source.baseUrl && safeHttpUrl(item.source.baseUrl) ? { baseUrl: item.source.baseUrl } : {}) },
      displayName: item.displayName, shortDescription: item.shortDescription,
      colors: { panel: item.colors.panel, divider: item.colors.divider },
      logo: { assetRef: item.logo!.assetRef, alt: item.logo!.alt }, images: item.images.map(association),
      ...(item.internalTitle ? { internalTitle: item.internalTitle } : {}),
    })),
  }
}
export function sameCanonicalDocument(a: ShowcaseDocument, b: ShowcaseDocument): boolean {
  try { return JSON.stringify(encodeShowcaseDocument(a)) === JSON.stringify(encodeShowcaseDocument(b)) } catch { return false }
}
export function decodeStoredShowcase(value: unknown, requireOwner = true): StoredShowcase {
  const data = object(object(value).data)
  if (data.schemaVersion !== 1) throw malformedShowcase()
  if (requireOwner || data.owner !== undefined) {
    const owner = object(data.owner)
    if (owner.whitelabelId !== 6 || owner.slug !== 'homologacao') throw malformedShowcase()
  }
  if (data.configured === false) {
    if (data.revision !== null || data.document !== null) throw malformedShowcase()
    return { configured: false, revision: null, savedAt: null, document: emptyShowcaseDocument() }
  }
  if (data.configured !== true) throw malformedShowcase()
  const warnings = Array.isArray(data.warnings) ? data.warnings.flatMap(value => {
    const row = object(value)
    return row.code === 'SOURCE_INACTIVE' && typeof row.instanceId === 'string' && isUuid(row.instanceId) && typeof row.sourceWhitelabelId === 'number' && Number.isSafeInteger(row.sourceWhitelabelId) && row.sourceWhitelabelId > 0
      ? [{ code: 'SOURCE_INACTIVE' as const, instanceId: row.instanceId, sourceWhitelabelId: row.sourceWhitelabelId }] : []
  }) : []
  return { configured: true, revision: positive(data.revision), savedAt: null, document: decodeShowcaseDocument(data.document), warnings }
}
export type PublicImage = { associationId: string; url: string | null; alt: string; decorative: boolean }
export type PublicShowcaseDocument = {
  banner: { images: PublicImage[] }
  intro: { title: string; subtitle: string | null; bodyMarkdown: string } | null
  cards: { instanceId: string; displayName: string; shortDescription: string; colors: { panel: string; divider: string }; logo: { url: string | null; alt: string }; images: PublicImage[] }[]
}
export type PublicShowcase = { configured: false; revision: null; document: null } | { configured: true; revision: number; schemaVersion: 1; document: PublicShowcaseDocument }
/** Public allowlist never carries source, internalTitle, assetRef, warnings or admin metadata. */
export function decodePublicShowcase(value: unknown): PublicShowcase {
  const data = object(object(value).data)
  if (data.configured === false && data.revision === null && data.document === null) return { configured: false, revision: null, document: null }
  if (data.configured !== true || data.schemaVersion !== 1) throw malformedShowcase()
  const doc = object(data.document)
  const readImages = (value: unknown): PublicImage[] => {
    const images = list(value).map(value => {
      const item = object(value), alt = text(item.alt)
      if (typeof item.decorative !== 'boolean' || (item.decorative ? alt !== '' : !alt.trim())) throw malformedShowcase()
      return { associationId: uuid(item.associationId), url: typeof item.url === 'string' ? safeHttpUrl(item.url) : null, alt, decorative: item.decorative }
    })
    if (images.length < 1 || images.length > 4 || new Set(images.map(item => item.associationId)).size !== images.length) throw malformedShowcase()
    return images
  }
  const introduction = intro(doc.intro)
  const cards = list(doc.cards).map(value => {
    const item = object(value), logo = object(item.logo), colors = object(item.colors)
    const result = { instanceId: uuid(item.instanceId), displayName: text(item.displayName), shortDescription: text(item.shortDescription), colors: { panel: text(colors.panel), divider: text(colors.divider) }, logo: { url: typeof logo.url === 'string' ? safeHttpUrl(logo.url) : null, alt: text(logo.alt) }, images: readImages(item.images) }
    if (!result.displayName.trim() || !result.shortDescription.trim() || !result.logo.alt.trim() || !/^#[0-9a-f]{6}$/i.test(result.colors.panel) || !/^#[0-9a-f]{6}$/i.test(result.colors.divider)) throw malformedShowcase()
    return result
  })
  if (!cards.length || new Set(cards.map(item => item.instanceId)).size !== cards.length) throw malformedShowcase()
  return { configured: true, revision: positive(data.revision), schemaVersion: 1, document: { banner: { images: readImages(object(doc.banner).images) }, intro: introduction ? { title: introduction.title, subtitle: introduction.subtitle || null, bodyMarkdown: introduction.bodyMarkdown } : null, cards } }
}
