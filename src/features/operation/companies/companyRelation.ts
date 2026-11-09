import { ApiError } from '../../../lib/api'
import type { useEntrepreneurCompany } from './useCompanyData'

export type CompanyRemote = ReturnType<typeof useEntrepreneurCompany>

/**
 * The four outcomes of `GET /entrepreneurs/:id/company`, kept distinct:
 * a Company, a confirmed absence (`data: null`), an unconfirmed Entrepreneur
 * (404 `E_ENTREPRENEUR_NOT_FOUND`) and any other failure. Only `absent` may
 * render "Sem empresa vinculada".
 */
export type CompanyRelationState = 'loading' | 'present' | 'absent' | 'entrepreneur-not-found' | 'error'

export function companyRelationState(remote: CompanyRemote): CompanyRelationState {
  if (remote.state.status === 'success') return remote.state.data ? 'present' : 'absent'
  if (remote.state.status === 'error') {
    const { error } = remote.state
    return error instanceof ApiError && error.kind === 'http' && error.status === 404 && error.code === 'E_ENTREPRENEUR_NOT_FOUND' ? 'entrepreneur-not-found' : 'error'
  }
  return 'loading'
}
