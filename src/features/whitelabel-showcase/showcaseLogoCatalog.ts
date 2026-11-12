import darkLogo from './assets/loor-logo.png?no-inline'
import lightLogo from './assets/loor-logo-white-solid.png?no-inline'
import { getSessionVersion } from '../../lib/authSession'
import { assertCanEdit, assertCanRead, type ShowcaseActor } from './showcaseAccess'
import { copySourceMedia, ensureMedia, hasMedia, ingestUpload, UPLOAD_LIMIT_BYTES, type IngestResult } from './showcaseMedia'
import { isUuid, showcaseCards, type CardSource, type ShowcaseDocument } from './showcaseModel'
import { malformedShowcase, object } from './showcaseCodec'
import { showcaseRequest } from './showcaseClient'
import { safeHttpUrl } from './showcaseMarkdown'

export type ExistingLogoOption = {
  id: string
  sourceId: string
  sourceSlug: string
  whitelabel: string
  variant: string
  provenance: string
  suggestedAlt: string
  background: 'light' | 'dark'
} & ({ kind: 'reference'; assetRef: string } | { kind: 'file'; url: string; fileName: string } | { kind: 'source'; sourceAssetRef: string; previewUrl: string | null; pages: string[]; mime: string; originalName: string })

/** Curated files already used by LOØR, not a global or Backend branding catalogue. */
const files: readonly ExistingLogoOption[] = [
  { id: 'loor-site-dark', kind: 'file', sourceId: '6', sourceSlug: 'homologacao', whitelabel: 'LOØR · Homologação', variant: 'Site · escura', provenance: 'Arquivo da marca usado no cabeçalho do site LOØR.', suggestedAlt: 'LOØR', background: 'light', url: darkLogo, fileName: 'loor-site-dark.png' },
  { id: 'loor-showcase-light', kind: 'file', sourceId: '6', sourceSlug: 'homologacao', whitelabel: 'LOØR · Homologação', variant: 'Vitrine · clara', provenance: 'Variante existente aceita na vitrine de homologação.', suggestedAlt: 'LOØR — Homologação', background: 'dark', url: lightLogo, fileName: 'loor-showcase-light.png' },
]

/** Only owner-qualified durable refs already known by the media registry are reusable. */
export function existingLogoOptions(document: ShowcaseDocument, preferred: CardSource): ExistingLogoOption[] {
  if (document.owner.whitelabelId !== 6 || document.owner.slug !== 'homologacao' || document.owner.environmentKey !== 'homolog') return []
  const references: ExistingLogoOption[] = showcaseCards(document).flatMap(card => card.logo && hasMedia(card.logo.assetRef) ? [{
    id: `ref:${card.logo.assetRef}`, kind: 'reference' as const, assetRef: card.logo.assetRef,
    sourceId: card.source.whitelabelId, sourceSlug: card.source.slug,
    whitelabel: card.source.name || card.displayName,
    variant: `Já na vitrine · ${card.internalTitle || card.displayName}`,
    provenance: 'Logo personalizada neste card; não define a marca institucional da origem.',
    suggestedAlt: card.logo.alt, background: 'dark' as const,
  }] : [])
  const preferredRank = (option: ExistingLogoOption) => option.sourceId === preferred.whitelabelId && option.sourceSlug === preferred.slug ? 0 : 1
  const sorted = [...references, ...files].sort((a, b) => preferredRank(a) - preferredRank(b))
  const seen = new Set<string>()
  return sorted.filter(option => { if (seen.has(option.id)) return false; seen.add(option.id); return true })
}

