import type { Investment, Payment, Wallet, WalletMovement } from './financeCoreModel'

/*
 * ILLUSTRATIVE FINANCE CORE RECORDS — not production data, not a ledger.
 *
 * - Read-only constants: no screen can create, edit, confirm, settle,
 *   refund, credit/debit or delete any of them.
 * - Investors / opportunities are EXISTING Operation records referenced by id
 *   (inv_proto_… / opp_proto_…); nothing in Operation is copied or changed.
 *   The 13 investments use the same investor ↔ opportunity pairs as the
 *   illustrative Operation associations so both screens tell the same story;
 *   the two data sets are still independent (no synchronisation).
 * - Gateways are the seeded configurations of Financeiro › Gateways e contas
 *   (fictitious providers).
 * - Relationships exist ONLY where a record explicitly carries the other id.
 *   Statuses are seeded independently on purpose (e.g. an active investment
 *   whose payment is still processing, a failed payment with no movement
 *   change, a wallet balance that is not the sum of its movements).
 * - PIX identifiers (COB-… / TX-PIX-…) are visibly fake. There is no QR
 *   payload, copy-and-paste code, PIX key or payment link anywhere.
 * Reference chain from the brief: INV-0001 → PG-00045 (PIX, Pago) → MOV-0001.
 */

const FINAPOP = 'wl_proto_01'
const LOOR = 'wl_proto_02'

export const PROTOTYPE_INVESTMENTS: Investment[] = [
  { investmentId: 'INV-0001', investorId: 'inv_proto_001', opportunityId: 'opp_proto_001', whitelabelId: FINAPOP, modality: 'debt', amount: 120000, currency: 'BRL', status: 'active', paymentId: 'PG-00045', createdAt: '2026-08-04T10:12:00-03:00', updatedAt: '2026-08-04T14:32:00-03:00' },
  { investmentId: 'INV-0002', investorId: 'inv_proto_001', opportunityId: 'opp_proto_002', whitelabelId: FINAPOP, modality: 'equity', amount: 85000, currency: 'BRL', status: 'active', paymentId: 'PG-00046', createdAt: '2026-09-02T15:40:00-03:00', updatedAt: '2026-09-02T16:05:00-03:00' },
  { investmentId: 'INV-0003', investorId: 'inv_proto_001', opportunityId: 'opp_proto_003', whitelabelId: FINAPOP, modality: 'debt', amount: 40000, currency: 'BRL', status: 'pending', paymentId: 'PG-00047', createdAt: '2026-09-28T09:05:00-03:00', updatedAt: '2026-10-03T09:20:00-03:00' },
  { investmentId: 'INV-0004', investorId: 'inv_proto_003', opportunityId: 'opp_proto_004', whitelabelId: FINAPOP, modality: 'equity', amount: 60000, currency: 'BRL', status: 'closed', paymentId: 'PG-00038', createdAt: '2026-06-17T11:30:00-03:00', updatedAt: '2026-09-27T14:40:00-03:00' },
  { investmentId: 'INV-0005', investorId: 'inv_proto_004', opportunityId: 'opp_proto_001', whitelabelId: FINAPOP, modality: 'debt', amount: 50000, currency: 'BRL', status: 'active', paymentId: 'PG-00048', createdAt: '2026-08-19T14:22:00-03:00', updatedAt: '2026-08-19T15:02:00-03:00' },
  { investmentId: 'INV-0006', investorId: 'inv_proto_004', opportunityId: 'opp_proto_004', whitelabelId: FINAPOP, modality: 'equity', amount: 140000, currency: 'BRL', status: 'closed', paymentId: 'PG-00040', createdAt: '2026-07-08T16:48:00-03:00', updatedAt: '2026-09-27T14:45:00-03:00' },
  // Investment without any payment record (Accounts: "Pagamentos e Wallet — Sem histórico").
  { investmentId: 'INV-0007', investorId: 'inv_proto_006', opportunityId: 'opp_proto_003', whitelabelId: FINAPOP, modality: 'debt', amount: 25000, currency: 'BRL', status: 'pending', createdAt: '2026-09-30T08:15:00-03:00', updatedAt: '2026-09-30T08:15:00-03:00' },
  { investmentId: 'INV-0008', investorId: 'inv_proto_009', opportunityId: 'opp_proto_002', whitelabelId: FINAPOP, modality: 'equity', amount: 30000, currency: 'BRL', status: 'pending', paymentId: 'PG-00049', createdAt: '2026-09-11T13:02:00-03:00', updatedAt: '2026-09-11T13:30:00-03:00' },
  { investmentId: 'INV-0009', investorId: 'inv_proto_009', opportunityId: 'opp_proto_005', whitelabelId: FINAPOP, modality: 'debt', amount: 75000, currency: 'BRL', status: 'active', paymentId: 'PG-00041', createdAt: '2026-05-26T10:40:00-03:00', updatedAt: '2026-05-26T11:10:00-03:00' },
  { investmentId: 'INV-0010', investorId: 'inv_proto_011', opportunityId: 'opp_proto_001', whitelabelId: FINAPOP, modality: 'debt', amount: 90000, currency: 'BRL', status: 'active', paymentId: 'PG-00044', createdAt: '2026-08-30T17:20:00-03:00', updatedAt: '2026-08-30T17:48:00-03:00' },
  { investmentId: 'INV-0011', investorId: 'inv_proto_011', opportunityId: 'opp_proto_008', whitelabelId: FINAPOP, modality: 'debt', amount: 35000, currency: 'BRL', status: 'closed', paymentId: 'PG-00036', createdAt: '2026-04-14T09:55:00-03:00', updatedAt: '2026-08-21T15:20:00-03:00' },
  { investmentId: 'INV-0012', investorId: 'inv_proto_013', opportunityId: 'opp_proto_009', whitelabelId: LOOR, modality: 'debt', amount: 65000, currency: 'BRL', status: 'active', paymentId: 'PG-00050', createdAt: '2026-09-21T11:10:00-03:00', updatedAt: '2026-09-21T11:42:00-03:00' },
  { investmentId: 'INV-0013', investorId: 'inv_proto_013', opportunityId: 'opp_proto_010', whitelabelId: LOOR, modality: 'equity', amount: 45000, currency: 'BRL', status: 'pending', paymentId: 'PG-00051', createdAt: '2026-09-25T16:35:00-03:00', updatedAt: '2026-10-02T12:10:00-03:00' },
]

