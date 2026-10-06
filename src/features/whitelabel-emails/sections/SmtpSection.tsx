import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { AlertCircle, CheckCircle2, ChevronDown, Info, Loader2, Mail, Send, Server } from 'lucide-react'
import { PrimaryButton } from '../../../components/ui/PrimaryButton'
import { StatusPill } from '../../../components/ui/StatusPill'
import { SettingsSection } from '../../whitelabel-settings/SettingsSection'
import { useSectionEditor } from '../../whitelabel-settings/useSectionEditor'
import fields from '../../whitelabel-settings/sections/fields.module.css'
import { TestEmailDialog } from '../dialogs/TestEmailDialog'
import {
  EMAIL_PATTERN,
  SECURITY_LABEL,
  SECURITY_OPTIONS,
  changedSmtpFields,
  formatTime,
  joinLabels,
  toSmtpDraft,
  validateSmtp,
  type SmtpDraft,
  type SmtpSettings,
} from '../emailModel'
import { addEmailActivity, updateWhitelabelEmailSettings } from '../emailStore'
import type { EmailSectionKey } from '../emailModel'
import styles from './EmailSections.module.css'

type Props = {
  whitelabelId: string
  saved: SmtpSettings
  onDirtyChange: (section: EmailSectionKey, dirty: boolean) => void
  notify: (message: string) => void
}

const TEST_DELAY = 1400

/**
 * SMTP — how this Whitelabel sends e-mail. Local edit/save/discard with
 * frontend validation only (no connectivity check). The password is
 * write-only: shown as configured/not configured, never read back.
 */
