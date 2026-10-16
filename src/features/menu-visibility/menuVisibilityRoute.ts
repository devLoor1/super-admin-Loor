/*
 * `#/settings/menu-visibility` — Configurações › Visibilidade dos módulos,
 * reached from the existing `configuracoes` utility entry (no new menu ID).
 *
 * The URL never holds visibility configuration or state. The prototype-only
 * `?previa=` state preview was removed with the authoritative read (Stage A):
 * it can no longer pin a state or override the persisted configuration. A
 * leftover `?previa=` is only reported as ignored.
 */

export const MENU_VISIBILITY_PATH = 'settings/menu-visibility'

const clip = (value: string) => (value.length > 32 ? `${value.slice(0, 32)}…` : value)

export function parseVisibilityRoute(params: { previa?: string }) {
  const ignored: string[] = []
  if (params.previa !== undefined) ignored.push(`prévia "${clip(params.previa)}" (não disponível com a configuração real)`)
  return { ignored }
}

export function menuVisibilityHref() {
  return `#/${MENU_VISIBILITY_PATH}`
}
