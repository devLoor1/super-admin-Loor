import type { StatusTone } from '../../components/ui/StatusPill'

/*
 * PROTOTYPE E-MAIL MODEL — frontend state for Whitelabel E-mails V1.
 *
 * Not a backend contract. Three separate concepts:
 * - SMTP: how the Whitelabel sends e-mail (server + sender);
 * - automatic events: when the platform sends specific e-mails;
 * - templates: what those e-mails contain (summary only in V1).
 *
 * The SMTP secret is write-only: the model only knows whether one is
 * configured (`secretConfigured`). A newly typed password lives in the edit
 * draft until save/discard and is never stored, logged or shown.
 */

export type SmtpSecurity = 'starttls' | 'ssl_tls'

export type SmtpStatus = 'configured' | 'not_configured'

export type SmtpSettings = {
  host: string
  port: number | null
  security: SmtpSecurity
  username: string
  /** Whether a secret exists. The secret itself is never readable. */
  secretConfigured: boolean
  senderEmail: string
  senderName: string
  status: SmtpStatus
}

/** Edit draft: port as typed text and an optional new (write-only) password. */
export type SmtpDraft = Omit<SmtpSettings, 'port' | 'status' | 'secretConfigured'> & {
  port: string
  newPassword: string
}

export type EmailEventId =
  | 'registrationCompleted'
  | 'passwordRecovery'
  | 'investmentEquity'
  | 'investmentDebt'
  | 'accountApproved'
  | 'termsUpdated'

/** UI organisation labels only (not a Backend taxonomy). */
export type EmailEventCategory = 'onboarding' | 'security' | 'investments' | 'operational' | 'compliance'

/**
 * pending — Product requirement; Backend implementation pending until validated.
 * unconfirmed — desired event concept; no confirmed Backend-configurable flag.
 */
export type EmailEventBackendStatus = 'pending' | 'unconfirmed'

export type EmailEventPreference = {
  id: EmailEventId
  label: string
  description: string
  category: EmailEventCategory
  enabled: boolean
  backendStatus: EmailEventBackendStatus
  /** Central Product requirement for E-mails V1 (Equity / Debt confirmations). */
  productRequirement: boolean
}

export type TemplateSummary = {
  /** Templates are not editable yet; every event uses the platform's default model. */
  source: 'platform_default'
}

export type EmailActivityKind = 'smtp' | 'test' | 'event_enabled' | 'event_disabled'

/** Session-only feedback of this prototype — not an audit trail. Never holds secrets. */
export type EmailActivity = {
  id: string
  kind: EmailActivityKind
  title: string
  detail?: string
  /** ISO timestamp of the local action in this session. */
  at: string
}

export type WhitelabelEmailSettings = {
  whitelabelId: string
  smtp: SmtpSettings
  eventPreferences: EmailEventPreference[]
  templateSummary: TemplateSummary
}

/** Sections with local drafts tracked by the page's unsaved-change guard. */
export type EmailSectionKey = 'smtp' | 'events'

export const EMAIL_SECTION_LABEL: Record<EmailSectionKey, string> = {
  smtp: 'SMTP',
  events: 'Envios automáticos',
}

/** Optional `?section=` of the E-mails route (focuses that card). */
export type EmailsSection = 'smtp' | 'envios' | 'templates'

export function emailsSectionFromParam(value: string | null): EmailsSection | undefined {
  return value === 'smtp' || value === 'envios' || value === 'templates' ? value : undefined
}

/* ---------- Vocabulary ---------- */

export const SECURITY_OPTIONS: { value: SmtpSecurity; label: string; hint: string }[] = [
  { value: 'starttls', label: 'TLS (STARTTLS)', hint: 'Normalmente porta 587.' },
  { value: 'ssl_tls', label: 'SSL/TLS implícito', hint: 'Normalmente porta 465.' },
]

export const SECURITY_LABEL: Record<SmtpSecurity, string> = {
  starttls: 'TLS (STARTTLS)',
  ssl_tls: 'SSL/TLS implícito',
}

export const CATEGORY_META: Record<
  EmailEventCategory,
  { label: string; tone: 'blue' | 'violet' | 'teal' | 'amber' | 'plum' }
> = {
  onboarding: { label: 'Onboarding', tone: 'blue' },
  security: { label: 'Segurança', tone: 'violet' },
  investments: { label: 'Investimentos', tone: 'teal' },
  operational: { label: 'Operacional', tone: 'amber' },
  compliance: { label: 'Compliance', tone: 'plum' },
}

export const BACKEND_STATUS_META: Record<EmailEventBackendStatus, { label: string; tone: StatusTone }> = {
  pending: { label: 'Backend pendente', tone: 'warning' },
  unconfirmed: { label: 'Backend não confirmado', tone: 'muted' },
}

