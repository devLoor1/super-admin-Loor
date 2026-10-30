import assert from 'node:assert/strict'
import { withoutAstSettings } from './reviewed-ast-settings-boundary.mjs'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const operationalUxBaseline = 'fe7a9a839c5f5595825661c136aa1107c5071c6f'
// Maximum presentation review scope, not a directory exclusion or approval.
// Only finalized, individually reviewed before/after bytes qualify below.
export const operationalUxReviewPaths = Object.freeze([
  'src/components/shell/TopHeader.module.css',
  'src/features/compliance-kyc/KycListPage.tsx',
  'src/features/control-plane-operators/OperatorsListPage.tsx',
  'src/features/control-plane-operators/Operators.module.css',
  'src/features/dashboard/DashboardPage.module.css',
  'src/features/dashboard/DashboardPage.tsx',
  'src/features/dashboard/QuickActionsPanel.module.css',
  'src/features/dashboard/QuickActionsPanel.tsx',
  'src/features/finance-core/investments/InvestmentsPage.tsx',
  'src/features/finance-core/payments/PaymentsPage.tsx',
  'src/features/finance-core/wallets/WalletsPage.tsx',
  'src/features/finance-gateways/sections/FinanceSections.module.css',
  'src/features/governance-audit/AuditListPage.tsx',
  'src/features/operation/companies/CompaniesPage.tsx',
  'src/features/operation/entrepreneurs/EntrepreneursPage.tsx',
  'src/features/operation/investors/InvestorsPage.tsx',
  'src/features/operation/opportunities/OpportunitiesPage.tsx',
  'src/features/operation/shared/Operation.module.css',
  'src/features/operation/shared/OperationUi.tsx',
  'src/features/whitelabel-accounts/AccountDetailPanel.module.css',
  'src/features/whitelabel-accounts/AccountListPanel.module.css',
  'src/features/whitelabel-accounts/AccountListPanel.tsx',
  'src/features/whitelabel-accounts/WhitelabelAccountsPage.module.css',
  'src/features/whitelabel-accounts/WhitelabelAccountsPage.tsx',
  'src/features/whitelabel-settings/OperationalSettingsPage.tsx',
  'src/features/whitelabel-settings/SettingsReadCards.tsx',
  'src/features/whitelabel-settings/SettingsRead.module.css',
  'src/features/whitelabel-settings/SettingsWriteEditor.tsx',
  'src/features/whitelabel-settings/SettingsWriteEditor.module.css',
  'src/features/whitelabel-emails/OperationalSmtpPage.tsx',
  'src/features/whitelabel-emails/SmtpMetadataEditor.tsx',
  'src/features/whitelabels/WhitelabelDetailPanel.module.css',
  'src/features/whitelabels/WhitelabelDetailPanel.tsx',
  'src/features/whitelabels/WhitelabelListPanel.module.css',
  'src/features/whitelabels/WhitelabelListPanel.tsx',
  'src/features/whitelabels/WhitelabelsPage.module.css',
  'src/features/whitelabels/WhitelabelsPage.tsx',
])
const manifest = JSON.parse(readFileSync(resolve(root, 'scripts/operational-ux-reviewed-files.json'), 'utf8'))
assert.equal(manifest.baseline, operationalUxBaseline)
assert.equal(typeof manifest.finalized, 'boolean')
assert.ok(manifest.files && typeof manifest.files === 'object' && !Array.isArray(manifest.files))
const normalize = source => source.replaceAll('\r\n', '\n')
export const operationalUxDigest = source => createHash('sha256').update(normalize(source)).digest('hex')
const pinFor = path => manifest.finalized && Object.hasOwn(manifest.files, path) ? manifest.files[path] : undefined
const originals = new Map()
for (const [path, pin] of Object.entries(manifest.files)) {
  assert.ok(operationalUxReviewPaths.includes(path), `Unqualified operational UX path: ${path}`)
  assert.match(pin.before, /^[a-f0-9]{64}$/)
  assert.match(pin.after, /^[a-f0-9]{64}$/)
  assert.notEqual(pin.before, pin.after, `Operational UX pin must describe a real delta: ${path}`)
}
export const operationalUxFinalized = () => manifest.finalized
export const operationalUxFiles = () => Object.keys(manifest.files)

export function verifyOperationalUxSource(path, source) {
  const pin = pinFor(path)
  if (!pin) return false
  source = withoutAstSettings(path, source)
  assert.equal(operationalUxDigest(source), pin.after, `Unreviewed operational UX source: ${path}`)
  return true
}
export function reviewedOperationalUx(path) {
  if (!pinFor(path)) return false
  return verifyOperationalUxSource(path, readFileSync(resolve(root, path), 'utf8'))
}

/** Strict exact-delta reversal for this review's historical source assertions.
 * Neither filesystem readers nor component/runtime loaders use this function. */
export function beforeOperationalUx(path, source) {
  const pin = pinFor(path)
  if (!pin) return normalize(source)
  reviewedOperationalUx(path)
  source = withoutAstSettings(path, source)
  const digest = operationalUxDigest(source)
  assert.ok(digest === pin.before || digest === pin.after, `Only exact operational UX bytes may be normalized: ${path}`)
  if (digest === pin.before) return normalize(source)
  if (!originals.has(path)) {
    const original = normalize(execFileSync('git', ['show', `${operationalUxBaseline}:${path}`], { cwd: root, encoding: 'utf8' }))
    assert.equal(operationalUxDigest(original), pin.before, `Operational UX baseline differs: ${path}`)
    originals.set(path, original)
  }
  return originals.get(path)
}

/** An older boundary can already hold older, independently pinned bytes. Only
 * the exact new after hash is reversed here; anything else passes unchanged to
 * that boundary's original assertions. Unknown supplied bytes gain no approval.
 * The physical candidate is still verified on every participating path. */
export function withoutOperationalUx(path, source) {
  const pin = pinFor(path)
  if (!pin) return normalize(source)
  reviewedOperationalUx(path)
  source = withoutAstSettings(path, source)
  return operationalUxDigest(source) === pin.after ? beforeOperationalUx(path, source) : normalize(source)
}

export function operationalUxExclusions() {
  return operationalUxFiles().map(path => {
    assert.equal(reviewedOperationalUx(path), true)
    return `:(exclude)${path}`
  })
}
