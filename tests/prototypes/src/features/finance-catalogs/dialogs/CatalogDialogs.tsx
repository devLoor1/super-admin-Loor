import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AlertCircle, AlertTriangle, Info, Pencil, Plus, Trash2 } from 'lucide-react'
import { Dialog } from '../../../components/ui/Dialog'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import { PrimaryButton } from '../../../components/ui/PrimaryButton'
import finDialogs from '../../finance-gateways/dialogs/FinanceDialogs.module.css'
import dialogStyles from '../../whitelabel-settings/dialogs/SettingsDialogs.module.css'
import {
  CATALOG_META,
  DESCRIPTION_MAX,
  NAME_MAX,
  STATUS_META,
  draftOf,
  normalizeName,
  tidy,
  validateDraft,
  type CatalogDraft,
  type CatalogItem,
  type CatalogKind,
  type CatalogStatus,
} from '../catalogModel'
import styles from './CatalogDialogs.module.css'

const OTHER: Record<CatalogKind, CatalogKind> = { segment: 'resource_use', resource_use: 'segment' }

/**
 * Create / edit one item of ONE catalog (Segment or Resource Use). Duplicate
 * names are checked only against `siblings` (the same catalog). Closing with
 * typed data asks first; the page guard also covers Back/Forward and reload.
 */
export function CatalogItemDialog({
  kind,
  item,
  siblings,
  otherCatalog,
  whitelabelName,
  onCancel,
  onSave,
  onDirtyChange,
}: {
  kind: CatalogKind
  /** Existing item to edit; undefined creates a new one. */
  item?: CatalogItem
  /** Items of the same catalog (duplicate check). */
  siblings: CatalogItem[]
  /** Items of the other catalog — only to explain that equal names are allowed there. */
  otherCatalog: CatalogItem[]
  whitelabelName: string
  onCancel: () => void
  onSave: (draft: CatalogDraft) => void
  onDirtyChange: (dirty: boolean) => void
}) {
  const meta = CATALOG_META[kind]
  const other = CATALOG_META[OTHER[kind]]
  const editing = Boolean(item)
  const prefix = `${meta.idPrefix}-form`
  const [initial] = useState(() => draftOf(item))
  const [draft, setDraft] = useState(initial)
  const [errors, setErrors] = useState<Partial<Record<keyof CatalogDraft, string>>>({})
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const keepRef = useRef<HTMLButtonElement>(null)

  const dirty = tidy(draft.name) !== initial.name || tidy(draft.description) !== initial.description || draft.status !== initial.status
  useEffect(() => {
    onDirtyChange(dirty)
  }, [dirty, onDirtyChange])
  useEffect(() => () => onDirtyChange(false), [onDirtyChange])
  useEffect(() => {
    if (confirmDiscard) keepRef.current?.focus()
  }, [confirmDiscard])

  const sameNameElsewhere = tidy(draft.name)
    ? otherCatalog.some((entry) => normalizeName(entry.name) === normalizeName(draft.name))
    : false

  function set<K extends keyof CatalogDraft>(key: K, value: CatalogDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }))
  }

  function requestClose() {
    if (dirty) setConfirmDiscard(true)
    else onCancel()
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = validateDraft(draft, siblings, item?.id, meta.singular)
    setErrors(next)
    const firstInvalid = (['name', 'description'] as const).find((key) => next[key])
    if (firstInvalid) {
      document.getElementById(`${prefix}-${firstInvalid}`)?.focus()
      return
    }
    onSave(draft)
  }

  const describe = (key: keyof CatalogDraft, hint: boolean) =>
    [hint ? `${prefix}-${key}-hint` : null, errors[key] ? `${prefix}-${key}-error` : null].filter(Boolean).join(' ') || undefined
  const error = (key: keyof CatalogDraft) =>
    errors[key] ? (
      <p id={`${prefix}-${key}-error`} className={dialogStyles.error}>
        <AlertCircle size={14} strokeWidth={2} aria-hidden="true" />
        {errors[key]}
      </p>
    ) : null

  const title = editing ? `Editar ${meta.singular}` : meta.newLabel
  return (
    <Dialog
      title={title}
      description={`Catálogo de ${meta.plural} de ${whitelabelName} · alteração local do protótipo.`}
      icon={editing ? Pencil : Plus}
      onClose={requestClose}
      initialFocusRef={nameRef}
      footer={
        confirmDiscard ? (
          <>
            <p className={dialogStyles.footerNote} role="alert">
              Descartar os dados digitados?
            </p>
            <OutlineButton ref={keepRef} className={dialogStyles.footerButton} onClick={() => setConfirmDiscard(false)}>
              Continuar editando
            </OutlineButton>
            <button type="button" className={dialogStyles.confirmWarning} onClick={onCancel}>
              Descartar
            </button>
          </>
        ) : (
          <>
            <OutlineButton className={dialogStyles.footerButton} onClick={requestClose}>
              Cancelar
            </OutlineButton>
            <PrimaryButton type="submit" form={prefix} className={dialogStyles.footerButton}>
              {editing ? 'Salvar alterações' : `Criar ${meta.singular}`}
            </PrimaryButton>
          </>
        )
      }
    >
      <form id={prefix} className={dialogStyles.form} onSubmit={submit} noValidate>
        <div className={dialogStyles.field}>
          <div className={dialogStyles.labelRow}>
            <label htmlFor={`${prefix}-name`} className={dialogStyles.label}>
              Nome
            </label>
            <span className={dialogStyles.counter} aria-hidden="true">
              {tidy(draft.name).length}/{NAME_MAX}
            </span>
          </div>
          <input
            ref={nameRef}
            id={`${prefix}-name`}
            className={dialogStyles.input}
            value={draft.name}
            autoComplete="off"
            onChange={(event) => set('name', event.target.value)}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={describe('name', true)}
          />
          <p id={`${prefix}-name-hint`} className={dialogStyles.hint}>
            Nome de 2 a {NAME_MAX} caracteres e descrição de até {DESCRIPTION_MAX}: limites de UX deste protótipo, não do Backend.{' '}
            Nomes repetidos são bloqueados apenas dentro deste catálogo (regra de UX do protótipo; a validação definitiva depende de
            Produto e Backend). O mesmo nome em {other.title} é permitido: são registros independentes.
          </p>
          {error('name')}
          {sameNameElsewhere && !errors.name ? (
            <p className={styles.sameName}>
              <Info size={14} strokeWidth={1.8} aria-hidden="true" />
              Existe um item com este nome em {other.title}. Ele continua separado: nenhum vínculo é criado.
            </p>
          ) : null}
        </div>

        <div className={dialogStyles.field}>
          <div className={dialogStyles.labelRow}>
            <label htmlFor={`${prefix}-description`} className={dialogStyles.label}>
              Descrição <span className={dialogStyles.required}>(opcional)</span>
            </label>
            <span className={dialogStyles.counter} aria-hidden="true">
              {tidy(draft.description).length}/{DESCRIPTION_MAX}
            </span>
          </div>
          <textarea
            id={`${prefix}-description`}
            className={`${dialogStyles.textarea} ${styles.textarea}`}
            value={draft.description}
            rows={3}
            onChange={(event) => set('description', event.target.value)}
            aria-invalid={errors.description ? true : undefined}
            aria-describedby={describe('description', false)}
          />
          {error('description')}
        </div>

        <fieldset className={styles.statusGroup} aria-describedby={`${prefix}-status-hint`}>
          <legend className={dialogStyles.label}>Status</legend>
          <div className={styles.statusOptions}>
            {(['active', 'inactive'] as CatalogStatus[]).map((value) => (
              <label key={value} className={styles.statusOption}>
                <input
                  type="radio"
                  name={`${prefix}-status`}
                  value={value}
                  checked={draft.status === value}
                  onChange={() => set('status', value)}
                />
                {STATUS_META[value].label}
              </label>
            ))}
          </div>
          <p id={`${prefix}-status-hint`} className={dialogStyles.hint}>
            Inativo mantém o registro no catálogo. Se ele continua selecionável ou visível em Oportunidades existentes depende de
            Produto e Backend.
          </p>
        </fieldset>
      </form>
    </Dialog>
  )
}

