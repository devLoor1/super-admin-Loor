import assert from 'node:assert/strict'
import { readFile } from './reviewed-consolidation-boundary.mjs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

// In-memory unit contracts only. No browser bypass, real token or network call.
// Same dependency-free TypeScript-loader convention as check-compliance-audit.
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
let storageFailure = false
globalThis.sessionStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem(key, value) { if (storageFailure) throw new Error('Storage unavailable'); storage.set(key, value) },
  removeItem(key) { if (storageFailure) throw new Error('Storage unavailable'); storage.delete(key) },
}
globalThis.window = { setTimeout, clearTimeout, location: { hash: '' } }
let fetchImpl = async () => { throw new Error('Unexpected unit request') }
globalThis.fetch = (...args) => fetchImpl(...args)

const api = await load('src/lib/api.ts')
const auth = await load('src/lib/authSession.ts')
const client = await load('src/lib/apiClient.ts')
const errors = await load('src/lib/apiErrors.ts')
const wl = await load('src/features/whitelabels/whitelabelApi.ts')
const route = await load('src/features/whitelabels/whitelabelRoute.ts')
const operator = { id: 'synthetic-operator', name: 'Unit QA', email: 'qa@example.invalid', roles: ['SUPER_ADMIN'] }
const session = (token = 'synthetic-unit-token-a', name = 'Unit QA') => ({ accessToken: token, tokenType: 'Bearer', operator: { ...operator, name } })
const record = { id: 4, idKey: '4', name: 'Synthetic Whitelabel', slug: 'synthetic', baseUrl: null, domain: null,
  status: 'active', isActive: true, admins: 0, applications: null, integrations: null, createdAt: null, updatedAt: null }
const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), { status, headers })
const reset = () => { storageFailure = false; auth.clearSession(); auth.clearAuthNotice(); window.setTimeout = setTimeout; window.location.hash = '' }
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done }); return { promise, resolve } }
const abortingFetch = (_url, { signal }) => new Promise((_resolve, reject) => {
  const abort = () => reject(new DOMException('Cancelled unit request', 'AbortError'))
  if (signal.aborted) abort()
  else signal.addEventListener('abort', abort, { once: true })
})
let checks = 0
async function check(name, action) {
  try { await action(); checks += 1 } catch (cause) { throw new Error(`Failed: ${name}`, { cause }) }
}

