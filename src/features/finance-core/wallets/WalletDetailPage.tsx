import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { ArrowLeftRight, ChartColumn, ExternalLink, Eye, Info, QrCode, UserRound, X } from 'lucide-react'
import { usePrototypeNotice } from '../../../components/shell/prototypeNotice'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import outline from '../../../components/ui/OutlineButton.module.css'
import primary from '../../../components/ui/PrimaryButton.module.css'
import { Tabs } from '../../../components/ui/Tabs'
import fin from '../../finance-gateways/sections/FinanceSections.module.css'
import { BackLink, DomainNavCard, InfoNote, SessionActivityCard, WhitelabelTag, type DomainNavItem } from '../../operation/shared/OperationUi'
import { countLabel } from '../../operation/shared/operationModel'
import shared from '../../operation/shared/Operation.module.css'
import { addFinanceCoreActivity, useFinanceCoreActivity } from '../shared/financeCoreActivity'
import {
  CURRENCY_LABEL,
  MOVEMENT_DIRECTION_META,
  MOVEMENT_SOURCE_LABEL,
  MOVEMENT_STATUS_META,
  TRANSFER_PENDING_MESSAGE,
  formatMoney,
  investmentHref,
  investorHref,
  paymentHref,
  walletHref,
  type Wallet,
  type WalletMovement,
} from '../shared/financeCoreModel'
import { walletById, walletRelations } from '../shared/financeCoreRecords'
import { dateText, investorName, ownerLabel } from '../shared/financeCoreRefs'
import {
  DateStack,
  DetailHero,
  DirectionTag,
  FinanceCoreShell,
  InvestmentStatusPill,
  KeyValueList,
  MethodTag,
  Money,
  MovementStatusPill,
  PaymentStatusPill,
  RecordNotFound,
  TabPanel,
  WalletStatusPill,
} from '../shared/FinanceCoreUi'
import styles from '../shared/FinanceCore.module.css'
import local from './Wallets.module.css'

type Tab = 'overview' | 'movements' | 'relations' | 'activity'
const TAB_PREFIX = 'wallet-detail'
const PAYMENTS_OF = (walletId: string) => `#/finance/payments?wallet=${encodeURIComponent(walletId)}`
const INVESTMENTS_OF = (walletId: string) => `#/finance/investments?wallet=${encodeURIComponent(walletId)}`

/**
 * `#/finance/wallets/:walletId` (optional `?movimento=`) — read-only wallet.
 * Selecting a movement opens an inline detail on the same route.
 */
export function WalletDetailPage({ walletId, movementId }: { walletId: string; movementId?: string }) {
  const wallet = walletById(walletId)
  if (!wallet) return <RecordNotFound section="wallets" title="Wallet não encontrada" id={walletId} />
  return (
    <FinanceCoreShell section="wallets" title="Wallet" trail={[wallet.walletId]}>
      <WalletContent wallet={wallet} movementId={movementId} />
    </FinanceCoreShell>
  )
}

