import { useEffect, useState } from 'react'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { LoginPage } from '../features/login/LoginPage'
import { WhitelabelsPage } from '../features/whitelabels/WhitelabelsPage'
import { WhitelabelAccountsPage } from '../features/whitelabel-accounts/WhitelabelAccountsPage'
import { WhitelabelSettingsPage } from '../features/whitelabel-settings/WhitelabelSettingsPage'
import { WhitelabelEmailsPage } from '../features/whitelabel-emails/WhitelabelEmailsPage'
import { FinanceGatewaysPage } from '../features/finance-gateways/FinanceGatewaysPage'
import { FinanceModalitiesPage } from '../features/finance-modalities/FinanceModalitiesPage'
import { FinanceCatalogsPage } from '../features/finance-catalogs/FinanceCatalogsPage'
import { OpportunitiesPage } from '../features/operation/opportunities/OpportunitiesPage'
import { OpportunityDetailPage } from '../features/operation/opportunities/OpportunityDetailPage'
import { OpportunityFormPage } from '../features/operation/opportunities/OpportunityFormPage'
import { InvestorsPage } from '../features/operation/investors/InvestorsPage'
import { InvestorDetailPage } from '../features/operation/investors/InvestorDetailPage'
import { EntrepreneursPage } from '../features/operation/entrepreneurs/EntrepreneursPage'
import { EntrepreneurDetailPage } from '../features/operation/entrepreneurs/EntrepreneurDetailPage'
import { CompaniesPage } from '../features/operation/companies/CompaniesPage'
import { CompanyDetailPage } from '../features/operation/companies/CompanyDetailPage'
import { InvestmentsPage } from '../features/finance-core/investments/InvestmentsPage'
import { InvestmentDetailPage } from '../features/finance-core/investments/InvestmentDetailPage'
import { PaymentsPage } from '../features/finance-core/payments/PaymentsPage'
import { PaymentDetailPage } from '../features/finance-core/payments/PaymentDetailPage'
import { WalletsPage } from '../features/finance-core/wallets/WalletsPage'
import { WalletDetailPage } from '../features/finance-core/wallets/WalletDetailPage'
import { KycListPage } from '../features/compliance-kyc/KycListPage'
import { KycDetailPage } from '../features/compliance-kyc/KycDetailPage'
import { AuditListPage } from '../features/governance-audit/AuditListPage'
import { AuditDetailPage } from '../features/governance-audit/AuditDetailPage'
import { MenuVisibilityPage } from '../features/menu-visibility/MenuVisibilityPage'
import { emailsSectionFromParam, type EmailsSection } from '../features/whitelabel-emails/emailModel'
import { isAuthenticated, subscribeSession, validateSession } from '../lib/authSession'
import { subscribePrototypeNavigation } from './prototypeNavigation'

type View =
  | 'login'
  | 'dashboard'
  | 'whitelabels'
  | 'accounts'
  | 'settings'
  | 'emails'
  | 'finance'
  | 'finance-modalities'
  | 'finance-catalogs'
  | 'operation-opportunities'
  | 'operation-opportunity-new'
  | 'operation-opportunity'
  | 'operation-opportunity-edit'
  | 'operation-investors'
  | 'operation-investor'
  | 'operation-entrepreneurs'
  | 'operation-entrepreneur'
  | 'operation-company-list'
  | 'operation-company'
  | 'finance-investments'
  | 'finance-investment'
  | 'finance-payments'
  | 'finance-payment'
  | 'finance-wallets'
  | 'finance-wallet'
  | 'compliance-kyc'
  | 'compliance-kyc-case'
  | 'audit'
  | 'audit-event'
  | 'settings-menu-visibility'

