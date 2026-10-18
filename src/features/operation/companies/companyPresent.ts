import type { BusinessTone } from '../../whitelabel-accounts/accountModel'
import { formatWhitelabelDate } from '../../whitelabels/whitelabelApi'
import type { CompanyRecord } from './companyApi'

/*
 * Companies presentation — labels for Backend tokens and display formatting.
 * Known validation statuses get a factual label; an unknown token is shown as
 * sent. Nothing is derived from Entrepreneur data and no value is validated
 * here (the CNPJ is only formatted for reading).
 */

type Meta = { label: string; tone: BusinessTone }

const STATUS: Record<string, Meta> = {
  pending: { label: 'Validação pendente', tone: 'pending' },
  validated: { label: 'Validada', tone: 'positive' },
  invalid: { label: 'Inválida', tone: 'negative' },
  not_found: { label: 'Não encontrada na validação', tone: 'negative' },
  unavailable: { label: 'Validação indisponível', tone: 'neutral' },
}

export const companyStatusMeta = (status: string): Meta => (Object.hasOwn(STATUS, status) ? STATUS[status] : { label: status, tone: 'neutral' })

export const SORT_LABEL: Record<string, string> = { createdAt: 'Cadastro', updatedAt: 'Atualização', legalName: 'Razão social', cnpj: 'CNPJ' }
export const ORDER_LABEL: Record<string, Record<'asc' | 'desc', string>> = {
  createdAt: { desc: 'mais recente', asc: 'mais antigo' },
  updatedAt: { desc: 'mais recente', asc: 'mais antigo' },
  legalName: { asc: 'A–Z', desc: 'Z–A' },
  cnpj: { asc: 'crescente', desc: 'decrescente' },
}

const VALIDATION_SOURCE: Record<string, string> = { brasil_api: 'BrasilAPI' }
export const validationSourceLabel = (value: string | null) =>
  value === null ? 'Não informada' : Object.hasOwn(VALIDATION_SOURCE, value) ? VALIDATION_SOURCE[value] : value

/** "12.345.678/0001-90" for 14 digits; any other value is shown as sent (never validated or completed). */
export function formatCnpj(value: string | null) {
  if (value === null) return null
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 14 || digits.length !== value.length) return value
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
}

export const COMPANY_NAME_FALLBACK = 'Empresa sem razão social informada'

/** Legal name, else trade name, else a neutral fallback — never the Entrepreneur's name. */
export const companyDisplayName = (company: Pick<CompanyRecord, 'legalName' | 'tradeName'>) => company.legalName ?? company.tradeName ?? COMPANY_NAME_FALLBACK

export const companyDate = (value: string | null, withTime = false) => formatWhitelabelDate(value, withTime)

const COUNT_FORMAT = new Intl.NumberFormat('pt-BR')
export const formatCount = (value: number) => COUNT_FORMAT.format(value)
