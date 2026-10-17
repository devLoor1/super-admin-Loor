import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AlertCircle, AlertTriangle, ArrowRight, Info, Plus } from 'lucide-react'
import { Dialog } from '../../../components/ui/Dialog'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import { PrimaryButton } from '../../../components/ui/PrimaryButton'
import dialogStyles from '../../whitelabel-settings/dialogs/SettingsDialogs.module.css'
import { PendingActionButton, PendingBackendNotice } from './MutationStates'
import { buildCreateCommand } from './whitelabelCommands'
import {
  EMPTY_CREATE_DRAFT,
  NAME_MAX,
  NAME_MIN,
  SLUG_MAX,
  dtoLength,
  firstInvalid,
  isCreateDirty,
  tidy,
  tidyName,
  validateCreate,
  type CreateDraft,
  type CreateErrors,
  type CreateFieldKey,
} from './whitelabelForm'
import styles from './WhitelabelCrud.module.css'

const PREFIX = 'wl-create'

/**
 * Novo Whitelabel — prepared for `POST /api/whitelabels { name, slug, baseUrl }`.
 *
 * The form validates locally (rules of `CreateWhitelabelDto`), then stops at a
 * review that shows exactly what a future request would carry. The final
 * button stays `aria-disabled` for every role: nothing is sent, created or
 * saved, and the authoritative list / detail are never touched.
 */
