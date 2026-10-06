import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AlertCircle, FileText, Info, Send } from 'lucide-react'
import { Dialog } from '../../../components/ui/Dialog'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import { PrimaryButton } from '../../../components/ui/PrimaryButton'
import { StatusPill } from '../../../components/ui/StatusPill'
import { formatDateTime, type TermsRevision } from '../settingsModel'
import styles from './SettingsDialogs.module.css'

/** Read-only view of one Terms of Use revision (current or previous). */
export function TermsRevisionDialog({
  revision,
  isCurrent,
  onClose,
  fallbackFocus,
}: {
  revision: TermsRevision
  isCurrent: boolean
  onClose: () => void
  fallbackFocus?: () => HTMLElement | null
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  return (
    <Dialog
      title={`Termos de Uso · Revisão ${revision.revision}`}
      description={revision.title}
      icon={FileText}
      size="lg"
      onClose={onClose}
      initialFocusRef={closeRef}
      fallbackFocus={fallbackFocus}
      footer={
        <OutlineButton ref={closeRef} className={styles.footerButton} onClick={onClose}>
          Fechar
        </OutlineButton>
      }
    >
      <p className={styles.meta}>
        <StatusPill tone={isCurrent ? 'success' : 'muted'} label={isCurrent ? 'Vigente' : 'Substituída'} />
        <span>Publicada em {formatDateTime(revision.publishedAt)}</span>
        {revision.local ? <span>· Publicada nesta sessão (local)</span> : null}
      </p>
      <div className={styles.document} tabIndex={0} role="region" aria-label={`Conteúdo da revisão ${revision.revision}`}>
        {revision.content.split(/\n{2,}/).map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    </Dialog>
  )
}

const TITLE_MAX = 120
const CONTENT_MIN = 40
const CONTENT_MAX = 20000

type PublishProps = {
  whitelabelName: string
  platformName: string
  current: TermsRevision | null
  onCancel: () => void
  onPublish: (input: { title: string; content: string }) => void
  onDirtyChange: (dirty: boolean) => void
  fallbackFocus?: () => HTMLElement | null
}

type Errors = Partial<Record<'title' | 'content' | 'confirm', string>>

/**
 * Local publication of a new Terms revision. Publishing makes it current at
 * once and moves the previous one to the history. It does not request a new
 * acceptance from existing users (product decision pending).
 */
export function PublishTermsDialog({
  whitelabelName,
  platformName,
  current,
  onCancel,
  onPublish,
  onDirtyChange,
  fallbackFocus,
}: PublishProps) {
  const nextRevision = (current?.revision ?? 0) + 1
  const [initial] = useState(() => ({ title: current?.title ?? `Termos de Uso — ${platformName}`, content: current?.content ?? '' }))
  const [title, setTitle] = useState(initial.title)
  const [content, setContent] = useState(initial.content)
  const [confirmed, setConfirmed] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const confirmRef = useRef<HTMLInputElement>(null)
  const keepEditingRef = useRef<HTMLButtonElement>(null)

  const dirty = title !== initial.title || content !== initial.content

  useEffect(() => {
    onDirtyChange(dirty)
  }, [dirty, onDirtyChange])

  useEffect(() => () => onDirtyChange(false), [onDirtyChange])

  useEffect(() => {
    if (confirmDiscard) keepEditingRef.current?.focus()
  }, [confirmDiscard])

  /** Closing with an edited draft asks first (Escape, ×, backdrop, Cancelar). */
  function requestClose() {
    if (dirty) {
      setConfirmDiscard(true)
      return
    }
    onCancel()
  }

  function clear(field: keyof Errors) {
    if (errors[field]) setErrors((value) => ({ ...value, [field]: undefined }))
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextTitle = title.trim()
    const nextContent = content.trim()
    const next: Errors = {}
    if (!nextTitle) next.title = 'Informe o título da revisão.'
    else if (nextTitle.length > TITLE_MAX) next.title = `Use no máximo ${TITLE_MAX} caracteres.`
    if (nextContent.length < CONTENT_MIN) next.content = `O conteúdo precisa ter pelo menos ${CONTENT_MIN} caracteres.`
    else if (nextContent.length > CONTENT_MAX) next.content = `Use no máximo ${CONTENT_MAX.toLocaleString('pt-BR')} caracteres.`
    else if (current && nextContent === current.content.trim())
      next.content = 'O conteúdo é igual ao da revisão vigente. Altere o texto para publicar uma nova revisão.'
    if (!confirmed) next.confirm = 'Confirme a publicação para continuar.'
    setErrors(next)
    if (next.title) titleRef.current?.focus()
    else if (next.content) contentRef.current?.focus()
    else if (next.confirm) confirmRef.current?.focus()
    else onPublish({ title: nextTitle, content: nextContent })
  }

  return (
    <Dialog
      title={current ? 'Publicar nova revisão' : 'Publicar primeira revisão'}
      description={`Termos de Uso de ${whitelabelName} · Revisão ${nextRevision}`}
      icon={Send}
      size="lg"
      onClose={requestClose}
      initialFocusRef={titleRef}
      fallbackFocus={fallbackFocus}
      footer={
        confirmDiscard ? (
          <>
            <p className={styles.footerNote} role="alert">
              Descartar o rascunho da revisão {nextRevision}?
            </p>
            <OutlineButton ref={keepEditingRef} className={styles.footerButton} onClick={() => setConfirmDiscard(false)}>
              Continuar editando
            </OutlineButton>
            <button type="button" className={styles.confirmWarning} onClick={onCancel}>
              Descartar rascunho
            </button>
          </>
        ) : (
          <>
            <OutlineButton className={styles.footerButton} onClick={requestClose}>
              Cancelar
            </OutlineButton>
            <PrimaryButton type="submit" form="publish-terms-form" className={styles.footerButton}>
              <Send size={16} strokeWidth={1.9} aria-hidden="true" />
              Publicar revisão {nextRevision}
            </PrimaryButton>
          </>
        )
      }
    >
      <p className={styles.text}>
        {current ? (
          <>
            A revisão {nextRevision} substituirá a <strong>revisão {current.revision}</strong>, vigente desde{' '}
            {formatDateTime(current.publishedAt)}. O texto abaixo parte da revisão vigente.
          </>
        ) : (
          <>Este Whitelabel ainda não tem Termos de Uso publicados neste protótipo.</>
        )}
      </p>

      <form id="publish-terms-form" className={styles.form} onSubmit={submit} noValidate>
        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label htmlFor="terms-title" className={styles.label}>
              Título <span className={styles.required}>(obrigatório)</span>
            </label>
            <span className={styles.counter} aria-hidden="true">
              {title.length}/{TITLE_MAX}
            </span>
          </div>
          <input
            ref={titleRef}
            id="terms-title"
            className={styles.input}
            value={title}
            onChange={(event) => {
              setTitle(event.target.value)
              clear('title')
            }}
            aria-invalid={errors.title ? true : undefined}
            aria-describedby={errors.title ? 'terms-title-error' : undefined}
            required
          />
          {errors.title ? (
            <p id="terms-title-error" className={styles.error}>
              <AlertCircle size={14} strokeWidth={2} aria-hidden="true" />
              {errors.title}
            </p>
          ) : null}
        </div>

        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label htmlFor="terms-content" className={styles.label}>
              Conteúdo <span className={styles.required}>(obrigatório)</span>
            </label>
            <span className={styles.counter} aria-hidden="true">
              {content.length.toLocaleString('pt-BR')} caracteres
            </span>
          </div>
          <textarea
            ref={contentRef}
            id="terms-content"
            className={styles.textarea}
            value={content}
            onChange={(event) => {
              setContent(event.target.value)
              clear('content')
            }}
            aria-invalid={errors.content ? true : undefined}
            aria-describedby={`terms-content-hint${errors.content ? ' terms-content-error' : ''}`}
            required
          />
          <p id="terms-content-hint" className={styles.hint}>
            Texto simples; separe os parágrafos com uma linha em branco. Mínimo de {CONTENT_MIN} caracteres.
          </p>
          {errors.content ? (
            <p id="terms-content-error" className={styles.error}>
              <AlertCircle size={14} strokeWidth={2} aria-hidden="true" />
              {errors.content}
            </p>
          ) : null}
        </div>

        <div className={styles.field}>
          <label className={styles.checkRow}>
            <input
              ref={confirmRef}
              type="checkbox"
              checked={confirmed}
              onChange={(event) => {
                setConfirmed(event.target.checked)
                clear('confirm')
              }}
              aria-invalid={errors.confirm ? true : undefined}
              aria-describedby={errors.confirm ? 'terms-confirm-error' : undefined}
            />
            <span>
              Entendo que a revisão {nextRevision} passa a ser a vigente imediatamente
              {current ? ` e que a revisão ${current.revision} vai para o histórico` : ''}.
            </span>
          </label>
          {errors.confirm ? (
            <p id="terms-confirm-error" className={styles.error}>
              <AlertCircle size={14} strokeWidth={2} aria-hidden="true" />
              {errors.confirm}
            </p>
          ) : null}
        </div>
      </form>

      <p className={styles.callout}>
        <Info size={15} strokeWidth={1.8} aria-hidden="true" />
        <span>
          <strong>Novo aceite não é solicitado.</strong> A exigência de novo aceite pelos usuários existentes depende de
          definição de produto. A publicação altera apenas o estado local deste protótipo.
        </span>
      </p>
    </Dialog>
  )
}
