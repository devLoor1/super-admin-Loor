import { useEffect, useMemo, type CSSProperties } from 'react'
import { Coins, Eye, FilterX, Landmark, Search, SearchX, Sigma, Wallet as WalletIcon } from 'lucide-react'
import { replaceRouteKeepingScroll, useRestoreReplacedScroll } from '../../../app/routeQuery'
import { useUrlSearchDraft } from '../../../app/useUrlSearchDraft'
import { EmptyState } from '../../../components/ui/EmptyState'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import fin from '../../finance-gateways/sections/FinanceSections.module.css'
import { PageIntro, SortButton, SummaryCards, type SummaryCard } from '../../operation/shared/OperationUi'
import shared from '../../operation/shared/Operation.module.css'
import core from '../shared/FinanceCore.module.css'
import { FINANCE_SEARCH_MAX_LENGTH, WALLET_SORT_KEYS, type SortOrder, type WalletRecord, type WalletSortKey } from '../shared/financeApi'
import { BALANCE_UNAVAILABLE, dateText, financeErrorView, formatCount, rangeText } from '../shared/financePresentation'
import { parseWalletListRoute, walletHref, walletsHref, whitelabelRecordHref, type WalletListProps, type WalletListRoute } from '../shared/financeRoute'
import { DateStack, FinanceCoreShell, IgnoredParams, Money, ReadError, ServerPagination, SkeletonRows } from '../shared/FinanceCoreUi'
import { useWalletList } from '../shared/useFinanceData'
import styles from './Wallets.module.css'

const SORT_LABEL: Record<WalletSortKey, string> = { name: 'Whitelabel', createdAt: 'Criada em' }
const ORDER_LABEL: Record<WalletSortKey, Record<SortOrder, string>> = {
  name: { asc: 'A–Z', desc: 'Z–A' },
  createdAt: { desc: 'mais recente', asc: 'mais antiga' },
}

type WalletsPageProps = WalletListProps

/**
 * `#/finance/wallets` — Wallet (Finance Read V1): one ledger wallet per
 * Whitelabel from `GET /wallets`, with the Backend's authoritative balance.
 * Nothing is computed here; no credit, debit, transfer, withdrawal or balance
 * adjustment exists.
 */
export function WalletsPage(props: WalletsPageProps) {
  return (
    <FinanceCoreShell section="wallets" title="Wallet">
      <PageIntro text="Wallets do ledger da plataforma — uma por Whitelabel — com o saldo autoritativo informado pelo Control Plane. Somente leitura: nenhuma ação credita, debita, transfere ou ajusta saldo." />
      <WalletList {...props} />
    </FinanceCoreShell>
  )
}

