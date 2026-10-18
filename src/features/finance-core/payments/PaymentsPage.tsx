import { useEffect, useMemo, type CSSProperties } from 'react'
import { CircleCheck, Clock, Eye, FilterX, QrCode, RotateCcw, Search, SearchX } from 'lucide-react'
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
  PAYMENT_SORT_KEYS,
  PAYMENT_STATUSES,
  type PaymentQuery,
  type PaymentRecord,
  type PaymentSortKey,
  type PaymentStatus,
  type SortOrder,
} from '../shared/financeApi'
import {
  dateText,
  financeErrorView,
  formatCount,
  paymentMethodLabel,
  paymentStatusMeta,
  providerLabel,
  rangeText,
  tenantNames,
} from '../shared/financePresentation'
import {
  investmentHref,
  investorProfileHref,
  parsePaymentListRoute,
  paymentHref,
  paymentsHref,
  type FinanceListProps,
  type PaymentListRoute,
} from '../shared/financeRoute'
import {
  ContextChip,
  DateStack,
  FinanceCoreShell,
  IgnoredParams,
  Money,
  PaymentStatusPill,
  ReadError,
  ServerPagination,
  SkeletonRows,
  TenantTag,
} from '../shared/FinanceCoreUi'
import { useFinanceTenants, usePaymentList } from '../shared/useFinanceData'
import styles from './Payments.module.css'

const SORT_LABEL: Record<PaymentSortKey, string> = { createdAt: 'Criado em', updatedAt: 'Atualizado em', status: 'Status', amount: 'Valor' }
const ORDER_LABEL: Record<PaymentSortKey, Record<SortOrder, string>> = {
  createdAt: { desc: 'mais recente', asc: 'mais antigo' },
  updatedAt: { desc: 'mais recente', asc: 'mais antigo' },
  status: { asc: 'A–Z', desc: 'Z–A' },
  amount: { desc: 'maior primeiro', asc: 'menor primeiro' },
}

/**
 * `#/finance/payments` — Pagamentos / PIX (Finance Read V1): global, READ-ONLY
 * list of investment PIX charges from `GET /payments`. Filters, sorting and
 * pagination are applied by the Control Plane. No charge creation, PIX
 * generation, confirmation, cancellation, refund or reprocessing exists.
 */
export function PaymentsPage(props: FinanceListProps) {
  return (
    <FinanceCoreShell section="payments" title="Pagamentos / PIX">
      <PageIntro text="Cobranças PIX de investimentos em todos os Whitelabels, com dados do Control Plane. Somente leitura: nenhuma ação gera, confirma, cancela ou estorna pagamentos." />
      <PaymentList {...props} />
    </FinanceCoreShell>
  )
}

