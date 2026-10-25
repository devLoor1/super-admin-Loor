import { useEffect, useId, useRef, useState, type Ref } from 'react'
import { ChevronDown, ChevronRight, House, Layers, LogOut, Menu } from 'lucide-react'
import { logout, useSessionOperator } from '../../lib/authSession'
import { RotatingDashboardTitle } from '../originkit/RotatingDashboardTitle'
import styles from './TopHeader.module.css'

/** One step of the header trail; the last step is the current page. */
export type Breadcrumb = { label: string; href?: string }

type TopHeaderProps = {
  title: string
  /** Short location/context label shown next to the title (e.g. "Visão geral"). */
  location: string
  /** Optional trail (e.g. Plataformas › Whitelabels › Finapop › Contas) replacing `location`. */
  breadcrumbs?: Breadcrumb[]
  navOpen: boolean
  onOpenNav: () => void
  menuButtonRef?: Ref<HTMLButtonElement>
}


/**
 * Application header: page title + location, global/whitelabel context
 * selector, search, notifications and user area.
 */
export function TopHeader({ title, location, breadcrumbs, navOpen, onOpenNav, menuButtonRef }: TopHeaderProps) {
  const userMenuRef = useRef<HTMLDivElement>(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuId = useId()
  const operator = useSessionOperator()
  const operatorLabel = operator?.name?.trim() || 'Super Admin'

  // Escape closes the authenticated operator menu.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setUserMenuOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [navOpen])

  useEffect(() => {
    if (!userMenuOpen) return
    const onPointerDown = (event: MouseEvent) => {
      if (!userMenuRef.current?.contains(event.target as Node)) setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [userMenuOpen])


  return (
    <header className={styles.header}>
      <div className={styles.mobileBar}>
        <button
          ref={menuButtonRef}
          type="button"
          className={styles.iconButton}
          onClick={onOpenNav}
          aria-label="Abrir menu"
          aria-expanded={navOpen}
          aria-controls="app-sidebar"
        >
          <Menu size={20} strokeWidth={1.8} aria-hidden="true" />
        </button>
        <span className={styles.mobileBrand} aria-hidden="true">
          <Layers size={22} strokeWidth={1.5} />
          Super Admin
        </span>
      </div>

      <div className={styles.titleBlock}>
        <span className={styles.accentBar} aria-hidden="true" />
        <h1 className={styles.title}>
          {title === 'Dashboard Global' ? <><span className="visually-hidden">Dashboard Global</span><RotatingDashboardTitle /></> : title}
        </h1>
        {breadcrumbs?.length ? (
          <nav className={styles.location} aria-label="Trilha de navegação">
            <House size={15} strokeWidth={1.7} aria-hidden="true" />
            <ol className={styles.crumbs}>
              {breadcrumbs.map((crumb, index) => {
                const current = index === breadcrumbs.length - 1
                return (
                  <li key={`${crumb.label}-${index}`} className={styles.crumb}>
                    {index > 0 ? (
                      <ChevronRight className={styles.crumbSeparator} size={13} strokeWidth={1.8} aria-hidden="true" />
                    ) : null}
                    {crumb.href && !current ? (
                      <a href={crumb.href} className={styles.crumbLink}>
                        {crumb.label}
                      </a>
                    ) : (
                      <span aria-current={current ? 'page' : undefined} className={current ? styles.crumbCurrent : undefined}>
                        {crumb.label}
                      </span>
                    )}
                  </li>
                )
              })}
            </ol>
          </nav>
        ) : (
          <p className={styles.location}>
            <House size={15} strokeWidth={1.7} aria-hidden="true" />
            <span>{location}</span>
          </p>
        )}
      </div>


      <div className={styles.actions}>
        <div className={styles.userMenu} ref={userMenuRef}>
          <button
            type="button"
            className={styles.user}
            onClick={() => setUserMenuOpen((open) => !open)}
            aria-label={`${operatorLabel} — menu do usuário`}
            aria-haspopup="menu"
            aria-expanded={userMenuOpen}
            aria-controls={userMenuId}
          >
            <Avatar />
            <span className={styles.userName}>
              {operatorLabel}
            </span>
            <ChevronDown className={styles.chevron} size={16} strokeWidth={1.8} aria-hidden="true" />
          </button>
          {userMenuOpen ? (
            <div id={userMenuId} className={styles.userDropdown} role="menu">
              {operator?.email ? (
                <p className={styles.userEmail} role="presentation">
                  {operator.email}
                </p>
              ) : null}
              <button
                type="button"
                className={styles.logout}
                role="menuitem"
                onClick={() => {
                  setUserMenuOpen(false)
                  logout()
                }}
              >
                <LogOut size={16} strokeWidth={1.8} aria-hidden="true" />
                Sair
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}

/** Neutral placeholder avatar — no photo or personal data. */
function Avatar() {
  return (
    <svg className={styles.avatar} viewBox="0 0 34 34" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="hdr-avatar" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c3c8ff" />
          <stop offset="1" stopColor="#8f97f1" />
        </linearGradient>
      </defs>
      <circle cx="17" cy="17" r="17" fill="url(#hdr-avatar)" />
      <circle cx="17" cy="13.2" r="5.6" fill="#2a2f62" />
      <path d="M6.6 28.4c1.6-5 5.6-7.6 10.4-7.6s8.8 2.6 10.4 7.6A16.9 16.9 0 0 1 17 34a16.9 16.9 0 0 1-10.4-5.6Z" fill="#2a2f62" />
    </svg>
  )
}
