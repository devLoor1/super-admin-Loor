import { useRemote } from '../../../lib/useRemoteResource'
import { getOpportunity, listOpportunities, type OpportunityDetail, type OpportunityQuery, type OpportunityRecord, type PagedResult } from './opportunityApi'

/*
 * Opportunities read hooks on the shared request model (`useRemote`): one
 * request per key, a newer key or unmount aborts the previous request, late
 * responses never overwrite current data, nothing retries automatically.
 * Keys include every query value / the record id, so a filter, page or record
 * change can never show the previous result under the new context.
 */

export function useOpportunityList(params: OpportunityQuery) {
  return useRemote<PagedResult<OpportunityRecord>>(`opportunities:${JSON.stringify(params)}`, (signal) => listOpportunities(params, signal))
}

export function useOpportunityDetail(id: string | null) {
  return useRemote<OpportunityDetail>(id ? `opportunity:${id}` : null, (signal) => getOpportunity(id!, signal))
}
