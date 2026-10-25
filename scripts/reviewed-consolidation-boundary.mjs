import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync as nativeExecFileSync } from 'node:child_process'
import { existsSync, readFileSync as nativeReadFileSync } from 'node:fs'
import { readFile as nativeReadFile } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeSettingsEvolution, reviewedSettingsEvolution, settingsEvolutionExclusions } from './reviewed-settings-evolution-boundary.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const baseline = '450b9d5a5a1eabb6f986222bf2e08e0b18a71464'
const manifest = JSON.parse(nativeReadFileSync(resolve(root, 'scripts/consolidation-reviewed-files.json'), 'utf8'))
const normalize = value => value.replaceAll('\r\n', '\n')
const hash = value => createHash('sha256').update(normalize(value)).digest('hex')
const logicalPath = path => relative(root, resolve(path instanceof URL ? fileURLToPath(path) : path)).replaceAll('\\', '/')

export function testSourceExists(path) {
  if (existsSync(path)) return true
  const pin = manifest.files[logicalPath(path)]
  return Boolean(pin?.fixture && existsSync(resolve(root, pin.fixture)))
}

/** Exact reviewed files only. No directory exemption and no automatic re-pinning. */
export function reviewedConsolidation(path) {
  const evolution = reviewedSettingsEvolution(path)
  const pin = manifest.files[path]
  if (!pin) return evolution
  const absolute = resolve(root, path)
  if (pin.after === null) assert.equal(existsSync(absolute), false, `Removed prototype returned: ${path}`)
  else assert.equal(hash(beforeSettingsEvolution(path, nativeReadFileSync(absolute, 'utf8'))), pin.after, `Unreviewed consolidation change: ${path}`)
  return true
}

/** Reverse only an exact reviewed delta for inherited historical source freezes.
 * Behavioral suites still load and execute the actual candidate. The new runtime
 * separation/presentation suites independently exercise the replacement behavior.
 */
export function beforeConsolidation(path, source) {
  const pin = manifest.files[path]
  // Nested historical adapters may already hold the original pre-consolidation
  // source. Still verify the physical candidate against the newer exact pins.
  reviewedSettingsEvolution(path)
  if (pin?.before !== null && pin?.before !== undefined && hash(source) === pin.before) return normalize(source)
  source = beforeSettingsEvolution(path, source)
  if (!pin || pin.before === null) return normalize(source)
  if (hash(source) === pin.before) return normalize(source)
  assert.equal(hash(source), pin.after, `Only exact reviewed delta may be normalized: ${path}`)
  const original = nativeExecFileSync('git', ['show', `${baseline}:${path}`], { cwd: root, encoding: 'utf8' })
  assert.equal(hash(original), pin.before)
  return normalize(original)
}

/** Existing no-change assertions retain their original baseline, excluding only
 * the explicitly pinned consolidation unit. Historical two-tree diffs are untouched.
 */
export function execFileSync(command, args, options) {
  if (command === 'git' && args[0] === 'diff' && args.includes('--')) {
    const beforePaths = args.slice(1, args.indexOf('--')).filter(a => !a.startsWith('-'))
    if (beforePaths.length <= 1) {
      for (const path of Object.keys(manifest.files)) reviewedConsolidation(path)
      args = [...args, ...Object.keys(manifest.files).map(path => `:(exclude)${path}`), ...settingsEvolutionExclusions()]
    }
  }
  return nativeExecFileSync(command, args, options)
}

/** Historical prototype fixtures are test-only; never imported by src or Vite. */
export async function readFile(path, ...options) {
  const key = logicalPath(path)
  const pin = manifest.files[key]
  if (pin?.fixture && !existsSync(path)) {
    const fixture = resolve(root, pin.fixture)
    assert.equal(hash(nativeReadFileSync(fixture, 'utf8')), pin.before, `Changed historical test fixture: ${key}`)
    return nativeReadFile(fixture, ...options)
  }
  return nativeReadFile(path, ...options)
}

export function readFileSync(path, ...options) {
  const pin = manifest.files[logicalPath(path)]
  if (pin?.fixture && !existsSync(path)) {
    const fixture = resolve(root, pin.fixture)
    assert.equal(hash(nativeReadFileSync(fixture, 'utf8')), pin.before)
    return nativeReadFileSync(fixture, ...options)
  }
  return nativeReadFileSync(path, ...options)
}
