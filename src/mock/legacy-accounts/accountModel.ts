import {
  Briefcase,
  Building2,
  ClipboardList,
  FileCheck2,
  FileText,
  HandCoins,
  Landmark,
  PanelsTopLeft,
  ScanFace,
  TrendingUp,
  UserCheck,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import type { StatusTone } from '../../components/ui/StatusPill'

/*
 * PROTOTYPE ACCOUNT MODEL — frontend state for Whitelabel Account Control V1.
 *
 * Not a backend contract. Access state (Ativa / Pausada) is deliberately a
 * separate dimension from each account type's business state (Investor
 * validation, Company validation, Admin role/invitation). Pausing never
 * changes the business state and reactivating never approves anything.
 */

export type AccountType = 'investor' | 'entrepreneur' | 'admin'

export const ACCOUNT_TYPES: {
  value: AccountType
  label: string
  singular: string
  /** `?tipo=` value accepted by the route. */
  param: string
}[] = [
  { value: 'investor', label: 'Investidores', singular: 'Investidor', param: 'investidores' },
  { value: 'entrepreneur', label: 'Empreendedores', singular: 'Empreendedor', param: 'empreendedores' },
  { value: 'admin', label: 'Administradores', singular: 'Administrador', param: 'administradores' },
]

export const ACCOUNT_TYPE_LABEL = Object.fromEntries(ACCOUNT_TYPES.map((type) => [type.value, type])) as Record<
  AccountType,
  (typeof ACCOUNT_TYPES)[number]
>

export function accountTypeFromParam(param: string | null): AccountType | undefined {
  return ACCOUNT_TYPES.find((type) => type.param === param)?.value
}

/* ---------- Access state (the only state pause/reactivate changes) ---------- */

export type AccessState = 'active' | 'paused'

export const ACCESS_META: Record<AccessState, { label: string; tone: StatusTone }> = {
  active: { label: 'Ativa', tone: 'success' },
  paused: { label: 'Pausada', tone: 'warning' },
}

/* ---------- Business states (per account type, never changed by access actions) ---------- */

/** Visual tone of a business-state badge. Always paired with its text. */
export type BusinessTone = 'positive' | 'progress' | 'pending' | 'negative' | 'neutral'

export type InvestorValidation = 'awaiting' | 'automatic' | 'manual' | 'approved' | 'denied'
export type CompanyValidation = 'incomplete' | 'in_review' | 'validated'
/** Conceptual Admin role — not an implemented RBAC role. */
export type AdminRole = 'tenant_admin' | 'operator' | 'read_only'
export type AdminInvitation = 'pending' | 'accepted'

export const INVESTOR_VALIDATION_META: Record<InvestorValidation, { label: string; tone: BusinessTone }> = {
  awaiting: { label: 'Aguardando', tone: 'pending' },
  automatic: { label: 'Validação automática', tone: 'progress' },
  manual: { label: 'Validação manual', tone: 'progress' },
  approved: { label: 'Aprovada', tone: 'positive' },
  denied: { label: 'Negada', tone: 'negative' },
}

export const COMPANY_VALIDATION_META: Record<CompanyValidation, { label: string; tone: BusinessTone }> = {
  incomplete: { label: 'Cadastro incompleto', tone: 'pending' },
  in_review: { label: 'Empresa em validação', tone: 'progress' },
  validated: { label: 'Empresa validada', tone: 'positive' },
}

export const ADMIN_ROLE_META: Record<AdminRole, { label: string; description: string }> = {
  tenant_admin: { label: 'Administrador do Whitelabel', description: 'Gestão completa do Whitelabel (conceitual)' },
  operator: { label: 'Operador', description: 'Operação e atendimento de contas (conceitual)' },
  read_only: { label: 'Somente leitura', description: 'Consulta, sem alterações (conceitual)' },
}

export const ADMIN_INVITATION_META: Record<AdminInvitation, { label: string; tone: BusinessTone }> = {
  pending: { label: 'Convite pendente', tone: 'pending' },
  accepted: { label: 'Convite aceito', tone: 'positive' },
}

/* ---------- Conceptual permissions (Admins) ---------- */

export const CONCEPTUAL_PERMISSIONS: { id: string; label: string; description: string }[] = [
  { id: 'view', label: 'Visualizar', description: 'Consultar contas e dados do Whitelabel' },
  { id: 'edit', label: 'Editar', description: 'Alterar dados permitidos das contas' },
  { id: 'pause', label: 'Pausar e reativar', description: 'Controlar o acesso das contas' },
  { id: 'settings', label: 'Gerenciar configurações', description: 'Configurações do Whitelabel' },
  { id: 'resources', label: 'Gerenciar recursos', description: 'Recursos e administradores do Whitelabel' },
]

/* ---------- Dependencies (what is connected to an account) ---------- */

export type DependencyKey =
  | 'terms'
  | 'profile'
  | 'kyc'
  | 'investments'
  | 'documents'
  | 'payments'
  | 'company'
  | 'opportunities'
  | 'fundraising'
  | 'bank'
  | 'scope'
  | 'menu'
  | 'records'

/** Semantic status only — never an amount or a count. */
export type DependencyStatus = 'complete' | 'linked' | 'pending' | 'none' | 'awaiting'

export type Dependency = { key: DependencyKey; status: DependencyStatus; value: string }

export const DEPENDENCY_TONE: Record<DependencyStatus, BusinessTone> = {
  complete: 'positive',
  linked: 'progress',
  pending: 'pending',
  none: 'neutral',
  awaiting: 'neutral',
}

export const DEPENDENCY_DEFS: Record<DependencyKey, { label: string; icon: LucideIcon; impact: string }> = {
  terms: {
    label: 'Termos de uso',
    icon: FileCheck2,
    impact: 'A aceitação pertence à revisão do Whitelabel de origem; o destino pode exigir nova aceitação.',
  },
  profile: {
    label: 'Perfil do investidor',
    icon: UserCheck,
    impact: 'Classificação e questionário são globais neste protótipo; a política no destino precisa ser confirmada.',
  },
  kyc: {
    label: 'KYC',
    icon: ScanFace,
    impact: 'Verificações e provedores podem estar ligados ao Whitelabel de origem.',
  },
  investments: {
    label: 'Investimentos',
    icon: TrendingUp,
    impact: 'Investimentos e contratos mantêm a linhagem da origem; não são movidos por inferência.',
  },
  documents: {
    label: 'Documentos',
    icon: FileText,
    impact: 'Documentos enviados podem depender de configuração e armazenamento do Whitelabel.',
  },
  payments: {
    label: 'Pagamentos e Wallet',
    icon: Wallet,
    impact: 'Histórico financeiro e Wallet são registros operacionais; não há saldo editável a transferir.',
  },
  company: {
    label: 'Empresa',
    icon: Building2,
    impact: 'Dados e validação da empresa (CNPJ único) precisam de verificação no destino.',
  },
  opportunities: {
    label: 'Oportunidades',
    icon: Briefcase,
    impact: 'Oportunidades têm Whitelabel e provedores próprios; a linhagem não muda com a conta.',
  },
  fundraising: {
    label: 'Captação',
    icon: HandCoins,
    impact: 'Relacionamentos de captação e investidores vinculados exigem política definida pelo Backend.',
  },
  bank: {
    label: 'Dados bancários e Pix',
    icon: Landmark,
    impact: 'Dados bancários e chaves Pix podem estar associados a provedores do Whitelabel de origem.',
  },
  scope: {
    label: 'Escopo do Whitelabel',
    icon: Building2,
    impact: 'O administrador perde o escopo atual; permissões no destino precisam ser definidas.',
  },
  menu: {
    label: 'Configuração de menu',
    icon: PanelsTopLeft,
    impact: 'No Core, a visibilidade de menus é configurada por administrador; o comportamento no destino precisa ser definido.',
  },
  records: {
    label: 'Registros administrativos',
    icon: ClipboardList,
    impact: 'Registros criados pelo administrador permanecem ligados ao Whitelabel de origem.',
  },
}

/* ---------- Accounts ---------- */

type AccountBase = {
  /** Local prototype identifier (shown as "ID"). */
  id: string
  whitelabelId: string
  name: string
  email: string
  /** Partially masked CPF (people) — illustrative, never a real document. */
  document: string | null
  phone: string | null
  accessState: AccessState
  /** ISO timestamps; null → "—". */
  createdAt: string | null
  lastActivityAt: string | null
  dependencies: Dependency[]
  /** Set by the local "Alterar Whitelabel" simulation. No migration happens. */
  transferRequest?: { toWhitelabelId: string; requestedAt: string }
}

export type InvestorAccount = AccountBase & {
  type: 'investor'
  validation: InvestorValidation
  profile: { classification: string | null; questionnaire: 'completed' | 'pending' }
  terms: { accepted: boolean; acceptedRevision: number | null; acceptedAt: string | null }
}

export type EntrepreneurAccount = AccountBase & {
  type: 'entrepreneur'
  company: { name: string | null; document: string | null; validation: CompanyValidation }
}

export type AdminAccount = AccountBase & {
  type: 'admin'
  role: AdminRole
  invitation: AdminInvitation
}

export type Account = InvestorAccount | EntrepreneurAccount | AdminAccount

/** Session-only event log produced by the prototype (not an audit trail). */
export type AccountEvent = {
  id: string
  at: string
  kind: 'paused' | 'reactivated' | 'transfer_requested' | 'created'
  title: string
  reason?: string
}

/** Business state label + tone for the list's second state column. */
export function businessState(account: Account): { label: string; tone: BusinessTone } {
  if (account.type === 'investor') return INVESTOR_VALIDATION_META[account.validation]
  if (account.type === 'entrepreneur') return COMPANY_VALIDATION_META[account.company.validation]
  return { label: ADMIN_ROLE_META[account.role].label, tone: 'neutral' }
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return `${parts[0]?.[0] ?? ''}${parts.length > 1 ? parts.at(-1)?.[0] ?? '' : ''}`.toUpperCase()
}

const DATE_TIME = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
})

/** "05/10/2026 14:32" (Brasília time) or null. */
export function formatDateTime(iso: string | null) {
  if (!iso) return null
  const parts = Object.fromEntries(DATE_TIME.formatToParts(new Date(iso)).map((part) => [part.type, part.value]))
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`
}

/** Lower-case, accent-free text for forgiving local search. */
export const normalize = (value: string) =>
  value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
