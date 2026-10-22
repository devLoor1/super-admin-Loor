import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

// Canonical KYC/Audit boundary checks. Historical KYC fixtures stay isolated;
// authoritative KYC and Audit reads never resolve IDs through the prototype index.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(pathToFileURL(resolve(root, 'package.json')))
const modules = new Map()
async function moduleUrl(path) {
  if (modules.has(path)) return modules.get(path)
  let code = ts.transpileModule(await readFile(path, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText.replaceAll('import.meta.env', '({VITE_API_BASE_URL:"https://control-plane.example.invalid/api"})')
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
const present = await load('src/features/governance-audit/auditPresent.ts')
const route = await load('src/features/governance-audit/auditRoute.ts')
const { PROTOTYPE_KYC_CASES: cases } = await load('src/features/compliance-kyc/prototypeKyc.ts')
const { kycDestinationForParticipant: destination } = await load('src/features/compliance-kyc/kycLinks.ts')
const { auditHrefForCase, participantAccountHref } = await load('src/features/compliance-kyc/kycRefs.ts')
const accountsApi = await load('src/features/whitelabel-accounts/accountsApi.ts')
const accountsRoute = await load('src/features/whitelabel-accounts/accountsRoute.ts')
let checks = 0
function check(condition) { assert.ok(condition); checks += 1 }
function frozen(value) {
  if (!value || typeof value !== 'object') return
  check(Object.isFrozen(value))
  Object.values(value).forEach(frozen)
}
check(cases.length === 23)
frozen(cases)
for (const value of ['toString', 'constructor', '__proto__', 'FUTURE_ACTION']) {
  check(present.actionLabel(value) === value)
  check(present.resultMeta(value).tone === 'muted')
  check(present.resourceLabel(value) === value)
}
for (const key of ['password', 'refreshToken', 'Authorization', 'authHeaders', 'apiKey', 'webhookSecret', 'smtpPassword', 'cookies', 'cpf', 'cnpj', 'identity', 'documentPayload']) {
  const node = present.sanitizeAuditData({ oldValue: { [key]: 'synthetic-sentinel' }, newValue: null })
  check(present.isSensitiveAuditKey(key))
  check(!JSON.stringify(present.sanitizedJson(node)).includes('synthetic-sentinel'))
}
for (const value of [{ nested: { password: 'synthetic-sentinel' } }, [{ token: 'synthetic-sentinel' }], Infinity]) {
  check(!JSON.stringify(present.sanitizedJson(present.sanitizeAuditData(value))).includes('synthetic-sentinel'))
}
check(JSON.stringify(present.sanitizedJson(present.sanitizeAuditData({ resourceUses: ['Modernização', 'Capital de Giro'] }))).includes('Capital de Giro'))
check(present.sanitizeAuditData(false).text === 'Não')
check(present.sanitizeAuditData(undefined).kind === 'empty')
for (const participantId of ['inv_proto_001', 'inv_proto_002', 'inv_proto_008', 'emp_proto_004']) {
  check(destination(participantId).href === '#/compliance/kyc')
  check(destination(participantId).caseCount === null)
}
for (const item of cases) {
  const accountLink = participantAccountHref(item)
  const tenant = accountLink.match(/^#\/whitelabels\/([^/]+)\/accounts/)?.[1]
  const accountParams = new URLSearchParams(accountLink.split('?')[1])
  check(!accountsApi.isAccountsWhitelabelId(tenant)) // legacy KYC context must ask for a real tenant, never fetch prototype accounts
  check(accountsRoute.parseAccountsRoute(Object.fromEntries(accountParams)).state.kind === item.participantType)
  check(!accountParams.has('conta')) // no synthetic participant id becomes a Core account identity
  const params = new URLSearchParams(auditHrefForCase(item.kycCaseId).split('?')[1])
  const parsed = route.parseAuditRoute(Object.fromEntries(params))
  check(params.get('resourceType') === 'kyc_case')
  check(params.get('resourceId') === item.kycCaseId)
  check(parsed.ignored.length === 2)
  check(parsed.state.search === '' && parsed.state.page === 1 && parsed.state.order === 'desc')
  check(route.auditListHref(parsed.state) === '#/audit') // never fake a KYC-filtered Audit page
}
const auditApi = await readFile(resolve(root, 'src/features/governance-audit/auditApi.ts'), 'utf8')
const auditDetail = await readFile(resolve(root, 'src/features/governance-audit/AuditDetailPage.tsx'), 'utf8')
const kycStore = await readFile(resolve(root, 'src/features/compliance-kyc/kycStore.ts'), 'utf8')
check(!/prototypeKyc|kycStore|PROTOTYPE_/.test(auditApi))
check(!/auditApi|listAuditEvents|fetch\(/.test(kycStore))
check(/loadedAuditRecord\(auditEventId\)/.test(auditDetail))
check(/data-audit-detail-state="unavailable"/.test(auditDetail))
check(/ID do protótipo/.test(auditDetail))
check(!/authenticatedGet\(|fetch\(/.test(auditDetail))
console.log(`Compliance/Audit canonical boundary checks: ${checks} passed (synthetic, no network)`)
