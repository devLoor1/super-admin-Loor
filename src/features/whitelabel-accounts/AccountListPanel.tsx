import type { MouseEvent } from 'react'
import { ChevronLeft, ChevronRight, CircleAlert, Info, RotateCw, SearchX, ShieldCheck, UsersRound } from 'lucide-react'
import { EmptyState } from '../../components/ui/EmptyState'
import { OutlineButton } from '../../components/ui/OutlineButton'
import { SearchField } from '../../components/ui/SearchField'
import { StatusPill } from '../../components/ui/StatusPill'
import { tabId, tabPanelId } from '../../components/ui/tabIds'
import { describeApiError } from '../../lib/apiErrors'
import type { RemoteState } from '../../lib/useRemoteResource'
import { formatWhitelabelDate } from '../whitelabels/whitelabelApi'
import { accessMeta, formatCount } from '../operation/investors/investorApi'
import states from '../operation/shared/ReadStates.module.css'
import { AccountAvatar, BusinessBadge } from './AccountBadges'
import { accountDisplayName, kindMeta, type AccountKind, type AccountListResult, type AccountRow } from './accountsApi'
import { BUSINESS_HEADING, TYPE_TABS_ID, accountInitials, businessView, scopedErrorView } from './accountsPresent'
import { ACCOUNT_SEARCH_MAX_LENGTH } from './accountsRoute'
import styles from './AccountListPanel.module.css'

const SKELETON_ROWS = 6

type AccountListPanelProps = {
  kind: AccountKind
  whitelabelName: string
  state: RemoteState<AccountListResult>
  lastData: AccountListResult | null
  /** URL search currently applied by the Control Plane. */
  search: string
  page: number
  onPageChange: (page: number) => void
  query: string
  onQueryChange: (value: string) => void
  onClearSearch: () => void
  ignored: string[]
  activeId?: string
  onActivate: (id: string) => void
  onRetry: () => void
}

/**
 * Accounts of one kind inside the confirmed Whitelabel, read from
 * `GET /whitelabels/:id/accounts?tipo=…`: server search and server
 * pagination only (no access / registration filter, no sort — the Control
 * Plane does not apply them). It is the tab panel of the account-type tabs.
 */
