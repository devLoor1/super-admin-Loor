import type { StatusTone } from '../../components/ui/StatusPill'

/*
 * PROTOTYPE SETTINGS MODEL — frontend state for Whitelabel Settings V1.
 *
 * Not a backend contract. Every configurable value records whether it comes
 * from the global default or from a Whitelabel override, so the future
 * Control Plane distinction is visible. No inheritance logic runs here: the
 * default is simply shown next to the override.
 */

/** Where a value comes from. */
export type ValueSource = 'default' | 'tenant'

export type SettingValue<T> = { value: T; source: ValueSource }

/** A locally chosen file (object URL) or a bundled illustrative asset. Never uploaded. */
export type AssetRef = { url: string; name: string; local: boolean }

export type IntegrationStatus = 'configured' | 'not_configured' | 'awaiting_integration'

export type IdentitySettings = {
  logo: SettingValue<AssetRef | null>
  favicon: SettingValue<AssetRef | null>
  primaryColor: SettingValue<string>
  accentColor: SettingValue<string>
}

export type ExperienceKey =
  | 'publicName'
  | 'slogan'
  | 'institutional'
  | 'loginMessage'
  | 'emptyOpportunities'
  | 'ctaLabel'
  | 'opportunityTerm'

export type ExperienceSettings = Record<ExperienceKey, SettingValue<string>>

export type FeatureKey = 'investorProfile' | 'walletVisibility' | 'anonymousInvestmentDefault' | 'opportunityDetails'

export type FeatureSettings = Record<FeatureKey, SettingValue<boolean>>

export type TermsRevision = {
  id: string
  revision: number
  title: string
  content: string
  /** ISO timestamp (illustrative). */
  publishedAt: string
  /** True for revisions published during this session. */
  local?: boolean
}

export type TermsSettings = { current: TermsRevision | null; history: TermsRevision[] }

export type WhitelabelSettings = {
  whitelabelId: string
  identity: IdentitySettings
  experience: ExperienceSettings
  features: FeatureSettings
  terms: TermsSettings
  integrations: { smtp: IntegrationStatus }
  /** Last local save in this session (null → none). */
  lastLocalChange: string | null
}

/* ---------- Global defaults (illustrative) ---------- */

export const DEFAULT_COLORS = { primary: '#4F46E5', accent: '#14B8A6' }

/** Global default copy. `publicName` defaults to the Whitelabel name. */
export const EXPERIENCE_DEFAULTS: Record<Exclude<ExperienceKey, 'publicName'>, string> = {
  slogan: '',
  institutional: '',
  loginMessage: 'Acesse sua conta para continuar.',
  emptyOpportunities: 'Nenhuma oportunidade disponível no momento.',
  ctaLabel: 'Ver oportunidades',
  opportunityTerm: 'Oportunidades',
}

export const FEATURE_DEFAULTS: Record<FeatureKey, boolean> = {
  investorProfile: true,
  walletVisibility: true,
  anonymousInvestmentDefault: false,
  opportunityDetails: true,
}

/* ---------- Field metadata ---------- */

export const EXPERIENCE_FIELDS: {
  key: ExperienceKey
  label: string
  hint: string
  maxLength: number
  multiline?: boolean
  required?: boolean
  group: 'texts' | 'terminology'
}[] = [
  { key: 'publicName', label: 'Nome público da plataforma', hint: 'Exibido aos usuários do Whitelabel.', maxLength: 60, required: true, group: 'texts' },
  { key: 'slogan', label: 'Slogan / subtítulo', hint: 'Frase curta de apresentação.', maxLength: 80, group: 'texts' },
  { key: 'institutional', label: 'Mensagem institucional', hint: 'Texto de apresentação da plataforma.', maxLength: 280, multiline: true, group: 'texts' },
  { key: 'loginMessage', label: 'Mensagem de login', hint: 'Exibida na tela de acesso.', maxLength: 140, multiline: true, group: 'texts' },
  { key: 'emptyOpportunities', label: 'Lista de oportunidades vazia', hint: 'Exibida quando não há oportunidades.', maxLength: 140, multiline: true, group: 'texts' },
  { key: 'ctaLabel', label: 'Texto do botão principal', hint: 'Chamada para ação da página inicial.', maxLength: 40, required: true, group: 'texts' },
  { key: 'opportunityTerm', label: 'Termo para “Oportunidades”', hint: 'Nome usado para as oportunidades na plataforma.', maxLength: 30, required: true, group: 'terminology' },
]

