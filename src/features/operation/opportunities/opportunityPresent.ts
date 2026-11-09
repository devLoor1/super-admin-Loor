import type { StatusTone } from '../../../components/ui/StatusPill'
import { formatWhitelabelDate } from '../../whitelabels/whitelabelApi'

/*
 * Opportunities presentation — labels for Backend tokens. Known tokens get a
 * neutral, factual label; an unknown token is shown exactly as sent (never
 * converted into a different known state). No value is derived or computed.
 */

type Meta = { label: string; tone: StatusTone }

const STATUS: Record<string, Meta> = {
  review: { label: 'Em análise', tone: 'warning' },
  active: { label: 'Ativa', tone: 'success' },
  finished: { label: 'Encerrada', tone: 'neutral' },
  archived: { label: 'Arquivada', tone: 'muted' },
}

export const opportunityStatusMeta = (status: string): Meta => (Object.hasOwn(STATUS, status) ? STATUS[status] : { label: status, tone: 'muted' })

const MODALITY: Record<string, string> = { equity: 'Equity', debt: 'Debt' }
export const modalityLabel = (modality: string) => (Object.hasOwn(MODALITY, modality) ? MODALITY[modality] : modality)

const FUNDRAISING: Record<string, string> = {
  reached_minimum_goal: 'Meta mínima atingida',
  did_not_reach_minimum_goal: 'Meta mínima não atingida',
}
/** A goal flag reported by the Backend — not a progress amount or percentage. */
export const fundraisingLabel = (value: string | null) =>
  value === null ? 'Não informado' : Object.hasOwn(FUNDRAISING, value) ? FUNDRAISING[value] : value

export const privacyLabel = (value: boolean | null) => (value === null ? 'Não informado' : value ? 'Privada' : 'Pública')

export const SORT_LABEL: Record<string, string> = {
  createdAt: 'Criada em',
  updatedAt: 'Atualizada em',
  name: 'Nome',
  status: 'Status',
  dueAt: 'Prazo',
}

export const ORDER_LABEL: Record<string, Record<'asc' | 'desc', string>> = {
  createdAt: { desc: 'mais recente', asc: 'mais antiga' },
  updatedAt: { desc: 'mais recente', asc: 'mais antiga' },
  name: { asc: 'A–Z', desc: 'Z–A' },
  // Ordered by the Backend status token (not by the Portuguese label shown).
  status: { asc: 'ordem do Control Plane', desc: 'ordem inversa do Control Plane' },
  dueAt: { asc: 'mais próximo', desc: 'mais distante' },
}

export const opportunityDate = (value: string | null, withTime = false) => formatWhitelabelDate(value, withTime)

export const OPPORTUNITY_NAME_FALLBACK = 'Oportunidade sem nome informado'
export const opportunityName = (record: { name: string | null; id: string }) => record.name ?? `${OPPORTUNITY_NAME_FALLBACK} (#${record.id})`

const COUNT_FORMAT = new Intl.NumberFormat('pt-BR')
export const formatCount = (value: number) => COUNT_FORMAT.format(value)
