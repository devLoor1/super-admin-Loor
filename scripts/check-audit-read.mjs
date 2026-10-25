import assert from 'node:assert/strict'
import { execFileSync } from './reviewed-consolidation-boundary.mjs'
import { readdir } from 'node:fs/promises'
import { readFile } from './reviewed-consolidation-boundary.mjs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

// In-memory unit contracts only. No browser bypass, real token or network call.
// Same dependency-free TypeScript-loader convention as check-dashboard-read.
// Fixtures mirror the Audit row structure observed on homolog (synthetic values only).
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
const storage = new Map()
globalThis.sessionStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
}
globalThis.window = { setTimeout, clearTimeout, location: { hash: '' } }
let fetchImpl = async () => { throw new Error('Unexpected unit request') }
globalThis.fetch = (...args) => fetchImpl(...args)

const auth = await load('src/lib/authSession.ts')
const errors = await load('src/lib/apiErrors.ts')
const api = await load('src/features/governance-audit/auditApi.ts')
const route = await load('src/features/governance-audit/auditRoute.ts')
const present = await load('src/features/governance-audit/auditPresent.ts')
const operator = { id: 'synthetic-operator', name: 'Unit QA', email: 'qa@example.invalid', roles: ['SUPER_ADMIN'] }
const session = () => ({ accessToken: 'synthetic-unit-token-audit', tokenType: 'Bearer', operator })
// Observed row structure (homolog, 2026-10-14): field names / types / tokens; synthetic values.
const success = {
  id: 'ckqaev00000000000000000001', superAdminId: 'ckqaop00000000000000000001', action: 'LOGIN_SUCCESS', resourceType: null,
  resourceId: null, whitelabelId: null, beforeData: null, afterData: null, result: 'success', ip: '198.51.100.10',
  userAgent: 'Synthetic UA', correlationId: '00000000-0000-4000-8000-000000000001', createdAt: '2026-10-14T12:00:00.000Z',
  superAdmin: { id: 'ckqaop00000000000000000001', name: 'Synthetic Operator', email: 'operator@example.invalid' },
}
const unknownFailure = { ...success, id: 'ckqaev00000000000000000002', action: 'LOGIN_FAILURE', result: 'failed', superAdminId: null,
  superAdmin: null, afterData: { email: 'attempt@example.invalid' } }
const meta = (overrides = {}) => ({ page: 1, perPage: 8, total: 1, lastPage: 1, ...overrides })
const json = (value, status = 200) => new Response(JSON.stringify(value), { status })
const reset = () => { auth.clearSession(); auth.clearAuthNotice(); window.location.hash = '' }
let checks = 0
async function check(name, action) {
  try { await action(); checks += 1 } catch (cause) { throw new Error(`Failed: ${name}`, { cause }) }
}

/* ---------- parsing ---------- */
await check('observed success row maps to the audit record (actor from superAdmin)', async () => {
  const record = api.parseAuditRecord(success)
  assert.equal(record.id, success.id); assert.equal(record.action, 'LOGIN_SUCCESS'); assert.equal(record.result, 'success')
  assert.deepEqual(record.actor, { id: success.superAdminId, name: 'Synthetic Operator', email: 'operator@example.invalid' })
  assert.equal(record.whitelabelId, null); assert.equal(record.resourceType, null); assert.equal(record.correlationId, success.correlationId)
})
await check('observed unknown-e-mail failure keeps no actor and its raw afterData for sanitized rendering', async () => {
  const record = api.parseAuditRecord(unknownFailure)
  assert.equal(record.actorId, null); assert.equal(record.actor, null); assert.deepEqual(record.afterData, { email: 'attempt@example.invalid' })
})
await check('tenant id: positive integer → string; anything else → null (never guessed)', async () => {
  assert.equal(api.parseAuditRecord({ ...success, whitelabelId: 4 }).whitelabelId, '4')
  for (const bad of ['4', 0, -1, 1.5, {}]) assert.equal(api.parseAuditRecord({ ...success, whitelabelId: bad }).whitelabelId, null)
})
for (const [bad, label] of [[{ ...success, id: null }, 'missing id'], [{ ...success, id: 'AUD 1' }, 'invalid id'], [{ ...success, action: '' }, 'empty action'],
  [{ ...success, action: 'drop table;' }, 'non-token action'], [{ ...success, action: 'eyJabc.abc.sig' }, 'credential-shaped action'],
  [{ ...success, createdAt: 'yesterday' }, 'invalid createdAt'], [{ ...success, createdAt: '1234' }, 'numeric date'],
  [{ ...success, createdAt: '2026-10-14' }, 'date-only'], [{ ...success, createdAt: '2026-02-30T00:00:00Z' }, 'calendar rollover'],
  [{ ...success, superAdmin: { ...success.superAdmin, id: 'ckqaop00000000000000000009' } }, 'actor object of another operator'],
  [{ ...success, superAdmin: 'Synthetic Operator' }, 'actor not an object'], [{ ...success, superAdminId: 42 }, 'non-string actor id'],
  [null, 'null'], [[], 'array']]) {
  await check(`identity is strict: ${label} fails closed`, async () =>
    assert.throws(() => api.parseAuditRecord(bad), (error) => error.kind === 'malformed'))
}
await check('list: pagination validated; empty and out-of-range pages allowed', async () => {
  assert.equal(api.parseAuditList({ data: [success], meta: meta() }).rows.length, 1)
  assert.equal(api.parseAuditList({ data: [], meta: meta({ total: 0 }) }).total, 0)
  assert.equal(api.parseAuditList({ data: [], meta: meta({ page: 9, total: 33, lastPage: 5 }) }).page, 9)
})
for (const bad of [{}, { data: [success] }, { data: [success, success], meta: meta({ total: 2 }) }, { data: [], meta: meta({ total: 5 }) },
  { data: [success], meta: meta({ total: 0 }) }, { data: [success], meta: meta({ total: 20, lastPage: 1 }) },
  { data: [success], meta: meta({ perPage: 101 }) },
  { data: Array(9).fill(0).map((_, i) => ({ ...success, id: `ckqaev0000000000000000001${i}` })), meta: meta({ total: 9, lastPage: 2 }) }]) {
  await check('malformed list / duplicate ids fail closed', async () =>
    assert.throws(() => api.parseAuditList(bad), (error) => error.kind === 'malformed'))
}