await check('active token, GET-only client, correlation and query encoding', async () => {
  reset(); auth.persistSession(session())
  fetchImpl = async (url, options) => {
    assert.equal(url, 'https://control-plane.example.invalid/api/whitelabels?page=2&active=false&search=A%26B')
    assert.equal(options.method, 'GET'); assert.equal(options.body, undefined)
    assert.equal(options.headers.Authorization, 'Bearer synthetic-unit-token-a')
    assert.match(options.headers['X-Correlation-ID'], /^[\da-f-]{36}$/i)
    return json({ ok: true })
  }
  assert.deepEqual(await client.authenticatedGet('/whitelabels', { query: { page: 2, active: false, search: 'A&B', absent: null, empty: '' } }), { ok: true })
})
await check('missing session makes no request', async () => {
  reset(); fetchImpl = async () => { assert.fail('No-session request sent') }
  await assert.rejects(client.authenticatedGet('/whitelabels'), (error) => error.status === 401 && error.code === 'NO_SESSION')
})
await check('current 401 clears once and records notice', async () => {
  reset(); auth.persistSession(session()); let events = 0
  const unsubscribe = auth.subscribeSession(() => { events += 1 })
  const version = auth.getSessionVersion()
  fetchImpl = async () => json({ code: 'UNAUTHORIZED' }, 401)
  await assert.rejects(client.authenticatedGet('/whitelabels'), (error) => error.status === 401)
  auth.handleUnauthorized('synthetic-unit-token-a', version)
  assert.equal(auth.getAccessToken(), null); assert.equal(auth.getOperator(), null)
  assert.equal(auth.peekAuthNotice(), 'session_expired'); assert.equal(events, 1); unsubscribe()
})
for (const sameToken of [false, true]) {
  await check(`stale 401 cannot end newer session (same token ${sameToken})`, async () => {
    reset(); auth.persistSession(session()); const response = deferred()
    fetchImpl = () => response.promise
    const pending = client.authenticatedGet('/whitelabels')
    const rejection = assert.rejects(pending, (error) => error.status === 401)
    auth.logout(); auth.persistSession(session(sameToken ? 'synthetic-unit-token-a' : 'synthetic-unit-token-b', 'New operator'))
    response.resolve(json({}, 401)); await rejection
    assert.equal(auth.getOperator().name, 'New operator'); assert.equal(auth.peekAuthNotice(), null)
  })
}
await check('stale successful read cannot publish data into a newer session', async () => {
  reset(); auth.persistSession(session()); const response = deferred(); fetchImpl = () => response.promise
  const pending = client.authenticatedGet('/whitelabels'); const rejection = assert.rejects(pending, api.isAbortError)
  auth.logout(); auth.persistSession(session('synthetic-unit-token-a', 'New operator'))
  response.resolve(json({ stale: true })); await rejection
  assert.equal(auth.getOperator().name, 'New operator'); assert.ok(auth.isAuthenticated())
})
for (const status of [403, 404, 422, 500, 503]) {
  await check(`HTTP ${status} does not log out`, async () => {
    reset(); auth.persistSession(session()); fetchImpl = async () => json({ message: 'synthetic-private-message' }, status)
    await assert.rejects(client.authenticatedGet('/whitelabels'), (error) => error.status === status)
    assert.equal(auth.getAccessToken(), 'synthetic-unit-token-a')
    assert.equal(auth.peekAuthNotice(), null)
  })
}
await check('network error keeps session', async () => {
  reset(); auth.persistSession(session()); fetchImpl = async () => { throw new TypeError('Synthetic network failure') }
  await assert.rejects(client.authenticatedGet('/whitelabels'), (error) => error.kind === 'network')
  assert.ok(auth.isAuthenticated())
})
await check('read timeout is bounded and keeps session', async () => {
  reset(); auth.persistSession(session()); let budget
  window.setTimeout = (callback, ms) => { budget = ms; return setTimeout(callback, 1) }; fetchImpl = abortingFetch
  await assert.rejects(client.authenticatedGet('/whitelabels'), (error) => error.kind === 'timeout')
  assert.equal(budget, 20_000); assert.ok(auth.isAuthenticated())
})
await check('caller cancellation is AbortError, not logout/network error', async () => {
  reset(); auth.persistSession(session()); fetchImpl = abortingFetch
  const controller = new AbortController(); const pending = client.authenticatedGet('/whitelabels', { signal: controller.signal })
  const rejection = assert.rejects(pending, api.isAbortError); controller.abort(); await rejection
  assert.ok(auth.isAuthenticated())
})
await check('non-JSON success and HTML error stay safe', async () => {
  reset(); fetchImpl = async () => new Response('<html>synthetic-private-message</html>', { status: 200 })
  await assert.rejects(api.apiRequest('/x'), (error) => error.kind === 'malformed')
  fetchImpl = async () => new Response('<html>synthetic-private-message</html>', { status: 502, headers: { 'X-Correlation-ID': 'synthetic-response-id' } })
  await assert.rejects(api.apiRequest('/x'), (error) => error.status === 502 && error.message === 'HTTP 502' && error.correlationId === 'synthetic-response-id')
})
await check('malformed error metadata cannot crash error UI', async () => {
  reset(); fetchImpl = async () => json({ message: {}, code: {}, correlationId: {} }, 500)
  await assert.rejects(api.apiRequest('/x'), (error) => {
    assert.equal(error.message, 'HTTP 500'); assert.equal(error.code, undefined)
    assert.equal(typeof errors.describeApiError(error, 'os Whitelabels').correlationId, 'string'); return true
  })
})
await check('fresh successful login skips duplicate auth/me', async () => {
  reset(); let calls = 0
  fetchImpl = async (url, options) => { calls += 1; assert.ok(url.endsWith('/auth/login')); assert.equal(options.method, 'POST'); return json(session(), 201) }
  await auth.loginWithCredentials('qa@example.invalid', 'synthetic-unit-password')
  assert.equal(await auth.validateSession(), 'valid'); assert.equal(calls, 1)
})
for (const bad of [{}, { ...session(), tokenType: 'Other' }, { ...session(), operator: { ...operator, roles: [null] } }]) {
  await check('malformed login never persists a session', async () => {
    reset(); fetchImpl = async () => json(bad, 201)
    await assert.rejects(auth.loginWithCredentials('qa@example.invalid', 'synthetic-unit-password'), (error) => error.kind === 'malformed')
    assert.equal(auth.getAccessToken(), null)
  })
}
await check('restored session hydrates once', async () => {
  reset(); storage.set('loor_sa_access_token', 'synthetic-restored-token'); storage.set('loor_sa_operator', JSON.stringify(operator)); let calls = 0
  fetchImpl = async (url) => { calls += 1; assert.ok(url.endsWith('/auth/me')); return json({ ...operator, name: 'Hydrated operator', status: 'ACTIVE' }) }
  assert.equal(await auth.validateSession(), 'valid'); assert.equal(await auth.validateSession(), 'valid')
  assert.equal(auth.getOperator().name, 'Hydrated operator'); assert.equal(calls, 1)
})
await check('late auth/me cannot overwrite a newer operator', async () => {
  reset(); auth.persistSession(session()); const response = deferred(); fetchImpl = () => response.promise
  const pending = auth.validateSession(); auth.logout(); auth.persistSession(session('synthetic-unit-token-a', 'New operator'))
  response.resolve(json({ ...operator, name: 'Old operator' }))
  assert.equal(await pending, 'unverified'); assert.equal(auth.getOperator().name, 'New operator')
})
await check('cancelled hydration cannot mark a session verified', async () => {
  reset(); auth.persistSession(session()); const response = deferred(); fetchImpl = () => response.promise
  const controller = new AbortController(); const pending = auth.validateSession(controller.signal); controller.abort()
  response.resolve(json(operator)); assert.equal(await pending, 'unverified')
})
await check('auth/me timeout uses 15 seconds and retains session', async () => {
  reset(); auth.persistSession(session()); let budget
  window.setTimeout = (callback, ms) => { budget = ms; return setTimeout(callback, 1) }; fetchImpl = abortingFetch
  assert.equal(await auth.validateSession(), 'unverified'); assert.equal(budget, 15_000); assert.ok(auth.isAuthenticated())
})
for (const status of [403, 500, 503]) {
  await check(`auth/me ${status} retains session`, async () => {
    reset(); auth.persistSession(session()); fetchImpl = async () => json({}, status)
    assert.equal(await auth.validateSession(), 'unverified'); assert.ok(auth.isAuthenticated())
  })
}
await check('auth/me 401 clears restored session', async () => {
  reset(); auth.persistSession(session()); fetchImpl = async () => json({}, 401)
  assert.equal(await auth.validateSession(), 'invalid'); assert.equal(auth.getAccessToken(), null)
})
await check('storage failure is tab-only and cannot resurrect logout', async () => {
  reset(); storageFailure = true; auth.persistSession(session())
  assert.ok(auth.isAuthenticated()); assert.deepEqual(auth.getOperator(), operator)
  auth.logout(); assert.equal(auth.getAccessToken(), null)
  storageFailure = false; auth.persistSession(session()); storageFailure = true
  auth.logout(); assert.equal(auth.getAccessToken(), null)
  reset()
})
await check('Whitelabel adapter preserves authoritative nulls and zero', async () => {
  const parsed = wl.parseWhitelabel(record)
  assert.equal(parsed.id, '4'); assert.equal(parsed.admins, 0)
  for (const field of ['baseUrl', 'domain', 'applications', 'integrations', 'createdAt', 'updatedAt']) assert.equal(parsed[field], null)
  assert.equal(wl.parseWhitelabel({ ...record, admins: 1.5 }).admins, null)
})
for (const bad of [{}, { ...record, idKey: 'wl_proto_01' }, { ...record, idKey: '6' }, { ...record, name: '' }, { ...record, isActive: false }]) {
  await check('malformed Whitelabel identity/status fails closed', async () => assert.throws(() => wl.parseWhitelabel(bad), (error) => error.kind === 'malformed'))
}
await check('valid, empty and out-of-range pagination', async () => {
  assert.equal(wl.parseWhitelabelList({ data: [record], meta: { page: 1, perPage: 10, total: 1, lastPage: 1 } }).rows.length, 1)
  assert.equal(wl.parseWhitelabelList({ data: [], meta: { page: 1, perPage: 10, total: 0, lastPage: 0 } }).lastPage, 1)
  assert.equal(wl.parseWhitelabelList({ data: [], meta: { page: 2, perPage: 10, total: 6, lastPage: 1 } }).page, 2)
})
for (const bad of [{}, { data: [], meta: {} }, { data: [], meta: { page: 1, perPage: 10, total: 6, lastPage: 1 } },
  { data: [record, record], meta: { page: 1, perPage: 10, total: 2, lastPage: 1 } },
  { data: [record], meta: { page: 1, perPage: 10, total: 0, lastPage: 1 } }]) {
  await check('malformed pagination/duplicate identities fail closed', async () => assert.throws(() => wl.parseWhitelabelList(bad), (error) => error.kind === 'malformed'))
}
await check('supported Whitelabel queries only; no sort/order', async () => {
  reset(); auth.persistSession(session())
  fetchImpl = async (url) => {
    const query = new URL(url).searchParams
    assert.deepEqual([...query.keys()], ['page', 'perPage', 'search', 'active'])
    assert.equal(query.get('active'), 'false'); assert.equal(query.get('perPage'), '10')
    return json({ data: [], meta: { page: 1, perPage: 10, total: 0, lastPage: 1 } })
  }
  await wl.listWhitelabels({ page: 1, search: 'Synthetic', status: 'inactive' })
})
await check('prototype ID rejected without API call; direct object expected', async () => {
  reset(); auth.persistSession(session()); fetchImpl = async () => { assert.fail('Prototype id requested') }
  await assert.rejects(wl.getWhitelabel('wl_proto_01'), (error) => error.code === 'INVALID_WHITELABEL_ID')
  fetchImpl = async () => json(record); assert.equal((await wl.getWhitelabel('4')).id, '4')
  fetchImpl = async () => json({ data: record }); await assert.rejects(wl.getWhitelabel('4'), (error) => error.kind === 'malformed')
})
await check('URL state bounds and encoding', async () => {
  const parsed = route.parseWhitelabelRoute({ id: '4', page: 'NaN', status: 'draft', search: ' x '.repeat(100) })
  assert.equal(parsed.state.page, 1); assert.equal(parsed.state.status, 'all'); assert.equal(parsed.ignored.length, 2)
  assert.equal(parsed.state.search.length, 120)
  assert.equal(route.whitelabelsHref({ id: '4', page: 2, search: 'A&B', status: 'inactive' }), '#/whitelabels?id=4&page=2&search=A%26B&status=inactive')
})
await check('date sort compares instants, not timezone-offset strings', async () => {
  const source = await readFile(resolve(root, 'src/features/whitelabels/WhitelabelsPage.tsx'), 'utf8')
  const ast = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const declaration = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === 'sortRows')
  assert.ok(declaration)
  const code = ts.transpileModule(declaration.getFullText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const sort = new Function('WHITELABEL_STATUS_META', `${code}; return sortRows`)(wl.WHITELABEL_STATUS_META)
  const rows = [{ ...record, id: '1', updatedAt: '2026-10-01T23:00:00-03:00' },
    { ...record, id: '2', updatedAt: '2026-10-02T00:00:00Z' }, { ...record, id: '3', updatedAt: null }]
  assert.deepEqual(sort(rows, { key: 'updatedAt', direction: 'ascending' }).map((row) => row.id), ['3', '2', '1'])
  assert.deepEqual(sort(rows, { key: 'updatedAt', direction: 'descending' }).map((row) => row.id), ['1', '2', '3'])
  assert.deepEqual(rows.map((row) => row.id), ['1', '2', '3'])
})
for (const status of [401, 403, 404, 500]) {
  await check(`safe UI description for ${status}`, async () => {
    const view = errors.describeApiError(new api.ApiError(status, { message: 'synthetic-private-message' }), 'os Whitelabels')
    assert.ok(!view.description.includes('synthetic-private-message'))
    if (status === 403) assert.equal(view.retryable, false)
  })
}
reset()
console.log(`Whitelabel/auth focused contracts: ${checks} passed (synthetic, no network)`)
