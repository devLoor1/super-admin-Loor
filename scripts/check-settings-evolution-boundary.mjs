import assert from 'node:assert/strict'
import { execFileSync as nativeGit } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeSettingsEvolution, reviewedSettingsEvolution, settingsEvolutionBaseline, settingsEvolutionFiles, verifySettingsEvolutionSource } from './reviewed-settings-evolution-boundary.mjs'
import { beforeConsolidation, execFileSync } from './reviewed-consolidation-boundary.mjs'
import { reviewedAccountUx } from './reviewed-account-ux-boundary.mjs'
import { beforeSetSmtp, reviewedSetSmtp } from './reviewed-set-smtp-boundary.mjs'
import { reviewedAstSettings } from './reviewed-ast-settings-boundary.mjs'
import { reviewedOperationalUx, withoutOperationalUx } from './reviewed-operational-ux-boundary.mjs'
import { reviewedParticipantCreation } from './reviewed-participant-creation-boundary.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const normalized = source => source.replaceAll('\r\n', '\n')
const git = (...args) => nativeGit('git', args, { cwd: root, encoding: 'utf8' })
const source = path => readFileSync(resolve(root, path), 'utf8')
const pins = JSON.parse(source('scripts/settings-evolution-reviewed-files.json')).files
let checks = 0
function check(label, run) { try { run(); checks++ } catch (cause) { throw Error(label, { cause }) } }

check('all changed or added runtime files have individual exact pins', () => {
  const paths = [...new Set((git('diff', '--name-only', settingsEvolutionBaseline, '--', 'src') + '\n' + git('ls-files', '--others', '--exclude-standard', '--', 'src')).trim().split(/\r?\n/).filter(Boolean))].sort()
  // A later presentation unit has its own independently checked exact manifest.
  // Its files are not silently added to or re-pinned in this historical manifest.
  assert.deepEqual(settingsEvolutionFiles().sort(), paths.filter(path => !reviewedAccountUx(path) && (!reviewedSetSmtp(path) || settingsEvolutionFiles().includes(path)) && (!reviewedAstSettings(path) || settingsEvolutionFiles().includes(path)) && (!reviewedOperationalUx(path) || settingsEvolutionFiles().includes(path)) && (!reviewedParticipantCreation(path) || settingsEvolutionFiles().includes(path))))
})
for (const path of settingsEvolutionFiles()) {
  const actual = source(path)
  check(`current candidate is exact: ${path}`, () => {
    assert.equal(reviewedSettingsEvolution(path), true)
    assert.equal(verifySettingsEvolutionSource(path, actual), true)
    assert.throws(() => verifySettingsEvolutionSource(path, actual + '\n// unreviewed'))
    assert.throws(() => beforeSettingsEvolution(path, actual + '\n// unreviewed'))
  })
  check(`historical normalization is explicit and idempotent: ${path}`, () => {
    const before = beforeSettingsEvolution(path, actual)
    assert.equal(before, pins[path].before === null ? beforeSetSmtp(path, withoutOperationalUx(path, actual)) : normalized(git('show', `${settingsEvolutionBaseline}:${path}`)))
    const historical = beforeConsolidation(path, actual)
    assert.equal(beforeConsolidation(path, historical), historical)
  })
}
for (const path of ['src/features/whitelabel-settings/UnknownWrite.ts', 'src/features/whitelabel-emails/NewSender.ts', 'src/lib/authSession.ts', 'src/features/menu-visibility/menuRegistry.ts', 'constructor', '__proto__']) check(`unlisted path cannot receive approval: ${path}`, () => {
  assert.equal(reviewedSettingsEvolution(path), false)
  assert.equal(verifySettingsEvolutionSource(path, '// planted'), false)
})
check('original consolidation manifest is preserved', () => {
  const path = 'scripts/consolidation-reviewed-files.json'
  assert.equal(normalized(source(path)), normalized(git('show', `${settingsEvolutionBaseline}:${path}`)))
  assert.equal(git('diff', '--name-only', settingsEvolutionBaseline, '--', path).trim(), '')
})
check('compatibility source differs from actual current behavior without altering reads', () => {
  const path = 'src/app/App.tsx', actual = source(path)
  assert.match(actual, /OperationalSmtpPage/)
  assert.doesNotMatch(beforeSettingsEvolution(path, actual), /OperationalSmtpPage/)
  assert.equal(source(path), actual)
  const compatibility = source('scripts/reviewed-consolidation-boundary.mjs')
  assert.match(compatibility, /return nativeReadFile\(path, \.\.\.options\)/)
  assert.match(compatibility, /return nativeReadFileSync\(path, \.\.\.options\)/)
})
check('historical diff exclusions validate exact paths; explicit two-tree comparisons stay native', () => {
  const options = { cwd: root, encoding: 'utf8' }
  assert.equal(execFileSync('git', ['diff', '--name-only', settingsEvolutionBaseline, '--', 'src'], options).trim(), '')
  assert.equal(execFileSync('git', ['diff', '--name-only', '450b9d5a5a1eabb6f986222bf2e08e0b18a71464', settingsEvolutionBaseline, '--', 'src'], options), git('diff', '--name-only', '450b9d5a5a1eabb6f986222bf2e08e0b18a71464', settingsEvolutionBaseline, '--', 'src'))
})

console.log(`Settings evolution review boundary: ${checks} exact-pin checks passed; historical manifests and actual behavior loaders preserved`)
