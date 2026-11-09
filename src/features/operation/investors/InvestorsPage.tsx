import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import {
  ChartColumn,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Eye,
  FilterX,
  Info,
  Mail,
  Play,
  RotateCw,
  ScanFace,
  Search,
  SearchX,
  UsersRound,
} from 'lucide-react'
import { replaceRouteKeepingScroll, useRestoreReplacedScroll } from '../../../app/routeQuery'
import { useUrlSearchDraft } from '../../../app/useUrlSearchDraft'
import { EmptyState } from '../../../components/ui/EmptyState'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import { StatusPill } from '../../../components/ui/StatusPill'
import { describeApiError, type ApiErrorView } from '../../../lib/apiErrors'
import { ApiError } from '../../../lib/api'
import { AccountAvatar, BusinessBadge } from '../../whitelabel-accounts/AccountBadges'
import fin from '../../finance-gateways/sections/FinanceSections.module.css'
import { formatWhitelabelDate, type WhitelabelRecord } from '../../whitelabels/whitelabelApi'
import { compareText, initials, type SortState } from '../shared/operationModel'
import { OperationShell, PageIntro, SortButton, SummaryCards, type SummaryCard } from '../shared/OperationUi'
import shared from '../shared/Operation.module.css'
import styles from '../shared/Participants.module.css'
import own from './Investors.module.css'
import {
  accessMeta,
  formatCount,
  validationMeta,
  type InvestorListResult,
  type InvestorRecord,
} from './investorApi'
import {
  INVESTOR_SEARCH_MAX_LENGTH,
  investorHref,
  investorsHref,
  parseInvestorRoute,
  type InvestorRouteState,
} from './investorRoute'
import { useInvestorList, useWhitelabelOptions, useWhitelabelRecord } from './useInvestorData'

type InvestorsPageProps = {
  /** URL `?whitelabel=` — Core Whitelabel id; selects the server-scoped read. */
  whitelabel?: string
  /** URL `?page=` / `?search=` (validated here). */
  page?: string
  search?: string
  /** Raw query string: identity of the URL-backed context (scroll restore). */
  routeKey?: string
}

/**
 * Investidores — operational supervision across Whitelabels, now reading the
 * Control Plane: `GET /investors` (all Whitelabels) or
 * `GET /whitelabels/:id/accounts?tipo=investidores` (one Whitelabel, scoped by
 * the server). Read-only; KYC and investments are not integrated and are
 * shown as pending, never with illustrative values.
 */
export function InvestorsPage(props: InvestorsPageProps) {
  return (
    <OperationShell section="investors" title="Investidores">
      <PageIntro text="Acompanhe investidores de todos os Whitelabels em uma só visão operacional, com dados do Control Plane. Somente leitura: conta, investimentos e KYC ficam nos módulos responsáveis." />
      <InvestorList {...props} />
    </OperationShell>
  )
}

type SortKey = 'name' | 'createdAt'
const SKELETON_ROWS = 6

function sortRows(rows: InvestorRecord[], sort: SortState<SortKey> | null) {
  if (!sort) return rows
  const direction = sort.direction === 'ascending' ? 1 : -1
  return [...rows].sort((a, b) => {
    if (sort.key === 'createdAt') {
      // Instants, not strings (offsets may differ); missing dates always last.
      if (!a.createdAt || !b.createdAt) return a.createdAt === b.createdAt ? 0 : a.createdAt ? -1 : 1
      return direction * (Date.parse(a.createdAt) - Date.parse(b.createdAt))
    }
    return direction * compareText(a.fullName ?? '', b.fullName ?? '')
  })
}

