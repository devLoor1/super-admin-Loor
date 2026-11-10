import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createShowcaseBoundary, reviewedShowcase, showcaseBaseline, showcaseDigest, showcaseFiles, showcaseFinalized, showcaseReviewPaths, withoutShowcase } from './reviewed-showcase-boundary.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = path => readFileSync(resolve(root, path), 'utf8').replaceAll('\r\n', '\n')
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).replaceAll('\r\n', '\n')
let checks = 0
function check(label, run) { try { run(); checks++ } catch (cause) { throw Error(label, { cause }) } }

function fixture(finalized = true) {
  const path = 'src/app/navigationGuard.ts', previous = 'previous\n', current = 'current\n'
  let physical = current, baseline = previous
  const manifest = { baseline: showcaseBaseline, finalized, files: { [path]: { before: showcaseDigest(previous), after: showcaseDigest(current) } } }
  const boundary = createShowcaseBoundary(manifest, () => physical, () => baseline)
  return { path, current, previous, manifest, boundary, setPhysical: value => { physical = value }, setBaseline: value => { baseline = value } }
}
check('provisional review gives no exemption or source reversal', () => {
  const f = fixture(false)
  assert.equal(f.boundary.reviewed(f.path), false)
  assert.equal(f.boundary.without(f.path, f.current), f.current)
  assert.throws(() => f.boundary.exclusions())
})
check('only exact physical and supplied successors are reversed', () => {
  const f = fixture()
  assert.equal(f.boundary.reviewed(f.path), true)
  assert.equal(f.boundary.without(f.path, f.current), f.previous)
  assert.equal(f.boundary.without(f.path, f.previous), f.previous)
  assert.equal(f.boundary.without(f.path, 'unrelated'), 'unrelated')
  assert.equal(f.boundary.without(f.path, f.current + '// extra'), f.current + '// extra')
  f.setPhysical('changed')
  assert.throws(() => f.boundary.reviewed(f.path))
  assert.throws(() => f.boundary.without(f.path, f.current))
  assert.throws(() => f.boundary.exclusions())
})
check('independent predecessor digest cannot be forged', () => {
  const f = fixture()
  f.setBaseline('changed')
  assert.throws(() => f.boundary.without(f.path, f.current))
})
check('unknown files, directories, prototypes and auth code cannot be exempted', () => {
  const f = fixture()
  for (const path of ['src/features/whitelabel-showcase', 'src/features/whitelabel-showcase/UnexpectedWrite.ts', 'src/features/whitelabel-showcase/showcaseSimulation.ts', 'src/features/whitelabel-showcase/fixtures/showcaseSeed.ts', 'src/lib/authSession.ts', 'src/features/menu-visibility/menuRegistry.ts', 'constructor', '__proto__']) {
    assert.equal(f.boundary.reviewed(path), false)
    assert.throws(() => createShowcaseBoundary({ ...f.manifest, files: { [path]: f.manifest.files[f.path] } }, () => f.current, () => f.previous))
  }
})
check('final review covers every changed or added runtime file', () => {
  assert.equal(showcaseFinalized(), true, 'Review the final runtime diff before finalizing; this check never writes pins')
  const paths = [...new Set((git('diff', '--name-only', showcaseBaseline, '--', 'src') + '\n' + git('ls-files', '--others', '--exclude-standard', '--', 'src')).trim().split(/\r?\n/).filter(Boolean))].sort()
  assert.deepEqual(showcaseFiles().sort(), paths)
  for (const path of paths) {
    assert.ok(showcaseReviewPaths.includes(path))
    assert.equal(reviewedShowcase(path), true)
  }
})
for (const path of showcaseFiles()) {
  if (/\.(?:png|webp|woff2)$/.test(path)) continue
  check(`shared source reverses only exact reviewed delta: ${path}`, () => {
    const current = source(path)
    assert.equal(withoutShowcase(path, current + '\n// extra'), current + '\n// extra')
    if (git('ls-tree', '--name-only', showcaseBaseline, '--', path).trim() === path) {
      assert.equal(withoutShowcase(path, current), git('show', `${showcaseBaseline}:${path}`))
    } else assert.equal(withoutShowcase(path, current), current)
  })
}
check('historical review manifests and auth/menu/dependencies remain unchanged', () => {
  for (const path of ['scripts/consolidation-reviewed-files.json', 'scripts/settings-evolution-reviewed-files.json', 'scripts/account-ux-reviewed-files.json', 'scripts/set-smtp-reviewed-files.json', 'scripts/operational-ux-reviewed-files.json', 'scripts/ast-settings-reviewed-files.json', 'scripts/participant-creation-reviewed-files.json', 'src/lib/authSession.ts', 'src/lib/api.ts', 'src/features/menu-visibility/menuRegistry.ts', 'package.json', 'package-lock.json']) {
    assert.equal(source(path), git('show', `${showcaseBaseline}:${path}`), path)
  }
})
check('behavioral loaders keep physical candidate reads', () => {
  const compatibility = source('scripts/reviewed-consolidation-boundary.mjs')
  assert.match(compatibility, /return nativeReadFile\(path, \.\.\.options\)/)
  assert.match(compatibility, /return nativeReadFileSync\(path, \.\.\.options\)/)
  for (const path of ['scripts/check-showcase-navigation.mjs', 'scripts/check-showcase-operational.mjs']) {
    assert.doesNotMatch(source(path), /withoutShowcase|beforeConsolidation|reviewed-showcase-boundary/)
  }
})
console.log(`Showcase review boundary: ${checks} checks passed; exact successor paths, immutable prior manifests, physical behavioral loaders.`)
