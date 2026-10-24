import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { root } from './operators-test-harness.mjs'
// Exact reviewed SA-BE-002 paths only. Independent tests cover tenant/RBAC,
// password privacy, name aliases, stale/uncertain writes and last-active protection.
const pins = {
  'src/app/presentationAvailability.ts': 'ffb10f6365f5997b9ac4d9ee8d350ce71333fd013b2387b8aa980c53b5ef3cf3',
  'src/features/whitelabel-accounts/accountsApi.ts': '6521c482ade5acf094bd810f30c312636053eb0a9db3a083c81cd9af23ccb99e',
  'src/features/whitelabel-accounts/accountsPresent.ts': 'd9cf9c5675760fe7db2aea360fafa6ce87c93dc6de5fc211c2026652562f6387',
  'src/features/whitelabel-accounts/AccountListPanel.tsx': '01b3c86952e1d1fe8ed365d9859311f6f4809323e40fe265e19fb54f491b235a',
  'src/features/whitelabel-accounts/AccountDetailPanel.tsx': 'd3f7127c97156791a49daa74614886ffa89cd87f26d822b221073317e10a62cf',
  'src/features/whitelabel-accounts/WhitelabelAccountsPage.tsx': '70475aec7e51aa3aa699a532d6b8a0278d2c5256d607c61349177bbe378b66c2',
  'src/features/whitelabel-accounts/admin/adminLifecycleContract.ts': 'a1eac321c90a6ca1ba29195a72e41e8f056374815a69d43d2cc084795389f075',
  'src/features/whitelabel-accounts/admin/adminLifecycleClient.ts': 'b5fe1118f766d957dbf8ce49edbf77292aad8eca6e6061b7ffcc41ce495882b9',
  'src/features/whitelabel-accounts/admin/AdminLifecycleActions.tsx': '8e52f25d15625abedfc86c63121ecd7e3534c0935813f665b245c9b882808426',
  'src/features/whitelabel-accounts/admin/AdminLifecycle.module.css': 'acd4668fbc36057adda92b878c8abe23711bba1937e6319cd5d55470151ebbc7',
}
export function verifyAdminLifecycleSource(path, source) {
  if (!Object.hasOwn(pins, path)) return false
  assert.equal(createHash('sha256').update(source.replaceAll('\r\n', '\n')).digest('hex'), pins[path], `Unreviewed Admin lifecycle source: ${path}`)
  return true
}
export const reviewedAdminLifecycle = path => Object.hasOwn(pins, path) && verifyAdminLifecycleSource(path, readFileSync(resolve(root, path), 'utf8'))
export const adminLifecycleExclusions = () => Object.keys(pins).map(path => { assert.equal(reviewedAdminLifecycle(path), true); return `:(exclude)${path}` })
export function withoutAdminReadiness(source) {
  verifyAdminLifecycleSource('src/app/presentationAvailability.ts', source)
  return source.replaceAll('\r\n', '\n').replace("/** Candidate lifecycle commands still require their release gates and authoritative Backend RBAC. */\nexport const administratorLifecycleAvailable = (roles: readonly string[]) => roles.includes('SUPER_ADMIN')\n", '')
}
