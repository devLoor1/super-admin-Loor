import { useEffect, useState } from 'react'
import { Briefcase, CircleCheck, CircleX, ExternalLink, FileSearch, FileText, Info, ListPlus, RotateCcw, UserRound } from 'lucide-react'
import { usePrototypeNotice } from '../../components/shell/prototypeNotice'
import { OutlineButton } from '../../components/ui/OutlineButton'
import outline from '../../components/ui/OutlineButton.module.css'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { Tabs } from '../../components/ui/Tabs'
import fin from '../finance-gateways/sections/FinanceSections.module.css'
import { DetailHero, KeyValueList, TabPanel } from '../finance-core/shared/FinanceCoreUi'
import fc from '../finance-core/shared/FinanceCore.module.css'
import { BackLink, DomainNavCard, InfoNote, WhitelabelTag, type DomainNavItem } from '../operation/shared/OperationUi'
import { initials } from '../operation/shared/operationModel'
import shared from '../operation/shared/Operation.module.css'
import {
  EVIDENCE_CATEGORY_LABEL,
  KYC_STATUS_META,
  PARTICIPANT_TYPE_LABEL,
  openIssueCount,
  type KycCase,
  type KycDecisionStatus,
  type KycEvidence,
  type KycPendingIssue,
} from './kycModel'
import {
  auditHrefForCase,
  kycDateText,
  localActorLabel,
  participantAccountHref,
  participantProfileHref,
  resolveParticipant,
} from './kycRefs'
import {
  addKycActivity,
  addPendingIssue,
  recordDecision,
  reopenPendingIssue,
  resolvePendingIssue,
  reviewEvidence,
  useKycActivity,
  useKycCases,
} from './kycStore'
import { AddIssueDialog, DecisionDialog, IssueStatusDialog, ReviewEvidenceDialog } from './KycDialogs'
import {
  EvidenceStatusPill,
  IssueStatusPill,
  KycCaseNotFound,
  KycSessionActivityCard,
  KycShell,
  KycStatusPill,
  ParticipantTypeTag,
} from './KycUi'
import styles from './Kyc.module.css'

type Tab = 'overview' | 'evidence' | 'decision' | 'activity'
const TAB_PREFIX = 'kyc-detail'

type DialogState =
  | { kind: 'review'; evidence: KycEvidence }
  | { kind: 'add-issue' }
  | { kind: 'issue'; issue: KycPendingIssue; mode: 'resolve' | 'reopen' }
  | { kind: 'decision'; decision: KycDecisionStatus }
  | null

/** `#/compliance/kyc/:kycCaseId` — one KYC case (prototype). */
export function KycDetailPage({ kycCaseId }: { kycCaseId: string }) {
  const item = useKycCases().find((entry) => entry.kycCaseId === kycCaseId)
  if (!item) return <KycCaseNotFound id={kycCaseId} />
  return (
    <KycShell trail={[item.kycCaseId]}>
      <KycCaseContent item={item} />
    </KycShell>
  )
}

