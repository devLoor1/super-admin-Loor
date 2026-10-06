import {
  DEFAULT_COLORS,
  EXPERIENCE_DEFAULTS,
  FEATURE_DEFAULTS,
  type AssetRef,
  type ExperienceSettings,
  type FeatureSettings,
  type TermsRevision,
  type WhitelabelSettings,
} from './settingsModel'

/*
 * ILLUSTRATIVE PROTOTYPE SETTINGS — not production data, not a backend contract.
 *
 * Logos are generated placeholder artwork (initial + name), not brand assets.
 * Terms content is placeholder text for the prototype, not legal copy. Dates
 * exist only to demonstrate the revision history layout. Terms revision numbers
 * match the Account Control prototype (Finapop rev. 4, Loor rev. 2, none for
 * Nova Plataforma).
 */

const svgData = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

function placeholderLogo(initial: string, name: string, color: string): AssetRef {
  const width = 70 + name.length * 17
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="64" viewBox="0 0 ${width} 64"><rect x="4" y="8" width="48" height="48" rx="12" fill="${color}"/><text x="28" y="43" font-family="Inter,Arial,sans-serif" font-size="28" font-weight="700" fill="#ffffff" text-anchor="middle">${initial}</text><text x="64" y="42" font-family="Inter,Arial,sans-serif" font-size="27" font-weight="600" fill="#f4f6fb">${name}</text></svg>`
  return { url: svgData(svg), name: `logo-${name}.svg`, local: false }
}

function placeholderFavicon(initial: string, color: string): AssetRef {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${color}"/><text x="32" y="44" font-family="Inter,Arial,sans-serif" font-size="34" font-weight="700" fill="#ffffff" text-anchor="middle">${initial}</text></svg>`
  return { url: svgData(svg), name: 'favicon.svg', local: false }
}

const TERMS_BODY = (platform: string, revision: number) =>
  [
    `Texto ilustrativo do protótipo (revisão ${revision}). Não é um documento jurídico.`,
    `1. Aceitação. Ao utilizar a plataforma ${platform}, o usuário declara ter lido estes Termos de Uso.`,
    '2. Cadastro. O usuário é responsável pela veracidade das informações fornecidas no cadastro.',
    '3. Uso da plataforma. O acesso às funcionalidades depende das regras de cada área e do perfil do usuário.',
    '4. Privacidade. O tratamento de dados pessoais segue a legislação aplicável.',
    '5. Alterações. Novas revisões podem ser publicadas pela plataforma.',
  ].join('\n\n')

function revisions(prefix: string, platform: string, dates: string[]): TermsRevision[] {
  // dates: newest first
  return dates.map((publishedAt, index) => {
    const revision = dates.length - index
    return {
      id: `${prefix}_terms_rev_${revision}`,
      revision,
      title: `Termos de Uso — ${platform}`,
      content: TERMS_BODY(platform, revision),
      publishedAt,
    }
  })
}

function experience(name: string, overrides: Partial<Record<keyof ExperienceSettings, string>>): ExperienceSettings {
  const value = (key: keyof ExperienceSettings, fallback: string) =>
    overrides[key] !== undefined
      ? { value: overrides[key]!, source: 'tenant' as const }
      : { value: fallback, source: 'default' as const }
  return {
    publicName: value('publicName', name),
    slogan: value('slogan', EXPERIENCE_DEFAULTS.slogan),
    institutional: value('institutional', EXPERIENCE_DEFAULTS.institutional),
    loginMessage: value('loginMessage', EXPERIENCE_DEFAULTS.loginMessage),
    emptyOpportunities: value('emptyOpportunities', EXPERIENCE_DEFAULTS.emptyOpportunities),
    ctaLabel: value('ctaLabel', EXPERIENCE_DEFAULTS.ctaLabel),
    opportunityTerm: value('opportunityTerm', EXPERIENCE_DEFAULTS.opportunityTerm),
  }
}

function features(overrides: Partial<Record<keyof FeatureSettings, boolean>>): FeatureSettings {
  const entries = (Object.keys(FEATURE_DEFAULTS) as (keyof FeatureSettings)[]).map((key) => [
    key,
    overrides[key] !== undefined
      ? { value: overrides[key]!, source: 'tenant' as const }
      : { value: FEATURE_DEFAULTS[key], source: 'default' as const },
  ])
  return Object.fromEntries(entries) as FeatureSettings
}

function split(list: TermsRevision[]) {
  return { current: list[0] ?? null, history: list.slice(1) }
}

export const PROTOTYPE_SETTINGS: Record<string, WhitelabelSettings> = {
  wl_proto_01: {
    whitelabelId: 'wl_proto_01',
    identity: {
      logo: { value: placeholderLogo('F', 'finapop', '#6366F1'), source: 'tenant' },
      favicon: { value: placeholderFavicon('F', '#6366F1'), source: 'tenant' },
      primaryColor: { value: '#6366F1', source: 'tenant' },
      accentColor: { value: '#10B981', source: 'tenant' },
    },
    experience: experience('Finapop', {
      slogan: 'Seu dinheiro, mais oportunidades.',
      institutional: 'A Finapop conecta você a soluções financeiras de forma simples, segura e transparente.',
      emptyOpportunities: 'Nenhuma oportunidade disponível no momento. Volte em breve!',
    }),
    features: features({ anonymousInvestmentDefault: true }),
    terms: split(
      revisions('wl_proto_01', 'Finapop', [
        '2026-03-10T09:21:00-03:00',
        '2025-11-20T15:40:00-03:00',
        '2025-06-02T11:05:00-03:00',
        '2025-01-15T10:00:00-03:00',
      ]),
    ),
    lastLocalChange: null,
  },
  wl_proto_02: {
    whitelabelId: 'wl_proto_02',
    identity: {
      logo: { value: null, source: 'default' },
      favicon: { value: null, source: 'default' },
      primaryColor: { value: '#7C5CFA', source: 'tenant' },
      accentColor: { value: DEFAULT_COLORS.accent, source: 'default' },
    },
    experience: experience('Loor', { ctaLabel: 'Explorar oportunidades' }),
    features: features({ walletVisibility: false }),
    terms: split(revisions('wl_proto_02', 'Loor', ['2026-05-18T16:12:00-03:00', '2026-02-03T10:30:00-03:00'])),
    lastLocalChange: null,
  },
  wl_proto_03: {
    whitelabelId: 'wl_proto_03',
    identity: {
      logo: { value: null, source: 'default' },
      favicon: { value: null, source: 'default' },
      primaryColor: { value: DEFAULT_COLORS.primary, source: 'default' },
      accentColor: { value: DEFAULT_COLORS.accent, source: 'default' },
    },
    experience: experience('Nova Plataforma', {}),
    features: features({}),
    terms: { current: null, history: [] },
    lastLocalChange: null,
  },
}
