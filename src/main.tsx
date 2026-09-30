import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import './styles/tokens.css'
import './styles/global.css'
import { LoginPage } from './features/login/LoginPage'

// Single-screen prototype: no router yet. The Super Admin login is the only view.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LoginPage />
  </StrictMode>,
)
