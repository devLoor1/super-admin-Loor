import { assertCanEdit, type ShowcaseActor } from './showcaseAccess'
import type { SimulatedEnvironment } from './showcaseMapping'

/**
 * Tab-memory controls that make the prototype's error paths demonstrable.
 * They exist only in the mock; nothing here reaches a service or browser storage.
 * Reloading the page restores every default.
 *
 * Two kinds of control:
 * - the simulated ENVIRONMENT is a demo context selector (MOCK gallery, like the
 *   login profile): it changes which context is being looked at, never the
 *   configuration, its revision, the draft or the source defaults;
 * - the NEXT OUTCOMES change how the next save, upload or lookup behaves. They
 *   belong to the editing workflow and require the edit profile, checked here
 *   and not only by the disabled controls (mock gate, not Backend authorization).
 */

export type SaveOutcome = 'sucesso' | 'falha' | 'incerto-aplicado' | 'incerto-nao-aplicado'
export type UploadOutcome = 'sucesso' | 'falha'
export type LookupOutcome = 'normal' | 'falha' | 'inconclusiva'

export const SAVE_OUTCOME_LABELS: Record<SaveOutcome, string> = {
  sucesso: 'Sucesso',
  falha: 'Falha (nada é gravado)',
  'incerto-aplicado': 'Resultado incerto · gravação aplicada',
  'incerto-nao-aplicado': 'Resultado incerto · gravação não aplicada',
}
export const UPLOAD_OUTCOME_LABELS: Record<UploadOutcome, string> = { sucesso: 'Sucesso', falha: 'Falha simulada' }
export const LOOKUP_OUTCOME_LABELS: Record<LookupOutcome, string> = {
  normal: 'Normal (adapter existente sobre o transporte mock)',
  falha: 'Falha de consulta',
  inconclusiva: 'Busca inconclusiva',
}

type SimulationState = {
  environment: SimulatedEnvironment
  nextSave: SaveOutcome
  nextUpload: UploadOutcome
  nextLookup: LookupOutcome
}

let state: SimulationState = { environment: 'homolog', nextSave: 'sucesso', nextUpload: 'sucesso', nextLookup: 'normal' }
const listeners = new Set<() => void>()

export function getSimulation() {
  return state
}

export function subscribeSimulation(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function update(patch: Partial<SimulationState>) {
  state = { ...state, ...patch }
  listeners.forEach(listener => listener())
}

/** Demo context selector (MOCK gallery). Not a configuration write. */
export function setSimulatedEnvironment(environment: SimulatedEnvironment) {
  update({ environment })
}

export type NextOutcomes = Partial<Pick<SimulationState, 'nextSave' | 'nextUpload' | 'nextLookup'>>

/** Editing-workflow simulation: refused without the edit profile. */
export function setNextOutcomes(actor: ShowcaseActor, patch: NextOutcomes) {
  assertCanEdit(actor)
  update({
    ...(patch.nextSave ? { nextSave: patch.nextSave } : {}),
    ...(patch.nextUpload ? { nextUpload: patch.nextUpload } : {}),
    ...(patch.nextLookup ? { nextLookup: patch.nextLookup } : {}),
  })
}

/** One-shot outcomes reset to the normal path after being consumed (only inside guarded flows). */
export function consumeSaveOutcome(): SaveOutcome {
  const outcome = state.nextSave
  if (outcome !== 'sucesso') update({ nextSave: 'sucesso' })
  return outcome
}
export function consumeUploadOutcome(): UploadOutcome {
  const outcome = state.nextUpload
  if (outcome !== 'sucesso') update({ nextUpload: 'sucesso' })
  return outcome
}
export function consumeLookupOutcome(): LookupOutcome {
  const outcome = state.nextLookup
  if (outcome !== 'normal') update({ nextLookup: 'normal' })
  return outcome
}
