import type { EntrepreneurAccount, InvestorAccount } from '../../whitelabel-accounts/accountModel'
import { PROTOTYPE_ACCOUNTS } from '../../whitelabel-accounts/prototypeAccounts'
import { KYC_PENDING_SUMMARY, type KycStatus } from './operationModel'

/*
 * OPERATIONAL PARTICIPANT PROJECTIONS — Investors and Entrepreneurs as seen by
 * Operation. Each projection REFERENCES an existing Accounts prototype record
 * (identity, contact, access state, tenant) instead of copying it, and adds
 * only Operation context: a read-only KYC summary.
 *
 * - The operational id reuses the account's prototype id in V1. Whether the
 *   Backend exposes a separate investor/entrepreneur profile id is open.
 * - Every record carries its Whitelabel: no cross-tenant identity is assumed.
 * - Accounts keeps pause/reactivate in its own page state; Operation shows
 *   the prototype access state and never changes it.
 */

export type ParticipantKind = 'investor' | 'entrepreneur'

export type KycSummary = {
  status: KycStatus
  /** Illustrative; null → "—". */
  updatedAt: string | null
  pendingSummary: string
  /** Illustrative process reference owned by Compliance; null → "—". */
  reference: string | null
  /** Where the prototype status comes from (shown so it is never mistaken for Compliance truth). */
  source: string
}

type ParticipantBase<A> = {
  /** Operational id (V1: the account's prototype id). */
  id: string
  accountId: string
  whitelabelId: string
  /** Reference to the Accounts prototype record — identity is not duplicated. */
  account: A
  kyc: KycSummary
}

export type InvestorProfile = ParticipantBase<InvestorAccount> & { kind: 'investor' }
export type EntrepreneurProfile = ParticipantBase<EntrepreneurAccount> & { kind: 'entrepreneur' }
export type ParticipantProfile = InvestorProfile | EntrepreneurProfile

/* ---------- KYC prototype details (Compliance-owned context, read-only) ---------- */

type KycDetail = { updatedAt: string | null; reference: string | null; status?: KycStatus }

/**
 * Illustrative details keyed by account id. For investors the STATUS is not
 * stored here: it is derived from the account's existing "KYC" dependency in
 * Accounts, so the two screens never disagree. Entrepreneur accounts have no
 * KYC dependency in Accounts, so their prototype status is seeded here.
 */
const KYC_DETAILS: Record<string, KycDetail> = {
  inv_proto_001: { updatedAt: '2026-03-16T16:20:00-03:00', reference: 'kyc_proto_0001' },
  inv_proto_002: { updatedAt: '2026-10-02T09:15:00-03:00', reference: 'kyc_proto_0002' },
  inv_proto_003: { updatedAt: '2026-01-22T10:05:00-03:00', reference: 'kyc_proto_0003' },
  inv_proto_004: { updatedAt: '2026-04-03T11:40:00-03:00', reference: 'kyc_proto_0004' },
  inv_proto_005: { updatedAt: '2026-08-12T08:40:00-03:00', reference: 'kyc_proto_0005' },
  inv_proto_006: { updatedAt: '2026-05-20T09:30:00-03:00', reference: 'kyc_proto_0006' },
  inv_proto_007: { updatedAt: null, reference: null },
  inv_proto_008: { updatedAt: null, reference: null },
  inv_proto_009: { updatedAt: '2026-02-27T15:02:00-03:00', reference: 'kyc_proto_0009' },
  inv_proto_010: { updatedAt: '2026-10-01T07:58:00-03:00', reference: 'kyc_proto_0010' },
  inv_proto_011: { updatedAt: '2025-12-05T13:10:00-03:00', reference: 'kyc_proto_0011' },
  inv_proto_012: { updatedAt: '2026-09-29T10:33:00-03:00', reference: 'kyc_proto_0012' },
  inv_proto_013: { updatedAt: '2026-06-15T12:00:00-03:00', reference: 'kyc_proto_0013' },
  inv_proto_014: { updatedAt: '2026-05-04T09:45:00-03:00', reference: 'kyc_proto_0014' },
  inv_proto_015: { updatedAt: '2026-09-26T08:30:00-03:00', reference: 'kyc_proto_0015' },
  inv_proto_016: { updatedAt: null, reference: null },
  emp_proto_001: { status: 'approved', updatedAt: '2026-02-12T14:00:00-03:00', reference: 'kyc_proto_e001' },
  emp_proto_002: { status: 'in_review', updatedAt: '2026-09-30T16:20:00-03:00', reference: 'kyc_proto_e002' },
  emp_proto_003: { status: 'approved', updatedAt: '2026-01-10T09:10:00-03:00', reference: 'kyc_proto_e003' },
  emp_proto_004: { status: 'pending', updatedAt: null, reference: null },
  emp_proto_005: { status: 'approved', updatedAt: '2026-04-29T11:25:00-03:00', reference: 'kyc_proto_e005' },
  emp_proto_006: { status: 'in_review', updatedAt: '2026-09-29T15:45:00-03:00', reference: 'kyc_proto_e006' },
  emp_proto_007: { status: 'approved', updatedAt: '2026-03-23T10:30:00-03:00', reference: 'kyc_proto_e007' },
}

/** Accounts' KYC dependency label → Operation summary status. */
function investorKycStatus(account: InvestorAccount): KycStatus {
  const dependency = account.dependencies.find((item) => item.key === 'kyc')
  if (dependency?.status === 'complete') return 'approved'
  if (dependency?.value === 'Em análise') return 'in_review'
  return 'pending'
}

function kycSummary(accountId: string, status: KycStatus, source: string): KycSummary {
  const detail = KYC_DETAILS[accountId]
  return {
    status,
    updatedAt: detail?.updatedAt ?? null,
    reference: detail?.reference ?? null,
    pendingSummary: KYC_PENDING_SUMMARY[status],
    source,
  }
}

export const INVESTOR_PROFILES: InvestorProfile[] = PROTOTYPE_ACCOUNTS.filter(
  (account): account is InvestorAccount => account.type === 'investor',
).map((account) => ({
  kind: 'investor',
  id: account.id,
  accountId: account.id,
  whitelabelId: account.whitelabelId,
  account,
  kyc: kycSummary(account.id, investorKycStatus(account), 'Dependência “KYC” da conta (Contas, protótipo)'),
}))

export const ENTREPRENEUR_PROFILES: EntrepreneurProfile[] = PROTOTYPE_ACCOUNTS.filter(
  (account): account is EntrepreneurAccount => account.type === 'entrepreneur',
).map((account) => ({
  kind: 'entrepreneur',
  id: account.id,
  accountId: account.id,
  whitelabelId: account.whitelabelId,
  account,
  kyc: kycSummary(account.id, KYC_DETAILS[account.id]?.status ?? 'pending', 'Resumo ilustrativo de Operação (protótipo)'),
}))

export const investorById = (id: string) => INVESTOR_PROFILES.find((item) => item.id === id)
export const entrepreneurById = (id: string) => ENTREPRENEUR_PROFILES.find((item) => item.id === id)
export const entrepreneursOf = (whitelabelId: string) =>
  ENTREPRENEUR_PROFILES.filter((item) => item.whitelabelId === whitelabelId)
