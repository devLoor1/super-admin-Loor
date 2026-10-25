import { PROTOTYPE_ACCOUNTS } from '../features/whitelabel-accounts/prototypeAccounts'
import { PROTOTYPE_WHITELABELS } from '../features/whitelabels/prototypeWhitelabels'
import oldFinance from './fixtures/legacy-finance.json'
import oldOpportunities from './fixtures/legacy-opportunities.json'
import oldAudit from './fixtures/legacy-audit.json'

/** Offline examples only. Numeric ids below belong solely to this simulated database. */
export type MockRow = { id: number; [key: string]: unknown }
export const STAMP = '2026-10-25T12:00:00.000Z'
export const MONEY = { currency: 'BRL', unit: 'centavos' }
export const CARDINALITY = { entrepreneurToCompany: '0..1', companyToEntrepreneur: '1' }
export const OPERATOR_ID = 'cmock00000000000000000001'
export const MOCK_SESSION = 'offline-demo-session-not-a-real-token'
export const operator = { id: OPERATOR_ID, name: 'Operador de demonstração', email: 'demo@example.invalid', roles: ['SUPER_ADMIN'] }
export const legacyNumber = (id: string) => Number(id.match(/(\d+)$/)?.[1] ?? 1)
const tenant = legacyNumber
const dates = { createdAt: STAMP, updatedAt: STAMP }

