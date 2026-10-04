import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { PrototypeNoticeProvider } from './PrototypeNoticeProvider'
import { Sidebar } from './Sidebar'
import { TopHeader } from './TopHeader'
import styles from './AppShell.module.css'

type AppShellProps = {
  /** Id of the active primary navigation item. */
  activeNav: string
  title: string
  location: string
  children: ReactNode
}

const MOBILE_QUERY = '(max-width: 767px)'

/**
 * Prototype application frame: persistent sidebar + header + page content.
 * Below 768px the sidebar becomes a drawer opened from the header menu button.
 */
export function AppShell({ activeNav, title, location, children }: AppShellProps) {
  const [navOpen, setNavOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const sidebarRef = useRef<HTMLElement>(null)
  const wasOpen = useRef(false)

  const closeNav = useCallback(() => {
    setNavOpen(false)
  }, [])

  // Return focus after React removes inert; on resize the persistent active link
  // is the return target because the mobile menu button is no longer visible.
  useEffect(() => {
    const shouldReturnFocus = wasOpen.current && !navOpen
    wasOpen.current = navOpen
    if (!shouldReturnFocus) return
    const frame = window.requestAnimationFrame(() => {
      const menu = menuButtonRef.current
      const target = menu?.getClientRects().length
        ? menu
        : sidebarRef.current?.querySelector<HTMLElement>('[aria-current="page"]')
      target?.focus()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [navOpen])

  // Modal drawer: contain keyboard focus, close on Escape, lock page scroll.
  useEffect(() => {
    if (!navOpen) return
    closeButtonRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeNav()
      }
      if (event.key !== 'Tab') return
      const controls = Array.from(
        sidebarRef.current?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), [tabindex="0"]') ?? [],
      ).filter((element) => element.getClientRects().length > 0)
      const first = controls[0]
      const last = controls.at(-1)
      const outside = !sidebarRef.current?.contains(document.activeElement)
      if (outside || (event.shiftKey ? document.activeElement === first : document.activeElement === last)) {
        event.preventDefault()
        const target = event.shiftKey ? last : first
        target?.focus()
      }
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [navOpen, closeNav])

  // Leaving the mobile breakpoint closes the drawer.
  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY)
    const onChange = () => {
      if (!media.matches) setNavOpen(false)
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return (
    <PrototypeNoticeProvider interactionBlocked={navOpen}>
      <div className={styles.shell}>
        <a
          className={styles.skipLink}
          href="#app-content"
          inert={navOpen}
          onClick={(event) => {
            event.preventDefault()
            document.getElementById('app-content')?.focus()
          }}
        >
          Ir para o conteúdo
        </a>
        <Sidebar
          activeId={activeNav}
          open={navOpen}
          onClose={closeNav}
          closeButtonRef={closeButtonRef}
          sidebarRef={sidebarRef}
        />

        {navOpen ? (
          <button
            type="button"
            className={styles.scrim}
            onClick={closeNav}
            aria-label="Fechar menu"
            tabIndex={-1}
          />
        ) : null}

        <div className={styles.content} inert={navOpen}>
          <ContentBackdrop />
          <TopHeader
            title={title}
            location={location}
            navOpen={navOpen}
            onOpenNav={() => setNavOpen(true)}
            menuButtonRef={menuButtonRef}
          />
          <main id="app-content" tabIndex={-1} className={styles.main}>{children}</main>
        </div>
      </div>
    </PrototypeNoticeProvider>
  )
}

/** Faint sphere outlines behind the header, echoing the login backdrop. */
function ContentBackdrop() {
  return (
    <svg
      className={styles.backdrop}
      viewBox="0 0 1410 420"
      preserveAspectRatio="xMinYMin slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="ct-sphere-rim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a49cff" stopOpacity="0.22" />
          <stop offset="0.6" stopColor="#8f86ff" stopOpacity="0.06" />
          <stop offset="1" stopColor="#8f86ff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle cx="560" cy="-150" r="300" fill="#8f86ff" fillOpacity="0.018" stroke="url(#ct-sphere-rim)" />
      <circle cx="1420" cy="-40" r="210" fill="#8f86ff" fillOpacity="0.015" stroke="url(#ct-sphere-rim)" />
    </svg>
  )
}
