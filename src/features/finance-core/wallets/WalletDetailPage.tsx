import { useEffect, useMemo, useRef, type KeyboardEvent } from 'react'
import { PROTOTYPE_PRESENTATION, readinessTabs } from '../../../app/presentationAvailability'
import { ArrowLeftRight, ChartColumn, Eye, Info, QrCode, SearchX, Building, X } from 'lucide-react'
import { replaceRouteKeepingScroll, useRestoreReplacedScroll } from '../../../app/routeQuery'
import { EmptyState } from '../../../components/ui/EmptyState'
import outline from '../../../components/ui/OutlineButton.module.css'
import { StatusPill } from '../../../components/ui/StatusPill'
import { Tabs } from '../../../components/ui/Tabs'
import fin from '../../finance-gateways/sections/FinanceSections.module.css'
import { BackLink, DomainNavCard, InfoNote, SessionActivityCard, type DomainNavItem } from '../../operation/shared/OperationUi'
import shared from '../../operation/shared/Operation.module.css'
import { addFinanceCoreActivity, useFinanceCoreActivity } from '../shared/financeCoreActivity'
import {
  INVESTMENT_STATUSES,
  MOVEMENT_CATEGORIES,
  type InvestmentStatus,
  type MovementCategory,
  type MovementKind,
  type MovementRecord,
  type WalletDetail,
} from '../shared/financeApi'
import {
  BALANCE_UNAVAILABLE,
  MOVEMENT_KIND_DESCRIPTION,
  MOVEMENT_KIND_LABEL,
  counterpartyTypeLabel,
  dateText,
  financeErrorView,
  formatCount,
  investmentStatusMeta,
  movementCategoryLabel,
  movementStatusLabel,
  providerLabel,
  rangeText,
  referenceEntry,
} from '../shared/financePresentation'
import {
  investmentHref,
  investmentsHref,
  investorProfileHref,
  parseWalletDetailRoute,
  paymentsHref,
  walletHref,
  walletListReturnHash,
  whitelabelRecordHref,
  type RawParams,
  type WalletDetailRoute,
  type WalletTab,
} from '../shared/financeRoute'
import {
  ContextChip,
  DateStack,
  DetailHero,
  DetailStatus,
  FinanceCoreShell,
  IgnoredParams,
  InvestmentStatusPill,
  KeyValueList,
  KindTag,
  Money,
  ReadError,
  RecordNotFound,
  ServerPagination,
  SkeletonRows,
  TabPanel,
} from '../shared/FinanceCoreUi'
import { useWalletDetail, useWalletInvestments, useWalletMovements } from '../shared/useFinanceData'
import styles from '../shared/FinanceCore.module.css'
import local from './Wallets.module.css'

const TAB_PREFIX = 'wallet-detail'

type WalletDetailProps = { walletId: string; routeKey?: string } & RawParams

/**
 * `#/finance/wallets/:walletId` — one Whitelabel ledger wallet from
 * `GET /wallets/:id` (`:id` = whitelabelId): authoritative balance and Backend
 * summary, movement history (`/movements`, server-paginated, no search or
 * sort) and the Whitelabel's investments (`/investments` alias). Read-only.
 */
export function WalletDetailPage({ walletId, routeKey = '', ...params }: WalletDetailProps) {
  const detail = useWalletDetail(walletId)
  const back = walletListReturnHash(params.returnTo)
  if (detail.state.status === 'error') {
    const view = financeErrorView(detail.state.error, 'a wallet')
    if (view.notFound) return <RecordNotFound section="wallets" title="Wallet não encontrada" id={walletId} backHref={back} />
    return <DetailStatus section="wallets" id={walletId} error={view} onRetry={detail.reload} />
  }
  if (detail.state.status !== 'success') return <DetailStatus section="wallets" id={walletId} />
  const wallet = detail.state.data
  return (
    <FinanceCoreShell section="wallets" title="Wallet" trail={[wallet.name ?? `Wallet ${walletId}`]}>
      <WalletContent wallet={wallet} back={back} params={params} routeKey={routeKey} />
    </FinanceCoreShell>
  )
}

