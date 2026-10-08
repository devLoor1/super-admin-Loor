import { ChartColumn, ExternalLink, Info } from 'lucide-react'
import outline from '../../../components/ui/OutlineButton.module.css'
import fin from '../../finance-gateways/sections/FinanceSections.module.css'
import { useOpportunities } from '../opportunities/opportunityStore'
import { ModalityChip, OpportunityStatusPill } from '../opportunities/OpportunityParts'
import type { Opportunity } from '../opportunities/opportunityModel'
import { addOperationActivity } from '../shared/operationActivity'
import { countLabel, formatDateTime, whitelabelName } from '../shared/operationModel'
import { investorById, type InvestorProfile } from '../shared/participants'
import { ParticipantDetail } from '../shared/ParticipantDetail'
import shared from '../shared/Operation.module.css'
import styles from '../shared/Participants.module.css'
import { associationsOf } from './prototypeInvestments'

const investmentsHref = (investorId: string) => `#/finance/investments?investidor=${encodeURIComponent(investorId)}`

/** `#/operation/investors/:investorId` — read-only operational profile. */
export function InvestorDetailPage({ investorId }: { investorId: string }) {
  const profile = investorById(investorId)
  return (
    <ParticipantDetail
      section="investors"
      profile={profile}
      notFoundId={investorId}
      relation={{
        label: 'Investimentos',
        viewedTitle: 'Investimentos consultados',
        render: () => (profile ? <InvestmentsTab profile={profile} /> : null),
        // Financeiro › Investimentos now exists: navigate normally, filtered by this investor.
        navItem: ({ log }) => ({
          key: 'investments',
          label: 'Ver investimentos',
          description: 'Financeiro › Investimentos — registros deste investidor',
          icon: ChartColumn,
          href: investmentsHref(investorId),
          onSelect: () => log('Navegação para Investimentos solicitada', 'Financeiro › Investimentos (filtrado por este investidor)'),
        }),
      }}
      moduleNote={
        <>
          <strong>Investidores V1 é um módulo de supervisão operacional.</strong> Visualize o contexto e navegue para os domínios
          responsáveis: Contas, Financeiro › Investimentos e Compliance › KYC. Nenhuma ação altera conta, investimento ou KYC.
        </>
      }
    />
  )
}

function InvestmentsTab({ profile }: { profile: InvestorProfile }) {
  const opportunities = useOpportunities()
  const associations = associationsOf(profile.id).map((association) => ({
    association,
    opportunity: opportunities.find((item) => item.id === association.opportunityId),
  }))
  const byStatus = (status: Opportunity['status']) => associations.filter((item) => item.opportunity?.status === status).length

  function viewInvestments() {
    addOperationActivity(profile.id, {
      title: 'Navegação para Investimentos solicitada',
      detail: 'Financeiro › Investimentos (filtrado por este investidor)',
    })
  }

  return (
    <>
      <div className={shared.panelGrid}>
        <section className={fin.card} aria-labelledby="inv-summary-title">
          <h3 id="inv-summary-title" className={fin.cardTitleSm}>
            Resumo de investimentos
          </h3>
          <p className={fin.cardSubtitle}>Contagem de vínculos ilustrativos — sem valores, saldos ou rendimentos.</p>
          <dl className={shared.statList}>
            <div className={shared.statRow}>
              <dt>Vínculos</dt>
              <dd>{associations.length}</dd>
            </div>
            <div className={shared.statRow}>
              <dt>Em oportunidades ativas</dt>
              <dd>{byStatus('active')}</dd>
            </div>
            <div className={shared.statRow}>
              <dt>Em oportunidades pausadas</dt>
              <dd>{byStatus('paused')}</dd>
            </div>
            <div className={shared.statRow}>
              <dt>Em oportunidades em rascunho</dt>
              <dd>{byStatus('draft')}</dd>
            </div>
          </dl>
        </section>

        <section className={fin.card} aria-labelledby="inv-linked-title">
          <div className={styles.relationHead}>
            <h3 id="inv-linked-title" className={fin.cardTitleSm}>
              Investimentos vinculados
            </h3>
            <span className={shared.countTag}>{countLabel(associations.length, 'vínculo', 'vínculos', 'Nenhum vínculo')}</span>
          </div>
          {associations.length ? (
            <div className={styles.relationTableWrap}>
              <table className={`${shared.miniTable} ${styles.relationTable}`}>
                <caption className="visually-hidden">Investimentos vinculados (ilustrativos, somente leitura)</caption>
                <thead>
                  <tr>
                    <th scope="col">Oportunidade</th>
                    <th scope="col" className={styles.relationOptional}>
                      Modalidade
                    </th>
                    <th scope="col" className={styles.relationOptional}>
                      Status
                    </th>
                    <th scope="col" className={styles.relationOptional}>
                      Registro
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {associations.map(({ association, opportunity }) => (
                    <tr key={association.id} data-association={association.id}>
                      <td>
                        <span className={styles.relationName}>
                          {opportunity ? (
                            <a href={`#/operation/opportunities/${opportunity.id}`} className={shared.rowLink}>
                              {opportunity.name}
                            </a>
                          ) : (
                            <span>Oportunidade não encontrada</span>
                          )}
                          <span className={shared.rowId}>
                            {association.opportunityId}
                            {opportunity && opportunity.whitelabelId !== profile.whitelabelId
                              ? ` · agora em ${whitelabelName(opportunity.whitelabelId)} (protótipo)`
                              : ''}
                          </span>
                          {opportunity ? (
                            <span className={styles.relationInline}>
                              <ModalityChip modality={opportunity.modality} />
                              <OpportunityStatusPill status={opportunity.status} />
                            </span>
                          ) : null}
                        </span>
                      </td>
                      <td className={styles.relationOptional}>{opportunity ? <ModalityChip modality={opportunity.modality} /> : '—'}</td>
                      <td className={styles.relationOptional}>
                        {opportunity ? <OpportunityStatusPill status={opportunity.status} /> : '—'}
                      </td>
                      <td className={`${styles.relationOptional} ${shared.dateCell}`}>{formatDateTime(association.registeredAt) ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={fin.activityEmpty} style={{ marginTop: 12 }}>
              <Info size={15} strokeWidth={1.8} aria-hidden="true" />
              Nenhum vínculo de investimento neste protótipo.
            </p>
          )}
          <a
            href={investmentsHref(profile.id)}
            className={`${outline.button} ${shared.blockButton}`}
            onClick={viewInvestments}
            data-view-investments
          >
            <ChartColumn size={16} strokeWidth={1.8} aria-hidden="true" />
            Ver investimentos
            <ExternalLink size={15} strokeWidth={1.8} aria-hidden="true" />
          </a>
        </section>
      </div>
      <p className={shared.callout}>
        <Info size={15} strokeWidth={1.8} aria-hidden="true" />
        <span>
          Vínculos ilustrativos para a experiência de Operação. Status e modalidade vêm da oportunidade (Operação › Oportunidades). Os
          registros de investimento (valor, status, pagamento) ficam em Financeiro › Investimentos; aqui não há valores nem ações
          financeiras.
        </span>
      </p>
    </>
  )
}
