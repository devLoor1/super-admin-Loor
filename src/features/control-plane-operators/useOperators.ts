import { useSyncExternalStore } from 'react'
import { getSessionVersion, subscribeSession, useSessionOperator } from '../../lib/authSession'
import { useRemote } from '../../lib/useRemoteResource'
import { canReadOperators, getOperatorDetail, isOperatorId, listOperators, type OperatorQuery } from './operatorApi'

export function useOperators(query: OperatorQuery | null) {
  const session = useSyncExternalStore(subscribeSession, getSessionVersion, getSessionVersion)
  const allowed = canReadOperators(useSessionOperator()?.roles)
  const remote = useRemote(allowed && query ? `operators:${session}:${JSON.stringify(query)}` : null, signal => listOperators(query!, signal))
  return { ...remote, allowed }
}
export function useOperatorDetail(id: string) {
  const session = useSyncExternalStore(subscribeSession, getSessionVersion, getSessionVersion)
  const allowed = canReadOperators(useSessionOperator()?.roles)
  const remote = useRemote(allowed && isOperatorId(id) ? `operator:${session}:${id}` : null, signal => getOperatorDetail(id, signal))
  return { ...remote, allowed }
}
