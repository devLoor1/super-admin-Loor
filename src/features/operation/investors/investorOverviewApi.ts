import { authenticatedGet } from '../../../lib/apiClient'
import { isPositiveCoreId } from '../shared/coreIds'
import { account, bool, cents, date, id, integer, malformedOverview, mask, object, profile, records, section, text, token } from '../shared/overviewContract'

export function parseInvestorOverview(value: unknown, expectedId: string) {
  if (!isPositiveCoreId(expectedId)) return malformedOverview()
  const d = object(object(value).data), investor = profile(d.investor, expectedId)
  const p = section(d.personalData), k = section(d.kyc), bureau = section(k?.bureau), face = section(k?.faceMatch), s = section(d.summary)
  const investments = records(d.recentInvestments, 10).map(r => ({ id: id(r.id), status: token(r.status), opportunityId: r.opportunityId == null ? null : id(r.opportunityId), opportunityName: text(r.opportunityName), amountCents: cents(r.amountCents), createdAt: date(r.createdAt) }))
  const payments = records(d.recentPayments, 10).map(r => ({ id: id(r.id), status: token(r.status), amountCents: cents(r.amountCents), paymentAt: date(r.paymentAt) }))
  const w = section(d.wallet), b = section(w?.balance)
  if (w && id(w.whitelabelId) !== investor.whitelabelId) return malformedOverview()
  // A wallet exists only with proven Whitelabel ownership, BRL and integer centavos.
  if (b && (id(b.whitelabelId) !== investor.whitelabelId || b.ownerType !== 'whitelabel' || id(b.ownerId) !== investor.whitelabelId || b.currency !== 'BRL')) return malformedOverview()
  if (w && (!Array.isArray(w.recentMovements) || w.recentMovements.length > 5)) return malformedOverview()
  const balanceCents = b?.authoritativeBalanceCents == null ? null : typeof b.authoritativeBalanceCents === 'number' && Number.isSafeInteger(b.authoritativeBalanceCents) ? b.authoritativeBalanceCents : malformedOverview()
  const wallet = w && b ? { id: id(b.id), whitelabelId: investor.whitelabelId, balanceCents, updatedAt: date(b.balanceTimestamp), movements: (w.recentMovements as unknown[]).map(value => {
    const r = object(value)
    if (r.currency !== 'BRL' || (r.kind !== 'in' && r.kind !== 'out')) return malformedOverview()
    return { kind: r.kind, amountCents: integer(r.amountCents), date: date(r.date) }
  }) } : null
  const summary = s ? { investmentsCount: integer(s.investmentsCount), investedAmountCents: cents(s.investedAmountCents), paymentsCount: integer(s.paymentsCount) } : null
  if (summary && (investments.length > summary.investmentsCount || payments.length > summary.paymentsCount)) return malformedOverview()
  return { investor: { ...investor, documentMasked: mask(object(d.investor).documentMasked) }, account: account(d.account), personalData: p ? { investorType: token(p.investorType), personalInformationFilled: bool(p.personalInformationFilled) } : null,
    kyc: k ? { status: token(k.status), bureau: bureau ? { status: token(bureau.status), verifiedAt: date(bureau.verifiedAt) } : null, faceMatch: face ? { id: face.id == null ? null : id(face.id), status: token(face.status), submittedAt: date(face.submittedAt), processedAt: date(face.processedAt) } : null } : null,
    summary, investments, payments, wallet }
}
export type InvestorOverview = ReturnType<typeof parseInvestorOverview>
export async function getInvestorOverview(id: string, signal?: AbortSignal) {
  if (!isPositiveCoreId(id)) throw new Error('Invalid Investor identity')
  return parseInvestorOverview(await authenticatedGet(`/investors/${encodeURIComponent(id)}/overview`, { signal }), id)
}
