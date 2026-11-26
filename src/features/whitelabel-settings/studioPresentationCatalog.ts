/**
 * Studio presentation + search metadata.
 * Does not change settings contracts — only labels, helpers, aliases and discoverability.
 */

import type { StudioEnvironmentId } from './studioExperienceCatalog'
import { STUDIO_ENVIRONMENT_MENUS } from './studioExperienceCatalog'
import { sectionsForResource } from './studioPanelSections'

export type StudioFieldPresentation = {
  /** Nested path inside a composite cell (e.g. regions/brand/backgroundColor). Empty = whole cell. */
  path?: string
  label: string
  helper?: string
  aliases?: string[]
}

export type StudioCellPresentation = {
  cell: string
  /** Friendly short label for nav/search (overrides CONFIG_DEFINITIONS.title in Studio UX). */
  label: string
  helper?: string
  aliases?: string[]
  /** Nested fields surfaced for search and friendly ConfigInput labels. */
  fields?: StudioFieldPresentation[]
}

/** Cell-level presentation keyed by config/settings cell id. */
export const STUDIO_CELL_PRESENTATION: Record<string, StudioCellPresentation> = {
  'login.title': {
    cell: 'login.title',
    label: 'Título',
    helper: 'Título institucional exibido no painel lateral do Login.',
    aliases: ['titulo', 'headline', 'login'],
  },
  'login.subtitle': {
    cell: 'login.subtitle',
    label: 'Subtítulo',
    helper: 'Texto de apoio abaixo do título no painel lateral.',
    aliases: ['subtitulo', 'descricao', 'login'],
  },
  'login.bullets': {
    cell: 'login.bullets',
    label: 'Itens / bullets',
    helper: 'Lista de destaques no painel lateral do Login.',
    aliases: ['bullets', 'destaques', 'itens', 'lista', 'login'],
  },
  'login.entry_presentation': {
    cell: 'login.entry_presentation',
    label: 'Cores e layout',
    helper: 'Cores da lateral, do formulário e disposição do painel de marca no Login.',
    aliases: ['aparencia', 'cores', 'layout', 'apresentacao', 'login'],
    fields: [
      {
        path: 'regions/brand/backgroundColor',
        label: 'Cor da lateral',
        helper: 'Cor de fundo do painel de marca exibido ao lado do formulário de login.',
        aliases: ['lateral', 'painel', 'fundo', 'background', 'marca', 'laranja', 'brand'],
      },
      {
        path: 'regions/brand/textColor',
        label: 'Cor do texto da lateral',
        helper: 'Cor do texto e ícones dentro do painel de marca.',
        aliases: ['texto', 'contraste', 'lateral', 'painel'],
      },
      {
        path: 'regions/brand/layoutPreset',
        label: 'Layout do painel',
        helper: 'Posição do painel de marca: ao lado (side), no topo (top) ou oculto (hidden).',
        aliases: ['layout', 'disposicao', 'posicao', 'side', 'top'],
      },
      {
        path: 'regions/main/backgroundColor',
        label: 'Fundo da área principal',
        helper: 'Cor de fundo atrás do formulário de login.',
        aliases: ['fundo', 'background', 'area principal', 'formulario'],
      },
      {
        path: 'regions/main/textColor',
        label: 'Texto da área principal',
        helper: 'Cor do texto na área do formulário.',
        aliases: ['texto', 'formulario'],
      },
      {
        path: 'regions/main/formSurface/enabled',
        label: 'Superfície do formulário',
        helper: 'Ativa o cartão/superfície atrás dos campos de e-mail e senha.',
        aliases: ['formulario', 'cartao', 'superficie'],
      },
      {
        path: 'regions/main/formSurface/color',
        label: 'Cor do formulário',
        helper: 'Cor de fundo do cartão do formulário.',
        aliases: ['formulario', 'cartao', 'cor'],
      },
    ],
  },
  'login.layout_preset': {
    cell: 'login.layout_preset',
    label: 'Layout (legado)',
    helper: 'Disposição legada usada quando ainda não há apresentação completa salva.',
    aliases: ['layout', 'disposicao', 'legado'],
  },
  'login.brand_panel_text_color': {
    cell: 'login.brand_panel_text_color',
    label: 'Contraste da lateral (legado)',
    helper: 'Cor de texto legada do painel; preferir Cores e layout quando disponível.',
    aliases: ['texto', 'contraste', 'lateral', 'legado'],
  },
  'login.main_area_image': {
    cell: 'login.main_area_image',
    label: 'Banner do Login',
    helper: 'Imagem exibida na área principal da tela de Login do Investidor.',
    aliases: ['banner', 'imagem', 'foto', 'hero', 'login', 'imagem principal', 'imagem login'],
  },
  'register.content': {
    cell: 'register.content',
    label: 'Conteúdo do Cadastro',
    helper: 'Textos editoriais da criação de conta.',
    aliases: ['cadastro', 'registro', 'textos'],
  },
  'register.entry_presentation': {
    cell: 'register.entry_presentation',
    label: 'Aparência legada do Cadastro',
    aliases: ['cadastro', 'cores', 'legado'],
  },
  'register.main_area_image': {
    cell: 'register.main_area_image',
    label: 'Imagem legada do Cadastro',
    aliases: ['cadastro', 'imagem', 'banner', 'legado'],
  },
  'quick_profile.appearance': {
    cell: 'quick_profile.appearance',
    label: 'Aparência herdada do Login',
    aliases: ['completar', 'perfil', 'aparencia'],
  },
  'quick_profile.theme': {
    cell: 'quick_profile.theme',
    label: 'Tema do Completar dados',
    aliases: ['completar', 'perfil', 'cores', 'tema'],
  },
  'quick_profile.entry_presentation': {
    cell: 'quick_profile.entry_presentation',
    label: 'Cores do Completar dados',
    aliases: ['completar', 'cores', 'apresentacao'],
  },
  'quick_profile.main_area_image': {
    cell: 'quick_profile.main_area_image',
    label: 'Imagem do Completar dados',
    aliases: ['completar', 'imagem', 'banner'],
  },
  'dashboard.components': {
    cell: 'dashboard.components',
    label: 'Composição da Carteira',
    aliases: ['carteira', 'dashboard', 'componentes'],
  },
  'offers.presentation': {
    cell: 'offers.presentation',
    label: 'Apresentação das Ofertas',
    aliases: ['ofertas', 'oportunidades', 'cards'],
  },
  'terminology.config': {
    cell: 'terminology.config',
    label: 'Terminologia',
    helper: 'Vocabulário compartilhado (Carteira, Oportunidade, Investidor).',
    aliases: ['terminologia', 'vocabulario', 'labels', 'nomes'],
  },
  'email_branding.config': {
    cell: 'email_branding.config',
    label: 'Logo e cor primária',
    helper:
      'Mesmo valor usado pelos e-mails e pelo bootstrap dos fronts (Investidor, Empreendedor e Admin). Não altera favicon/PWA de build.',
    aliases: ['logo', 'marca', 'logotipo', 'identidade', 'email', 'e-mail', 'cor primaria', 'primaria', 'branding'],
    fields: [
      {
        path: 'primary_color',
        label: 'Cor primária',
        helper: 'Cor de destaque compartilhada (e-mails e bootstrap dos fronts quando aplicável).',
        aliases: ['cor', 'primaria', 'primary', 'email', 'marca'],
      },
      {
        path: 'logo_url',
        label: 'Logo principal',
        helper:
          'URL pública da logo. Alimenta e-mails e a logo runtime dos fronts via bootstrap. Se vazia, o site pode cair no banner do Login ou no nome do Whitelabel.',
        aliases: ['logo', 'marca', 'logotipo', 'identidade', 'url'],
      },
    ],
  },
}

