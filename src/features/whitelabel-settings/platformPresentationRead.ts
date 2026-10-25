import { businessText } from '../operation/shared/businessPresentation'

/** Read-only allowlist from Admin Platform contracts; no consumer defaults or raw objects. */
export type PresentationReading = { state: 'missing' | 'null' | 'incompatible' } | { state: 'value'; value: string | number | boolean }
export type PlatformPresentationCapability = {
  id: string
  title: string
  source: string
  state: 'missing' | 'null' | 'incompatible' | 'value'
  fields: { key: string; label: string; reading: PresentationReading }[]
}
type RecordValue = Record<string, unknown>
type RawReading = { state: 'missing' | 'null' | 'incompatible' } | { state: 'value'; value: unknown }
const record = (value: unknown): value is RecordValue => value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value))
const own = (value: unknown, key: string): unknown => record(value) ? Object.getOwnPropertyDescriptor(value, key)?.value : undefined
const exact = (value: unknown, keys: string[]): value is RecordValue => record(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key))
function at(value: unknown, keys: string[]): RawReading {
  let current = value
  for (const key of keys) {
    if (current === null) return { state: 'null' }
    if (current === undefined) return { state: 'missing' }
    if (!record(current)) return { state: 'incompatible' }
    current = own(current, key)
  }
  return current === undefined ? { state: 'missing' } : current === null ? { state: 'null' } : { state: 'value', value: current }
}
function checked(raw: RawReading, valid: (value: unknown) => value is string | number | boolean, display?: (value: string | number | boolean) => string): PresentationReading {
  if (raw.state !== 'value') return raw
  if (!valid(raw.value)) return { state: 'incompatible' }
  return { state: 'value', value: display ? display(raw.value) : raw.value }
}
const color = (value: unknown): value is string => typeof value === 'string' && /^#[\da-f]{6}$/iu.test(value)
const boolean = (value: unknown): value is boolean => typeof value === 'boolean'
const boundedNumber = (minimum: number, maximum: number) => (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum
const order = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
const simpleText = (maximum: number) => (value: unknown): value is string => typeof value === 'string' && businessText(value, maximum) !== null && !/[<>\p{Cc}\p{Cf}]/u.test(value)
const enumValue = (values: Record<string, string>) => (value: unknown): value is string => typeof value === 'string' && Object.hasOwn(values, value)
const LAYOUTS = { side: 'Lateral', top: 'Superior', hidden: 'Oculto' }
const HEADER_LAYOUTS = { stacked: 'Empilhado', overlay: 'Sobreposto' }

function scalar(settings: unknown, id: string, title: string, path: string[], valid: (value: unknown) => value is string | number | boolean, display?: (value: string | number | boolean) => string): PlatformPresentationCapability {
  const reading = checked(at(settings, path), valid, display)
  return { id, title, source: path.join('/'), state: reading.state, fields: reading.state === 'value' ? [{ key: path.at(-1)!, label: title, reading }] : [] }
}
function content(settings: unknown): PlatformPresentationCapability {
  const source = 'register/content', root = at(settings, ['register', 'content'])
  const base = { id: 'registration-content', title: 'Cadastro — conteúdo editorial', source }
  if (root.state !== 'value') return { ...base, state: root.state, fields: [] }
  const value = root.value, values = own(value, 'values')
  const fields = [
    { key: 'title', label: 'Título', maximum: 60 },
    { key: 'introduction', label: 'Introdução', maximum: 180 },
    { key: 'auxiliaryText', label: 'Texto auxiliar', maximum: 140 },
    { key: 'submitLabel', label: 'Ação principal', maximum: 40 },
  ]
  if (!exact(value, ['capabilityId', 'version', 'values']) || own(value, 'capabilityId') !== 'platform.entry-journey.registration-content' || own(value, 'version') !== 1 || !exact(values, fields.map(field => field.key))) return { ...base, state: 'incompatible', fields: [] }
  return { ...base, state: 'value', fields: fields.map(field => ({ key: field.key, label: field.label, reading: checked(at(values, [field.key]), simpleText(field.maximum)) })) }
}
function entryPresentation(settings: unknown, page: string, title: string): PlatformPresentationCapability {
  const base = { id: `entry-${page}`, title: `${title} — apresentação`, source: `${page}/entry_presentation` }
  const root = at(settings, [page, 'entry_presentation'])
  if (root.state !== 'value') return { ...base, state: root.state, fields: [] }
  const value = root.value, regions = own(value, 'regions'), brand = own(regions, 'brand'), main = own(regions, 'main'), surface = own(main, 'formSurface')
  if (!exact(value, ['capabilityId', 'version', 'page', 'regions']) || own(value, 'capabilityId') !== 'platform.entry-journey.presentation' || own(value, 'version') !== 1 || own(value, 'page') !== page || !exact(regions, ['brand', 'main']) || !exact(brand, ['backgroundColor', 'textColor', 'layoutPreset']) || !exact(main, ['backgroundColor', 'textColor', 'formSurface']) || !exact(surface, ['enabled', 'color', 'opacity', 'radius', 'padding', 'shadow'])) return { ...base, state: 'incompatible', fields: [] }
  const field = (key: string, label: string, path: string[], valid: (value: unknown) => value is string | number | boolean, display?: (value: string | number | boolean) => string) => ({ key, label, reading: checked(at(regions, path), valid, display) })
  return { ...base, state: 'value', fields: [
    field('brand.backgroundColor', 'Marca — cor de fundo', ['brand', 'backgroundColor'], color),
    field('brand.textColor', 'Marca — cor do texto', ['brand', 'textColor'], color),
    field('brand.layoutPreset', 'Marca — disposição', ['brand', 'layoutPreset'], enumValue(LAYOUTS), value => LAYOUTS[value as keyof typeof LAYOUTS]),
    field('main.backgroundColor', 'Área principal — cor de fundo', ['main', 'backgroundColor'], color),
    field('main.textColor', 'Área principal — cor do texto', ['main', 'textColor'], color),
    field('surface.enabled', 'Superfície do formulário ativa', ['main', 'formSurface', 'enabled'], boolean),
    field('surface.color', 'Superfície — cor', ['main', 'formSurface', 'color'], color),
    field('surface.opacity', 'Superfície — opacidade (0,65 a 1)', ['main', 'formSurface', 'opacity'], boundedNumber(0.65, 1)),
    field('surface.radius', 'Superfície — raio em px', ['main', 'formSurface', 'radius'], boundedNumber(0, 28)),
    field('surface.padding', 'Superfície — espaçamento em px', ['main', 'formSurface', 'padding'], boundedNumber(12, 36)),
    field('surface.shadow', 'Superfície — sombra', ['main', 'formSurface', 'shadow'], boolean),
  ] }
}
const WIDGETS = { 'wallet-kpis': 'Indicadores da carteira', 'wallet-opportunities': 'Oportunidades', 'wallet-recent-investments': 'Investimentos recentes' }
function dashboard(settings: unknown): PlatformPresentationCapability {
  const base = { id: 'dashboard-composition', title: 'Carteira — composição das seções', source: 'dashboard/components' }
  const root = at(settings, ['dashboard', 'components'])
  if (root.state !== 'value') return { ...base, state: root.state, fields: [] }
  const value = root.value, components = own(value, 'components')
  if (!record(value) || own(value, 'version') !== 1 || !Array.isArray(components) || components.length > 100) return { ...base, state: 'incompatible', fields: [] }
  const known = new Map<string, RecordValue>(), orders = new Set<number>()
  for (const component of components) {
    const id = own(component, 'id')
    if (typeof id !== 'string' || !Object.hasOwn(WIDGETS, id)) continue
    const position = own(component, 'order')
    if (!record(component) || known.has(id) || !order(position) || orders.has(position) || !boolean(own(component, 'visible'))) return { ...base, state: 'incompatible', fields: [] }
    known.set(id, component)
    orders.add(position)
  }
  return { ...base, state: 'value', fields: Object.entries(WIDGETS).flatMap(([id, label]) => [
    { key: `${id}.visible`, label: `${label} — visível`, reading: checked(at(known.get(id), ['visible']), boolean) },
    { key: `${id}.order`, label: `${label} — ordem`, reading: checked(at(known.get(id), ['order']), order) },
  ]) }
}
function offers(settings: unknown): PlatformPresentationCapability {
  const base = { id: 'offer-presentation', title: 'Ofertas — apresentação', source: 'offers/presentation' }
  const root = at(settings, ['offers', 'presentation'])
  if (root.state !== 'value') return { ...base, state: root.state, fields: [] }
  if (!record(root.value) || own(root.value, 'capabilityId') !== 'platform.offers.presentation' || own(root.value, 'version') !== 1) return { ...base, state: 'incompatible', fields: [] }
  const field = (key: string, label: string, path: string[], labels: Record<string, string>) => ({ key, label, reading: checked(at(root.value, path), enumValue(labels), value => labels[String(value)]) })
  return { ...base, state: 'value', fields: [
    field('catalogue.cardDensity', 'Densidade dos cards', ['catalogue', 'cardDensity'], { comfortable: 'Confortável', compact: 'Compacta' }),
    field('cover.fit', 'Ajuste da imagem', ['cover', 'fit'], { cover: 'Preencher', contain: 'Conter' }),
    field('cover.position', 'Posição da imagem', ['cover', 'position'], { center: 'Centro', top: 'Topo' }),
    field('detail.headerLayout.public', 'Cabeçalho público', ['detail', 'headerLayout', 'public'], HEADER_LAYOUTS),
    field('detail.headerLayout.wallet', 'Cabeçalho na carteira', ['detail', 'headerLayout', 'wallet'], HEADER_LAYOUTS),
  ] }
}
function emailBranding(settings: unknown): PlatformPresentationCapability {
  const base = { id: 'email-branding', title: 'E-mail — identidade visual transacional', source: 'email_branding/config' }
  const root = at(settings, ['email_branding', 'config'])
  if (root.state !== 'value') return { ...base, state: root.state, fields: [] }
  if (!record(root.value)) return { ...base, state: 'incompatible', fields: [] }
  const safeLogoReference = (value: unknown): value is string => {
    if (typeof value !== 'string' || !value.trim() || value.length > 2048 || /[\p{Cc}\p{Cf}]/u.test(value)) return false
    try {
      const url = new URL(value)
      return ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname) && !url.username && !url.password && !url.search && !url.hash
    } catch { return false }
  }
  // Narrow persisted snake_case projection only. Do not silently normalize
  // Core's optional camelCase aliases, eight-digit colors or hashless colors.
  // The URL is never retained: even valid references become a constant label.
  return { ...base, state: 'value', fields: [
    { key: 'primary_color', label: 'Cor principal do e-mail (hexadecimal de seis dígitos)', reading: checked(at(root.value, ['primary_color']), color) },
    { key: 'logo_url', label: 'Logo do e-mail — referência sem carregamento', reading: checked(at(root.value, ['logo_url']), safeLogoReference, () => 'Referência HTTP(S) informada; conteúdo não carregado') },
  ] }
}

/** Each capability fails independently. No image URL, unknown fields, secret, default or HTML is retained. */
export function readPlatformPresentation(settings: unknown): PlatformPresentationCapability[] {
  return [
    scalar(settings, 'login-layout', 'Login — disposição da marca', ['login', 'layout_preset'], enumValue(LAYOUTS), value => LAYOUTS[value as keyof typeof LAYOUTS]),
    scalar(settings, 'login-contrast', 'Login — cor do texto da marca', ['login', 'brand_panel_text_color'], color),
    content(settings),
    entryPresentation(settings, 'login', 'Login'),
    entryPresentation(settings, 'register', 'Cadastro'),
    entryPresentation(settings, 'quick_profile', 'Cadastro rápido'),
    dashboard(settings),
    offers(settings),
    emailBranding(settings),
  ]
}