export function SmtpSection({ whitelabelId, saved, onDirtyChange, notify }: Props) {
  const editButtonRef = useRef<HTMLButtonElement>(null)
  const configured = saved.status === 'configured'

  const editor = useSectionEditor<SmtpDraft, EmailSectionKey>({
    section: 'smtp',
    label: 'SMTP',
    saved: toSmtpDraft(saved),
    onDirtyChange,
    notify,
    validate: (draft) => validateSmtp(draft, saved.secretConfigured),
    onCommit: (draft) => {
      const changed = changedSmtpFields(saved, draft)
      updateWhitelabelEmailSettings(whitelabelId, () => ({
        smtp: {
          host: draft.host.trim(),
          port: Number(draft.port.trim()),
          security: draft.security,
          username: draft.username.trim(),
          // Only the fact that a secret exists is kept; the typed value is dropped.
          secretConfigured: saved.secretConfigured || draft.newPassword.length > 0,
          senderEmail: draft.senderEmail.trim(),
          senderName: draft.senderName.trim(),
          status: 'configured',
        },
      }))
      addEmailActivity(whitelabelId, [
        {
          kind: 'smtp',
          title: configured ? 'SMTP alterado nesta sessão' : 'SMTP configurado nesta sessão',
          detail: changed.length
            ? `${joinLabels(changed)} ${configured ? 'alterado' : 'definido'}${changed.length > 1 ? 's' : ''}.`
            : undefined,
        },
      ])
    },
  })

  function setField<K extends keyof SmtpDraft>(key: K, value: SmtpDraft[K]) {
    editor.update((draft) => ({ ...draft, [key]: value }))
    editor.clearError(key)
  }

  function startEditing() {
    editor.startEditing()
    window.requestAnimationFrame(() => document.getElementById('smtp-host')?.focus())
  }

  function discard() {
    editor.discard()
    window.requestAnimationFrame(() => editButtonRef.current?.focus())
  }

  function save() {
    if (!editor.save()) {
      window.requestAnimationFrame(() =>
        document.querySelector<HTMLElement>('#emails-smtp [aria-invalid="true"]')?.focus(),
      )
    }
  }

  const draft = editor.draft
  const fieldProps = (key: keyof SmtpDraft, hint?: string) => {
    const id = `smtp-${key}`
    const error = editor.errors[key]
    const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ')
    return {
      id,
      disabled: editor.phase === 'saving',
      'aria-invalid': error ? true : undefined,
      'aria-describedby': describedBy || undefined,
    }
  }

  return (
    <SettingsSection
      id="emails-smtp"
      title="SMTP"
      subtitle="Como este Whitelabel envia e-mails: servidor de envio e remetente usados por todos os envios automáticos."
      status={configured ? 'configured' : 'not_configured'}
      editButtonRef={editButtonRef}
      editLabel={configured ? 'Editar' : 'Configurar'}
      editor={{ ...editor, startEditing, discard, save }}
    >
      <p className={styles.connection}>
        <span>Conexão real</span>
        <StatusPill tone="neutral" label="Aguardando integração" />
      </p>

      {editor.editing ? (
        <div className={styles.smtpGrid}>
          <Field label="Host" id="smtp-host" error={editor.errors.host} span="host">
            <input
              {...fieldProps('host')}
              className={fields.input}
              value={draft.host}
              onChange={(event) => setField('host', event.target.value)}
              placeholder="smtp.exemplo.com"
              autoComplete="off"
              spellCheck={false}
            />
          </Field>
          <Field label="Porta" id="smtp-port" error={editor.errors.port} span="port">
            <input
              {...fieldProps('port')}
              className={fields.input}
              value={draft.port}
              onChange={(event) => setField('port', event.target.value.replace(/\s/g, ''))}
              inputMode="numeric"
              maxLength={5}
              placeholder="587"
              autoComplete="off"
            />
          </Field>
          <Field label="Segurança" id="smtp-security" span="security" hint={SECURITY_OPTIONS.find((o) => o.value === draft.security)?.hint}>
            <span className={styles.selectWrap}>
              <select
                {...fieldProps('security', 'hint')}
                className={`${fields.input} ${styles.select}`}
                value={draft.security}
                onChange={(event) => setField('security', event.target.value as SmtpDraft['security'])}
              >
                {SECURITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className={styles.selectChevron} size={16} strokeWidth={1.8} aria-hidden="true" />
            </span>
          </Field>
          <Field label="Usuário" id="smtp-username" error={editor.errors.username} span="half">
            <input
              {...fieldProps('username')}
              className={fields.input}
              value={draft.username}
              onChange={(event) => setField('username', event.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </Field>
          <Field
            label={saved.secretConfigured ? 'Nova senha (opcional)' : 'Senha'}
            id="smtp-newPassword"
            error={editor.errors.newPassword}
            span="half"
            hint={
              saved.secretConfigured
                ? 'Deixe em branco para manter a senha atual. A senha atual nunca é exibida.'
                : 'A senha fica oculta e não é exibida depois de salva.'
            }
          >
            <input
              {...fieldProps('newPassword', 'hint')}
              type="password"
              className={fields.input}
              value={draft.newPassword}
              onChange={(event) => setField('newPassword', event.target.value)}
              placeholder={saved.secretConfigured ? '••••••••••' : undefined}
              autoComplete="new-password"
            />
          </Field>
          <Field label="Remetente (e-mail)" id="smtp-senderEmail" error={editor.errors.senderEmail} span="half">
            <input
              {...fieldProps('senderEmail')}
              type="email"
              className={fields.input}
              value={draft.senderEmail}
              onChange={(event) => setField('senderEmail', event.target.value)}
              placeholder="nao-responda@exemplo.com"
              autoComplete="off"
              spellCheck={false}
            />
          </Field>
          <Field label="Nome de exibição" id="smtp-senderName" error={editor.errors.senderName} span="half">
            <input
              {...fieldProps('senderName')}
              className={fields.input}
              value={draft.senderName}
              onChange={(event) => setField('senderName', event.target.value)}
              maxLength={80}
              autoComplete="off"
            />
          </Field>
        </div>
      ) : configured ? (
        <dl className={styles.smtpGrid}>
          <ReadItem label="Host" span="host" value={saved.host} />
          <ReadItem label="Porta" span="port" value={String(saved.port ?? '')} />
          <ReadItem label="Segurança" span="security" value={SECURITY_LABEL[saved.security]} />
          <ReadItem label="Usuário" span="half" value={saved.username} />
          <div className={styles.readItem} data-span="half">
            <dt>Senha</dt>
            <dd className={styles.readBox}>
              {saved.secretConfigured ? (
                <>
                  <span className={styles.mask} aria-hidden="true">
                    ••••••••••
                  </span>
                  <span className="visually-hidden">Oculta. </span>
                  <span className={styles.secretTag}>Configurada</span>
                </>
              ) : (
                <span className={fields.empty}>Não configurada</span>
              )}
            </dd>
          </div>
          <ReadItem label="Remetente (e-mail)" span="half" value={saved.senderEmail} />
          <ReadItem label="Nome de exibição" span="half" value={saved.senderName} />
        </dl>
      ) : (
        <div className={styles.empty}>
          <span className={styles.emptyIcon} aria-hidden="true">
            <Server size={18} strokeWidth={1.7} />
          </span>
          <div>
            <p className={styles.emptyTitle}>SMTP não configurado</p>
            <p className={styles.emptyText}>
              Sem um servidor de envio, este Whitelabel não envia e-mails automáticos. Use “Configurar” para informar
              servidor, credenciais e remetente.
            </p>
          </div>
        </div>
      )}

      <p className={fields.note}>
        <Info size={15} strokeWidth={1.8} aria-hidden="true" />
        <span>
          Valores ilustrativos. Salvar não testa a conexão nem envia dados: a validação real do servidor e o
          armazenamento seguro da senha dependem do Backend.
        </span>
      </p>

      <TestSend whitelabelId={whitelabelId} smtp={saved} editing={editor.editing} />
    </SettingsSection>
  )
}

function Field({
  label,
  id,
  error,
  hint,
  span,
  children,
}: {
  label: string
  id: string
  error?: string
  hint?: string
  span: 'host' | 'port' | 'security' | 'half'
  children: ReactNode
}) {
  return (
    <div className={`${fields.field} ${styles.smtpField}`} data-span={span}>
      <label htmlFor={id} className={fields.label}>
        {label}
      </label>
      {children}
      {hint ? (
        <span id={`${id}-hint`} className={styles.fieldHint}>
          {hint}
        </span>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className={fields.error}>
          <AlertCircle size={14} strokeWidth={2} aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </div>
  )
}

function ReadItem({ label, value, span }: { label: string; value: string; span: 'host' | 'port' | 'security' | 'half' }) {
  return (
    <div className={styles.readItem} data-span={span}>
      <dt>{label}</dt>
      <dd className={styles.readBox}>{value || <span className={fields.empty}>Não informado</span>}</dd>
    </div>
  )
}

type TestState = { phase: 'idle' } | { phase: 'confirm'; to: string } | { phase: 'sending'; to: string } | { phase: 'done'; to: string; at: string }

/**
 * Simulated test send with the saved configuration: validate → confirm →
 * loading → simulated success. Nothing is sent; no request is made.
 */
function TestSend({ whitelabelId, smtp, editing }: { whitelabelId: string; smtp: SmtpSettings; editing: boolean }) {
  const [to, setTo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [test, setTest] = useState<TestState>({ phase: 'idle' })
  const inputRef = useRef<HTMLInputElement>(null)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const configured = smtp.status === 'configured'
  const blocked = !configured || editing
  const sending = test.phase === 'sending'
  const blockedHint = !configured
    ? 'Configure e salve o SMTP para simular um envio de teste.'
    : editing
      ? 'Salve ou descarte as alterações do SMTP: o teste usa a configuração salva.'
      : null

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (blocked || sending) return
    const value = to.trim()
    if (!value) setError('Informe o e-mail de destino.')
    else if (!EMAIL_PATTERN.test(value)) setError('Use um e-mail válido, por exemplo voce@exemplo.com.')
    else {
      setError(null)
      setTest({ phase: 'confirm', to: value })
      return
    }
    inputRef.current?.focus()
  }

  function confirm() {
    if (test.phase !== 'confirm') return
    const destination = test.to
    setTest({ phase: 'sending', to: destination })
    timer.current = window.setTimeout(() => {
      const at = new Date().toISOString()
      setTest({ phase: 'done', to: destination, at })
      addEmailActivity(whitelabelId, [
        { kind: 'test', title: 'Teste simulado concluído', detail: `Destino: ${destination}. Nenhum e-mail foi enviado.` },
      ])
    }, TEST_DELAY)
  }

  return (
    <div className={styles.test}>
      <div className={styles.testIntro}>
        <h3 className={styles.testTitle}>Testar envio</h3>
        <p className={styles.testText}>
          Simula um e-mail de teste com a configuração salva. Neste protótipo nenhum e-mail é enviado.
        </p>
      </div>
      <form className={styles.testForm} onSubmit={submit} noValidate>
        <div className={fields.field}>
          <label htmlFor="smtp-test-to" className={fields.label}>
            E-mail de destino
          </label>
          <input
            ref={inputRef}
            id="smtp-test-to"
            type="email"
            className={fields.input}
            value={to}
            onChange={(event) => {
              setTo(event.target.value)
              if (error) setError(null)
            }}
            placeholder="voce@exemplo.com"
            autoComplete="off"
            disabled={blocked}
            aria-invalid={error ? true : undefined}
            aria-describedby={[blockedHint ? 'smtp-test-blocked' : null, error ? 'smtp-test-error' : null].filter(Boolean).join(' ') || undefined}
          />
        </div>
        <PrimaryButton
          type="submit"
          className={styles.testButton}
          disabled={blocked}
          aria-disabled={sending || undefined}
          data-sending={sending || undefined}
        >
          {sending ? (
            <Loader2 className={styles.spin} size={16} strokeWidth={2} aria-hidden="true" />
          ) : (
            <Send size={16} strokeWidth={1.9} aria-hidden="true" />
          )}
          {sending ? 'Enviando teste…' : 'Enviar e-mail de teste'}
        </PrimaryButton>
      </form>
      {error ? (
        <p id="smtp-test-error" className={fields.error}>
          <AlertCircle size={14} strokeWidth={2} aria-hidden="true" />
          {error}
        </p>
      ) : null}
      {blockedHint ? (
        <p id="smtp-test-blocked" className={styles.fieldHint}>
          {blockedHint}
        </p>
      ) : null}
      <p className={styles.testResult} role="status" data-visible={test.phase === 'done' || sending || undefined}>
        {test.phase === 'done' ? (
          <>
            <CheckCircle2 size={15} strokeWidth={2} aria-hidden="true" />
            <span>
              <strong>Teste simulado concluído às {formatTime(test.at)}.</strong> Nenhum e-mail foi enviado para{' '}
              {test.to}: o teste real de conexão depende do Backend.
            </span>
          </>
        ) : sending ? (
          <>
            <Mail size={15} strokeWidth={1.8} aria-hidden="true" />
            <span>Simulando envio para {test.to}…</span>
          </>
        ) : null}
      </p>

      {test.phase === 'confirm' ? (
        <TestEmailDialog
          to={test.to}
          smtp={smtp}
          onCancel={() => setTest({ phase: 'idle' })}
          onConfirm={confirm}
        />
      ) : null}
    </div>
  )
}
