import { useId, type ReactNode } from 'react'
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, CircleAlert, Info, RotateCw, SearchX, X } from 'lucide-react'
import { AppShell } from '../../../components/shell/AppShell'
import type { Breadcrumb } from '../../../components/shell/TopHeader'
import { EmptyState } from '../../../components/ui/EmptyState'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import { StatusPill } from '../../../components/ui/StatusPill'
import { tabId, tabPanelId } from '../../../components/ui/tabIds'
import type { ApiErrorView } from '../../../lib/apiErrors'
import { DotMatrixBackground } from '../../whitelabels/visuals/DotMatrixBackground'
import fin from '../../finance-gateways/sections/FinanceSections.module.css'
import shared from '../../operation/shared/Operation.module.css'
import { formatDateTime, type SortDirection, type SortState } from '../../operation/shared/operationModel'
import type { MovementKind } from './financeApi'
import {
  AMOUNT_UNAVAILABLE,
  MOVEMENT_KIND_LABEL,
  formatCents,
  formatCount,
  investmentStatusMeta,
  pageItems,
  paymentStatusMeta,
} from './financePresentation'
import styles from './FinanceCore.module.css'

export type FinanceCoreSection = 'investments' | 'payments' | 'wallets'

const SECTION: Record<FinanceCoreSection, { label: string; href: string }> = {
  investments: { label: 'Investimentos', href: '#/finance/investments' },
  payments: { label: 'Pagamentos / PIX', href: '#/finance/payments' },
  wallets: { label: 'Wallet', href: '#/finance/wallets' },
}

/**
 * Finance Core page frame: the approved App Shell (Financeiro active, one of
 * the three global entries current) with the shared Dot Matrix behind the
 * main content only. `trail` extends the breadcrumb (e.g. a record id).
 */
export function FinanceCoreShell({
  section,
  title,
  trail = [],
  children,
}: {
  section: FinanceCoreSection
  title: string
  trail?: string[]
  children: ReactNode
}) {
  const current = SECTION[section]
  const breadcrumbs: Breadcrumb[] = [
    { label: 'Financeiro' },
    trail.length ? { label: current.label, href: current.href } : { label: current.label },
    ...trail.map((label) => ({ label })),
  ]
  return (
    <AppShell activeNav="financeiro" activeSubNav={`finance-${section}`} title={title} location="Financeiro" breadcrumbs={breadcrumbs}>
      <div className={shared.page}>
        <DotMatrixBackground />
        <div className={shared.layout}>{children}</div>
      </div>
    </AppShell>
  )
}

/* ---------- Values ---------- */

/**
 * Integer centavos at the display boundary. `null` is shown as an explicit
 * unavailable value — never as R$ 0,00.
 */
export function Money({ cents, unavailable = AMOUNT_UNAVAILABLE }: { cents: number | null; unavailable?: string }) {
  const text = formatCents(cents)
  if (text === null) {
    return (
      <span className={styles.moneyUnavailable} data-money="unavailable">
        {unavailable}
      </span>
    )
  }
  return (
    <span className={styles.money} data-money={cents}>
      {text}
    </span>
  )
}

export const InvestmentStatusPill = ({ status, prefix = '' }: { status: string; prefix?: string }) => {
  const meta = investmentStatusMeta(status)
  return <StatusPill tone={meta.tone} label={`${prefix}${meta.label}`} />
}

export const PaymentStatusPill = ({ status, prefix = '' }: { status: string; prefix?: string }) => {
  const meta = paymentStatusMeta(status)
  return <StatusPill tone={meta.tone} label={`${prefix}${meta.label}`} />
}

/** Entrada / Saída from the Backend `kind`: icon + text, never colour alone. The amount stays unsigned. */
export function KindTag({ kind }: { kind: MovementKind }) {
  const Icon = kind === 'in' ? ArrowDownLeft : ArrowUpRight
  return (
    <span className={styles.directionTag} data-kind={kind}>
      <Icon size={13} strokeWidth={2} aria-hidden="true" />
      {MOVEMENT_KIND_LABEL[kind]}
    </span>
  )
}

/** "12/04/2026" over "14:32" in tables. */
export function DateStack({ iso }: { iso: string | null | undefined }) {
  const text = formatDateTime(iso ?? null)
  if (!text) return <span className={shared.muted}>—</span>
  const [date, time] = text.split(' ')
  return (
    <span className={styles.dateStack}>
      <span>{date}</span>
      <span>{time}</span>
    </span>
  )
}

/* ---------- Tenants (names from the wallet projection) ---------- */