function InvestorList({ whitelabel, page: pageParam, search: searchParam, routeKey = '' }: InvestorsPageProps) {
  useRestoreReplacedScroll(routeKey)
  const { state: route, ignored } = useMemo(
    () => parseInvestorRoute({ whitelabel, page: pageParam, search: searchParam }),
    [whitelabel, pageParam, searchParam],
  )

  /* ---------- Whitelabel registry (names + selector) and scope confirmation ---------- */
  const options = useWhitelabelOptions()
  const registry = options.state.status === 'success' ? options.state.data : null
  const registryComplete = registry !== null && registry.lastPage <= 1
  const scopeFromRegistry = route.whitelabelId ? registry?.rows.find((row) => row.id === route.whitelabelId) : undefined
  // The registry page did not settle the scope (failed, or > 100 Whitelabels): confirm it directly.
  const confirmScope = route.whitelabelId !== undefined && !scopeFromRegistry && (options.state.status === 'error' || (registry !== null && !registryComplete))
  const scopeRecord = useWhitelabelRecord(confirmScope ? route.whitelabelId! : null)
  const scope: WhitelabelRecord | undefined =
    scopeFromRegistry ?? (scopeRecord.state.status === 'success' ? scopeRecord.state.data : undefined)
  const scopeMissing =
    route.whitelabelId !== undefined &&
    ((registryComplete && !scopeFromRegistry) ||
      (scopeRecord.state.status === 'error' && describeApiError(scopeRecord.state.error, 'o Whitelabel').notFound))

  const whitelabelName = (id: string) =>
    registry?.rows.find((row) => row.id === id)?.name ?? (scope?.id === id ? scope.name : `Whitelabel #${id}`)

  /* ---------- Investors (global or server-scoped) ---------- */
  const list = useInvestorList({ whitelabelId: route.whitelabelId, page: route.page, search: route.search })
  const data = list.state.status === 'success' ? list.state.data : null
  const pageOutOfRange = data !== null && data.rows.length === 0 && data.total > 0
  const loading = list.state.status === 'loading' || list.state.status === 'idle' || pageOutOfRange
  const listError = list.state.status === 'error' ? listErrorView(list.state.error) : null

  // Local sorting only when the whole (filtered) result is on this page.
  const sortable = data !== null && data.lastPage <= 1 && data.rows.length >= data.total
  const [sort, setSort] = useState<SortState<SortKey> | null>(null)
  const rows = useMemo(() => (data ? (sortable ? sortRows(data.rows, sort) : data.rows) : []), [data, sortable, sort])

  // Search: typed text is debounced into the URL (and so into `?search=` on the API).
  const search = useUrlSearchDraft({
    urlSearch: route.search,
    urlKey: routeKey,
    maxLength: INVESTOR_SEARCH_MAX_LENGTH,
    commit: (next) => replaceRouteKeepingScroll(investorsHref({ whitelabelId: route.whitelabelId, search: next })),
  })
  const draft = search.draft

  // Scope / page changes carry the pending search, never the stale URL value.
  function navigate(next: Partial<InvestorRouteState>) {
    const pendingSearch = search.pendingSearch()
    replaceRouteKeepingScroll(investorsHref({ whitelabelId: route.whitelabelId, search: pendingSearch, ...next,
      page: pendingSearch !== route.search ? undefined : next.page }))
  }

  // Clamp an out-of-range page to the last one reported by the Backend.
  useEffect(() => {
    if (!data) return
    const target = data.total === 0 ? 1 : Math.min(route.page, data.lastPage)
    if (target !== route.page) {
      replaceRouteKeepingScroll(investorsHref({ whitelabelId: route.whitelabelId, page: target, search: route.search }))
    }
  }, [data, route.page, route.search, route.whitelabelId])

  const filtersActive = route.search !== '' || draft.trim() !== '' || route.whitelabelId !== undefined
  function clearFilters() {
    search.clear()
    replaceRouteKeepingScroll(investorsHref())
  }

  function toggleSort(key: SortKey) {
    setSort((current) =>
      current?.key !== key
        ? { key, direction: key === 'createdAt' ? 'descending' : 'ascending' }
        : { key, direction: current.direction === 'ascending' ? 'descending' : 'ascending' },
    )
  }

  const scopeLabel = route.whitelabelId ? whitelabelName(route.whitelabelId) : 'Todos os Whitelabels'
  const cards: SummaryCard[] = [
    {
      label: 'Total de investidores',
      value: data ? formatCount(data.total) : null,
      detail: route.search ? `${scopeLabel} · resultado da busca` : scopeLabel,
      icon: UsersRound,
      tone: 'blue',
    },
    { label: 'Ativos', value: null, detail: 'Sem contagem agregada no Control Plane', icon: Play, tone: 'teal' },
    { label: 'KYC não concluído', value: null, detail: 'Aguardando integração (Compliance › KYC)', icon: ScanFace, tone: 'amber' },
    { label: 'Com investimentos', value: null, detail: 'Aguardando integração (Financeiro)', icon: ChartColumn, tone: 'violet' },
  ]

  const selectValue = route.whitelabelId ?? 'all'
  const registryHasScope = !route.whitelabelId || Boolean(scopeFromRegistry)

  return (
    <>
      <SummaryCards
        title="Resumo de investidores"
        cards={cards}
        note="Total informado pelo Control Plane para o escopo atual. Os demais indicadores aguardam integração; nenhum valor ilustrativo é exibido."
      />

      <section className={`${fin.card} ${shared.listCard}`} aria-labelledby="participant-list-title" data-investor-list>
        <h2 id="participant-list-title" className="visually-hidden">
          Lista de investidores
        </h2>
        <div className={shared.filters} style={{ '--filter-count': 4 } as CSSProperties}>
          <label className={fin.search}>
            <Search size={16} strokeWidth={1.8} aria-hidden="true" />
            <span className="visually-hidden">Buscar investidores (busca feita pelo Control Plane)</span>
            <input
              id="investor-search"
              type="search"
              value={draft}
              maxLength={INVESTOR_SEARCH_MAX_LENGTH}
              placeholder="Buscar investidores…"
              onChange={(event) => search.setDraft(event.target.value)}
            />
          </label>
          <div className={shared.filterSelects}>
            <label className={fin.filter}>
              <span className="visually-hidden">Whitelabel (consulta separada por Whitelabel no Control Plane)</span>
              <select
                id="investor-whitelabel"
                value={selectValue}
                disabled={options.state.status === 'loading' && !route.whitelabelId}
                onChange={(event) =>
                  navigate({ whitelabelId: event.target.value === 'all' ? undefined : event.target.value })
                }
              >
                <option value="all">Todos os Whitelabels</option>
                {registry?.rows.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
                {!registryHasScope && route.whitelabelId ? (
                  <option value={route.whitelabelId}>{whitelabelName(route.whitelabelId)}</option>
                ) : null}
              </select>
            </label>
          </div>
          <OutlineButton className={shared.clearButton} onClick={clearFilters} disabled={!filtersActive}>
            <FilterX size={15} strokeWidth={1.8} aria-hidden="true" />
            Limpar filtros
          </OutlineButton>
        </div>

        {route.whitelabelId && scope ? (
          <p className={own.scopeNote} data-scope-note>
            <Info size={14} strokeWidth={1.9} aria-hidden="true" />
            <span>
              Investidores de <strong>{scope.name}</strong> (ID {scope.id}), separados pelo Control Plane.{' '}
              <a href={`#/whitelabels?id=${encodeURIComponent(scope.id)}`} className={shared.inlineLink}>
                Ver Whitelabel
              </a>
            </span>
          </p>
        ) : null}
        {options.state.status === 'error' && !route.whitelabelId ? (
          <p className={own.ignoredNote} role="status">
            <Info size={14} strokeWidth={1.9} aria-hidden="true" />
            Não foi possível carregar a lista de Whitelabels; os nomes aparecem como “Whitelabel #ID”.
          </p>
        ) : null}
        {ignored.length ? (
          <p className={own.ignoredNote} role="status" data-ignored-params>
            <Info size={14} strokeWidth={1.9} aria-hidden="true" />
            Filtro da URL não reconhecido e ignorado: {ignored.join(', ')}.
          </p>
        ) : null}

        <div className={fin.tableArea}>
          {scopeMissing ? (
            <div className={own.feedback} data-scope-missing>
              <EmptyState
                icon={SearchX}
                title="Whitelabel não encontrado"
                description={`Nenhum Whitelabel com o ID ${route.whitelabelId} existe no Control Plane.`}
              />
              <OutlineButton onClick={clearFilters}>Ver todos os investidores</OutlineButton>
            </div>
          ) : listError ? (
            <div className={own.feedback} role="alert" data-list-error>
              <EmptyState icon={CircleAlert} title={listError.title} description={listError.description} />
              {listError.correlationId ? (
                <p className={own.diagnostic}>
                  Código de diagnóstico: <code className={own.code}>{listError.correlationId}</code>
                </p>
              ) : null}
              {listError.retryable ? (
                <OutlineButton onClick={list.reload}>
                  <RotateCw size={14} strokeWidth={1.8} aria-hidden="true" />
                  Tentar novamente
                </OutlineButton>
              ) : null}
            </div>
          ) : (
            <table className={`${fin.table} ${shared.table} ${styles.table}`} aria-busy={loading || undefined}>
              <caption className="visually-hidden">
                Investidores ({scopeLabel}), dados do Control Plane{data ? `, página ${data.page} de ${data.lastPage}` : ''}.{' '}
                {sortable
                  ? 'As colunas ordenáveis ordenam todos os resultados.'
                  : 'Ordenação por coluna indisponível: os resultados ocupam mais de uma página.'}{' '}
                Validação é a validação do cadastro do investidor, não o KYC. Investimentos: aguardando integração.
              </caption>
              <thead>
                <tr>
                  <th scope="col" className={styles.colName} aria-sort={sortable && sort?.key === 'name' ? sort.direction : undefined}>
                    {sortable ? (
                      <SortButton label="Investidor" sorted={sort?.key === 'name'} direction={sort?.direction ?? 'ascending'} onClick={() => toggleSort('name')} />
                    ) : (
                      'Investidor'
                    )}
                  </th>
                  <th scope="col" className={styles.colEmail}>
                    E-mail
                  </th>
                  <th scope="col" className={styles.colWl}>
                    Whitelabel
                  </th>
                  <th scope="col" className={styles.colStatus}>
                    Status da conta
                  </th>
                  <th scope="col" className={`${styles.colKyc} ${own.validationHeading}`}>
                    Validação do cadastro
                  </th>
                  <th scope="col" className={styles.colRelation}>
                    Investimentos
                  </th>
                  <th
                    scope="col"
                    className={styles.colActivity}
                    aria-sort={sortable && sort?.key === 'createdAt' ? sort.direction : undefined}
                  >
                    {sortable ? (
                      <SortButton label="Cadastro" sorted={sort?.key === 'createdAt'} direction={sort?.direction ?? 'descending'} onClick={() => toggleSort('createdAt')} />
                    ) : (
                      'Cadastro'
                    )}
                  </th>
                  <th scope="col" className={shared.colActions}>
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: SKELETON_ROWS }, (_, index) => (
                      <tr key={index} className={own.skeletonRow} aria-hidden="true" data-skeleton-row>
                        <td className={styles.colName}>
                          <span className={`${own.skeleton} ${own.skeletonWide}`} />
                        </td>
                        {[styles.colEmail, styles.colWl, styles.colStatus, styles.colKyc, styles.colRelation, styles.colActivity, shared.colActions].map(
                          (className) => (
                            <td key={className} className={className}>
                              <span className={own.skeleton} />
                            </td>
                          ),
                        )}
                      </tr>
                    ))
                  : rows.map((row) => <InvestorRow key={row.id} row={row} whitelabelName={whitelabelName(row.whitelabelId)} listContext={investorsHref(route)} />)}
              </tbody>
            </table>
          )}

          {!scopeMissing && !listError && data && !loading && rows.length === 0 ? (
            <div className={own.feedback} data-list-empty>
              {route.search ? (
                <>
                  <EmptyState
                    icon={SearchX}
                    title="Nenhum investidor encontrado"
                    description="O Control Plane não encontrou investidores para esta busca."
                  />
                  <OutlineButton onClick={() => navigate({ search: '' })}>Limpar busca</OutlineButton>
                </>
              ) : (
                <EmptyState
                  icon={UsersRound}
                  title={route.whitelabelId ? 'Nenhum investidor neste Whitelabel' : 'Nenhum investidor cadastrado'}
                  description="O Control Plane não retornou investidores para este escopo."
                />
              )}
            </div>
          ) : null}
        </div>

        {scopeMissing || listError ? null : (
          <div className={shared.footer}>
            <p className={shared.range} aria-live="polite">
              {data && !loading
                ? data.total === 0
                  ? 'Nenhum investidor'
                  : `Mostrando ${rangeLabel(data)} de ${formatCount(data.total)} ${data.total === 1 ? 'investidor' : 'investidores'}`
                : 'Carregando investidores…'}
              <span className={own.pending}>
                {' '}
                · Dados do Control Plane{data && !sortable ? ' · Ordenação indisponível com várias páginas' : ''}
              </span>
            </p>
            {(data ?? list.lastData) && (data ?? list.lastData)!.lastPage > 1 ? (
              <WindowedPagination
                current={route.page}
                last={(data ?? list.lastData)!.lastPage}
                disabled={loading}
                onChange={(page) => navigate({ page })}
              />
            ) : null}
          </div>
        )}
      </section>
    </>
  )
}

