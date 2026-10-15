import { mapFrom, type VisibilityMap } from './visibilityModel'

/*
 * PROTOTYPE initial state — a frontend preview default, NOT a configuration
 * loaded from the Backend (no GET exists yet).
 *
 * Every known module starts visible, matching the real navigation today.
 * Nothing is inferred from permissions, roles or route availability. A fresh
 * map is created per call, so no draft can be shared through a module-level
 * singleton; reloading the page always starts again from this default.
 */
export const PROTOTYPE_INITIAL_SOURCE = {
  label: 'Prévia padrão do frontend',
  description: 'Todos os módulos existentes começam visíveis, como na navegação atual. Não foi carregado do Backend.',
} as const

export function prototypeInitialMap(): VisibilityMap {
  return mapFrom(() => true)
}
