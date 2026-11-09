import { useSyncExternalStore } from 'react'
import { assertCanEdit, type ShowcaseActor } from './showcaseAccess'
import { collectUnreferencedUploads, hasMedia } from './showcaseMedia'
import {
  APPROVED_INTRODUCTION,
  cloneDocument,
  moveItem,
  sameDocument,
  type CardInstance,
  type ShowcaseDocument,
  type ShowcaseIntroduction,
  type StoredShowcase,
} from './showcaseModel'
import { readStoredShowcase, saveShowcase, subscribeStoredShowcase } from './showcaseRepository'
import { consumeSaveOutcome } from './showcaseSimulation'
import { validateShowcase } from './showcaseValidation'

/**
 * Editorial draft of the Vitrine (tab memory). The draft survives navigation
 * between the showcase screens and is lost on reload, exactly like the other
 * mock prototypes. "Salvar alterações" sends the COMPLETE document to the
 * simulated repository; nothing is autosaved.
 */

export type SavePhase = 'idle' | 'saving' | 'saved' | 'failed' | 'rejected' | 'conflict' | 'reconciling'

export type ShowcaseState = {
  stored: StoredShowcase
  draft: ShowcaseDocument
  /** Revision the draft was started from (expected revision on save). */
  baseRevision: number
  phase: SavePhase
  message: string
  conflictRevision: number | null
  /** Last removed introduction, so re-adding the section restores it. */
  removedIntroduction: ShowcaseIntroduction | null
}

function initialState(): ShowcaseState {
  const stored = readStoredShowcase()
  return { stored, draft: cloneDocument(stored.document), baseRevision: stored.revision, phase: 'idle', message: '', conflictRevision: null, removedIntroduction: null }
}

let state: ShowcaseState = initialState()
const listeners = new Set<() => void>()

function liveRefs(document: ShowcaseDocument) {
  const refs = document.banner.images.map(image => image.assetRef)
  for (const card of document.cards) {
    refs.push(...card.images.map(image => image.assetRef))
    if (card.logo) refs.push(card.logo.assetRef)
  }
  return refs
}

function set(next: ShowcaseState) {
  state = next
  collectUnreferencedUploads([...liveRefs(state.stored.document), ...liveRefs(state.draft)])
  listeners.forEach(listener => listener())
}

