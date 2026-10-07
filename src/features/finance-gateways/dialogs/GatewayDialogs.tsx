import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AlertTriangle, Info, Link2, Play, PowerOff } from 'lucide-react'
import { Dialog } from '../../../components/ui/Dialog'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import { PrimaryButton } from '../../../components/ui/PrimaryButton'
import dialogStyles from '../../whitelabel-settings/dialogs/SettingsDialogs.module.css'
import {
  CREDENTIAL_FIELDS,
  ENVIRONMENT_LABEL,
  PROVIDERS,
  ROLE_LABEL,
  missingCredentials,
  providerOf,
  type GatewayConfig,
  type GatewayEnvironment,
  type GatewayRole,
} from '../financeModel'
import styles from './FinanceDialogs.module.css'

function GatewaySummary({ gateway }: { gateway: GatewayConfig }) {
  const configured = CREDENTIAL_FIELDS.length - missingCredentials(gateway).length
  return (
    <dl className={styles.summary}>
      <div>
        <dt>Provedor</dt>
        <dd>{providerOf(gateway.providerId).name} (ilustrativo)</dd>
      </div>
      <div>
        <dt>Papel · Ambiente</dt>
        <dd>
          {ROLE_LABEL[gateway.role]} · {ENVIRONMENT_LABEL[gateway.environment]}
        </dd>
      </div>
      <div>
        <dt>Credenciais</dt>
        <dd>
          {configured} de {CREDENTIAL_FIELDS.length} configuradas
        </dd>
      </div>
    </dl>
  )
}

/** Context + confirmation for the simulated connection validation. */
export function ValidateConnectionDialog({
  gateway,
  onCancel,
  onConfirm,
}: {
  gateway: GatewayConfig
  onCancel: () => void
  onConfirm: () => void
}) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  return (
    <Dialog
      title="Validar conexão (simulação)"
      description="Confirme a validação local desta configuração."
      icon={Play}
      onClose={onCancel}
      initialFocusRef={cancelRef}
      footer={
        <>
          <OutlineButton ref={cancelRef} className={dialogStyles.footerButton} onClick={onCancel}>
            Cancelar
          </OutlineButton>
          <PrimaryButton className={dialogStyles.footerButton} onClick={onConfirm}>
            <Play size={16} strokeWidth={1.9} aria-hidden="true" />
            Simular validação
          </PrimaryButton>
        </>
      }
    >
      <GatewaySummary gateway={gateway} />
      <p className={dialogStyles.callout}>
        <Info size={15} strokeWidth={1.8} aria-hidden="true" />
        <span>
          <strong>Nenhuma requisição real é feita ao provedor.</strong> O resultado só confere a configuração local. O
          teste real de conexão, com erros sanitizados e registro de auditoria, aguarda integração com o Backend.
        </span>
      </p>
    </Dialog>
  )
}

/** Deactivation always asks first: it could affect financial flows once real. */
export function DeactivateGatewayDialog({
  gateway,
  onCancel,
  onConfirm,
  fallbackFocus,
}: {
  gateway: GatewayConfig
  onCancel: () => void
  onConfirm: () => void
  fallbackFocus: () => HTMLElement | null
}) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const name = providerOf(gateway.providerId).name
  return (
    <Dialog
      title={`Desativar ${name}?`}
      description="Confirme a desativação local deste gateway."
      icon={PowerOff}
      tone="warning"
      onClose={onCancel}
      initialFocusRef={cancelRef}
      fallbackFocus={fallbackFocus}
      footer={
        <>
          <OutlineButton ref={cancelRef} className={dialogStyles.footerButton} onClick={onCancel}>
            Cancelar
          </OutlineButton>
          <button type="button" className={styles.dangerConfirm} onClick={onConfirm}>
            <PowerOff size={16} strokeWidth={1.9} aria-hidden="true" />
            Desativar gateway
          </button>
        </>
      }
    >
      <GatewaySummary gateway={gateway} />
      <p className={`${dialogStyles.callout} ${styles.warningCallout}`}>
        <AlertTriangle size={15} strokeWidth={1.8} aria-hidden="true" />
        <span>
          <strong>Este protótipo altera apenas o estado local da configuração.</strong> O impacto operacional (cobranças,
          recebimentos ou operações em andamento) depende das regras do Backend. Nenhum valor, pagamento ou investimento é
          alterado.
          {gateway.role === 'primary' ? ' Este é o gateway principal deste Whitelabel.' : ''}
        </span>
      </p>
    </Dialog>
  )
}

