import { useSyncExternalStore } from 'react'
import { ArrowLeft } from 'lucide-react'
import { AppShell } from '../../components/shell/AppShell'
import { OutlineButton } from '../../components/ui/OutlineButton'
import { StatusPill } from '../../components/ui/StatusPill'
import { getSessionVersion, subscribeSession, useSessionOperator } from '../../lib/authSession'
import { describeApiError } from '../../lib/apiErrors'
import { AccountsWhitelabelSelector } from '../whitelabel-accounts/AccountsWhitelabelSelector'
import { useWhitelabelOptions, useWhitelabelRecord } from '../operation/shared/whitelabelContext'
import { DotMatrixBackground } from '../whitelabels/visuals/DotMatrixBackground'
import { SettingsSection } from '../whitelabel-settings/SettingsSection'
import { ConfigNavigation } from '../whitelabel-settings/ConfigNavigation'
import { configHref } from '../whitelabel-settings/configRoute'
import { canReadSmtp, isSmtpTenantId, safeSmtpCorrelation, type SmtpRead } from './smtpReadApi'
import { useSmtpRead } from './useSmtpRead'
import { SmtpMetadataEditor } from './SmtpMetadataEditor'
import { EmailTemplatesWorkspace } from './EmailTemplatesWorkspace'
import { EmailBrandingWorkspace } from './EmailBrandingWorkspace'
import styles from '../whitelabel-settings/WhitelabelSettingsPage.module.css'
import read from '../whitelabel-settings/SettingsRead.module.css'
import studio from '../whitelabel-settings/ConfigurationStudio.module.css'
import email from './EmailTemplatesWorkspace.module.css'

const smtpHref = (id: string) => `#/whitelabels/${id}/emails?section=smtp`
const emailHref = (id: string, section: string) => `#/whitelabels/${id}/emails?section=${section}`
const emailAreas = [{ id: 'smtp', label: 'Configuração de envio' }, { id: 'templates', label: 'Templates e conteúdo' }, { id: 'branding', label: 'Identidade visual' }] as const
const dates = new Intl.DateTimeFormat('pt-BR', { dateStyle:'short', timeStyle:'short', timeZone:'America/Sao_Paulo' })
export function SmtpReadFeedback({ error, retry }: { error: unknown; retry: () => void }) {
  const view = describeApiError(error, 'a configuração SMTP deste Whitelabel')
  const correlationId = safeSmtpCorrelation(view.correlationId)
  return <div role="alert" className={styles.notFound}><h2>{view.title}</h2><p>{view.description}</p>{correlationId && <p>Correlação: {correlationId}</p>}{view.retryable && <OutlineButton onClick={retry}>Tentar novamente</OutlineButton>}</div>
}
const Row = ({ label, value }: { label: string; value: string | number | null }) => <div className={read.row}><dt>{label}</dt><dd>{value === null ? <span className={read.missing}>Não informado</span> : value === '' ? <span className={read.missing}>Texto vazio</span> : String(value)}</dd></div>

