import { useMemo, useState, type CSSProperties } from 'react'
import { ChartColumn, Clock, Eye, FilterX, Flag, Play, Search } from 'lucide-react'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import fin from '../../finance-gateways/sections/FinanceSections.module.css'
import { MODALITY_CATALOG } from '../../finance-modalities/modalitiesModel'
import { useOpportunities } from '../../operation/opportunities/opportunityStore'
import { ModalityChip } from '../../operation/opportunities/OpportunityParts'
import { NoResults, PageIntro, Pagination, SortButton, SummaryCards, WhitelabelTag } from '../../operation/shared/OperationUi'
import {
  PAGE_SIZE,
  compareDate,
  compareText,
  normalize,
  whitelabelName,
  type SortState,
} from '../../operation/shared/operationModel'
import shared from '../../operation/shared/Operation.module.css'
import core from '../shared/FinanceCore.module.css'
import { PROTOTYPE_WHITELABELS } from '../../whitelabels/prototypeWhitelabels'
import {
  INVESTMENT_STATUSES,
  INVESTMENT_STATUS_META,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_META,
  formatMoney,
  investmentHref,
  type InvestmentStatus,
  type PaymentStatus,
} from '../shared/financeCoreModel'
import { INVESTMENTS, paymentById, walletById, walletRelations } from '../shared/financeCoreRecords'
import { dateText, investorName } from '../shared/financeCoreRefs'
import {
  ContextChip,
  DateStack,
  FinanceCoreShell,
  SortSelect,
  type SortOption,
  InvestmentStatusPill,
  InvestorRef,
  Money,
  OpportunityRef,
  PaymentStatusPill,
} from '../shared/FinanceCoreUi'
import styles from './Investments.module.css'

type SortKey = 'investor' | 'opportunity' | 'amount' | 'status' | 'updatedAt'
type PaymentFilter = 'all' | 'none' | PaymentStatus

const STATUS_ORDER = Object.fromEntries(INVESTMENT_STATUSES.map((status, index) => [status, index])) as Record<InvestmentStatus, number>


const SORT_OPTIONS: SortOption<SortKey>[] = [
  { key: 'investor', label: 'Investidor', ascending: 'A–Z', descending: 'Z–A' },
  { key: 'opportunity', label: 'Oportunidade', ascending: 'A–Z', descending: 'Z–A' },
  { key: 'amount', label: 'Valor', ascending: 'menor primeiro', descending: 'maior primeiro' },
  { key: 'status', label: 'Status', ascending: 'Pendente → Encerrado', descending: 'Encerrado → Pendente' },
  { key: 'updatedAt', label: 'Atualizado em', ascending: 'mais antigo', descending: 'mais recente' },
]

/**
 * `#/finance/investments` — Investimentos V1: global, READ-ONLY financial
 * supervision. Search, filters, sort, local pagination and "Abrir". No create,
 * edit, status change, cancel, confirm, settle, refund or bulk action.
 * Optional context from other modules: `?investidor=` (Operação ›
 * Investidores) and `?wallet=` (investments a wallet's movements reference).
 */