/* ---------- request ---------- */
await check('GET /audit sends only page / perPage / search / order (never sort or prototype filters)', async () => {
  reset(); auth.persistSession(session())
  const seen = []
  fetchImpl = async (url, options) => {
    const parsed = new URL(url)
    assert.equal(parsed.pathname, '/api/audit'); assert.equal(options.method, 'GET'); assert.equal(options.body, undefined)
    assert.equal(options.headers.Authorization, 'Bearer synthetic-unit-token-audit')
    assert.match(options.headers['X-Correlation-ID'], /^[0-9a-f-]{36}$/)
    seen.push(Object.fromEntries(parsed.searchParams))
    return json({ data: [success], meta: meta(parsed.searchParams.get('page') === '2' ? { page: 2, total: 9, lastPage: 2 } : {}) })
  }
  await api.listAuditEvents({ page: 1, search: '', order: 'desc' })
  await api.listAuditEvents({ page: 2, search: 'LOGIN', order: 'asc' })
  assert.deepEqual(seen, [{ page: '1', perPage: '8' }, { page: '2', perPage: '8', search: 'LOGIN', order: 'asc' }])
})
await check('rows loaded by this session are available to the detail; never after a session change', async () => {
  reset(); auth.persistSession(session())
  fetchImpl = async () => json({ data: [success], meta: meta() })
  assert.equal(api.loadedAuditRecord(success.id), null) // loaded by an earlier session version only
  await api.listAuditEvents({ page: 1, search: '', order: 'desc' })
  assert.equal(api.loadedAuditRecord(success.id).id, success.id)
  assert.equal(api.loadedAuditRecord('ckqaev99999999999999999999'), null)
  auth.clearSession()
  assert.equal(api.loadedAuditRecord(success.id), null)
  auth.persistSession(session())
  assert.equal(api.loadedAuditRecord(success.id), null)
})
await check('401 ends the session centrally; 403 / 502 / network keep it; no raw Backend text', async () => {
  reset(); auth.persistSession(session()); fetchImpl = async () => json({ code: 'FORBIDDEN' }, 403)
  await assert.rejects(api.listAuditEvents({ page: 1, search: '', order: 'desc' }), (error) => error.status === 403); assert.ok(auth.isAuthenticated())
  fetchImpl = async () => json({ code: 'INTERNAL_ERROR', message: 'Prisma raw detail: SELECT * FROM audit_logs' }, 500)
  const failure = await api.listAuditEvents({ page: 1, search: '', order: 'desc' }).catch((cause) => cause)
  const view = errors.describeApiError(failure, 'os eventos de auditoria')
  assert.equal(`${view.title} ${view.description}`.includes('Prisma'), false); assert.ok(auth.isAuthenticated())
  fetchImpl = async () => { throw new TypeError('Failed to fetch') }
  await assert.rejects(api.listAuditEvents({ page: 1, search: '', order: 'desc' }), (error) => error.kind === 'network'); assert.ok(auth.isAuthenticated())
  fetchImpl = async () => json({}, 401)
  await assert.rejects(api.listAuditEvents({ page: 1, search: '', order: 'desc' }), (error) => error.status === 401)
  assert.equal(auth.getAccessToken(), null); assert.equal(auth.peekAuthNotice(), 'session_expired')
})

