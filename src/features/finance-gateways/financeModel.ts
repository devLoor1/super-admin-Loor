import type { StatusTone } from '../../components/ui/StatusPill'

/*
 * PROTOTYPE FINANCE / GATEWAYS MODEL — frontend state for Finance / Gateways V1.
 *
 * Configuration only: no balances, payments, transfers or investments exist
 * here. Not a backend contract. Separate concepts:
 * - gateway configuration (provider, role, environment, active state);
 * - credential state (write-only: only "configured" + a non-secret hint);
 * - Whitelabel bank accounts (masked display data only);
 * - financial modality summary (conceptual, read-only);
 * - session activity (local feedback, never audit, never secrets).
 */

/* ---------- Gateways ---------- */

export type GatewayRole = 'primary' | 'secondary' | 'backup'
export type GatewayEnvironment = 'sandbox' | 'production'
/** Setup state of the configuration itself; `active` is tracked separately. */
export type GatewaySetup = 'configured' | 'in_setup' | 'not_configured'
/** What the UI shows: setup state, or "inactive" when deactivated. */
export type GatewayDisplayStatus = GatewaySetup | 'inactive'

export type CredentialKey = 'clientId' | 'apiKey' | 'webhookSecret' | 'accountId'

/**
 * Write-only credential state. `hint` is a non-secret display aid for
 * identifiers (last characters only); secrets never carry a hint.
 */
export type CredentialState = { configured: boolean; hint?: string }

export type ValidationResult = { result: 'success' | 'failure'; at: string; detail: string }

export type GatewayConfig = {
  id: string
  /** Illustrative provider from the prototype catalog (not a confirmed integration). */
  providerId: string
  role: GatewayRole
  environment: GatewayEnvironment
  active: boolean
  credentials: Record<CredentialKey, CredentialState>
  /** Modalities that would use this gateway (conceptual dependency). */
  modalities: ModalityId[]
  /** Illustrative link to a Whitelabel bank account (relationship unconfirmed). */
  linkedBankAccountId: string | null
  /** Last simulated validation in this session (never from a Backend). */
  lastValidation: ValidationResult | null
}

/** Editable, non-secret fields of a gateway (Visão geral). */
export type GatewayOverviewDraft = Pick<GatewayConfig, 'role' | 'environment'>

/** Editable dependencies of a gateway (Dependências). */
export type GatewayDependencyDraft = Pick<GatewayConfig, 'modalities' | 'linkedBankAccountId'>

/** Credential edit draft: new values typed now (empty = keep current). */
export type CredentialDraft = Record<CredentialKey, string>

export type ProviderMeta = { id: string; name: string; initial: string; tone: 'violet' | 'teal' | 'blue' | 'amber' }

/** ILLUSTRATIVE provider catalog — the real supported catalog depends on the Backend. */
export const PROVIDERS: ProviderMeta[] = [
  { id: 'alfa', name: 'Provedor Alfa', initial: 'A', tone: 'violet' },
  { id: 'beta', name: 'Provedor Beta', initial: 'B', tone: 'blue' },
  { id: 'gama', name: 'Provedor Gama', initial: 'G', tone: 'teal' },
  { id: 'delta', name: 'Provedor Delta', initial: 'D', tone: 'amber' },
]

export const providerOf = (id: string) => PROVIDERS.find((provider) => provider.id === id) ?? PROVIDERS[0]

export const ROLE_LABEL: Record<GatewayRole, string> = {
  primary: 'Principal',
  secondary: 'Secundário',
  backup: 'Contingência',
}

export const ENVIRONMENT_LABEL: Record<GatewayEnvironment, string> = {
  sandbox: 'Sandbox',
  production: 'Produção',
}

export const DISPLAY_STATUS_META: Record<GatewayDisplayStatus, { label: string; tone: StatusTone }> = {
  configured: { label: 'Configurado', tone: 'success' },
  in_setup: { label: 'Em configuração', tone: 'warning' },
  not_configured: { label: 'Não configurado', tone: 'muted' },
  inactive: { label: 'Inativo', tone: 'danger' },
}

export const CREDENTIAL_FIELDS: { key: CredentialKey; label: string; secret: boolean; hint: string }[] = [
  { key: 'clientId', label: 'Identificador público (client ID)', secret: false, hint: 'Identificador da integração no provedor.' },
  { key: 'apiKey', label: 'Chave de API', secret: true, hint: 'Segredo: nunca é exibido depois de salvo.' },
  { key: 'webhookSecret', label: 'Segredo do webhook', secret: true, hint: 'Segredo: nunca é exibido depois de salvo.' },
  { key: 'accountId', label: 'Identificador da conta no provedor', secret: false, hint: 'Identificador da conta, quando o provedor exigir.' },
]

