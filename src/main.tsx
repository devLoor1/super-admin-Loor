import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import './styles/tokens.css'
import './styles/global.css'
import { MockApp } from './mock/MockApp'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MockApp />
  </StrictMode>,
)