export function AccountListPanel({
  kind,
  whitelabelName,
  state,
  lastData,
  search,
  page,
  onPageChange,
  query,
  onQueryChange,
  onClearSearch,
  ignored,
  activeId,
  onActivate,
  onRetry,
}: AccountListPanelProps) {
  const meta = kindMeta(kind)
  const plural = meta.label.toLowerCase()
  const data = state.status === 'success' ? state.data : null
  const loading = state.status === 'loading' || state.status === 'idle'
  const error = state.status === 'error' ? scopedErrorView(state.error, describeApiError(state.error, `os ${plural}`), 'list', plural) : null
  const pager = data ?? lastData

  // Mouse convenience: clicking a row (outside its own controls) shows its details.
  function onRowClick(event: MouseEvent<HTMLTableRowElement>, id: string) {
    if ((event.target as HTMLElement).closest('button, input, a, select')) return
    onActivate(id)
  }

  return (
    <section
      className={styles.panel}
      role="tabpanel"
      id={tabPanelId(TYPE_TABS_ID, kind)}
      aria-labelledby={tabId(TYPE_TABS_ID, kind)}
      data-account-list={kind}
    >
      <div className={styles.controls} data-read-only>
        <SearchField
          id="acc-search"
          className={styles.search}
          label={`Buscar ${plural} de ${whitelabelName} (busca feita pelo Control Plane)`}
          placeholder={`Buscar ${plural}…`}
          value={query}
          maxLength={ACCOUNT_SEARCH_MAX_LENGTH}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </div>

      <p className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.legendDot} aria-hidden="true" />
          <span>
            <strong>Acesso</strong>: estado de acesso da conta
          </span>
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendSquare} aria-hidden="true" />
          <span>
            <strong>{BUSINESS_HEADING[kind]}</strong>:{' '}
            {kind === 'admin' ? 'situação do convite do administrador' : 'estado do cadastro, independente do acesso — não é KYC'}
          </span>
        </span>
      </p>
      {ignored.length ? (
        <p className={states.ignoredNote} role="status" data-ignored-params>
          <Info size={14} strokeWidth={1.9} aria-hidden="true" />
          Parâmetro da URL não reconhecido e ignorado: {ignored.join(', ')}.
        </p>
      ) : null}

      <div className={styles.tableArea}>
        {error ? (
          <div className={states.feedback} role="alert" data-list-error>
            <EmptyState icon={CircleAlert} title={error.title} description={error.description} />
            {error.correlationId ? (
              <p className={states.diagnostic}>
                Código de diagnóstico: <code className={states.code}>{error.correlationId}</code>
              </p>
            ) : null}
            {error.retryable ? (
              <OutlineButton onClick={onRetry}>
                <RotateCw size={14} strokeWidth={1.8} aria-hidden="true" />
                Tentar novamente
              </OutlineButton>
            ) : null}
          </div>
        ) : (
          <table className={styles.table} data-type={kind} aria-busy={loading || undefined}>
            <caption className="visually-hidden">
              {meta.label} de {whitelabelName}, dados do Control Plane{data ? `, página ${data.page} de ${data.lastPage}` : ''}. Use o
              nome de cada linha para ver os detalhes da conta. Somente leitura.
              {kind === 'admin' ? '' : ` ${BUSINESS_HEADING[kind]} é o estado do cadastro, não o KYC.`}
            </caption>
            <thead>
              <tr>
                <th scope="col" className={styles.colName}>
                  Nome
                </th>
                <th scope="col" className={styles.colEmail}>
                  E-mail
                </th>
                <th scope="col" className={styles.colAccess}>
                  Acesso
                </th>
                <th scope="col" className={styles.colBusiness}>
                  {BUSINESS_HEADING[kind]}
                </th>
                <th scope="col" className={styles.colExtra}>
                  Criada em
                </th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: SKELETON_ROWS }, (_, index) => (
                    <tr key={index} className={states.skeletonRow} aria-hidden="true" data-skeleton-row>
                      <td className={styles.colName}>
                        <span className={`${states.skeleton} ${states.skeletonWide}`} />
                      </td>
                      {[styles.colEmail, styles.colAccess, styles.colBusiness, styles.colExtra].map((className) => (
                        <td key={className} className={className}>
                          <span className={states.skeleton} />
                        </td>
                      ))}
                    </tr>
                  ))
                : (data?.rows ?? []).map((row) => (
                    <AccountListRow key={row.record.id} row={row} active={row.record.id === activeId} onActivate={onActivate} onRowClick={onRowClick} />
                  ))}
            </tbody>
          </table>
        )}

        {!error && data && !loading && data.rows.length === 0 ? (
          <div className={styles.empty} data-list-empty>
            {search ? (
              <>
                <EmptyState icon={SearchX} title="Nenhuma conta encontrada" description={`O Control Plane não encontrou ${plural} para esta busca.`} />
                <OutlineButton onClick={onClearSearch}>Limpar busca</OutlineButton>
              </>
            ) : (
              <EmptyState
                icon={kind === 'admin' ? ShieldCheck : UsersRound}
                title={`Nenhum ${meta.singular.toLowerCase()} em ${whitelabelName}`}
                description={`O Control Plane não retornou ${plural} para este Whitelabel.`}
              />
            )}
          </div>
        ) : null}
      </div>

      {error ? null : (
        <div className={styles.footer}>
          <p className={styles.count} aria-live="polite">
            {data && !loading
              ? data.total === 0
                ? `Nenhum ${meta.singular.toLowerCase()}`
                : `Mostrando ${rangeLabel(data)} de ${formatCount(data.total)} ${data.total === 1 ? meta.singular.toLowerCase() : plural}`
              : `Carregando ${plural}…`}
            <span className={styles.illustrative}> · Dados do Control Plane · Somente leitura</span>
          </p>
          {pager && pager.lastPage > 1 ? (
            <AccountPagination label={`Paginação de ${plural}`} current={page} last={pager.lastPage} disabled={loading} onChange={onPageChange} />
          ) : null}
        </div>
      )}
    </section>
  )
}

