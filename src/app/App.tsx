import { useEffect, useState } from 'react'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { LoginPage } from '../features/login/LoginPage'
import { WhitelabelsPage } from '../features/whitelabels/WhitelabelsPage'
import { WhitelabelAccountsPage } from '../features/whitelabel-accounts/WhitelabelAccountsPage'
import { OperationalSettingsPage } from '../features/whitelabel-settings/OperationalSettingsPage'
import { OperationalSmtpPage } from '../features/whitelabel-emails/OperationalSmtpPage'
import { OpportunitiesPage } from '../features/operation/opportunities/OpportunitiesPage'
import { OpportunityDetailPage } from '../features/operation/opportunities/OpportunityDetailPage'
import { OpportunityFormPage } from '../features/operation/opportunities/OpportunityFormPage'
import { InvestorsPage } from '../features/operation/investors/InvestorsPage'
import { InvestorDetailPage } from '../features/operation/investors/InvestorDetailPage'
import { EntrepreneursPage } from '../features/operation/entrepreneurs/EntrepreneursPage'
import { EntrepreneurDetailPage } from '../features/operation/entrepreneurs/EntrepreneurDetailPage'
import { CompaniesPage } from '../features/operation/companies/CompaniesPage'
import { CompanyDetailPage } from '../features/operation/companies/CompanyDetailPage'
import type { CompanyListProps } from '../features/operation/companies/companyRoute'
import type { OpportunityListProps } from '../features/operation/opportunities/opportunityRoute'
import { InvestmentsPage } from '../features/finance-core/investments/InvestmentsPage'
import { InvestmentDetailPage } from '../features/finance-core/investments/InvestmentDetailPage'
import { PaymentsPage } from '../features/finance-core/payments/PaymentsPage'
import { PaymentDetailPage } from '../features/finance-core/payments/PaymentDetailPage'
import { WalletsPage } from '../features/finance-core/wallets/WalletsPage'
import { WalletDetailPage } from '../features/finance-core/wallets/WalletDetailPage'
import type { FinanceListProps, RawParams, WalletListProps } from '../features/finance-core/shared/financeRoute'
import { KycListPage } from '../features/compliance-kyc/KycListPage'
import { KycDetailPage } from '../features/compliance-kyc/KycDetailPage'
import { AuditListPage } from '../features/governance-audit/AuditListPage'
import { AuditDetailPage } from '../features/governance-audit/AuditDetailPage'
import { MenuVisibilityPage } from '../features/menu-visibility/MenuVisibilityPage'
import { OperatorsListPage } from '../features/control-plane-operators/OperatorsListPage'
import { OperatorDetailPage } from '../features/control-plane-operators/OperatorDetailPage'
import { isAuthenticated, subscribeSession, validateSession } from '../lib/authSession'
import { subscribeNavigation } from './navigationGuard'
import { viewAvailable } from './presentationAvailability'
import { ReadinessUnavailablePage } from './ReadinessUnavailablePage'

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
  | 'control-plane-operators'
  | 'control-plane-operator'

type Route =
  | { view: 'login' | 'dashboard' }
  | { view: 'whitelabels'; whitelabelId?: string; page?: string; query?: string; status?: string; search: string }
  | { view: 'accounts'; whitelabelId: string; tipo?: string; page?: string; query?: string; conta?: string; search: string }
  | { view: 'settings'; whitelabelId: string; area?: string }
  | { view: 'emails'; whitelabelId: string; section?: string }
  | { view: 'finance'; whitelabelId: string }
  | { view: 'finance-modalities'; whitelabelId: string }
  | { view: 'finance-catalogs'; whitelabelId: string }
  | { view: 'operation-opportunities'; params: OpportunityListProps }
  | { view: 'operation-opportunity-new' }
  | { view: 'operation-entrepreneurs'; whitelabel?: string; page?: string; query?: string; search: string }
  | { view: 'operation-investors'; whitelabel?: string; page?: string; query?: string; search: string }
  | { view: 'operation-opportunity'; opportunityId: string; returnTo?: string }
  | { view: 'operation-opportunity-edit'; opportunityId: string; focusClassification: boolean }
  | { view: 'operation-investor'; investorId: string; returnTo?: string }
  | { view: 'operation-entrepreneur'; entrepreneurId: string; returnTo?: string }
  | { view: 'operation-company-list'; params: CompanyListProps }
  | { view: 'operation-company'; companyId: string; returnTo?: string; previa?: string }
  | { view: 'finance-investments'; params: FinanceListProps }
  | { view: 'finance-investment'; investmentId: string; returnTo?: string }
  | { view: 'finance-payments'; params: FinanceListProps }
  | { view: 'finance-payment'; paymentId: string; returnTo?: string }
  | { view: 'finance-wallets'; params: WalletListProps }
  | { view: 'finance-wallet'; walletId: string; params: RawParams; search: string }
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
  | { view: 'control-plane-operators'; rawQuery: string }
  | { view: 'control-plane-operator'; id: string; returnTo?: string; invalidQuery: boolean }

