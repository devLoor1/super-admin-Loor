import { History, Send, Settings2, ToggleLeft, ToggleRight, type LucideIcon } from 'lucide-react'
import { SettingsSection } from '../../whitelabel-settings/SettingsSection'
import { formatTime, type EmailActivity, type EmailActivityKind } from '../emailModel'
import styles from './EmailSections.module.css'

const ICON: Record<EmailActivityKind, LucideIcon> = {
  smtp: Settings2,
  test: Send,
  event_enabled: ToggleRight,
  event_disabled: ToggleLeft,
}

const VISIBLE = 6

/**
 * Local feedback of this session's prototype actions (newest first). Not an
 * audit trail and never contains secrets; it is lost on reload.
 */
export function SessionActivity({ entries }: { entries: EmailActivity[] }) {
  const visible = entries.slice(0, VISIBLE)
  return (
    <SettingsSection
      id="emails-activity"
      title="Atividade nesta sessão"
      subtitle="Ações locais deste protótipo. Não é um histórico de auditoria."
    >
      {visible.length ? (
        <ol className={styles.activityList}>
          {visible.map((entry) => {
            const Icon = ICON[entry.kind]
            return (
              <li key={entry.id} className={styles.activityItem}>
                <span className={styles.activityIcon} aria-hidden="true">
                  <Icon size={16} strokeWidth={1.8} />
                </span>
                <div className={styles.activityText}>
                  <p className={styles.activityTitle}>{entry.title}</p>
                  {entry.detail ? <p className={styles.activityDetail}>{entry.detail}</p> : null}
                </div>
                <time className={styles.activityTime} dateTime={entry.at}>
                  {formatTime(entry.at)}
                </time>
              </li>
            )
          })}
        </ol>
      ) : (
        <div className={styles.activityEmpty}>
          <History size={18} strokeWidth={1.7} aria-hidden="true" />
          <p>Nenhuma ação nesta sessão. Salvar o SMTP, simular um teste ou alterar eventos aparece aqui.</p>
        </div>
      )}
      {entries.length > VISIBLE ? (
        <p className={styles.activityMore}>e mais {entries.length - VISIBLE} ações nesta sessão</p>
      ) : null}
    </SettingsSection>
  )
}
