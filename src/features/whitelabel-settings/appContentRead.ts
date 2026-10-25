import { businessText } from '../operation/shared/businessPresentation'

// Field metadata adapted directly from the qualified Admin V1 contracts. No consumer fallback values.
export const APP_ENTRY_GROUPS = [
  {
    id: "login",
    label: "Login",
    description: "Ações textuais de acesso, recuperação e criação de conta.",
    fields: [
      { key: "submitLabel", label: "Ação principal", kind: "short", maxLength: 60 },
      { key: "recoverPasswordLabel", label: "Ação de recuperação", kind: "short", maxLength: 80 },
      { key: "registrationPrompt", label: "Convite para cadastro", kind: "short", maxLength: 100 },
      { key: "registrationActionLabel", label: "Ação de cadastro", kind: "short", maxLength: 60 },
    ],
  },
  {
    id: "registration",
    label: "Cadastro inicial",
    description: "Criação pública da conta: títulos e apoio editorial das etapas de dados e senha.",
    fields: [
      { key: "detailsTitle", label: "Título da etapa de dados", kind: "short", maxLength: 80 },
      { key: "fullNameHelper", label: "Ajuda do nome completo", kind: "long", maxLength: 160 },
      { key: "detailsContinueLabel", label: "Ação da etapa de dados", kind: "short", maxLength: 60 },
      { key: "passwordTitle", label: "Título da etapa de senha", kind: "short", maxLength: 80 },
      { key: "passwordDescription", label: "Orientação introdutória da senha", kind: "long", maxLength: 320 },
      { key: "passwordContinueLabel", label: "Ação da etapa de senha", kind: "short", maxLength: 60 },
    ],
  },
  {
    id: "passwordRecovery",
    label: "Recuperação de senha",
    description: "Introdução e ações da solicitação de recuperação.",
    fields: [
      { key: "title", label: "Título", kind: "short", maxLength: 80 },
      { key: "description", label: "Texto de apoio", kind: "long", maxLength: 320 },
      { key: "continueLabel", label: "Ação principal", kind: "short", maxLength: 60 },
      { key: "backToLoginLabel", label: "Ação de retorno", kind: "short", maxLength: 80 },
    ],
  },
  {
    id: "completeRegistration",
    label: "Completar cadastro",
    description: "Pós-cadastro autenticado: títulos e exemplos editoriais das etapas de dados, endereço e banco.",
    fields: [
      { key: "personalDataTitle", label: "Título de dados pessoais", kind: "short", maxLength: 80 },
      { key: "issuingEntityHelper", label: "Exemplo de órgão emissor", kind: "long", maxLength: 120 },
      { key: "nationalityHelper", label: "Exemplo de nacionalidade", kind: "long", maxLength: 120 },
      { key: "annualIncomeHelper", label: "Exemplo de renda anual", kind: "long", maxLength: 100 },
      { key: "addressTitle", label: "Título de endereço", kind: "short", maxLength: 80 },
      { key: "bankDataTitle", label: "Título de dados bancários", kind: "short", maxLength: 80 },
    ],
  },
] as const

export const APP_AUTH_GROUPS = [
  {
    id: "wallet",
    label: "Carteira",
    description: "Títulos e apoio editorial do resumo e da seleção de oportunidades.",
    fields: [
      { key: "investedOpportunitiesTitle", label: "Título do resumo investido", kind: "short", maxLength: 100 },
      { key: "availableOpportunitiesTitle", label: "Título da seleção disponível", kind: "short", maxLength: 100 },
      { key: "availableOpportunitiesMoreLabel", label: "Ação para ver mais", kind: "short", maxLength: 60 },
      { key: "availableOpportunitiesInfoTitle", label: "Título informativo", kind: "short", maxLength: 100 },
      { key: "availableOpportunitiesInfoDescription", label: "Descrição informativa", kind: "long", maxLength: 280 },
    ],
  },
  {
    id: "opportunities",
    label: "Oportunidades",
    description: "Busca, ajuda do estado vazio e títulos editoriais do detalhe.",
    fields: [
      { key: "searchPlaceholder", label: "Placeholder de busca", kind: "short", maxLength: 80 },
      { key: "emptyStateHelper", label: "Ajuda do estado vazio", kind: "long", maxLength: 180 },
      { key: "detailProgressTitle", label: "Título da seção de progresso", kind: "short", maxLength: 80 },
      { key: "detailResourcesLabel", label: "Label de aplicação dos recursos", kind: "short", maxLength: 100 },
      { key: "detailProfileLabel", label: "Label de perfil", kind: "short", maxLength: 80 },
      { key: "detailTeamTitle", label: "Título da seção de equipe", kind: "short", maxLength: 80 },
    ],
  },
  {
    id: "investments",
    label: "Investimentos",
    description: "Busca e ajuda do estado vazio da lista de investimentos.",
    fields: [
      { key: "searchPlaceholder", label: "Placeholder de busca", kind: "short", maxLength: 80 },
      { key: "emptyStateHelper", label: "Ajuda do estado vazio", kind: "long", maxLength: 180 },
    ],
  },
] as const

export type AppTextReading = { state: 'missing' | 'null' | 'invalid' } | { state: 'value'; value: string }
export type AppContentReading = {
  state: 'missing' | 'null' | 'incompatible' | 'value'
  groups: { id: string; label: string; description: string; fields: { key: string; label: string; maxLength: number; reading: AppTextReading }[] }[]
}
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value))
const readOwn = (value: unknown, key: string): unknown => record(value) ? Object.getOwnPropertyDescriptor(value, key)?.value : undefined
function appText(value: unknown, max: number): AppTextReading {
  if (value === undefined) return { state: 'missing' }
  if (value === null) return { state: 'null' }
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\p{Cc}\p{Cf}<>]/u.test(value) || /\{\{.*?\}\}|\$\{.*?\}|%[A-Za-z_][A-Za-z0-9_]*%/.test(value) || businessText(value, max) === null) return { state: 'invalid' }
  return { state: 'value', value }
}
/** Only qualified public fields enter React. Unknown roots/screens/keys are not retained. */
export function readAppContent(settings: unknown, kind: 'entry' | 'authenticated'): AppContentReading {
  const page = readOwn(settings, kind === 'entry' ? 'app_entry' : 'app_authenticated')
  if (page !== undefined && page !== null && !record(page)) return { state: 'incompatible', groups: [] }
  const value = readOwn(page, 'content')
  if (page === null || value === null) return { state: 'null', groups: [] }
  if (value === undefined) return { state: 'missing', groups: [] }
  const capability = kind === 'entry' ? 'platform.app.entry-content' : 'platform.app.authenticated-content'
  const screens = readOwn(value, 'screens')
  if (!record(value) || readOwn(value, 'capabilityId') !== capability || readOwn(value, 'version') !== 1 || readOwn(value, 'locale') !== 'pt-BR' || !record(screens)) return { state: 'incompatible', groups: [] }
  const groups = kind === 'entry' ? APP_ENTRY_GROUPS : APP_AUTH_GROUPS
  return { state: 'value', groups: groups.map(group => {
    const screen = readOwn(screens, group.id)
    return { id: group.id, label: group.label, description: group.description, fields: group.fields.map(field => ({ key: field.key, label: field.label, maxLength: field.maxLength, reading: screen !== undefined && screen !== null && !record(screen) ? { state: 'invalid' } : appText(screen === null ? null : readOwn(screen, field.key), field.maxLength) })) }
  }) }
}
