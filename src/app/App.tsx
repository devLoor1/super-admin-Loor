import { useEffect, useState } from 'react'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { LoginPage } from '../features/login/LoginPage'

type View = 'login' | 'dashboard'

const TITLES: Record<View, string> = {
  login: 'Super Admin · Acesso administrativo',
  dashboard: 'Super Admin · Dashboard Global',
}

/** `#/dashboard` → visual shell (not an authentication guard); anything else → login. */
function viewFromHash(): View {
  return window.location.hash.replace(/^#\/?/, '') === 'dashboard' ? 'dashboard' : 'login'
}

/**
 * Prototype-only view switch. There is no authentication: the dashboard is
 * reached directly through its URL hash. Replace with a real router once more
 * than these two screens exist.
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
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', view === 'dashboard' ? '#0f131d' : '#14161d')
  }, [view])

  return view === 'dashboard' ? <DashboardPage /> : <LoginPage />
}
