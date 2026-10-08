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
import { emailsSectionFromParam, type EmailsSection } from '../features/whitelabel-emails/emailModel'
import { accountTypeFromParam } from '../features/whitelabel-accounts/accountModel'
import type { AccountType } from '../features/whitelabel-accounts/accountModel'
import { isAuthenticated } from '../lib/authSession'
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

type Route =
  | { view: 'login' | 'dashboard' | 'whitelabels' }
  | { view: 'accounts'; whitelabelId: string; initialType?: AccountType }
  | { view: 'settings'; whitelabelId: string }
  | { view: 'emails'; whitelabelId: string; section?: EmailsSection }
  | { view: 'finance'; whitelabelId: string }
  | { view: 'finance-modalities'; whitelabelId: string }
  | { view: 'finance-catalogs'; whitelabelId: string }
  | { view: 'operation-opportunities'; entrepreneurId?: string }
  | { view: 'operation-opportunity-new' | 'operation-investors' | 'operation-entrepreneurs' }
  | { view: 'operation-opportunity'; opportunityId: string }
  | { view: 'operation-opportunity-edit'; opportunityId: string; focusClassification: boolean }
  | { view: 'operation-investor'; investorId: string }
  | { view: 'operation-entrepreneur'; entrepreneurId: string }

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

/**
 * `#/dashboard`, `#/whitelabels`, `#/whitelabels/:whitelabelId/accounts`
 * (optional `?tipo=investidores|empreendedores|administradores`),
 * `#/whitelabels/:whitelabelId/settings`, `#/whitelabels/:whitelabelId/emails`
 * (optional `?section=smtp|envios|templates`), `#/whitelabels/:whitelabelId/finance/gateways`,
 * `#/whitelabels/:whitelabelId/finance/modalities`,
 * `#/whitelabels/:whitelabelId/finance/segments-resource-uses`,
 * Operation (global): `#/operation/opportunities` (optional `?empreendedor=:id`),
 * `#/operation/opportunities/new`, `#/operation/opportunities/:opportunityId`
 * (`/edit`, optional `?secao=classificacao`), `#/operation/investors[/:investorId]`,
 * `#/operation/entrepreneurs[/:entrepreneurId]`
 * → session-guarded shell screens; anything else → login.
 */
function routeFromHash(): Route {
  const [path, search = ''] = window.location.hash.replace(/^#\/?/, '').split('?')
  if (path === 'dashboard' || path === 'whitelabels') return { view: path }
  const accounts = ACCOUNTS_PATH.exec(path)
  if (accounts) {
    return {
      view: 'accounts',
      whitelabelId: accounts[1],
      initialType: accountTypeFromParam(new URLSearchParams(search).get('tipo')),
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
  if (path === 'operation/investors') return { view: 'operation-investors' }
  if (path === 'operation/entrepreneurs') return { view: 'operation-entrepreneurs' }
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
  if (investor) return { view: 'operation-investor', investorId: investor[1] }
  const entrepreneur = ENTREPRENEUR_PATH.exec(path)
  if (entrepreneur) return { view: 'operation-entrepreneur', entrepreneurId: entrepreneur[1] }
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

  useEffect(() => {
    document.title = TITLES[route.view]
    document.documentElement.dataset.view = route.view
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', SHELL_VIEWS.has(route.view) ? '#0f131d' : '#14161d')
  }, [route.view])

  useEffect(() => {
    if (SHELL_VIEWS.has(route.view) && !authed) {
      window.location.hash = '#/login'
    }
  }, [route.view, authed])

  if (!authed || route.view === 'login') return <LoginPage />
  if (route.view === 'dashboard') return <DashboardPage />
  if (route.view === 'whitelabels') return <WhitelabelsPage />
  if (route.view === 'accounts') {
    return <WhitelabelAccountsPage whitelabelId={route.whitelabelId} initialType={route.initialType} />
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
  if (route.view === 'operation-investors') return <InvestorsPage />
  if (route.view === 'operation-investor') return <InvestorDetailPage key={route.investorId} investorId={route.investorId} />
  if (route.view === 'operation-entrepreneurs') return <EntrepreneursPage />
  if (route.view === 'operation-entrepreneur') {
    return <EntrepreneurDetailPage key={route.entrepreneurId} entrepreneurId={route.entrepreneurId} />
  }
  return <LoginPage />
}