type Route =
  | { view: 'login' | 'dashboard' }
  | { view: 'whitelabels'; whitelabelId?: string; page?: string; query?: string; status?: string; search: string }
  | { view: 'accounts'; whitelabelId: string; tipo?: string; page?: string; query?: string; conta?: string; search: string }
  | { view: 'settings'; whitelabelId: string }
  | { view: 'emails'; whitelabelId: string; section?: EmailsSection }
  | { view: 'finance'; whitelabelId: string }
  | { view: 'finance-modalities'; whitelabelId: string }
  | { view: 'finance-catalogs'; whitelabelId: string }
  | { view: 'operation-opportunities'; entrepreneurId?: string }
  | { view: 'operation-opportunity-new' }
  | { view: 'operation-entrepreneurs'; whitelabel?: string; page?: string; query?: string; search: string }
  | { view: 'operation-investors'; whitelabel?: string; page?: string; query?: string; search: string }
  | { view: 'operation-opportunity'; opportunityId: string }
  | { view: 'operation-opportunity-edit'; opportunityId: string; focusClassification: boolean }
  | { view: 'operation-investor'; investorId: string; returnTo?: string }
  | { view: 'operation-entrepreneur'; entrepreneurId: string; returnTo?: string }
  | { view: 'operation-company-list'; whitelabel?: string; page?: string; query?: string; previa?: string; search: string }
  | { view: 'operation-company'; companyId: string; returnTo?: string; previa?: string }
  | { view: 'finance-investments'; investorId?: string; walletId?: string }
  | { view: 'finance-investment'; investmentId: string }
  | { view: 'finance-payments'; walletId?: string }
  | { view: 'finance-payment'; paymentId: string }
  | { view: 'finance-wallets' }
  | { view: 'finance-wallet'; walletId: string; movementId?: string }
  | { view: 'compliance-kyc'; participant?: string; whitelabel?: string; status?: string; search: string }
  | { view: 'compliance-kyc-case'; kycCaseId: string }
  | {
      view: 'audit'
      page?: string
      query?: string
      order?: string
      resourceType?: string
      resourceId?: string
      whitelabel?: string
      actor?: string
      action?: string
      search: string
    }
  | { view: 'audit-event'; auditEventId: string; returnTo?: string }
  | { view: 'settings-menu-visibility'; previa?: string }

const TITLES: Record<View, string> = {
  login: 'Super Admin · Acesso administrativo',
  dashboard: 'Super Admin · Dashboard Global',
  whitelabels: 'Super Admin · Whitelabels',
  accounts: 'Super Admin · Contas do Whitelabel',
  settings: 'Super Admin · Configurações do Whitelabel',
  emails: 'Super Admin · E-mails do Whitelabel',
  finance: 'Super Admin · Financeiro / Gateways',
  'finance-modalities': 'Super Admin · Financeiro / Modalidades e regras',
  'finance-catalogs': 'Super Admin · Financeiro / Segmentos e usos dos recursos',
  'operation-opportunities': 'Super Admin · Operação / Oportunidades',
  'operation-opportunity-new': 'Super Admin · Operação / Nova oportunidade',
  'operation-opportunity': 'Super Admin · Operação / Oportunidade',
  'operation-opportunity-edit': 'Super Admin · Operação / Editar oportunidade',
  'operation-investors': 'Super Admin · Operação / Investidores',
  'operation-investor': 'Super Admin · Operação / Investidor',
  'operation-entrepreneurs': 'Super Admin · Operação / Empreendedores',
  'operation-entrepreneur': 'Super Admin · Operação / Empreendedor',
  'operation-company-list': 'Super Admin · Operação / Empresas',
  'operation-company': 'Super Admin · Operação / Empresa',
  'finance-investments': 'Super Admin · Financeiro / Investimentos',
  'finance-investment': 'Super Admin · Financeiro / Investimento',
  'finance-payments': 'Super Admin · Financeiro / Pagamentos / PIX',
  'finance-payment': 'Super Admin · Financeiro / Pagamento',
  'finance-wallets': 'Super Admin · Financeiro / Wallet',
  'finance-wallet': 'Super Admin · Financeiro / Wallet (detalhe)',
  'compliance-kyc': 'Super Admin · Compliance / KYC',
  'compliance-kyc-case': 'Super Admin · Compliance / Caso KYC',
  audit: 'Super Admin · Auditoria',
  'audit-event': 'Super Admin · Auditoria / Evento',
  'settings-menu-visibility': 'Super Admin · Configurações / Visibilidade dos módulos',
}

