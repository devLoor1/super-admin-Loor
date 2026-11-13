import { ApiError } from '../../lib/api'
import { assertCanEdit, showcaseSessionKey, ShowcasePermissionError, type ShowcaseActor } from './showcaseAccess'
import { getSessionVersion, subscribeSession } from '../../lib/authSession'
import { isUuid, logoMediaKey, showcaseCards, type CardInstance, type CardLogo, type CustomCardLogo, type ShowcaseDocument } from './showcaseModel'
import { safeHttpUrl } from './showcaseMarkdown'
import { decodeStoredShowcase, malformedShowcase, object } from './showcaseCodec'
import { showcaseRequest, uncertainShowcaseError } from './showcaseClient'

export type MediaEntry = { assetRef: string; url: string; fileName: string; mime: string; bytes: number | null; width: number | null; height: number | null; origin: 'upload' | 'server' }
const registry = new Map<string, MediaEntry>()
const previousCustomLogos = new Map<string, CustomCardLogo>()
const customKey = (card: Pick<CardInstance, 'instanceId' | 'source'>) => JSON.stringify([card.instanceId, card.source.whitelabelId, card.source.slug])
export const previousCustomLogo = (card: Pick<CardInstance, 'instanceId' | 'source'>) => {
  const logo = previousCustomLogos.get(customKey(card)); return logo ? structuredClone(logo) : null
}
/** Session-local explicit alternative, never another brand's official catalogue. */
export function rememberCustomLogo(card: Pick<CardInstance, 'instanceId' | 'source'>, logo: CardLogo | null) {
  if (logo && logo.kind !== 'official' && hasMedia(logo.assetRef)) previousCustomLogos.set(customKey(card), { ...logo, kind: 'custom' })
}
export function rememberOfficialPreview(logo: CardLogo, url: string | null) {
  if (logo.kind !== 'official') return
  const key = logoMediaKey(logo)!
  registry.set(key, { assetRef: key, url: url ? safeHttpUrl(url) ?? '' : '', fileName: '', mime: '', bytes: null, width: null, height: null, origin: 'server' })
  notify()
}
const cacheVersions = new Map<string, number>()
const known = new Set<string>()
const inflight = new Map<string, Promise<MediaEntry>>()
const copiesInProgress = new Set<string>()
const listeners = new Set<() => void>()
let mediaVersion = 0, sessionEpoch = 0, cacheGeneration = 0, sessionKey = showcaseSessionKey()
let uploadUncertain = false
export const hasUncertainUpload = () => uploadUncertain
const notify = () => { mediaVersion++; listeners.forEach(listener => listener()) }
export const getMediaSnapshot = () => mediaVersion
export const subscribeMedia = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
subscribeSession(() => { const next = showcaseSessionKey(); if (next === sessionKey) return; sessionKey = next; sessionEpoch++; registry.clear(); previousCustomLogos.clear(); cacheVersions.clear(); known.clear(); inflight.clear(); copiesInProgress.clear(); uploadUncertain = false; notify() })
export const resolveMedia = (assetRef: string) => registry.get(assetRef)
export const hasMedia = (assetRef: string) => isUuid(assetRef) && known.has(assetRef)
export const mediaUrl = (assetRef: string | null | undefined) => assetRef ? resolveMedia(assetRef)?.url || null : null
export function documentAssetRefs(document: ShowcaseDocument) {
  return [...new Set([...document.banner.images.map(image => image.assetRef), ...showcaseCards(document).flatMap(card => [...card.images.map(image => image.assetRef), ...(card.logo && card.logo.kind !== 'official' ? [card.logo.assetRef] : [])])])]
}
/** Only a decoded authoritative owner document can qualify existing durable refs. */
export function rememberDocumentAssets(document: ShowcaseDocument) { documentAssetRefs(document).forEach(ref => known.add(ref)) }
/** GET requires its owner; an already-confirmed owner PUT may omit that echo. */
export function hydrateStoredMedia(value: unknown, requireOwner = true) {
  const stored = decodeStoredShowcase(value, requireOwner)
  const entries = new Map<string, string>()
  if (stored.configured) {
    const document = object(object(object(value).data).document)
    const read = (value: unknown) => {
      const item = object(value)
      // Missing enrichment keeps the existing single-asset lookup available;
      // explicit null is a known unavailable URL, not a reason for GET fan-out.
      if (Object.hasOwn(item, 'url')) entries.set(item.assetRef as string, typeof item.url === 'string' ? safeHttpUrl(item.url) ?? '' : '')
    }
    const images = object(document.banner).images as unknown[], cards = (document.sections as unknown[]).filter(value => object(value).type === 'card')
    images.forEach(read)
    cards.forEach(value => {
      const card = object(value)
      const logo = object(card.logo)
      if (logo.kind === 'official') {
        const decoded = showcaseCards(stored.document).find(item => item.instanceId === card.instanceId)!
        entries.set(logoMediaKey(decoded.logo)!, typeof logo.url === 'string' ? safeHttpUrl(logo.url) ?? '' : '')
      } else read(logo);
      (card.images as unknown[]).forEach(read)
    })
  }
  cacheGeneration++
  rememberDocumentAssets(stored.document)
  showcaseCards(stored.document).forEach(card => rememberCustomLogo(card, card.logo))
  for (const [assetRef, url] of entries) {
    const previous = registry.get(assetRef)
    registry.set(assetRef, { assetRef, fileName: '', mime: '', bytes: null, width: null, height: null, origin: 'server', ...previous, url })
    cacheVersions.set(assetRef, cacheGeneration)
  }
  if (entries.size) notify()
  return stored
}
function parseAsset(value: unknown): MediaEntry {
  const asset = object(object(value).data)
  if (typeof asset.asset_ref !== 'string' || !isUuid(asset.asset_ref) || asset.wtlb_id !== 6 || asset.slot !== 'showcase') throw malformedShowcase()
  const url = typeof asset.url === 'string' ? safeHttpUrl(asset.url) : null
  if (asset.url != null && !url) throw malformedShowcase()
  return { assetRef: asset.asset_ref, url: url ?? '', fileName: typeof asset.original_name === 'string' ? asset.original_name : '', mime: typeof asset.mime === 'string' ? asset.mime : '', bytes: typeof asset.size_bytes === 'number' ? asset.size_bytes : null, width: null, height: null, origin: 'server' }
}
export async function ensureMedia(assetRef: string, force = false): Promise<MediaEntry> {
  if (!isUuid(assetRef)) throw malformedShowcase()
  const cached = resolveMedia(assetRef)
  if (cached && !force) return cached
  const pending = inflight.get(assetRef)
  if (pending) return pending
  const epoch = sessionEpoch, generation = cacheVersions.get(assetRef)
  const operation = (async () => {
    const body = await showcaseRequest(`/whitelabels/6/platform/assets/${assetRef}`)
    if (epoch !== sessionEpoch) throw new ApiError(0, {}, { kind: 'network' })
    const entry = parseAsset(body)
    if (entry.assetRef !== assetRef) throw malformedShowcase()
    // A document GET may have supplied a fresher URL while this request ran.
    if (generation !== cacheVersions.get(assetRef)) {
      const current = resolveMedia(assetRef)
      if (current) return current
      throw new ApiError(0, {}, { kind: 'network' })
    }
    if (cached?.origin === 'upload') entry.origin = 'upload'
    registry.set(assetRef, entry); known.add(assetRef); notify()
    return entry
  })()
  inflight.set(assetRef, operation)
  try { return await operation } finally { if (inflight.get(assetRef) === operation) inflight.delete(assetRef) }
}

