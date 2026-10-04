import type { Ref } from 'react'
import { Layers, X } from 'lucide-react'
import { PRIMARY_NAV, UTILITY_NAV, type NavItem } from './navigation'
import { moduleUnavailable, usePrototypeNotice } from './prototypeNotice'
import { GlassNavItem } from '../originkit/GlassNavItem'
import styles from './Sidebar.module.css'

type SidebarProps = {
  activeId: string
  /** Mobile drawer state (ignored on larger screens, where the sidebar is persistent). */
  open: boolean
  onClose: () => void
  /** Receives focus when the mobile drawer opens. */
  closeButtonRef?: Ref<HTMLButtonElement>
  sidebarRef?: Ref<HTMLElement>
}

/**
 * Persistent navigation. Desktop: full sidebar. 768–1199px: icon rail with
 * tooltips. Below 768px: off-canvas drawer controlled by the header menu button.
 */
export function Sidebar({ activeId, open, onClose, closeButtonRef, sidebarRef }: SidebarProps) {
  return (
    <aside
      ref={sidebarRef}
      id="app-sidebar"
      className={styles.sidebar}
      data-open={open || undefined}
      role={open ? 'dialog' : undefined}
      aria-modal={open || undefined}
      aria-label="Super Admin"
    >
      <SidebarBackdrop />

      <div className={styles.brandRow}>
        <a href="#/dashboard" className={styles.brand} onClick={onClose}>
          <Layers className={styles.brandIcon} size={32} strokeWidth={1.4} aria-hidden="true" />
          <span className={styles.brandText}>Super Admin</span>
        </a>
        <button
          ref={closeButtonRef}
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Fechar menu"
        >
          <X size={20} strokeWidth={1.8} aria-hidden="true" />
        </button>
      </div>

      <nav className={styles.primary} aria-label="Navegação principal">
        <NavList items={PRIMARY_NAV} activeId={activeId} onNavigate={onClose} />
      </nav>

      <div className={styles.bottom}>
        <nav className={styles.utility} aria-label="Utilitários">
          <NavList items={UTILITY_NAV} activeId={activeId} onNavigate={onClose} compact />
        </nav>

        <div className={styles.footer}>
          <span className={styles.footerDash} aria-hidden="true" />
          <ul className={styles.pillars}>
            <li>Mais controle</li>
            <li>Mais possibilidades</li>
            <li>Mais crescimento</li>
          </ul>
        </div>
      </div>
    </aside>
  )
}

function NavList({
  items,
  activeId,
  onNavigate,
  compact = false,
}: {
  items: NavItem[]
  activeId: string
  onNavigate: () => void
  compact?: boolean
}) {
  const notify = usePrototypeNotice()

  return (
    <ul className={compact ? styles.listCompact : styles.list}>
      {items.map((item) => {
        const Icon = item.icon
        const active = item.id === activeId
        const content = (
          <>
            <Icon className={styles.itemIcon} size={23} strokeWidth={active ? 1.8 : 1.6} aria-hidden="true" />
            <span className={styles.itemLabel}>{item.label}</span>
          </>
        )

        return (
          <li key={item.id}>
            <GlassNavItem
              href={item.href}
              active={active}
              label={item.label}
              className={styles.item}
              onClick={item.href ? onNavigate : () => notify(moduleUnavailable(item.label))}
            >
              {content}
            </GlassNavItem>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Decorative sphere, light line and dot grid (same vocabulary as the login
 * panel). Coordinates follow the reference sidebar (262 × 941).
 */
function SidebarBackdrop() {
  return (
    <svg
      className={styles.backdrop}
      viewBox="0 0 262 941"
      preserveAspectRatio="xMinYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="sb-sphere-fill" cx="0.3" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#8f86ff" stopOpacity="0.1" />
          <stop offset="0.7" stopColor="#5b53b8" stopOpacity="0.04" />
          <stop offset="1" stopColor="#8f86ff" stopOpacity="0.12" />
        </radialGradient>
        <linearGradient id="sb-sphere-rim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#b1a9ff" stopOpacity="0.4" />
          <stop offset="0.5" stopColor="#8f86ff" stopOpacity="0.12" />
          <stop offset="1" stopColor="#8f86ff" stopOpacity="0" />
        </linearGradient>
        <pattern id="sb-dots" width="19" height="20" patternUnits="userSpaceOnUse">
          <circle cx="9" cy="10" r="1" fill="#9aa6ff" fillOpacity="0.28" />
        </pattern>
        <linearGradient id="sb-dots-fade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <mask id="sb-dots-mask">
          <rect x="0" y="550" width="140" height="330" fill="url(#sb-dots-fade)" />
        </mask>
      </defs>

      <rect x="0" y="550" width="140" height="330" fill="url(#sb-dots)" mask="url(#sb-dots-mask)" />
      <line x1="40" y1="560" x2="262" y2="668" stroke="#ffffff" strokeOpacity="0.05" />
      <circle cx="398" cy="645" r="270" fill="url(#sb-sphere-fill)" stroke="url(#sb-sphere-rim)" />
      <circle cx="330" cy="1080" r="160" fill="url(#sb-sphere-fill)" stroke="url(#sb-sphere-rim)" />
    </svg>
  )
}
