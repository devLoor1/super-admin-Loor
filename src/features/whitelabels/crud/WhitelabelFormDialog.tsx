import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AlertCircle, ArrowRight, Info, Pencil, Plus } from 'lucide-react'
import { Dialog } from '../../../components/ui/Dialog'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import { PrimaryButton } from '../../../components/ui/PrimaryButton'
import dialogStyles from '../../whitelabel-settings/dialogs/SettingsDialogs.module.css'
import type { WhitelabelRecord } from '../whitelabelApi'
import { MutationErrorNotice, PendingActionButton, PendingBackendNotice } from './MutationStates'
import {
  EMPTY_DRAFT,
  NAME_MAX,
  SLUG_MAX,
  changedFields,
  draftFromRecord,
  firstInvalid,
  isCreateDirty,
  normalizeDraft,
  readOnlyFacts,
  tidy,
  tidyName,
  validateCreate,
  validateEdit,
  type DraftErrors,
  type WhitelabelDraft,
  type WhitelabelFieldKey,
} from './whitelabelForm'
import { createRequestPreview, updateRequestPreview, type MutationErrorView } from './whitelabelMutationContract'
import styles from './WhitelabelCrud.module.css'

type Step = { name: 'form' } | { name: 'review' } | { name: 'failed'; error: MutationErrorView }

type Props =
  | { mode: 'create'; record?: undefined; onClose: () => void; fallbackFocus?: () => HTMLElement | null }
  | { mode: 'edit'; record: WhitelabelRecord; onClose: () => void; fallbackFocus?: () => HTMLElement | null }

/**
 * Create / edit a Whitelabel — UI ready, Backend action pending.
 *
 * The form validates and normalizes locally, then stops at a review step
 * that shows what a future request would carry. The final button stays
 * `aria-disabled`: nothing is sent, created or saved, and the authoritative
 * list / detail are never touched. Closing with typed data asks first; a
 * page reload asks the browser to confirm.
 */
