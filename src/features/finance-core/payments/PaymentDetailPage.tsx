import { useEffect, useState } from 'react'
import { ChartColumn, ExternalLink, Info, Link2, QrCode, Target, Wallet as WalletIcon } from 'lucide-react'
import { usePrototypeNotice } from '../../../components/shell/prototypeNotice'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import outline from '../../../components/ui/OutlineButton.module.css'
import primary from '../../../components/ui/PrimaryButton.module.css'
import { Tabs } from '../../../components/ui/Tabs'
import fin from '../../finance-gateways/sections/FinanceSections.module.css'
import { useOpportunities } from '../../operation/opportunities/opportunityStore'
import { BackLink, DomainNavCard, InfoNote, SessionActivityCard, WhitelabelTag, type DomainNavItem } from '../../operation/shared/OperationUi'
import shared from '../../operation/shared/Operation.module.css'
import { addFinanceCoreActivity, useFinanceCoreActivity } from '../shared/financeCoreActivity'
import {
  PAYMENT_METHOD_META,
  gatewaysHref,
  investmentHref,
  opportunityHref,
  walletHref,
  type Payment,
} from '../shared/financeCoreModel'
import { investmentById, movementsForPayment, paymentById, walletIdsOf } from '../shared/financeCoreRecords'
import { dateText, investorName, useGatewayResolver } from '../shared/financeCoreRefs'
import {
  DateStack,
  DetailHero,
  DirectionTag,
  FinanceCoreShell,
  GatewayTag,
  InvestmentStatusPill,
  KeyValueList,
  MethodTag,
  Money,
  MovementStatusPill,
  PaymentStatusPill,
  RecordNotFound,
  TabPanel,
} from '../shared/FinanceCoreUi'
import styles from '../shared/FinanceCore.module.css'
import local from './Payments.module.css'

type Tab = 'overview' | 'pix' | 'relations' | 'activity'
const TAB_PREFIX = 'payment-detail'

/** `#/finance/payments/:paymentId` — read-only payment / PIX record. */
export function PaymentDetailPage({ paymentId }: { paymentId: string }) {
  const payment = paymentById(paymentId)
  if (!payment) return <RecordNotFound section="payments" title="Pagamento não encontrado" id={paymentId} />
  return (
    <FinanceCoreShell section="payments" title="Pagamentos / PIX" trail={[payment.paymentId]}>
      <PaymentContent payment={payment} />
    </FinanceCoreShell>
  )
}

