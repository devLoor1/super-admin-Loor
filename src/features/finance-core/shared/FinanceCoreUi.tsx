import { useId, type ReactNode } from 'react'
import { SearchX, X } from 'lucide-react'
import { AppShell } from '../../../components/shell/AppShell'
import type { Breadcrumb } from '../../../components/shell/TopHeader'
import { EmptyState } from '../../../components/ui/EmptyState'
import { StatusPill } from '../../../components/ui/StatusPill'
import { tabId, tabPanelId } from '../../../components/ui/tabIds'
import { AccountAvatar } from '../../whitelabel-accounts/AccountBadges'
import { DotMatrixBackground } from '../../whitelabels/visuals/DotMatrixBackground'
import fin from '../../finance-gateways/sections/FinanceSections.module.css'
import shared from '../../operation/shared/Operation.module.css'
import { formatDateTime, initials, type SortDirection, type SortState } from '../../operation/shared/operationModel'
import { investorName, type ResolvedGateway } from './financeCoreRefs'
import {
  INVESTMENT_STATUS_META,
  MOVEMENT_DIRECTION_META,
  MOVEMENT_STATUS_META,
  PAYMENT_METHOD_META,
  PAYMENT_STATUS_META,
  WALLET_STATUS_META,
  formatMoney,
  type Currency,
  type InvestmentStatus,
  type MovementDirection,
  type MovementStatus,
  type PaymentMethod,
  type PaymentStatus,
  type WalletStatus,
} from './financeCoreModel'
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

/** Unknown or malformed id in a detail route. */
export function RecordNotFound({ section, title, id }: { section: FinanceCoreSection; title: string; id: string }) {
  const current = SECTION[section]
  return (
    <FinanceCoreShell section={section} title={current.label} trail={['Não encontrado']}>
      <div className={shared.notFound}>
        <EmptyState
          icon={SearchX}
          title={title}
          description={
            <>
              Nenhum registro do protótipo usa o ID “{id}”.{' '}
              <a href={current.href} className={shared.inlineLink}>
                Voltar para {current.label}
              </a>
            </>
          }
        />
      </div>
    </FinanceCoreShell>
  )
}

/* ---------- Values ---------- */

export function Money({ amount, currency }: { amount: number; currency: Currency }) {
  return <span className={styles.money}>{formatMoney(amount, currency)}</span>
}

export const InvestmentStatusPill = ({ status }: { status: InvestmentStatus }) => (
  <StatusPill tone={INVESTMENT_STATUS_META[status].tone} label={INVESTMENT_STATUS_META[status].label} />
)

export const PaymentStatusPill = ({ status, prefix = '' }: { status: PaymentStatus; prefix?: string }) => (
  <StatusPill tone={PAYMENT_STATUS_META[status].tone} label={`${prefix}${PAYMENT_STATUS_META[status].label}`} />
)

export const WalletStatusPill = ({ status }: { status: WalletStatus }) => (
  <StatusPill tone={WALLET_STATUS_META[status].tone} label={WALLET_STATUS_META[status].label} />
)

export const MovementStatusPill = ({ status }: { status: MovementStatus }) => (
  <StatusPill tone={MOVEMENT_STATUS_META[status].tone} label={MOVEMENT_STATUS_META[status].label} />
)

/** Method label with a generic icon (no third-party logo). */
export function MethodTag({ method }: { method: PaymentMethod }) {
  const meta = PAYMENT_METHOD_META[method]
  const Icon = meta.icon
  return (
    <span className={styles.methodTag} data-method={method}>
      <Icon size={14} strokeWidth={1.9} aria-hidden="true" />
      {meta.label}
    </span>
  )
}

/** Crédito / Débito: icon + text, never colour alone. */
export function DirectionTag({ direction }: { direction: MovementDirection }) {
  const meta = MOVEMENT_DIRECTION_META[direction]
  const Icon = meta.icon
  return (
    <span className={styles.directionTag} data-direction={direction}>
      <Icon size={13} strokeWidth={2} aria-hidden="true" />
      {meta.label}
    </span>
  )
}

/** "12/04/2026" over "14:32" in tables. */
export function DateStack({ iso }: { iso: string | undefined }) {
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


/* ---------- References to other domains ---------- */

/** Avatar + name + id for an Operation investor reference (read live, never copied). */
export function InvestorRef({ investorId, href }: { investorId: string | undefined; href?: string }) {
  if (!investorId) return <span className={shared.muted}>Não informado</span>
  const name = investorName(investorId)
  return (
    <span className={shared.cellMain}>
      <span className={styles.refAvatar}>
        <AccountAvatar initials={name ? initials(name) : '?'} />
      </span>
      <span className={shared.cellText}>
        {name && href ? (
          <a href={href} className={styles.refLink}>
            {name}
          </a>
        ) : (
          <span className={styles.refName}>{name ?? 'Investidor não encontrado'}</span>
        )}
        <span className={shared.rowId}>{investorId}</span>
      </span>
    </span>
  )
}

/** Name + id for an Operation opportunity reference (name read live from the Opportunities store). */
export function OpportunityRef({
  opportunityId,
  name,
  href,
}: {
  opportunityId: string | undefined
  name: string | undefined
  href?: string
}) {
  if (!opportunityId) return <span className={shared.muted}>Não informada</span>
  return (
    <span className={shared.cellText}>
      {name && href ? (
        <a href={href} className={styles.refLink}>
          {name}
        </a>
      ) : (
        <span className={styles.refName}>{name ?? 'Oportunidade não encontrada'}</span>
      )}
      <span className={shared.rowId}>{opportunityId}</span>
    </span>
  )
}

/* ---------- Gateways (Financeiro › Gateways e contas) ---------- */

export function GatewayTag({ gateway, gatewayId }: { gateway: ResolvedGateway | undefined; gatewayId: string }) {
  return (
    <span className={styles.gatewayTag}>
      <span className={styles.gatewayMark} aria-hidden="true">
        {gateway?.name.replace('Provedor ', '').charAt(0) ?? '?'}
      </span>
      <span className={shared.cellText}>
        <span>{gateway?.name ?? 'Gateway não encontrado'}</span>
        <span className={shared.rowId}>{gatewayId}</span>
      </span>
    </span>
  )
}


/* ---------- Layout pieces ---------- */

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

/** Removable list context (e.g. "Investidor: João Carvalho") coming from another module's link. */
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
}: {
  className: string
  options: SortOption<K>[]
  sort: SortState<K>
  onChange: (sort: SortState<K>) => void
}) {
  const id = useId()
  return (
    <div className={`${styles.sortBar} ${className}`}>
      <label htmlFor={id} className={styles.sortLabel}>
        Ordenar por
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