/** Views rendered inside the dark App Shell (require Control Plane session). */
const SHELL_VIEWS: ReadonlySet<View> = new Set<View>([
  'dashboard',
  'whitelabels',
  'accounts',
  'settings',
  'emails',
  'finance',
  'finance-modalities',
  'finance-catalogs',
  'operation-opportunities',
  'operation-opportunity-new',
  'operation-opportunity',
  'operation-opportunity-edit',
  'operation-investors',
  'operation-investor',
  'operation-entrepreneurs',
  'operation-entrepreneur',
  'operation-company-list',
  'operation-company',
  'finance-investments',
  'finance-investment',
  'finance-payments',
  'finance-payment',
  'finance-wallets',
  'finance-wallet',
  'compliance-kyc',
  'compliance-kyc-case',
  'audit',
  'audit-event',
  'settings-menu-visibility',
])

const ACCOUNTS_PATH = /^whitelabels\/([\w-]+)\/accounts$/
const SETTINGS_PATH = /^whitelabels\/([\w-]+)\/settings$/
const EMAILS_PATH = /^whitelabels\/([\w-]+)\/emails$/
const FINANCE_GATEWAYS_PATH = /^whitelabels\/([\w-]+)\/finance\/gateways$/
const FINANCE_MODALITIES_PATH = /^whitelabels\/([\w-]+)\/finance\/modalities$/
const FINANCE_CATALOGS_PATH = /^whitelabels\/([\w-]+)\/finance\/segments-resource-uses$/
const OPPORTUNITY_PATH = /^operation\/opportunities\/([\w-]+)$/
const OPPORTUNITY_EDIT_PATH = /^operation\/opportunities\/([\w-]+)\/edit$/
const INVESTOR_PATH = /^operation\/investors\/([\w-]+)$/
const ENTREPRENEUR_PATH = /^operation\/entrepreneurs\/([\w-]+)$/
/** Companies prototype detail: any non-empty segment, so unknown / malformed ids reach the not-found state. */
const COMPANY_PATH = /^operation\/companies\/([^/]+)$/
/** Finance Core detail ids: any non-empty segment, so malformed ids reach the not-found state. */
const INVESTMENT_PATH = /^finance\/investments\/([^/]+)$/
const PAYMENT_PATH = /^finance\/payments\/([^/]+)$/
const WALLET_PATH = /^finance\/wallets\/([^/]+)$/
/** Compliance › KYC and Auditoria detail ids: any non-empty segment (malformed ids → not-found). */
const KYC_CASE_PATH = /^compliance\/kyc\/([^/]+)$/
const AUDIT_EVENT_PATH = /^audit\/([^/]+)$/

