import {
  Box,
  ChartColumnIncreasing,
  LayoutGrid,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import type { StatusTone } from '../../components/ui/StatusPill'

/*
 * AUDITORIA V1 (Governança) — frontend prototype model. Not a Backend
 * contract, not an audit infrastructure, not a log pipeline.
 *
 * - Events are ILLUSTRATIVE, FROZEN records: nothing in the app can create,
 *   edit, delete, revert, restore, replay or reprocess one. The Backend is
 *   NOT claimed to emit any of these events.
 * - Events are stored apart from every other module. No module appends to
 *   them (Compliance › KYC local actions included) and they never change a
 *   source-domain record.
 * - oldValue / newValue never carry secrets or sensitive documents: those
 *   fields are stored as a redaction marker and rendered as "••••••••" /
 *   "[redacted]"; a defensive key-name check redacts them again at render.
 */

export type AuditModule = 'plataformas' | 'operacao' | 'financeiro' | 'compliance' | 'sistema'

export const AUDIT_MODULES: AuditModule[] = ['plataformas', 'operacao', 'financeiro', 'compliance', 'sistema']

export const AUDIT_MODULE_META: Record<AuditModule, { label: string; icon: LucideIcon }> = {
  plataformas: { label: 'Plataformas', icon: LayoutGrid },
  operacao: { label: 'Operação', icon: Box },
  financeiro: { label: 'Financeiro', icon: ChartColumnIncreasing },
  compliance: { label: 'Compliance', icon: ShieldCheck },
  sistema: { label: 'Sistema', icon: Settings },
}

export type AuditResult = 'success' | 'failure'

export const AUDIT_RESULTS: AuditResult[] = ['success', 'failure']

export const AUDIT_RESULT_META: Record<AuditResult, { label: string; tone: StatusTone }> = {
  success: { label: 'Sucesso', tone: 'success' },
  failure: { label: 'Falha', tone: 'danger' },
}

export type AuditResourceType =
  | 'session'
  | 'whitelabel'
  | 'whitelabel_settings'
  | 'smtp'
  | 'account'
  | 'admin'
  | 'gateway'
  | 'opportunity'
  | 'kyc_case'

export const AUDIT_RESOURCE_LABEL: Record<AuditResourceType, string> = {
  session: 'Sessão administrativa',
  whitelabel: 'Whitelabel',
  whitelabel_settings: 'Configurações do Whitelabel',
  smtp: 'Configuração SMTP',
  account: 'Conta',
  admin: 'Administrador',
  gateway: 'Gateway',
  opportunity: 'Oportunidade',
  kyc_case: 'Caso KYC',
}

export const isAuditResourceType = (value: string | undefined): value is AuditResourceType =>
  Boolean(value && Object.hasOwn(AUDIT_RESOURCE_LABEL, value))

export type AuditAction =
  | 'auth.login_succeeded'
  | 'auth.login_failed'
  | 'auth.logout'
  | 'whitelabel.created'
  | 'whitelabel.updated'
  | 'whitelabel.activated'
  | 'whitelabel.deactivated'
  | 'whitelabel_settings.updated'
  | 'smtp.updated'
  | 'smtp.test_sent'
  | 'account.paused'
  | 'admin.invited'
  | 'admin.paused'
  | 'gateway.created'
  | 'gateway.credentials_updated'
  | 'gateway.activated'
  | 'gateway.deactivated'
  | 'opportunity.status_changed'
  | 'opportunity.classification_updated'
  | 'kyc_case.decision_recorded'

export const AUDIT_ACTION_LABEL: Record<AuditAction, string> = {
  'auth.login_succeeded': 'Login realizado',
  'auth.login_failed': 'Tentativa de login recusada',
  'auth.logout': 'Logout realizado',
  'whitelabel.created': 'Whitelabel criado',
  'whitelabel.updated': 'Whitelabel atualizado',
  'whitelabel.activated': 'Whitelabel ativado',
  'whitelabel.deactivated': 'Whitelabel desativado',
  'whitelabel_settings.updated': 'Configurações do Whitelabel atualizadas',
  'smtp.updated': 'Configuração SMTP atualizada',
  'smtp.test_sent': 'Teste de envio SMTP',
  'account.paused': 'Conta pausada',
  'admin.invited': 'Administrador convidado',
  'admin.paused': 'Administrador pausado',
  'gateway.created': 'Gateway criado',
  'gateway.credentials_updated': 'Credenciais do gateway atualizadas',
  'gateway.activated': 'Gateway ativado',
  'gateway.deactivated': 'Gateway desativado',
  'opportunity.status_changed': 'Status da oportunidade alterado',
  'opportunity.classification_updated': 'Classificação da oportunidade atualizada',
  'kyc_case.decision_recorded': 'Decisão de caso KYC registrada',
}

export const AUDIT_ACTIONS = Object.keys(AUDIT_ACTION_LABEL) as AuditAction[]

export const isAuditAction = (value: string | undefined): value is AuditAction => Boolean(value && Object.hasOwn(AUDIT_ACTION_LABEL, value))

/** A field value as stored in an event. `{ redacted: true }` replaces any sensitive value. */
export type AuditValue = string | number | boolean | null | readonly string[] | { readonly redacted: true }

export type AuditFieldMap = Readonly<Record<string, AuditValue>>

export const REDACTED = { redacted: true } as const

export type AuditActor = { id: string; name: string; role: string }

/** Illustrative operators of the Control Plane (not real people, not an identity directory). */
export const AUDIT_ACTORS: readonly AuditActor[] = [
  { id: 'USR-SA-01', name: 'Super Admin', role: 'Super Admin' },
  { id: 'USR-SA-02', name: 'Analista Compliance', role: 'Compliance' },
  { id: 'USR-SA-03', name: 'Operador Financeiro', role: 'Financeiro' },
]

export const actorById = (id: string | null) => (id ? AUDIT_ACTORS.find((actor) => actor.id === id) : undefined)

export type AuditEvent = {
  id: string
  /** Super Admin operator id; null when the attempt was not authenticated. */
  actorId: string | null
  action: AuditAction
  resourceType: AuditResourceType
  resourceId: string | null
  /** Label of the resource as recorded at event time (a snapshot, not a live lookup). */
  resourceLabel: string
  /** Null for global (non-tenant) events, e.g. Control Plane login. */
  whitelabelId: string | null
  module: AuditModule
  result: AuditResult
  oldValue: AuditFieldMap | null
  newValue: AuditFieldMap | null
  /** Documentation-range IP (RFC 5737) — fictitious. */
  ip: string
  /** Generic, fictitious user agent. */
  userAgent: string
  correlationId: string
  createdAt: string
  summary: string
}

/* ---------- Reference date ("Hoje", "Últimos 7 dias") ---------- */

/**
 * Fixed prototype reference date (São Paulo calendar day). The cards and the
 * period filter are computed against it — not against the viewer's clock — so
 * the illustrative dataset always reads the same. Shown in the UI.
 */
export const AUDIT_REFERENCE_DAY = '2026-10-08'

export type AuditPeriod = 'all' | 'today' | 'last7' | 'last30'

export const AUDIT_PERIOD_LABEL: Record<AuditPeriod, string> = {
  all: 'Todo o período',
  today: 'Hoje (data de referência)',
  last7: 'Últimos 7 dias',
  last30: 'Últimos 30 dias',
}

const DAY_FORMAT = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' })

/** "YYYY-MM-DD" of an instant in São Paulo. */
export const saoPauloDay = (iso: string) => DAY_FORMAT.format(new Date(iso))

const dayNumber = (day: string) => Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10))) / 86_400_000

/** Calendar days between the event's São Paulo day and the reference day (0 = same day). */
export const daysBeforeReference = (iso: string) => dayNumber(AUDIT_REFERENCE_DAY) - dayNumber(saoPauloDay(iso))

export function inPeriod(iso: string, period: AuditPeriod) {
  if (period === 'all') return true
  const days = daysBeforeReference(iso)
  if (days < 0) return false
  return period === 'today' ? days === 0 : period === 'last7' ? days < 7 : days < 30
}

/* ---------- Routes owned by this module ---------- */

export const AUDIT_LIST_PATH = 'audit'

export const auditEventHref = (auditEventId: string) => `#/audit/${encodeURIComponent(auditEventId)}`
