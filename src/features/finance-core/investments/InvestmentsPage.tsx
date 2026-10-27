import { useEffect, useMemo, type CSSProperties } from 'react'
import { ChartColumn, CircleCheck, Clock, Eye, FilterX, OctagonX, Search, SearchX } from 'lucide-react'
import { replaceRouteKeepingScroll, useRestoreReplacedScroll } from '../../../app/routeQuery'
import { useUrlSearchDraft } from '../../../app/useUrlSearchDraft'
import { EmptyState } from '../../../components/ui/EmptyState'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import fin from '../../finance-gateways/sections/FinanceSections.module.css'
import { PageIntro, SortButton, SummaryCards, type SummaryCard } from '../../operation/shared/OperationUi'
import shared from '../../operation/shared/Operation.module.css'
import core from '../shared/FinanceCore.module.css'
import {
  FINANCE_SEARCH_MAX_LENGTH,
  INVESTMENT_SORT_KEYS,
  INVESTMENT_STATUSES,
  type InvestmentQuery,
  type InvestmentRecord,
  type InvestmentSortKey,
  type InvestmentStatus,
  type SortOrder,
} from '../shared/financeApi'
import { dateText, financeErrorView, formatCount, investmentStatusMeta, rangeText, tenantNames } from '../shared/financePresentation'
import {
  investmentHref,
  investmentsHref,
  investorProfileHref,
  parseInvestmentListRoute,
  type FinanceListProps,
  type InvestmentListRoute,
} from '../shared/financeRoute'
import {
  ContextChip,
  DateStack,
  FinanceCoreShell,
  IgnoredParams,
  InvestmentStatusPill,
  Money,
  ReadError,
  ServerPagination,
  SkeletonRows,
  TenantTag,
} from '../shared/FinanceCoreUi'
import { useFinanceTenants, useInvestmentList } from '../shared/useFinanceData'
import styles from './Investments.module.css'

const SORT_LABEL: Record<InvestmentSortKey, string> = { createdAt: 'Criado em', updatedAt: 'Atualizado em', status: 'Status' }
const ORDER_LABEL: Record<InvestmentSortKey, Record<SortOrder, string>> = {
  createdAt: { desc: 'mais recente', asc: 'mais antigo' },
  updatedAt: { desc: 'mais recente', asc: 'mais antigo' },
  status: { asc: 'A–Z', desc: 'Z–A' },
}

/**
 * `#/finance/investments` — Investimentos (Finance Read V1): global, READ-ONLY
 * list from `GET /investments`. Search, status, Whitelabel, investor and
 * opportunity filters, sorting and pagination are all applied by the Control
 * Plane (URL-backed). No create, edit, status change, confirmation,
 * settlement, cancellation or refund exists.
 */
export function InvestmentsPage(props: FinanceListProps) {
  return (
    <FinanceCoreShell section="investments" title="Investimentos">
      <PageIntro text="Consulte investimentos, valores e estados por Whitelabel." readOnly />
      <InvestmentList {...props} />
    </FinanceCoreShell>
  )
}

