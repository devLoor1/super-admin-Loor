// Finance Read V1 — synthetic fixtures for scripts/check-finance-read.mjs.
// Field names and types mirror the Control Plane Finance contract (Backend
// `docs/finance-read-contract-v1.md`, checked live on 2026-10-17). Every value is
// invented: no real person, document, amount, reference or Whitelabel. Documents
// are masked exactly as the Backend masks them. Test infrastructure only — never
// imported by application code.

export const MONEY = Object.freeze({ currency: 'BRL', unit: 'centavos' })

export const meta = (overrides = {}) => ({ page: 1, perPage: 20, total: 1, lastPage: 1, ...overrides })

export const investmentRow = Object.freeze({
  id: 9001,
  whitelabelId: 4,
  investorId: 7001,
  opportunityId: 501,
  amountCents: 12345,
  currency: 'BRL',
  quoteQuantity: 3,
  status: 'paid',
  createdAt: '2026-09-01T12:00:00.000Z',
  updatedAt: '2026-09-02T12:00:00.000Z',
})

export const investmentDetail = Object.freeze({
  ...investmentRow,
  status: 'processing',
  anonymous: false,
  riskAcceptanceAt: '2026-09-01T11:59:00.000Z',
  investor: { id: 7001, fullName: 'Synthetic Investor', email: 'investor@example.invalid' },
  opportunity: { id: 501, name: 'Synthetic Opportunity' },
  // Payment status is independent of the investment status (processing ≠ waiting_payment).
  payment: { id: 8001, status: 'waiting_payment', provider: 'synthpay', amountCents: 12345, paymentAt: null },
})

export const failedInvestmentRow = Object.freeze({ ...investmentRow, id: 9002, amountCents: null, status: 'failed' })

export const paymentRow = Object.freeze({
  id: 8001,
  whitelabelId: 4,
  investmentId: 9001,
  investorId: 7001,
  opportunityId: 501,
  amountCents: 12345,
  currency: 'BRL',
  paymentMethod: 'pix',
  type: 'investment_pix',
  provider: 'synthpay',
  status: 'paid',
  txid: 'SYNTHTXID0000000000000000000ABCD',
  paymentAt: '2026-09-01T12:05:00.000Z',
  createdAt: '2026-09-01T12:00:00.000Z',
  updatedAt: '2026-09-01T12:05:00.000Z',
})

export const paymentDetail = Object.freeze({
  ...paymentRow,
  expirationAt: '2026-09-02T12:00:00.000Z',
  liquidationAt: null,
  externalEndToEndId: 'E00000000SYNTHETIC0000000000WXYZ',
})

export const walletRow = Object.freeze({
  id: 4,
  whitelabelId: 4,
  ownerType: 'whitelabel',
  ownerId: 4,
  name: 'Synthetic Tenant A',
  slug: 'synthetic-a',
  currency: 'BRL',
  authoritativeBalanceCents: 250000,
  balanceTimestamp: '2026-10-17T09:00:00.000Z',
  createdAt: '2026-01-10T12:00:00.000Z',
  updatedAt: '2026-10-17T09:00:00.000Z',
})

export const walletRowB = Object.freeze({ ...walletRow, id: 6, whitelabelId: 6, ownerId: 6, name: 'Synthetic Tenant B', slug: 'synthetic-b', authoritativeBalanceCents: -1500 })

export const walletDetail = Object.freeze({
  ...walletRow,
  summary: { totalInCents: 400000, totalOutCents: 150000, authoritativeBalanceCents: 250000, countIn: 12, countOut: 5 },
})

export const movementRow = Object.freeze({
  id: 'investment:9001',
  kind: 'in',
  category: 'investment_paid',
  amountCents: 12345,
  currency: 'BRL',
  date: '2026-09-01T12:05:00.000Z',
  description: 'Investimento pago',
  counterparty: { type: 'investor', name: 'Synthetic Investor', document: '***.***.***-00' },
  opportunity: { id: 501, name: 'Synthetic Opportunity' },
  reference: { investment_id: 9001, payment_id: 8001, txid: 'SYNTHTXID0000000000000000000ABCD' },
  provider: 'synthpay',
  status: 'paid',
})

export const movementOut = Object.freeze({
  ...movementRow,
  id: 'refund:31',
  kind: 'out',
  category: 'refund',
  amountCents: 500,
  counterparty: { type: 'investor', name: 'Synthetic Investor', document: null },
  reference: { refund_id: 31 },
  status: 'refunded',
})

export const page = (rows, metaOverrides = {}, extra = {}) => ({
  data: rows,
  meta: meta({ total: rows.length, ...metaOverrides }),
  money: MONEY,
  ...extra,
})

export const detail = (data, extra = {}) => ({ data, money: MONEY, ...extra })