/* ---------- Bank accounts ---------- */

export type BankAccountType = 'checking' | 'payment' | 'savings'
export type PixKeyType = 'cnpj' | 'email' | 'phone' | 'random'
export type BankAccountStatus = 'active' | 'inactive'

/**
 * Masked display data only. The full account number and Pix key are never
 * stored: a newly typed value is reduced to its last characters on save.
 */
export type BankAccount = {
  id: string
  bankCode: string
  agency: string
  accountLast4: string
  accountDigit: string
  type: BankAccountType
  holder: string
  pixType: PixKeyType | null
  pixHint: string | null
  status: BankAccountStatus
}

export type BankAccountDraft = {
  bankCode: string
  agency: string
  /** Full number typed now; empty keeps the current (edit only). */
  account: string
  accountDigit: string
  type: BankAccountType
  holder: string
  pixType: PixKeyType | ''
  /** Full key typed now; empty keeps the current (edit only). */
  pixKey: string
}

/** ILLUSTRATIVE banks — fictitious names and codes, not real institutions. */
export const BANKS: { code: string; name: string }[] = [
  { code: '901', name: 'Banco Exemplo' },
  { code: '902', name: 'Banco Demonstração' },
  { code: '903', name: 'Cooperativa Exemplo' },
]

export const bankName = (code: string) => BANKS.find((bank) => bank.code === code)?.name ?? `Banco ${code}`

export const ACCOUNT_TYPE_LABEL: Record<BankAccountType, string> = {
  checking: 'Conta corrente',
  payment: 'Conta de pagamento',
  savings: 'Conta poupança',
}

export const PIX_TYPE_LABEL: Record<PixKeyType, string> = {
  cnpj: 'CNPJ',
  email: 'E-mail',
  phone: 'Telefone',
  random: 'Chave aleatória',
}

export const BANK_STATUS_META: Record<BankAccountStatus, { label: string; tone: StatusTone }> = {
  active: { label: 'Ativa', tone: 'success' },
  inactive: { label: 'Inativa', tone: 'muted' },
}

/* ---------- Modalities (summary only) ---------- */

export type ModalityId = 'equity' | 'debt'
/**
 * Prototype configuration of a modality for the tenant (not a Backend flag).
 * `disabled` = disabled locally in Modalidades e regras after having been configured.
 */
export type ModalitySetting = 'enabled' | 'disabled' | 'not_configured'
export type ModalityDisplay = ModalitySetting | 'dependency_pending'

export const MODALITIES: { id: ModalityId; label: string }[] = [
  { id: 'equity', label: 'Equity' },
  { id: 'debt', label: 'Debt' },
]

export const MODALITY_DISPLAY_META: Record<ModalityDisplay, { label: string; tone: StatusTone }> = {
  enabled: { label: 'Habilitada', tone: 'success' },
  disabled: { label: 'Desabilitada', tone: 'muted' },
  not_configured: { label: 'Não configurada', tone: 'muted' },
  dependency_pending: { label: 'Dependência pendente', tone: 'warning' },
}

/* ---------- Tenant settings + activity ---------- */

export type WhitelabelFinanceSettings = {
  whitelabelId: string
  gateways: GatewayConfig[]
  bankAccounts: BankAccount[]
  modalities: Record<ModalityId, ModalitySetting>
}

export type FinanceActivityKind =
  | 'gateway_created'
  | 'gateway_updated'
  | 'credentials_updated'
  | 'validation'
  | 'gateway_activated'
  | 'gateway_deactivated'
  | 'bank_created'
  | 'bank_updated'
  | 'bank_deactivated'
  | 'bank_reactivated'
  | 'bank_removed'

/** Session-only feedback — not an audit trail. Callers must never pass secrets. */
export type FinanceActivity = {
  id: string
  kind: FinanceActivityKind
  title: string
  detail?: string
  gatewayId?: string
  at: string
}

/** Sections with local drafts tracked by the unsaved-change guard. */
export type FinanceDraftKey = 'gateway-config' | 'gateway-credentials' | 'gateway-dependencies' | 'gateway-new' | 'bank-form'