function InvestmentList({ status, whitelabel, investidor, oportunidade, search: searchParam, page, sort, order, routeKey = '' }: FinanceListProps) {
  useRestoreReplacedScroll(routeKey)
  const { state: route, ignored } = useMemo(
    () => parseInvestmentListRoute({ status, whitelabel, investidor, oportunidade, search: searchParam, page, sort, order }),
    [status, whitelabel, investidor, oportunidade, searchParam, page, sort, order],
  )
  const tenants = useFinanceTenants()
  const tenantData = tenants.state.status === 'success' ? tenants.state.data : null
  const nameOf = tenantNames(tenantData)

  const query: InvestmentQuery = {
    page: route.page,
    search: route.search,
    status: route.status,
    whitelabelId: route.whitelabelId,
    investorId: route.investorId,
    opportunityId: route.opportunityId,
    sort: route.sort,
    order: route.order,
  }
  const list = useInvestmentList(query)
  const data = list.state.status === 'success' ? list.state.data : null
  // Investments answer a page past the end with an empty page (meta.page = requested): clamp below.
  const pageOutOfRange = data !== null && data.rows.length === 0 && data.total > 0
  const loading = list.state.status === 'loading' || list.state.status === 'idle' || pageOutOfRange
  const listError = list.state.status === 'error' ? financeErrorView(list.state.error, 'os investimentos') : null

  /* Scope counts (Backend totals, one perPage=1 read per status; never a client count). */
  const scope = { search: route.search, whitelabelId: route.whitelabelId, investorId: route.investorId, opportunityId: route.opportunityId }
  const countQuery = (status?: InvestmentStatus): InvestmentQuery => ({ ...scope, page: 1, perPage: 1, status, sort: 'createdAt', order: 'desc' })
  const totalCount = useInvestmentList(countQuery())
  const paidCount = useInvestmentList(countQuery('paid'))
  const waitingCount = useInvestmentList(countQuery('waiting_payment'))
  const failedCount = useInvestmentList(countQuery('failed'))
  const countOf = (remote: ReturnType<typeof useInvestmentList>) => (remote.state.status === 'success' ? formatCount(remote.state.data.total) : null)

  const search = useUrlSearchDraft({
    urlSearch: route.search,
    urlKey: routeKey,
    maxLength: FINANCE_SEARCH_MAX_LENGTH,
    commit: (next) => replaceRouteKeepingScroll(investmentsHref({ ...route, search: next, page: 1 })),
  })

  /** Any change other than the page goes back to page 1; the pending search is carried, never the stale URL value. */
  function navigate(next: Partial<InvestmentListRoute>) {
    const pendingSearch = search.pendingSearch()
    const resetPage = !('page' in next) || pendingSearch !== route.search
    replaceRouteKeepingScroll(investmentsHref({ ...route, search: pendingSearch, ...next, page: resetPage ? 1 : next.page }))
  }

  useEffect(() => {
    if (!data) return
    const target = data.total === 0 ? 1 : Math.min(route.page, data.lastPage)
    if (target !== route.page) replaceRouteKeepingScroll(investmentsHref({ ...route, page: target }))
  }, [data, route])

  const filtersActive =
    route.search !== '' || search.draft.trim() !== '' || Boolean(route.status || route.whitelabelId || route.investorId || route.opportunityId)
  function clearFilters() {
    search.clear()
    replaceRouteKeepingScroll(investmentsHref({ sort: route.sort, order: route.order }))
  }

  function toggleSort(key: InvestmentSortKey) {
    navigate(route.sort !== key ? { sort: key, order: key === 'status' ? 'asc' : 'desc' } : { sort: key, order: route.order === 'asc' ? 'desc' : 'asc' })
  }
  const ariaSort = (key: InvestmentSortKey) => (route.sort === key ? (route.order === 'asc' ? 'ascending' : 'descending') : undefined)
  const sortHeader = (key: InvestmentSortKey) => (
    <SortButton label={SORT_LABEL[key]} sorted={route.sort === key} direction={route.order === 'asc' ? 'ascending' : 'descending'} onClick={() => toggleSort(key)} />
  )

  const scopeLabel = route.whitelabelId ? nameOf(route.whitelabelId) : 'Todos os Whitelabels'
  const cards: SummaryCard[] = [
    { label: 'Total de investimentos', value: countOf(totalCount), detail: route.search ? `${scopeLabel} · resultado da busca` : scopeLabel, icon: ChartColumn, tone: 'blue' },
    { label: 'Pagos', value: countOf(paidCount), detail: 'Status do investimento: pago', icon: CircleCheck, tone: 'teal' },
    { label: 'Aguardando pagamento', value: countOf(waitingCount), detail: 'Status do investimento', icon: Clock, tone: 'amber' },
    { label: 'Com falha', value: countOf(failedCount), detail: 'Status do investimento: falhou', icon: OctagonX, tone: 'violet' },
  ]

  const listContext = investmentsHref(route)
  const columns = [styles.colId, styles.colInvestor, styles.colOpportunity, styles.colWl, styles.colQuotes, styles.colAmount, styles.colStatus, styles.colCreated, styles.colUpdated, shared.colActions]
  const tenantOptions = tenantData?.rows ?? []

  return (
    <>
      <SummaryCards
        title="Resumo dos investimentos"
        cards={cards}
        note="Contagens informadas pelo Control Plane para o escopo atual (Whitelabel, investidor, oportunidade e busca). Nenhum valor monetário é somado nesta tela."
      />

      <section className={`${fin.card} ${shared.listCard}`} aria-labelledby="inv-list-title" data-investment-list>
        <h2 id="inv-list-title" className={shared.listHeading}>
          Lista de investimentos
        </h2>
        <div className={`${shared.filters} ${core.filtersWide}`} style={{ '--filter-count': 3 } as CSSProperties}>
          <label className={`${fin.search} ${fin.labeledSearch}`}>
            <span className={fin.controlLabel} aria-hidden="true">Busca</span>
            <Search size={16} strokeWidth={1.8} aria-hidden="true" />
            <span className="visually-hidden">Buscar por nome ou e-mail do investidor, ou nome da oportunidade (busca feita pelo Control Plane)</span>
            <input
              id="investment-search"
              type="search"
              value={search.draft}
              maxLength={FINANCE_SEARCH_MAX_LENGTH}
              placeholder="Buscar investidor ou oportunidade…"
              onChange={(event) => search.setDraft(event.target.value)}
            />
          </label>
          <div className={shared.filterSelects}>
            <label className={`${fin.filter} ${fin.labeledFilter}`}>
              <span className={fin.controlLabel} aria-hidden="true">Status</span>
              <span className="visually-hidden">Filtrar por status do investimento</span>
              <select id="investment-status" value={route.status ?? 'all'} onChange={(event) => navigate({ status: event.target.value === 'all' ? undefined : (event.target.value as InvestmentStatus) })}>
                <option value="all">Todos os status</option>
                {INVESTMENT_STATUSES.map((key) => (
                  <option key={key} value={key}>
                    {investmentStatusMeta(key).label}
                  </option>
                ))}
              </select>
            </label>
            <label className={`${fin.filter} ${fin.labeledFilter}`}>
              <span className={fin.controlLabel} aria-hidden="true">Whitelabel</span>
              <span className="visually-hidden">Filtrar por Whitelabel</span>
              <select id="investment-whitelabel" value={route.whitelabelId ?? 'all'} onChange={(event) => navigate({ whitelabelId: event.target.value === 'all' ? undefined : event.target.value })}>
                <option value="all">Todos os Whitelabels</option>
                {tenantOptions.map((row) => (
                  <option key={row.whitelabelId} value={row.whitelabelId}>
                    {nameOf(row.whitelabelId)}
                  </option>
                ))}
                {route.whitelabelId && !tenantOptions.some((row) => row.whitelabelId === route.whitelabelId) ? (
                  <option value={route.whitelabelId}>{nameOf(route.whitelabelId)}</option>
                ) : null}
              </select>
            </label>
            <label className={`${fin.filter} ${fin.labeledFilter}`}>
              <span className={fin.controlLabel} aria-hidden="true">Ordenação</span>
              <span className="visually-hidden">Ordenar investimentos</span>
              <select
                id="investment-sort"
                value={`${route.sort}:${route.order}`}
                onChange={(event) => {
                  const [sort, order] = event.target.value.split(':') as [InvestmentSortKey, SortOrder]
                  navigate({ sort, order })
                }}
              >
                {INVESTMENT_SORT_KEYS.flatMap((key) =>
                  (['desc', 'asc'] as const).map((order) => (
                    <option key={`${key}:${order}`} value={`${key}:${order}`}>
                      {SORT_LABEL[key]} ({ORDER_LABEL[key][order]})
                    </option>
                  )),
                )}
              </select>
            </label>
          </div>
          <OutlineButton className={shared.clearButton} onClick={clearFilters} disabled={!filtersActive}>
            <FilterX size={15} strokeWidth={1.8} aria-hidden="true" />
            Limpar filtros
          </OutlineButton>
        </div>

        {route.investorId ? (
          <ContextChip
            dataName="investor"
            label={`Investidor #${route.investorId}`}
            removeLabel={`Remover filtro do investidor ${route.investorId}`}
            onRemove={() => navigate({ investorId: undefined })}
          />
        ) : null}
        {route.opportunityId ? (
          <ContextChip
            dataName="opportunity"
            label={`Oportunidade #${route.opportunityId}`}
            removeLabel={`Remover filtro da oportunidade ${route.opportunityId}`}
            onRemove={() => navigate({ opportunityId: undefined })}
          />
        ) : null}
        <IgnoredParams ignored={ignored} />

        <div className={fin.tableArea}>
          {listError ? (
            <ReadError error={listError} onRetry={list.reload} />
          ) : (
            <table className={`${fin.table} ${shared.table} ${styles.table}`} aria-busy={loading || undefined}>
              <caption className="visually-hidden">
                Investimentos ({scopeLabel}), dados do Control Plane{data ? `, página ${data.page} de ${data.lastPage}` : ''}. Valores em reais, a partir de centavos
                informados pelo Control Plane.
              </caption>
              <thead>
                <tr>
                  <th scope="col" className={styles.colId}>
                    Investimento
                  </th>
                  <th scope="col" className={styles.colInvestor}>
                    Investidor
                  </th>
                  <th scope="col" className={styles.colOpportunity}>
                    Oportunidade
                  </th>
                  <th scope="col" className={styles.colWl}>
                    Whitelabel
                  </th>
                  <th scope="col" className={styles.colQuotes}>
                    Cotas
                  </th>
                  <th scope="col" className={styles.colAmount}>
                    Valor
                  </th>
                  <th scope="col" className={styles.colStatus} aria-sort={ariaSort('status')}>
                    {sortHeader('status')}
                  </th>
                  <th scope="col" className={styles.colCreated} aria-sort={ariaSort('createdAt')}>
                    {sortHeader('createdAt')}
                  </th>
                  <th scope="col" className={styles.colUpdated} aria-sort={ariaSort('updatedAt')}>
                    {sortHeader('updatedAt')}
                  </th>
                  <th scope="col" className={shared.colActions}>
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonRows columns={columns} />
                ) : (
                  data?.rows.map((row) => (
                    <InvestmentRow
                      key={row.id}
                      row={row}
                      tenant={nameOf(row.whitelabelId)}
                      href={investmentHref(row.id, listContext)}
                      onInvestor={route.investorId === row.investorId ? undefined : () => navigate({ investorId: row.investorId })}
                      onOpportunity={route.opportunityId === row.opportunityId ? undefined : () => navigate({ opportunityId: row.opportunityId })}
                    />
                  ))
                )}
              </tbody>
            </table>
          )}

          {!listError && data && !loading && data.rows.length === 0 ? (
            <div className={core.feedback} data-list-empty>
              {filtersActive ? (
                <>
                  <EmptyState icon={SearchX} title="Nenhum investimento encontrado" description="O Control Plane não encontrou investimentos para estes filtros." />
                  <OutlineButton onClick={clearFilters}>Limpar filtros</OutlineButton>
                </>
              ) : (
                <EmptyState icon={ChartColumn} title="Nenhum investimento registrado" description="O Control Plane não retornou investimentos." />
              )}
            </div>
          ) : null}
        </div>

        {listError ? null : (
          <div className={shared.footer}>
            <p className={shared.range} aria-live="polite">
              {data && !loading ? rangeText(data, 'investimento', 'investimentos', 'Nenhum investimento') : 'Carregando investimentos…'}
              <span className={core.dataNote}> · Dados do Control Plane</span>
            </p>
            <ServerPagination
              label="Paginação de investimentos"
              current={route.page}
              last={(data ?? list.lastData)?.lastPage ?? 1}
              disabled={loading}
              onChange={(page) => navigate({ page })}
            />
          </div>
        )}
      </section>
    </>
  )
}

