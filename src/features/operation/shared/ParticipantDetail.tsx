import { useEffect, useState, type ReactNode } from 'react'
import { ExternalLink, Info, SearchX, ShieldCheck, UserRound } from 'lucide-react'
import { usePrototypeNotice } from '../../../components/shell/prototypeNotice'
import { EmptyState } from '../../../components/ui/EmptyState'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import outline from '../../../components/ui/OutlineButton.module.css'
import { StatusPill } from '../../../components/ui/StatusPill'
import { Tabs } from '../../../components/ui/Tabs'
import { tabId, tabPanelId } from '../../../components/ui/tabIds'
import { BusinessBadge } from '../../whitelabel-accounts/AccountBadges'
import { ACCESS_META } from '../../whitelabel-accounts/accountModel'
import fin from '../../finance-gateways/sections/FinanceSections.module.css'
import { addOperationActivity, useOperationActivity } from './operationActivity'
import { KYC_META, accountsHref, crumbLabel, formatDateTime, initials, pendingModuleMessage } from './operationModel'
import type { ParticipantProfile } from './participants'
import {
  BackLink,
  DetailList,
  DomainNavCard,
  InfoNote,
  OperationShell,
  SessionActivityCard,
  WhitelabelTag,
  type DomainNavItem,
  type OperationSection,
} from './OperationUi'
import shared from './Operation.module.css'
import styles from './Participants.module.css'

type Tab = 'overview' | 'relation' | 'kyc' | 'activity'
const TAB_PREFIX = 'participant-detail'

export type RelationTab = {
  label: string
  /** Session activity title logged when the tab is opened. */
  viewedTitle: string
  render: (helpers: { notifyPending: () => void }) => ReactNode
  /** Domain navigation entry for the relationship (e.g. Ver investimentos). */
  navItem: (helpers: { notifyPending: () => void; log: (title: string, detail?: string) => void }) => DomainNavItem
}

/**
 * Read-only operational profile shared by Investidores and Empreendedores:
 * header, Visão geral (account context + domain navigation), the module's
 * relationship tab, a Compliance/KYC summary and session activity. Account,
 * KYC and financial actions live in their own domains; here they are links
 * (existing modules) or pending-module notices — never mutations.
 */
export function ParticipantDetail({
  section,
  profile,
  notFoundId,
  overviewRows,
  relation,
  moduleNote,
}: {
  section: Exclude<OperationSection, 'opportunities'>
  profile: ParticipantProfile | undefined
  notFoundId: string
  overviewRows?: { label: string; value: ReactNode }[]
  relation: RelationTab
  moduleNote: ReactNode
}) {
  const isInvestor = section === 'investors'
  const singular = isInvestor ? 'investidor' : 'empreendedor'
  const listHref = `#/operation/${section}`
  const title = isInvestor ? 'Investidores' : 'Empreendedores'

  if (!profile) {
    return (
      <OperationShell section={section} title={title} trail={['Não encontrado']}>
        <div className={shared.notFound}>
          <EmptyState
            icon={SearchX}
            title={`${isInvestor ? 'Investidor' : 'Empreendedor'} não encontrado`}
            description={
              <>
                Nenhum {singular} do protótipo usa o ID “{notFoundId}”.{' '}
                <a href={listHref} className={shared.inlineLink}>
                  Voltar para {title}
                </a>
              </>
            }
          />
        </div>
      </OperationShell>
    )
  }

  return (
    <OperationShell section={section} title={title} trail={[crumbLabel(profile.account.name)]}>
      <ProfileContent
        profile={profile}
        singular={singular}
        listHref={listHref}
        listLabel={`Voltar para ${title}`}
        overviewRows={overviewRows}
        relation={relation}
        moduleNote={moduleNote}
      />
    </OperationShell>
  )
}

