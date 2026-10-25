import { useState } from 'react'
import { readinessTabs } from '../../../app/presentationAvailability'
import { ArrowLeftRight, ChartColumn, ExternalLink, Info, QrCode, Target, UserRound, Wallet as WalletIcon } from 'lucide-react'
import { useNotice } from '../../../components/shell/notice'
import outline from '../../../components/ui/OutlineButton.module.css'
import primary from '../../../components/ui/PrimaryButton.module.css'
import { Tabs } from '../../../components/ui/Tabs'
import fin from '../../finance-gateways/sections/FinanceSections.module.css'
import { BackLink, DomainNavCard, InfoNote, type DomainNavItem } from '../../operation/shared/OperationUi'
import shared from '../../operation/shared/Operation.module.css'
import type { InvestmentDetail } from '../shared/financeApi'
import { STATUS_INDEPENDENCE_NOTE, dateText, financeErrorView, providerLabel, tenantNames } from '../shared/financePresentation'
import {
  investmentListReturnHash,
  investmentsHref,
  investorProfileHref,
  paymentHref,
  walletHref,
} from '../shared/financeRoute'
import {
  DetailHero,
  DetailStatus,
  FinanceCoreShell,
  InvestmentStatusPill,
  KeyValueList,
  Money,
  PaymentStatusPill,
  RecordNotFound,
  TabPanel,
  TenantTag,
} from '../shared/FinanceCoreUi'
import { useFinanceTenants, useInvestmentDetail } from '../shared/useFinanceData'
import styles from '../shared/FinanceCore.module.css'

type Tab = 'overview' | 'payment' | 'wallet'
const TAB_PREFIX = 'investment-detail'

/** `#/finance/investments/:investmentId` — read-only investment from `GET /investments/:id`. */
export function InvestmentDetailPage({ investmentId, returnTo }: { investmentId: string; returnTo?: string }) {
  const detail = useInvestmentDetail(investmentId)
  const back = investmentListReturnHash(returnTo)
  if (detail.state.status === 'error') {
    const view = financeErrorView(detail.state.error, 'o investimento')
    if (view.notFound) return <RecordNotFound section="investments" title="Investimento não encontrado" id={investmentId} backHref={back} />
    return <DetailStatus section="investments" id={investmentId} error={view} onRetry={detail.reload} />
  }
  if (detail.state.status !== 'success') return <DetailStatus section="investments" id={investmentId} />
  return (
    <FinanceCoreShell section="investments" title="Investimentos" trail={[`Investimento ${investmentId}`]}>
      <InvestmentContent investment={detail.state.data} back={back} />
    </FinanceCoreShell>
  )
}

