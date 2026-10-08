import { useMemo, useState, type CSSProperties } from 'react'
import { ArrowLeftRight, Building2, Eye, FilterX, Lock, Play, Search, Wallet as WalletIcon } from 'lucide-react'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import fin from '../../finance-gateways/sections/FinanceSections.module.css'
import { AccountAvatar } from '../../whitelabel-accounts/AccountBadges'
import { NoResults, PageIntro, Pagination, SortButton, SummaryCards, WhitelabelTag } from '../../operation/shared/OperationUi'
import {
  PAGE_SIZE,
  compareDate,
  compareText,
  countLabel,
  initials,
  normalize,
  whitelabelName,
  type SortState,
} from '../../operation/shared/operationModel'
import shared from '../../operation/shared/Operation.module.css'
import core from '../shared/FinanceCore.module.css'
import { PROTOTYPE_WHITELABELS } from '../../whitelabels/prototypeWhitelabels'
import {
  CURRENCY_LABEL,
  WALLET_STATUSES,
  WALLET_STATUS_META,
  formatMoney,
  walletHref,
  type Currency,
  type WalletStatus,
} from '../shared/financeCoreModel'
import { WALLETS, movementsOfWallet } from '../shared/financeCoreRecords'
import { dateText, ownerLabel } from '../shared/financeCoreRefs'
import { DateStack, FinanceCoreShell, Money, SortSelect, WalletStatusPill, type SortOption } from '../shared/FinanceCoreUi'
import styles from './Wallets.module.css'

type SortKey = 'wallet' | 'owner' | 'balance' | 'status' | 'updatedAt'
type MovementFilter = 'all' | 'with' | 'without'

const STATUS_ORDER = Object.fromEntries(WALLET_STATUSES.map((status, index) => [status, index])) as Record<WalletStatus, number>
const CURRENCIES = [...new Set(WALLETS.map((item) => item.currency))] as Currency[]


const SORT_OPTIONS: SortOption<SortKey>[] = [
  { key: 'wallet', label: 'Wallet', ascending: 'crescente', descending: 'decrescente' },
  { key: 'owner', label: 'Titular / contexto', ascending: 'A–Z', descending: 'Z–A' },
  { key: 'balance', label: 'Saldo representado', ascending: 'menor primeiro', descending: 'maior primeiro' },
  { key: 'status', label: 'Status', ascending: 'Ativa → Bloqueada', descending: 'Bloqueada → Ativa' },
  { key: 'updatedAt', label: 'Atualizada em', ascending: 'mais antiga', descending: 'mais recente' },
]

/**
 * `#/finance/wallets` — Wallet V1: global, READ-ONLY supervision of wallets
 * and their "Saldo representado" (a prototype representation, never a
 * withdrawable or settled value). No create, balance adjustment, credit /
 * debit, transfer, cashout, deposit, block / unblock or delete.
 */
