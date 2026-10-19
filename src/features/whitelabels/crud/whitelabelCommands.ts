import { isServerWhitelabelId, type WhitelabelRecord } from '../whitelabelApi'
import { nameChange, nameError, normalizeCreateDraft, validateCreate, type CreateDraft, type CreateErrors, type NameDraft } from './whitelabelForm'

/*
 * Pure command builders for the two prepared Whitelabel writes.
 *
 * A command is DATA: the allowlisted payload and its target. Building one
 * never sends anything, never reads the network and never changes the draft
 * or the record it was built from. Review screens, the default-OFF guarded
 * transport and the synthetic tests reuse these builders.
 */

/** Exactly the three `CreateWhitelabelDto` fields — never id, status, active, timestamps, relations, unknown keys or null. */
export type CreateWhitelabelBody = Readonly<{ name: string; slug: string; baseUrl: string }>
/** Exactly `{ name }` — the only `UpdateWhitelabelDto` field this UI may send. */
export type UpdateWhitelabelNameBody = Readonly<{ name: string }>

export type CreateWhitelabelCommand = Readonly<{
  operation: 'create'
  /** Documentation label shown in the review; not a request option. */
  route: 'POST /api/whitelabels'
  targetId: null
  body: CreateWhitelabelBody
}>

export type UpdateWhitelabelNameCommand = Readonly<{
  operation: 'update-name'
  route: `PATCH /api/whitelabels/${string}`
  /** Taken from the selected, authoritative record — never from the draft. */
  targetId: string
  /** What the edit started from (authoritative detail): used to detect a stale record and to reconcile a read-back. */
  baseline: Readonly<{ name: string; updatedAt: string | null; slug: string; baseUrl: string | null }>
  body: UpdateWhitelabelNameBody
}>

export type WhitelabelCommand = CreateWhitelabelCommand | UpdateWhitelabelNameCommand

export type CreateCommandResult =
  | Readonly<{ ok: true; command: CreateWhitelabelCommand }>
  | Readonly<{ ok: false; errors: CreateErrors }>

export function buildCreateCommand(draft: Readonly<CreateDraft>): CreateCommandResult {
  const errors = validateCreate(draft)
  if (Object.keys(errors).length) return Object.freeze({ ok: false, errors: Object.freeze(errors) })
  const value = normalizeCreateDraft(draft)
  const body: CreateWhitelabelBody = Object.freeze({ name: value.name, slug: value.slug, baseUrl: value.baseUrl })
  return Object.freeze({ ok: true, command: Object.freeze({ operation: 'create', route: 'POST /api/whitelabels', targetId: null, body }) })
}

export type NameCommandRefusal = 'invalid-target' | 'target-mismatch' | 'invalid-name' | 'unchanged'

export type NameCommandResult =
  | Readonly<{ ok: true; command: UpdateWhitelabelNameCommand }>
  | Readonly<{ ok: false; reason: NameCommandRefusal; message?: string }>

/**
 * `selectedId` is the identity on screen (URL / detail). The record must be
 * that same Whitelabel: a draft opened for A can never produce a command for
 * B, and a stale draft can never be redirected.
 */
export function buildNameUpdateCommand(input: Readonly<{ selectedId: string | null; record: Pick<WhitelabelRecord, 'id' | 'name' | 'updatedAt' | 'slug' | 'baseUrl'>; draft: Readonly<NameDraft> }>): NameCommandResult {
  const { selectedId, record, draft } = input
  if (!isServerWhitelabelId(record.id)) return Object.freeze({ ok: false, reason: 'invalid-target' })
  if (selectedId !== record.id) return Object.freeze({ ok: false, reason: 'target-mismatch' })
  const change = nameChange(record, draft)
  if (!change) return Object.freeze({ ok: false, reason: 'unchanged' })
  const message = nameError(change.after)
  if (message) return Object.freeze({ ok: false, reason: 'invalid-name', message })
  return Object.freeze({
    ok: true,
    command: Object.freeze({
      operation: 'update-name',
      route: `PATCH /api/whitelabels/${record.id}`,
      targetId: record.id,
      baseline: Object.freeze({ name: record.name, updatedAt: record.updatedAt, slug: record.slug, baseUrl: record.baseUrl }),
      body: Object.freeze({ name: change.after }),
    }),
  })
}
