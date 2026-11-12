import { getSessionVersion } from '../../lib/authSession'
import { assertCanEdit, assertCanRead, type ShowcaseActor } from './showcaseAccess'
import { object, malformedShowcase } from './showcaseCodec'
import { showcaseEnvironment } from './showcaseMapping'
import { ingestUpload, UPLOAD_LIMIT_BYTES, type IngestResult } from './showcaseMedia'
import type { CardSource } from './showcaseModel'

export type OfficialLogoOption = {
  kind: 'official'; id: string; sourceId: string; sourceSlug: string; whitelabel: string
  variant: string; variantId: string; provenance: string; suggestedAlt: string; background: 'light' | 'dark'
  url: string; version: string; mime: string | null; environment: 'homolog'; origin: string
}

/** Verified identity -> homepage origin, not a second catalogue of logo files. */
const origins = [
  { id: '6', slug: 'homologacao', origin: 'https://homolog.loor.vc' },
  { id: '7', slug: 'laguna-homologacao', origin: 'https://laguna.investor.loor.vc' },
  { id: '4', slug: 'finapop-homologacao', origin: 'https://finapop.investidor.loor.vc' },
] as const
const identityKey = (source: Pick<CardSource, 'whitelabelId' | 'slug'>) => JSON.stringify(['homolog', source.whitelabelId, source.slug])
// Only currently discovered manifests authorize imports. A new read evicts the previous version;
// no stale brand or another card's override is used as a fallback.
const discovered = new Map<string, { session: number; options: OfficialLogoOption[] }>()
const generations = new Map<string, number>()
const importsInProgress = new Set<string>()

/** Bound public reads only. The dispatched Backend upload is deliberately not aborted. */
async function publicRead<T>(signal: AbortSignal | undefined, read: (readSignal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController()
  const abort = () => controller.abort()
  const timeout = setTimeout(abort, 15000)
  if (signal?.aborted) abort()
  signal?.addEventListener('abort', abort, { once: true })
  try { return await read(controller.signal) }
  finally { clearTimeout(timeout); signal?.removeEventListener('abort', abort) }
}

export function officialLogoOrigin(source: CardSource): string | null {
  if (showcaseEnvironment() !== 'homolog') return null
  const found = origins.find(item => item.id === source.whitelabelId && item.slug === source.slug)
  if (!found) return null
  if (source.baseUrl) {
    try { if (new URL(source.baseUrl).origin !== found.origin) return null } catch { return null }
  }
  return found.origin
}

function imageUrl(value: unknown): string {
  if (typeof value !== 'string') throw malformedShowcase()
  let parsed: URL
  try { parsed = new URL(value) } catch { throw malformedShowcase() }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.hash) throw malformedShowcase()
  return parsed.href
}

/** New public frontend metadata, not a Backend branding contract or main_area classification. */
export function decodeOfficialLogoManifest(value: unknown, source: CardSource): OfficialLogoOption[] {
  const data = object(value), origin = officialLogoOrigin(source)
  if (!origin || data.schemaVersion !== 1 || data.environment !== 'homolog' || data.whitelabelId !== Number(source.whitelabelId) || data.slug !== source.slug || data.origin !== origin || typeof data.brandingVersion !== 'string' || !/^sha256:[a-f0-9]{64}$/.test(data.brandingVersion) || data.versionKind !== 'source-configuration-and-build' || (data.contentDigest !== null && (typeof data.contentDigest !== 'string' || !/^sha256:[a-f0-9]{64}$/.test(data.contentDigest))) || !Array.isArray(data.variants) || data.variants.length > 1) throw malformedShowcase()
  return data.variants.map(value => {
    const item = object(value)
    if (item.id !== 'header' || typeof item.label !== 'string' || !item.label.trim() || item.version !== data.brandingVersion || (item.mime !== null && (typeof item.mime !== 'string' || !/^image\/[a-z0-9.+-]+$/.test(item.mime)))) throw malformedShowcase()
    return {
      kind: 'official', id: JSON.stringify(['homolog', source.whitelabelId, source.slug, item.id, item.version]),
      sourceId: source.whitelabelId, sourceSlug: source.slug, environment: 'homolog', origin,
      whitelabel: source.name || source.slug, variant: item.label as string, variantId: item.id,
      provenance: 'Fonte oficial compartilhada com o cabeçalho publicado desta origem. A versão identifica a configuração e o build, não garante o hash de uma imagem externa.',
      suggestedAlt: source.name || source.slug, background: 'light', url: imageUrl(item.url), version: item.version as string, mime: item.mime as string | null,
    }
  })
}

