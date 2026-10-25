import { Eye, FileText, Info, Send } from 'lucide-react'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import { PrimaryButton } from '../../../components/ui/PrimaryButton'
import { StatusPill } from '../../../components/ui/StatusPill'
import { SettingsSection } from '../SettingsSection'
import { formatDateTime, type TermsRevision, type TermsSettings } from '../settingsModel'
import fields from './fields.module.css'
import styles from './TermsSection.module.css'

type Props = {
  terms: TermsSettings
  onView: (revision: TermsRevision) => void
  onPublish: () => void
}

/**
 * Termos de Uso — the current revision, its history and a local publication
 * flow (dialog owned by the page). Current and previous revisions are
 * visually distinct; nothing here triggers a new acceptance.
 */
export function TermsSection({ terms, onView, onPublish }: Props) {
  const { current, history } = terms

  return (
    <SettingsSection
      id="settings-terms"
      title="Termos de Uso"
      subtitle="Revisão vigente e histórico de publicações deste Whitelabel."
      status={current ? 'published' : 'not_configured'}
    >
      {current ? (
        <div className={styles.layout}>
          <article className={styles.current} aria-labelledby="terms-current-title">
            <header className={styles.currentHeader}>
              <span className={styles.icon} aria-hidden="true">
                <FileText size={18} strokeWidth={1.7} />
              </span>
              <div className={styles.currentHeading}>
                <p className={styles.eyebrow}>
                  Revisão {current.revision}
                  <StatusPill tone="success" label="Vigente" />
                  {current.local ? <span className={styles.localTag}>Publicada nesta sessão</span> : null}
                </p>
                <h3 id="terms-current-title" className={styles.currentTitle}>
                  {current.title}
                </h3>
              </div>
            </header>
            <dl className={fields.rows}>
              <div className={fields.row}>
                <dt>Status</dt>
                <dd>
                  <span className={fields.value}>Publicado</span>
                </dd>
              </div>
              <div className={fields.row}>
                <dt>Publicada em</dt>
                <dd>
                  <span className={fields.value}>{formatDateTime(current.publishedAt)}</span>
                </dd>
              </div>
            </dl>
            <p className={styles.preview}>{current.content.replace(/\s*\n+\s*/g, ' ')}</p>
            <div className={styles.actions}>
              <OutlineButton className={styles.button} onClick={() => onView(current)} data-terms-view-current>
                <Eye size={15} strokeWidth={1.8} aria-hidden="true" />
                Ver revisão vigente
              </OutlineButton>
              <PrimaryButton className={styles.button} onClick={onPublish} data-terms-publish>
                <Send size={15} strokeWidth={1.9} aria-hidden="true" />
                Publicar nova revisão
              </PrimaryButton>
            </div>
          </article>

          <div className={styles.history}>
            <h3 className={styles.historyTitle} id="terms-history-title">
              Histórico de revisões
            </h3>
            {history.length ? (
              <ol className={styles.historyList} aria-labelledby="terms-history-title">
                {history.map((revision) => (
                  <li key={revision.id} className={styles.historyItem}>
                    <div className={styles.historyText}>
                      <p className={styles.historyName}>
                        Revisão {revision.revision}
                        <StatusPill tone="muted" label="Substituída" />
                      </p>
                      <p className={styles.historyMeta}>
                        Publicada em {formatDateTime(revision.publishedAt)}
                        {revision.local ? ' · nesta sessão' : ''}
                      </p>
                    </div>
                    <button type="button" className={fields.textButton} onClick={() => onView(revision)}>
                      <Eye size={14} strokeWidth={1.8} aria-hidden="true" />
                      Ver<span className="visually-hidden"> revisão {revision.revision}</span>
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <p className={fields.empty}>Nenhuma revisão anterior.</p>
            )}
          </div>
        </div>
      ) : (
        <div className={styles.empty}>
          <span className={styles.icon} aria-hidden="true">
            <FileText size={18} strokeWidth={1.7} />
          </span>
          <div>
            <p className={styles.emptyTitle}>Nenhuma revisão publicada</p>
            <p className={styles.emptyText}>Este Whitelabel ainda não tem Termos de Uso publicados neste protótipo.</p>
          </div>
          <PrimaryButton className={styles.button} onClick={onPublish} data-terms-publish>
            <Send size={15} strokeWidth={1.9} aria-hidden="true" />
            Publicar primeira revisão
          </PrimaryButton>
        </div>
      )}

      <p className={fields.note}>
        <Info size={15} strokeWidth={1.8} aria-hidden="true" />
        <span>
          Publicar torna a nova revisão vigente imediatamente. Este protótipo não solicita novo aceite aos usuários
          existentes; essa regra depende de definição de produto.
        </span>
      </p>
    </SettingsSection>
  )
}
