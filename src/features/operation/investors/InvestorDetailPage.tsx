import { useEffect, useState, type ReactNode } from 'react'
import { ChartColumn, CircleAlert, Info, RotateCw, SearchX, ShieldCheck, UserRound } from 'lucide-react'
import { usePrototypeNotice } from '../../../components/shell/prototypeNotice'
import { EmptyState } from '../../../components/ui/EmptyState'
import outline from '../../../components/ui/OutlineButton.module.css'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import { StatusPill } from '../../../components/ui/StatusPill'
import { Tabs } from '../../../components/ui/Tabs'
import { tabId, tabPanelId } from '../../../components/ui/tabIds'
import { describeApiError } from '../../../lib/apiErrors'
import { BusinessBadge } from '../../whitelabel-accounts/AccountBadges'
import fin from '../../finance-gateways/sections/FinanceSections.module.css'
import { formatWhitelabelDate } from '../../whitelabels/whitelabelApi'
import { addOperationActivity, useOperationActivity } from '../shared/operationActivity'
import { crumbLabel, initials } from '../shared/operationModel'
import { BackLink, DetailList, DomainNavCard, InfoNote, OperationShell, SessionActivityCard, type DomainNavItem } from '../shared/OperationUi'
import shared from '../shared/Operation.module.css'
import styles from '../shared/Participants.module.css'
import own from './Investors.module.css'
import {
  accessMeta,
  investorTypeLabel,
  isPrototypeId,
  maskPhone,
  validationMeta,
  type InvestorDetail,
} from './investorApi'
import { investorListReturnHash } from './investorRoute'
import { useInvestorDetail, useWhitelabelRecord } from './useInvestorData'

type Tab = 'overview' | 'relation' | 'kyc' | 'activity'
const TAB_PREFIX = 'participant-detail'

const PENDING = {
  account: 'Contas do Whitelabel ainda é um protótipo e não reconhece investidores do Control Plane. Nenhuma navegação foi feita.',
  investments:
    'Financeiro › Investimentos ainda é um protótipo; investimentos deste investidor não estão integrados. Nenhuma navegação foi feita.',
  compliance:
    'Compliance › KYC ainda é um protótipo; não há caso KYC do Control Plane vinculado a este investidor. Nenhuma navegação foi feita.',
}

/**
 * `#/operation/investors/:investorId` — read-only profile from
 * `GET /investors/:id` (Core Investor id). Only fields the Control Plane
 * returns are shown; KYC, investments and account administration are not
 * integrated and their destinations (prototype modules) are not linked with
 * real ids.
 */
export function InvestorDetailPage({ investorId, returnTo }: { investorId: string; returnTo?: string }) {
  const prototypeLink = isPrototypeId(investorId)
  const detail = useInvestorDetail(prototypeLink ? null : investorId)
  const listHref = investorListReturnHash(returnTo)
  const error = detail.state.status === 'error' ? describeApiError(detail.state.error, 'o investidor') : null

  if (prototypeLink || error?.notFound) {
    return (
      <OperationShell section="investors" title="Investidores" trail={['Não encontrado']}>
        <div className={shared.notFound} data-investor-state="not-found">
          <EmptyState
            icon={SearchX}
            title="Investidor não encontrado"
            description={
              <>
                {prototypeLink
                  ? `“${investorId}” é um ID de protótipo (de Financeiro, Compliance ou Auditoria, que ainda usam dados ilustrativos) e não corresponde a um investidor do Control Plane.`
                  : `Nenhum investidor do Control Plane usa o ID “${investorId}”.`}{' '}
                <a href={listHref} className={shared.inlineLink}>
                  Voltar para Investidores
                </a>
              </>
            }
          />
        </div>
      </OperationShell>
    )
  }

  if (error) {
    return (
      <OperationShell section="investors" title="Investidores" trail={[`ID ${investorId}`]}>
        <div>
          <BackLink href={listHref} label="Voltar para Investidores" />
        </div>
        <section className={`${fin.card} ${own.feedback}`} role="alert" data-investor-state="error">
          <EmptyState icon={CircleAlert} title={error.title} description={error.description} />
          {error.correlationId ? (
            <p className={own.diagnostic}>
              Código de diagnóstico: <code className={own.code}>{error.correlationId}</code>
            </p>
          ) : null}
          {error.retryable ? (
            <OutlineButton onClick={detail.reload}>
              <RotateCw size={14} strokeWidth={1.8} aria-hidden="true" />
              Tentar novamente
            </OutlineButton>
          ) : null}
        </section>
      </OperationShell>
    )
  }

  if (detail.state.status !== 'success') {
    return (
      <OperationShell section="investors" title="Investidores" trail={[`ID ${investorId}`]}>
        <div>
          <BackLink href={listHref} label="Voltar para Investidores" />
        </div>
        <section className={`${fin.card} ${shared.hero}`} aria-busy="true" aria-label="Carregando investidor" data-investor-state="loading">
          <span className={styles.heroAvatar} aria-hidden="true" />
          <div className={own.heroSkeleton} aria-hidden="true">
            <span className={own.skeleton} />
            <span className={own.skeleton} />
            <span className={own.skeleton} />
          </div>
          <p className="visually-hidden" role="status">
            Carregando investidor…
          </p>
        </section>
      </OperationShell>
    )
  }

  const investor = detail.state.data
  return (
    <OperationShell section="investors" title="Investidores" trail={[crumbLabel(investor.fullName ?? `ID ${investor.id}`)]}>
      <InvestorProfile investor={investor} listHref={listHref} />
    </OperationShell>
  )
}

