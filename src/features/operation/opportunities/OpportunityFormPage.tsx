import { useEffect, useId, useRef, useState, type FormEvent, type RefObject } from 'react'
import { AlertCircle, AlertTriangle, Info, Save, SearchX, X } from 'lucide-react'
import { EmptyState } from '../../../components/ui/EmptyState'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import { PrimaryButton } from '../../../components/ui/PrimaryButton'
import { useUnsavedChangesGuard } from '../../../app/useUnsavedChangesGuard'
import fin from '../../finance-gateways/sections/FinanceSections.module.css'
import { MODALITY_DISPLAY_META } from '../../finance-gateways/financeModel'
import { useFinanceSettings } from '../../finance-gateways/financeStore'
import { CATALOG_NAMES, MODALITY_CATALOG } from '../../finance-modalities/modalitiesModel'
import dialogStyles from '../../whitelabel-settings/dialogs/SettingsDialogs.module.css'
import { PROTOTYPE_WHITELABELS } from '../../whitelabels/prototypeWhitelabels'
import { addOperationActivity } from '../shared/operationActivity'
import { crumbLabel, whitelabelName } from '../shared/operationModel'
import { entrepreneursOf } from '../shared/participants'
import { BackLink, OperationShell, PageIntro } from '../shared/OperationUi'
import shared from '../shared/Operation.module.css'
import { DiscardChangesDialog } from '../shared/DiscardChangesDialog'
import { queueNotice } from '../shared/queuedNotice'
import { CatalogPicker } from './CatalogPicker'
import { useCatalogResolver } from './classification'
import {
  DESCRIPTION_MAX,
  EMPTY_DRAFT,
  FIELD_LABEL,
  FIELD_ORDER,
  NAME_MAX,
  NAME_MIN,
  OPPORTUNITY_STATUSES,
  OPPORTUNITY_STATUS_META,
  changedFields,
  draftOf,
  draftsEqual,
  modalityName,
  validateDraft,
  type DraftErrors,
  type DraftField,
  type Opportunity,
  type OpportunityDraft,
} from './opportunityModel'
import { createOpportunity, updateOpportunity, useOpportunity } from './opportunityStore'
import { OpportunityStatusPill } from './OpportunityParts'
import styles from './Opportunities.module.css'

type Props =
  | { mode: 'create'; opportunityId?: undefined; focusClassification?: undefined }
  | { mode: 'edit'; opportunityId: string; focusClassification?: boolean }

/**
 * Create (`#/operation/opportunities/new`) and edit (`…/:id/edit`) on a
 * dedicated page. Local prototype state only; unsaved edits are guarded.
 */
