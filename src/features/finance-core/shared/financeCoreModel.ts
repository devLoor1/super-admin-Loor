import {
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  QrCode,
  ReceiptText,
  type LucideIcon,
} from 'lucide-react'
import type { StatusTone } from '../../../components/ui/StatusPill'
import type { ModalityId } from '../../finance-gateways/financeModel'

/*
 * FINANCE CORE V1 — frontend prototype model for Investimentos, Pagamentos /
 * PIX and Wallet. Not a Backend contract, not a ledger, not a workflow.
 *
 * Four INDEPENDENT record types:
 *   Investment ≠ Payment ≠ WalletMovement ≠ Wallet (represented balance).
 * They are related ONLY through ids that a mock record explicitly carries
 * (e.g. Investment.paymentId, Payment.investmentId, WalletMovement.sourceId).
 * Nothing here derives, recalculates or synchronises another record: no
 * status is propagated, no balance is computed from movements, no amount is
 * summed. Every state is a PROTOTYPE STATE with no transition graph and no
 * action can change it. Cardinalities shown by the seeds (one payment per
 * investment, one wallet per investor…) are illustrative, not decisions.
 */

export type Currency = 'BRL'

/* ---------- Investments ---------- */

export type InvestmentStatus = 'pending' | 'active' | 'closed'

export const INVESTMENT_STATUSES: InvestmentStatus[] = ['pending', 'active', 'closed']

export const INVESTMENT_STATUS_META: Record<InvestmentStatus, { label: string; tone: StatusTone }> = {
  pending: { label: 'Pendente', tone: 'warning' },
  active: { label: 'Ativo', tone: 'success' },
  closed: { label: 'Encerrado', tone: 'muted' },
}

export type Investment = {
  investmentId: string
  /** Operation investor (Accounts prototype id) — referenced, never copied. */
  investorId: string
  /** Operation opportunity — referenced, never mutated. */
  opportunityId: string
  /** The investment's own tenant context (prototype; not authoritative ownership). */
  whitelabelId: string
  /** The investment's own record of the modality (Equity / Debt only). */
  modality: ModalityId
  amount: number
  currency: Currency
  status: InvestmentStatus
  /** Explicit reference to a payment record, when one exists. */
  paymentId?: string
  createdAt?: string
  updatedAt?: string
}

/* ---------- Payments / PIX ---------- */

export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed'

export const PAYMENT_STATUSES: PaymentStatus[] = ['pending', 'processing', 'paid', 'failed']

export const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; tone: StatusTone }> = {
  pending: { label: 'Pendente', tone: 'warning' },
  processing: { label: 'Em processamento', tone: 'neutral' },
  paid: { label: 'Pago', tone: 'success' },
  failed: { label: 'Falhou', tone: 'danger' },
}

/** Illustrative method list — the supported methods are a Product / Backend decision. */
export type PaymentMethod = 'pix' | 'boleto' | 'ted'

export const PAYMENT_METHODS: PaymentMethod[] = ['pix', 'boleto', 'ted']

export const PAYMENT_METHOD_META: Record<PaymentMethod, { label: string; icon: LucideIcon }> = {
  pix: { label: 'PIX', icon: QrCode },
  boleto: { label: 'Boleto', icon: ReceiptText },
  ted: { label: 'TED', icon: Landmark },
}

export type Payment = {
  paymentId: string
  whitelabelId: string
  /** A payment may exist without an investment. */
  investmentId?: string
  investorId?: string
  opportunityId?: string
  /** Gateway configured in Financeiro › Gateways e contas (referenced by id). */
  gatewayId: string
  method: PaymentMethod
  amount: number
  currency: Currency
  status: PaymentStatus
  externalReference?: string
  /** Illustrative TxID-like reference — not a real PIX identifier. */
  pixReference?: string
  /** Illustrative charge identifier — not a real PIX charge. */
  pixChargeId?: string
  createdAt?: string
  updatedAt?: string
  paidAt?: string
}

