import type { FrontendEnvironment } from '../whitelabel-provisioning/provisioningApi'
import { SETTINGS_FIELDS } from './settingsWriteContract'

/**
 * Studio navigation catalog: Ambiente → Página/Recurso → Editor → Preview.
 * Paths follow the audited frontends. No new settings contracts.
 *
 * Investor wallet prefix defaults to `/wallet` (VITE_WALLET_PREFIX). Shared FE
 * builds with `/` still resolve public `/oportunidades` and root wallet routes.
 *
 * Draft-only Investor routes (`/platform-preview/*`) are recorded for a future
 * real-draft preview — Salvo continues to use the live frontend.
 */

export type StudioEnvironmentId = FrontendEnvironment
export type StudioResourceKind = 'PAGE' | 'FEATURE' | 'GLOBAL'
export type StudioPreviewMode = 'live' | 'partial' | 'limited' | 'representative'

export type StudioResource = {
  id: string
  title: string
  kind: StudioResourceKind
  /** Editable settings cells for this resource (empty = branding/global only). */
  cells: string[]
  /**
   * Path appended to the environment delivery base.
   * null = no deep-linkable URL (Admin SPA views, etc.).
   */
  previewPath: string | null
  /** Documented alternate (e.g. authenticated ofertas). */
  authenticatedPreviewPath?: string | null
  requiresAuth: boolean
  previewMode: StudioPreviewMode
  /** How the editor pane behaves when there are no page-specific cells. */
  editorMode: 'cells' | 'global_branding' | 'message'
  notice?: string
  /** Future draft preview path on Investor FE — not used for Salvo iframe yet. */
  draftPreviewPath?: string | null
}

export type StudioEnvironmentMenu = {
  id: StudioEnvironmentId
  label: string
  capability: 'INVESTOR' | 'ENTREPRENEUR' | 'ADMIN'
  resources: StudioResource[]
}

/** Default Investor wallet prefix matching shared-FE source default. */
export const INVESTOR_WALLET_PREFIX = '/wallet'

const featureCells = SETTINGS_FIELDS.filter((cell) => cell.startsWith('features.'))

const investorResources: StudioResource[] = [
  {
    id: 'login',
    title: 'Login',
    kind: 'PAGE',
    cells: [
      'login.title',
      'login.subtitle',
      'login.bullets',
      'login.entry_presentation',
      'login.layout_preset',
      'login.brand_panel_text_color',
      'login.main_area_image',
    ],
    previewPath: `${INVESTOR_WALLET_PREFIX}/login`,
    requiresAuth: false,
    previewMode: 'live',
    editorMode: 'cells',
    draftPreviewPath: '/platform-preview/login',
  },
  {
    id: 'register',
    title: 'Cadastro',
    kind: 'PAGE',
    cells: ['register.content', 'register.entry_presentation', 'register.main_area_image'],
    previewPath: `${INVESTOR_WALLET_PREFIX}/register`,
    requiresAuth: false,
    previewMode: 'live',
    editorMode: 'cells',
    draftPreviewPath: '/platform-preview/register',
  },
  {
    id: 'quick_profile',
    title: 'Completar dados',
    kind: 'PAGE',
    cells: ['quick_profile.appearance', 'quick_profile.theme', 'quick_profile.entry_presentation', 'quick_profile.main_area_image'],
    previewPath: `${INVESTOR_WALLET_PREFIX}/quick-profile`,
    requiresAuth: true,
    previewMode: 'partial',
    editorMode: 'cells',
    notice: 'Prévia parcial: esta tela normalmente exige autenticação. Sem sessão válida o frontend redireciona para o login.',
    draftPreviewPath: '/platform-preview/quick-profile',
  },
  {
    id: 'wallet',
    title: 'Carteira',
    kind: 'PAGE',
    cells: ['dashboard.components', 'terminology.config'],
    previewPath: `${INVESTOR_WALLET_PREFIX}/`,
    requiresAuth: true,
    previewMode: 'partial',
    editorMode: 'cells',
    notice: 'Prévia parcial/autenticada. Rota real da carteira (índice); /investimentos é a view autenticada de portfólio.',
  },
  {
    id: 'offers',
    title: 'Ofertas',
    kind: 'PAGE',
    cells: [
      'offers.presentation',
      'terminology.config',
      ...featureCells.filter((c) => c.startsWith('features.opportunity_')),
    ],
    previewPath: '/oportunidades',
    authenticatedPreviewPath: `${INVESTOR_WALLET_PREFIX}/oportunidades`,
    requiresAuth: false,
    previewMode: 'live',
    editorMode: 'cells',
    notice: 'Prévia pública preferencial em /oportunidades. Rota autenticada: {wallet}/oportunidades.',
    draftPreviewPath: '/platform-preview/offers',
  },
  {
    id: 'terminology',
    title: 'Terminologia',
    kind: 'FEATURE',
    cells: ['terminology.config'],
    previewPath: '/oportunidades',
    requiresAuth: false,
    previewMode: 'representative',
    editorMode: 'cells',
    notice: 'Esta configuração afeta várias páginas da experiência Investidor. A prévia abre Ofertas, onde a terminologia aparece de fato — não é uma rota exclusiva.',
  },
  {
    id: 'features',
    title: 'Funcionalidades',
    kind: 'FEATURE',
    cells: featureCells,
    previewPath: `${INVESTOR_WALLET_PREFIX}/`,
    requiresAuth: true,
    previewMode: 'representative',
    editorMode: 'cells',
    notice: 'Flags de produto — não representam uma página isolada. A prévia abre a Carteira como superfície representativa; o efeito depende de cada funcionalidade e pode exigir autenticação.',
  },
]

