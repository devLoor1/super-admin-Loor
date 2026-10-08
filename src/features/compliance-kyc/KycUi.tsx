import type { ReactNode } from 'react'
import { Briefcase, FileSearch, History, SearchX, UserRound } from 'lucide-react'
import { AppShell } from '../../components/shell/AppShell'
import type { Breadcrumb } from '../../components/shell/TopHeader'
import { EmptyState } from '../../components/ui/EmptyState'
import { StatusPill } from '../../components/ui/StatusPill'
import { AccountAvatar } from '../whitelabel-accounts/AccountBadges'
import { DotMatrixBackground } from '../whitelabels/visuals/DotMatrixBackground'
import fin from '../finance-gateways/sections/FinanceSections.module.css'
import { formatActivityTime } from '../operation/shared/operationActivity'
import shared from '../operation/shared/Operation.module.css'
import { initials } from '../operation/shared/operationModel'
import type { KycActivity } from './kycStore'
import {
  EVIDENCE_STATUS_META,
  KYC_STATUS_META,
  PARTICIPANT_TYPE_LABEL,
  PENDING_ISSUE_STATUS_META,
  type EvidenceStatus,
  type KycStatus,
  type ParticipantType,
  type PendingIssueStatus,
} from './kycModel'
import type { ResolvedParticipant } from './kycRefs'
import styles from './Kyc.module.css'

const LIST_HREF = '#/compliance/kyc'

/**
 * Compliance › KYC page frame: the approved App Shell (Compliance active, KYC
 * current) with the shared Dot Matrix behind the main content only.
 */
export function KycShell({ trail = [], children }: { trail?: string[]; children: ReactNode }) {
  const breadcrumbs: Breadcrumb[] = [
    { label: 'Compliance' },
    trail.length ? { label: 'KYC', href: LIST_HREF } : { label: 'KYC' },
    ...trail.map((label) => ({ label })),
  ]
  return (
    <AppShell activeNav="compliance" activeSubNav="compliance-kyc" title="KYC" location="Compliance" breadcrumbs={breadcrumbs}>
      <div className={shared.page}>
        <DotMatrixBackground />
        <div className={shared.layout}>{children}</div>
      </div>
    </AppShell>
  )
}

/** Unknown or malformed case id. */
export function KycCaseNotFound({ id }: { id: string }) {
  return (
    <KycShell trail={['Não encontrado']}>
      <div className={shared.notFound}>
        <EmptyState
          icon={SearchX}
          title="Caso KYC não encontrado"
          description={
            <>
              Nenhum caso KYC do protótipo usa o ID “{id}”.{' '}
              <a href={LIST_HREF} className={shared.inlineLink}>
                Voltar para KYC
              </a>
            </>
          }
        />
      </div>
    </KycShell>
  )
}

export const KycStatusPill = ({ status }: { status: KycStatus }) => (
  <StatusPill tone={KYC_STATUS_META[status].tone} label={KYC_STATUS_META[status].label} />
)

export const EvidenceStatusPill = ({ status }: { status: EvidenceStatus }) => (
  <StatusPill tone={EVIDENCE_STATUS_META[status].tone} label={EVIDENCE_STATUS_META[status].label} />
)

export const IssueStatusPill = ({ status }: { status: PendingIssueStatus }) => (
  <StatusPill tone={PENDING_ISSUE_STATUS_META[status].tone} label={PENDING_ISSUE_STATUS_META[status].label} />
)

/** Investidor / Empreendedor: icon + text. */
export function ParticipantTypeTag({ type }: { type: ParticipantType }) {
  const Icon = type === 'investor' ? UserRound : Briefcase
  return (
    <span className={styles.typeTag} data-type={type}>
      <Icon size={14} strokeWidth={1.9} aria-hidden="true" />
      {PARTICIPANT_TYPE_LABEL[type]}
    </span>
  )
}

/**
 * KYC "Atividade da sessão": local browser-session feedback for one case.
 * Explicitly distinct from Auditoria (canonical governance events): nothing
 * listed here is, or becomes, an Auditoria event.
 */
export function KycSessionActivityCard({ entries, auditHref }: { entries: KycActivity[]; auditHref: string }) {
  return (
    <section className={fin.card} aria-labelledby="kyc-activity-title">
      <h2 id="kyc-activity-title" className={fin.cardTitleSm}>
        Atividade da sessão
      </h2>
      <p className={fin.activityIntro}>
        Registro local desta sessão do navegador — some ao recarregar a página e nada é enviado ao Backend.{' '}
        <strong>Não é a Auditoria:</strong> as ações abaixo não geram eventos de governança.
      </p>
      {entries.length ? (
        <ol className={fin.activityList} data-kyc-activity>
          {entries.map((entry) => (
            <li key={entry.id} className={fin.activityItem}>
              <div>
                <p className={fin.activityTitle}>{entry.title}</p>
                {entry.detail ? <p className={fin.activityDetail}>{entry.detail}</p> : null}
              </div>
              <time className={fin.activityTime} dateTime={entry.at}>
                {formatActivityTime(entry.at)}
              </time>
            </li>
          ))}
        </ol>
      ) : (
        <p className={fin.activityEmpty}>
          <History size={15} strokeWidth={1.8} aria-hidden="true" />
          Nenhuma ação local registrada para este caso.
        </p>
      )}
      <p className={styles.auditPointer}>
        <FileSearch size={15} strokeWidth={1.8} aria-hidden="true" />
        <span>
          Eventos oficiais de governança ficam na{' '}
          <a href={auditHref} className={shared.inlineLink} data-activity-audit>
            Auditoria
          </a>{' '}
          (consulta somente leitura, eventos ilustrativos no protótipo).
        </span>
      </p>
    </section>
  )
}

/** Avatar + live name + participant id (read from Operation / Accounts, never copied). */
export function ParticipantCell({
  participant,
  participantId,
  href,
  meta,
}: {
  participant: ResolvedParticipant
  participantId: string
  href?: string
  meta?: ReactNode
}) {
  return (
    <span className={shared.cellMain}>
      <span className={styles.avatar}>
        <AccountAvatar initials={participant.found ? initials(participant.name) : '?'} />
      </span>
      <span className={shared.cellText}>
        {participant.found && href ? (
          <a href={href} className={styles.refLink}>
            {participant.name}
          </a>
        ) : (
          <span className={styles.refName}>{participant.name}</span>
        )}
        <span className={shared.rowId}>{participantId}</span>
        {meta}
      </span>
    </span>
  )
}
