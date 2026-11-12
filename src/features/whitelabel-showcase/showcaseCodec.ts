import { ApiError } from '../../lib/api'
import { emptyShowcaseDocument, isUuid, MARKDOWN_VERSION, SHOWCASE_OWNER, MAX_SECTIONS, type ShowcaseDocument, type StoredShowcase, type ImageAssociation, type CardInstance, type ShowcaseSection, type TextSection } from './showcaseModel'
import { safeHttpUrl, parseShowcaseMarkdown } from './showcaseMarkdown'
import { validateShowcase } from './showcaseValidation'

export const malformedShowcase = () => new ApiError(200, {}, { kind: 'malformed' })
const unsupportedShowcase = (code: 'E_SHOWCASE_VERSION_UNSUPPORTED' | 'E_SHOWCASE_SECTION_UNSUPPORTED') => new ApiError(200, { code }, { kind: 'malformed' })
export function showcaseReadError(error: unknown): string {
  if (error instanceof ApiError && error.code === 'E_SHOWCASE_VERSION_UNSUPPORTED') return 'A versão recebida da vitrine não é compatível com este editor. Os dados foram preservados; nenhum envio foi realizado.'
  if (error instanceof ApiError && error.code === 'E_SHOWCASE_SECTION_UNSUPPORTED') return 'A vitrine contém um tipo de seção não suportado. Os dados foram preservados; nenhum envio foi realizado.'
  return 'Não foi possível carregar a vitrine. Nenhum exemplo substitui os dados do servidor.'
}
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
function textSection(value: unknown): TextSection {
  const item = object(value)
  const result: TextSection = { type: 'text', instanceId: uuid(item.instanceId), title: text(item.title), subtitle: item.subtitle == null ? '' : text(item.subtitle), bodyMarkdown: text(item.bodyMarkdown), markdownVersion: MARKDOWN_VERSION }
  if (!result.title.trim() || result.title.length > 240 || result.subtitle.length > 500 || !result.bodyMarkdown.trim() || result.bodyMarkdown.length > 20000 || parseShowcaseMarkdown(result.bodyMarkdown).issues.length) throw malformedShowcase()
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
  if (doc.schemaVersion !== 2) throw unsupportedShowcase('E_SHOWCASE_VERSION_UNSUPPORTED')
  const sections = list(doc.sections).map((value): ShowcaseSection => {
    const item = object(value)
    if (item.type === 'text') return textSection(item)
    if (item.type === 'card') return { type: 'card', ...card(item) }
    throw unsupportedShowcase('E_SHOWCASE_SECTION_UNSUPPORTED')
  })
  const result: ShowcaseDocument = { schemaVersion: 2, owner: { ...SHOWCASE_OWNER }, banner: { images: list(object(doc.banner).images).map(image) }, sections }
  if (validateShowcase(result, () => true).length) throw malformedShowcase()
  return result
}
export function encodeShowcaseDocument(document: ShowcaseDocument) {
  if (validateShowcase(document, () => true).length) throw new ApiError(422, { code: 'E_SHOWCASE_VALIDATION' })
  // Match Core reqString in the wire projection, without rewriting the draft.
  // Save acknowledgements and uncertain-result reconciliation use this codec.
  const text = (value: string) => value.normalize('NFC').trim()
  const association = (item: ImageAssociation) => ({ associationId: item.associationId, assetRef: text(item.assetRef), alt: text(item.alt), decorative: item.decorative })
  return {
    schemaVersion: 2 as const,
    banner: { images: document.banner.images.map(association) },
    sections: document.sections.map(item => {
      if (item.type === 'text') return { type: 'text' as const, instanceId: item.instanceId, title: text(item.title), subtitle: text(item.subtitle) || null, bodyMarkdown: text(item.bodyMarkdown) }
      const internalTitle = text(item.internalTitle)
      return {
        type: 'card' as const,
        instanceId: item.instanceId,
        source: { whitelabelId: Number(item.source.whitelabelId), slug: text(item.source.slug), ...(item.source.baseUrl && safeHttpUrl(item.source.baseUrl) ? { baseUrl: text(item.source.baseUrl) } : {}) },
        displayName: text(item.displayName), shortDescription: text(item.shortDescription),
        colors: { panel: item.colors.panel, divider: item.colors.divider },
        logo: { assetRef: text(item.logo!.assetRef), alt: text(item.logo!.alt) }, images: item.images.map(association),
        ...(internalTitle ? { internalTitle } : {}),
      }
    }),
  }
}
export function sameCanonicalDocument(a: ShowcaseDocument, b: ShowcaseDocument): boolean {
  try { return JSON.stringify(encodeShowcaseDocument(a)) === JSON.stringify(encodeShowcaseDocument(b)) } catch { return false }
}
export function decodeStoredShowcase(value: unknown, requireOwner = true): StoredShowcase {
  const data = object(object(value).data)
  if (data.schemaVersion !== 2) throw unsupportedShowcase('E_SHOWCASE_VERSION_UNSUPPORTED')
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
export type PublicTextSection = { type: 'text'; instanceId: string; title: string; subtitle: string | null; bodyMarkdown: string }
export type PublicCardSection = { type: 'card'; instanceId: string; displayName: string; shortDescription: string; colors: { panel: string; divider: string }; logo: { url: string | null; alt: string }; images: PublicImage[] }
export type PublicShowcaseDocument = {
  banner: { images: PublicImage[] }
  sections: (PublicTextSection | PublicCardSection)[]
}
export type PublicShowcase = { configured: false; revision: null; document: null } | { configured: true; revision: number; schemaVersion: 2; document: PublicShowcaseDocument }
/** Public allowlist never carries source, internalTitle, assetRef, warnings or admin metadata. */
export function decodePublicShowcase(value: unknown): PublicShowcase {
  const data = object(object(value).data)
  if (data.schemaVersion !== undefined && data.schemaVersion !== 2) throw unsupportedShowcase('E_SHOWCASE_VERSION_UNSUPPORTED')
  if (data.configured === false && data.revision === null && data.document === null) return { configured: false, revision: null, document: null }
  if (data.configured !== true) throw malformedShowcase()
  if (data.schemaVersion !== 2) throw unsupportedShowcase('E_SHOWCASE_VERSION_UNSUPPORTED')
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
  const sections = list(doc.sections).map((value): PublicTextSection | PublicCardSection => {
    const item = object(value)
    if (item.type === 'text') {
      const section = textSection(item)
      return { type: 'text', instanceId: section.instanceId, title: section.title, subtitle: section.subtitle || null, bodyMarkdown: section.bodyMarkdown }
    }
    if (item.type !== 'card') throw unsupportedShowcase('E_SHOWCASE_SECTION_UNSUPPORTED')
    const logo = object(item.logo), colors = object(item.colors)
    const result: PublicCardSection = { type: 'card', instanceId: uuid(item.instanceId), displayName: text(item.displayName), shortDescription: text(item.shortDescription), colors: { panel: text(colors.panel), divider: text(colors.divider) }, logo: { url: typeof logo.url === 'string' ? safeHttpUrl(logo.url) : null, alt: text(logo.alt) }, images: readImages(item.images) }
    if (!result.displayName.trim() || !result.shortDescription.trim() || !result.logo.alt.trim() || !/^#[0-9a-f]{6}$/i.test(result.colors.panel) || !/^#[0-9a-f]{6}$/i.test(result.colors.divider)) throw malformedShowcase()
    return result
  })
  if (!sections.some(section => section.type === 'card') || sections.length > MAX_SECTIONS || new Set(sections.map(item => item.instanceId)).size !== sections.length) throw malformedShowcase()
  return { configured: true, revision: positive(data.revision), schemaVersion: 2, document: { banner: { images: readImages(object(doc.banner).images) }, sections } }
}
