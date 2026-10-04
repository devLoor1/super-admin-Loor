import { useEffect, useState } from 'react'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { LoginPage } from '../features/login/LoginPage'
import { WhitelabelsPage } from '../features/whitelabels/WhitelabelsPage'

type View = 'login' | 'dashboard' | 'whitelabels'

const TITLES: Record<View, string> = {
  login: 'Super Admin · Acesso administrativo',
  dashboard: 'Super Admin · Dashboard Global',
  whitelabels: 'Super Admin · Whitelabels',
}

/** Views rendered inside the dark App Shell. */
const SHELL_VIEWS: ReadonlySet<View> = new Set<View>(['dashboard', 'whitelabels'])

/**
 * `#/dashboard`, `#/whitelabels` → visual shell screens (not an authentication
 * guard); anything else → login.
 */
function viewFromHash(): View {
  const path = window.location.hash.replace(/^#\/?/, '')
  if (path === 'dashboard' || path === 'whitelabels') return path
  return 'login'
}

/**
 * Prototype-only view switch. There is no authentication: shell screens are
 * reached directly through their URL hash. Replace with a real router once
 * real routes, layouts and permission handling are needed.
 */
export function App() {
  const [view, setView] = useState<View>(viewFromHash)

  useEffect(() => {
    const onHashChange = () => {
      setView(viewFromHash())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    document.title = TITLES[view]
    document.documentElement.dataset.view = view
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', SHELL_VIEWS.has(view) ? '#0f131d' : '#14161d')
  }, [view])

  if (view === 'dashboard') return <DashboardPage />
  if (view === 'whitelabels') return <WhitelabelsPage />
  return <LoginPage />
}
