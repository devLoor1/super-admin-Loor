import { ApiError } from '../../lib/api'
import { authenticatedGet } from '../../lib/apiClient'
import { isPositiveCoreId } from '../operation/shared/coreIds'
import type { StatusTone } from '../../components/ui/StatusPill'

/** FaceMatch-backed Investor cases, not a global inventory of every KYC validation. GET only. */
export const KYC_READ_PAGE_SIZE = 20
export const isKycReadId = isPositiveCoreId
export type KycReadRow = {
  id: string; status: string; investorId: string | null; investorName: string | null
  whitelabelId: string | null; faceMatchStatus: string | null; updatedAt: string | null
}
export type KycReadPage = { rows: KycReadRow[]; page: number; perPage: number; total: number; lastPage: number }
type StatusSection = { status: string | null }
export type KycReadDetail = {
  id: string; status: string
  investor: { id: string; fullName: string | null; whitelabelId: string | null; documentMasked: string | null } | null
  whitelabelId: string | null
  personalDataValidation: StatusSection | null
  document: { type: string | null; status: string | null; validation: string | null; submittedAt: string | null } | null
  ocr: { status: string | null; ticketPresent: boolean | null } | null
  bureau: { status: string | null; result: string | null; consultedAt: string | null; documentMasked: string | null } | null
  faceMatch: { status: string | null; ticketPresent: boolean | null; submittedAt: string | null; processedAt: string | null } | null
  history: { event: string; status: string | null; createdAt: string | null }[] | null
}

const fail = (): never => { throw new ApiError(200, {}, { kind: 'malformed' }) }
const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const requiredObject = (v: unknown) => record(v) ? v : fail()
const section = (v: unknown) => v == null ? null : requiredObject(v)
const integer = (v: unknown, min: number) => typeof v === 'number' && Number.isSafeInteger(v) && v >= min ? v : fail()
const id = (v: unknown) => String(integer(v, 1))
const nullableId = (v: unknown) => v == null ? null : id(v)
const token = (v: unknown) => typeof v === 'string' && /^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(v) ? v : null
const requiredToken = (v: unknown) => token(v) ?? fail()
const boolean = (v: unknown) => typeof v === 'boolean' ? v : null

