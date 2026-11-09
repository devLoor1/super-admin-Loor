import { useRemote } from '../../../lib/useRemoteResource'
import { getCompany, getEntrepreneurCompany, listCompanies, type CompanyDetail, type CompanyQuery, type CompanyRecord, type PagedResult } from './companyApi'

/*
 * Companies read hooks on the shared request model (`useRemote`): one request
 * per key, a newer key or unmount aborts the previous request, late responses
 * never overwrite current data, nothing retries automatically. Keys carry the
 * whole query / the record id — for the 0..1 relationship the key is the
 * Entrepreneur (and tenant) being shown, so a Company read for Entrepreneur A
 * can never be displayed for Entrepreneur B.
 */

export function useCompanyList(params: CompanyQuery) {
  return useRemote<PagedResult<CompanyRecord>>(`companies:${JSON.stringify(params)}`, (signal) => listCompanies(params, signal))
}

export function useCompanyDetail(id: string | null) {
  return useRemote<CompanyDetail>(id ? `company:${id}` : null, (signal) => getCompany(id!, signal))
}

/** `null` data = the Entrepreneur exists and has no Company (Backend `data: null`). */
export function useEntrepreneurCompany(entrepreneurId: string | null, whitelabelId?: string) {
  return useRemote<CompanyDetail | null>(
    entrepreneurId ? `entrepreneur-company:${entrepreneurId}:${whitelabelId ?? ''}` : null,
    (signal) => getEntrepreneurCompany(entrepreneurId!, whitelabelId, signal),
  )
}