export async function loadOfficialLogoOptions(actor: ShowcaseActor, source: CardSource, signal?: AbortSignal): Promise<OfficialLogoOption[]> {
  assertCanRead(actor)
  const key = identityKey(source), generation = (generations.get(key) ?? 0) + 1
  generations.set(key, generation); discovered.delete(key)
  const origin = officialLogoOrigin(source)
  if (!origin) return []
  const scoped = { ...actor, sessionVersion: getSessionVersion() }
  const value = await publicRead(signal, async readSignal => {
    const response = await fetch(`${origin}/branding/logo-manifest.json`, { signal: readSignal, credentials: 'omit', redirect: 'error', cache: 'no-store' })
    if (response.status === 404 || response.status === 410) return null
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json') || Number(response.headers.get('content-length')) > 65536) throw malformedShowcase()
    const text = await response.text()
    if (text.length > 65536) throw malformedShowcase()
    return JSON.parse(text) as unknown
  })
  if (signal?.aborted || generations.get(key) !== generation) throw new Error('Consulta substituída.')
  assertCanRead(scoped)
  if (value === null) return []
  const options = decodeOfficialLogoManifest(value, source)
  if (signal?.aborted || generations.get(key) !== generation) throw new Error('Consulta substituída.')
  assertCanRead(scoped)
  discovered.set(key, { session: scoped.sessionVersion, options: options.map(option => ({ ...option })) })
  return options
}

export const canImportOfficialLogo = (option: OfficialLogoOption) => option.mime === null || option.mime === 'image/png' || option.mime === 'image/jpeg'

/** Explicit snapshot through the existing PNG/JPEG upload contract; never a dynamic logo binding. */
export async function importOfficialLogo(actor: ShowcaseActor, choice: OfficialLogoOption, signal: AbortSignal): Promise<IngestResult> {
  assertCanEdit(actor)
  const scoped = { ...actor, sessionVersion: getSessionVersion() }
  const key = identityKey({ whitelabelId: choice.sourceId, slug: choice.sourceSlug })
  const collection = discovered.get(key)
  const selected = collection?.session === scoped.sessionVersion ? collection.options.find(item => item.id === choice.id) : undefined
  if (!selected || signal.aborted) return { ok: false, message: 'Consulte novamente a logo oficial desta origem. A logo atual foi preservada.' }
  if (!canImportOfficialLogo(selected)) return { ok: false, message: 'A logo oficial pode ser consultada, mas este formato ainda não é compatível com o contrato de cópia PNG/JPEG. A logo atual foi preservada.' }
  const importKey = JSON.stringify([scoped.sessionVersion, selected.id])
  if (importsInProgress.has(importKey)) return { ok: false, message: 'A importação desta logo já está em andamento. Aguarde o resultado; não houve novo envio.' }
  importsInProgress.add(importKey)
  try {
  const stillCurrent = () => !signal.aborted && discovered.get(key) === collection
  // The caller cannot substitute the URL or MIME from the authoritative manifest.
  const blob = await publicRead(signal, async readSignal => {
    const response = await fetch(selected.url, { signal: readSignal, credentials: 'omit', redirect: 'error', cache: 'no-store' })
    if (!response.ok || Number(response.headers.get('content-length')) > UPLOAD_LIMIT_BYTES) return null
    return response.blob()
  })
  if (!blob || blob.size > UPLOAD_LIMIT_BYTES) return { ok: false, message: 'Não foi possível ler a logo oficial. A logo atual foi preservada.' }
  if (!stillCurrent()) return { ok: false, message: 'Seleção encerrada ou fonte atualizada; a logo atual foi preservada.' }
  assertCanEdit(scoped)
  if (!['image/png', 'image/jpeg'].includes(blob.type)) return { ok: false, message: 'A imagem oficial não é PNG/JPEG. Sua prévia continua disponível; a importação requer compatibilidade contratual.' }
  const extension = blob.type === 'image/png' ? 'png' : 'jpg'
  return await ingestUpload(scoped, new File([blob], `${selected.sourceSlug}-${selected.variantId}.${extension}`, { type: blob.type }), 'logo', stillCurrent)
  } finally { importsInProgress.delete(importKey) }
}
