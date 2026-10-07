import { useState, type ReactNode } from 'react'
import { Database, Info, LayoutGrid, Pencil, RefreshCw, SearchX, SlidersHorizontal, Target } from 'lucide-react'
import { usePrototypeNotice } from '../../../components/shell/prototypeNotice'
import { EmptyState } from '../../../components/ui/EmptyState'
import { IconTile } from '../../../components/ui/IconTile'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import primary from '../../../components/ui/PrimaryButton.module.css'
import { Tabs } from '../../../components/ui/Tabs'
import { tabId, tabPanelId } from '../../../components/ui/tabIds'
import type { CatalogItem } from '../../finance-catalogs/catalogModel'
import fin from '../../finance-gateways/sections/FinanceSections.module.css'
import { CHOICE_LABEL, modalityMeta } from '../../finance-modalities/modalitiesModel'
import { useModalityRules } from '../../finance-modalities/modalitiesStore'
import { addOperationActivity, useOperationActivity } from '../shared/operationActivity'
import { crumbLabel, formatDateTime, whitelabelName } from '../shared/operationModel'
import { entrepreneurById } from '../shared/participants'
import { BackLink, DetailList, OperationShell, SessionActivityCard, WhitelabelTag } from '../shared/OperationUi'
import shared from '../shared/Operation.module.css'
import { useCatalogResolver, type ResolvedRef } from './classification'
import { OPPORTUNITY_STATUS_META, type Opportunity } from './opportunityModel'
import { setOpportunityStatus, useOpportunity } from './opportunityStore'
import { CatalogChip, ModalityChip, OpportunityStatusPill } from './OpportunityParts'
import { StatusDialog } from './StatusDialog'
import styles from './Opportunities.module.css'

type Tab = 'overview' | 'classification' | 'configuration' | 'activity'
const TABS: { value: Tab; label: string }[] = [
  { value: 'overview', label: 'Visão geral' },
  { value: 'classification', label: 'Classificação' },
  { value: 'configuration', label: 'Configuração' },
  { value: 'activity', label: 'Atividade da sessão' },
]
const TAB_PREFIX = 'opp-detail'

/** `#/operation/opportunities/:opportunityId` — consultation, status switch, link to edit. No delete. */
export function OpportunityDetailPage({ opportunityId }: { opportunityId: string }) {
  const opportunity = useOpportunity(opportunityId)
  if (!opportunity) {
    return (
      <OperationShell section="opportunities" title="Oportunidades" trail={['Não encontrada']}>
        <div className={shared.notFound}>
          <EmptyState
            icon={SearchX}
            title="Oportunidade não encontrada"
            description={
              <>
                Nenhuma oportunidade local usa o ID “{opportunityId}”. Oportunidades criadas nesta sessão somem ao recarregar a
                página.{' '}
                <a href="#/operation/opportunities" className={shared.inlineLink}>
                  Voltar para Oportunidades
                </a>
              </>
            }
          />
        </div>
      </OperationShell>
    )
  }
  return <OpportunityDetail opportunity={opportunity} />
}

