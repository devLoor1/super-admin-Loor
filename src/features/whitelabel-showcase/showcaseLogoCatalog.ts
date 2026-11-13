import { getSessionVersion } from '../../lib/authSession'
import { assertCanEdit, assertCanRead, type ShowcaseActor } from './showcaseAccess'
import { copySourceMedia, type IngestResult } from './showcaseMedia'
import { isUuid, type CardSource } from './showcaseModel'
import { malformedShowcase, object } from './showcaseCodec'
import { showcaseRequest } from './showcaseClient'
import { safeHttpUrl } from './showcaseMarkdown'
import { type OfficialLogoOption } from './showcaseOfficialLogos'

export type ExistingLogoOption = ({
  id: string
  sourceId: string
  sourceSlug: string
  whitelabel: string
  variant: string
  provenance: string
  suggestedAlt: string
  background: 'light' | 'dark'
} & { kind: 'source'; sourceAssetRef: string; previewUrl: string | null; pages: string[]; mime: string; originalName: string }) | OfficialLogoOption

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

/** Read-only photographs discovery. main_area must never populate the logo picker. */
export async function loadSourceImageOptions(actor: ShowcaseActor, source: CardSource, signal?: AbortSignal): Promise<ExistingLogoOption[]> {
  assertCanRead(actor)
  const sourceId = Number(source.whitelabelId)
  if (!Number.isSafeInteger(sourceId) || sourceId <= 0) throw malformedShowcase()
  const body = await showcaseRequest(`/whitelabels/${sourceId}/logo-options`, { actor, signal })
  return decodeSourceImageOptions(body, source)
}

/** Existing photographs may be copied; official logos must use a draft binding. */
export async function selectExistingLogo(actor: ShowcaseActor, option: ExistingLogoOption, signal: AbortSignal): Promise<IngestResult> {
  assertCanEdit(actor)
  const scoped = { ...actor, sessionVersion: getSessionVersion() }
  if (signal.aborted) return { ok: false, message: 'Seleção encerrada.' }
  if (option.kind === 'source') return copySourceMedia(scoped, Number(option.sourceId), option.sourceAssetRef)
  return { ok: false, message: 'Logo oficial exige vínculo explícito; nenhum arquivo foi copiado.' }
}
