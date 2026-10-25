import type { StatusTone } from '../../../components/ui/StatusPill'
import { ApiError } from '../../../lib/api'
import { describeApiError, type ApiErrorView } from '../../../lib/apiErrors'
import { formatDateTime } from '../../operation/shared/operationModel'
import type { PagedResult, WalletRecord } from './financeApi'
import { businessText } from '../../operation/shared/businessPresentation'

/*
 * Finance Read V1 — presentation of Backend values. Display-only: nothing
 * here derives, sums or recalculates a financial value.
 */

/* ---------- money: integer centavos → "R$ 123,45" at the display boundary ---------- */

const REAIS = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })

/**
 * Formats integer centavos without floating-point division: 12345 → "R$ 123,45".
 * `null` (or anything that is not a safe integer) is NOT money: callers show
 * an explicit unavailable state instead (never "R$ 0,00").
 */
export function formatCents(cents: number | null): string | null {
  if (cents === null || !Number.isSafeInteger(cents)) return null
  const negative = cents < 0
  const magnitude = BigInt(negative ? -cents : cents)
  const reais = magnitude / 100n
  const rest = (magnitude % 100n).toString().padStart(2, '0')
  return `${negative ? '-' : ''}R$ ${REAIS.format(reais)},${rest}`
}

export const AMOUNT_UNAVAILABLE = 'Valor indisponível'
export const BALANCE_UNAVAILABLE = 'Saldo indisponível'

/* ---------- vocabularies ---------- */

type Meta = { label: string; tone: StatusTone }

const INVESTMENT_STATUS: Record<string, Meta> = {
  waiting_payment: { label: 'Aguardando pagamento', tone: 'warning' },
  processing: { label: 'Em processamento', tone: 'neutral' },
  paid: { label: 'Pago', tone: 'success' },
  processing_refund: { label: 'Reembolso em processamento', tone: 'warning' },
  refunded: { label: 'Reembolsado', tone: 'muted' },
  expired: { label: 'Expirado', tone: 'muted' },
  failed: { label: 'Falhou', tone: 'danger' },
}

const PAYMENT_STATUS: Record<string, Meta> = {
  waiting_payment: { label: 'Aguardando pagamento', tone: 'warning' },
  paid: { label: 'Pago', tone: 'success' },
  expired: { label: 'Expirado', tone: 'muted' },
  refunded: { label: 'Reembolsado', tone: 'muted' },
}

/** Movement status is an opaque source status (contract): known tokens get a label, never a success / failure colour. */
const MOVEMENT_STATUS: Record<string, string> = {
  paid: 'Pago',
  completed: 'Concluído',
  confirmed: 'Confirmado',
  refunded: 'Reembolsado',
  processing_refund: 'Reembolso em processamento',
}

const unknown = (value: string): Meta => ({ label: value, tone: 'muted' })

export const investmentStatusMeta = (status: string): Meta => (Object.hasOwn(INVESTMENT_STATUS, status) ? INVESTMENT_STATUS[status] : unknown(status))
export const paymentStatusMeta = (status: string): Meta => (Object.hasOwn(PAYMENT_STATUS, status) ? PAYMENT_STATUS[status] : unknown(status))
export const movementStatusLabel = (status: string | null) => (status === null ? 'Não informado' : Object.hasOwn(MOVEMENT_STATUS, status) ? MOVEMENT_STATUS[status] : status)

export const MOVEMENT_KIND_LABEL = { in: 'Entrada', out: 'Saída' } as const
export const MOVEMENT_KIND_DESCRIPTION = { in: 'Recebido pelo ledger da plataforma', out: 'Pago pelo ledger da plataforma' } as const

const MOVEMENT_CATEGORY: Record<string, string> = {
  investment_paid: 'Investimento pago',
  installment_paid: 'Parcela paga',
  refund: 'Reembolso',
  entrepreneur_cashout: 'Saque do empreendedor',
  investor_payout: 'Repasse ao investidor',
}
export const movementCategoryLabel = (category: string) => (Object.hasOwn(MOVEMENT_CATEGORY, category) ? MOVEMENT_CATEGORY[category] : category)

const COUNTERPARTY: Record<string, string> = { investor: 'Investidor', entrepreneur: 'Empreendedor' }
export const counterpartyTypeLabel = (type: string | null) => (type === null ? 'Não informado' : Object.hasOwn(COUNTERPARTY, type) ? COUNTERPARTY[type] : type)

/** Provider tokens as sent (`finapop`, `asaas`…) with a capital letter. No logos. */
export const providerLabel = (provider: string | null) => (provider ? provider.charAt(0).toUpperCase() + provider.slice(1) : 'Não informado')

export const paymentMethodLabel = (method: string | null) => (method === 'pix' ? 'PIX' : method ?? 'Não informado')
export const paymentTypeLabel = (type: string | null) => (type === 'investment_pix' ? 'PIX de investimento' : type ?? 'Não informado')

/** Statuses of the two domains are independent: the investment status never implies the payment result. */
export const STATUS_INDEPENDENCE_NOTE =
  'O status do investimento e o status do pagamento são independentes e vêm cada um do seu domínio no Control Plane.'

/* ---------- references ---------- */

/**
 * Transaction references (txid, end-to-end ids) are shown partially:
 * "E1234567…9f2a". The full value is never rendered.
 */
export function partialReference(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return null
  const textValue = String(value)
  if (textValue.length > 12) return `${textValue.slice(0, 8)}…${textValue.slice(-4)}`
  if (textValue.length >= 8) return `${textValue.slice(0, 2)}…${textValue.slice(-2)}`
  return '••••'
}

