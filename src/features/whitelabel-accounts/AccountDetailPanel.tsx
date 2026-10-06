import { useState, type ReactNode } from 'react'
import {
  ArrowRight,
  ArrowRightLeft,
  CheckCircle2,
  Clock3,
  FileCheck2,
  History,
  Hourglass,
  Info,
  Link2,
  Minus,
  Pause,
  RotateCcw,
  Undo2,
  type LucideIcon,
} from 'lucide-react'
import { IconTile } from '../../components/ui/IconTile'
import { OutlineButton } from '../../components/ui/OutlineButton'
import { StatusPill } from '../../components/ui/StatusPill'
import { Tabs } from '../../components/ui/Tabs'
import { tabId, tabPanelId } from '../../components/ui/tabIds'
import { DetailTransition } from '../../components/ui/DetailTransition'
import type { Whitelabel } from '../whitelabels/prototypeWhitelabels'
import { AccountAvatar, BusinessBadge } from './AccountBadges'
import {
  ACCESS_META,
  ACCOUNT_TYPE_LABEL,
  ADMIN_INVITATION_META,
  ADMIN_ROLE_META,
  COMPANY_VALIDATION_META,
  CONCEPTUAL_PERMISSIONS,
  DEPENDENCY_DEFS,
  DEPENDENCY_TONE,
  INVESTOR_VALIDATION_META,
  formatDateTime,
  initials,
  type Account,
  type AccountEvent,
  type AccountType,
  type Dependency,
  type DependencyStatus,
  type InvestorAccount,
} from './accountModel'
import styles from './AccountDetailPanel.module.css'

type DetailTab = 'overview' | 'data' | 'company' | 'permissions' | 'dependencies' | 'terms' | 'history'

const TABS: Record<AccountType, { value: DetailTab; label: string }[]> = {
  investor: [
    { value: 'overview', label: 'Visão geral' },
    { value: 'data', label: 'Dados' },
    { value: 'dependencies', label: 'Dependências' },
    { value: 'terms', label: 'Termos' },
    { value: 'history', label: 'Histórico' },
  ],
  entrepreneur: [
    { value: 'overview', label: 'Visão geral' },
    { value: 'data', label: 'Dados' },
    { value: 'company', label: 'Empresa' },
    { value: 'dependencies', label: 'Dependências' },
    { value: 'history', label: 'Histórico' },
  ],
  admin: [
    { value: 'overview', label: 'Visão geral' },
    { value: 'permissions', label: 'Permissões' },
    { value: 'dependencies', label: 'Dependências' },
    { value: 'history', label: 'Histórico' },
  ],
}

const DEPENDENCY_ICON: Record<DependencyStatus, LucideIcon> = {
  complete: CheckCircle2,
  linked: Link2,
  pending: Clock3,
  none: Minus,
  awaiting: Hourglass,
}

const ID_PREFIX = 'acc-detail'

export type AccountDetailPanelProps = {
  account: Account
  whitelabel: Whitelabel
  whitelabels: Whitelabel[]
  events: AccountEvent[]
  currentTermsRevision: number | null
  onPause: () => void
  onReactivate: () => void
  onTransfer: () => void
  onDiscardTransfer: () => void
  onNotify: (message: string) => void
  onDisplay: (id: string) => void
}

/**
 * Selected account: identity, type-specific sections and the account actions.
 * The region stays mounted (shared Whitelabels detail transition); its inner
 * contents reset tabs when another account is selected.
 */
export function AccountDetailPanel(props: AccountDetailPanelProps) {
  return (
    <DetailTransition item={props.account} className={styles.panel} sectionId="account-detail" labelledBy="acc-detail-title" onDisplay={props.onDisplay}>
      {(displayed) => <DetailContents key={displayed.id} {...props} account={displayed} />}
    </DetailTransition>
  )
}

