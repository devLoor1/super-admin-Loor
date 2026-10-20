import type { MenuVisibilityRead } from './menuVisibilityApi'
import { buildUpdateCandidate, interpretSaveOutcome, reconcileReadback, type ReadbackDecision, type SaveResolution, type UpdateCandidate } from './menuVisibilityUpdate'
import type { VisibilityMap } from './visibilityModel'
import { mapFrom } from './visibilityModel'

export type VisibilitySaveState = Readonly<{
  phase: 'idle' | 'saving' | 'reading' | 'settled'
  reference?: MenuVisibilityRead
  candidate?: UpdateCandidate
  result?: SaveResolution
  readback?: MenuVisibilityRead
  readError?: unknown
  decision?: ReadbackDecision
}>

/** In-memory one-attempt ledger survives ordinary page navigation; never retries a PUT.
 * Full page reload loses the ledger (not an idempotency mechanism). */
export function createVisibilitySaveCoordinator(io: {
  operatorId: string
  write: (reference: MenuVisibilityRead, draft: VisibilityMap) => Promise<unknown>
  read: () => Promise<MenuVisibilityRead>
  isCurrent: () => boolean
}) {
  let state: VisibilitySaveState = Object.freeze({ phase: 'idle' })
  let generation = 0
  const listeners = new Set<() => void>()
  const publish = (next: VisibilitySaveState) => { state = Object.freeze(next); listeners.forEach(fn => fn()) }
  async function readback() {
    if (!io.isCurrent() || !state.result || !state.reference || !state.candidate || state.phase === 'reading') return
    const attempt = ++generation
    // A previous successful GET is not a successful refresh. Do not leave it
    // selectable as the current global reference if this new read fails.
    publish({ ...state, phase: 'reading', readError: undefined, readback: undefined, decision: undefined })
    try {
      const current = await io.read()
      if (!io.isCurrent() || attempt !== generation) return
      publish({ ...state, phase: 'settled', readback: current, decision: reconcileReadback(state.candidate!, state.reference!, current, state.result!) })
    } catch (error) {
      if (io.isCurrent() && attempt === generation) publish({ ...state, phase: 'settled', readError: error, decision: state.result?.state === 'conflicted' ? 'conflicted' : 'not-confirmed' })
    }
  }
  return {
    getSnapshot: () => state,
    subscribe: (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn) } },
    async submit(reference: MenuVisibilityRead, draft: VisibilityMap) {
      if (state.phase !== 'idle' || !io.isCurrent()) return false
      const candidate = buildUpdateCandidate(reference, draft, 'edit')
      if (!candidate.valid) return false
      const original = Object.freeze({ ...reference, map: mapFrom(id => reference.map[id]), unknownIds: Object.freeze([...reference.unknownIds]) })
      const attempt = ++generation
      publish({ phase: 'saving', reference: original, candidate })
      let result: SaveResolution
      try { result = interpretSaveOutcome(candidate, { ok: true, body: await io.write(original, candidate.body.visibility) }, io.operatorId) }
      catch (error) { result = interpretSaveOutcome(candidate, { ok: false, error }) }
      if (!io.isCurrent() || attempt !== generation) return false
      publish({ ...state, result })
      await readback()
      return true
    },
    retryReadback: readback,
    /** Explicit re-review only after an authoritative read, never an automatic replay. */
    acknowledge() {
      if (state.phase !== 'settled' || !state.readback || state.readError !== undefined || !io.isCurrent()) return false
      publish({ phase: 'idle' })
      return true
    },
    invalidate() { generation++; publish({ phase: 'idle' }) },
  }
}
