import type { StatusTone } from '../../../components/ui/StatusPill'
import type { ModalityId } from '../../finance-gateways/financeModel'
import { MODALITY_CATALOG } from '../../finance-modalities/modalitiesModel'

/*
 * OPPORTUNITY PROTOTYPE MODEL — Operation V1.
 *
 * Not a Backend contract and not the official Opportunity workflow:
 * - status: three PROTOTYPE OPERATIONAL STATES (Rascunho / Ativa / Pausada)
 *   with no transition graph;
 * - modality: consumes the existing catalog (Equity and Debt only). One
 *   selector for V1 usability; requirement/cardinality are Product decisions;
 * - segmentIds / resourceUseIds: references to the two INDEPENDENT catalogs
 *   of the opportunity's Whitelabel. Multi-selection avoids imposing a
 *   one-only rule; it is not a confirmed cardinality;
 * - entrepreneurId: one optional reference to an Operation entrepreneur
 *   (account prototype id). One selector is the V1 composition, not a
 *   confirmed cardinality;
 * - no amounts, rates, terms, schedules, fees or any financial parameter.
 */

export type OpportunityStatus = 'draft' | 'active' | 'paused'

export const OPPORTUNITY_STATUSES: OpportunityStatus[] = ['draft', 'active', 'paused']

export const OPPORTUNITY_STATUS_META: Record<OpportunityStatus, { label: string; tone: StatusTone }> = {
  draft: { label: 'Rascunho', tone: 'neutral' },
  active: { label: 'Ativa', tone: 'success' },
  paused: { label: 'Pausada', tone: 'warning' },
}

export type Opportunity = {
  /** Local prototype id (opp_proto_… seeded, opp_local_… created in this session). */
  id: string
  name: string
  description: string
  /** Frontend context/ownership in the prototype — not authoritative Backend ownership. */
  whitelabelId: string
  entrepreneurId: string | null
  modality: ModalityId
  segmentIds: string[]
  resourceUseIds: string[]
  status: OpportunityStatus
  /** ISO; illustrative for seeds, set locally on create/edit. null → "—". */
  updatedAt: string | null
}

export type OpportunityDraft = {
  name: string
  description: string
  whitelabelId: string
  entrepreneurId: string
  modality: ModalityId | ''
  segmentIds: string[]
  resourceUseIds: string[]
  status: OpportunityStatus
}

/* PROTOTYPE UX CONSTRAINTS — presentation limits only, not Backend/Product rules. */
export const NAME_MIN = 3
export const NAME_MAX = 80
export const DESCRIPTION_MAX = 300

export const EMPTY_DRAFT: OpportunityDraft = {
  name: '',
  description: '',
  whitelabelId: '',
  entrepreneurId: '',
  modality: '',
  segmentIds: [],
  resourceUseIds: [],
  status: 'draft',
}

export const draftOf = (item: Opportunity): OpportunityDraft => ({
  name: item.name,
  description: item.description,
  whitelabelId: item.whitelabelId,
  entrepreneurId: item.entrepreneurId ?? '',
  modality: item.modality,
  segmentIds: [...item.segmentIds],
  resourceUseIds: [...item.resourceUseIds],
  status: item.status,
})

export const tidy = (value: string) => value.replace(/\s+/g, ' ').trim()

export type DraftField = 'name' | 'whitelabelId' | 'description' | 'modality'
export type DraftErrors = Partial<Record<DraftField, string>>

export function validateDraft(draft: OpportunityDraft): DraftErrors {
  const errors: DraftErrors = {}
  const name = tidy(draft.name)
  if (!name) errors.name = 'Informe o nome da oportunidade.'
  else if (name.length < NAME_MIN) errors.name = `Use pelo menos ${NAME_MIN} caracteres.`
  else if (name.length > NAME_MAX) errors.name = `Use no máximo ${NAME_MAX} caracteres.`
  if (!draft.whitelabelId) errors.whitelabelId = 'Selecione o Whitelabel.'
  if (draft.description.trim().length > DESCRIPTION_MAX) errors.description = `Use no máximo ${DESCRIPTION_MAX} caracteres.`
  if (!draft.modality) errors.modality = 'Selecione a modalidade.'
  return errors
}

/** Field order used to focus the first invalid control. */
export const FIELD_ORDER: DraftField[] = ['name', 'whitelabelId', 'description', 'modality']

const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((item) => b.includes(item))

export function draftsEqual(a: OpportunityDraft, b: OpportunityDraft) {
  return (
    tidy(a.name) === tidy(b.name) &&
    a.description.trim() === b.description.trim() &&
    a.whitelabelId === b.whitelabelId &&
    a.entrepreneurId === b.entrepreneurId &&
    a.modality === b.modality &&
    a.status === b.status &&
    sameList(a.segmentIds, b.segmentIds) &&
    sameList(a.resourceUseIds, b.resourceUseIds)
  )
}

export const FIELD_LABEL = {
  name: 'Nome',
  description: 'Descrição',
  whitelabelId: 'Whitelabel',
  entrepreneurId: 'Empreendedor',
  modality: 'Modalidade',
  segmentIds: 'Segmentos',
  resourceUseIds: 'Usos dos recursos',
  status: 'Status',
} as const

/** Labels of the fields that differ — for the discard dialog and the session activity. */
export function changedFields(before: OpportunityDraft, after: OpportunityDraft): (keyof typeof FIELD_LABEL)[] {
  const changed: (keyof typeof FIELD_LABEL)[] = []
  if (tidy(before.name) !== tidy(after.name)) changed.push('name')
  if (before.description.trim() !== after.description.trim()) changed.push('description')
  if (before.whitelabelId !== after.whitelabelId) changed.push('whitelabelId')
  if (before.entrepreneurId !== after.entrepreneurId) changed.push('entrepreneurId')
  if (before.modality !== after.modality) changed.push('modality')
  if (!sameList(before.segmentIds, after.segmentIds)) changed.push('segmentIds')
  if (!sameList(before.resourceUseIds, after.resourceUseIds)) changed.push('resourceUseIds')
  if (before.status !== after.status) changed.push('status')
  return changed
}

export const modalityName = (id: ModalityId) => MODALITY_CATALOG.find((item) => item.id === id)?.name ?? id