export function TenantTag({ whitelabelId, name }: { whitelabelId: string; name: string }) {
  return (
    <span className={shared.wlCell} data-tenant={whitelabelId}>
      <span className={shared.wlMark} data-tone="neutral" aria-hidden="true">
        {name.startsWith('Whitelabel #') ? '#' : name.charAt(0).toLocaleUpperCase('pt-BR')}
      </span>
      {name}
    </span>
  )
}

/* ---------- Read states ---------- */

/** List / panel error with the diagnostic code and, when it can help, a retry. */
export function ReadError({ error, onRetry, compact = false }: { error: ApiErrorView; onRetry?: () => void; compact?: boolean }) {
  return (
    <div className={compact ? styles.feedbackCompact : styles.feedback} role="alert" data-read-error>
      <EmptyState icon={CircleAlert} title={error.title} description={error.description} />
      {error.correlationId ? (
        <p className={styles.diagnostic}>
          Código de diagnóstico: <code className={styles.code}>{error.correlationId}</code>
        </p>
      ) : null}
      {error.retryable && onRetry ? (
        <OutlineButton onClick={onRetry} data-retry>
          <RotateCw size={14} strokeWidth={1.8} aria-hidden="true" />
          Tentar novamente
        </OutlineButton>
      ) : null}
    </div>
  )
}