export function InvestmentsPage({ investorId, walletId }: { investorId?: string; walletId?: string }) {
  const opportunities = useOpportunities()
  const [query, setQuery] = useState('')
  const [whitelabel, setWhitelabel] = useState('all')
  const [status, setStatus] = useState<'all' | InvestmentStatus>('all')
  const [modality, setModality] = useState('all')
  const [payment, setPayment] = useState<PaymentFilter>('all')
  const [investor, setInvestor] = useState(investorId ?? '')
  const [wallet, setWallet] = useState(walletId ?? '')
  const [sort, setSort] = useState<SortState<SortKey>>({ key: 'updatedAt', direction: 'descending' })
  const [page, setPage] = useState(1)

  // A new route context (e.g. another investor's "Ver investimentos") replaces the local one.
  const [routeContext, setRouteContext] = useState(`${investorId ?? ''}|${walletId ?? ''}`)
  if (routeContext !== `${investorId ?? ''}|${walletId ?? ''}`) {
    setRouteContext(`${investorId ?? ''}|${walletId ?? ''}`)
    setInvestor(investorId ?? '')
    setWallet(walletId ?? '')
    setPage(1)
  }

  const opportunityName = (id: string) => opportunities.find((item) => item.id === id)?.name
  const walletInvestmentIds = useMemo(
    () => (wallet ? new Set(walletRelations(wallet).investments.map((item) => item.investmentId)) : null),
    [wallet],
  )

  const filtered = useMemo(() => {
    const needle = normalize(query)
    const nameOf = (id: string) => opportunities.find((item) => item.id === id)?.name ?? ''
    const rows = INVESTMENTS.filter((item) => {
      if (whitelabel !== 'all' && item.whitelabelId !== whitelabel) return false
      if (status !== 'all' && item.status !== status) return false
      if (modality !== 'all' && item.modality !== modality) return false
      if (payment !== 'all') {
        const related = paymentById(item.paymentId)
        if (payment === 'none' ? Boolean(item.paymentId) : related?.status !== payment) return false
      }
      if (investor && item.investorId !== investor) return false
      if (walletInvestmentIds && !walletInvestmentIds.has(item.investmentId)) return false
      return (
        !needle ||
        normalize(
          `${item.investmentId} ${item.investorId} ${investorName(item.investorId) ?? ''} ${item.opportunityId} ${nameOf(item.opportunityId)}`,
        ).includes(needle)
      )
    })
    const direction = sort.direction === 'ascending' ? 1 : -1
    return [...rows].sort((a, b) => {
      if (sort.key === 'updatedAt') {
        if (!a.updatedAt || !b.updatedAt) return compareDate(a.updatedAt ?? null, b.updatedAt ?? null)
        return direction * compareDate(a.updatedAt, b.updatedAt)
      }
      const value =
        sort.key === 'investor'
          ? compareText(investorName(a.investorId) ?? a.investorId, investorName(b.investorId) ?? b.investorId)
          : sort.key === 'opportunity'
            ? compareText(nameOf(a.opportunityId) || a.opportunityId, nameOf(b.opportunityId) || b.opportunityId)
            : sort.key === 'amount'
              ? a.amount - b.amount
              : STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      return direction * (value || compareText(a.investmentId, b.investmentId))
    })
  }, [opportunities, query, whitelabel, status, modality, payment, investor, walletInvestmentIds, sort])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pageCount)
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)
  const filtersActive =
    Boolean(query.trim()) || [whitelabel, status, modality, payment].some((value) => value !== 'all') || Boolean(investor || wallet)

  const count = (key: InvestmentStatus) => INVESTMENTS.filter((item) => item.status === key).length

  function update<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value)
      setPage(1)
    }
  }

  function syncRouteContext(nextInvestor: string, nextWallet: string) {
    // Removing either chip must also remove its URL parameter, even when the other remains.
    const params = new URLSearchParams()
    if (nextInvestor) params.set('investidor', nextInvestor)
    if (nextWallet) params.set('wallet', nextWallet)
    const search = params.toString()
    window.location.hash = `#/finance/investments${search ? `?${search}` : ''}`
  }

  function removeInvestor() {
    setInvestor('')
    setPage(1)
    syncRouteContext('', wallet)
  }

  function removeWallet() {
    setWallet('')
    setPage(1)
    syncRouteContext(investor, '')
  }

  function clearFilters() {
    setQuery('')
    setWhitelabel('all')
    setStatus('all')
    setModality('all')
    setPayment('all')
    setInvestor('')
    setWallet('')
    setPage(1)
    if (investorId !== undefined || walletId !== undefined) syncRouteContext('', '')
  }

  function toggleSort(key: SortKey) {
    setPage(1)
    setSort((currentSort) =>
      currentSort.key !== key
        ? { key, direction: key === 'updatedAt' || key === 'amount' ? 'descending' : 'ascending' }
        : { key, direction: currentSort.direction === 'ascending' ? 'descending' : 'ascending' },
    )
  }

  const sortHeader = (key: SortKey, label: string) => (
    <SortButton label={label} sorted={sort.key === key} direction={sort.direction} onClick={() => toggleSort(key)} />
  )
  const ariaSort = (key: SortKey) => (sort.key === key ? sort.direction : undefined)

  return (
    <FinanceCoreShell section="investments" title="Investimentos">
      <PageIntro text="Acompanhe investimentos de todos os Whitelabels em uma só visão financeira. Somente leitura: nenhuma ação altera investimento, pagamento ou wallet." />

      <SummaryCards
        title="Resumo dos investimentos"
        note="Contagens de registros do protótipo (todos os Whitelabels) — não são dados de produção nem volumes financeiros."
        cards={[
          { label: 'Total de investimentos', value: INVESTMENTS.length, detail: 'Todos os Whitelabels', icon: ChartColumn, tone: 'blue' },
          { label: 'Ativos', value: count('active'), detail: 'Estado do protótipo', icon: Play, tone: 'teal' },
          { label: 'Pendentes', value: count('pending'), detail: 'Estado do protótipo', icon: Clock, tone: 'amber' },
          { label: 'Encerrados', value: count('closed'), detail: 'Estado do protótipo', icon: Flag, tone: 'violet' },
        ]}
      />

      <section className={`${fin.card} ${shared.listCard}`} aria-labelledby="inv-list-title">
        <h2 id="inv-list-title" className="visually-hidden">
          Lista de investimentos
        </h2>
        <div className={`${shared.filters} ${core.filtersWide}`} style={{ '--filter-count': 4 } as CSSProperties}>
          <label className={fin.search}>
            <Search size={16} strokeWidth={1.8} aria-hidden="true" />
            <span className="visually-hidden">Buscar por ID, investidor ou oportunidade</span>
            <input
              type="search"
              value={query}
              placeholder="Buscar por ID, investidor ou oportunidade…"
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
              <span className="visually-hidden">Filtrar por status do investimento</span>
              <select value={status} onChange={(event) => update(setStatus)(event.target.value as 'all' | InvestmentStatus)}>
                <option value="all">Todos os status</option>
                {INVESTMENT_STATUSES.map((key) => (
                  <option key={key} value={key}>
                    {INVESTMENT_STATUS_META[key].label}
                  </option>
                ))}
              </select>
            </label>
            <label className={fin.filter}>
              <span className="visually-hidden">Filtrar por modalidade</span>
              <select value={modality} onChange={(event) => update(setModality)(event.target.value)}>
                <option value="all">Todas as modalidades</option>
                {MODALITY_CATALOG.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={fin.filter}>
              <span className="visually-hidden">Filtrar por pagamento relacionado</span>
              <select value={payment} onChange={(event) => update(setPayment)(event.target.value as PaymentFilter)}>
                <option value="all">Todos os pagamentos</option>
                <option value="none">Sem pagamento vinculado</option>
                {PAYMENT_STATUSES.map((key) => (
                  <option key={key} value={key}>
                    Pagamento: {PAYMENT_STATUS_META[key].label.toLowerCase()}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <OutlineButton className={shared.clearButton} onClick={clearFilters} disabled={!filtersActive}>
            <FilterX size={15} strokeWidth={1.8} aria-hidden="true" />
            Limpar filtros
          </OutlineButton>
        </div>

        {investor ? (
          <ContextChip
            dataName="investor"
            label={`Investidor: ${investorName(investor) ?? investor}`}
            removeLabel={`Remover filtro do investidor ${investorName(investor) ?? investor}`}
            onRemove={removeInvestor}
          />
        ) : null}
        {wallet ? (
          <ContextChip
            dataName="wallet"
            label={`Wallet: ${wallet}${walletById(wallet) ? '' : ' (não encontrada)'}`}
            removeLabel={`Remover filtro da wallet ${wallet}`}
            onRemove={removeWallet}
          />
        ) : null}

        <SortSelect className={styles.sortVisible} options={SORT_OPTIONS} sort={sort} onChange={(next) => {
          setSort(next)
          setPage(1)
        }} />

        <div className={fin.tableArea}>
          <table className={`${fin.table} ${shared.table} ${styles.table}`}>
            <caption className="visually-hidden">Investimentos de todos os Whitelabels (protótipo, somente leitura)</caption>
            <thead>
              <tr>
                <th scope="col" className={styles.colId}>
                  Investimento
                </th>
                <th scope="col" className={styles.colInvestor} aria-sort={ariaSort('investor')}>
                  {sortHeader('investor', 'Investidor')}
                </th>
                <th scope="col" className={styles.colOpportunity} aria-sort={ariaSort('opportunity')}>
                  {sortHeader('opportunity', 'Oportunidade')}
                </th>
                <th scope="col" className={styles.colWl}>
                  Whitelabel
                </th>
                <th scope="col" className={styles.colMod}>
                  Modalidade
                </th>
                <th scope="col" className={styles.colAmount} aria-sort={ariaSort('amount')}>
                  {sortHeader('amount', 'Valor')}
                </th>
                <th scope="col" className={styles.colStatus} aria-sort={ariaSort('status')}>
                  {sortHeader('status', 'Status')}
                </th>
                <th scope="col" className={styles.colPayment}>
                  Pagamento
                </th>
                <th scope="col" className={styles.colUpdated} aria-sort={ariaSort('updatedAt')}>
                  {sortHeader('updatedAt', 'Atualizado em')}
                </th>
                <th scope="col" className={shared.colActions}>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => {
                const href = investmentHref(item.investmentId)
                const related = paymentById(item.paymentId)
                const oppName = opportunityName(item.opportunityId)
                const paymentCell = related ? (
                  <PaymentStatusPill status={related.status} />
                ) : (
                  <span className={shared.muted}>{item.paymentId ? 'Pagamento não encontrado' : 'Sem pagamento'}</span>
                )
                return (
                  <tr key={item.investmentId} className={fin.row} data-investment={item.investmentId}>
                    <td className={styles.colId}>
                      <span className={shared.cellText}>
                        <a href={href} className={shared.rowLink}>
                          {item.investmentId}
                        </a>
                        <span className={styles.metaParties}>
                          {investorName(item.investorId) ?? item.investorId} · {oppName ?? item.opportunityId}
                        </span>
                        <span className={styles.metaWl}>{whitelabelName(item.whitelabelId)}</span>
                        <span className={styles.metaMod}>Modalidade: {MODALITY_CATALOG.find((m) => m.id === item.modality)?.name}</span>
                        <span className={styles.metaPayment}>
                          Pagamento: {related ? `${related.paymentId} · ${PAYMENT_STATUS_META[related.status].label}` : 'sem pagamento'}
                        </span>
                        <span className={styles.metaUpdated}>Atualizado em {dateText(item.updatedAt)}</span>
                        <span className={styles.metaStates}>
                          <span className={styles.metaAmount}>{formatMoney(item.amount, item.currency)}</span>
                          <InvestmentStatusPill status={item.status} />
                        </span>
                      </span>
                    </td>
                    <td className={styles.colInvestor}>
                      <InvestorRef investorId={item.investorId} />
                    </td>
                    <td className={styles.colOpportunity}>
                      <OpportunityRef opportunityId={item.opportunityId} name={oppName} />
                    </td>
                    <td className={styles.colWl}>
                      <WhitelabelTag whitelabelId={item.whitelabelId} />
                    </td>
                    <td className={styles.colMod}>
                      <ModalityChip modality={item.modality} />
                    </td>
                    <td className={styles.colAmount}>
                      <Money amount={item.amount} currency={item.currency} />
                    </td>
                    <td className={styles.colStatus}>
                      <InvestmentStatusPill status={item.status} />
                    </td>
                    <td className={styles.colPayment}>{paymentCell}</td>
                    <td className={styles.colUpdated}>
                      <DateStack iso={item.updatedAt} />
                    </td>
                    <td className={shared.colActions}>
                      <a
                        href={href}
                        className={`${fin.iconButton} ${shared.actionLink}`}
                        aria-label={`Abrir investimento ${item.investmentId}`}
                        data-open-record={item.investmentId}
                      >
                        <Eye size={15} strokeWidth={1.8} aria-hidden="true" />
                      </a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {rows.length === 0 ? <NoResults title="Nenhum investimento encontrado" description="Ajuste a busca, os filtros ou o contexto." /> : null}
        </div>

        <div className={shared.footer}>
          <p className={shared.range} aria-live="polite">
            {filtered.length
              ? `Mostrando ${(current - 1) * PAGE_SIZE + 1}–${Math.min(current * PAGE_SIZE, filtered.length)} de ${filtered.length} ${
                  filtered.length === 1 ? 'investimento' : 'investimentos'
                }`
              : 'Nenhum investimento'}
            {filtersActive ? ` (filtrados de ${INVESTMENTS.length})` : ''}
          </p>
          <Pagination label="Paginação de investimentos" page={current} pageCount={pageCount} onPage={setPage} />
        </div>
      </section>
    </FinanceCoreShell>
  )
}
