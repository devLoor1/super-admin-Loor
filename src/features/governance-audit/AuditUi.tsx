import type { ReactNode } from 'react'
import { Globe, SearchX, UserX } from 'lucide-react'
import { AppShell } from '../../components/shell/AppShell'
import type { Breadcrumb } from '../../components/shell/TopHeader'
import { EmptyState } from '../../components/ui/EmptyState'
import { StatusPill } from '../../components/ui/StatusPill'
import { AccountAvatar } from '../whitelabel-accounts/AccountBadges'
import { DotMatrixBackground } from '../whitelabels/visuals/DotMatrixBackground'
import shared from '../operation/shared/Operation.module.css'
import { WhitelabelTag } from '../operation/shared/OperationUi'
import { initials } from '../operation/shared/operationModel'
import {
  AUDIT_MODULE_META,
  AUDIT_RESULT_META,
  actorById,
  type AuditModule,
  type AuditResult,
} from './auditModel'
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

export function AuditEventNotFound({ id }: { id: string }) {
  return (
    <AuditShell trail={['Não encontrado']}>
      <div className={shared.notFound}>
        <EmptyState
          icon={SearchX}
          title="Evento não encontrado"
          description={
            <>
              Nenhum evento de auditoria do protótipo usa o ID “{id}”.{' '}
              <a href={LIST_HREF} className={shared.inlineLink}>
                Voltar para Auditoria
              </a>
            </>
          }
        />
      </div>
    </AuditShell>
  )
}

export const ResultPill = ({ result }: { result: AuditResult }) => (
  <StatusPill tone={AUDIT_RESULT_META[result].tone} label={AUDIT_RESULT_META[result].label} />
)

/** Module chip: icon + text. */
export function ModuleTag({ module }: { module: AuditModule }) {
  const meta = AUDIT_MODULE_META[module]
  const Icon = meta.icon
  return (
    <span className={styles.moduleTag} data-module={module}>
      <Icon size={13} strokeWidth={1.9} aria-hidden="true" />
      {meta.label}
    </span>
  )
}

/** Module icon tile used in the event column and the detail header. */
export function ModuleIcon({ module, size = 'md' }: { module: AuditModule; size?: 'md' | 'lg' }) {
  const Icon = AUDIT_MODULE_META[module].icon
  return (
    <span className={styles.moduleIcon} data-module={module} data-size={size} aria-hidden="true">
      <Icon size={size === 'lg' ? 24 : 16} strokeWidth={1.7} />
    </span>
  )
}

export function ActorCell({ actorId }: { actorId: string | null }) {
  const actor = actorById(actorId)
  if (!actor) {
    return (
      <span className={shared.cellMain}>
        <span className={styles.anonymous} aria-hidden="true">
          <UserX size={14} strokeWidth={1.8} />
        </span>
        <span className={shared.cellText}>
          <span className={styles.actorName}>{actorId ? 'Ator não encontrado' : 'Não autenticado'}</span>
          <span className={shared.rowId}>{actorId ?? 'sem sessão'}</span>
        </span>
      </span>
    )
  }
  return (
    <span className={shared.cellMain}>
      <span className={styles.avatar}>
        <AccountAvatar initials={initials(actor.name)} />
      </span>
      <span className={shared.cellText}>
        <span className={styles.actorName}>{actor.name}</span>
        <span className={shared.rowId}>{actor.id}</span>
      </span>
    </span>
  )
}

/** Whitelabel tag, or "Global" for Control Plane events without a tenant. */
export function EventWhitelabel({ whitelabelId }: { whitelabelId: string | null }) {
  if (whitelabelId) return <WhitelabelTag whitelabelId={whitelabelId} />
  return (
    <span className={styles.globalTag}>
      <Globe size={14} strokeWidth={1.8} aria-hidden="true" />
      Global
    </span>
  )
}

/** "Com alterações" / "Sem alterações de campos" — text, not colour alone. */
export function ChangesTag({ changed }: { changed: boolean }) {
  return (
    <span className={styles.changesTag} data-changed={changed || undefined}>
      {changed ? 'Com alterações' : 'Sem alterações de campos'}
    </span>
  )
}