export function SkeletonRows({ columns, rows = 6 }: { columns: string[]; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, index) => (
        <tr key={index} className={styles.skeletonRow} aria-hidden="true" data-skeleton-row>
          {columns.map((className, cell) => (
            <td key={`${className}-${cell}`} className={className}>
              <span className={`${styles.skeleton} ${cell === 0 ? styles.skeletonWide : ''}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

/** URL filters that were not recognized (and are not sent). */
export function IgnoredParams({ ignored }: { ignored: string[] }) {
  if (!ignored.length) return null
  return (
    <p className={styles.ignoredNote} role="status" data-ignored-params>
      <Info size={14} strokeWidth={1.9} aria-hidden="true" />
      Filtro da URL não reconhecido e ignorado: {ignored.join(', ')}.
    </p>
  )
}

/** Unknown or invalid id in a detail route (404, or an id the API would reject: no request is sent). */
export function RecordNotFound({ section, title, id, backHref }: { section: FinanceCoreSection; title: string; id: string; backHref?: string }) {
  const current = SECTION[section]
  return (
    <FinanceCoreShell section={section} title={current.label} trail={['Não encontrado']}>
      <div className={shared.notFound} data-record-not-found>
        <EmptyState
          icon={SearchX}
          title={title}
          description={
            <>
              Nenhum registro com o ID “{id}” existe no Control Plane.{' '}
              <a href={backHref ?? current.href} className={shared.inlineLink}>
                Voltar para {current.label}
              </a>
            </>
          }
        />
      </div>
    </FinanceCoreShell>
  )
}

/** Detail route while loading / after a failure: same frame, never illustrative content. */
export function DetailStatus({
  section,
  id,
  error,
  onRetry,
}: {
  section: FinanceCoreSection
  id: string
  error?: ApiErrorView
  onRetry?: () => void
}) {
  const current = SECTION[section]
  return (
    <FinanceCoreShell section={section} title={current.label} trail={[id]}>
      {error ? (
        <section className={fin.card} aria-labelledby="fc-record-title">
          <h2 id="fc-record-title" className="visually-hidden">
            {error.title}
          </h2>
          <ReadError error={error} onRetry={onRetry} />
        </section>
      ) : (
        <section className={`${fin.card} ${styles.detailLoading}`} aria-busy="true" aria-labelledby="fc-record-title" data-detail-loading>
          <h2 id="fc-record-title" className="visually-hidden">
            Carregando registro {id}
          </h2>
          <span className={`${styles.skeleton} ${styles.skeletonWide}`} />
          <span className={styles.skeleton} />
          <span className={styles.skeleton} />
        </section>
      )}
    </FinanceCoreShell>
  )
}

/* ---------- Pagination (server pages) ---------- */

export function ServerPagination({
  label,
  current,
  last,
  disabled,
  onChange,
}: {
  label: string
  current: number
  last: number
  disabled: boolean
  onChange: (page: number) => void
}) {
  if (last <= 1) return null
  const page = Math.min(current, last)
  return (
    <nav className={shared.pagination} aria-label={label}>
      <button type="button" className={shared.pageButton} disabled={disabled || page <= 1} onClick={() => onChange(page - 1)} aria-label="Página anterior">
        <ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />
      </button>
      {pageItems(page, last).map((item, index) =>
        item === 'gap' ? (
          <span key={`gap-${index}`} className={styles.pageGap} aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            className={shared.pageButton}
            disabled={disabled}
            aria-current={item === page ? 'page' : undefined}
            aria-label={`Página ${item}`}
            onClick={() => (item === page ? undefined : onChange(item))}
          >
            {formatCount(item)}
          </button>
        ),
      )}
      <button type="button" className={shared.pageButton} disabled={disabled || page >= last} onClick={() => onChange(page + 1)} aria-label="Próxima página">
        <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" />
      </button>
    </nav>
  )
}

/* ---------- Layout pieces (also used by Compliance › KYC and Governança › Auditoria) ---------- */

/** Label-left / value-right rows, as in the approved detail compositions. */
export function KeyValueList({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return (
    <dl className={styles.kv}>
      {rows.map((row) => (
        <div key={row.label} className={styles.kvRow}>
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export type HeroMeta = { label: string; value: ReactNode }

/** Detail header: monogram, "<Tipo> <ID>", status, context and the two main domain links. */
export function DetailHero({
  monogram,
  title,
  status,
  meta,
  actions,
}: {
  monogram: string
  title: string
  status: ReactNode
  meta: HeroMeta[]
  actions: ReactNode
}) {
  return (
    <section className={`${styles.heroCard} ${shared.hero}`} aria-labelledby="fc-record-title">
      <span className={styles.heroAvatar} aria-hidden="true">
        {monogram}
      </span>
      <div className={shared.heroHeading}>
        <div className={shared.heroTitleRow}>
          <h2 id="fc-record-title" className={shared.heroTitle}>
            {title}
          </h2>
          {status}
        </div>
        <div className={shared.heroMeta}>
          {meta.map((item) => (
            <div key={item.label} className={shared.heroMetaItem}>
              <span className={shared.heroMetaLabel}>{item.label}</span>
              <span className={shared.heroMetaValue}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>
      <div className={shared.heroActions}>{actions}</div>
    </section>
  )
}

export function TabPanel<T extends string>({
  prefix,
  tab,
  current,
  children,
}: {
  prefix: string
  tab: T
  current: T
  children: ReactNode
}) {
  return (
    <div
      role="tabpanel"
      id={tabPanelId(prefix, tab)}
      aria-labelledby={tabId(prefix, tab)}
      hidden={tab !== current}
      tabIndex={0}
      className={`${shared.tabPanel} ${styles.panel}`}
    >
      {tab === current ? children : null}
    </div>
  )
}

/** Removable list context (e.g. "Investidor #123") coming from another screen's link. */
export function ContextChip({ label, onRemove, removeLabel, dataName }: { label: string; onRemove: () => void; removeLabel: string; dataName: string }) {
  return (
    <div className={shared.activeFilters}>
      <span>Contexto:</span>
      <span className={shared.filterChip} data-context-chip={dataName}>
        {label}
        <button type="button" onClick={onRemove} aria-label={removeLabel}>
          <X size={14} strokeWidth={2} aria-hidden="true" />
        </button>
      </span>
    </div>
  )
}

export type SortOption<K extends string> = { key: K; label: string; ascending: string; descending: string }

/**
 * Same sort state as the column headers, for widths where some sortable
 * columns (or the whole header row) are collapsed. `className` decides, per
 * list, from which container width it is shown.
 */
export function SortSelect<K extends string>({
  className,
  options,
  sort,
  onChange,
  label = 'Ordenar por',
}: {
  className: string
  options: SortOption<K>[]
  sort: SortState<K>
  onChange: (sort: SortState<K>) => void
  label?: string
}) {
  const id = useId()
  return (
    <div className={`${styles.sortBar} ${className}`}>
      <label htmlFor={id} className={styles.sortLabel}>
        {label}
      </label>
      <span className={`${fin.filter} ${styles.sortField}`}>
        <select
          id={id}
          value={`${sort.key}:${sort.direction}`}
          onChange={(event) => {
            const [key, direction] = event.target.value.split(':') as [K, SortDirection]
            onChange({ key, direction })
          }}
        >
          {options.flatMap((option) => [
            <option key={`${option.key}:ascending`} value={`${option.key}:ascending`}>
              {option.label} ({option.ascending})
            </option>,
            <option key={`${option.key}:descending`} value={`${option.key}:descending`}>
              {option.label} ({option.descending})
            </option>,
          ])}
        </select>
      </span>
    </div>
  )
}
