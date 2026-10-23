import type { OperatorQuery } from './operatorApi'
import { operatorHasControl } from './operatorApi'

export const OPERATORS_HREF = '#/settings/operators'
export function parseOperatorRoute(raw: string): { query: OperatorQuery; valid: boolean } {
  const p = new URLSearchParams(raw.replace(/^\?/, ''))
  const page = p.get('page') ?? '1', order = p.get('order') ?? 'desc', search = (p.get('search') ?? '').trim()
  const valid = [...p.keys()].every(k => ['page', 'search', 'order'].includes(k) && p.getAll(k).length === 1)
    && /^[1-9]\d{0,5}$/.test(page) && ['asc', 'desc'].includes(order) && search.length <= 120 && !operatorHasControl(search)
  return { query: { page: /^[1-9]\d{0,5}$/.test(page) ? Number(page) : 1, order: order === 'asc' ? 'asc' : 'desc', search }, valid }
}
export function operatorListHref(query: Partial<OperatorQuery> = {}) {
  const p = new URLSearchParams()
  if (query.search?.trim()) p.set('search', query.search.trim())
  if (query.order === 'asc') p.set('order', 'asc')
  if (query.page && query.page > 1) p.set('page', String(query.page))
  return `${OPERATORS_HREF}${p.size ? `?${p}` : ''}`
}
export function operatorReturnHref(value?: string) {
  if (!value || !/^#\/settings\/operators(?:\?[^#]*)?$/.test(value)) return OPERATORS_HREF
  const raw = value.split('?')[1] ?? ''
  return parseOperatorRoute(raw).valid ? operatorListHref(parseOperatorRoute(raw).query) : OPERATORS_HREF
}
