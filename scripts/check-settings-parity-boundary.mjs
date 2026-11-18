import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createExactRuntimeReview } from './exact-runtime-review.mjs'
import { parityDigest, pathsBeforeSettingsParity, reviewedSettingsParity, settingsParityBaseline, settingsParityManifest as manifest, settingsParityPaths, withoutSettingsParity } from './reviewed-settings-parity-boundary.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = path => readFileSync(resolve(root, path), 'utf8').replaceAll('\r\n', '\n')
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).replaceAll('\r\n', '\n')
const pathList = (...args) => git(...args).split('\0').filter(Boolean)
const samplePath = settingsParityPaths[0]
const descriptor = { label: 'fixture', baseline: settingsParityBaseline, allowedPaths: [samplePath], digest: parityDigest }
const spec = { baseline: settingsParityBaseline, finalized: true, files: { [samplePath]: { before: parityDigest('old'), after: parityDigest('new') } } }
let physical = 'new', historical = 'old'
const sample = createExactRuntimeReview(descriptor, spec, () => physical, () => historical)
assert.equal(sample.without(samplePath, 'new'), 'old')
assert.equal(sample.without(samplePath, 'unreviewed'), 'unreviewed')
historical = 'other'
assert.throws(() => sample.without(samplePath, 'new'), /predecessor/)
historical = 'old'
physical = 'unreviewed'
assert.throws(() => sample.without(samplePath, 'new'), /physical/)
assert.throws(() => sample.exclusions(), /physical/)
assert.throws(() => createExactRuntimeReview(descriptor, { ...spec, files: { 'src/lib/api.ts': spec.files[samplePath] } }, () => 'new', () => 'old'), /Unqualified/)
const provisional = createExactRuntimeReview(descriptor, { ...spec, finalized: false }, () => 'new', () => 'old')
assert.equal(provisional.reviewed(samplePath), false)
assert.equal(provisional.without(samplePath, 'new'), 'new')
assert.throws(() => provisional.exclusions(), /not finalized/)

const paths = [...new Set([
  ...pathList('diff', '--name-only', '-z', settingsParityBaseline, '--', 'src'),
  ...pathList('ls-files', '--others', '--exclude-standard', '-z', '--', 'src'),
])].sort()
assert.equal(manifest.finalized, true, 'Review the final runtime diff and its exact byte pairs before finalizing.')
assert.ok(paths.length)
assert.deepEqual(Object.keys(manifest.files).sort(), paths)
const existing = new Set(pathList('ls-tree', '-r', '-z', '--name-only', settingsParityBaseline, '--', ...paths))
for (const path of paths) {
  const current = source(path)
  const previous = existing.has(path) ? git('show', `${settingsParityBaseline}:${path}`) : null
  assert.equal(manifest.files[path].before, previous === null ? null : parityDigest(previous))
  assert.equal(manifest.files[path].after, parityDigest(current))
  assert.equal(reviewedSettingsParity(path), true)
  assert.equal(withoutSettingsParity(path, current), previous ?? current)
  assert.equal(withoutSettingsParity(path, current + '// extra'), current + '// extra')
}

// The uncommitted parity work started on the parent of the published logo change.
// Keep historic pins reversible to that parent and check the actual review delta
// independently against the exact published tree, including files new to Git.
const published = 'b6316cb5dbb48112ecbf03fc496fb84a5e8614c0'
assert.equal(git('rev-parse', published + '^').trim(), settingsParityBaseline)
const publishedChanges = pathList('diff', '--name-only', '-z', settingsParityBaseline, published, '--', 'src')
assert.deepEqual(publishedChanges.sort(), [
  'src/features/whitelabel-emails/EmailTemplatesWorkspace.tsx',
  'src/features/whitelabel-emails/emailTemplatesApi.ts',
])
for (const path of publishedChanges) assert.ok(Object.hasOwn(manifest.files, path))
const releaseDelta = new Set([
  ...pathList('diff', '--name-only', '-z', published, '--', 'src'),
  ...pathList('ls-files', '--others', '--exclude-standard', '-z', '--', 'src'),
])
const integratedPaths = paths.filter(path =>
  !publishedChanges.includes(path) || parityDigest(git('show', published + ':' + path)) !== manifest.files[path].after)
assert.deepEqual([...releaseDelta].sort(), integratedPaths)
for (const name of readdirSync(resolve(root, 'scripts')).filter(name => name.endsWith('-reviewed-files.json') && name !== 'settings-parity-reviewed-files.json')) {
  const path = 'scripts/' + name
  assert.equal(source(path), git('show', `${settingsParityBaseline}:${path}`))
}
// A path modified by the showcase and again by parity must still be present in the
// older inventory. New parity-only terms/identity files must disappear from it.
const old = 'd49815d7fa3decd7f255c94b8826d64822d5b883'
assert.deepEqual(pathsBeforeSettingsParity(old), pathList('diff','--name-only','-z', old, settingsParityBaseline, '--', 'src').sort())
assert.deepEqual(pathsBeforeSettingsParity(settingsParityBaseline), [])
console.log(`Settings parity review: ${paths.length} exact runtime paths, predecessor manifests, inventory and adversarial checks passed.`)