const pix = (n: string) => ({ pixChargeId: `COB-${n}`, pixReference: `TX-PIX-${n}` })

export const PROTOTYPE_PAYMENTS: Payment[] = [
  { paymentId: 'PG-00036', whitelabelId: FINAPOP, investmentId: 'INV-0011', investorId: 'inv_proto_011', opportunityId: 'opp_proto_008', gatewayId: 'gw_finapop_alfa', method: 'pix', amount: 35000, currency: 'BRL', status: 'paid', ...pix('00036'), createdAt: '2026-04-14T10:02:00-03:00', paidAt: '2026-04-14T10:05:00-03:00', updatedAt: '2026-04-14T10:06:00-03:00' },
  // Payments without an investment (allowed): investor reference only, then none at all.
  { paymentId: 'PG-00037', whitelabelId: FINAPOP, investorId: 'inv_proto_003', gatewayId: 'gw_finapop_beta', method: 'ted', amount: 15000, currency: 'BRL', status: 'failed', externalReference: 'EXT-FNP-00037', createdAt: '2026-05-12T09:30:00-03:00', updatedAt: '2026-05-12T09:48:00-03:00' },
  { paymentId: 'PG-00038', whitelabelId: FINAPOP, investmentId: 'INV-0004', investorId: 'inv_proto_003', opportunityId: 'opp_proto_004', gatewayId: 'gw_finapop_alfa', method: 'pix', amount: 60000, currency: 'BRL', status: 'paid', ...pix('00038'), createdAt: '2026-06-17T11:36:00-03:00', paidAt: '2026-06-17T11:40:00-03:00', updatedAt: '2026-06-17T11:41:00-03:00' },
  { paymentId: 'PG-00039', whitelabelId: LOOR, investorId: 'inv_proto_013', gatewayId: 'gw_loor_alfa', method: 'pix', amount: 20000, currency: 'BRL', status: 'failed', ...pix('00039'), createdAt: '2026-06-20T15:10:00-03:00', updatedAt: '2026-06-20T15:40:00-03:00' },
  { paymentId: 'PG-00040', whitelabelId: FINAPOP, investmentId: 'INV-0006', investorId: 'inv_proto_004', opportunityId: 'opp_proto_004', gatewayId: 'gw_finapop_alfa', method: 'pix', amount: 140000, currency: 'BRL', status: 'paid', ...pix('00040'), createdAt: '2026-07-08T16:52:00-03:00', paidAt: '2026-07-08T16:57:00-03:00', updatedAt: '2026-07-08T16:58:00-03:00' },
  { paymentId: 'PG-00041', whitelabelId: FINAPOP, investmentId: 'INV-0009', investorId: 'inv_proto_009', opportunityId: 'opp_proto_005', gatewayId: 'gw_finapop_alfa', method: 'pix', amount: 75000, currency: 'BRL', status: 'paid', ...pix('00041'), createdAt: '2026-05-26T10:45:00-03:00', paidAt: '2026-05-26T10:50:00-03:00', updatedAt: '2026-05-26T10:51:00-03:00' },
  { paymentId: 'PG-00042', whitelabelId: FINAPOP, investorId: 'inv_proto_009', opportunityId: 'opp_proto_005', gatewayId: 'gw_finapop_beta', method: 'boleto', amount: 12000, currency: 'BRL', status: 'processing', externalReference: 'EXT-FNP-00042', createdAt: '2026-10-01T08:30:00-03:00', updatedAt: '2026-10-02T09:00:00-03:00' },
  { paymentId: 'PG-00043', whitelabelId: FINAPOP, gatewayId: 'gw_finapop_alfa', method: 'pix', amount: 8000, currency: 'BRL', status: 'pending', ...pix('00043'), externalReference: 'EXT-FNP-00043', createdAt: '2026-10-03T16:10:00-03:00', updatedAt: '2026-10-03T16:10:00-03:00' },
  { paymentId: 'PG-00044', whitelabelId: FINAPOP, investmentId: 'INV-0010', investorId: 'inv_proto_011', opportunityId: 'opp_proto_001', gatewayId: 'gw_finapop_alfa', method: 'pix', amount: 90000, currency: 'BRL', status: 'paid', ...pix('00044'), createdAt: '2026-08-30T17:25:00-03:00', paidAt: '2026-08-30T17:30:00-03:00', updatedAt: '2026-08-30T17:31:00-03:00' },
  { paymentId: 'PG-00045', whitelabelId: FINAPOP, investmentId: 'INV-0001', investorId: 'inv_proto_001', opportunityId: 'opp_proto_001', gatewayId: 'gw_finapop_alfa', method: 'pix', amount: 120000, currency: 'BRL', status: 'paid', ...pix('00045'), externalReference: 'EXT-FNP-00045', createdAt: '2026-08-04T10:16:00-03:00', paidAt: '2026-08-04T10:20:00-03:00', updatedAt: '2026-08-04T10:23:00-03:00' },
  { paymentId: 'PG-00046', whitelabelId: FINAPOP, investmentId: 'INV-0002', investorId: 'inv_proto_001', opportunityId: 'opp_proto_002', gatewayId: 'gw_finapop_alfa', method: 'pix', amount: 85000, currency: 'BRL', status: 'paid', ...pix('00046'), createdAt: '2026-09-02T15:44:00-03:00', paidAt: '2026-09-02T15:49:00-03:00', updatedAt: '2026-09-02T15:50:00-03:00' },
  { paymentId: 'PG-00047', whitelabelId: FINAPOP, investmentId: 'INV-0003', investorId: 'inv_proto_001', opportunityId: 'opp_proto_003', gatewayId: 'gw_finapop_alfa', method: 'pix', amount: 40000, currency: 'BRL', status: 'processing', ...pix('00047'), createdAt: '2026-10-03T09:10:00-03:00', updatedAt: '2026-10-03T09:20:00-03:00' },
  { paymentId: 'PG-00048', whitelabelId: FINAPOP, investmentId: 'INV-0005', investorId: 'inv_proto_004', opportunityId: 'opp_proto_001', gatewayId: 'gw_finapop_alfa', method: 'pix', amount: 50000, currency: 'BRL', status: 'paid', ...pix('00048'), createdAt: '2026-08-19T14:30:00-03:00', paidAt: '2026-08-19T14:36:00-03:00', updatedAt: '2026-08-19T14:37:00-03:00' },
  { paymentId: 'PG-00049', whitelabelId: FINAPOP, investmentId: 'INV-0008', investorId: 'inv_proto_009', opportunityId: 'opp_proto_002', gatewayId: 'gw_finapop_alfa', method: 'pix', amount: 30000, currency: 'BRL', status: 'failed', ...pix('00049'), createdAt: '2026-09-11T13:08:00-03:00', updatedAt: '2026-09-11T13:30:00-03:00' },
  { paymentId: 'PG-00050', whitelabelId: LOOR, investmentId: 'INV-0012', investorId: 'inv_proto_013', opportunityId: 'opp_proto_009', gatewayId: 'gw_loor_alfa', method: 'pix', amount: 65000, currency: 'BRL', status: 'paid', ...pix('00050'), createdAt: '2026-09-21T11:15:00-03:00', paidAt: '2026-09-21T11:20:00-03:00', updatedAt: '2026-09-21T11:21:00-03:00' },
  { paymentId: 'PG-00051', whitelabelId: LOOR, investmentId: 'INV-0013', investorId: 'inv_proto_013', opportunityId: 'opp_proto_010', gatewayId: 'gw_loor_alfa', method: 'pix', amount: 45000, currency: 'BRL', status: 'pending', ...pix('00051'), createdAt: '2026-10-02T12:05:00-03:00', updatedAt: '2026-10-02T12:10:00-03:00' },
]

