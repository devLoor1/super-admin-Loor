import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeSetSmtp } from './reviewed-set-smtp-boundary.mjs'
import { withoutOperationalUx } from './reviewed-operational-ux-boundary.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const settingsEvolutionBaseline = 'f2c5bbf188ec101b092e0350e7f5c749a1975ce3'
const manifest = JSON.parse(readFileSync(resolve(root, 'scripts/settings-evolution-reviewed-files.json'), 'utf8'))
assert.equal(manifest.baseline, settingsEvolutionBaseline)
const normalize = source => source.replaceAll('\r\n', '\n')
const hash = source => createHash('sha256').update(normalize(source)).digest('hex')
const originals = new Map()
export const settingsEvolutionFiles = () => Object.keys(manifest.files)
const pinFor = path => Object.hasOwn(manifest.files, path) ? manifest.files[path] : undefined

for (const [path, pin] of Object.entries(manifest.files)) {
  assert.match(path, /^src\/[\w./-]+$/)
  assert.ok(!path.split('/').includes('..'))
  assert.ok(pin.before === null || /^[a-f0-9]{64}$/.test(pin.before))
  assert.ok(pin.after === null || /^[a-f0-9]{64}$/.test(pin.after))
}

/** Exact unit only; an unlisted path or any additional byte is never approved. */
export function verifySettingsEvolutionSource(path, source) {
  const pin = pinFor(path)
  if (!pin) return false
  source = withoutOperationalUx(path, source)
  source = beforeSetSmtp(path, source)
  if (pin.after === null) assert.equal(source, null, `Deleted Settings evolution source returned: ${path}`)
  else assert.equal(hash(source), pin.after, `Unreviewed Settings evolution change: ${path}`)
  return true
}
export function reviewedSettingsEvolution(path) {
  const pin = pinFor(path)
  if (!pin) return false
  const absolute = resolve(root, path)
  if (pin.after === null) assert.equal(existsSync(absolute), false, `Deleted Settings evolution source returned: ${path}`)
  else verifySettingsEvolutionSource(path, readFileSync(absolute, 'utf8'))
  return true
}

/** Historical assertions see their original source; behavioral loaders do not use this adapter. */
export function beforeSettingsEvolution(path, source) {
  const pin = pinFor(path)
  if (!pin) return normalize(source)
  reviewedSettingsEvolution(path)
  source = withoutOperationalUx(path, source)
  // Nested older assertions may already hold the exact pre-evolution source.
  // The physical candidate was still verified above against the latest pins.
  if (pin.before !== null && hash(source) === pin.before) return normalize(source)
  source = beforeSetSmtp(path, source)
  if (pin.before === null) {
    assert.equal(hash(source), pin.after, `Only the exact added source may be reviewed: ${path}`)
    return normalize(source)
  }
  const digest = hash(source)
  assert.ok(digest === pin.before || digest === pin.after, `Only the exact Settings evolution delta may be normalized: ${path}`)
  if (digest === pin.before) return normalize(source)
  if (!originals.has(path)) {
    const original = normalize(execFileSync('git', ['show', `${settingsEvolutionBaseline}:${path}`], { cwd: root, encoding: 'utf8' }))
    assert.equal(hash(original), pin.before, `Settings evolution baseline differs: ${path}`)
    originals.set(path, original)
  }
  return originals.get(path)
}

/** Every exclusion is individually checked, including newly added runtime files. */
export function settingsEvolutionExclusions() {
  return settingsEvolutionFiles().map(path => {
    assert.equal(reviewedSettingsEvolution(path), true)
    return `:(exclude)${path}`
  })
}
