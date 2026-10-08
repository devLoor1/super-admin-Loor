import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

// Focused source checks using the existing TypeScript compiler; no test dependency.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(pathToFileURL(resolve(root, 'package.json')))
const modules = new Map()
async function moduleUrl(path) {
  if (modules.has(path)) return modules.get(path)
  let code = ts.transpileModule(await readFile(path, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText
  for (const match of [...code.matchAll(/from\s+(['"])([^'"]+)\1/g)]) {
    const specifier = match[2]
    const url = specifier.startsWith('.')
      ? await moduleUrl(resolve(dirname(path), `${specifier}.ts`))
      : pathToFileURL(require.resolve(specifier)).href
    code = code.replace(match[0], `from ${JSON.stringify(url)}`)
  }
  const url = `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
  modules.set(path, url)
  return url
}
const load = async (path) => import(await moduleUrl(resolve(root, path)))
const model = await load('src/features/governance-audit/auditModel.ts')
const format = await load('src/features/governance-audit/auditFormat.ts')
const { PROTOTYPE_AUDIT_EVENTS: events } = await load('src/features/governance-audit/prototypeAudit.ts')
const { PROTOTYPE_KYC_CASES: cases } = await load('src/features/compliance-kyc/prototypeKyc.ts')
const { kycDestinationForParticipant: destination } = await load('src/features/compliance-kyc/kycLinks.ts')
let checks = 0
function check(condition) { assert.ok(condition); checks += 1 }
function frozen(value) {
  if (!value || typeof value !== 'object') return
  check(Object.isFrozen(value))
  Object.values(value).forEach(frozen)
}
check(events.length === 28 && cases.length === 23)
frozen(events)
frozen(cases)
for (const value of ['toString', 'constructor', '__proto__', 'unknown', '', undefined]) {
  check(!model.isAuditAction(value))
  check(!model.isAuditResourceType(value))
}
for (const value of model.AUDIT_ACTIONS) check(model.isAuditAction(value))
for (const value of Object.keys(model.AUDIT_RESOURCE_LABEL)) check(model.isAuditResourceType(value))
check(format.fieldLabel('toString') === 'toString')
for (const key of ['password', 'refreshToken', 'Authorization', 'authHeaders', 'apiKey', 'webhookSecret', 'smtpPassword', 'cookies', 'cpf', 'cnpj', 'identity', 'documentPayload']) {
  check(format.formatAuditValue(key, 'synthetic-sentinel').sensitive)
  const raw = format.sanitizedRaw({ oldValue: { [key]: 'synthetic-sentinel' }, newValue: null })
  check(!raw.includes('synthetic-sentinel') && raw.includes('[redacted]'))
}
for (const value of [{ nested: { password: 'synthetic-sentinel' } }, [{ token: 'synthetic-sentinel' }], Infinity]) {
  check(format.formatAuditValue('context', value).sensitive)
  check(!format.sanitizedRaw({ oldValue: null, newValue: { context: value } }).includes('synthetic-sentinel'))
}
check(format.formatAuditValue('resourceUses', ['Modernização', 'Capital de Giro']).text === 'Modernização, Capital de Giro')
check(format.formatAuditValue('active', false).text === 'Não')
check(format.formatAuditValue('status', undefined).text === '—')
check(model.inPeriod('2026-10-09T01:00:00Z', 'today')) // still Oct 8 in São Paulo
check(!model.inPeriod('2026-10-09T03:00:00Z', 'today'))
check(destination('inv_proto_001').href.endsWith('/kyc_proto_0001'))
check(destination('inv_proto_002').caseCount === 2 && destination('inv_proto_002').href.includes('?participant='))
check(destination('inv_proto_008').caseCount === 0 && destination('inv_proto_008').href.includes('?participant='))
check(destination('emp_proto_004').href.endsWith('/kyc_proto_e004'))
for (const event of events) {
  if (event.resourceType === 'kyc_case') check(cases.some((item) => item.kycCaseId === event.resourceId))
  check(/^(192\.0\.2|198\.51\.100|203\.0\.113)\./.test(event.ip))
  for (const map of [event.oldValue, event.newValue]) {
    for (const [key, value] of Object.entries(map ?? {})) {
      if (format.isSensitiveKey(key)) check(value === null || value.redacted === true)
    }
  }
}
console.log(`Compliance/Audit focused source checks: ${checks} passed`)
