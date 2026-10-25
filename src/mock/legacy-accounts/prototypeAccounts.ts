import type {
  Account,
  AdminAccount,
  CompanyValidation,
  Dependency,
  DependencyStatus,
  EntrepreneurAccount,
  InvestorAccount,
  InvestorValidation,
} from './accountModel'

/*
 * ILLUSTRATIVE PROTOTYPE ACCOUNTS — not production data, not a backend contract.
 *
 * Names are generic, e-mails use the reserved example.com domain and
 * documents are partially masked placeholders. There are no amounts, balances
 * or counts: dependencies use semantic statuses only. Dates exist only to
 * demonstrate layout and are shown as illustrative.
 */

const dep = (key: Dependency['key'], status: DependencyStatus, value: string): Dependency => ({ key, status, value })

type InvestorSeed = {
  n: number
  wl: string
  name: string
  email: string
  doc: string
  phone: string | null
  access?: 'paused'
  validation: InvestorValidation
  classification: string | null
  questionnaire: 'completed' | 'pending'
  termsRevision: number | null
  termsAt: string | null
  kyc: [DependencyStatus, string]
  investments: boolean
  documents: boolean
  payments: boolean
  createdAt: string
  lastActivityAt: string | null
}

function investor(seed: InvestorSeed): InvestorAccount {
  const termsValue = seed.termsRevision ? `Aceitos (rev. ${seed.termsRevision})` : 'Não aceitos'
  return {
    id: `inv_proto_${String(seed.n).padStart(3, '0')}`,
    type: 'investor',
    whitelabelId: seed.wl,
    name: seed.name,
    email: seed.email,
    document: seed.doc,
    phone: seed.phone,
    accessState: seed.access === 'paused' ? 'paused' : 'active',
    createdAt: seed.createdAt,
    lastActivityAt: seed.lastActivityAt,
    validation: seed.validation,
    profile: { classification: seed.classification, questionnaire: seed.questionnaire },
    terms: { accepted: seed.termsRevision !== null, acceptedRevision: seed.termsRevision, acceptedAt: seed.termsAt },
    dependencies: [
      dep('terms', seed.termsRevision ? 'complete' : 'pending', termsValue),
      dep('profile', seed.questionnaire === 'completed' ? 'complete' : 'pending', seed.questionnaire === 'completed' ? 'Concluído' : 'Pendente'),
      dep('kyc', seed.kyc[0], seed.kyc[1]),
      dep('investments', seed.investments ? 'linked' : 'none', seed.investments ? 'Vínculos existentes' : 'Nenhum vínculo'),
      dep('documents', seed.documents ? 'complete' : 'pending', seed.documents ? 'Enviados' : 'Pendentes'),
      dep('payments', seed.payments ? 'linked' : 'none', seed.payments ? 'Histórico existente' : 'Sem histórico'),
    ],
  }
}

type EntrepreneurSeed = {
  n: number
  wl: string
  name: string
  email: string
  doc: string
  phone: string | null
  access?: 'paused'
  company: string | null
  cnpj: string | null
  validation: CompanyValidation
  opportunities: boolean
  fundraising: boolean
  documents: boolean
  bank: boolean
  createdAt: string
  lastActivityAt: string | null
}

const COMPANY_DEP: Record<CompanyValidation, [DependencyStatus, string]> = {
  validated: ['complete', 'Validada'],
  in_review: ['pending', 'Em validação'],
  incomplete: ['pending', 'Cadastro incompleto'],
}

