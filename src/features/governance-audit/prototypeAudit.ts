import { REDACTED, type AuditEvent } from './auditModel'

/*
 * ILLUSTRATIVE AUDITORIA EVENTS — not production data, not a Backend
 * contract and NOT a claim that the Backend emits these events today.
 *
 * - Coverage: Control Plane login (success / failure) and logout, Whitelabel
 *   create / update / activate / deactivate, Whitelabel settings, SMTP update
 *   and test, account and administrator access, gateway create / credential
 *   update / activation, opportunity status and classification, KYC decisions.
 * - Resources reference existing prototype records; labels are snapshots at
 *   event time. "Depois" values match the current prototype seeds.
 * - No secret exists here: sensitive fields are stored as the REDACTED marker.
 *   IPs use documentation ranges (RFC 5737); user agents are generic.
 * - Recursively frozen. Nothing in the app appends, edits or deletes events.
 */

const FINAPOP = 'wl_proto_01'
const LOOR = 'wl_proto_02'
const NOVA = 'wl_proto_03'

const UA_WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Navegador-Exemplo/126.0'
const UA_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) Navegador-Exemplo/125.0'
const UA_LINUX = 'Mozilla/5.0 (X11; Linux x86_64) Navegador-Exemplo/126.0'

const SA = { actorId: 'USR-SA-01', ip: '203.0.113.10', userAgent: UA_WINDOWS }
const COMPLIANCE = { actorId: 'USR-SA-02', ip: '198.51.100.24', userAgent: UA_MAC }
const FINANCE = { actorId: 'USR-SA-03', ip: '192.0.2.55', userAgent: UA_LINUX }

const at = (value: string) => `${value}:00-03:00`

type Seed = Omit<AuditEvent, 'createdAt' | 'correlationId'> & { at: string; corr: string }

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach(deepFreeze)
    Object.freeze(value)
  }
  return value
}

