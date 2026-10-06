import { useEffect, useState } from 'react'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { LoginPage } from '../features/login/LoginPage'
import { WhitelabelsPage } from '../features/whitelabels/WhitelabelsPage'
import { WhitelabelAccountsPage } from '../features/whitelabel-accounts/WhitelabelAccountsPage'
import { WhitelabelSettingsPage } from '../features/whitelabel-settings/WhitelabelSettingsPage'
import { WhitelabelEmailsPage } from '../features/whitelabel-emails/WhitelabelEmailsPage'
import { emailsSectionFromParam, type EmailsSection } from '../features/whitelabel-emails/emailModel'
import { accountTypeFromParam } from '../features/whitelabel-accounts/accountModel'
import type { AccountType } from '../features/whitelabel-accounts/accountModel'
import { subscribePrototypeNavigation } from './prototypeNavigation'

type View = 'login' | 'dashboard' | 'whitelabels' | 'accounts' | 'settings' | 'emails'

type Route =
  | { view: 'login' | 'dashboard' | 'whitelabels' }
  | { view: 'accounts'; whitelabelId: string; initialType?: AccountType }
  | { view: 'settings'; whitelabelId: string }
  | { view: 'emails'; whitelabelId: string; section?: EmailsSection }

const TITLES: Record<View, string> = {
  login: 'Super Admin · Acesso administrativo',
  dashboard: 'Super Admin · Dashboard Global',
  whitelabels: 'Super Admin · Whitelabels',
  accounts: 'Super Admin · Contas do Whitelabel',
  settings: 'Super Admin · Configurações do Whitelabel',
  emails: 'Super Admin · E-mails do Whitelabel',
}

/** Views rendered inside the dark App Shell. */
const SHELL_VIEWS: ReadonlySet<View> = new Set<View>(['dashboard', 'whitelabels', 'accounts', 'settings', 'emails'])

const ACCOUNTS_PATH = /^whitelabels\/([\w-]+)\/accounts$/
const SETTINGS_PATH = /^whitelabels\/([\w-]+)\/settings$/
const EMAILS_PATH = /^whitelabels\/([\w-]+)\/emails$/

/**
 * `#/dashboard`, `#/whitelabels`, `#/whitelabels/:whitelabelId/accounts`
 * (optional `?tipo=investidores|empreendedores|administradores`),
 * `#/whitelabels/:whitelabelId/settings`, `#/whitelabels/:whitelabelId/emails`
 * (optional `?section=smtp|envios|templates`) → visual shell
 * screens (not an authentication guard); anything else → login.
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
    return { view: 'emails', whitelabelId: emails[1], section: emailsSectionFromParam(new URLSearchParams(search).get('section')) }
  }
  return { view: 'login' }
}

/**
 * Prototype-only view switch. There is no authentication: shell screens are
 * reached directly through their URL hash. Replace with a real router once
 * real routes, layouts and permission handling are needed.
 */
export function App() {
  const [route, setRoute] = useState<Route>(routeFromHash)

  useEffect(() => {
    const onHashChange = () => {
      setRoute(routeFromHash())
      window.scrollTo(0, 0)
    }
    return subscribePrototypeNavigation(onHashChange)
  }, [])

  useEffect(() => {
    document.title = TITLES[route.view]
    document.documentElement.dataset.view = route.view
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', SHELL_VIEWS.has(route.view) ? '#0f131d' : '#14161d')
  }, [route.view])

  if (route.view === 'dashboard') return <DashboardPage />
  if (route.view === 'whitelabels') return <WhitelabelsPage />
  if (route.view === 'accounts') {
    return <WhitelabelAccountsPage whitelabelId={route.whitelabelId} initialType={route.initialType} />
  }
  if (route.view === 'settings') return <WhitelabelSettingsPage whitelabelId={route.whitelabelId} />
  if (route.view === 'emails') return <WhitelabelEmailsPage whitelabelId={route.whitelabelId} section={route.section} />
  return <LoginPage />
}
