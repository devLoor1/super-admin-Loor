import { useSyncExternalStore } from 'react'
import { getSessionVersion, subscribeSession } from '../../lib/authSession'
import { useRemote } from '../../lib/useRemoteResource'
import { listAuditEvents, type AuditListParams, type AuditListResult } from './auditApi'

/** GET for validated URL filters, tied to this session; null means no request. */
export function useAuditList(params: AuditListParams | null) {
  const version = useSyncExternalStore(subscribeSession, getSessionVersion, getSessionVersion)
  return useRemote<AuditListResult>(params ? `${version}:${JSON.stringify(params)}` : null, (signal) => listAuditEvents(params!, signal))
}