function KycCaseContent({ item }: { item: KycCase }) {
  const notify = usePrototypeNotice()
  const activity = useKycActivity(item.kycCaseId)
  const [tab, setTab] = useState<Tab>('overview')
  const [dialog, setDialog] = useState<DialogState>(null)
  const id = item.kycCaseId
  const person = resolveParticipant(item)
  const isInvestor = item.participantType === 'investor'
  const profileLabel = isInvestor ? 'Ver investidor' : 'Ver empreendedor'
  const profileHref = participantProfileHref(item.participantType, item.participantId)
  const accountHref = participantAccountHref(item)
  const auditHref = auditHrefForCase(id)
  const openIssues = openIssueCount(item)
  const unreviewed = item.evidences.filter((evidence) => evidence.status !== 'reviewed').length
  const statusMeta = KYC_STATUS_META[item.status]

  const log = (title: string, detail?: string) => addKycActivity(id, { title, detail })

  useEffect(() => {
    addKycActivity(id, { title: 'Caso consultado', detail: 'Visão de compliance do protótipo' })
  }, [id])

  function changeTab(next: Tab) {
    setTab(next)
    if (next === 'evidence') log('Evidências e pendências consultadas', `${item.evidences.length} evidência(s) · ${openIssues} pendência(s) aberta(s)`)
    if (next === 'decision') log('Decisão consultada', `Status atual: ${statusMeta.label}`)
  }

  const onAccount = () => log('Navegação para Contas solicitada', `Contas do Whitelabel (${isInvestor ? 'Investidores' : 'Empreendedores'})`)
  const onProfile = () => log(`Navegação para Operação › ${isInvestor ? 'Investidores' : 'Empreendedores'} solicitada`, item.participantId)
  const onAudit = () => log('Navegação para Auditoria solicitada', 'Consulta filtrada por este caso — nenhum evento é criado')
  const missingProfile = () => {
    log('Participante sem destino', `${item.participantId} não encontrado — nenhuma navegação feita`)
    notify(`O participante “${item.participantId}” não foi encontrado no protótipo. Nenhuma navegação foi feita.`)
  }

  /* ---------- Local actions ---------- */

  function confirmReview(evidence: KycEvidence) {
    setDialog(null)
    if (reviewEvidence(id, evidence.evidenceId)) {
      log(`Evidência ${evidence.evidenceId} marcada como revisada`, 'Registro local — nenhum documento real analisado')
      notify(`Evidência ${evidence.evidenceId} marcada como revisada (registro local da sessão).`)
    }
  }

  function confirmAddIssue(description: string) {
    setDialog(null)
    const created = addPendingIssue(id, description)
    if (created) {
      log(`Pendência ${created} adicionada`, 'Registro local da sessão')
      notify(`Pendência ${created} adicionada (registro local da sessão).`)
    }
  }

  function confirmIssue(issue: KycPendingIssue, mode: 'resolve' | 'reopen') {
    setDialog(null)
    const changed = mode === 'resolve' ? resolvePendingIssue(id, issue.pendingIssueId) : reopenPendingIssue(id, issue.pendingIssueId)
    if (changed) {
      const verb = mode === 'resolve' ? 'resolvida' : 'reaberta'
      log(`Pendência ${issue.pendingIssueId} ${verb}`, 'Registro local da sessão')
      notify(`Pendência ${issue.pendingIssueId} ${verb} (registro local da sessão).`)
    }
  }

  function requestDecision(decision: KycDecisionStatus) {
    if (item.status === decision) {
      notify(`O status atual já é ${KYC_STATUS_META[decision].label}. Nenhum registro foi feito.`)
      return
    }
    setDialog({ kind: 'decision', decision })
  }

  function confirmDecision(decision: KycDecisionStatus, note: string) {
    setDialog(null)
    if (recordDecision(id, decision, note, localActorLabel())) {
      const label = decision === 'approved' ? 'Aprovação' : 'Reprovação'
      log(`${label} registrada localmente`, `${statusMeta.label} → ${KYC_STATUS_META[decision].label} · sem efeito em conta, acesso ou finanças`)
      notify(`${label} registrada neste caso (registro local da sessão). Nenhum outro módulo foi alterado e nenhum evento de Auditoria foi criado.`)
    }
  }

  const navItems: DomainNavItem[] = [
    {
      key: 'account',
      label: 'Ver conta',
      description: `Contas do Whitelabel (${isInvestor ? 'Investidores' : 'Empreendedores'}) — acesso e dados da conta`,
      icon: UserRound,
      href: accountHref,
      onSelect: onAccount,
    },
    person.found
      ? {
          key: 'profile',
          label: profileLabel,
          description: `Operação › ${isInvestor ? 'Investidores' : 'Empreendedores'} — perfil operacional`,
          icon: isInvestor ? UserRound : Briefcase,
          href: profileHref,
          onSelect: onProfile,
        }
      : { key: 'profile', label: profileLabel, description: 'Participante não encontrado no protótipo', icon: UserRound, onSelect: missingProfile },
    {
      key: 'audit',
      label: 'Ver na Auditoria',
      description: 'Eventos de governança deste caso (somente leitura)',
      icon: FileSearch,
      href: auditHref,
      onSelect: onAudit,
    },
  ]

  const tabs: { value: Tab; label: string }[] = [
    { value: 'overview', label: 'Visão geral' },
    { value: 'evidence', label: 'Evidências e pendências' },
    { value: 'decision', label: 'Decisão' },
    { value: 'activity', label: 'Atividade da sessão' },
  ]

  const evidenceSummary = (['reviewed', 'received', 'pending'] as const)
    .map((status) => {
      const total = item.evidences.filter((evidence) => evidence.status === status).length
      const label = { reviewed: 'revisada', received: 'recebida', pending: 'pendente' }[status]
      return total ? `${total} ${label}${total === 1 ? '' : 's'}` : null
    })
    .filter(Boolean)
    .join(' · ')

  return (
    <>
      <div>
        <BackLink href="#/compliance/kyc" label="Voltar para KYC" />
      </div>

      <DetailHero
        monogram={person.found ? initials(person.name) : '?'}
        title={`Caso KYC ${id}`}
        status={<KycStatusPill status={item.status} />}
        meta={[
          { label: 'Tipo', value: <ParticipantTypeTag type={item.participantType} /> },
          { label: 'Participante', value: person.name },
          { label: 'Whitelabel', value: <WhitelabelTag whitelabelId={item.whitelabelId} /> },
        ]}
        actions={
          <>
            <a href={accountHref} className={`${outline.button} ${shared.secondaryButton}`} onClick={onAccount} data-hero-account>
              Ver conta
              <ExternalLink size={15} strokeWidth={1.8} aria-hidden="true" />
            </a>
            {person.found ? (
              <a href={profileHref} className={`${outline.button} ${shared.secondaryButton}`} onClick={onProfile} data-hero-profile>
                {profileLabel}
                <ExternalLink size={15} strokeWidth={1.8} aria-hidden="true" />
              </a>
            ) : (
              <OutlineButton className={shared.secondaryButton} onClick={missingProfile} data-hero-profile>
                {profileLabel}
              </OutlineButton>
            )}
          </>
        }
      />

      <div className={`${fin.card} ${shared.tabsCard}`}>
        <Tabs idPrefix={TAB_PREFIX} label={`Seções do caso KYC ${id}`} tabs={tabs} value={tab} onChange={changeTab} />
      </div>

      <TabPanel prefix={TAB_PREFIX} tab="overview" current={tab}>
        <div className={shared.panelGrid}>
          <section className={fin.card} aria-labelledby="kyc-info-title">
            <h2 id="kyc-info-title" className={fin.cardTitleSm}>
              Informações principais
            </h2>
            <KeyValueList
              rows={[
                { label: 'ID do caso', value: id },
                { label: 'Participante', value: person.name },
                { label: 'E-mail', value: person.email },
                { label: 'ID do participante', value: item.participantId },
                { label: 'Tipo', value: PARTICIPANT_TYPE_LABEL[item.participantType] },
                ...(person.company !== null ? [{ label: 'Empresa', value: person.company || '—' }] : []),
                {
                  label: 'Conta relacionada',
                  value: (
                    <>
                      {item.accountId}
                      {person.accessLabel ? <span className={shared.muted}>· {person.accessLabel}</span> : null}
                    </>
                  ),
                },
                { label: 'Whitelabel', value: <WhitelabelTag whitelabelId={item.whitelabelId} /> },
                { label: 'Status KYC', value: <KycStatusPill status={item.status} /> },
                { label: 'Pendências abertas', value: String(openIssues) },
                { label: 'Evidências', value: `${item.evidences.length}${evidenceSummary ? ` (${evidenceSummary})` : ''}` },
                { label: 'Criado em', value: kycDateText(item.createdAt) },
                { label: 'Atualizado em', value: kycDateText(item.updatedAt) },
              ]}
            />
          </section>
          <DomainNavCard
            title="Navegação para domínios responsáveis"
            intro="Este módulo centraliza a revisão de compliance; conta, perfil do participante e auditoria ficam em módulos próprios."
            items={navItems}
          />
        </div>
        <InfoNote>
          <strong>KYC V1 é um módulo de supervisão de compliance.</strong> Os estados e as decisões deste protótipo são ilustrativos e
          locais: não alteram conta, acesso ou operações reais e não geram eventos na Auditoria.
        </InfoNote>
      </TabPanel>

      <TabPanel prefix={TAB_PREFIX} tab="evidence" current={tab}>
        <div className={styles.evidenceGrid}>
          <EvidenceCard item={item} onReview={(evidence) => setDialog({ kind: 'review', evidence })} />
          <IssuesCard
            item={item}
            onAdd={() => setDialog({ kind: 'add-issue' })}
            onIssue={(issue, mode) => setDialog({ kind: 'issue', issue, mode })}
          />
        </div>
        <InfoNote>
          Evidências são <strong>metadados ilustrativos</strong>: não há arquivos, upload, câmera, OCR, biometria nem conteúdo de documentos
          no protótipo. Revisões e pendências são registros locais desta sessão.
        </InfoNote>
      </TabPanel>

      <TabPanel prefix={TAB_PREFIX} tab="decision" current={tab}>
        <div className={shared.panelGrid}>
          <section className={fin.card} aria-labelledby="kyc-decision-title">
            <h2 id="kyc-decision-title" className={fin.cardTitleSm}>
              Decisão do protótipo
            </h2>
            <p className={fin.cardSubtitle}>Registro ilustrativo — não é a decisão oficial de compliance.</p>
            <KeyValueList
              rows={[
                { label: 'Status atual', value: <KycStatusPill status={item.status} /> },
                {
                  label: 'Decisão registrada',
                  value: item.decision ? (item.decision.status === 'approved' ? 'Aprovação' : 'Reprovação') : 'Nenhuma decisão registrada',
                },
                { label: 'Observação', value: item.decision?.note ?? '—' },
                { label: 'Registrada em', value: kycDateText(item.decision?.decidedAt) },
                { label: 'Registrada por', value: item.decision?.decidedBy ?? '—' },
                {
                  label: 'Origem do registro',
                  value: item.decision ? (item.decision.origin === 'session' ? 'Registro local desta sessão' : 'Dado ilustrativo do protótipo') : '—',
                },
              ]}
            />
            <div className={styles.decisionActions}>
              <PrimaryButton
                className={styles.decisionButton}
                onClick={() => requestDecision('approved')}
                aria-disabled={item.status === 'approved' || undefined}
                aria-describedby="kyc-decision-hint"
                data-decision="approved"
              >
                <CircleCheck size={16} strokeWidth={1.9} aria-hidden="true" />
                Registrar aprovação
              </PrimaryButton>
              <button
                type="button"
                className={`${outline.button} ${fin.dangerButton} ${styles.decisionButton}`}
                onClick={() => requestDecision('rejected')}
                aria-disabled={item.status === 'rejected' || undefined}
                aria-describedby="kyc-decision-hint"
                data-decision="rejected"
              >
                <CircleX size={16} strokeWidth={1.9} aria-hidden="true" />
                Registrar reprovação
              </button>
            </div>
            <p id="kyc-decision-hint" className={styles.decisionHint}>
              {item.status === 'approved' || item.status === 'rejected'
                ? `O status atual já é ${statusMeta.label}; só a decisão oposta pode ser registrada.`
                : 'Não existe fluxo oficial de transições: qualquer decisão pode ser registrada localmente.'}
            </p>
          </section>
          <section className={fin.card} aria-labelledby="kyc-decision-context">
            <h2 id="kyc-decision-context" className={fin.cardTitleSm}>
              Contexto e efeitos
            </h2>
            <dl className={shared.statList}>
              <div className={shared.statRow}>
                <dt>Pendências abertas</dt>
                <dd>{openIssues}</dd>
              </div>
              <div className={shared.statRow}>
                <dt>Evidências não revisadas</dt>
                <dd>{unreviewed}</dd>
              </div>
            </dl>
            <p className={`${shared.callout} ${styles.calloutSpaced}`}>
              <Info size={15} strokeWidth={1.8} aria-hidden="true" />
              <span>
                Registrar aprovação ou reprovação altera <strong>somente</strong> o status e a decisão deste caso nesta sessão do
                navegador. Não pausa nem ativa contas, não bloqueia acesso, não altera investidores, empreendedores, investimentos,
                oportunidades, pagamentos ou wallets e <strong>não cria evento na Auditoria</strong>.
              </span>
            </p>
            <p className={`${shared.callout} ${styles.calloutSpaced}`}>
              <Info size={15} strokeWidth={1.8} aria-hidden="true" />
              <span>
                A regra oficial (quem decide, com quais pendências e com qual trilha) depende de Produto e Backend; o autor exibido para
                registros locais não é uma identidade autenticada.
              </span>
            </p>
          </section>
        </div>
      </TabPanel>

      <TabPanel prefix={TAB_PREFIX} tab="activity" current={tab}>
        <KycSessionActivityCard entries={activity} auditHref={auditHref} />
      </TabPanel>

      {dialog?.kind === 'review' ? (
        <ReviewEvidenceDialog
          evidence={dialog.evidence}
          onCancel={() => setDialog(null)}
          onConfirm={() => confirmReview(dialog.evidence)}
          fallbackFocus={() => document.querySelector<HTMLElement>(`[data-evidence-label="${dialog.evidence.evidenceId}"]`)}
        />
      ) : null}
      {dialog?.kind === 'add-issue' ? <AddIssueDialog onCancel={() => setDialog(null)} onAdd={confirmAddIssue} /> : null}
      {dialog?.kind === 'issue' ? (
        <IssueStatusDialog
          issue={dialog.issue}
          mode={dialog.mode}
          onCancel={() => setDialog(null)}
          onConfirm={() => confirmIssue(dialog.issue, dialog.mode)}
        />
      ) : null}
      {dialog?.kind === 'decision' ? (
        <DecisionDialog
          decision={dialog.decision}
          currentStatus={item.status}
          openIssues={openIssues}
          unreviewedEvidences={unreviewed}
          onCancel={() => setDialog(null)}
          onConfirm={(note) => confirmDecision(dialog.decision, note)}
        />
      ) : null}
    </>
  )
}

