import { useEffect, useState } from 'react'
import { ExternalLink, Info, QrCode, Target, UserRound, Wallet as WalletIcon } from 'lucide-react'
import { usePrototypeNotice } from '../../../components/shell/prototypeNotice'
import outline from '../../../components/ui/OutlineButton.module.css'
import primary from '../../../components/ui/PrimaryButton.module.css'
import { Tabs } from '../../../components/ui/Tabs'
import fin from '../../finance-gateways/sections/FinanceSections.module.css'
import { modalityMeta } from '../../finance-modalities/modalitiesModel'
import { useOpportunities } from '../../operation/opportunities/opportunityStore'
import { ModalityChip } from '../../operation/opportunities/OpportunityParts'
import { whitelabelName } from '../../operation/shared/operationModel'
import { BackLink, DomainNavCard, InfoNote, SessionActivityCard, WhitelabelTag, type DomainNavItem } from '../../operation/shared/OperationUi'
import shared from '../../operation/shared/Operation.module.css'
import { addFinanceCoreActivity, useFinanceCoreActivity } from '../shared/financeCoreActivity'
import {
  investorHref,
  opportunityHref,
  paymentHref,
  walletHref,
  type Investment,
} from '../shared/financeCoreModel'
import { investmentById, movementsForInvestment, paymentById, walletIdsOf } from '../shared/financeCoreRecords'
import { dateText, investorName } from '../shared/financeCoreRefs'
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
} from '../shared/FinanceCoreUi'
import styles from '../shared/FinanceCore.module.css'

type Tab = 'overview' | 'payment' | 'wallet' | 'activity'
const TAB_PREFIX = 'investment-detail'

/** `#/finance/investments/:investmentId` — read-only investment record. */
export function InvestmentDetailPage({ investmentId }: { investmentId: string }) {
  const investment = investmentById(investmentId)
  if (!investment) return <RecordNotFound section="investments" title="Investimento não encontrado" id={investmentId} />
  return (
    <FinanceCoreShell section="investments" title="Investimentos" trail={[investment.investmentId]}>
      <InvestmentContent investment={investment} />
    </FinanceCoreShell>
  )
}

