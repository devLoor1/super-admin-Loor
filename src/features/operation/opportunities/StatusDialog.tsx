import { useRef, useState } from 'react'
import { Info, RefreshCw } from 'lucide-react'
import { Dialog } from '../../../components/ui/Dialog'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import { PrimaryButton } from '../../../components/ui/PrimaryButton'
import dialogStyles from '../../whitelabel-settings/dialogs/SettingsDialogs.module.css'
import { OPPORTUNITY_STATUSES, OPPORTUNITY_STATUS_META, type Opportunity, type OpportunityStatus } from './opportunityModel'
import styles from './Opportunities.module.css'

/**
 * Prototype status switch. Any of the three states can be chosen from any
 * other: no official transition graph exists and none is invented here.
 */
export function StatusDialog({
  opportunity,
  onCancel,
  onApply,
}: {
  opportunity: Opportunity
  onCancel: () => void
  onApply: (status: OpportunityStatus) => void
}) {
  const [value, setValue] = useState<OpportunityStatus>(opportunity.status)
  const currentRef = useRef<HTMLInputElement>(null)
  return (
    <Dialog
      title="Alterar status do protótipo"
      description={`“${opportunity.name}” · status atual: ${OPPORTUNITY_STATUS_META[opportunity.status].label}.`}
      icon={RefreshCw}
      onClose={onCancel}
      initialFocusRef={currentRef}
      footer={
        <>
          <OutlineButton className={dialogStyles.footerButton} onClick={onCancel}>
            Cancelar
          </OutlineButton>
          <PrimaryButton className={dialogStyles.footerButton} onClick={() => onApply(value)} data-apply-status>
            Aplicar status
          </PrimaryButton>
        </>
      }
    >
      <fieldset className={styles.fieldset} aria-describedby="opp-status-dialog-hint">
        <legend className={dialogStyles.label}>Novo status</legend>
        <div className={styles.statusChoices}>
          {OPPORTUNITY_STATUSES.map((key) => (
            <label key={key} className={styles.choice}>
              <input
                ref={key === opportunity.status ? currentRef : undefined}
                type="radio"
                name="opp-status-dialog"
                value={key}
                checked={value === key}
                onChange={() => setValue(key)}
              />
              {OPPORTUNITY_STATUS_META[key].label}
              {key === opportunity.status ? <span className={dialogStyles.required}>(atual)</span> : null}
            </label>
          ))}
        </div>
      </fieldset>
      <p id="opp-status-dialog-hint" className={dialogStyles.callout}>
        <Info size={15} strokeWidth={1.8} aria-hidden="true" />
        <span>
          Estados operacionais do protótipo — não representam o fluxo oficial (publicação, aprovação ou encerramento) e nenhuma
          transição é imposta. Nada é enviado ao Backend.
        </span>
      </p>
    </Dialog>
  )
}
