import { useEffect, useState, type ReactNode } from 'react'
import { Building2, CircleAlert, Info, RotateCw, SearchX, ShieldCheck, Target, UserRound } from 'lucide-react'
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
import { useWhitelabelRecord } from '../shared/whitelabelContext'
import shared from '../shared/Operation.module.css'
import styles from '../shared/Participants.module.css'
import states from '../shared/ReadStates.module.css'
import { accessMeta, isPrototypeId, maskPhone, profileMeta, type EntrepreneurRecord } from './entrepreneurApi'
import { entrepreneurListReturnHash } from './entrepreneurRoute'
import { useEntrepreneurDetail } from './useEntrepreneurData'

type Tab = 'overview' | 'relation' | 'kyc' | 'activity'
const TAB_PREFIX = 'participant-detail'

const PENDING = {
  account: 'Contas do Whitelabel ainda é um protótipo e não reconhece empreendedores do Control Plane. Nenhuma navegação foi feita.',
  opportunities:
    'Operação › Oportunidades ainda é um protótipo; oportunidades deste empreendedor não estão integradas. Nenhuma navegação foi feita.',
  compliance:
    'Compliance › KYC ainda é um protótipo; não há caso KYC do Control Plane vinculado a este empreendedor. Nenhuma navegação foi feita.',
}

// Entrepreneur ids overlap numerically with Investor ids: session activity is keyed by domain + id.
const activityKey = (id: string) => `entrepreneur:${id}`

/**
 * `#/operation/entrepreneurs/:entrepreneurId` — read-only profile from
 * `GET /entrepreneurs/:id` (Core Entrepreneur id). Only fields the Control
 * Plane returns are shown. The contract has no Company: the company row says
 * "Aguardando integração da empresa" and no prototype company is shown.
 * KYC, opportunities and account administration are not integrated and their
 * prototype destinations are never linked with real ids.
 */
