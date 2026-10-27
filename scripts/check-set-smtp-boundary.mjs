import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeSetSmtp, reviewedSetSmtp, setSmtpBaseline, setSmtpDigest, setSmtpFiles, setSmtpFinalized, setSmtpReviewPaths, verifySetSmtpSource } from './reviewed-set-smtp-boundary.mjs'
import { beforeConsolidation, execFileSync as historicalGit } from './reviewed-consolidation-boundary.mjs'
import { beforeAstSettings, reviewedAstSettings } from './reviewed-ast-settings-boundary.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).replaceAll('\r\n', '\n')
const source = path => readFileSync(resolve(root, path), 'utf8').replaceAll('\r\n', '\n')
const manifest = JSON.parse(source('scripts/set-smtp-reviewed-files.json'))
let checks = 0
function check(label, run) { try { run(); checks++ } catch (cause) { throw Error(label, { cause }) } }
check('final runtime diff was explicitly reviewed', () => assert.equal(setSmtpFinalized(), true, 'Run the reviewer-only finalization after reviewing the final runtime diff'))
check('all runtime changes have individual finalized review pins', () => {
  const paths = [...new Set((git('diff', '--name-only', setSmtpBaseline, '--', 'src') + '\n' + git('ls-files', '--others', '--exclude-standard', '--', 'src')).trim().split(/\r?\n/).filter(Boolean))].sort()
  assert.ok(paths.length > 0)
  // Keep every old SET pin; only exact reviewed successor additions are outside
  // this historical unit. The successor has its own complete-delta assertion.
  assert.deepEqual(setSmtpFiles().sort(), paths.filter(path => !reviewedAstSettings(path) || setSmtpFiles().includes(path)))
})
for (const path of setSmtpFiles()) {
  check(`exact current candidate and mutation rejection: ${path}`, () => {
    assert.ok(setSmtpReviewPaths.includes(path))
    assert.ok(existsSync(resolve(root, path)))
    const actual = source(path)
    assert.equal(reviewedSetSmtp(path), true)
    assert.equal(verifySetSmtpSource(path, actual), true)
    assert.throws(() => verifySetSmtpSource(path, actual + '\n// unreviewed'))
    assert.throws(() => beforeSetSmtp(path, actual + '\n// unreviewed'))
  })
  check(`baseline is independently verified; historical adaptation idempotent: ${path}`, () => {
    const pin = manifest.files[path], actual = source(path)
    const existed = git('ls-tree', '--name-only', setSmtpBaseline, '--', path).trim() === path
    assert.equal(pin.before, existed ? setSmtpDigest(git('show', `${setSmtpBaseline}:${path}`)) : null)
    const before = beforeSetSmtp(path, actual)
    assert.equal(before, pin.before === null ? beforeAstSettings(path, actual) : git('show', `${setSmtpBaseline}:${path}`))
    assert.equal(beforeSetSmtp(path, before), before)
    const historical = beforeConsolidation(path, actual)
    assert.equal(beforeConsolidation(path, historical), historical)
  })
}
for (const path of ['src/features/whitelabel-settings/UnknownWrite.ts', 'src/features/whitelabel-emails/UnexpectedSender.ts', 'src/lib/authSession.ts', 'src/features/menu-visibility/menuRegistry.ts', 'constructor', '__proto__']) check(`unlisted path cannot receive approval: ${path}`, () => {
  assert.equal(reviewedSetSmtp(path), false)
  assert.equal(verifySetSmtpSource(path, '// planted'), false)
})
check('historical source manifests remain immutable', () => {
  for (const path of ['scripts/settings-evolution-reviewed-files.json', 'scripts/account-ux-reviewed-files.json', 'scripts/consolidation-reviewed-files.json']) assert.equal(source(path), git('show', `${setSmtpBaseline}:${path}`))
})
check('native behavioral reads and explicit two-tree Git comparisons remain native', () => {
  const compatibility = source('scripts/reviewed-consolidation-boundary.mjs')
  assert.match(compatibility, /return nativeReadFile\(path, \.\.\.options\)/)
  assert.match(compatibility, /return nativeReadFileSync\(path, \.\.\.options\)/)
  const args = ['diff', '--name-only', '9f7f71e328440972dfd63588e9e981fbb2ced673', setSmtpBaseline, '--', 'src']
  assert.equal(historicalGit('git', args, { cwd: root, encoding: 'utf8' }), execFileSync('git', args, { cwd: root, encoding: 'utf8' }))
})
console.log(`SET/SMTP review boundary: ${checks} exact-pin checks passed; historical manifests and actual behavior loaders preserved`)
