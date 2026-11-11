import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const showcaseBaseline = 'd49815d7fa3decd7f255c94b8826d64822d5b883'
// Exact maximum review scope. A name alone never qualifies: finalized byte pins
// and physical verification below are required. Fixtures/simulation are absent.
export const showcaseReviewPaths = Object.freeze([
  'src/app/App.tsx', 'src/app/navigationGuard.ts', 'src/app/presentationAvailability.ts',
  'src/components/shell/TopHeader.tsx',
  'src/features/whitelabel-settings/OperationalSettingsPage.tsx',
  'src/features/whitelabels/WhitelabelDetailPanel.tsx',
  ...[
    'showcaseAccess.ts', 'showcaseClient.ts', 'showcaseCodec.ts', 'showcaseMapping.ts',
    'showcaseMarkdown.ts', 'showcaseMedia.ts', 'showcaseLogoCatalog.ts', 'showcaseModel.ts', 'showcaseRepository.ts',
    'showcaseSourceLookup.ts', 'showcaseStore.ts', 'showcaseValidation.ts',
    'editor/BannerTab.tsx', 'editor/CardEditorPage.tsx', 'editor/CardsTab.tsx',
    'editor/editorHooks.ts', 'editor/ImageListEditor.tsx', 'editor/IntroTab.tsx',
    'editor/MarkdownField.tsx', 'editor/MediaPickerDialog.tsx', 'editor/PreviewPanel.tsx',
    'editor/showcaseCrumbs.ts', 'editor/ShowcaseEditor.module.css',
    'editor/ShowcaseEntryCard.module.css', 'editor/ShowcaseEntryCard.tsx',
    'editor/ShowcaseFrame.tsx', 'editor/showcaseNavigation.ts',
    'editor/ShowcaseSettingsPage.tsx', 'editor/SourceLookupDialog.tsx', 'editor/useShowcaseLeaveGuard.ts',
    'public/autoplay.ts', 'public/CardImageCarousel.tsx', 'public/DemoDialog.tsx',
    'public/ImageCarousel.tsx', 'public/MarkdownContent.tsx', 'public/motion.ts',
    'public/showcase.css', 'public/ShowcaseChrome.tsx', 'public/showcaseTypes.ts',
    'public/ShowcaseView.tsx', 'public/useCardAutoplay.ts', 'public/usePointerParallax.ts',
    'public/useShowcaseMedia.ts',
    'assets/ASSETS.md', 'assets/loor-logo.png', 'assets/loor-logo-white-solid.png', 'assets/cvm-notice.png',
    'assets/conecta-logo.png', 'assets/impulso-logo.png',
    'assets/hero-team.png', 'assets/hero-collaboration.png',
    'assets/cards/conecta-community.webp', 'assets/cards/conecta-platform.webp', 'assets/cards/conecta-square.webp',
    'assets/cards/impulso-collaboration.webp', 'assets/cards/impulso-region.webp', 'assets/cards/impulso-town.webp',
    'assets/fonts/inter-latin-variable.woff2', 'assets/fonts/inter-OFL.txt',
    'assets/fonts/montserrat-latin-variable.woff2', 'assets/fonts/montserrat-OFL.txt', 'assets/fonts/sources.json',
  ].map(path => `src/features/whitelabel-showcase/${path}`),
])
const binary = path => /\.(?:png|webp|woff2)$/.test(path)
export const showcaseDigest = (value, path = '') => createHash('sha256').update(binary(path) ? value : String(value).replaceAll('\r\n', '\n')).digest('hex')

export function createShowcaseBoundary(manifest, readCurrent, readBaseline) {
  assert.equal(manifest.baseline, showcaseBaseline)
  assert.equal(typeof manifest.finalized, 'boolean')
  for (const [path, pin] of Object.entries(manifest.files)) {
    assert.ok(showcaseReviewPaths.includes(path), `Unqualified showcase review path: ${path}`)
    assert.deepEqual(Object.keys(pin).sort(), ['after', 'before'])
    assert.match(pin.after, /^[a-f0-9]{64}$/)
    assert.ok(pin.before === null || /^[a-f0-9]{64}$/.test(pin.before))
    assert.notEqual(pin.before, pin.after)
  }
  const pinFor = path => manifest.finalized && Object.hasOwn(manifest.files, path) ? manifest.files[path] : undefined
  function reviewed(path) {
    const pin = pinFor(path)
    if (!pin) return false
    assert.equal(showcaseDigest(readCurrent(path), path), pin.after, `Unreviewed physical showcase source: ${path}`)
    return true
  }
  function without(path, source) {
    const pin = pinFor(path)
    if (!pin) return source
    reviewed(path)
    // Older adapters may hold independent historical bytes. Reverse only the
    // exact supplied successor; unknown supplied bytes receive no approval.
    if (pin.before === null || showcaseDigest(source, path) !== pin.after) return source
    const previous = readBaseline(path)
    assert.equal(showcaseDigest(previous, path), pin.before, `Changed showcase predecessor: ${path}`)
    return binary(path) ? previous : String(previous).replaceAll('\r\n', '\n')
  }
  return {
    reviewed, without,
    exclusions: () => {
      assert.equal(manifest.finalized, true, 'Showcase review not finalized')
      return Object.keys(manifest.files).map(path => { assert.equal(reviewed(path), true); return `:(exclude)${path}` })
    },
  }
}

const manifest = JSON.parse(readFileSync(resolve(root, 'scripts/showcase-reviewed-files.json'), 'utf8'))
const originals = new Map()
const boundary = createShowcaseBoundary(manifest,
  path => readFileSync(resolve(root, path), binary(path) ? undefined : 'utf8'),
  path => {
    if (!originals.has(path)) originals.set(path, execFileSync('git', ['show', `${showcaseBaseline}:${path}`], { cwd: root, ...(binary(path) ? {} : { encoding: 'utf8' }) }))
    return originals.get(path)
  })
export const reviewedShowcase = boundary.reviewed
export const withoutShowcase = boundary.without
export const showcaseExclusions = boundary.exclusions
export const showcaseFiles = () => Object.keys(manifest.files)
export const showcaseFinalized = () => manifest.finalized
