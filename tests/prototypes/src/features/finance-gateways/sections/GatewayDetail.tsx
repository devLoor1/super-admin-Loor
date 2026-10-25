import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Loader2, Play, Power, PowerOff, XCircle } from 'lucide-react'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import { StatusPill } from '../../../components/ui/StatusPill'
import { Tabs } from '../../../components/ui/Tabs'
import { tabId, tabPanelId } from '../../../components/ui/tabIds'
import { DeactivateGatewayDialog, ValidateConnectionDialog } from '../dialogs/GatewayDialogs'
import {
  DISPLAY_STATUS_META,
  ENVIRONMENT_LABEL,
  ROLE_LABEL,
  displayStatusOf,
  formatTime,
  missingCredentials,
  providerOf,
  type BankAccount,
  type FinanceActivity,
  type FinanceDraftKey,
  type GatewayConfig,
} from '../financeModel'
import { addFinanceActivity, updateFinanceSettings } from '../financeStore'
import { GatewayActivity, GatewayCredentials, GatewayDependencies, GatewayOverview } from './GatewayPanels'
import styles from './FinanceSections.module.css'

type Tab = 'overview' | 'credentials' | 'dependencies' | 'activity'
const TABS: { value: Tab; label: string }[] = [
  { value: 'overview', label: 'Visão geral' },
  { value: 'credentials', label: 'Credenciais' },
  { value: 'dependencies', label: 'Dependências' },
  { value: 'activity', label: 'Atividade da sessão' },
]
const TABS_ID = 'fin-gateway-tabs'
const VALIDATION_DELAY = 1400

type Props = {
  /** Tab shown when this gateway is first displayed (e.g. Credenciais after creation). */
  initialTab?: Tab
  whitelabelId: string
  gateway: GatewayConfig
  gateways: GatewayConfig[]
  bankAccounts: BankAccount[]
  activity: FinanceActivity[]
  onDirtyChange: (key: FinanceDraftKey, dirty: boolean) => void
  notify: (message: string) => void
}

/**
 * Selected gateway — tabs keep every panel mounted (hidden) so a draft in one
 * tab survives switching to another. All actions are local simulations.
 */
