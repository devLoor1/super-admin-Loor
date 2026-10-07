import { ArrowRight, Info, Target } from 'lucide-react'
import outline from '../../../components/ui/OutlineButton.module.css'
import fin from '../../finance-gateways/sections/FinanceSections.module.css'
import { BusinessBadge } from '../../whitelabel-accounts/AccountBadges'
import { COMPANY_VALIDATION_META } from '../../whitelabel-accounts/accountModel'
import { refNames, useCatalogResolver } from '../opportunities/classification'
import { useOpportunities } from '../opportunities/opportunityStore'
import { ModalityChip, OpportunityStatusPill } from '../opportunities/OpportunityParts'
import type { Opportunity } from '../opportunities/opportunityModel'
import { addOperationActivity } from '../shared/operationActivity'
import { compareDate, countLabel, formatDateTime } from '../shared/operationModel'
import { entrepreneurById, type EntrepreneurProfile } from '../shared/participants'
import { ParticipantDetail } from '../shared/ParticipantDetail'
import { WhitelabelTag } from '../shared/OperationUi'
import shared from '../shared/Operation.module.css'
import styles from '../shared/Participants.module.css'

const opportunitiesHref = (entrepreneurId: string) => `#/operation/opportunities?empreendedor=${entrepreneurId}`

/** `#/operation/entrepreneurs/:entrepreneurId` — read-only operational profile. */
export function EntrepreneurDetailPage({ entrepreneurId }: { entrepreneurId: string }) {
  const profile = entrepreneurById(entrepreneurId)
  const company = profile?.account.company
  return (
    <ParticipantDetail
      section="entrepreneurs"
      profile={profile}
      notFoundId={entrepreneurId}
      overviewRows={
        company
          ? [
              {
                label: 'Empresa (cadastro em Contas)',
                value: (
                  <>
                    {company.name ?? '—'}
                    <BusinessBadge
                      tone={COMPANY_VALIDATION_META[company.validation].tone}
                      label={COMPANY_VALIDATION_META[company.validation].label}
                    />
                  </>
                ),
              },
            ]
          : []
      }
      relation={{
        label: 'Oportunidades',
        viewedTitle: 'Oportunidades consultadas',
        render: () => (profile ? <OpportunitiesTab profile={profile} /> : null),
        navItem: ({ log }) => ({
          key: 'opportunities',
          label: 'Ver oportunidades',
          description: 'Operação › Oportunidades, filtrada por este empreendedor',
          icon: Target,
          href: opportunitiesHref(entrepreneurId),
          onSelect: () => log('Navegação para Oportunidades solicitada', 'Lista de Oportunidades filtrada por este empreendedor'),
        }),
      }}
      moduleNote={
        <>
          <strong>Empreendedores V1 é um módulo de supervisão operacional.</strong> Oportunidades são gerenciadas no módulo de
          Oportunidades; conta e KYC ficam em Contas e Compliance. Nenhuma ação daqui altera esses domínios.
        </>
      }
    />
  )
}

