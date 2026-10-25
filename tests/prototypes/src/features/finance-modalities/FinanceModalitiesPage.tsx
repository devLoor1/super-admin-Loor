import { useCallback, useMemo, useState } from 'react'
import { ArrowLeft, Building2, LayoutGrid, ListChecks } from 'lucide-react'
import { useUnsavedChangesGuard } from '../../app/useUnsavedChangesGuard'
import { AppShell } from '../../components/shell/AppShell'
import { usePrototypeNotice } from '../../components/shell/prototypeNotice'
import { DetailTransition } from '../../components/ui/DetailTransition'
import { EmptyState } from '../../components/ui/EmptyState'
import { Tabs } from '../../components/ui/Tabs'
import { tabId, tabPanelId } from '../../components/ui/tabIds'
import { useFinanceSettings } from '../finance-gateways/financeStore'
import { DotMatrixBackground } from '../whitelabels/visuals/DotMatrixBackground'
import { PROTOTYPE_WHITELABELS, type Whitelabel } from '../whitelabels/prototypeWhitelabels'
import { WhitelabelContextSelector } from '../whitelabel-accounts/WhitelabelContextSelector'
import { UnsavedChangesDialog } from '../whitelabel-settings/dialogs/UnsavedChangesDialog'
import {
  MODALITY_CATALOG,
  MODALITY_DRAFT_LABEL,
  modalityDisplay,
  modalityMeta,
  type ModalityDraftKey,
  type ModalityId,
  type ModalityStatusFilter,
} from './modalitiesModel'
import { useModalityActivity, useModalityRules } from './modalitiesStore'
import { GeneralRules } from './sections/GeneralRules'
import { DETAIL_TABS_ID, ModalityDetail, type DetailTab } from './sections/ModalityDetail'
import { ModalityList } from './sections/ModalityList'
import { AboutModalities, ModalityQuickActions } from './sections/ModalitySide'
import { ModalitySummaryCards } from './sections/ModalitySummaryCards'
import styles from './FinanceModalitiesPage.module.css'

const gatewaysHref = (id: string) => `#/whitelabels/${id}/finance/gateways`
const modalitiesHref = (id: string) => `#/whitelabels/${id}/finance/modalities`

type PageTab = 'modalities' | 'general'
const PAGE_TABS_ID = 'mod-page-tabs'
const PAGE_TABS: { value: PageTab; label: string; icon: typeof LayoutGrid }[] = [
  { value: 'modalities', label: 'Modalidades', icon: LayoutGrid },
  { value: 'general', label: 'Regras gerais', icon: ListChecks },
]

/**
 * Modalidades e regras V1 — per-Whitelabel modality governance: which
 * modalities (Equity, Debt) are enabled, generic rule concepts and conceptual
 * dependencies. Configuration only; no Opportunity, investment or payment is
 * created or changed. Frontend prototype: every change is local to the session.
 */
export function FinanceModalitiesPage({ whitelabelId }: { whitelabelId: string }) {
  const whitelabel = PROTOTYPE_WHITELABELS.find((item) => item.id === whitelabelId)
  return (
    <AppShell
      activeNav="financeiro"
      activeSubNav="finance-modalities"
      subNavHrefs={{
        financeiro: gatewaysHref(whitelabelId),
        'finance-gateways': gatewaysHref(whitelabelId),
        'finance-modalities': modalitiesHref(whitelabelId),
        'finance-catalogs': `#/whitelabels/${whitelabelId}/finance/segments-resource-uses`,
      }}
      title="Modalidades e regras"
      location="Modalidades"
      breadcrumbs={[
        { label: 'Financeiro' },
        { label: whitelabel?.name ?? 'Whitelabel não encontrado' },
        { label: 'Modalidades e regras' },
      ]}
    >
      {whitelabel ? (
        <ModalitiesContent whitelabel={whitelabel} />
      ) : (
        <div className={styles.notFound}>
          <EmptyState
            icon={Building2}
            title="Whitelabel não encontrado"
            description={
              <>
                Nenhum Whitelabel ilustrativo usa o ID “{whitelabelId}”.{' '}
                <a href="#/whitelabels" className={styles.inlineLink}>
                  Voltar para Whitelabels
                </a>
              </>
            }
          />
        </div>
      )}
    </AppShell>
  )
}

