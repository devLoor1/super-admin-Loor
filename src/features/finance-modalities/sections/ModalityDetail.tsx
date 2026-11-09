import { useState } from 'react'
import { StatusPill } from '../../../components/ui/StatusPill'
import { Tabs } from '../../../components/ui/Tabs'
import { tabId, tabPanelId } from '../../../components/ui/tabIds'
import { updateFinanceSettings } from '../../finance-gateways/financeStore'
import type { WhitelabelFinanceSettings } from '../../finance-gateways/financeModel'
import fin from '../../finance-gateways/sections/FinanceSections.module.css'
import type { Whitelabel } from '../../whitelabels/prototypeWhitelabels'
import { DisableModalityDialog } from '../dialogs/DisableModalityDialog'
import {
  MODALITY_DISPLAY_META,
  gatewayDependency,
  isEnabled,
  modalityDisplay,
  type ModalityActivity,
  type ModalityDraftKey,
  type ModalityMeta,
  type ModalityRuleConfig,
} from '../modalitiesModel'
import { addModalityActivity } from '../modalitiesStore'
import { ModalityActivityPanel, ModalityDependencies, ModalityOverview, ModalityRules } from './ModalityPanels'

export type DetailTab = 'overview' | 'dependencies' | 'rules' | 'activity'
const TABS: { value: DetailTab; label: string }[] = [
  { value: 'overview', label: 'Visão geral' },
  { value: 'dependencies', label: 'Dependências' },
  { value: 'rules', label: 'Regras' },
  { value: 'activity', label: 'Atividade da sessão' },
]
export const DETAIL_TABS_ID = 'mod-detail-tabs'

type Props = {
  whitelabel: Whitelabel
  modality: ModalityMeta
  settings: WhitelabelFinanceSettings
  rules: ModalityRuleConfig
  activity: ModalityActivity[]
  tab: DetailTab
  onTabChange: (tab: DetailTab) => void
  onDirtyChange: (key: ModalityDraftKey, dirty: boolean) => void
  notify: (message: string) => void
}

/**
 * Selected modality. Tabs keep every panel mounted (hidden) so a rules draft
 * survives switching tabs. Enable/disable only changes the shared local
 * Finance prototype state (also read by Gateways e contas); nothing cascades.
 */
export function ModalityDetail({ whitelabel, modality, settings, rules, activity, tab, onTabChange, onDirtyChange, notify }: Props) {
  const [confirmDisable, setConfirmDisable] = useState(false)
  const Icon = modality.icon
  const display = MODALITY_DISPLAY_META[modalityDisplay(settings, modality.id)]
  const enabled = isEnabled(settings, modality.id)
  const entries = activity.filter((entry) => entry.modalityId === modality.id)

  const setSetting = (value: 'enabled' | 'disabled') =>
    updateFinanceSettings(whitelabel.id, (current) => ({ modalities: { ...current.modalities, [modality.id]: value } }))

  function enable() {
    setSetting('enabled')
    addModalityActivity(whitelabel.id, { kind: 'modality_enabled', modalityId: modality.id, title: `${modality.name} habilitada localmente` })
    // Read the dependency from the state this action produces (enabled), not the stale render.
    const pending = gatewayDependency({ ...settings, modalities: { ...settings.modalities, [modality.id]: 'enabled' } }, modality.id) === 'pending'
    notify(
      `${modality.name} habilitada neste protótipo para ${whitelabel.name}. O impacto operacional depende de Produto e Backend.` +
        (pending ? ' Sem gateway ativo que a atenda: dependência pendente.' : ''),
    )
  }

  function disable() {
    setConfirmDisable(false)
    setSetting('disabled')
    addModalityActivity(whitelabel.id, { kind: 'modality_disabled', modalityId: modality.id, title: `${modality.name} desabilitada localmente` })
    notify(`${modality.name} desabilitada neste protótipo. Oportunidades, investimentos e pagamentos não foram alterados.`)
  }

  return (
    <section id="mod-detail" className={fin.detail} aria-labelledby="mod-detail-title" data-detail-stage>
      <div className={fin.detailInner}>
        <header className={fin.detailHeader}>
          <span className={fin.avatarLg} data-tone={modality.tone} aria-hidden="true">
            <Icon size={22} strokeWidth={1.9} />
          </span>
          <div className={fin.detailHeading}>
            <h2 id="mod-detail-title" className={fin.detailTitle} tabIndex={-1}>
              {modality.name}
            </h2>
            <p className={fin.detailMeta}>Modalidade financeira · Whitelabel {whitelabel.name}</p>
          </div>
          <StatusPill tone={display.tone} label={display.label} />
        </header>

        <Tabs idPrefix={DETAIL_TABS_ID} label={`Detalhes de ${modality.name}`} tabs={TABS} value={tab} onChange={onTabChange} className={fin.tabs} />

        {TABS.map((item) => (
          <div
            key={item.value}
            role="tabpanel"
            id={tabPanelId(DETAIL_TABS_ID, item.value)}
            aria-labelledby={tabId(DETAIL_TABS_ID, item.value)}
            hidden={tab !== item.value}
            className={fin.tabPanel}
          >
            {item.value === 'overview' ? (
              <ModalityOverview
                whitelabel={whitelabel}
                modality={modality}
                settings={settings}
                rules={rules}
                lastChange={entries[0]}
                onEnable={enable}
                onRequestDisable={() => setConfirmDisable(true)}
              />
            ) : item.value === 'dependencies' ? (
              <ModalityDependencies whitelabelId={whitelabel.id} modality={modality} settings={settings} rules={rules} />
            ) : item.value === 'rules' ? (
              <ModalityRules
                whitelabelId={whitelabel.id}
                modality={modality}
                enabled={enabled}
                rules={rules}
                onDirtyChange={onDirtyChange}
                notify={notify}
              />
            ) : (
              <ModalityActivityPanel entries={entries} />
            )}
          </div>
        ))}
      </div>

      {confirmDisable ? (
        <DisableModalityDialog
          modality={modality}
          whitelabelName={whitelabel.name}
          statusLabel={display.label}
          onCancel={() => setConfirmDisable(false)}
          onConfirm={disable}
          fallbackFocus={() => document.querySelector<HTMLElement>('#mod-detail [data-modality-toggle]')}
        />
      ) : null}
    </section>
  )
}
