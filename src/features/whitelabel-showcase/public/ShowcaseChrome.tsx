/*
 * Ported from FRONT-WEB/src/views/mock/whitelabels/ShowcaseHeader.tsx and ShowcaseFooter.tsx
 * (approved presentational header/footer; undefined destinations open demonstration dialogs).
 * Adapted for the Super Admin hash router: in-page anchors scroll inside the rendered showcase
 * instead of changing `location.hash`; the mobile menu closes from the rendered width (container),
 * not the viewport; lucide icons replace react-icons/fi and the three social glyphs keep the
 * original Feather outlines (MIT) because lucide 1.x ships no brand icons.
 */
import { useEffect, useId, useRef, useState, type ElementType, type MouseEvent, type ReactNode } from 'react'
import { Globe, Menu, Sun, X } from 'lucide-react'
import logo from '../assets/loor-logo.png'
import notice from '../assets/cvm-notice.png'

const headerItems = ['Quem Somos', 'Para Startups', 'Oportunidades', 'Tokenização', 'Fundo'] as const

const footerGroups = [
  { title: 'Legal & Compliance', items: ['Termos de Uso', 'Política de Privacidade', 'Compliance CVM'] },
  { title: 'Plataforma', items: ['Como Funciona', 'FAQ'] },
  { title: 'LOOR', items: ['Sobre Nós', 'Carreiras', 'Contato'] },
  { title: 'Investidores', items: ['Oportunidades', 'Minha Conta', 'Suporte'] },
] as const

export const regulatoryNotice = 'Aviso importante, leia com atenção: As sociedades empresárias de pequeno porte e as ofertas apresentadas nesta plataforma estão automaticamente dispensadas de registro pela Comissão de Valores Mobiliários - CVM. A CVM não analisa previamente as ofertas. As ofertas realizadas não implicam por parte da CVM a garantia da veracidade das informações prestadas, de adequação à legislação vigente ou julgamento sobre a qualidade da sociedade empresária de pequeno porte. Antes de aceitar uma oferta leia com atenção as informações essenciais da oferta, em especial a seção de alertas sobre risco e o material didático do investidor.'

export function Heading({ level, className, id, children }: { level: number; className?: string; id?: string; children: ReactNode }) {
  const Tag = `h${Math.min(6, Math.max(1, level))}` as ElementType
  return <Tag className={className} id={id}>{children}</Tag>
}

type HeaderProps = { onDemonstrate: (label: string) => void; onHome: () => void }

export function ShowcaseHeader({ onDemonstrate, onHome }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const toggle = useRef<HTMLButtonElement>(null)
  const header = useRef<HTMLElement>(null)
  const menuId = `wl-mobile-navigation-${useId().replace(/:/g, '')}`

  useEffect(() => {
    if (!menuOpen) return
    const closeOutside = (event: globalThis.PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        toggle.current?.focus()
      }
    }
    const element = header.current
    const observer = typeof ResizeObserver === 'undefined' || !element ? null : new ResizeObserver(() => {
      if (element.getBoundingClientRect().width / scaleOf(element) >= 1150) setMenuOpen(false)
    })
    if (element) observer?.observe(element)
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      observer?.disconnect()
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [menuOpen])

  const openFromMenu = (label: string) => {
    setMenuOpen(false)
    toggle.current?.focus()
    onDemonstrate(label)
  }
  const home = (event: MouseEvent) => {
    event.preventDefault()
    setMenuOpen(false)
    onHome()
  }

  return (
    <header className="wl-header" ref={header}>
      <div className="wl-container wl-header-inner">
        <a className="wl-home-logo" href="#inicio" aria-label="LOØR — início da vitrine" onClick={home}><img src={logo} alt="LOØR" width={240} height={64} /></a>
        <nav className="wl-desktop-nav" aria-label="Navegação principal">
          <a href="#inicio" className="wl-nav-home" onClick={home}>Início</a>
          {headerItems.map((item) => <button key={item} type="button" onClick={() => onDemonstrate(item)}>{item}</button>)}
        </nav>
        <div className="wl-header-actions">
          <button type="button" className="wl-icon-button wl-language" aria-label="Idioma — Português" onClick={() => onDemonstrate('Idioma — Português')}><Globe aria-hidden="true" /><span>PT</span></button>
          <button type="button" className="wl-icon-button" aria-label="Aparência — tema claro" onClick={() => onDemonstrate('Aparência — tema claro')}><Sun aria-hidden="true" /></button>
          <button type="button" className="wl-register" onClick={() => onDemonstrate('Cadastrar')}>Cadastrar</button>
          <button type="button" className="wl-button wl-button--blue wl-login" onClick={() => onDemonstrate('Entrar')}>Entrar</button>
          <button
            type="button"
            className="wl-icon-button wl-menu-toggle"
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-controls={menuId}
            aria-expanded={menuOpen}
            ref={toggle}
            onClick={() => setMenuOpen((open) => !open)}
          >{menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}</button>
        </div>
      </div>
      <nav id={menuId} className="wl-mobile-nav" aria-label="Navegação principal móvel" hidden={!menuOpen}>
        <a href="#inicio" onClick={(event) => { home(event); toggle.current?.focus() }}>Início</a>
        {[...headerItems, 'Cadastrar', 'Entrar'].map((item) => <button key={item} type="button" onClick={() => openFromMenu(item)}>{item}</button>)}
      </nav>
    </header>
  )
}

/** Visual scale of a (possibly transformed) preview frame; 1 on the full page. */
function scaleOf(element: HTMLElement) {
  return element.offsetWidth ? element.getBoundingClientRect().width / element.offsetWidth : 1
}

const featherProps = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
const InstagramIcon = () => <svg {...featherProps}><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
const LinkedinIcon = () => <svg {...featherProps}><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></svg>
const YoutubeIcon = () => <svg {...featherProps}><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" /><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" /></svg>

export function ShowcaseFooter({ onDemonstrate, headingLevel }: { onDemonstrate: (label: string) => void; headingLevel: number }) {
  return (
    <footer className="wl-footer">
      <div className="wl-regulatory">
        <div className="wl-container">
          <img src={notice} alt="Faixa de aviso regulatório da homepage LOØR. Texto completo disponível no botão seguinte." width={1487} height={232} loading="lazy" />
          <button type="button" className="wl-regulatory-link" onClick={() => onDemonstrate('Aviso regulatório')}>Ler aviso regulatório</button>
        </div>
      </div>
      <div className="wl-container wl-footer-content">
        <nav className="wl-footer-grid" aria-label="Navegação do rodapé">
          {footerGroups.map((group) => <div key={group.title}>
            <Heading level={headingLevel} className="wl-footer-title">{group.title}</Heading>
            <ul>{group.items.map((item) => <li key={item}><button type="button" onClick={() => onDemonstrate(item)}>{item}</button></li>)}</ul>
          </div>)}
        </nav>
        <div className="wl-footer-bottom">
          <p>© 2026 LOOR. Todos os direitos reservados.</p>
          <div className="wl-social-links">
            {[
              { name: 'Instagram', Icon: InstagramIcon },
              { name: 'LinkedIn', Icon: LinkedinIcon },
              { name: 'YouTube', Icon: YoutubeIcon },
            ].map(({ name, Icon }) => <button key={name} type="button" className="wl-icon-button" aria-label={`${name} da LOØR — demonstração`} onClick={() => onDemonstrate(name)}><Icon /></button>)}
          </div>
          <p className="wl-regulatory-credit">Plataforma regulamentada pela CVM</p>
        </div>
      </div>
    </footer>
  )
}