/* ---------- URL state ---------- */
await check('scalar metadata detects complete credentials before truncating its presentation', async () => {
  const jwt = `eyJ${'a'.repeat(70)}.eyJ${'b'.repeat(70)}.sig`
  const record = api.parseAuditRecord({ ...success, userAgent: jwt, correlationId: jwt, result: jwt })
  assert.equal(record.userAgent, '••••••••')
  assert.equal(record.correlationId, '••••••••')
  assert.equal(record.result, '••••••••')
})
await check('URL: SA-BE-008 exact filters supported; invalid restrictions block reads rather than broaden', async () => {
  const parsed = route.parseAuditRoute({ page: '0', order: 'sideways', search: ` ${'x'.repeat(200)} `, resourceType: 'kyc_case', resourceId: 'kyc_proto_0002',
    whitelabel: 'wl_proto_01', actor: 'USR-SA-01', action: 'auth.login_failed' })
  assert.equal(parsed.valid, false)
  assert.equal(parsed.state.search, '')
  assert.equal(parsed.issues.length, 5)
  assert.equal(parsed.state.resourceType, 'kyc_case')
  assert.equal(parsed.state.action, 'auth.login_failed')
  assert.equal(route.auditListHref({ search: 'LOGIN & X', order: 'asc', page: 3 }), '#/audit?search=LOGIN+%26+X&order=asc&page=3')
  assert.equal(route.auditListHref({ order: 'desc', page: 1 }), '#/audit')
})
await check('detail URL keeps the list context; return destination restricted to the Audit list', async () => {
  const context = route.auditListHref({ search: 'LOGIN', order: 'asc', page: 2 })
  const href = route.auditEventHref('ckqaev00000000000000000001', context)
  assert.equal(route.auditListReturnHash(new URLSearchParams(href.split('?')[1]).get('returnTo')), context)
  for (const unsafe of ['https://example.invalid/', '//example.invalid', '#/dashboard', '#/audit-other', '#/audit/ckqaev1']) {
    assert.equal(route.auditListReturnHash(unsafe), '#/audit')
  }
})

