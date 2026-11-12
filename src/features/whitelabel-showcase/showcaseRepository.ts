import { ApiError } from '../../lib/api'
import { subscribeSession } from '../../lib/authSession'
import { assertCanEdit, showcaseSessionKey, type ShowcaseActor } from './showcaseAccess'
import { showcaseRequest, uncertainShowcaseError } from './showcaseClient'
import { decodeStoredShowcase, encodeShowcaseDocument, malformedShowcase, sameCanonicalDocument } from './showcaseCodec'
import { cloneDocument, emptyShowcaseDocument, type ShowcaseDocument, type StoredShowcase } from './showcaseModel'
import { documentAssetRefs, ensureMedia, hydrateStoredMedia, mediaUrl, rememberDocumentAssets, resolveMedia } from './showcaseMedia'
import { SHOWCASE_V2_WRITES_ENABLED } from './showcaseRelease'

const empty = (): StoredShowcase => ({ configured: false, revision: null, savedAt: null, document: emptyShowcaseDocument() })
let snapshot = empty(), sessionEpoch = 0, sessionKey = showcaseSessionKey()
let mediaGeneration = 0, mediaRecoveryUsed = false, mediaRecovery: Promise<void> | null = null
function invalidateMediaRecovery(resetBudget: boolean) {
  mediaGeneration++; mediaRecovery = null
  if (resetBudget) mediaRecoveryUsed = false
}
const listeners = new Set<() => void>()
function publish(stored: StoredShowcase) { snapshot = cloneDocument(stored); rememberDocumentAssets(snapshot.document); listeners.forEach(listener => listener()); return cloneDocument(snapshot) }
subscribeSession(() => { const next = showcaseSessionKey(); if (next === sessionKey) return; sessionKey = next; sessionEpoch++; invalidateMediaRecovery(true); publish(empty()) })
export const readStoredShowcase = () => cloneDocument(snapshot)
export const getStoredSnapshot = () => snapshot
export const subscribeStoredShowcase = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
export async function fetchStoredShowcase(actor?: ShowcaseActor, signal?: AbortSignal): Promise<StoredShowcase> {
  // Only an explicit authoritative load/reconciliation starts another recovery
  // budget. Renders, changed URLs and recovery responses never reset it.
  invalidateMediaRecovery(true)
  const epoch = sessionEpoch, generation = mediaGeneration
  const body = await showcaseRequest('/whitelabels/6/showcase', { actor, signal })
  if (epoch !== sessionEpoch || generation !== mediaGeneration) throw new ApiError(0, {}, { kind: 'network' })
  return publish(hydrateStoredMedia(body))
}
/** One shared media recovery per loaded document, including all editor mounts. */
export async function refreshShowcaseMedia(assetRef: string, failedUrl: string): Promise<void> {
  if (!failedUrl || mediaUrl(assetRef) !== failedUrl) return
  if (mediaRecovery) return mediaRecovery
  if (mediaRecoveryUsed) return
  mediaRecoveryUsed = true
  const epoch = sessionEpoch, generation = mediaGeneration
  const draftUpload = resolveMedia(assetRef)?.origin === 'upload' && !documentAssetRefs(snapshot.document).includes(assetRef)
  const operation = (async () => {
    const body = await showcaseRequest('/whitelabels/6/showcase')
    if (epoch !== sessionEpoch || generation !== mediaGeneration) return
    // Deliberately do not publish: a media refresh cannot adopt a newer
    // editorial revision, change the base revision, or overwrite a draft.
    const stored = hydrateStoredMedia(body)
    if (draftUpload && !documentAssetRefs(stored.document).includes(assetRef) && mediaUrl(assetRef) === failedUrl) {
      // An unsaved upload is absent from the document. At most the first
      // requested ref is resolved; simultaneous failures never fan out.
      await ensureMedia(assetRef, true)
    }
  })()
  mediaRecovery = operation
  try { await operation } finally { if (mediaRecovery === operation) mediaRecovery = null }
}
export type SaveRequest = { expectedRevision: number | null; document: ShowcaseDocument; actor: ShowcaseActor }
export type SaveResult =
  | { status: 'saved'; stored: StoredShowcase }
  | { status: 'conflict'; current: StoredShowcase | null }
  | { status: 'rejected'; reason: 'permissao' | 'invalida' | 'proprietario'; message: string; correlationId?: string }
  | { status: 'uncertain'; correlationId?: string }
export async function saveShowcase(request: SaveRequest): Promise<SaveResult> {
  assertCanEdit(request.actor)
  if (!SHOWCASE_V2_WRITES_ENABLED) return { status: 'rejected', reason: 'invalida', message: 'A vitrine está em consulta durante a atualização dos leitores. O rascunho foi preservado.' }
  if (request.expectedRevision !== null && (!Number.isSafeInteger(request.expectedRevision) || request.expectedRevision <= 0)) throw new ApiError(422, { code: 'E_SHOWCASE_VALIDATION' })
  const document = encodeShowcaseDocument(request.document), epoch = sessionEpoch
  try {
    const body = await showcaseRequest('/whitelabels/6/showcase', { method: 'PUT', actor: request.actor, body: { schemaVersion: 2, expectedRevision: request.expectedRevision, document } })
    if (epoch !== sessionEpoch) throw new ApiError(0, {}, { kind: 'network' })
    const stored = decodeStoredShowcase(body, false)
    if (stored.revision !== (request.expectedRevision ?? 0) + 1 || !sameCanonicalDocument(request.document, stored.document)) throw malformedShowcase()
    invalidateMediaRecovery(false)
    // The confirmed owner PUT may enrich URLs while omitting the owner echo.
    // It can refresh media, but does not grant another automatic recovery.
    hydrateStoredMedia(body, false)
    return { status: 'saved', stored: publish(stored) }
  } catch (error) {
    if (error instanceof ApiError && error.status === 409 && error.code === 'E_SHOWCASE_REVISION_CONFLICT') {
      // Canonical ApiError intentionally omits arbitrary response data. Refresh
      // the authoritative revision instead; this never resends the PUT.
      try { return { status: 'conflict', current: await fetchStoredShowcase(request.actor) } } catch { return { status: 'conflict', current: null } }
    }
    if (uncertainShowcaseError(error)) return { status: 'uncertain', correlationId: error instanceof ApiError ? error.correlationId : undefined }
    const api = error as ApiError
    if (api.code === 'E_SHOWCASE_SCHEMA_DOWNGRADE') return { status: 'rejected', reason: 'invalida', message: 'A vitrine já utiliza a versão 2. O servidor recusou uma versão antiga; o rascunho foi preservado. Atualize o editor antes de tentar novamente.', correlationId: api.correlationId }
    return { status: 'rejected', reason: api.status === 401 || api.status === 403 ? 'permissao' : api.status === 404 ? 'proprietario' : 'invalida', message: api.status === 404 ? 'Vitrine indisponível neste ambiente ou proprietário.' : api.status === 401 || api.status === 403 ? 'A sessão não permite salvar a vitrine.' : 'O servidor recusou a configuração. Revise os campos; o rascunho foi preservado.', correlationId: api.correlationId }
  }
}