export const UPLOAD_LIMIT_BYTES = 20 * 1024 * 1024
export const PERFORMANCE_HINT_BYTES = 500 * 1024

export type UploadPurpose = 'banner' | 'foto' | 'logo'

export const UPLOAD_GUIDANCE: Record<UploadPurpose, { width: number; height: number; ratioLabel: string; summary: string }> = {
  banner: { width: 1600, height: 1000, ratioLabel: '16:10', summary: 'JPG ou PNG · até 20 MiB por arquivo. Recomendado: 1600 × 1000 px (16:10). Outras proporções são recortadas sem distorção.' },
  foto: { width: 1440, height: 720, ratioLabel: '2:1', summary: 'JPG ou PNG · até 20 MiB por arquivo. Recomendado: 1440 × 720 px · corte sem distorção.' },
  logo: { width: 1200, height: 400, ratioLabel: '3:1', summary: 'PNG transparente recomendado · proporção livre · exibido inteiro, sem corte.' },
}

export type UploadCandidate = { name: string; type: string; size: number }

/** Format/size/signature checks. Dimensions and proportions only produce guidance. */
export function checkUploadCandidate(file: UploadCandidate, header: Uint8Array): { ok: true; mime: 'image/png' | 'image/jpeg' } | { ok: false; message: string } {
  const extension = /\.(png|jpe?g)$/i.exec(file.name)?.[1]?.toLowerCase()
  if (file.size === 0) return { ok: false, message: 'O arquivo está vazio.' }
  if (file.size > UPLOAD_LIMIT_BYTES) return { ok: false, message: 'O arquivo ultrapassa 20 MiB.' }
  if (!extension || !['image/png', 'image/jpeg'].includes(file.type)) return { ok: false, message: 'Formato não aceito. Use JPG ou PNG.' }
  const png = header.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => header[index] === byte)
  const jpeg = header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff
  const mime = png ? 'image/png' : jpeg ? 'image/jpeg' : null
  if (!mime || (mime === 'image/png') !== (extension === 'png') || mime !== file.type) return { ok: false, message: 'O conteúdo do arquivo não corresponde a um JPG ou PNG válido.' }
  return { ok: true, mime }
}

