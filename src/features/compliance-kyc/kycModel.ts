import type { StatusTone } from '../../components/ui/StatusPill'

/*
 * COMPLIANCE › KYC V1 — frontend prototype model. Not a Backend contract,
 * not an official KYC workflow, not a document store.
 *
 * - A KYC case REFERENCES an Operation participant (investor / entrepreneur,
 *   which projects an Accounts record). Name, e-mail and access state are
 *   read live from those modules and never copied or changed here.
 * - States (Pendente / Em análise / Aprovado / Reprovado) are PROTOTYPE
 *   states: there is no transition graph and no automatic transition.
 * - Evidences are illustrative METADATA only: no file, upload, camera,
 *   OCR, biometrics, document content or external storage exists.
 * - Local actions (review evidence, add / resolve / reopen a pending issue,
 *   record a decision) change only this module's in-memory session state.
 *   They never pause or activate an account, block access, change an
 *   investor / entrepreneur, an investment, an opportunity, a payment or a
 *   wallet, and they never create an Auditoria event.
 */

export type KycStatus = 'pending' | 'in_review' | 'approved' | 'rejected'

export const KYC_STATUSES: KycStatus[] = ['pending', 'in_review', 'approved', 'rejected']

export const KYC_STATUS_META: Record<KycStatus, { label: string; tone: StatusTone }> = {
  pending: { label: 'Pendente', tone: 'warning' },
  in_review: { label: 'Em análise', tone: 'neutral' },
  approved: { label: 'Aprovado', tone: 'success' },
  rejected: { label: 'Reprovado', tone: 'danger' },
}

export const kycStatusFromParam = (value: string | undefined): KycStatus | undefined =>
  KYC_STATUSES.find((status) => status === value)

export type ParticipantType = 'investor' | 'entrepreneur'

export const PARTICIPANT_TYPES: ParticipantType[] = ['investor', 'entrepreneur']

export const PARTICIPANT_TYPE_LABEL: Record<ParticipantType, string> = {
  investor: 'Investidor',
  entrepreneur: 'Empreendedor',
}

/* ---------- Evidences (metadata only) ---------- */

export type EvidenceStatus = 'pending' | 'received' | 'reviewed'

export const EVIDENCE_STATUS_META: Record<EvidenceStatus, { label: string; tone: StatusTone }> = {
  pending: { label: 'Pendente', tone: 'warning' },
  received: { label: 'Recebida', tone: 'neutral' },
  reviewed: { label: 'Revisada', tone: 'success' },
}

export type EvidenceCategory = 'identification' | 'address' | 'origin' | 'company' | 'registration' | 'additional'

export const EVIDENCE_CATEGORY_LABEL: Record<EvidenceCategory, string> = {
  identification: 'Identificação',
  address: 'Comprovante',
  origin: 'Origem de recursos',
  company: 'Empresa',
  registration: 'Cadastro',
  additional: 'Evidência adicional',
}

export type KycEvidence = {
  evidenceId: string
  label: string
  category: EvidenceCategory
  status: EvidenceStatus
  /** Opaque, illustrative reference — never a file name, URL, document number or content. */
  safeReference: string
  submittedAt: string | null
  reviewedAt: string | null
  /** Set when the review was registered locally in this browser session. */
  reviewedLocally?: boolean
}

/* ---------- Pending issues ---------- */

export type PendingIssueStatus = 'open' | 'resolved'

export const PENDING_ISSUE_STATUS_META: Record<PendingIssueStatus, { label: string; tone: StatusTone }> = {
  open: { label: 'Aberta', tone: 'warning' },
  resolved: { label: 'Resolvida', tone: 'success' },
}

export type KycPendingIssue = {
  pendingIssueId: string
  description: string
  status: PendingIssueStatus
  createdAt: string
  resolvedAt: string | null
  /** 'seed' = illustrative prototype data; 'session' = added locally in this browser session. */
  origin: 'seed' | 'session'
}

export const PENDING_ISSUE_MAX_LENGTH = 160
export const DECISION_NOTE_MAX_LENGTH = 280

/* ---------- Decision ---------- */

export type KycDecisionStatus = Extract<KycStatus, 'approved' | 'rejected'>

export type KycDecision = {
  status: KycDecisionStatus
  note: string
  decidedAt: string
  /** Display label only — never an authenticated, authoritative identity. */
  decidedBy: string
  origin: 'seed' | 'session'
}

/* ---------- Case ---------- */

export type KycCase = {
  kycCaseId: string
  participantType: ParticipantType
  /** Operation participant id (V1: the Accounts prototype id). */
  participantId: string
  /** Related Accounts record (V1: same id as the participant). */
  accountId: string
  /** The case's own tenant context; must match the participant's Whitelabel. */
  whitelabelId: string
  status: KycStatus
  evidences: readonly KycEvidence[]
  pendingIssues: readonly KycPendingIssue[]
  decision: KycDecision | null
  createdAt: string
  updatedAt: string
}

export const openIssueCount = (item: Pick<KycCase, 'pendingIssues'>) =>
  item.pendingIssues.filter((issue) => issue.status === 'open').length

export const isConcluded = (status: KycStatus) => status === 'approved' || status === 'rejected'

/* ---------- Routes owned by this module ---------- */

export const KYC_LIST_PATH = 'compliance/kyc'

export const kycCaseHref = (kycCaseId: string) => `#/compliance/kyc/${encodeURIComponent(kycCaseId)}`
