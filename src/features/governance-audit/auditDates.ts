/** Presentation-zone calendar boundaries, independent of browser TZ. Binary
 * search includes DST midnight gaps; inclusive end is next local day minus 1ms. */
export const AUDIT_TIME_ZONE = 'America/Sao_Paulo'
const calendar = new Intl.DateTimeFormat('en-CA', { timeZone: AUDIT_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' })
export function auditCalendarDate(value: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!m || Number(m[1]) < 1000 || Number(m[1]) > 9998) return false
  const instant = new Date(`${value}T12:00:00.000Z`)
  return Number.isFinite(instant.getTime()) && instant.toISOString().slice(0, 10) === value
}
export function auditLocalDate(instant: string | number) {
  const parts = calendar.formatToParts(new Date(instant))
  const get = (type: string) => parts.find(p => p.type === type)!.value
  return `${get('year')}-${get('month')}-${get('day')}`
}
export function auditInstant(value: string): string | null {
  const match = /^(\d{4}-\d{2}-\d{2})T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)$/.exec(value)
  return match && auditCalendarDate(match[1]) && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null
}
function dayStart(day: string) {
  const nominal = Date.parse(`${day}T00:00:00.000Z`)
  let low = nominal - 36 * 3_600_000, high = nominal + 36 * 3_600_000
  while (low < high) {
    const mid = low + Math.floor((high - low) / 2)
    if (auditLocalDate(mid) < day) low = mid + 1
    else high = mid
  }
  if (auditLocalDate(low) !== day) throw new Error('Data local indisponível')
  return low
}
export function auditDayBoundary(day: string, end = false) {
  if (!auditCalendarDate(day)) throw new Error('Data inválida')
  if (!end) return new Date(dayStart(day)).toISOString()
  const next = new Date(Date.parse(`${day}T12:00:00.000Z`) + 86_400_000).toISOString().slice(0, 10)
  return new Date(dayStart(next) - 1).toISOString()
}
