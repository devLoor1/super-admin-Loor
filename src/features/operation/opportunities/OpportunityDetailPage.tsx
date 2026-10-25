import { useState, type ReactNode } from 'react'
import { opportunityEditorialAvailable, readinessTabs } from '../../../app/presentationAvailability'
import { useSessionOperator } from '../../../lib/authSession'
import { CircleAlert, Database, ExternalLink, Info, LayoutGrid, RotateCw, SearchX, Target, UserRound } from 'lucide-react'
import { EmptyState } from '../../../components/ui/EmptyState'
import outline from '../../../components/ui/OutlineButton.module.css'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import { Tabs } from '../../../components/ui/Tabs'
import { tabId, tabPanelId } from '../../../components/ui/tabIds'
import fin from '../../finance-gateways/sections/FinanceSections.module.css'
import { EntrepreneurCompanyPanel } from '../companies/EntrepreneurCompanyPanel'
import { useEntrepreneurCompany } from '../companies/useCompanyData'
import { entrepreneurHref } from '../entrepreneurs/entrepreneurRoute'
import { crumbLabel } from '../shared/operationModel'
import { BackLink, DetailList, InfoNote, OperationShell } from '../shared/OperationUi'
import { operationReadErrorView } from '../shared/readErrors'
import { useWhitelabelRecord } from '../shared/whitelabelContext'
import shared from '../shared/Operation.module.css'
import states from '../shared/ReadStates.module.css'
import type { OpportunityDetail } from './opportunityApi'
import { fundraisingLabel, modalityLabel, opportunityDate, opportunityName, privacyLabel } from './opportunityPresent'
import { opportunitiesHref, opportunityListReturnHash } from './opportunityRoute'
import { ModalityChip, OpportunityStatusPill, TenantName } from './OpportunityParts'
import { useOpportunityDetail } from './useOpportunityData'
import styles from './Opportunities.module.css'

type Tab = 'overview' | 'classification' | 'company'
const TABS: { value: Tab; label: string }[] = [
  { value: 'overview', label: 'Visão geral' },
  { value: 'classification', label: 'Classificação' },
  { value: 'company', label: 'Empreendedor e empresa' },
]
const TAB_PREFIX = 'opp-detail'


/**
 * `#/operation/opportunities/:opportunityId` — read-only Opportunity from
 * `GET /opportunities/:id`. Only fields the Control Plane returns are shown
 * (no money, investments, investor counts or fundraising progress exist in
 * the read contract). A contextual entry exposes the separately scoped editorial controls.
 */
export function OpportunityDetailPage({ opportunityId, returnTo }: { opportunityId: string; returnTo?: string }) {
  const detail = useOpportunityDetail(opportunityId)
  const listHref = opportunityListReturnHash(returnTo)
  const error = detail.state.status === 'error' ? operationReadErrorView(detail.state.error, 'a oportunidade') : null

  if (error?.notFound) {
    return (
      <OperationShell section="opportunities" title="Oportunidades" trail={['Não encontrada']}>
        <div className={shared.notFound} data-opportunity-state="not-found">
          <EmptyState
            icon={SearchX}
            title="Oportunidade não encontrada"
            description={
              <>
                Nenhuma oportunidade do Control Plane usa o ID “{opportunityId}”.{' '}
                <a href={listHref} className={shared.inlineLink}>
                  Voltar para Oportunidades
                </a>
              </>
            }
          />
        </div>
      </OperationShell>
    )
  }

  if (error) {
    return (
      <OperationShell section="opportunities" title="Oportunidades" trail={[`ID ${opportunityId}`]}>
        <div>
          <BackLink href={listHref} label="Voltar para Oportunidades" />
        </div>
        <section className={`${fin.card} ${states.feedback}`} role="alert" data-opportunity-state="error">
          <EmptyState icon={CircleAlert} title={error.title} description={error.description} />
          {error.correlationId ? (
            <p className={states.diagnostic}>
              Código de diagnóstico: <code className={states.code}>{error.correlationId}</code>
            </p>
          ) : null}
          {error.retryable ? (
            <OutlineButton onClick={detail.reload} data-retry>
              <RotateCw size={14} strokeWidth={1.8} aria-hidden="true" />
              Tentar novamente
            </OutlineButton>
          ) : null}
        </section>
      </OperationShell>
    )
  }

  if (detail.state.status !== 'success') {
    return (
      <OperationShell section="opportunities" title="Oportunidades" trail={[`ID ${opportunityId}`]}>
        <div>
          <BackLink href={listHref} label="Voltar para Oportunidades" />
        </div>
        <section className={`${fin.card} ${shared.hero}`} aria-busy="true" aria-label="Carregando oportunidade" data-opportunity-state="loading">
          <span className={shared.heroIcon} aria-hidden="true" />
          <div className={states.heroSkeleton} aria-hidden="true">
            <span className={states.skeleton} />
            <span className={states.skeleton} />
            <span className={states.skeleton} />
          </div>
          <p className="visually-hidden" role="status">
            Carregando oportunidade…
          </p>
        </section>
      </OperationShell>
    )
  }

  const opportunity = detail.state.data
  return (
    <OperationShell section="opportunities" title="Oportunidades" trail={[crumbLabel(opportunityName(opportunity))]}>
      <OpportunityContent opportunity={opportunity} listHref={listHref} />
    </OperationShell>
  )
}

