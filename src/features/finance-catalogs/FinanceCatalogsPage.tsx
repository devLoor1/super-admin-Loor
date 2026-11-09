import { useCallback, useState } from 'react'
import { ArrowLeft, Building2 } from 'lucide-react'
import { useUnsavedChangesGuard } from '../../app/useUnsavedChangesGuard'
import { AppShell } from '../../components/shell/AppShell'
import { usePrototypeNotice } from '../../components/shell/prototypeNotice'
import { DetailTransition } from '../../components/ui/DetailTransition'
import { EmptyState } from '../../components/ui/EmptyState'
import { DotMatrixBackground } from '../whitelabels/visuals/DotMatrixBackground'
import { PROTOTYPE_WHITELABELS, type Whitelabel } from '../whitelabels/prototypeWhitelabels'
import { WhitelabelContextSelector } from '../whitelabel-accounts/WhitelabelContextSelector'
import { UnsavedChangesDialog } from '../whitelabel-settings/dialogs/UnsavedChangesDialog'
import {
  CATALOG_META,
  DRAFT_KEY,
  DRAFT_LABEL,
  describeChanges,
  tidy,
  type CatalogDraft,
  type CatalogDraftKey,
  type CatalogItem,
  type CatalogKind,
} from './catalogModel'
import {
  addCatalogActivity,
  createResourceUse,
  createSegment,
  deleteResourceUse,
  deleteSegment,
  updateResourceUse,
  updateSegment,
  useCatalogActivity,
  useResourceUses,
  useSegments,
} from './catalogStore'
import { CatalogItemDialog, DeleteCatalogItemDialog } from './dialogs/CatalogDialogs'
import { CatalogPanel } from './sections/CatalogPanel'
import { CatalogActivityPanel, CatalogNotes, CatalogSummaryCards } from './sections/CatalogSummary'
import sectionStyles from './sections/CatalogSections.module.css'
import styles from './FinanceCatalogsPage.module.css'

const gatewaysHref = (id: string) => `#/whitelabels/${id}/finance/gateways`
const modalitiesHref = (id: string) => `#/whitelabels/${id}/finance/modalities`
const catalogsHref = (id: string) => `#/whitelabels/${id}/finance/segments-resource-uses`

/**
 * Segmentos e usos dos recursos V1 — two independent per-Whitelabel catalogs
 * (Segments, Resource Uses) with local CRUD, shown together because both feed
 * the future Opportunity flow. No Opportunity, link between catalogs or
 * Backend call exists. Frontend prototype: changes last for the session only.
 */
