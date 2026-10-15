import { ApiError } from '../../lib/api'
import { isMenuId, MENU_VISIBILITY_IDS, type MenuId } from './menuRegistry'
import { mapFrom, type VisibilityMap } from './visibilityModel'

/*
 * Menu Visibility — FUTURE Backend contract, CANDIDATE TYPES ONLY.
 *
 * NOT INTEGRATED. This module has no request code and nothing here is sent.
 * Reference endpoint proposal from the requirement (homolog environment):
 *
 *   GET /api/homolog/menu-visibility   → { data: { scope, visibility, updatedAt, updatedBy } }
 *   PUT /api/homolog/menu-visibility   ← { visibility: Record<MenuId, boolean> }
 *
 * Every rule marked PENDING below is a candidate until the Backend confirms
 * it. Integrating later means: confirm the contract, add an authenticated GET
 * and PUT in a Menu Visibility API module, replace the prototype source, and
 * apply the effective map through ONE central resolver (sidebar, shortcuts
 * and direct routes) — not through this management screen.
 */

export const MENU_VISIBILITY_CONTRACT = {
  integrated: false,
  environment: 'homolog',
  getEndpoint: 'GET /api/homolog/menu-visibility',
  putEndpoint: 'PUT /api/homolog/menu-visibility',
  /** Global for the environment: not per Whitelabel, user, role, session or device. */
  scope: 'global',
  /** PENDING: PUT receives the complete normalized map (not a partial PATCH). */
  putShape: 'full-map-pending',
  /** PENDING (DEFAULT-VISIBLE PENDING BACKEND CONFIRMATION): a known ID without a stored value is visible. */
  missingKnownId: 'default-visible-pending',
  /** PENDING: unknown IDs in a response are ignored (reported as contract drift), never rendered. */
  unknownId: 'ignore-pending',
} as const

/** Candidate `GET` response (not requested). `visibility` may contain IDs this frontend does not know. */
export type MenuVisibilityGetResponseCandidate = {
  data: {
    scope: 'global'
    visibility: Record<string, unknown>
    updatedAt: string | null
    updatedBy: string | null
  }
}

/** Candidate `PUT` body (not sent): the complete map of every known stable ID. */
export type MenuVisibilityPutRequestCandidate = { visibility: Record<MenuId, boolean> }

/** What a future PUT would carry — shown for review, never sent. Full map in registry order. */
export function putRequestPreview(map: VisibilityMap): MenuVisibilityPutRequestCandidate {
  const visibility = {} as Record<MenuId, boolean>
  for (const id of MENU_VISIBILITY_IDS) visibility[id] = map[id]
  return { visibility }
}

export type NormalizedVisibility =
  | {
      ok: true
      map: VisibilityMap
      /** Response keys outside the approved registry: ignored, reported as drift (PENDING). */
      unknownIds: string[]
      /** Known IDs absent from the response, shown as visible (DEFAULT-VISIBLE PENDING). */
      defaultedIds: MenuId[]
      updatedAt: string | null
      updatedBy: string | null
    }
  | { ok: false; reason: 'malformed' }

/**
 * Prepared normalization of a future GET payload (exercised by checks only).
 * The known registry stays authoritative: no label, route or new entry is
 * ever taken from the Backend. A known ID with a non-boolean value makes the
 * payload malformed (nothing applied) rather than guessing a value.
 */
