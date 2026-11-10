import { ApiError } from '../../lib/api'
import { parseWhitelabel, parseWhitelabelList, type WhitelabelListResult } from '../whitelabels/whitelabelApi'
import { showcaseRequest } from './showcaseClient'
import { malformedShowcase } from './showcaseCodec'
import type { CardSource, SourceDefaults } from './showcaseModel'

export type LookupRow = { id: string; slug: string; name: string; status: 'active' | 'inactive'; baseUrl?: string | null }
export type LookupResult =
  | { status: 'found'; source: CardSource; defaults: SourceDefaults | null }
  | { status: 'inactive'; source: CardSource }
  | { status: 'not-found'; slug: string }
  | { status: 'inconclusive'; slug: string; reason: string }
  | { status: 'error'; slug: string; message: string }
  | { status: 'invalid'; message: string }
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const normalizeSlugInput = (input: string) => input.trim().toLowerCase()
export function sourceFromRow(row: LookupRow): CardSource {
  return { whitelabelId: row.id, slug: row.slug, name: row.name, logical: null, baseUrl: row.baseUrl ?? null }
}
export function classifyLookup(slug: string, rows: readonly LookupRow[], complete: boolean): LookupResult {
  const exact = rows.filter(row => row.slug === slug)
  if (exact.length > 1) return { status: 'inconclusive', slug, reason: 'Mais de um registro com o mesmo slug foi retornado.' }
  if (!complete) return { status: 'inconclusive', slug, reason: 'A paginação não permitiu concluir a busca.' }
  if (!exact.length) return { status: 'not-found', slug }
  const source = sourceFromRow(exact[0])
  return exact[0].status === 'active' ? { status: 'found', source, defaults: null } : { status: 'inactive', source }
}
/** The existing registry searches name, slug and baseUrl; this selector displays active rows only. */
export async function searchSourceOptions(search: string, page = 1, signal?: AbortSignal): Promise<WhitelabelListResult> {
  if (!Number.isSafeInteger(page) || page < 1) throw malformedShowcase()
  const parsed = parseWhitelabelList(await showcaseRequest('/whitelabels', { signal, query: { search: search.trim() || undefined, page, perPage: 20, active: 'true' } }))
  if (parsed.page !== page || parsed.rows.some(row => row.status !== 'active' || !SLUG_PATTERN.test(row.slug))) throw malformedShowcase()
  return parsed
}
export async function lookupSourceBySlug(input: string): Promise<LookupResult> {
  const slug = normalizeSlugInput(input)
  if (!SLUG_PATTERN.test(slug) || slug.length > 80) return { status: 'invalid', message: 'Use um slug válido, com letras minúsculas, números e hífens simples.' }
  try {
    const rows: LookupRow[] = [], seen = new Set<string>()
    let total: number | null = null, pages: number | null = null, perPage: number | null = null
    // Bounded GET work; reaching the limit never asserts absence or uniqueness.
    for (let page = 1; page <= 100; page++) {
      const result = await searchSourceOptions(slug, page)
      if (total !== null && (total !== result.total || pages !== result.lastPage || perPage !== result.perPage)) return classifyLookup(slug, rows, false)
      total = result.total; pages = result.lastPage; perPage = result.perPage
      if (result.rows.some(row => seen.has(row.id))) return classifyLookup(slug, rows, false)
      result.rows.forEach(row => seen.add(row.id)); rows.push(...result.rows)
      if (rows.filter(row => row.slug === slug).length > 1) return classifyLookup(slug, rows, true)
      if (page >= result.lastPage) return classifyLookup(slug, rows, rows.length === result.total)
      if (result.rows.length !== result.perPage) return classifyLookup(slug, rows, false)
    }
    return classifyLookup(slug, rows, false)
  } catch { return { status: 'error', slug, message: 'Não foi possível concluir a busca de origens.' } }
}
/** Direct selection revalidates one record; it never downloads the entire registry. */
export async function lookupSourceById(id: string, signal?: AbortSignal): Promise<LookupResult> {
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) return { status: 'invalid', message: 'Identificador de origem inválido.' }
  try {
    const row = parseWhitelabel(await showcaseRequest(`/whitelabels/${id}`, { signal }))
    if (row.id !== id || !SLUG_PATTERN.test(row.slug)) throw malformedShowcase()
    return row.status === 'active' ? { status: 'found', source: sourceFromRow(row), defaults: null } : { status: 'inactive', source: sourceFromRow(row) }
  } catch (error) {
    if (signal?.aborted) throw error
    return error instanceof ApiError && error.status === 404 ? { status: 'not-found', slug: '' } : { status: 'error', slug: '', message: 'Não foi possível conferir esta origem.' }
  }
}

export type LookupSession = {
  input: string
  /** Increases on every search and on every edit that changes the query. */
  attempt: number
  phase: 'idle' | 'loading' | 'done'
  /** Normalized slug that the current loading/result belongs to. */
  query: string | null
  result: LookupResult | null
}

export const initialLookupSession: LookupSession = { input: '', attempt: 0, phase: 'idle', query: null, result: null }

export function editLookupInput(session: LookupSession, input: string): LookupSession {
  if (session.phase !== 'idle' && normalizeSlugInput(input) === session.query) return { ...session, input }
  return { input, attempt: session.attempt + 1, phase: 'idle', query: null, result: null }
}

export function startLookup(session: LookupSession): { session: LookupSession; attempt: number; query: string } | null {
  const query = normalizeSlugInput(session.input)
  if (!query || session.phase === 'loading') return null
  const attempt = session.attempt + 1
  return { session: { ...session, attempt, phase: 'loading', query, result: null }, attempt, query }
}

/** Applies a response only if it answers the attempt still pending; otherwise the current state wins. */
export function receiveLookup(session: LookupSession, attempt: number, result: LookupResult): LookupSession {
  if (session.phase !== 'loading' || session.attempt !== attempt) return session
  return { ...session, phase: 'done', result }
}

/** The only selection "Adicionar card" may use: an eligible result for the CURRENT input. */
export function eligibleLookupSelection(session: LookupSession): { source: CardSource; defaults: SourceDefaults | null } | null {
  const { result } = session
  if (session.phase !== 'done' || result?.status !== 'found') return null
  const query = normalizeSlugInput(session.input)
  if (!query || query !== session.query || result.source.slug !== query) return null
  return { source: result.source, defaults: result.defaults }
}


export type SourceStatus = 'active' | 'inactive' | 'missing' | 'changed' | 'error'
export async function readSource(source: CardSource, signal?: AbortSignal): Promise<{ status: SourceStatus; defaults: SourceDefaults | null }> {
  const result = await lookupSourceById(source.whitelabelId, signal)
  if (result.status === 'found' || result.status === 'inactive') return { status: result.source.slug !== source.slug ? 'changed' : result.status === 'found' ? 'active' : 'inactive', defaults: null }
  return { status: result.status === 'not-found' ? 'missing' : 'error', defaults: null }
}
