import { ApiError, apiRequest } from './api'
import { getAccessToken, getOperator, getSessionVersion, handleUnauthorized } from './authSession'
import { WHITELABEL_WRITES_ENABLED, WHITELABEL_LIFECYCLE_ENABLED, whitelabelWriteAccess } from '../features/whitelabels/crud/whitelabelMutationContract'
import { buildCreateCommand, buildNameUpdateCommand, buildLifecycleCommand, isLifecycleCommand, type WhitelabelCommand } from '../features/whitelabels/crud/whitelabelCommands'

/** Narrow write surface over the canonical transport/session. No arbitrary route or HTTP method. */
export async function authenticatedWhitelabelWrite(command: WhitelabelCommand, expectedSessionVersion: number) {
  // This check precedes token access and every possible fetch, including direct/non-UI calls.
  if (isLifecycleCommand(command) ? !WHITELABEL_LIFECYCLE_ENABLED : !WHITELABEL_WRITES_ENABLED) throw new ApiError(403, { code: 'WHITELABEL_WRITES_DISABLED' })
  const sessionVersion = getSessionVersion()
  const token = getAccessToken()
  if (!token || sessionVersion !== expectedSessionVersion) throw new ApiError(401, { code: 'NO_SESSION' })
  if (whitelabelWriteAccess(getOperator()?.roles) !== 'super-admin') throw new ApiError(403, { code: 'WRITE_FORBIDDEN' })

  // Rebuild from an allowlist: runtime objects cannot smuggle lifecycle/identity fields or a route.
  const built = command.operation === 'create'
    ? buildCreateCommand(command.body)
    : command.operation === 'update-name'
      ? buildNameUpdateCommand({ selectedId: command.targetId, record: {
          id: command.targetId, name: command.baseline.name, updatedAt: command.baseline.updatedAt,
          slug: command.baseline.slug, baseUrl: command.baseline.baseUrl,
        }, draft: command.body })
      : isLifecycleCommand(command)
        ? buildLifecycleCommand({ selectedId: command.targetId, record: { ...command.baseline, id: command.targetId }, operation: command.operation })
        : null
  if (!built?.ok) throw new ApiError(400, { code: 'INVALID_WHITELABEL_COMMAND' })
  const safe = built.command
  const lifecycle = isLifecycleCommand(safe)
  const path = safe.operation === 'create' ? '/whitelabels'
    : lifecycle && safe.operation !== 'logical-delete' ? `/whitelabels/${encodeURIComponent(safe.targetId)}/${safe.operation}`
      : `/whitelabels/${encodeURIComponent(safe.targetId)}`
  try {
    const body = await apiRequest<unknown>(path, {
      method: safe.operation === 'create' ? 'POST' : safe.operation === 'logical-delete' ? 'DELETE' : 'PATCH',
      ...(!lifecycle ? { body: safe.body } : {}),
      token,
      timeoutMs: 20_000,
      successStatus: safe.operation === 'create' ? 201 : 200,
    })
    if (getSessionVersion() !== sessionVersion || getAccessToken() !== token) {
      throw new ApiError(0, {}, { kind: 'network' })
    }
    return body
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) handleUnauthorized(token, sessionVersion)
    throw error
  }
}