export function uploadWarnings(purpose: UploadPurpose, mime: string, bytes: number, width: number | null, height: number | null): string[] {
  const guide = UPLOAD_GUIDANCE[purpose]
  const warnings: string[] = []
  if (width && height) {
    if (width < guide.width * 0.75) warnings.push(`Resolução ${width} × ${height} px abaixo da referência ${guide.width} × ${guide.height} px; a imagem pode perder nitidez.`)
    const ratio = width / height, expected = guide.width / guide.height
    if (purpose !== 'logo' && Math.abs(ratio - expected) / expected > 0.12) warnings.push(`Proporção diferente de ${guide.ratioLabel}; a imagem será recortada para preencher o espaço, sem distorção.`)
  }
  if (purpose === 'logo' && mime === 'image/jpeg') warnings.push('JPG não possui transparência; o fundo do arquivo aparecerá sobre o painel.')
  if (bytes > PERFORMANCE_HINT_BYTES) warnings.push(`Arquivo de ${(bytes / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MiB. Para desempenho, prefira arquivos otimizados (referência ≈ 500 KB). Não é um limite.`)
  return warnings
}


export type IngestResult = { ok: true; entry: MediaEntry; warnings: string[] } | { ok: false; message: string; uncertain?: boolean }
/** One explicit server-side copy; no source bytes/ref enter the owner document before qualification. */
export async function copySourceMedia(actor: ShowcaseActor, sourceWhitelabelId: number, sourceAssetRef: string): Promise<IngestResult> {
  assertCanEdit(actor)
  if (uploadUncertain) return { ok: false, uncertain: true, message: 'Há uma operação de mídia com resultado incerto nesta sessão. Confira o ocorrido antes de uma nova cópia ou envio.' }
  if (!Number.isSafeInteger(sourceWhitelabelId) || sourceWhitelabelId <= 0 || !isUuid(sourceAssetRef)) throw malformedShowcase()
  const key = `${sourceWhitelabelId}:${sourceAssetRef.toLowerCase()}`, epoch = sessionEpoch
  if (copiesInProgress.has(key)) return { ok: false, message: 'Esta cópia já está em andamento. Aguarde o resultado; nenhuma nova solicitação foi enviada.' }
  const scoped = { ...actor, sessionVersion: getSessionVersion() }
  copiesInProgress.add(key)
  try {
    // Do not abort a dispatched write on UI close: a local abort cannot prove server cancellation.
    const response = await showcaseRequest('/whitelabels/6/platform/assets/copy', { method: 'POST', actor: scoped, body: { sourceWhitelabelId, sourceAssetRef } })
    if (epoch !== sessionEpoch) return { ok: false, message: 'A sessão mudou durante a cópia. O resultado não foi associado nesta sessão.' }
    assertCanEdit(scoped)
    // Legacy local-origin marker means newly ingested media (upload OR copy).
    // It keeps the bounded single-asset URL renewal available before the first document save.
    const entry = { ...parseAsset(response), origin: 'upload' as const }
    if (entry.assetRef.toLowerCase() === sourceAssetRef.toLowerCase()) throw malformedShowcase()
    registry.set(entry.assetRef, entry); known.add(entry.assetRef); notify()
    return { ok: true, entry, warnings: [] }
  } catch (error) {
    if (epoch !== sessionEpoch) return { ok: false, message: 'A sessão mudou durante a cópia. O resultado não foi associado nesta sessão.' }
    const uncertain = uncertainShowcaseError(error)
    if (uncertain) { uploadUncertain = true; notify() }
    return { ok: false, uncertain, message: uncertain ? 'Resultado da cópia incerto. A imagem anterior foi preservada. Não repita a cópia sem conferir o ocorrido; não há repetição automática.' : 'A cópia foi recusada. A imagem anterior foi preservada.' }
  } finally { if (epoch === sessionEpoch) copiesInProgress.delete(key) }
}
async function imageSize(file: Blob) {
  try {
    const bitmap = await createImageBitmap(file)
    const result = { width: bitmap.width, height: bitmap.height }; bitmap.close()
    return result.width > 0 && result.height > 0 ? result : null
  } catch { return null }
}
/** One request per explicit upload. Replacement always allocates a new durable ref. */
export async function ingestUpload(actor: ShowcaseActor, file: File, purpose: UploadPurpose, beforeSend?: () => boolean): Promise<IngestResult> {
  assertCanEdit(actor)
  if (uploadUncertain) return { ok: false, uncertain: true, message: 'Há um envio com resultado incerto nesta sessão. Confira o ocorrido com o suporte antes de um novo envio.' }
  const scoped = { ...actor, sessionVersion: getSessionVersion() }, epoch = sessionEpoch
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  const checked = checkUploadCandidate(file, header)
  if (!checked.ok) return checked
  const dimensions = await imageSize(file)
  if (!dimensions) return { ok: false, message: 'Não foi possível decodificar a imagem. O arquivo anterior foi preservado.' }
  if (beforeSend && !beforeSend()) return { ok: false, message: 'Seleção encerrada ou fonte atualizada. O arquivo anterior foi preservado.' }
  assertCanEdit(scoped)
  const form = new FormData(); form.append('image', file); form.append('slot', 'showcase')
  try {
    const body = await showcaseRequest('/whitelabels/6/platform/assets', { method: 'POST', body: form, actor: scoped })
    if (epoch !== sessionEpoch) return { ok: false, message: 'A sessão mudou durante o envio. O resultado não foi associado nesta sessão.' }
    const entry = { ...parseAsset(body), ...dimensions, origin: 'upload' as const }
    registry.set(entry.assetRef, entry); known.add(entry.assetRef); notify()
    return { ok: true, entry, warnings: uploadWarnings(purpose, checked.mime, file.size, dimensions.width, dimensions.height) }
  } catch (error) {
    if (epoch !== sessionEpoch) return { ok: false, message: 'A sessão mudou durante o envio. O resultado não foi associado nesta sessão.' }
    const uncertain = uncertainShowcaseError(error)
    if (uncertain) { uploadUncertain = true; notify() }
    return { ok: false, uncertain, message: uncertain ? 'Resultado do envio incerto. Nenhuma imagem foi associada. Não há reenvio automático; confira o ocorrido antes de enviar novamente.' : 'O envio foi recusado. O arquivo anterior foi preservado.' }
  }
}
export async function uploadImageFile(file: File, actor: ShowcaseActor) {
  const result = await ingestUpload(actor, file, 'foto')
  if (!result.ok) throw new Error(result.message)
  return { assetRef: result.entry.assetRef, fileName: result.entry.fileName }
}

