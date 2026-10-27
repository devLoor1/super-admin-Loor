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
import styles from '../whitelabel-settings/WhitelabelSettingsPage.module.css'
import read from '../whitelabel-settings/SettingsRead.module.css'

const smtpHref = (id: string) => `#/whitelabels/${id}/emails?section=smtp`
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
    <p className={read.missing}>Criação, troca de credenciais e envio de teste não estão habilitados nesta interface. Um teste SMTP envia uma mensagem real. Eventos automáticos e templates sem contrato do Control Plane permanecem indisponíveis.</p>
  </>
}
function ConfirmedSmtp({ id }: { id: string }) {
  const remote = useSmtpRead(id)
  if (remote.state.status === 'error') return <SmtpReadFeedback error={remote.state.error} retry={remote.reload} />
  if (remote.state.status !== 'success') return <p role="status">Consultando configuração SMTP…</p>
  return <>{remote.state.data.state === 'saved' && <SmtpMetadataEditor id={id} data={remote.state.data} onReload={remote.reload} />}<SmtpReadCards data={remote.state.data} /></>
}
function SmtpTenant({ whitelabelId, section }: { whitelabelId: string; section: string }) {
  const id = isSmtpTenantId(whitelabelId) ? whitelabelId : null
  const tenant = useWhitelabelRecord(id), registry = useWhitelabelOptions()
  const record = tenant.state.status === 'success' ? tenant.state.data : null
  const label = record ? record.name.length > 32 ? `${record.name.slice(0,31).trimEnd()}…` : record.name : id ? `Whitelabel #${id}` : 'Selecionar Whitelabel'
  return <AppShell activeNav="plataformas" activeSubNav="whitelabel-emails" title="E-mail do Whitelabel" location="SMTP" breadcrumbs={[{label:'Plataformas'},{label:'Whitelabels',href:'#/whitelabels'},{label},{label:'E-mail'}]} subNavHrefs={{ contas:`#/whitelabels/${id ?? 'select'}/accounts`,'whitelabel-settings':configHref(id ?? 'select'),'whitelabel-emails':smtpHref(id ?? 'select') }}>
    <div className={styles.page}><DotMatrixBackground /><div className={styles.layout}>
      <div className={styles.context}><div className={styles.intro}><a href="#/whitelabels" className={styles.back}><ArrowLeft size={16} aria-hidden="true" />Whitelabels</a><p className={styles.subtitle}>Configuração de envio por Whitelabel · leitura e metadados SMTP.</p></div>
        <AccountsWhitelabelSelector current={record} pendingId={id ?? undefined} options={registry.state.status === 'success' ? registry.state.data.rows.filter(w => isSmtpTenantId(w.id)) : null} optionsStatus={registry.state.status === 'error' ? 'error' : registry.state.status === 'success' ? 'success' : 'loading'} onRetryOptions={registry.reload} contextLabel="a configuração de e-mail" onSelect={next => { window.location.hash = smtpHref(next) }} />
      </div>
      <ConfigNavigation id={id ?? 'select'} active="email" />
      {section !== 'smtp' ? <div className={styles.notFound}><h2>Área de e-mail indisponível</h2><p>Esta integração oferece a consulta SMTP. Eventos e templates ainda não possuem contrato do Control Plane qualificado.</p><a href={smtpHref(id ?? 'select')}>Consultar SMTP</a></div> : !id ? <div className={styles.notFound}><h2>Selecione um Whitelabel</h2><p>Escolha um registro real do Control Plane para consultar a configuração SMTP.</p></div> : tenant.state.status === 'error' ? <SmtpReadFeedback error={tenant.state.error} retry={tenant.reload} /> : record ? <ConfirmedSmtp key={id} id={id} /> : <p role="status">Confirmando Whitelabel…</p>}
    </div></div>
  </AppShell>
}
export function OperationalSmtpPage({ whitelabelId, section = 'smtp' }: { whitelabelId: string; section?: string }) {
  const operator = useSessionOperator(), session = useSyncExternalStore(subscribeSession,getSessionVersion,getSessionVersion)
  if (!canReadSmtp(operator?.roles)) return <AppShell activeNav="plataformas" title="E-mail do Whitelabel" location="SMTP"><div role="alert" className={styles.notFound}><h2>Acesso não permitido</h2><p>Este perfil não pode consultar SMTP. A autorização final pertence ao Backend.</p></div></AppShell>
  return <SmtpTenant key={session} whitelabelId={whitelabelId} section={section} />
}