/** main_area identifies use on a source page, not an institutional logo classification. */
export function decodeSourceImageOptions(value: unknown, source: CardSource): ExistingLogoOption[] {
  const data = object(object(value).data), sourceId = Number(source.whitelabelId)
  if (!Number.isSafeInteger(sourceId) || sourceId <= 0 || data.whitelabelId !== sourceId || data.slug !== source.slug || typeof data.name !== 'string' || !data.name.trim() || !Array.isArray(data.variants)) throw malformedShowcase()
  const seen = new Set<string>()
  return data.variants.map(value => {
    const item = object(value)
    if (item.kind !== 'main_area' || item.slot !== 'main_area' || typeof item.assetRef !== 'string' || !isUuid(item.assetRef) || seen.has(item.assetRef) || (item.mime !== null && typeof item.mime !== 'string') || (item.originalName !== null && typeof item.originalName !== 'string') || (item.page !== null && typeof item.page !== 'string') || !Array.isArray(item.pages) || item.pages.some(page => typeof page !== 'string' || !page.trim())) throw malformedShowcase()
    seen.add(item.assetRef)
    const pages = item.pages as string[]
    if (item.page !== null && (!item.page || !pages.includes(item.page as string))) throw malformedShowcase()
    const previewUrl = typeof item.previewUrl === 'string' ? safeHttpUrl(item.previewUrl) : null
    if (item.previewUrl !== null && !previewUrl) throw malformedShowcase()
    return { id: `source:${sourceId}:${item.assetRef}`, kind: 'source' as const, sourceId: String(sourceId), sourceSlug: data.slug as string, whitelabel: data.name as string,
      variant: (item.originalName as string | null) || 'Imagem existente da origem', provenance: `Arquivo main_area da origem. ${pages.length ? `Páginas de uso: ${pages.join(', ')}.` : 'Sem página de uso informada.'} Não classificado como logo institucional.`,
      suggestedAlt: '', background: 'light' as const, sourceAssetRef: item.assetRef, previewUrl, pages: [...pages], mime: (item.mime as string | null) ?? '', originalName: (item.originalName as string | null) ?? '' }
  })
}

/** Read-only discovery. Empty/error never replaces curated choices or eligible owner references. */
export async function loadSourceImageOptions(actor: ShowcaseActor, source: CardSource, signal?: AbortSignal): Promise<ExistingLogoOption[]> {
  assertCanRead(actor)
  const sourceId = Number(source.whitelabelId)
  if (!Number.isSafeInteger(sourceId) || sourceId <= 0) throw malformedShowcase()
  const body = await showcaseRequest(`/whitelabels/${sourceId}/logo-options`, { actor, signal })
  return decodeSourceImageOptions(body, source)
}

/** Explicit selection only: reuse an eligible immutable ref, or copy a bundled file into WL6 media. */
export async function selectExistingLogo(actor: ShowcaseActor, option: ExistingLogoOption, signal: AbortSignal): Promise<IngestResult> {
  assertCanEdit(actor)
  const scoped = { ...actor, sessionVersion: getSessionVersion() }
  if (signal.aborted) return { ok: false, message: 'Seleção encerrada.' }
  if (option.kind === 'source') return copySourceMedia(scoped, Number(option.sourceId), option.sourceAssetRef)
  if (option.kind === 'reference') {
    if (!hasMedia(option.assetRef)) return { ok: false, message: 'Esta logo não está mais disponível nesta sessão. A logo anterior foi preservada.' }
    const entry = await ensureMedia(option.assetRef)
    assertCanEdit(scoped)
    return signal.aborted ? { ok: false, message: 'Seleção encerrada.' } : { ok: true, entry, warnings: [] }
  }
  // Do not fetch a caller-supplied URL. Only exact, build-owned catalogue entries qualify.
  const file = files.find(item => item.kind === 'file' && item.id === option.id)
  if (!file || file.kind !== 'file') return { ok: false, message: 'Logo não disponível neste catálogo.' }
  const url = new URL(file.url, window.location.href)
  if (url.origin !== window.location.origin || !['https:', 'http:'].includes(url.protocol)) return { ok: false, message: 'Não foi possível ler o arquivo desta logo com segurança.' }
  const response = await fetch(url.href, { signal, credentials: 'omit', redirect: 'error' })
  if (!response.ok) return { ok: false, message: 'Não foi possível carregar a logo. A imagem anterior foi preservada; tente novamente.' }
  const declared = Number(response.headers.get('content-length'))
  if (declared > UPLOAD_LIMIT_BYTES) return { ok: false, message: 'O arquivo ultrapassa 20 MiB.' }
  const blob = await response.blob()
  if (signal.aborted) return { ok: false, message: 'Seleção encerrada.' }
  assertCanEdit(scoped)
  // Existing upload validation checks MIME, signature, size and decoding before its single POST.
  return ingestUpload(scoped, new File([blob], file.fileName, { type: blob.type }), 'logo')
}
