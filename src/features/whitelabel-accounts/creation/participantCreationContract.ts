import { ApiError } from '../../../lib/api'
import type { AccountDetail } from '../accountsApi'

export type ParticipantKind = 'investor' | 'entrepreneur'
export type InvestorPersonType = 'pessoa_fisica' | 'pessoa_juridica'
export type ParticipantDraft = { full_name: string; email: string; phone: string; investor_type: InvestorPersonType }
export type ParticipantErrors = Partial<Record<keyof ParticipantDraft | 'form', string>>
export type ParticipantPayload = { fullName: string; email: string; phone: string; type?: InvestorPersonType }
export const EMPTY_PARTICIPANT: Readonly<ParticipantDraft> = Object.freeze({ full_name: '', email: '', phone: '', investor_type: 'pessoa_fisica' })
export const participantLabel = (kind: ParticipantKind) => kind === 'investor' ? 'investidor' : 'empreendedor'
export const participantPath = (kind: ParticipantKind) => kind === 'investor' ? 'investors' : 'entrepreneurs'
const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const badReceipt = () => new ApiError(201, {}, { kind: 'malformed' })

/** Adapted presentation validation; formatting remains in the draft, not the wire payload. */
export function participantInput(kind: ParticipantKind, draft: ParticipantDraft): { payload: ParticipantPayload; errors: ParticipantErrors } {
  const fullName = draft.full_name.trim().replace(/\s+/g, ' '), email = draft.email.trim().toLowerCase()
  const phone = draft.phone.trim().replace(/[\s().-]/g, ''), errors: ParticipantErrors = {}
  if (fullName.length < 3 || fullName.length > 256) errors.full_name = 'Informe um nome entre 3 e 256 caracteres.'
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Informe um e-mail válido.'
  if (!/^\+?\d{5,18}$/.test(phone)) errors.phone = 'Informe um telefone válido, entre 5 e 18 dígitos.'
  if (kind === 'investor' && !['pessoa_fisica', 'pessoa_juridica'].includes(draft.investor_type)) errors.investor_type = 'Selecione o tipo de investidor.'
  return { payload: { fullName, email, phone, ...(kind === 'investor' ? { type: draft.investor_type } : {}) }, errors }
}

export type ParticipantReceipt = { id: string; kind: ParticipantKind; whitelabelId: string; sent: boolean; businessState: 'waiting' | 'incomplete'; createdAt: string }
/** Recover only a trustworthy scoped identifier before validating the rest of the receipt. */
export function returnedParticipantId(raw: unknown, tenant: string, kind: ParticipantKind): string | undefined {
  if (!object(raw) || !object(raw.data)) return undefined
  const d = raw.data
  return d.whitelabelId === Number(tenant) && d.kind === kind && typeof d.id === 'number' && Number.isSafeInteger(d.id) && d.id > 0 ? String(d.id) : undefined
}
export function participantReceipt(raw: unknown, tenant: string, kind: ParticipantKind, payload: ParticipantPayload): ParticipantReceipt {
  const id = returnedParticipantId(raw, tenant, kind)
  if (!id || !object(raw) || !object(raw.data)) throw badReceipt()
  const d = raw.data, business = kind === 'investor' ? 'waiting' : 'incomplete'
  if (d.email !== payload.email || d.fullName !== payload.fullName || d.phone !== payload.phone || d.businessState !== business || d.emailVerifiedAt !== null || d.personalInformationFilled !== false || typeof d.setPasswordEmailSent !== 'boolean' || typeof d.createdAt !== 'string' || !Number.isFinite(Date.parse(d.createdAt))) throw badReceipt()
  if (kind === 'investor' && (d.investorType !== payload.type || d.termsRevisionId !== null || d.termsAcceptedAt !== null)) throw badReceipt()
  // No raw response, password, link, token or omitted Entrepreneur Terms field is retained.
  return { id, kind, whitelabelId: tenant, sent: d.setPasswordEmailSent, businessState: business, createdAt: d.createdAt }
}
export function matchesParticipant(detail: AccountDetail, tenant: string, kind: ParticipantKind, payload: ParticipantPayload) {
  return detail.kind === kind && detail.record.whitelabelId === tenant && detail.record.email === payload.email && detail.record.fullName === payload.fullName && 'phone' in detail.record && detail.record.phone === payload.phone && (detail.kind !== 'investor' || detail.record.investorType === payload.type)
}
export function resendReceipt(raw: unknown, kind: ParticipantKind, id: string): boolean {
  if (!object(raw) || !object(raw.data) || raw.data.kind !== kind || raw.data.accountId !== Number(id) || raw.data.alreadyVerified !== false || typeof raw.data.setPasswordEmailSent !== 'boolean') throw new ApiError(200, {}, { kind: 'malformed' })
  return raw.data.setPasswordEmailSent
}
