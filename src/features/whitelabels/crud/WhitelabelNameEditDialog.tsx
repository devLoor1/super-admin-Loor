import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AlertCircle, AlertTriangle, ArrowRight, Info, Lock, Pencil } from 'lucide-react'
import { Dialog } from '../../../components/ui/Dialog'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import { PrimaryButton } from '../../../components/ui/PrimaryButton'
import dialogStyles from '../../whitelabel-settings/dialogs/SettingsDialogs.module.css'
import type { WhitelabelRecord } from '../whitelabelApi'
import { PendingActionButton, PendingBackendNotice } from './MutationStates'
import { buildNameUpdateCommand } from './whitelabelCommands'
import { NAME_MAX, NAME_MIN, dtoLength, isRecordStale, nameDraftFromRecord, nameError, readOnlyFacts, tidyName } from './whitelabelForm'
import styles from './WhitelabelCrud.module.css'

const PREFIX = 'wl-edit'

/**
 * Editar nome — prepared for `PATCH /api/whitelabels/:id { name }`.
 *
 * Starts from the authoritative detail (`record`, `GET /whitelabels/:id`).
 * Only the name can change: slug and URL base are read-only facts with no
 * input, no draft field and no hidden path. The target is the selected ID;
 * the page closes this dialog when the selection changes. The final button
 * stays `aria-disabled` for every role: nothing is sent or saved.
 */
