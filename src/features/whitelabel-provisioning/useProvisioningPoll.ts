import { useCallback, useEffect, useState } from 'react'
import { isAbortError } from '../../lib/api'
import { getProvisioning, isTerminalProvisioningStatus, type ProvisioningRecord } from './provisioningApi'

export const PROVISIONING_POLL_MS = 2500

export type ProvisioningBusyAction = 'retry' | 'gate' | null

/**
 * Loads `GET /whitelabel-provisionings/:id` and keeps polling every 2.5s while the
 * run is not terminal (PENDING / RUNNING). Polling stops on FAILED,
 * WAITING_MANUAL_ACTION, COMPLETED and CANCELLED, and also after a failed request
 * (no retry storm: `reload` is the explicit retry). Key the consumer by `id`.
 */
export function useProvisioningPoll(id: string) {
  const [record, setRecord] = useState<ProvisioningRecord | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [tick, setTick] = useState(0)
  const [busyAction, setBusyAction] = useState<ProvisioningBusyAction>(null)

  useEffect(() => {
    const controller = new AbortController()
    let timer: number | undefined

    const run = async () => {
      try {
        const next = await getProvisioning(id, controller.signal)
        if (controller.signal.aborted) return
        setRecord(next)
        setError(null)
        if (!isTerminalProvisioningStatus(next.status)) {
          timer = window.setTimeout(() => void run(), PROVISIONING_POLL_MS)
        }
      } catch (failure) {
        if (controller.signal.aborted || isAbortError(failure)) return
        setError(failure)
      } finally {
        if (!controller.signal.aborted) setRefreshing(false)
      }
    }
    void run()

    return () => {
      controller.abort()
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [id, tick])

  const reload = useCallback(() => {
    setRefreshing(true)
    setError(null)
    setTick((value) => value + 1)
  }, [])

  /** Shows a record already returned by a write (retry / gate) and resumes polling. */
  const applyRecord = useCallback((next: ProvisioningRecord) => {
    setRecord(next)
    setRefreshing(true)
    setTick((value) => value + 1)
  }, [])

  const loading = record === null && error === null

  return { record, error, loading, refreshing, reload, applyRecord, busyAction, setBusyAction }
}
