/*
 * Auditoria helpers that need no data. The prototype's resource destinations
 * (links built from illustrative Whitelabel / account ids) were removed with
 * Audit Read Integration V1: real events are never mapped onto prototype records.
 */

/** Copies a non-sensitive identifier (event id, correlation id); the caller reports the outcome. */
export async function copyIdentifier(value: string) {
  try {
    if (!navigator.clipboard) return false
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    return false
  }
}