function InvestmentContent({ investment, back }: { investment: InvestmentDetail; back: string }) {
  const notify = useNotice()
  const tenants = useFinanceTenants()
  const tenant = tenantNames(tenants.state.status === 'success' ? tenants.state.data : null)(investment.whitelabelId)
  const id = investment.id
  const [tab, setTab] = useState<Tab>('overview')
  const investorLabel = investment.investor?.fullName ?? `Investidor #${investment.investorId}`
  const opportunityLabel = investment.opportunity?.name ?? `Oportunidade #${investment.opportunityId}`
  const payment = investment.payment


  function changeTab(next: Tab) {
    setTab(next)
  }

  const noPayment = () => {
    notify('O Control Plane não registra pagamento para este investimento. Nenhuma navegação foi feita.')
  }

  const walletOverview = walletHref(investment.whitelabelId)
  const walletMovements = walletHref(investment.whitelabelId, { tab: 'movimentacoes', opportunityId: investment.opportunityId })

  const navItems: DomainNavItem[] = [
    { key: 'investor', label: 'Ver investidor', description: 'Operação › Investidores — perfil do investidor', icon: UserRound, href: investorProfileHref(investment.investorId) },
    {
      key: 'investor-investments',
      label: 'Investimentos deste investidor',
      description: `Lista filtrada pelo Control Plane — investidor #${investment.investorId}`,
      icon: ChartColumn,
      href: investmentsHref({ investorId: investment.investorId }),
    },
    {
      key: 'opportunity-investments',
      label: 'Investimentos desta oportunidade',
      description: `Lista filtrada pelo Control Plane — oportunidade #${investment.opportunityId}`,
      icon: Target,
      href: investmentsHref({ opportunityId: investment.opportunityId }),
    },
    payment
      ? { key: 'payment', label: 'Ver pagamento / PIX', description: `Pagamentos / PIX — pagamento ${payment.id}`, icon: QrCode, href: paymentHref(payment.id) }
      : { key: 'payment', label: 'Ver pagamento / PIX', description: 'Nenhum pagamento registrado para este investimento', icon: QrCode, onSelect: noPayment },
    { key: 'wallet', label: 'Wallet do Whitelabel', description: `Wallet — ${tenant} (uma wallet por Whitelabel)`, icon: WalletIcon, href: walletOverview },
  ]

  const tabs: { value: Tab; label: string }[] = [
    { value: 'overview', label: 'Visão geral' },
    { value: 'payment', label: 'Pagamento / PIX' },
    { value: 'wallet', label: 'Wallet do Whitelabel' },
  ]

  return (
    <>
      <div>
        <BackLink href={back} label="Voltar para Investimentos" />
      </div>

      <DetailHero
        monogram="INV"
        title={`Investimento ${id}`}
        status={<InvestmentStatusPill status={investment.status} />}
        meta={[
          {
            label: 'Investidor',
            value: (
              <>
                <UserRound size={15} strokeWidth={1.8} aria-hidden="true" />
                {investorLabel} <span className={shared.heroId}>#{investment.investorId}</span>
              </>
            ),
          },
          {
            label: 'Oportunidade',
            value: (
              <>
                <Target size={15} strokeWidth={1.8} aria-hidden="true" />
                {opportunityLabel} <span className={shared.heroId}>#{investment.opportunityId}</span>
              </>
            ),
          },
          { label: 'Whitelabel', value: <TenantTag whitelabelId={investment.whitelabelId} name={tenant} /> },
        ]}
        actions={
          <>
            <a href={investorProfileHref(investment.investorId)} className={`${outline.button} ${shared.secondaryButton}`} data-hero="investor">
              Ver investidor
              <ExternalLink size={15} strokeWidth={1.8} aria-hidden="true" />
            </a>
            {payment ? (
              <a href={paymentHref(payment.id)} className={`${outline.button} ${shared.secondaryButton}`} data-hero="payment">
                Ver pagamento
                <ExternalLink size={15} strokeWidth={1.8} aria-hidden="true" />
              </a>
            ) : null}
          </>
        }
      />

      <div className={`${fin.card} ${shared.tabsCard}`}>
        <Tabs idPrefix={TAB_PREFIX} label={`Seções do investimento ${id}`} tabs={readinessTabs(tabs)} value={tab} onChange={changeTab} />
      </div>

      <TabPanel prefix={TAB_PREFIX} tab="overview" current={tab}>
        <div className={shared.panelGrid}>
          <section className={fin.card} aria-labelledby="inv-info-title">
            <h3 id="inv-info-title" className={fin.cardTitleSm}>
              Informações principais
            </h3>
            <KeyValueList
              rows={[
                { label: 'ID do investimento', value: id },
                { label: 'Investidor', value: investment.investor ? `${investorLabel} (#${investment.investorId})` : `#${investment.investorId} (dados não retornados)` },
                { label: 'E-mail do investidor', value: investment.investor?.email ?? 'Não informado' },
                { label: 'Oportunidade', value: `${opportunityLabel}${investment.opportunity?.name ? ` (#${investment.opportunityId})` : ''}` },
                { label: 'Whitelabel', value: <TenantTag whitelabelId={investment.whitelabelId} name={tenant} /> },
                { label: 'Valor do investimento', value: <Money cents={investment.amountCents} /> },
                { label: 'Cotas', value: investment.quoteQuantity ?? 'Não informado' },
                { label: 'Status do investimento', value: <InvestmentStatusPill status={investment.status} /> },
                { label: 'Investimento anônimo', value: investment.anonymous === null ? 'Não informado' : investment.anonymous ? 'Sim' : 'Não' },
                { label: 'Aceite de risco', value: investment.riskAcceptanceAt ? dateText(investment.riskAcceptanceAt) : 'Não registrado' },
                { label: 'Criado em', value: dateText(investment.createdAt) },
                { label: 'Atualizado em', value: dateText(investment.updatedAt) },
              ]}
            />
            {investment.amountCents === null ? (
              <p className={shared.callout} style={{ marginTop: 12 }} data-amount-unavailable>
                <Info size={15} strokeWidth={1.8} aria-hidden="true" />
                <span>O Control Plane não informa valor para este investimento (comum em investimentos com falha). Isso não é um valor de R$ 0,00.</span>
              </p>
            ) : null}
          </section>
          <DomainNavCard
            title="Navegação para domínios responsáveis"
            intro="Investidor, pagamento e wallet pertencem a outros domínios. Daqui você só navega até eles."
            items={navItems}
          />
        </div>
        <InfoNote>
          <strong>Somente leitura.</strong> Dados de <code>GET /investments/{id}</code>. A existência de um investimento não indica que ele foi pago:
          o pagamento tem domínio e status próprios. Nenhuma ação cria, edita, confirma, liquida, cancela ou estorna investimentos.
        </InfoNote>
      </TabPanel>

      <TabPanel prefix={TAB_PREFIX} tab="payment" current={tab}>
        <section className={fin.card} aria-labelledby="inv-payment-title">
          <h3 id="inv-payment-title" className={fin.cardTitleSm}>
            Pagamento registrado
          </h3>
          <p className={fin.cardSubtitle}>Resumo do pagamento retornado com o investimento — somente leitura.</p>
          {payment ? (
            <>
              <KeyValueList
                rows={[
                  { label: 'Pagamento', value: payment.id },
                  { label: 'Status do pagamento', value: <PaymentStatusPill status={payment.status} /> },
                  { label: 'Provedor', value: providerLabel(payment.provider) },
                  { label: 'Valor do pagamento', value: <Money cents={payment.amountCents} /> },
                  { label: 'Pago em', value: payment.paymentAt ? dateText(payment.paymentAt) : 'Sem data de pagamento' },
                ]}
              />
              <div className={styles.cardActions}>
                <a href={paymentHref(payment.id)} className={`${primary.button} ${styles.primaryLink}`} data-view-payment>
                  Ver em Pagamentos / PIX
                  <ExternalLink size={15} strokeWidth={1.8} aria-hidden="true" />
                </a>
              </div>
            </>
          ) : (
            <p className={styles.emptyLine} data-empty="payment">
              <Info size={15} strokeWidth={1.8} aria-hidden="true" />
              Nenhum pagamento registrado para este investimento no Control Plane.
            </p>
          )}
        </section>
        <InfoNote>{STATUS_INDEPENDENCE_NOTE}</InfoNote>
      </TabPanel>

      <TabPanel prefix={TAB_PREFIX} tab="wallet" current={tab}>
        <section className={fin.card} aria-labelledby="inv-wallet-title">
          <h3 id="inv-wallet-title" className={fin.cardTitleSm}>
            Wallet do Whitelabel
          </h3>
          <p className={fin.cardSubtitle}>
            O contrato define uma wallet por Whitelabel (o ID da wallet é o ID do Whitelabel). O saldo e o histórico do ledger ficam nela; nada é
            calculado a partir deste investimento.
          </p>
          <KeyValueList
            rows={[
              { label: 'Whitelabel', value: <TenantTag whitelabelId={investment.whitelabelId} name={tenant} /> },
              { label: 'Wallet', value: `Wallet ${investment.whitelabelId}` },
            ]}
          />
          <div className={styles.cardActions}>
            <a href={walletOverview} className={`${primary.button} ${styles.primaryLink}`} data-view-wallet>
              Ver wallet
              <ExternalLink size={15} strokeWidth={1.8} aria-hidden="true" />
            </a>
            <a href={walletMovements} className={`${outline.button} ${styles.primaryLink}`} data-view-wallet-movements>
              <ArrowLeftRight size={15} strokeWidth={1.8} aria-hidden="true" />
              Movimentações desta oportunidade
            </a>
          </div>
        </section>
        <InfoNote>
          As movimentações referenciam investimentos no campo de referência, mas o contrato não oferece filtro por investimento: a wallet filtra
          apenas por tipo, categoria e oportunidade.
        </InfoNote>
      </TabPanel>

    </>
  )
}
