import { useMemo, useState, type CSSProperties } from 'react'
import { ChartColumn, CircleCheck, Clock, Eye, FilterX, Play, Search } from 'lucide-react'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import fin from '../../finance-gateways/sections/FinanceSections.module.css'
import { useOpportunities } from '../../operation/opportunities/opportunityStore'
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
import { PROTOTYPE_WHITELABELS } from '../../whitelabels/prototypeWhitelabels'
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_META,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_META,
  formatMoney,
  paymentHref,
  type PaymentMethod,
  type PaymentStatus,
} from '../shared/financeCoreModel'
import { PAYMENTS, walletById, walletRelations } from '../shared/financeCoreRecords'
import { dateText, gatewayFilterLabel, investorName, useGatewayResolver } from '../shared/financeCoreRefs'
import {
  ContextChip,
  DateStack,
  FinanceCoreShell,
  SortSelect,
  type SortOption,
  GatewayTag,
  InvestorRef,
  MethodTag,
  Money,
  OpportunityRef,
  PaymentStatusPill,
} from '../shared/FinanceCoreUi'
import styles from './Payments.module.css'

type SortKey = 'id' | 'amount' | 'status' | 'gateway' | 'updatedAt'
type InvestmentFilter = 'all' | 'with' | 'without'

const STATUS_ORDER = Object.fromEntries(PAYMENT_STATUSES.map((status, index) => [status, index])) as Record<PaymentStatus, number>


const SORT_OPTIONS: SortOption<SortKey>[] = [
  { key: 'id', label: 'Pagamento', ascending: 'crescente', descending: 'decrescente' },
  { key: 'amount', label: 'Valor', ascending: 'menor primeiro', descending: 'maior primeiro' },
  { key: 'status', label: 'Status', ascending: 'Pendente → Falhou', descending: 'Falhou → Pendente' },
  { key: 'gateway', label: 'Gateway', ascending: 'A–Z', descending: 'Z–A' },
  { key: 'updatedAt', label: 'Atualizado em', ascending: 'mais antigo', descending: 'mais recente' },
]

/**
 * `#/finance/payments` — Pagamentos / PIX V1: global, READ-ONLY supervision
 * of payment records. No charge creation, PIX generation, confirmation,
 * settlement, cancellation, refund, reversal, reprocessing or wallet credit.
 * Optional context: `?wallet=` (payments a wallet's movements reference).
 */