function DetailContents({
  account,
  whitelabel,
  whitelabels,
  events,
  currentTermsRevision,
  onPause,
  onReactivate,
  onTransfer,
  onDiscardTransfer,
  onNotify,
}: AccountDetailPanelProps) {
  const [tab, setTab] = useState<DetailTab>('overview')
  const tabs = TABS[account.type]
  const access = ACCESS_META[account.accessState]
  const typeMeta = ACCOUNT_TYPE_LABEL[account.type]

  return (
    <>
      <header className={styles.header} data-detail-stage="identity">
        <AccountAvatar initials={initials(account.name)} size="lg" />
        <div className={styles.identity}>
          <div className={styles.nameRow}>
            <h2 id="acc-detail-title" className={styles.name} data-account-id={account.id}>
              {account.name}
            </h2>
            <StatusPill tone={access.tone} label={access.label} />
          </div>
          <p className={styles.meta}>
            {typeMeta.singular}
            <span className={styles.metaDot} aria-hidden="true">
              •
            </span>
            ID: {account.id}
          </p>
        </div>
      </header>

      <Tabs
        idPrefix={ID_PREFIX}
        label={`Seções da conta de ${account.name}`}
        tabs={tabs}
        value={tab}
        onChange={setTab}
        className={styles.tabs}
      />

      <p className={styles.tabsHint}>Mais seções: deslize ou use as setas ← →</p>

      {tabs.map((item) => (
        <div
          key={item.value}
          role="tabpanel"
          id={tabPanelId(ID_PREFIX, item.value)}
          aria-labelledby={tabId(ID_PREFIX, item.value)}
          hidden={tab !== item.value}
          tabIndex={0}
          className={styles.tabPanel}
        >
          {tab !== item.value ? null : item.value === 'overview' ? (
            <Overview
              account={account}
              whitelabel={whitelabel}
              whitelabels={whitelabels}
              events={events}
              onPause={onPause}
              onReactivate={onReactivate}
              onTransfer={onTransfer}
              onDiscardTransfer={onDiscardTransfer}
              onShowDependencies={() => setTab('dependencies')}
            />
          ) : item.value === 'data' ? (
            <PersonalData account={account} />
          ) : item.value === 'company' && account.type === 'entrepreneur' ? (
            <CompanyData account={account} />
          ) : item.value === 'permissions' && account.type === 'admin' ? (
            <Permissions role={account.role} name={account.name} onNotify={onNotify} />
          ) : item.value === 'dependencies' ? (
            <DependencyList dependencies={account.dependencies} type={account.type} />
          ) : item.value === 'terms' && account.type === 'investor' ? (
            <Terms account={account} currentRevision={currentTermsRevision} whitelabelName={whitelabel.name} />
          ) : (
            <HistoryList account={account} events={events} />
          )}
        </div>
      ))}
    </>
  )
}

/* ---------------- Overview ---------------- */