function PaymentList({ status, whitelabel, investidor, oportunidade, search: searchParam, page, sort, order, routeKey = '' }: FinanceListProps) {
  useRestoreReplacedScroll(routeKey)
  const { state: route, ignored } = useMemo(
    () => parsePaymentListRoute({ status, whitelabel, investidor, oportunidade, search: searchParam, page, sort, order }),
    [status, whitelabel, investidor, oportunidade, searchParam, page, sort, order],
  )
  const tenants = useFinanceTenants()
  const tenantData = tenants.state.status === 'success' ? tenants.state.data : null
  const nameOf = tenantNames(tenantData)

  const list = usePaymentList({
    page: route.page,
    search: route.search,
    status: route.status,
    whitelabelId: route.whitelabelId,
    investorId: route.investorId,
    opportunityId: route.opportunityId,
    sort: route.sort,
    order: route.order,
  })
  const data = list.state.status === 'success' ? list.state.data : null
  const pageOutOfRange = data !== null && data.rows.length === 0 && data.total > 0
  const loading = list.state.status === 'loading' || list.state.status === 'idle' || pageOutOfRange
  const listError = list.state.status === 'error' ? financeErrorView(list.state.error, 'os pagamentos') : null

  const scope = { search: route.search, whitelabelId: route.whitelabelId, investorId: route.investorId, opportunityId: route.opportunityId }
  const countQuery = (status?: PaymentStatus): PaymentQuery => ({ ...scope, page: 1, perPage: 1, status, sort: 'createdAt', order: 'desc' })
  const totalCount = usePaymentList(countQuery())
  const paidCount = usePaymentList(countQuery('paid'))
  const waitingCount = usePaymentList(countQuery('waiting_payment'))
  const refundedCount = usePaymentList(countQuery('refunded'))
  const countOf = (remote: ReturnType<typeof usePaymentList>) => (remote.state.status === 'success' ? formatCount(remote.state.data.total) : null)

  const search = useUrlSearchDraft({
    urlSearch: route.search,
    urlKey: routeKey,
    maxLength: FINANCE_SEARCH_MAX_LENGTH,
    commit: (next) => replaceRouteKeepingScroll(paymentsHref({ ...route, search: next, page: 1 })),
  })

  function navigate(next: Partial<PaymentListRoute>) {
    const pendingSearch = search.pendingSearch()
    const resetPage = !('page' in next) || pendingSearch !== route.search
    replaceRouteKeepingScroll(paymentsHref({ ...route, search: pendingSearch, ...next, page: resetPage ? 1 : next.page }))
  }

  useEffect(() => {
    if (!data) return
    const target = data.total === 0 ? 1 : Math.min(route.page, data.lastPage)
    if (target !== route.page) replaceRouteKeepingScroll(paymentsHref({ ...route, page: target }))
  }, [data, route])

  const filtersActive =
    route.search !== '' || search.draft.trim() !== '' || Boolean(route.status || route.whitelabelId || route.investorId || route.opportunityId)
  function clearFilters() {
    search.clear()
    replaceRouteKeepingScroll(paymentsHref({ sort: route.sort, order: route.order }))
  }

  function toggleSort(key: PaymentSortKey) {
    navigate(route.sort !== key ? { sort: key, order: key === 'status' ? 'asc' : 'desc' } : { sort: key, order: route.order === 'asc' ? 'desc' : 'asc' })
  }
  const ariaSort = (key: PaymentSortKey) => (route.sort === key ? (route.order === 'asc' ? 'ascending' : 'descending') : undefined)
  const sortHeader = (key: PaymentSortKey) => (
    <SortButton label={SORT_LABEL[key]} sorted={route.sort === key} direction={route.order === 'asc' ? 'ascending' : 'descending'} onClick={() => toggleSort(key)} />
  )

  const scopeLabel = route.whitelabelId ? nameOf(route.whitelabelId) : 'Todos os Whitelabels'
  const cards: SummaryCard[] = [
    { label: 'Total de pagamentos', value: countOf(totalCount), detail: route.search ? `${scopeLabel} · resultado da busca` : scopeLabel, icon: QrCode, tone: 'blue' },
    { label: 'Pagos', value: countOf(paidCount), detail: 'Status do pagamento: pago', icon: CircleCheck, tone: 'teal' },
    { label: 'Aguardando pagamento', value: countOf(waitingCount), detail: 'Cobrança ainda não paga', icon: Clock, tone: 'amber' },
    { label: 'Reembolsados', value: countOf(refundedCount), detail: 'Status do pagamento', icon: RotateCcw, tone: 'violet' },
  ]

  const listContext = paymentsHref(route)
  const columns = [styles.colId, styles.colInvestment, styles.colInvestor, styles.colWl, styles.colProvider, styles.colAmount, styles.colStatus, styles.colPaid, styles.colCreated, shared.colActions]
  const tenantOptions = tenantData?.rows ?? []

  return (
    <>
      <SummaryCards
        title="Resumo dos pagamentos"
        cards={cards}
        note="Contagens informadas pelo Control Plane para o escopo atual (Whitelabel, investidor, oportunidade e busca). Nenhum valor monetário é somado nesta tela."
      />

      <section className={`${fin.card} ${shared.listCard}`} aria-labelledby="pay-list-title" data-payment-list>
        <h2 id="pay-list-title" className="visually-hidden">
          Lista de pagamentos
        </h2>
        <div className={`${shared.filters} ${core.filtersWide}`} style={{ '--filter-count': 3 } as CSSProperties}>
          <label className={fin.search}>
            <Search size={16} strokeWidth={1.8} aria-hidden="true" />
            <span className="visually-hidden">Buscar por TxID, nome ou e-mail do investidor (busca feita pelo Control Plane)</span>
            <input
              id="payment-search"
              type="search"
              value={search.draft}
              maxLength={FINANCE_SEARCH_MAX_LENGTH}
              placeholder="Buscar por TxID ou investidor…"
              onChange={(event) => search.setDraft(event.target.value)}
            />
          </label>
          <div className={shared.filterSelects}>
            <label className={fin.filter}>
              <span className="visually-hidden">Filtrar por status do pagamento</span>
              <select id="payment-status" value={route.status ?? 'all'} onChange={(event) => navigate({ status: event.target.value === 'all' ? undefined : (event.target.value as PaymentStatus) })}>
                <option value="all">Todos os status</option>
                {PAYMENT_STATUSES.map((key) => (
                  <option key={key} value={key}>
                    {paymentStatusMeta(key).label}
                  </option>
                ))}
              </select>
            </label>
            <label className={fin.filter}>
              <span className="visually-hidden">Filtrar por Whitelabel</span>
              <select id="payment-whitelabel" value={route.whitelabelId ?? 'all'} onChange={(event) => navigate({ whitelabelId: event.target.value === 'all' ? undefined : event.target.value })}>
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
            <label className={fin.filter}>
              <span className="visually-hidden">Ordenar pagamentos</span>
              <select
                id="payment-sort"
                value={`${route.sort}:${route.order}`}
                onChange={(event) => {
                  const [sort, order] = event.target.value.split(':') as [PaymentSortKey, SortOrder]
                  navigate({ sort, order })
                }}
              >
                {PAYMENT_SORT_KEYS.flatMap((key) =>
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
                Pagamentos PIX ({scopeLabel}), dados do Control Plane{data ? `, página ${data.page} de ${data.lastPage}` : ''}.
              </caption>
              <thead>
                <tr>
                  <th scope="col" className={styles.colId}>
                    Pagamento
                  </th>
                  <th scope="col" className={styles.colInvestment}>
                    Investimento
                  </th>
                  <th scope="col" className={styles.colInvestor}>
                    Investidor
                  </th>
                  <th scope="col" className={styles.colWl}>
                    Whitelabel
                  </th>
                  <th scope="col" className={styles.colProvider}>
                    Provedor
                  </th>
                  <th scope="col" className={styles.colAmount} aria-sort={ariaSort('amount')}>
                    {sortHeader('amount')}
                  </th>
                  <th scope="col" className={styles.colStatus} aria-sort={ariaSort('status')}>
                    {sortHeader('status')}
                  </th>
                  <th scope="col" className={styles.colPaid}>
                    Pago em
                  </th>
                  <th scope="col" className={styles.colCreated} aria-sort={ariaSort('createdAt')}>
                    {sortHeader('createdAt')}
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
                    <PaymentRow
                      key={row.id}
                      row={row}
                      tenant={nameOf(row.whitelabelId)}
                      href={paymentHref(row.id, listContext)}
                      onInvestor={route.investorId === row.investorId ? undefined : () => navigate({ investorId: row.investorId })}
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
                  <EmptyState icon={SearchX} title="Nenhum pagamento encontrado" description="O Control Plane não encontrou pagamentos para estes filtros." />
                  <OutlineButton onClick={clearFilters}>Limpar filtros</OutlineButton>
                </>
              ) : (
                <EmptyState icon={QrCode} title="Nenhum pagamento registrado" description="O Control Plane não retornou pagamentos." />
              )}
            </div>
          ) : null}
        </div>

        {listError ? null : (
          <div className={shared.footer}>
            <p className={shared.range} aria-live="polite">
              {data && !loading ? rangeText(data, 'pagamento', 'pagamentos', 'Nenhum pagamento') : 'Carregando pagamentos…'}
              <span className={core.dataNote}> · Dados do Control Plane</span>
            </p>
            <ServerPagination
              label="Paginação de pagamentos"
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

function PaymentRow({ row, tenant, href, onInvestor }: { row: PaymentRecord; tenant: string; href: string; onInvestor?: () => void }) {
  return (
    <tr className={fin.row} data-payment={row.id}>
      <td className={styles.colId}>
        <span className={shared.cellText}>
          <a href={href} className={shared.rowLink}>
            Pagamento {row.id}
          </a>
          <span className={styles.metaMethod}>{paymentMethodLabel(row.paymentMethod)} · {providerLabel(row.provider)}</span>
          <span className={styles.metaRelations}>
            Investimento #{row.investmentId} · Investidor #{row.investorId}
          </span>
          <span className={styles.metaContext}>{tenant}</span>
          <span className={styles.metaDates}>
            Pago em {row.paymentAt ? dateText(row.paymentAt) : '—'} · Criado em {dateText(row.createdAt)}
          </span>
          <span className={styles.metaStates}>
            <span className={styles.metaAmount}>
              <Money cents={row.amountCents} />
            </span>
            <PaymentStatusPill status={row.status} />
          </span>
        </span>
      </td>
      <td className={styles.colInvestment}>
        <a href={investmentHref(row.investmentId)} className={shared.inlineLink}>
          Investimento #{row.investmentId}
        </a>
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
      <td className={styles.colWl}>
        <TenantTag whitelabelId={row.whitelabelId} name={tenant} />
      </td>
      <td className={styles.colProvider}>
        <span className={shared.cellText}>
          <span>{providerLabel(row.provider)}</span>
          <span className={shared.rowId}>{paymentMethodLabel(row.paymentMethod)}</span>
        </span>
      </td>
      <td className={styles.colAmount}>
        <Money cents={row.amountCents} />
      </td>
      <td className={styles.colStatus}>
        <PaymentStatusPill status={row.status} />
      </td>
      <td className={styles.colPaid}>{row.paymentAt ? <DateStack iso={row.paymentAt} /> : <span className={shared.muted}>Sem data de pagamento</span>}</td>
      <td className={styles.colCreated}>
        <DateStack iso={row.createdAt} />
      </td>
      <td className={shared.colActions}>
        <a href={href} className={`${fin.iconButton} ${shared.actionLink}`} aria-label={`Abrir pagamento ${row.id}`} data-open-record={row.id}>
          <Eye size={15} strokeWidth={1.8} aria-hidden="true" />
        </a>
      </td>
    </tr>
  )
}
