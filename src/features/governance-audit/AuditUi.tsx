import type { ReactNode } from 'react'
import { FileSearch, Globe, UserX } from 'lucide-react'
import { AppShell } from '../../components/shell/AppShell'
import type { Breadcrumb } from '../../components/shell/TopHeader'
import { StatusPill } from '../../components/ui/StatusPill'
import { AccountAvatar } from '../whitelabel-accounts/AccountBadges'
import { DotMatrixBackground } from '../whitelabels/visuals/DotMatrixBackground'
import shared from '../operation/shared/Operation.module.css'
import { initials } from '../operation/shared/operationModel'
import type { AuditRecord } from './auditApi'
import { actorName, resultMeta } from './auditPresent'
import styles from './Audit.module.css'

const LIST_HREF = '#/audit'

/**
 * Auditoria page frame: the approved App Shell (Auditoria active as its own
 * top-level destination) with the shared Dot Matrix behind the main content.
 */
export function AuditShell({ trail = [], children }: { trail?: string[]; children: ReactNode }) {
  const breadcrumbs: Breadcrumb[] = [
    trail.length ? { label: 'Auditoria', href: LIST_HREF } : { label: 'Auditoria' },
    ...trail.map((label) => ({ label })),
  ]
  return (
    <AppShell activeNav="auditoria" title="Auditoria" location="Auditoria" breadcrumbs={breadcrumbs}>
      <div className={shared.page}>
        <DotMatrixBackground />
        <div className={shared.layout}>{children}</div>
      </div>
    </AppShell>
  )
}

/** Result token → label + tone (unknown tokens shown as sent, neutral). Text, never colour alone. */
export function ResultPill({ result }: { result: string | null }) {
  const meta = resultMeta(result)
  return <span className={styles.result}><StatusPill tone={meta.tone} label={meta.label} /></span>
}

/** Neutral event icon: the contract has no module, so none is inferred. */
export function EventIcon({ size = 'md' }: { size?: 'md' | 'lg' }) {
  return (
    <span className={styles.moduleIcon} data-module="sistema" data-size={size} aria-hidden="true">
      <FileSearch size={size === 'lg' ? 24 : 16} strokeWidth={1.7} />
    </span>
  )
}

/** Recorded operator (name + Control Plane id), or "Não identificado" when the event has none. */
export function ActorCell({ record }: { record: Pick<AuditRecord, 'actorId' | 'actor'> }) {
  if (!record.actorId) {
    return (
      <span className={shared.cellMain}>
        <span className={styles.anonymous} aria-hidden="true">
          <UserX size={14} strokeWidth={1.8} />
        </span>
        <span className={shared.cellText}>
          <span className={styles.actorName}>Não identificado</span>
          <span className={shared.rowId}>sem operador no evento</span>
        </span>
      </span>
    )
  }
  const name = actorName(record)
  return (
    <span className={shared.cellMain}>
      <span className={styles.avatar}>
        <AccountAvatar initials={record.actor?.name ? initials(record.actor.name) : '?'} />
      </span>
      <span className={shared.cellText}>
        <span className={styles.actorName}>{name}</span>
        <span className={shared.rowId}>ID {record.actorId}</span>
      </span>
    </span>
  )
}

/** Recorded tenant id, or "Sem Whitelabel" when the event is not tied to one. Names are never guessed. */
export function EventWhitelabel({ whitelabelId }: { whitelabelId: string | null }) {
  if (whitelabelId) return <span className={styles.code}>Whitelabel ID {whitelabelId}</span>
  return (
    <span className={styles.globalTag}>
      <Globe size={14} strokeWidth={1.8} aria-hidden="true" />
      Sem Whitelabel
    </span>
  )
}
