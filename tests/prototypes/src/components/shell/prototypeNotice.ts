import { createContext, useContext } from 'react'

/**
 * Placeholder feedback for controls whose destination does not exist yet
 * (other modules, search, tenant switching…). Calling `notify` shows a short,
 * polite status message instead of navigating or faking behaviour.
 */
export const PrototypeNoticeContext = createContext<(message: string) => void>(() => {})

export function usePrototypeNotice() {
  return useContext(PrototypeNoticeContext)
}

/** Standard copy for a module that is not part of this prototype yet. */
export function moduleUnavailable(moduleName: string) {
  return `Protótipo visual: o módulo ${moduleName} ainda não está disponível.`
}