function ModalitiesContent({ whitelabel }: { whitelabel: Whitelabel }) {
  const [dirty, setDirty] = useState<Partial<Record<ModalityDraftKey, boolean>>>({})
  const [draftReset, setDraftReset] = useState(0)

  const dirtyKeys = (Object.keys(MODALITY_DRAFT_LABEL) as ModalityDraftKey[]).filter((key) => dirty[key])
  const onDirtyChange = useCallback((key: ModalityDraftKey, value: boolean) => {
    setDirty((current) => (Boolean(current[key]) === value ? current : { ...current, [key]: value }))
  }, [])

  // Shared guard (Settings / E-mails / Gateways): links, Back/Forward, reload and the selector.
  const { pending, requestNavigation, stay, discardAndContinue } = useUnsavedChangesGuard(dirtyKeys.length > 0, () => {
    setDirty({})
    setDraftReset((value) => value + 1)
  })

  return (
    <div className={styles.page}>
      <DotMatrixBackground />

      <div className={styles.layout}>
        <section className={styles.context} aria-label="Contexto da página">
          <div className={styles.intro}>
            <a href="#/whitelabels" className={styles.back}>
              <ArrowLeft size={15} strokeWidth={1.9} aria-hidden="true" />
              Voltar para Whitelabels
            </a>
            <p className={styles.subtitle}>
              Modalidades financeiras disponíveis para o Whitelabel selecionado, suas dependências e regras gerais. Somente
              governança: nenhuma Oportunidade, investimento ou pagamento é alterado.
            </p>
          </div>
          <WhitelabelContextSelector
            current={whitelabel}
            options={PROTOTYPE_WHITELABELS}
            onSelect={(id) => {
              const target = PROTOTYPE_WHITELABELS.find((item) => item.id === id)
              requestNavigation(modalitiesHref(id), `trocar para ${target?.name ?? id}`)
            }}
          />
        </section>

        <DetailTransition item={whitelabel} className={styles.content} sectionId="finance-modalities" labelledBy="finance-modalities-label">
          {(displayed) => (
            <ModalitySections key={`${displayed.id}:${draftReset}`} whitelabel={displayed} dirty={dirty} onDirtyChange={onDirtyChange} />
          )}
        </DetailTransition>
      </div>

      {pending ? (
        <UnsavedChangesDialog
          sections={dirtyKeys.map((key) => MODALITY_DRAFT_LABEL[key])}
          destination={pending.destination}
          onStay={stay}
          onDiscard={discardAndContinue}
        />
      ) : null}
    </div>
  )
}

type PendingSelection = { id: ModalityId; tab: DetailTab; focusEdit: boolean }

