import { useRef } from 'react'
import { AlertTriangle, CircleDot } from 'lucide-react'
import { Dialog } from '../../../components/ui/Dialog'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import dialogStyles from '../../whitelabel-settings/dialogs/SettingsDialogs.module.css'

/**
 * Same confirmation language as the shared unsaved-changes dialog, worded for
 * a single form: lists the changed fields; "Continuar editando" is the default.
 */
export function DiscardChangesDialog({
  fields,
  destination,
  onStay,
  onDiscard,
}: {
  fields: string[]
  /** e.g. "cancelar", "sair desta página". */
  destination: string
  onStay: () => void
  onDiscard: () => void
}) {
  const stayRef = useRef<HTMLButtonElement>(null)
  return (
    <Dialog
      title="Descartar alterações não salvas?"
      description={`Ao ${destination}, os dados digitados neste formulário serão descartados. Nada foi salvo.`}
      icon={AlertTriangle}
      tone="warning"
      onClose={onStay}
      initialFocusRef={stayRef}
      footer={
        <>
          <OutlineButton ref={stayRef} className={dialogStyles.footerButton} onClick={onStay}>
            Continuar editando
          </OutlineButton>
          <button type="button" className={dialogStyles.confirmWarning} onClick={onDiscard}>
            Descartar e continuar
          </button>
        </>
      }
    >
      <p className={dialogStyles.text}>Campos alterados:</p>
      <ul className={dialogStyles.list}>
        {fields.map((field) => (
          <li key={field}>
            <CircleDot size={15} strokeWidth={2} aria-hidden="true" />
            {field}
          </li>
        ))}
      </ul>
    </Dialog>
  )
}
