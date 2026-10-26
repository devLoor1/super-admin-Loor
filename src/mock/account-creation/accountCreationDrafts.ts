import { EMPTY_ACCOUNT_DRAFT, type AccountCreationDraft, type ParticipantKind } from './accountCreationModel'

/** In-memory, tab-only drafts, isolated by exact tenant AND account kind. No credential is stored. */
const drafts = new Map<string, Readonly<AccountCreationDraft>>()
const listeners = new Set<() => void>()
function key(tenantId: string, kind: ParticipantKind) {
  if (!/^[1-9]\d*$/.test(tenantId) || !Number.isSafeInteger(Number(tenantId)) || !['investor', 'entrepreneur'].includes(kind)) throw new Error('Invalid mock draft scope')
  return `${tenantId}:${kind}`
}
export const subscribeAccountDrafts = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
function changed() { for (const listener of listeners) listener() }
export function getAccountDraft(tenantId: string, kind: ParticipantKind): Readonly<AccountCreationDraft> { return drafts.get(key(tenantId, kind)) ?? EMPTY_ACCOUNT_DRAFT }
export function saveAccountDraft(tenantId: string, kind: ParticipantKind, patch: Partial<AccountCreationDraft>) {
  const next = { ...getAccountDraft(tenantId, kind) }
  for (const field of ['full_name', 'email', 'phone', 'investor_type'] as const) {
    if (Object.hasOwn(patch, field) && typeof patch[field] === 'string') {
      if (field === 'investor_type') { if (patch[field] === 'pessoa_fisica' || patch[field] === 'pessoa_juridica') next[field] = patch[field] }
      else next[field] = patch[field]!
    }
  }
  drafts.set(key(tenantId, kind), Object.freeze(next)); changed()
}
export function hasAccountDraft(tenantId: string, kind: ParticipantKind) {
  const draft = getAccountDraft(tenantId, kind)
  return !!(draft.full_name || draft.email || draft.phone || kind === 'investor' && draft.investor_type !== 'pessoa_fisica')
}
export function discardAccountDraft(tenantId: string, kind: ParticipantKind) { if (drafts.delete(key(tenantId, kind))) changed() }
export function resetAccountDrafts() { if (drafts.size) { drafts.clear(); changed() } }
/** Bind at MockApp lifetime, including Login and screens where no creation form is mounted. */
export function watchAccountDraftSession(subscribe: (listener: () => void) => () => void) { return subscribe(resetAccountDrafts) }
