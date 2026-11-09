/**
 * Positive safe-integer Core ids — the only identifiers the Opportunities and
 * Companies reads send (the Backend answers 400 `E_VALIDATION` for 0,
 * negatives and non-integers). Prototype ids (`opp_proto_*`, `cmp_proto_*`)
 * never match. An id is meaningful only with its domain: equal numbers in
 * different domains never identify the same entity.
 */
export function isPositiveCoreId(id: string | undefined): id is string {
  return typeof id === 'string' && /^[1-9]\d{0,15}$/.test(id) && Number(id) <= Number.MAX_SAFE_INTEGER
}
