import type {
  EvidenceCategory,
  EvidenceStatus,
  KycCase,
  KycDecision,
  KycEvidence,
  KycPendingIssue,
  ParticipantType,
} from './kycModel'

/*
 * ILLUSTRATIVE KYC CASES — not production data, not a Backend contract.
 *
 * - Every case references an existing Operation participant (Accounts
 *   prototype record). Names / e-mails are NOT stored here.
 * - The current case of each participant matches the Operation KYC summary
 *   (status, last update and process reference `kyc_proto_…`). Two
 *   participants also have an earlier, concluded case (`kyc_proto_01…` /
 *   `kyc_proto_e1…`), so "Ver no Compliance" can open the list filtered by
 *   participant. Participants whose Accounts KYC dependency is "Não iniciado"
 *   have no case.
 * - Evidences are metadata only: opaque references, no file, no content,
 *   no document number. Dates are illustrative.
 * - Frozen: the session store copies them and never writes back.
 */

const FINAPOP = 'wl_proto_01'
const LOOR = 'wl_proto_02'
const ANALYST = 'Analista Compliance (ilustrativo)'

const EVIDENCE_LABEL: Record<ParticipantType, Partial<Record<EvidenceCategory, string>>> = {
  investor: {
    identification: 'Documento de identificação',
    address: 'Comprovante de endereço',
    origin: 'Declaração de origem de recursos',
    additional: 'Documento complementar',
  },
  entrepreneur: {
    identification: 'Documento do representante legal',
    company: 'Contrato social',
    registration: 'Comprovante de inscrição (CNPJ)',
    additional: 'Documento complementar',
  },
}

const iso = (value: string) => `${value}:00-03:00`

type EvidenceSeed = [EvidenceCategory, EvidenceStatus, string?, string?]
type IssueSeed = [string, 'open' | 'resolved', string, string?]

type CaseSeed = {
  id: string
  type: ParticipantType
  participant: string
  wl: string
  status: KycCase['status']
  created: string
  updated: string
  evidences: EvidenceSeed[]
  issues?: IssueSeed[]
  decision?: { status: KycDecision['status']; note: string }
}

function buildCase(seed: CaseSeed): KycCase {
  const suffix = seed.id.replace('kyc_proto_', '').toUpperCase()
  const evidences: KycEvidence[] = seed.evidences.map(([category, status, submitted, reviewed], index) => {
    const number = String(index + 1).padStart(2, '0')
    return {
      evidenceId: `EV-${suffix}-${number}`,
      label: EVIDENCE_LABEL[seed.type][category] ?? 'Evidência',
      category,
      status,
      safeReference: `REF-${suffix}-${number}`,
      submittedAt: submitted ? iso(submitted) : null,
      reviewedAt: reviewed ? iso(reviewed) : null,
    }
  })
  const pendingIssues: KycPendingIssue[] = (seed.issues ?? []).map(([description, status, created, resolved], index) => ({
    pendingIssueId: `PI-${suffix}-${String(index + 1).padStart(2, '0')}`,
    description,
    status,
    createdAt: iso(created),
    resolvedAt: resolved ? iso(resolved) : null,
    origin: 'seed',
  }))
  return {
    kycCaseId: seed.id,
    participantType: seed.type,
    participantId: seed.participant,
    accountId: seed.participant,
    whitelabelId: seed.wl,
    status: seed.status,
    evidences,
    pendingIssues,
    decision: seed.decision
      ? { status: seed.decision.status, note: seed.decision.note, decidedAt: iso(seed.updated), decidedBy: ANALYST, origin: 'seed' }
      : null,
    createdAt: iso(seed.created),
    updatedAt: iso(seed.updated),
  }
}

/** Recursively frozen: nothing in the app can write to a seed. */
function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach(deepFreeze)
    Object.freeze(value)
  }
  return value
}

const APPROVED_NOTE = 'Documentação conferida no protótipo (exemplo ilustrativo).'

