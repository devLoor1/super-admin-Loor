import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'
import type { ProvisioningStatus, ProvisioningStepStatus } from './provisioningApi'
import { STATUS_LABELS, STEP_STATUS_GLYPH, STEP_STATUS_LABELS } from './provisioningLabels'
import styles from './Provisioning.module.css'

type Tone = 'success' | 'warning' | 'danger' | 'muted' | 'neutral'

const STATUS_TONE: Record<ProvisioningStatus, Tone> = {
  PENDING: 'muted',
  RUNNING: 'neutral',
  WAITING_MANUAL_ACTION: 'warning',
  FAILED: 'danger',
  COMPLETED: 'success',
  CANCELLED: 'muted',
}

const STEP_TONE: Record<ProvisioningStepStatus, Tone> = {
  PENDING: 'muted',
  RUNNING: 'neutral',
  WAITING_MANUAL_ACTION: 'warning',
  SUCCESS: 'success',
  FAILED: 'danger',
  SKIPPED: 'muted',
}

/** Status is always text + tone (colour is never the only signal). */
export function ProvisioningStatusBadge({ status }: { status: ProvisioningStatus }) {
  return (
    <span className={styles.badge} data-tone={STATUS_TONE[status]}>
      {STATUS_LABELS[status]}
    </span>
  )
}

export function ProvisioningStepBadge({ status }: { status: ProvisioningStepStatus }) {
  return (
    <span className={styles.badge} data-tone={STEP_TONE[status]}>
      <span aria-hidden="true">{STEP_STATUS_GLYPH[status]}</span>
      {STEP_STATUS_LABELS[status]}
    </span>
  )
}

type FieldShell = { id: string; label: ReactNode; hint?: ReactNode; error?: string; full?: boolean }

function describedBy(id: string, hint: ReactNode, error?: string) {
  const ids = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ')
  return ids || undefined
}

function Shell({ id, label, hint, error, full, children }: FieldShell & { children: ReactNode }) {
  return (
    <div className={[styles.field, full ? styles.fieldFull : ''].filter(Boolean).join(' ')}>
      <label htmlFor={id}>{label}</label>
      {children}
      {hint ? (
        <span id={`${id}-hint`} className={styles.hint}>
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={`${id}-error`} className={styles.error} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  )
}

export function TextField({ id, label, hint, error, full, ...input }: FieldShell & Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className'>) {
  return (
    <Shell id={id} label={label} hint={hint} error={error} full={full}>
      <input id={id} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, hint, error)} {...input} />
    </Shell>
  )
}

export function TextAreaField({ id, label, hint, error, full, ...input }: FieldShell & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id' | 'className'>) {
  return (
    <Shell id={id} label={label} hint={hint} error={error} full={full}>
      <textarea id={id} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, hint, error)} {...input} />
    </Shell>
  )
}

export function CheckField({ id, label, hint, ...input }: { id: string; label: ReactNode; hint?: ReactNode } & Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type' | 'className'>) {
  return (
    <div className={styles.field}>
      <label className={styles.check} htmlFor={id}>
        <input id={id} type="checkbox" aria-describedby={hint ? `${id}-hint` : undefined} {...input} />
        <span>{label}</span>
      </label>
      {hint ? (
        <span id={`${id}-hint`} className={styles.hint}>
          {hint}
        </span>
      ) : null}
    </div>
  )
}