function OpportunityContent({ opportunity, listHref }: { opportunity: OpportunityDetail; listHref: string }) {
  const editorial = opportunityEditorialAvailable(opportunity.status, useSessionOperator()?.roles ?? [])
  const [tab, setTab] = useState<Tab>('overview')
  // Latched once the tab is first opened: switching tabs never re-enters the same read key
  // (which would re-display the settled answer as current while a duplicate request runs).
  const [companyRequested, setCompanyRequested] = useState(false)
  const whitelabel = useWhitelabelRecord(opportunity.whitelabelId)
  const tenant = whitelabel.state.status === 'success' ? whitelabel.state.data.name : `Whitelabel #${opportunity.whitelabelId}`
  // Tenant-scoped lookup: the Entrepreneur must belong to the Opportunity's Whitelabel.
  const company = useEntrepreneurCompany(companyRequested ? opportunity.entrepreneurId : null, opportunity.whitelabelId)
  const name = opportunityName(opportunity)
  const date = (value: string | null) => opportunityDate(value, true) ?? 'Não informado'


  function changeTab(next: Tab) {
    setTab(next)
    if (next === 'company') setCompanyRequested(true)
  }

  const entrepreneurLink = (
    <a href={entrepreneurHref(opportunity.entrepreneurId)} className={shared.inlineLink} data-relation="entrepreneur">
      Empreendedor #{opportunity.entrepreneurId}
    </a>
  )
  const whitelabelValue = (
    <span className={shared.cellText}>
      <TenantName whitelabelId={opportunity.whitelabelId} name={tenant} />
      <a href={`#/whitelabels?id=${encodeURIComponent(opportunity.whitelabelId)}`} className={shared.inlineLink} data-relation="whitelabel">
        Ver Whitelabel (ID {opportunity.whitelabelId})
      </a>
    </span>
  )

  return (
    <>
      <div>
        <BackLink href={listHref} label="Voltar para Oportunidades" />
      </div>

      <section className={`${fin.card} ${shared.hero}`} aria-labelledby="opp-hero-title" data-opportunity-state="loaded">
        <span className={shared.heroIcon} aria-hidden="true">
          <Target size={26} strokeWidth={1.6} />
        </span>
        <div className={shared.heroHeading}>
          <div className={shared.heroTitleRow}>
            <h2 id="opp-hero-title" className={shared.heroTitle}>
              {name}
            </h2>
            <OpportunityStatusPill status={opportunity.status} />
          </div>
          <p className={shared.heroId}>ID da oportunidade (Control Plane): {opportunity.id}</p>
          <div className={shared.heroMeta}>
            <HeroItem label="Whitelabel" value={<TenantName whitelabelId={opportunity.whitelabelId} name={tenant} />} />
            <HeroItem label="Empreendedor" value={entrepreneurLink} />
            <HeroItem label="Modalidade" value={<ModalityChip modality={opportunity.modality} />} />
          </div>
        </div>
        <div className={shared.heroActions}>
          {editorial && <a href={`#/operation/opportunities/${opportunity.id}/edit`} className={`${outline.button} ${shared.secondaryButton}`} data-hero="opportunity-editorial">Editar Sobre / arquivar</a>}
          <a href={entrepreneurHref(opportunity.entrepreneurId)} className={`${outline.button} ${shared.secondaryButton}`} data-hero="entrepreneur">
            <UserRound size={15} strokeWidth={1.8} aria-hidden="true" />
            Ver empreendedor
          </a>
          <a href={opportunitiesHref({ whitelabelId: opportunity.whitelabelId })} className={`${outline.button} ${shared.secondaryButton}`} data-hero="whitelabel-opportunities">
            Oportunidades deste Whitelabel
            <ExternalLink size={14} strokeWidth={1.8} aria-hidden="true" />
          </a>
        </div>
      </section>

      <div className={`${fin.card} ${shared.tabsCard}`}>
        <Tabs idPrefix={TAB_PREFIX} label="Seções da oportunidade" tabs={readinessTabs(TABS)} value={tab} onChange={changeTab} />
      </div>

      <TabPanel tab="overview" current={tab}>
        <div className={shared.panelGrid}>
          <section className={fin.card} aria-labelledby="opp-info-title">
            <h3 id="opp-info-title" className={fin.cardTitleSm}>
              Informações principais
            </h3>
            <p className={fin.cardSubtitle}>Dados do Control Plane — somente leitura.</p>
            <DetailList
              rows={[
                { label: 'Nome', value: opportunity.name ?? 'Não informado' },
                { label: 'Razão social informada', value: opportunity.businessName ?? 'Não informada' },
                { label: 'ID da oportunidade', value: opportunity.id },
                { label: 'Status', value: <OpportunityStatusPill status={opportunity.status} /> },
                { label: 'Modalidade', value: modalityLabel(opportunity.modality) },
                { label: 'Visibilidade', value: privacyLabel(opportunity.isPrivate) },
                { label: 'Meta mínima de captação', value: fundraisingLabel(opportunity.fundraisingCompletion) },
                { label: 'Quantidade de cotas', value: opportunity.quotaQuantity === null ? 'Não informada' : String(opportunity.quotaQuantity) },
                { label: 'Whitelabel', value: whitelabelValue },
                { label: 'Empreendedor', value: entrepreneurLink },
              ]}
            />
          </section>
          <section className={fin.card} aria-labelledby="opp-dates-title">
            <h3 id="opp-dates-title" className={fin.cardTitleSm}>
              Datas
            </h3>
            <DetailList
              rows={[
                { label: 'Abertura', value: date(opportunity.openedAt) },
                { label: 'Prazo', value: date(opportunity.dueAt) },
                { label: 'Encerramento', value: date(opportunity.endedAt) },
                { label: 'Criada em', value: date(opportunity.createdAt) },
                { label: 'Atualizada em', value: date(opportunity.updatedAt) },
              ]}
            />
          </section>
        </div>
        <section className={fin.card} aria-labelledby="opp-text-title">
          <h3 id="opp-text-title" className={fin.cardTitleSm}>
            Descrição
          </h3>
          <DetailList
            rows={[
              { label: 'Descrição', value: opportunity.description ?? <span className={shared.muted}>Sem descrição</span>, wide: true },
              { label: 'Sobre', value: opportunity.about ?? <span className={shared.muted}>Não informado</span>, wide: true },
              ...(opportunity.reasonForArchiving ? [{ label: 'Motivo do arquivamento', value: opportunity.reasonForArchiving, wide: true }] : []),
            ]}
          />
        </section>
        <InfoNote>
          <strong>Consulta autoritativa.</strong> Somente SUPER_ADMIN pode editar Sobre ou arquivar uma oportunidade em revisão, na tela específica. Criação, aprovação e operações de provedor permanecem indisponíveis. O contrato de
          Oportunidades não traz valores, investimentos, investidores ou progresso de captação — nada disso é exibido ou calculado.
        </InfoNote>
      </TabPanel>

      <TabPanel tab="classification" current={tab}>
        <p className={shared.callout}>
          <Info size={15} strokeWidth={1.8} aria-hidden="true" />
          <span>
            <strong>Modalidade ≠ Segmento ≠ Uso dos recursos.</strong> São três dimensões independentes informadas pelo Control Plane; “Capital de
            Giro” nunca é uma modalidade.
          </span>
        </p>
        <div className={styles.classGrid}>
          <ClassCard icon={Target} title="Modalidade">
            <ClassItem name={<ModalityChip modality={opportunity.modality} />} meta={`Token: ${opportunity.modality}`} />
          </ClassCard>
          <span className={styles.neq} aria-hidden="true">
            ≠
          </span>
          <ClassCard icon={LayoutGrid} title="Segmento">
            {opportunity.segment ? (
              <ClassItem name={opportunity.segment.name ?? 'Nome não informado'} meta={`ID do segmento: ${opportunity.segment.id}`} />
            ) : (
              <p className={`${styles.sourceLink} ${shared.muted}`}>Nenhum segmento informado.</p>
            )}
          </ClassCard>
          <span className={styles.neq} aria-hidden="true">
            ≠
          </span>
          <ClassCard icon={Database} title="Uso dos recursos">
            {opportunity.resourceUse ? (
              <ClassItem name={opportunity.resourceUse.name ?? opportunity.resourceUse.code} meta={`Código: ${opportunity.resourceUse.code}`} />
            ) : (
              <p className={`${styles.sourceLink} ${shared.muted}`}>Nenhum uso dos recursos informado.</p>
            )}
          </ClassCard>
        </div>
        <InfoNote>Os catálogos de Segmentos e Usos dos recursos de Financeiro ainda são protótipos; nenhuma ligação com eles é feita a partir deste registro.</InfoNote>
      </TabPanel>

      <TabPanel tab="company" current={tab}>
        <div className={shared.panelGrid}>
          <section className={fin.card} aria-labelledby="opp-entrepreneur-title">
            <h3 id="opp-entrepreneur-title" className={fin.cardTitleSm}>
              Empreendedor responsável
            </h3>
            <p className={fin.cardSubtitle}>Empreendedor informado pela própria oportunidade no Control Plane.</p>
            <DetailList
              rows={[
                { label: 'Empreendedor', value: entrepreneurLink },
                { label: 'Whitelabel', value: <TenantName whitelabelId={opportunity.whitelabelId} name={tenant} /> },
              ]}
            />
          </section>
          <EntrepreneurCompanyPanel remote={company} variant="opportunity" entrepreneurId={opportunity.entrepreneurId} />
        </div>
      </TabPanel>

    </>
  )
}

