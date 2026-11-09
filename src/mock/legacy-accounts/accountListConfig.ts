import {
  ADMIN_ROLE_META,
  COMPANY_VALIDATION_META,
  INVESTOR_VALIDATION_META,
  type AccessState,
  type AccountType,
} from './accountModel'

export type AccessFilter = 'all' | AccessState
export type SortKey = 'name' | 'lastActivityAt'
export type Sort = { key: SortKey; direction: 'ascending' | 'descending' } | null

export const TYPE_TABS_ID = 'acc-type'

/** Business-state filter options (and column header) per account type. */
export const BUSINESS_FILTERS: Record<AccountType, { label: string; all: string; options: [string, string][] }> = {
  investor: {
    label: 'Validação',
    all: 'Todas as validações',
    options: Object.entries(INVESTOR_VALIDATION_META).map(([value, meta]) => [value, meta.label]),
  },
  entrepreneur: {
    label: 'Empresa',
    all: 'Todas as situações da empresa',
    options: Object.entries(COMPANY_VALIDATION_META).map(([value, meta]) => [value, meta.label]),
  },
  admin: {
    label: 'Função (conceitual)',
    all: 'Todas as funções',
    options: Object.entries(ADMIN_ROLE_META).map(([value, meta]) => [value, meta.label]),
  },
}

export const SEARCH_HINT: Record<AccountType, string> = {
  investor: 'Buscar por nome, e-mail, CPF ou ID...',
  entrepreneur: 'Buscar por nome, e-mail, CPF, CNPJ ou ID...',
  admin: 'Buscar por nome, e-mail ou ID...',
}

export const SEARCH_LABEL: Record<AccountType, string> = {
  investor: 'Buscar investidores por nome, e-mail, CPF ou ID',
  entrepreneur: 'Buscar empreendedores por nome, e-mail, CPF, CNPJ ou ID',
  admin: 'Buscar administradores por nome, e-mail ou ID',
}