const entrepreneurNotice =
  'Esta página utiliza atualmente as configurações globais do Whitelabel (branding/bootstrap). Não há contrato de settings específico do Empreendedor nesta etapa.'

const entrepreneurResources: StudioResource[] = [
  {
    id: 'auth',
    title: 'Autenticação',
    kind: 'PAGE',
    cells: [],
    previewPath: '/auth',
    requiresAuth: false,
    previewMode: 'live',
    editorMode: 'global_branding',
    notice: 'Login e Cadastro são abas da mesma rota /auth. Consome branding/bootstrap global.',
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    kind: 'PAGE',
    cells: [],
    previewPath: '/app/dashboard',
    requiresAuth: true,
    previewMode: 'partial',
    editorMode: 'global_branding',
    notice: entrepreneurNotice,
  },
  {
    id: 'perfil_empresa',
    title: 'Perfil da empresa',
    kind: 'PAGE',
    cells: [],
    previewPath: '/app/perfil-empresa',
    requiresAuth: true,
    previewMode: 'partial',
    editorMode: 'global_branding',
    notice: entrepreneurNotice,
  },
  {
    id: 'perfil_pessoal',
    title: 'Perfil pessoal',
    kind: 'PAGE',
    cells: [],
    previewPath: '/app/perfil-pessoal',
    requiresAuth: true,
    previewMode: 'partial',
    editorMode: 'global_branding',
    notice: entrepreneurNotice,
  },
  {
    id: 'documentos',
    title: 'Documentos',
    kind: 'PAGE',
    cells: [],
    previewPath: '/app/documentos',
    requiresAuth: true,
    previewMode: 'partial',
    editorMode: 'global_branding',
    notice: entrepreneurNotice,
  },
  {
    id: 'campanhas',
    title: 'Campanhas',
    kind: 'PAGE',
    cells: [],
    previewPath: '/app/campanhas',
    requiresAuth: true,
    previewMode: 'partial',
    editorMode: 'global_branding',
    notice: entrepreneurNotice,
  },
  {
    id: 'forum',
    title: 'Fórum',
    kind: 'PAGE',
    cells: [],
    previewPath: '/app/forum',
    requiresAuth: true,
    previewMode: 'partial',
    editorMode: 'global_branding',
    notice: entrepreneurNotice,
  },
  {
    id: 'ferramentas',
    title: 'Ferramentas',
    kind: 'PAGE',
    cells: [],
    previewPath: '/app/ferramentas',
    requiresAuth: true,
    previewMode: 'partial',
    editorMode: 'global_branding',
    notice: entrepreneurNotice,
  },
]

const adminSpaNotice =
  'O Admin usa majoritariamente estado React (AdminView), sem deep-links estáveis. A prévia live é limitada — abra o ambiente ao vivo após autenticação.'

