import { ApiError } from '../../../lib/api'
import type { WhitelabelRecord } from '../whitelabelApi'
import type { WhitelabelCommand } from './whitelabelCommands'
import {
  interpretMutationResult,
  isCommandStale,
  reconcileCreateReadback,
  reconcileNameReadback,
  type MutationOutcome,
  type MutationTransportResult,
  type ReadbackResult,
  type CreateReadback,
} from './whitelabelMutationOutcome'

/*
 * Attempt coordinator around injected ports. Operational V1 supplies the
 * narrowly guarded authenticated transport; tests supply synthetic ports.
 * Default/deployed writes remain disabled. The coordinator enforces:
 *
 * - one write at a time: a repeated click / Enter while one is checking or
 *   pending is refused (`in-flight`) — exactly one transport call;
 * - every attempt is bound to its target when it starts (`create`, or
 *   `whitelabel:<id>` from the command); selecting another Whitelabel
 *   never moves an attempt or its outcome to the new selection;
 * - responses that arrive for a superseded generation (a newer read-back,
 *   `dispose()`, a second resolution) are ignored;
 * - a name edit first re-reads the authoritative detail and stops, without
 *   sending, when the record changed since the edit started (no ETag exists);
 * - an uncertain outcome blocks any new submit of that slot until an
 *   authoritative read-back (`verify`) decides; no automatic retry, no timers.
 */

export type MutationTransport = (command: WhitelabelCommand) => Promise<MutationTransportResult>

export type ReadbackPort = Readonly<{
  /** Authoritative detail — `GET /whitelabels/:id`. */
  getWhitelabel: (id: string) => Promise<WhitelabelRecord>
  /** Complete coverage must be explicit; an incomplete page cannot prove absence. */
  findBySlug: (slug: string) => Promise<CreateReadback>
}>

export type SlotKey = 'create' | `whitelabel:${string}`

export const slotKeyFor = (command: WhitelabelCommand): SlotKey =>
  command.operation === 'create' ? 'create' : `whitelabel:${command.targetId}`

export type SlotState =
  | Readonly<{ phase: 'idle' }>
  /** Name edit only: re-reading the authoritative detail before sending. */
  | Readonly<{ phase: 'checking'; attempt: number; command: WhitelabelCommand }>
  | Readonly<{ phase: 'pending'; attempt: number; command: WhitelabelCommand }>
  /** The pre-submit read failed: nothing was sent. */
  | Readonly<{ phase: 'check-failed'; attempt: number; command: WhitelabelCommand; error: unknown }>
  | Readonly<{ phase: 'settled'; attempt: number; command: WhitelabelCommand; outcome: MutationOutcome }>
  | Readonly<{ phase: 'verifying'; attempt: number; command: WhitelabelCommand; outcome: MutationOutcome }>
  | Readonly<{ phase: 'verify-failed'; attempt: number; command: WhitelabelCommand; outcome: MutationOutcome; error: unknown }>
  | Readonly<{
      phase: 'verified'
      attempt: number
      command: WhitelabelCommand
      outcome: MutationOutcome
      readback: ReadbackResult
      record?: WhitelabelRecord
    }>

export type SubmitResult =
  | Readonly<{ accepted: true; attempt: number; slot: SlotKey; done: Promise<SlotState> }>
  | Readonly<{ accepted: false; reason: 'in-flight' | 'verify-first' | 'review-required' | 'disposed' }>

const IDLE: SlotState = Object.freeze({ phase: 'idle' })