function ModalitySections({
  whitelabel,
  dirty,
  onDirtyChange,
}: {
  whitelabel: Whitelabel
  dirty: Partial<Record<ModalityDraftKey, boolean>>
  onDirtyChange: (key: ModalityDraftKey, dirty: boolean) => void
}) {
  const notify = usePrototypeNotice()
  const settings = useFinanceSettings(whitelabel.id)
  const rules = useModalityRules(whitelabel.id)
  const activity = useModalityActivity(whitelabel.id)
  const [selectedId, setSelectedId] = useState<ModalityId>(MODALITY_CATALOG[0].id)
  const [detailTab, setDetailTab] = useState<DetailTab>('overview')
  const [pageTab, setPageTab] = useState<PageTab>('modalities')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<ModalityStatusFilter>('all')
  const [pendingSelection, setPendingSelection] = useState<PendingSelection | null>(null)

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return MODALITY_CATALOG.filter((modality) => {
      if (settings && status !== 'all' && modalityDisplay(settings, modality.id) !== status) return false
      return !needle || `${modality.name} ${modality.description}`.toLowerCase().includes(needle)
    })
  }, [settings, query, status])

  if (!settings || !rules) {
    return (
      <div className={styles.notFound} data-detail-stage>
        <p id="finance-modalities-label" className="visually-hidden">
          Modalidades de {whitelabel.name}
        </p>
        <EmptyState icon={Building2} title="Configuração indisponível" description="Não há dados ilustrativos de modalidades para este Whitelabel." />
      </div>
    )
  }

  const rulesDirty = Boolean(dirty['modality-rules'])
  const selected = modalityMeta(selectedId)

  function revealDetail(focusEdit: boolean) {
    window.requestAnimationFrame(() => {
      if (window.matchMedia('(max-width: 1359px)').matches) {
        const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
        document.getElementById('mod-detail')?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' })
      }
      if (focusEdit) {
        const target =
          document.querySelector<HTMLElement>('#mod-rules [data-section-edit]') ?? document.getElementById(`mod-rule-manualApproval`)
        target?.focus({ preventScroll: true })
      }
    })
  }

  function applySelection({ id, tab, focusEdit }: PendingSelection) {
    setSelectedId(id)
    setDetailTab(tab)
    revealDetail(focusEdit)
  }

  /** Switching modality drops the selected modality's rules draft — ask first. */
  function requestSelection(next: PendingSelection) {
    if (next.id !== selectedId && rulesDirty) {
      setPendingSelection(next)
      return
    }
    if (next.id === selectedId && next.tab === detailTab && !next.focusEdit) return
    applySelection(next)
  }

  const selectModality = (id: ModalityId) => requestSelection({ id, tab: id === selectedId ? detailTab : 'overview', focusEdit: false })
  const editRules = (id: ModalityId) => requestSelection({ id, tab: 'rules', focusEdit: true })

  return (
    <>
      <p id="finance-modalities-label" className="visually-hidden">
        Modalidades e regras de {whitelabel.name}
      </p>
      <ModalitySummaryCards settings={settings} rules={rules} />
      <div className={styles.grid}>
        <div className={styles.areaMain} data-detail-stage>
          <Tabs
            variant="segmented"
            idPrefix={PAGE_TABS_ID}
            label="Seções de modalidades e regras"
            tabs={PAGE_TABS}
            value={pageTab}
            onChange={setPageTab}
            className={styles.pageTabs}
          />
          <div
            role="tabpanel"
            id={tabPanelId(PAGE_TABS_ID, 'modalities')}
            aria-labelledby={tabId(PAGE_TABS_ID, 'modalities')}
            hidden={pageTab !== 'modalities'}
            className={styles.pagePanel}
          >
            <ModalityList
              whitelabelName={whitelabel.name}
              settings={settings}
              rules={rules}
              rows={rows}
              selectedId={selectedId}
              editedId={rulesDirty ? selectedId : null}
              query={query}
              onQueryChange={setQuery}
              status={status}
              onStatusChange={setStatus}
              onSelect={selectModality}
              onEditRules={editRules}
            />
          </div>
          <div
            role="tabpanel"
            id={tabPanelId(PAGE_TABS_ID, 'general')}
            aria-labelledby={tabId(PAGE_TABS_ID, 'general')}
            hidden={pageTab !== 'general'}
            className={styles.pagePanel}
          >
            <GeneralRules settings={settings} rules={rules} onEditRules={editRules} />
          </div>
        </div>
        <div className={styles.areaDetail}>
          <ModalityDetail
            key={selectedId}
            whitelabel={whitelabel}
            modality={selected}
            settings={settings}
            rules={rules[selectedId]}
            activity={activity}
            tab={detailTab}
            onTabChange={setDetailTab}
            onDirtyChange={onDirtyChange}
            notify={notify}
          />
        </div>
        <div className={styles.areaAbout} data-detail-stage>
          <AboutModalities catalogsHref={`#/whitelabels/${whitelabel.id}/finance/segments-resource-uses`} />
        </div>
        <div className={styles.areaSide} data-detail-stage>
          <ModalityQuickActions
            selectedName={selected.name}
            auditHref={`#/audit?whitelabel=${whitelabel.id}`}
            onConfigure={() => editRules(selectedId)}
            onGeneralRules={() => {
              setPageTab('general')
              window.requestAnimationFrame(() => {
                const tab = document.getElementById(tabId(PAGE_TABS_ID, 'general'))
                tab?.scrollIntoView({ block: 'nearest' })
                tab?.focus({ preventScroll: true })
              })
            }}
            onDependencies={() => {
              setDetailTab('dependencies')
              window.requestAnimationFrame(() => {
                const tab = document.getElementById(tabId(DETAIL_TABS_ID, 'dependencies'))
                tab?.scrollIntoView({ block: 'nearest' })
                tab?.focus({ preventScroll: true })
              })
            }}
          />
        </div>
      </div>

      {pendingSelection ? (
        <UnsavedChangesDialog
          sections={[MODALITY_DRAFT_LABEL['modality-rules']]}
          destination="selecionar outra modalidade"
          onStay={() => setPendingSelection(null)}
          onDiscard={() => {
            const next = pendingSelection
            setPendingSelection(null)
            onDirtyChange('modality-rules', false)
            applySelection(next)
          }}
        />
      ) : null}
    </>
  )
}