export type StudioSearchHit = {
  id: string
  label: string
  helper?: string
  breadcrumb: string
  env: StudioEnvironmentId
  envLabel: string
  resourceId: string
  resourceTitle: string
  sectionId: string
  sectionTitle: string
  cell: string
  /** Nested field path to focus, if any. */
  focusPath?: string
  score: number
}

function normalizeQuery(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
}

function tokens(value: string): string[] {
  return normalizeQuery(value)
    .split(/[^a-z0-9]+/i)
    .filter(Boolean)
}

function scoreMatch(query: string, haystack: string): number {
  const q = normalizeQuery(query)
  const h = normalizeQuery(haystack)
  if (!q || !h) return 0
  if (h === q) return 100
  if (h.startsWith(q)) return 80
  if (h.includes(q)) return 60
  const qTokens = tokens(q)
  if (!qTokens.length) return 0
  let hits = 0
  for (const t of qTokens) {
    if (h.includes(t)) hits += 1
  }
  if (hits === 0) return 0
  return Math.round((hits / qTokens.length) * 50)
}

function sectionForCell(resourceId: string, cells: string[], cell: string): { id: string; title: string } {
  const sections = sectionsForResource(resourceId, cells)
  const hit = sections.find((section) => section.cells.includes(cell))
  return hit ? { id: hit.id, title: hit.title } : { id: 'properties', title: 'Propriedades' }
}

