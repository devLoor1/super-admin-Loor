/** Temporary cutover latch: both published readers must be V2-compatible before writes.
 * This does not grant capability/authorization; existing owner/environment/RBAC guards remain authoritative.
 */
export const SHOWCASE_V2_WRITES_ENABLED: boolean = false
