import { Eye, FlaskConical } from 'lucide-react'
import { BusinessBadge } from '../../whitelabel-accounts/AccountBadges'
import shared from '../shared/Operation.module.css'
import type { CompanyRelationView } from './companyPresent'
import { PREVIEW_LABEL, type CompanyPreview } from './companyRoute'
import styles from './Companies.module.css'

/** "—" for a value the source does not provide (announced as "não informado"). */
export function NoData({ label = 'não informado' }: { label?: string }) {
  return (
    <>
      <span aria-hidden="true">—</span>
      <span className="visually-hidden">{label}</span>
    </>
  )
}

/** Subtle provenance line: every Company on screen is illustrative while the contract is pending. */
export function ProvenanceNotice({ detail = false }: { detail?: boolean }) {
  return (
    <p className={styles.provenance} data-company-provenance="prototype">
      <FlaskConical size={15} strokeWidth={1.8} aria-hidden="true" />
      <span>
        <strong>Dados ilustrativos — integração de Empresas pendente.</strong>{' '}
        {detail
          ? 'Esta empresa é fictícia: razão social, CNPJ e vínculos não vêm do Control Plane nem correspondem a empreendedores ou Whitelabels reais.'
          : 'Nenhuma empresa do Control Plane é consultada: razão social, CNPJ e vínculos abaixo são fictícios e não correspondem a empreendedores ou Whitelabels reais.'}
      </span>
    </p>
  )
}

/** Prototype-only state preview (`?previa=`), so read states can be reviewed with no request. */
export function PreviewNotice({ preview, exitHref }: { preview: CompanyPreview; exitHref: string }) {
  return (
    <p className={styles.preview} role="status" data-company-preview={preview}>
      <Eye size={15} strokeWidth={1.8} aria-hidden="true" />
      <span>
        Prévia de estado do protótipo: <strong>{PREVIEW_LABEL[preview]}</strong>. Nenhuma requisição é feita.{' '}
        <a href={exitHref} className={shared.inlineLink} data-exit-preview>
          Sair da prévia
        </a>
      </span>
    </p>
  )
}

/**
 * Entrepreneur / Whitelabel relationship value. Illustrative references are
 * plain text (never a link to a real profile, never requested); a future Core
 * id links only when the presenter built a safe internal href.
 */
export function RelationValue({ relation, kind }: { relation: CompanyRelationView; kind: 'entrepreneur' | 'whitelabel' }) {
  if (relation.kind === 'missing') return <NoData />
  const text = relation.kind === 'illustrative' ? relation.label : `${kind === 'entrepreneur' ? 'Empreendedor' : 'Whitelabel'} #${relation.id}`
  const content =
    relation.kind === 'core' && relation.href ? (
      <a href={relation.href} className={shared.inlineLink}>
        {text}
      </a>
    ) : (
      text
    )
  if (kind === 'entrepreneur') return <span data-relation={relation.kind}>{content}</span>
  return (
    <span className={styles.wlCell} data-relation={relation.kind}>
      <span className={shared.wlMark} data-tone="neutral" aria-hidden="true">
        {text.replace(/^Whitelabel\s+(Ilustrativo\s+)?/i, '').charAt(0).toLocaleUpperCase('pt-BR') || '·'}
      </span>
      <span>{content}</span>
    </span>
  )
}

/** Official status: raw future value with a neutral badge (vocabulary open); pending while absent. */
export function OfficialStatus({ status, compact = false }: { status: string | null; compact?: boolean }) {
  if (status === null) {
    return compact ? (
      <span className={styles.pendingText}>Aguardando integração</span>
    ) : (
      <BusinessBadge tone="neutral" label="Aguardando integração" />
    )
  }
  return (
    <span className={styles.valueStack}>
      <BusinessBadge tone="neutral" label={status} />
      {compact ? null : <span className={styles.valueNote}>Vocabulário de status ainda não definido pelo Backend</span>}
    </span>
  )
}