function PaymentContent({ payment }: { payment: Readonly<Payment> }) {
  const notify = usePrototypeNotice()
  const activity = useFinanceCoreActivity(payment.paymentId)
  const opportunities = useOpportunities()
  const resolveGateway = useGatewayResolver()
  const [tab, setTab] = useState<Tab>('overview')
  const id = payment.paymentId
  const gateway = resolveGateway(payment.gatewayId)
  const investment = investmentById(payment.investmentId)
  const opportunity = payment.opportunityId ? opportunities.find((item) => item.id === payment.opportunityId) : undefined
  const investor = investorName(payment.investorId)
  const movements = movementsForPayment(id)
  const walletIds = walletIdsOf(movements)
  const isPix = payment.method === 'pix'
  const gatewayDestination = gatewaysHref(payment.whitelabelId)

  const log = (title: string, detail?: string) => addFinanceCoreActivity(id, { title, detail })

  useEffect(() => {
    addFinanceCoreActivity(id, { title: 'Pagamento consultado', detail: 'Visão financeira (somente leitura)' })
  }, [id])

  function changeTab(next: Tab) {
    setTab(next)
    if (next === 'pix') log('Dados do PIX consultados', isPix ? 'Sem QR Code, payload ou chave no protótipo' : `Método ${PAYMENT_METHOD_META[payment.method].label}`)
    if (next === 'relations') log('Relações financeiras consultadas', `${investment ? 1 : 0} investimento · ${movements.length} movimentação(ões)`)
  }

  const onInvestment = () => log('Navegação para Investimentos solicitada', payment.investmentId)
  const onGateway = () => log('Navegação para Gateways e contas solicitada', `${payment.gatewayId} (sem link direto ao gateway)`)
  const onOpportunity = () => log('Navegação para Operação › Oportunidades solicitada', payment.opportunityId)
  const onWallet = (walletId: string) => log('Navegação para Wallet solicitada', walletId)
  const noInvestment = () => {
    log('Investimento sem destino', 'Pagamento sem investimento — nenhuma navegação feita')
    notify('Este pagamento não referencia um investimento no protótipo. Nenhuma navegação foi feita.')
  }
  const noOpportunity = () => {
    log('Oportunidade sem destino', 'Pagamento sem oportunidade — nenhuma navegação feita')
    notify('Este pagamento não referencia uma oportunidade no protótipo. Nenhuma navegação foi feita.')
  }
  const noWallet = () => {
    log('Wallet sem destino', 'Nenhuma movimentação referencia este pagamento — nenhuma navegação feita')
    notify('Nenhuma movimentação de wallet referencia este pagamento. Nenhuma navegação foi feita.')
  }

  const navItems: DomainNavItem[] = [
    payment.investmentId
      ? {
          key: 'investment',
          label: 'Ver investimento',
          description: `Investimentos — ${payment.investmentId}`,
          icon: ChartColumn,
          href: investmentHref(payment.investmentId),
          onSelect: onInvestment,
        }
      : { key: 'investment', label: 'Ver investimento', description: 'Pagamento sem investimento vinculado', icon: ChartColumn, onSelect: noInvestment },
    {
      key: 'gateway',
      label: 'Ver gateway',
      description: `Gateways e contas de ${gateway ? gateway.name : payment.gatewayId} (Whitelabel do pagamento)`,
      icon: Link2,
      href: gatewayDestination,
      onSelect: onGateway,
    },
    payment.opportunityId
      ? {
          key: 'opportunity',
          label: 'Ver oportunidade',
          description: 'Operação › Oportunidades — origem do investimento',
          icon: Target,
          href: opportunityHref(payment.opportunityId),
          onSelect: onOpportunity,
        }
      : { key: 'opportunity', label: 'Ver oportunidade', description: 'Pagamento sem oportunidade referenciada', icon: Target, onSelect: noOpportunity },
    walletIds.length
      ? {
          key: 'wallet',
          label: 'Ver na Wallet',
          description: `Wallet — ${walletIds.join(', ')}`,
          icon: WalletIcon,
          href: walletHref(walletIds[0]),
          onSelect: () => onWallet(walletIds[0]),
        }
      : { key: 'wallet', label: 'Ver na Wallet', description: 'Nenhuma movimentação referencia este pagamento', icon: WalletIcon, onSelect: noWallet },
  ]

  const tabs: { value: Tab; label: string }[] = [
    { value: 'overview', label: 'Visão geral' },
    { value: 'pix', label: 'PIX' },
    { value: 'relations', label: 'Relações financeiras' },
    { value: 'activity', label: 'Atividade da sessão' },
  ]

  const investmentCard = (
    <section className={fin.card} aria-labelledby={`pay-inv-title-${tab}`}>
      <h3 id={`pay-inv-title-${tab}`} className={fin.cardTitleSm}>
        Investimento relacionado
      </h3>
      {payment.investmentId ? (
        <>
          <KeyValueList
            rows={[
              { label: 'Investimento', value: payment.investmentId },
              { label: 'Investidor', value: investorName(investment?.investorId) ?? '—' },
              {
                label: 'Oportunidade',
                value: investment ? opportunities.find((item) => item.id === investment.opportunityId)?.name ?? investment.opportunityId : '—',
              },
              {
                label: 'Status do investimento',
                value: investment ? <InvestmentStatusPill status={investment.status} /> : 'Investimento não encontrado',
              },
            ]}
          />
          <div className={styles.cardActions}>
            <a href={investmentHref(payment.investmentId)} className={`${outline.button} ${styles.primaryLink}`} onClick={onInvestment} data-view-investment>
              Ver investimento
              <ExternalLink size={15} strokeWidth={1.8} aria-hidden="true" />
            </a>
          </div>
        </>
      ) : (
        <p className={styles.emptyLine} data-empty="investment">
          <Info size={15} strokeWidth={1.8} aria-hidden="true" />
          Este pagamento não referencia um investimento. Pagamentos podem existir sem investimento neste protótipo.
        </p>
      )}
    </section>
  )

  const movementsCard = (detailed: boolean) => (
    <section className={fin.card} aria-labelledby={`pay-mov-title-${tab}`}>
      <h3 id={`pay-mov-title-${tab}`} className={fin.cardTitleSm}>
        Movimentações de wallet
      </h3>
      <p className={fin.cardSubtitle}>Movimentações cuja origem explícita é este pagamento — nenhum saldo é calculado.</p>
      {movements.length ? (
        <div className={styles.tableWrap}>
          <table className={`${shared.miniTable} ${styles.miniTable}`}>
            <caption className="visually-hidden">Movimentações de wallet que referenciam o pagamento {id}</caption>
            <thead>
              <tr>
                <th scope="col">Movimento</th>
                {detailed ? (
                  <th scope="col" className={styles.optional}>
                    Natureza
                  </th>
                ) : null}
                <th scope="col" className={styles.optional}>
                  Descrição
                </th>
                {detailed ? (
                  <th scope="col" className={styles.optional}>
                    Valor
                  </th>
                ) : null}
                <th scope="col" className={styles.optional}>
                  Status
                </th>
                <th scope="col" className={styles.optional}>
                  Data
                </th>
              </tr>
            </thead>
            <tbody>
              {movements.map((movement) => (
                <tr key={movement.movementId} data-movement={movement.movementId}>
                  <td>
                    <span className={shared.cellText}>
                      <a href={walletHref(movement.walletId, movement.movementId)} className={shared.rowLink} onClick={() => onWallet(movement.walletId)}>
                        {movement.movementId}
                      </a>
                      <span className={shared.rowId}>Wallet {movement.walletId}</span>
                      <span className={styles.inline}>
                        {detailed ? <DirectionTag direction={movement.direction} /> : null}
                        {detailed ? <Money amount={movement.amount} currency={movement.currency} /> : null}
                        <MovementStatusPill status={movement.status} />
                        <span>{movement.description}</span>
                        <span>{dateText(movement.createdAt)}</span>
                      </span>
                    </span>
                  </td>
                  {detailed ? (
                    <td className={styles.optional}>
                      <DirectionTag direction={movement.direction} />
                    </td>
                  ) : null}
                  <td className={styles.optional}>{movement.description}</td>
                  {detailed ? (
                    <td className={styles.optional}>
                      <Money amount={movement.amount} currency={movement.currency} />
                    </td>
                  ) : null}
                  <td className={styles.optional}>
                    <MovementStatusPill status={movement.status} />
                  </td>
                  <td className={styles.optional}>
                    <DateStack iso={movement.createdAt} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className={styles.emptyLine} data-empty="movements">
          <Info size={15} strokeWidth={1.8} aria-hidden="true" />
          Nenhuma movimentação de wallet referencia este pagamento.
        </p>
      )}
      {walletIds.length ? (
        <div className={styles.cardActions}>
          <a href={walletHref(walletIds[0])} className={`${outline.button} ${styles.primaryLink}`} onClick={() => onWallet(walletIds[0])} data-view-wallet>
            Ver na Wallet {walletIds[0]}
            <ExternalLink size={15} strokeWidth={1.8} aria-hidden="true" />
          </a>
        </div>
      ) : null}
    </section>
  )

  return (
    <>
      <div>
        <BackLink href="#/finance/payments" label="Voltar para Pagamentos / PIX" />
      </div>

      <DetailHero
        monogram="PG"
        title={`Pagamento ${id}`}
        status={<PaymentStatusPill status={payment.status} />}
        meta={[
          { label: 'Método', value: <MethodTag method={payment.method} /> },
          { label: 'Gateway', value: gateway?.name ?? `${payment.gatewayId} (não encontrado)` },
          { label: 'Whitelabel', value: <WhitelabelTag whitelabelId={payment.whitelabelId} /> },
          { label: 'Investimento', value: payment.investmentId ?? 'Sem investimento' },
        ]}
        actions={
          <>
            {payment.investmentId ? (
              <a href={investmentHref(payment.investmentId)} className={`${outline.button} ${shared.secondaryButton}`} onClick={onInvestment} data-hero="investment">
                Ver investimento
                <ExternalLink size={15} strokeWidth={1.8} aria-hidden="true" />
              </a>
            ) : (
              <OutlineButton className={shared.secondaryButton} onClick={noInvestment} data-hero="investment">
                Ver investimento
              </OutlineButton>
            )}
            <a href={gatewayDestination} className={`${outline.button} ${shared.secondaryButton}`} onClick={onGateway} data-hero="gateway">
              <Link2 size={15} strokeWidth={1.8} aria-hidden="true" />
              Ver gateway
            </a>
          </>
        }
      />

      <div className={`${fin.card} ${shared.tabsCard}`}>
        <Tabs idPrefix={TAB_PREFIX} label={`Seções do pagamento ${id}`} tabs={tabs} value={tab} onChange={changeTab} />
      </div>

      <TabPanel prefix={TAB_PREFIX} tab="overview" current={tab}>
        <div className={shared.panelGrid}>
          <section className={fin.card} aria-labelledby="pay-info-title">
            <h3 id="pay-info-title" className={fin.cardTitleSm}>
              Informações principais
            </h3>
            <KeyValueList
              rows={[
                { label: 'ID do pagamento', value: id },
                { label: 'Investimento', value: payment.investmentId ?? 'Sem investimento vinculado' },
                { label: 'Investidor', value: investor ?? (payment.investorId ? `${payment.investorId} (não encontrado)` : 'Não informado') },
                {
                  label: 'Oportunidade',
                  value: opportunity?.name ?? (payment.opportunityId ? `${payment.opportunityId} (não encontrada)` : 'Não informada'),
                },
                { label: 'Whitelabel', value: <WhitelabelTag whitelabelId={payment.whitelabelId} /> },
                { label: 'Gateway', value: <GatewayTag gateway={gateway} gatewayId={payment.gatewayId} /> },
                { label: 'Método', value: <MethodTag method={payment.method} /> },
                { label: 'Valor', value: <Money amount={payment.amount} currency={payment.currency} /> },
                { label: 'Status', value: <PaymentStatusPill status={payment.status} /> },
                { label: 'Referência externa', value: payment.externalReference ?? '—' },
                { label: 'Criado em', value: dateText(payment.createdAt) },
                { label: 'Atualizado em', value: dateText(payment.updatedAt) },
                { label: 'Pago em', value: dateText(payment.paidAt) },
              ]}
            />
          </section>
          <DomainNavCard
            title="Navegação para domínios responsáveis"
            intro="Investimento, gateway, oportunidade e wallet pertencem a outros módulos. Daqui você só navega até eles."
            items={navItems}
          />
        </div>
        <InfoNote>
          <strong>Pagamentos / PIX V1 é um módulo de supervisão financeira.</strong> Geração de cobrança, confirmação, liquidação,
          cancelamento, estorno e reprocessamento permanecem fora deste módulo. Nada aqui chama um gateway ou banco.
        </InfoNote>
      </TabPanel>

      <TabPanel prefix={TAB_PREFIX} tab="pix" current={tab}>
        <div className={shared.panelGrid}>
          <section className={fin.card} aria-labelledby="pay-pix-title">
            <h3 id="pay-pix-title" className={fin.cardTitleSm}>
              Dados do PIX
            </h3>
            {isPix ? (
              <KeyValueList
                rows={[
                  { label: 'Método', value: <MethodTag method={payment.method} /> },
                  { label: 'Identificador da cobrança', value: payment.pixChargeId ?? '—' },
                  { label: 'TxID / referência PIX', value: payment.pixReference ?? '—' },
                  { label: 'Status PIX', value: <PaymentStatusPill status={payment.status} /> },
                  { label: 'Gateway', value: <GatewayTag gateway={gateway} gatewayId={payment.gatewayId} /> },
                  { label: 'Criado em', value: dateText(payment.createdAt) },
                  { label: 'Atualizado em', value: dateText(payment.updatedAt) },
                  { label: 'Pago em', value: dateText(payment.paidAt) },
                ]}
              />
            ) : (
              <>
                <KeyValueList
                  rows={[
                    { label: 'Método', value: <MethodTag method={payment.method} /> },
                    { label: 'Gateway', value: <GatewayTag gateway={gateway} gatewayId={payment.gatewayId} /> },
                  ]}
                />
                <p className={styles.emptyLine} data-empty="pix">
                  <Info size={15} strokeWidth={1.8} aria-hidden="true" />
                  Este pagamento usa {PAYMENT_METHOD_META[payment.method].label}: não há dados de PIX para exibir.
                </p>
              </>
            )}
            {isPix ? (
              <div className={local.qrPlaceholder} role="note" data-qr-placeholder>
                <QrCode size={30} strokeWidth={1.4} aria-hidden="true" />
                <span>QR Code não disponível no protótipo.</span>
              </div>
            ) : null}
            <div className={styles.cardActions}>
              <a href={gatewayDestination} className={`${primary.button} ${styles.primaryLink}`} onClick={onGateway} data-view-gateway>
                Ver gateway
                <ExternalLink size={15} strokeWidth={1.8} aria-hidden="true" />
              </a>
            </div>
          </section>
          <div className={local.stack}>
            {investmentCard}
            {movementsCard(false)}
          </div>
        </div>
        <InfoNote>
          Identificadores de cobrança e TxID são valores fictícios do protótipo. Não existe payload, código copia-e-cola, chave PIX, QR
          Code pagável ou link de pagamento; no protótipo, o status PIX é o próprio status do pagamento.
        </InfoNote>
      </TabPanel>

      <TabPanel prefix={TAB_PREFIX} tab="relations" current={tab}>
        <div className={shared.panelGrid}>
          {investmentCard}
          {movementsCard(true)}
        </div>
        <InfoNote>
          Pagamento ≠ investimento ≠ movimentação de wallet. As relações existem apenas porque os registros se referenciam
          explicitamente; nenhum status ou valor é sincronizado.
        </InfoNote>
      </TabPanel>

      <TabPanel prefix={TAB_PREFIX} tab="activity" current={tab}>
        <SessionActivityCard entries={activity} emptyText="Nenhuma ação local registrada para este pagamento." />
      </TabPanel>
    </>
  )
}
