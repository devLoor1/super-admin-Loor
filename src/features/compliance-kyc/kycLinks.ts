import { buildHash } from '../../app/routeQuery'
import { KYC_LIST_PATH, kycCaseHref } from './kycModel'
import { PROTOTYPE_KYC_CASES } from './prototypeKyc'

/*
 * Navigation INTO Compliance › KYC for other modules (e.g. Operação ›
 * Investidores / Empreendedores "Ver no Compliance"). Read-only lookup of the
 * case index — cases are never created or deleted in this prototype, so the
 * seeds are the complete index. Nothing here reads or changes case state.
 */

export const kycListHref = (params: { participant?: string; whitelabel?: string; status?: string } = {}) =>
  buildHash(KYC_LIST_PATH, params)

export const kycCaseIdsOfParticipant = (participantId: string) =>
  PROTOTYPE_KYC_CASES.filter((item) => item.participantId === participantId).map((item) => item.kycCaseId)

/** One case → open it directly; none or several → the KYC list filtered by the participant. */
export function kycDestinationForParticipant(participantId: string) {
  const ids = kycCaseIdsOfParticipant(participantId)
  return {
    href: ids.length === 1 ? kycCaseHref(ids[0]) : kycListHref({ participant: participantId }),
    caseCount: ids.length,
  }
}