/* ---------- sanitization ---------- */
const SENTINEL = 'synthetic-sentinel-value'
const allText = (node) => JSON.stringify(present.sanitizedJson(node))
for (const key of ['password', 'pass', 'passwd', 'pwd', 'smtpPass', 'smtp_pwd', 'pinCode', 'userPIN', 'credential', 'card', 'bankAccount', 'senha', 'secret', 'clientSecret', 'webhookSecret', 'token', 'refreshToken', 'accessToken',
  'Authorization', 'authHeaders', 'cookie', 'sessionId', 'credentials', 'apiKey', 'api_key', 'privateKey', 'pixKey', 'otp', 'mfaCode',
  'pin', 'cvv', 'cardNumber', 'iban', 'accountNumber', 'agencia', 'cpf', 'cnpj', 'rg', 'passport', 'document', 'documentPayload',
  'identity', 'biometrics', 'selfie', 'payload', 'signature']) {
  await check(`sensitive key "${key}" is never displayed`, async () => {
    const node = present.sanitizeAuditData({ [key]: SENTINEL })
    assert.equal(node.entries[0].node.kind, 'masked'); assert.equal(allText(node).includes(SENTINEL), false)
  })
}
await check('ordinary keys are shown (no over-masking of e.g. "org", "host", "port")', async () => {
  const node = present.sanitizeAuditData({ org: 'loor', host: 'smtp.example.invalid', port: 465, secure: true, discarded: false, cardinality: 3, compass: 'North' })
  assert.deepEqual(node.entries.map((entry) => entry.node.kind), Array(7).fill('text'))
  assert.equal(node.entries[3].node.text, 'Sim')
})
await check('Control Plane "[REDACTED]" marker, JWT / Bearer / PEM values are masked whatever the key', async () => {
  const node = present.sanitizeAuditData({ password: '[REDACTED]', note: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJxYSJ9.sig', header: 'Bearer abc.def',
    pem: '-----BEGIN PRIVATE KEY-----MIIE' })
  assert.deepEqual(node.entries.map((entry) => entry.node.kind), ['masked', 'masked', 'masked', 'masked'])
  assert.equal(node.entries[0].node.reason, 'sensitive-key')
  assert.equal(present.sanitizeAuditData({ value: '[REDACTED]' }).entries[0].node.reason, 'redacted-by-backend')
})
await check('authorized recorded e-mails are complete; malformed values remain hidden', async () => {
  assert.equal(present.auditEmail('attempt@example.invalid'), 'attempt@example.invalid')
  assert.equal(present.auditEmail('not an email'), '••••••••')
  const node = present.sanitizeAuditData({ email: 'attempt@example.invalid' })
  assert.equal(node.entries[0].node.text, 'attempt@example.invalid'); assert.equal(node.entries[0].node.kind, 'text')
  assert.equal(present.actorEmail({ actor: { id: 'x', name: null, email: 'operator@example.invalid' } }), 'operator@example.invalid')
  assert.equal(present.auditEmail('Bearer synthetic-only'), '••••••••')
})
await check('structure preserved; nested / array sensitive values masked; depth and size bounded', async () => {
  const node = present.sanitizeAuditData({ nested: { apiKey: SENTINEL, label: 'ok' }, list: ['a', { token: SENTINEL }],
    deep: { a: { b: { c: { d: { e: SENTINEL } } } } }, long: 'L'.repeat(900), many: Object.fromEntries(Array.from({ length: 150 }, (_, i) => [`k${i}`, i])) })
  const text = allText(node)
  assert.equal(text.includes(SENTINEL), false)
  assert.equal(node.entries[0].node.kind, 'object'); assert.equal(node.entries[1].node.kind, 'array')
  assert.ok(text.includes('omitida') && text.includes('+50 campos omitidos'))
  assert.equal(node.entries[3].node.truncated, true)
})
for (const value of ['prefix Bearer synthetic-value suffix', 'prefix eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJxYSJ9.sig suffix',
  'prefix -----BEGIN PRIVATE KEY----- synthetic-pem']) {
  await check('credential patterns embedded in ordinary values and keys are masked before rendering', async () => {
    const node = present.sanitizeAuditData({ note: value, [value]: SENTINEL })
    assert.equal(node.entries[0].node.kind, 'masked')
    assert.equal(allText(node).includes(value), false)
    assert.equal(present.safeAuditText(value), '••••••••')
  })
}
await check('unqualified free-text contacts remain minimized; only explicit recorded email fields are complete', async () => {
  const node = present.sanitizeAuditData(['attempt@example.invalid', { note: 'Attempt by attempt@example.invalid' }])
  assert.equal(allText(node).includes('attempt@example.invalid'), false)
  assert.ok(allText(node).includes('a•••@example.invalid'))
  for (const key of ['email', 'e_mail', 'e-mail']) assert.equal(present.sanitizeAuditData({ [key]: 'attempt@example.invalid' }).entries[0].node.text, 'attempt@example.invalid')
  const secret = present.sanitizeAuditData({ password: 'attempt@example.invalid', clientSecret: 'attempt@example.invalid' })
  assert.equal(allText(secret).includes('attempt@example.invalid'), false)
})
await check('global node and character budgets bound wide nested presentation trees', async () => {
  const node = present.sanitizeAuditData(Array.from({ length: 100 }, () => Array.from({ length: 100 }, () => 'L'.repeat(300))))
  function size(n) { return 1 + (n.kind === 'array' ? n.items.reduce((sum, x) => sum + size(x), 0) : n.kind === 'object' ? n.entries.reduce((sum, x) => sum + size(x.node), 0) : 0) }
  assert.ok(size(node) <= 500)
  assert.ok(allText(node).length < 100_000)
  assert.ok(allText(node).includes('omitidos'))
  assert.equal(present.sanitizeAuditData('L'.repeat(40_000)).kind, 'masked')
})
await check('non-JSON instances and accessor values fail closed without executing getters', async () => {
  assert.equal(present.sanitizeAuditData(new Date()).kind, 'masked')
  let called = false
  const value = Object.defineProperty({}, 'note', { enumerable: true, get() { called = true; throw new Error('must not execute') } })
  assert.equal(present.sanitizeAuditData(value).entries[0].node.kind, 'masked')
  assert.equal(called, false)
  assert.equal(present.sanitizeAuditData(new Proxy({}, { ownKeys() { throw new Error('malformed') } })).kind, 'masked')
})
for (const value of [Number.NaN, Infinity, () => 1, Symbol('x')]) {
  await check('unsupported scalar values fail closed (masked)', async () => assert.equal(present.sanitizeAuditData(value).kind, 'masked'))
}
await check('nothing recorded → "no data" (login events)', async () => {
  assert.equal(present.hasRecordedData(present.sanitizeAuditData(null)), false)
  assert.equal(present.hasRecordedData(present.sanitizeAuditData({})), false)
  assert.equal(present.hasRecordedData(present.sanitizeAuditData({ email: 'a@b.cd' })), true)
})
await check('labels: known tokens translated, unknown shown as sent, inherited names safe', async () => {
  assert.equal(present.actionLabel('LOGIN_SUCCESS'), 'Login realizado'); assert.equal(present.actionLabel('LOGIN_FAILURE'), 'Tentativa de login recusada')
  assert.equal(present.actionLabel('FUTURE_ACTION'), 'FUTURE_ACTION'); assert.equal(present.actionLabel('toString'), 'toString')
  assert.deepEqual(present.resultMeta('failed'), { label: 'Falha', tone: 'danger' }); assert.equal(present.resultMeta('constructor').label, 'constructor')
  assert.equal(present.resultMeta(null).label, 'Não informado'); assert.equal(present.resourceLabel('__proto__'), '__proto__')
})

