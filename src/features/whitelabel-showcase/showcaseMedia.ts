import { assertCanEdit, ShowcasePermissionError, type ShowcaseActor } from './showcaseAccess'
import { newUuid } from './showcaseModel'
import { consumeUploadOutcome } from './showcaseSimulation'

/**
 * Tab-memory media registry of the prototype. A "reference" (`assetRef`) is a
 * synthetic identifier; the document never stores bytes, Base64 or signed URLs.
 *
 * - `aprovado:*`         approved showcase files bundled with the mock (byte-identical copies).
 * - `origem-simulada:*`  simulated canonical media of a source White Label (fixture).
 * - `copia-proprietario:*` owner-scoped copy created when a canonical logo is used
 *   (models the intended copy/immutable-version behavior; not a proven Backend capability).
 * - `upload-simulado:*`  a local file chosen in this tab, shown through a `blob:` URL.
 *   No file leaves the browser. Reloading the page drops these references.
 */

export type MediaOrigin = 'aprovado' | 'origem-simulada' | 'copia-proprietario' | 'upload-simulado'

export type MediaEntry = {
  assetRef: string
  url: string
  fileName: string
  mime: string
  bytes: number | null
  width: number | null
  height: number | null
  origin: MediaOrigin
  /** For owner copies: the source reference it was copied from. */
  copiedFrom?: string
}

const registry = new Map<string, MediaEntry>()
const retained = new Map<string, Set<string>>()

export function registerMedia(entry: MediaEntry) {
  registry.set(entry.assetRef, entry)
}
export const resolveMedia = (assetRef: string) => registry.get(assetRef)
export const hasMedia = (assetRef: string) => registry.has(assetRef)
export const mediaUrl = (assetRef: string | null | undefined) => (assetRef ? registry.get(assetRef)?.url ?? null : null)

export function approvedExamples(kind: 'foto' | 'logo') {
  return [...registry.values()].filter(entry => entry.origin === 'aprovado' && (kind === 'logo' ? /logo/.test(entry.assetRef) : !/logo/.test(entry.assetRef)))
}

/** New owner-scoped reference to the same simulated canonical file. The source ref is never mutated or deleted. */
export function copyForOwner(sourceAssetRef: string): string {
  // Versioned simulated source refs (`…:logo:v2`) resolve to the registered base file.
  const source = registry.get(sourceAssetRef) ?? registry.get(sourceAssetRef.replace(/:v\d+$/, ''))
  const assetRef = `copia-proprietario:${newUuid()}`
  registry.set(assetRef, {
    assetRef,
    url: source?.url ?? '',
    fileName: source?.fileName ?? 'logo.png',
    mime: source?.mime ?? 'image/png',
    bytes: source?.bytes ?? null,
    width: source?.width ?? null,
    height: source?.height ?? null,
    origin: 'copia-proprietario',
    copiedFrom: sourceAssetRef,
  })
  return assetRef
}

/* ---------- upload validation (prototype assumption, see COMPORTAMENTO-E-MIDIA.md) ---------- */

/** Existing entry-image pipeline ceiling; NOT yet qualified for showcase media. */
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

export type IngestResult = { ok: true; entry: MediaEntry; warnings: string[] } | { ok: false; message: string }

async function imageSize(file: Blob) {
  try {
    const bitmap = await createImageBitmap(file)
    const size = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return size
  } catch {
    return null
  }
}

/**
 * Validates a native File and registers it as a tab-local simulated upload.
 * The file is referenced through `URL.createObjectURL`; it is never read into
 * a string, serialized or sent anywhere. Registering media is a write of this
 * module: it is refused without the edit profile before anything is read or the
 * one-shot simulated outcome is consumed (mock gate, not Backend authorization).
 */
export async function ingestUpload(actor: ShowcaseActor, file: File, purpose: UploadPurpose): Promise<IngestResult> {
  assertCanEdit(actor)
  const simulateFailure = consumeUploadOutcome() === 'falha'
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  const check = checkUploadCandidate(file, header)
  if (!check.ok) return check
  const size = await imageSize(file)
  if (!size) return { ok: false, message: 'Não foi possível decodificar a imagem.' }
  // Visible "sending" state; nothing is transmitted.
  await new Promise(resolve => setTimeout(resolve, 450))
  if (simulateFailure) return { ok: false, message: 'Falha simulada no envio. Nenhum arquivo saiu deste navegador; tente novamente.' }
  const assetRef = `upload-simulado:${newUuid()}`
  const entry: MediaEntry = { assetRef, url: URL.createObjectURL(file), fileName: file.name, mime: check.mime, bytes: file.size, width: size.width, height: size.height, origin: 'upload-simulado' }
  registry.set(assetRef, entry)
  return { ok: true, entry, warnings: uploadWarnings(purpose, check.mime, file.size, size.width, size.height) }
}

/* ---------- picker attempts: abandoned or superseded uploads never apply ---------- */

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

export type UploadAttemptOutcome = { status: 'apply'; entry: MediaEntry; warnings: string[] } | { status: 'error'; message: string } | { status: 'ignored' }

/** A reference created by an attempt that will never be delivered is released at once. */
function releaseUndelivered(assetRef: string) {
  const entry = registry.get(assetRef)
  if (entry?.origin !== 'upload-simulado') return
  URL.revokeObjectURL(entry.url)
  registry.delete(assetRef)
}

/**
 * Runs one upload attempt for a picker. If the picker was closed (abandoned) or
 * another choice was made (superseded) before processing ends, the result is
 * ignored: nothing is applied, the current selection and the previous image stay
 * as they are. Any failure, expected or not, ends in an error the picker can
 * show — never in a permanent "sending" state.
 */
export async function runUploadAttempt(attempts: UploadAttempts, ingest: () => Promise<IngestResult>): Promise<UploadAttemptOutcome> {
  const attempt = attempts.begin()
  let result: IngestResult
  try {
    result = await ingest()
  } catch (error) {
    result = {
      ok: false,
      message: error instanceof ShowcasePermissionError
        ? 'Envio recusado pela simulação: perfil sem permissão de edição.'
        : 'Não foi possível ler o arquivo. Nada foi aplicado; escolha o arquivo novamente.',
    }
  }
  if (!attempts.isCurrent(attempt)) {
    if (result.ok) releaseUndelivered(result.entry.assetRef)
    return { status: 'ignored' }
  }
  return result.ok ? { status: 'apply', entry: result.entry, warnings: result.warnings } : { status: 'error', message: result.message }
}

/* ---------- object URL lifetime ---------- */

/** Editors holding unapplied drafts keep their references alive. */
export function retainRefs(key: string, refs: Iterable<string>) {
  retained.set(key, new Set(refs))
}
export function releaseRefs(key: string) {
  retained.delete(key)
}

/**
 * Revokes simulated uploads no longer referenced by the saved version, the
 * draft or any open editor. Approved, source and owner-copy references stay.
 */
export function collectUnreferencedUploads(live: Iterable<string>) {
  const keep = new Set(live)
  retained.forEach(refs => refs.forEach(ref => keep.add(ref)))
  for (const [assetRef, entry] of registry) {
    if (entry.origin !== 'upload-simulado' || keep.has(assetRef)) continue
    URL.revokeObjectURL(entry.url)
    registry.delete(assetRef)
  }
}
