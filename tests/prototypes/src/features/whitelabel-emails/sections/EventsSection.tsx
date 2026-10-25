import { AlertTriangle, BadgeCheck, FileText, Info, KeyRound, Landmark, TrendingUp, UserPlus, type LucideIcon } from 'lucide-react'
import { IconTile } from '../../../components/ui/IconTile'
import { Switch } from '../../../components/ui/Switch'
import { SettingsSection } from '../../whitelabel-settings/SettingsSection'
import { useSectionEditor } from '../../whitelabel-settings/useSectionEditor'
import fields from '../../whitelabel-settings/sections/fields.module.css'
import {
  BACKEND_STATUS_META,
  CATEGORY_META,
  type EmailEventId,
  type EmailEventPreference,
  type EmailSectionKey,
} from '../emailModel'
import { addEmailActivity, updateWhitelabelEmailSettings } from '../emailStore'
import { OrbitBorderFrame } from '../visuals/OrbitBorderFrame'
import styles from './EmailSections.module.css'

const EVENT_ICON: Record<EmailEventId, LucideIcon> = {
  registrationCompleted: UserPlus,
  passwordRecovery: KeyRound,
  investmentEquity: TrendingUp,
  investmentDebt: Landmark,
  accountApproved: BadgeCheck,
  termsUpdated: FileText,
}

type Props = {
  whitelabelId: string
  whitelabelName: string
  saved: EmailEventPreference[]
  smtpConfigured: boolean
  onDirtyChange: (section: EmailSectionKey, dirty: boolean) => void
  notify: (message: string) => void
}

/**
 * Envios automáticos — when the platform sends each e-mail, for this
 * Whitelabel only. Switches edit a local draft; "Salvar alterações" applies it
 * to this prototype session. Equity and Debt confirmations are independent.
 */
export function EventsSection({ whitelabelId, whitelabelName, saved, smtpConfigured, onDirtyChange, notify }: Props) {
  const editor = useSectionEditor<EmailEventPreference[], EmailSectionKey>({
    section: 'events',
    label: 'Envios automáticos',
    saved,
    onDirtyChange,
    notify,
    alwaysEditing: true,
    onCommit: (draft) => {
      const changes = draft.filter((event) => saved.find((item) => item.id === event.id)?.enabled !== event.enabled)
      updateWhitelabelEmailSettings(whitelabelId, () => ({ eventPreferences: draft }))
      addEmailActivity(
        whitelabelId,
        changes.map((event) => ({
          kind: event.enabled ? 'event_enabled' : 'event_disabled',
          title: `Evento “${event.label}” ${event.enabled ? 'ativado' : 'desativado'} localmente`,
          detail: `Somente ${whitelabelName}.`,
        })),
      )
    },
  })

  const enabledCount = editor.draft.filter((event) => event.enabled).length

  function toggle(id: EmailEventId, enabled: boolean) {
    editor.update((draft) => draft.map((event) => (event.id === id ? { ...event, enabled } : event)))
  }

  return (
    <SettingsSection
      id="emails-events"
      title="Envios automáticos"
      subtitle={`Quando a plataforma envia cada e-mail automático. As escolhas valem somente para ${whitelabelName}.`}
      status="awaiting_integration"
      editor={editor}
      inlineEditing
      saveLabel="Salvar alterações"
    >
      <p className={styles.eventsMeta}>
        <span>
          {enabledCount} de {editor.draft.length} eventos ativados
        </span>
        <span className={styles.scopeTag}>Escopo: {whitelabelName}</span>
      </p>

      {!smtpConfigured ? (
        <p className={`${fields.note} ${styles.warningNote}`}>
          <AlertTriangle size={15} strokeWidth={1.8} aria-hidden="true" />
          <span>SMTP não configurado: mesmo com eventos ativados, nenhum e-mail seria enviado por este Whitelabel.</span>
        </p>
      ) : null}

      <div className={styles.eventHead} aria-hidden="true">
        <span>Evento</span>
        <span>Descrição</span>
        <span>Categoria</span>
        <span>Status</span>
      </div>
      <ul className={styles.eventList}>
        {editor.draft.map((event) => {
          const category = CATEGORY_META[event.category]
          const backend = BACKEND_STATUS_META[event.backendStatus]
          const changed = saved.find((item) => item.id === event.id)?.enabled !== event.enabled
          const nameId = `email-event-${event.id}-name`
          const descriptionId = `email-event-${event.id}-description`
          return (
            <li key={event.id} className={styles.eventItem}>
              <OrbitBorderFrame
                className={styles.eventRow}
                enabled={event.enabled}
                productRequirement={event.productRequirement}
                changed={changed}
              >
                <div className={styles.eventName}>
                  <IconTile icon={EVENT_ICON[event.id]} tone={category.tone} size="sm" />
                  <div className={styles.eventNameText}>
                    <p id={nameId} className={styles.eventLabel}>
                      {event.label}
                    </p>
                    <p className={styles.eventFlags}>
                      <span className={styles.flag} data-kind={event.productRequirement ? 'requirement' : 'illustrative'}>
                        {event.productRequirement ? 'Requisito de produto' : 'Evento ilustrativo'}
                      </span>
                      <span className={styles.backend} data-tone={backend.tone}>
                        {backend.label}
                      </span>
                    </p>
                  </div>
                </div>
                <p id={descriptionId} className={styles.eventDescription}>
                  {event.description}
                </p>
                <span className={styles.category} data-tone={category.tone}>
                  <span className="visually-hidden">Categoria: </span>
                  {category.label}
                </span>
                <div className={styles.eventControl}>
                  <Switch
                    id={`email-event-${event.id}-switch`}
                    checked={event.enabled}
                    onCheckedChange={(value) => toggle(event.id, value)}
                    disabled={editor.phase === 'saving'}
                    aria-labelledby={nameId}
                    aria-describedby={descriptionId}
                  />
                  <span className={styles.eventState} data-on={event.enabled || undefined} aria-hidden="true">
                    {event.enabled ? 'Ativado' : 'Desativado'}
                  </span>
                </div>
                {changed || (event.id === 'passwordRecovery' && !event.enabled) ? (
                  <div className={styles.eventNotes}>
                    {changed ? (
                      <span className={styles.changed}>
                        Alterado localmente
                        <span className="visually-hidden"> em {event.label}: salve para aplicar</span>
                      </span>
                    ) : null}
                    {event.id === 'passwordRecovery' && !event.enabled ? (
                      <span className={styles.risk}>
                        <AlertTriangle size={13} strokeWidth={2} aria-hidden="true" />
                        Sem este e-mail, os usuários não recebem o link para redefinir a senha.
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </OrbitBorderFrame>
            </li>
          )
        })}
      </ul>

      <p className={fields.note}>
        <Info size={15} strokeWidth={1.8} aria-hidden="true" />
        <span>
          Investimento em Equity e Investimento em Debt são configurados de forma independente (requisito de produto;
          Backend pendente de validação). Os demais eventos são conceitos ilustrativos, sem configuração confirmada no
          Backend. Os modelos de conteúdo ficam em Templates.
        </span>
      </p>
    </SettingsSection>
  )
}
