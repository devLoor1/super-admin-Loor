import { ApiError } from '../../../lib/api'
import { parseWhitelabel, type WhitelabelRecord } from '../whitelabelApi'
import type { CreateWhitelabelCommand, UpdateWhitelabelNameCommand, WhitelabelCommand } from './whitelabelCommands'
import { FIELD_LABELS, tidyName, type CreateFieldKey } from './whitelabelForm'
import type { WhitelabelMutationOperation } from './whitelabelMutationContract'

/*
 * How a FUTURE Whitelabel write response must be read — PURE, no transport.
 * Exercised today only by the mock-only tests in `scripts/`. Mock responses
 * are fixtures, not proof of the real Core envelope.
 *
 * Source facts this relies on (Nest `aea5392`, not deployment evidence):
 * - guards (401 / 403), the throttler (429) and the ValidationPipe (400) run
 *   before the handler → those refusals happen before any Core call;
 * - Core 4xx is forwarded with its status (Core 401 / 403 → 503), except
 *   E_SLUG_TAKEN → 409; legacy 422 with that code is also understood;
 * - Core 404 → 404; Core 5xx, timeout or unreachable → 503;
 * - Audit is now best-effort after Core succeeds. A mapping failure or an
 *   older deployed version's Audit failure can still follow an applied change;
 * - success is `{ data: mapped ?? rawCoreData }` — a raw Core body cannot be
 *   parsed as a Control Plane Whitelabel.
 * So a 5xx, a timeout, a network failure or an unreadable 2xx never mean
 * "not applied": they are UNCERTAIN and only an authoritative read-back
 * decides. Never an automatic retry.
 */

/** What a future transport hands back: a parsed 2xx body, or the error it threw (an `ApiError` from the shared client). */
export type MutationTransportResult = Readonly<{ ok: true; body: unknown }> | Readonly<{ ok: false; error: unknown }>

export type RejectReason = 'validation' | 'unprocessable' | 'slug-taken' | 'session' | 'forbidden' | 'not-found' | 'rate-limited' | 'refused'
export type UncertainCause = 'server-error' | 'unavailable' | 'timeout' | 'network' | 'malformed' | 'unverified-response' | 'unknown'

type OutcomeBase = Readonly<{ operation: WhitelabelMutationOperation; targetId: string | null; correlationId?: string }>

export type MutationOutcome =
  /** 2xx with a readable Whitelabel matching the command (create: slug, name and URL base; edit: id and new name). */
  | (OutcomeBase & Readonly<{ state: 'confirmed'; record: WhitelabelRecord }>)
  /** Refused before or by the Core: not applied. */
  | (OutcomeBase & Readonly<{ state: 'rejected'; reason: RejectReason; status: number; fields: readonly CreateFieldKey[]; code?: string }>)
  /** No confirmation either way: authoritative read-back required before anything else. */
  | (OutcomeBase & Readonly<{ state: 'uncertain'; cause: UncertainCause; status: number; next: 'authoritative-readback' }>)
  /** Pre-submit check: the record changed after the edit started. Nothing was sent. */
  | (OutcomeBase & Readonly<{ state: 'stale'; latest: WhitelabelRecord }>)

const FIELD_IN_MESSAGE = /(?:^|, )(name|slug|baseUrl) /g

/** Field keys named by Nest ValidationPipe messages (`"slug must match …"`). The text itself is never shown. */
function fieldsFrom(error: ApiError, operation: WhitelabelMutationOperation): CreateFieldKey[] {
  const found = new Set<CreateFieldKey>()
  for (const match of error.message.matchAll(FIELD_IN_MESSAGE)) found.add(match[1] as CreateFieldKey)
  const allowed: readonly CreateFieldKey[] = operation === 'create' ? ['name', 'slug', 'baseUrl'] : ['name']
  return allowed.filter((key) => found.has(key))
}

function identityMatches(command: WhitelabelCommand, record: WhitelabelRecord) {
  // Create: the same slug AND the requested values — the read-back applies the same rule, so a
  // response and a read-back of the same record can never disagree.
  if (command.operation === 'create') {
    return record.slug === command.body.slug && tidyName(record.name) === command.body.name && record.baseUrl === command.body.baseUrl
  }
  return record.id === command.targetId && tidyName(record.name) === command.body.name
}