function WalletContent({ wallet, back, params, routeKey }: { wallet: WalletDetail; back: string; params: RawParams; routeKey: string }) {
  useRestoreReplacedScroll(routeKey)
  const id = wallet.id
  const { aba, mpage, tipo, categoria, oportunidade, ipage, istatus, movimento, returnTo } = params
  const { state: route, ignored } = useMemo(
    () => parseWalletDetailRoute({ aba: !PROTOTYPE_PRESENTATION && aba === 'atividade' ? undefined : aba, mpage, tipo, categoria, oportunidade, ipage, istatus, movimento, returnTo }),
    [aba, mpage, tipo, categoria, oportunidade, ipage, istatus, movimento, returnTo],
  )
  const name = wallet.name ?? `Whitelabel #${wallet.whitelabelId}`
  const activity = useFinanceCoreActivity(`wallet:${id}`)
  const log = (title: string, detail?: string) => addFinanceCoreActivity(`wallet:${id}`, { title, detail })

  useEffect(() => {
    addFinanceCoreActivity(`wallet:${id}`, { title: 'Wallet consultada', detail: 'Leitura do Control Plane (somente leitura)' })
  }, [id])

  function navigate(next: Partial<WalletDetailRoute>) {
    replaceRouteKeepingScroll(walletHref(id, { ...route, ...next }))
  }

  function changeTab(next: WalletTab) {
    navigate({ tab: next, movementId: undefined })
    if (next === 'movimentacoes') log('Movimentações consultadas', 'Histórico do ledger (paginado pelo Control Plane)')
    if (next === 'investimentos') log('Investimentos do Whitelabel consultados', `Whitelabel ${wallet.whitelabelId}`)
  }

  const summary = wallet.summary
  const navItems: DomainNavItem[] = [
    {
      key: 'movements',
      label: 'Ver movimentações',
      description:
        summary?.countIn != null && summary.countOut != null
          ? `${formatCount(summary.countIn)} entradas · ${formatCount(summary.countOut)} saídas (Control Plane)`
          : 'Histórico do ledger (Control Plane)',
      icon: ArrowLeftRight,
      onSelect: () => changeTab('movimentacoes'),
    },
    { key: 'investments', label: 'Investimentos do Whitelabel', description: 'Lista do Control Plane escopada por esta wallet', icon: ChartColumn, onSelect: () => changeTab('investimentos') },
    { key: 'payments', label: 'Pagamentos do Whitelabel', description: 'Pagamentos / PIX filtrados pelo Control Plane', icon: QrCode, href: paymentsHref({ whitelabelId: wallet.whitelabelId }) },
    { key: 'whitelabel', label: 'Registro do Whitelabel', description: 'Plataformas › Whitelabels', icon: Building, href: whitelabelRecordHref(wallet.whitelabelId) },
  ]

  const tabs: { value: WalletTab; label: string }[] = [
    { value: 'visao-geral', label: 'Visão geral' },
    { value: 'movimentacoes', label: 'Movimentações' },
    { value: 'investimentos', label: 'Investimentos' },
    { value: 'atividade', label: 'Atividade da sessão' },
  ]

  return (
    <>
      <div>
        <BackLink href={back} label="Voltar para Wallet" />
      </div>

      <DetailHero
        monogram="W"
        title={`Wallet ${name}`}
        status={<StatusPill tone="neutral" label="Ledger do Whitelabel" />}
        meta={[
          { label: 'Saldo autoritativo', value: <Money cents={wallet.authoritativeBalanceCents} unavailable={BALANCE_UNAVAILABLE} /> },
          { label: 'Saldo consultado em', value: dateText(wallet.balanceTimestamp) },
          { label: 'Whitelabel', value: <span>{name} <span className={shared.heroId}>#{wallet.whitelabelId}</span></span> },
        ]}
        actions={
          <>
            <button type="button" className={`${outline.button} ${shared.secondaryButton}`} onClick={() => changeTab('movimentacoes')} data-hero="movements">
              <ArrowLeftRight size={15} strokeWidth={1.8} aria-hidden="true" />
              Ver movimentações
            </button>
            <a href={whitelabelRecordHref(wallet.whitelabelId)} className={`${outline.button} ${shared.secondaryButton}`} data-hero="whitelabel">
              <Building size={15} strokeWidth={1.8} aria-hidden="true" />
              Ver Whitelabel
            </a>
          </>
        }
      />

      <IgnoredParams ignored={ignored} />

      <div className={`${fin.card} ${shared.tabsCard}`}>
        <Tabs idPrefix={TAB_PREFIX} label={`Seções da wallet ${name}`} tabs={readinessTabs(tabs)} value={route.tab} onChange={changeTab} />
      </div>

      <TabPanel prefix={TAB_PREFIX} tab="visao-geral" current={route.tab}>
        <div className={shared.panelGrid}>
          <section className={fin.card} aria-labelledby="wal-info-title">
            <h3 id="wal-info-title" className={fin.cardTitleSm}>
              Informações principais
            </h3>
            <KeyValueList
              rows={[
                { label: 'ID da wallet', value: `${id} (mesmo ID do Whitelabel)` },
                { label: 'Whitelabel', value: name },
                { label: 'Slug', value: wallet.slug ?? 'Não informado' },
                { label: 'Titular', value: 'Whitelabel — ledger da plataforma' },
                { label: 'Moeda', value: 'BRL · centavos inteiros' },
                { label: 'Saldo autoritativo', value: <Money cents={wallet.authoritativeBalanceCents} unavailable={BALANCE_UNAVAILABLE} /> },
                { label: 'Saldo consultado em', value: dateText(wallet.balanceTimestamp) },
                { label: 'Criada em', value: dateText(wallet.createdAt) },
                { label: 'Atualizada em', value: dateText(wallet.updatedAt) },
              ]}
            />
          </section>
          <DomainNavCard title="Navegação" intro="Movimentações e investimentos desta wallet, e os domínios relacionados." items={navItems} />
        </div>

        <section className={fin.card} aria-labelledby="wal-summary-title" data-wallet-summary>
          <h3 id="wal-summary-title" className={fin.cardTitleSm}>
            Resumo do ledger
          </h3>
          {summary ? (
            <>
              <dl className={local.summaryStats}>
                <div data-primary>
                  <dt>Saldo autoritativo</dt>
                  <dd>
                    <Money cents={summary.authoritativeBalanceCents} unavailable={BALANCE_UNAVAILABLE} />
                  </dd>
                </div>
                <div>
                  <dt>Total de entradas</dt>
                  <dd>
                    <Money cents={summary.totalInCents} />
                  </dd>
                </div>
                <div>
                  <dt>Total de saídas</dt>
                  <dd>
                    <Money cents={summary.totalOutCents} />
                  </dd>
                </div>
                <div>
                  <dt>Movimentações de entrada</dt>
                  <dd>{summary.countIn === null ? <span className={styles.moneyUnavailable}>Não informado</span> : formatCount(summary.countIn)}</dd>
                </div>
                <div>
                  <dt>Movimentações de saída</dt>
                  <dd>{summary.countOut === null ? <span className={styles.moneyUnavailable}>Não informado</span> : formatCount(summary.countOut)}</dd>
                </div>
              </dl>
              <p className={local.sourceNote}>
                Valores agregados informados pelo Control Plane (<code>summary</code>). Nenhum valor desta tela é calculado a partir das movimentações.
              </p>
            </>
          ) : (
            <p className={styles.emptyLine} data-empty="summary">
              <Info size={15} strokeWidth={1.8} aria-hidden="true" />
              O Control Plane não informou o resumo desta wallet.
            </p>
          )}
        </section>
        <InfoNote>
          <strong>Somente leitura.</strong> O saldo vem do Control Plane (<code>authoritativeBalanceCents</code>) — não é recalculado a partir de entradas
          menos saídas. Nenhuma ação credita, debita, transfere, saca ou ajusta saldo.
        </InfoNote>
      </TabPanel>

      <TabPanel prefix={TAB_PREFIX} tab="movimentacoes" current={route.tab}>
        <MovementsPanel walletId={id} route={route} navigate={navigate} log={log} />
      </TabPanel>

      <TabPanel prefix={TAB_PREFIX} tab="investimentos" current={route.tab}>
        <WalletInvestmentsPanel walletId={id} whitelabelId={wallet.whitelabelId} route={route} navigate={navigate} />
      </TabPanel>

      <TabPanel prefix={TAB_PREFIX} tab="atividade" current={route.tab}>
        <SessionActivityCard entries={activity} emptyText="Nenhuma ação local registrada para esta wallet." />
      </TabPanel>
    </>
  )
}

/* ---------- Movements ---------- */

function MovementsPanel({
  walletId,
  route,
  navigate,
  log,
}: {
  walletId: string
  route: WalletDetailRoute
  navigate: (next: Partial<WalletDetailRoute>) => void
  log: (title: string, detail?: string) => void
}) {
  const movements = useWalletMovements(walletId, { page: route.movementPage, kind: route.kind, category: route.category, opportunityId: route.opportunityId })
  const data = movements.state.status === 'success' ? movements.state.data : null
  const loading = movements.state.status === 'loading' || movements.state.status === 'idle'
  const error = movements.state.status === 'error' ? financeErrorView(movements.state.error, 'as movimentações') : null
  const headingRef = useRef<HTMLHeadingElement>(null)
  const tableRef = useRef<HTMLDivElement>(null)
  // The open movement is URL state (`?movimento=`); there is no movement detail endpoint, so it only exists within the loaded page.
  const selectedId = route.movementId ?? null
  const selected = data?.rows.find((row) => row.id === selectedId) ?? null
  const selectionMissing = Boolean(selectedId && data && !loading && !selected)

  // The Backend clamps a page past the end to the last page (meta.page). Follow it downwards only, so a
  // misbehaving response can never drive an endless page loop, and never request beyond lastPage.
  useEffect(() => {
    if (data && data.page < route.movementPage) navigate({ movementPage: data.page, movementId: undefined })
  }, [data, route.movementPage, navigate])

  useEffect(() => {
    if (selected) headingRef.current?.focus()
  }, [selected])

  function changeFilter(next: Partial<WalletDetailRoute>) {
    navigate({ ...next, movementPage: 1, movementId: undefined })
  }

  function open(movement: MovementRecord) {
    navigate({ movementId: movement.id })
    log('Movimentação aberta', movement.id)
  }

  function close() {
    const closing = selectedId
    navigate({ movementId: undefined })
    window.requestAnimationFrame(() => {
      tableRef.current?.querySelector<HTMLElement>(`[data-movement-open="${CSS.escape(closing ?? '')}"]`)?.focus()
    })
  }

  function onPanelKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      close()
    }
  }

  const filtersActive = Boolean(route.kind || route.category || route.opportunityId)
  const columns = ['', local.mvKind, local.mvCategory, local.mvCounterparty, local.mvAmount, local.mvStatus, local.mvDate, shared.colActions]

  return (
    <>
      <section className={fin.card} aria-labelledby="wal-movements-title" ref={tableRef} data-movements>
        <h3 id="wal-movements-title" className={fin.cardTitleSm}>
          Movimentações do ledger
        </h3>
        <p className={fin.cardSubtitle}>
          Ordem fixa do Control Plane (data, mais recente primeiro). Valores sempre positivos: a direção é o tipo (entrada / saída). Busca e ordenação não são
          oferecidas pelo contrato.
        </p>
        <div className={local.subFilters}>
          <label className={fin.filter}>
            <span className="visually-hidden">Filtrar movimentações por tipo</span>
            <select id="movement-kind" value={route.kind ?? 'all'} onChange={(event) => changeFilter({ kind: event.target.value === 'all' ? undefined : (event.target.value as MovementKind) })}>
              <option value="all">Entradas e saídas</option>
              <option value="in">{MOVEMENT_KIND_LABEL.in}s</option>
              <option value="out">{MOVEMENT_KIND_LABEL.out}s</option>
            </select>
          </label>
          <label className={fin.filter}>
            <span className="visually-hidden">Filtrar movimentações por categoria</span>
            <select
              id="movement-category"
              value={route.category ?? 'all'}
              onChange={(event) => changeFilter({ category: event.target.value === 'all' ? undefined : (event.target.value as MovementCategory) })}
            >
              <option value="all">Todas as categorias</option>
              {MOVEMENT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {movementCategoryLabel(category)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {route.opportunityId ? (
          <ContextChip
            dataName="movement-opportunity"
            label={`Oportunidade #${route.opportunityId}`}
            removeLabel={`Remover filtro da oportunidade ${route.opportunityId}`}
            onRemove={() => changeFilter({ opportunityId: undefined })}
          />
        ) : null}

        {selectionMissing ? (
          <p className={styles.emptyLine} data-movement-missing>
            <Info size={15} strokeWidth={1.8} aria-hidden="true" />
            A movimentação {selectedId} não está nesta página do histórico. Não há leitura individual de movimentação no contrato.
          </p>
        ) : null}

        <div className={local.movementsArea}>
          <div className={local.movementLayout} data-has-detail={selected ? '' : undefined}>
            <div className={styles.tableWrap}>
              {error ? (
                <ReadError error={error} onRetry={movements.reload} compact />
              ) : (
                <table className={`${fin.table} ${shared.table} ${local.movementTable}`} aria-busy={loading || undefined}>
                  <caption className="visually-hidden">
                    Movimentações da wallet {walletId}, dados do Control Plane{data ? `, página ${data.page} de ${data.lastPage}` : ''}. Valores positivos; a direção
                    está na coluna Tipo.
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Movimentação</th>
                      <th scope="col" className={local.mvKind}>
                        Tipo
                      </th>
                      <th scope="col" className={local.mvCategory}>
                        Categoria
                      </th>
                      <th scope="col" className={local.mvCounterparty}>
                        Contraparte
                      </th>
                      <th scope="col" className={local.mvAmount}>
                        Valor
                      </th>
                      <th scope="col" className={local.mvStatus}>
                        Status de origem
                      </th>
                      <th scope="col" className={local.mvDate}>
                        Data
                      </th>
                      <th scope="col" className={shared.colActions}>
                        Ação
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <SkeletonRows columns={columns} rows={5} />
                    ) : (
                      data?.rows.map((movement) => {
                        const active = movement.id === selectedId
                        return (
                          <tr key={movement.id} className={fin.row} data-active={active || undefined} data-movement={movement.id} data-kind={movement.kind}>
                            <td>
                              <span className={shared.cellText}>
                                <span className={local.movementId}>{movement.id}</span>
                                <span className={local.metaDescription}>
                                  {movement.description ?? 'Sem descrição'} · {dateText(movement.date)}
                                </span>
                                <span className={local.metaSource}>
                                  {movementCategoryLabel(movement.category)} · {movementStatusLabel(movement.status)}
                                </span>
                                <span className={local.metaStates}>
                                  <KindTag kind={movement.kind} />
                                  <span className={local.metaAmount}>
                                    <Money cents={movement.amountCents} />
                                  </span>
                                </span>
                              </span>
                            </td>
                            <td className={local.mvKind}>
                              <KindTag kind={movement.kind} />
                            </td>
                            <td className={local.mvCategory}>{movementCategoryLabel(movement.category)}</td>
                            <td className={local.mvCounterparty}>
                              <span className={shared.cellText}>
                                <span>{movement.counterparty?.name ?? 'Não informado'}</span>
                                <span className={shared.rowId}>
                                  {counterpartyTypeLabel(movement.counterparty?.type ?? null)}
                                  {movement.counterparty?.document ? (
                                    <>
                                      {' · '}
                                      <span className={local.document}>{movement.counterparty.document}</span>
                                    </>
                                  ) : null}
                                </span>
                              </span>
                            </td>
                            <td className={local.mvAmount}>
                              <Money cents={movement.amountCents} />
                              <span className="visually-hidden"> ({MOVEMENT_KIND_LABEL[movement.kind].toLowerCase()})</span>
                            </td>
                            <td className={local.mvStatus}>{movementStatusLabel(movement.status)}</td>
                            <td className={local.mvDate}>
                              <DateStack iso={movement.date} />
                            </td>
                            <td className={shared.colActions}>
                              <button
                                type="button"
                                className={`${fin.iconButton} ${shared.actionLink}`}
                                aria-label={`Ver detalhes da movimentação ${movement.id}`}
                                aria-expanded={active}
                                aria-controls={active ? 'movement-detail' : undefined}
                                data-movement-open={movement.id}
                                onClick={() => (active ? close() : open(movement))}
                              >
                                <Eye size={15} strokeWidth={1.8} aria-hidden="true" />
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              )}
              {!error && data && !loading && data.rows.length === 0 ? (
                <div className={styles.feedbackCompact} data-movements-empty>
                  <EmptyState
                    icon={filtersActive ? SearchX : ArrowLeftRight}
                    title={filtersActive ? 'Nenhuma movimentação para estes filtros' : 'Nenhuma movimentação registrada'}
                    description={filtersActive ? 'O Control Plane não retornou movimentações para estes filtros.' : 'O ledger desta wallet não tem movimentações.'}
                  />
                </div>
              ) : null}
            </div>

            {selected ? (
              <section
                id="movement-detail"
                className={`${fin.card} ${local.movementDetail}`}
                aria-labelledby="movement-detail-title"
                onKeyDown={onPanelKeyDown}
                data-movement-detail={selected.id}
              >
                <div className={local.detailHead}>
                  <h3 id="movement-detail-title" className={fin.cardTitleSm} tabIndex={-1} ref={headingRef}>
                    Movimentação {selected.id}
                  </h3>
                  <button type="button" className={fin.iconButton} onClick={close} aria-label="Fechar detalhe da movimentação">
                    <X size={15} strokeWidth={1.9} aria-hidden="true" />
                  </button>
                </div>
                <p className={fin.cardSubtitle}>Registro somente leitura do ledger. Nenhuma ação altera a movimentação ou o saldo.</p>
                <MovementDetail movement={selected} onOpportunity={(opportunityId) => changeFilter({ opportunityId })} />
              </section>
            ) : null}
          </div>
        </div>

        {error ? null : (
          <div className={shared.footer}>
            <p className={shared.range} aria-live="polite">
              {data && !loading ? rangeText(data, 'movimentação', 'movimentações', 'Nenhuma movimentação') : 'Carregando movimentações…'}
            </p>
            <ServerPagination
              label="Paginação de movimentações"
              current={data?.page ?? route.movementPage}
              last={(data ?? movements.lastData)?.lastPage ?? 1}
              disabled={loading}
              onChange={(page) => navigate({ movementPage: page, movementId: undefined })}
            />
          </div>
        )}
      </section>
      <InfoNote>
        Documentos de contraparte aparecem exatamente como o Control Plane os envia — mascarados. Uma resposta com documento sem máscara é recusada inteira e
        nada é exibido.
      </InfoNote>
    </>
  )
}

function MovementDetail({ movement, onOpportunity }: { movement: MovementRecord; onOpportunity: (opportunityId: string) => void }) {
  const references = Object.entries(movement.reference).map(([key, value]) => referenceEntry(key, value))
  const investmentId = typeof movement.reference.investment_id === 'number' ? String(movement.reference.investment_id) : null
  return (
    <>
      <KeyValueList
        rows={[
          { label: 'ID da movimentação', value: <span className={styles.mono}>{movement.id}</span> },
          {
            label: 'Tipo',
            value: (
              <span className={shared.cellText}>
                <KindTag kind={movement.kind} />
                <span className={shared.rowId}>{MOVEMENT_KIND_DESCRIPTION[movement.kind]}</span>
              </span>
            ),
          },
          { label: 'Categoria', value: movementCategoryLabel(movement.category) },
          { label: 'Valor', value: <Money cents={movement.amountCents} /> },
          { label: 'Data', value: dateText(movement.date) },
          { label: 'Descrição', value: movement.description ?? 'Sem descrição' },
          { label: 'Contraparte', value: `${movement.counterparty?.name ?? 'Não informado'} (${counterpartyTypeLabel(movement.counterparty?.type ?? null)})` },
          { label: 'Documento', value: movement.counterparty?.document ? <span className={styles.mono}>{movement.counterparty.document}</span> : 'Não informado' },
          {
            label: 'Oportunidade',
            value: movement.opportunity ? (
              <span className={shared.cellText}>
                <span>
                  {movement.opportunity.name ?? 'Sem nome'} (#{movement.opportunity.id})
                </span>
                <button type="button" className={styles.filterInline} onClick={() => onOpportunity(movement.opportunity!.id)} data-filter-movement-opportunity>
                  Filtrar movimentações desta oportunidade
                </button>
              </span>
            ) : (
              'Não informada'
            ),
          },
          { label: 'Provedor', value: providerLabel(movement.provider) },
          { label: 'Status de origem', value: movementStatusLabel(movement.status) },
        ]}
      />
      <h4 className={local.sourceNote}>Referências de origem</h4>
      {references.length ? (
        <KeyValueList
          rows={references.map((entry) => ({
            label: entry.label,
            value: (
              <span>
                <span className={styles.mono}>{entry.value}</span>
                {entry.partial ? <span className={styles.partialTag}>(parcial)</span> : null}
              </span>
            ),
          }))}
        />
      ) : (
        <p className={styles.emptyLine}>
          <Info size={15} strokeWidth={1.8} aria-hidden="true" />
          Sem referências informadas.
        </p>
      )}
      {investmentId ? (
        <div className={styles.cardActions}>
          <a href={investmentHref(investmentId)} className={`${outline.button} ${styles.primaryLink}`} data-movement-target="investment">
            Ver investimento {investmentId}
          </a>
        </div>
      ) : null}
    </>
  )
}

/* ---------- Wallet investments (alias) ---------- */

function WalletInvestmentsPanel({
  walletId,
  whitelabelId,
  route,
  navigate,
}: {
  walletId: string
  whitelabelId: string
  route: WalletDetailRoute
  navigate: (next: Partial<WalletDetailRoute>) => void
}) {
  const investments = useWalletInvestments(walletId, { page: route.investmentPage, status: route.investmentStatus, sort: 'createdAt', order: 'desc' })
  const data = investments.state.status === 'success' ? investments.state.data : null
  const pageOutOfRange = data !== null && data.rows.length === 0 && data.total > 0
  const loading = investments.state.status === 'loading' || investments.state.status === 'idle' || pageOutOfRange
  const error = investments.state.status === 'error' ? financeErrorView(investments.state.error, 'os investimentos do Whitelabel') : null

  useEffect(() => {
    if (!data) return
    const target = data.total === 0 ? 1 : Math.min(route.investmentPage, data.lastPage)
    if (target !== route.investmentPage) navigate({ investmentPage: target })
  }, [data, route.investmentPage, navigate])

  const columns = ['', local.mvCounterparty, local.mvAmount, local.mvStatus, local.mvDate, shared.colActions]
  const listContext = investmentsHref({ whitelabelId })

  return (
    <section className={fin.card} aria-labelledby="wal-investments-title" data-wallet-investments>
      <h3 id="wal-investments-title" className={fin.cardTitleSm}>
        Investimentos do Whitelabel
      </h3>
      <p className={fin.cardSubtitle}>
        <code>GET /wallets/{walletId}/investments</code> — o Control Plane aplica o escopo do Whitelabel desta wallet. Mais recentes primeiro.
      </p>
      <div className={local.subFilters}>
        <label className={fin.filter}>
          <span className="visually-hidden">Filtrar investimentos por status</span>
          <select
            id="wallet-investment-status"
            value={route.investmentStatus ?? 'all'}
            onChange={(event) => navigate({ investmentStatus: event.target.value === 'all' ? undefined : (event.target.value as InvestmentStatus), investmentPage: 1 })}
          >
            <option value="all">Todos os status</option>
            {INVESTMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {investmentStatusMeta(status).label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className={local.movementsArea}>
        <div className={styles.tableWrap}>
          {error ? (
            <ReadError error={error} onRetry={investments.reload} compact />
          ) : (
            <table className={`${fin.table} ${shared.table} ${local.movementTable}`} aria-busy={loading || undefined}>
              <caption className="visually-hidden">Investimentos do Whitelabel {whitelabelId}, dados do Control Plane.</caption>
              <thead>
                <tr>
                  <th scope="col">Investimento</th>
                  <th scope="col" className={local.mvCounterparty}>
                    Investidor
                  </th>
                  <th scope="col" className={local.mvAmount}>
                    Valor
                  </th>
                  <th scope="col" className={local.mvStatus}>
                    Status
                  </th>
                  <th scope="col" className={local.mvDate}>
                    Criado em
                  </th>
                  <th scope="col" className={shared.colActions}>
                    Ação
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonRows columns={columns} rows={5} />
                ) : (
                  data?.rows.map((row) => (
                    <tr key={row.id} className={fin.row} data-wallet-investment={row.id}>
                      <td>
                        <span className={shared.cellText}>
                          <a href={investmentHref(row.id, listContext)} className={shared.rowLink}>
                            Investimento {row.id}
                          </a>
                          <span className={local.metaDescription}>
                            Investidor #{row.investorId} · {dateText(row.createdAt)}
                          </span>
                          <span className={local.metaStates}>
                            <span className={local.metaAmount}>
                              <Money cents={row.amountCents} />
                            </span>
                            <InvestmentStatusPill status={row.status} />
                          </span>
                        </span>
                      </td>
                      <td className={local.mvCounterparty}>
                        <a href={investorProfileHref(row.investorId)} className={shared.inlineLink}>
                          Investidor #{row.investorId}
                        </a>
                      </td>
                      <td className={local.mvAmount}>
                        <Money cents={row.amountCents} />
                      </td>
                      <td className={local.mvStatus}>
                        <InvestmentStatusPill status={row.status} />
                      </td>
                      <td className={local.mvDate}>
                        <DateStack iso={row.createdAt} />
                      </td>
                      <td className={shared.colActions}>
                        <a href={investmentHref(row.id, listContext)} className={`${fin.iconButton} ${shared.actionLink}`} aria-label={`Abrir investimento ${row.id}`}>
                          <Eye size={15} strokeWidth={1.8} aria-hidden="true" />
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
          {!error && data && !loading && data.rows.length === 0 ? (
            <div className={styles.feedbackCompact} data-wallet-investments-empty>
              <EmptyState
                icon={ChartColumn}
                title={route.investmentStatus ? 'Nenhum investimento com este status' : 'Nenhum investimento neste Whitelabel'}
                description="O Control Plane não retornou investimentos para esta wallet."
              />
            </div>
          ) : null}
        </div>
      </div>
      {error ? null : (
        <div className={shared.footer}>
          <p className={shared.range} aria-live="polite">
            {data && !loading ? rangeText(data, 'investimento', 'investimentos', 'Nenhum investimento') : 'Carregando investimentos…'}{' '}
            <a href={investmentsHref({ whitelabelId, status: route.investmentStatus })} className={shared.inlineLink}>
              Abrir em Investimentos
            </a>
          </p>
          <ServerPagination
            label="Paginação dos investimentos do Whitelabel"
            current={route.investmentPage}
            last={(data ?? investments.lastData)?.lastPage ?? 1}
            disabled={loading}
            onChange={(page) => navigate({ investmentPage: page })}
          />
        </div>
      )}
    </section>
  )
}
