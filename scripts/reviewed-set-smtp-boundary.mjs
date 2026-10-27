import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { withoutOperationalUx } from './reviewed-operational-ux-boundary.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const setSmtpBaseline = 'ebc2f49b328e7185b679e7413b355056b4b49554'
// This is a maximum review scope, not approval. Only finalized exact pins grant
// historical compatibility, and the boundary suite checks the complete delta.
export const setSmtpReviewPaths = Object.freeze([
  'src/features/whitelabel-settings/settingsReadApi.ts',
  'src/features/whitelabel-settings/settingsWriteContract.ts',
  'src/features/whitelabel-settings/settingsWriteClient.ts',
  'src/features/whitelabel-settings/SettingsWriteEditor.tsx',
  'src/features/whitelabel-settings/SettingsWriteEditor.module.css',
  'src/features/whitelabel-settings/OperationalSettingsPage.tsx',
  'src/features/whitelabel-emails/smtpReadApi.ts',
  'src/features/whitelabel-emails/smtpWriteContract.ts',
  'src/features/whitelabel-emails/smtpWriteClient.ts',
  'src/features/whitelabel-emails/SmtpMetadataEditor.tsx',
  'src/features/whitelabel-emails/SmtpMetadataEditor.module.css',
  'src/features/whitelabel-emails/OperationalSmtpPage.tsx',
])
const manifest = JSON.parse(readFileSync(resolve(root, 'scripts/set-smtp-reviewed-files.json'), 'utf8'))
assert.equal(manifest.baseline, setSmtpBaseline)
assert.equal(typeof manifest.finalized, 'boolean')
assert.ok(manifest.files && typeof manifest.files === 'object' && !Array.isArray(manifest.files))
const normalize = source => source.replaceAll('\r\n', '\n')
export const setSmtpDigest = source => createHash('sha256').update(normalize(source)).digest('hex')
const pinFor = path => manifest.finalized && Object.hasOwn(manifest.files, path) ? manifest.files[path] : undefined
const originals = new Map()
for (const [path, pin] of Object.entries(manifest.files)) {
  assert.ok(setSmtpReviewPaths.includes(path), `Unqualified SET/SMTP path: ${path}`)
  assert.ok(pin.before === null || /^[a-f0-9]{64}$/.test(pin.before))
  assert.match(pin.after, /^[a-f0-9]{64}$/)
  assert.notEqual(pin.before, pin.after, `SET/SMTP pin must describe a reviewed delta: ${path}`)
}
export const setSmtpFinalized = () => manifest.finalized
export const setSmtpFiles = () => Object.keys(manifest.files)

/** No path-only approval: physical and supplied current bytes must match. */
export function verifySetSmtpSource(path, source) {
  const pin = pinFor(path)
  if (!pin) return false
  source = withoutOperationalUx(path, source)
  assert.equal(setSmtpDigest(source), pin.after, `Unreviewed SET/SMTP source: ${path}`)
  return true
}
export function reviewedSetSmtp(path) {
  if (!pinFor(path)) return false
  return verifySetSmtpSource(path, readFileSync(resolve(root, path), 'utf8'))
}

/** Only source-freeze assertions use this adapter. Behavioral loaders continue
 * to load physical current files and therefore execute the actual candidate. */
export function beforeSetSmtp(path, source) {
  const pin = pinFor(path)
  if (!pin) return normalize(source)
  reviewedSetSmtp(path)
  source = withoutOperationalUx(path, source)
  const digest = setSmtpDigest(source)
  assert.ok(digest === pin.before || digest === pin.after, `Only exact SET/SMTP delta may be normalized: ${path}`)
  if (digest === pin.before || pin.before === null) return normalize(source)
  if (!originals.has(path)) {
    const original = normalize(execFileSync('git', ['show', `${setSmtpBaseline}:${path}`], { cwd: root, encoding: 'utf8' }))
    assert.equal(setSmtpDigest(original), pin.before, `SET/SMTP baseline differs: ${path}`)
    originals.set(path, original)
  }
  return originals.get(path)
}
export function setSmtpExclusions() {
  return setSmtpFiles().map(path => {
    assert.equal(reviewedSetSmtp(path), true)
    return `:(exclude)${path}`
  })
}
