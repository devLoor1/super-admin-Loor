import { buildHash } from '../../app/routeQuery'
import { MENU_VISIBILITY_CONTRACT } from './menuVisibilityContract'

/*
 * `#/settings/menu-visibility` — Configurações › Visibilidade dos módulos,
 * reached from the existing `configuracoes` utility entry (no new menu ID).
 *
 * The URL never holds visibility configuration. Its only parameter is the
 * PROTOTYPE-ONLY `?previa=` state preview (carregando, indisponivel,
 * sem-permissao, erro, falha-ao-salvar), so future read / save states can be
 * reviewed without any request. It is honoured only while the contract is
 * not integrated, and is removed together with the prototype source.
 */

export const MENU_VISIBILITY_PATH = 'settings/menu-visibility'

export type VisibilityPreview = 'loading' | 'unavailable' | 'forbidden' | 'error' | 'save-failed'

const FROM_PARAM: Record<string, VisibilityPreview> = {
  carregando: 'loading',
  indisponivel: 'unavailable',
  'sem-permissao': 'forbidden',
  erro: 'error',
  'falha-ao-salvar': 'save-failed',
}

const TO_PARAM: Record<VisibilityPreview, string> = {
  loading: 'carregando',
  unavailable: 'indisponivel',
  forbidden: 'sem-permissao',
  error: 'erro',
  'save-failed': 'falha-ao-salvar',
}

export const PREVIEW_LABEL: Record<VisibilityPreview, string> = {
  loading: 'carregando a configuração',
  unavailable: 'configuração indisponível',
  forbidden: 'sem permissão de leitura',
  error: 'resposta inesperada',
  'save-failed': 'falha ao salvar',
}

const clip = (value: string) => (value.length > 32 ? `${value.slice(0, 32)}…` : value)

export function parseVisibilityRoute(params: { previa?: string }) {
  const ignored: string[] = []
  let preview: VisibilityPreview | undefined
  if (params.previa !== undefined) {
    const candidate = FROM_PARAM[params.previa]
    if (candidate && !MENU_VISIBILITY_CONTRACT.integrated) preview = candidate
    else ignored.push(`prévia "${clip(params.previa)}"`)
  }
  return { preview, ignored }
}

export function menuVisibilityHref(preview?: VisibilityPreview) {
  return buildHash(MENU_VISIBILITY_PATH, { previa: preview ? TO_PARAM[preview] : undefined })
}
