import assert from 'node:assert/strict'
import { moduleLoader } from './operators-test-harness.mjs'

// Explicit business-field presentation only: no authentication bypass or live API.
const load = moduleLoader()
const view = await load('src/features/operation/shared/businessPresentation.ts')
const company = await load('src/features/operation/companies/companyPresent.ts')
let checks = 0
const check = (name, fn) => { try { fn(); checks++ } catch (cause) { throw new Error(name, { cause }) } }
for (const [value, expected] of [
  ['11912345678', '(11) 91234-5678'], ['1132345678', '(11) 3234-5678'],
  ['5511912345678', '+55 (11) 91234-5678'], ['+5511912345678', '+55 (11) 91234-5678'],
  ['+55 (11) 91234-5678', '+55 (11) 91234-5678'], ['+12125550123', '+12125550123'],
  ['+442079460123', '+442079460123'], ['123', '123'], ['(11) •••••-5678', '(11) •••••-5678'],
  ['123456789012345678', '123456789012345678'],
]) check('phone formatting preserves all actual digits and never invents missing digits', () => {
  assert.equal(view.formatPhone(value), expected)
  assert.equal(view.formatPhone(value).replace(/\D/g, ''), value.replace(/\D/g, ''))
})
for (const ddd of ['11', '21', '61', '99']) for (const subscriber of ['01234567', '987654321']) {
  const value = ddd + subscriber
  check('every supported Brazilian phone digit is retained independently of its value', () => {
    assert.equal(view.formatPhone(value).replace(/\D/g, ''), value)
    assert.equal(view.formatPhone('55' + value).replace(/\D/g, ''), '55' + value)
  })
}
for (const value of [null, undefined, '', ' ', 42, 'Bearer synthetic-only', 'eyJsynthetic.payload.signature', '-----BEGIN PRIVATE KEY-----', 'QA\u0000value']) {
  check('absent, invalid and credential-like business values stay unavailable', () => assert.equal(view.businessText(value), null))
}
check('authorized explicit business text is complete rather than regex-redacted', () => {
  const value = 'QA qa@example.invalid 123.456.789-01'
  assert.equal(view.businessText(value), value)
  assert.equal(view.businessText('A'.repeat(513)), null)
})
check('canonical full Company CNPJ formatting retains digits and leaves Backend masks untouched', () => {
  assert.equal(company.formatCnpj('12345678000190'), '12.345.678/0001-90')
  assert.equal(company.formatCnpj('**.***.***/****-00'), '**.***.***/****-00')
  assert.equal(company.formatCnpj('12345'), '12345')
  assert.equal(company.formatCnpj(null), null)
})
console.log(`Data presentation: ${checks} focused checks passed (synthetic, no network)`)