export function interpretMutationResult(command: WhitelabelCommand, result: MutationTransportResult): MutationOutcome {
  const base = { operation: command.operation, targetId: command.targetId }
  if (result.ok) {
    let record: WhitelabelRecord | null = null
    try {
      const envelope = result.body
      if (typeof envelope === 'object' && envelope !== null && !Array.isArray(envelope) && 'data' in envelope) {
        record = parseWhitelabel((envelope as { data: unknown }).data)
      }
    } catch {
      record = null
    }
    if (record && identityMatches(command, record)) {
      return Object.freeze({ ...base, targetId: record.id, state: 'confirmed', record })
    }
    return Object.freeze({ ...base, state: 'uncertain', cause: 'unverified-response', status: 200, next: 'authoritative-readback' })
  }

  const error = result.error
  if (!(error instanceof ApiError)) {
    return Object.freeze({ ...base, state: 'uncertain', cause: 'unknown', status: 0, next: 'authoritative-readback' })
  }
  const correlationId = error.correlationId
  if (error.kind !== 'http') {
    const cause: UncertainCause = error.kind === 'timeout' ? 'timeout' : error.kind === 'network' ? 'network' : 'malformed'
    return Object.freeze({ ...base, correlationId, state: 'uncertain', cause, status: error.status, next: 'authoritative-readback' })
  }
  const status = error.status
  if (status >= 500 || status < 400) {
    const cause: UncertainCause = status >= 502 && status <= 504 ? 'unavailable' : status >= 500 ? 'server-error' : 'unverified-response'
    return Object.freeze({ ...base, correlationId, state: 'uncertain', cause, status, next: 'authoritative-readback' })
  }

  const code = error.code
  let reason: RejectReason
  let fields: CreateFieldKey[] = []
  if (status === 400 && code !== 'INVALID_WHITELABEL_ID') {
    reason = 'validation'
    fields = fieldsFrom(error, command.operation)
  } else if (status === 401) reason = 'session'
  else if (status === 403) reason = 'forbidden'
  else if (status === 404 && command.operation === 'update-name') reason = 'not-found'
  else if ((status === 409 || status === 422) && command.operation === 'create' && code === 'E_SLUG_TAKEN') {
    reason = 'slug-taken'
    fields = ['slug']
  } else if (status === 422) reason = 'unprocessable'
  else if (status === 429) reason = 'rate-limited'
  else reason = 'refused'
  return Object.freeze({ ...base, correlationId, state: 'rejected', reason, status, fields: Object.freeze(fields), code })
}

/* ---------- authoritative read-back after an uncertain outcome ---------- */

export type ReadbackResult = 'applied' | 'not-applied' | 'diverged' | 'inconclusive'
export type CreateReadback = Readonly<{ rows: readonly WhitelabelRecord[]; complete: boolean }>

/**
 * Create: rows of `GET /whitelabels?search=<slug>`. Only an exact slug match
 * counts. Absence is meaningful only if the injected read port guarantees
 * complete search coverage (never just the first page). A matching record
 * with other values, or multiple exact matches, is `diverged` (another
 * record owns the slug, or Core changed the values) — never "created".
 */
export function reconcileCreateReadback(command: CreateWhitelabelCommand, search: CreateReadback): Readonly<{ result: ReadbackResult; record?: WhitelabelRecord }> {
  const matches = search.rows.filter((row) => row.slug === command.body.slug)
  if (matches.length > 1) return Object.freeze({ result: 'diverged' })
  const record = matches[0]
  if (!record) return Object.freeze({ result: search.complete === true ? 'not-applied' : 'inconclusive' })
  const same = tidyName(record.name) === command.body.name && record.baseUrl === command.body.baseUrl
  return Object.freeze({ result: same ? 'applied' : 'diverged', record })
}

/**
 * Name edit: a fresh `GET /whitelabels/:id`. The new name → applied; the
 * name the edit started from → not applied; anything else → diverged (a
 * concurrent change — the Backend has no version / ETag).
 */