const TITLES: Record<View, string> = {
  'control-plane-operators': 'Super Admin · Operadores do Control Plane',
  'control-plane-operator': 'Super Admin · Consulta do operador',
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
  'control-plane-operators',
  'control-plane-operator',
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
/** Companies Read detail: any non-empty segment, so unknown / malformed ids reach the not-found state (only positive Core ids are requested). */
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

/** Finance Read list URL params, validated by each page before any request. */
function financeListParams(params: URLSearchParams, search: string): FinanceListProps {
  const value = (key: string) => params.get(key) || undefined
  return {
    status: value('status'),
    whitelabel: value('whitelabel'),
    investidor: value('investidor'),
    oportunidade: value('oportunidade'),
    search: value('search'),
    page: value('page'),
    sort: value('sort'),
    order: value('order'),
    wallet: value('wallet'),
    routeKey: search,
  }
}

const WALLET_DETAIL_KEYS = ['aba', 'mpage', 'tipo', 'categoria', 'oportunidade', 'ipage', 'istatus', 'movimento', 'returnTo'] as const

/**
 * `#/dashboard`, `#/whitelabels` (optional `?id=` Backend Whitelabel id, `?page=`,
 * `?search=`, `?status=active|inactive`), `#/whitelabels/:whitelabelId/accounts`
 * (Core Whitelabel id; optional `?tipo=investidores|empreendedores|administradores`,
 * `?page=`, `?search=`, `?conta=` account id within that tipo),
 * `#/whitelabels/:whitelabelId/settings`, `#/whitelabels/:whitelabelId/emails`
 * (optional `?section=smtp|envios|templates`), `#/whitelabels/:whitelabelId/finance/gateways`,
 * `#/whitelabels/:whitelabelId/finance/modalities`,
 * `#/whitelabels/:whitelabelId/finance/segments-resource-uses`,
 * Operation (global): `#/operation/opportunities` (Opportunities Read: optional `?whitelabel=`,
 * `?status=`, `?modalidade=`, `?search=`, `?page=`, `?sort=`, `?order=`; a leftover `?empreendedor=` is
 * reported as unsupported), `#/operation/opportunities/:opportunityId` (optional `?returnTo=`),
 * `#/operation/opportunities/new` and `/:id/edit` (read-only: "indisponível" state), `#/operation/investors` (optional `?whitelabel=`
 * Core Whitelabel id, `?page=`, `?search=`), `#/operation/investors/:investorId` (Core id),
 * `#/operation/entrepreneurs` (optional `?whitelabel=` Core Whitelabel id, `?page=`, `?search=`),
 * `#/operation/entrepreneurs/:entrepreneurId` (Core id, optional `?returnTo=` list context),
 * Empresas (Companies Read, contextual page under Empreendedores — no menu id of its own):
 * `#/operation/companies` (optional `?whitelabel=` Core id, `?status=`, `?search=`, `?page=`, `?sort=`,
 * `?order=`; a leftover `?previa=` is only reported as ignored), `#/operation/companies/:companyId`
 * (optional `?returnTo=`),
 * Finance Read (global, Control Plane GETs): `#/finance/investments` and `#/finance/payments`
 * (optional `?status=`, `?whitelabel=`, `?investidor=`, `?oportunidade=`, `?search=`, `?page=`,
 * `?sort=`, `?order=`), `#/finance/investments/:investmentId` and `#/finance/payments/:paymentId`
 * (optional `?returnTo=` list context), `#/finance/wallets` (optional `?search=`, `?page=`,
 * `?sort=`, `?order=`), `#/finance/wallets/:walletId` (optional `?aba=`, `?mpage=`, `?tipo=`,
 * `?categoria=`, `?oportunidade=`, `?ipage=`, `?istatus=`, `?movimento=`, `?returnTo=`),
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
  if (settings) {
    const query = new URLSearchParams(search)
    const validQuery = [...query.keys()].every(key => key === 'area') && query.getAll('area').length <= 1
    return { view: 'settings', whitelabelId: settings[1], area: validQuery ? query.get('area') ?? undefined : '__invalid__' }
  }
  const emails = EMAILS_PATH.exec(path)
  if (emails) {
    return {
      view: 'emails',
      whitelabelId: emails[1],
      section: [...new URLSearchParams(search).keys()].every(key => key === 'section') && new URLSearchParams(search).getAll('section').length <= 1 ? new URLSearchParams(search).get('section') ?? undefined : '__invalid__',
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
    const value = (key: string) => params.get(key) || undefined
    return {
      view: 'operation-opportunities',
      params: {
        whitelabel: value('whitelabel'),
        status: value('status'),
        modalidade: value('modalidade'),
        search: value('search'),
        page: value('page'),
        sort: value('sort'),
        order: value('order'),
        empreendedor: value('empreendedor'),
        routeKey: search,
      },
    }
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
  if (opportunity) return { view: 'operation-opportunity', opportunityId: opportunity[1], returnTo: params.get('returnTo') ?? undefined }
  const investor = INVESTOR_PATH.exec(path)
  if (investor) return { view: 'operation-investor', investorId: investor[1], returnTo: params.get('returnTo') ?? undefined }
  const entrepreneur = ENTREPRENEUR_PATH.exec(path)
  if (entrepreneur) {
    return { view: 'operation-entrepreneur', entrepreneurId: entrepreneur[1], returnTo: params.get('returnTo') ?? undefined }
  }
  if (path === 'operation/companies') {
    const value = (key: string) => params.get(key) || undefined
    return {
      view: 'operation-company-list',
      params: {
        whitelabel: value('whitelabel'),
        status: value('status'),
        search: value('search'),
        page: value('page'),
        sort: value('sort'),
        order: value('order'),
        previa: value('previa'),
        routeKey: search,
      },
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
  if (path === 'finance/investments') return { view: 'finance-investments', params: financeListParams(params, search) }
  if (path === 'finance/payments') return { view: 'finance-payments', params: financeListParams(params, search) }
  if (path === 'finance/wallets') {
    const { search: query, page, sort, order, routeKey } = financeListParams(params, search)
    return { view: 'finance-wallets', params: { search: query, page, sort, order, routeKey } }
  }
  const investment = INVESTMENT_PATH.exec(path)
  if (investment) {
    return { view: 'finance-investment', investmentId: decodeSegment(investment[1]), returnTo: params.get('returnTo') ?? undefined }
  }
  const payment = PAYMENT_PATH.exec(path)
  if (payment) return { view: 'finance-payment', paymentId: decodeSegment(payment[1]), returnTo: params.get('returnTo') ?? undefined }
  const wallet = WALLET_PATH.exec(path)
  if (wallet) {
    const walletParams: RawParams = {}
    for (const key of WALLET_DETAIL_KEYS) walletParams[key] = params.get(key) || undefined
    return { view: 'finance-wallet', walletId: decodeSegment(wallet[1]), params: walletParams, search }
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
      search: window.location.hash.includes('?') ? window.location.hash.slice(window.location.hash.indexOf('?') + 1) : '',
    }
  }
  const auditEvent = AUDIT_EVENT_PATH.exec(path)
  if (auditEvent) return { view: 'audit-event', auditEventId: decodeSegment(auditEvent[1]), returnTo: param('returnTo') }
  if (path === 'settings/menu-visibility') return { view: 'settings-menu-visibility', previa: param('previa') }
  if (path === 'settings/operators') return { view: 'control-plane-operators', rawQuery: window.location.hash.split('?').slice(1).join('?') }
  if (path.startsWith('settings/operators/')) {
    return { view: 'control-plane-operator', id: decodeSegment(path.slice('settings/operators/'.length)), returnTo: param('returnTo'), invalidQuery: [...params.keys()].some(key => key !== 'returnTo' || params.getAll(key).length !== 1) }
  }
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
    const unsubscribe = subscribeNavigation(onHashChange)
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
  if (!viewAvailable(route.view)) return <ReadinessUnavailablePage />
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
  if (route.view === 'settings') return <OperationalSettingsPage whitelabelId={route.whitelabelId} area={route.area} />
  if (route.view === 'emails') return <OperationalSmtpPage whitelabelId={route.whitelabelId} section={route.section} />
  if (route.view === 'operation-opportunities') return <OpportunitiesPage {...route.params} />
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
    return <OpportunityDetailPage key={route.opportunityId} opportunityId={route.opportunityId} returnTo={route.returnTo} />
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
    return <CompaniesPage {...route.params} />
  }
  if (route.view === 'operation-company') {
    return <CompanyDetailPage key={route.companyId} companyId={route.companyId} returnTo={route.returnTo} previa={route.previa} />
  }
  if (route.view === 'finance-investments') return <InvestmentsPage {...route.params} />
  if (route.view === 'finance-investment') {
    return <InvestmentDetailPage key={route.investmentId} investmentId={route.investmentId} returnTo={route.returnTo} />
  }
  if (route.view === 'finance-payments') return <PaymentsPage {...route.params} />
  if (route.view === 'finance-payment') return <PaymentDetailPage key={route.paymentId} paymentId={route.paymentId} returnTo={route.returnTo} />
  if (route.view === 'finance-wallets') return <WalletsPage {...route.params} />
  if (route.view === 'finance-wallet') {
    // keyed by wallet: switching wallet A → B remounts, so no state or late response of A leaks into B
    return <WalletDetailPage key={route.walletId} walletId={route.walletId} routeKey={route.search} {...route.params} />
  }
  if (route.view === 'compliance-kyc') {
    return <KycListPage participant={route.participant} whitelabel={route.whitelabel} status={route.status} routeKey={route.search} />
  }
  if (route.view === 'compliance-kyc-case') return <KycDetailPage key={route.kycCaseId} kycCaseId={route.kycCaseId} />
  if (route.view === 'audit') {
    return (
      <AuditListPage
        rawQuery={route.search}
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
  if (route.view === 'control-plane-operators') return <OperatorsListPage rawQuery={route.rawQuery} />
  if (route.view === 'control-plane-operator') return <OperatorDetailPage key={route.id} id={route.id} returnTo={route.returnTo} invalidQuery={route.invalidQuery} />
  return <LoginPage />
}