/** Event definitions (copy + classification). Per-tenant data only sets `enabled`. */
export const EMAIL_EVENTS: Omit<EmailEventPreference, 'enabled'>[] = [
  {
    id: 'registrationCompleted',
    label: 'Cadastro concluído',
    description: 'Quando o usuário conclui o cadastro na plataforma.',
    category: 'onboarding',
    backendStatus: 'unconfirmed',
    productRequirement: false,
  },
  {
    id: 'passwordRecovery',
    label: 'Recuperação de senha',
    description: 'Quando o usuário solicita a redefinição de senha.',
    category: 'security',
    backendStatus: 'unconfirmed',
    productRequirement: false,
  },
  {
    id: 'investmentEquity',
    label: 'Investimento em Equity',
    description: 'Após a confirmação de um investimento em Equity.',
    category: 'investments',
    backendStatus: 'pending',
    productRequirement: true,
  },
  {
    id: 'investmentDebt',
    label: 'Investimento em Debt',
    description: 'Após a confirmação de um investimento em Debt.',
    category: 'investments',
    backendStatus: 'pending',
    productRequirement: true,
  },
  {
    id: 'accountApproved',
    label: 'Conta aprovada',
    description: 'Quando a validação da conta do usuário é aprovada.',
    category: 'operational',
    backendStatus: 'unconfirmed',
    productRequirement: false,
  },
  {
    id: 'termsUpdated',
    label: 'Termos atualizados',
    description: 'Quando uma nova revisão dos Termos de Uso é publicada para este Whitelabel.',
    category: 'compliance',
    backendStatus: 'unconfirmed',
    productRequirement: false,
  },
]

export const SMTP_FIELD_LABEL: Record<Exclude<keyof SmtpDraft, 'newPassword'>, string> = {
  host: 'Host',
  port: 'Porta',
  security: 'Segurança',
  username: 'Usuário',
  senderEmail: 'Remetente',
  senderName: 'Nome de exibição',
}

/* ---------- Helpers ---------- */

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const HOST_PATTERN = /^(?=.{1,253}$)([a-z\d]([a-z\d-]{0,61}[a-z\d])?)(\.[a-z\d]([a-z\d-]{0,61}[a-z\d])?)+$/i

export function toSmtpDraft(smtp: SmtpSettings): SmtpDraft {
  return {
    host: smtp.host,
    port: smtp.port === null ? '' : String(smtp.port),
    security: smtp.security,
    username: smtp.username,
    senderEmail: smtp.senderEmail,
    senderName: smtp.senderName,
    newPassword: '',
  }
}

/** Frontend-only checks (required fields, port range, e-mail/host format). No connectivity test. */
export function validateSmtp(draft: SmtpDraft, secretConfigured: boolean) {
  const errors: Record<string, string> = {}
  const host = draft.host.trim()
  if (!host) errors.host = 'Informe o host do servidor SMTP.'
  else if (!HOST_PATTERN.test(host)) errors.host = 'Use um nome de host válido, por exemplo smtp.exemplo.com.'
  const port = draft.port.trim()
  if (!port) errors.port = 'Informe a porta.'
  else if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) errors.port = 'Use um número entre 1 e 65535.'
  if (!draft.username.trim()) errors.username = 'Informe o usuário de autenticação.'
  if (!secretConfigured && !draft.newPassword) errors.newPassword = 'Informe a senha de autenticação.'
  const sender = draft.senderEmail.trim()
  if (!sender) errors.senderEmail = 'Informe o e-mail remetente.'
  else if (!EMAIL_PATTERN.test(sender)) errors.senderEmail = 'Use um e-mail válido, por exemplo nao-responda@exemplo.com.'
  const name = draft.senderName.trim()
  if (!name) errors.senderName = 'Informe o nome de exibição.'
  else if (name.length > 60) errors.senderName = 'Use no máximo 60 caracteres.'
  return errors
}

/** Labels of the fields changed by a save (never values; the password is only "Senha"). */
export function changedSmtpFields(before: SmtpSettings, draft: SmtpDraft) {
  const previous = toSmtpDraft(before)
  const fields = (Object.keys(SMTP_FIELD_LABEL) as (keyof typeof SMTP_FIELD_LABEL)[])
    .filter((key) => previous[key].trim() !== draft[key].trim())
    .map((key) => SMTP_FIELD_LABEL[key])
  if (draft.newPassword) fields.push('Senha')
  return fields
}

/** "Host, Porta e Senha" */
export function joinLabels(labels: string[]) {
  if (labels.length <= 1) return labels.join('')
  return `${labels.slice(0, -1).join(', ')} e ${labels[labels.length - 1]}`
}

const TIME = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })

/** "14:32" (Brasília time) for session-local entries. */
export function formatTime(iso: string) {
  return TIME.format(new Date(iso))
}