export function reconcileNameReadback(command: UpdateWhitelabelNameCommand, record: WhitelabelRecord): ReadbackResult {
  if (record.id !== command.targetId) return 'diverged'
  const name = tidyName(record.name)
  if (name === command.body.name) return 'applied'
  if (name === tidyName(command.baseline.name)) return 'not-applied'
  return 'diverged'
}

/** Pre-submit freshness: the authoritative record still matches what the edit started from. */
export function isCommandStale(command: UpdateWhitelabelNameCommand, latest: WhitelabelRecord) {
  return latest.id !== command.targetId || latest.name !== command.baseline.name || latest.updatedAt !== command.baseline.updatedAt
}

/* ---------- presentation (safe copy only; raw Backend text is never shown) ---------- */

export type OutcomeTone = 'success' | 'danger' | 'warning'

export type MutationOutcomeView = Readonly<{
  state: MutationOutcome['state']
  tone: OutcomeTone
  title: string
  description: string
  /** The only safe next step. */
  next: string
  fields: readonly CreateFieldKey[]
  correlationId?: string
  /** A new manual submission is reasonable without a read-back first. */
  allowsResubmit: boolean
}>

const UNCERTAIN_CAUSE: Record<UncertainCause, string> = {
  'server-error': 'O Control Plane respondeu com erro interno. A alteração pode ter sido aplicada no Core antes da falha (por exemplo, no mapeamento da resposta ou na auditoria em versões anteriores).',
  unavailable: 'O Control Plane informou que o Core ficou indisponível ou não respondeu a tempo. O Core pode ter recebido a solicitação.',
  timeout: 'O Control Plane não respondeu a tempo. A solicitação pode ter sido processada.',
  network: 'A conexão caiu antes da resposta. A solicitação pode ter chegado ao Control Plane.',
  malformed: 'A resposta não pôde ser lida.',
  'unverified-response': 'A resposta não confirmou o registro esperado.',
  unknown: 'A solicitação terminou sem uma resposta reconhecível.',
}

export function describeMutationOutcome(outcome: MutationOutcome): MutationOutcomeView {
  const create = outcome.operation === 'create'
  const common = { state: outcome.state, correlationId: outcome.correlationId, fields: [] as readonly CreateFieldKey[] }
  switch (outcome.state) {
    case 'confirmed':
      return Object.freeze({
        ...common,
        tone: 'success',
        title: create ? 'Criação confirmada pelo Control Plane' : 'Novo nome confirmado pelo Control Plane',
        description: create
          ? `O Control Plane retornou o Whitelabel ${outcome.record.name} (ID ${outcome.record.id}, slug ${outcome.record.slug}).`
          : `O Control Plane retornou o Whitelabel ID ${outcome.record.id} com o nome ${outcome.record.name}.`,
        next: 'Recarregar a lista e o detalhe a partir do Control Plane.',
        allowsResubmit: false,
      })
    case 'stale':
      return Object.freeze({
        ...common,
        tone: 'warning',
        title: 'Dados desatualizados',
        description: `O Whitelabel ID ${outcome.latest.id} foi alterado no Control Plane depois que a edição começou (nome atual: ${outcome.latest.name}). Nada foi enviado.`,
        next: 'Feche e reabra a edição a partir dos valores atuais.',
        allowsResubmit: false,
      })
    case 'uncertain':
      return Object.freeze({
        ...common,
        tone: 'warning',
        title: 'Resultado não confirmado',
        description: `${UNCERTAIN_CAUSE[outcome.cause]} ${
          create ? 'O Whitelabel pode ou não ter sido criado.' : 'O nome pode ou não ter sido alterado.'
        }`,
        next: create
          ? 'Não envie de novo: confira primeiro a lista pelo identificador (slug).'
          : 'Não envie de novo: recarregue o detalhe e compare o nome.',
        allowsResubmit: false,
      })
    case 'rejected':
      return Object.freeze({ ...common, ...rejectedCopy(outcome, create), fields: outcome.fields })
  }
}