export const getShowcaseState = () => state
export function subscribeShowcase(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
export function useShowcaseState() {
  return useSyncExternalStore(subscribeShowcase, getShowcaseState, getShowcaseState)
}

export const isDraftDirty = (value: ShowcaseState = state) => !sameDocument(value.draft, value.stored.document)
export const draftIssues = (value: ShowcaseState = state) => validateShowcase(value.draft, hasMedia)
const busy = (value: ShowcaseState) => value.phase === 'saving' || value.phase === 'reconciling'

/* ---------- draft mutations (all guarded by role and by in-flight saves) ---------- */

export function updateDraft(actor: ShowcaseActor, recipe: (draft: ShowcaseDocument) => ShowcaseDocument) {
  assertCanEdit(actor)
  if (busy(state)) return false
  const draft = recipe(cloneDocument(state.draft))
  set({ ...state, draft, phase: state.phase === 'conflict' ? 'conflict' : 'idle', message: state.phase === 'conflict' ? state.message : '' })
  return true
}

export const addCard = (actor: ShowcaseActor, card: CardInstance) => updateDraft(actor, draft => ({ ...draft, cards: [...draft.cards, card] }))
export const replaceCard = (actor: ShowcaseActor, card: CardInstance) => updateDraft(actor, draft => ({ ...draft, cards: draft.cards.map(item => item.instanceId === card.instanceId ? cloneDocument(card) : item) }))
export const removeCard = (actor: ShowcaseActor, instanceId: string) => updateDraft(actor, draft => ({ ...draft, cards: draft.cards.filter(card => card.instanceId !== instanceId) }))
export const moveCardTo = (actor: ShowcaseActor, from: number, to: number) => updateDraft(actor, draft => ({ ...draft, cards: moveItem(draft.cards, from, to) }))

export function removeIntroduction(actor: ShowcaseActor) {
  assertCanEdit(actor)
  const removed = state.draft.introduction
  if (busy(state) || !removed) return false
  set({ ...state, draft: { ...cloneDocument(state.draft), introduction: null }, removedIntroduction: removed, phase: state.phase === 'conflict' ? 'conflict' : 'idle', message: state.phase === 'conflict' ? state.message : '' })
  return true
}

export function restoreIntroduction(actor: ShowcaseActor) {
  const previous = state.removedIntroduction ?? state.stored.document.introduction ?? APPROVED_INTRODUCTION
  return updateDraft(actor, draft => ({ ...draft, introduction: cloneDocument(previous) }))
}

/** Drops local edits and reloads the last saved version (also used after a conflict). Editorial action: guarded. */
export function discardDraft(actor: ShowcaseActor) {
  assertCanEdit(actor)
  const stored = readStoredShowcase()
  set({ ...state, stored, draft: cloneDocument(stored.document), baseRevision: stored.revision, phase: 'idle', message: '', conflictRevision: null, removedIntroduction: null })
}

export function acknowledgeSaveMessage() {
  if (state.phase === 'saved' || state.phase === 'failed' || state.phase === 'rejected') set({ ...state, phase: 'idle', message: '' })
}

/* ---------- save ---------- */

const SAVED_NOTE = 'Nenhum servidor foi contatado; recarregar a página restaura os exemplos.'

async function reconcile(expected: ShowcaseDocument, baseRevision: number) {
  set({ ...state, phase: 'reconciling', message: 'Resultado incerto. Conferindo a versão salva antes de permitir novo envio…' })
  await new Promise(resolve => setTimeout(resolve, 500))
  const current = readStoredShowcase()
  if (current.revision === baseRevision + 1 && sameDocument(current.document, expected)) {
    const draftUnchanged = sameDocument(state.draft, expected)
    set({ ...state, stored: current, draft: draftUnchanged ? cloneDocument(current.document) : state.draft, baseRevision: current.revision, phase: 'saved', message: `A leitura confirmou a gravação na simulação local (revisão ${current.revision}). ${SAVED_NOTE}`, conflictRevision: null })
  } else if (current.revision === baseRevision) {
    set({ ...state, stored: current, phase: 'failed', message: 'A leitura confirmou que a gravação não foi aplicada. O rascunho foi preservado; você pode salvar novamente.' })
  } else {
    set({ ...state, stored: current, phase: 'conflict', conflictRevision: current.revision, message: `A versão salva mudou para a revisão ${current.revision}. Seu rascunho foi preservado e nada foi sobrescrito.` })
  }
}

export type SaveAttempt = { status: 'blocked'; reason: string } | { status: 'started' }

export async function saveDraft(actor: ShowcaseActor): Promise<SaveAttempt> {
  assertCanEdit(actor)
  if (busy(state)) return { status: 'blocked', reason: 'Já existe um salvamento em andamento.' }
  if (state.phase === 'conflict') return { status: 'blocked', reason: 'Resolva o conflito antes de salvar: recarregue a versão atual.' }
  if (!isDraftDirty()) return { status: 'blocked', reason: 'Não há alterações para salvar.' }
  if (draftIssues().length) return { status: 'blocked', reason: 'A configuração ainda está incompleta.' }
  const document = cloneDocument(state.draft), baseRevision = state.baseRevision
  set({ ...state, phase: 'saving', message: 'Salvando a configuração completa na simulação…' })
  const result = await saveShowcase({ expectedRevision: baseRevision, document, actor, outcome: consumeSaveOutcome(), resolve: hasMedia })
  if (result.status === 'saved') {
    set({ ...state, stored: result.stored, draft: cloneDocument(result.stored.document), baseRevision: result.stored.revision, phase: 'saved', message: `Configuração salva na simulação local (revisão ${result.stored.revision}). ${SAVED_NOTE}`, conflictRevision: null, removedIntroduction: null })
  } else if (result.status === 'conflict') {
    set({ ...state, stored: result.current, phase: 'conflict', conflictRevision: result.current.revision, message: `A vitrine foi alterada em outra sessão simulada (revisão ${baseRevision} → ${result.current.revision}). Seu rascunho foi preservado e nada foi sobrescrito.` })
  } else if (result.status === 'uncertain') {
    await reconcile(document, baseRevision)
  } else {
    set({ ...state, phase: result.status === 'failed' ? 'failed' : 'rejected', message: result.message })
  }
  return { status: 'started' }
}

/* ---------- reload / close protection ---------- */

type UnloadTarget = { addEventListener(type: 'beforeunload', listener: (event: BeforeUnloadEvent) => void): void; removeEventListener(type: 'beforeunload', listener: (event: BeforeUnloadEvent) => void): void }

/**
 * Reload and tab-close protection follows the DRAFT, not the screen showing it:
 * editor, card editor, saved projection, draft projection or any other page of
 * this tab. Install once per tab (MockApp). In-app navigation that keeps the
 * tab memory needs no prompt; reload/close always lose it, so they ask while the
 * draft differs from the saved version. The dialog itself belongs to the browser.
 */
export function installDraftUnloadProtection(target: UnloadTarget) {
  const onBeforeUnload = (event: BeforeUnloadEvent) => {
    if (!isDraftDirty(state)) return
    event.preventDefault()
    event.returnValue = ''
  }
  target.addEventListener('beforeunload', onBeforeUnload)
  return () => target.removeEventListener('beforeunload', onBeforeUnload)
}

export function resetShowcaseStoreForChecks() {
  state = initialState()
}

// A clean editor follows saves made elsewhere (e.g. "outra sessão" simulation); a dirty draft keeps
// its base revision so that the next save conflicts instead of overwriting.
subscribeStoredShowcase(() => {
  if (busy(state) || isDraftDirty(state)) return
  const stored = readStoredShowcase()
  if (stored.revision === state.stored.revision) return
  set({ ...state, stored, draft: cloneDocument(stored.document), baseRevision: stored.revision })
})
