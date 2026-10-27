import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { setSmtpBaseline, setSmtpDigest, setSmtpReviewPaths } from './reviewed-set-smtp-boundary.mjs'

// Deliberate reviewer action only. Never called from a maintained suite/build.
assert.deepEqual(process.argv.slice(2), ['--finalize-reviewed'], 'Review the final runtime diff first, then explicitly pass --finalize-reviewed')
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' })
const paths = [...new Set((git('diff', '--name-only', setSmtpBaseline, '--', 'src') + '\n' + git('ls-files', '--others', '--exclude-standard', '--', 'src')).trim().split(/\r?\n/).filter(Boolean))].sort()
assert.ok(paths.length > 0, 'No SET/SMTP runtime delta to finalize')
const files = {}
for (const path of paths) {
  assert.ok(setSmtpReviewPaths.includes(path), `Review scope excludes this runtime change: ${path}`)
  assert.ok(existsSync(resolve(root, path)), `Runtime deletions are not in this delivery: ${path}`)
  const existed = execFileSync('git', ['ls-tree', '--name-only', setSmtpBaseline, '--', path], { cwd: root, encoding: 'utf8' }).trim() === path
  const before = existed ? setSmtpDigest(git('show', `${setSmtpBaseline}:${path}`)) : null
  const after = setSmtpDigest(readFileSync(resolve(root, path), 'utf8'))
  assert.notEqual(before, after, `Not a runtime delta: ${path}`)
  files[path] = { before, after }
}
writeFileSync(resolve(root, 'scripts/set-smtp-reviewed-files.json'), JSON.stringify({ baseline: setSmtpBaseline, finalized: true, files }, null, 2) + '\n')
console.log(`Finalized explicit SET/SMTP review pins for ${paths.length} runtime files. Run check-set-smtp-boundary and behavioral suites next; any runtime refinement requires a new review.`)