export function createWhitelabelMutationRunner(ports: Readonly<{ transport: MutationTransport; readback: ReadbackPort }>) {
  const slots = new Map<SlotKey, SlotState>()
  const generations = new Map<SlotKey, number>()
  const listeners = new Set<() => void>()
  let selected: SlotKey | null = null
  let attempts = 0
  let inFlight: SlotKey | null = null
  let disposed = false
  let ignored = 0

  const slot = (key: SlotKey) => slots.get(key) ?? IDLE
  const generation = (key: SlotKey) => generations.get(key) ?? 0
  const bump = (key: SlotKey) => {
    const next = generation(key) + 1
    generations.set(key, next)
    return next
  }
  function set(key: SlotKey, state: SlotState) {
    slots.set(key, Object.freeze(state))
    for (const listener of listeners) listener()
  }
  /** Applies a late continuation only if its generation is still current. */
  function current(key: SlotKey, gen: number) {
    if (!disposed && generation(key) === gen) return true
    ignored += 1
    return false
  }

  function blocked(key: SlotKey): 'verify-first' | 'review-required' | null {
    const state = slot(key)
    if (state.phase === 'verifying' || state.phase === 'verify-failed') return 'verify-first'
    if (state.phase === 'settled' && state.outcome.state === 'uncertain') return 'verify-first'
    if (state.phase === 'settled' && (state.outcome.state === 'confirmed' || state.outcome.state === 'stale')) return 'review-required'
    if (state.phase === 'verified' && state.readback === 'inconclusive') return 'verify-first'
    if (state.phase === 'verified' && state.readback !== 'not-applied') return 'review-required'
    return null
  }

  async function send(key: SlotKey, gen: number, attempt: number, command: WhitelabelCommand): Promise<SlotState> {
    set(key, { phase: 'pending', attempt, command })
    let result: MutationTransportResult
    try {
      result = await ports.transport(command)
    } catch (error) {
      result = { ok: false, error }
    }
    if (inFlight === key) inFlight = null
    if (!current(key, gen)) return slot(key)
    set(key, { phase: 'settled', attempt, command, outcome: interpretMutationResult(command, result) })
    return slot(key)
  }

  async function run(key: SlotKey, gen: number, attempt: number, command: WhitelabelCommand): Promise<SlotState> {
    if (command.operation === 'create') return send(key, gen, attempt, command)
    set(key, { phase: 'checking', attempt, command })
    let latest: WhitelabelRecord
    try {
      latest = await ports.readback.getWhitelabel(command.targetId)
    } catch (error) {
      if (inFlight === key) inFlight = null
      if (!current(key, gen)) return slot(key)
      if (error instanceof ApiError && error.kind === 'http' && error.status === 404) {
        set(key, {
          phase: 'settled',
          attempt,
          command,
          outcome: Object.freeze({ operation: command.operation, targetId: command.targetId, state: 'rejected', reason: 'not-found', status: 404, fields: Object.freeze([]) }),
        })
      } else {
        set(key, { phase: 'check-failed', attempt, command, error })
      }
      return slot(key)
    }
    if (!current(key, gen)) {
      if (inFlight === key) inFlight = null
      return slot(key)
    }
    if (isCommandStale(command, latest)) {
      if (inFlight === key) inFlight = null
      set(key, { phase: 'settled', attempt, command, outcome: Object.freeze({ operation: command.operation, targetId: command.targetId, state: 'stale', latest }) })
      return slot(key)
    }
    return send(key, gen, attempt, command)
  }

  return {
    /** Starts one attempt, or refuses it. Never retries. */
    submit(command: WhitelabelCommand): SubmitResult {
      if (disposed) return Object.freeze({ accepted: false, reason: 'disposed' })
      if (inFlight !== null) return Object.freeze({ accepted: false, reason: 'in-flight' })
      const key = slotKeyFor(command)
      const refusal = blocked(key)
      if (refusal) return Object.freeze({ accepted: false, reason: refusal })
      inFlight = key
      attempts += 1
      const attempt = attempts
      const gen = bump(key)
      return Object.freeze({ accepted: true, attempt, slot: key, done: run(key, gen, attempt, command) })
    },

    /**
     * Authoritative read-back after an uncertain (or failed-check) outcome.
     * A newer call supersedes an older one still running.
     */
    async verify(key: SlotKey): Promise<SlotState> {
      const state = slot(key)
      const incomplete = state.phase === 'verified' && state.readback === 'inconclusive'
      if (disposed || (!incomplete && state.phase !== 'settled' && state.phase !== 'verifying' && state.phase !== 'verify-failed')) return state
      if (state.outcome.state !== 'uncertain') return state
      const { attempt, command, outcome } = state
      const gen = bump(key)
      set(key, { phase: 'verifying', attempt, command, outcome })
      try {
        if (command.operation === 'create') {
          const search = await ports.readback.findBySlug(command.body.slug)
          if (!current(key, gen)) return slot(key)
          const { result, record } = reconcileCreateReadback(command, search)
          set(key, { phase: 'verified', attempt, command, outcome, readback: result, record })
        } else {
          const record = await ports.readback.getWhitelabel(command.targetId)
          if (!current(key, gen)) return slot(key)
          set(key, { phase: 'verified', attempt, command, outcome, readback: reconcileNameReadback(command, record), record })
        }
      } catch (error) {
        if (!current(key, gen)) return slot(key)
        set(key, { phase: 'verify-failed', attempt, command, outcome, error })
      }
      return slot(key)
    },

    /** A fresh review cannot erase uncertainty: verify first. Never reset an in-flight write. */
    reset(key: SlotKey) {
      if (disposed || inFlight === key || blocked(key) === 'verify-first') return false
      bump(key)
      set(key, IDLE)
      return true
    },

    /** What the screen shows — always looked up by the selected target, never by "the last attempt". */
    select(key: SlotKey | null) {
      selected = key
      for (const listener of listeners) listener()
    },
    visible: (): SlotState => (selected ? slot(selected) : IDLE),
    view: slot,
    isBusy: () => inFlight !== null,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    /** Session ended / screen left: every later continuation is ignored. */
    dispose() {
      disposed = true
      listeners.clear()
    },
    /** Test introspection: continuations dropped because their generation was superseded. */
    ignoredCount: () => ignored,
  }
}

export type WhitelabelMutationRunner = ReturnType<typeof createWhitelabelMutationRunner>