export function WhitelabelFormDialog({ mode, record, onClose, fallbackFocus }: Props) {
  const editing = mode === 'edit'
  const prefix = editing ? 'wl-edit' : 'wl-create'
  const [initial] = useState<WhitelabelDraft>(() => (record ? draftFromRecord(record) : EMPTY_DRAFT))
  const [draft, setDraft] = useState<WhitelabelDraft>(initial)
  const [errors, setErrors] = useState<DraftErrors>({})
  const [formNote, setFormNote] = useState<string | null>(null)
  const [step, setStep] = useState<Step>({ name: 'form' })
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const reviewRef = useRef<HTMLHeadingElement>(null)
  const keepRef = useRef<HTMLButtonElement>(null)

  const changes = record ? changedFields(record, draft) : []
  const dirty = record ? changes.length > 0 : isCreateDirty(draft)

  // Reload / tab close with typed data: let the browser ask.
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  useEffect(() => {
    if (confirmDiscard) keepRef.current?.focus()
  }, [confirmDiscard])

  useEffect(() => {
    if (step.name === 'review') reviewRef.current?.focus()
  }, [step.name])

  function set(key: WhitelabelFieldKey, value: string) {
    setDraft((current) => ({ ...current, [key]: value }))
    setFormNote(null)
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }))
  }

  function requestClose() {
    if (dirty) setConfirmDiscard(true)
    else onClose()
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = record ? validateEdit(record, draft) : validateCreate(draft)
    setErrors(next)
    const invalid = firstInvalid(next, ['name', 'slug', 'baseUrl'])
    if (invalid) {
      document.getElementById(`${prefix}-${invalid}`)?.focus()
      return
    }
    if (record && changes.length === 0) {
      setFormNote('Nenhuma alteração em relação aos valores atuais do Control Plane.')
      return
    }
    setStep({ name: 'review' })
  }

  function backToForm() {
    setStep({ name: 'form' })
    window.requestAnimationFrame(() => nameRef.current?.focus())
  }

  const describe = (key: WhitelabelFieldKey) =>
    [`${prefix}-${key}-hint`, errors[key] ? `${prefix}-${key}-error` : null].filter(Boolean).join(' ')
  const error = (key: WhitelabelFieldKey) =>
    errors[key] ? (
      <p id={`${prefix}-${key}-error`} className={dialogStyles.error}>
        <AlertCircle size={14} strokeWidth={2} aria-hidden="true" />
        {errors[key]}
      </p>
    ) : null

  const value = normalizeDraft(draft)
  const pendingId = `${prefix}-pending`
  const title = editing ? 'Editar Whitelabel' : 'Novo Whitelabel'
  const description = record
    ? `${record.name} · ID ${record.id} · valores atuais do Control Plane`
    : 'Preencha os dados do novo Whitelabel. A criação ainda não está integrada ao Backend.'

  let footer
  if (confirmDiscard) {
    footer = (
      <>
        <p className={dialogStyles.footerNote} role="alert">
          Descartar os dados digitados? Nada foi salvo.
        </p>
        <OutlineButton ref={keepRef} className={dialogStyles.footerButton} onClick={() => setConfirmDiscard(false)}>
          Continuar editando
        </OutlineButton>
        <button type="button" className={dialogStyles.confirmWarning} onClick={onClose} data-discard>
          Descartar
        </button>
      </>
    )
  } else if (step.name === 'form') {
    footer = (
      <>
        <OutlineButton className={dialogStyles.footerButton} onClick={requestClose}>
          Cancelar
        </OutlineButton>
        <PrimaryButton type="submit" form={prefix} className={dialogStyles.footerButton}>
          {editing ? 'Revisar alterações' : 'Revisar criação'}
          <ArrowRight size={16} strokeWidth={1.9} aria-hidden="true" />
        </PrimaryButton>
      </>
    )
  } else {
    footer = (
      <>
        <OutlineButton className={dialogStyles.footerButton} onClick={backToForm}>
          Voltar e editar
        </OutlineButton>
        <PendingActionButton label={editing ? 'Salvar alterações' : 'Criar Whitelabel'} describedBy={pendingId} />
      </>
    )
  }

  return (
    <Dialog
      title={title}
      description={description}
      icon={editing ? Pencil : Plus}
      onClose={requestClose}
      initialFocusRef={nameRef}
      fallbackFocus={fallbackFocus}
      size="lg"
      footer={footer}
    >
      <div data-wl-form={mode} data-step={step.name}>
        {step.name === 'form' ? (
          <form id={prefix} className={`${dialogStyles.form} ${styles.flush}`} onSubmit={submit} noValidate>
            <p className={styles.intro}>
              <Info size={14} strokeWidth={1.9} aria-hidden="true" />
              <span>
                <strong>Regras provisórias de revisão.</strong> Campos, limites e formatos ainda aguardam confirmação do
                contrato do Backend. Você pode revisar os dados, mas nada é enviado ou salvo.
              </span>
            </p>

            <div className={dialogStyles.field}>
              <div className={dialogStyles.labelRow}>
                <label htmlFor={`${prefix}-name`} className={dialogStyles.label}>
                  Nome <span className={dialogStyles.required}>(obrigatório nesta revisão)</span>
                </label>
                <span className={dialogStyles.counter} aria-hidden="true">
                  {tidyName(draft.name).length}/{NAME_MAX}
                </span>
              </div>
              <input
                ref={nameRef}
                id={`${prefix}-name`}
                className={dialogStyles.input}
                value={draft.name}
                autoComplete="off"
                onChange={(event) => set('name', event.target.value)}
                onBlur={() => setDraft((current) => ({ ...current, name: tidyName(current.name) }))}
                aria-required="true"
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={describe('name')}
              />
              <p id={`${prefix}-name-hint`} className={dialogStyles.hint}>
                Limite provisório: de 2 a {NAME_MAX} caracteres; espaços extras são removidos.
              </p>
              {error('name')}
            </div>

            {editing ? null : (
              <div className={dialogStyles.field}>
                <div className={dialogStyles.labelRow}>
                  <label htmlFor={`${prefix}-slug`} className={dialogStyles.label}>
                    Identificador (slug) <span className={dialogStyles.required}>(obrigatório nesta revisão)</span>
                  </label>
                  <span className={dialogStyles.counter} aria-hidden="true">
                    {tidy(draft.slug).length}/{SLUG_MAX}
                  </span>
                </div>
                <input
                  id={`${prefix}-slug`}
                  className={`${dialogStyles.input} ${styles.inputMono}`}
                  value={draft.slug}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="ex.: minha-plataforma"
                  onChange={(event) => set('slug', event.target.value)}
                  onBlur={() => setDraft((current) => ({ ...current, slug: tidy(current.slug) }))}
                  aria-required="true"
                  aria-invalid={errors.slug ? true : undefined}
                  aria-describedby={describe('slug')}
                />
                <p id={`${prefix}-slug-hint`} className={dialogStyles.hint}>
                  Formato provisório: letras minúsculas sem acento, números e hífens, até {SLUG_MAX} caracteres. Exigência,
                  geração, unicidade e alteração posterior do slug ainda dependem do contrato do Backend.
                </p>
                {error('slug')}
              </div>
            )}

            <div className={dialogStyles.field}>
              <div className={dialogStyles.labelRow}>
                <label htmlFor={`${prefix}-baseUrl`} className={dialogStyles.label}>
                  URL base <span className={dialogStyles.required}>(opcional nesta revisão)</span>
                </label>
              </div>
              <input
                id={`${prefix}-baseUrl`}
                className={dialogStyles.input}
                type="url"
                inputMode="url"
                value={draft.baseUrl}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="https://plataforma.com.br"
                onChange={(event) => set('baseUrl', event.target.value)}
                onBlur={() => setDraft((current) => ({ ...current, baseUrl: tidy(current.baseUrl) }))}
                aria-invalid={errors.baseUrl ? true : undefined}
                aria-describedby={describe('baseUrl')}
              />
              <p id={`${prefix}-baseUrl-hint`} className={dialogStyles.hint}>
                Formato desta revisão: URL completa com https:// ou http://. Obrigatoriedade e regras finais ainda pendentes.
                {editing && record?.baseUrl ? ' Remover a URL base ainda não tem contrato no Backend.' : ''}
              </p>
              {error('baseUrl')}
            </div>

            {formNote ? (
              <p className={dialogStyles.error} role="status" data-form-note>
                <Info size={14} strokeWidth={2} aria-hidden="true" />
                {formNote}
              </p>
            ) : null}

            <section aria-labelledby={`${prefix}-facts-title`}>
              <h3 id={`${prefix}-facts-title`} className={styles.sectionTitle}>
                {record ? 'Dados preservados nesta revisão' : 'Definições pendentes do Backend'}
              </h3>
              {record ? (
                <dl className={styles.facts} data-readonly-facts>
                  {readOnlyFacts(record).map((fact) => (
                    <div key={fact.label} className={styles.fact}>
                      <dt>{fact.label}</dt>
                      <dd>
                        <span className={styles.factValue}>{fact.value ?? '—'}</span>
                        <span className={styles.factNote}>{fact.note}</span>
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className={dialogStyles.hint}>
                  ID, status inicial, domínio e datas não são enviados nesta revisão. As regras de criação ainda precisam
                  ser confirmadas no contrato do Backend.
                </p>
              )}
            </section>
          </form>
        ) : (
          <div className={styles.review} data-review>
            <h3 ref={reviewRef} tabIndex={-1} className={styles.reviewHeading}>
              {editing ? 'Revisão das alterações' : 'Revisão do novo Whitelabel'}
            </h3>
            {record ? (
              <ul className={styles.changes} aria-label="Alterações em relação ao Control Plane">
                {changes.map((change) => (
                  <li key={change.key} className={styles.change} data-change={change.key}>
                    <span className={styles.changeLabel}>{change.label}</span>
                    <span className={styles.changeValues}>
                      <span className={styles.before}>
                        <span className="visually-hidden">Valor atual: </span>
                        {change.before ?? 'Não informado'}
                      </span>
                      <ArrowRight size={14} strokeWidth={1.8} aria-hidden="true" />
                      <span className={styles.after}>
                        <span className="visually-hidden">Novo valor: </span>
                        {change.after ?? 'Não informado'}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <dl className={styles.facts} data-review-values>
                {[
                  { label: 'Nome', value: value.name },
                  { label: 'Identificador (slug)', value: value.slug },
                  { label: 'URL base', value: value.baseUrl || 'Não informada' },
                  { label: 'Status inicial', value: 'Definido pelo Backend (contrato pendente)' },
                ].map((row) => (
                  <div key={row.label} className={styles.fact}>
                    <dt>{row.label}</dt>
                    <dd>
                      <span className={styles.factValue}>{row.value}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            {step.name === 'failed' ? <MutationErrorNotice error={step.error} /> : null}
            <PendingBackendNotice action={editing ? 'update' : 'create'} id={pendingId} />

            <details className={styles.payload}>
              <summary>Corpo previsto da requisição (não enviado)</summary>
              <pre data-request-preview>
                {JSON.stringify(record ? updateRequestPreview(record, draft) : createRequestPreview(draft), null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </Dialog>
  )
}
