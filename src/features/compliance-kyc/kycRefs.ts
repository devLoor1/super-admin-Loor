import { buildHash } from '../../app/routeQuery'
import { getOperator } from '../../lib/authSession'
import { ACCESS_META } from '../whitelabel-accounts/accountModel'
import { accountsHref, formatDateTime } from '../operation/shared/operationModel'
import { entrepreneurById, investorById } from '../operation/shared/participants'
import type { KycCase, ParticipantType } from './kycModel'

/*
 * Read-only resolution of the references a KYC case carries (Operation
 * participant → Accounts record) and of destinations in other modules.
 * Values are read live and never copied into, or written from, a case.
 */

export type ResolvedParticipant = {
  found: boolean
  name: string
  email: string
  /** Company of an entrepreneur account, when informed. */
  company: string | null
  accessLabel: string | null
  accessTone: 'success' | 'warning' | null
}

export function resolveParticipant(item: Pick<KycCase, 'participantType' | 'participantId'>): ResolvedParticipant {
  const profile = item.participantType === 'investor' ? investorById(item.participantId) : entrepreneurById(item.participantId)
  if (!profile) {
    return { found: false, name: 'Participante não encontrado', email: '—', company: null, accessLabel: null, accessTone: null }
  }
  const access = ACCESS_META[profile.account.accessState]
  return {
    found: true,
    name: profile.account.name,
    email: profile.account.email,
    company: profile.kind === 'entrepreneur' ? profile.account.company.name : null,
    accessLabel: `Conta ${access.label.toLowerCase()}`,
    accessTone: profile.account.accessState === 'active' ? 'success' : 'warning',
  }
}

export const participantProfileHref = (type: ParticipantType, participantId: string) =>
  `#/operation/${type === 'investor' ? 'investors' : 'entrepreneurs'}/${encodeURIComponent(participantId)}`

/** Existing tenant Accounts screen with the participant's type tab (no per-account deep link exists). */
export const participantAccountHref = (item: Pick<KycCase, 'whitelabelId' | 'participantType'>) =>
  accountsHref(item.whitelabelId, item.participantType)

/** Auditoria prefiltered by this case. Navigation only: it never creates an Auditoria event. */
export const auditHrefForCase = (kycCaseId: string) => buildHash('audit', { resourceType: 'kyc_case', resourceId: kycCaseId })

export const kycDateText = (iso: string | null | undefined) => formatDateTime(iso ?? null) ?? '—'

/** Display label of the local, non-authoritative actor of a session decision. */
export function localActorLabel() {
  const name = getOperator()?.name?.trim() || 'Super Admin'
  return `${name} · sessão local (não autoritativo)`
}
