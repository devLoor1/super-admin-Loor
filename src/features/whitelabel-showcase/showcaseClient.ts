import { ApiError, apiRequest, type ApiQuery } from '../../lib/api'
import { getAccessToken, getSessionVersion, handleUnauthorized } from '../../lib/authSession'
import { decodeShowcaseDocument, encodeShowcaseDocument, object } from './showcaseCodec'
import { isUuid } from './showcaseModel'
import { assertCanEdit, assertCanRead, type ShowcaseActor } from './showcaseAccess'

/** Only fixed owner-scoped showcase paths and existing Whitelabel reads are reachable. */
export async function showcaseRequest(path: string, options: { actor?: ShowcaseActor; method?: 'GET' | 'PUT' | 'POST'; body?: unknown; query?: ApiQuery; signal?: AbortSignal } = {}) {
  const method = options.method ?? 'GET'
  if (!['GET', 'PUT', 'POST'].includes(method)) throw new ApiError(400, { code: 'INVALID_SHOWCASE_METHOD' })
  if (method === 'GET') assertCanRead(options.actor)
  else if (options.actor) assertCanEdit(options.actor)
  else throw new ApiError(403, { code: 'E_FORBIDDEN' })
  const documentPath = path === '/whitelabels/6/showcase'
  const assetPath = path === '/whitelabels/6/platform/assets'
  const assetRead = path.startsWith('/whitelabels/6/platform/assets/') && isUuid(path.slice('/whitelabels/6/platform/assets/'.length))
  const registryRead = /^\/whitelabels(?:\/[1-9]\d*)?$/.test(path)
  if (!(method === 'GET' ? documentPath || assetRead || registryRead : method === 'PUT' ? documentPath : assetPath)) throw new ApiError(400, { code: 'INVALID_SHOWCASE_PATH' })
  let body: unknown
  if (method === 'PUT') {
    const requested = object(options.body)
    if (requested.schemaVersion !== 1 || (requested.expectedRevision !== null && (typeof requested.expectedRevision !== 'number' || !Number.isSafeInteger(requested.expectedRevision) || requested.expectedRevision <= 0))) throw new ApiError(422, { code: 'E_SHOWCASE_VALIDATION' })
    body = { schemaVersion: 1, expectedRevision: requested.expectedRevision, document: encodeShowcaseDocument(decodeShowcaseDocument(requested.document)) }
  } else if (method === 'POST') {
    if (!(options.body instanceof FormData) || options.body.get('slot') !== 'showcase') throw new ApiError(422, { code: 'E_SHOWCASE_ASSET_INVALID' })
    const file = options.body.get('image')
    if (!(file instanceof Blob) || !['image/png', 'image/jpeg'].includes(file.type) || file.size <= 0 || file.size > 20 * 1024 * 1024) throw new ApiError(422, { code: 'E_SHOWCASE_ASSET_INVALID' })
    const upload = new FormData(); upload.append('slot', 'showcase'); upload.append('image', file)
    body = upload
  }
  let query: ApiQuery | undefined
  if (method === 'GET' && path === '/whitelabels') {
    const page = options.query?.page
    if (typeof page !== 'number' || !Number.isSafeInteger(page) || page < 1 || options.query?.active !== 'true') throw new ApiError(400, { code: 'INVALID_SHOWCASE_SEARCH' })
    query = { page, perPage: 20, search: typeof options.query.search === 'string' ? options.query.search : undefined, active: 'true' }
  }
  const version = getSessionVersion(), token = getAccessToken()!
  try {
    const result = await apiRequest<unknown>(path, { method, token, body, query, signal: options.signal, timeoutMs: 20_000, successStatus: method === 'POST' ? 201 : 200 })
    if (version !== getSessionVersion() || token !== getAccessToken()) throw new ApiError(0, {}, { kind: 'network' })
    assertCanRead(options.actor)
    return result
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) handleUnauthorized(token, version)
    throw error
  }
}
export const uncertainShowcaseError = (error: unknown) => !(error instanceof ApiError) || error.kind !== 'http' || error.status >= 500 || error.status === 408
