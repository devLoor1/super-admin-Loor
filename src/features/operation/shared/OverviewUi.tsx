import { useState, type ReactNode } from 'react'
import { CircleAlert, RotateCw, SearchX } from 'lucide-react'
import { EmptyState } from '../../../components/ui/EmptyState'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import { Tabs } from '../../../components/ui/Tabs'
import { tabId, tabPanelId } from '../../../components/ui/tabIds'
import { describeApiError } from '../../../lib/apiErrors'
import type { RemoteState } from '../../../lib/useRemoteResource'
import { BackLink, DetailList, OperationShell, type OperationSection } from './OperationUi'
import { initials } from './operationModel'
import type { account, profile } from './overviewContract'
import shared from './Operation.module.css'
import participants from './Participants.module.css'
import fin from '../../finance-gateways/sections/FinanceSections.module.css'
import { overviewDate, overviewStatus } from './overviewPresent'

export function OverviewCard({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return <section className={fin.card}><h3 className={fin.cardTitleSm}>{title}</h3>{note ? <p className={fin.cardSubtitle}>{note}</p> : null}{children}</section>
}
export function OverviewAccount({ value }: { value: ReturnType<typeof account> }) {
  return <OverviewCard title="Conta e acesso" note="Supervisão somente leitura. O estado de acesso não é uma decisão de KYC.">
    {value ? <DetailList rows={[
      { label: 'Acesso', value: overviewStatus(value.accessState) },
      ...(value.accessState === 'paused' ? [{ label: 'Motivo registrado', value: value.reason ?? 'Não informado' }, { label: 'Pausada em', value: overviewDate(value.pausedAt) }] : []),
      { label: 'E-mail verificado em', value: overviewDate(value.emailVerifiedAt) },
      { label: 'Atualizada em', value: overviewDate(value.updatedAt) },
      { label: 'Último acesso', value: overviewDate(value.lastLoginAt) },
    ]} /> : <p>Conta não disponível nesta leitura.</p>}
  </OverviewCard>
}
export function OverviewHero({ value, access, kind }: { value: ReturnType<typeof profile>; access: string | null | undefined; kind: string }) {
  return <section className={`${fin.card} ${shared.hero}`} data-overview-state="loaded">
    <span className={participants.heroAvatar} aria-hidden="true">{value.fullName ? initials(value.fullName) : '?'}</span>
    <div className={shared.heroHeading}>
      <h2 className={shared.heroTitle}>{value.fullName ?? 'Nome não informado'}</h2>
      <p className={shared.heroId}>ID do {kind} (Core): {value.id}</p>
      <div className={shared.heroMeta}><span>Conta: {overviewStatus(access)}</span><a className={shared.inlineLink} href={`#/whitelabels?id=${value.whitelabelId}`}>Whitelabel #{value.whitelabelId}</a></div>
    </div>
  </section>
}
export function OverviewRead<T>({ state, reload, valid, section, title, listHref, children }: { state: RemoteState<T>; reload: () => void; valid: boolean; section: OperationSection; title: string; listHref: string; children: (data: T) => ReactNode }) {
  const error = state.status === 'error' ? describeApiError(state.error, title.toLowerCase()) : null
  const missing = !valid || error?.notFound
  return <OperationShell section={section} title={title}>
    <div><BackLink href={listHref} label={`Voltar para ${title}`} /></div>
    {missing ? <OverviewCard title="Registro não encontrado"><EmptyState icon={SearchX} title="Identidade não encontrada" description="Use um ID canônico da lista. Registros de protótipo não são consultados nem substituídos." /></OverviewCard>
      : error ? <section className={fin.card} role="alert" data-overview-state="error"><EmptyState icon={CircleAlert} title={error.title} description={error.description} />{error.correlationId ? <p>Código de diagnóstico: {error.correlationId}</p> : null}{error.retryable ? <OutlineButton onClick={reload}><RotateCw size={14} aria-hidden="true" />Tentar novamente</OutlineButton> : null}</section>
        : state.status === 'success' ? children(state.data) : <section className={fin.card} aria-busy="true" role="status" data-overview-state="loading">Carregando visão 360°…</section>}
  </OperationShell>
}
export function OverviewTabs({ sections }: { sections: { id: string; label: string; content: ReactNode }[] }) {
  const [tab, setTab] = useState(sections[0].id)
  const prefix = 'participant-overview'
  return <><div className={`${fin.card} ${shared.tabsCard}`}><Tabs idPrefix={prefix} label="Seções do perfil" tabs={sections.map(s => ({ value: s.id, label: s.label }))} value={tab} onChange={setTab} /></div>
    <div role="tabpanel" id={tabPanelId(prefix, tab)} aria-labelledby={tabId(prefix, tab)} tabIndex={0} className={shared.tabPanel}>{sections.find(s => s.id === tab)?.content}</div></>
}
