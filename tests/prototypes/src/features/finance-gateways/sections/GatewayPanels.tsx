import { useRef } from 'react'
import { AlertCircle, AlertTriangle, History, Info } from 'lucide-react'
import { StatusPill } from '../../../components/ui/StatusPill'
import { SettingsSection } from '../../whitelabel-settings/SettingsSection'
import { useSectionEditor } from '../../whitelabel-settings/useSectionEditor'
import fields from '../../whitelabel-settings/sections/fields.module.css'
import {
  CREDENTIAL_FIELDS,
  DISPLAY_STATUS_META,
  ENVIRONMENT_LABEL,
  MODALITIES,
  ROLE_LABEL,
  bankName,
  credentialsComplete,
  displayStatusOf,
  formatTime,
  hintOf,
  maskedAccount,
  providerOf,
  setupOf,
  validateCredentials,
  type BankAccount,
  type CredentialDraft,
  type FinanceActivity,
  type FinanceDraftKey,
  type GatewayConfig,
  type GatewayDependencyDraft,
  type GatewayEnvironment,
  type GatewayOverviewDraft,
  type GatewayRole,
} from '../financeModel'
import { addFinanceActivity, updateFinanceSettings } from '../financeStore'
import styles from './FinanceSections.module.css'

type EditorProps = {
  whitelabelId: string
  gateway: GatewayConfig
  onDirtyChange: (key: FinanceDraftKey, dirty: boolean) => void
  notify: (message: string) => void
}

function updateGateway(whitelabelId: string, id: string, change: (gateway: GatewayConfig) => GatewayConfig) {
  updateFinanceSettings(whitelabelId, (settings) => ({
    gateways: settings.gateways.map((gateway) => (gateway.id === id ? change(gateway) : gateway)),
  }))
}

function focusFirstInvalid(sectionId: string) {
  window.requestAnimationFrame(() => document.querySelector<HTMLElement>(`#${sectionId} [aria-invalid="true"]`)?.focus())
}

/* ---------- Visão geral ---------- */