function WalletList({ search: searchParam, page, sort, order, routeKey = '' }: WalletsPageProps) {
  useRestoreReplacedScroll(routeKey)
  const { state: route, ignored } = useMemo(() => parseWalletListRoute({ search: searchParam, page, sort, order }), [searchParam, page, sort, order])
  const list = useWalletList({ page: route.page, search: route.search, sort: route.sort, order: route.order })
  const data = list.state.status === 'success' ? list.state.data : null
  const pageOutOfRange = data !== null && data.rows.length === 0 && data.total > 0
  const loading = list.state.status === 'loading' || list.state.status === 'idle' || pageOutOfRange
  const listError = list.state.status === 'error' ? financeErrorView(list.state.error, 'as wallets') : null

  const search = useUrlSearchDraft({
    urlSearch: route.search,
    urlKey: routeKey,
    maxLength: FINANCE_SEARCH_MAX_LENGTH,
    commit: (next) => replaceRouteKeepingScroll(walletsHref({ ...route, search: next, page: 1 })),
  })

  function navigate(next: Partial<WalletListRoute>) {
    const pendingSearch = search.pendingSearch()
    const resetPage = !('page' in next) || pendingSearch !== route.search
    replaceRouteKeepingScroll(walletsHref({ ...route, search: pendingSearch, ...next, page: resetPage ? 1 : next.page }))
  }

  useEffect(() => {
    if (!data) return
    const target = data.total === 0 ? 1 : Math.min(route.page, data.lastPage)
    if (target !== route.page) replaceRouteKeepingScroll(walletsHref({ ...route, page: target }))
  }, [data, route])

  const filtersActive = route.search !== '' || search.draft.trim() !== ''
  function clearFilters() {
    search.clear()
    replaceRouteKeepingScroll(walletsHref({ sort: route.sort, order: route.order }))
  }

  function toggleSort(key: WalletSortKey) {
    navigate(route.sort !== key ? { sort: key, order: key === 'name' ? 'asc' : 'desc' } : { sort: key, order: route.order === 'asc' ? 'desc' : 'asc' })
  }
  const ariaSort = (key: WalletSortKey) => (route.sort === key ? (route.order === 'asc' ? 'ascending' : 'descending') : undefined)
  const sortHeader = (key: WalletSortKey) => (
    <SortButton label={SORT_LABEL[key]} sorted={route.sort === key} direction={route.order === 'asc' ? 'ascending' : 'descending'} onClick={() => toggleSort(key)} />
  )

  const cards: SummaryCard[] = [
    { label: 'Wallets', value: data ? formatCount(data.total) : null, detail: route.search ? 'Resultado da busca' : 'Uma por Whitelabel', icon: WalletIcon, tone: 'blue' },
    { label: 'Moeda e unidade', value: 'BRL', detail: 'Centavos inteiros (contrato do Control Plane)', icon: Coins, tone: 'teal' },
    { label: 'Saldo', value: 'Por wallet', detail: 'Saldo autoritativo do Control Plane', icon: Landmark, tone: 'amber' },
    { label: 'Saldo somado', value: null, detail: 'Não somado entre Whitelabels', icon: Sigma, tone: 'violet' },
  ]

  const listContext = walletsHref(route)
  const columns = [styles.colId, styles.colWl, styles.colCurrency, styles.colBalance, styles.colBalanceAt, styles.colCreated, shared.colActions]

  return (
    <>
      <SummaryCards
        title="Resumo das wallets"
        cards={cards}
        note="O saldo de cada wallet é o valor autoritativo informado pelo Control Plane. Nada é calculado a partir de movimentações nem somado entre Whitelabels."
      />

      <section className={`${fin.card} ${shared.listCard}`} aria-labelledby="wal-list-title" data-wallet-list>
        <h2 id="wal-list-title" className="visually-hidden">
          Lista de wallets
        </h2>
        <div className={shared.filters} style={{ '--filter-count': 1 } as CSSProperties}>
          <label className={fin.search}>
            <Search size={16} strokeWidth={1.8} aria-hidden="true" />
            <span className="visually-hidden">Buscar por nome ou slug do Whitelabel (busca feita pelo Control Plane)</span>
            <input
              id="wallet-search"
              type="search"
              value={search.draft}
              maxLength={FINANCE_SEARCH_MAX_LENGTH}
              placeholder="Buscar por Whitelabel…"
              onChange={(event) => search.setDraft(event.target.value)}
            />
          </label>
          <div className={shared.filterSelects}>
            <label className={fin.filter}>
              <span className="visually-hidden">Ordenar wallets</span>
              <select
                id="wallet-sort"
                value={`${route.sort}:${route.order}`}
                onChange={(event) => {
                  const [nextSort, nextOrder] = event.target.value.split(':') as [WalletSortKey, SortOrder]
                  navigate({ sort: nextSort, order: nextOrder })
                }}
              >
                {WALLET_SORT_KEYS.flatMap((key) =>
                  (['asc', 'desc'] as const).map((value) => (
                    <option key={`${key}:${value}`} value={`${key}:${value}`}>
                      {SORT_LABEL[key]} ({ORDER_LABEL[key][value]})
                    </option>
                  )),
                )}
              </select>
            </label>
          </div>
          <OutlineButton className={shared.clearButton} onClick={clearFilters} disabled={!filtersActive}>
            <FilterX size={15} strokeWidth={1.8} aria-hidden="true" />
            Limpar busca
          </OutlineButton>
        </div>
        <IgnoredParams ignored={ignored} />

        <div className={fin.tableArea}>
          {listError ? (
            <ReadError error={listError} onRetry={list.reload} />
          ) : (
            <table className={`${fin.table} ${shared.table} ${styles.table}`} aria-busy={loading || undefined}>
              <caption className="visually-hidden">
                Wallets do ledger (uma por Whitelabel), dados do Control Plane{data ? `, página ${data.page} de ${data.lastPage}` : ''}. Saldo autoritativo em
                reais, a partir de centavos.
              </caption>
              <thead>
                <tr>
                  <th scope="col" className={styles.colId} aria-sort={ariaSort('name')}>
                    {sortHeader('name')}
                  </th>
                  <th scope="col" className={styles.colWl}>
                    Registro do Whitelabel
                  </th>
                  <th scope="col" className={styles.colCurrency}>
                    Moeda
                  </th>
                  <th scope="col" className={styles.colBalance}>
                    Saldo autoritativo
                  </th>
                  <th scope="col" className={styles.colBalanceAt}>
                    Saldo consultado em
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
                {loading ? <SkeletonRows columns={columns} /> : data?.rows.map((row) => <WalletRow key={row.id} row={row} href={walletHref(row.id, { returnTo: listContext })} />)}
              </tbody>
            </table>
          )}

          {!listError && data && !loading && data.rows.length === 0 ? (
            <div className={core.feedback} data-list-empty>
              {filtersActive ? (
                <>
                  <EmptyState icon={SearchX} title="Nenhuma wallet encontrada" description="O Control Plane não encontrou wallets para esta busca." />
                  <OutlineButton onClick={clearFilters}>Limpar busca</OutlineButton>
                </>
              ) : (
                <EmptyState icon={WalletIcon} title="Nenhuma wallet registrada" description="O Control Plane não retornou wallets." />
              )}
            </div>
          ) : null}
        </div>

        {listError ? null : (
          <div className={shared.footer}>
            <p className={shared.range} aria-live="polite">
              {data && !loading ? rangeText(data, 'wallet', 'wallets', 'Nenhuma wallet') : 'Carregando wallets…'}
              <span className={core.dataNote}> · Dados do Control Plane</span>
            </p>
            <ServerPagination label="Paginação de wallets" current={route.page} last={(data ?? list.lastData)?.lastPage ?? 1} disabled={loading} onChange={(next) => navigate({ page: next })} />
          </div>
        )}
      </section>
    </>
  )
}