function entrepreneur(seed: EntrepreneurSeed): EntrepreneurAccount {
  return {
    id: `emp_proto_${String(seed.n).padStart(3, '0')}`,
    type: 'entrepreneur',
    whitelabelId: seed.wl,
    name: seed.name,
    email: seed.email,
    document: seed.doc,
    phone: seed.phone,
    accessState: seed.access === 'paused' ? 'paused' : 'active',
    createdAt: seed.createdAt,
    lastActivityAt: seed.lastActivityAt,
    company: { name: seed.company, document: seed.cnpj, validation: seed.validation },
    dependencies: [
      dep('company', ...COMPANY_DEP[seed.validation]),
      dep('opportunities', seed.opportunities ? 'linked' : 'none', seed.opportunities ? 'Vínculos existentes' : 'Nenhuma'),
      dep('fundraising', seed.fundraising ? 'linked' : 'none', seed.fundraising ? 'Relacionamentos existentes' : 'Nenhum'),
      dep('documents', seed.documents ? 'complete' : 'pending', seed.documents ? 'Enviados' : 'Pendentes'),
      dep('bank', seed.bank ? 'complete' : 'pending', seed.bank ? 'Cadastrados' : 'Pendentes'),
    ],
  }
}

type AdminSeed = Pick<AdminAccount, 'role' | 'invitation'> & {
  n: number
  wl: string
  name: string
  email: string
  access?: 'paused'
  createdAt: string
  lastActivityAt: string | null
}

export function adminDependencies(invitation: AdminAccount['invitation']): Dependency[] {
  return [
    dep('scope', 'complete', 'Vinculado'),
    dep('menu', 'awaiting', 'Aguardando integração'),
    dep('records', 'awaiting', invitation === 'pending' ? 'Nenhum registro' : 'Aguardando integração'),
  ]
}

function admin(seed: AdminSeed): AdminAccount {
  return {
    id: `adm_proto_${String(seed.n).padStart(3, '0')}`,
    type: 'admin',
    whitelabelId: seed.wl,
    name: seed.name,
    email: seed.email,
    document: null,
    phone: null,
    accessState: seed.access === 'paused' ? 'paused' : 'active',
    createdAt: seed.createdAt,
    lastActivityAt: seed.lastActivityAt,
    role: seed.role,
    invitation: seed.invitation,
    dependencies: adminDependencies(seed.invitation),
  }
}

const FINAPOP = 'wl_proto_01'
const LOOR = 'wl_proto_02'
const NOVA = 'wl_proto_03'