export const PROTOTYPE_WALLETS: Wallet[] = [
  { walletId: 'WAL-0001', whitelabelId: FINAPOP, ownerReference: { kind: 'investor', investorId: 'inv_proto_001' }, currency: 'BRL', representedBalance: 120000, status: 'active', createdAt: '2026-03-15T10:30:00-03:00', updatedAt: '2026-10-03T09:24:00-03:00' },
  { walletId: 'WAL-0002', whitelabelId: FINAPOP, ownerReference: { kind: 'investor', investorId: 'inv_proto_004' }, currency: 'BRL', representedBalance: 50000, status: 'active', createdAt: '2026-04-02T13:45:00-03:00', updatedAt: '2026-08-19T14:37:00-03:00' },
  { walletId: 'WAL-0003', whitelabelId: FINAPOP, ownerReference: { kind: 'investor', investorId: 'inv_proto_003' }, currency: 'BRL', representedBalance: 0, status: 'blocked', createdAt: '2026-01-20T16:10:00-03:00', updatedAt: '2026-09-26T11:48:00-03:00' },
  { walletId: 'WAL-0004', whitelabelId: FINAPOP, ownerReference: { kind: 'investor', investorId: 'inv_proto_009' }, currency: 'BRL', representedBalance: 75000, status: 'active', createdAt: '2026-02-26T12:20:00-03:00', updatedAt: '2026-10-02T09:00:00-03:00' },
  { walletId: 'WAL-0005', whitelabelId: FINAPOP, ownerReference: { kind: 'investor', investorId: 'inv_proto_011' }, currency: 'BRL', representedBalance: 90000, status: 'active', createdAt: '2025-12-04T15:00:00-03:00', updatedAt: '2026-09-15T13:37:00-03:00' },
  { walletId: 'WAL-0006', whitelabelId: FINAPOP, ownerReference: { kind: 'context', label: 'Operações internas', reference: 'OPR-0001' }, currency: 'BRL', representedBalance: 5000, status: 'active', createdAt: '2026-01-05T09:00:00-03:00', updatedAt: '2026-10-03T09:24:00-03:00' },
  { walletId: 'WAL-0007', whitelabelId: LOOR, ownerReference: { kind: 'investor', investorId: 'inv_proto_013' }, currency: 'BRL', representedBalance: 65000, status: 'active', createdAt: '2026-06-14T10:40:00-03:00', updatedAt: '2026-10-02T12:10:00-03:00' },
  { walletId: 'WAL-0008', whitelabelId: LOOR, ownerReference: { kind: 'context', label: 'Operações internas', reference: 'OPR-0002' }, currency: 'BRL', representedBalance: 0, status: 'blocked', createdAt: '2026-02-01T09:10:00-03:00', updatedAt: '2026-08-18T17:45:00-03:00' },
  { walletId: 'WAL-0009', whitelabelId: FINAPOP, ownerReference: { kind: 'investor', investorId: 'inv_proto_006' }, currency: 'BRL', representedBalance: 0, status: 'active', createdAt: '2026-05-19T10:10:00-03:00', updatedAt: '2026-05-19T10:10:00-03:00' },
]