export function PaymentsPage({ walletId }: { walletId?: string }) {
  const opportunities = useOpportunities()
  const resolveGateway = useGatewayResolver()
  const [query, setQuery] = useState('')
  const [whitelabel, setWhitelabel] = useState('all')
  const [status, setStatus] = useState<'all' | PaymentStatus>('all')
  const [method, setMethod] = useState<'all' | PaymentMethod>('all')
  const [gateway, setGateway] = useState('all')
  const [investment, setInvestment] = useState<InvestmentFilter>('all')
  const [wallet, setWallet] = useState(walletId ?? '')
  const [sort, setSort] = useState<SortState<SortKey>>({ key: 'updatedAt', direction: 'descending' })
  const [page, setPage] = useState(1)

  const [routeWallet, setRouteWallet] = useState(walletId)
  if (routeWallet !== walletId) {
    setRouteWallet(walletId)
    setWallet(walletId ?? '')
    setPage(1)
  }

  const opportunityName = (id: string | undefined) => (id ? opportunities.find((item) => item.id === id)?.name : undefined)
  const gatewayIds = [...new Set(PAYMENTS.map((item) => item.gatewayId))]
  const walletPaymentIds = useMemo(
    () => (wallet ? new Set(walletRelations(wallet).payments.map((item) => item.paymentId)) : null),
    [wallet],
  )

  const filtered = useMemo(() => {
    const needle = normalize(query)
    const nameOf = (id: string | undefined) => (id ? opportunities.find((item) => item.id === id)?.name ?? '' : '')
    const gatewayName = (id: string) => resolveGateway(id)?.name ?? id
    const rows = PAYMENTS.filter((item) => {
      if (whitelabel !== 'all' && item.whitelabelId !== whitelabel) return false
      if (status !== 'all' && item.status !== status) return false
      if (method !== 'all' && item.method !== method) return false
      if (gateway !== 'all' && item.gatewayId !== gateway) return false
      if (investment !== 'all' && Boolean(item.investmentId) !== (investment === 'with')) return false
      if (walletPaymentIds && !walletPaymentIds.has(item.paymentId)) return false
      return (
        !needle ||
        normalize(
          [
            item.paymentId,
            item.investmentId ?? '',
            item.investorId ?? '',
            investorName(item.investorId) ?? '',
            item.opportunityId ?? '',
            nameOf(item.opportunityId),
          ].join(' '),
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
        sort.key === 'id'
          ? compareText(a.paymentId, b.paymentId)
          : sort.key === 'amount'
            ? a.amount - b.amount
            : sort.key === 'gateway'
              ? compareText(gatewayName(a.gatewayId), gatewayName(b.gatewayId))
              : STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      return direction * (value || compareText(a.paymentId, b.paymentId))
    })
  }, [opportunities, resolveGateway, query, whitelabel, status, method, gateway, investment, walletPaymentIds, sort])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pageCount)
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)
  const filtersActive =
    Boolean(query.trim()) || [whitelabel, status, method, gateway, investment].some((value) => value !== 'all') || Boolean(wallet)

  const count = (key: PaymentStatus) => PAYMENTS.filter((item) => item.status === key).length

  function update<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value)
      setPage(1)
    }
  }

  function removeWallet() {
    setWallet('')
    setPage(1)
    if (walletId !== undefined) window.location.hash = '#/finance/payments'
  }

  function clearFilters() {
    setQuery('')
    setWhitelabel('all')
    setStatus('all')
    setMethod('all')
    setGateway('all')
    setInvestment('all')
    removeWallet()
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
    <FinanceCoreShell section="payments" title="Pagamentos / PIX">
      <PageIntro text="Acompanhe pagamentos de todos os Whitelabels em uma só visão financeira. Somente leitura: nenhuma cobrança, PIX, confirmação, liquidação ou estorno é feito aqui." />

      <SummaryCards
        title="Resumo dos pagamentos"
        note="Contagens de registros do protótipo (todos os Whitelabels) — não são dados de produção nem totais financeiros."
        cards={[
          { label: 'Total de pagamentos', value: PAYMENTS.length, detail: `${count('failed')} com falha`, icon: ChartColumn, tone: 'blue' },
          { label: 'Pendentes', value: count('pending'), detail: 'Estado do protótipo', icon: Clock, tone: 'amber' },
          { label: 'Em processamento', value: count('processing'), detail: 'Estado do protótipo', icon: Play, tone: 'teal' },
          { label: 'Pagos', value: count('paid'), detail: 'Estado do protótipo', icon: CircleCheck, tone: 'violet' },
        ]}
      />

      <section className={`${fin.card} ${shared.listCard}`} aria-labelledby="pay-list-title">
        <h2 id="pay-list-title" className="visually-hidden">
          Lista de pagamentos
        </h2>
        <div className={shared.filters} style={{ '--filter-count': 5 } as CSSProperties}>
          <label className={fin.search}>
            <Search size={16} strokeWidth={1.8} aria-hidden="true" />
            <span className="visually-hidden">Buscar por ID, investimento, investidor ou oportunidade</span>
            <input
              type="search"
              value={query}
              placeholder="Buscar por ID, investimento, investidor ou oportunidade…"
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
              <span className="visually-hidden">Filtrar por status do pagamento</span>
              <select value={status} onChange={(event) => update(setStatus)(event.target.value as 'all' | PaymentStatus)}>
                <option value="all">Todos os status</option>
                {PAYMENT_STATUSES.map((key) => (
                  <option key={key} value={key}>
                    {PAYMENT_STATUS_META[key].label}
                  </option>
                ))}
              </select>
            </label>
            <label className={fin.filter}>
              <span className="visually-hidden">Filtrar por método</span>
              <select value={method} onChange={(event) => update(setMethod)(event.target.value as 'all' | PaymentMethod)}>
                <option value="all">Todos os métodos</option>
                {PAYMENT_METHODS.map((key) => (
                  <option key={key} value={key}>
                    Método: {PAYMENT_METHOD_META[key].label}
                  </option>
                ))}
              </select>
            </label>
            <label className={fin.filter}>
              <span className="visually-hidden">Filtrar por gateway</span>
              <select value={gateway} onChange={(event) => update(setGateway)(event.target.value)}>
                <option value="all">Todos os gateways</option>
                {gatewayIds.map((id) => (
                  <option key={id} value={id}>
                    {gatewayFilterLabel(resolveGateway(id), id)}
                  </option>
                ))}
              </select>
            </label>
            <label className={fin.filter}>
              <span className="visually-hidden">Filtrar por vínculo com investimento</span>
              <select value={investment} onChange={(event) => update(setInvestment)(event.target.value as InvestmentFilter)}>
                <option value="all">Com e sem investimento</option>
                <option value="with">Com investimento</option>
                <option value="without">Sem investimento</option>
              </select>
            </label>
          </div>
          <OutlineButton className={shared.clearButton} onClick={clearFilters} disabled={!filtersActive}>
            <FilterX size={15} strokeWidth={1.8} aria-hidden="true" />
            Limpar filtros
          </OutlineButton>
        </div>

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
            <caption className="visually-hidden">Pagamentos de todos os Whitelabels (protótipo, somente leitura)</caption>
            <thead>
              <tr>
                <th scope="col" className={styles.colId} aria-sort={ariaSort('id')}>
                  {sortHeader('id', 'Pagamento')}
                </th>
                <th scope="col" className={styles.colInvestment}>
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
                <th scope="col" className={styles.colMethod}>
                  Método
                </th>
                <th scope="col" className={styles.colGateway} aria-sort={ariaSort('gateway')}>
                  {sortHeader('gateway', 'Gateway')}
                </th>
                <th scope="col" className={styles.colAmount} aria-sort={ariaSort('amount')}>
                  {sortHeader('amount', 'Valor')}
                </th>
                <th scope="col" className={styles.colStatus} aria-sort={ariaSort('status')}>
                  {sortHeader('status', 'Status')}
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
                const href = paymentHref(item.paymentId)
                const resolved = resolveGateway(item.gatewayId)
                const oppName = opportunityName(item.opportunityId)
                return (
                  <tr key={item.paymentId} className={fin.row} data-payment={item.paymentId}>
                    <td className={styles.colId}>
                      <span className={shared.cellText}>
                        <a href={href} className={shared.rowLink}>
                          {item.paymentId}
                        </a>
                        <span className={styles.metaRelations}>
                          Investimento: {item.investmentId ?? '—'} · {investorName(item.investorId) ?? 'sem investidor'}
                        </span>
                        <span className={styles.metaOpportunity}>
                          {PAYMENT_METHOD_META[item.method].label} · Oportunidade: {oppName ?? (item.opportunityId ? item.opportunityId : '—')}
                        </span>
                        <span className={styles.metaContext}>
                          {whitelabelName(item.whitelabelId)} · {resolved?.name ?? item.gatewayId}
                        </span>
                        <span className={styles.metaUpdated}>Atualizado em {dateText(item.updatedAt)}</span>
                        <span className={styles.metaStates}>
                          <span className={styles.metaAmount}>{formatMoney(item.amount, item.currency)}</span>
                          <PaymentStatusPill status={item.status} />
                        </span>
                      </span>
                    </td>
                    <td className={styles.colInvestment}>
                      {item.investmentId ?? <span className={shared.muted}>—</span>}
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
                    <td className={styles.colMethod}>
                      <MethodTag method={item.method} />
                    </td>
                    <td className={styles.colGateway}>
                      <GatewayTag gateway={resolved} gatewayId={item.gatewayId} />
                    </td>
                    <td className={styles.colAmount}>
                      <Money amount={item.amount} currency={item.currency} />
                    </td>
                    <td className={styles.colStatus}>
                      <PaymentStatusPill status={item.status} />
                    </td>
                    <td className={styles.colUpdated}>
                      <DateStack iso={item.updatedAt} />
                    </td>
                    <td className={shared.colActions}>
                      <a
                        href={href}
                        className={`${fin.iconButton} ${shared.actionLink}`}
                        aria-label={`Abrir pagamento ${item.paymentId}`}
                        data-open-record={item.paymentId}
                      >
                        <Eye size={15} strokeWidth={1.8} aria-hidden="true" />
                      </a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {rows.length === 0 ? <NoResults title="Nenhum pagamento encontrado" description="Ajuste a busca, os filtros ou o contexto." /> : null}
        </div>

        <div className={shared.footer}>
          <p className={shared.range} aria-live="polite">
            {filtered.length
              ? `Mostrando ${(current - 1) * PAGE_SIZE + 1}–${Math.min(current * PAGE_SIZE, filtered.length)} de ${filtered.length} ${
                  filtered.length === 1 ? 'pagamento' : 'pagamentos'
                }`
              : 'Nenhum pagamento'}
            {filtersActive ? ` (filtrados de ${PAYMENTS.length})` : ''}
          </p>
          <Pagination label="Paginação de pagamentos" page={current} pageCount={pageCount} onPage={setPage} />
        </div>
      </section>
    </FinanceCoreShell>
  )
}
