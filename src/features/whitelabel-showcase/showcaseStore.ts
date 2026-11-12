import { useSyncExternalStore } from 'react'
import { getSessionVersion, subscribeSession } from '../../lib/authSession'
import { assertCanEdit, assertCanRead, showcaseSessionKey, type ShowcaseActor } from './showcaseAccess'
import { documentAssetRefs, ensureMedia, hasMedia, hasUncertainUpload } from './showcaseMedia'
import { cloneDocument, moveItem, sameDocument, MAX_SECTIONS, type CardInstance, type ShowcaseDocument, type TextSection, type StoredShowcase } from './showcaseModel'
import { readStoredShowcase, fetchStoredShowcase, saveShowcase } from './showcaseRepository'
import { sameCanonicalDocument, showcaseReadError } from './showcaseCodec'
import { validateShowcase } from './showcaseValidation'
import { SHOWCASE_V2_WRITES_ENABLED } from './showcaseRelease'

export type SavePhase = 'idle' | 'saving' | 'saved' | 'failed' | 'rejected' | 'conflict' | 'uncertain' | 'reconciling'
export type ShowcaseState = {
  stored: StoredShowcase; draft: ShowcaseDocument; baseRevision: number | null
  loadPhase: 'idle' | 'loading' | 'ready' | 'error'
  phase: SavePhase; message: string; conflictRevision: number | null
}
const initial = (): ShowcaseState => {
  const stored = readStoredShowcase()
  return { stored, draft: cloneDocument(stored.document), baseRevision: stored.revision, loadPhase: 'idle', phase: 'idle', message: '', conflictRevision: null }
}
let state = initial(), generation = 0, sessionKey = showcaseSessionKey()
let uncertainAttempt: { document: ShowcaseDocument; revision: number | null; baseline: StoredShowcase } | null = null
const listeners = new Set<() => void>()
function set(next: ShowcaseState) { state = next; listeners.forEach(listener => listener()) }
subscribeSession(() => { const next = showcaseSessionKey(); if (next === sessionKey) return; sessionKey = next; generation++; uncertainAttempt = null; set(initial()) })
export const getShowcaseState = () => state
export const subscribeShowcase = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
export const useShowcaseState = () => useSyncExternalStore(subscribeShowcase, getShowcaseState, getShowcaseState)
export const isDraftDirty = (value: ShowcaseState = state) => !sameDocument(value.draft, value.stored.document)
export const draftIssues = (value: ShowcaseState = state) => validateShowcase(value.draft, hasMedia)
const busy = () => state.phase === 'saving' || state.phase === 'reconciling'
export const hasPendingDraft = () => isDraftDirty() || busy() || state.phase === 'uncertain' || hasUncertainUpload()
function hydrateMedia(document: ShowcaseDocument) { documentAssetRefs(document).forEach(ref => { void ensureMedia(ref).catch(() => undefined) }) }
export async function loadShowcase(actor: ShowcaseActor) {
  try { assertCanRead(actor) } catch { set({ ...state, loadPhase: 'error', message: 'A sessão ou o ambiente não permite consultar esta vitrine.' }); return }
  if (state.loadPhase === 'loading' || busy() || state.phase === 'uncertain') return
  const request = ++generation, version = getSessionVersion(), wasDirty = isDraftDirty()
  set({ ...state, loadPhase: 'loading', message: '' })
  try {
    const stored = await fetchStoredShowcase({ ...actor, sessionVersion: version })
    if (request !== generation || version !== getSessionVersion()) return
    const preserve = wasDirty
    set({ ...state, stored, loadPhase: 'ready', ...(preserve ? {} : { draft: cloneDocument(stored.document), baseRevision: stored.revision, phase: 'idle' as const }) })
    hydrateMedia(stored.document)
  } catch (error) {
    if (request === generation && version === getSessionVersion()) set({ ...state, loadPhase: 'error', message: showcaseReadError(error) })
  }
}
export function updateDraft(actor: ShowcaseActor, recipe: (draft: ShowcaseDocument) => ShowcaseDocument) {
  assertCanEdit(actor)
  if (state.loadPhase !== 'ready' || busy() || state.phase === 'uncertain') return false
  set({ ...state, draft: recipe(cloneDocument(state.draft)), phase: state.phase === 'conflict' ? 'conflict' : 'idle', message: state.phase === 'conflict' ? state.message : '' })
  return true
}
export function addCard(actor: ShowcaseActor, card: CardInstance) {
  assertCanEdit(actor)
  if (state.draft.sections.length >= MAX_SECTIONS || state.draft.sections.some(section => section.instanceId === card.instanceId)) return false
  return updateDraft(actor, draft => ({ ...draft, sections: [...draft.sections, { type: 'card', ...cloneDocument(card) }] }))
}
export const replaceCard = (actor: ShowcaseActor, card: CardInstance) => updateDraft(actor, draft => ({ ...draft, sections: draft.sections.map(item => item.type === 'card' && item.instanceId === card.instanceId ? { ...cloneDocument(card), type: 'card' } : item) }))
export const removeCard = (actor: ShowcaseActor, instanceId: string) => updateDraft(actor, draft => ({ ...draft, sections: draft.sections.filter(section => section.type !== 'card' || section.instanceId !== instanceId) }))
export const moveSectionTo = (actor: ShowcaseActor, instanceId: string | number, to: number) => updateDraft(actor, draft => ({ ...draft, sections: moveItem(draft.sections, typeof instanceId === 'string' ? draft.sections.findIndex(section => section.instanceId === instanceId) : instanceId, to) }))
/** Indices always address the shared ordered sections, never a filtered card array. */
export const moveCardTo = moveSectionTo
export function addText(actor: ShowcaseActor, text: TextSection) {
  assertCanEdit(actor)
  if (state.draft.sections.length >= MAX_SECTIONS || state.draft.sections.some(section => section.instanceId === text.instanceId)) return false
  return updateDraft(actor, draft => ({ ...draft, sections: [...draft.sections, cloneDocument(text)] }))
}
export const replaceText = (actor: ShowcaseActor, text: TextSection) => updateDraft(actor, draft => ({ ...draft, sections: draft.sections.map(section => section.type === 'text' && section.instanceId === text.instanceId ? cloneDocument(text) : section) }))
export const removeSection = (actor: ShowcaseActor, instanceId: string) => updateDraft(actor, draft => ({ ...draft, sections: draft.sections.filter(section => section.instanceId !== instanceId) }))
/** Explicitly discards the draft only after a fresh authoritative GET succeeds. */
export async function discardDraft(actor: ShowcaseActor) {
  assertCanEdit(actor)
  if (busy() || state.phase === 'uncertain') return false
  const version = getSessionVersion(), request = ++generation
  set({ ...state, phase: 'reconciling', message: 'Carregando a versão atual…' })
  try {
    const stored = await fetchStoredShowcase({ ...actor, sessionVersion: version })
    if (version !== getSessionVersion() || request !== generation) return false
    set({ ...state, stored, draft: cloneDocument(stored.document), baseRevision: stored.revision, phase: 'idle', message: '', conflictRevision: null })
    hydrateMedia(stored.document); return true
  } catch {
    if (version === getSessionVersion() && request === generation) set({ ...state, phase: 'conflict', message: 'A leitura falhou. O rascunho foi preservado; tente conferir novamente.' })
    return false
  }
}
export function acknowledgeSaveMessage() {
  if (['saved', 'failed', 'rejected'].includes(state.phase)) set({ ...state, phase: 'idle', message: '' })
}
export type SaveAttempt = { status: 'blocked'; reason: string } | { status: 'started' }
export async function saveDraft(actor: ShowcaseActor): Promise<SaveAttempt> {
  try { assertCanEdit(actor) } catch { return { status: 'blocked', reason: 'A sessão ou o ambiente não permite salvar.' } }
  if (!SHOWCASE_V2_WRITES_ENABLED) return { status: 'blocked', reason: 'A vitrine está em consulta durante a atualização dos leitores.' }
  if (state.loadPhase !== 'ready' || busy() || state.phase === 'uncertain' || state.phase === 'conflict') return { status: 'blocked', reason: 'Confira a versão atual antes de salvar.' }
  if (!isDraftDirty()) return { status: 'blocked', reason: 'Não há alterações para salvar.' }
  if (draftIssues().length) return { status: 'blocked', reason: 'A configuração ainda está incompleta.' }
  const document = cloneDocument(state.draft), expectedRevision = state.baseRevision, baseline = cloneDocument(state.stored)
  const version = getSessionVersion(), request = ++generation
  set({ ...state, phase: 'saving', message: 'Salvando a configuração…' })
  let result: Awaited<ReturnType<typeof saveShowcase>>
  try { result = await saveShowcase({ document, expectedRevision, actor: { ...actor, sessionVersion: version } }) } catch {
    if (version === getSessionVersion() && request === generation) set({ ...state, phase: 'rejected', message: 'Não foi possível preparar o envio. Revise a configuração e sua sessão; o rascunho foi preservado.' })
    return { status: 'started' }
  }
  if (version !== getSessionVersion() || request !== generation) return { status: 'started' }
  if (result.status === 'saved') {
    set({ ...state, stored: result.stored, draft: cloneDocument(result.stored.document), baseRevision: result.stored.revision, phase: 'saved', message: `Configuração confirmada pelo servidor na revisão ${result.stored.revision}.`, conflictRevision: null })
    hydrateMedia(result.stored.document)
  } else if (result.status === 'conflict') {
    set({ ...state, stored: result.current ?? state.stored, phase: 'conflict', conflictRevision: result.current?.revision ?? null, message: 'A versão do servidor mudou. Seu rascunho foi preservado; confira a versão atual antes de descartar ou revisar.' })
  } else if (result.status === 'uncertain') {
    uncertainAttempt = { document, revision: expectedRevision, baseline }
    set({ ...state, phase: 'uncertain', message: `Resultado incerto. Confira a versão salva antes de qualquer novo envio.${result.correlationId ? ` Referência: ${result.correlationId}` : ''}` })
  } else set({ ...state, phase: 'rejected', message: result.message })
  return { status: 'started' }
}
/** Manual GET reconciliation compares both content and revision; never retries PUT. */
export async function reconcileDraft(actor: ShowcaseActor) {
  assertCanRead(actor)
  if (!uncertainAttempt || busy()) return false
  const attempt = uncertainAttempt, version = getSessionVersion(), request = ++generation
  set({ ...state, phase: 'reconciling', message: 'Conferindo a versão atual…' })
  try {
    const stored = await fetchStoredShowcase({ ...actor, sessionVersion: version })
    if (version !== getSessionVersion() || request !== generation) return false
    if (stored.revision === (attempt.revision ?? 0) + 1 && sameCanonicalDocument(stored.document, attempt.document)) {
      uncertainAttempt = null
      set({ ...state, stored, draft: cloneDocument(stored.document), baseRevision: stored.revision, phase: 'saved', message: 'A leitura encontrou a configuração esperada. Nenhum envio foi repetido; a leitura não comprova autoria.', conflictRevision: null })
    } else if (stored.revision === attempt.revision && sameDocument(stored.document, attempt.baseline.document)) {
      uncertainAttempt = null
      set({ ...state, stored, phase: 'failed', message: 'A leitura mantém a revisão anterior. Revise o rascunho antes de um novo envio manual.' })
    } else {
      uncertainAttempt = null
      set({ ...state, stored, phase: 'conflict', conflictRevision: stored.revision, message: 'A leitura encontrou outra versão. O rascunho foi preservado; não houve sobrescrita.' })
    }
    hydrateMedia(stored.document); return true
  } catch {
    if (version === getSessionVersion() && request === generation) set({ ...state, phase: 'uncertain', message: 'Não foi possível conferir a versão. O reenvio continua bloqueado; tente a leitura novamente.' })
    return false
  }
}
type UnloadTarget = { addEventListener(type: 'beforeunload', listener: (event: BeforeUnloadEvent) => void): void; removeEventListener(type: 'beforeunload', listener: (event: BeforeUnloadEvent) => void): void }
export function installDraftUnloadProtection(target: UnloadTarget) {
  const listener = (event: BeforeUnloadEvent) => { if (hasPendingDraft()) { event.preventDefault(); event.returnValue = '' } }
  target.addEventListener('beforeunload', listener)
  return () => target.removeEventListener('beforeunload', listener)
}
