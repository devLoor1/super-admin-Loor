import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const accountUxBaseline = '9f7f71e328440972dfd63588e9e981fbb2ced673'
export const accountUxPaths = Object.freeze([
  'src/components/shell/TopHeader.tsx',
  'src/components/ui/DetailTransition.tsx',
  'src/components/ui/Dialog.module.css',
  'src/components/ui/OutlineButton.module.css',
  'src/components/ui/PrimaryButton.module.css',
  'src/features/whitelabel-accounts/admin/AdminLifecycle.module.css',
  'src/features/whitelabels/visuals/DotMatrixBackground.module.css',
  'src/styles/tokens.css',
])
const manifest = JSON.parse(readFileSync(resolve(root, 'scripts/account-ux-reviewed-files.json'), 'utf8'))
assert.equal(manifest.baseline, accountUxBaseline)
const normalized = value => value.replaceAll('\r\n', '\n')
const digest = value => createHash('sha256').update(normalized(value)).digest('hex')
const pinFor = path => Object.hasOwn(manifest.files, path) ? manifest.files[path] : undefined
const originals = new Map()
for (const [path, pin] of Object.entries(manifest.files)) {
  assert.ok(accountUxPaths.includes(path), `Unknown account UX path: ${path}`)
  assert.match(pin.before, /^[a-f0-9]{64}$/)
  assert.match(pin.after, /^[a-f0-9]{64}$/)
  assert.notEqual(pin.before, pin.after, `Account UX pin must describe an actual delta: ${path}`)
}
export const accountUxFiles = () => Object.keys(manifest.files)

/** Individually reviewed presentation bytes only; never a path/directory exemption. */
export function verifyAccountUxSource(path, source) {
  const pin = pinFor(path)
  if (!pin) return false
  assert.equal(digest(source), pin.after, `Unreviewed account UX source: ${path}`)
  return true
}
export function reviewedAccountUx(path) {
  if (!pinFor(path)) return false
  return verifyAccountUxSource(path, readFileSync(resolve(root, path), 'utf8'))
}

/** Reverse the exact later presentation delta for historical source assertions.
 * Current component loaders continue to read the physical candidate directly.
 */
export function beforeAccountUx(path, source) {
  const pin = pinFor(path)
  if (!pin) return normalized(source)
  reviewedAccountUx(path)
  const actual = digest(source)
  assert.ok(actual === pin.before || actual === pin.after, `Only exact account UX delta may be normalized: ${path}`)
  if (actual === pin.before) return normalized(source)
  if (!originals.has(path)) {
    const original = normalized(execFileSync('git', ['show', `${accountUxBaseline}:${path}`], { cwd: root, encoding: 'utf8' }))
    assert.equal(digest(original), pin.before, `Account UX baseline differs: ${path}`)
    originals.set(path, original)
  }
  return originals.get(path)
}

export function accountUxExclusions() {
  return accountUxFiles().map(path => {
    assert.equal(reviewedAccountUx(path), true)
    return `:(exclude)${path}`
  })
}