export function FinanceCatalogsPage({ whitelabelId }: { whitelabelId: string }) {
  const whitelabel = PROTOTYPE_WHITELABELS.find((item) => item.id === whitelabelId)
  return (
    <AppShell
      activeNav="financeiro"
      activeSubNav="finance-catalogs"
      subNavHrefs={{
        financeiro: gatewaysHref(whitelabelId),
        'finance-gateways': gatewaysHref(whitelabelId),
        'finance-modalities': modalitiesHref(whitelabelId),
        'finance-catalogs': catalogsHref(whitelabelId),
      }}
      title="Segmentos e usos dos recursos"
      location="Segmentos e usos"
      breadcrumbs={[
        { label: 'Financeiro' },
        { label: whitelabel?.name ?? 'Whitelabel não encontrado' },
        { label: 'Segmentos e usos dos recursos' },
      ]}
    >
      {whitelabel ? (
        <CatalogsContent whitelabel={whitelabel} />
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

function CatalogsContent({ whitelabel }: { whitelabel: Whitelabel }) {
  const [dirty, setDirty] = useState<Partial<Record<CatalogDraftKey, boolean>>>({})
  const [draftReset, setDraftReset] = useState(0)

  const dirtyKeys = (Object.keys(DRAFT_LABEL) as CatalogDraftKey[]).filter((key) => dirty[key])
  const onDirtyChange = useCallback((key: CatalogDraftKey, value: boolean) => {
    setDirty((current) => (Boolean(current[key]) === value ? current : { ...current, [key]: value }))
  }, [])

  // Shared guard: links, Back/Forward, reload and the selector. Escape/close of
  // a dirty form is handled inside the dialog itself.
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
              Catálogos de segmentos e de usos dos recursos do Whitelabel selecionado. Serão usados na criação de Oportunidades,
              mas são independentes entre si.
            </p>
          </div>
          <WhitelabelContextSelector
            current={whitelabel}
            options={PROTOTYPE_WHITELABELS}
            onSelect={(id) => {
              const target = PROTOTYPE_WHITELABELS.find((item) => item.id === id)
              requestNavigation(catalogsHref(id), `trocar para ${target?.name ?? id}`)
            }}
          />
        </section>

        <DetailTransition item={whitelabel} className={styles.content} sectionId="finance-catalogs" labelledBy="finance-catalogs-label">
          {(displayed) => (
            <CatalogSections key={`${displayed.id}:${draftReset}`} whitelabel={displayed} onDirtyChange={onDirtyChange} />
          )}
        </DetailTransition>
      </div>

      {pending ? (
        <UnsavedChangesDialog
          sections={dirtyKeys.map((key) => DRAFT_LABEL[key])}
          destination={pending.destination}
          onStay={stay}
          onDiscard={discardAndContinue}
        />
      ) : null}
    </div>
  )
}

type DialogState = { mode: 'form'; kind: CatalogKind; item?: CatalogItem } | { mode: 'delete'; item: CatalogItem } | null
type Reveal = { id: string; nonce: number } | null

function CatalogSections({
  whitelabel,
  onDirtyChange,
}: {
  whitelabel: Whitelabel
  onDirtyChange: (key: CatalogDraftKey, dirty: boolean) => void
}) {
  const notify = usePrototypeNotice()
  const segments = useSegments(whitelabel.id)
  const resourceUses = useResourceUses(whitelabel.id)
  const activity = useCatalogActivity(whitelabel.id)
  const [dialog, setDialog] = useState<DialogState>(null)
  const [reveal, setReveal] = useState<Record<CatalogKind, Reveal>>({ segment: null, resource_use: null })

  const listOf = (kind: CatalogKind): CatalogItem[] => (kind === 'segment' ? segments : resourceUses)
  const otherOf = (kind: CatalogKind): CatalogItem[] => (kind === 'segment' ? resourceUses : segments)
  const onSegmentDirty = useCallback((value: boolean) => onDirtyChange(DRAFT_KEY.segment, value), [onDirtyChange])
  const onUseDirty = useCallback((value: boolean) => onDirtyChange(DRAFT_KEY.resource_use, value), [onDirtyChange])

  function save(kind: CatalogKind, draft: CatalogDraft, item?: CatalogItem) {
    const meta = CATALOG_META[kind]
    const name = tidy(draft.name)
    let id: string
    // Each catalog has its own actions — nothing is written to the other one.
    if (item?.kind === 'segment') updateSegment(whitelabel.id, item.id, draft)
    else if (item?.kind === 'resource_use') updateResourceUse(whitelabel.id, item.id, draft)
    if (item) id = item.id
    else id = (kind === 'segment' ? createSegment(whitelabel.id, draft) : createResourceUse(whitelabel.id, draft)).id

    addCatalogActivity(whitelabel.id, {
      catalog: kind,
      kind: item ? 'updated' : 'created',
      title: `“${name}” ${item ? 'atualizado' : 'criado'} localmente`,
      detail: item ? describeChanges(item, draft) || 'Sem alterações de conteúdo' : undefined,
    })
    setDialog(null)
    setReveal((current) => ({ ...current, [kind]: { id, nonce: (current[kind]?.nonce ?? 0) + 1 } }))
    notify(
      `${meta.singular.charAt(0).toUpperCase()}${meta.singular.slice(1)} “${name}” ${item ? 'atualizado' : 'criado'} neste protótipo. Nada foi enviado ao Backend.`,
    )
  }

  function remove(item: CatalogItem) {
    const meta = CATALOG_META[item.kind]
    if (item.kind === 'segment') deleteSegment(whitelabel.id, item.id)
    else deleteResourceUse(whitelabel.id, item.id)
    addCatalogActivity(whitelabel.id, { catalog: item.kind, kind: 'deleted', title: `“${item.name}” excluído localmente` })
    setDialog(null)
    notify(
      `${meta.singular.charAt(0).toUpperCase()}${meta.singular.slice(1)} “${item.name}” excluído deste protótipo. Nenhuma Oportunidade foi alterada.`,
    )
  }

  return (
    <>
      <p id="finance-catalogs-label" className="visually-hidden">
        Segmentos e usos dos recursos de {whitelabel.name}
      </p>
      <CatalogSummaryCards segments={segments} resourceUses={resourceUses} />
      <div className={styles.catalogs}>
        {(['segment', 'resource_use'] as const).map((kind) => (
          <CatalogPanel
            key={kind}
            kind={kind}
            items={listOf(kind)}
            whitelabelName={whitelabel.name}
            reveal={reveal[kind]}
            onCreate={() => setDialog({ mode: 'form', kind })}
            onEdit={(item) => setDialog({ mode: 'form', kind, item })}
            onDelete={(item) => setDialog({ mode: 'delete', item })}
          />
        ))}
      </div>
      <div className={sectionStyles.bottom}>
        <CatalogNotes />
        <CatalogActivityPanel entries={activity} />
      </div>

      {dialog?.mode === 'form' ? (
        <CatalogItemDialog
          key={`${dialog.kind}:${dialog.item?.id ?? 'new'}`}
          kind={dialog.kind}
          item={dialog.item}
          siblings={listOf(dialog.kind)}
          otherCatalog={otherOf(dialog.kind)}
          whitelabelName={whitelabel.name}
          onCancel={() => setDialog(null)}
          onSave={(draft) => save(dialog.kind, draft, dialog.item)}
          onDirtyChange={dialog.kind === 'segment' ? onSegmentDirty : onUseDirty}
        />
      ) : null}
      {dialog?.mode === 'delete' ? (
        <DeleteCatalogItemDialog
          item={dialog.item}
          otherCatalog={otherOf(dialog.item.kind)}
          onCancel={() => setDialog(null)}
          onConfirm={() => remove(dialog.item)}
          fallbackFocus={() => document.querySelector<HTMLElement>(`[data-create="${dialog.item.kind}"]`)}
        />
      ) : null}
    </>
  )
}
