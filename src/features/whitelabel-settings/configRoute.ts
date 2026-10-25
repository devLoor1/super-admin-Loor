export const CONFIG_AREAS = ['platform', 'app', 'identity', 'terms'] as const
export type ConfigArea = typeof CONFIG_AREAS[number]
export function configArea(value?: string | null): ConfigArea | null {
  return value == null || value === '' ? 'platform' : CONFIG_AREAS.includes(value as ConfigArea) ? value as ConfigArea : null
}
export const configHref = (id: string, area: ConfigArea = 'platform') => `#/whitelabels/${encodeURIComponent(id)}/settings?area=${area}`