export type UploadAttempts = { open(): void; close(): void; begin(): number; supersede(): void; isCurrent(attempt: number): boolean }

/** Upload attempts of ONE picker: only the latest attempt of a picker that is still open may deliver its result. */
export function createUploadAttempts(): UploadAttempts {
  let current = 0
  let open = true
  return {
    open: () => { open = true },
    close: () => { open = false; current++ },
    begin: () => ++current,
    supersede: () => { current++ },
    isCurrent: attempt => open && attempt === current,
  }
}


export type UploadAttemptOutcome = { status: 'apply'; entry: MediaEntry; warnings: string[] } | { status: 'error'; message: string; uncertain?: boolean } | { status: 'ignored' }
export async function runUploadAttempt(attempts: UploadAttempts, ingest: () => Promise<IngestResult>): Promise<UploadAttemptOutcome> {
  const attempt = attempts.begin()
  let result: IngestResult
  try { result = await ingest() } catch (error) {
    result = { ok: false, message: error instanceof ShowcasePermissionError ? 'Perfil sem permissão de envio.' : 'Não foi possível concluir o envio. A imagem anterior foi preservada; não houve reenvio automático.' }
  }
  if (!attempts.isCurrent(attempt)) return { status: 'ignored' }
  return result.ok ? { status: 'apply', entry: result.entry, warnings: result.warnings } : { status: 'error', message: result.message, uncertain: result.uncertain }
}
/** Durable assets are never deleted by editor lifetime or association removal. */
export function retainRefs(_key: string, _refs: Iterable<string>) {}
export function releaseRefs(_key: string) {}
export function collectUnreferencedUploads(_live: Iterable<string>) {}
