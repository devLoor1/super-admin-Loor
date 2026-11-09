import { Mail, Settings2 } from 'lucide-react'
import outline from '../../../components/ui/OutlineButton.module.css'
import { useWhitelabelEmailSettings } from '../../whitelabel-emails/emailStore'
import { SettingsSection } from '../SettingsSection'
import styles from './SmtpSummary.module.css'

/**
 * Compact, read-only SMTP status. Configuration, the simulated test send and
 * automatic e-mails live in E-mails (`?section=smtp` focuses its SMTP card).
 * No credentials are shown here.
 */
export function SmtpSummary({ whitelabelId }: { whitelabelId: string }) {
  const smtp = useWhitelabelEmailSettings(whitelabelId)?.smtp
  const configured = smtp?.status === 'configured'
  return (
    <SettingsSection
      id="settings-smtp"
      title="E-mail (SMTP)"
      subtitle="Resumo do envio de e-mails transacionais deste Whitelabel."
      status={configured ? 'configured' : 'not_configured'}
      headerAction={
        <a className={`${outline.button} ${styles.manage}`} href={`#/whitelabels/${whitelabelId}/emails?section=smtp`}>
          <Settings2 size={15} strokeWidth={1.8} aria-hidden="true" />
          Gerenciar SMTP
        </a>
      }
    >
      <div className={styles.row}>
        <span className={styles.icon} aria-hidden="true">
          <Mail size={17} strokeWidth={1.7} />
        </span>
        <div className={styles.text}>
          <p className={styles.name}>
            {configured ? `Remetente: ${smtp.senderName} · ${smtp.senderEmail}` : 'Servidor de envio não configurado'}
          </p>
          <p className={styles.description}>
            Servidor, credenciais, envio de teste e e-mails automáticos são gerenciados em E-mails. A conexão real
            aguarda integração com o Backend.
          </p>
        </div>
      </div>
    </SettingsSection>
  )
}