export function EntrepreneurDetailPage({ entrepreneurId, returnTo }: { entrepreneurId: string; returnTo?: string }) {
  const prototypeLink = isPrototypeId(entrepreneurId)
  const detail = useEntrepreneurDetail(prototypeLink ? null : entrepreneurId)
  const listHref = entrepreneurListReturnHash(returnTo)
  const error = detail.state.status === 'error' ? describeApiError(detail.state.error, 'o empreendedor') : null

  if (prototypeLink || error?.notFound) {
    return (
      <OperationShell section="entrepreneurs" title="Empreendedores" trail={['Não encontrado']}>
        <div className={shared.notFound} data-entrepreneur-state="not-found">
          <EmptyState
            icon={SearchX}
            title="Empreendedor não encontrado"
            description={
              <>
                {prototypeLink
                  ? `“${entrepreneurId}” é um ID de protótipo (de Oportunidades ou Compliance, que ainda usam dados ilustrativos) e não corresponde a um empreendedor do Control Plane.`
                  : `Nenhum empreendedor do Control Plane usa o ID “${entrepreneurId}”.`}{' '}
                <a href={listHref} className={shared.inlineLink}>
                  Voltar para Empreendedores
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
      <OperationShell section="entrepreneurs" title="Empreendedores" trail={[`ID ${entrepreneurId}`]}>
        <div>
          <BackLink href={listHref} label="Voltar para Empreendedores" />
        </div>
        <section className={`${fin.card} ${states.feedback}`} role="alert" data-entrepreneur-state="error">
          <EmptyState icon={CircleAlert} title={error.title} description={error.description} />
          {error.correlationId ? (
            <p className={states.diagnostic}>
              Código de diagnóstico: <code className={states.code}>{error.correlationId}</code>
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
      <OperationShell section="entrepreneurs" title="Empreendedores" trail={[`ID ${entrepreneurId}`]}>
        <div>
          <BackLink href={listHref} label="Voltar para Empreendedores" />
        </div>
        <section className={`${fin.card} ${shared.hero}`} aria-busy="true" aria-label="Carregando empreendedor" data-entrepreneur-state="loading">
          <span className={styles.heroAvatar} aria-hidden="true" />
          <div className={states.heroSkeleton} aria-hidden="true">
            <span className={states.skeleton} />
            <span className={states.skeleton} />
            <span className={states.skeleton} />
          </div>
          <p className="visually-hidden" role="status">
            Carregando empreendedor…
          </p>
        </section>
      </OperationShell>
    )
  }

  const entrepreneur = detail.state.data
  return (
    <OperationShell section="entrepreneurs" title="Empreendedores" trail={[crumbLabel(entrepreneur.fullName ?? `ID ${entrepreneur.id}`)]}>
      <EntrepreneurProfile entrepreneur={entrepreneur} listHref={listHref} />
    </OperationShell>
  )
}

function EntrepreneurProfile({ entrepreneur, listHref }: { entrepreneur: EntrepreneurRecord; listHref: string }) {
  const notify = usePrototypeNotice()
  const key = activityKey(entrepreneur.id)
  const activity = useOperationActivity(key)
  const [tab, setTab] = useState<Tab>('overview')
  const whitelabel = useWhitelabelRecord(entrepreneur.whitelabelId)
  const whitelabelName = whitelabel.state.status === 'success' ? whitelabel.state.data.name : `Whitelabel #${entrepreneur.whitelabelId}`
  const access = accessMeta(entrepreneur.accessState)
  const profile = profileMeta(entrepreneur.businessState)
  const name = entrepreneur.fullName ?? 'Nome não informado'

  const log = (title: string, detail?: string) => addOperationActivity(key, { title, detail })

  useEffect(() => {
    addOperationActivity(key, { title: 'Perfil consultado', detail: 'Dados do Control Plane (somente leitura)' })
  }, [key])

  function changeTab(next: Tab) {
    setTab(next)
    if (next === 'relation') log('Oportunidades consultadas', 'Aguardando integração')
    if (next === 'kyc') log('Compliance / KYC consultado', 'Aguardando integração')
  }

  function pending(which: keyof typeof PENDING, title: string) {
    log(title, 'Destino ainda em protótipo — sem navegação')
    notify(PENDING[which])
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
      key: 'opportunities',
      label: 'Ver oportunidades',
      description: 'Operação › Oportunidades — ainda em protótipo, não integrado',
      icon: Target,
      onSelect: () => pending('opportunities', 'Navegação para Oportunidades indisponível'),
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
    { value: 'relation', label: 'Oportunidades' },
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
        <a href={`#/whitelabels?id=${encodeURIComponent(entrepreneur.whitelabelId)}`} className={shared.inlineLink}>
          (ID {entrepreneur.whitelabelId})
        </a>
      </span>
    </span>
  )

  return (
    <>
      <div>
        <BackLink href={listHref} label="Voltar para Empreendedores" />
      </div>

      <section className={`${fin.card} ${shared.hero}`} aria-labelledby="participant-title" data-entrepreneur-state="loaded">
        <span className={styles.heroAvatar} aria-hidden="true">
          {entrepreneur.fullName ? initials(entrepreneur.fullName) : '?'}
        </span>
        <div className={shared.heroHeading}>
          <div className={shared.heroTitleRow}>
            <h2 id="participant-title" className={shared.heroTitle}>
              {name}
            </h2>
            {access ? <StatusPill tone={access.tone} label={`Conta ${access.label.toLowerCase()}`} /> : null}
          </div>
          <p className={shared.heroId}>ID do empreendedor (Control Plane): {entrepreneur.id}</p>
          <div className={shared.heroMeta}>
            <div className={shared.heroMetaItem}>
              <span className={shared.heroMetaLabel}>Whitelabel</span>
              <span className={shared.heroMetaValue}>{whitelabelValue}</span>
            </div>
            <div className={shared.heroMetaItem}>
              <span className={shared.heroMetaLabel}>Empresa</span>
              <span className={shared.heroMetaValue} data-company-pending>
                <BusinessBadge tone="neutral" label="Aguardando integração da empresa" />
              </span>
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
        <Tabs idPrefix={TAB_PREFIX} label="Seções do perfil do empreendedor" tabs={tabs} value={tab} onChange={changeTab} />
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
                { label: 'ID do empreendedor', value: entrepreneur.id },
                { label: 'E-mail', value: entrepreneur.email ?? 'Não informado' },
                { label: 'Telefone', value: maskPhone(entrepreneur.phone) ?? 'Não informado' },
                { label: 'Whitelabel', value: whitelabelValue },
                { label: 'Status da conta', value: access ? <StatusPill tone={access.tone} label={access.label} /> : 'Não informado' },
                {
                  label: 'Situação do cadastro',
                  value: profile ? <BusinessBadge tone={profile.tone} label={profile.label} /> : 'Não informado',
                },
                { label: 'Empresa', value: <BusinessBadge tone="neutral" label="Aguardando integração da empresa" /> },
                { label: 'E-mail verificado em', value: date(entrepreneur.emailVerifiedAt) },
                { label: 'Criado em', value: date(entrepreneur.createdAt) },
                { label: 'Atualizado em', value: date(entrepreneur.updatedAt) },
              ]}
            />
          </section>
          <DomainNavCard
            title="Navegação para domínios responsáveis"
            intro="Conta, oportunidades e KYC pertencem a outros módulos, que ainda são protótipos e não reconhecem empreendedores do Control Plane."
            items={navItems}
          />
        </div>
        <section className={fin.card} aria-labelledby="entrepreneur-company-title" data-company-panel>
          <h3 id="entrepreneur-company-title" className={fin.cardTitleSm}>
            Empresa — aguardando integração
          </h3>
          <p className={shared.callout} style={{ marginTop: 12 }}>
            <Building2 size={15} strokeWidth={1.8} aria-hidden="true" />
            <span>
              O contrato de empreendedores do Control Plane não traz empresa (identificação, razão social, CNPJ, situação ou vínculo).
              Nenhum dado de empresa é exibido aqui, e a listagem de Empresas continua pendente de Backend e Produto.
            </span>
          </p>
        </section>
        <InfoNote>
          <strong>Empreendedores lê o Control Plane (somente leitura).</strong> “Situação do cadastro” é a completude do perfil do
          empreendedor no Core — não é KYC nem validação de empresa. Empresa, KYC, oportunidades e ações de conta aguardam integração;
          nenhum valor ilustrativo é exibido.
        </InfoNote>
      </Panel>

      <Panel tab="relation" current={tab}>
        <PendingPanel
          icon={Target}
          title="Oportunidades — aguardando integração"
          description="As oportunidades deste empreendedor ainda não estão integradas: Operação › Oportunidades é um protótipo e o contrato de empreendedores não traz vínculos. Nenhuma oportunidade ou contagem ilustrativa é exibida."
        />
      </Panel>

      <Panel tab="kyc" current={tab}>
        <PendingPanel
          icon={ShieldCheck}
          title="Compliance / KYC — aguardando integração"
          description="O contrato de empreendedores não traz status de KYC, e Compliance › KYC ainda é um protótipo. A situação do cadastro (Visão geral) não substitui a decisão de KYC."
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
      <div className={states.unavailable}>
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
