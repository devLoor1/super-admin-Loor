import { ApiError, apiRequest } from '../../lib/api'
import { authenticatedGet } from '../../lib/apiClient'
import { getAccessToken, getOperator, getSessionVersion, handleUnauthorized } from '../../lib/authSession'
import { isSettingsTenantId } from './settingsReadApi'
import { canWriteSettings } from './settingsWriteContract'

export type Revision = {
  id: number
  number: number
  title: string
  markdown: string
  publishedAt: string | null
}
export type TermsDocument = { current: Revision | null; history: Revision[] }
export type TermsDraft = { title: string; markdown: string }
const malformed = () => new ApiError(200, {}, { kind: 'malformed' })
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const positive = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0

function revision(raw: unknown): Revision {
  if (!record(raw) || raw.configured !== true || !positive(raw.revision_id) || !positive(raw.revision) ||
      typeof raw.title !== 'string' || typeof raw.content_markdown !== 'string' ||
      !(typeof raw.published_at === 'string' || raw.published_at == null)) throw malformed()
  return { id: raw.revision_id, number: raw.revision, title: raw.title, markdown: raw.content_markdown, publishedAt: raw.published_at ?? null }
}

export function parseTermsDocument(raw: unknown, id: string): TermsDocument {
  if (!record(raw) || !record(raw.data)) throw malformed()
  const { whitelabel, current, history } = raw.data
  if (!record(whitelabel) || whitelabel.id !== Number(id) || !record(current) || !Array.isArray(history)) throw malformed()
  return {
    current: current.configured === false && current.revision_id === null && current.revision === null ? null : revision(current),
    history: history.map(revision),
  }
}

const path = (id: string) => {
  if (!isSettingsTenantId(id)) throw new ApiError(404, { code: 'INVALID_WHITELABEL_ID' })
  return '/whitelabels/' + id + '/terms-of-use'
}
export async function readTerms(id: string, signal?: AbortSignal) {
  return parseTermsDocument(await authenticatedGet(path(id), { signal }), id)
}

export function matchesDraft(current: Revision | null, draft: TermsDraft) {
  return !!current && current.title === draft.title.trim() && current.markdown === draft.markdown.trim()
}

export type PublicationResult =
  | { outcome: 'confirmed' | 'matching' | 'stale'; document: TermsDocument }
  | { outcome: 'uncertain'; document?: TermsDocument }

// The preflight also covers an empty first revision as far as a GET allows.
// Core only accepts a revision precondition once a current document exists.
export async function publishTerms(id: string, baseline: number | null, draft: TermsDraft, signal: AbortSignal): Promise<PublicationResult> {
  const token = getAccessToken(), version = getSessionVersion()
  function checkSession() {
    if (signal.aborted || version !== getSessionVersion() || token !== getAccessToken()) throw new DOMException('Session changed', 'AbortError')
    if (!token) throw new ApiError(401, { code: 'NO_SESSION' })
    if (!canWriteSettings(getOperator()?.roles)) throw new ApiError(403, { code: 'TERMS_WRITE_FORBIDDEN' })
  }
  checkSession()
  if (!draft.title.trim() || draft.title.trim().length > 256 || !draft.markdown.trim()) throw new ApiError(422, { code: 'E_TERMS_OF_USE_INVALID' })
  const fresh = await readTerms(id, signal)
  checkSession()
  if ((fresh.current?.id ?? null) !== baseline) return { outcome: 'stale', document: fresh }
  if (matchesDraft(fresh.current, draft)) throw new ApiError(422, { code: 'TERMS_NO_CHANGE' })
  let receipt: Revision | undefined
  let conflict = false
  try {
    const raw = await apiRequest<unknown>(path(id), {
      method: 'PUT', token, signal, successStatus: 200, timeoutMs: 20_000,
      body: { title: draft.title, content_markdown: draft.markdown, ...(baseline === null ? {} : { expectedCurrentRevisionId: baseline }) },
    })
    if (record(raw)) receipt = revision(raw.data)
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) handleUnauthorized(token!, version)
    if (error instanceof ApiError && error.status >= 400 && error.status < 500 && error.status !== 409 && error.status !== 408) throw error
    conflict = error instanceof ApiError && error.status === 409
  }
  checkSession()
  let document: TermsDocument
  try {
    document = await readTerms(id, signal)
  } catch (error) {
    checkSession()
    if (error instanceof ApiError && [401, 403].includes(error.status)) throw error
    return { outcome: 'uncertain' }
  }
  checkSession()
  if (conflict) return { outcome: 'stale', document }
  if (document.current && document.current.id !== baseline && matchesDraft(document.current, draft)) {
    const confirmed = receipt?.id === document.current.id && matchesDraft(receipt, draft)
    return { outcome: confirmed ? 'confirmed' : 'matching', document }
  }
  return { outcome: 'uncertain', document }
}
