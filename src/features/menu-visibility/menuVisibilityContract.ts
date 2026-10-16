import { ApiError } from '../../lib/api'
import { isMenuId, MENU_VISIBILITY_IDS, type MenuId } from './menuRegistry'
import { mapFrom, type VisibilityMap } from './visibilityModel'

/*
 * Menu Visibility — Control Plane contract (MENU VISIBILITY INTEGRATION V1 — STAGE A).
 *
 * Verified on 2026-10-15 against homolog (read-only GETs, structure only) and
 * in `backend-super-admin-Loor` `46bf79d` (`src/modules/menu-visibility/*`,
 * `docs/arthur-demands-backend-v1.md` Demanda 5):
 *
 *   GET /api/homolog/menu-visibility
 *     → 200 { data: { scope: "global", visibility: Record<MenuId, boolean>, updatedAt, updatedBy } }
 *
 * - Roles (Nest `@Roles`): SUPER_ADMIN, SUPPORT_ADMIN, READ_ONLY. Any other
 *   role → 403 FORBIDDEN; missing / invalid Bearer → 401 UNAUTHORIZED.
 * - Persisted in the Control Plane (Prisma singleton row `id = "global"`), not
 *   in Core. One configuration for the environment; query parameters are ignored.
 * - The Control Plane normalizes the map: every known ID (the same 23 stable IDs
 *   as `menuRegistry.ts`, same order) is returned as a boolean; a known ID
 *   without a stored value is `true` (visible).
 * - `updatedAt` / `updatedBy` are both `null` while no configuration has ever
 *   been saved (the values are then the Control Plane defaults). Otherwise
 *   `updatedAt` is the row's ISO timestamp and `updatedBy` the saving
 *   operator's Control Plane id (not a name or e-mail).
 *
 * The PUT exists in the Backend (SUPER_ADMIN only, complete map, unknown /
 * missing / non-boolean → 400, Audit `UPDATE_MENU_VISIBILITY`, same response
 * envelope) but it is NOT CALLED in Stage A: this module has no request code,
 * saving stays disabled and nothing is applied to the real navigation.
 */

export const MENU_VISIBILITY_CONTRACT = {
  stage: 'A',
  /** The persisted configuration is read from the Control Plane. */
  readIntegrated: true,
  /** Stage B — not enabled: no PUT is ever sent. */
  updateEnabled: false,
  /** Stage B — not enabled: sidebar, shortcuts, routes and landing ignore visibility. */
  enforcementEnabled: false,
  /** Stage B preparation: approved Product rules applied to the draft and preview (visibilityPolicy.ts). */
  productRules: 'prepared',
  environment: 'homolog',
  /** Path for the canonical authenticated client (base URL already ends in `/api`). */
  getPath: '/homolog/menu-visibility',
  getEndpoint: 'GET /api/homolog/menu-visibility',
  putEndpoint: 'PUT /api/homolog/menu-visibility',
  /** Global for the environment: not per Whitelabel, user, role, session or device. */
  scope: 'global',
} as const

/** Error codes this adapter assigns to unusable 2xx answers (never shown raw). */
export const MENU_VISIBILITY_MALFORMED = 'MENU_VISIBILITY_MALFORMED'
export const MENU_VISIBILITY_REGISTRY_MISMATCH = 'MENU_VISIBILITY_REGISTRY_MISMATCH'

export type MenuVisibilityConfig = Readonly<{
  /** Stored preference of every approved ID, as returned (fresh frozen copy, never the response object). */
  map: VisibilityMap
  scope: 'global'
  /** ISO timestamp of the last save, or null when nothing was ever saved. */
  updatedAt: string | null
  /** Control Plane operator id of the last save, or null. */
  updatedBy: string | null
  /** False while the Control Plane has no saved row: the values are its defaults. */
  saved: boolean
  /** Response keys outside the approved registry: ignored, never rendered, reported as drift. */
  unknownIds: readonly string[]
}>

const malformed = () => new ApiError(200, { code: MENU_VISIBILITY_MALFORMED }, { kind: 'malformed' })

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Strict ISO-8601 instant (as Prisma `toISOString()` produces) with a real calendar date. */
function timestamp(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const parts = /^(\d{4})-(\d{2})-(\d{2})T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.exec(value)
  if (!parts || !Number.isFinite(Date.parse(value))) return null
  const [year, month, day] = parts.slice(1, 4).map(Number)
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1] ? value : null
}

const MAX_UNKNOWN_REPORTED = 20
const safeToken = (key: string) => (/^[A-Za-z0-9_.:-]{1,48}$/.test(key) ? key : '(ID inválido)')

/**
 * Validates a menu-visibility envelope (the GET answer; the Backend's PUT
 * answers with the same envelope). Nothing is guessed:
 * - not the documented envelope, `scope` other than "global", a non-boolean
 *   known value, or invalid metadata → malformed (nothing shown);
 * - a missing approved ID → registry mismatch (nothing shown). The Control
 *   Plane fills every known ID itself, so absence means its registry differs
 *   from this frontend's; a value is never invented for it here;
 * - keys outside the approved registry → ignored (never become navigation
 *   items or routes) and reported as contract drift.
 */
