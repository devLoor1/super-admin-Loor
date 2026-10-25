import { useSyncExternalStore } from 'react'
import { getSessionVersion, subscribeSession, useSessionOperator } from '../../lib/authSession'
import { useRemote } from '../../lib/useRemoteResource'
import { canReadSmtp, getSmtpRead, isSmtpTenantId } from './smtpReadApi'

export function useSmtpRead(id: string | null) {
  const session = useSyncExternalStore(subscribeSession, getSessionVersion, getSessionVersion)
  const allowed = canReadSmtp(useSessionOperator()?.roles)
  return useRemote(allowed && id && isSmtpTenantId(id) ? `smtp:${session}:${id}` : null, signal => getSmtpRead(id!, signal))
}