function OpportunityDetail({ opportunity }: { opportunity: Opportunity }) {
  const notify = usePrototypeNotice()
  const catalogs = useCatalogResolver()
  const activity = useOperationActivity(opportunity.id)
  const [tab, setTab] = useState<Tab>('overview')
  const [statusOpen, setStatusOpen] = useState(false)
  const classification = catalogs.resolve(opportunity)
  const entrepreneur = opportunity.entrepreneurId ? entrepreneurById(opportunity.entrepreneurId) : undefined
  const editHref = `#/operation/opportunities/${opportunity.id}/edit`

  function applyStatus(status: Opportunity['status']) {
    setStatusOpen(false)
    if (status === opportunity.status) return
    const before = OPPORTUNITY_STATUS_META[opportunity.status].label
    setOpportunityStatus(opportunity.id, status)
    addOperationActivity(opportunity.id, {
      title: 'Status alterado localmente',
      detail: `${before} → ${OPPORTUNITY_STATUS_META[status].label}`,
    })
    notify(`Status de “${opportunity.name}” alterado para ${OPPORTUNITY_STATUS_META[status].label} neste protótipo.`)
  }

  const entrepreneurValue = entrepreneur ? (
    <a href={`#/operation/entrepreneurs/${entrepreneur.id}`} className={shared.inlineLink}>
      {entrepreneur.account.name}
    </a>
  ) : opportunity.entrepreneurId ? (
    'Empreendedor não encontrado'
  ) : (
    <span className={shared.muted}>Não vinculado</span>
  )

  return (
    <OperationShell section="opportunities" title="Oportunidades" trail={[crumbLabel(opportunity.name)]}>
      <div>
        <BackLink href="#/operation/opportunities" label="Voltar para Oportunidades" />
      </div>

      <section className={`${fin.card} ${shared.hero}`} aria-labelledby="opp-hero-title">
        <span className={shared.heroIcon} aria-hidden="true">
          <Target size={26} strokeWidth={1.6} />
        </span>
        <div className={shared.heroHeading}>
          <div className={shared.heroTitleRow}>
            <h2 id="opp-hero-title" className={shared.heroTitle}>
              {opportunity.name}
            </h2>
            <OpportunityStatusPill status={opportunity.status} />
          </div>
          <p className={shared.heroId}>ID (protótipo): {opportunity.id}</p>
          <div className={shared.heroMeta}>
            <HeroItem label="Whitelabel" value={<WhitelabelTag whitelabelId={opportunity.whitelabelId} />} />
            <HeroItem label="Empreendedor" value={entrepreneurValue} />
            <HeroItem label="Modalidade" value={<ModalityChip modality={opportunity.modality} />} />
          </div>
        </div>
        <div className={shared.heroActions}>
          <OutlineButton className={shared.secondaryButton} onClick={() => setStatusOpen(true)} data-change-status>
            <RefreshCw size={15} strokeWidth={1.8} aria-hidden="true" />
            Alterar status
          </OutlineButton>
          <a href={editHref} className={`${primary.button} ${shared.ctaButton}`} data-edit-opportunity>
            <Pencil size={15} strokeWidth={1.9} aria-hidden="true" />
            Editar
          </a>
        </div>
      </section>

      <div className={`${fin.card} ${shared.tabsCard}`}>
        <Tabs idPrefix={TAB_PREFIX} label="Seções da oportunidade" tabs={TABS} value={tab} onChange={setTab} />
      </div>

      <TabPanel tab="overview" current={tab}>
        <div className={shared.panelGrid}>
          <section className={fin.card} aria-labelledby="opp-info-title">
            <div className={shared.cardHead}>
              <h3 id="opp-info-title" className={fin.cardTitleSm}>
                Informações principais
              </h3>
              <a href={editHref} className={shared.cardEdit}>
                <Pencil size={13} strokeWidth={1.8} aria-hidden="true" />
                Editar<span className="visually-hidden"> informações principais</span>
              </a>
            </div>
            <DetailList
              rows={[
                { label: 'Nome', value: opportunity.name },
                { label: 'ID da oportunidade', value: opportunity.id },
                { label: 'Whitelabel', value: <WhitelabelTag whitelabelId={opportunity.whitelabelId} /> },
                { label: 'Empreendedor', value: entrepreneurValue },
                { label: 'Status (protótipo)', value: <OpportunityStatusPill status={opportunity.status} /> },
                { label: 'Atualizada em', value: formatDateTime(opportunity.updatedAt) ?? '—' },
                {
                  label: 'Descrição',
                  value: opportunity.description || <span className={shared.muted}>Sem descrição</span>,
                  wide: true,
                },
              ]}
            />
          </section>

          <section className={fin.card} aria-labelledby="opp-class-summary-title">
            <div className={shared.cardHead}>
              <h3 id="opp-class-summary-title" className={fin.cardTitleSm}>
                Resumo de classificação
              </h3>
              <a href={`${editHref}?secao=classificacao`} className={shared.cardEdit}>
                <Pencil size={13} strokeWidth={1.8} aria-hidden="true" />
                Editar<span className="visually-hidden"> classificação</span>
              </a>
            </div>
            <div className={styles.summaryRows}>
              <SummaryRow icon={modalityMeta(opportunity.modality).icon} label="Modalidade">
                <ModalityChip modality={opportunity.modality} />
              </SummaryRow>
              <SummaryRow icon={LayoutGrid} label={`Segmentos (${classification.segments.length})`}>
                <RefChips items={classification.segments} catalog="segment" empty="Nenhum segmento" />
              </SummaryRow>
              <SummaryRow icon={Database} label={`Usos dos recursos (${classification.resourceUses.length})`}>
                <RefChips items={classification.resourceUses} catalog="resource_use" empty="Nenhum uso dos recursos" />
              </SummaryRow>
            </div>
          </section>
        </div>
      </TabPanel>

      <TabPanel tab="classification" current={tab}>
        <p className={shared.callout}>
          <Info size={15} strokeWidth={1.8} aria-hidden="true" />
          <span>
            <strong>Modalidade ≠ Segmento ≠ Uso dos recursos.</strong> São três classificações independentes, vindas de domínios
            diferentes; nenhuma seleção altera outra e não há relacionamento automático entre elas.
          </span>
        </p>
        <div className={styles.classGrid}>
          <ClassCard
            icon={modalityMeta(opportunity.modality).icon}
            tone={modalityMeta(opportunity.modality).tone}
            title="Modalidade"
            source={{ label: 'Financeiro › Modalidades e regras', href: `#/whitelabels/${opportunity.whitelabelId}/finance/modalities` }}
          >
            <div className={styles.classList}>
              <div className={styles.classItem}>
                <span className={styles.classItemName}>
                  <ModalityChip modality={opportunity.modality} />
                </span>
                <span className={styles.classItemMeta}>{modalityMeta(opportunity.modality).description}</span>
              </div>
            </div>
          </ClassCard>
          <span className={styles.neq} aria-hidden="true">
            ≠
          </span>
          <ClassCard
            icon={LayoutGrid}
            tone="violet"
            title="Segmentos"
            source={{
              label: 'Catálogo de Segmentos',
              href: `#/whitelabels/${opportunity.whitelabelId}/finance/segments-resource-uses`,
            }}
          >
            <RefList items={classification.segments} catalog="segment" source={catalogs.segmentsOf(opportunity.whitelabelId)} empty="Nenhum segmento selecionado." />
          </ClassCard>
          <span className={styles.neq} aria-hidden="true">
            ≠
          </span>
          <ClassCard
            icon={Database}
            tone="teal"
            title="Usos dos recursos"
            source={{
              label: 'Catálogo de Usos dos recursos',
              href: `#/whitelabels/${opportunity.whitelabelId}/finance/segments-resource-uses`,
            }}
          >
            <RefList
              items={classification.resourceUses}
              catalog="resource_use"
              source={catalogs.resourceUsesOf(opportunity.whitelabelId)}
              empty="Nenhum uso dos recursos selecionado."
            />
          </ClassCard>
        </div>
      </TabPanel>

      <TabPanel tab="configuration" current={tab}>
        <ConfigurationCard opportunity={opportunity} />
      </TabPanel>

      <TabPanel tab="activity" current={tab}>
        <SessionActivityCard entries={activity} emptyText="Nenhuma alteração local nesta oportunidade durante esta sessão." />
      </TabPanel>

      {statusOpen ? <StatusDialog opportunity={opportunity} onCancel={() => setStatusOpen(false)} onApply={applyStatus} /> : null}
    </OperationShell>
  )
}

