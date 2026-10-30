import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const participantBaseline = 'd78fc0ab94a1989dbcc73ba58ce62cfb509b8777'
export const participantReviewPaths = Object.freeze([
  'src/lib/api.ts', 'src/app/presentationAvailability.ts',
  'src/features/whitelabel-accounts/WhitelabelAccountsPage.tsx',
  'src/features/whitelabel-accounts/AccountDetailPanel.tsx',
  'src/features/whitelabel-accounts/creation/participantCreationContract.ts',
  'src/features/whitelabel-accounts/creation/participantCreationClient.ts',
  'src/features/whitelabel-accounts/creation/ParticipantCreateAction.tsx',
  'src/features/whitelabel-accounts/creation/ParticipantAccessDelivery.tsx',
  'src/features/whitelabel-accounts/creation/ParticipantCreation.module.css',
])
export const participantDigest = source => createHash('sha256').update(source.replaceAll('\r\n','\n')).digest('hex')
export function createParticipantBoundary(manifest, readCurrent, readBaseline) {
  assert.equal(manifest.baseline, participantBaseline)
  for (const [path, pin] of Object.entries(manifest.files)) {
    assert.ok(participantReviewPaths.includes(path), 'Unqualified participant review path')
    assert.deepEqual(Object.keys(pin).sort(), ['after','before'])
    assert.match(pin.after, /^[a-f0-9]{64}$/)
    assert.ok(pin.before === null || /^[a-f0-9]{64}$/.test(pin.before))
  }
  function reviewed(path) {
    if (!manifest.finalized || !Object.hasOwn(manifest.files,path)) return false
    assert.equal(participantDigest(readCurrent(path)),manifest.files[path].after,`Unreviewed participant source: ${path}`)
    return true
  }
  function without(path, source) {
    if (!reviewed(path)) return source
    const pin=manifest.files[path]
    if (pin.before === null || participantDigest(source) !== pin.after) return source
    const baseline=readBaseline(path)
    assert.equal(participantDigest(baseline),pin.before,`Participant baseline changed: ${path}`)
    return baseline
  }
  return { reviewed, without, exclusions:()=>{assert.equal(manifest.finalized,true);return Object.keys(manifest.files).map(path=>{assert.equal(reviewed(path),true);return `:(exclude)${path}`})} }
}
const manifest = JSON.parse(readFileSync(resolve(root,'scripts/participant-creation-reviewed-files.json'),'utf8'))
const originals = new Map()
const boundary = createParticipantBoundary(manifest, path=>readFileSync(resolve(root,path),'utf8'), path=>{if(!originals.has(path))originals.set(path,execFileSync('git',['show',`${participantBaseline}:${path}`],{cwd:root,encoding:'utf8'}));return originals.get(path)})
// Historical freezes consume only this exact reviewed successor; runtime loaders stay physical.
export const withoutParticipantCreation = boundary.without
export const reviewedParticipantCreation = boundary.reviewed
export const participantCreationExclusions = boundary.exclusions
