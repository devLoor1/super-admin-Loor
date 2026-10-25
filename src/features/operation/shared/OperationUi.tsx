import { useEffect, type ReactNode } from 'react'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Info,
  SearchX,
  type LucideIcon,
} from 'lucide-react'
import { AppShell } from '../../../components/shell/AppShell'
import { useNotice } from '../../../components/shell/notice'
import type { Breadcrumb } from '../../../components/shell/TopHeader'
import { EmptyState } from '../../../components/ui/EmptyState'
import { IconTile, type Tone } from '../../../components/ui/IconTile'
import fin from '../../finance-gateways/sections/FinanceSections.module.css'
import { DotMatrixBackground } from '../../whitelabels/visuals/DotMatrixBackground'
import type { SortDirection } from './operationModel'
import { takeQueuedNotice } from './queuedNotice'
import styles from './Operation.module.css'

export type OperationSection = 'opportunities' | 'investors' | 'entrepreneurs'

const SECTION_LABEL: Record<OperationSection, { label: string; href: string }> = {
  opportunities: { label: 'Oportunidades', href: '#/operation/opportunities' },
  investors: { label: 'Investidores', href: '#/operation/investors' },
  entrepreneurs: { label: 'Empreendedores', href: '#/operation/entrepreneurs' },
}

/**
 * Operation page frame: approved App Shell (Operação active, one of the three
 * sibling entries current), shared Dot Matrix behind the main content only.
 * `trail` extends the breadcrumb after the section (e.g. a record name, or a
 * contextual page such as Empreendedores › Empresas, given with its `href`).
 */
export function OperationShell({
  section,
  title,
  trail = [],
  children,
}: {
  section: OperationSection
  title: string
  trail?: (string | Breadcrumb)[]
  children: ReactNode
}) {
  const current = SECTION_LABEL[section]
  const breadcrumbs: Breadcrumb[] = [
    { label: 'Operação' },
    trail.length ? { label: current.label, href: current.href } : { label: current.label },
    ...trail.map((item) => (typeof item === 'string' ? { label: item } : item)),
  ]
  return (
    <AppShell
      activeNav="operacao"
      activeSubNav={`operation-${section}`}
      title={title}
      location="Operação"
      breadcrumbs={breadcrumbs}
    >
      <QueuedNotice />
      <div className={styles.page}>
        <DotMatrixBackground />
        <div className={styles.layout}>{children}</div>
      </div>
    </AppShell>
  )
}

/** Shows a notice queued by the previous page right before navigating here. */
function QueuedNotice() {
  const notify = useNotice()
  useEffect(() => {
    const message = takeQueuedNotice()
    if (message) notify(message)
  }, [notify])
  return null
}

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} className={styles.back}>
      <ArrowLeft size={15} strokeWidth={1.9} aria-hidden="true" />
      {label}
    </a>
  )
}

/** Intro row: optional back link + supporting copy, actions on the right. */
export function PageIntro({ back, text, actions }: { back?: ReactNode; text: ReactNode; actions?: ReactNode }) {
  return (
    <section className={styles.intro} aria-label="Contexto da página">
      <div className={styles.introText}>
        {back}
        <p className={styles.subtitle}>{text}</p>
      </div>
      {actions ? <div className={styles.introActions}>{actions}</div> : null}
    </section>
  )
}

/** `value: null` renders the data-ready "—" (announced as "sem dados"). */
export type SummaryCard = { label: string; value: number | string | null; detail: string; icon: LucideIcon; tone: Tone }

/** Shared summaries; the caller labels authoritative, prototype or pending data. */
export function SummaryCards({ title, cards, note }: { title: string; cards: SummaryCard[]; note: string }) {
  return (
    <section className={fin.summary} aria-labelledby="op-summary-title">
      <h2 id="op-summary-title" className="visually-hidden">
        {title}
      </h2>
      {cards.map((card) => (
        <article key={card.label} className={fin.summaryCard}>
          <IconTile icon={card.icon} tone={card.tone} size="lg" />
          <div className={fin.summaryText}>
            <h3 className={fin.summaryLabel}>{card.label}</h3>
            <p className={fin.summaryValue}>
              {card.value === null ? (
                <>
                  <span aria-hidden="true">—</span>
                  <span className="visually-hidden">sem dados</span>
                </>
              ) : (
                card.value
              )}
            </p>
            <p className={fin.summaryDetail}>{card.detail}</p>
          </div>
        </article>
      ))}
      <p className={fin.summaryNote}>{note}</p>
    </section>
  )
}