/** Only public metadata and configured-state booleans reach this component. */
export function SmtpReadCards({ data }: { data: SmtpRead }) {
  if (data.state === 'missing') return <SettingsSection id="smtp-state" title="SMTP da plataforma" subtitle="Leitura autoritativa do servidor próprio deste Whitelabel." status="readonly"><StatusPill tone="muted" label="Sem configuração própria" /><p>Nenhum registro SMTP foi retornado para este Whitelabel. Fluxos compatíveis podem usar o envio global do Core; esta leitura não comprova entrega ou a configuração global.</p></SettingsSection>
  return <>
    <p className={read.notice}>Configuração salva, uso ativo e entrega são estados distintos. Usuário, senha e dados privados de autenticação não são exibidos nem mantidos nesta consulta.</p>
    <div className={styles.columns}>
      <SettingsSection id="smtp-state" title="Estado da configuração" subtitle="Indicadores informados pelo Control Plane; não constituem teste de envio." status="readonly"><dl className={read.list}>
        <Row label="ID do Whitelabel" value={data.tenantId} /><Row label="ID da configuração" value={data.id} /><Row label="Configuração completa conforme API" value={data.configured ? 'Sim' : 'Não'} /><Row label="Servidor próprio ativo" value={data.active ? 'Sim' : 'Não'} /><Row label="Usuário configurado conforme API" value={data.hasUsername ? 'Sim' : 'Não'} /><Row label="Credencial configurada conforme API" value={data.hasPassword ? 'Sim' : 'Não'} />
      </dl><p className={read.missing}>Credencial configurada não comprova validade ou entrega. Quando o servidor próprio está inativo, fluxos compatíveis podem usar o envio global.</p></SettingsSection>
      <SettingsSection id="smtp-server" title="Servidor e segurança" subtitle="Metadados públicos do servidor salvo para este tenant." status="readonly"><dl className={read.list}>
        <Row label="Host" value={data.host} /><Row label="Porta" value={data.port} /><Row label="Conexão segura (secure)" value={data.secure ? 'Sim' : 'Não'} /><Row label="Verificar certificado TLS" value={data.tlsRejectUnauthorized ? 'Sim' : 'Não'} />
      </dl></SettingsSection>
      <SettingsSection id="smtp-sender" title="Remetente" subtitle="Identidade de envio informada na configuração, sem credenciais de autenticação." status="readonly"><dl className={read.list}><Row label="E-mail do remetente" value={data.fromEmail} /><Row label="Nome do remetente" value={data.fromName} /></dl></SettingsSection>
      <SettingsSection id="smtp-dates" title="Registro" subtitle="Datas em America/Sao_Paulo (Brasília)." status="readonly"><dl className={read.list}><Row label="Criado em" value={data.createdAt === null ? null : dates.format(new Date(data.createdAt))} /><Row label="Atualizado em" value={data.updatedAt === null ? null : dates.format(new Date(data.updatedAt))} /></dl></SettingsSection>
    </div>
    <p className={read.missing}>Criação SMTP, troca de credenciais, envio de teste e política de eventos não estão habilitados nesta interface. Um teste SMTP envia uma mensagem real.</p>
  </>
}
function ConfirmedSmtp({ id }: { id: string }) {
  const remote = useSmtpRead(id)
  if (remote.state.status === 'error') return <SmtpReadFeedback error={remote.state.error} retry={remote.reload} />
  if (remote.state.status !== 'success') return <p role="status">Consultando configuração SMTP…</p>
  const data = remote.state.data
  if (data.state === 'missing') return <SmtpReadCards data={data} />
  return <section className={studio.studio} aria-label="Configuração de envio"><header className={studio.heading}><div><span className={studio.eyebrow}>E-MAIL · TRANSPORTE</span><h2>Configuração de envio</h2><p>Metadados do servidor e do remetente. O conteúdo das mensagens é gerenciado em Templates.</p></div><span className={studio.savedBadge}>Leitura atual</span></header>
    <div className={studio.split}><div className={email.smtpPreview}><h3>Servidor próprio</h3><div className={email.smtpStatus}><StatusPill label={data.active ? 'Ativo' : 'Inativo'} tone={data.active ? 'success' : 'muted'} /><StatusPill label={data.configured ? 'Configurado conforme API' : 'Configuração incompleta'} tone="muted" /></div><dl><div><dt>Servidor</dt><dd>{data.host ?? 'Não informado'} · porta {data.port ?? 'não informada'}</dd></div><div><dt>Remetente</dt><dd>{data.fromName || 'Nome não informado'}<br />{data.fromEmail || 'E-mail não informado'}</dd></div><div><dt>Segurança</dt><dd>{data.secure ? 'Conexão segura' : 'Conexão sem secure'} · {data.tlsRejectUnauthorized ? 'Certificado TLS verificado' : 'Verificação TLS desabilitada'}</dd></div></dl><SmtpMetadataEditor id={id} data={data} onReload={remote.reload} /></div>
      <div className={email.smtpPreview}><h3>Identidade do remetente</h3><p>Representação do cabeçalho · não é uma mensagem enviada.</p><div className={studio.emailFrame}><div className={studio.subject}><span>DE</span><strong>{data.fromName || 'Nome não configurado'}</strong><small>{data.fromEmail || 'Remetente não configurado'}</small></div><div className={studio.subject}><span>PARA</span><strong>Destinatário de exemplo</strong><span>ASSUNTO</span><strong>Definido pelo template da mensagem</strong></div></div><p>Credenciais são representadas apenas por estado: usuário {data.hasUsername ? 'configurado' : 'não configurado'} e senha {data.hasPassword ? 'configurada' : 'não configurada'}.</p><p>Configurado não significa entrega verificada. Edição de credenciais e teste de envio continuam indisponíveis.</p></div></div>
    <details className={email.smtpDetails}><summary>Origem, metadados e datas do registro</summary><SmtpReadCards data={data} /></details>
  </section>
}
function SmtpTenant({ whitelabelId, section }: { whitelabelId: string; section: string }) {
  const id = isSmtpTenantId(whitelabelId) ? whitelabelId : null
  const tenant = useWhitelabelRecord(id), registry = useWhitelabelOptions()
  const record = tenant.state.status === 'success' ? tenant.state.data : null
  const label = record ? record.name.length > 32 ? `${record.name.slice(0,31).trimEnd()}…` : record.name : id ? `Whitelabel #${id}` : 'Selecionar Whitelabel'
  return <AppShell activeNav="plataformas" activeSubNav="whitelabel-emails" title="E-mail do Whitelabel" location={emailAreas.find(area => area.id === section)?.label ?? 'E-mail'} breadcrumbs={[{label:'Plataformas'},{label:'Whitelabels',href:'#/whitelabels'},{label},{label:'E-mail'}]} subNavHrefs={{ contas:`#/whitelabels/${id ?? 'select'}/accounts`,'whitelabel-settings':configHref(id ?? 'select'),'whitelabel-emails':smtpHref(id ?? 'select') }}>
    <div className={styles.page}><DotMatrixBackground /><div className={styles.layout}>
      <div className={styles.context}><div className={styles.intro}><a href="#/whitelabels" className={styles.back}><ArrowLeft size={16} aria-hidden="true" />Whitelabels</a><p className={styles.subtitle}>Transporte, conteúdo e identidade de e-mail deste Whitelabel.</p></div>
        <AccountsWhitelabelSelector current={record} pendingId={id ?? undefined} options={registry.state.status === 'success' ? registry.state.data.rows.filter(w => isSmtpTenantId(w.id)) : null} optionsStatus={registry.state.status === 'error' ? 'error' : registry.state.status === 'success' ? 'success' : 'loading'} onRetryOptions={registry.reload} contextLabel="a configuração de e-mail" onSelect={next => { window.location.hash = emailHref(next, section) }} />
      </div>
      <ConfigNavigation id={id ?? 'select'} active="email" />
      <nav className={email.tabs} aria-label="Áreas de e-mail">{emailAreas.map(area => <a key={area.id} href={emailHref(id ?? 'select', area.id)} aria-current={section === area.id ? 'page' : undefined}>{area.label}</a>)}</nav>
      {!emailAreas.some(area => area.id === section) ? <div className={styles.notFound}><h2>Área de e-mail indisponível</h2><p>Escolha Configuração de envio, Templates ou Identidade visual.</p><a href={smtpHref(id ?? 'select')}>Consultar SMTP</a></div> : !id ? <div className={styles.notFound}><h2>Selecione um Whitelabel</h2><p>Escolha um registro real do Control Plane.</p></div> : tenant.state.status === 'error' ? <SmtpReadFeedback error={tenant.state.error} retry={tenant.reload} /> : record ? section === 'smtp' ? <ConfirmedSmtp key={id} id={id} /> : section === 'templates' ? <EmailTemplatesWorkspace key={id} tenantId={id} /> : <EmailBrandingWorkspace key={id} tenantId={id} /> : <p role="status">Confirmando Whitelabel…</p>}
    </div></div>
  </AppShell>
}
export function OperationalSmtpPage({ whitelabelId, section = 'smtp' }: { whitelabelId: string; section?: string }) {
  const operator = useSessionOperator(), session = useSyncExternalStore(subscribeSession,getSessionVersion,getSessionVersion)
  if (!canReadSmtp(operator?.roles)) return <AppShell activeNav="plataformas" title="E-mail do Whitelabel" location="SMTP"><div role="alert" className={styles.notFound}><h2>Acesso não permitido</h2><p>Este perfil não pode consultar SMTP. A autorização final pertence ao Backend.</p></div></AppShell>
  return <SmtpTenant key={session} whitelabelId={whitelabelId} section={section} />
}