/* ---------- source boundaries ---------- */
const auditDir = resolve(root, 'src/features/governance-audit')
const screens = ['AuditListPage.tsx', 'AuditDetailPage.tsx', 'AuditUi.tsx', 'auditApi.ts', 'auditRoute.ts', 'auditPresent.ts', 'auditRefs.ts', 'useAuditData.ts', 'auditDates.ts', 'AuditFilters.tsx']
const sources = Object.fromEntries(await Promise.all(screens.map(async (name) => [name, await readFile(resolve(auditDir, name), 'utf8')])))
await check('Audit screens: no prototype events / ids, no storage, no writes, no logging', async () => {
  for (const [name, source] of Object.entries(sources)) {
    assert.equal(/prototypeAudit|auditModel|auditFormat|prototypeWhitelabels|prototypeAccounts|PROTOTYPE_/.test(source), false, name)
    assert.equal(/sessionStorage|localStorage|indexedDB/.test(source), false, name)
    assert.equal(/method:\s*['"](POST|PUT|PATCH|DELETE)|fetch\(/.test(source), false, name)
    assert.equal(/console\.(log|info|debug|warn|error)/.test(source), false, name)
  }
  assert.deepEqual((await readdir(auditDir)).filter((name) => /\.tsx?$/.test(name)).sort(), screens.slice().sort())
})
await check('historical Dashboard had no Audit reads; current preview has only the exact approved adapter/presentation imports and call', async () => {
  const dashboardDir = resolve(root, 'src/features/dashboard')
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' })
  for (const path of git('ls-tree', '-r', '--name-only', 'e89840d', '--', 'src/features/dashboard').trim().split('\n').filter(path => /\.tsx?$/.test(path))) {
    assert.doesNotMatch(git('show', `e89840d:${path}`), /governance-audit|listAuditEvents|useAuditList|authenticatedGet\(\s*['"`]\/audit/)
  }
  for (const name of (await readdir(dashboardDir)).filter((file) => /\.tsx?$/.test(file))) {
    let source = await readFile(resolve(dashboardDir, name), 'utf8')
    if (name === 'recentAuditEvents.ts') {
      for (const statement of [
        "import { AUDIT_PAGE_SIZE, listAuditEvents, type AuditListResult } from '../governance-audit/auditApi'",
        "import { actionLabel, actorName, resourceText, resultMeta } from '../governance-audit/auditPresent'",
        "listAuditEvents({ page: 1, search: '', order: 'desc' }, signal)",
      ]) { assert.equal(source.split(statement).length, 2); source = source.replace(statement, '') }
    }
    assert.doesNotMatch(source, /governance-audit|listAuditEvents|useAuditList|authenticatedGet\(\s*['"`]\/audit/, name)
  }
})
await check('detail makes list provenance visible across every tab; metadata uses protected text', async () => {
  const detail = sources['AuditDetailPage.tsx']
  assert.ok(detail.indexOf('Registro da listagem.') < detail.indexOf('<Tabs'))
  assert.match(detail, /safeAuditText\(record\.userAgent\)/)
  assert.match(detail, /safeAuditText\(record\.ip\)/)
  assert.match(detail, /sanitizedJson\(before\).*sanitizedJson\(after\)/)
  assert.equal(/getAuditEvent|authenticatedGet\(|fetch\(/.test(detail), false)
})
reset()
console.log(`Audit read contracts: ${checks} passed (synthetic, no network)`)