export function WalletsPage() {
  const [query, setQuery] = useState('')
  const [whitelabel, setWhitelabel] = useState('all')
  const [status, setStatus] = useState<'all' | WalletStatus>('all')
  const [currency, setCurrency] = useState<'all' | Currency>('all')
  const [movements, setMovements] = useState<MovementFilter>('all')
  const [sort, setSort] = useState<SortState<SortKey>>({ key: 'updatedAt', direction: 'descending' })
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const needle = normalize(query)
    const rows = WALLETS.filter((item) => {
      const own = movementsOfWallet(item.walletId)
      if (whitelabel !== 'all' && item.whitelabelId !== whitelabel) return false
      if (status !== 'all' && item.status !== status) return false
      if (currency !== 'all' && item.currency !== currency) return false
      if (movements !== 'all' && own.length > 0 !== (movements === 'with')) return false
      const owner = ownerLabel(item.ownerReference)
      const references = own.flatMap((movement) => [movement.movementId, movement.sourceId ?? ''])
      return !needle || normalize([item.walletId, owner.name, owner.reference, ...references].join(' ')).includes(needle)
    })
    const direction = sort.direction === 'ascending' ? 1 : -1
    return [...rows].sort((a, b) => {
      if (sort.key === 'updatedAt') {
        if (!a.updatedAt || !b.updatedAt) return compareDate(a.updatedAt ?? null, b.updatedAt ?? null)
        return direction * compareDate(a.updatedAt, b.updatedAt)
      }
      const value =
        sort.key === 'wallet'
          ? compareText(a.walletId, b.walletId)
          : sort.key === 'owner'
            ? compareText(ownerLabel(a.ownerReference).name, ownerLabel(b.ownerReference).name)
            : sort.key === 'balance'
              ? a.representedBalance - b.representedBalance
              : STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      return direction * (value || compareText(a.walletId, b.walletId))
    })
  }, [query, whitelabel, status, currency, movements, sort])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pageCount)
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)
  const filtersActive = Boolean(query.trim()) || [whitelabel, status, currency, movements].some((value) => value !== 'all')

  const count = (key: WalletStatus) => WALLETS.filter((item) => item.status === key).length
  const withMovements = WALLETS.filter((item) => movementsOfWallet(item.walletId).length > 0).length

  function update<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value)
      setPage(1)
    }
  }

  function clearFilters() {
    setQuery('')
    setWhitelabel('all')
    setStatus('all')
    setCurrency('all')
    setMovements('all')
    setPage(1)
  }

  function toggleSort(key: SortKey) {
    setPage(1)
    setSort((currentSort) =>
      currentSort.key !== key
        ? { key, direction: key === 'updatedAt' || key === 'balance' ? 'descending' : 'ascending' }
        : { key, direction: currentSort.direction === 'ascending' ? 'descending' : 'ascending' },
    )
  }

  const sortHeader = (key: SortKey, label: string) => (
    <SortButton label={label} sorted={sort.key === key} direction={sort.direction} onClick={() => toggleSort(key)} />
  )
  const ariaSort = (key: SortKey) => (sort.key === key ? sort.direction : undefined)

  return (
    <FinanceCoreShell section="wallets" title="Wallet">
      <PageIntro text="Acompanhe wallets de todos os Whitelabels em uma só visão financeira. O saldo exibido é uma representação do protótipo — não é valor sacável, transferível ou liquidado." />

      <SummaryCards
        title="Resumo das wallets"
        note="Contagens de registros do protótipo (todos os Whitelabels). Não há saldo global: cada saldo representado é um valor ilustrativo por wallet."
        cards={[
          { label: 'Total de Wallets', value: WALLETS.length, detail: 'Todos os Whitelabels', icon: WalletIcon, tone: 'blue' },
          { label: 'Ativas', value: count('active'), detail: 'Estado do protótipo', icon: Play, tone: 'teal' },
          { label: 'Bloqueadas', value: count('blocked'), detail: 'Estado do protótipo', icon: Lock, tone: 'plum' },
          { label: 'Com movimentações', value: withMovements, detail: `de ${WALLETS.length} wallets`, icon: ArrowLeftRight, tone: 'violet' },
        ]}
      />

      <section className={`${fin.card} ${shared.listCard}`} aria-labelledby="wal-list-title">
        <h2 id="wal-list-title" className="visually-hidden">
          Lista de wallets
        </h2>
        <div className={`${shared.filters} ${core.filtersWide}`} style={{ '--filter-count': 4, '--search-fr': '1.2fr' } as CSSProperties}>
          <label className={fin.search}>
            <Search size={16} strokeWidth={1.8} aria-hidden="true" />
            <span className="visually-hidden">Buscar por ID da wallet, titular ou referência relacionada</span>
            <input
              type="search"
              value={query}
              placeholder="Buscar wallet, titular ou referência…"
              onChange={(event) => update(setQuery)(event.target.value)}
            />
          </label>
          <div className={shared.filterSelects}>
            <label className={fin.filter}>
              <span className="visually-hidden">Filtrar por Whitelabel</span>
              <select value={whitelabel} onChange={(event) => update(setWhitelabel)(event.target.value)}>
                <option value="all">Todos os Whitelabels</option>
                {PROTOTYPE_WHITELABELS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={fin.filter}>
              <span className="visually-hidden">Filtrar por status da wallet</span>
              <select value={status} onChange={(event) => update(setStatus)(event.target.value as 'all' | WalletStatus)}>
                <option value="all">Todos os status</option>
                {WALLET_STATUSES.map((key) => (
                  <option key={key} value={key}>
                    {WALLET_STATUS_META[key].label}
                  </option>
                ))}
              </select>
            </label>
            <label className={fin.filter}>
              <span className="visually-hidden">Filtrar por moeda</span>
              <select value={currency} onChange={(event) => update(setCurrency)(event.target.value as 'all' | Currency)}>
                <option value="all">Todas as moedas</option>
                {CURRENCIES.map((key) => (
                  <option key={key} value={key}>
                    {CURRENCY_LABEL[key]}
                  </option>
                ))}
              </select>
            </label>
            <label className={fin.filter}>
              <span className="visually-hidden">Filtrar por movimentações</span>
              <select value={movements} onChange={(event) => update(setMovements)(event.target.value as MovementFilter)}>
                <option value="all">Com e sem movimentações</option>
                <option value="with">Com movimentações</option>
                <option value="without">Sem movimentações</option>
              </select>
            </label>
          </div>
          <OutlineButton className={shared.clearButton} onClick={clearFilters} disabled={!filtersActive}>
            <FilterX size={15} strokeWidth={1.8} aria-hidden="true" />
            Limpar filtros
          </OutlineButton>
        </div>

        <SortSelect className={styles.sortVisible} options={SORT_OPTIONS} sort={sort} onChange={(next) => {
          setSort(next)
          setPage(1)
        }} />

        <div className={fin.tableArea}>
          <table className={`${fin.table} ${shared.table} ${styles.table}`}>
            <caption className="visually-hidden">Wallets de todos os Whitelabels (protótipo, somente leitura)</caption>
            <thead>
              <tr>
                <th scope="col" className={styles.colId} aria-sort={ariaSort('wallet')}>
                  {sortHeader('wallet', 'Wallet')}
                </th>
                <th scope="col" className={styles.colOwner} aria-sort={ariaSort('owner')}>
                  {sortHeader('owner', 'Titular / contexto')}
                </th>
                <th scope="col" className={styles.colWl}>
                  Whitelabel
                </th>
                <th scope="col" className={styles.colCurrency}>
                  Moeda
                </th>
                <th scope="col" className={styles.colBalance} aria-sort={ariaSort('balance')}>
                  {sortHeader('balance', 'Saldo representado')}
                </th>
                <th scope="col" className={styles.colMovements}>
                  Movimentações
                </th>
                <th scope="col" className={styles.colStatus} aria-sort={ariaSort('status')}>
                  {sortHeader('status', 'Status')}
                </th>
                <th scope="col" className={styles.colUpdated} aria-sort={ariaSort('updatedAt')}>
                  {sortHeader('updatedAt', 'Atualizada em')}
                </th>
                <th scope="col" className={shared.colActions}>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => {
                const href = walletHref(item.walletId)
                const owner = ownerLabel(item.ownerReference)
                const total = movementsOfWallet(item.walletId).length
                const movementText = countLabel(total, 'mov.', 'mov.', '0 mov.')
                return (
                  <tr key={item.walletId} className={fin.row} data-wallet={item.walletId}>
                    <td className={styles.colId}>
                      <span className={shared.cellText}>
                        <a href={href} className={shared.rowLink}>
                          {item.walletId}
                        </a>
                        <span className={styles.metaOwner}>
                          {owner.name} · {movementText}
                        </span>
                        <span className={styles.metaContext}>
                          {whitelabelName(item.whitelabelId)} · {item.currency}
                        </span>
                        <span className={styles.metaUpdated}>Atualizada em {dateText(item.updatedAt)}</span>
                        <span className={styles.metaStates}>
                          <span className={styles.metaAmount}>Saldo representado: {formatMoney(item.representedBalance, item.currency)}</span>
                          <WalletStatusPill status={item.status} />
                        </span>
                      </span>
                    </td>
                    <td className={styles.colOwner}>
                      <span className={shared.cellMain}>
                        {item.ownerReference?.kind === 'investor' ? (
                          <AccountAvatar initials={initials(owner.name)} />
                        ) : (
                          <span className={styles.contextMark} aria-hidden="true">
                            <Building2 size={16} strokeWidth={1.7} />
                          </span>
                        )}
                        <span className={shared.cellText}>
                          <span className={styles.ownerName}>{owner.name}</span>
                          <span className={shared.rowId}>{owner.reference}</span>
                        </span>
                      </span>
                    </td>
                    <td className={styles.colWl}>
                      <WhitelabelTag whitelabelId={item.whitelabelId} />
                    </td>
                    <td className={styles.colCurrency}>{item.currency}</td>
                    <td className={styles.colBalance}>
                      <Money amount={item.representedBalance} currency={item.currency} />
                    </td>
                    <td className={styles.colMovements}>
                      <span className={shared.countTag} data-empty={total === 0 || undefined}>
                        {movementText}
                      </span>
                    </td>
                    <td className={styles.colStatus}>
                      <WalletStatusPill status={item.status} />
                    </td>
                    <td className={styles.colUpdated}>
                      <DateStack iso={item.updatedAt} />
                    </td>
                    <td className={shared.colActions}>
                      <a
                        href={href}
                        className={`${fin.iconButton} ${shared.actionLink}`}
                        aria-label={`Abrir wallet ${item.walletId}`}
                        data-open-record={item.walletId}
                      >
                        <Eye size={15} strokeWidth={1.8} aria-hidden="true" />
                      </a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {rows.length === 0 ? <NoResults title="Nenhuma wallet encontrada" description="Ajuste a busca ou os filtros." /> : null}
        </div>

        <div className={shared.footer}>
          <p className={shared.range} aria-live="polite">
            {filtered.length
              ? `Mostrando ${(current - 1) * PAGE_SIZE + 1}–${Math.min(current * PAGE_SIZE, filtered.length)} de ${filtered.length} ${
                  filtered.length === 1 ? 'wallet' : 'wallets'
                }`
              : 'Nenhuma wallet'}
            {filtersActive ? ` (filtradas de ${WALLETS.length})` : ''}
          </p>
          <Pagination label="Paginação de wallets" page={current} pageCount={pageCount} onPage={setPage} />
        </div>
      </section>
    </FinanceCoreShell>
  )
}
