import { buildHash } from '../../app/routeQuery'
import { KYC_LIST_PATH } from './kycModel'

/*
 * Navigation INTO authoritative KYC never resolves a participant through the
 * historical prototype index. A real FaceMatch association must come from an API.
 */

export const kycListHref = (params: { participant?: string; whitelabel?: string; status?: string } = {}) =>
  buildHash(KYC_LIST_PATH, params)

export const kycCaseIdsOfParticipant = (_participantId: string): string[] => []

/** A profile id is not a FaceMatch case id. No authoritative association is loaded here. */
export function kycDestinationForParticipant(_participantId: string) {
  return {
    href: kycListHref(),
    caseCount: null,
  }
}