export function parseMenuVisibilityResponse(payload: unknown): MenuVisibilityConfig {
  const data = isRecord(payload) && isRecord(payload.data) ? payload.data : null
  if (!data || data.scope !== 'global' || !isRecord(data.visibility)) throw malformed()
  const visibility = data.visibility
  for (const id of MENU_VISIBILITY_IDS) {
    if (!Object.prototype.hasOwnProperty.call(visibility, id)) {
      throw new ApiError(200, { code: MENU_VISIBILITY_REGISTRY_MISMATCH }, { kind: 'malformed' })
    }
    if (typeof visibility[id] !== 'boolean') throw malformed()
  }

  const updatedAt = data.updatedAt === null ? null : timestamp(data.updatedAt)
  if (data.updatedAt !== null && updatedAt === null) throw malformed()
  let updatedBy: string | null = null
  if (data.updatedBy !== null) {
    if (typeof data.updatedBy !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(data.updatedBy)) throw malformed()
    updatedBy = data.updatedBy
  }

  const unknownIds = Object.keys(visibility)
    .filter((key) => !isMenuId(key))
    .slice(0, MAX_UNKNOWN_REPORTED)
    .map(safeToken)

  return Object.freeze({
    map: mapFrom((id) => visibility[id] as boolean),
    scope: 'global',
    updatedAt,
    updatedBy,
    saved: updatedAt !== null,
    unknownIds: Object.freeze(unknownIds),
  })
}

/** Body a future Stage B PUT would carry: the complete map in registry order. Shown for review, NEVER SENT. */
export type MenuVisibilityPutBody = { visibility: Record<MenuId, boolean> }

export function putRequestPreview(map: VisibilityMap): MenuVisibilityPutBody {
  const visibility = {} as Record<MenuId, boolean>
  for (const id of MENU_VISIBILITY_IDS) visibility[id] = map[id]
  return { visibility }
}

/* ---------- presentation of persisted metadata ---------- */

const DATE_TIME = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
})

const TIME = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'America/Sao_Paulo' })

/** ISO instant → "15/10/2026, 14:05" (Brasília). */
export function formatPersistedAt(iso: string) {
  return DATE_TIME.format(new Date(iso))
}

/** Read time of the reference → "14:05:09" (Brasília). */
export function formatReadAt(iso: string) {
  return TIME.format(new Date(iso))
}

/* ---------- error presentation ---------- */

export type VisibilityOperation = 'load' | 'save'

export type VisibilityErrorKind = 'session' | 'forbidden' | 'invalid' | 'conflict' | 'unsupported' | 'unavailable'

export type VisibilityErrorView = {
  kind: VisibilityErrorKind
  title: string
  description: string
  /** Whether trying again can plausibly succeed. */
  retryable: boolean
  correlationId?: string
}

/**
 * Maps a GET failure (and, for Stage B review, a mocked PUT failure) to safe
 * copy — never a raw Backend message. 401 stays with the canonical session
 * layer (`authenticatedGet` ends the session); the view only names it. On
 * save, no response, a timeout, a 5xx or an unreadable answer does not prove
 * the change was not applied: the copy says so.
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
  if (error.kind === 'timeout') {
    return {
      kind: 'unavailable',
      title: 'O Control Plane não respondeu a tempo',
      description: 'A configuração global não chegou dentro do tempo limite. Nenhum valor ilustrativo é exibido no lugar. Tente novamente.',
      retryable: true,
      correlationId,
    }
  }
  if (error.kind === 'network') {
    return {
      kind: 'unavailable',
      title: 'Sem resposta do Control Plane',
      description: 'Não foi possível carregar a configuração global. Verifique a conexão e tente novamente.',
      retryable: true,
      correlationId,
    }
  }
  if (error.kind === 'malformed') {
    return error.code === MENU_VISIBILITY_REGISTRY_MISMATCH
      ? {
          kind: 'unavailable',
          title: 'Registro de módulos divergente',
          description:
            'O Control Plane não retornou todos os módulos do registro aprovado. Nada foi exibido para não mostrar uma visibilidade incorreta; a divergência precisa ser corrigida no contrato.',
          retryable: true,
          correlationId,
        }
      : {
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
  if (operation === 'load' && error.status === 404) {
    return {
      kind: 'unsupported',
      title: 'Configuração não disponível neste ambiente',
      description: 'O Control Plane não reconheceu o endpoint de visibilidade dos módulos (HTTP 404). Nenhum valor ilustrativo é exibido no lugar.',
      retryable: true,
      correlationId,
    }
  }
  if (error.status === 429) {
    return {
      kind: 'unavailable',
      title: 'Muitas solicitações',
      description: 'O Control Plane limitou as solicitações por alguns instantes. Aguarde e tente novamente.',
      retryable: true,
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