export function GatewayOverview({
  whitelabelId,
  gateway,
  gateways,
  onDirtyChange,
  notify,
}: EditorProps & { gateways: GatewayConfig[] }) {
  const editRef = useRef<HTMLButtonElement>(null)
  const provider = providerOf(gateway.providerId)
  const display = DISPLAY_STATUS_META[displayStatusOf(gateway)]
  const saved: GatewayOverviewDraft = { role: gateway.role, environment: gateway.environment }

  const editor = useSectionEditor<GatewayOverviewDraft, FinanceDraftKey>({
    section: 'gateway-config',
    label: 'Configuração do gateway',
    saved,
    onDirtyChange,
    notify,
    validate: (draft) => {
      const errors: Record<string, string> = {}
      const otherPrimary = gateways.find((item) => item.id !== gateway.id && item.role === 'primary')
      if (draft.role === 'primary' && otherPrimary) {
        errors.role = `Premissa local do protótipo: ${providerOf(otherPrimary.providerId).name} já é o gateway principal. Altere o papel dele antes.`
      }
      return errors
    },
    onCommit: (draft) => {
      const changes = [
        draft.role !== gateway.role ? `Papel: ${ROLE_LABEL[draft.role]}` : null,
        draft.environment !== gateway.environment ? `Ambiente: ${ENVIRONMENT_LABEL[draft.environment]}` : null,
      ].filter(Boolean)
      updateGateway(whitelabelId, gateway.id, (item) => ({ ...item, ...draft }))
      addFinanceActivity(whitelabelId, {
        kind: 'gateway_updated',
        gatewayId: gateway.id,
        title: `Configuração de ${provider.name} editada localmente`,
        detail: changes.join(' · ') || undefined,
      })
    },
  })

  const draft = editor.editing ? editor.draft : saved
  const productionWarning = draft.environment === 'production' && !credentialsComplete(gateway)

  return (
    <SettingsSection
      id="fin-gateway-overview"
      title="Informações principais"
      subtitle="Papel e ambiente desta configuração. Alterações valem apenas neste protótipo."
      status={setupOf(gateway) === 'configured' ? 'configured' : 'incomplete'}
      editButtonRef={editRef}
      editLabel="Editar configuração"
      editor={{
        ...editor,
        startEditing: () => {
          editor.startEditing()
          window.requestAnimationFrame(() => document.getElementById('fin-gw-role')?.focus())
        },
        discard: () => {
          editor.discard()
          window.requestAnimationFrame(() => editRef.current?.focus())
        },
        save: () => {
          if (!editor.save()) focusFirstInvalid('fin-gateway-overview')
        },
      }}
    >
      {editor.editing ? (
        <div className={styles.formGrid}>
          <div className={fields.field}>
            <label htmlFor="fin-gw-role" className={fields.label}>
              Papel
            </label>
            <select
              id="fin-gw-role"
              className={`${fields.input} ${styles.select}`}
              value={draft.role}
              onChange={(event) => {
                editor.update((current) => ({ ...current, role: event.target.value as GatewayRole }))
                editor.clearError('role')
              }}
              disabled={editor.phase === 'saving'}
              aria-invalid={editor.errors.role ? true : undefined}
              aria-describedby={editor.errors.role ? 'fin-gw-role-error' : undefined}
            >
              {(Object.keys(ROLE_LABEL) as GatewayRole[]).map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABEL[role]}
                </option>
              ))}
            </select>
            {editor.errors.role ? (
              <p id="fin-gw-role-error" className={fields.error}>
                <AlertCircle size={14} strokeWidth={2} aria-hidden="true" />
                {editor.errors.role}
              </p>
            ) : null}
          </div>
          <div className={fields.field}>
            <label htmlFor="fin-gw-env" className={fields.label}>
              Ambiente
            </label>
            <select
              id="fin-gw-env"
              className={`${fields.input} ${styles.select}`}
              value={draft.environment}
              onChange={(event) => editor.update((current) => ({ ...current, environment: event.target.value as GatewayEnvironment }))}
              disabled={editor.phase === 'saving'}
              aria-describedby={productionWarning ? 'fin-gw-env-warning' : undefined}
            >
              {(Object.keys(ENVIRONMENT_LABEL) as GatewayEnvironment[]).map((environment) => (
                <option key={environment} value={environment}>
                  {ENVIRONMENT_LABEL[environment]}
                </option>
              ))}
            </select>
            {productionWarning ? (
              <p id="fin-gw-env-warning" className={styles.inlineWarning}>
                <AlertTriangle size={13} strokeWidth={2} aria-hidden="true" />
                Sinalização local do protótipo: credenciais incompletas para produção.
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <dl className={fields.rows}>
          <div className={fields.row}>
            <dt>Status</dt>
            <dd>
              <StatusPill tone={display.tone} label={display.label} />
            </dd>
          </div>
          <div className={fields.row}>
            <dt>Ambiente</dt>
            <dd>
              <span className={fields.value}>{ENVIRONMENT_LABEL[gateway.environment]}</span>
            </dd>
          </div>
          <div className={fields.row}>
            <dt>Papel</dt>
            <dd>
              <span className={fields.value}>{ROLE_LABEL[gateway.role]}</span>
            </dd>
          </div>
          <div className={fields.row}>
            <dt>Integração</dt>
            <dd>
              <StatusPill tone="neutral" label="Aguardando integração" />
            </dd>
          </div>
          <div className={fields.row}>
            <dt>Última validação</dt>
            <dd>
              {gateway.lastValidation ? (
                <span className={fields.value}>
                  {gateway.lastValidation.result === 'success' ? 'Simulação concluída' : 'Simulação com falha'} às{' '}
                  {formatTime(gateway.lastValidation.at)} · nesta sessão
                </span>
              ) : (
                <span className={fields.empty}>Não validado nesta sessão</span>
              )}
            </dd>
          </div>
        </dl>
      )}
    </SettingsSection>
  )
}

/* ---------- Credenciais ---------- */

const EMPTY_CREDENTIALS: CredentialDraft = { clientId: '', apiKey: '', webhookSecret: '', accountId: '' }