export function normalizeVisibilityCandidate(payload: unknown): NormalizedVisibility {
  const data = isRecord(payload) && isRecord(payload.data) ? payload.data : null
  if (!data || data.scope !== 'global' || !isRecord(data.visibility)) return { ok: false, reason: 'malformed' }
  const visibility = data.visibility
  const unknownIds = Object.keys(visibility).filter((key) => !isMenuId(key))
  const defaultedIds: MenuId[] = []
  for (const id of MENU_VISIBILITY_IDS) {
    const value = visibility[id]
    if (value === undefined) defaultedIds.push(id)
    else if (typeof value !== 'boolean') return { ok: false, reason: 'malformed' }
  }
  return {
    ok: true,
    map: mapFrom((id) => (typeof visibility[id] === 'boolean' ? (visibility[id] as boolean) : true)),
    unknownIds,
    defaultedIds,
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : null,
    updatedBy: typeof data.updatedBy === 'string' ? data.updatedBy : null,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/* ---------- future error presentation (not bound to any request yet) ---------- */

export type VisibilityOperation = 'load' | 'save'

export type VisibilityErrorKind = 'session' | 'forbidden' | 'invalid' | 'conflict' | 'unavailable'

export type VisibilityErrorView = {
  kind: VisibilityErrorKind
  title: string
  description: string
  /** Whether trying again can plausibly succeed. */
  retryable: boolean
  correlationId?: string
}

/**
 * Maps a future GET / PUT failure to safe copy (never a raw Backend message).
 * 401 stays with the canonical session layer; the view only names it.
 * On save, no response, a timeout, a 5xx or an unreadable answer does not
 * prove the change was not applied: the copy says so.
 */
export function describeVisibilityError(error: unknown, operation: VisibilityOperation): VisibilityErrorView {
  const uncertainSave: VisibilityErrorView = {
    kind: 'unavailable',
    title: 'Não foi possível confirmar o salvamento',
    description:
      'O Control Plane não confirmou a gravação. A configuração pode ou não ter sido aplicada: recarregue a configuração antes de tentar novamente.',
    retryable: true,
  }
  if (!(error instanceof ApiError)) {
    return operation === 'save'
      ? uncertainSave
      : { kind: 'unavailable', title: 'Não foi possível exibir a configuração', description: 'Ocorreu um erro inesperado. Tente novamente.', retryable: true }
  }
  const correlationId = error.correlationId
  if (operation === 'save' && (error.kind !== 'http' || error.status >= 500)) return { ...uncertainSave, correlationId }
  if (error.kind === 'network' || error.kind === 'timeout') {
    return {
      kind: 'unavailable',
      title: 'Sem resposta do Control Plane',
      description: 'Não foi possível carregar a configuração global. Verifique a conexão e tente novamente.',
      retryable: true,
      correlationId,
    }
  }
  if (error.kind === 'malformed') {
    return {
      kind: 'unavailable',
      title: 'Resposta inesperada do Control Plane',
      description: 'A configuração recebida não está no formato esperado; nada foi exibido para não mostrar uma visibilidade incorreta.',
      retryable: true,
      correlationId,
    }
  }
  if (error.status >= 500) {
    return {
      kind: 'unavailable',
      title: 'Visibilidade dos módulos indisponível',
      description: 'O Control Plane não conseguiu entregar a configuração global agora. Tente novamente em instantes.',
      retryable: true,
      correlationId,
    }
  }
  if (error.status === 401) {
    return { kind: 'session', title: 'Sessão encerrada', description: 'Sua sessão expirou. Entre novamente.', retryable: false, correlationId }
  }
  if (error.status === 403) {
    return {
      kind: 'forbidden',
      title: 'Ação não permitida',
      description:
        operation === 'load'
          ? 'Seu perfil de operador não tem permissão para consultar a visibilidade dos módulos.'
          : 'Seu perfil de operador não tem permissão para alterar a visibilidade dos módulos.',
      retryable: false,
      correlationId,
    }
  }
  if (operation === 'save' && (error.status === 400 || error.status === 422)) {
    return {
      kind: 'invalid',
      title: 'Configuração recusada pelo Control Plane',
      description: 'O mapa de visibilidade enviado não foi aceito. Nenhuma alteração deve ser considerada aplicada.',
      retryable: false,
      correlationId,
    }
  }
  if (operation === 'save' && error.status === 409) {
    return {
      kind: 'conflict',
      title: 'A configuração mudou desde a leitura',
      description: 'Outra alteração foi registrada antes desta. Recarregue a configuração e revise o rascunho.',
      retryable: false,
      correlationId,
    }
  }
  return {
    kind: 'unavailable',
    title: operation === 'load' ? 'Consulta não aceita' : 'Alteração não aceita',
    description: `O Control Plane recusou a solicitação (HTTP ${error.status}).`,
    retryable: false,
    correlationId,
  }
}