function AccountListRow({
  row,
  active,
  onActivate,
  onRowClick,
}: {
  row: AccountRow
  active: boolean
  onActivate: (id: string) => void
  onRowClick: (event: MouseEvent<HTMLTableRowElement>, id: string) => void
}) {
  const { record } = row
  const access = accessMeta(record.accessState)
  const business = businessView(row)
  const name = accountDisplayName(row)
  const created = formatWhitelabelDate(record.createdAt)
  return (
    <tr className={styles.row} data-active={active || undefined} data-account={record.id} onClick={(event) => onRowClick(event, record.id)}>
      <td className={styles.colName}>
        <button
          type="button"
          className={styles.nameButton}
          onClick={() => onActivate(record.id)}
          aria-current={active ? 'true' : undefined}
          aria-controls="account-detail"
        >
          <AccountAvatar initials={accountInitials(record)} />
          <span className={styles.nameText}>
            <span className={styles.name}>{record.fullName ? name : <BreakableEmail text={name} />}</span>
            {/* Without a name the e-mail is the display name: the line saying so stays visible on narrow panels. */}
            <span className={styles.subline} data-keep={!record.fullName || undefined}>
              {!record.fullName && record.email ? 'Nome não informado · ' : ''}ID {record.id}
            </span>
            {record.fullName && record.email ? <span className={styles.nameEmail}>{record.email}</span> : null}
            <span className="visually-hidden">, ver detalhes</span>
          </span>
        </button>
        {/* Narrow panels: states move under the name (their columns are hidden). */}
        <span className={styles.nameStates}>
          {access ? <StatusPill tone={access.tone} label={`Acesso ${access.label.toLowerCase()}`} /> : null}
          {business ? <BusinessBadge tone={business.tone} label={narrowBusinessLabel(row.kind, business.label)} /> : null}
        </span>
      </td>
      <td className={styles.colEmail}>{record.email ?? <NoData />}</td>
      <td className={styles.colAccess}>{access ? <StatusPill tone={access.tone} label={access.label} /> : <NoData />}</td>
      <td className={styles.colBusiness}>{business ? <BusinessBadge tone={business.tone} label={business.label} /> : <NoData />}</td>
      <td className={styles.colExtra}>{created ? <span className={styles.activity}>{created}</span> : <NoData />}</td>
    </tr>
  )
}

/** Under the name (narrow panels) the state needs its column heading, unless its label already says it. */
function narrowBusinessLabel(kind: AccountKind, label: string) {
  if (kind === 'admin' || /^(Cadastro|Convite) /.test(label)) return label
  return kind === 'investor' && /^[A-ZÀ-Ú]/.test(label) ? `${BUSINESS_HEADING[kind]} ${label.toLowerCase()}` : `${BUSINESS_HEADING[kind]}: ${label}`
}

/** An e-mail used as the display name wraps before "@" instead of mid-word. */
export function BreakableEmail({ text }: { text: string }) {
  const at = text.indexOf('@')
  if (at <= 0) return <>{text}</>
  return (
    <>
      {text.slice(0, at)}
      <wbr />
      {text.slice(at)}
    </>
  )
}

/** "—" for values the Control Plane does not provide (announced as "sem dados"). */
function NoData() {
  return (
    <>
      <span aria-hidden="true">—</span>
      <span className="visually-hidden">sem dados</span>
    </>
  )
}

function rangeLabel(data: AccountListResult) {
  const from = (data.page - 1) * data.perPage + 1
  const to = from + data.rows.length - 1
  return from === to ? formatCount(from) : `${formatCount(from)}–${formatCount(to)}`
}

/** 1 … (current − 1) current (current + 1) … last; every page when there are ≤ 7. */
function pageItems(current: number, last: number): (number | 'gap')[] {
  if (last <= 7) return Array.from({ length: last }, (_, index) => index + 1)
  const middle = [current - 1, current, current + 1].filter((value) => value > 1 && value < last)
  const items: (number | 'gap')[] = [1]
  if (middle[0] > 2) items.push('gap')
  items.push(...middle)
  if (middle[middle.length - 1] < last - 1) items.push('gap')
  items.push(last)
  return items
}

/** Server pager (Control Plane `meta`) in the Accounts pager style. */
function AccountPagination({
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
  return (
    <nav className={styles.pagination} aria-label={label}>
      <button
        type="button"
        className={styles.pageButton}
        disabled={disabled || current <= 1}
        onClick={() => onChange(current - 1)}
        aria-label="Página anterior"
      >
        <ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />
      </button>
      {pageItems(Math.min(current, last), last).map((item, index) =>
        item === 'gap' ? (
          <span key={`gap-${index}`} className={states.pageGap} aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            className={styles.pageButton}
            disabled={disabled}
            aria-current={item === current ? 'page' : undefined}
            aria-label={`Página ${item}`}
            onClick={() => (item === current ? undefined : onChange(item))}
          >
            {formatCount(item)}
          </button>
        ),
      )}
      <button
        type="button"
        className={styles.pageButton}
        disabled={disabled || current >= last}
        onClick={() => onChange(current + 1)}
        aria-label="Próxima página"
      >
        <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" />
      </button>
    </nav>
  )
}