function rejectedCopy(outcome: Extract<MutationOutcome, { state: 'rejected' }>, create: boolean) {
  const subject = create ? 'criar Whitelabels' : 'editar o nome de Whitelabels'
  const fieldList = outcome.fields.map((key) => FIELD_LABELS[key]).join(', ')
  const base = { tone: 'danger' as const }
  switch (outcome.reason) {
    case 'validation':
      return {
        ...base,
        title: 'Dados recusados pelo Control Plane',
        description: fieldList ? `O Control Plane não aceitou: ${fieldList}. Nada foi alterado.` : 'O Control Plane não aceitou os dados enviados. Nada foi alterado.',
        next: 'Corrija os campos indicados e revise a solicitação de novo.',
        allowsResubmit: true,
      }
    case 'slug-taken':
      return {
        ...base,
        title: 'Identificador já em uso',
        description: 'O Core informou que este identificador (slug) já pertence a outro Whitelabel. Nada foi criado.',
        next: 'Escolha outro identificador (slug).',
        allowsResubmit: true,
      }
    case 'unprocessable':
      return {
        ...base,
        title: create ? 'Criação recusada pelo Core' : 'Novo nome recusado pelo Core',
        description: create
          ? 'O Core recusou os dados (HTTP 422) sem um motivo reconhecível. Uma causa possível é o identificador (slug) já estar em uso.'
          : 'O Core recusou o novo nome (HTTP 422) sem um motivo reconhecível.',
        next: create ? 'Confira a lista pelo identificador (slug) antes de revisar os dados.' : 'Revise o nome antes de tentar de novo.',
        allowsResubmit: true,
      }
    case 'session':
      return {
        ...base,
        title: 'Sessão encerrada',
        description: 'Sua sessão não é mais válida e a solicitação não foi aceita.',
        next: 'Entre novamente.',
        allowsResubmit: false,
      }
    case 'forbidden':
      return {
        ...base,
        title: 'Ação não permitida',
        description: `Seu perfil não tem permissão para ${subject}. A solicitação não foi aceita.`,
        next: 'Somente o perfil Super Admin pode fazer esta alteração.',
        allowsResubmit: false,
      }
    case 'not-found':
      return {
        ...base,
        title: 'Whitelabel não encontrado',
        description: `O Whitelabel ID ${outcome.targetId} não existe mais no Control Plane. Nada foi alterado.`,
        next: 'Atualize a lista.',
        allowsResubmit: false,
      }
    case 'rate-limited':
      return {
        ...base,
        title: 'Muitas solicitações',
        description: 'O Control Plane limitou temporariamente as solicitações. A solicitação não foi aceita.',
        next: 'Aguarde alguns instantes antes de tentar de novo.',
        allowsResubmit: true,
      }
    case 'refused':
      return {
        ...base,
        title: 'Solicitação recusada',
        description: `O Control Plane recusou a solicitação (HTTP ${outcome.status}). Nada foi alterado.`,
        next: 'Revise os dados ou atualize a lista.',
        allowsResubmit: false,
      }
  }
}

export type ReadbackView = Readonly<{ tone: OutcomeTone; title: string; description: string; allowsResubmit: boolean }>

export function describeReadback(operation: WhitelabelMutationOperation, result: ReadbackResult): ReadbackView {
  if (result === 'applied') {
    return Object.freeze({
      tone: 'success',
      title: operation === 'create' ? 'Criação encontrada na conferência' : 'Novo nome encontrado na conferência',
      description: 'A leitura do Control Plane mostra os valores solicitados. Não envie de novo.',
      allowsResubmit: false,
    })
  }
  if (result === 'not-applied') {
    return Object.freeze({
      tone: 'warning',
      title: 'Alteração não encontrada na conferência',
      description:
        operation === 'create'
          ? 'Nenhum Whitelabel com este identificador (slug) aparece no Control Plane. Uma nova solicitação manual pode ser revisada.'
          : 'O Control Plane ainda mostra o nome anterior. Uma nova solicitação manual pode ser revisada.',
      allowsResubmit: true,
    })
  }
  return Object.freeze({
    tone: 'danger',
    title: 'Valores diferentes do esperado',
    description:
      operation === 'create'
        ? 'Existe um Whitelabel com este identificador (slug), mas com outros valores. Não envie de novo; verifique o registro.'
        : 'O Control Plane mostra um nome diferente do anterior e do solicitado (alteração concorrente). Reabra a edição a partir dos valores atuais.',
    allowsResubmit: false,
  })
}