function Overview({
  account,
  whitelabel,
  whitelabels,
  events,
  onPause,
  onReactivate,
  onTransfer,
  onDiscardTransfer,
  onShowDependencies,
}: Pick<
  AccountDetailPanelProps,
  'account' | 'whitelabel' | 'whitelabels' | 'events' | 'onPause' | 'onReactivate' | 'onTransfer' | 'onDiscardTransfer'
> & { onShowDependencies: () => void }) {
  const access = ACCESS_META[account.accessState]
  const lastPause = events.find((event) => event.kind === 'paused')
  const paused = account.accessState === 'paused'
  const transferTarget = account.transferRequest
    ? whitelabels.find((item) => item.id === account.transferRequest?.toWhitelabelId)
    : undefined

  return (
    <div className={styles.overview}>
      <section className={styles.card} aria-labelledby="acc-info-title" data-detail-stage="information">
        <h3 id="acc-info-title" className={styles.cardTitle}>
          Informações principais
        </h3>
        <dl className={styles.fields}>
          <Field label="E-mail">
            <span className={styles.value}>{account.email}</span>
          </Field>
          <Field label="Whitelabel">
            <span className={styles.whitelabel}>
              <span className={styles.whitelabelMark} data-tone={whitelabel.avatarTone} aria-hidden="true">
                {whitelabel.initial ?? '·'}
              </span>
              <span className={styles.value}>{whitelabel.name}</span>
            </span>
          </Field>
          <Field label="Status de acesso">
            <StatusPill tone={access.tone} label={access.label} />
          </Field>
          {account.type === 'investor' ? (
            <Field label="Validação da conta">
              <BusinessBadge {...INVESTOR_VALIDATION_META[account.validation]} />
            </Field>
          ) : account.type === 'entrepreneur' ? (
            <Field label="Validação da empresa">
              <BusinessBadge {...COMPANY_VALIDATION_META[account.company.validation]} />
            </Field>
          ) : (
            <>
              <Field label="Função (conceitual)">
                <span className={styles.value}>{ADMIN_ROLE_META[account.role].label}</span>
              </Field>
              <Field label="Convite">
                <BusinessBadge {...ADMIN_INVITATION_META[account.invitation]} />
              </Field>
            </>
          )}
          <Field label="Criada em">
            <DateValue iso={account.createdAt} />
          </Field>
          <Field label="Última atividade">
            <DateValue iso={account.lastActivityAt} />
          </Field>
        </dl>
      </section>

      <section className={styles.card} aria-labelledby="acc-actions-title" data-detail-stage="actions">
        <h3 id="acc-actions-title" className={styles.cardTitle}>
          Ações da conta
        </h3>

        {account.transferRequest ? (
          <div className={styles.transferNotice} role="note">
            <ArrowRightLeft size={16} strokeWidth={1.8} aria-hidden="true" />
            <p>
              <strong>Alteração para {transferTarget?.name ?? 'outro Whitelabel'} simulada</strong> em{' '}
              {formatDateTime(account.transferRequest.requestedAt)}. Nenhuma migração foi executada; depende de validação
              do Backend.
            </p>
            <button type="button" className={styles.linkButton} onClick={onDiscardTransfer}>
              <Undo2 size={14} strokeWidth={1.8} aria-hidden="true" />
              Descartar simulação
            </button>
          </div>
        ) : null}

        <div className={styles.actionRow}>
          {paused ? (
            <button type="button" className={styles.reactivateButton} onClick={onReactivate} data-access-action>
              <RotateCcw size={17} strokeWidth={1.9} aria-hidden="true" />
              Reativar acesso
            </button>
          ) : (
            <button type="button" className={styles.pauseButton} onClick={onPause} data-access-action>
              <Pause size={17} strokeWidth={2} aria-hidden="true" />
              Pausar acesso
            </button>
          )}
          <OutlineButton className={styles.secondaryAction} onClick={onTransfer} data-transfer-action>
            <ArrowRightLeft size={16} strokeWidth={1.8} aria-hidden="true" />
            Alterar Whitelabel
          </OutlineButton>
        </div>

        {paused ? (
          <p className={styles.pausedLine}>
            {lastPause ? (
              <>
                Pausada neste protótipo em {formatDateTime(lastPause.at)}. Motivo: “{lastPause.reason}”
              </>
            ) : (
              'Pausada nos dados ilustrativos (sem data ou motivo registrados).'
            )}
          </p>
        ) : null}

        <div className={styles.note}>
          <Info size={16} strokeWidth={1.8} aria-hidden="true" />
          <p>
            Pausar acesso suspende temporariamente o acesso do usuário, preservando os dados e o histórico da conta.
            {account.type === 'investor'
              ? ' A validação, o KYC e os vínculos financeiros não mudam.'
              : account.type === 'entrepreneur'
                ? ' A empresa e as oportunidades não mudam.'
                : ' A função e o convite não mudam.'}
          </p>
        </div>
        <ul className={styles.integration} aria-label="Situação da implementação">
          <li>
            Frontend: <strong>protótipo</strong>
          </li>
          <li>
            Backend: <strong>implementação pendente</strong>
          </li>
          <li>
            Integração: <strong>pendente</strong>
          </li>
        </ul>
      </section>

      <section className={styles.card} aria-labelledby="acc-deps-title" data-detail-stage="dependencies">
        <div className={styles.cardHeader}>
          <h3 id="acc-deps-title" className={styles.cardTitle}>
            Dependências e status
          </h3>
          <button type="button" className={styles.linkButton} onClick={onShowDependencies}>
            Ver detalhes
            <ArrowRight size={14} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>
        <ul className={styles.depGrid}>
          {account.dependencies.map((dependency) => (
            <DependencyTile key={dependency.key} dependency={dependency} />
          ))}
        </ul>
      </section>
    </div>
  )
}

function DependencyTile({ dependency }: { dependency: Dependency }) {
  const Icon = DEPENDENCY_ICON[dependency.status]
  return (
    <li className={styles.depTile}>
      <span className={styles.depLabel}>{DEPENDENCY_DEFS[dependency.key].label}</span>
      <span className={styles.depStatus} data-tone={DEPENDENCY_TONE[dependency.status]}>
        <Icon size={14} strokeWidth={2} aria-hidden="true" />
        {dependency.value}
      </span>
    </li>
  )
}

/* ---------------- Other sections ---------------- */