const SEEDS: CaseSeed[] = [
  /* ---------------- Finapop · Investidores ---------------- */
  {
    id: 'kyc_proto_0001', type: 'investor', participant: 'inv_proto_001', wl: FINAPOP, status: 'approved',
    created: '2026-03-15T11:00', updated: '2026-03-16T16:20',
    evidences: [
      ['identification', 'reviewed', '2026-03-15T11:02', '2026-03-16T15:50'],
      ['address', 'reviewed', '2026-03-15T11:05', '2026-03-16T16:02'],
      ['origin', 'reviewed', '2026-03-15T11:10', '2026-03-16T16:10'],
    ],
    issues: [['Confirmar origem dos recursos declarada', 'resolved', '2026-03-15T14:00', '2026-03-16T16:05']],
    decision: { status: 'approved', note: APPROVED_NOTE },
  },
  {
    id: 'kyc_proto_0102', type: 'investor', participant: 'inv_proto_002', wl: FINAPOP, status: 'rejected',
    created: '2026-09-28T09:30', updated: '2026-09-30T11:18',
    evidences: [
      ['identification', 'reviewed', '2026-09-28T09:35', '2026-09-30T11:00'],
      ['address', 'reviewed', '2026-09-28T09:36', '2026-09-30T11:05'],
    ],
    issues: [['Documento de identificação ilegível', 'open', '2026-09-30T11:10']],
    decision: { status: 'rejected', note: 'Documento de identificação ilegível; nova submissão tratada em outro caso.' },
  },
  {
    id: 'kyc_proto_0002', type: 'investor', participant: 'inv_proto_002', wl: FINAPOP, status: 'in_review',
    created: '2026-10-01T09:00', updated: '2026-10-02T09:15',
    evidences: [
      ['identification', 'received', '2026-10-01T09:05'],
      ['address', 'reviewed', '2026-10-01T09:06', '2026-10-02T09:10'],
      ['additional', 'pending'],
    ],
    issues: [
      ['Validar legibilidade do novo documento de identificação', 'open', '2026-10-02T09:12'],
      ['Enviar documento complementar solicitado', 'open', '2026-10-02T09:15'],
    ],
  },
  {
    id: 'kyc_proto_0003', type: 'investor', participant: 'inv_proto_003', wl: FINAPOP, status: 'approved',
    created: '2026-01-20T16:30', updated: '2026-01-22T10:05',
    evidences: [
      ['identification', 'reviewed', '2026-01-20T16:35', '2026-01-22T09:40'],
      ['address', 'reviewed', '2026-01-20T16:38', '2026-01-22T09:52'],
    ],
    decision: { status: 'approved', note: APPROVED_NOTE },
  },
  {
    id: 'kyc_proto_0004', type: 'investor', participant: 'inv_proto_004', wl: FINAPOP, status: 'approved',
    created: '2026-04-02T14:00', updated: '2026-04-03T11:40',
    evidences: [
      ['identification', 'reviewed', '2026-04-02T14:04', '2026-04-03T11:20'],
      ['address', 'reviewed', '2026-04-02T14:06', '2026-04-03T11:28'],
      ['origin', 'reviewed', '2026-04-02T14:10', '2026-04-03T11:35'],
    ],
    decision: { status: 'approved', note: APPROVED_NOTE },
  },
  {
    id: 'kyc_proto_0005', type: 'investor', participant: 'inv_proto_005', wl: FINAPOP, status: 'in_review',
    created: '2026-08-11T08:40', updated: '2026-08-12T08:40',
    evidences: [
      ['identification', 'reviewed', '2026-08-11T08:44', '2026-08-12T08:30'],
      ['address', 'received', '2026-08-11T08:46'],
      ['origin', 'received', '2026-08-11T08:50'],
    ],
    issues: [['Confirmar endereço informado no cadastro', 'open', '2026-08-12T08:38']],
  },
  {
    id: 'kyc_proto_0006', type: 'investor', participant: 'inv_proto_006', wl: FINAPOP, status: 'approved',
    created: '2026-05-19T10:20', updated: '2026-05-20T09:30',
    evidences: [
      ['identification', 'reviewed', '2026-05-19T10:24', '2026-05-20T09:10'],
      ['address', 'reviewed', '2026-05-19T10:26', '2026-05-20T09:18'],
    ],
    decision: { status: 'approved', note: APPROVED_NOTE },
  },
  {
    id: 'kyc_proto_0007', type: 'investor', participant: 'inv_proto_007', wl: FINAPOP, status: 'pending',
    created: '2026-09-20T18:00', updated: '2026-09-20T18:10',
    evidences: [
      ['identification', 'pending'],
      ['address', 'pending'],
    ],
    issues: [
      ['Aguardando envio do documento de identificação', 'open', '2026-09-20T18:08'],
      ['Aguardando envio do comprovante de endereço', 'open', '2026-09-20T18:10'],
    ],
  },
  {
    id: 'kyc_proto_0009', type: 'investor', participant: 'inv_proto_009', wl: FINAPOP, status: 'approved',
    created: '2026-02-26T12:30', updated: '2026-02-27T15:02',
    evidences: [
      ['identification', 'reviewed', '2026-02-26T12:34', '2026-02-27T14:40'],
      ['address', 'reviewed', '2026-02-26T12:37', '2026-02-27T14:55'],
    ],
    decision: { status: 'approved', note: APPROVED_NOTE },
  },
  {
    id: 'kyc_proto_0010', type: 'investor', participant: 'inv_proto_010', wl: FINAPOP, status: 'in_review',
    created: '2026-09-30T19:40', updated: '2026-10-01T07:58',
    evidences: [
      ['identification', 'received', '2026-09-30T19:44'],
      ['address', 'received', '2026-09-30T19:47'],
    ],
    issues: [['Divergência no nome informado no cadastro', 'open', '2026-10-01T07:58']],
  },
  {
    id: 'kyc_proto_0011', type: 'investor', participant: 'inv_proto_011', wl: FINAPOP, status: 'approved',
    created: '2025-12-04T15:10', updated: '2025-12-05T13:10',
    evidences: [
      ['identification', 'reviewed', '2025-12-04T15:14', '2025-12-05T12:50'],
      ['address', 'reviewed', '2025-12-04T15:16', '2025-12-05T13:00'],
    ],
    decision: { status: 'approved', note: APPROVED_NOTE },
  },
  {
    id: 'kyc_proto_0012', type: 'investor', participant: 'inv_proto_012', wl: FINAPOP, status: 'in_review',
    created: '2026-09-22T17:30', updated: '2026-09-29T10:33',
    evidences: [
      ['identification', 'reviewed', '2026-09-22T17:34', '2026-09-29T10:20'],
      ['address', 'received', '2026-09-29T10:25'],
      ['origin', 'received', '2026-09-22T17:40'],
    ],
    issues: [
      ['Comprovante de endereço desatualizado', 'resolved', '2026-09-25T09:00', '2026-09-29T10:30'],
      ['Confirmar origem dos recursos declarada', 'open', '2026-09-29T10:33'],
    ],
  },
  /* ---------------- Finapop · Empreendedores ---------------- */
  {
    id: 'kyc_proto_e001', type: 'entrepreneur', participant: 'emp_proto_001', wl: FINAPOP, status: 'approved',
    created: '2026-02-10T09:45', updated: '2026-02-12T14:00',
    evidences: [
      ['identification', 'reviewed', '2026-02-10T09:50', '2026-02-12T13:20'],
      ['company', 'reviewed', '2026-02-10T09:55', '2026-02-12T13:35'],
      ['registration', 'reviewed', '2026-02-10T10:00', '2026-02-12T13:50'],
    ],
    decision: { status: 'approved', note: APPROVED_NOTE },
  },
  {
    id: 'kyc_proto_e002', type: 'entrepreneur', participant: 'emp_proto_002', wl: FINAPOP, status: 'in_review',
    created: '2026-09-18T15:00', updated: '2026-09-30T16:20',
    evidences: [
      ['identification', 'reviewed', '2026-09-18T15:05', '2026-09-30T16:00'],
      ['company', 'received', '2026-09-18T15:10'],
      ['registration', 'pending'],
    ],
    issues: [
      ['Contrato social sem a última alteração', 'open', '2026-09-30T16:10'],
      ['Aguardando comprovante de inscrição (CNPJ)', 'open', '2026-09-30T16:20'],
    ],
  },
  {
    id: 'kyc_proto_e003', type: 'entrepreneur', participant: 'emp_proto_003', wl: FINAPOP, status: 'approved',
    created: '2026-01-08T11:40', updated: '2026-01-10T09:10',
    evidences: [
      ['identification', 'reviewed', '2026-01-08T11:45', '2026-01-10T08:40'],
      ['company', 'reviewed', '2026-01-08T11:50', '2026-01-10T08:55'],
      ['registration', 'reviewed', '2026-01-08T11:52', '2026-01-10T09:05'],
    ],
    decision: { status: 'approved', note: APPROVED_NOTE },
  },
  {
    id: 'kyc_proto_e004', type: 'entrepreneur', participant: 'emp_proto_004', wl: FINAPOP, status: 'pending',
    created: '2026-10-01T18:15', updated: '2026-10-01T18:20',
    evidences: [
      ['identification', 'pending'],
      ['company', 'pending'],
      ['registration', 'pending'],
    ],
    issues: [
      ['Cadastro da empresa incompleto', 'open', '2026-10-01T18:16'],
      ['Aguardando documento do representante legal', 'open', '2026-10-01T18:18'],
      ['Aguardando documentos da empresa', 'open', '2026-10-01T18:20'],
    ],
  },
  {
    id: 'kyc_proto_e005', type: 'entrepreneur', participant: 'emp_proto_005', wl: FINAPOP, status: 'approved',
    created: '2026-04-27T10:30', updated: '2026-04-29T11:25',
    evidences: [
      ['identification', 'reviewed', '2026-04-27T10:34', '2026-04-29T10:50'],
      ['company', 'reviewed', '2026-04-27T10:38', '2026-04-29T11:05'],
      ['registration', 'reviewed', '2026-04-27T10:40', '2026-04-29T11:15'],
    ],
    issues: [['Confirmar quadro societário informado', 'resolved', '2026-04-28T09:00', '2026-04-29T11:10']],
    decision: { status: 'approved', note: APPROVED_NOTE },
  },
  /* ---------------- Loor ---------------- */
  {
    id: 'kyc_proto_0013', type: 'investor', participant: 'inv_proto_013', wl: LOOR, status: 'approved',
    created: '2026-06-14T10:45', updated: '2026-06-15T12:00',
    evidences: [
      ['identification', 'reviewed', '2026-06-14T10:50', '2026-06-15T11:30'],
      ['address', 'reviewed', '2026-06-14T10:52', '2026-06-15T11:45'],
    ],
    decision: { status: 'approved', note: APPROVED_NOTE },
  },
  {
    id: 'kyc_proto_0014', type: 'investor', participant: 'inv_proto_014', wl: LOOR, status: 'in_review',
    created: '2026-05-03T16:00', updated: '2026-05-04T09:45',
    evidences: [
      ['identification', 'received', '2026-05-03T16:05'],
      ['address', 'received', '2026-05-03T16:07'],
    ],
    issues: [['Validar documento de identificação enviado', 'open', '2026-05-04T09:45']],
  },
  {
    id: 'kyc_proto_0015', type: 'investor', participant: 'inv_proto_015', wl: LOOR, status: 'in_review',
    created: '2026-09-25T20:30', updated: '2026-09-26T08:30',
    evidences: [
      ['identification', 'received', '2026-09-25T20:34'],
      ['address', 'pending'],
    ],
    issues: [['Aguardando envio do comprovante de endereço', 'open', '2026-09-26T08:30']],
  },
  {
    id: 'kyc_proto_e106', type: 'entrepreneur', participant: 'emp_proto_006', wl: LOOR, status: 'rejected',
    created: '2026-09-09T10:20', updated: '2026-09-12T16:40',
    evidences: [
      ['identification', 'reviewed', '2026-09-09T10:25', '2026-09-12T16:10'],
      ['company', 'reviewed', '2026-09-09T10:30', '2026-09-12T16:25'],
    ],
    issues: [
      ['Divergência entre contrato social e cadastro', 'open', '2026-09-12T16:30'],
      ['Documento do representante legal fora da validade', 'open', '2026-09-12T16:35'],
    ],
    decision: { status: 'rejected', note: 'Documentos da empresa divergentes do cadastro (exemplo ilustrativo).' },
  },
  {
    id: 'kyc_proto_e006', type: 'entrepreneur', participant: 'emp_proto_006', wl: LOOR, status: 'in_review',
    created: '2026-09-15T10:00', updated: '2026-09-29T15:45',
    evidences: [
      ['identification', 'reviewed', '2026-09-15T10:05', '2026-09-29T15:20'],
      ['company', 'received', '2026-09-15T10:10'],
      ['registration', 'received', '2026-09-15T10:12'],
      ['additional', 'received', '2026-09-29T15:30'],
    ],
    issues: [['Confirmar quadro societário informado', 'open', '2026-09-29T15:45']],
  },
  {
    id: 'kyc_proto_e007', type: 'entrepreneur', participant: 'emp_proto_007', wl: LOOR, status: 'approved',
    created: '2026-03-21T17:00', updated: '2026-03-23T10:30',
    evidences: [
      ['identification', 'reviewed', '2026-03-21T17:05', '2026-03-23T10:00'],
      ['company', 'reviewed', '2026-03-21T17:10', '2026-03-23T10:15'],
      ['registration', 'reviewed', '2026-03-21T17:12', '2026-03-23T10:25'],
    ],
    decision: { status: 'approved', note: APPROVED_NOTE },
  },
]

export const PROTOTYPE_KYC_CASES: readonly KycCase[] = deepFreeze(SEEDS.map(buildCase))
