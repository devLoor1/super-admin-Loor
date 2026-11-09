import { ApiError } from '../../lib/api'
import { findWhitelabelBySlug } from '../whitelabels/crud/whitelabelOperationalApi'
import { getWhitelabel } from '../whitelabels/whitelabelApi'
import { getSourceDefaults } from './fixtures/showcaseSourceDefaults'
import { logicalSourceFor, mockSlugForInput } from './showcaseMapping'
import type { CardSource, SourceDefaults } from './showcaseModel'
import { consumeLookupOutcome } from './showcaseSimulation'

/**
 * Add-by-slug lookup. The search itself reuses the EXISTING paginated adapter
 * `findWhitelabelBySlug` (exact match, incomplete pagination never proves
 * absence) running over the in-memory mock transport. Logo/palette/description
 * defaults come from a clearly simulated fixture. Elegibility rule of this
 * prototype (to be aligned, not a Backend contract): only ACTIVE sources with an
 * exact slug can be added, including the owner itself.
 */

export type LookupRow = { id: string; slug: string; name: string; status: 'active' | 'inactive' }

export type LookupResult =
  | { status: 'found'; source: CardSource; defaults: SourceDefaults | null }
  | { status: 'inactive'; source: CardSource }
  | { status: 'not-found'; slug: string }
  | { status: 'inconclusive'; slug: string; reason: string }
  | { status: 'error'; slug: string; message: string }
  | { status: 'invalid'; message: string }

export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/

export function sourceFromRow(row: LookupRow): CardSource {
  return { whitelabelId: row.id, slug: row.slug, name: row.name, logical: logicalSourceFor(row.id, row.slug) }
}

/** Pure classification of the adapter result (covered by the offline checks). */
export function classifyLookup(mockSlug: string, rows: readonly LookupRow[], complete: boolean): LookupResult {
  const exact = rows.filter(row => row.slug === mockSlug)
  if (exact.length > 1) return { status: 'inconclusive', slug: mockSlug, reason: 'Mais de um registro com o mesmo slug foi retornado.' }
  if (exact.length === 1) {
    const source = sourceFromRow(exact[0])
    return exact[0].status === 'active' ? { status: 'found', source, defaults: getSourceDefaults(exact[0].slug) } : { status: 'inactive', source }
  }
  return complete ? { status: 'not-found', slug: mockSlug } : { status: 'inconclusive', slug: mockSlug, reason: 'A paginação retornada não permitiu concluir a busca.' }
}

const minimumVisibleDelay = (since: number) => new Promise(resolve => setTimeout(resolve, Math.max(0, 650 - (Date.now() - since))))

/** Same normalization for the search and for matching a result with the current input. */
export const normalizeSlugInput = (input: string) => input.trim().toLowerCase()

export async function lookupSourceBySlug(input: string): Promise<LookupResult> {
  const typed = normalizeSlugInput(input)
  if (!SLUG_PATTERN.test(typed)) return { status: 'invalid', message: 'Use somente letras minúsculas, números e hífen, sem espaços.' }
  const mockSlug = mockSlugForInput(typed)
  const started = Date.now()
  const outcome = consumeLookupOutcome()
  if (outcome === 'falha') {
    await minimumVisibleDelay(started)
    return { status: 'error', slug: typed, message: 'Falha simulada de consulta.' }
  }
  if (outcome === 'inconclusiva') {
    await minimumVisibleDelay(started)
    return { status: 'inconclusive', slug: typed, reason: 'Busca inconclusiva simulada: a paginação não pôde ser concluída.' }
  }
  try {
    const { rows, complete } = await findWhitelabelBySlug(mockSlug)
    await minimumVisibleDelay(started)
    return classifyLookup(mockSlug, rows.map(row => ({ id: row.id, slug: row.slug, name: row.name, status: row.status })), complete)
  } catch {
    await minimumVisibleDelay(started)
    return { status: 'error', slug: typed, message: 'A consulta não pôde ser concluída.' }
  }
}

/* ---------- "Adicionar card" dialog session (pure; covered by the offline checks) ---------- */

/**
 * A result belongs to ONE query. Editing the slug to a different normalized
 * value discards the previous result and supersedes any lookup still running;
 * a late response from an older attempt never replaces a newer state; a card can
 * only be created from an eligible result (exact, active source) of the query
 * that matches the current input. Repeating a valid source in independent cards
 * stays allowed: existing cards are not part of this rule.
 */
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
  if (!query || query !== session.query || result.source.slug !== mockSlugForInput(query)) return null
  return { source: result.source, defaults: result.defaults }
}

export type SourceStatus = 'active' | 'inactive' | 'missing' | 'changed' | 'error'

/** Re-reads one source through the existing record contract (status checks and restore). */
export async function readSource(source: CardSource, signal?: AbortSignal): Promise<{ status: SourceStatus; defaults: SourceDefaults | null }> {
  try {
    const record = await getWhitelabel(source.whitelabelId, signal)
    if (record.slug !== source.slug) return { status: 'changed', defaults: null }
    return { status: record.status, defaults: record.status === 'active' ? getSourceDefaults(record.slug) : null }
  } catch (error) {
    if (signal?.aborted) throw error
    return { status: error instanceof ApiError && error.status === 404 ? 'missing' : 'error', defaults: null }
  }
}