export function OpportunityFormPage(props: Props) {
  const opportunity = useOpportunity(props.opportunityId ?? '')
  if (props.mode === 'edit' && !opportunity) {
    return (
      <OperationShell section="opportunities" title="Editar oportunidade" trail={['Não encontrada']}>
        <div className={shared.notFound}>
          <EmptyState
            icon={SearchX}
            title="Oportunidade não encontrada"
            description={
              <>
                Nenhuma oportunidade local usa o ID “{props.opportunityId}”.{' '}
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
  return <OpportunityForm source={opportunity} focusClassification={props.focusClassification ?? false} />
}

function OpportunityForm({ source, focusClassification }: { source?: Opportunity; focusClassification: boolean }) {
  const editing = Boolean(source)
  const catalogs = useCatalogResolver()
  const [initial] = useState<OpportunityDraft>(() => (source ? draftOf(source) : EMPTY_DRAFT))
  const [draft, setDraft] = useState<OpportunityDraft>(initial)
  const [errors, setErrors] = useState<DraftErrors>({})
  const [attempted, setAttempted] = useState(false)
  const [tenantNotice, setTenantNotice] = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [leaveTo, setLeaveTo] = useState<string | null>(null)
  const finance = useFinanceSettings(draft.whitelabelId)

  const dirty = leaveTo === null && !draftsEqual(draft, initial)
  const backHref = source ? `#/operation/opportunities/${source.id}` : '#/operation/opportunities'
  const { pending, stay, discardAndContinue } = useUnsavedChangesGuard(dirty, () => {})

  // Leave only after the guard has seen the clean state of this render.
  useEffect(() => {
    if (leaveTo) window.location.hash = leaveTo
  }, [leaveTo])

  const nameRef = useRef<HTMLInputElement>(null)
  const whitelabelRef = useRef<HTMLSelectElement>(null)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)
  const modalityRef = useRef<HTMLInputElement>(null)

  function focusField(field: DraftField) {
    const target = { name: nameRef, whitelabelId: whitelabelRef, description: descriptionRef, modality: modalityRef }[field]
    target.current?.focus()
  }
  const classificationRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (!focusClassification) return
    classificationRef.current?.scrollIntoView({ block: 'start' })
    classificationRef.current?.focus({ preventScroll: true })
  }, [focusClassification])

  function patch(next: Partial<OpportunityDraft>) {
    const updated = { ...draft, ...next }
    setDraft(updated)
    // After a failed save, errors follow the edits live.
    if (attempted) setErrors(validateDraft(updated))
  }

  function changeWhitelabel(whitelabelId: string) {
    const cleared: string[] = []
    if (draft.entrepreneurId) cleared.push('empreendedor')
    if (draft.segmentIds.length) cleared.push('segmentos')
    if (draft.resourceUseIds.length) cleared.push('usos dos recursos')
    patch({ whitelabelId, entrepreneurId: '', segmentIds: [], resourceUseIds: [] })
    setTenantNotice(
      cleared.length
        ? `${capitalize(new Intl.ListFormat('pt-BR', { type: 'conjunction' }).format(cleared))} ${
            cleared.length === 1 && cleared[0] === 'empreendedor' ? 'foi limpo' : 'foram limpos'
          }: pertencem ao Whitelabel anterior. Os catálogos e empreendedores são de cada Whitelabel neste protótipo.`
        : null,
    )
  }

  function submit(view: boolean) {
    setAttempted(true)
    const found = validateDraft(draft)
    setErrors(found)
    const first = FIELD_ORDER.find((field) => found[field])
    if (first) {
      focusField(first)
      return
    }
    if (source) {
      const changes = changedFields(initial, draft)
      updateOpportunity(source.id, draft)
      if (changes.length) {
        const general = changes.filter((key) => !['modality', 'segmentIds', 'resourceUseIds', 'status'].includes(key))
        const classification = changes.filter((key) => ['modality', 'segmentIds', 'resourceUseIds'].includes(key))
        if (general.length) {
          addOperationActivity(source.id, {
            title: 'Oportunidade editada localmente',
            detail: `Campos: ${general.map((key) => FIELD_LABEL[key]).join(', ')}${
              general.includes('whitelabelId') ? ` (agora em ${whitelabelName(draft.whitelabelId)} — movimentação apenas no protótipo)` : ''
            }`,
          })
        }
        if (classification.length) {
          addOperationActivity(source.id, {
            title: 'Classificação alterada localmente',
            detail: classification.map((key) => FIELD_LABEL[key]).join(', '),
          })
        }
        if (changes.includes('status')) {
          addOperationActivity(source.id, {
            title: 'Status alterado localmente',
            detail: `${OPPORTUNITY_STATUS_META[initial.status].label} → ${OPPORTUNITY_STATUS_META[draft.status].label}`,
          })
        }
      }
      queueNotice(
        changes.length
          ? `Oportunidade “${draft.name.trim()}” atualizada neste protótipo. Nada foi enviado ao Backend.`
          : 'Nenhuma alteração para salvar.',
      )
      setLeaveTo(`#/operation/opportunities/${source.id}`)
      return
    }
    const created = createOpportunity(draft)
    addOperationActivity(created.id, {
      title: 'Oportunidade criada localmente',
      detail: `${whitelabelName(created.whitelabelId)} · ${modalityName(created.modality)} · status inicial Rascunho`,
    })
    queueNotice(`Oportunidade “${created.name}” criada como Rascunho neste protótipo. Nada foi enviado ao Backend.`)
    setLeaveTo(view ? `#/operation/opportunities/${created.id}` : '#/operation/opportunities')
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    submit(true)
  }

  function cancel() {
    if (dirty) setConfirmCancel(true)
    else window.location.hash = backHref
  }

  const changedLabels = changedFields(initial, draft).map((key) => FIELD_LABEL[key])
  const entrepreneurs = draft.whitelabelId ? entrepreneursOf(draft.whitelabelId) : []
  const tenantName = draft.whitelabelId ? whitelabelName(draft.whitelabelId) : ''
  const modalitySetting = draft.modality && finance ? finance.modalities[draft.modality] : undefined

  const title = editing ? 'Editar oportunidade' : 'Nova oportunidade'
  const formId = 'opportunity-form'

  return (
    <OperationShell
      section="opportunities"
      title={title}
      trail={source ? [crumbLabel(source.name), 'Editar'] : ['Nova oportunidade']}
    >
      <PageIntro
        back={<BackLink href={backHref} label={source ? 'Voltar para a oportunidade' : 'Voltar para Oportunidades'} />}
        text={
          source
            ? `Editando “${source.name}” (${source.id}). As alterações ficam somente nesta sessão do navegador.`
            : 'Cadastre uma nova oportunidade para o Whitelabel selecionado. Ela nasce como Rascunho e fica somente nesta sessão do navegador.'
        }
        actions={
          <div className={styles.formActions}>
            <OutlineButton className={shared.secondaryButton} onClick={cancel} data-form-cancel>
              <X size={16} strokeWidth={1.9} aria-hidden="true" />
              Cancelar
            </OutlineButton>
            {editing ? (
              <PrimaryButton type="submit" form={formId} className={shared.ctaButton} data-form-save>
                <Save size={16} strokeWidth={1.9} aria-hidden="true" />
                Salvar alterações
              </PrimaryButton>
            ) : (
              <>
                <OutlineButton className={shared.secondaryButton} onClick={() => submit(false)} data-form-save>
                  <Save size={16} strokeWidth={1.9} aria-hidden="true" />
                  Salvar
                </OutlineButton>
                <PrimaryButton type="submit" form={formId} className={shared.ctaButton} data-form-save-view>
                  Salvar e visualizar
                </PrimaryButton>
              </>
            )}
          </div>
        }
      />

      <form id={formId} className={styles.formGrid} onSubmit={onSubmit} noValidate aria-label={title}>
        <section className={`${fin.card} ${styles.formCard}`} aria-labelledby="opp-form-general">
          <h2 id="opp-form-general" className={styles.sectionTitle}>
            Dados gerais
          </h2>
          <div className={styles.fields}>
            <TextField
              id="opp-name"
              label="Nome da oportunidade"
              required
              value={draft.name}
              max={NAME_MAX}
              placeholder="Ex.: Expansão Sul"
              hint={`De ${NAME_MIN} a ${NAME_MAX} caracteres — limite de UX deste protótipo, não uma regra do Backend.`}
              error={errors.name}
              inputRef={nameRef}
              onChange={(name) => patch({ name })}
            />

            <div className={dialogStyles.field}>
              <label htmlFor="opp-whitelabel" className={dialogStyles.label}>
                Whitelabel <span className={dialogStyles.required}>(obrigatório)</span>
              </label>
              <select
                id="opp-whitelabel"
                ref={whitelabelRef}
                className={`${dialogStyles.input} ${styles.select}`}
                value={draft.whitelabelId}
                aria-invalid={Boolean(errors.whitelabelId) || undefined}
                aria-describedby={`opp-whitelabel-hint${errors.whitelabelId ? ' opp-whitelabel-error' : ''}`}
                onChange={(event) => changeWhitelabel(event.target.value)}
              >
                <option value="">Selecione o Whitelabel</option>
                {PROTOTYPE_WHITELABELS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <p id="opp-whitelabel-hint" className={dialogStyles.hint}>
                Contexto da oportunidade neste protótipo. A posse definitiva (e mover entre Whitelabels) depende de Produto e Backend.
              </p>
              {errors.whitelabelId ? <FieldError id="opp-whitelabel-error" message={errors.whitelabelId} /> : null}
              {editing && draft.whitelabelId && draft.whitelabelId !== initial.whitelabelId ? (
                <p className={styles.notice} data-tenant-move>
                  <AlertTriangle size={14} strokeWidth={1.9} aria-hidden="true" />
                  Mover esta oportunidade de {whitelabelName(initial.whitelabelId)} para {tenantName} é apenas comportamento do
                  protótipo. O significado real (dados, vínculos e permissões) depende de Produto e Backend.
                </p>
              ) : null}
              {tenantNotice ? (
                <p className={styles.notice} role="status">
                  <AlertTriangle size={14} strokeWidth={1.9} aria-hidden="true" />
                  {tenantNotice}
                </p>
              ) : null}
            </div>

            <TextField
              id="opp-description"
              label="Descrição"
              optional
              multiline
              value={draft.description}
              max={DESCRIPTION_MAX}
              placeholder="Descreva a oportunidade (opcional)"
              hint={`Até ${DESCRIPTION_MAX} caracteres — limite de UX deste protótipo.`}
              error={errors.description}
              inputRef={descriptionRef}
              onChange={(description) => patch({ description })}
            />

            <div className={dialogStyles.field}>
              <label htmlFor="opp-entrepreneur" className={dialogStyles.label}>
                Empreendedor <span className={dialogStyles.required}>(opcional)</span>
              </label>
              <select
                id="opp-entrepreneur"
                className={`${dialogStyles.input} ${styles.select}`}
                value={draft.entrepreneurId}
                disabled={!draft.whitelabelId || entrepreneurs.length === 0}
                aria-describedby="opp-entrepreneur-hint"
                onChange={(event) => patch({ entrepreneurId: event.target.value })}
              >
                <option value="">
                  {!draft.whitelabelId
                    ? 'Selecione primeiro o Whitelabel'
                    : entrepreneurs.length
                      ? 'Sem empreendedor vinculado'
                      : `Nenhum empreendedor de ${tenantName}`}
                </option>
                {entrepreneurs.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.account.name}
                    {item.account.accessState === 'paused' ? ' (conta pausada)' : ''}
                  </option>
                ))}
              </select>
              <p id="opp-entrepreneur-hint" className={dialogStyles.hint}>
                Referência a um empreendedor do mesmo Whitelabel; o cadastro dele é gerenciado em Contas. Um único seletor nesta
                versão — a cardinalidade final é uma decisão de Produto.
              </p>
            </div>

            <div className={dialogStyles.field}>
              {editing ? (
                <fieldset className={styles.fieldset} aria-describedby="opp-status-hint">
                  <legend className={dialogStyles.label}>Status do protótipo</legend>
                  <div className={styles.choiceGroup}>
                    {OPPORTUNITY_STATUSES.map((key) => (
                      <label key={key} className={styles.choice}>
                        <input
                          type="radio"
                          name="opp-status"
                          value={key}
                          checked={draft.status === key}
                          onChange={() => patch({ status: key })}
                        />
                        {OPPORTUNITY_STATUS_META[key].label}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : (
                <>
                  <span className={dialogStyles.label}>Status inicial</span>
                  <span className={styles.statusFixed}>
                    <OpportunityStatusPill status="draft" />
                  </span>
                </>
              )}
              <p id="opp-status-hint" className={dialogStyles.hint}>
                Rascunho, Ativa e Pausada são estados operacionais do protótipo — não o fluxo oficial, sem transições obrigatórias.
              </p>
            </div>
          </div>
        </section>

        <section className={`${fin.card} ${styles.formCard}`} aria-labelledby="opp-form-classification">
          <h2 id="opp-form-classification" ref={classificationRef} tabIndex={-1} className={styles.sectionTitle}>
            Classificação
          </h2>
          <div className={styles.fields}>
            <fieldset className={styles.fieldset} aria-describedby={`opp-modality-hint${errors.modality ? ' opp-modality-error' : ''}`}>
              <legend className={dialogStyles.label}>
                Modalidade <span className={dialogStyles.required}>(obrigatória)</span>
              </legend>
              <div className={styles.choiceGroup}>
                {MODALITY_CATALOG.map((item, index) => {
                  const Icon = item.icon
                  return (
                    <label key={item.id} className={styles.choice} data-invalid={errors.modality ? '' : undefined}>
                      <input
                        ref={index === 0 ? modalityRef : undefined}
                        type="radio"
                        name="opp-modality"
                        value={item.id}
                        checked={draft.modality === item.id}
                        aria-invalid={Boolean(errors.modality) || undefined}
                        onChange={() => patch({ modality: item.id })}
                      />
                      <span className={styles.choiceIcon} data-tone={item.tone} aria-hidden="true">
                        <Icon size={15} strokeWidth={1.8} />
                      </span>
                      {item.name}
                    </label>
                  )
                })}
              </div>
              <p id="opp-modality-hint" className={dialogStyles.hint}>
                Catálogo atual de Financeiro › Modalidades e regras: {CATALOG_NAMES}. Uma modalidade por oportunidade neste
                protótipo; obrigatoriedade e cardinalidade finais dependem de Produto.
                {modalitySetting
                  ? ` Em ${tenantName}, ${modalityName(draft.modality || 'equity')} está “${MODALITY_DISPLAY_META[modalitySetting].label}” — informativo, o protótipo não bloqueia a escolha.`
                  : ''}
              </p>
              {errors.modality ? <FieldError id="opp-modality-error" message={errors.modality} /> : null}
            </fieldset>

            <CatalogPicker
              catalog="segment"
              label="Segmentos"
              singular="segmento"
              items={draft.whitelabelId ? catalogs.segmentsOf(draft.whitelabelId) : []}
              selected={draft.segmentIds}
              onChange={(segmentIds) => patch({ segmentIds })}
              disabledReason={draft.whitelabelId ? undefined : 'Selecione primeiro o Whitelabel'}
              hint={`Somente o catálogo de Segmentos${tenantName ? ` de ${tenantName}` : ''}, itens ativos. Seleção múltipla do protótipo — não é a cardinalidade final.`}
            />

            <CatalogPicker
              catalog="resource_use"
              label="Usos dos recursos"
              singular="uso do recurso"
              items={draft.whitelabelId ? catalogs.resourceUsesOf(draft.whitelabelId) : []}
              selected={draft.resourceUseIds}
              onChange={(resourceUseIds) => patch({ resourceUseIds })}
              disabledReason={draft.whitelabelId ? undefined : 'Selecione primeiro o Whitelabel'}
              hint={`Somente o catálogo de Usos dos recursos${tenantName ? ` de ${tenantName}` : ''}, itens ativos. Seleção múltipla do protótipo — não é a cardinalidade final.`}
            />

            <p className={shared.callout}>
              <Info size={15} strokeWidth={1.8} aria-hidden="true" />
              <span>
                <strong>Modalidade, segmentos e usos dos recursos são independentes.</strong> Nenhuma escolha altera outra; o mesmo
                nome pode existir nos dois catálogos (ex.: Capital de Giro) como registros separados — e Capital de Giro não é
                modalidade.
              </span>
            </p>
          </div>
        </section>
      </form>

      {confirmCancel ? (
        <DiscardChangesDialog
          fields={changedLabels}
          destination="cancelar"
          onStay={() => setConfirmCancel(false)}
          onDiscard={() => {
            setConfirmCancel(false)
            setLeaveTo(backHref)
          }}
        />
      ) : null}
      {pending ? (
        <DiscardChangesDialog fields={changedLabels} destination={pending.destination} onStay={stay} onDiscard={discardAndContinue} />
      ) : null}
    </OperationShell>
  )
}

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} className={dialogStyles.error}>
      <AlertCircle size={14} strokeWidth={2} aria-hidden="true" />
      {message}
    </p>
  )
}

