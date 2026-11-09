import { SHOWCASE_SIMULATION } from '../showcaseMapping'
import { APPROVED_INTRODUCTION, SHOWCASE_OWNER, SHOWCASE_SCHEMA_VERSION, type CardSource, type CopiedDefaults, type ShowcaseDocument } from '../showcaseModel'

/**
 * Initial "saved" configuration of the offline prototype. It mirrors the
 * accepted FRONT-WEB showcase (two illustrative identities, CONECTA and
 * IMPULSO, plus the approved hero photographs) and the approved introductory
 * copy. Media are referenced by synthetic `aprovado:*` refs only; the files are
 * byte-identical copies registered by `seedAssets.ts`.
 *
 * CONECTA and IMPULSO are illustrative customizations, not canonical slugs.
 * Their source is the mapped owner fixture (logical `homologacao`), as in the
 * approved boards, to demonstrate source ≠ instance.
 */

export const SEED_SAVED_AT = '2026-11-06T12:00:00.000Z'

export const SEED_CARD_IDS = {
  conecta: '034fda52-3ff3-45ae-979c-1927a9607d8a',
  impulso: '7d73e9bc-01c9-4264-81a4-95d33f0cd8ae',
} as const

export const ownerSource = (): CardSource => ({
  whitelabelId: SHOWCASE_SIMULATION.mockTenant.id,
  slug: SHOWCASE_SIMULATION.mockTenant.slug,
  name: SHOWCASE_SIMULATION.mockTenant.name,
  logical: { whitelabelId: SHOWCASE_SIMULATION.logicalOwner.whitelabelId, slug: SHOWCASE_SIMULATION.logicalOwner.slug },
})

const noDefaults = (): CopiedDefaults => ({ fields: [], missing: ['logo', 'colors', 'shortDescription'], sourceVersion: null, copiedAt: SEED_SAVED_AT, provenance: 'fixture-simulada' })

export function seedDocument(): ShowcaseDocument {
  return {
    schemaVersion: SHOWCASE_SCHEMA_VERSION,
    owner: { ...SHOWCASE_OWNER },
    banner: {
      images: [
        { associationId: 'adbd0440-c8a4-4f8c-b250-3fd4e9d1c7b5', assetRef: 'aprovado:hero-team', fileName: 'hero-team.png', decorative: false, alt: 'Cena ilustrativa de uma equipe discutindo uma plataforma CONECTA em um monitor.' },
        { associationId: '35cc868d-79ae-449e-8349-d82aadce63fc', assetRef: 'aprovado:hero-collaboration', fileName: 'hero-collaboration.png', decorative: false, alt: 'Outra perspectiva da equipe colaborando em torno da plataforma ilustrativa.' },
      ],
    },
    introduction: { ...APPROVED_INTRODUCTION },
    cards: [
      {
        instanceId: SEED_CARD_IDS.conecta,
        source: ownerSource(),
        copiedDefaults: noDefaults(),
        internalTitle: 'CONECTA — Institucional',
        displayName: 'CONECTA',
        shortDescription: 'Investimentos municipais.',
        logo: { assetRef: 'aprovado:conecta-logo', alt: 'CONECTA', fileName: 'conecta-logo.png', origin: 'exemplo-aprovado' },
        colors: { panel: '#0A1E85', divider: '#87DBBE' },
        images: [
          { associationId: 'fef6b3e1-ac8e-4222-ae2b-e9803797e161', assetRef: 'aprovado:conecta-square', fileName: 'conecta-square.webp', decorative: false, alt: 'Praça arborizada com fachadas coloridas em um município ilustrativo.' },
          { associationId: '59f55e46-ab05-4ea0-923b-95610efe4217', assetRef: 'aprovado:conecta-community', fileName: 'conecta-community.webp', decorative: false, alt: 'Rua de pedestres junto à praça, em outra perspectiva do município ilustrativo.' },
          { associationId: 'ca42ba7a-ea13-4328-8beb-e7409ff6e0e1', assetRef: 'aprovado:conecta-platform', fileName: 'conecta-platform.webp', decorative: false, alt: 'Equipe usando a plataforma CONECTA em uma cena ilustrativa de colaboração municipal.' },
        ],
      },
      {
        instanceId: SEED_CARD_IDS.impulso,
        source: ownerSource(),
        copiedDefaults: noDefaults(),
        internalTitle: 'IMPULSO — Comunidade',
        displayName: 'IMPULSO',
        shortDescription: 'Desenvolvimento regional.',
        logo: { assetRef: 'aprovado:impulso-logo', alt: 'IMPULSO', fileName: 'impulso-logo.png', origin: 'exemplo-aprovado' },
        colors: { panel: '#B64225', divider: '#F1C16E' },
        images: [
          { associationId: '653c9fe7-5b9c-4838-86c0-3040104a6773', assetRef: 'aprovado:impulso-region', fileName: 'impulso-region.webp', decorative: false, alt: 'Vista ilustrativa de uma cidade entre campos verdes e colinas.' },
          { associationId: '4b86ad22-7b18-4186-a7b7-fbd886bdbb4b', assetRef: 'aprovado:impulso-town', fileName: 'impulso-town.webp', decorative: false, alt: 'Bairros arborizados e paisagem rural de uma cidade ilustrativa.' },
          { associationId: '9f8dc9c2-65fa-49c1-815c-73bb7f5554b9', assetRef: 'aprovado:impulso-collaboration', fileName: 'impulso-collaboration.webp', decorative: false, alt: 'Empreendedores colaborando em um projeto regional em uma cena ilustrativa.' },
        ],
      },
    ],
  }
}

/** Media refs used by the seed (checks register stub entries for them). */
export const SEED_ASSET_REFS = [
  'aprovado:hero-team', 'aprovado:hero-collaboration',
  'aprovado:conecta-square', 'aprovado:conecta-community', 'aprovado:conecta-platform',
  'aprovado:impulso-region', 'aprovado:impulso-town', 'aprovado:impulso-collaboration',
  'aprovado:conecta-logo', 'aprovado:impulso-logo',
] as const