export const PROTOTYPE_ACCOUNTS: Account[] = [
  // ---------------- Finapop · Investidores ----------------
  investor({ n: 1, wl: FINAPOP, name: 'João Carvalho', email: 'joao.carvalho@example.com', doc: '***.456.789-**', phone: '(11) •••••-5678', validation: 'approved', classification: 'Moderado', questionnaire: 'completed', termsRevision: 4, termsAt: '2026-03-15T10:24:00-03:00', kyc: ['complete', 'Verificado'], investments: true, documents: true, payments: true, createdAt: '2026-03-15T10:24:00-03:00', lastActivityAt: '2026-10-03T14:32:00-03:00' }),
  investor({ n: 2, wl: FINAPOP, name: 'Maria Silva', email: 'maria.silva@example.com', doc: '***.218.430-**', phone: '(21) •••••-1190', validation: 'manual', classification: 'Conservador', questionnaire: 'completed', termsRevision: 4, termsAt: '2026-09-28T09:10:00-03:00', kyc: ['pending', 'Em análise'], investments: false, documents: false, payments: false, createdAt: '2026-09-28T09:10:00-03:00', lastActivityAt: '2026-10-02T09:15:00-03:00' }),
  investor({ n: 3, wl: FINAPOP, name: 'Ricardo Pereira', email: 'ricardo.pereira@example.com', doc: '***.903.117-**', phone: '(31) •••••-4402', access: 'paused', validation: 'approved', classification: 'Arrojado', questionnaire: 'completed', termsRevision: 3, termsAt: '2026-01-20T16:05:00-03:00', kyc: ['complete', 'Verificado'], investments: true, documents: true, payments: true, createdAt: '2026-01-20T16:05:00-03:00', lastActivityAt: '2026-09-26T11:48:00-03:00' }),
  investor({ n: 4, wl: FINAPOP, name: 'Ana Lima', email: 'ana.lima@example.com', doc: '***.552.064-**', phone: '(11) •••••-7731', validation: 'approved', classification: 'Arrojado', questionnaire: 'completed', termsRevision: 4, termsAt: '2026-04-02T13:40:00-03:00', kyc: ['complete', 'Verificado'], investments: true, documents: true, payments: true, createdAt: '2026-04-02T13:40:00-03:00', lastActivityAt: '2026-10-01T16:48:00-03:00' }),
  investor({ n: 5, wl: FINAPOP, name: 'Fernando Santos', email: 'fernando.santos@example.com', doc: '***.371.825-**', phone: null, access: 'paused', validation: 'automatic', classification: 'Moderado', questionnaire: 'completed', termsRevision: 4, termsAt: '2026-08-11T08:22:00-03:00', kyc: ['pending', 'Em análise'], investments: false, documents: true, payments: false, createdAt: '2026-08-11T08:22:00-03:00', lastActivityAt: null }),
  investor({ n: 6, wl: FINAPOP, name: 'Carla Mendes', email: 'carla.mendes@example.com', doc: '***.684.209-**', phone: '(41) •••••-0087', validation: 'approved', classification: 'Conservador', questionnaire: 'completed', termsRevision: 4, termsAt: '2026-05-19T10:02:00-03:00', kyc: ['complete', 'Verificado'], investments: true, documents: true, payments: false, createdAt: '2026-05-19T10:02:00-03:00', lastActivityAt: '2026-10-03T11:20:00-03:00' }),
  investor({ n: 7, wl: FINAPOP, name: 'Bruno Rocha', email: 'bruno.rocha@example.com', doc: '***.140.596-**', phone: '(51) •••••-3315', validation: 'denied', classification: 'Moderado', questionnaire: 'completed', termsRevision: 4, termsAt: '2026-07-07T15:30:00-03:00', kyc: ['pending', 'Pendente'], investments: false, documents: true, payments: false, createdAt: '2026-07-07T15:30:00-03:00', lastActivityAt: '2026-09-20T18:04:00-03:00' }),
  investor({ n: 8, wl: FINAPOP, name: 'Larissa Torres', email: 'larissa.torres@example.com', doc: '***.725.338-**', phone: '(11) •••••-9024', validation: 'awaiting', classification: null, questionnaire: 'pending', termsRevision: 4, termsAt: '2026-10-02T10:05:00-03:00', kyc: ['pending', 'Não iniciado'], investments: false, documents: false, payments: false, createdAt: '2026-10-02T10:05:00-03:00', lastActivityAt: '2026-10-02T10:05:00-03:00' }),
  investor({ n: 9, wl: FINAPOP, name: 'Pedro Almeida', email: 'pedro.almeida@example.com', doc: '***.019.472-**', phone: '(19) •••••-6620', validation: 'approved', classification: 'Moderado', questionnaire: 'completed', termsRevision: 4, termsAt: '2026-02-26T12:12:00-03:00', kyc: ['complete', 'Verificado'], investments: true, documents: true, payments: true, createdAt: '2026-02-26T12:12:00-03:00', lastActivityAt: '2026-09-30T08:41:00-03:00' }),
  investor({ n: 10, wl: FINAPOP, name: 'Juliana Costa', email: 'juliana.costa@example.com', doc: '***.866.153-**', phone: '(85) •••••-2047', validation: 'automatic', classification: 'Conservador', questionnaire: 'completed', termsRevision: 4, termsAt: '2026-09-30T19:26:00-03:00', kyc: ['pending', 'Em análise'], investments: false, documents: true, payments: false, createdAt: '2026-09-30T19:26:00-03:00', lastActivityAt: '2026-10-01T07:58:00-03:00' }),
  investor({ n: 11, wl: FINAPOP, name: 'Rafael Gomes', email: 'rafael.gomes@example.com', doc: '***.497.680-**', phone: '(61) •••••-5583', validation: 'approved', classification: 'Arrojado', questionnaire: 'completed', termsRevision: 3, termsAt: '2025-12-04T14:50:00-03:00', kyc: ['complete', 'Verificado'], investments: true, documents: true, payments: true, createdAt: '2025-12-04T14:50:00-03:00', lastActivityAt: '2026-09-15T13:37:00-03:00' }),
  investor({ n: 12, wl: FINAPOP, name: 'Beatriz Nunes', email: 'beatriz.nunes@example.com', doc: '***.238.914-**', phone: '(71) •••••-8812', validation: 'manual', classification: 'Moderado', questionnaire: 'completed', termsRevision: 4, termsAt: '2026-09-22T17:14:00-03:00', kyc: ['pending', 'Em análise'], investments: false, documents: true, payments: false, createdAt: '2026-09-22T17:14:00-03:00', lastActivityAt: '2026-09-29T10:33:00-03:00' }),

  // ---------------- Finapop · Empreendedores ----------------
  entrepreneur({ n: 1, wl: FINAPOP, name: 'Lucas Martins', email: 'lucas.martins@example.com', doc: '***.612.035-**', phone: '(11) •••••-4410', company: 'Exemplo Tecnologia Ltda.', cnpj: '**.345.678/0001-**', validation: 'validated', opportunities: true, fundraising: true, documents: true, bank: true, createdAt: '2026-02-10T09:30:00-03:00', lastActivityAt: '2026-10-03T17:02:00-03:00' }),
  entrepreneur({ n: 2, wl: FINAPOP, name: 'Camila Ribeiro', email: 'camila.ribeiro@example.com', doc: '***.774.581-**', phone: '(48) •••••-2296', company: 'Exemplo Alimentos S.A.', cnpj: '**.902.114/0001-**', validation: 'in_review', opportunities: false, fundraising: false, documents: false, bank: false, createdAt: '2026-09-18T14:45:00-03:00', lastActivityAt: '2026-10-01T15:12:00-03:00' }),
  entrepreneur({ n: 3, wl: FINAPOP, name: 'Thiago Barros', email: 'thiago.barros@example.com', doc: '***.390.267-**', phone: '(27) •••••-7158', access: 'paused', company: 'Exemplo Energia Ltda.', cnpj: '**.118.540/0001-**', validation: 'validated', opportunities: true, fundraising: true, documents: true, bank: true, createdAt: '2026-01-08T11:20:00-03:00', lastActivityAt: '2026-09-12T09:44:00-03:00' }),
  entrepreneur({ n: 4, wl: FINAPOP, name: 'Patrícia Lopes', email: 'patricia.lopes@example.com', doc: '***.851.409-**', phone: null, company: null, cnpj: null, validation: 'incomplete', opportunities: false, fundraising: false, documents: false, bank: false, createdAt: '2026-10-01T18:05:00-03:00', lastActivityAt: '2026-10-01T18:05:00-03:00' }),
  entrepreneur({ n: 5, wl: FINAPOP, name: 'Gustavo Freitas', email: 'gustavo.freitas@example.com', doc: '***.205.776-**', phone: '(81) •••••-3051', company: 'Exemplo Saúde Ltda.', cnpj: '**.667.231/0001-**', validation: 'validated', opportunities: true, fundraising: false, documents: true, bank: true, createdAt: '2026-04-27T10:10:00-03:00', lastActivityAt: '2026-09-27T14:26:00-03:00' }),

  // ---------------- Finapop · Administradores ----------------
  admin({ n: 1, wl: FINAPOP, name: 'Renata Duarte', email: 'renata.duarte@example.com', role: 'tenant_admin', invitation: 'accepted', createdAt: '2025-11-03T09:00:00-03:00', lastActivityAt: '2026-10-03T18:21:00-03:00' }),
  admin({ n: 2, wl: FINAPOP, name: 'Marcelo Teixeira', email: 'marcelo.teixeira@example.com', role: 'operator', invitation: 'accepted', createdAt: '2026-03-02T13:15:00-03:00', lastActivityAt: '2026-10-02T16:09:00-03:00' }),
  admin({ n: 3, wl: FINAPOP, name: 'Sofia Azevedo', email: 'sofia.azevedo@example.com', role: 'read_only', invitation: 'pending', createdAt: '2026-09-29T11:40:00-03:00', lastActivityAt: null }),

  // ---------------- Loor ----------------
  investor({ n: 13, wl: LOOR, name: 'Eduardo Moreira', email: 'eduardo.moreira@example.com', doc: '***.331.902-**', phone: '(11) •••••-6649', validation: 'approved', classification: 'Moderado', questionnaire: 'completed', termsRevision: 2, termsAt: '2026-06-14T10:30:00-03:00', kyc: ['complete', 'Verificado'], investments: true, documents: true, payments: true, createdAt: '2026-06-14T10:30:00-03:00', lastActivityAt: '2026-10-02T12:10:00-03:00' }),
  investor({ n: 14, wl: LOOR, name: 'Vanessa Cardoso', email: 'vanessa.cardoso@example.com', doc: '***.784.150-**', phone: '(21) •••••-3378', access: 'paused', validation: 'manual', classification: 'Conservador', questionnaire: 'completed', termsRevision: 1, termsAt: '2026-05-03T15:45:00-03:00', kyc: ['pending', 'Em análise'], investments: false, documents: true, payments: false, createdAt: '2026-05-03T15:45:00-03:00', lastActivityAt: '2026-08-30T09:05:00-03:00' }),
  investor({ n: 15, wl: LOOR, name: 'Felipe Araújo', email: 'felipe.araujo@example.com', doc: '***.462.018-**', phone: null, validation: 'automatic', classification: 'Arrojado', questionnaire: 'completed', termsRevision: 2, termsAt: '2026-09-25T20:15:00-03:00', kyc: ['pending', 'Em análise'], investments: false, documents: false, payments: false, createdAt: '2026-09-25T20:15:00-03:00', lastActivityAt: '2026-09-25T20:15:00-03:00' }),
  investor({ n: 16, wl: LOOR, name: 'Aline Rocha', email: 'aline.rocha@example.com', doc: '***.597.243-**', phone: '(62) •••••-1180', validation: 'awaiting', classification: null, questionnaire: 'pending', termsRevision: 2, termsAt: '2026-10-03T08:50:00-03:00', kyc: ['pending', 'Não iniciado'], investments: false, documents: false, payments: false, createdAt: '2026-10-03T08:50:00-03:00', lastActivityAt: '2026-10-03T08:50:00-03:00' }),
  entrepreneur({ n: 6, wl: LOOR, name: 'Daniela Pires', email: 'daniela.pires@example.com', doc: '***.148.629-**', phone: '(11) •••••-5807', company: 'Exemplo Logística Ltda.', cnpj: '**.473.806/0001-**', validation: 'in_review', opportunities: false, fundraising: false, documents: true, bank: false, createdAt: '2026-09-09T10:00:00-03:00', lastActivityAt: '2026-09-30T11:30:00-03:00' }),
  entrepreneur({ n: 7, wl: LOOR, name: 'Rodrigo Campos', email: 'rodrigo.campos@example.com', doc: '***.926.384-**', phone: '(34) •••••-9962', company: 'Exemplo Agro Ltda.', cnpj: '**.285.917/0001-**', validation: 'validated', opportunities: true, fundraising: true, documents: true, bank: true, createdAt: '2026-03-21T16:40:00-03:00', lastActivityAt: '2026-10-01T10:15:00-03:00' }),
  admin({ n: 4, wl: LOOR, name: 'Helena Prado', email: 'helena.prado@example.com', role: 'tenant_admin', invitation: 'accepted', createdAt: '2026-02-01T09:00:00-03:00', lastActivityAt: '2026-10-03T09:12:00-03:00' }),
  admin({ n: 5, wl: LOOR, name: 'Otávio Lima', email: 'otavio.lima@example.com', role: 'operator', invitation: 'accepted', access: 'paused', createdAt: '2026-04-15T14:20:00-03:00', lastActivityAt: '2026-08-18T17:45:00-03:00' }),

  // ---------------- Nova Plataforma (rascunho) ----------------
  admin({ n: 6, wl: NOVA, name: 'Isabela Fonseca', email: 'isabela.fonseca@example.com', role: 'tenant_admin', invitation: 'pending', createdAt: '2026-10-04T10:30:00-03:00', lastActivityAt: null }),
]
