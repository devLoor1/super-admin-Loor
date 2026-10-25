import { createContext, useContext } from 'react'

/**
 * Accessible feedback for supported controls and unavailable destinations
 * Calling `notify` shows a short,
 * polite status message instead of navigating or faking behaviour.
 */
export const NoticeContext = createContext<(message: string) => void>(() => {})

export function useNotice() {
  return useContext(NoticeContext)
}

/** Standard copy for a module without an operational destination. */
export function moduleUnavailable(moduleName: string) {
  return `O módulo ${moduleName} ainda não está disponível.`
}
