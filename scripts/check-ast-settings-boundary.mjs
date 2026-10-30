import assert from 'node:assert/strict'
import { reviewedParticipantCreation } from './reviewed-participant-creation-boundary.mjs'
import { execFileSync as nativeGit } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { astSettingsBaseline, astSettingsDigest, astSettingsFiles, astSettingsFinalized, astSettingsReviewPaths, beforeAstSettings, createAstSettingsBoundary, reviewedAstSettings, verifyAstSettingsSource, withoutAstSettings } from './reviewed-ast-settings-boundary.mjs'
import { beforeConsolidation, execFileSync as historicalGit, readFile as physicalRead, readFileSync as physicalReadSync } from './reviewed-consolidation-boundary.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const normalize = source => source.replaceAll('\r\n', '\n')
const source = path => normalize(readFileSync(resolve(root, path), 'utf8'))
const git = (...args) => normalize(nativeGit('git', args, { cwd: root, encoding: 'utf8' }))
const manifest = JSON.parse(source('scripts/ast-settings-reviewed-files.json'))
let checks = 0
async function check(label, run) { try { await run(); checks++ } catch (cause) { throw Error(label, { cause }) } }

// Adversarial checks run without finalizing, editing or substituting a physical
// runtime file. They test the same factory used by the production adapter.
function fixture({ finalized = true, added = false } = {}) {
  const path = 'src/app/App.tsx', previous = 'export const previous = true\n', current = 'export const current = true\n'
  let physical = current, baseline = previous
  const review = { baseline: astSettingsBaseline, finalized, files: { [path]: { before: added ? null : astSettingsDigest(previous), after: astSettingsDigest(current) } } }
  const boundary = createAstSettingsBoundary(review, { readCurrent: () => physical, readBaseline: () => baseline })
  return { path, previous, current, review, boundary, setPhysical: value => { physical = value }, setBaseline: value => { baseline = value } }
}
await check('provisional pins confer no approval, reversal or exclusion', () => {
  const f = fixture({ finalized: false })
  assert.equal(f.boundary.reviewed(f.path), false)
  assert.equal(f.boundary.verifySource(f.path, f.current), false)
  assert.equal(f.boundary.before(f.path, f.current), f.current)
  assert.throws(() => f.boundary.exclusions(), /not finalized/)
})
await check('only exact supplied bytes can be normalized, with idempotent reversal', () => {
  const f = fixture()
  assert.equal(f.boundary.verifySource(f.path, f.current), true)
  assert.equal(f.boundary.before(f.path, f.current), f.previous)
  assert.equal(f.boundary.before(f.path, f.previous), f.previous)
  assert.throws(() => f.boundary.verifySource(f.path, f.current + '// extra'))
  assert.throws(() => f.boundary.before(f.path, f.current + '// extra'))
  assert.throws(() => f.boundary.before(f.path, f.previous + '// extra'))
})
await check('an exact supplied string cannot hide changed physical bytes', () => {
  const f = fixture()
  f.setPhysical(f.current + '// extra')
  assert.throws(() => f.boundary.verifySource(f.path, f.current), /physical/)
  assert.throws(() => f.boundary.before(f.path, f.previous), /physical/)
  assert.throws(() => f.boundary.exclusions(), /physical/)
})
await check('independent baseline verification rejects forged predecessor bytes', () => {
  const f = fixture()
  f.setBaseline('unreviewed baseline')
  assert.throws(() => f.boundary.before(f.path, f.current), /baseline differs/)
})
await check('added files never acquire fabricated historical content', () => {
  const f = fixture({ added: true })
  assert.equal(f.boundary.before(f.path, f.current), f.current)
  assert.throws(() => f.boundary.before(f.path, f.previous))
})
await check('unknown paths, directories and prototype names cannot become approved', () => {
  const f = fixture()
  for (const path of ['src/features/whitelabel-settings/UnexpectedWrite.ts', 'src/features/whitelabel-settings', 'src/lib/authSession.ts', 'src/features/menu-visibility/menuRegistry.ts', 'constructor', '__proto__', '../src/app/App.tsx']) {
    assert.equal(f.boundary.reviewed(path), false)
    assert.equal(f.boundary.verifySource(path, f.current), false)
    assert.throws(() => createAstSettingsBoundary({ ...f.review, files: Object.fromEntries([[path, f.review.files[f.path]]]) }, { readCurrent: () => f.current, readBaseline: () => f.previous }), /Unqualified/)
  }
})
await check('predecessor manifests remain immutable before any finalization', () => {
  for (const path of ['scripts/consolidation-reviewed-files.json', 'scripts/settings-evolution-reviewed-files.json', 'scripts/account-ux-reviewed-files.json', 'scripts/set-smtp-reviewed-files.json']) assert.equal(source(path), git('show', `${astSettingsBaseline}:${path}`))
})
await check('explicit two-tree Git comparisons remain native even before finalization', () => {
  const args = ['diff', '--name-only', 'ebc2f49b328e7185b679e7413b355056b4b49554', astSettingsBaseline, '--', 'src']
  const options = { cwd: root, encoding: 'utf8' }
  assert.equal(historicalGit('git', args, options), nativeGit('git', args, options))
})
console.log(`AST/settings adapter: ${checks} adversarial checks passed; candidate review gate follows`)