export function GatewayCredentials({ whitelabelId, gateway, onDirtyChange, notify }: EditorProps) {
  const editRef = useRef<HTMLButtonElement>(null)
  const provider = providerOf(gateway.providerId)
  const configuredCount = CREDENTIAL_FIELDS.filter((field) => gateway.credentials[field.key].configured).length

  const editor = useSectionEditor<CredentialDraft, FinanceDraftKey>({
    section: 'gateway-credentials',
    label: 'Credenciais',
    saved: EMPTY_CREDENTIALS,
    onDirtyChange,
    notify,
    validate: validateCredentials,
    onCommit: (draft) => {
      const replaced = CREDENTIAL_FIELDS.filter((field) => draft[field.key])
      // Only the configured flag (and a non-secret hint for identifiers) is kept.
      updateGateway(whitelabelId, gateway.id, (item) => ({
        ...item,
        credentials: Object.fromEntries(
          CREDENTIAL_FIELDS.map((field) => [
            field.key,
            draft[field.key]
              ? { configured: true, hint: field.secret ? undefined : hintOf(draft[field.key]) }
              : item.credentials[field.key],
          ]),
        ) as GatewayConfig['credentials'],
      }))
      addFinanceActivity(whitelabelId, {
        kind: 'credentials_updated',
        gatewayId: gateway.id,
        title: `Credenciais de ${provider.name} atualizadas localmente`,
        detail: replaced.length ? `${replaced.map((field) => field.label).join(', ')}: valor substituído.` : undefined,
      })
    },
  })

  return (
    <SettingsSection
      id="fin-gateway-credentials"
      title="Credenciais (mascaradas)"
      subtitle="Segredos nunca são exibidos. Novos valores são de escrita única e não ficam guardados neste protótipo."
      status={configuredCount === CREDENTIAL_FIELDS.length ? 'configured' : configuredCount ? 'incomplete' : 'not_configured'}
      editButtonRef={editRef}
      editLabel="Editar credenciais"
      editor={{
        ...editor,
        startEditing: () => {
          editor.startEditing()
          window.requestAnimationFrame(() => document.getElementById('fin-cred-clientId')?.focus())
        },
        discard: () => {
          editor.discard()
          window.requestAnimationFrame(() => editRef.current?.focus())
        },
        save: () => {
          if (!editor.save()) focusFirstInvalid('fin-gateway-credentials')
        },
      }}
    >
      {editor.editing ? (
        <div className={styles.credentialForm}>
          {CREDENTIAL_FIELDS.map((field) => {
            const id = `fin-cred-${field.key}`
            const error = editor.errors[field.key]
            const state = gateway.credentials[field.key]
            return (
              <div key={field.key} className={fields.field}>
                <label htmlFor={id} className={fields.label}>
                  {field.label}
                  {state.configured ? <span className={styles.labelNote}> · configurada</span> : null}
                </label>
                <input
                  id={id}
                  type={field.secret ? 'password' : 'text'}
                  className={fields.input}
                  value={editor.draft[field.key]}
                  onChange={(event) => {
                    editor.update((current) => ({ ...current, [field.key]: event.target.value }))
                    editor.clearError(field.key)
                  }}
                  placeholder={state.configured ? 'Deixe em branco para manter' : undefined}
                  autoComplete={field.secret ? 'new-password' : 'off'}
                  spellCheck={false}
                  disabled={editor.phase === 'saving'}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`}
                />
                <span id={`${id}-hint`} className={styles.fieldHint}>
                  {field.hint}
                </span>
                {error ? (
                  <p id={`${id}-error`} className={fields.error}>
                    <AlertCircle size={14} strokeWidth={2} aria-hidden="true" />
                    {error}
                  </p>
                ) : null}
              </div>
            )
          })}
        </div>
      ) : (
        <dl className={fields.rows}>
          {CREDENTIAL_FIELDS.map((field) => {
            const state = gateway.credentials[field.key]
            return (
              <div key={field.key} className={fields.row}>
                <dt>{field.label}</dt>
                <dd>
                  {state.configured ? (
                    <>
                      <span className={styles.mask} aria-hidden="true">
                        {field.secret || !state.hint ? '••••••••••' : `•••• ${state.hint}`}
                      </span>
                      <span className="visually-hidden">
                        {field.secret || !state.hint ? 'Oculta. ' : `Final ${state.hint}. `}
                      </span>
                      <span className={styles.secretTag}>Configurada</span>
                    </>
                  ) : (
                    <span className={fields.empty}>Não configurada</span>
                  )}
                </dd>
              </div>
            )
          })}
        </dl>
      )}
      <p className={fields.note}>
        <Info size={15} strokeWidth={1.8} aria-hidden="true" />
        <span>
          Não há leitura de segredos: o Backend deverá guardar credenciais de forma segura e expor apenas o estado
          configurado.
        </span>
      </p>
    </SettingsSection>
  )
}

/* ---------- Dependências ---------- */

export function GatewayDependencies({
  whitelabelId,
  gateway,
  bankAccounts,
  onDirtyChange,
  notify,
}: EditorProps & { bankAccounts: BankAccount[] }) {
  const editRef = useRef<HTMLButtonElement>(null)
  const provider = providerOf(gateway.providerId)
  const saved: GatewayDependencyDraft = { modalities: gateway.modalities, linkedBankAccountId: gateway.linkedBankAccountId }
  const linked = bankAccounts.find((account) => account.id === gateway.linkedBankAccountId)

  const editor = useSectionEditor<GatewayDependencyDraft, FinanceDraftKey>({
    section: 'gateway-dependencies',
    label: 'Dependências',
    saved,
    onDirtyChange,
    notify,
    onCommit: (draft) => {
      updateGateway(whitelabelId, gateway.id, (item) => ({ ...item, ...draft }))
      addFinanceActivity(whitelabelId, {
        kind: 'gateway_updated',
        gatewayId: gateway.id,
        title: `Dependências de ${provider.name} editadas localmente`,
        detail: `Modalidades: ${
          draft.modalities.length ? MODALITIES.filter((m) => draft.modalities.includes(m.id)).map((m) => m.label).join(', ') : 'nenhuma'
        }.`,
      })
    },
  })

  const draft = editor.editing ? editor.draft : saved

  return (
    <SettingsSection
      id="fin-gateway-dependencies"
      title="Modalidades e conta vinculada"
      subtitle="Quais modalidades usariam este gateway e qual conta bancária do Whitelabel está associada (relação ilustrativa)."
      editButtonRef={editRef}
      editLabel="Editar dependências"
      editor={{
        ...editor,
        startEditing: () => {
          editor.startEditing()
          window.requestAnimationFrame(() => document.querySelector<HTMLElement>('#fin-gateway-dependencies input')?.focus())
        },
        discard: () => {
          editor.discard()
          window.requestAnimationFrame(() => editRef.current?.focus())
        },
        save: () => {
          editor.save()
        },
      }}
    >
      {editor.editing ? (
        <div className={styles.formGrid}>
          <fieldset className={styles.checkGroup}>
            <legend className={fields.label}>Modalidades atendidas</legend>
            {MODALITIES.map((modality) => (
              <label key={modality.id} className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={draft.modalities.includes(modality.id)}
                  onChange={(event) =>
                    editor.update((current) => ({
                      ...current,
                      modalities: event.target.checked
                        ? MODALITIES.map((m) => m.id).filter((id) => id === modality.id || current.modalities.includes(id))
                        : current.modalities.filter((id) => id !== modality.id),
                    }))
                  }
                  disabled={editor.phase === 'saving'}
                />
                {modality.label}
              </label>
            ))}
          </fieldset>
          <div className={fields.field}>
            <label htmlFor="fin-gw-bank" className={fields.label}>
              Conta bancária vinculada
            </label>
            <select
              id="fin-gw-bank"
              className={`${fields.input} ${styles.select}`}
              value={draft.linkedBankAccountId ?? ''}
              onChange={(event) => editor.update((current) => ({ ...current, linkedBankAccountId: event.target.value || null }))}
              disabled={editor.phase === 'saving'}
            >
              <option value="">Nenhuma</option>
              {bankAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {bankName(account.bankCode)} · {maskedAccount(account)}
                  {account.status === 'inactive' ? ' (inativa)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <dl className={fields.rows}>
          <div className={fields.row}>
            <dt>Modalidades atendidas</dt>
            <dd>
              {gateway.modalities.length ? (
                MODALITIES.filter((modality) => gateway.modalities.includes(modality.id)).map((modality) => (
                  <span key={modality.id} className={styles.chip}>
                    {modality.label}
                  </span>
                ))
              ) : (
                <span className={fields.empty}>Nenhuma</span>
              )}
            </dd>
          </div>
          <div className={fields.row}>
            <dt>Conta vinculada</dt>
            <dd>
              {linked ? (
                <span className={fields.value}>
                  {bankName(linked.bankCode)} · {maskedAccount(linked)}
                  {linked.status === 'inactive' ? ' · inativa' : ''}
                </span>
              ) : (
                <span className={fields.empty}>Nenhuma</span>
              )}
            </dd>
          </div>
        </dl>
      )}
      <p className={fields.note}>
        <Info size={15} strokeWidth={1.8} aria-hidden="true" />
        <span>Regras detalhadas por modalidade ficam no futuro módulo Modalidades e Regras.</span>
      </p>
    </SettingsSection>
  )
}

/* ---------- Atividade da sessão ---------- */

export function GatewayActivity({ entries }: { entries: FinanceActivity[] }) {
  return (
    <div className={styles.activityBox}>
      <p className={styles.activityIntro}>Ações locais deste protótipo para este gateway. Não é histórico de auditoria.</p>
      {entries.length ? (
        <ol className={styles.activityList}>
          {entries.map((entry) => (
            <li key={entry.id} className={styles.activityItem}>
              <div>
                <p className={styles.activityTitle}>{entry.title}</p>
                {entry.detail ? <p className={styles.activityDetail}>{entry.detail}</p> : null}
              </div>
              <time className={styles.activityTime} dateTime={entry.at}>
                {formatTime(entry.at)}
              </time>
            </li>
          ))}
        </ol>
      ) : (
        <p className={styles.activityEmpty}>
          <History size={16} strokeWidth={1.8} aria-hidden="true" />
          Nenhuma ação local para este gateway nesta sessão.
        </p>
      )}
    </div>
  )
}
