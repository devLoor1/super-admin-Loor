import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const astSettingsBaseline = 'f8978e3a6a23ff0af3f60ad1abdc785be3755425'
// Maximum review scope only. This list never grants compatibility by itself.
// A finalized manifest and both physical/supplied exact bytes are required.
export const astSettingsReviewPaths = Object.freeze([
  'src/app/App.tsx',
  'src/app/presentationAvailability.ts',
  'src/features/whitelabel-settings/OperationalSettingsPage.tsx',
  'src/features/whitelabel-settings/configRoute.ts',
  'src/features/whitelabel-settings/settingsReadApi.ts',
  'src/features/whitelabel-settings/AppConfigurationPreview.tsx',
  'src/features/whitelabel-settings/ConfigurationEditor.tsx',
  'src/features/whitelabel-settings/ConfigurationPreview.tsx',
  'src/features/whitelabel-settings/ConfigurationStudio.module.css',
  'src/features/whitelabel-settings/ConfigurationStudio.tsx',
  'src/features/whitelabel-settings/PlatformAssetEditor.module.css',
  'src/features/whitelabel-settings/PlatformAssetEditor.tsx',
  'src/features/whitelabel-settings/configurationClient.ts',
  'src/features/whitelabel-settings/configurationContract.ts',
  'src/features/whitelabel-settings/platformAssetClient.ts',
  'src/features/whitelabel-emails/OperationalSmtpPage.tsx',
  'src/features/whitelabel-emails/EmailBrandingWorkspace.tsx',
  'src/features/whitelabel-emails/EmailTemplatesWorkspace.module.css',
  'src/features/whitelabel-emails/EmailTemplatesWorkspace.tsx',
  'src/features/whitelabel-emails/emailBrandingDisplay.ts',
  'src/features/whitelabel-emails/emailPreviewGeometry.ts',
  'src/features/whitelabel-emails/emailEditorialModel.ts',
  'src/features/whitelabel-emails/emailTemplateWrites.ts',
  'src/features/whitelabel-emails/emailTemplatesApi.ts',
  'src/features/whitelabel-emails/editorial/emailConfirmationTemplateModel.ts',
  'src/features/whitelabel-emails/editorial/investmentContractTemplateModel.ts',
  'src/features/whitelabel-emails/editorial/linkedTemplateModel.ts',
])
const normalize = source => source.replaceAll('\r\n', '\n')
export const astSettingsDigest = source => createHash('sha256').update(normalize(source)).digest('hex')

/** Injectable I/O permits adversarial adapter tests without changing a physical
 * candidate or manifest. Only the production instance below supplies approvals.
 * No behavior loader, Git wrapper, runtime export or finalizer is implemented. */
export function createAstSettingsBoundary(manifest, { readCurrent, readBaseline }) {
  assert.equal(manifest.baseline, astSettingsBaseline)
  assert.equal(typeof manifest.finalized, 'boolean')
  assert.ok(manifest.files && typeof manifest.files === 'object' && !Array.isArray(manifest.files))
  for (const [path, pin] of Object.entries(manifest.files)) {
    assert.ok(astSettingsReviewPaths.includes(path), `Unqualified AST/settings path: ${path}`)
    assert.ok(pin && typeof pin === 'object' && !Array.isArray(pin))
    assert.deepEqual(Object.keys(pin).sort(), ['after', 'before'])
    assert.ok(pin.before === null || /^[a-f0-9]{64}$/.test(pin.before))
    assert.match(pin.after, /^[a-f0-9]{64}$/)
    assert.notEqual(pin.before, pin.after, `AST/settings pin must describe an actual delta: ${path}`)
  }
  const originals = new Map()
  const pinFor = path => manifest.finalized && Object.hasOwn(manifest.files, path) ? manifest.files[path] : undefined
  function verifySource(path, source) {
    const pin = pinFor(path)
    if (!pin) return false
    assert.equal(astSettingsDigest(readCurrent(path)), pin.after, `Unreviewed physical AST/settings source: ${path}`)
    assert.equal(astSettingsDigest(source), pin.after, `Unreviewed supplied AST/settings source: ${path}`)
    return true
  }
  function reviewed(path) {
    if (!pinFor(path)) return false
    return verifySource(path, readCurrent(path))
  }
  function before(path, source) {
    const pin = pinFor(path)
    if (!pin) return normalize(source)
    reviewed(path)
    const digest = astSettingsDigest(source)
    assert.ok(digest === pin.before || digest === pin.after, `Only exact AST/settings delta may be normalized: ${path}`)
    if (pin.before === null) return normalize(source)
    if (!originals.has(path)) {
      const original = normalize(readBaseline(path))
      assert.equal(astSettingsDigest(original), pin.before, `AST/settings baseline differs: ${path}`)
      originals.set(path, original)
    }
    return originals.get(path)
  }
  function exclusions() {
    assert.equal(manifest.finalized, true, 'AST/settings review is not finalized')
    return Object.keys(manifest.files).map(path => {
      assert.equal(reviewed(path), true)
      return `:(exclude)${path}`
    })
  }
  return Object.freeze({ verifySource, reviewed, before, exclusions, finalized: () => manifest.finalized, files: () => Object.keys(manifest.files) })
}

const manifest = JSON.parse(readFileSync(resolve(root, 'scripts/ast-settings-reviewed-files.json'), 'utf8'))
const boundary = createAstSettingsBoundary(manifest, {
  readCurrent: path => readFileSync(resolve(root, path), 'utf8'),
  readBaseline: path => execFileSync('git', ['show', `${astSettingsBaseline}:${path}`], { cwd: root, encoding: 'utf8' }),
})
export const astSettingsFinalized = boundary.finalized
export const astSettingsFiles = boundary.files
export const verifyAstSettingsSource = boundary.verifySource
export const reviewedAstSettings = boundary.reviewed
export const beforeAstSettings = boundary.before
export const astSettingsExclusions = boundary.exclusions

/** Reverse only this exact successor for older, independently pinned assertions. */
export function withoutAstSettings(path, source) {
  if (!boundary.files().includes(path)) return normalize(source)
  boundary.reviewed(path)
  return astSettingsDigest(source) === manifest.files[path].after ? boundary.before(path, source) : normalize(source)
}