function listErrorView(error: unknown): ApiErrorView {
  const view = describeApiError(error, 'os investidores')
  if (error instanceof ApiError && error.code === 'SCOPE_MISMATCH') {
    return {
      ...view,
      title: 'Escopo do Whitelabel não confirmado',
      description: 'O Control Plane retornou investidores de outro Whitelabel; nada foi exibido para não misturar Whitelabels.',
    }
  }
  return view
}

function rangeLabel(data: InvestorListResult) {
  const from = (data.page - 1) * data.perPage + 1
  const to = from + data.rows.length - 1
  return from === to ? formatCount(from) : `${formatCount(from)}–${formatCount(to)}`
}

/** "—" for values the Control Plane does not provide (announced as "sem dados"). */
function NoData({ label = 'sem dados' }: { label?: string }) {
  return (
    <>
      <span aria-hidden="true">—</span>
      <span className="visually-hidden">{label}</span>
    </>
  )
}

function InvestorRow({ row, whitelabelName, listContext }: { row: InvestorRecord; whitelabelName: string; listContext: string }) {
  const access = accessMeta(row.accessState)
  const validation = validationMeta(row.businessState)
  const created = formatWhitelabelDate(row.createdAt)
  const name = row.fullName ?? 'Nome não informado'
  const href = investorHref(row.id, listContext)
  return (
    <tr className={fin.row} data-investor={row.id}>
      <td className={styles.colName}>
        <span className={shared.cellMain}>
          <span className={styles.avatar}>
            <AccountAvatar initials={row.fullName ? initials(row.fullName) : '?'} />
          </span>
          <span className={shared.cellText}>
            <a href={href} className={shared.rowLink}>
              {name}
            </a>
            <span className={shared.rowId}>ID {row.id}</span>
            <span className={styles.metaEmail}>{row.email ?? 'E-mail não informado'}</span>
            <span className={styles.metaContext}>{whitelabelName} · Investimentos: aguardando integração</span>
            <span className={styles.metaActivity}>Cadastro: {created ?? '—'}</span>
            <span className={styles.metaStates}>
              {access ? <StatusPill tone={access.tone} label={`Conta ${access.label.toLowerCase()}`} /> : null}
              {validation ? <BusinessBadge tone={validation.tone} label={`Validação do cadastro ${validation.label.toLowerCase()}`} /> : null}
            </span>
          </span>
        </span>
      </td>
      <td className={styles.colEmail}>
        {row.email ? (
          <span className={styles.email}>
            <Mail size={14} strokeWidth={1.8} aria-hidden="true" />
            {row.email}
          </span>
        ) : (
          <NoData />
        )}
      </td>
      <td className={styles.colWl}>
        <span className={shared.wlCell}>
          <span className={shared.wlMark} data-tone="neutral" aria-hidden="true">
            {whitelabelName.charAt(0).toLocaleUpperCase('pt-BR')}
          </span>
          {whitelabelName}
        </span>
      </td>
      <td className={styles.colStatus}>{access ? <StatusPill tone={access.tone} label={access.label} /> : <NoData />}</td>
      <td className={styles.colKyc}>{validation ? <BusinessBadge tone={validation.tone} label={validation.label} /> : <NoData />}</td>
      <td className={styles.colRelation}>
        <span className={own.pending}>
          <NoData label="aguardando integração" />
        </span>
      </td>
      <td className={`${styles.colActivity} ${shared.dateCell}`}>{created ?? <NoData />}</td>
      <td className={shared.colActions}>
        <a href={href} className={`${fin.iconButton} ${shared.actionLink}`} aria-label={`Abrir perfil de ${name}`} data-open-profile={row.id}>
          <Eye size={15} strokeWidth={1.8} aria-hidden="true" />
        </a>
      </td>
    </tr>
  )
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

function WindowedPagination({
  current,
  last,
  disabled,
  onChange,
}: {
  current: number
  last: number
  disabled: boolean
  onChange: (page: number) => void
}) {
  return (
    <nav className={shared.pagination} aria-label="Paginação de investidores">
      <button
        type="button"
        className={shared.pageButton}
        disabled={disabled || current <= 1}
        onClick={() => onChange(current - 1)}
        aria-label="Página anterior"
      >
        <ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />
      </button>
      {pageItems(Math.min(current, last), last).map((item, index) =>
        item === 'gap' ? (
          <span key={`gap-${index}`} className={own.pageGap} aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            className={shared.pageButton}
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
        className={shared.pageButton}
        disabled={disabled || current >= last}
        onClick={() => onChange(current + 1)}
        aria-label="Próxima página"
      >
        <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" />
      </button>
    </nav>
  )
}