export function GatewayDetail({
  initialTab = 'overview',
  whitelabelId,
  gateway,
  gateways,
  bankAccounts,
  activity,
  onDirtyChange,
  notify,
}: Props) {
  const [tab, setTab] = useState<Tab>(initialTab)
  const [dialog, setDialog] = useState<'validate' | 'deactivate' | null>(null)
  const [validating, setValidating] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const provider = providerOf(gateway.providerId)
  const display = DISPLAY_STATUS_META[displayStatusOf(gateway)]
  const entries = activity.filter((entry) => entry.gatewayId === gateway.id)
  const setActive = (active: boolean) =>
    updateFinanceSettings(whitelabelId, (settings) => ({
      gateways: settings.gateways.map((item) => (item.id === gateway.id ? { ...item, active } : item)),
    }))

  function runValidation() {
    setDialog(null)
    setValidating(true)
    timer.current = window.setTimeout(() => {
      const missing = missingCredentials(gateway)
      const result = missing.length
        ? { result: 'failure' as const, detail: `Credenciais incompletas: ${missing.map((field) => field.label).join(', ')}.` }
        : { result: 'success' as const, detail: 'Configuração local consistente. Nenhuma requisição foi feita ao provedor.' }
      const at = new Date().toISOString()
      updateFinanceSettings(whitelabelId, (settings) => ({
        gateways: settings.gateways.map((item) => (item.id === gateway.id ? { ...item, lastValidation: { ...result, at } } : item)),
      }))
      addFinanceActivity(whitelabelId, {
        kind: 'validation',
        gatewayId: gateway.id,
        title: result.result === 'success' ? 'Validação de conexão simulada: concluída' : 'Validação de conexão simulada: falhou',
        detail: result.detail,
      })
      setValidating(false)
    }, VALIDATION_DELAY)
  }

  function activate() {
    setActive(true)
    addFinanceActivity(whitelabelId, { kind: 'gateway_activated', gatewayId: gateway.id, title: `${provider.name} ativado localmente` })
    notify(`${provider.name} ativado neste protótipo. O impacto operacional depende das regras do Backend.`)
  }

  function deactivate() {
    setDialog(null)
    setActive(false)
    addFinanceActivity(whitelabelId, { kind: 'gateway_deactivated', gatewayId: gateway.id, title: `${provider.name} desativado localmente` })
    notify(`${provider.name} desativado neste protótipo. Nenhuma operação financeira foi alterada.`)
  }

  const validation = gateway.lastValidation

  return (
    <section id="fin-gateway-detail" className={styles.detail} aria-labelledby="fin-gateway-detail-title" data-detail-stage>
      <div className={styles.detailInner}>
        <header className={styles.detailHeader}>
          <span className={styles.avatarLg} data-tone={provider.tone} aria-hidden="true">
            {provider.initial}
          </span>
          <div className={styles.detailHeading}>
            <h2 id="fin-gateway-detail-title" className={styles.detailTitle} tabIndex={-1}>
              {provider.name}
            </h2>
            <p className={styles.detailMeta}>
              Gateway de pagamentos · provedor ilustrativo · {ROLE_LABEL[gateway.role]} · {ENVIRONMENT_LABEL[gateway.environment]}
            </p>
          </div>
          <StatusPill tone={display.tone} label={display.label} />
        </header>

        <Tabs idPrefix={TABS_ID} label={`Detalhes de ${provider.name}`} tabs={TABS} value={tab} onChange={setTab} className={styles.tabs} />

        {TABS.map((item) => (
          <div
            key={item.value}
            role="tabpanel"
            id={tabPanelId(TABS_ID, item.value)}
            aria-labelledby={tabId(TABS_ID, item.value)}
            hidden={tab !== item.value}
            className={styles.tabPanel}
          >
            {item.value === 'overview' ? (
              <>
                <GatewayOverview
                  whitelabelId={whitelabelId}
                  gateway={gateway}
                  gateways={gateways}
                  onDirtyChange={onDirtyChange}
                  notify={notify}
                />
                <div className={styles.gatewayActions}>
                  <OutlineButton
                    className={styles.actionButton}
                    onClick={() => (validating ? undefined : setDialog('validate'))}
                    aria-disabled={validating || undefined}
                    data-validate
                  >
                    {validating ? (
                      <Loader2 className={styles.spin} size={15} strokeWidth={2} aria-hidden="true" />
                    ) : (
                      <Play size={15} strokeWidth={1.9} aria-hidden="true" />
                    )}
                    {validating ? 'Validando…' : 'Validar conexão'}
                  </OutlineButton>
                  {gateway.active ? (
                    <OutlineButton className={`${styles.actionButton} ${styles.dangerButton}`} onClick={() => setDialog('deactivate')} data-gateway-toggle>
                      <PowerOff size={15} strokeWidth={1.9} aria-hidden="true" />
                      Desativar
                    </OutlineButton>
                  ) : (
                    <OutlineButton className={`${styles.actionButton} ${styles.activateButton}`} onClick={activate} data-gateway-toggle>
                      <Power size={15} strokeWidth={1.9} aria-hidden="true" />
                      Ativar
                    </OutlineButton>
                  )}
                </div>
                <p className={styles.validationResult} role="status" data-visible={validating || validation ? true : undefined} data-result={validating ? undefined : validation?.result}>
                  {validating ? (
                    <>
                      <Loader2 className={styles.spin} size={15} strokeWidth={2} aria-hidden="true" />
                      <span>Simulando validação de {provider.name}… nenhuma requisição é feita ao provedor.</span>
                    </>
                  ) : validation ? (
                    <>
                      {validation.result === 'success' ? (
                        <CheckCircle2 size={15} strokeWidth={2} aria-hidden="true" />
                      ) : (
                        <XCircle size={15} strokeWidth={2} aria-hidden="true" />
                      )}
                      <span>
                        <strong>
                          {validation.result === 'success' ? 'Validação simulada concluída' : 'Validação simulada com falha'} às{' '}
                          {formatTime(validation.at)}.
                        </strong>{' '}
                        {validation.detail} Integração real: aguardando Backend.
                      </span>
                    </>
                  ) : null}
                </p>
              </>
            ) : item.value === 'credentials' ? (
              <GatewayCredentials whitelabelId={whitelabelId} gateway={gateway} onDirtyChange={onDirtyChange} notify={notify} />
            ) : item.value === 'dependencies' ? (
              <GatewayDependencies
                whitelabelId={whitelabelId}
                gateway={gateway}
                bankAccounts={bankAccounts}
                onDirtyChange={onDirtyChange}
                notify={notify}
              />
            ) : (
              <GatewayActivity entries={entries} />
            )}
          </div>
        ))}
      </div>

      {dialog === 'validate' ? (
        <ValidateConnectionDialog gateway={gateway} onCancel={() => setDialog(null)} onConfirm={runValidation} />
      ) : null}
      {dialog === 'deactivate' ? (
        <DeactivateGatewayDialog
          gateway={gateway}
          onCancel={() => setDialog(null)}
          onConfirm={deactivate}
          fallbackFocus={() => document.querySelector<HTMLElement>('#fin-gateway-detail [data-gateway-toggle]')}
        />
      ) : null}
    </section>
  )
}
