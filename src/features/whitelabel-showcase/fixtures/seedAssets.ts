import heroTeam from '../assets/hero-team.png'
import heroCollaboration from '../assets/hero-collaboration.png'
import conectaSquare from '../assets/cards/conecta-square.webp'
import conectaCommunity from '../assets/cards/conecta-community.webp'
import conectaPlatform from '../assets/cards/conecta-platform.webp'
import impulsoRegion from '../assets/cards/impulso-region.webp'
import impulsoTown from '../assets/cards/impulso-town.webp'
import impulsoCollaboration from '../assets/cards/impulso-collaboration.webp'
import conectaLogo from '../assets/conecta-logo.png'
import impulsoLogo from '../assets/impulso-logo.png'
import { registerMedia, type MediaEntry } from '../showcaseMedia'

/**
 * Registers the approved showcase files (byte-identical copies of
 * FRONT-WEB/src/assets/mock-whitelabels, see ../assets/ASSETS.md) under
 * synthetic references. Imported for its side effect by the editor and the
 * simulated public page. Bundled files only; no network.
 */
type Seed = Pick<MediaEntry, 'assetRef' | 'url' | 'fileName' | 'mime' | 'width' | 'height'> & { origin?: MediaEntry['origin'] }

const SEEDS: Seed[] = [
  { assetRef: 'aprovado:hero-team', url: heroTeam, fileName: 'hero-team.png', mime: 'image/png', width: 1586, height: 992 },
  { assetRef: 'aprovado:hero-collaboration', url: heroCollaboration, fileName: 'hero-collaboration.png', mime: 'image/png', width: 1586, height: 992 },
  { assetRef: 'aprovado:conecta-square', url: conectaSquare, fileName: 'conecta-square.webp', mime: 'image/webp', width: 1440, height: 720 },
  { assetRef: 'aprovado:conecta-community', url: conectaCommunity, fileName: 'conecta-community.webp', mime: 'image/webp', width: 1440, height: 720 },
  { assetRef: 'aprovado:conecta-platform', url: conectaPlatform, fileName: 'conecta-platform.webp', mime: 'image/webp', width: 1440, height: 901 },
  { assetRef: 'aprovado:impulso-region', url: impulsoRegion, fileName: 'impulso-region.webp', mime: 'image/webp', width: 1440, height: 720 },
  { assetRef: 'aprovado:impulso-town', url: impulsoTown, fileName: 'impulso-town.webp', mime: 'image/webp', width: 1440, height: 720 },
  { assetRef: 'aprovado:impulso-collaboration', url: impulsoCollaboration, fileName: 'impulso-collaboration.webp', mime: 'image/webp', width: 1440, height: 720 },
  { assetRef: 'aprovado:conecta-logo', url: conectaLogo, fileName: 'conecta-logo.png', mime: 'image/png', width: 2172, height: 724 },
  { assetRef: 'aprovado:impulso-logo', url: impulsoLogo, fileName: 'impulso-logo.png', mime: 'image/png', width: 2172, height: 724 },
  // Simulated canonical logo of the `nova-plataforma-demo` source (fixture, not a Backend field).
  { assetRef: 'origem-simulada:nova-plataforma-demo:logo', url: impulsoLogo, fileName: 'impulso-logo.png', mime: 'image/png', width: 2172, height: 724, origin: 'origem-simulada' },
]

for (const seed of SEEDS) registerMedia({ bytes: null, ...seed, origin: seed.origin ?? 'aprovado' })

export const SHOWCASE_SEED_ASSETS_READY = true