function PersonalData({ account }: { account: Account }) {
  return (
    <div className={styles.overview}>
      <section className={styles.card} aria-labelledby="acc-data-title">
        <h3 id="acc-data-title" className={styles.cardTitle}>
          Dados da conta
        </h3>
        <dl className={styles.fields}>
          <Field label="Nome completo">
            <span className={styles.value}>{account.name}</span>
          </Field>
          <Field label="E-mail">
            <span className={styles.value}>{account.email}</span>
          </Field>
          <Field label="Documento (CPF)">
            <OptionalValue value={account.document} />
          </Field>
          <Field label="Telefone">
            <OptionalValue value={account.phone} />
          </Field>
          <Field label="ID (protótipo)">
            <span className={styles.value}>{account.id}</span>
          </Field>
        </dl>
        <p className={styles.cardFootnote}>Documentos e telefones aparecem parcialmente mascarados e são ilustrativos.</p>
      </section>

      {account.type === 'investor' ? (
        <section className={styles.card} aria-labelledby="acc-profile-title">
          <h3 id="acc-profile-title" className={styles.cardTitle}>
            Perfil do investidor
          </h3>
          <dl className={styles.fields}>
            <Field label="Classificação">
              <OptionalValue value={account.profile.classification} />
            </Field>
            <Field label="Questionário">
              <BusinessBadge
                tone={account.profile.questionnaire === 'completed' ? 'positive' : 'pending'}
                label={account.profile.questionnaire === 'completed' ? 'Concluído' : 'Pendente'}
              />
            </Field>
          </dl>
          <p className={styles.cardFootnote}>
            Questionário e regras de classificação são de configuração global. Este protótipo não indica configuração
            por Whitelabel nem permite edição.
          </p>
        </section>
      ) : null}
    </div>
  )
}

function CompanyData({ account }: { account: Extract<Account, { type: 'entrepreneur' }> }) {
  return (
    <section className={styles.card} aria-labelledby="acc-company-title">
      <h3 id="acc-company-title" className={styles.cardTitle}>
        Empresa
      </h3>
      <dl className={styles.fields}>
        <Field label="Razão social">
          <OptionalValue value={account.company.name} />
        </Field>
        <Field label="CNPJ">
          <OptionalValue value={account.company.document} />
        </Field>
        <Field label="Validação da empresa">
          <BusinessBadge {...COMPANY_VALIDATION_META[account.company.validation]} />
        </Field>
      </dl>
      <p className={styles.cardFootnote}>
        A validação da empresa é um estado de negócio próprio e não equivale ao acesso da conta. Empresas e CNPJs são
        fictícios.
      </p>
    </section>
  )
}

function Permissions({ role, name, onNotify }: { role: Extract<Account, { type: 'admin' }>['role']; name: string; onNotify: (message: string) => void }) {
  return (
    <section className={styles.card} aria-labelledby="acc-perm-title">
      <div className={styles.cardHeader}>
        <h3 id="acc-perm-title" className={styles.cardTitle}>
          Permissões conceituais
        </h3>
        <OutlineButton
          className={styles.smallButton}
          onClick={() => onNotify(`Protótipo visual: a edição de permissões de ${name} não está disponível. Nenhuma regra de acesso existe ainda.`)}
        >
          Editar
        </OutlineButton>
      </div>
      <p className={styles.cardSubtitle}>
        {ADMIN_ROLE_META[role].label} — {ADMIN_ROLE_META[role].description.toLowerCase()}
      </p>
      <ul className={styles.permissionList}>
        {CONCEPTUAL_PERMISSIONS.map((permission) => (
            <li key={permission.id} className={styles.permission}>
              <Hourglass size={16} strokeWidth={2} aria-hidden="true" />
              <span className={styles.permissionText}>
                <span className={styles.permissionLabel}>{permission.label}</span>
                <span className={styles.permissionDescription}>{permission.description}</span>
              </span>
              <span className={styles.permissionState}>A definir</span>
            </li>
        ))}
      </ul>
      <p className={styles.cardFootnote}>
        Áreas para discussão, não permissões concedidas. A matriz por função depende de decisão de Produto e contrato
        do Backend. Nenhuma regra de acesso (RBAC) é aplicada neste protótipo.
      </p>
    </section>
  )
}