const SEEDS: Seed[] = [
  {
    id: 'AUD-000151', at: '2026-03-16T16:20', corr: 'corr-3b91c0d2', ...COMPLIANCE,
    action: 'kyc_case.decision_recorded', module: 'compliance', result: 'success',
    resourceType: 'kyc_case', resourceId: 'kyc_proto_0001', resourceLabel: 'João Carvalho', whitelabelId: FINAPOP,
    oldValue: { status: 'Em análise', note: null },
    newValue: { status: 'Aprovado', note: 'Documentação conferida no protótipo (exemplo ilustrativo).' },
    summary: 'Caso KYC aprovado. Somente status e observação são registrados; documentos e payloads de KYC não entram na auditoria.',
  },
  {
    id: 'AUD-000152', at: '2026-09-10T09:30', corr: 'corr-5e07a1f4', ...SA,
    action: 'whitelabel.activated', module: 'plataformas', result: 'success',
    resourceType: 'whitelabel', resourceId: FINAPOP, resourceLabel: 'Finapop', whitelabelId: FINAPOP,
    oldValue: { status: 'Em configuração' },
    newValue: { status: 'Ativo' },
    summary: 'Whitelabel Finapop ativado.',
  },
  {
    id: 'AUD-000153', at: '2026-09-12T16:40', corr: 'corr-8a42d6e1', ...COMPLIANCE,
    action: 'kyc_case.decision_recorded', module: 'compliance', result: 'success',
    resourceType: 'kyc_case', resourceId: 'kyc_proto_e106', resourceLabel: 'Daniela Pires', whitelabelId: LOOR,
    oldValue: { status: 'Em análise', note: null },
    newValue: { status: 'Reprovado', note: 'Documentos da empresa divergentes do cadastro (exemplo ilustrativo).' },
    summary: 'Caso KYC reprovado. Documentos da empresa não são exibidos na auditoria.',
  },
  {
    id: 'AUD-000154', at: '2026-09-14T11:10', corr: 'corr-0c5f93b8', ...FINANCE,
    action: 'gateway.created', module: 'financeiro', result: 'success',
    resourceType: 'gateway', resourceId: 'gw_finapop_gama', resourceLabel: 'Provedor Gama', whitelabelId: FINAPOP,
    oldValue: null,
    newValue: {
      provider: 'Provedor Gama',
      gatewayRole: 'Contingência',
      environment: 'Produção',
      active: true,
      clientId: '••••M3X8',
      apiKey: REDACTED,
      webhookSecret: REDACTED,
    },
    summary: 'Configuração de gateway criada. Credenciais foram registradas apenas como “configuradas”, nunca o valor.',
  },
  {
    id: 'AUD-000155', at: '2026-09-18T15:00', corr: 'corr-d1e8b274', ...SA,
    action: 'whitelabel.deactivated', module: 'plataformas', result: 'success',
    resourceType: 'whitelabel', resourceId: LOOR, resourceLabel: 'Loor', whitelabelId: LOOR,
    oldValue: { status: 'Em configuração' },
    newValue: { status: 'Inativo' },
    summary: 'Whitelabel Loor desativado.',
  },
  {
    id: 'AUD-000156', at: '2026-09-19T09:20', corr: 'corr-4f6a0e55', ...SA,
    action: 'whitelabel.activated', module: 'plataformas', result: 'success',
    resourceType: 'whitelabel', resourceId: LOOR, resourceLabel: 'Loor', whitelabelId: LOOR,
    oldValue: { status: 'Inativo' },
    newValue: { status: 'Em configuração' },
    summary: 'Whitelabel Loor reativado (volta para “Em configuração”).',
  },
  {
    id: 'AUD-000157', at: '2026-09-20T17:45', corr: 'corr-a93c7b02', ...SA,
    action: 'admin.paused', module: 'plataformas', result: 'success',
    resourceType: 'admin', resourceId: 'adm_proto_005', resourceLabel: 'Otávio Lima', whitelabelId: LOOR,
    oldValue: { access: 'Ativa' },
    newValue: { access: 'Pausada' },
    summary: 'Acesso do administrador pausado.',
  },
  {
    id: 'AUD-000158', at: '2026-09-21T10:00', corr: 'corr-6b20f9cd', ...FINANCE,
    action: 'gateway.deactivated', module: 'financeiro', result: 'success',
    resourceType: 'gateway', resourceId: 'gw_finapop_gama', resourceLabel: 'Provedor Gama', whitelabelId: FINAPOP,
    oldValue: { active: true },
    newValue: { active: false },
    summary: 'Gateway de contingência desativado.',
  },
  {
    id: 'AUD-000159', at: '2026-09-26T11:50', corr: 'corr-f2d4815a', ...SA,
    action: 'account.paused', module: 'plataformas', result: 'success',
    resourceType: 'account', resourceId: 'inv_proto_003', resourceLabel: 'Ricardo Pereira', whitelabelId: FINAPOP,
    oldValue: { access: 'Ativa' },
    newValue: { access: 'Pausada' },
    summary: 'Acesso da conta de investidor pausado.',
  },
  {
    id: 'AUD-000160', at: '2026-09-27T14:26', corr: 'corr-19ce57a3', ...SA,
    action: 'opportunity.status_changed', module: 'operacao', result: 'success',
    resourceType: 'opportunity', resourceId: 'opp_proto_004', resourceLabel: 'Rede de Clínicas', whitelabelId: FINAPOP,
    oldValue: { status: 'Ativa' },
    newValue: { status: 'Pausada' },
    summary: 'Status da oportunidade Rede de Clínicas alterado de Ativa para Pausada.',
  },
  {
    id: 'AUD-000161', at: '2026-09-29T11:40', corr: 'corr-7d83e0b6', ...SA,
    action: 'admin.invited', module: 'plataformas', result: 'success',
    resourceType: 'admin', resourceId: 'adm_proto_003', resourceLabel: 'Sofia Azevedo', whitelabelId: FINAPOP,
    oldValue: null,
    newValue: { name: 'Sofia Azevedo', email: 'sofia.azevedo@example.com', role: 'Somente leitura', invitation: 'Pendente' },
    summary: 'Administrador convidado para o Whitelabel Finapop.',
  },
  {
    id: 'AUD-000162', at: '2026-09-30T11:18', corr: 'corr-2a6f4c19', ...COMPLIANCE,
    action: 'kyc_case.decision_recorded', module: 'compliance', result: 'success',
    resourceType: 'kyc_case', resourceId: 'kyc_proto_0102', resourceLabel: 'Maria Silva', whitelabelId: FINAPOP,
    oldValue: { status: 'Em análise', note: null },
    newValue: { status: 'Reprovado', note: 'Documento de identificação ilegível; nova submissão tratada em outro caso.' },
    summary: 'Caso KYC reprovado. O conteúdo do documento não é registrado.',
  },
  {
    id: 'AUD-000163', at: '2026-10-01T09:12', corr: 'corr-c48b1e70', ...SA,
    action: 'whitelabel_settings.updated', module: 'plataformas', result: 'success',
    resourceType: 'whitelabel_settings', resourceId: LOOR, resourceLabel: 'Loor · Experiência', whitelabelId: LOOR,
    oldValue: { ctaLabel: 'Ver oportunidades' },
    newValue: { ctaLabel: 'Explorar oportunidades' },
    summary: 'Texto do botão principal do Whitelabel Loor atualizado.',
  },
  {
    id: 'AUD-000164', at: '2026-10-02T10:30', corr: 'corr-91f2a6d8', ...FINANCE,
    action: 'gateway.activated', module: 'financeiro', result: 'success',
    resourceType: 'gateway', resourceId: 'gw_loor_alfa', resourceLabel: 'Provedor Alfa', whitelabelId: LOOR,
    oldValue: { active: false },
    newValue: { active: true },
    summary: 'Gateway principal do Whitelabel Loor ativado (Sandbox).',
  },
  {
    id: 'AUD-000165', at: '2026-10-03T14:32', corr: 'corr-5c0d82fe', ...SA,
    action: 'opportunity.status_changed', module: 'operacao', result: 'success',
    resourceType: 'opportunity', resourceId: 'opp_proto_001', resourceLabel: 'Expansão Sul', whitelabelId: FINAPOP,
    oldValue: { status: 'Rascunho' },
    newValue: { status: 'Ativa' },
    summary: 'Status da oportunidade Expansão Sul alterado de Rascunho para Ativa.',
  },
  {
    id: 'AUD-000166', at: '2026-10-03T17:02', corr: 'corr-e7a3940b', ...SA,
    action: 'opportunity.classification_updated', module: 'operacao', result: 'success',
    resourceType: 'opportunity', resourceId: 'opp_proto_007', resourceLabel: 'Modernização Fabril', whitelabelId: FINAPOP,
    oldValue: { modality: 'Equity', resourceUses: ['Modernização'] },
    newValue: { modality: 'Debt', resourceUses: ['Modernização', 'Capital de Giro'] },
    summary: 'Modalidade (Equity → Debt) e usos dos recursos da oportunidade atualizados. Segmentos sem alteração.',
  },
  {
    id: 'AUD-000167', at: '2026-10-04T10:12', corr: 'corr-0f9b6c31', ...SA,
    action: 'whitelabel.created', module: 'plataformas', result: 'success',
    resourceType: 'whitelabel', resourceId: NOVA, resourceLabel: 'Nova Plataforma', whitelabelId: NOVA,
    oldValue: null,
    newValue: { name: 'Nova Plataforma', domain: 'plataforma.com.br', slug: 'nova-plataforma', status: 'Rascunho' },
    summary: 'Whitelabel criado como Rascunho.',
  },
  {
    id: 'AUD-000168', at: '2026-10-04T10:31', corr: 'corr-b25e7d44', ...SA,
    action: 'admin.invited', module: 'plataformas', result: 'success',
    resourceType: 'admin', resourceId: 'adm_proto_006', resourceLabel: 'Isabela Fonseca', whitelabelId: NOVA,
    oldValue: null,
    newValue: { name: 'Isabela Fonseca', email: 'isabela.fonseca@example.com', role: 'Administrador do Whitelabel', invitation: 'Pendente' },
    summary: 'Administrador convidado para o Whitelabel Nova Plataforma.',
  },
  {
    id: 'AUD-000169', at: '2026-10-05T16:05', corr: 'corr-3e1a9f60', ...SA,
    action: 'smtp.test_sent', module: 'plataformas', result: 'failure',
    resourceType: 'smtp', resourceId: LOOR, resourceLabel: 'Loor SMTP', whitelabelId: LOOR,
    oldValue: null,
    newValue: null,
    summary: 'Teste de envio recusado: falha de autenticação no servidor SMTP (mensagem sanitizada; nenhuma credencial registrada).',
  },
  {
    id: 'AUD-000170', at: '2026-10-06T15:20', corr: 'corr-8c47d2a9', ...SA,
    action: 'whitelabel_settings.updated', module: 'plataformas', result: 'success',
    resourceType: 'whitelabel_settings', resourceId: FINAPOP, resourceLabel: 'Finapop · Identidade e textos', whitelabelId: FINAPOP,
    oldValue: { slogan: 'Invista com simplicidade.', primaryColor: '#4F46E5' },
    newValue: { slogan: 'Seu dinheiro, mais oportunidades.', primaryColor: '#6366F1' },
    summary: 'Slogan e cor primária do Whitelabel Finapop atualizados.',
  },
  {
    id: 'AUD-000171', at: '2026-10-06T16:20', corr: 'corr-61b0e8f3', ...FINANCE,
    action: 'gateway.credentials_updated', module: 'financeiro', result: 'success',
    resourceType: 'gateway', resourceId: 'gw_finapop_alfa', resourceLabel: 'Provedor Alfa', whitelabelId: FINAPOP,
    oldValue: { apiKey: REDACTED, webhookSecret: REDACTED },
    newValue: { apiKey: REDACTED, webhookSecret: REDACTED },
    summary: 'Credenciais do gateway substituídas. Os valores nunca são exibidos.',
  },
  {
    id: 'AUD-000172', at: '2026-10-07T08:30', corr: 'corr-a07c3b5e', ...COMPLIANCE,
    action: 'auth.login_succeeded', module: 'sistema', result: 'success',
    resourceType: 'session', resourceId: null, resourceLabel: 'Control Plane', whitelabelId: null,
    oldValue: null,
    newValue: null,
    summary: 'Login no Control Plane. Tokens e cabeçalhos de autorização não são registrados.',
  },
  {
    id: 'AUD-000173', at: '2026-10-07T09:47', corr: 'corr-4d92f61c', ...SA,
    action: 'smtp.updated', module: 'plataformas', result: 'success',
    resourceType: 'smtp', resourceId: FINAPOP, resourceLabel: 'Finapop SMTP', whitelabelId: FINAPOP,
    oldValue: { host: 'smtp-antigo.example.com', port: 465, security: 'SSL/TLS', password: REDACTED },
    newValue: { host: 'smtp.example.com', port: 587, security: 'STARTTLS', password: REDACTED },
    summary: 'Servidor SMTP do Whitelabel Finapop atualizado. A senha foi substituída e nunca é exibida.',
  },
  {
    id: 'AUD-000174', at: '2026-10-07T09:52', corr: 'corr-4d92f61c', ...SA,
    action: 'smtp.test_sent', module: 'plataformas', result: 'success',
    resourceType: 'smtp', resourceId: FINAPOP, resourceLabel: 'Finapop SMTP', whitelabelId: FINAPOP,
    oldValue: null,
    newValue: null,
    summary: 'Mensagem de teste aceita pelo servidor SMTP (ilustrativo).',
  },
  {
    id: 'AUD-000175', at: '2026-10-07T19:02', corr: 'corr-c3f81d07', ...SA,
    action: 'auth.logout', module: 'sistema', result: 'success',
    resourceType: 'session', resourceId: null, resourceLabel: 'Control Plane', whitelabelId: null,
    oldValue: null,
    newValue: null,
    summary: 'Sessão encerrada pelo operador.',
  },
  {
    id: 'AUD-000176', at: '2026-10-08T08:57', corr: 'corr-e5b6a2d9',
    actorId: null, ip: '203.0.113.77', userAgent: UA_WINDOWS,
    action: 'auth.login_failed', module: 'sistema', result: 'failure',
    resourceType: 'session', resourceId: null, resourceLabel: 'Control Plane', whitelabelId: null,
    oldValue: null,
    newValue: null,
    summary: 'Credenciais inválidas. O identificador e a senha informados não são registrados.',
  },
  {
    id: 'AUD-000177', at: '2026-10-08T08:58', corr: 'corr-17d0c4ab', ...SA,
    action: 'auth.login_succeeded', module: 'sistema', result: 'success',
    resourceType: 'session', resourceId: null, resourceLabel: 'Control Plane', whitelabelId: null,
    oldValue: null,
    newValue: null,
    summary: 'Login no Control Plane. Tokens e cabeçalhos de autorização não são registrados.',
  },
  {
    id: 'AUD-000178', at: '2026-10-08T09:15', corr: 'corr-9a2e5f18', ...FINANCE,
    action: 'auth.login_succeeded', module: 'sistema', result: 'success',
    resourceType: 'session', resourceId: null, resourceLabel: 'Control Plane', whitelabelId: null,
    oldValue: null,
    newValue: null,
    summary: 'Login no Control Plane. Tokens e cabeçalhos de autorização não são registrados.',
  },
]

export const PROTOTYPE_AUDIT_EVENTS: readonly AuditEvent[] = deepFreeze(
  SEEDS.map(({ at: when, corr, ...event }) => ({ ...event, createdAt: at(when), correlationId: corr })),
)

export const auditEventById = (id: string) => PROTOTYPE_AUDIT_EVENTS.find((event) => event.id === id)