function OpportunitiesTab({ profile }: { profile: EntrepreneurProfile }) {
  const opportunities = useOpportunities()
  const catalogs = useCatalogResolver()
  const linked = opportunities.filter((item) => item.entrepreneurId === profile.id)
  const byStatus = (status: Opportunity['status']) => linked.filter((item) => item.status === status).length
  const lastUpdate = linked.map((item) => item.updatedAt).filter((date) => date !== null).sort((a, b) => -compareDate(a, b))[0] ?? null

  return (
    <>
      <div className={shared.panelGrid}>
        <section className={fin.card} aria-labelledby="ent-summary-title">
          <h3 id="ent-summary-title" className={fin.cardTitleSm}>
            Resumo de oportunidades
          </h3>
          <p className={fin.cardSubtitle}>Lido em tempo real do estado local de Oportunidades.</p>
          <dl className={shared.statList}>
            <div className={shared.statRow}>
              <dt>Total</dt>
              <dd>{linked.length}</dd>
            </div>
            <div className={shared.statRow}>
              <dt>Ativas</dt>
              <dd>{byStatus('active')}</dd>
            </div>
            <div className={shared.statRow}>
              <dt>Rascunho</dt>
              <dd>{byStatus('draft')}</dd>
            </div>
            <div className={shared.statRow}>
              <dt>Pausadas</dt>
              <dd>{byStatus('paused')}</dd>
            </div>
            <div className={shared.statRow}>
              <dt>Última atualização</dt>
              <dd>{formatDateTime(lastUpdate) ?? '—'}</dd>
            </div>
          </dl>
        </section>

        <section className={fin.card} aria-labelledby="ent-linked-title">
          <div className={styles.relationHead}>
            <h3 id="ent-linked-title" className={fin.cardTitleSm}>
              Oportunidades vinculadas
            </h3>
            <span className={shared.countTag}>{countLabel(linked.length, 'oportunidade', 'oportunidades', 'Nenhuma')}</span>
          </div>
          {linked.length ? (
            <div className={styles.relationTableWrap}>
              <table className={`${shared.miniTable} ${styles.relationTable}`}>
                <caption className="visually-hidden">Oportunidades vinculadas a {profile.account.name} (somente leitura)</caption>
                <thead>
                  <tr>
                    <th scope="col">Oportunidade</th>
                    <th scope="col" className={styles.relationOptional}>
                      Modalidade
                    </th>
                    <th scope="col" className={styles.relationOptional}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {linked.map((item) => {
                    const classification = catalogs.resolve(item)
                    const segments = refNames(classification.segments)
                    const uses = refNames(classification.resourceUses)
                    return (
                      <tr key={item.id} data-linked-opportunity={item.id}>
                        <td>
                          <span className={styles.relationName}>
                            <a href={`#/operation/opportunities/${item.id}`} className={shared.rowLink}>
                              {item.name}
                            </a>
                            <span className={shared.rowId}>{item.id}</span>
                            <span className={shared.rowId}>
                              <WhitelabelTag whitelabelId={item.whitelabelId} />
                            </span>
                            <span className={shared.rowId}>
                              Segmentos: {segments.length ? segments.join(', ') : '—'} · Usos: {uses.length ? uses.join(', ') : '—'}
                            </span>
                            <span className={styles.relationInline}>
                              <ModalityChip modality={item.modality} />
                              <OpportunityStatusPill status={item.status} />
                            </span>
                          </span>
                        </td>
                        <td className={styles.relationOptional}>
                          <ModalityChip modality={item.modality} />
                        </td>
                        <td className={styles.relationOptional}>
                          <OpportunityStatusPill status={item.status} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={fin.activityEmpty} style={{ marginTop: 12 }}>
              <Info size={15} strokeWidth={1.8} aria-hidden="true" />
              Nenhuma oportunidade vinculada a este empreendedor no estado local.
            </p>
          )}
          <a
            href={opportunitiesHref(profile.id)}
            className={`${outline.button} ${shared.blockButton}`}
            onClick={() =>
              addOperationActivity(profile.id, {
                title: 'Navegação para Oportunidades solicitada',
                detail: 'Lista de Oportunidades filtrada por este empreendedor',
              })
            }
            data-view-opportunities
          >
            <Target size={16} strokeWidth={1.8} aria-hidden="true" />
            Ver oportunidades
            <ArrowRight size={15} strokeWidth={1.8} aria-hidden="true" />
          </a>
        </section>
      </div>
      <p className={shared.callout}>
        <Info size={15} strokeWidth={1.8} aria-hidden="true" />
        <span>
          Oportunidades são gerenciadas no módulo de Oportunidades — este módulo não cria nem edita oportunidades. Nesta versão
          cada oportunidade referencia no máximo um empreendedor (composição da V1); a cardinalidade final, pessoa física ou
          jurídica e representantes dependem de Produto.
        </span>
      </p>
    </>
  )
}