function DependencyList({ dependencies, type }: { dependencies: Dependency[]; type: AccountType }) {
  return (
    <section className={styles.card} aria-labelledby="acc-deplist-title">
      <h3 id="acc-deplist-title" className={styles.cardTitle}>
        O que está vinculado a esta conta
      </h3>
      <p className={styles.cardSubtitle}>
        Status semânticos e ilustrativos, sem valores financeiros. Estes vínculos explicam por que algumas ações
        dependem de validação do Backend.
      </p>
      <ul className={styles.depList}>
        {dependencies.map((dependency) => {
          const def = DEPENDENCY_DEFS[dependency.key]
          return (
            <li key={dependency.key} className={styles.depRow}>
              <IconTile icon={def.icon} tone={type === 'admin' ? 'violet' : 'indigo'} size="sm" />
              <div className={styles.depRowText}>
                <div className={styles.depRowHead}>
                  <span className={styles.depRowLabel}>{def.label}</span>
                  <BusinessBadge tone={DEPENDENCY_TONE[dependency.status]} label={dependency.value} />
                </div>
                <p className={styles.depImpact}>Ao alterar o Whitelabel: {def.impact.charAt(0).toLowerCase() + def.impact.slice(1)}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function Terms({
  account,
  currentRevision,
  whitelabelName,
}: {
  account: InvestorAccount
  currentRevision: number | null
  whitelabelName: string
}) {
  const { terms } = account
  const outdated = terms.accepted && currentRevision !== null && terms.acceptedRevision !== currentRevision
  return (
    <section className={styles.card} aria-labelledby="acc-terms-title">
      <h3 id="acc-terms-title" className={styles.cardTitle}>
        Termos de uso
      </h3>
      <dl className={styles.fields}>
        <Field label="Aceite">
          <BusinessBadge tone={terms.accepted ? 'positive' : 'pending'} label={terms.accepted ? 'Aceitos' : 'Não aceitos'} />
        </Field>
        <Field label="Revisão aceita">
          <OptionalValue value={terms.acceptedRevision ? `rev. ${terms.acceptedRevision}` : null} />
        </Field>
        <Field label={`Revisão vigente (${whitelabelName})`}>
          <OptionalValue value={currentRevision ? `rev. ${currentRevision}` : null} />
        </Field>
        <Field label="Aceito em">
          <DateValue iso={terms.acceptedAt} />
        </Field>
      </dl>
      {outdated ? (
        <div className={styles.note} data-tone="warning">
          <FileCheck2 size={16} strokeWidth={1.8} aria-hidden="true" />
          <p>
            A revisão aceita é anterior à vigente. A política de novo aceite ainda não foi definida; nada é exigido do
            usuário neste protótipo.
          </p>
        </div>
      ) : null}
      <p className={styles.cardFootnote}>Somente leitura. Baseado em um conceito existente no Core, sem integração com o Super Admin.</p>
    </section>
  )
}

function HistoryList({ account, events }: { account: Account; events: AccountEvent[] }) {
  const items: { id: string; at: string | null; title: string; reason?: string; illustrative?: boolean }[] = [
    ...events,
  ]
  const hasLocalPause = events.some((event) => event.kind === 'paused' || event.kind === 'reactivated')
  if (account.accessState === 'paused' && !hasLocalPause) {
    items.push({ id: 'seed-paused', at: null, title: 'Acesso pausado (estado inicial ilustrativo, sem motivo registrado)', illustrative: true })
  }
  if (account.createdAt && !events.some((event) => event.kind === 'created')) {
    items.push({ id: 'seed-created', at: account.createdAt, title: 'Conta criada', illustrative: true })
  }
  return (
    <section className={styles.card} aria-labelledby="acc-history-title">
      <h3 id="acc-history-title" className={styles.cardTitle}>
        Histórico
      </h3>
      <p className={styles.cardSubtitle}>Registro local desta sessão do protótipo — não é uma trilha de auditoria.</p>
      {items.length ? (
        <ol className={styles.timeline}>
          {items.map((item) => (
            <li key={item.id} className={styles.timelineItem}>
              <History size={15} strokeWidth={1.8} aria-hidden="true" />
              <div>
                <p className={styles.timelineTitle}>{item.title}</p>
                <p className={styles.timelineMeta}>
                  {item.at ? formatDateTime(item.at) : 'Sem data'}
                  {item.illustrative ? ' · dado ilustrativo' : ' · nesta sessão'}
                </p>
                {item.reason ? <p className={styles.timelineReason}>Motivo: “{item.reason}”</p> : null}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className={styles.cardFootnote}>Nenhum evento registrado.</p>
      )}
    </section>
  )
}

/* ---------------- Small helpers ---------------- */

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.field}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function OptionalValue({ value }: { value: string | null }) {
  if (value) return <span className={styles.value}>{value}</span>
  return (
    <span className={styles.value}>
      <span aria-hidden="true">—</span>
      <span className="visually-hidden">sem dados</span>
    </span>
  )
}

function DateValue({ iso }: { iso: string | null }) {
  const text = formatDateTime(iso)
  if (!text) return <OptionalValue value={null} />
  return <span className={styles.value}>{text.replace(' ', ' às ')}</span>
}
