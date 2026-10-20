import { useSyncExternalStore } from 'react'
import { getAccessToken, subscribeSession } from '../../lib/authSession'
import { menuVisibilitySessionKey } from '../../lib/menuVisibilityWriteClient'
import { fetchMenuVisibility } from './menuVisibilityApi'
import { createVisibilityResource } from './visibilityResource'

/*
 * Menu Visibility source — the authoritative persisted configuration.
 *
 * One shared session-aware GET resource for Sidebar, management and Stage B's
 * post-save readback. Route remounts reuse it; fresh reads cancel older ones.
 * Session changes clear data synchronously and ignore old responses. No storage,
 * automatic retries or synthetic preferences. A last real GET may keep the
 * editor/draft mounted during refresh; its failure is explicitly labelled.
 */
const resource = createVisibilityResource(fetchMenuVisibility)
const session = () => getAccessToken() ? menuVisibilitySessionKey() : null
resource.setSession(session())
subscribeSession(() => resource.setSession(session()))

export const revalidateMenuVisibility = resource.revalidate
const reload = () => { void resource.revalidate().catch(() => undefined) }

export function useMenuVisibilityResource() {
  return { snapshot: useSyncExternalStore(resource.subscribe, resource.getSnapshot, resource.getSnapshot), reload }
}

export function useMenuVisibilityConfig(_sessionKey = '') {
  const { snapshot } = useMenuVisibilityResource()
  const state = snapshot.lastData && snapshot.state.status !== 'success'
    ? { status: 'success' as const, data: snapshot.lastData }
    : snapshot.state
  return { state, reload, refreshError: snapshot.state.status === 'error' && snapshot.lastData ? snapshot.state.error : undefined }
}