const adminResources: StudioResource[] = [
  {
    id: 'login',
    title: 'Login',
    kind: 'PAGE',
    cells: [],
    previewPath: '/',
    requiresAuth: false,
    previewMode: 'live',
    editorMode: 'global_branding',
    notice: 'Componente de Login na raiz quando deslogado. Consome branding/bootstrap global.',
  },
  {
    id: 'integracao_pag',
    title: 'Integração PAG',
    kind: 'PAGE',
    cells: [],
    previewPath: '/integracoes/pag',
    requiresAuth: true,
    previewMode: 'partial',
    editorMode: 'global_branding',
    notice: 'Deep-link estável /integracoes/pag. Prévia parcial sem sessão válida.',
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    kind: 'PAGE',
    cells: [],
    previewPath: null,
    requiresAuth: true,
    previewMode: 'limited',
    editorMode: 'global_branding',
    notice: adminSpaNotice,
  },
  {
    id: 'investidores',
    title: 'Investidores',
    kind: 'PAGE',
    cells: [],
    previewPath: null,
    requiresAuth: true,
    previewMode: 'limited',
    editorMode: 'global_branding',
    notice: adminSpaNotice,
  },
  {
    id: 'empresas',
    title: 'Empresas',
    kind: 'PAGE',
    cells: [],
    previewPath: null,
    requiresAuth: true,
    previewMode: 'limited',
    editorMode: 'global_branding',
    notice: adminSpaNotice,
  },
  {
    id: 'oportunidades',
    title: 'Oportunidades',
    kind: 'PAGE',
    cells: [],
    previewPath: null,
    requiresAuth: true,
    previewMode: 'limited',
    editorMode: 'global_branding',
    notice: adminSpaNotice,
  },
]

export const STUDIO_ENVIRONMENT_MENUS: StudioEnvironmentMenu[] = [
  { id: 'investor', label: 'Investidor', capability: 'INVESTOR', resources: investorResources },
  { id: 'entrepreneur', label: 'Empreendedor', capability: 'ENTREPRENEUR', resources: entrepreneurResources },
  { id: 'admin', label: 'Admin', capability: 'ADMIN', resources: adminResources },
]

export const STUDIO_ENVIRONMENTS = STUDIO_ENVIRONMENT_MENUS.map((m) => m.id)

export function isStudioEnvironment(value: string | null | undefined): value is StudioEnvironmentId {
  return value === 'investor' || value === 'entrepreneur' || value === 'admin'
}

export function getStudioMenu(env: StudioEnvironmentId): StudioEnvironmentMenu {
  return STUDIO_ENVIRONMENT_MENUS.find((m) => m.id === env) ?? STUDIO_ENVIRONMENT_MENUS[0]
}

export function getStudioResource(env: StudioEnvironmentId, resourceId: string | null | undefined): StudioResource {
  const menu = getStudioMenu(env)
  return menu.resources.find((r) => r.id === resourceId) ?? menu.resources[0]
}

export function resourceForCell(env: StudioEnvironmentId, cell: string | null | undefined): StudioResource {
  const menu = getStudioMenu(env)
  if (!cell) return menu.resources[0]
  const hit = menu.resources.find((r) => r.cells.includes(cell))
  return hit ?? menu.resources[0]
}

export function resolveStudioSelection(input: {
  env?: string | null
  resource?: string | null
  cell?: string | null
}): { env: StudioEnvironmentId; resource: StudioResource; cell: string | undefined } {
  const env: StudioEnvironmentId = isStudioEnvironment(input.env) ? input.env : 'investor'
  let resource = getStudioResource(env, input.resource)
  if (input.cell && !input.resource) {
    resource = resourceForCell(env, input.cell)
  }
  const cell =
    input.cell && resource.cells.includes(input.cell)
      ? input.cell
      : resource.cells[0]
  return { env, resource, cell }
}

/**
 * Join tenant delivery/convention base with a page path.
 * Preserves PATH-mode `/w/{slug}` prefix already present on the base URL.
 */
export function joinPreviewUrl(baseUrl: string, pagePath: string | null | undefined): string | null {
  if (!baseUrl) return null
  try {
    const url = new URL(baseUrl)
    if (pagePath == null || pagePath === '') {
      url.search = ''
      url.hash = ''
      return url.toString().replace(/\/$/, '') || url.origin
    }
    const normalized = pagePath.startsWith('/') ? pagePath : `/${pagePath}`
    const basePath = url.pathname.replace(/\/$/, '')
    // Avoid duplicating trailing slash-only wallet index
    const nextPath =
      normalized === '/'
        ? basePath
          ? `${basePath}/`
          : '/'
        : `${basePath}${normalized}`
    url.pathname = nextPath.replace(/\/{2,}/g, '/')
    url.search = ''
    url.hash = ''
    return url.toString()
  } catch {
    return null
  }
}
