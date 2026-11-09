import { useEffect, useState } from 'react'
import { readinessTabs } from '../../../app/presentationAvailability'
import { ChartColumn, ExternalLink, Info, QrCode, Target, UserRound, Wallet as WalletIcon } from 'lucide-react'
import outline from '../../../components/ui/OutlineButton.module.css'
import primary from '../../../components/ui/PrimaryButton.module.css'
import { Tabs } from '../../../components/ui/Tabs'
import fin from '../../finance-gateways/sections/FinanceSections.module.css'
import { BackLink, DomainNavCard, InfoNote, SessionActivityCard, type DomainNavItem } from '../../operation/shared/OperationUi'
import shared from '../../operation/shared/Operation.module.css'
import { addFinanceCoreActivity, useFinanceCoreActivity } from '../shared/financeCoreActivity'
import type { PaymentDetail } from '../shared/financeApi'
import {
  STATUS_INDEPENDENCE_NOTE,
  dateText,
  financeErrorView,
  partialReference,
  paymentMethodLabel,
  paymentTypeLabel,
  providerLabel,
  tenantNames,
} from '../shared/financePresentation'
import { investmentHref, investorProfileHref, paymentListReturnHash, paymentsHref, walletHref } from '../shared/financeRoute'
import {
  DetailHero,
  DetailStatus,
  FinanceCoreShell,
  KeyValueList,
  Money,
  PaymentStatusPill,
  RecordNotFound,
  TabPanel,
  TenantTag,
} from '../shared/FinanceCoreUi'
import { useFinanceTenants, usePaymentDetail } from '../shared/useFinanceData'
import styles from '../shared/FinanceCore.module.css'
import local from './Payments.module.css'

type Tab = 'overview' | 'pix' | 'relations' | 'activity'
const TAB_PREFIX = 'payment-detail'

/** `#/finance/payments/:paymentId` — read-only investment PIX charge from `GET /payments/:id`. */
export function PaymentDetailPage({ paymentId, returnTo }: { paymentId: string; returnTo?: string }) {
  const detail = usePaymentDetail(paymentId)
  const back = paymentListReturnHash(returnTo)
  if (detail.state.status === 'error') {
    const view = financeErrorView(detail.state.error, 'o pagamento')
    if (view.notFound) return <RecordNotFound section="payments" title="Pagamento não encontrado" id={paymentId} backHref={back} />
    return <DetailStatus section="payments" id={paymentId} error={view} onRetry={detail.reload} />
  }
  if (detail.state.status !== 'success') return <DetailStatus section="payments" id={paymentId} />
  return (
    <FinanceCoreShell section="payments" title="Pagamentos / PIX" trail={[`Pagamento ${paymentId}`]}>
      <PaymentContent payment={detail.state.data} back={back} />
    </FinanceCoreShell>
  )
}

function PartialReference({ value }: { value: string | null }) {
  const shown = partialReference(value)
  if (!shown) return <span className={shared.muted}>Não informado</span>
  return (
    <span>
      <span className={styles.mono}>{shown}</span>
      {shown !== value ? <span className={styles.partialTag}>(parcial)</span> : null}
    </span>
  )
}