function TabPanel({ tab, current, children }: { tab: Tab; current: Tab; children: ReactNode }) {
  return (
    <div
      role="tabpanel"
      id={tabPanelId(TAB_PREFIX, tab)}
      aria-labelledby={tabId(TAB_PREFIX, tab)}
      hidden={tab !== current}
      tabIndex={0}
      className={shared.tabPanel}
    >
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

function SummaryRow({ icon, label, children }: { icon: typeof Target; label: string; children: ReactNode }) {
  return (
    <div className={styles.summaryRow}>
      <span className={styles.summaryRowLabel}>
        <IconTile icon={icon} tone="indigo" size="sm" />
        {label}
      </span>
      <span className={shared.chipRow}>{children}</span>
    </div>
  )
}

function RefChips({ items, catalog, empty }: { items: ResolvedRef[]; catalog: 'segment' | 'resource_use'; empty: string }) {
  if (!items.length) return <span className={shared.muted}>{empty}</span>
  return (
    <>
      {items.map((item) => (
        <CatalogChip key={item.id} item={item} catalog={catalog} />
      ))}
    </>
  )
}

function ClassCard({
  icon,
  tone,
  title,
  source,
  children,
}: {
  icon: typeof Target
  tone: 'blue' | 'amber' | 'violet' | 'teal' | 'indigo' | 'plum' | 'neutral'
  title: string
  source: { label: string; href: string }
  children: ReactNode
}) {
  return (
    <section className={fin.card} aria-label={title}>
      <div className={shared.cellMain}>
        <IconTile icon={icon} tone={tone} size="md" />
        <h3 className={fin.cardTitleSm}>{title}</h3>
      </div>
      {children}
      <p className={styles.sourceLink}>
        Origem:{' '}
        <a href={source.href} className={shared.inlineLink}>
          {source.label}
        </a>
      </p>
    </section>
  )
}

const REF_STATE_LABEL = { active: 'Ativo no catálogo', inactive: 'Inativo no catálogo', missing: 'Não encontrado no catálogo local' } as const

function RefList({
  items,
  catalog,
  source,
  empty,
}: {
  items: ResolvedRef[]
  catalog: 'segment' | 'resource_use'
  source: readonly Readonly<CatalogItem>[]
  empty: string
}) {
  if (!items.length) return <p className={`${styles.sourceLink} ${shared.muted}`}>{empty}</p>
  return (
    <ul className={styles.classList}>
      {items.map((item) => {
        const record = source.find((entry) => entry.id === item.id)
        return (
          <li key={item.id} className={styles.classItem} data-ref={item.id}>
            <span className={styles.classItemName}>
              <CatalogChip item={item} catalog={catalog} />
            </span>
            <span className={styles.classItemMeta}>
              {REF_STATE_LABEL[item.state]} · {item.id}
              {record?.description ? ` · ${record.description}` : ''}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function ConfigurationCard({ opportunity }: { opportunity: Opportunity }) {
  const rules = useModalityRules(opportunity.whitelabelId)
  const choice = rules?.[opportunity.modality]?.opportunityConfig
  const modality = modalityMeta(opportunity.modality).name
  return (
    <section className={fin.card} aria-labelledby="opp-config-title">
      <div className={shared.cellMain}>
        <IconTile icon={SlidersHorizontal} tone="indigo" size="md" />
        <h3 id="opp-config-title" className={fin.cardTitleSm}>
          Configuração da oportunidade
        </h3>
      </div>
      <p className={fin.cardSubtitle}>
        Área reservada para parâmetros específicos desta oportunidade. Eles dependem de decisões de Produto, das regras da
        modalidade e de contratos do Backend — por isso nenhum parâmetro é configurável nesta versão.
      </p>
      <DetailList
        rows={[
          { label: 'Parâmetros específicos', value: <span className={shared.muted}>Nenhum parâmetro disponível nesta versão</span>, wide: true },
          {
            label: `Regra da modalidade (${modality} em ${whitelabelName(opportunity.whitelabelId)})`,
            value: (
              <span className={styles.configValue}>
                Permite configuração no nível da Oportunidade: <strong>{choice ? CHOICE_LABEL[choice] : 'Padrão não definido'}</strong>
              </span>
            ),
            wide: true,
          },
          {
            label: 'Depende de',
            value: 'Decisões de Produto · regras da modalidade (Financeiro › Modalidades e regras) · contratos do Backend',
            wide: true,
          },
        ]}
      />
      <p className={styles.sourceLink}>
        Consulte a regra em{' '}
        <a href={`#/whitelabels/${opportunity.whitelabelId}/finance/modalities`} className={shared.inlineLink}>
          Financeiro › Modalidades e regras
        </a>
        . Esta tela apenas lê o valor; nada é configurado aqui.
      </p>
    </section>
  )
}