function TabPanel({ tab, current, children }: { tab: Tab; current: Tab; children: ReactNode }) {
  return (
    <div role="tabpanel" id={tabPanelId(TAB_PREFIX, tab)} aria-labelledby={tabId(TAB_PREFIX, tab)} hidden={tab !== current} tabIndex={0} className={shared.tabPanel}>
      {tab === current ? children : null}
    </div>
  )
}

function HeroItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className={shared.heroMetaItem}>
      <span className={shared.heroMetaLabel}>{label}</span>
      <span className={shared.heroMetaValue}>{value}</span>
    </div>
  )
}

function ClassCard({ icon: Icon, title, children }: { icon: typeof Target; title: string; children: ReactNode }) {
  return (
    <section className={fin.card} aria-label={title}>
      <div className={shared.cellMain}>
        <span className={styles.classIcon} aria-hidden="true">
          <Icon size={16} strokeWidth={1.7} />
        </span>
        <h3 className={fin.cardTitleSm}>{title}</h3>
      </div>
      {children}
    </section>
  )
}

function ClassItem({ name, meta }: { name: ReactNode; meta: string }) {
  return (
    <div className={styles.classList}>
      <div className={styles.classItem}>
        <span className={styles.classItemName}>{name}</span>
        <span className={styles.classItemMeta}>{meta}</span>
      </div>
    </div>
  )
}
