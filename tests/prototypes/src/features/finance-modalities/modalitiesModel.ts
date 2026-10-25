import { ChartColumn, Coins, type LucideIcon } from 'lucide-react'
import type { StatusTone } from '../../components/ui/StatusPill'
import type { Tone } from '../../components/ui/IconTile'
import {
  MODALITIES,
  MODALITY_DISPLAY_META,
  modalityDisplay,
  type ModalityDisplay,
  type ModalityId,
  type WhitelabelFinanceSettings,
} from '../finance-gateways/financeModel'

/*
 * Modalidades e Regras V1 — frontend prototype model.
 *
 * The modality catalog (Equity, Debt) and each tenant's enablement come from
 * the Finance prototype model (`financeModel.ts`), so this screen and
 * Gateways e contas never disagree. This file only adds presentation metadata,
 * a GENERIC rule-concept structure and session activity. Nothing here is a
 * Backend contract: there is no official rule catalog yet, no platform default
 * and no inheritance. Capital de Giro is not a modality (it belongs to the
 * future Segmentos / Usos dos recursos catalogs) and must not be added here.
 */

export type { ModalityId }

export type ModalityMeta = {
  id: ModalityId
  name: string
  /** Definition of the modality, not a business rule. */
  description: string
  icon: LucideIcon
  tone: Tone
}

const META: Record<ModalityId, Omit<ModalityMeta, 'id' | 'name'>> = {
  equity: { description: 'Investimento em participação societária.', icon: ChartColumn, tone: 'blue' },
  debt: { description: 'Investimento em dívida e instrumentos de crédito.', icon: Coins, tone: 'amber' },
}

/** Current catalog — derived from the Finance model (Equity and Debt only). */
export const MODALITY_CATALOG: ModalityMeta[] = MODALITIES.map((modality) => ({
  id: modality.id,
  name: modality.label,
  ...META[modality.id],
}))

/** "Equity e Debt" — the current catalog in words (stays correct if Product adds a modality). */
export const CATALOG_NAMES = new Intl.ListFormat('pt-BR', { type: 'conjunction' }).format(MODALITY_CATALOG.map((item) => item.name))

export const modalityMeta = (id: ModalityId) => MODALITY_CATALOG.find((item) => item.id === id) ?? MODALITY_CATALOG[0]

export const isEnabled = (settings: WhitelabelFinanceSettings, id: ModalityId) => settings.modalities[id] === 'enabled'

export { MODALITY_DISPLAY_META, modalityDisplay, type ModalityDisplay }

/* ---------- Dependencies (derived from Finance / Gateways) ---------- */

export type GatewayDependency = 'served' | 'pending' | 'not_evaluated'

export const GATEWAY_DEPENDENCY_META: Record<GatewayDependency, { label: string; short: string; tone: StatusTone }> = {
  served: { label: 'Atendida localmente', short: 'Gateway atendido', tone: 'success' },
  pending: { label: 'Pendente', short: 'Gateway pendente', tone: 'warning' },
  not_evaluated: { label: 'Não avaliada', short: 'Não avaliada', tone: 'muted' },
}

/** Demo rule (same as Gateways e contas): any ACTIVE local gateway marked for the modality counts — Sandbox included. */
export function gatewayDependency(settings: WhitelabelFinanceSettings, id: ModalityId): GatewayDependency {
  if (!isEnabled(settings, id)) return 'not_evaluated'
  return modalityDisplay(settings, id) === 'enabled' ? 'served' : 'pending'
}

export function servingGateways(settings: WhitelabelFinanceSettings, id: ModalityId) {
  return settings.gateways.filter((gateway) => gateway.active && gateway.modalities.includes(id))
}

/* ---------- Generic rule concepts ---------- */

/** Structural categories only — not a confirmed rule catalog. */
export type RuleCategory = 'availability' | 'eligibility' | 'operational_flow' | 'opportunity_level' | 'documents' | 'limits'

export const RULE_CATEGORIES: { id: RuleCategory; label: string; description: string }[] = [
  { id: 'availability', label: 'Disponibilidade', description: 'Se a modalidade pode ser usada por este Whitelabel.' },
  { id: 'eligibility', label: 'Elegibilidade', description: 'Quem pode participar de operações desta modalidade.' },
  { id: 'operational_flow', label: 'Fluxo operacional', description: 'Etapas de aprovação e acompanhamento da modalidade.' },
  {
    id: 'opportunity_level',
    label: 'Configuração por Oportunidade',
    description: 'O que cada Oportunidade pode ajustar dentro da modalidade (os parâmetros não são definidos aqui).',
  },
  { id: 'documents', label: 'Documentos e requisitos', description: 'Documentos e requisitos exigidos pela modalidade.' },
  { id: 'limits', label: 'Limites', description: 'Limites operacionais aplicáveis à modalidade.' },
]

