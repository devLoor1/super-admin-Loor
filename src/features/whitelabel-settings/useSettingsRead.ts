import { useSyncExternalStore } from 'react'
import { getSessionVersion, subscribeSession } from '../../lib/authSession'
import { useRemote } from '../../lib/useRemoteResource'
import { getSettingsRead, isSettingsTenantId } from './settingsReadApi'

export function useSettingsRead(id: string | null) {
  const session = useSyncExternalStore(subscribeSession, getSessionVersion, getSessionVersion)
  return useRemote(id && isSettingsTenantId(id) ? `settings:${session}:${id}` : null, signal => getSettingsRead(id!, signal))
}