/** Names only; no contacts, free-form provider text or raw identifier passthrough. */
export function kycReadName(v: unknown) {
  if (typeof v !== 'string' || !v.trim() || v.length > 512) return null
  return v.trim().replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b|\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, '[documento oculto]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[contato oculto]')
}
export function kycReadMask(v: unknown) {
  if (v == null) return null
  // Only already-masked document syntax; never reconstruct a raw document into a safe-looking field.
  return typeof v === 'string' && v.length <= 32 && /^[\d.*•/ -]+$/.test(v) && /[*•]/.test(v) && (v.match(/\d/g)?.length ?? 0) <= 7 ? v : null
}
export function kycReadDate(v: unknown) {
  if (typeof v !== 'string') return null
  const parts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|([+-])(\d{2}):(\d{2}))$/.exec(v)
  if (!parts) return null
  const [, y, m, d, h, minute, second, , oh = '0', om = '0'] = parts
  const days = new Date(Date.UTC(Number(y), Number(m), 0)).getUTCDate()
  return Number(m) >= 1 && Number(m) <= 12 && Number(d) >= 1 && Number(d) <= days && Number(h) <= 23 && Number(minute) <= 59 && Number(second) <= 59 && Number(oh) <= 23 && Number(om) <= 59 && Number.isFinite(Date.parse(v)) ? v : null
}
export function parseKycReadRow(value: unknown): KycReadRow {
  const r = requiredObject(value)
  return { id: id(r.id), status: requiredToken(r.status), investorId: nullableId(r.investorId),
    investorName: kycReadName(r.investorName), whitelabelId: nullableId(r.whitelabelId),
    faceMatchStatus: token(r.faceMatchStatus), updatedAt: kycReadDate(r.updatedAt) }
}
export function parseKycReadPage(value: unknown, requestedPage: number, perPage = KYC_READ_PAGE_SIZE): KycReadPage {
  const b = requiredObject(value), m = requiredObject(b.meta)
  if (!Array.isArray(b.data)) return fail()
  const page = integer(m.page, 1), size = integer(m.perPage, 1), total = integer(m.total, 0), lastPage = integer(m.lastPage, 1)
  if (page !== requestedPage || size !== perPage || size > 100 || lastPage !== Math.max(1, Math.ceil(total / size))) return fail()
  const rows = b.data.map(parseKycReadRow)
  const expectedCount = Math.min(size, Math.max(0, total - (page - 1) * size))
  if (rows.length !== expectedCount || new Set(rows.map(r => r.id)).size !== rows.length) return fail()
  return { rows, page, perPage: size, total, lastPage }
}
export function parseKycReadDetail(value: unknown, expectedId: string): KycReadDetail {
  const b = requiredObject(value), d = requiredObject(b.data)
  const caseId = id(d.id)
  if (!isKycReadId(expectedId) || caseId !== expectedId) return fail()
  const inv = section(d.investor), wl = section(d.whitelabel)
  const personal = section(d.personalDataValidation), doc = section(d.document), ocr = section(d.ocr)
  const bureau = section(d.bureau), face = section(d.faceMatch)
  const investor = inv ? { id: id(inv.id), fullName: kycReadName(inv.fullName), whitelabelId: nullableId(inv.whitelabelId), documentMasked: kycReadMask(inv.documentMasked) } : null
  const whitelabelId = wl ? id(wl.id) : null
  if (investor && investor.whitelabelId !== whitelabelId) return fail()
  if (d.history != null && (!Array.isArray(d.history) || d.history.length > 100)) return fail()
  return {
    id: caseId, status: requiredToken(d.status), investor, whitelabelId,
    personalDataValidation: personal ? { status: token(personal.status) } : null,
    document: doc ? { type: token(doc.type), status: token(doc.status), validation: token(doc.validation), submittedAt: kycReadDate(doc.submittedAt) } : null,
    ocr: ocr ? { status: token(ocr.status), ticketPresent: boolean(ocr.ticketPresent) } : null,
    bureau: bureau ? { status: token(bureau.status), result: token(bureau.result), consultedAt: kycReadDate(bureau.consultedAt), documentMasked: kycReadMask(bureau.documentMasked) } : null,
    faceMatch: face ? { status: token(face.status), ticketPresent: boolean(face.ticketPresent), submittedAt: kycReadDate(face.submittedAt), processedAt: kycReadDate(face.processedAt) } : null,
    history: Array.isArray(d.history) ? d.history.map(entry => {
      const h = requiredObject(entry)
      return { event: requiredToken(h.event), status: token(h.status), createdAt: kycReadDate(h.createdAt) }
    }) : null,
  }
}
export async function listKycReadCases(page: number, signal?: AbortSignal) {
  integer(page, 1)
  return parseKycReadPage(await authenticatedGet('/compliance/kyc', { query: { page, perPage: KYC_READ_PAGE_SIZE }, signal }), page)
}
export async function getKycReadCase(caseId: string, signal?: AbortSignal) {
  if (!isKycReadId(caseId)) throw new ApiError(404, { code: 'INVALID_KYC_ID' })
  return parseKycReadDetail(await authenticatedGet(`/compliance/kyc/${encodeURIComponent(caseId)}`, { signal }), caseId)
}
const META: Record<string, { label: string; tone: StatusTone }> = {
  pending: { label: 'Pendente', tone: 'warning' }, approved: { label: 'Aprovado', tone: 'success' },
  rejected: { label: 'Reprovado', tone: 'danger' }, unknown: { label: 'Desconhecido', tone: 'muted' },
  submitted: { label: 'Enviado', tone: 'neutral' }, missing: { label: 'Ausente', tone: 'warning' },
  processed: { label: 'Processado', tone: 'neutral' }, not_available: { label: 'Não disponível', tone: 'muted' },
}
export function kycReadStatus(value: string | null): { label: string; tone: StatusTone } {
  return value && Object.hasOwn(META, value) ? META[value] : { label: value ? 'Status não reconhecido' : 'Não informado', tone: 'muted' }
}
export const kycReadHistoryLabel = (event: string) => event === 'FACE_MATCH_UPDATED' ? 'Face Match atualizado' : event === 'BUREAU_KYC_VERIFIED' ? 'Verificação KYC do bureau registrada' : 'Evento registrado (tipo não reconhecido)'