/* ---------- Wallets ---------- */

export type WalletStatus = 'active' | 'blocked'

export const WALLET_STATUSES: WalletStatus[] = ['active', 'blocked']

export const WALLET_STATUS_META: Record<WalletStatus, { label: string; tone: StatusTone }> = {
  active: { label: 'Ativa', tone: 'success' },
  blocked: { label: 'Bloqueada', tone: 'danger' },
}

/**
 * Who / what the wallet represents. Non-authoritative: the real ownership
 * model (investor, entrepreneur, company, Whitelabel operation…) is open.
 */
export type WalletOwner =
  | { kind: 'investor'; investorId: string }
  | { kind: 'context'; label: string; reference: string }

export type Wallet = {
  walletId: string
  whitelabelId: string
  ownerReference?: WalletOwner
  currency: Currency
  /**
   * "Saldo representado": a static prototype value. NOT computed from
   * movements, NOT withdrawable, transferable or settled value.
   */
  representedBalance: number
  status: WalletStatus
  createdAt?: string
  updatedAt?: string
}

export type MovementDirection = 'credit' | 'debit'

export const MOVEMENT_DIRECTION_META: Record<MovementDirection, { label: string; icon: LucideIcon }> = {
  credit: { label: 'Crédito', icon: ArrowDownLeft },
  debit: { label: 'Débito', icon: ArrowUpRight },
}

export type MovementStatus = 'pending' | 'completed' | 'failed'

export const MOVEMENT_STATUS_META: Record<MovementStatus, { label: string; tone: StatusTone }> = {
  pending: { label: 'Pendente', tone: 'warning' },
  completed: { label: 'Concluído', tone: 'success' },
  failed: { label: 'Falhou', tone: 'danger' },
}

export type MovementSource = 'payment' | 'investment' | 'transfer' | 'other'

export const MOVEMENT_SOURCE_LABEL: Record<MovementSource, string> = {
  payment: 'Pagamento',
  investment: 'Investimento',
  transfer: 'Transferência',
  other: 'Outro',
}

export type WalletMovement = {
  movementId: string
  walletId: string
  direction: MovementDirection
  amount: number
  currency: Currency
  status: MovementStatus
  description: string
  sourceType?: MovementSource
  sourceId?: string
  createdAt?: string
  updatedAt?: string
}

/* ---------- Formatting ---------- */

const MONEY: Record<Currency, Intl.NumberFormat> = {
  BRL: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }),
}

/** "R$ 120.000,00" — display of a record's own amount (never a sum). */
export const formatMoney = (amount: number, currency: Currency) => MONEY[currency].format(amount)

export const CURRENCY_LABEL: Record<Currency, string> = { BRL: 'BRL · Real' }

/* ---------- Cross-domain destinations ---------- */

export const investmentHref = (id: string) => `#/finance/investments/${encodeURIComponent(id)}`
export const paymentHref = (id: string) => `#/finance/payments/${encodeURIComponent(id)}`
export const walletHref = (id: string, movementId?: string) =>
  `#/finance/wallets/${encodeURIComponent(id)}${movementId ? `?movimento=${encodeURIComponent(movementId)}` : ''}`
export const investorHref = (id: string) => `#/operation/investors/${encodeURIComponent(id)}`
export const opportunityHref = (id: string) => `#/operation/opportunities/${encodeURIComponent(id)}`
/** Existing tenant screen; there is no per-gateway deep link, so it opens the Whitelabel's gateways. */
export const gatewaysHref = (whitelabelId: string) => `#/whitelabels/${encodeURIComponent(whitelabelId)}/finance/gateways`

/** Transfers are referenced by movements but have no module yet. */
export const TRANSFER_PENDING_MESSAGE =
  'Módulo Financeiro › Transferências ainda não implementado. Nenhuma navegação foi feita.'
