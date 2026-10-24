import assert from 'node:assert/strict'
import { withoutAdminReadiness } from './reviewed-admin-lifecycle-boundary.mjs'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { root } from './operators-test-harness.mjs'

// Exact reviewed unit boundary. Never exempt a directory. The command suite
// verifies the released review/about/archive subset and unreleased command denial.
const pins = {
  'src/app/presentationAvailability.ts': '17e3dd56fe7456ee119b126f69dab00d40d90416c5ddfc175687968e517f438a',
  'src/features/operation/opportunities/write/OpportunityEditorialPage.tsx': '2683949cfd98c57ec22207919b748a7478c65e2bdec09a3b9c4b263ba35863ce',
  'src/features/operation/opportunities/OpportunityDetailPage.tsx': '4b9ac79fc953f00af9b770a3c87a286980f969963200fbd0db62c69e7b024c4f',
  'src/lib/api.ts': '388f891c13cd1bbfc10a40534a487c4f078d217b2a88c0f0f97014c698aa4e5e',
  'src/features/operation/opportunities/OpportunityFormPage.tsx': '3966e21851c2ed515938a6a3d784ee969d024ff257593bd65a85570365e7c87d',
  'src/features/operation/opportunities/write/OpportunityWritePage.tsx': '5a62a059e15335b655c3c910c03aa076cfc99f84818670806946843f80aac408',
  'src/features/operation/opportunities/write/OpportunityWrite.module.css': '00cc872ddd271900a7abc9bd4f52ddee3e9a29adcdc024965cd09a407c5c6a24',
  'src/features/operation/opportunities/write/opportunityWriteClient.ts': '159348f9bf4ceabfe23c2c2921b1fe1181394c55f4620d3eebecd98f861f86b6',
  'src/features/operation/opportunities/write/opportunityWriteContract.ts': '75df5231de7bad1e1b9503e35c76df122d984e4f6814b4664f281cd7ac38e844',
}
const normalized = source => source.replaceAll('\r\n', '\n')
export function verifyOpportunityWriteSource(path, source) {
  if (!Object.hasOwn(pins, path)) return false
  assert.equal(createHash('sha256').update(path==='src/app/presentationAvailability.ts'?withoutAdminReadiness(source):normalized(source)).digest('hex'), pins[path], `Unreviewed Opportunity write source: ${path}`)
  return true
}
export function reviewedOpportunityWrite(path) {
  return Object.hasOwn(pins, path) && verifyOpportunityWriteSource(path, readFileSync(resolve(root, path), 'utf8'))
}
export function opportunityWriteExclusions() {
  return Object.keys(pins).map(path => { assert.equal(reviewedOpportunityWrite(path), true); return `:(exclude)${path}` })
}
export function withoutOpportunityMultipart(source) {
  verifyOpportunityWriteSource('src/lib/api.ts', source)
  return normalized(source)
    .replace("  const multipart = typeof FormData !== 'undefined' && options.body instanceof FormData\n", '')
    .replace("if (options.body !== undefined && !multipart)", "if (options.body !== undefined)")
    .replace('body: multipart ? options.body as FormData : options.body !== undefined', 'body: options.body !== undefined')
}
export function withoutOpportunityReadiness(source) {
  verifyOpportunityWriteSource('src/app/presentationAvailability.ts', source)
  return withoutAdminReadiness(source)
    .replace("'operation-opportunity-new'])", "'operation-opportunity-new', 'operation-opportunity-edit'])")
    .split('\n').filter(line => !line.startsWith('/** SA-BE-001 accepted subset.') && !line.startsWith('export const opportunityEditorialAvailable') && !line.startsWith('export const opportunityActionAvailable')).join('\n')
}
