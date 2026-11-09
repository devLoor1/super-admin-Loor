import { authenticatedGet } from '../../../lib/apiClient'
import { isPositiveCoreId } from '../shared/coreIds'
import { account, cents, date, id, integer, malformedOverview, mask, object, profile, records, section, text, token } from '../shared/overviewContract'

export function parseEntrepreneurOverview(value: unknown, expectedId: string) {
  if (!isPositiveCoreId(expectedId)) return malformedOverview()
  const envelope = object(value), d = object(envelope.data), cardinality = object(envelope.cardinality)
  if (cardinality.entrepreneurToCompany !== '0..1' || cardinality.companyToEntrepreneur !== '1') return malformedOverview()
  const entrepreneur = profile(d.entrepreneur, expectedId)
  // Missing Company is a malformed contract, not an authoritative absence.
  if (!Object.hasOwn(d, 'company')) return malformedOverview()
  const c = section(d.company), s = section(d.summary)
  const company = c ? { id: id(c.companyId), legalName: text(c.legalName), tradeName: text(c.tradeName), cnpjMasked: mask(c.cnpj), status: token(c.status) } : null
  const opportunities = records(d.opportunities, 50).map(r => {
    if (id(r.whitelabelId) !== entrepreneur.whitelabelId) return malformedOverview()
    return { id: id(r.id), name: text(r.name), status: token(r.status), createdAt: date(r.createdAt) }
  })
  const byStatus = s ? object(s.byStatus) : null
  const summary = s && byStatus ? { opportunitiesCount: integer(s.opportunitiesCount), activeOpportunities: integer(s.activeOpportunities), totalRaisedCents: cents(s.totalRaisedCents), byStatus: { review: integer(byStatus.review), active: integer(byStatus.active), finished: integer(byStatus.finished), archived: integer(byStatus.archived) } } : null
  if (summary && (opportunities.length > summary.opportunitiesCount || summary.activeOpportunities > summary.opportunitiesCount || Object.values(summary.byStatus).reduce((a, b) => a + b, 0) > opportunities.length)) return malformedOverview()
  return { entrepreneur, account: account(d.account), company, opportunities, summary }
}
export type EntrepreneurOverview = ReturnType<typeof parseEntrepreneurOverview>
export async function getEntrepreneurOverview(id: string, signal?: AbortSignal) {
  if (!isPositiveCoreId(id)) throw new Error('Invalid Entrepreneur identity')
  return parseEntrepreneurOverview(await authenticatedGet(`/entrepreneurs/${encodeURIComponent(id)}/overview`, { signal }), id)
}
