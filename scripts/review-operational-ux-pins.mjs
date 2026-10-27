import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { operationalUxBaseline, operationalUxDigest, operationalUxReviewPaths } from './reviewed-operational-ux-boundary.mjs'

// Explicit review step only. No check script invokes this or updates its pins.
// Run after the exact source diff has been reviewed; any later byte fails QA.
assert.deepEqual(process.argv.slice(2), ['--finalize-reviewed-diff'])
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).replaceAll('\r\n', '\n')
const changed = [...new Set((git('diff', '--name-only', operationalUxBaseline, '--', 'src') + '\n' + git('ls-files', '--others', '--exclude-standard', '--', 'src')).trim().split('\n').filter(Boolean))].sort()
assert.ok(changed.length > 0)
const files = {}
for (const path of changed) {
  assert.ok(operationalUxReviewPaths.includes(path), `Review must qualify this path explicitly: ${path}`)
  const before = operationalUxDigest(git('show', `${operationalUxBaseline}:${path}`))
  const after = operationalUxDigest(readFileSync(resolve(root, path), 'utf8'))
  assert.notEqual(before, after, `No substantive normalized delta: ${path}`)
  files[path] = { before, after }
}
writeFileSync(resolve(root, 'scripts/operational-ux-reviewed-files.json'), JSON.stringify({ baseline: operationalUxBaseline, finalized: true, files }, null, 2) + '\n')
console.log(`Pinned ${changed.length} individually reviewed operational UX files; no runtime source changed.`)