function EvidenceCard({ item, onReview }: { item: KycCase; onReview: (evidence: KycEvidence) => void }) {
  return (
    <section className={fin.card} aria-labelledby="kyc-evidence-title">
      <h2 id="kyc-evidence-title" className={fin.cardTitleSm}>
        Evidências e documentos
      </h2>
      <p className={fin.cardSubtitle}>Metadados ilustrativos — sem arquivo, imagem ou conteúdo.</p>
      {item.evidences.length ? (
        <ul className={styles.evidenceList} data-evidence-list>
          {item.evidences.map((evidence) => (
            <li key={evidence.evidenceId} className={styles.evidenceRow} data-evidence={evidence.evidenceId} data-status={evidence.status}>
              <span className={styles.evidenceIcon} aria-hidden="true">
                <FileText size={17} strokeWidth={1.7} />
              </span>
              <div className={styles.evidenceMain}>
                <span className={styles.evidenceLabel} tabIndex={-1} data-evidence-label={evidence.evidenceId}>
                  {evidence.label}
                </span>
                <span className={shared.rowId}>
                  {evidence.evidenceId} · {EVIDENCE_CATEGORY_LABEL[evidence.category]}
                </span>
                <span className={styles.evidenceMeta}>
                  Referência segura: <span className={styles.mono}>{evidence.safeReference}</span>
                </span>
                <span className={styles.evidenceMeta}>
                  Enviada: {kycDateText(evidence.submittedAt)} · Revisada: {kycDateText(evidence.reviewedAt)}
                  {evidence.reviewedLocally ? ' (local)' : ''}
                </span>
              </div>
              <div className={styles.evidenceSide}>
                <EvidenceStatusPill status={evidence.status} />
                {evidence.status === 'received' ? (
                  <OutlineButton className={styles.smallButton} onClick={() => onReview(evidence)} data-review-evidence={evidence.evidenceId}>
                    Marcar como revisada
                  </OutlineButton>
                ) : evidence.status === 'pending' ? (
                  <span className={styles.sideNote}>Aguardando envio</span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className={fc.emptyLine}>
          <Info size={15} strokeWidth={1.8} aria-hidden="true" />
          Nenhuma evidência registrada para este caso.
        </p>
      )}
    </section>
  )
}

function IssuesCard({
  item,
  onAdd,
  onIssue,
}: {
  item: KycCase
  onAdd: () => void
  onIssue: (issue: KycPendingIssue, mode: 'resolve' | 'reopen') => void
}) {
  return (
    <section className={fin.card} aria-labelledby="kyc-issues-title">
      <div className={shared.cardHead}>
        <div>
          <h2 id="kyc-issues-title" className={fin.cardTitleSm}>
            Pendências
          </h2>
          <p className={fin.cardSubtitle}>
            {openIssueCount(item)} aberta(s) de {item.pendingIssues.length}
          </p>
        </div>
        <OutlineButton className={styles.smallButton} onClick={onAdd} data-add-issue>
          <ListPlus size={15} strokeWidth={1.8} aria-hidden="true" />
          Adicionar pendência
        </OutlineButton>
      </div>
      {item.pendingIssues.length ? (
        <ul className={styles.issueList} data-issue-list>
          {item.pendingIssues.map((issue) => (
            <li key={issue.pendingIssueId} className={styles.issueRow} data-issue={issue.pendingIssueId} data-status={issue.status}>
              <div className={styles.issueMain}>
                <span className={styles.issueText}>{issue.description}</span>
                <span className={shared.rowId}>
                  {issue.pendingIssueId}
                  {issue.origin === 'session' ? ' · adicionada nesta sessão' : ''}
                </span>
                <span className={styles.evidenceMeta}>
                  Criada: {kycDateText(issue.createdAt)}
                  {issue.resolvedAt ? ` · Resolvida: ${kycDateText(issue.resolvedAt)}` : ''}
                </span>
              </div>
              <div className={styles.evidenceSide}>
                <IssueStatusPill status={issue.status} />
                <OutlineButton
                  className={styles.smallButton}
                  onClick={() => onIssue(issue, issue.status === 'open' ? 'resolve' : 'reopen')}
                  data-issue-action={issue.pendingIssueId}
                  aria-label={`${issue.status === 'open' ? 'Resolver' : 'Reabrir'} pendência ${issue.pendingIssueId}`}
                >
                  {issue.status === 'open' ? (
                    <CircleCheck size={14} strokeWidth={1.9} aria-hidden="true" />
                  ) : (
                    <RotateCcw size={14} strokeWidth={1.9} aria-hidden="true" />
                  )}
                  {issue.status === 'open' ? 'Resolver' : 'Reabrir'}
                </OutlineButton>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className={fc.emptyLine}>
          <Info size={15} strokeWidth={1.8} aria-hidden="true" />
          Nenhuma pendência registrada para este caso.
        </p>
      )}
    </section>
  )
}
