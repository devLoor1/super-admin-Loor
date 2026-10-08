import { useId, useRef, useState } from 'react'
import { CircleAlert, CircleCheck, CircleX, FileCheck2, Info, ListPlus, RotateCcw } from 'lucide-react'
import { Dialog } from '../../components/ui/Dialog'
import { OutlineButton } from '../../components/ui/OutlineButton'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import outline from '../../components/ui/OutlineButton.module.css'
import fin from '../finance-gateways/sections/FinanceSections.module.css'
import dialogStyles from '../whitelabel-settings/dialogs/SettingsDialogs.module.css'
import {
  DECISION_NOTE_MAX_LENGTH,
  KYC_STATUS_META,
  PENDING_ISSUE_MAX_LENGTH,
  type KycDecisionStatus,
  type KycEvidence,
  type KycPendingIssue,
  type KycStatus,
} from './kycModel'
import styles from './Kyc.module.css'

/** Shared reminder: every KYC action is local to this browser session. */
function LocalOnlyCallout({ children }: { children?: string }) {
  return (
    <p className={dialogStyles.callout}>
      <Info size={15} strokeWidth={1.8} aria-hidden="true" />
      <span>
        {children ? `${children} ` : ''}Registro local desta sessão do protótipo: não altera conta, acesso, investidor, empreendedor,
        investimentos, oportunidades, pagamentos ou wallets, não gera evento na Auditoria e nada é enviado ao Backend.
      </span>
    </p>
  )
}

/** Recebida → Revisada (metadata only: nothing is opened, read or analysed). */
export function ReviewEvidenceDialog({
  evidence,
  onCancel,
  onConfirm,
  fallbackFocus,
}: {
  evidence: KycEvidence
  onCancel: () => void
  onConfirm: () => void
  fallbackFocus: () => HTMLElement | null
}) {
  return (
    <Dialog
      title="Marcar evidência como revisada"
      description={`${evidence.label} · ${evidence.evidenceId}`}
      icon={FileCheck2}
      tone="teal"
      onClose={onCancel}
      fallbackFocus={fallbackFocus}
      footer={
        <>
          <OutlineButton className={dialogStyles.footerButton} onClick={onCancel}>
            Cancelar
          </OutlineButton>
          <PrimaryButton className={dialogStyles.footerButton} onClick={onConfirm} data-confirm-review>
            Marcar como revisada
          </PrimaryButton>
        </>
      }
    >
      <p className={dialogStyles.text}>
        O status desta evidência passa de <strong>Recebida</strong> para <strong>Revisada</strong>. O protótipo guarda apenas metadados:
        nenhum arquivo é aberto, lido ou analisado, e não existe upload, câmera, OCR ou biometria.
      </p>
      <LocalOnlyCallout />
    </Dialog>
  )
}