const paymentCredit = (id: string) => `Crédito relacionado ao pagamento ${id}`

export const PROTOTYPE_WALLET_MOVEMENTS: WalletMovement[] = [
  { movementId: 'MOV-0001', walletId: 'WAL-0001', direction: 'credit', amount: 120000, currency: 'BRL', status: 'completed', description: paymentCredit('PG-00045'), sourceType: 'payment', sourceId: 'PG-00045', createdAt: '2026-08-04T10:22:00-03:00', updatedAt: '2026-08-04T10:23:00-03:00' },
  { movementId: 'MOV-0002', walletId: 'WAL-0001', direction: 'credit', amount: 85000, currency: 'BRL', status: 'completed', description: paymentCredit('PG-00046'), sourceType: 'payment', sourceId: 'PG-00046', createdAt: '2026-09-02T15:50:00-03:00', updatedAt: '2026-09-02T15:50:00-03:00' },
  { movementId: 'MOV-0003', walletId: 'WAL-0001', direction: 'debit', amount: 85000, currency: 'BRL', status: 'completed', description: 'Registro vinculado ao investimento INV-0002', sourceType: 'investment', sourceId: 'INV-0002', createdAt: '2026-09-02T16:05:00-03:00', updatedAt: '2026-09-02T16:05:00-03:00' },
  { movementId: 'MOV-0004', walletId: 'WAL-0001', direction: 'debit', amount: 5000, currency: 'BRL', status: 'pending', description: 'Transferência entre wallets (ilustrativa)', sourceType: 'transfer', sourceId: 'TRF-0001', createdAt: '2026-10-03T09:24:00-03:00', updatedAt: '2026-10-03T09:24:00-03:00' },
  { movementId: 'MOV-0005', walletId: 'WAL-0001', direction: 'credit', amount: 40000, currency: 'BRL', status: 'pending', description: 'Crédito aguardando o pagamento PG-00047', sourceType: 'payment', sourceId: 'PG-00047', createdAt: '2026-10-03T09:20:00-03:00', updatedAt: '2026-10-03T09:20:00-03:00' },
  { movementId: 'MOV-0006', walletId: 'WAL-0002', direction: 'credit', amount: 140000, currency: 'BRL', status: 'completed', description: paymentCredit('PG-00040'), sourceType: 'payment', sourceId: 'PG-00040', createdAt: '2026-07-08T16:58:00-03:00', updatedAt: '2026-07-08T16:58:00-03:00' },
  { movementId: 'MOV-0007', walletId: 'WAL-0002', direction: 'debit', amount: 140000, currency: 'BRL', status: 'completed', description: 'Registro vinculado ao investimento INV-0006', sourceType: 'investment', sourceId: 'INV-0006', createdAt: '2026-07-08T17:05:00-03:00', updatedAt: '2026-07-08T17:05:00-03:00' },
  { movementId: 'MOV-0008', walletId: 'WAL-0002', direction: 'credit', amount: 50000, currency: 'BRL', status: 'completed', description: paymentCredit('PG-00048'), sourceType: 'payment', sourceId: 'PG-00048', createdAt: '2026-08-19T14:37:00-03:00', updatedAt: '2026-08-19T14:37:00-03:00' },
  { movementId: 'MOV-0009', walletId: 'WAL-0003', direction: 'credit', amount: 60000, currency: 'BRL', status: 'completed', description: paymentCredit('PG-00038'), sourceType: 'payment', sourceId: 'PG-00038', createdAt: '2026-06-17T11:41:00-03:00', updatedAt: '2026-06-17T11:41:00-03:00' },
  { movementId: 'MOV-0010', walletId: 'WAL-0003', direction: 'credit', amount: 15000, currency: 'BRL', status: 'failed', description: 'Crédito não concluído — pagamento PG-00037', sourceType: 'payment', sourceId: 'PG-00037', createdAt: '2026-05-12T09:48:00-03:00', updatedAt: '2026-05-12T09:48:00-03:00' },
  { movementId: 'MOV-0011', walletId: 'WAL-0004', direction: 'credit', amount: 75000, currency: 'BRL', status: 'completed', description: paymentCredit('PG-00041'), sourceType: 'payment', sourceId: 'PG-00041', createdAt: '2026-05-26T10:51:00-03:00', updatedAt: '2026-05-26T10:51:00-03:00' },
  { movementId: 'MOV-0012', walletId: 'WAL-0004', direction: 'credit', amount: 12000, currency: 'BRL', status: 'pending', description: 'Crédito aguardando o pagamento PG-00042', sourceType: 'payment', sourceId: 'PG-00042', createdAt: '2026-10-02T09:00:00-03:00', updatedAt: '2026-10-02T09:00:00-03:00' },
  { movementId: 'MOV-0013', walletId: 'WAL-0005', direction: 'credit', amount: 35000, currency: 'BRL', status: 'completed', description: paymentCredit('PG-00036'), sourceType: 'payment', sourceId: 'PG-00036', createdAt: '2026-04-14T10:06:00-03:00', updatedAt: '2026-04-14T10:06:00-03:00' },
  { movementId: 'MOV-0014', walletId: 'WAL-0005', direction: 'debit', amount: 35000, currency: 'BRL', status: 'completed', description: 'Registro vinculado ao investimento INV-0011', sourceType: 'investment', sourceId: 'INV-0011', createdAt: '2026-04-14T10:15:00-03:00', updatedAt: '2026-04-14T10:15:00-03:00' },
  { movementId: 'MOV-0015', walletId: 'WAL-0005', direction: 'credit', amount: 90000, currency: 'BRL', status: 'completed', description: paymentCredit('PG-00044'), sourceType: 'payment', sourceId: 'PG-00044', createdAt: '2026-08-30T17:31:00-03:00', updatedAt: '2026-08-30T17:31:00-03:00' },
  { movementId: 'MOV-0016', walletId: 'WAL-0005', direction: 'debit', amount: 1200, currency: 'BRL', status: 'completed', description: 'Registro operacional (origem não detalhada no protótipo)', sourceType: 'other', createdAt: '2026-09-15T13:37:00-03:00', updatedAt: '2026-09-15T13:37:00-03:00' },
  { movementId: 'MOV-0017', walletId: 'WAL-0006', direction: 'credit', amount: 5000, currency: 'BRL', status: 'pending', description: 'Transferência entre wallets (ilustrativa)', sourceType: 'transfer', sourceId: 'TRF-0001', createdAt: '2026-10-03T09:24:00-03:00', updatedAt: '2026-10-03T09:24:00-03:00' },
  { movementId: 'MOV-0018', walletId: 'WAL-0007', direction: 'credit', amount: 20000, currency: 'BRL', status: 'failed', description: 'Crédito não concluído — pagamento PG-00039', sourceType: 'payment', sourceId: 'PG-00039', createdAt: '2026-06-20T15:40:00-03:00', updatedAt: '2026-06-20T15:40:00-03:00' },
  { movementId: 'MOV-0019', walletId: 'WAL-0007', direction: 'credit', amount: 65000, currency: 'BRL', status: 'completed', description: paymentCredit('PG-00050'), sourceType: 'payment', sourceId: 'PG-00050', createdAt: '2026-09-21T11:21:00-03:00', updatedAt: '2026-09-21T11:21:00-03:00' },
  { movementId: 'MOV-0020', walletId: 'WAL-0007', direction: 'credit', amount: 45000, currency: 'BRL', status: 'pending', description: 'Crédito aguardando o pagamento PG-00051', sourceType: 'payment', sourceId: 'PG-00051', createdAt: '2026-10-02T12:10:00-03:00', updatedAt: '2026-10-02T12:10:00-03:00' },
]
