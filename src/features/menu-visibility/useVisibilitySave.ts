import { useSyncExternalStore } from 'react'
import { getOperator, subscribeSession } from '../../lib/authSession'
import { authenticatedMenuVisibilityWrite, menuVisibilitySessionKey, MENU_VISIBILITY_WRITES_ENABLED } from '../../lib/menuVisibilityWriteClient'
import { fetchMenuVisibility } from './menuVisibilityApi'
import { createVisibilitySaveCoordinator } from './visibilitySaveCoordinator'

let identity = menuVisibilitySessionKey()
function makeCoordinator(key: string) {
  return createVisibilitySaveCoordinator({
    operatorId: getOperator()?.id ?? '',
    write: (reference, draft) => authenticatedMenuVisibilityWrite(reference, draft, key),
    read: () => fetchMenuVisibility(),
    isCurrent: () => MENU_VISIBILITY_WRITES_ENABLED && menuVisibilitySessionKey() === key,
  })
}
let coordinator = makeCoordinator(identity)
subscribeSession(() => {
  const next = menuVisibilitySessionKey()
  if (next !== identity) {
    identity = next
    const previous = coordinator
    coordinator = makeCoordinator(next)
    previous.invalidate()
  }
})

export function useVisibilitySessionKey() {
  return useSyncExternalStore(subscribeSession, menuVisibilitySessionKey, () => '')
}

export function useVisibilitySave() {
  return { coordinator, state: useSyncExternalStore(coordinator.subscribe, coordinator.getSnapshot, coordinator.getSnapshot) }
}