export function AddIssueDialog({ onCancel, onAdd }: { onCancel: () => void; onAdd: (description: string) => void }) {
  const [value, setValue] = useState('')
  const [touched, setTouched] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fieldId = useId()
  const hintId = useId()
  const errorId = useId()
  const trimmed = value.trim()
  const error = !trimmed ? 'Descreva a pendência.' : trimmed.length < 5 ? 'Use pelo menos 5 caracteres.' : null

  function submit() {
    setTouched(true)
    if (error) {
      inputRef.current?.focus()
      return
    }
    onAdd(trimmed)
  }

  return (
    <Dialog
      title="Adicionar pendência"
      description="Pendência local deste caso KYC."
      icon={ListPlus}
      onClose={onCancel}
      initialFocusRef={inputRef}
      footer={
        <>
          <OutlineButton className={dialogStyles.footerButton} onClick={onCancel}>
            Cancelar
          </OutlineButton>
          <PrimaryButton className={dialogStyles.footerButton} onClick={submit} data-confirm-add-issue>
            Adicionar pendência
          </PrimaryButton>
        </>
      }
    >
      <form
        className={dialogStyles.form}
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <div className={dialogStyles.field}>
          <div className={dialogStyles.labelRow}>
            <label htmlFor={fieldId} className={dialogStyles.label}>
              Descrição <span className={dialogStyles.required}>(obrigatória)</span>
            </label>
            <span className={dialogStyles.counter} aria-hidden="true">
              {value.length}/{PENDING_ISSUE_MAX_LENGTH}
            </span>
          </div>
          <textarea
            ref={inputRef}
            id={fieldId}
            className={`${dialogStyles.textarea} ${styles.shortTextarea}`}
            value={value}
            maxLength={PENDING_ISSUE_MAX_LENGTH}
            onChange={(event) => setValue(event.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={touched && error ? true : undefined}
            aria-describedby={`${hintId}${touched && error ? ` ${errorId}` : ''}`}
            data-issue-input
          />
          <p id={hintId} className={dialogStyles.hint}>
            Texto curto e sem dados pessoais ou de documentos (por exemplo, “Aguardando comprovante atualizado”). Até{' '}
            {PENDING_ISSUE_MAX_LENGTH} caracteres.
          </p>
          {touched && error ? (
            <p id={errorId} className={dialogStyles.error}>
              <CircleAlert size={14} strokeWidth={1.9} aria-hidden="true" />
              {error}
            </p>
          ) : null}
        </div>
      </form>
      <LocalOnlyCallout />
    </Dialog>
  )
}

export function IssueStatusDialog({
  issue,
  mode,
  onCancel,
  onConfirm,
}: {
  issue: KycPendingIssue
  mode: 'resolve' | 'reopen'
  onCancel: () => void
  onConfirm: () => void
}) {
  const resolving = mode === 'resolve'
  return (
    <Dialog
      title={resolving ? 'Resolver pendência' : 'Reabrir pendência'}
      description={`${issue.pendingIssueId} · ${issue.description}`}
      icon={resolving ? CircleCheck : RotateCcw}
      tone={resolving ? 'teal' : 'warning'}
      onClose={onCancel}
      footer={
        <>
          <OutlineButton className={dialogStyles.footerButton} onClick={onCancel}>
            Cancelar
          </OutlineButton>
          <PrimaryButton className={dialogStyles.footerButton} onClick={onConfirm} data-confirm-issue={mode}>
            {resolving ? 'Resolver pendência' : 'Reabrir pendência'}
          </PrimaryButton>
        </>
      }
    >
      <p className={dialogStyles.text}>
        {resolving ? (
          <>
            A pendência passa para <strong>Resolvida</strong>. O status do caso não muda automaticamente.
          </>
        ) : (
          <>
            A pendência volta para <strong>Aberta</strong>. O status do caso não muda automaticamente.
          </>
        )}
      </p>
      <LocalOnlyCallout />
    </Dialog>
  )
}

export function DecisionDialog({
  decision,
  currentStatus,
  openIssues,
  unreviewedEvidences,
  onCancel,
  onConfirm,
}: {
  decision: KycDecisionStatus
  currentStatus: KycStatus
  openIssues: number
  unreviewedEvidences: number
  onCancel: () => void
  onConfirm: (note: string) => void
}) {
  const approving = decision === 'approved'
  const [note, setNote] = useState('')
  const [touched, setTouched] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fieldId = useId()
  const hintId = useId()
  const errorId = useId()
  const trimmed = note.trim()
  const error = !trimmed ? 'Escreva uma observação curta.' : trimmed.length < 5 ? 'Use pelo menos 5 caracteres.' : null

  function submit() {
    setTouched(true)
    if (error) {
      inputRef.current?.focus()
      return
    }
    onConfirm(trimmed)
  }

  return (
    <Dialog
      title={approving ? 'Registrar aprovação' : 'Registrar reprovação'}
      description={`Status atual: ${KYC_STATUS_META[currentStatus].label} → ${KYC_STATUS_META[decision].label} (estado do protótipo).`}
      icon={approving ? CircleCheck : CircleX}
      tone={approving ? 'teal' : 'warning'}
      onClose={onCancel}
      initialFocusRef={inputRef}
      footer={
        <>
          <OutlineButton className={dialogStyles.footerButton} onClick={onCancel}>
            Cancelar
          </OutlineButton>
          {approving ? (
            <PrimaryButton className={dialogStyles.footerButton} onClick={submit} data-confirm-decision="approved">
              Registrar aprovação
            </PrimaryButton>
          ) : (
            <button
              type="button"
              className={`${outline.button} ${fin.dangerButton} ${dialogStyles.footerButton}`}
              onClick={submit}
              data-confirm-decision="rejected"
            >
              Registrar reprovação
            </button>
          )}
        </>
      }
    >
      {openIssues || unreviewedEvidences ? (
        <p className={dialogStyles.callout} data-decision-warning>
          <CircleAlert size={15} strokeWidth={1.8} aria-hidden="true" />
          <span>
            Este caso tem {openIssues} {openIssues === 1 ? 'pendência aberta' : 'pendências abertas'} e {unreviewedEvidences}{' '}
            {unreviewedEvidences === 1 ? 'evidência não revisada' : 'evidências não revisadas'}. A regra oficial para decidir nessas
            condições não está definida; o protótipo apenas registra a decisão local.
          </span>
        </p>
      ) : null}
      <form
        className={dialogStyles.form}
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <div className={dialogStyles.field}>
          <div className={dialogStyles.labelRow}>
            <label htmlFor={fieldId} className={dialogStyles.label}>
              Observação <span className={dialogStyles.required}>(obrigatória)</span>
            </label>
            <span className={dialogStyles.counter} aria-hidden="true">
              {note.length}/{DECISION_NOTE_MAX_LENGTH}
            </span>
          </div>
          <textarea
            ref={inputRef}
            id={fieldId}
            className={`${dialogStyles.textarea} ${styles.shortTextarea}`}
            value={note}
            maxLength={DECISION_NOTE_MAX_LENGTH}
            onChange={(event) => setNote(event.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={touched && error ? true : undefined}
            aria-describedby={`${hintId}${touched && error ? ` ${errorId}` : ''}`}
            data-decision-note
          />
          <p id={hintId} className={dialogStyles.hint}>
            Nota curta, sem dados pessoais, números de documento ou conteúdo de documentos. Até {DECISION_NOTE_MAX_LENGTH} caracteres.
          </p>
          {touched && error ? (
            <p id={errorId} className={dialogStyles.error}>
              <CircleAlert size={14} strokeWidth={1.9} aria-hidden="true" />
              {error}
            </p>
          ) : null}
        </div>
      </form>
      <LocalOnlyCallout>Altera somente o status e a decisão deste caso.</LocalOnlyCallout>
    </Dialog>
  )
}
