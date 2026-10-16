import { useRemote } from '../../lib/useRemoteResource'
import { fetchMenuVisibility } from './menuVisibilityApi'

/*
 * Menu Visibility source — the authoritative persisted configuration.
 *
 * One `GET /api/homolog/menu-visibility` per mount (plus explicit retries),
 * through the shared request model: a retry or unmount aborts the previous
 * request, so a late answer never replaces a newer one, and nothing is retried
 * automatically. There is no fallback: while loading or after a failure the
 * screen shows that state, never illustrative preferences.
 */
export function useMenuVisibilityConfig() {
  const { state, reload } = useRemote('menu-visibility', fetchMenuVisibility)
  return { state, reload }
}