function WalletRow({ row, href }: { row: WalletRecord; href: string }) {
  const name = row.name ?? `Whitelabel #${row.whitelabelId}`
  return (
    <tr className={fin.row} data-wallet={row.id}>
      <td className={styles.colId}>
        <span className={shared.cellMain}>
          <span className={styles.contextMark} aria-hidden="true">
            <WalletIcon size={15} strokeWidth={1.8} />
          </span>
          <span className={shared.cellText}>
            <a href={href} className={shared.rowLink}>
              {name}
            </a>
            <span className={shared.rowId}>
              Wallet {row.id}
              {row.slug ? ` · ${row.slug}` : ''}
            </span>
            <span className={styles.metaContext}>BRL · Whitelabel #{row.whitelabelId}</span>
            <span className={styles.metaUpdated}>
              Saldo consultado em {dateText(row.balanceTimestamp)} · Criada em {dateText(row.createdAt)}
            </span>
            <span className={styles.metaStates}>
              <span className={styles.metaAmount}>
                <Money cents={row.authoritativeBalanceCents} unavailable={BALANCE_UNAVAILABLE} />
              </span>
            </span>
          </span>
        </span>
      </td>
      <td className={styles.colWl}>
        <a href={whitelabelRecordHref(row.whitelabelId)} className={shared.inlineLink}>
          Whitelabel #{row.whitelabelId}
        </a>
      </td>
      <td className={styles.colCurrency}>{row.currency}</td>
      <td className={styles.colBalance}>
        <Money cents={row.authoritativeBalanceCents} unavailable={BALANCE_UNAVAILABLE} />
      </td>
      <td className={styles.colBalanceAt}>
        <DateStack iso={row.balanceTimestamp} />
      </td>
      <td className={styles.colCreated}>
        <DateStack iso={row.createdAt} />
      </td>
      <td className={shared.colActions}>
        <a href={href} className={`${fin.iconButton} ${shared.actionLink}`} aria-label={`Abrir wallet de ${name}`} data-open-record={row.id}>
          <Eye size={15} strokeWidth={1.8} aria-hidden="true" />
        </a>
      </td>
    </tr>
  )
}