/** Concepts the prototype lets the operator set (three-state: default / yes / no). */
export type ChoiceRuleKey = 'manualApproval' | 'opportunityConfig'
export type RuleChoice = 'default' | 'yes' | 'no'
export type ModalityRuleConfig = Record<ChoiceRuleKey, RuleChoice>

/**
 * - `derived`: computed from another prototype state (read-only).
 * - `choice`: editable prototype configuration (local override of an undefined default).
 * - `pending`: concept named only — Product definition pending, nothing editable.
 */
export type RuleConcept =
  | { key: 'available'; kind: 'derived'; category: RuleCategory; label: string; description: string }
  | { key: ChoiceRuleKey; kind: 'choice'; category: RuleCategory; label: string; description: string }
  | { key: 'eligibility' | 'documents' | 'limits'; kind: 'pending'; category: RuleCategory; label: string; description: string }

export const RULE_CONCEPTS: RuleConcept[] = [
  {
    key: 'available',
    kind: 'derived',
    category: 'availability',
    label: 'Disponível para este Whitelabel',
    description: 'Segue a habilitação local da modalidade (Visão geral).',
  },
  {
    key: 'eligibility',
    kind: 'pending',
    category: 'eligibility',
    label: 'Critérios de elegibilidade',
    description: 'Critérios ainda não definidos por Produto.',
  },
  {
    key: 'manualApproval',
    kind: 'choice',
    category: 'operational_flow',
    label: 'Exige aprovação manual',
    description: 'Conceito genérico: se operações desta modalidade passam por aprovação manual antes de seguir.',
  },
  {
    key: 'opportunityConfig',
    kind: 'choice',
    category: 'opportunity_level',
    label: 'Permite configuração no nível da Oportunidade',
    description: 'Conceito genérico: se cada Oportunidade pode ajustar parâmetros próprios desta modalidade.',
  },
  {
    key: 'documents',
    kind: 'pending',
    category: 'documents',
    label: 'Requisitos de documentação',
    description: 'Requisitos documentais pendentes de definição.',
  },
  {
    key: 'limits',
    kind: 'pending',
    category: 'limits',
    label: 'Limites',
    description: 'Limites pendentes de definição de Produto.',
  },
]

export const CHOICE_CONCEPTS = RULE_CONCEPTS.filter(
  (concept): concept is Extract<RuleConcept, { kind: 'choice' }> => concept.kind === 'choice',
)
export const PENDING_CONCEPTS = RULE_CONCEPTS.filter((concept) => concept.kind === 'pending')

export const CHOICE_LABEL: Record<RuleChoice, string> = {
  default: 'Padrão não definido',
  yes: 'Sim',
  no: 'Não',
}

export const EMPTY_RULES: ModalityRuleConfig = { manualApproval: 'default', opportunityConfig: 'default' }

/** Number of editable concepts holding a local override (yes/no) for one modality. */
export const localOverrides = (config: ModalityRuleConfig) =>
  CHOICE_CONCEPTS.filter((concept) => config[concept.key] !== 'default').length

/** Section-level origin: any override → "Configuração local", otherwise "Padrão não definido". */
export const rulesOrigin = (config: ModalityRuleConfig): { label: string; tone: StatusTone } =>
  localOverrides(config)
    ? { label: 'Configuração local', tone: 'neutral' }
    : { label: 'Padrão não definido', tone: 'muted' }

/** Human summary of what changed, for session activity (labels and values only). */
export function describeRuleChanges(before: ModalityRuleConfig, after: ModalityRuleConfig) {
  return CHOICE_CONCEPTS.filter((concept) => before[concept.key] !== after[concept.key])
    .map((concept) => `${concept.label}: ${CHOICE_LABEL[before[concept.key]]} → ${CHOICE_LABEL[after[concept.key]]}`)
    .join('; ')
}

/* ---------- Session activity + drafts ---------- */

export type ModalityActivityKind = 'modality_enabled' | 'modality_disabled' | 'rules_updated' | 'rules_discarded'

/** Session-only feedback — not an audit trail (no operator, no persistence). */
export type ModalityActivity = {
  id: string
  kind: ModalityActivityKind
  modalityId: ModalityId
  title: string
  detail?: string
  at: string
}

/** Drafts tracked by the unsaved-change guard on this page. */
export type ModalityDraftKey = 'modality-rules'

export const MODALITY_DRAFT_LABEL: Record<ModalityDraftKey, string> = {
  'modality-rules': 'Regras da modalidade',
}

export type ModalityStatusFilter = ModalityDisplay | 'all'
