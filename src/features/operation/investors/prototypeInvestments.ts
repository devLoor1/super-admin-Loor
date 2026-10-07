/*
 * ILLUSTRATIVE, READ-ONLY INVESTMENT ASSOCIATIONS — Operation UX only.
 *
 * Each entry only says "this investor account has a relationship with this
 * opportunity" (both referenced by id). There are NO amounts, balances,
 * returns, payments or wallet data, nothing here can be created or changed,
 * and this is not a financial source of truth: Financeiro › Investimentos
 * will own investments. Associations exist only for investor accounts whose
 * Accounts "Investimentos" dependency is "Vínculos existentes", and point to
 * non-draft opportunities of the SAME Whitelabel.
 */

export type InvestmentAssociation = {
  /** Local prototype id. */
  id: string
  investorId: string
  opportunityId: string
  /** Illustrative reference date; null → "—". */
  registeredAt: string | null
}

export const PROTOTYPE_INVESTMENT_ASSOCIATIONS: InvestmentAssociation[] = [
  { id: 'inv_rel_proto_001', investorId: 'inv_proto_001', opportunityId: 'opp_proto_001', registeredAt: '2026-08-04T10:12:00-03:00' },
  { id: 'inv_rel_proto_002', investorId: 'inv_proto_001', opportunityId: 'opp_proto_002', registeredAt: '2026-09-02T15:40:00-03:00' },
  { id: 'inv_rel_proto_003', investorId: 'inv_proto_001', opportunityId: 'opp_proto_003', registeredAt: '2026-09-28T09:05:00-03:00' },
  { id: 'inv_rel_proto_004', investorId: 'inv_proto_003', opportunityId: 'opp_proto_004', registeredAt: '2026-06-17T11:30:00-03:00' },
  { id: 'inv_rel_proto_005', investorId: 'inv_proto_004', opportunityId: 'opp_proto_001', registeredAt: '2026-08-19T14:22:00-03:00' },
  { id: 'inv_rel_proto_006', investorId: 'inv_proto_004', opportunityId: 'opp_proto_004', registeredAt: '2026-07-08T16:48:00-03:00' },
  { id: 'inv_rel_proto_007', investorId: 'inv_proto_006', opportunityId: 'opp_proto_003', registeredAt: '2026-09-30T08:15:00-03:00' },
  { id: 'inv_rel_proto_008', investorId: 'inv_proto_009', opportunityId: 'opp_proto_002', registeredAt: '2026-09-11T13:02:00-03:00' },
  { id: 'inv_rel_proto_009', investorId: 'inv_proto_009', opportunityId: 'opp_proto_005', registeredAt: '2026-05-26T10:40:00-03:00' },
  { id: 'inv_rel_proto_010', investorId: 'inv_proto_011', opportunityId: 'opp_proto_001', registeredAt: '2026-08-30T17:20:00-03:00' },
  { id: 'inv_rel_proto_011', investorId: 'inv_proto_011', opportunityId: 'opp_proto_008', registeredAt: '2026-04-14T09:55:00-03:00' },
  { id: 'inv_rel_proto_012', investorId: 'inv_proto_013', opportunityId: 'opp_proto_009', registeredAt: '2026-09-21T11:10:00-03:00' },
  { id: 'inv_rel_proto_013', investorId: 'inv_proto_013', opportunityId: 'opp_proto_010', registeredAt: '2026-09-25T16:35:00-03:00' },
]

export const associationsOf = (investorId: string) =>
  PROTOTYPE_INVESTMENT_ASSOCIATIONS.filter((item) => item.investorId === investorId)
