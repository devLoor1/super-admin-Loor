import { useRef } from 'react'
import { Info, Send } from 'lucide-react'
import { Dialog } from '../../../components/ui/Dialog'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import { PrimaryButton } from '../../../components/ui/PrimaryButton'
import dialogStyles from '../../whitelabel-settings/dialogs/SettingsDialogs.module.css'
import { SECURITY_LABEL, type SmtpSettings } from '../emailModel'
import styles from './TestEmailDialog.module.css'

/** Confirmation for the simulated test send. States clearly that nothing is sent. */
export function TestEmailDialog({
  to,
  smtp,
  onCancel,
  onConfirm,
}: {
  to: string
  smtp: SmtpSettings
  onCancel: () => void
  onConfirm: () => void
}) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  return (
    <Dialog
      title="Simular envio de teste"
      description="Confirme os dados do envio de teste deste protótipo."
      icon={Send}
      onClose={onCancel}
      initialFocusRef={cancelRef}
      footer={
        <>
          <OutlineButton ref={cancelRef} className={dialogStyles.footerButton} onClick={onCancel}>
            Cancelar
          </OutlineButton>
          <PrimaryButton className={dialogStyles.footerButton} onClick={onConfirm}>
            <Send size={16} strokeWidth={1.9} aria-hidden="true" />
            Simular envio
          </PrimaryButton>
        </>
      }
    >
      <dl className={styles.summary}>
        <div>
          <dt>Destino</dt>
          <dd>{to}</dd>
        </div>
        <div>
          <dt>Remetente</dt>
          <dd>
            {smtp.senderName} · {smtp.senderEmail}
          </dd>
        </div>
        <div>
          <dt>Servidor</dt>
          <dd>
            {smtp.host}:{smtp.port} · {SECURITY_LABEL[smtp.security]}
          </dd>
        </div>
      </dl>
      <p className={dialogStyles.callout}>
        <Info size={15} strokeWidth={1.8} aria-hidden="true" />
        <span>
          <strong>Nenhum e-mail real será enviado.</strong> O resultado é simulado localmente. O teste real de conexão,
          com resposta de erro segura e registro de auditoria, depende do Backend.
        </span>
      </p>
    </Dialog>
  )
}