function decodeSegment(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/**
 * `#/dashboard`, `#/whitelabels` (optional `?id=` Backend Whitelabel id, `?page=`,
 * `?search=`, `?status=active|inactive`), `#/whitelabels/:whitelabelId/accounts`
 * (Core Whitelabel id; optional `?tipo=investidores|empreendedores|administradores`,
 * `?page=`, `?search=`, `?conta=` account id within that tipo),
 * `#/whitelabels/:whitelabelId/settings`, `#/whitelabels/:whitelabelId/emails`
 * (optional `?section=smtp|envios|templates`), `#/whitelabels/:whitelabelId/finance/gateways`,
 * `#/whitelabels/:whitelabelId/finance/modalities`,
 * `#/whitelabels/:whitelabelId/finance/segments-resource-uses`,
 * Operation (global): `#/operation/opportunities` (optional `?empreendedor=:id`),
 * `#/operation/opportunities/new`, `#/operation/opportunities/:opportunityId`
 * (`/edit`, optional `?secao=classificacao`), `#/operation/investors` (optional `?whitelabel=`
 * Core Whitelabel id, `?page=`, `?search=`), `#/operation/investors/:investorId` (Core id),
 * `#/operation/entrepreneurs` (optional `?whitelabel=` Core Whitelabel id, `?page=`, `?search=`),
 * `#/operation/entrepreneurs/:entrepreneurId` (Core id, optional `?returnTo=` list context),
 * Empresas (prototype, contextual page under Empreendedores — no menu id of its own):
 * `#/operation/companies` (optional `?whitelabel=` illustrative ref, `?page=`, `?search=`,
 * prototype-only `?previa=`), `#/operation/companies/:companyId` (optional `?returnTo=`, `?previa=`),
 * Finance Core (global): `#/finance/investments` (optional `?investidor=` / `?wallet=`),
 * `#/finance/investments/:investmentId`, `#/finance/payments` (optional `?wallet=`),
 * `#/finance/payments/:paymentId`, `#/finance/wallets`,
 * `#/finance/wallets/:walletId` (optional `?movimento=:movementId`),
 * Compliance › KYC: `#/compliance/kyc` (optional `?participant=`, `?whitelabel=`,
 * `?status=`), `#/compliance/kyc/:kycCaseId`,
 * Auditoria (Control Plane audit log): `#/audit` (optional `?search=`, `?order=asc`, `?page=`;
 * the prototype's `?resourceType=` / `?resourceId=` / `?whitelabel=` / `?actor=` / `?action=`
 * are reported as unsupported), `#/audit/:auditEventId` (optional `?returnTo=` list context),
 * Configurações › Visibilidade dos módulos (persisted configuration read; saving and real
 * enforcement not enabled; existing `configuracoes` entry): `#/settings/menu-visibility`
 * (a leftover `?previa=` is only reported as ignored)
 * → session-guarded shell screens; anything else → login.
 */
function routeFromHash(): Route {
  const [path, search = ''] = window.location.hash.replace(/^#\/?/, '').split('?')
  if (path === 'dashboard') return { view: path }
  if (path === 'whitelabels') {
    const query = new URLSearchParams(search)
    const value = (key: string) => query.get(key) || undefined
    return { view: 'whitelabels', whitelabelId: value('id'), page: value('page'), query: value('search'), status: value('status'), search }
  }
  const accounts = ACCOUNTS_PATH.exec(path)
  if (accounts) {
    const query = new URLSearchParams(search)
    const value = (key: string) => query.get(key) || undefined
    return {
      view: 'accounts',
      whitelabelId: accounts[1],
      tipo: value('tipo'),
      page: value('page'),
      query: value('search'),
      conta: value('conta'),
      search,
    }
  }
  const settings = SETTINGS_PATH.exec(path)
  if (settings) return { view: 'settings', whitelabelId: settings[1] }
  const emails = EMAILS_PATH.exec(path)
  if (emails) {
    return {
      view: 'emails',
      whitelabelId: emails[1],
      section: emailsSectionFromParam(new URLSearchParams(search).get('section')),
    }
  }
  const finance = FINANCE_GATEWAYS_PATH.exec(path)
  if (finance) return { view: 'finance', whitelabelId: finance[1] }
  const modalities = FINANCE_MODALITIES_PATH.exec(path)
  if (modalities) return { view: 'finance-modalities', whitelabelId: modalities[1] }
  const catalogs = FINANCE_CATALOGS_PATH.exec(path)
  if (catalogs) return { view: 'finance-catalogs', whitelabelId: catalogs[1] }
  const params = new URLSearchParams(search)
  if (path === 'operation/opportunities') {
    return { view: 'operation-opportunities', entrepreneurId: params.get('empreendedor') ?? undefined }
  }
  if (path === 'operation/opportunities/new') return { view: 'operation-opportunity-new' }
  if (path === 'operation/investors') {
    return {
      view: 'operation-investors',
      whitelabel: params.get('whitelabel') || undefined,
      page: params.get('page') || undefined,
      query: params.get('search') || undefined,
      search,
    }
  }
  if (path === 'operation/entrepreneurs') {
    return {
      view: 'operation-entrepreneurs',
      whitelabel: params.get('whitelabel') || undefined,
      page: params.get('page') || undefined,
      query: params.get('search') || undefined,
      search,
    }
  }
  const opportunityEdit = OPPORTUNITY_EDIT_PATH.exec(path)
  if (opportunityEdit) {
    return {
      view: 'operation-opportunity-edit',
      opportunityId: opportunityEdit[1],
      focusClassification: params.get('secao') === 'classificacao',
    }
  }
  const opportunity = OPPORTUNITY_PATH.exec(path)
  if (opportunity) return { view: 'operation-opportunity', opportunityId: opportunity[1] }
  const investor = INVESTOR_PATH.exec(path)
  if (investor) return { view: 'operation-investor', investorId: investor[1], returnTo: params.get('returnTo') ?? undefined }
  const entrepreneur = ENTREPRENEUR_PATH.exec(path)
  if (entrepreneur) {
    return { view: 'operation-entrepreneur', entrepreneurId: entrepreneur[1], returnTo: params.get('returnTo') ?? undefined }
  }
  if (path === 'operation/companies') {
    return {
      view: 'operation-company-list',
      whitelabel: params.get('whitelabel') || undefined,
      page: params.get('page') || undefined,
      query: params.get('search') || undefined,
      previa: params.get('previa') || undefined,
      search,
    }
  }
  const company = COMPANY_PATH.exec(path)
  if (company) {
    return {
      view: 'operation-company',
      companyId: decodeSegment(company[1]),
      returnTo: params.get('returnTo') ?? undefined,
      previa: params.get('previa') || undefined,
    }
  }
  if (path === 'finance/investments') {
    return {
      view: 'finance-investments',
      investorId: params.get('investidor') ?? undefined,
      walletId: params.get('wallet') ?? undefined,
    }
  }
  if (path === 'finance/payments') return { view: 'finance-payments', walletId: params.get('wallet') ?? undefined }
  if (path === 'finance/wallets') return { view: 'finance-wallets' }
  const investment = INVESTMENT_PATH.exec(path)
  if (investment) return { view: 'finance-investment', investmentId: decodeSegment(investment[1]) }
  const payment = PAYMENT_PATH.exec(path)
  if (payment) return { view: 'finance-payment', paymentId: decodeSegment(payment[1]) }
  const wallet = WALLET_PATH.exec(path)
  if (wallet) {
    return { view: 'finance-wallet', walletId: decodeSegment(wallet[1]), movementId: params.get('movimento') ?? undefined }
  }
  const param = (key: string) => params.get(key) || undefined
  if (path === 'compliance/kyc') {
    return { view: 'compliance-kyc', participant: param('participant'), whitelabel: param('whitelabel'), status: param('status'), search }
  }
  const kycCase = KYC_CASE_PATH.exec(path)
  if (kycCase) return { view: 'compliance-kyc-case', kycCaseId: decodeSegment(kycCase[1]) }
  if (path === 'audit') {
    return {
      view: 'audit',
      page: param('page'),
      query: param('search'),
      order: param('order'),
      resourceType: param('resourceType'),
      resourceId: param('resourceId'),
      whitelabel: param('whitelabel'),
      actor: param('actor'),
      action: param('action'),
      search,
    }
  }
  const auditEvent = AUDIT_EVENT_PATH.exec(path)
  if (auditEvent) return { view: 'audit-event', auditEventId: decodeSegment(auditEvent[1]), returnTo: param('returnTo') }
  if (path === 'settings/menu-visibility') return { view: 'settings-menu-visibility', previa: param('previa') }
  return { view: 'login' }
}

export function App() {
  const [route, setRoute] = useState<Route>(routeFromHash)
  const [authed, setAuthed] = useState(() => isAuthenticated())

  useEffect(() => {
    // Session revocation must not depend on a draft accepting navigation.
    const refreshAuthentication = () => setAuthed(isAuthenticated())
    window.addEventListener('hashchange', refreshAuthentication)
    const onHashChange = () => {
      setAuthed(isAuthenticated())
      setRoute(routeFromHash())
      window.scrollTo(0, 0)
    }
    const unsubscribe = subscribePrototypeNavigation(onHashChange)
    return () => {
      window.removeEventListener('hashchange', refreshAuthentication)
      unsubscribe()
    }
  }, [])

  // Login, hydration, logout and a central 401 all re-evaluate the session gate.
  useEffect(() => subscribeSession(() => setAuthed(isAuthenticated())), [])

  // A session restored from storage is confirmed by the server in the
  // background (`GET /auth/me`); the shell renders meanwhile. A 401 clears
  // the session through the subscription above.
  useEffect(() => {
    if (!authed) return
    const controller = new AbortController()
    void validateSession(controller.signal)
    return () => controller.abort()
  }, [authed])

  useEffect(() => {
    document.title = TITLES[route.view]
    document.documentElement.dataset.view = route.view
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', SHELL_VIEWS.has(route.view) ? '#0f131d' : '#14161d')
  }, [route.view])

  useEffect(() => {
    // Replace (not push): Back from Login must not bounce into a guarded page again.
    if (SHELL_VIEWS.has(route.view) && !authed) {
      window.location.replace('#/login')
    }
  }, [route.view, authed])

  if (!authed || route.view === 'login') return <LoginPage />
  if (route.view === 'dashboard') return <DashboardPage />
  if (route.view === 'whitelabels') {
    return (
      <WhitelabelsPage
        whitelabelId={route.whitelabelId}
        page={route.page}
        search={route.query}
        status={route.status}
        routeKey={route.search}
      />
    )
  }
  if (route.view === 'accounts') {
    return (
      <WhitelabelAccountsPage
        whitelabelId={route.whitelabelId}
        tipo={route.tipo}
        page={route.page}
        search={route.query}
        conta={route.conta}
        routeKey={route.search}
      />
    )
  }
  if (route.view === 'settings') return <WhitelabelSettingsPage whitelabelId={route.whitelabelId} />
  if (route.view === 'emails') {
    return <WhitelabelEmailsPage whitelabelId={route.whitelabelId} section={route.section} />
  }
  if (route.view === 'finance') return <FinanceGatewaysPage whitelabelId={route.whitelabelId} />
  if (route.view === 'finance-modalities') return <FinanceModalitiesPage whitelabelId={route.whitelabelId} />
  if (route.view === 'finance-catalogs') return <FinanceCatalogsPage whitelabelId={route.whitelabelId} />
  if (route.view === 'operation-opportunities') return <OpportunitiesPage entrepreneurId={route.entrepreneurId} />
  if (route.view === 'operation-opportunity-new') return <OpportunityFormPage key="new" mode="create" />
  if (route.view === 'operation-opportunity-edit') {
    return (
      <OpportunityFormPage
        key={`edit:${route.opportunityId}`}
        mode="edit"
        opportunityId={route.opportunityId}
        focusClassification={route.focusClassification}
      />
    )
  }
  if (route.view === 'operation-opportunity') {
    return <OpportunityDetailPage key={route.opportunityId} opportunityId={route.opportunityId} />
  }
  if (route.view === 'operation-investors') {
    return <InvestorsPage whitelabel={route.whitelabel} page={route.page} search={route.query} routeKey={route.search} />
  }
  if (route.view === 'operation-investor') return <InvestorDetailPage key={route.investorId} investorId={route.investorId} returnTo={route.returnTo} />
  if (route.view === 'operation-entrepreneurs') {
    return <EntrepreneursPage whitelabel={route.whitelabel} page={route.page} search={route.query} routeKey={route.search} />
  }
  if (route.view === 'operation-entrepreneur') {
    return <EntrepreneurDetailPage key={route.entrepreneurId} entrepreneurId={route.entrepreneurId} returnTo={route.returnTo} />
  }
  if (route.view === 'operation-company-list') {
    return <CompaniesPage whitelabel={route.whitelabel} page={route.page} search={route.query} previa={route.previa} routeKey={route.search} />
  }
  if (route.view === 'operation-company') {
    return <CompanyDetailPage key={route.companyId} companyId={route.companyId} returnTo={route.returnTo} previa={route.previa} />
  }
  if (route.view === 'finance-investments') return <InvestmentsPage investorId={route.investorId} walletId={route.walletId} />
  if (route.view === 'finance-investment') {
    return <InvestmentDetailPage key={route.investmentId} investmentId={route.investmentId} />
  }
  if (route.view === 'finance-payments') return <PaymentsPage walletId={route.walletId} />
  if (route.view === 'finance-payment') return <PaymentDetailPage key={route.paymentId} paymentId={route.paymentId} />
  if (route.view === 'finance-wallets') return <WalletsPage />
  if (route.view === 'finance-wallet') {
    return <WalletDetailPage key={route.walletId} walletId={route.walletId} movementId={route.movementId} />
  }
  if (route.view === 'compliance-kyc') {
    return <KycListPage participant={route.participant} whitelabel={route.whitelabel} status={route.status} routeKey={route.search} />
  }
  if (route.view === 'compliance-kyc-case') return <KycDetailPage key={route.kycCaseId} kycCaseId={route.kycCaseId} />
  if (route.view === 'audit') {
    return (
      <AuditListPage
        page={route.page}
        search={route.query}
        order={route.order}
        resourceType={route.resourceType}
        resourceId={route.resourceId}
        whitelabel={route.whitelabel}
        actor={route.actor}
        action={route.action}
        routeKey={route.search}
      />
    )
  }
  if (route.view === 'audit-event') {
    return <AuditDetailPage key={route.auditEventId} auditEventId={route.auditEventId} returnTo={route.returnTo} />
  }
  if (route.view === 'settings-menu-visibility') return <MenuVisibilityPage previa={route.previa} />
  return <LoginPage />
}
