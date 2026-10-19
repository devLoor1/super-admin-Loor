import { useEffect, useRef, useSyncExternalStore } from 'react'
import type { WhitelabelRecord } from '../whitelabelApi'
import { getWhitelabelOperationalRunner } from './whitelabelOperationalApi'
import { describeMutationOutcome, describeReadback } from './whitelabelMutationOutcome'
import type { WhitelabelCommand } from './whitelabelCommands'
import type { SlotKey } from './whitelabelMutationRunner'

export function useWhitelabelMutation(key: SlotKey, onConfirmed?: (record: WhitelabelRecord) => void) {
  const runner = getWhitelabelOperationalRunner()
  const state = useSyncExternalStore(runner.subscribe, () => runner.view(key), () => runner.view(key))
  const refreshed = useRef<number | null>(null)
  useEffect(() => {
    const record = state.phase === 'settled' && state.outcome.state === 'confirmed' ? state.outcome.record
      : state.phase === 'verified' && state.readback === 'applied' ? state.record : null
    if (record && 'attempt' in state && refreshed.current !== state.attempt) {
      refreshed.current = state.attempt
      onConfirmed?.(record)
    }
  }, [state, onConfirmed])
  const outcome = 'outcome' in state ? describeMutationOutcome(state.outcome) : null
  const readback = state.phase === 'verified' ? describeReadback(state.command.operation, state.readback) : null
  const busy = state.phase === 'pending' || state.phase === 'checking' || state.phase === 'verifying'
  const retryReview = state.phase === 'check-failed'
    || (state.phase === 'settled' && outcome?.allowsResubmit === true)
    || (state.phase === 'verified' && readback?.allowsResubmit === true)
  return {
    state, outcome, readback, busy, retryReview, hasAttempt: state.phase !== 'idle',
    command: 'command' in state ? state.command : null,
    isBusy: runner.isBusy,
    send: (command: WhitelabelCommand) => runner.submit(command),
    verify: () => runner.verify(key),
    reset: () => runner.reset(key),
  }
}

export type WhitelabelMutation = ReturnType<typeof useWhitelabelMutation>
