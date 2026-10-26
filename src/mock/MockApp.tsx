import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { App } from '../app/App'
import { isAuthenticated, subscribeSession } from '../lib/authSession'
import { MockKycListPage } from '../features/compliance-kyc/MockKycListPage'
import { MockKycDetailPage } from '../features/compliance-kyc/MockKycDetailPage'
import { WhitelabelAccountsPage as LegacyAccountsPage } from './legacy-accounts/WhitelabelAccountsPage'
import styles from './MockApp.module.css'
import { watchAccountDraftSession } from './account-creation/accountCreationDrafts'

const DEMO_LINKS = [
  ['Dashboard', '#/dashboard'], ['Whitelabels / CRUD local', '#/whitelabels'], ['Contas / acesso local', '#/whitelabels/1/accounts'], ['Contas · protótipo / transferência local', '#/mock/accounts/wl_proto_01'],
  ['Settings · contrato de leitura', '#/whitelabels/1/settings'], ['Settings · protótipo editável', '#/whitelabels/wl_proto_01/settings'],
  ['E-mails / SMTP simulado', '#/whitelabels/wl_proto_01/emails'], ['Gateways / contas fictícias', '#/whitelabels/wl_proto_01/finance/gateways'],
  ['Modalidades / regras', '#/whitelabels/wl_proto_01/finance/modalities'], ['Segmentos / usos', '#/whitelabels/wl_proto_01/finance/segments-resource-uses'],
  ['Oportunidades', '#/operation/opportunities'], ['Criar oportunidade local', '#/operation/opportunities/new'], ['Investidores', '#/operation/investors'],
  ['Empreendedores', '#/operation/entrepreneurs'], ['Empresas', '#/operation/companies'], ['Investimentos · leitura', '#/finance/investments'],
  ['Pagamentos / PIX · leitura', '#/finance/payments'], ['Wallet / movimentos · leitura', '#/finance/wallets'], ['KYC · leitura atual', '#/compliance/kyc'],
  ['KYC · revisão local preservada', '#/mock/kyc'], ['Auditoria · eventos estáticos', '#/audit'], ['Operadores', '#/settings/operators'],
  ['Visibilidade · mapa local', '#/settings/menu-visibility'], ['Login / exemplos de perfil', '#/login'],
]

/** Mock-only entry. Local review actions remain distinct from the current read-only KYC contract. */
export function MockApp() {
  useEffect(() => watchAccountDraftSession(subscribeSession), [])
  const [hash, setHash] = useState(window.location.hash)
  const authed = useSyncExternalStore(subscribeSession, isAuthenticated)
  const [outboundBlocked, setOutboundBlocked] = useState(false)
  const gallery = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    const changed = () => { setHash(window.location.hash); if (gallery.current) gallery.current.open = false }
    const blockExternalLink = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null
      if (!anchor) return
      const url = new URL(anchor.getAttribute('href')!, window.location.href)
      if (url.origin !== window.location.origin && url.protocol !== 'blob:') { event.preventDefault(); setOutboundBlocked(true) }
    }
    window.addEventListener('hashchange', changed)
    document.addEventListener('click', blockExternalLink, true)
    return () => { window.removeEventListener('hashchange', changed); document.removeEventListener('click', blockExternalLink, true) }
  }, [])
  const url = new URL(hash.slice(1) || '/', window.location.origin)
  const legacyCase = /^\/mock\/kyc\/([^/]+)$/.exec(url.pathname)
  const legacyAccounts = /^\/mock\/accounts\/(wl_proto_0[123])$/.exec(url.pathname)
  const tipo = url.searchParams.get('tipo'), initialType = tipo === 'empreendedores' ? 'entrepreneur' : tipo === 'administradores' ? 'admin' : 'investor'
  const content = authed && legacyAccounts ? <LegacyAccountsPage key={legacyAccounts[1]} whitelabelId={legacyAccounts[1]} initialType={initialType} />
    : authed && legacyCase ? <MockKycDetailPage key={legacyCase[1]} kycCaseId={decodeURIComponent(legacyCase[1])} />
    : authed && url.pathname === '/mock/kyc' ? <MockKycListPage participant={url.searchParams.get('participant') ?? undefined} whitelabel={url.searchParams.get('whitelabel') ?? undefined} status={url.searchParams.get('status') ?? undefined} routeKey={url.search} /> : <App />
  return <>{content}<aside className={styles.tools} aria-label="Ambiente de demonstração offline">
    <details ref={gallery} onKeyDown={event => { if (event.key === 'Escape' && gallery.current?.open) { gallery.current.open = false; gallery.current.querySelector('summary')?.focus() } }}><summary>MOCK · dados sintéticos · telas</summary><div className={styles.panel}>
      <strong>Demonstração independente, sem Backend.</strong>
      <p>Alterações ficam somente na memória desta aba. Recarregar restaura os exemplos. Nunca informe senhas, identidades ou dados bancários reais.</p>
      <p>Login: <code>demo@example.invalid</code> / <code>demo</code>. Perfis: <code>readonly@example.invalid</code> ou <code>support@example.invalid</code>, mesma senha fictícia.</p>
      <nav aria-label="Galeria das telas de demonstração" onClick={() => { if (gallery.current) gallery.current.open = false }}>{DEMO_LINKS.map(([label, href]) => <a key={href} href={href}>{label}</a>)}</nav>
      <button type="button" onClick={() => window.location.reload()}>Restaurar dados da demonstração</button>
      {outboundBlocked ? <p role="status">Navegação externa bloqueada neste mock.</p> : null}
    </div></details>
  </aside></>
}
