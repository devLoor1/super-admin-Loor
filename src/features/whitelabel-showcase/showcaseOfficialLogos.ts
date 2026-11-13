import { getSessionVersion } from '../../lib/authSession'
import { assertCanEdit, assertCanRead, type ShowcaseActor } from './showcaseAccess'
import { object, malformedShowcase } from './showcaseCodec'
import { showcaseEnvironment } from './showcaseMapping'
import { rememberOfficialPreview } from './showcaseMedia'
import { lookupSourceById } from './showcaseSourceLookup'
import type { CardSource, OfficialCardLogo } from './showcaseModel'

export type OfficialLogoOption = {
  kind: 'official'; id: string; sourceId: string; sourceSlug: string; whitelabel: string
  variant: string; variantId: string; provenance: string; suggestedAlt: string; background: 'light' | 'dark'
  url: string; version: string | null; mime: string | null; environment: 'homolog'; origin: string
}

const identityKey = (source: Pick<CardSource, 'whitelabelId' | 'slug'>) => JSON.stringify(['homolog', source.whitelabelId, source.slug])
// Only currently discovered manifests authorize bindings. A new read evicts the previous version;
// no stale brand or another card's override is used as a fallback.
const discovered = new Map<string, { session: number; options: OfficialLogoOption[] }>()
const generations = new Map<string, number>()

/** Bound public reads; selecting an official binding does not dispatch an upload. */
async function publicRead<T>(signal: AbortSignal | undefined, read: (readSignal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController()
  const abort = () => controller.abort()
  const timeout = setTimeout(abort, 15000)
  if (signal?.aborted) abort()
  signal?.addEventListener('abort', abort, { once: true })
  try { return await read(controller.signal) }
  finally { clearTimeout(timeout); signal?.removeEventListener('abort', abort) }
}

/** Derive only from the authoritative source returned by the registry. */
export function officialLogoOrigin(source: CardSource): string | null {
  if (showcaseEnvironment() !== 'homolog' || !source.baseUrl) return null
  try {
    const url = new URL(source.baseUrl)
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.origin : null
  } catch { return null }
}

function imageUrl(value: unknown): string {
  if (typeof value !== 'string') throw malformedShowcase()
  let parsed: URL
  try { parsed = new URL(value) } catch { throw malformedShowcase() }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw malformedShowcase()
  return parsed.href
}

const optionalText = (value: unknown): string | null => typeof value === 'string' && value.trim() ? value.trim() : null

/** The resolver's manifest contract; optional producer metadata is not required to bind a variant. */
export function decodeOfficialLogoManifest(value: unknown, source: CardSource): OfficialLogoOption[] {
  const data = object(value), origin = officialLogoOrigin(source)
  if (!origin || data.schemaVersion !== 1 || data.environment !== 'homolog' || Number(data.whitelabelId) !== Number(source.whitelabelId) || typeof data.slug !== 'string' || data.slug.trim().toLowerCase() !== source.slug.toLowerCase() || (data.origin !== undefined && data.origin !== origin) || !optionalText(data.versionKind) || !Array.isArray(data.variants)) throw malformedShowcase()
  const variants = new Set<string>()
  return data.variants.map(value => {
    const item = object(value)
    if (typeof item.id !== 'string' || !item.id.trim() || item.id !== item.id.trim() || item.id.length > 80) throw malformedShowcase()
    if (variants.has(item.id)) throw malformedShowcase()
    variants.add(item.id)
    return {
      kind: 'official', id: JSON.stringify(['homolog', source.whitelabelId, source.slug, item.id, optionalText(data.brandingVersion), item.url]),
      sourceId: source.whitelabelId, sourceSlug: source.slug, environment: 'homolog', origin,
      whitelabel: source.name || source.slug, variant: optionalText(item.label) || item.id, variantId: item.id,
      provenance: 'Vínculo com a variante oficial desta origem. A leitura resolve a fonte publicada, sem copiar o arquivo; pode haver cache de até 60 segundos.',
      suggestedAlt: source.name || source.slug, background: 'light', url: imageUrl(item.url), version: optionalText(data.brandingVersion), mime: optionalText(item.mime),
    }
  })
}

export async function loadOfficialLogoOptions(actor: ShowcaseActor, source: CardSource, signal?: AbortSignal): Promise<OfficialLogoOption[]> {
  assertCanRead(actor)
  const key = identityKey(source), generation = (generations.get(key) ?? 0) + 1
  generations.set(key, generation); discovered.delete(key)
  const scoped = { ...actor, sessionVersion: getSessionVersion() }
  const resolved = await lookupSourceById(source.whitelabelId, signal)
  assertCanRead(scoped)
  if ((resolved.status !== 'found' && resolved.status !== 'inactive') || resolved.source.whitelabelId !== source.whitelabelId || resolved.source.slug !== source.slug) throw malformedShowcase()
  const authoritative = resolved.source
  const origin = officialLogoOrigin(authoritative)
  if (!origin) return []
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
  const options = decodeOfficialLogoManifest(value, authoritative)
  if (signal?.aborted || generations.get(key) !== generation) throw new Error('Consulta substituída.')
  assertCanRead(scoped)
  discovered.set(key, { session: scoped.sessionVersion, options: options.map(option => ({ ...option })) })
  return options
}

/** Explicit draft binding. No download, upload, copy or editorial request. */
export function selectOfficialLogo(actor: ShowcaseActor, choice: OfficialLogoOption, source: CardSource, signal: AbortSignal): OfficialCardLogo {
  assertCanEdit(actor)
  const collection = discovered.get(identityKey(source))
  const selected = collection?.session === getSessionVersion() ? collection.options.find(item => item.id === choice.id) : undefined
  if (!selected || signal.aborted || selected.sourceId !== source.whitelabelId || selected.sourceSlug !== source.slug) throw new Error('Consulte novamente a logo oficial desta origem. A logo atual foi preservada.')
  const logo: OfficialCardLogo = { kind: 'official', source: { whitelabelId: Number(selected.sourceId), slug: selected.sourceSlug }, variantId: selected.variantId, alt: selected.suggestedAlt }
  rememberOfficialPreview(logo, selected.url)
  return logo
}