export function SortButton({
  label,
  sorted,
  direction,
  onClick,
}: {
  label: string
  sorted: boolean
  direction: SortDirection
  onClick: () => void
}) {
  const Icon = !sorted ? ArrowUpDown : direction === 'ascending' ? ArrowUp : ArrowDown
  return (
    <button type="button" className={styles.sortButton} onClick={onClick}>
      {label}
      <Icon className={styles.sortIcon} size={13} strokeWidth={1.9} aria-hidden="true" data-active={sorted || undefined} />
    </button>
  )
}

/** Same pager language as the catalogs; hidden when everything fits on one page. */
export function Pagination({
  label,
  page,
  pageCount,
  onPage,
}: {
  label: string
  page: number
  pageCount: number
  onPage: (page: number) => void
}) {
  if (pageCount <= 1) return null
  return (
    <nav className={styles.pagination} aria-label={label}>
      <button type="button" className={styles.pageButton} disabled={page === 1} onClick={() => onPage(page - 1)} aria-label="Página anterior">
        <ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />
      </button>
      {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
        <button
          key={number}
          type="button"
          className={styles.pageButton}
          aria-current={number === page ? 'page' : undefined}
          aria-label={`Página ${number}`}
          onClick={() => onPage(number)}
        >
          {number}
        </button>
      ))}
      <button
        type="button"
        className={styles.pageButton}
        disabled={page === pageCount}
        onClick={() => onPage(page + 1)}
        aria-label="Próxima página"
      >
        <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" />
      </button>
    </nav>
  )
}

export function NoResults({ title, description }: { title: string; description: string }) {
  return (
    <div className={fin.emptyBox}>
      <EmptyState icon={SearchX} title={title} description={description} />
    </div>
  )
}

export function DetailList({ rows }: { rows: { label: string; value: ReactNode; wide?: boolean }[] }) {
  return (
    <dl className={styles.dl}>
      {rows.map((row) => (
        <div key={row.label} className={styles.dlRow} data-wide={row.wide || undefined}>
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function InfoNote({ children }: { children: ReactNode }) {
  return (
    <aside className={styles.note}>
      <span className={styles.noteIcon} aria-hidden="true">
        <Info size={17} strokeWidth={1.8} />
      </span>
      <p>{children}</p>
    </aside>
  )
}

export type DomainNavItem = {
  key: string
  label: string
  description: string
  icon: LucideIcon
  /** Existing destination → normal link. */
  href?: string
  /** Pending destination → button answering with a notice. */
  onSelect?: () => void
  pending?: boolean
}

/**
 * "Navegação para domínios responsáveis": Operation only points to the domain
 * that owns each capability. Pending modules are labelled before activation.
 */
export function DomainNavCard({ title, intro, items }: { title: string; intro: string; items: DomainNavItem[] }) {
  const visibleItems = items.filter(item => item.href && !item.pending)
  if (!visibleItems.length) return null
  return (
    <section className={fin.card} aria-labelledby="domain-nav-title">
      <h2 id="domain-nav-title" className={fin.cardTitleSm}>
        {title}
      </h2>
      <p className={fin.cardSubtitle}>{intro}</p>
      <ul className={styles.navList}>
        {visibleItems.map((item) => {
          const Icon = item.icon
          const content = (
            <>
              <span className={styles.navIcon} aria-hidden="true">
                <Icon size={17} strokeWidth={1.7} />
              </span>
              <span className={styles.navText}>
                {item.label}
                <span className={styles.navMeta}>{item.description}</span>
              </span>
              {item.pending ? (
                <span className={styles.pendingTag}>Módulo pendente</span>
              ) : (
                <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" />
              )}
            </>
          )
          return (
            <li key={item.key}>
              {item.href ? (
                <a href={item.href} className={styles.navItem} onClick={item.onSelect} data-nav={item.key}>
                  {content}
                </a>
              ) : (
                <button type="button" className={styles.navItem} onClick={item.onSelect} data-nav={item.key}>
                  {content}
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
