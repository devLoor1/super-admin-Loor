import type { BusinessTone } from '../../whitelabel-accounts/accountModel'
import { PROTOTYPE_WHITELABELS, type Whitelabel } from '../../whitelabels/prototypeWhitelabels'

/*
 * Operation V1 — shared prototype vocabulary for Oportunidades, Investidores
 * and Empreendedores. Frontend only: nothing here is a Backend contract, a
 * workflow or a permission model.
 */

export { formatDateTime, initials, normalize } from '../../whitelabel-accounts/accountModel'

/** Rows per page in the Operation lists (presentation choice only). */
export const PAGE_SIZE = 8

export const whitelabelOf = (id: string): Whitelabel | undefined => PROTOTYPE_WHITELABELS.find((item) => item.id === id)
export const whitelabelName = (id: string) => whitelabelOf(id)?.name ?? 'Whitelabel não encontrado'

/* ---------- KYC summary (owned by Compliance, shown read-only) ---------- */

/** Restrained prototype states for the Operation UX — not the official KYC workflow. */
export type KycStatus = 'pending' | 'in_review' | 'approved'

export const KYC_META: Record<KycStatus, { label: string; tone: BusinessTone }> = {
  pending: { label: 'Pendente', tone: 'pending' },
  in_review: { label: 'Em análise', tone: 'progress' },
  approved: { label: 'Aprovado', tone: 'positive' },
}

export const KYC_PENDING_SUMMARY: Record<KycStatus, string> = {
  pending: 'Verificação ainda não concluída',
  in_review: 'Em análise pelo Compliance',
  approved: 'Nenhuma pendência informada',
}

/* ---------- Cross-domain destinations ---------- */

/**
 * Destinations that do not exist in the prototype yet. Their buttons stay
 * usable and answer with a polite notice — never a broken route or an empty
 * placeholder module.
 */
export const PENDING_MODULES = {
  investments: 'Financeiro › Investimentos',
  compliance: 'Compliance › KYC',
} as const

export type PendingModule = keyof typeof PENDING_MODULES

export const pendingModuleMessage = (module: PendingModule) =>
  `Módulo ${PENDING_MODULES[module]} ainda não implementado. Nenhuma navegação foi feita.`

/** Existing tenant Accounts screen — the safe "Ver conta" destination (no per-account deep link exists). */
export const accountsHref = (whitelabelId: string, type: 'investor' | 'entrepreneur') =>
  `#/whitelabels/${whitelabelId}/accounts?tipo=${type === 'investor' ? 'investidores' : 'empreendedores'}`

/** "Capital de Giro 2026" → shortened label for the header trail (full name stays on the page). */
export const crumbLabel = (name: string) => (name.length > 32 ? `${name.slice(0, 31).trimEnd()}…` : name)

/** "3 oportunidades" / "1 oportunidade" / "Nenhuma". */
export function countLabel(count: number, singular: string, plural: string, none: string) {
  if (count === 0) return none
  return `${count} ${count === 1 ? singular : plural}`
}

/** Sort helper: names with Intl collation, nulls last for dates. */
const COLLATOR = new Intl.Collator('pt-BR', { sensitivity: 'base' })
export const compareText = (a: string, b: string) => COLLATOR.compare(a, b)
export const compareDate = (a: string | null, b: string | null) => {
  if (a === b) return 0
  if (!a) return 1
  if (!b) return -1
  return a < b ? -1 : 1
}

export type SortDirection = 'ascending' | 'descending'
export type SortState<K extends string> = { key: K; direction: SortDirection }
