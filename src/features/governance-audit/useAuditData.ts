import { useRemote } from '../../lib/useRemoteResource'
import { listAuditEvents, type AuditListParams, type AuditListResult } from './auditApi'

/** `GET /audit` for the URL-backed page / search / order — one request per change, no polling. */
export function useAuditList(params: AuditListParams) {
  return useRemote<AuditListResult>(JSON.stringify(params), (signal) => listAuditEvents(params, signal))
}