export function initialMockDatabase() {
  const whitelabels: MockRow[] = PROTOTYPE_WHITELABELS.map(w => ({ id: tenant(w.id), idKey: String(tenant(w.id)), name: `${w.name} · Demo`, slug: `${w.slug}-demo`,
    baseUrl: `https://${w.slug}.example.invalid`, domain: `${w.slug}.example.invalid`, status: w.status === 'inactive' ? 'inactive' : 'active', isActive: w.status !== 'inactive',
    admins: PROTOTYPE_ACCOUNTS.filter(a => a.whitelabelId === w.id && a.type === 'admin').length,
    counts: { investors: PROTOTYPE_ACCOUNTS.filter(a => a.whitelabelId === w.id && a.type === 'investor').length }, ...dates }))
  const accounts: MockRow[] = PROTOTYPE_ACCOUNTS.map(a => ({ id: legacyNumber(a.id), type: a.type, whitelabelId: tenant(a.whitelabelId), fullName: a.name, name: a.name,
    email: a.email.replace(/@.*$/, '@example.invalid'), phone: null, documentMasked: a.type === 'admin' ? null : a.document,
    accessState: a.accessState, businessState: a.type === 'admin' ? a.accessState === 'paused' ? 'disabled' : 'active' : 'approved', status: 'approved', personalInformationFilled: true,
    investorType: 'individual', emailVerifiedAt: STAMP, termsAcceptedAt: a.type === 'investor' ? a.terms.acceptedAt : null,
    termsRevisionId: a.type === 'investor' ? a.terms.acceptedRevision : null,
    invitation: a.type === 'admin' ? a.invitation : undefined, isSuperAdmin: false, ...dates }))
  const investors = accounts.filter(a => a.type === 'investor'), entrepreneurs = accounts.filter(a => a.type === 'entrepreneur'), admins = accounts.filter(a => a.type === 'admin')
  const companies: MockRow[] = PROTOTYPE_ACCOUNTS.filter(a => a.type === 'entrepreneur' && a.company.name).map(a => ({ id: 300 + legacyNumber(a.id), entrepreneurId: legacyNumber(a.id), whitelabelId: tenant(a.whitelabelId),
    legalName: a.type === 'entrepreneur' ? a.company.name : 'Empresa Demo', tradeName: a.name + ' · Demo', cnpj: '**.***.***/****-00', status: 'validated', email: `company-${legacyNumber(a.id)}@example.invalid`, phone: null, validationSource: null, validatedAt: STAMP, ...dates }))
  const opportunities: MockRow[] = oldOpportunities.PROTOTYPE_OPPORTUNITIES.map(o => ({ id: legacyNumber(o.id), whitelabelId: tenant(o.whitelabelId), entrepreneurId: o.entrepreneurId ? legacyNumber(o.entrepreneurId) : 1,
    name: o.name, businessName: o.name + ' · Demo', description: o.description, about: o.description, status: o.status === 'draft' ? 'review' : o.status === 'paused' ? 'review' : o.status === 'closed' ? 'finished' : o.status,
    modality: o.modality, isPrivate: false, segment: { id: o.name.includes('Capital de Giro') ? 2 : 1, name: o.name.includes('Capital de Giro') ? 'Capital de Giro' : 'Tecnologia' },
    resourceUse: { code: o.name.includes('Capital de Giro') ? 'capital_giro' : 'expansao', name: o.name.includes('Capital de Giro') ? 'Capital de Giro' : 'Expansão' },
    segment_id: o.name.includes('Capital de Giro') ? 2 : 1, resource_utilization: o.name.includes('Capital de Giro') ? 'capital_giro' : 'expansao', image_id: 1,
    company_cnpj: '**.***.***/****-00', cpf: '***.***.***-00', spe_cnpj: '**.***.***/****-00', quotaQuantity: 100, reasonForArchiving: null, fundraisingCompletion: 'pending',
    ...dates, updatedAt: o.updatedAt, dueAt: '2026-12-31T12:00:00.000Z', openedAt: STAMP, endedAt: null }))
  // Current payment parser requires all three explicit references. Historical orphan payments remain in the recovered JSON, never assigned invented relationships.
  const payments: MockRow[] = oldFinance.PROTOTYPE_PAYMENTS.filter(p => p.investmentId && p.investorId && p.opportunityId).map(p => ({ id: legacyNumber(p.paymentId), whitelabelId: tenant(p.whitelabelId), investmentId: p.investmentId ? legacyNumber(p.investmentId) : null,
    investorId: p.investorId ? legacyNumber(p.investorId) : null, opportunityId: p.opportunityId ? legacyNumber(p.opportunityId) : null, paymentMethod: p.method, type: 'investment_pix', provider: 'demo_provider',
    amountCents: Math.round(p.amount * 100), currency: 'BRL', status: p.status === 'processing' ? 'processing' : p.status === 'pending' ? 'waiting_payment' : p.status,
    txid: 'DEMO-' + p.paymentId, paymentAt: p.paidAt ?? null, expirationAt: null, liquidationAt: null, externalEndToEndId: null, ...dates, createdAt: p.createdAt, updatedAt: p.updatedAt }))
  const investments: MockRow[] = oldFinance.PROTOTYPE_INVESTMENTS.map(i => ({ id: legacyNumber(i.investmentId), whitelabelId: tenant(i.whitelabelId), investorId: legacyNumber(i.investorId), opportunityId: legacyNumber(i.opportunityId),
    amountCents: Math.round(i.amount * 100), currency: 'BRL', quoteQuantity: 3, status: i.status === 'active' ? 'paid' : i.status === 'closed' ? 'refunded' : 'pending', anonymous: false, riskAcceptanceAt: STAMP,
    investor: { id: legacyNumber(i.investorId), fullName: investors.find(r => r.id === legacyNumber(i.investorId))?.fullName ?? 'Investidor Demo' },
    opportunity: { id: legacyNumber(i.opportunityId), name: opportunities.find(r => r.id === legacyNumber(i.opportunityId))?.name ?? 'Oportunidade Demo' },
    payment: i.paymentId ? payments.find(p => p.id === legacyNumber(i.paymentId!)) ?? null : null, ...dates, createdAt: i.createdAt, updatedAt: i.updatedAt }))
  // Current contract owns wallets by Whitelabel; historical investor-wallet identities stay in the recovered JSON, never guessed into this contract.
  const wallets: MockRow[] = whitelabels.map(w => ({ id: w.id, whitelabelId: w.id, ownerType: 'whitelabel', ownerId: w.id, name: w.name, slug: w.slug, currency: 'BRL',
    authoritativeBalanceCents: 250000, balanceTimestamp: STAMP, summary: { totalInCents: 400000, totalOutCents: 150000, authoritativeBalanceCents: 250000, countIn: 12, countOut: 5 }, ...dates }))
  // Preserved independent historical movement seeds, never derived from payment/investment status or used to calculate a balance.
  const movements = oldFinance.PROTOTYPE_WALLET_MOVEMENTS.map(m => ({ id: `demo:${legacyNumber(m.movementId)}`, whitelabelId: tenant(oldFinance.PROTOTYPE_WALLETS.find(w => w.walletId === m.walletId)?.whitelabelId ?? 'wl_proto_01'),
    kind: m.direction === 'credit' ? 'in' : 'out', category: 'demo_history', amountCents: Math.round(m.amount * 100), currency: 'BRL', date: m.createdAt, description: m.description,
    counterparty: null, opportunity: null, reference: { demo_source: m.sourceId ?? null }, provider: 'demo_provider', status: m.status }))
  const audit = oldAudit.PROTOTYPE_AUDIT_EVENTS.map((a, index) => ({ id: `cmockaudit${String(index + 1).padStart(15, '0')}`, action: a.action, result: a.result === 'failure' ? 'failed' : 'success',
    superAdminId: OPERATOR_ID, superAdmin: operator, resourceType: a.resourceType, resourceId: a.resourceId, whitelabelId: a.whitelabelId ? tenant(a.whitelabelId) : null,
    beforeData: a.oldValue, afterData: a.newValue, ip: '192.0.2.10', userAgent: 'LOOR Offline Demo', correlationId: a.correlationId, createdAt: a.createdAt }))
  return { whitelabels, investors, entrepreneurs, admins, companies, opportunities, payments, investments, wallets, movements, audit }
}
