import { authenticatedGet } from '../../lib/apiClient'
import { MENU_VISIBILITY_CONTRACT, parseMenuVisibilityResponse, type MenuVisibilityConfig } from './menuVisibilityContract'

/*
 * Menu Visibility read — the ONLY request this module makes.
 *
 * `GET /api/homolog/menu-visibility` through the canonical authenticated client
 * (Bearer, X-Correlation-ID, timeout, cancellation and central 401 handling all
 * live there). No query parameters (the endpoint ignores them), no write
 * request, no browser storage: the answer lives only in the page's memory.
 */

export type MenuVisibilityRead = MenuVisibilityConfig &
  Readonly<{
    /** When this frontend received the answer (client clock, ISO). Not Backend data. */
    readAt: string
  }>

export async function fetchMenuVisibility(signal?: AbortSignal): Promise<MenuVisibilityRead> {
  const body = await authenticatedGet(MENU_VISIBILITY_CONTRACT.getPath, { signal })
  return Object.freeze({ ...parseMenuVisibilityResponse(body), readAt: new Date().toISOString() })
}