function InvestmentContent({ investment }: { investment: Readonly<Investment> }) {
  const notify = usePrototypeNotice()
  const activity = useFinanceCoreActivity(investment.investmentId)
  const opportunities = useOpportunities()
  const [tab, setTab] = useState<Tab>('overview')
  const id = investment.investmentId
  const opportunity = opportunities.find((item) => item.id === investment.opportunityId)
  const payment = paymentById(investment.paymentId)
  const related = movementsForInvestment(investment)
  const viaPayment = related.filter((item) => item.via === 'payment')
  const walletIds = walletIdsOf(related.map((item) => item.movement))
  const investor = investorName(investment.investorId)

  const log = (title: string, detail?: string) => addFinanceCoreActivity(id, { title, detail })

  useEffect(() => {
    addFinanceCoreActivity(id, { title: 'Investimento consultado', detail: 'Visão financeira (somente leitura)' })
  }, [id])

  function changeTab(next: Tab) {
    setTab(next)
    if (next === 'payment') log('Pagamento / PIX consultado', payment ? payment.paymentId : 'Sem pagamento vinculado')
    if (next === 'wallet') log('Wallet / movimentações consultadas', `${related.length} referência(s) explícita(s)`)
  }

  const onInvestor = () => log('Navegação para Operação › Investidores solicitada', investment.investorId)
  const onOpportunity = () => log('Navegação para Operação › Oportunidades solicitada', investment.opportunityId)
  const onPayment = () => log('Navegação para Pagamentos / PIX solicitada', investment.paymentId)
  const onWallet = (walletId: string) => log('Navegação para Wallet solicitada', walletId)
  const noPayment = () => {
    log('Pagamento / PIX sem destino', 'Nenhum pagamento referenciado — nenhuma navegação feita')
    notify('Este investimento não referencia nenhum pagamento no protótipo. Nenhuma navegação foi feita.')
  }
  const noWallet = () => {
    log('Wallet sem destino', 'Nenhuma movimentação referencia este investimento — nenhuma navegação feita')
    notify('Nenhuma movimentação de wallet referencia este investimento ou o pagamento dele. Nenhuma navegação foi feita.')
  }

  const navItems: DomainNavItem[] = [
    {
      key: 'investor',
      label: 'Ver investidor',
      description: 'Operação › Investidores — perfil do investidor',
      icon: UserRound,
      href: investorHref(investment.investorId),
      onSelect: onInvestor,
    },
    {
      key: 'opportunity',
      label: 'Ver oportunidade',
      description: 'Operação › Oportunidades — detalhes da oportunidade',
      icon: Target,
      href: opportunityHref(investment.opportunityId),
      onSelect: onOpportunity,
    },
    payment
      ? {
          key: 'payment',
          label: 'Ver pagamento / PIX',
          description: `Pagamentos / PIX — ${payment.paymentId}`,
          icon: QrCode,
          href: paymentHref(payment.paymentId),
          onSelect: onPayment,
        }
      : {
          key: 'payment',
          label: 'Ver pagamento / PIX',
          description: 'Nenhum pagamento referenciado por este investimento',
          icon: QrCode,
          onSelect: noPayment,
        },
    walletIds.length
      ? {
          key: 'wallet',
          label: 'Ver Wallet',
          description: `Wallet — ${walletIds.join(', ')}`,
          icon: WalletIcon,
          href: walletHref(walletIds[0]),
          onSelect: () => onWallet(walletIds[0]),
        }
      : {
          key: 'wallet',
          label: 'Ver Wallet',
          description: 'Nenhuma movimentação referencia este investimento',
          icon: WalletIcon,
          onSelect: noWallet,
        },
  ]

  const tabs: { value: Tab; label: string }[] = [
    { value: 'overview', label: 'Visão geral' },
    { value: 'payment', label: 'Pagamento / PIX' },
    { value: 'wallet', label: 'Wallet / Movimentações' },
    { value: 'activity', label: 'Atividade da sessão' },
  ]

  const opportunityMismatch: string[] = []
  if (opportunity && opportunity.whitelabelId !== investment.whitelabelId) {
    opportunityMismatch.push(`a oportunidade está hoje em ${whitelabelName(opportunity.whitelabelId)}`)
  }
  if (opportunity && opportunity.modality !== investment.modality) {
    opportunityMismatch.push(`a oportunidade está hoje como ${modalityMeta(opportunity.modality).name}`)
  }

  return (
    <>
      <div>
        <BackLink href="#/finance/investments" label="Voltar para Investimentos" />
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
                {investor ?? 'Investidor não encontrado'} <span className={shared.heroId}>{investment.investorId}</span>
              </>
            ),
          },
          {
            label: 'Oportunidade',
            value: (
              <>
                <Target size={15} strokeWidth={1.8} aria-hidden="true" />
                {opportunity?.name ?? 'Oportunidade não encontrada'} <span className={shared.heroId}>{investment.opportunityId}</span>
              </>
            ),
          },
          { label: 'Whitelabel', value: <WhitelabelTag whitelabelId={investment.whitelabelId} /> },
        ]}
        actions={
          <>
            <a href={investorHref(investment.investorId)} className={`${outline.button} ${shared.secondaryButton}`} onClick={onInvestor} data-hero="investor">
              Ver investidor
              <ExternalLink size={15} strokeWidth={1.8} aria-hidden="true" />
            </a>
            <a
              href={opportunityHref(investment.opportunityId)}
              className={`${outline.button} ${shared.secondaryButton}`}
              onClick={onOpportunity}
              data-hero="opportunity"
            >
              Ver oportunidade
              <ExternalLink size={15} strokeWidth={1.8} aria-hidden="true" />
            </a>
          </>
        }
      />

      <div className={`${fin.card} ${shared.tabsCard}`}>
        <Tabs idPrefix={TAB_PREFIX} label={`Seções do investimento ${id}`} tabs={tabs} value={tab} onChange={changeTab} />
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
                { label: 'Investidor', value: investor ?? `${investment.investorId} (não encontrado)` },
                { label: 'Oportunidade', value: opportunity?.name ?? `${investment.opportunityId} (não encontrada)` },
                { label: 'Whitelabel', value: <WhitelabelTag whitelabelId={investment.whitelabelId} /> },
                { label: 'Modalidade', value: <ModalityChip modality={investment.modality} /> },
                { label: 'Valor do investimento', value: <Money amount={investment.amount} currency={investment.currency} /> },
                { label: 'Status do investimento', value: <InvestmentStatusPill status={investment.status} /> },
                {
                  label: 'Pagamento',
                  value: payment ? (
                    <>
                      {payment.paymentId}
                      <PaymentStatusPill status={payment.status} />
                    </>
                  ) : (
                    'Sem pagamento vinculado'
                  ),
                },
                { label: 'Criado em', value: dateText(investment.createdAt) },
                { label: 'Atualizado em', value: dateText(investment.updatedAt) },
              ]}
            />
            {opportunityMismatch.length ? (
              <p className={shared.callout} style={{ marginTop: 12 }} data-mismatch>
                <Info size={15} strokeWidth={1.8} aria-hidden="true" />
                <span>
                  Em Operação, {opportunityMismatch.join(' e ')}. O investimento mantém o próprio registro — nada é sincronizado
                  automaticamente.
                </span>
              </p>
            ) : null}
          </section>
          <DomainNavCard
            title="Navegação para domínios responsáveis"
            intro="Investidor, oportunidade, pagamento e wallet pertencem a outros módulos. Daqui você só navega até eles."
            items={navItems}
          />
        </div>
        <InfoNote>
          <strong>Investimentos V1 é um módulo de supervisão financeira.</strong> Pagamentos / PIX e Wallet permanecem nos módulos
          responsáveis de Financeiro. Nenhuma ação cria, edita, confirma, liquida, cancela ou estorna investimentos.
        </InfoNote>
      </TabPanel>

      <TabPanel prefix={TAB_PREFIX} tab="payment" current={tab}>
        <div className={shared.panelGrid}>
          <section className={fin.card} aria-labelledby="inv-payment-title">
            <h3 id="inv-payment-title" className={fin.cardTitleSm}>
              Resumo do pagamento
            </h3>
            <p className={fin.cardSubtitle}>Registro de Pagamentos / PIX referenciado por este investimento — somente leitura.</p>
            {payment ? (
              <>
                <KeyValueList
                  rows={[
                    { label: 'Pagamento', value: payment.paymentId },
                    { label: 'Método', value: <MethodTag method={payment.method} /> },
                    { label: 'Status do pagamento', value: <PaymentStatusPill status={payment.status} /> },
                    { label: 'Valor relacionado', value: <Money amount={payment.amount} currency={payment.currency} /> },
                    { label: 'Criado em', value: dateText(payment.createdAt) },
                    { label: 'Atualizado em', value: dateText(payment.updatedAt) },
                  ]}
                />
                <div className={styles.cardActions}>
                  <a href={paymentHref(payment.paymentId)} className={`${primary.button} ${styles.primaryLink}`} onClick={onPayment} data-view-payment>
                    Ver em Pagamentos / PIX
                    <ExternalLink size={15} strokeWidth={1.8} aria-hidden="true" />
                  </a>
                </div>
              </>
            ) : (
              <p className={styles.emptyLine} data-empty="payment">
                <Info size={15} strokeWidth={1.8} aria-hidden="true" />
                {investment.paymentId
                  ? `O pagamento ${investment.paymentId} referenciado não foi encontrado em Pagamentos / PIX.`
                  : 'Este investimento não referencia nenhum pagamento no protótipo.'}
              </p>
            )}
          </section>

          <section className={fin.card} aria-labelledby="inv-payment-mov-title">
            <h3 id="inv-payment-mov-title" className={fin.cardTitleSm}>
              Movimentações de wallet
            </h3>
            <p className={fin.cardSubtitle}>Movimentações que referenciam o pagamento deste investimento.</p>
            {viaPayment.length ? (
              <div className={styles.tableWrap}>
                <table className={`${shared.miniTable} ${styles.miniTable}`}>
                  <caption className="visually-hidden">Movimentações de wallet que referenciam o pagamento {investment.paymentId}</caption>
                  <thead>
                    <tr>
                      <th scope="col">Movimento</th>
                      <th scope="col" className={styles.optional}>
                        Descrição
                      </th>
                      <th scope="col" className={styles.optional}>
                        Status
                      </th>
                      <th scope="col" className={styles.optional}>
                        Data
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {viaPayment.map(({ movement }) => (
                      <tr key={movement.movementId}>
                        <td>
                          <span className={shared.cellText}>
                            <a href={walletHref(movement.walletId, movement.movementId)} className={shared.rowLink} onClick={() => onWallet(movement.walletId)}>
                              {movement.movementId}
                            </a>
                            <span className={shared.rowId}>{movement.walletId}</span>
                            <span className={styles.inline}>
                              {movement.description}
                              <MovementStatusPill status={movement.status} />
                              {dateText(movement.createdAt)}
                            </span>
                          </span>
                        </td>
                        <td className={styles.optional}>{movement.description}</td>
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
              <p className={styles.emptyLine}>
                <Info size={15} strokeWidth={1.8} aria-hidden="true" />
                Nenhuma movimentação referencia o pagamento deste investimento.
              </p>
            )}
            <div className={styles.cardActions}>
              {walletIds.length ? (
                <a href={walletHref(walletIds[0])} className={`${outline.button} ${styles.primaryLink}`} onClick={() => onWallet(walletIds[0])} data-view-wallet>
                  Ver na Wallet
                  <ExternalLink size={15} strokeWidth={1.8} aria-hidden="true" />
                </a>
              ) : null}
            </div>
          </section>
        </div>
        <InfoNote>
          Status do investimento e status do pagamento são independentes neste protótipo: o investimento pode estar ativo com o pagamento
          em processamento, entre outros cenários. Nenhum status é sincronizado automaticamente.
        </InfoNote>
      </TabPanel>

      <TabPanel prefix={TAB_PREFIX} tab="wallet" current={tab}>
        <section className={fin.card} aria-labelledby="inv-wallet-title">
          <h3 id="inv-wallet-title" className={fin.cardTitleSm}>
            Movimentações relacionadas
          </h3>
          <p className={fin.cardSubtitle}>
            Somente referências explícitas: movimentações cuja origem é este investimento ou o pagamento que ele referencia. Nenhum saldo
            é calculado aqui.
          </p>
          {related.length ? (
            <div className={styles.tableWrap}>
              <table className={`${shared.miniTable} ${styles.miniTable}`}>
                <caption className="visually-hidden">Movimentações de wallet relacionadas ao investimento {id}</caption>
                <thead>
                  <tr>
                    <th scope="col">Movimento</th>
                    <th scope="col" className={styles.optional}>
                      Natureza
                    </th>
                    <th scope="col" className={styles.optional}>
                      Descrição
                    </th>
                    <th scope="col" className={styles.optional}>
                      Relação
                    </th>
                    <th scope="col" className={styles.optional}>
                      Valor
                    </th>
                    <th scope="col" className={styles.optional}>
                      Status
                    </th>
                    <th scope="col" className={styles.optional}>
                      Data
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {related.map(({ movement, via }) => {
                    const viaLabel = via === 'payment' ? `Via pagamento ${investment.paymentId}` : 'Referência direta'
                    return (
                      <tr key={movement.movementId} data-movement={movement.movementId}>
                        <td>
                          <span className={shared.cellText}>
                            <a href={walletHref(movement.walletId, movement.movementId)} className={shared.rowLink} onClick={() => onWallet(movement.walletId)}>
                              {movement.movementId}
                            </a>
                            <span className={shared.rowId}>Wallet {movement.walletId}</span>
                            <span className={styles.inline}>
                              <DirectionTag direction={movement.direction} />
                              <Money amount={movement.amount} currency={movement.currency} />
                              <MovementStatusPill status={movement.status} />
                              <span className={styles.viaTag}>{viaLabel}</span>
                              <span>{movement.description}</span>
                              <span>{dateText(movement.createdAt)}</span>
                            </span>
                          </span>
                        </td>
                        <td className={styles.optional}>
                          <DirectionTag direction={movement.direction} />
                        </td>
                        <td className={styles.optional}>{movement.description}</td>
                        <td className={styles.optional}>
                          <span className={styles.viaTag}>{viaLabel}</span>
                        </td>
                        <td className={styles.optional}>
                          <Money amount={movement.amount} currency={movement.currency} />
                        </td>
                        <td className={styles.optional}>
                          <MovementStatusPill status={movement.status} />
                        </td>
                        <td className={styles.optional}>
                          <DateStack iso={movement.createdAt} />
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
              Nenhuma movimentação de wallet referencia este investimento ou o pagamento dele.
            </p>
          )}
          {walletIds.length ? (
            <p className={fin.cardSubtitle} style={{ marginTop: 12 }}>
              Wallets referenciadas:{' '}
              {walletIds.map((walletId, index) => (
                <span key={walletId}>
                  {index ? ', ' : ''}
                  <a href={walletHref(walletId)} className={shared.inlineLink} onClick={() => onWallet(walletId)}>
                    {walletId}
                  </a>
                </span>
              ))}
            </p>
          ) : null}
        </section>
        <InfoNote>
          Movimentação de wallet ≠ saldo de wallet ≠ investimento. A relação existe apenas porque os registros do protótipo se
          referenciam explicitamente; nenhum crédito ou débito pode ser feito aqui.
        </InfoNote>
      </TabPanel>

      <TabPanel prefix={TAB_PREFIX} tab="activity" current={tab}>
        <SessionActivityCard entries={activity} emptyText="Nenhuma ação local registrada para este investimento." />
      </TabPanel>
    </>
  )
}
