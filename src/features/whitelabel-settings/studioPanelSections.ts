/**
 * Property-panel section grouping for the Whitelabel Studio.
 * Cells keep their existing contracts; this only organizes the UX.
 */

export type StudioPanelSection = {
  id: string
  title: string
  /** Default open for primary content sections. */
  defaultOpen?: boolean
  cells: string[]
}

const LOGIN: StudioPanelSection[] = [
  {
    id: 'content',
    title: 'Conteúdo',
    defaultOpen: true,
    cells: ['login.title', 'login.subtitle', 'login.bullets'],
  },
  {
    id: 'appearance',
    title: 'Aparência',
    defaultOpen: true,
    cells: ['login.entry_presentation'],
  },
  {
    id: 'images',
    title: 'Imagens',
    defaultOpen: true,
    cells: ['login.main_area_image'],
  },
  {
    id: 'advanced',
    title: 'Avançado',
    defaultOpen: false,
    cells: ['login.layout_preset', 'login.brand_panel_text_color'],
  },
]

const MARCA_GLOBAL: StudioPanelSection[] = [
  {
    id: 'brand',
    title: 'Marca global',
    defaultOpen: true,
    cells: ['email_branding.config'],
  },
]

const REGISTER: StudioPanelSection[] = [
  {
    id: 'content',
    title: 'Conteúdo',
    defaultOpen: true,
    cells: ['register.content'],
  },
  {
    id: 'appearance',
    title: 'Aparência legada',
    defaultOpen: false,
    cells: ['register.entry_presentation'],
  },
  {
    id: 'images',
    title: 'Imagens legadas',
    defaultOpen: false,
    cells: ['register.main_area_image'],
  },
]

const QUICK_PROFILE: StudioPanelSection[] = [
  {
    id: 'appearance',
    title: 'Aparência',
    defaultOpen: true,
    cells: ['quick_profile.appearance', 'quick_profile.theme', 'quick_profile.entry_presentation'],
  },
  {
    id: 'images',
    title: 'Imagens',
    defaultOpen: false,
    cells: ['quick_profile.main_area_image'],
  },
]

const WALLET: StudioPanelSection[] = [
  {
    id: 'dashboard',
    title: 'Carteira',
    defaultOpen: true,
    cells: ['dashboard.components'],
  },
  {
    id: 'terminology',
    title: 'Terminologia',
    defaultOpen: false,
    cells: ['terminology.config'],
  },
]

const OFFERS: StudioPanelSection[] = [
  {
    id: 'presentation',
    title: 'Apresentação',
    defaultOpen: true,
    cells: ['offers.presentation'],
  },
  {
    id: 'terminology',
    title: 'Terminologia',
    defaultOpen: false,
    cells: ['terminology.config'],
  },
  {
    id: 'features',
    title: 'Funcionalidades relacionadas',
    defaultOpen: false,
    cells: [], // filled dynamically from resource cells
  },
]

/** Build collapsible sections for a resource, falling back to a single "Propriedades" group. */
export function sectionsForResource(resourceId: string, cells: string[]): StudioPanelSection[] {
  const preset =
    resourceId === 'marca_global'
      ? MARCA_GLOBAL
      : resourceId === 'login'
      ? LOGIN
      : resourceId === 'register'
        ? REGISTER
        : resourceId === 'quick_profile'
          ? QUICK_PROFILE
          : resourceId === 'wallet'
            ? WALLET
            : resourceId === 'offers'
              ? OFFERS.map((section) =>
                  section.id === 'features'
                    ? {
                        ...section,
                        cells: cells.filter((c) => c.startsWith('features.')),
                      }
                    : section,
                )
              : resourceId === 'terminology'
                ? [{ id: 'terminology', title: 'Terminologia', defaultOpen: true, cells: ['terminology.config'] }]
                : resourceId === 'features'
                  ? [{ id: 'features', title: 'Funcionalidades', defaultOpen: true, cells }]
                  : null

  if (!preset) {
    return cells.length
      ? [{ id: 'properties', title: 'Propriedades', defaultOpen: true, cells }]
      : []
  }

  return preset
    .map((section) => ({
      ...section,
      cells: section.cells.filter((cell) => cells.includes(cell)),
    }))
    .filter((section) => section.cells.length > 0)
}
