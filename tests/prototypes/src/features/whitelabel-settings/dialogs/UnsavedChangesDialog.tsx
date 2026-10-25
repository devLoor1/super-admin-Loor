import { useRef } from 'react'
import { AlertTriangle, CircleDot } from 'lucide-react'
import { Dialog } from '../../../components/ui/Dialog'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import styles from './SettingsDialogs.module.css'

/**
 * Lightweight confirmation before leaving the page or switching Whitelabel
 * with unsaved section edits. "Continuar editando" is the default focus.
 */
export function UnsavedChangesDialog({
  sections,
  destination,
  onStay,
  onDiscard,
}: {
  /** Labels of the sections holding unsaved edits. */
  sections: string[]
  /** What happens next, e.g. "trocar para Loor" or "sair desta página". */
  destination: string
  onStay: () => void
  onDiscard: () => void
}) {
  const stayRef = useRef<HTMLButtonElement>(null)
  return (
    <Dialog
      title="Descartar alterações não salvas?"
      description={`Ao ${destination}, as alterações locais abaixo serão descartadas.`}
      icon={AlertTriangle}
      tone="warning"
      onClose={onStay}
      initialFocusRef={stayRef}
      footer={
        <>
          <OutlineButton ref={stayRef} className={styles.footerButton} onClick={onStay}>
            Continuar editando
          </OutlineButton>
          <button type="button" className={styles.confirmWarning} onClick={onDiscard}>
            Descartar e continuar
          </button>
        </>
      }
    >
      <p className={styles.text}>Seções com alterações não salvas:</p>
      <ul className={styles.list}>
        {sections.map((section) => (
          <li key={section}>
            <CircleDot size={15} strokeWidth={2} aria-hidden="true" />
            {section}
          </li>
        ))}
      </ul>
      <p className={styles.text} style={{ marginTop: 12 }}>
        Cada seção é salva separadamente. Para manter as alterações, volte e use “Salvar” na seção.
      </p>
    </Dialog>
  )
}