await check('final runtime diff was independently reviewed', () => assert.equal(astSettingsFinalized(), true, 'AST/settings manifest is provisional: review final runtime bytes and explicitly finalize; this suite never updates pins'))
await check('every changed or added runtime file has one exact reviewed pin', () => {
  const paths = [...new Set((git('diff', '--name-only', astSettingsBaseline, '--', 'src') + '\n' + git('ls-files', '--others', '--exclude-standard', '--', 'src')).trim().split(/\r?\n/).filter(Boolean))].sort()
  assert.ok(paths.length > 0)
  // Later participant-only files are separately pinned/tested; overlapping AST files stay in this gate.
  assert.deepEqual(astSettingsFiles().sort(), paths.filter(path => astSettingsFiles().includes(path) || !reviewedParticipantCreation(path)))
})
for (const path of astSettingsFiles()) {
  await check(`exact physical/supplied source and mutation rejection: ${path}`, () => {
    assert.ok(astSettingsReviewPaths.includes(path))
    assert.ok(existsSync(resolve(root, path)))
    const actual = source(path)
    assert.equal(reviewedAstSettings(path), true)
    assert.equal(verifyAstSettingsSource(path, actual), true)
    assert.throws(() => verifyAstSettingsSource(path, actual + '\n// unreviewed'))
    assert.throws(() => beforeAstSettings(path, actual + '\n// unreviewed'))
  })
  await check(`baseline and full historical chain are exact/idempotent: ${path}`, () => {
    const pin = manifest.files[path], actual = source(path)
    const existed = git('ls-tree', '--name-only', astSettingsBaseline, '--', path).trim() === path
    assert.equal(pin.before, existed ? astSettingsDigest(git('show', `${astSettingsBaseline}:${path}`)) : null)
    const before = beforeAstSettings(path, actual)
    assert.equal(before, pin.before === null ? actual : git('show', `${astSettingsBaseline}:${path}`))
    assert.equal(beforeAstSettings(path, before), before)
    assert.equal(withoutAstSettings(path, actual), before)
    assert.equal(withoutAstSettings(path, before), before)
    assert.equal(withoutAstSettings(path, '// unrelated historical bytes'), '// unrelated historical bytes')
    const historical = beforeConsolidation(path, actual)
    assert.equal(beforeConsolidation(path, historical), historical)
  })
  await check(`behavioral file readers retain physical candidate: ${path}`, async () => {
    const absolute = resolve(root, path), actual = readFileSync(absolute, 'utf8')
    assert.equal(physicalReadSync(absolute, 'utf8'), actual)
    assert.equal(await physicalRead(absolute, 'utf8'), actual)
  })
}
await check('new behavioral suites load physical sources without historical adaptation', () => {
  for (const path of ['scripts/check-configuration-studio.mjs', 'scripts/check-platform-assets.mjs', 'scripts/check-email-templates.mjs']) {
    assert.ok(existsSync(resolve(root, path)))
    assert.doesNotMatch(source(path), /beforeAstSettings|beforeSetSmtp|beforeConsolidation|reviewed-ast-settings-boundary/)
  }
  const loader = source('scripts/operators-test-harness.mjs')
  assert.doesNotMatch(loader, /beforeAstSettings|beforeSetSmtp|beforeConsolidation/)
  assert.match(source('scripts/check-email-templates.mjs'), /from 'node:fs\/promises'/)
})
console.log(`AST/settings review boundary: ${checks} checks passed; prior manifests, native reads and current behavioral tests preserved`)
