import { FileStack, Settings2 } from 'lucide-react'
import { IconTile } from '../../../components/ui/IconTile'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import { SettingsSection } from '../../whitelabel-settings/SettingsSection'
import fields from '../../whitelabel-settings/sections/fields.module.css'
import { CATEGORY_META, EMAIL_EVENTS, type SmtpSettings, type TemplateSummary } from '../emailModel'
import styles from './EmailSections.module.css'

const CATEGORIES = [...new Set(EMAIL_EVENTS.map((event) => event.category))]

/**
 * Templates — what the automatic e-mails contain. Summary and entry point only
 * (no editor in V1, no counts). Visual identity stays in Config. do Whitelabel.
 */
export function TemplatesSummary({
  whitelabelId,
  summary,
  smtp,
  onManage,
}: {
  whitelabelId: string
  summary: TemplateSummary
  smtp: SmtpSettings
  onManage: () => void
}) {
  return (
    <SettingsSection
      id="emails-templates"
      title="Templates"
      subtitle="O que cada e-mail automático contém."
      status={summary.source === 'platform_default' ? 'default' : 'configured'}
    >
      <div className={styles.templateHero}>
        <IconTile icon={FileStack} tone="violet" size="md" />
        <div>
          <p className={styles.templateTitle}>Modelos padrão da plataforma</p>
          <p className={styles.templateText}>Usados pelos envios automáticos deste Whitelabel. Personalização em breve.</p>
        </div>
      </div>

      <dl className={fields.rows}>
        <div className={fields.row}>
          <dt>Eventos cobertos</dt>
          <dd>
            {CATEGORIES.map((category) => (
              <span key={category} className={styles.category} data-tone={CATEGORY_META[category].tone}>
                {CATEGORY_META[category].label}
              </span>
            ))}
          </dd>
        </div>
        <div className={fields.row}>
          <dt>Remetente aplicado</dt>
          <dd>
            {smtp.status === 'configured' ? (
              <span className={fields.value}>
                {smtp.senderName} · {smtp.senderEmail}
              </span>
            ) : (
              <span className={fields.empty}>Definido ao configurar o SMTP</span>
            )}
          </dd>
        </div>
        <div className={fields.row}>
          <dt>Identidade visual</dt>
          <dd>
            <span className={fields.value}>
              Definida em{' '}
              <a className={fields.inlineLink} href={`#/whitelabels/${whitelabelId}/settings`}>
                Config. do Whitelabel
              </a>
            </span>
          </dd>
        </div>
      </dl>

      <OutlineButton className={styles.manageTemplates} onClick={onManage}>
        <Settings2 size={15} strokeWidth={1.8} aria-hidden="true" />
        Gerenciar templates
      </OutlineButton>
    </SettingsSection>
  )
}
