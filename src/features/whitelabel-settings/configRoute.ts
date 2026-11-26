import type { StudioEnvironmentId } from './studioExperienceCatalog'

export const CONFIG_AREAS = ['platform', 'app', 'identity', 'terms'] as const
export type ConfigArea = (typeof CONFIG_AREAS)[number]

export function configArea(value?: string | null): ConfigArea | null {
  return value == null || value === ''
    ? 'platform'
    : CONFIG_AREAS.includes(value as ConfigArea)
      ? (value as ConfigArea)
      : null
}

export type ConfigHrefOptions = {
  env?: StudioEnvironmentId
  resource?: string
  /** Nested field path to highlight (e.g. regions/brand/backgroundColor). */
  focus?: string
  section?: string
}

export function configHref(
  id: string,
  area: ConfigArea = 'platform',
  cell?: string,
  opts?: ConfigHrefOptions,
) {
  const query = new URLSearchParams()
  query.set('area', area)
  if (area === 'platform') {
    if (opts?.env) query.set('env', opts.env)
    if (opts?.resource) query.set('resource', opts.resource)
    if (opts?.section) query.set('section', opts.section)
  }
  if (cell) query.set('cell', cell)
  if (opts?.focus) query.set('focus', opts.focus)
  return `#/whitelabels/${encodeURIComponent(id)}/settings?${query.toString()}`
}