function PaymentContent({ payment, back }: { payment: PaymentDetail; back: string }) {
  const tenants = useFinanceTenants()
  const tenant = tenantNames(tenants.state.status === 'success' ? tenants.state.data : null)(payment.whitelabelId)
  const id = payment.id
  const activity = useFinanceCoreActivity(`payment:${id}`)
  const [tab, setTab] = useState<Tab>('overview')
  const log = (title: string, detail?: string) => addFinanceCoreActivity(`payment:${id}`, { title, detail })

  useEffect(() => {
    addFinanceCoreActivity(`payment:${id}`, { title: 'Pagamento consultado', detail: 'Leitura do Control Plane (somente leitura)' })
  }, [id])

  function changeTab(next: Tab) {
    setTab(next)
    if (next === 'pix') log('Dados do PIX consultados', 'Referências exibidas parcialmente')
    if (next === 'relations') log('Relações consultadas', `Investimento ${payment.investmentId}`)
  }

  const navItems: DomainNavItem[] = [
    { key: 'investment', label: 'Ver investimento', description: `Investimentos — investimento ${payment.investmentId}`, icon: ChartColumn, href: investmentHref(payment.investmentId) },
    { key: 'investor', label: 'Ver investidor', description: 'Operação › Investidores — perfil do investidor', icon: UserRound, href: investorProfileHref(payment.investorId) },
    {
      key: 'investor-payments',
      label: 'Pagamentos deste investidor',
      description: `Lista filtrada pelo Control Plane — investidor #${payment.investorId}`,
      icon: QrCode,
      href: paymentsHref({ investorId: payment.investorId }),
    },
    { key: 'wallet', label: 'Wallet do Whitelabel', description: `Wallet — ${tenant} (uma wallet por Whitelabel)`, icon: WalletIcon, href: walletHref(payment.whitelabelId) },
  ]

  const tabs: { value: Tab; label: string }[] = [
    { value: 'overview', label: 'Visão geral' },
    { value: 'pix', label: 'PIX' },
    { value: 'relations', label: 'Relações' },
    { value: 'activity', label: 'Atividade da sessão' },
  ]

  return (
    <>
      <div>
        <BackLink href={back} label="Voltar para Pagamentos / PIX" />
      </div>

      <DetailHero
        monogram="PG"
        title={`Pagamento ${id}`}
        status={<PaymentStatusPill status={payment.status} />}
        meta={[
          { label: 'Valor', value: <Money cents={payment.amountCents} /> },
          { label: 'Investimento', value: <span>#{payment.investmentId}</span> },
          { label: 'Whitelabel', value: <TenantTag whitelabelId={payment.whitelabelId} name={tenant} /> },
        ]}
        actions={
          <>
            <a href={investmentHref(payment.investmentId)} className={`${outline.button} ${shared.secondaryButton}`} data-hero="investment">
              Ver investimento
              <ExternalLink size={15} strokeWidth={1.8} aria-hidden="true" />
            </a>
            <a href={investorProfileHref(payment.investorId)} className={`${outline.button} ${shared.secondaryButton}`} data-hero="investor">
              Ver investidor
              <ExternalLink size={15} strokeWidth={1.8} aria-hidden="true" />
            </a>
          </>
        }
      />

      <div className={`${fin.card} ${shared.tabsCard}`}>
        <Tabs idPrefix={TAB_PREFIX} label={`Seções do pagamento ${id}`} tabs={readinessTabs(tabs)} value={tab} onChange={changeTab} />
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
                { label: 'Status do pagamento', value: <PaymentStatusPill status={payment.status} /> },
                { label: 'Valor', value: <Money cents={payment.amountCents} /> },
                { label: 'Método', value: paymentMethodLabel(payment.paymentMethod) },
                { label: 'Tipo', value: paymentTypeLabel(payment.type) },
                { label: 'Provedor', value: providerLabel(payment.provider) },
                { label: 'Whitelabel', value: <TenantTag whitelabelId={payment.whitelabelId} name={tenant} /> },
                { label: 'Criado em', value: dateText(payment.createdAt) },
                { label: 'Atualizado em', value: dateText(payment.updatedAt) },
              ]}
            />
          </section>
          <DomainNavCard
            title="Navegação para domínios responsáveis"
            intro="Investimento, investidor e wallet pertencem a outros domínios. Daqui você só navega até eles."
            items={navItems}
          />
        </div>
        <InfoNote>
          <strong>Somente leitura.</strong> Dados de <code>GET /payments/{id}</code> — a cobrança PIX de um investimento, que não é o investimento nem a
          wallet. Nenhuma ação gera cobrança, confirma, cancela, estorna ou reprocessa pagamentos.
        </InfoNote>
      </TabPanel>

      <TabPanel prefix={TAB_PREFIX} tab="pix" current={tab}>
        <div className={local.stack}>
          <section className={fin.card} aria-labelledby="pay-pix-title">
            <h3 id="pay-pix-title" className={fin.cardTitleSm}>
              Dados do PIX
            </h3>
            <p className={fin.cardSubtitle}>Referências de transação exibidas parcialmente. Não há QR Code, chave PIX ou código copia-e-cola nesta tela.</p>
            <KeyValueList
              rows={[
                { label: 'TxID', value: <PartialReference value={payment.txid} /> },
                { label: 'End-to-end ID', value: <PartialReference value={payment.externalEndToEndId} /> },
                { label: 'Expira em', value: payment.expirationAt ? dateText(payment.expirationAt) : 'Não informado' },
                { label: 'Pago em', value: payment.paymentAt ? dateText(payment.paymentAt) : 'Sem data de pagamento' },
                { label: 'Liquidado em', value: payment.liquidationAt ? dateText(payment.liquidationAt) : 'Sem data de liquidação' },
              ]}
            />
          </section>
        </div>
        <InfoNote>Datas e referências vêm do Control Plane. Um pagamento só é considerado pago pelo próprio status do pagamento.</InfoNote>
      </TabPanel>

      <TabPanel prefix={TAB_PREFIX} tab="relations" current={tab}>
        <section className={fin.card} aria-labelledby="pay-rel-title">
          <h3 id="pay-rel-title" className={fin.cardTitleSm}>
            Relações do pagamento
          </h3>
          <p className={fin.cardSubtitle}>Identificadores informados pelo próprio pagamento — nenhuma relação é inferida.</p>
          <KeyValueList
            rows={[
              {
                label: 'Investimento',
                value: (
                  <a href={investmentHref(payment.investmentId)} className={shared.inlineLink} data-relation="investment">
                    Investimento #{payment.investmentId}
                  </a>
                ),
              },
              {
                label: 'Investidor',
                value: (
                  <a href={investorProfileHref(payment.investorId)} className={shared.inlineLink} data-relation="investor">
                    Investidor #{payment.investorId}
                  </a>
                ),
              },
              {
                label: 'Oportunidade',
                value: (
                  <span className={shared.cellText}>
                    <span>Oportunidade #{payment.opportunityId}</span>
                    <a href={paymentsHref({ opportunityId: payment.opportunityId })} className={shared.inlineLink} data-relation="opportunity-payments">
                      <Target size={13} strokeWidth={1.8} aria-hidden="true" /> Pagamentos desta oportunidade
                    </a>
                  </span>
                ),
              },
              { label: 'Whitelabel', value: <TenantTag whitelabelId={payment.whitelabelId} name={tenant} /> },
            ]}
          />
          <div className={styles.cardActions}>
            <a href={investmentHref(payment.investmentId)} className={`${primary.button} ${styles.primaryLink}`} data-view-investment>
              Ver investimento
              <ExternalLink size={15} strokeWidth={1.8} aria-hidden="true" />
            </a>
          </div>
          <p className={styles.emptyLine}>
            <Info size={15} strokeWidth={1.8} aria-hidden="true" />
            {STATUS_INDEPENDENCE_NOTE}
          </p>
        </section>
      </TabPanel>

      <TabPanel prefix={TAB_PREFIX} tab="activity" current={tab}>
        <SessionActivityCard entries={activity} emptyText="Nenhuma ação local registrada para este pagamento." />
      </TabPanel>
    </>
  )
}
