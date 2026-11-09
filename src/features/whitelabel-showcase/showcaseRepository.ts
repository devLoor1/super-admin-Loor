import { assertCanEdit, ShowcasePermissionError, type ShowcaseActor } from './showcaseAccess'
import { seedDocument, SEED_SAVED_AT } from './fixtures/showcaseSeed'
import { cloneDocument, SHOWCASE_OWNER, type ShowcaseDocument, type StoredShowcase } from './showcaseModel'
import { validateShowcase, type AssetResolver } from './showcaseValidation'
import type { SaveOutcome } from './showcaseSimulation'

/**
 * SIMULATED persistence: the single boundary a future integration would
 * replace. It keeps one versioned document in this tab's memory and imitates
 * the behavior proposed for the Backend (complete save, expected revision,
 * atomic conflict, server-side validation, role check). None of these are
 * existing contracts; nothing is sent anywhere and reload restores the seed.
 */

let stored: StoredShowcase = { revision: 1, savedAt: SEED_SAVED_AT, document: seedDocument() }
/** Immutable snapshot for React subscriptions (replaced on every write). */
let snapshot: StoredShowcase = cloneDocument(stored)
const listeners = new Set<() => void>()
const notify = () => listeners.forEach(listener => listener())

export function readStoredShowcase(): StoredShowcase {
  return cloneDocument(stored)
}

export const getStoredSnapshot = () => snapshot

export function subscribeStoredShowcase(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export type SaveRequest = {
  expectedRevision: number
  document: ShowcaseDocument
  actor: ShowcaseActor
  outcome: SaveOutcome
  resolve: AssetResolver
  delayMs?: number
}

export type SaveResult =
  | { status: 'saved'; stored: StoredShowcase }
  | { status: 'conflict'; current: StoredShowcase }
  | { status: 'rejected'; reason: 'permissao' | 'invalida' | 'proprietario'; message: string }
  | { status: 'failed'; message: string }
  | { status: 'uncertain' }

function apply(document: ShowcaseDocument) {
  stored = { revision: stored.revision + 1, savedAt: new Date().toISOString(), document: cloneDocument(document) }
  snapshot = cloneDocument(stored)
  notify()
}

export async function saveShowcase(request: SaveRequest): Promise<SaveResult> {
  await new Promise(resolve => setTimeout(resolve, request.delayMs ?? 500))
  try {
    assertCanEdit(request.actor)
  } catch (error) {
    if (error instanceof ShowcasePermissionError) return { status: 'rejected', reason: 'permissao', message: 'Gravação recusada pela simulação: perfil sem permissão de edição.' }
    throw error
  }
  const owner = request.document.owner
  if (owner.whitelabelId !== SHOWCASE_OWNER.whitelabelId || owner.slug !== SHOWCASE_OWNER.slug || owner.environmentKey !== SHOWCASE_OWNER.environmentKey) {
    return { status: 'rejected', reason: 'proprietario', message: 'Gravação recusada pela simulação: proprietário diferente de WL6 · homologacao.' }
  }
  if (validateShowcase(request.document, request.resolve).length) {
    return { status: 'rejected', reason: 'invalida', message: 'Gravação recusada pela simulação: a configuração está incompleta.' }
  }
  // Compare-and-swap on the expected revision; the stored document is untouched on conflict.
  if (request.expectedRevision !== stored.revision) return { status: 'conflict', current: readStoredShowcase() }
  if (request.outcome === 'falha') return { status: 'failed', message: 'Falha simulada ao salvar. Nada foi gravado e o rascunho foi preservado.' }
  if (request.outcome === 'incerto-aplicado') {
    apply(request.document)
    return { status: 'uncertain' }
  }
  if (request.outcome === 'incerto-nao-aplicado') return { status: 'uncertain' }
  apply(request.document)
  return { status: 'saved', stored: readStoredShowcase() }
}

/**
 * Another (simulated) session saves a change: the next save from a stale draft conflicts.
 * It WRITES the stored document and revision, so it is guarded like a save: the
 * simulation refuses it for profiles without edit permission (mock gate, not Backend authorization).
 */
export function simulateConcurrentEdit(actor: ShowcaseActor) {
  assertCanEdit(actor)
  const document = cloneDocument(stored.document)
  if (document.introduction) {
    document.introduction.subtitle = document.introduction.subtitle.endsWith(' (editado em outra sessão)')
      ? document.introduction.subtitle.replace(' (editado em outra sessão)', '')
      : `${document.introduction.subtitle} (editado em outra sessão)`
  } else if (document.banner.images.length > 1) {
    document.banner.images.reverse()
  }
  apply(document)
  return readStoredShowcase()
}

export function resetStoredShowcaseForChecks() {
  stored = { revision: 1, savedAt: SEED_SAVED_AT, document: seedDocument() }
  snapshot = cloneDocument(stored)
}
