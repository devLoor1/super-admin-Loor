import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createExactRuntimeReview } from './exact-runtime-review.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const settingsParityBaseline = 'c0a23cc2e1bf86638f8da91bf8cdf03d62bf18dd'
export const settingsParityPaths = [
  ...['EmailBrandingWorkspace.tsx', 'EmailTemplatesWorkspace.tsx', 'emailBrandingDisplay.ts', 'emailEditorialModel.ts', 'emailTemplatesApi.ts'].map(name => 'src/features/whitelabel-emails/' + name),
  ...['ConfigurationEditor.tsx', 'ConfigurationPreview.tsx', 'ConfigurationStudio.tsx', 'ConfigurationStudio.module.css',
    'configurationContract.ts', 'OperationalSettingsPage.tsx', 'platformPresentationRead.ts',
    'TermsMarkdown.module.css', 'TermsMarkdown.tsx', 'TermsPanel.module.css', 'TermsPanel.tsx', 'termsPublication.ts',
    'VisualIdentitySettings.module.css', 'VisualIdentitySettings.tsx'].map(name => 'src/features/whitelabel-settings/' + name),
]
export const parityDigest = source => createHash('sha256').update(source.replaceAll('\r\n', '\n')).digest('hex')
export const settingsParityManifest = JSON.parse(readFileSync(resolve(root, 'scripts/settings-parity-reviewed-files.json'), 'utf8'))
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' })
const originals = new Map()
const boundary = createExactRuntimeReview(
  { label: 'settings parity', baseline: settingsParityBaseline, allowedPaths: settingsParityPaths, digest: parityDigest },
  settingsParityManifest,
  path => readFileSync(resolve(root, path), 'utf8'),
  path => {
    if (!originals.has(path)) originals.set(path, git('show', `${settingsParityBaseline}:${path}`))
    return originals.get(path)
  },
)
export const reviewedSettingsParity = boundary.reviewed
export const withoutSettingsParity = boundary.without
export const settingsParityExclusions = boundary.exclusions

/** Reconstruct an older inventory only for this reviewed delta. Prior changes to an
 * overlapping path remain visible, and unknown candidate paths remain in scope. */
export function pathsBeforeSettingsParity(baseline) {
  const paths = new Set([
    ...git('diff', '--name-only', '-z', baseline, '--', 'src').split('\0').filter(Boolean),
    ...git('ls-files', '--others', '--exclude-standard', '-z', '--', 'src').split('\0').filter(Boolean),
  ])
  const reviewed = Object.keys(settingsParityManifest.files)
  if (settingsParityManifest.finalized && reviewed.length) {
    const changedBefore = new Set(git('diff', '--name-only', '-z', baseline, settingsParityBaseline, '--', ...reviewed).split('\0').filter(Boolean))
    for (const path of reviewed) {
      assert.equal(reviewedSettingsParity(path), true)
      if (changedBefore.has(path)) paths.add(path)
      else paths.delete(path)
    }
  }
  return [...paths].sort()
}