function TextField({
  id,
  label,
  required,
  optional,
  multiline,
  value,
  max,
  placeholder,
  hint,
  error,
  inputRef,
  onChange,
}: {
  id: string
  label: string
  required?: boolean
  optional?: boolean
  multiline?: boolean
  value: string
  max: number
  placeholder: string
  hint: string
  error?: string
  inputRef: RefObject<HTMLInputElement | HTMLTextAreaElement | null>
  onChange: (value: string) => void
}) {
  const counterId = useId()
  const describedBy = [`${id}-hint`, counterId, error ? `${id}-error` : ''].filter(Boolean).join(' ')
  const common = {
    id,
    value,
    placeholder,
    'aria-invalid': Boolean(error) || undefined,
    'aria-describedby': describedBy,
    'aria-required': required || undefined,
  }
  return (
    <div className={dialogStyles.field}>
      <div className={dialogStyles.labelRow}>
        <label htmlFor={id} className={dialogStyles.label}>
          {label} {required ? <span className={dialogStyles.required}>(obrigatório)</span> : null}
          {optional ? <span className={dialogStyles.required}>(opcional)</span> : null}
        </label>
        <span id={counterId} className={dialogStyles.counter}>
          {value.length}/{max}
        </span>
      </div>
      {multiline ? (
        <textarea
          {...common}
          ref={inputRef as RefObject<HTMLTextAreaElement | null>}
          className={`${dialogStyles.textarea} ${styles.textarea}`}
          rows={4}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          {...common}
          ref={inputRef as RefObject<HTMLInputElement | null>}
          type="text"
          className={dialogStyles.input}
          autoComplete="off"
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      <p id={`${id}-hint`} className={dialogStyles.hint}>
        {hint}
      </p>
      {error ? <FieldError id={`${id}-error`} message={error} /> : null}
    </div>
  )
}