/** Known transaction identifiers are operational references, not provider credentials. */
const TRANSACTION_REFERENCE_KEYS = /^(txid|end_to_end|end_to_end_id|external_end_to_end_id|externalendtoendid|endtoendid|e2e|e2e_id)$/i

export function transactionReference(value: string | number | null | undefined) {
  return value === null || value === undefined ? null : businessText(String(value), 32_768)
}

/** Unknown key-like values remain partial; API document/privacy rejection is unchanged. */
const SENSITIVE_REFERENCE_KEYS = /txid|end_to_end|endtoend|e2e|pix|key|qr|emv|copy|paste|document|cpf|cnpj|tax/i

/** A movement reference entry: full authorized transaction ids, protected key/document hints. */
export function referenceEntry(key: string, value: string | number | null) {
  const label = key.replace(/_/g, ' ')
  if (TRANSACTION_REFERENCE_KEYS.test(key)) return { key, label, value: transactionReference(value) ?? '—', partial: false }
  const shown = SENSITIVE_REFERENCE_KEYS.test(key) ? partialReference(value) : value === null ? null : String(value)
  return { key, label, value: shown ?? '—', partial: SENSITIVE_REFERENCE_KEYS.test(key) && shown !== null && shown !== String(value) }
}

/* ---------- counts ---------- */

const COUNT = new Intl.NumberFormat('pt-BR')
export const formatCount = (value: number) => COUNT.format(value)

/* ---------- errors ---------- */

const REJECTION_COPY: Record<string, { title: string; description: string }> = {
  MONEY_UNIT_MISMATCH: {
    title: 'Unidade monetária não reconhecida',
    description: 'A resposta não declarou valores em centavos de BRL. Nada foi exibido para não mostrar valores incorretos.',
  },
  UNMASKED_DOCUMENT: {
    title: 'Resposta recusada por privacidade',
    description: 'A resposta trouxe um documento (CPF/CNPJ) sem máscara. Nada foi exibido nem registrado.',
  },
  SCOPE_MISMATCH: {
    title: 'Filtro não confirmado',
    description: 'O Control Plane retornou registros fora do filtro aplicado; nada foi exibido para não misturar resultados.',
  },
  IDENTITY_MISMATCH: {
    title: 'Registro não confirmado',
    description: 'A resposta descreve um registro diferente do solicitado; nada foi exibido.',
  },
  WALLET_IDENTITY_MISMATCH: {
    title: 'Identidade da wallet não confirmada',
    description: 'A wallet retornada não segue o contrato (uma wallet por Whitelabel, com o mesmo ID); nada foi exibido.',
  },
  BALANCE_MISMATCH: {
    title: 'Saldo não confirmado',
    description: 'O Control Plane informou dois saldos diferentes para a mesma wallet; nenhum saldo foi exibido.',
  },
}

/** Read failure → safe copy. 401 is handled centrally by the session layer; 403 keeps the session. */
export function financeErrorView(error: unknown, subject: string): ApiErrorView {
  const view = describeApiError(error, subject)
  if (!(error instanceof ApiError)) return view
  if (error.kind === 'malformed' && error.code && Object.hasOwn(REJECTION_COPY, error.code)) {
    return { ...view, ...REJECTION_COPY[error.code], retryable: true }
  }
  if (error.kind === 'http' && error.status === 400) {
    return {
      ...view,
      title: 'Consulta não aceita',
      description: `O Control Plane recusou um filtro ou parâmetro da consulta de ${subject}. Limpe os filtros e tente novamente.`,
      retryable: false,
    }
  }
  if (error.kind === 'http' && error.status === 429) {
    return { ...view, title: 'Muitas consultas', description: 'O Control Plane limitou as consultas por alguns instantes. Aguarde e tente novamente.', retryable: true }
  }
  return view
}

/* ---------- dates, tenants and server-page text ---------- */

export const dateText = (iso: string | null | undefined) => formatDateTime(iso ?? null) ?? '—'

export type TenantNames = (whitelabelId: string) => string

/** Name of a Core Whitelabel from the Finance tenant read; falls back to "Whitelabel #ID" (never a prototype name). */
export function tenantNames(tenants: PagedResult<WalletRecord> | null): TenantNames {
  return (id) => tenants?.rows.find((row) => row.whitelabelId === id)?.name ?? `Whitelabel #${id}`
}

/** 1 … (current − 1) current (current + 1) … last; every page when there are ≤ 7. */
export function pageItems(current: number, last: number): (number | 'gap')[] {
  if (last <= 7) return Array.from({ length: last }, (_, index) => index + 1)
  const middle = [current - 1, current, current + 1].filter((value) => value > 1 && value < last)
  const items: (number | 'gap')[] = [1]
  if (middle[0] > 2) items.push('gap')
  items.push(...middle)
  if (middle[middle.length - 1] < last - 1) items.push('gap')
  items.push(last)
  return items
}

/** "Mostrando 21–40 de 2.140 investimentos" from Backend metadata (the rows actually returned). */
export function rangeText(data: PagedResult<unknown>, singular: string, plural: string, none: string) {
  if (data.total === 0) return none
  const from = (data.page - 1) * data.perPage + 1
  const to = from + data.rows.length - 1
  const span = data.rows.length === 0 ? '—' : from === to ? formatCount(from) : `${formatCount(from)}–${formatCount(to)}`
  return `Mostrando ${span} de ${formatCount(data.total)} ${data.total === 1 ? singular : plural}`
}