/** Adds a local, illustrative gateway configuration (credentials are set afterwards). */
export function NewGatewayDialog({
  whitelabelName,
  hasPrimary,
  onCancel,
  onCreate,
  onDirtyChange,
}: {
  whitelabelName: string
  hasPrimary: boolean
  onCancel: () => void
  onCreate: (input: { providerId: string; role: GatewayRole; environment: GatewayEnvironment }) => void
  onDirtyChange: (dirty: boolean) => void
}) {
  const [providerId, setProviderId] = useState('')
  const [role, setRole] = useState<GatewayRole>(hasPrimary ? 'secondary' : 'primary')
  const [environment, setEnvironment] = useState<GatewayEnvironment>('sandbox')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const providerRef = useRef<HTMLSelectElement>(null)

  const dirty = providerId !== '' || role !== (hasPrimary ? 'secondary' : 'primary') || environment !== 'sandbox'
  useEffect(() => {
    onDirtyChange(dirty)
  }, [dirty, onDirtyChange])
  useEffect(() => () => onDirtyChange(false), [onDirtyChange])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next: Record<string, string> = {}
    if (!providerId) next.providerId = 'Selecione um provedor do catálogo ilustrativo.'
    if (role === 'primary' && hasPrimary)
      next.role = 'Premissa local do protótipo: já existe um gateway principal. Escolha outro papel.'
    setErrors(next)
    if (Object.keys(next).length) {
      if (next.providerId) providerRef.current?.focus()
      else document.getElementById('fin-new-role')?.focus()
      return
    }
    onCreate({ providerId, role, environment })
  }

  return (
    <Dialog
      title="Configurar gateway"
      description={`Nova configuração local para ${whitelabelName}.`}
      icon={Link2}
      onClose={onCancel}
      initialFocusRef={providerRef}
      footer={
        <>
          <OutlineButton className={dialogStyles.footerButton} onClick={onCancel}>
            Cancelar
          </OutlineButton>
          <PrimaryButton type="submit" form="fin-new-gateway" className={dialogStyles.footerButton}>
            Adicionar configuração
          </PrimaryButton>
        </>
      }
    >
      <form id="fin-new-gateway" className={dialogStyles.form} onSubmit={submit} noValidate>
        <div className={dialogStyles.field}>
          <label htmlFor="fin-new-provider" className={dialogStyles.label}>
            Provedor <span className={dialogStyles.required}>(catálogo ilustrativo)</span>
          </label>
          <select
            ref={providerRef}
            id="fin-new-provider"
            className={`${dialogStyles.input} ${styles.select}`}
            value={providerId}
            onChange={(event) => {
              setProviderId(event.target.value)
              setErrors((current) => ({ ...current, providerId: '' }))
            }}
            aria-invalid={errors.providerId ? true : undefined}
            aria-describedby={`fin-new-provider-hint${errors.providerId ? ' fin-new-provider-error' : ''}`}
          >
            <option value="">Selecione…</option>
            {PROVIDERS.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </select>
          <p id="fin-new-provider-hint" className={dialogStyles.hint}>
            Nomes fictícios. O catálogo real de provedores suportados depende do Backend.
          </p>
          {errors.providerId ? (
            <p id="fin-new-provider-error" className={dialogStyles.error}>
              {errors.providerId}
            </p>
          ) : null}
        </div>
        <div className={styles.twoCols}>
          <div className={dialogStyles.field}>
            <label htmlFor="fin-new-role" className={dialogStyles.label}>
              Papel
            </label>
            <select
              id="fin-new-role"
              className={`${dialogStyles.input} ${styles.select}`}
              value={role}
              onChange={(event) => {
                setRole(event.target.value as GatewayRole)
                setErrors((current) => ({ ...current, role: '' }))
              }}
              aria-invalid={errors.role ? true : undefined}
              aria-describedby={errors.role ? 'fin-new-role-error' : undefined}
            >
              {(Object.keys(ROLE_LABEL) as GatewayRole[]).map((value) => (
                <option key={value} value={value}>
                  {ROLE_LABEL[value]}
                </option>
              ))}
            </select>
            {errors.role ? (
              <p id="fin-new-role-error" className={dialogStyles.error}>
                {errors.role}
              </p>
            ) : null}
          </div>
          <div className={dialogStyles.field}>
            <label htmlFor="fin-new-env" className={dialogStyles.label}>
              Ambiente
            </label>
            <select
              id="fin-new-env"
              className={`${dialogStyles.input} ${styles.select}`}
              value={environment}
              onChange={(event) => setEnvironment(event.target.value as GatewayEnvironment)}
            >
              {(Object.keys(ENVIRONMENT_LABEL) as GatewayEnvironment[]).map((value) => (
                <option key={value} value={value}>
                  {ENVIRONMENT_LABEL[value]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </form>
      <p className={dialogStyles.callout}>
        <Info size={15} strokeWidth={1.8} aria-hidden="true" />
        <span>
          A configuração começa inativa e sem credenciais. Depois de adicionada, informe as credenciais na aba
          Credenciais. Nada é enviado ao provedor.
        </span>
      </p>
    </Dialog>
  )
}
