import { ApiError } from '../../lib/api'
import { subscribeSession } from '../../lib/authSession'
import { assertCanEdit, showcaseSessionKey, type ShowcaseActor } from './showcaseAccess'
import { showcaseRequest, uncertainShowcaseError } from './showcaseClient'
import { decodeStoredShowcase, encodeShowcaseDocument, malformedShowcase, sameCanonicalDocument } from './showcaseCodec'
import { cloneDocument, emptyShowcaseDocument, type ShowcaseDocument, type StoredShowcase } from './showcaseModel'
import { rememberDocumentAssets } from './showcaseMedia'

const empty = (): StoredShowcase => ({ configured: false, revision: null, savedAt: null, document: emptyShowcaseDocument() })
let snapshot = empty(), sessionEpoch = 0, sessionKey = showcaseSessionKey()
const listeners = new Set<() => void>()
function publish(stored: StoredShowcase) { snapshot = cloneDocument(stored); rememberDocumentAssets(snapshot.document); listeners.forEach(listener => listener()); return cloneDocument(snapshot) }
subscribeSession(() => { const next = showcaseSessionKey(); if (next === sessionKey) return; sessionKey = next; sessionEpoch++; publish(empty()) })
export const readStoredShowcase = () => cloneDocument(snapshot)
export const getStoredSnapshot = () => snapshot
export const subscribeStoredShowcase = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
export async function fetchStoredShowcase(actor?: ShowcaseActor, signal?: AbortSignal): Promise<StoredShowcase> {
  const epoch = sessionEpoch
  const body = await showcaseRequest('/whitelabels/6/showcase', { actor, signal })
  if (epoch !== sessionEpoch) throw new ApiError(0, {}, { kind: 'network' })
  return publish(decodeStoredShowcase(body))
}
export type SaveRequest = { expectedRevision: number | null; document: ShowcaseDocument; actor: ShowcaseActor }
export type SaveResult =
  | { status: 'saved'; stored: StoredShowcase }
  | { status: 'conflict'; current: StoredShowcase | null }
  | { status: 'rejected'; reason: 'permissao' | 'invalida' | 'proprietario'; message: string; correlationId?: string }
  | { status: 'uncertain'; correlationId?: string }
export async function saveShowcase(request: SaveRequest): Promise<SaveResult> {
  assertCanEdit(request.actor)
  if (request.expectedRevision !== null && (!Number.isSafeInteger(request.expectedRevision) || request.expectedRevision <= 0)) throw new ApiError(422, { code: 'E_SHOWCASE_VALIDATION' })
  const document = encodeShowcaseDocument(request.document), epoch = sessionEpoch
  try {
    const body = await showcaseRequest('/whitelabels/6/showcase', { method: 'PUT', actor: request.actor, body: { schemaVersion: 1, expectedRevision: request.expectedRevision, document } })
    if (epoch !== sessionEpoch) throw new ApiError(0, {}, { kind: 'network' })
    const stored = decodeStoredShowcase(body, false)
    if (stored.revision !== (request.expectedRevision ?? 0) + 1 || !sameCanonicalDocument(request.document, stored.document)) throw malformedShowcase()
    return { status: 'saved', stored: publish(stored) }
  } catch (error) {
    if (error instanceof ApiError && error.status === 409 && error.code === 'E_SHOWCASE_REVISION_CONFLICT') {
      // Canonical ApiError intentionally omits arbitrary response data. Refresh
      // the authoritative revision instead; this never resends the PUT.
      try { return { status: 'conflict', current: await fetchStoredShowcase(request.actor) } } catch { return { status: 'conflict', current: null } }
    }
    if (uncertainShowcaseError(error)) return { status: 'uncertain', correlationId: error instanceof ApiError ? error.correlationId : undefined }
    const api = error as ApiError
    return { status: 'rejected', reason: api.status === 401 || api.status === 403 ? 'permissao' : api.status === 404 ? 'proprietario' : 'invalida', message: api.status === 404 ? 'Vitrine indisponível neste ambiente ou proprietário.' : api.status === 401 || api.status === 403 ? 'A sessão não permite salvar a vitrine.' : 'O servidor recusou a configuração. Revise os campos; o rascunho foi preservado.', correlationId: api.correlationId }
  }
}