function InvestorProfile({ investor, listHref }: { investor: InvestorDetail; listHref: string }) {
  const notify = usePrototypeNotice()
  const activity = useOperationActivity(investor.id)
  const [tab, setTab] = useState<Tab>('overview')
  const whitelabel = useWhitelabelRecord(investor.whitelabelId)
  const whitelabelName = whitelabel.state.status === 'success' ? whitelabel.state.data.name : `Whitelabel #${investor.whitelabelId}`
  const access = accessMeta(investor.accessState)
  const validation = validationMeta(investor.businessState)
  const name = investor.fullName ?? 'Nome não informado'

  const log = (title: string, detail?: string) => addOperationActivity(investor.id, { title, detail })

  useEffect(() => {
    addOperationActivity(investor.id, { title: 'Perfil consultado', detail: 'Dados do Control Plane (somente leitura)' })
  }, [investor.id])

  function changeTab(next: Tab) {
    setTab(next)
    if (next === 'relation') log('Investimentos consultados', 'Aguardando integração')
    if (next === 'kyc') log('Compliance / KYC consultado', 'Aguardando integração')
  }

  function pending(key: keyof typeof PENDING, title: string) {
    log(title, 'Destino ainda em protótipo — sem navegação')
    notify(PENDING[key])
  }

  const navItems: DomainNavItem[] = [
    {
      key: 'account',
      label: 'Ver conta',
      description: 'Contas do Whitelabel — ainda em protótipo, não integrado',
      icon: UserRound,
      onSelect: () => pending('account', 'Navegação para Contas indisponível'),
      pending: true,
    },
    {
      key: 'investments',
      label: 'Ver investimentos',
      description: 'Financeiro › Investimentos — ainda em protótipo, não integrado',
      icon: ChartColumn,
      onSelect: () => pending('investments', 'Navegação para Investimentos indisponível'),
      pending: true,
    },
    {
      key: 'compliance',
      label: 'Ver no Compliance',
      description: 'Compliance › KYC — ainda em protótipo, não integrado',
      icon: ShieldCheck,
      onSelect: () => pending('compliance', 'Navegação para Compliance › KYC indisponível'),
      pending: true,
    },
  ]

  const tabs: { value: Tab; label: string }[] = [
    { value: 'overview', label: 'Visão geral' },
    { value: 'relation', label: 'Investimentos' },
    { value: 'kyc', label: 'Compliance / KYC' },
    { value: 'activity', label: 'Atividade da sessão' },
  ]

  const date = (value: string | null) => formatWhitelabelDate(value, true) ?? 'Não informado'
  const whitelabelValue = (
    <span className={shared.wlCell}>
      <span className={shared.wlMark} data-tone="neutral" aria-hidden="true">
        {whitelabelName.charAt(0).toLocaleUpperCase('pt-BR')}
      </span>
      <span>
        {whitelabelName}{' '}
        <a href={`#/whitelabels?id=${encodeURIComponent(investor.whitelabelId)}`} className={shared.inlineLink}>
          (ID {investor.whitelabelId})
        </a>
      </span>
    </span>
  )

  return (
    <>
      <div>
        <BackLink href={listHref} label="Voltar para Investidores" />
      </div>

      <section className={`${fin.card} ${shared.hero}`} aria-labelledby="participant-title" data-investor-state="loaded">
        <span className={styles.heroAvatar} aria-hidden="true">
          {investor.fullName ? initials(investor.fullName) : '?'}
        </span>
        <div className={shared.heroHeading}>
          <div className={shared.heroTitleRow}>
            <h2 id="participant-title" className={shared.heroTitle}>
              {name}
            </h2>
            {access ? <StatusPill tone={access.tone} label={`Conta ${access.label.toLowerCase()}`} /> : null}
          </div>
          <p className={shared.heroId}>ID do investidor (Control Plane): {investor.id}</p>
          <div className={shared.heroMeta}>
            <div className={shared.heroMetaItem}>
              <span className={shared.heroMetaLabel}>Whitelabel</span>
              <span className={shared.heroMetaValue}>{whitelabelValue}</span>
            </div>
            <div className={shared.heroMetaItem}>
              <span className={shared.heroMetaLabel}>KYC (Compliance)</span>
              <span className={shared.heroMetaValue}>
                <BusinessBadge tone="neutral" label="Aguardando integração" />
              </span>
            </div>
          </div>
        </div>
        <div className={shared.heroActions}>
          <button type="button" className={`${outline.button} ${shared.secondaryButton}`} onClick={() => pending('account', 'Navegação para Contas indisponível')} data-view-account>
            <UserRound size={15} strokeWidth={1.8} aria-hidden="true" />
            Ver conta
          </button>
          <button type="button" className={`${outline.button} ${shared.secondaryButton}`} onClick={() => pending('compliance', 'Navegação para Compliance › KYC indisponível')} data-view-compliance>
            <ShieldCheck size={15} strokeWidth={1.8} aria-hidden="true" />
            Ver no Compliance
          </button>
        </div>
      </section>

      <div className={`${fin.card} ${shared.tabsCard}`}>
        <Tabs idPrefix={TAB_PREFIX} label="Seções do perfil do investidor" tabs={tabs} value={tab} onChange={changeTab} />
      </div>

      <Panel tab="overview" current={tab}>
        <div className={shared.panelGrid}>
          <section className={fin.card} aria-labelledby="participant-info-title">
            <h3 id="participant-info-title" className={fin.cardTitleSm}>
              Informações principais
            </h3>
            <p className={fin.cardSubtitle}>Dados do Control Plane — somente leitura.</p>
            <DetailList
              rows={[
                { label: 'Nome completo', value: name },
                { label: 'ID do investidor', value: investor.id },
                { label: 'E-mail', value: investor.email ?? 'Não informado' },
                { label: 'Telefone', value: maskPhone(investor.phone) ?? 'Não informado' },
                { label: 'Whitelabel', value: whitelabelValue },
                { label: 'Status da conta', value: access ? <StatusPill tone={access.tone} label={access.label} /> : 'Não informado' },
                {
                  label: 'Validação do cadastro',
                  value: validation ? <BusinessBadge tone={validation.tone} label={validation.label} /> : 'Não informado',
                },
                ...(investor.reasonForDeny ? [{ label: 'Motivo da negativa', value: investor.reasonForDeny, wide: true }] : []),
                { label: 'Tipo de investidor', value: investorTypeLabel(investor.investorType) ?? 'Não informado' },
                {
                  label: 'Dados pessoais preenchidos',
                  value: investor.personalInformationFilled === null ? 'Não informado' : investor.personalInformationFilled ? 'Sim' : 'Não',
                },
                { label: 'E-mail verificado em', value: date(investor.emailVerifiedAt) },
                { label: 'Termos aceitos em', value: date(investor.termsAcceptedAt) },
                { label: 'Criado em', value: date(investor.createdAt) },
                { label: 'Atualizado em', value: date(investor.updatedAt) },
              ]}
            />
          </section>
          <DomainNavCard
            title="Navegação para domínios responsáveis"
            intro="Conta, investimentos e KYC pertencem a outros módulos, que ainda são protótipos e não reconhecem investidores do Control Plane."
            items={navItems}
          />
        </div>
        <InfoNote>
          <strong>Investidores lê o Control Plane (somente leitura).</strong> “Validação do cadastro” é o estado de validação do
          investidor no Core — não é a decisão de KYC do Compliance. KYC, investimentos e ações de conta aguardam integração; nenhum
          valor ilustrativo é exibido.
        </InfoNote>
      </Panel>

      <Panel tab="relation" current={tab}>
        <PendingPanel
          icon={ChartColumn}
          title="Investimentos — aguardando integração"
          description="Os investimentos deste investidor ainda não estão integrados: Financeiro › Investimentos é um protótipo. Nenhum vínculo, valor ou contagem ilustrativa é exibido."
        />
      </Panel>

      <Panel tab="kyc" current={tab}>
        <PendingPanel
          icon={ShieldCheck}
          title="Compliance / KYC — aguardando integração"
          description="O contrato de investidores não traz status de KYC, e Compliance › KYC ainda é um protótipo. A validação do cadastro (Visão geral) não substitui a decisão de KYC."
        />
      </Panel>

      <Panel tab="activity" current={tab}>
        <SessionActivityCard entries={activity} emptyText="Nenhuma ação local registrada para este perfil." />
      </Panel>
    </>
  )
}

function PendingPanel({ icon, title, description }: { icon: typeof Info; title: string; description: string }) {
  return (
    <section className={fin.card} data-pending-panel>
      <div className={own.unavailable}>
        <EmptyState icon={icon} title={title} description={description} />
      </div>
    </section>
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