/** Build searchable entries from menus + presentation metadata. */
export function buildStudioSearchIndex(): Omit<StudioSearchHit, 'score'>[] {
  const entries: Omit<StudioSearchHit, 'score'>[] = []
  for (const menu of STUDIO_ENVIRONMENT_MENUS) {
    for (const resource of menu.resources) {
      for (const cell of resource.cells) {
        const presentation = STUDIO_CELL_PRESENTATION[cell]
        const section = sectionForCell(resource.id, resource.cells, cell)
        const cellLabel = presentation?.label ?? cell
        entries.push({
          id: `${menu.id}:${resource.id}:${cell}`,
          label: cellLabel,
          helper: presentation?.helper,
          breadcrumb: `${menu.label} › ${resource.title} › ${section.title} › ${cellLabel}`,
          env: menu.id,
          envLabel: menu.label,
          resourceId: resource.id,
          resourceTitle: resource.title,
          sectionId: section.id,
          sectionTitle: section.title,
          cell,
        })
        for (const field of presentation?.fields ?? []) {
          entries.push({
            id: `${menu.id}:${resource.id}:${cell}:${field.path ?? ''}`,
            label: field.label,
            helper: field.helper,
            breadcrumb: `${menu.label} › ${resource.title} › ${section.title} › ${field.label}`,
            env: menu.id,
            envLabel: menu.label,
            resourceId: resource.id,
            resourceTitle: resource.title,
            sectionId: section.id,
            sectionTitle: section.title,
            cell,
            focusPath: field.path,
          })
        }
      }
    }
  }
  return entries
}

let cachedIndex: Omit<StudioSearchHit, 'score'>[] | null = null

function getIndex() {
  if (!cachedIndex) cachedIndex = buildStudioSearchIndex()
  return cachedIndex
}

export function searchStudioSettings(query: string, limit = 12): StudioSearchHit[] {
  const q = query.trim()
  if (q.length < 2) return []
  const results: StudioSearchHit[] = []
  for (const entry of getIndex()) {
    const presentation = STUDIO_CELL_PRESENTATION[entry.cell]
    const field = presentation?.fields?.find((f) => f.path === entry.focusPath)
    const bags = [
      entry.label,
      entry.helper ?? '',
      entry.breadcrumb,
      entry.cell,
      entry.focusPath ?? '',
      ...(presentation?.aliases ?? []),
      ...(field?.aliases ?? []),
    ]
    let best = 0
    for (const bag of bags) {
      best = Math.max(best, scoreMatch(q, bag))
    }
    // Prefer Investor hits for shared cells (marca global / login) when tied.
    if (entry.env === 'investor') best += 1
    if (best > 0) results.push({ ...entry, score: best })
  }
  results.sort((a, b) => b.score - a.score || a.breadcrumb.localeCompare(b.breadcrumb, 'pt-BR'))
  // Deduplicate same cell+focus keeping best env
  const seen = new Set<string>()
  const unique: StudioSearchHit[] = []
  for (const hit of results) {
    const key = `${hit.cell}|${hit.focusPath ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(hit)
    if (unique.length >= limit) break
  }
  return unique
}

export function studioCellLabel(cell: string, fallback: string): string {
  return STUDIO_CELL_PRESENTATION[cell]?.label ?? fallback
}

export function studioCellHelper(cell: string): string | undefined {
  return STUDIO_CELL_PRESENTATION[cell]?.helper
}

export function studioFieldPresentation(cell: string, path: string[]): StudioFieldPresentation | undefined {
  const joined = path.filter(Boolean).join('/')
  return STUDIO_CELL_PRESENTATION[cell]?.fields?.find((f) => (f.path ?? '') === joined)
}