export function WhitelabelNameEditDialog({
  record,
  latest,
  selectedId,
  onClose,
  fallbackFocus,
}: {
  /** Authoritative detail when the edit opened. */
  record: WhitelabelRecord
  /** The detail currently loaded for this ID (null while not loaded): a newer version marks the draft stale. */
  latest: WhitelabelRecord | null
  /** The identity on screen; a mismatch never produces a command. */
  selectedId: string | null
  onClose: () => void
  fallbackFocus?: () => HTMLElement | null
}) {
  const [draft, setDraft] = useState(() => nameDraftFromRecord(record))
  const [nameIssue, setNameIssue] = useState<string | null>(null)
  const [formNote, setFormNote] = useState<string | null>(null)
  const [step, setStep] = useState<'form' | 'review'>('form')
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const reviewRef = useRef<HTMLHeadingElement>(null)
  const keepRef = useRef<HTMLButtonElement>(null)

  const stale = isRecordStale(record, latest)
  const built = buildNameUpdateCommand({ selectedId, record, draft })
  const dirty = tidyName(draft.name) !== tidyName(record.name)

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

  function requestClose() {
    if (dirty) setConfirmDiscard(true)
    else onClose()
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (stale) {
      setFormNote('Os dados mudaram no Control Plane depois que a edição começou. Feche e reabra a edição para partir dos valores atuais.')
      return
    }
    if (!built.ok) {
      if (built.reason === 'invalid-name') {
        setNameIssue(built.message ?? nameError(tidyName(draft.name)) ?? 'Nome inválido.')
        document.getElementById(`${PREFIX}-name`)?.focus()
      } else if (built.reason === 'unchanged') {
        setFormNote('O nome é igual ao valor atual do Control Plane.')
      } else if (built.reason === 'invalid-target') {
        setFormNote('Este registro não tem um ID do Control Plane válido para edição.')
      } else {
        setFormNote('Este Whitelabel não é o que está selecionado. Feche e abra a edição novamente.')
      }
      return
    }
    setStep('review')
  }

  function backToForm() {
    setStep('form')
    window.requestAnimationFrame(() => nameRef.current?.focus())
  }

  const pendingId = `${PREFIX}-pending`
  const command = built.ok ? built.command : null

  let footer
  if (confirmDiscard) {
    footer = (
      <>
        <p className={dialogStyles.footerNote} role="alert">
          Descartar o novo nome? Nada foi enviado nem salvo.
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
          Revisar alteração
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
        <PendingActionButton label="Salvar nome" describedBy={pendingId} />
      </>
    )
  }

  const staleNotice = stale ? (
    <p className={styles.staleNotice} role="alert" data-stale-notice>
      <AlertTriangle size={14} strokeWidth={1.9} aria-hidden="true" />
      <span>
        Este Whitelabel foi alterado no Control Plane depois que a edição começou
        {latest && latest.name !== record.name ? ` (nome atual: ${latest.name})` : ''}. Feche e reabra a edição para partir
        dos valores atuais.
      </span>
    </p>
  ) : null

  return (
    <Dialog
      title="Editar nome do Whitelabel"
      description={`${record.name} · ID ${record.id} · valores atuais do Control Plane`}
      icon={Pencil}
      onClose={requestClose}
      initialFocusRef={nameRef}
      fallbackFocus={fallbackFocus}
      size="lg"
      footer={footer}
    >
      <div data-wl-form="edit" data-step={step} data-wl-target={record.id}>
        {step === 'form' ? (
          <form id={PREFIX} className={`${dialogStyles.form} ${styles.flush}`} onSubmit={submit} noValidate>
            <p className={styles.intro}>
              <Info size={14} strokeWidth={1.9} aria-hidden="true" />
              <span>
                <strong>Somente o nome pode ser alterado.</strong> Identificador (slug) e URL base aparecem abaixo apenas para
                conferência.
              </span>
            </p>
            {staleNotice}

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
                onChange={(event) => {
                  setDraft({ name: event.target.value })
                  setNameIssue(null)
                  setFormNote(null)
                }}
                onBlur={() => setDraft((current) => ({ name: tidyName(current.name) }))}
                aria-required="true"
                aria-invalid={nameIssue ? true : undefined}
                aria-describedby={[`${PREFIX}-name-hint`, nameIssue ? `${PREFIX}-name-error` : null].filter(Boolean).join(' ')}
              />
              <p id={`${PREFIX}-name-hint`} className={dialogStyles.hint}>
                De {NAME_MIN} a {NAME_MAX} caracteres; espaços extras são removidos.
              </p>
              {nameIssue ? (
                <p id={`${PREFIX}-name-error`} className={dialogStyles.error}>
                  <AlertCircle size={14} strokeWidth={2} aria-hidden="true" />
                  {nameIssue}
                </p>
              ) : null}
            </div>

            {/* Persistent live region: the note is announced when its text appears. */}
            <div role="status" aria-live="polite" data-form-note-region>
              {formNote ? (
                <p className={dialogStyles.error} data-form-note>
                  <Info size={14} strokeWidth={2} aria-hidden="true" />
                  {formNote}
                </p>
              ) : null}
            </div>

            <section aria-labelledby={`${PREFIX}-facts-title`}>
              <h3 id={`${PREFIX}-facts-title`} className={styles.sectionTitle}>
                Somente leitura
              </h3>
              <p className={styles.identityNote} data-identity-readonly>
                <Lock size={13} strokeWidth={1.9} aria-hidden="true" />
                <span>
                  Alterar o slug ou a URL base afeta a resolução do tenant (cadastros, configurações públicas e links enviados) e
                  exige autorização separada. Esta tela não altera esses campos.
                </span>
              </p>
              <dl className={styles.facts} data-readonly-facts>
                {readOnlyFacts(record).map((fact) => (
                  <div key={fact.key} className={styles.fact} data-fact={fact.key} data-identity={fact.identity || undefined}>
                    <dt>{fact.label}</dt>
                    <dd>
                      <span className={`${styles.factValue} ${fact.identity ? styles.mono : ''}`}>{fact.value ?? '—'}</span>
                      <span className={styles.factNote}>{fact.note}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          </form>
        ) : (
          <div className={styles.review} data-review>
            <h3 ref={reviewRef} tabIndex={-1} className={styles.reviewHeading}>
              Revisão da alteração de nome
            </h3>
            {staleNotice}
            {command ? (
              <ul className={styles.changes} aria-label="Alteração em relação ao Control Plane">
                <li className={styles.change} data-change="name">
                  <span className={styles.changeLabel}>Nome</span>
                  <span className={styles.changeValues}>
                    <span className={styles.before}>
                      <span className="visually-hidden">Valor atual: </span>
                      {command.baseline.name}
                    </span>
                    <ArrowRight size={14} strokeWidth={1.8} aria-hidden="true" />
                    <span className={styles.after}>
                      <span className="visually-hidden">Novo valor: </span>
                      {command.body.name}
                    </span>
                  </span>
                </li>
              </ul>
            ) : null}
            <p className={dialogStyles.hint} data-review-unchanged>
              Identificador (slug) {record.slug || '—'} e URL base {record.baseUrl ?? '—'} permanecem como estão.
            </p>

            <PendingBackendNotice action="update-name" id={pendingId} />

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