/** Delete always asks first and states what it does NOT do. Delete ≠ inactivate. */
export function DeleteCatalogItemDialog({
  item,
  otherCatalog,
  onCancel,
  onConfirm,
  fallbackFocus,
}: {
  item: CatalogItem
  otherCatalog: CatalogItem[]
  onCancel: () => void
  onConfirm: () => void
  fallbackFocus: () => HTMLElement | null
}) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const meta = CATALOG_META[item.kind]
  const other = CATALOG_META[OTHER[item.kind]]
  const twin = otherCatalog.some((entry) => normalizeName(entry.name) === normalizeName(item.name))
  return (
    <Dialog
      title={`Excluir ${meta.singular} “${item.name}”?`}
      description={`${meta.title} · status atual: ${STATUS_META[item.status].label}. Confirme a exclusão local.`}
      icon={Trash2}
      tone="warning"
      onClose={onCancel}
      initialFocusRef={cancelRef}
      fallbackFocus={fallbackFocus}
      focusableBody
      footer={
        <>
          <OutlineButton ref={cancelRef} className={dialogStyles.footerButton} onClick={onCancel}>
            Cancelar
          </OutlineButton>
          <button type="button" className={finDialogs.dangerConfirm} onClick={onConfirm}>
            <Trash2 size={16} strokeWidth={1.9} aria-hidden="true" />
            Excluir {meta.singular}
          </button>
        </>
      }
    >
      <div className={`${dialogStyles.callout} ${finDialogs.warningCallout}`}>
        <AlertTriangle size={15} strokeWidth={1.8} aria-hidden="true" />
        <ul className={styles.calloutList}>
          <li>
            <strong>Remove o registro apenas deste protótipo local.</strong>
          </li>
          <li>Restrições para registros já usados por Oportunidades devem ser definidas por Produto e Backend.</li>
          <li>Nenhuma Oportunidade existente é alterada; nenhum efeito em cascata é simulado.</li>
          <li>Excluir não é o mesmo que inativar: para manter o registro, edite o status para Inativo.</li>
        </ul>
      </div>
      {twin ? (
        <p className={dialogStyles.callout}>
          <Info size={15} strokeWidth={1.8} aria-hidden="true" />
          <span>
            O item “{item.name}” de {other.title} é um registro independente e <strong>não será excluído</strong>.
          </span>
        </p>
      ) : null}
    </Dialog>
  )
}
