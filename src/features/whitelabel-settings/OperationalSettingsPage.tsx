import { useSyncExternalStore, type ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { AppShell } from '../../components/shell/AppShell'
import { OutlineButton } from '../../components/ui/OutlineButton'
import { getSessionVersion, subscribeSession, useSessionOperator } from '../../lib/authSession'
import { describeApiError } from '../../lib/apiErrors'
import { useWhitelabelOptions, useWhitelabelRecord } from '../operation/shared/whitelabelContext'
import { AccountsWhitelabelSelector } from '../whitelabel-accounts/AccountsWhitelabelSelector'
import { DotMatrixBackground } from '../whitelabels/visuals/DotMatrixBackground'
import { SettingsSection } from './SettingsSection'
import { canReadSettings, FEATURE_LABELS, isSettingsTenantId, TERMINOLOGY_LABELS, type ReadValue, type SettingsRead, type TermsRead, type SettingProvenance } from './settingsReadApi'
import { useSettingsRead } from './useSettingsRead'
import styles from './WhitelabelSettingsPage.module.css'
import read from './SettingsRead.module.css'
import { ConfigNavigation } from './ConfigNavigation'
import { configArea, configHref, type ConfigArea } from './configRoute'
import { PlatformAppRead } from './PlatformAppRead'
import { PlatformPresentationRead } from './PlatformPresentationCards'
import { ConfigurationStudio } from './ConfigurationStudio'

const settingsReadHref = (id: string, area: ConfigArea = 'platform') => configHref(id, area)
export function SettingsReadFeedback({ error, retry }: { error: unknown; retry: () => void }) {
  const view = describeApiError(error, 'as configurações deste Whitelabel')
  return <div role="alert" className={styles.notFound}><h2>{view.title}</h2><p>{view.description}</p>{view.correlationId && <p>Correlação: {view.correlationId}</p>}{view.retryable && <OutlineButton onClick={retry}>Tentar novamente</OutlineButton>}</div>
}
function Value({ field, boolean = false }: { field: ReadValue<string | number | boolean>; boolean?: boolean }) {
  if (field.state === 'missing') return <span className={read.missing}>Não informado pela API</span>
  if (field.state === 'null') return <span className={read.missing}>Sem valor (null)</span>
  if (field.value === '') return <span className={read.missing}>Texto vazio</span>
  return <>{boolean ? field.value ? 'Sim' : 'Não' : String(field.value)}</>
}
function Origin({ provenance }: { provenance?: SettingProvenance }) {
  return <small className={read.missing}>{!provenance ? 'Origem individual não informada.' : provenance.source === 'stored' ? 'Origem: substituição armazenada.' : provenance.source === 'default' ? 'Origem: padrão herdado; sem substituição armazenada.' : 'Origem: ausente; sem substituição armazenada.'}</small>
}
function Row({ label, field, boolean, provenance }: { label: string; field: ReadValue<string | number | boolean>; boolean?: boolean; provenance?: SettingProvenance }) {
  return <div className={read.row}><dt>{label}</dt><dd><Value field={field} boolean={boolean} />{provenance && <><br /><Origin provenance={provenance} /></>}</dd></div>
}
function Revision({ revision }: { revision: TermsRead }) {
  return <div className={read.revision}><dl className={read.list}>
    <Row label="ID da revisão" field={{ state: 'value', value: revision.id }} />
    <Row label="Revisão" field={{ state: 'value', value: revision.revision }} />
    <Row label="Título" field={revision.title} />
    <Row label="Publicado em (ISO)" field={revision.publishedAt} />
    <Row label="Atualizado em (ISO)" field={revision.updatedAt} />
  </dl><details><summary>Consultar conteúdo da revisão {revision.revision}</summary><div className={read.legal}><Value field={revision.content} /></div></details></div>
}
const Section = ({ id, title, subtitle, children }: { id: string; title: string; subtitle: string; children: ReactNode }) => <SettingsSection id={`settings-${id}`} title={title} subtitle={subtitle} status="readonly">{children}</SettingsSection>
/** Only the explicit public projection reaches React; no settings bag, credentials or provider JSON. */
export function SettingsReadCards({ data, area = 'all' }: { data: SettingsRead; area?: ConfigArea | 'all' }) {
  const show = (target: ConfigArea) => area === 'all' || area === target
  return <>
    <p className={read.notice}>Consulta do Control Plane. Nos textos de login e oito funcionalidades, a proveniência qualificada distingue substituição armazenada, padrão herdado e ausência. Sem proveniência, a consulta não comprova a origem e a edição permanece indisponível. Outras configurações continuam somente leitura.</p>
    {area === 'app' && <PlatformAppRead entry={data.app.entry} authenticated={data.app.authenticated} />}
    <div className={styles.columns}>
      {show('platform') && <Section id="general" title="Geral" subtitle="Identidade retornada pelo endpoint deste Whitelabel."><dl className={read.list}>
        <Row label="ID do Whitelabel" field={{ state:'value', value:data.id }} /><Row label="Nome" field={data.name} /><Row label="Identificador" field={data.slug} /><Row label="URL pública" field={data.baseUrl} /><Row label="Ativo" field={data.active} boolean />
      </dl></Section>}
      {show('identity') && <Section id="identity" title="Identidade" subtitle="Cores da etapa de perfil inicial; não representam toda a identidade visual."><dl className={read.list}>
        <Row label="Cor principal do perfil inicial" field={data.identity.primaryColor} /><Row label="Cor de fundo do perfil inicial" field={data.identity.backgroundColor} /><Row label="Cor do texto do perfil inicial" field={data.identity.textColor} />
      </dl><p className={read.missing}>Logo e favicon não possuem referências públicas qualificadas nesta integração.</p></Section>}
      {show('platform') && <Section id="experience" title="Experiência" subtitle="Textos públicos de entrada e vocabulário suportado."><dl className={read.list}>
        <Row label="Título de login" field={data.experience.title} provenance={data.provenance['login.title']} /><Row label="Subtítulo de login" field={data.experience.subtitle} provenance={data.provenance['login.subtitle']} /><Row label="Título do perfil inicial" field={data.experience.sideTitle} /><Row label="Subtítulo do perfil inicial" field={data.experience.sideSubtitle} />
        {data.experience.bullets.state === 'value' ? data.experience.bullets.value.map((v,i) => <Row key={i} label={`Destaque de login ${i+1}`} field={{state:'value',value:v}} />) : <Row label="Destaques de login" field={data.experience.bullets} />}
        <div className={read.row}><dt>Origem dos destaques de login</dt><dd><Origin provenance={data.provenance['login.bullets']} /></dd></div>
        {Object.entries(TERMINOLOGY_LABELS).map(([k,label]) => <Row key={k} label={label} field={data.terminology[k as keyof typeof TERMINOLOGY_LABELS]} />)}
      </dl></Section>}
      {show('platform') && <Section id="features" title="Funcionalidades" subtitle="Valores booleanos retornados pelo Core; não constituem autorização ou comprovação de disponibilidade de cada serviço."><dl className={read.list}>{Object.entries(FEATURE_LABELS).map(([k,label]) => <Row key={k} label={label} field={data.features[k as keyof typeof FEATURE_LABELS]} provenance={data.provenance[`features.${k as keyof typeof FEATURE_LABELS}`]} boolean />)}</dl></Section>}
    </div>
    {show('platform') && <PlatformPresentationRead capabilities={data.platformPresentation} />}
    {show('terms') && <Section id="terms" title="Termos de Uso" subtitle="Revisão vigente e até 20 revisões publicadas retornadas pela API. Sem publicação ou edição.">
      {data.terms.current.state === 'value' ? <Revision revision={data.terms.current.value} /> : <p>{data.terms.current.state === 'null' ? 'Nenhuma revisão vigente retornada para este Whitelabel.' : 'Revisão vigente não informada pela API.'}</p>}
      {data.terms.history.state === 'value' ? <details><summary>Histórico retornado ({data.terms.history.value.length} revisões)</summary>{data.terms.history.value.length ? data.terms.history.value.map(r => <Revision key={r.id} revision={r} />) : <p>Nenhuma revisão no histórico retornado.</p>}</details> : <p>Histórico {data.terms.history.state === 'null' ? 'sem valor (null)' : 'não informado pela API'}.</p>}
    </Section>}
    <p className={read.missing}>SMTP, templates e identidade de e-mail possuem áreas próprias em E-mail. Imagens das páginas de acesso são configuradas em Plataforma. Credenciais e configurações internas não são exibidas. Publicação de Termos, identidade global/PWA e envio de testes permanecem indisponíveis.</p>
  </>
}
function ConfirmedSettings({ id, area, cell }: { id: string; area: ConfigArea; cell?: string }) {
  const remote = useSettingsRead(id)
  if (remote.state.status === 'error') return <SettingsReadFeedback error={remote.state.error} retry={remote.reload} />
  if (remote.state.status !== 'success') return <p role="status">Consultando configurações…</p>
  return area === 'platform' || area === 'app'
    ? <ConfigurationStudio id={id} data={remote.state.data} area={area} selectedCell={cell} onReload={remote.reload} />
    : <SettingsReadCards data={remote.state.data} area={area} />
}
function SettingsTenant({ whitelabelId, area, cell }: { whitelabelId: string; area: ConfigArea | null; cell?: string }) {
  const id = isSettingsTenantId(whitelabelId) ? whitelabelId : null
  const tenant = useWhitelabelRecord(id), registry = useWhitelabelOptions()
  const record = tenant.state.status === 'success' ? tenant.state.data : null
  const tenantLabel = record ? record.name.length > 32 ? `${record.name.slice(0, 31).trimEnd()}…` : record.name : id ? `Whitelabel #${id}` : 'Selecionar Whitelabel'
  return <AppShell activeNav="plataformas" activeSubNav="whitelabel-settings" title="Configurações do Whitelabel" location="Configurações" subNavHrefs={{'whitelabel-emails':`#/whitelabels/${id ?? 'select'}/emails?section=smtp`,contas:`#/whitelabels/${id ?? 'select'}/accounts`,'whitelabel-settings':settingsReadHref(id ?? 'select', area ?? 'platform')}} breadcrumbs={[{label:'Plataformas'},{label:'Whitelabels',href:'#/whitelabels'},{label:tenantLabel},{label:'Configurações'}]}>
    <div className={styles.page}><DotMatrixBackground /><div className={styles.layout}>
      <div className={styles.context}><div className={styles.intro}><a href="#/whitelabels" className={styles.back}><ArrowLeft size={16} aria-hidden="true" />Whitelabels</a><p className={styles.subtitle}>Configuração do Whitelabel · Plataforma, Platform App, E-mail, Termos e identidade visual.</p></div>
        <AccountsWhitelabelSelector current={record} pendingId={id ?? undefined} options={registry.state.status === 'success' ? registry.state.data.rows.filter(w => isSettingsTenantId(w.id)) : null} optionsStatus={registry.state.status === 'error' ? 'error' : registry.state.status === 'success' ? 'success' : 'loading'} onRetryOptions={registry.reload} contextLabel="as configurações" onSelect={next => { window.location.hash = settingsReadHref(next, area ?? 'platform') }} />
      </div>
      <ConfigNavigation id={id ?? 'select'} active={area ?? 'platform'} />
      {!area ? <div role="alert" className={styles.notFound}><h2>Área de configuração inválida</h2><p>Escolha uma das áreas disponíveis acima.</p></div> : !id ? <div className={styles.notFound}><h2>Selecione um Whitelabel</h2><p>Escolha um registro real do Control Plane para consultar suas configurações.</p></div> : tenant.state.status === 'error' ? <SettingsReadFeedback error={tenant.state.error} retry={tenant.reload} /> : record ? <ConfirmedSettings key={`${id}:${area}`} id={id} area={area} cell={cell} /> : <p role="status">Confirmando Whitelabel…</p>}
    </div></div>
  </AppShell>
}
export function OperationalSettingsPage({ whitelabelId, area, cell }: { whitelabelId: string; area?: string; cell?: string }) {
  const operator = useSessionOperator()
  const session = useSyncExternalStore(subscribeSession, getSessionVersion, getSessionVersion)
  if (!canReadSettings(operator?.roles)) return <AppShell activeNav="plataformas" title="Configurações do Whitelabel" location="Configurações"><div role="alert" className={styles.notFound}><h2>Acesso não permitido</h2><p>Este perfil não pode consultar configurações. A autorização final pertence ao Backend.</p></div></AppShell>
  return <SettingsTenant key={session} whitelabelId={whitelabelId} area={configArea(area)} cell={cell} />
}
