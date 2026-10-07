import { useRef } from 'react'
import { AlertTriangle, PowerOff } from 'lucide-react'
import { Dialog } from '../../../components/ui/Dialog'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import dialogStyles from '../../whitelabel-settings/dialogs/SettingsDialogs.module.css'
import finDialogs from '../../finance-gateways/dialogs/FinanceDialogs.module.css'
import styles from './ModalityDialogs.module.css'
import type { ModalityMeta } from '../modalitiesModel'

/** Disabling always asks first and states, in plain words, what it does NOT do. */
export function DisableModalityDialog({
  modality,
  whitelabelName,
  statusLabel,
  onCancel,
  onConfirm,
  fallbackFocus,
}: {
  modality: ModalityMeta
  whitelabelName: string
  statusLabel: string
  onCancel: () => void
  onConfirm: () => void
  fallbackFocus: () => HTMLElement | null
}) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  return (
    <Dialog
      title={`Desabilitar ${modality.name}?`}
      description={`${whitelabelName} · estado atual: ${statusLabel}. Confirme a alteração local.`}
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
          <button type="button" className={finDialogs.dangerConfirm} onClick={onConfirm}>
            <PowerOff size={16} strokeWidth={1.9} aria-hidden="true" />
            Desabilitar modalidade
          </button>
        </>
      }
    >
      <div className={`${dialogStyles.callout} ${finDialogs.warningCallout}`}>
        <AlertTriangle size={15} strokeWidth={1.8} aria-hidden="true" />
        <ul className={styles.calloutList}>
          <li>
            <strong>Altera apenas o estado de configuração deste protótipo.</strong>
          </li>
          <li>O impacto operacional deve ser definido por Produto e Backend.</li>
          <li>Oportunidades, investimentos e pagamentos existentes não são alterados.</li>
          <li>Regras locais e vínculos com gateways são mantidos; nenhum efeito em cascata é simulado.</li>
        </ul>
      </div>
    </Dialog>
  )
}