function WalletContent({ wallet, movementId }: { wallet: Readonly<Wallet>; movementId?: string }) {
  const notify = usePrototypeNotice()
  const id = wallet.walletId
  const activity = useFinanceCoreActivity(id)
  const relations = useMemo(() => walletRelations(id), [id])
  const { movements } = relations
  const owner = ownerLabel(wallet.ownerReference)
  const ownsMovement = (candidate: string | undefined) => Boolean(candidate && movements.some((item) => item.movementId === candidate))

  const [tab, setTab] = useState<Tab>(movementId ? 'movements' : 'overview')
  const [selectedId, setSelectedId] = useState<string | null>(ownsMovement(movementId) ? (movementId ?? null) : null)
  const [focusTick, setFocusTick] = useState(ownsMovement(movementId) ? 1 : 0)
  const [routeMovement, setRouteMovement] = useState(movementId)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const tableRef = useRef<HTMLDivElement>(null)

  // A new `?movimento=` on the same wallet (Back / Forward, another link) opens that movement.
  if (routeMovement !== movementId) {
    setRouteMovement(movementId)
    setSelectedId(ownsMovement(movementId) ? (movementId ?? null) : null)
    if (movementId) {
      setTab('movements')
      setFocusTick((tick) => tick + 1)
    }
  }

  const selected = movements.find((item) => item.movementId === selectedId) ?? null
  const log = (title: string, detail?: string) => addFinanceCoreActivity(id, { title, detail })

  useEffect(() => {
    addFinanceCoreActivity(id, { title: 'Wallet consultada', detail: 'Visão financeira (somente leitura)' })
  }, [id])

  useEffect(() => {
    if (!movementId) return
    if (movements.some((item) => item.movementId === movementId)) {
      addFinanceCoreActivity(id, { title: `Movimento ${movementId} aberto`, detail: 'Detalhe somente leitura (referência na URL)' })
    } else {
      notify(`O movimento “${movementId}” não pertence a esta wallet no protótipo.`)
    }
  }, [id, movementId, movements, notify])

  useEffect(() => {
    if (focusTick > 0) headingRef.current?.focus()
  }, [focusTick])

  function changeTab(next: Tab) {
    setTab(next)
    if (next === 'movements') log('Movimentações consultadas', countLabel(movements.length, 'movimentação', 'movimentações', 'Nenhuma movimentação'))
    if (next === 'relations') log('Relações financeiras consultadas', `${relations.payments.length} pagamento(s) · ${relations.investments.length} investimento(s)`)
  }

  function openMovement(movement: Readonly<WalletMovement>) {
    // Keep reload and Back / Forward aligned with the visible selection.
    window.location.assign(walletHref(id, movement.movementId))
  }

  function closeMovement() {
    const closing = selectedId
    setSelectedId(null)
    // Same wallet component: no remount, and Back can reopen the inspected movement.
    if (movementId) window.location.assign(walletHref(id))
    window.requestAnimationFrame(() => {
      tableRef.current?.querySelector<HTMLElement>(`[data-movement-open="${closing}"]`)?.focus()
    })
  }

  function onPanelKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      closeMovement()
    }
  }

  const notifyTransfer = (transferId: string) => {
    log(`Transferência ${transferId}: módulo pendente`, 'Nenhuma navegação feita')
    notify(TRANSFER_PENDING_MESSAGE)
  }
  const onOwner = () => log('Navegação para Operação › Investidores solicitada', owner.reference)
  const ownerWithoutProfile = () => {
    log('Titular sem destino', `${owner.reference} — nenhuma navegação feita`)
    notify(`O titular desta wallet é um contexto operacional (${owner.reference}) sem módulo navegável no protótipo. Nenhuma navegação foi feita.`)
  }
  const onPayments = () => log('Navegação para Pagamentos / PIX solicitada', 'Lista filtrada por esta wallet')
  const onInvestments = () => log('Navegação para Investimentos solicitada', 'Lista filtrada por esta wallet')
  const noPayments = () => {
    log('Pagamentos sem destino', 'Nenhuma movimentação referencia pagamentos — nenhuma navegação feita')
    notify('Nenhuma movimentação desta wallet referencia um pagamento. Nenhuma navegação foi feita.')
  }
  const noInvestments = () => {
    log('Investimentos sem destino', 'Nenhuma referência explícita — nenhuma navegação feita')
    notify('Nenhuma movimentação desta wallet referencia um investimento. Nenhuma navegação foi feita.')
  }

  const ownerIsInvestor = wallet.ownerReference?.kind === 'investor'
  const ownerHref = wallet.ownerReference?.kind === 'investor' ? investorHref(wallet.ownerReference.investorId) : undefined

  const navItems: DomainNavItem[] = [
    ownerHref
      ? { key: 'owner', label: 'Ver titular', description: 'Operação › Investidores — dados do titular', icon: UserRound, href: ownerHref, onSelect: onOwner }
      : { key: 'owner', label: 'Ver titular', description: 'Contexto operacional sem perfil navegável', icon: UserRound, onSelect: ownerWithoutProfile },
    relations.payments.length
      ? {
          key: 'payments',
          label: 'Ver Pagamentos / PIX',
          description: `${countLabel(relations.payments.length, 'pagamento relacionado', 'pagamentos relacionados', '')}`,
          icon: QrCode,
          href: PAYMENTS_OF(id),
          onSelect: onPayments,
        }
      : { key: 'payments', label: 'Ver Pagamentos / PIX', description: 'Nenhum pagamento referenciado', icon: QrCode, onSelect: noPayments },
    relations.investments.length
      ? {
          key: 'investments',
          label: 'Ver investimentos',
          description: `${countLabel(relations.investments.length, 'investimento relacionado', 'investimentos relacionados', '')}`,
          icon: ChartColumn,
          href: INVESTMENTS_OF(id),
          onSelect: onInvestments,
        }
      : { key: 'investments', label: 'Ver investimentos', description: 'Nenhum investimento referenciado', icon: ChartColumn, onSelect: noInvestments },
    {
      key: 'movements',
      label: 'Ver movimentações',
      description: `Consultar histórico da wallet — ${countLabel(movements.length, 'movimentação', 'movimentações', 'nenhuma movimentação')}`,
      icon: ArrowLeftRight,
      onSelect: () => changeTab('movements'),
    },
  ]

  const tabs: { value: Tab; label: string }[] = [
    { value: 'overview', label: 'Visão geral' },
    { value: 'movements', label: 'Movimentações' },
    { value: 'relations', label: 'Relações financeiras' },
    { value: 'activity', label: 'Atividade da sessão' },
  ]

  const lastMovement = [...movements].sort((a, b) => ((a.createdAt ?? '') < (b.createdAt ?? '') ? 1 : -1))[0]

  return (
    <>
      <div>
        <BackLink href="#/finance/wallets" label="Voltar para Wallet" />
      </div>

      <DetailHero
        monogram="W"
        title={`Wallet ${id}`}
        status={<WalletStatusPill status={wallet.status} />}
        meta={[
          { label: 'Moeda', value: wallet.currency },
          {
            label: 'Titular / contexto',
            value: (
              <>
                <UserRound size={15} strokeWidth={1.8} aria-hidden="true" />
                {owner.name} <span className={shared.heroId}>{owner.reference}</span>
              </>
            ),
          },
          { label: 'Whitelabel', value: <WhitelabelTag whitelabelId={wallet.whitelabelId} /> },
        ]}
        actions={
          <>
            {ownerHref ? (
              <a href={ownerHref} className={`${outline.button} ${shared.secondaryButton}`} onClick={onOwner} data-hero="owner">
                <UserRound size={15} strokeWidth={1.8} aria-hidden="true" />
                Ver titular
              </a>
            ) : (
              <OutlineButton className={shared.secondaryButton} onClick={ownerWithoutProfile} data-hero="owner">
                <UserRound size={15} strokeWidth={1.8} aria-hidden="true" />
                Ver titular
              </OutlineButton>
            )}
            {relations.investments.length ? (
              <a href={INVESTMENTS_OF(id)} className={`${outline.button} ${shared.secondaryButton}`} onClick={onInvestments} data-hero="investments">
                <ChartColumn size={15} strokeWidth={1.8} aria-hidden="true" />
                Ver investimentos
              </a>
            ) : (
              <OutlineButton className={shared.secondaryButton} onClick={noInvestments} data-hero="investments">
                <ChartColumn size={15} strokeWidth={1.8} aria-hidden="true" />
                Ver investimentos
              </OutlineButton>
            )}
          </>
        }
      />

      <div className={`${fin.card} ${shared.tabsCard}`}>
        <Tabs idPrefix={TAB_PREFIX} label={`Seções da wallet ${id}`} tabs={tabs} value={tab} onChange={changeTab} />
      </div>

      <TabPanel prefix={TAB_PREFIX} tab="overview" current={tab}>
        <div className={shared.panelGrid}>
          <section className={fin.card} aria-labelledby="wal-info-title">
            <h3 id="wal-info-title" className={fin.cardTitleSm}>
              Informações principais
            </h3>
            <KeyValueList
              rows={[
                { label: 'ID da wallet', value: id },
                { label: 'Titular / contexto', value: `${owner.name} (${owner.reference})` },
                { label: 'Whitelabel', value: <WhitelabelTag whitelabelId={wallet.whitelabelId} /> },
                { label: 'Moeda', value: CURRENCY_LABEL[wallet.currency] },
                {
                  label: 'Saldo representado',
                  value: (
                    <>
                      <Money amount={wallet.representedBalance} currency={wallet.currency} />
                      <span className={local.prototypeTag}>Representação do protótipo</span>
                    </>
                  ),
                },
                { label: 'Status', value: <WalletStatusPill status={wallet.status} /> },
                { label: 'Criada em', value: dateText(wallet.createdAt) },
                { label: 'Atualizada em', value: dateText(wallet.updatedAt) },
              ]}
            />
            {!ownerIsInvestor ? (
              <p className={shared.callout} style={{ marginTop: 12 }}>
                <Info size={15} strokeWidth={1.8} aria-hidden="true" />
                <span>Titular de contexto operacional (ilustrativo). O modelo de titularidade das wallets ainda está em aberto.</span>
              </p>
            ) : null}
          </section>
          <DomainNavCard
            title="Navegação para domínios responsáveis"
            intro="Titular, pagamentos e investimentos pertencem a outros módulos. Daqui você só navega até eles."
            items={navItems}
          />
        </div>
        <InfoNote>
          <strong>Wallet V1 é um módulo de supervisão financeira.</strong> O saldo exibido é uma representação do protótipo — não é valor
          sacável, transferível ou liquidado, e não é calculado a partir das movimentações. Nenhuma ação credita, debita, transfere,
          bloqueia ou ajusta saldo.
        </InfoNote>
      </TabPanel>

      <TabPanel prefix={TAB_PREFIX} tab="movements" current={tab}>
        <section className={fin.card} aria-labelledby="wal-summary-title">
          <div className={shared.cardHead}>
            <h3 id="wal-summary-title" className={fin.cardTitleSm}>
              Resumo da wallet
            </h3>
            {relations.payments.length ? (
              <a href={PAYMENTS_OF(id)} className={`${primary.button} ${local.summaryLink}`} onClick={onPayments} data-view-payments>
                Ver Pagamentos / PIX
                <ExternalLink size={15} strokeWidth={1.8} aria-hidden="true" />
              </a>
            ) : null}
          </div>
          <dl className={local.summaryStats}>
            <div>
              <dt>Saldo representado</dt>
              <dd>
                <Money amount={wallet.representedBalance} currency={wallet.currency} />
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <WalletStatusPill status={wallet.status} />
              </dd>
            </div>
            <div>
              <dt>Quantidade de movimentações</dt>
              <dd>{movements.length}</dd>
            </div>
            <div>
              <dt>Última movimentação</dt>
              <dd>{dateText(lastMovement?.createdAt)}</dd>
            </div>
          </dl>
        </section>

        <div className={local.movementsArea}>
          <div className={local.movementLayout} data-has-detail={selected ? '' : undefined}>
            <section className={fin.card} aria-labelledby="wal-movements-title" ref={tableRef}>
              <h3 id="wal-movements-title" className={fin.cardTitleSm}>
                Movimentações
              </h3>
              <p className={fin.cardSubtitle}>Movimentações relacionadas a esta wallet. Linhas somente leitura — selecione para ver o detalhe.</p>
              {movements.length ? (
                <div className={styles.tableWrap}>
                  <table className={`${fin.table} ${shared.table} ${local.movementTable}`}>
                    <caption className="visually-hidden">Movimentações da wallet {id} (somente leitura)</caption>
                    <thead>
                      <tr>
                        <th scope="col">Movimento</th>
                        <th scope="col" className={local.mvDirection}>
                          Natureza
                        </th>
                        <th scope="col" className={local.mvDescription}>
                          Descrição
                        </th>
                        <th scope="col" className={local.mvSource}>
                          Origem
                        </th>
                        <th scope="col" className={local.mvSource}>
                          Referência
                        </th>
                        <th scope="col" className={local.mvAmount}>
                          Valor
                        </th>
                        <th scope="col" className={local.mvStatus}>
                          Status
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
                      {movements.map((movement) => {
                        const active = movement.movementId === selectedId
                        const source = movement.sourceType ? MOVEMENT_SOURCE_LABEL[movement.sourceType] : 'Não informada'
                        return (
                          <tr key={movement.movementId} className={fin.row} data-active={active || undefined} data-movement={movement.movementId}>
                            <td>
                              <span className={shared.cellText}>
                                <span className={local.movementId}>{movement.movementId}</span>
                                <span className={local.metaDescription}>
                                  {movement.description} · {dateText(movement.createdAt)}
                                </span>
                                <span className={local.metaSource}>
                                  Origem: {source}
                                  {movement.sourceId ? ` · ${movement.sourceId}` : ''}
                                </span>
                                <span className={local.metaStates}>
                                  <DirectionTag direction={movement.direction} />
                                  <span className={local.metaAmount}>{formatMoney(movement.amount, movement.currency)}</span>
                                  <MovementStatusPill status={movement.status} />
                                </span>
                              </span>
                            </td>
                            <td className={local.mvDirection}>
                              <DirectionTag direction={movement.direction} />
                            </td>
                            <td className={local.mvDescription}>{movement.description}</td>
                            <td className={local.mvSource}>{source}</td>
                            <td className={local.mvSource}>
                              <SourceReference movement={movement} onTransfer={notifyTransfer} />
                            </td>
                            <td className={local.mvAmount}>
                              <Money amount={movement.amount} currency={movement.currency} />
                            </td>
                            <td className={local.mvStatus}>
                              <MovementStatusPill status={movement.status} />
                            </td>
                            <td className={local.mvDate}>
                              <DateStack iso={movement.createdAt} />
                            </td>
                            <td className={shared.colActions}>
                              <button
                                type="button"
                                className={`${fin.iconButton} ${shared.actionLink}`}
                                aria-label={`Ver detalhes do movimento ${movement.movementId}`}
                                aria-expanded={active}
                                aria-controls="movement-detail"
                                data-movement-open={movement.movementId}
                                onClick={() => (active ? closeMovement() : openMovement(movement))}
                              >
                                <Eye size={15} strokeWidth={1.8} aria-hidden="true" />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className={styles.emptyLine} data-empty="movements">
                  <Info size={15} strokeWidth={1.8} aria-hidden="true" />
                  Nenhuma movimentação registrada para esta wallet no protótipo.
                </p>
              )}
            </section>

            {selected ? (
              <section
                id="movement-detail"
                className={`${fin.card} ${local.movementDetail}`}
                aria-labelledby="movement-detail-title"
                onKeyDown={onPanelKeyDown}
                data-movement-detail={selected.movementId}
              >
                <div className={local.detailHead}>
                  <h3 id="movement-detail-title" className={fin.cardTitleSm} tabIndex={-1} ref={headingRef}>
                    Movimento {selected.movementId}
                  </h3>
                  <button type="button" className={fin.iconButton} onClick={closeMovement} aria-label="Fechar detalhe do movimento">
                    <X size={15} strokeWidth={1.9} aria-hidden="true" />
                  </button>
                </div>
                <p className={fin.cardSubtitle}>Registro somente leitura. Nenhuma ação altera a movimentação ou o saldo.</p>
                <KeyValueList
                  rows={[
                    { label: 'ID do movimento', value: selected.movementId },
                    { label: 'Wallet', value: selected.walletId },
                    { label: 'Natureza', value: MOVEMENT_DIRECTION_META[selected.direction].label },
                    { label: 'Descrição', value: selected.description },
                    { label: 'Valor', value: <Money amount={selected.amount} currency={selected.currency} /> },
                    { label: 'Status', value: MOVEMENT_STATUS_META[selected.status].label },
                    { label: 'Origem', value: selected.sourceType ? MOVEMENT_SOURCE_LABEL[selected.sourceType] : 'Não informada' },
                    { label: 'Referência', value: selected.sourceId ?? '—' },
                    { label: 'Criado em', value: dateText(selected.createdAt) },
                    { label: 'Atualizado em', value: dateText(selected.updatedAt) },
                  ]}
                />
                <div className={styles.cardActions}>
                  <MovementDestination movement={selected} onTransfer={notifyTransfer} log={log} />
                </div>
              </section>
            ) : null}
          </div>
        </div>
        <InfoNote>
          Wallet, pagamentos e investimentos mantêm estados independentes neste protótipo. Movimentações não recalculam o saldo
          representado e não podem ser criadas, editadas, estornadas ou conciliadas aqui.
        </InfoNote>
      </TabPanel>

      <TabPanel prefix={TAB_PREFIX} tab="relations" current={tab}>
        <div className={shared.panelGrid}>
          <section className={fin.card} aria-labelledby="wal-rel-payments">
            <h3 id="wal-rel-payments" className={fin.cardTitleSm}>
              Pagamentos relacionados
            </h3>
            <p className={fin.cardSubtitle}>Pagamentos referenciados pelas movimentações desta wallet.</p>
            {relations.payments.length ? (
              <div className={styles.tableWrap}>
                <table className={`${shared.miniTable} ${styles.miniTable}`}>
                  <caption className="visually-hidden">Pagamentos referenciados pelas movimentações da wallet {id}</caption>
                  <thead>
                    <tr>
                      <th scope="col">Pagamento</th>
                      <th scope="col" className={styles.optional}>
                        Método
                      </th>
                      <th scope="col" className={styles.optional}>
                        Valor
                      </th>
                      <th scope="col" className={styles.optional}>
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {relations.payments.map((ref) => (
                      <tr key={ref.paymentId} data-related-payment={ref.paymentId}>
                        <td>
                          <span className={shared.cellText}>
                            {ref.payment ? (
                              <a href={paymentHref(ref.paymentId)} className={shared.rowLink} onClick={onPayments}>
                                {ref.paymentId}
                              </a>
                            ) : (
                              <span>{ref.paymentId} (não encontrado)</span>
                            )}
                            <span className={shared.rowId}>Via {ref.movementIds.join(', ')}</span>
                            {ref.payment ? (
                              <span className={styles.inline}>
                                <MethodTag method={ref.payment.method} />
                                <Money amount={ref.payment.amount} currency={ref.payment.currency} />
                                <PaymentStatusPill status={ref.payment.status} />
                              </span>
                            ) : null}
                          </span>
                        </td>
                        <td className={styles.optional}>{ref.payment ? <MethodTag method={ref.payment.method} /> : '—'}</td>
                        <td className={styles.optional}>{ref.payment ? <Money amount={ref.payment.amount} currency={ref.payment.currency} /> : '—'}</td>
                        <td className={styles.optional}>{ref.payment ? <PaymentStatusPill status={ref.payment.status} /> : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={styles.emptyLine}>
                <Info size={15} strokeWidth={1.8} aria-hidden="true" />
                Nenhum pagamento referenciado.
              </p>
            )}
          </section>

          <section className={fin.card} aria-labelledby="wal-rel-investments">
            <h3 id="wal-rel-investments" className={fin.cardTitleSm}>
              Investimentos relacionados
            </h3>
            <p className={fin.cardSubtitle}>Referência direta de uma movimentação, ou de um pagamento referenciado que aponta o investimento.</p>
            {relations.investments.length ? (
              <div className={styles.tableWrap}>
                <table className={`${shared.miniTable} ${styles.miniTable}`}>
                  <caption className="visually-hidden">Investimentos referenciados (direta ou indiretamente) pela wallet {id}</caption>
                  <thead>
                    <tr>
                      <th scope="col">Investimento</th>
                      <th scope="col" className={styles.optional}>
                        Investidor
                      </th>
                      <th scope="col" className={styles.optional}>
                        Status
                      </th>
                      <th scope="col" className={styles.optional}>
                        Relação
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {relations.investments.map((ref) => {
                      const via = ref.via.map((item) => (item.kind === 'movement' ? `movimento ${item.id}` : `pagamento ${item.id}`)).join(' · ')
                      return (
                        <tr key={ref.investmentId} data-related-investment={ref.investmentId}>
                          <td>
                            <span className={shared.cellText}>
                              {ref.investment ? (
                                <a href={investmentHref(ref.investmentId)} className={shared.rowLink} onClick={onInvestments}>
                                  {ref.investmentId}
                                </a>
                              ) : (
                                <span>{ref.investmentId} (não encontrado)</span>
                              )}
                              <span className={styles.inline}>
                                {investorName(ref.investment?.investorId) ?? '—'}
                                {ref.investment ? <InvestmentStatusPill status={ref.investment.status} /> : null}
                                <span className={styles.viaTag}>Via {via}</span>
                              </span>
                            </span>
                          </td>
                          <td className={styles.optional}>{investorName(ref.investment?.investorId) ?? '—'}</td>
                          <td className={styles.optional}>{ref.investment ? <InvestmentStatusPill status={ref.investment.status} /> : '—'}</td>
                          <td className={styles.optional}>
                            <span className={styles.viaTag}>Via {via}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={styles.emptyLine}>
                <Info size={15} strokeWidth={1.8} aria-hidden="true" />
                Nenhum investimento referenciado.
              </p>
            )}
          </section>

          <section className={fin.card} aria-labelledby="wal-rel-transfers">
            <div className={shared.cardHead}>
              <h3 id="wal-rel-transfers" className={fin.cardTitleSm}>
                Transferências
              </h3>
              <span className={shared.pendingTag}>Módulo pendente</span>
            </div>
            <p className={fin.cardSubtitle}>Referências de transferência carregadas pelas movimentações. O módulo de Transferências ainda não existe.</p>
            {relations.transfers.length ? (
              <ul className={local.transferList}>
                {relations.transfers.map((ref) => (
                  <li key={ref.transferId} data-related-transfer={ref.transferId}>
                    <span className={shared.cellText}>
                      <span className={local.movementId}>{ref.transferId}</span>
                      <span className={shared.rowId}>Via {ref.movementIds.join(', ')}</span>
                    </span>
                    <OutlineButton className={local.transferButton} onClick={() => notifyTransfer(ref.transferId)} data-transfer={ref.transferId}>
                      <ArrowLeftRight size={14} strokeWidth={1.8} aria-hidden="true" />
                      Ver transferência
                    </OutlineButton>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.emptyLine}>
                <Info size={15} strokeWidth={1.8} aria-hidden="true" />
                Nenhuma transferência referenciada.
              </p>
            )}
          </section>
        </div>
        <InfoNote>
          Somente relações explícitas entre registros do protótipo. Wallet ≠ movimentação ≠ pagamento ≠ investimento: nada é
          sincronizado ou recalculado.
        </InfoNote>
      </TabPanel>

      <TabPanel prefix={TAB_PREFIX} tab="activity" current={tab}>
        <SessionActivityCard entries={activity} emptyText="Nenhuma ação local registrada para esta wallet." />
      </TabPanel>
    </>
  )
}

/** Table cell: payment / investment references link to their modules; transfers answer with the pending notice. */
function SourceReference({ movement, onTransfer }: { movement: Readonly<WalletMovement>; onTransfer: (id: string) => void }) {
  if (!movement.sourceId) return <span className={shared.muted}>—</span>
  if (movement.sourceType === 'payment') {
    return (
      <a href={paymentHref(movement.sourceId)} className={shared.inlineLink}>
        {movement.sourceId}
      </a>
    )
  }
  if (movement.sourceType === 'investment') {
    return (
      <a href={investmentHref(movement.sourceId)} className={shared.inlineLink}>
        {movement.sourceId}
      </a>
    )
  }
  if (movement.sourceType === 'transfer') {
    const transferId = movement.sourceId
    return (
      <button type="button" className={styles.pendingButton} onClick={() => onTransfer(transferId)} aria-label={`${transferId} — módulo de Transferências pendente`}>
        {transferId}
      </button>
    )
  }
  return <span>{movement.sourceId}</span>
}

/** Inline detail actions: the responsible module, or a controlled notice. */
function MovementDestination({
  movement,
  onTransfer,
  log,
}: {
  movement: Readonly<WalletMovement>
  onTransfer: (id: string) => void
  log: (title: string, detail?: string) => void
}) {
  if (movement.sourceType === 'payment' && movement.sourceId) {
    const target = movement.sourceId
    return (
      <a href={paymentHref(target)} className={`${outline.button} ${styles.primaryLink}`} onClick={() => log('Navegação para Pagamentos / PIX solicitada', target)} data-movement-target="payment">
        Ver pagamento {target}
        <ExternalLink size={15} strokeWidth={1.8} aria-hidden="true" />
      </a>
    )
  }
  if (movement.sourceType === 'investment' && movement.sourceId) {
    const target = movement.sourceId
    return (
      <a href={investmentHref(target)} className={`${outline.button} ${styles.primaryLink}`} onClick={() => log('Navegação para Investimentos solicitada', target)} data-movement-target="investment">
        Ver investimento {target}
        <ExternalLink size={15} strokeWidth={1.8} aria-hidden="true" />
      </a>
    )
  }
  if (movement.sourceType === 'transfer' && movement.sourceId) {
    const target = movement.sourceId
    return (
      <OutlineButton className={styles.primaryLink} onClick={() => onTransfer(target)} data-movement-target="transfer">
        <ArrowLeftRight size={15} strokeWidth={1.8} aria-hidden="true" />
        Ver transferência {target}
        <span className={shared.pendingTag}>Módulo pendente</span>
      </OutlineButton>
    )
  }
  return (
    <p className={styles.emptyLine} data-movement-target="none">
      <Info size={15} strokeWidth={1.8} aria-hidden="true" />
      Origem não detalhada no protótipo — sem módulo de destino.
    </p>
  )
}