function InvestmentRow({
  row,
  tenant,
  href,
  onInvestor,
  onOpportunity,
}: {
  row: InvestmentRecord
  tenant: string
  href: string
  onInvestor?: () => void
  onOpportunity?: () => void
}) {
  return (
    <tr className={fin.row} data-investment={row.id}>
      <td className={styles.colId}>
        <span className={shared.cellText}>
          <a href={href} className={shared.rowLink}>
            Investimento {row.id}
          </a>
          <span className={styles.metaParties}>
            Investidor #{row.investorId} · Oportunidade #{row.opportunityId}
          </span>
          <span className={styles.metaWl}>{tenant}</span>
          <span className={styles.metaQuotes}>Cotas: {row.quoteQuantity ?? '—'}</span>
          <span className={styles.metaDates}>
            Criado em {dateText(row.createdAt)} · Atualizado em {dateText(row.updatedAt)}
          </span>
          <span className={styles.metaStates}>
            <span className={styles.metaAmount}>
              <Money cents={row.amountCents} />
            </span>
            <InvestmentStatusPill status={row.status} />
          </span>
        </span>
      </td>
      <td className={styles.colInvestor}>
        <span className={shared.cellText}>
          <a href={investorProfileHref(row.investorId)} className={shared.inlineLink} aria-label={`Abrir investidor ${row.investorId} em Operação › Investidores`}>
            Investidor #{row.investorId}
          </a>
          {onInvestor ? (
            <button type="button" className={core.filterInline} onClick={onInvestor} data-filter-investor={row.investorId}>
              Filtrar por este investidor
            </button>
          ) : null}
        </span>
      </td>
      <td className={styles.colOpportunity}>
        <span className={shared.cellText}>
          <span>Oportunidade #{row.opportunityId}</span>
          {onOpportunity ? (
            <button type="button" className={core.filterInline} onClick={onOpportunity} data-filter-opportunity={row.opportunityId}>
              Filtrar por esta oportunidade
            </button>
          ) : null}
        </span>
      </td>
      <td className={styles.colWl}>
        <TenantTag whitelabelId={row.whitelabelId} name={tenant} />
      </td>
      <td className={styles.colQuotes}>{row.quoteQuantity ?? <span className={shared.muted}>—</span>}</td>
      <td className={styles.colAmount}>
        <Money cents={row.amountCents} />
      </td>
      <td className={styles.colStatus}>
        <InvestmentStatusPill status={row.status} />
      </td>
      <td className={styles.colCreated}>
        <DateStack iso={row.createdAt} />
      </td>
      <td className={styles.colUpdated}>
        <DateStack iso={row.updatedAt} />
      </td>
      <td className={shared.colActions}>
        <a href={href} className={`${fin.iconButton} ${shared.actionLink}`} aria-label={`Abrir investimento ${row.id}`} data-open-record={row.id}>
          <Eye size={15} strokeWidth={1.8} aria-hidden="true" />
        </a>
      </td>
    </tr>
  )
}
