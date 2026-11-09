import { Copy, Info } from 'lucide-react'
import { StatusPill } from '../../../components/ui/StatusPill'
import { STATUS_META, type Whitelabel } from '../../whitelabels/prototypeWhitelabels'
import { SettingsSection } from '../SettingsSection'
import { formatDateTime } from '../settingsModel'
import styles from './fields.module.css'

/**
 * Geral — tenant identification, read-only. Lifecycle (status) and registry
 * fields are not edited here: there is no supported Whitelabel CRUD and tenant
 * lifecycle is not account pause.
 */
export function GeneralSection({
  whitelabel,
  lastLocalChange,
  onCopy,
}: {
  whitelabel: Whitelabel
  lastLocalChange: string | null
  onCopy: (value: string, what: string) => void
}) {
  const status = STATUS_META[whitelabel.status]
  const publicUrl = `https://${whitelabel.domain}`
  const rows: { label: string; value: string; copy?: string }[] = [
    { label: 'Nome do Whitelabel', value: whitelabel.name },
    { label: 'Slug', value: whitelabel.slug, copy: 'slug' },
    { label: 'Domínio', value: whitelabel.domain, copy: 'domínio' },
    { label: 'URL pública', value: publicUrl, copy: 'URL pública' },
    { label: 'ID (protótipo)', value: whitelabel.id, copy: 'ID' },
  ]

  return (
    <SettingsSection
      id="settings-general"
      title="Geral"
      subtitle="Identificação do Whitelabel e endereços públicos."
      status="readonly"
    >
      <dl className={styles.rows}>
        {rows.slice(0, 1).map((row) => (
          <Row key={row.label} {...row} onCopy={onCopy} strong />
        ))}
        <div className={styles.row}>
          <dt>Status</dt>
          <dd>
            <StatusPill tone={status.tone} label={status.label} />
            <span className={styles.empty}>Status ilustrativo</span>
          </dd>
        </div>
        {rows.slice(1).map((row) => (
          <Row key={row.label} {...row} onCopy={onCopy} />
        ))}
        <div className={styles.row}>
          <dt>Última alteração local</dt>
          <dd>
            {lastLocalChange ? (
              <span className={styles.value}>{formatDateTime(lastLocalChange)} · nesta sessão</span>
            ) : (
              <span className={styles.empty}>Nenhuma alteração nesta sessão</span>
            )}
          </dd>
        </div>
      </dl>
      <p className={styles.note}>
        <Info size={15} strokeWidth={1.8} aria-hidden="true" />
        <span>
          Identificação e ciclo de vida são consultados em{' '}
          <a className={styles.inlineLink} href="#/whitelabels">
            Whitelabels
          </a>
          . Esta tela não altera o status do Whitelabel.
        </span>
      </p>
    </SettingsSection>
  )
}

function Row({
  label,
  value,
  copy,
  strong = false,
  onCopy,
}: {
  label: string
  value: string
  copy?: string
  strong?: boolean
  onCopy: (value: string, what: string) => void
}) {
  return (
    <div className={styles.row}>
      <dt>{label}</dt>
      <dd>
        <span className={[styles.value, strong ? styles.valueStrong : ''].filter(Boolean).join(' ')}>{value}</span>
        {copy ? (
          <button type="button" className={styles.copy} onClick={() => onCopy(value, copy)} aria-label={`Copiar ${copy}`}>
            <Copy size={15} strokeWidth={1.8} aria-hidden="true" />
          </button>
        ) : null}
      </dd>
    </div>
  )
}
