import { Mail, Settings2 } from 'lucide-react'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import { SettingsSection } from '../SettingsSection'
import { INTEGRATION_META, type IntegrationStatus } from '../settingsModel'
import styles from './SmtpSummary.module.css'

/**
 * Compact, read-only SMTP status with an entry point to its own management
 * flow (next prototype block). No credentials, provider or test send here.
 */
export function SmtpSummary({ status, onManage }: { status: IntegrationStatus; onManage: () => void }) {
  const meta = INTEGRATION_META[status]
  return (
    <SettingsSection
      id="settings-smtp"
      title="E-mail (SMTP)"
      subtitle="Resumo do envio de e-mails transacionais deste Whitelabel."
      status={status}
      headerAction={
        <OutlineButton className={styles.manage} onClick={onManage}>
          <Settings2 size={15} strokeWidth={1.8} aria-hidden="true" />
          Gerenciar SMTP
        </OutlineButton>
      }
    >
      <div className={styles.row}>
        <span className={styles.icon} aria-hidden="true">
          <Mail size={17} strokeWidth={1.7} />
        </span>
        <div className={styles.text}>
          <p className={styles.name}>Servidor de envio: {meta.label.toLowerCase()}</p>
          <p className={styles.description}>
            O status de SMTP deste Whitelabel ainda não está conectado ao protótipo. Credenciais, provedor e testes de
            envio ficam no gerenciamento de SMTP.
          </p>
        </div>
      </div>
    </SettingsSection>
  )
}