function ProfileContent({
  profile,
  singular,
  listHref,
  listLabel,
  overviewRows = [],
  relation,
  moduleNote,
}: {
  profile: ParticipantProfile
  singular: string
  listHref: string
  listLabel: string
  overviewRows?: { label: string; value: ReactNode }[]
  relation: RelationTab
  moduleNote: ReactNode
}) {
  const notify = usePrototypeNotice()
  const activity = useOperationActivity(profile.id)
  const [tab, setTab] = useState<Tab>('overview')
  const { account } = profile
  const accessMeta = ACCESS_META[account.accessState]
  const kycMeta = KYC_META[profile.kyc.status]
  const accountHref = accountsHref(profile.whitelabelId, profile.kind)

  const log = (title: string, detail?: string) => addOperationActivity(profile.id, { title, detail })

  useEffect(() => {
    addOperationActivity(profile.id, { title: 'Perfil consultado', detail: 'Visão operacional (somente leitura)' })
  }, [profile.id])

  function changeTab(next: Tab) {
    setTab(next)
    if (next === 'relation') log(relation.viewedTitle)
    if (next === 'kyc') log('Compliance / KYC consultado', 'Resumo somente leitura')
  }

  const notifyCompliance = () => {
    log('Navegação para Compliance solicitada', 'Módulo Compliance › KYC pendente — nenhuma navegação feita')
    notify(pendingModuleMessage('compliance'))
  }
  const notifyRelationPending = () => {
    notify(pendingModuleMessage('investments'))
  }
  const onAccount = () => log('Navegação para Contas solicitada', `Contas do Whitelabel (${profile.kind === 'investor' ? 'Investidores' : 'Empreendedores'})`)

  const tabs: { value: Tab; label: string }[] = [
    { value: 'overview', label: 'Visão geral' },
    { value: 'relation', label: relation.label },
    { value: 'kyc', label: 'Compliance / KYC' },
    { value: 'activity', label: 'Atividade da sessão' },
  ]

  const navItems: DomainNavItem[] = [
    {
      key: 'account',
      label: 'Ver conta',
      description: `Contas do Whitelabel — acesso e dados da conta do ${singular}`,
      icon: UserRound,
      href: accountHref,
      onSelect: onAccount,
    },
    relation.navItem({ notifyPending: notifyRelationPending, log }),
    {
      key: 'compliance',
      label: 'Ver no Compliance',
      description: 'Dados e processos de KYC',
      icon: ShieldCheck,
      onSelect: notifyCompliance,
      pending: true,
    },
  ]

  return (
    <>
      <div>
        <BackLink href={listHref} label={listLabel} />
      </div>

      <section className={`${fin.card} ${shared.hero}`} aria-labelledby="participant-title">
        <span className={styles.heroAvatar} aria-hidden="true">
          {initials(account.name)}
        </span>
        <div className={shared.heroHeading}>
          <div className={shared.heroTitleRow}>
            <h2 id="participant-title" className={shared.heroTitle}>
              {account.name}
            </h2>
            <StatusPill tone={accessMeta.tone} label={`Conta ${accessMeta.label.toLowerCase()}`} />
          </div>
          <p className={shared.heroId}>
            ID do {singular} (protótipo): {profile.id}
          </p>
          <div className={shared.heroMeta}>
            <div className={shared.heroMetaItem}>
              <span className={shared.heroMetaLabel}>Whitelabel</span>
              <span className={shared.heroMetaValue}>
                <WhitelabelTag whitelabelId={profile.whitelabelId} />
              </span>
            </div>
            <div className={shared.heroMetaItem}>
              <span className={shared.heroMetaLabel}>KYC (Compliance)</span>
              <span className={shared.heroMetaValue}>
                <BusinessBadge tone={kycMeta.tone} label={kycMeta.label} />
              </span>
            </div>
          </div>
        </div>
        <div className={shared.heroActions}>
          <a href={accountHref} className={`${outline.button} ${shared.secondaryButton}`} onClick={onAccount} data-view-account>
            Ver conta
            <ExternalLink size={15} strokeWidth={1.8} aria-hidden="true" />
          </a>
          <OutlineButton className={shared.secondaryButton} onClick={notifyCompliance} data-view-compliance>
            <ShieldCheck size={15} strokeWidth={1.8} aria-hidden="true" />
            Ver no Compliance
          </OutlineButton>
        </div>
      </section>

      <div className={`${fin.card} ${shared.tabsCard}`}>
        <Tabs idPrefix={TAB_PREFIX} label={`Seções do perfil do ${singular}`} tabs={tabs} value={tab} onChange={changeTab} />
      </div>

      <Panel tab="overview" current={tab}>
        <div className={shared.panelGrid}>
          <section className={fin.card} aria-labelledby="participant-info-title">
            <h3 id="participant-info-title" className={fin.cardTitleSm}>
              Informações principais
            </h3>
            <p className={fin.cardSubtitle}>Contexto da conta (Contas, protótipo) — somente leitura.</p>
            <DetailList
              rows={[
                { label: 'Nome completo', value: account.name },
                { label: `ID do ${singular}`, value: profile.id },
                { label: 'E-mail', value: account.email },
                { label: 'Telefone', value: account.phone ?? '—' },
                { label: 'Whitelabel', value: <WhitelabelTag whitelabelId={profile.whitelabelId} /> },
                { label: 'Status da conta', value: <StatusPill tone={accessMeta.tone} label={accessMeta.label} /> },
                { label: 'Criado em', value: formatDateTime(account.createdAt) ?? '—' },
                { label: 'Última atividade', value: formatDateTime(account.lastActivityAt) ?? '—' },
                ...overviewRows,
              ]}
            />
          </section>
          <DomainNavCard
            title="Navegação para domínios responsáveis"
            intro={`Conta, ${relation.label.toLowerCase()} e KYC pertencem a outros módulos. Daqui você só navega até eles.`}
            items={navItems}
          />
        </div>
        <InfoNote>{moduleNote}</InfoNote>
      </Panel>

      <Panel tab="relation" current={tab}>
        {relation.render({ notifyPending: notifyRelationPending })}
      </Panel>

      <Panel tab="kyc" current={tab}>
        <div className={shared.panelGrid}>
          <section className={fin.card} aria-labelledby="participant-kyc-title">
            <h3 id="participant-kyc-title" className={fin.cardTitleSm}>
              Resumo de KYC
            </h3>
            <p className={fin.cardSubtitle}>Resumo de contexto para a Operação. Estados de protótipo, não o fluxo oficial de KYC.</p>
            <DetailList
              rows={[
                { label: 'Status KYC', value: <BusinessBadge tone={kycMeta.tone} label={kycMeta.label} /> },
                { label: 'Última atualização', value: formatDateTime(profile.kyc.updatedAt) ?? '—' },
                { label: 'Pendências', value: profile.kyc.pendingSummary },
                { label: 'Referência do processo', value: profile.kyc.reference ?? '—' },
                { label: 'Origem do status', value: profile.kyc.source },
              ]}
            />
          </section>
          <section className={fin.card} aria-labelledby="participant-kyc-owner">
            <h3 id="participant-kyc-owner" className={fin.cardTitleSm}>
              Responsável: Compliance
            </h3>
            <p className={shared.callout} style={{ marginTop: 12 }}>
              <Info size={15} strokeWidth={1.8} aria-hidden="true" />
              <span>
                Aprovar, reprovar, solicitar documentos ou classificar risco acontece no módulo de Compliance. Esta tela não altera o
                KYC.
              </span>
            </p>
            <OutlineButton className={shared.blockButton} onClick={notifyCompliance} data-kyc-compliance>
              <ShieldCheck size={16} strokeWidth={1.8} aria-hidden="true" />
              Ver no Compliance
              <span className={shared.pendingTag}>Módulo pendente</span>
            </OutlineButton>
          </section>
        </div>
      </Panel>

      <Panel tab="activity" current={tab}>
        <SessionActivityCard entries={activity} emptyText="Nenhuma ação local registrada para este perfil." />
      </Panel>
    </>
  )
}

function Panel({ tab, current, children }: { tab: Tab; current: Tab; children: ReactNode }) {
  return (
    <div
      role="tabpanel"
      id={tabPanelId(TAB_PREFIX, tab)}
      aria-labelledby={tabId(TAB_PREFIX, tab)}
      hidden={tab !== current}
      tabIndex={0}
      className={shared.tabPanel}
    >
      {tab === current ? children : null}
    </div>
  )
}