export const FINANCE_DRAFT_LABEL: Record<FinanceDraftKey, string> = {
  'gateway-config': 'Configuração do gateway',
  'gateway-credentials': 'Credenciais do gateway',
  'gateway-dependencies': 'Dependências do gateway',
  'gateway-new': 'Novo gateway',
  'bank-form': 'Conta bancária',
}

/** Drafts that belong to the selected gateway (switching gateway would drop them). */
export const GATEWAY_DRAFT_KEYS: FinanceDraftKey[] = ['gateway-config', 'gateway-credentials', 'gateway-dependencies']

/* ---------- Helpers ---------- */

export function credentialsComplete(gateway: GatewayConfig) {
  return CREDENTIAL_FIELDS.every((field) => gateway.credentials[field.key].configured)
}

export function missingCredentials(gateway: GatewayConfig) {
  return CREDENTIAL_FIELDS.filter((field) => !gateway.credentials[field.key].configured)
}

/** Setup state derived from the credential state (local rule of the prototype). */
export function setupOf(gateway: GatewayConfig): GatewaySetup {
  const configured = CREDENTIAL_FIELDS.filter((field) => gateway.credentials[field.key].configured).length
  if (configured === CREDENTIAL_FIELDS.length) return 'configured'
  return configured === 0 ? 'not_configured' : 'in_setup'
}

export function displayStatusOf(gateway: GatewayConfig): GatewayDisplayStatus {
  return gateway.active ? setupOf(gateway) : 'inactive'
}

/** A modality the tenant enabled needs at least one active gateway serving it. */
export function modalityDisplay(settings: WhitelabelFinanceSettings, id: ModalityId): ModalityDisplay {
  const setting = settings.modalities[id]
  if (setting !== 'enabled') return setting
  const served = settings.gateways.some((gateway) => gateway.active && gateway.modalities.includes(id))
  return served ? 'enabled' : 'dependency_pending'
}

export function maskedAccount(account: BankAccount) {
  return `•••• ${account.accountLast4}${account.accountDigit ? `-${account.accountDigit}` : ''}`
}

/** Reduces a typed identifier/key to a non-secret display hint (last characters). */
export function hintOf(value: string, keep = 4) {
  const compact = value.replace(/\s/g, '')
  return compact.slice(-keep)
}

/** Masked display of a Pix key, computed once from the typed value (the key itself is not kept). */
export function maskPix(type: PixKeyType, value: string) {
  const key = value.trim()
  if (type === 'email') {
    const [local = '', domain = ''] = key.split('@')
    return `${local.charAt(0)}•••@${domain}`
  }
  const digits = key.replace(/\D/g, '')
  if (type === 'cnpj') return `••.•••.•••/${digits.slice(8, 12)}-••`
  if (type === 'phone') return `(••) •••••-${digits.slice(-4)}`
  return `••••${key.replace(/\s/g, '').slice(-4)}`
}

export function validateCredentials(draft: CredentialDraft) {
  const errors: Record<string, string> = {}
  for (const field of CREDENTIAL_FIELDS) {
    const value = draft[field.key]
    if (!value) continue
    if (/\s/.test(value)) errors[field.key] = 'Não use espaços.'
    else if (value.length < (field.secret ? 12 : 4))
      errors[field.key] = `Use pelo menos ${field.secret ? 12 : 4} caracteres.`
  }
  return errors
}

export function validateBankAccount(draft: BankAccountDraft, editing: boolean) {
  const errors: Record<string, string> = {}
  if (!draft.bankCode) errors.bankCode = 'Selecione o banco.'
  if (!/^\d{4}$/.test(draft.agency.trim())) errors.agency = 'Use 4 dígitos.'
  const account = draft.account.replace(/\D/g, '')
  if (!editing || draft.account) {
    if (account.length < 4 || account.length > 12 || /[^\d\s.-]/.test(draft.account))
      errors.account = 'Use de 4 a 12 dígitos.'
  }
  if (!/^[\dxX]$/.test(draft.accountDigit.trim())) errors.accountDigit = 'Use 1 dígito (ou X).'
  const holder = draft.holder.trim()
  if (!holder) errors.holder = 'Informe o titular.'
  else if (holder.length > 80) errors.holder = 'Use no máximo 80 caracteres.'
  if (draft.pixType && (!editing || draft.pixKey) && draft.pixKey.trim().length < 5) errors.pixKey = 'Informe a chave Pix.'
  return errors
}

const TIME = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })

/** "14:32" (Brasília time) for session-local entries. */
export function formatTime(iso: string) {
  return TIME.format(new Date(iso))
}