export function WhitelabelCreateDialog({ onClose, fallbackFocus }: { onClose: () => void; fallbackFocus?: () => HTMLElement | null }) {
  const [draft, setDraft] = useState<CreateDraft>(() => ({ ...EMPTY_CREATE_DRAFT }))
  const [errors, setErrors] = useState<CreateErrors>({})
  const [step, setStep] = useState<'form' | 'review'>('form')
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const reviewRef = useRef<HTMLHeadingElement>(null)
  const keepRef = useRef<HTMLButtonElement>(null)

  const dirty = isCreateDirty(draft)

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
    if (step === 'review') reviewRef.current?.focus()
  }, [step])

  function set(key: CreateFieldKey, value: string) {
    setDraft((current) => ({ ...current, [key]: value }))
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }))
  }

  function requestClose() {
    if (dirty) setConfirmDiscard(true)
    else onClose()
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = validateCreate(draft)
    setErrors(next)
    const invalid = firstInvalid(next)
    if (invalid) {
      document.getElementById(`${PREFIX}-${invalid}`)?.focus()
      return
    }
    setStep('review')
  }

  function backToForm() {
    setStep('form')
    window.requestAnimationFrame(() => nameRef.current?.focus())
  }

  const describe = (key: CreateFieldKey) => [`${PREFIX}-${key}-hint`, errors[key] ? `${PREFIX}-${key}-error` : null].filter(Boolean).join(' ')
  const error = (key: CreateFieldKey) =>
    errors[key] ? (
      <p id={`${PREFIX}-${key}-error`} className={dialogStyles.error}>
        <AlertCircle size={14} strokeWidth={2} aria-hidden="true" />
        {errors[key]}
      </p>
    ) : null

  const built = step === 'review' ? buildCreateCommand(draft) : null
  const command = built?.ok ? built.command : null
  const pendingId = `${PREFIX}-pending`

  let footer
  if (confirmDiscard) {
    footer = (
      <>
        <p className={dialogStyles.footerNote} role="alert">
          Descartar os dados digitados? Nada foi enviado nem salvo.
        </p>
        <OutlineButton ref={keepRef} className={dialogStyles.footerButton} onClick={() => setConfirmDiscard(false)}>
          Continuar editando
        </OutlineButton>
        <button type="button" className={dialogStyles.confirmWarning} onClick={onClose} data-discard>
          Descartar
        </button>
      </>
    )
  } else if (step === 'form') {
    footer = (
      <>
        <OutlineButton className={dialogStyles.footerButton} onClick={requestClose}>
          Cancelar
        </OutlineButton>
        <PrimaryButton type="submit" form={PREFIX} className={dialogStyles.footerButton}>
          Revisar criação
          <ArrowRight size={16} strokeWidth={1.9} aria-hidden="true" />
        </PrimaryButton>
      </>
    )
  } else {
    footer = (
      <>
        <OutlineButton className={dialogStyles.footerButton} onClick={backToForm} data-back-to-form>
          Voltar e editar
        </OutlineButton>
        <OutlineButton className={dialogStyles.footerButton} onClick={() => setConfirmDiscard(true)} data-review-discard>
          Descartar
        </OutlineButton>
        <PendingActionButton label="Criar Whitelabel" describedBy={pendingId} />
      </>
    )
  }

  return (
    <Dialog
      title="Novo Whitelabel"
      description="Preencha os três campos exigidos pelo Control Plane. A criação ainda não está liberada: nada é enviado."
      icon={Plus}
      onClose={requestClose}
      initialFocusRef={nameRef}
      fallbackFocus={fallbackFocus}
      size="lg"
      footer={footer}
    >
      <div data-wl-form="create" data-step={step}>
        {step === 'form' ? (
          <form id={PREFIX} className={`${dialogStyles.form} ${styles.flush}`} onSubmit={submit} noValidate>
            <p className={styles.intro}>
              <Info size={14} strokeWidth={1.9} aria-hidden="true" />
              <span>
                <strong>Campos e regras do contrato de criação do Control Plane.</strong> O Control Plane valida de novo no
                envio; a unicidade do identificador é verificada pelo Core.
              </span>
            </p>

            <div className={dialogStyles.field}>
              <div className={dialogStyles.labelRow}>
                <label htmlFor={`${PREFIX}-name`} className={dialogStyles.label}>
                  Nome <span className={dialogStyles.required}>(obrigatório)</span>
                </label>
                <span className={dialogStyles.counter} aria-hidden="true">
                  {dtoLength(tidyName(draft.name))}/{NAME_MAX}
                </span>
              </div>
              <input
                ref={nameRef}
                id={`${PREFIX}-name`}
                className={dialogStyles.input}
                value={draft.name}
                autoComplete="off"
                onChange={(event) => set('name', event.target.value)}
                onBlur={() => setDraft((current) => ({ ...current, name: tidyName(current.name) }))}
                aria-required="true"
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={describe('name')}
              />
              <p id={`${PREFIX}-name-hint`} className={dialogStyles.hint}>
                De {NAME_MIN} a {NAME_MAX} caracteres; espaços extras são removidos.
              </p>
              {error('name')}
            </div>

            <div className={dialogStyles.field}>
              <div className={dialogStyles.labelRow}>
                <label htmlFor={`${PREFIX}-slug`} className={dialogStyles.label}>
                  Identificador (slug) <span className={dialogStyles.required}>(obrigatório)</span>
                </label>
                <span className={dialogStyles.counter} aria-hidden="true">
                  {tidy(draft.slug).length}/{SLUG_MAX}
                </span>
              </div>
              <input
                id={`${PREFIX}-slug`}
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
              <p id={`${PREFIX}-slug-hint`} className={dialogStyles.hint}>
                Letras minúsculas sem acento, números e hífens; até {SLUG_MAX} caracteres. O valor não é convertido
                automaticamente.
              </p>
              {error('slug')}
            </div>

            <div className={dialogStyles.field}>
              <div className={dialogStyles.labelRow}>
                <label htmlFor={`${PREFIX}-baseUrl`} className={dialogStyles.label}>
                  URL base <span className={dialogStyles.required}>(obrigatória)</span>
                </label>
              </div>
              <input
                id={`${PREFIX}-baseUrl`}
                className={dialogStyles.input}
                type="text"
                inputMode="url"
                value={draft.baseUrl}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="https://plataforma.com.br"
                onChange={(event) => set('baseUrl', event.target.value)}
                onBlur={() => setDraft((current) => ({ ...current, baseUrl: tidy(current.baseUrl) }))}
                aria-required="true"
                aria-invalid={errors.baseUrl ? true : undefined}
                aria-describedby={describe('baseUrl')}
              />
              <p id={`${PREFIX}-baseUrl-hint`} className={dialogStyles.hint}>
                URL completa com https:// ou http:// (ex.: https://plataforma.com.br ou http://localhost:3000). Enviada como
                digitada, sem barra ou ajustes automáticos.
              </p>
              {error('baseUrl')}
            </div>

            <section aria-labelledby={`${PREFIX}-facts-title`}>
              <h3 id={`${PREFIX}-facts-title`} className={styles.sectionTitle}>
                Definido pelo Control Plane
              </h3>
              <p className={dialogStyles.hint}>
                ID, status, domínio, datas e vínculos não são enviados: o Control Plane e o Core os definem na criação.
              </p>
            </section>
          </form>
        ) : (
          <div className={styles.review} data-review>
            <h3 ref={reviewRef} tabIndex={-1} className={styles.reviewHeading}>
              Revisão do novo Whitelabel
            </h3>
            {command ? (
              <dl className={styles.facts} data-review-values>
                {[
                  { key: 'name', label: 'Nome', value: command.body.name },
                  { key: 'slug', label: 'Identificador (slug)', value: command.body.slug },
                  { key: 'baseUrl', label: 'URL base', value: command.body.baseUrl },
                ].map((row) => (
                  <div key={row.key} className={styles.fact} data-review-field={row.key}>
                    <dt>{row.label}</dt>
                    <dd>
                      <span className={`${styles.factValue} ${row.key === 'name' ? '' : styles.mono}`}>{row.value}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}

            <div className={styles.identityNotice} data-identity-notice>
              <AlertTriangle size={15} strokeWidth={1.8} aria-hidden="true" />
              <p>
                <strong>O slug e a URL base influenciam a identidade do tenant.</strong> Eles participam da resolução de qual
                Whitelabel atende um cadastro, uma configuração pública ou um link enviado por e-mail. Confira os dois antes de
                criar: alterá-los depois exige autorização separada e não está disponível nesta tela.
              </p>
            </div>

            <PendingBackendNotice action="create" id={pendingId} />

            {command ? (
              <details className={styles.payload}>
                <summary>Requisição prevista (não enviada)</summary>
                <p className={styles.payloadRoute} data-request-route>
                  {command.route}
                </p>
                <pre data-request-preview>{JSON.stringify(command.body, null, 2)}</pre>
              </details>
            ) : null}
          </div>
        )}
      </div>
    </Dialog>
  )
}