export const FEATURES: { key: FeatureKey; label: string; description: string }[] = [
  {
    key: 'investorProfile',
    label: 'Perfil do investidor',
    description: 'Questionário e classificação de perfil disponíveis para os investidores.',
  },
  {
    key: 'walletVisibility',
    label: 'Wallet',
    description: 'Exibe a Wallet aos investidores deste Whitelabel.',
  },
  {
    key: 'anonymousInvestmentDefault',
    label: 'Investimento anônimo como padrão',
    description: 'Valor inicial da opção de investimento anônimo.',
  },
  {
    key: 'opportunityDetails',
    label: 'Informações da oportunidade',
    description: 'Exibe informações complementares das oportunidades aos investidores.',
  },
]

export const INTEGRATION_META: Record<IntegrationStatus, { label: string; tone: StatusTone }> = {
  configured: { label: 'Configurado', tone: 'success' },
  not_configured: { label: 'Não configurado', tone: 'muted' },
  awaiting_integration: { label: 'Aguardando integração', tone: 'neutral' },
}

/* ---------- Section status ---------- */

export type SectionKey = 'general' | 'identity' | 'experience' | 'features' | 'terms'

export type SectionPhase = 'idle' | 'saving' | 'saved' | 'error'

export type SectionStatus =
  | 'configured'
  | 'default'
  | 'not_configured'
  | 'dirty'
  | 'saving'
  | 'saved'
  | 'error'
  | 'awaiting_integration'
  | 'readonly'
  | 'published'

export const SECTION_STATUS_META: Record<SectionStatus, { label: string; tone: StatusTone }> = {
  configured: { label: 'Configurado', tone: 'success' },
  default: { label: 'Usando padrão', tone: 'neutral' },
  not_configured: { label: 'Não configurado', tone: 'muted' },
  dirty: { label: 'Alterado localmente', tone: 'warning' },
  saving: { label: 'Salvando…', tone: 'neutral' },
  saved: { label: 'Salvo', tone: 'success' },
  error: { label: 'Erro', tone: 'danger' },
  awaiting_integration: { label: 'Aguardando integração', tone: 'neutral' },
  readonly: { label: 'Somente leitura', tone: 'muted' },
  published: { label: 'Publicado', tone: 'success' },
}

export const SECTIONS: { key: SectionKey; label: string; anchor: string }[] = [
  { key: 'general', label: 'Geral', anchor: 'settings-general' },
  { key: 'identity', label: 'Identidade', anchor: 'settings-identity' },
  { key: 'experience', label: 'Experiência', anchor: 'settings-experience' },
  { key: 'features', label: 'Funcionalidades', anchor: 'settings-features' },
  { key: 'terms', label: 'Termos de Uso', anchor: 'settings-terms' },
]

/* ---------- Helpers ---------- */

/** Resolves the badge for a section from its resting status and local edit state. */
export function sectionStatus(status: SectionStatus, editor?: { dirty: boolean; phase: SectionPhase }): SectionStatus {
  if (!editor) return status
  if (editor.phase === 'saving') return 'saving'
  if (editor.phase === 'error') return 'error'
  if (editor.dirty) return 'dirty'
  if (editor.phase === 'saved') return 'saved'
  return status
}


export const HEX_COLOR = /^#[\da-f]{6}$/i

/** Relative luminance contrast ratio (WCAG) between two #rrggbb colours. */
export function contrastRatio(a: string, b: string) {
  const luminance = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((index) => {
      const channel = parseInt(hex.slice(index, index + 2), 16) / 255
      return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl
  }
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (high + 0.05) / (low + 0.05)
}

const DATE_TIME = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
})

/** "05/10/2026 às 14:32" (Brasília time) or null. */
export function formatDateTime(iso: string | null) {
  if (!iso) return null
  const parts = Object.fromEntries(DATE_TIME.formatToParts(new Date(iso)).map((part) => [part.type, part.value]))
  return `${parts.day}/${parts.month}/${parts.year} às ${parts.hour}:${parts.minute}`
}

/** Structural equality for plain settings drafts. */
export function sameValue(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b)
}
