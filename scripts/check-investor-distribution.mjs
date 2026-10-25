import assert from 'node:assert/strict'
import { execFileSync } from './reviewed-consolidation-boundary.mjs'
import { existsSync } from 'node:fs'
import { readFile } from './reviewed-consolidation-boundary.mjs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

// Maintained synthetic unit/SSR/transport contracts. No live requests or credentials.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(pathToFileURL(resolve(root, 'package.json')))
const modules = new Map()
async function moduleUrl(path) {
  if (modules.has(path)) return modules.get(path)
  if (path.endsWith('.css')) return `data:text/javascript;base64,${Buffer.from('export default new Proxy({},{get:(_,key)=>String(key)})').toString('base64')}`
  let code = ts.transpileModule(await readFile(path, 'utf8'), { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText.replaceAll('import.meta.env', '({VITE_API_BASE_URL:"https://control-plane.example.invalid/api"})')
  for (const match of [...code.matchAll(/from\s+(['"])([^'"]+)\1/g)]) {
    const specifier = match[2]
    const base = resolve(dirname(path), specifier)
    const url = specifier.startsWith('.') ? await moduleUrl(base.endsWith('.css') ? base : existsSync(`${base}.ts`) ? `${base}.ts` : `${base}.tsx`)
      : pathToFileURL(require.resolve(specifier)).href
    code = code.replace(match[0], `from ${JSON.stringify(url)}`)
  }
  const url = `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
  modules.set(path, url); return url
}
const load = async (path) => import(await moduleUrl(resolve(root, path)))
const storage = new Map()
globalThis.sessionStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) }
globalThis.window = { setTimeout, clearTimeout, location: { hash: '' } }
let fetchImpl = async () => { throw Error('Unexpected request') }
globalThis.fetch = (...args) => fetchImpl(...args)
const auth = await load('src/lib/authSession.ts')
const { ApiError } = await load('src/lib/api.ts')
const api = await load('src/features/whitelabels/whitelabelApi.ts')
const model = await load('src/features/dashboard/investorDistribution.ts')
const dashboard = await load('src/features/dashboard/dashboardApi.ts')
const { InvestorDistributionContent } = await load('src/features/dashboard/WhitelabelDistributionPanel.tsx')
const React = require('react'), { renderToStaticMarkup } = require('react-dom/server')
const operator = { id: 'synthetic-operator', name: 'Unit QA', email: 'qa@example.invalid', roles: ['SUPER_ADMIN'] }
const session = (token = 'synthetic-unit-distribution') => { auth.clearSession(); auth.clearAuthNotice(); auth.persistSession({ accessToken: token, tokenType: 'Bearer', operator }) }
const wire = (counts = [50, 25, 15, 5, 3, 2, 0]) => ({ data: counts.map((count, i) => ({
  id: i + 1, idKey: String(i + 1), name: `Synthetic Whitelabel ${i + 1}`, status: i === 6 ? 'inactive' : 'active', counts: { investors: count },
})), meta: { page: 1, perPage: 100, total: counts.length, lastPage: 1 } })
const registry = (counts) => api.parseWhitelabelList(wire(counts))
const overview = (total = 100) => dashboard.parseDashboardOverview({ data: { scope: 'global', kpis: { investors: total, whitelabels: 7 } } })
const success = data => ({ status: 'success', data })
const regState = rows => success({ registry: rows, consultedAt: '2026-10-21T14:00:00Z' })
const view = (rows = registry(), total = 100) => model.investorDistributionView(regState(rows), success(overview(total)))
const json = (body, status = 200) => new Response(JSON.stringify(body), { status })
let checks = 0
async function check(name, action) { try { await action(); checks++ } catch (cause) { throw Error(`Failed: ${name}`, { cause }) } }
const malformed = action => assert.throws(action, error => error.kind === 'malformed')

await check('shared parser compatible: only exact optional investor-count projection changes', async () => {
  const source = (await readFile(resolve(root, 'src/features/whitelabels/whitelabelApi.ts'), 'utf8')).replaceAll('\r\n', '\n')
  const normalized = source.replace('  /** Explicit Control Plane counts.investors; absent/invalid is never authoritative zero. */\n  investorCount?: number | null\n', '')
    .replace("    ...(isRecord(value.counts) && Object.prototype.hasOwnProperty.call(value.counts, 'investors')\n      ? { investorCount: optionalCount(value.counts.investors) } : {}),\n", '')
    .replace('  // Only an empty Core result may use lastPage=0; nonempty coverage cannot be normalized to complete.\n  if (meta.total !== 0 && meta.lastPage === 0) throw malformed()\n', '')
  assert.equal(normalized, execFileSync('git', ['show', 'd409784:src/features/whitelabels/whitelabelApi.ts'], { cwd: root, encoding: 'utf8' }).replaceAll('\r\n', '\n'))
  const row = wire().data[0]; delete row.counts
  assert.equal(Object.hasOwn(api.parseWhitelabel(row), 'investorCount'), false)
})
await check('nonempty lastPage zero rejected before shared normalization; empty zero still legitimate', () => {
  const body = wire(); body.meta.lastPage = 0; malformed(() => api.parseWhitelabelList(body))
  const empty = wire([]); empty.meta.lastPage = 0
  assert.equal(model.buildInvestorDistribution(api.parseWhitelabelList(empty), 0).total, 0)
})
for (const bad of [undefined, null, '2', -1, 1.5, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity, {}, [], true]) {
  await check(`missing/invalid count rejected, never zero: ${String(bad)}`, () => {
    const body = wire(); body.data[0].counts.investors = bad
    const rows = api.parseWhitelabelList(body)
    malformed(() => model.buildInvestorDistribution(rows, 100))
    assert.equal(view(rows).status, 'unavailable')
  })
}
for (const [key, bad] of [['page', 2], ['perPage', 10], ['total', 101], ['total', 8], ['lastPage', 2], ['total', Number.MAX_SAFE_INTEGER + 1]]) {
  await check(`coverage fails closed: ${key}=${bad}`, () => {
    const rows = registry(); rows[key] = bad; malformed(() => model.buildInvestorDistribution(rows, 100))
  })
}
for (const bad of ['0', '01', 'wl_proto_1', '9007199254740992', '']) await check(`invalid identity ${bad}`, () => {
  const rows = registry(); rows.rows[0].id = bad; malformed(() => model.validateInvestorRegistry(rows))
})
await check('duplicate ID or unusable name fails closed', () => {
  const rows = registry(); rows.rows[0].id = rows.rows[1].id; malformed(() => model.validateInvestorRegistry(rows))
  for (const name of ['', ' ', undefined]) { const rows = registry(); rows.rows[0].name = name; malformed(() => model.validateInvestorRegistry(rows)) }
})
await check('one tenant 100% uses full circumference, no gap', () => {
  const result = model.buildInvestorDistribution(registry([7]), 7)
  assert.equal(result.segments[0].ratio, 1); assert.equal(result.segments[0].length, model.DISTRIBUTION_CIRCUMFERENCE)
  assert.equal(result.segments[0].offset, 0); assert.equal(result.segments[0].percentage, '100,0%')
})
for (const counts of [[3, 1], [1, 1, 1], [50, 25, 15, 5, 3, 2, 0]]) await check(`full precision, stable geometry ${counts}`, () => {
  const result = model.buildInvestorDistribution(registry(counts), counts.reduce((a, b) => a + b, 0))
  assert.ok(Math.abs(result.segments.reduce((acc, row) => acc + row.length, 0) - model.DISTRIBUTION_CIRCUMFERENCE) < 1e-10)
  let offset = 0
  for (const row of result.segments) { assert.ok(Math.abs(row.offset - offset) < 1e-10); offset += row.length }
  if (counts.length === 3) assert.equal(result.segments[0].percentage, '33,3%')
})
await check('all seven tenants, inactive zero kept; no artificial Others or input mutation', () => {
  const rows = registry(), before = JSON.stringify(rows), result = model.buildInvestorDistribution(rows, 100)
  assert.equal(result.segments.length, 7); assert.equal(result.segments[6].count, 0); assert.equal(result.segments[6].length, 0)
  assert.equal(new Set(result.segments.map(row => row.color)).size, 7); assert.equal(JSON.stringify(rows), before)
})
await check('numeric ID tie order, colors stable across sort/reload', () => {
  const rows = registry([1, 1, 1]); rows.rows[0].id = '10'; rows.rows[1].id = '2'; rows.rows[2].id = '3'
  assert.deepEqual(model.buildInvestorDistribution(rows, 3).segments.map(row => row.id), ['2', '3', '10'])
  assert.equal(model.investorColor('10'), model.buildInvestorDistribution(rows, 3).segments[2].color)
})
await check('tiny nonzero share remains geometric area and readable label', () => {
  const result = model.buildInvestorDistribution(registry([999999, 1]), 1000000)
  assert.ok(result.segments[1].length > 0); assert.equal(result.segments[1].ratio, 0.000001)
  assert.equal(result.segments[1].percentage, '< 0,1%')
})
await check('confirmed zero and empty registry avoid division by zero', () => {
  for (const counts of [[], [0, 0]]) {
    const result = model.buildInvestorDistribution(registry(counts), 0)
    assert.equal(result.total, 0); assert.ok(result.segments.every(row => row.ratio === 0 && row.length === 0 && row.offset === 0))
  }
})
await check('unsafe sum and invalid/missing global total fail closed', () => {
  malformed(() => model.buildInvestorDistribution(registry([Number.MAX_SAFE_INTEGER, 1]), Number.MAX_SAFE_INTEGER))
  for (const total of [null, undefined, -1, '100', 1.1, Infinity]) malformed(() => model.buildInvestorDistribution(registry(), total))
})
await check('mismatch is neutral, aggregate only, retry both independent sources', () => {
  const result = view(registry(), 101)
  assert.equal(result.status, 'unavailable'); assert.equal(result.retry, 'both'); assert.match(result.description, /100.*101/)
  assert.match(result.description, /não são um retrato atômico/); assert.equal(result.segments, undefined)
})
await check('correct source-specific retries and independent errors', () => {
  assert.equal(view(registry(), null).retry, 'overview')
  for (const [source, state] of [['registry', 'registry'], ['overview', 'overview']]) {
    for (const error of [new ApiError(503, {}), new ApiError(0, {}, { kind: 'network' }), new ApiError(0, {}, { kind: 'timeout' }), new ApiError(200, {}, { kind: 'malformed' })]) {
      const errorState = { status: 'error', error }
      const result = model.investorDistributionView(source === 'registry' ? errorState : regState(registry()), source === 'overview' ? errorState : success(overview()))
      assert.equal(result.status, 'unavailable'); assert.equal(result.retry, state)
    }
  }
  for (const status of [401, 403]) {
    const result = model.investorDistributionView({ status: 'error', error: new ApiError(status, {}) }, success(overview()))
    assert.equal(result.retry, null); assert.equal(overview().kpis.investors, 100)
  }
})
await check('loading/idle never imply zero or old ready data', () => {
  for (const status of ['idle', 'loading']) {
    assert.equal(model.investorDistributionView({ status }, success(overview())).status, 'loading')
    assert.equal(model.investorDistributionView(regState(registry()), { status }).status, 'loading')
  }
})
await check('actual SSR chart: full accessible seven-row legend, only positive segments; keyboard scroll region', () => {
  const html = renderToStaticMarkup(React.createElement(InvestorDistributionContent, { view: view(), onRetry() {} }))
  assert.equal((html.match(/data-tenant-id=/g) ?? []).length, 7); assert.equal((html.match(/data-segment-id=/g) ?? []).length, 6)
  assert.match(html, /<figure/); assert.match(html, /<figcaption/); assert.match(html, /role="region".*tabindex="0"/)
  assert.match(html, /Synthetic Whitelabel 7/); assert.match(html, /0 investidores · 0,0%/); assert.match(html, /Total global: 100/)
  assert.match(html, /<svg[^>]*aria-hidden="true"/); assert.doesNotMatch(html, /skeleton|Sem dados|Outros/)
})
await check('actual SSR zero, loading, denial and mismatch presentations', () => {
  const render = view => renderToStaticMarkup(React.createElement(InvestorDistributionContent, { view, onRetry() {} }))
  const zero = render(view(registry([0, 0]), 0)); assert.match(zero, /Nenhum investidor cadastrado/); assert.doesNotMatch(zero, /data-segment-id/)
  assert.match(render({ status: 'loading' }), /aria-busy="true"/)
  assert.match(render(view(registry(), 101)), /Tentar novamente: duas fontes/)
  assert.doesNotMatch(render(model.investorDistributionView({ status: 'error', error: new ApiError(403, {}) }, success(overview()))), /<button/)
})
await check('registry GET only page1/per100, no population filter or duplicate overview request', async () => {
  session(); let requests = 0
  fetchImpl = async (url, options) => {
    requests++; const parsed = new URL(url)
    assert.equal(parsed.pathname, '/api/whitelabels'); assert.deepEqual(Object.fromEntries(parsed.searchParams), { page: '1', perPage: '100' })
    assert.equal(options.method, 'GET'); assert.ok(options.headers.Authorization); assert.ok(options.headers['X-Correlation-ID'])
    return json(wire())
  }
  const result = await model.getInvestorDistributionRegistry(); assert.equal(result.registry.total, 7); assert.equal(requests, 1)
})
for (const status of [403, 401, 503]) await check(`HTTP ${status} preserved, no fallback or retry`, async () => {
  session(); let requests = 0; fetchImpl = async () => { requests++; return json({}, status) }
  await assert.rejects(model.getInvestorDistributionRegistry(), error => error.status === status)
  assert.equal(requests, 1); assert.equal(auth.isAuthenticated(), status !== 401)
})
await check('network failure/malformed contract stay isolated and non-authoritative', async () => {
  session(); fetchImpl = async () => { throw new TypeError('offline') }
  await assert.rejects(model.getInvestorDistributionRegistry(), error => error.kind === 'network')
  fetchImpl = async () => json({ data: [], meta: { page: 1, perPage: 100, total: 7, lastPage: 1 } })
  await assert.rejects(model.getInvestorDistributionRegistry(), error => error.kind === 'malformed')
})
await check('pending cancellation prevents a successful stale registry', async () => {
  session(); const controller = new AbortController()
  fetchImpl = (_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))))
  const pending = model.getInvestorDistributionRegistry(controller.signal); controller.abort()
  await assert.rejects(pending, error => error.name === 'AbortError'); assert.ok(auth.isAuthenticated())
})
await check('canonical registry timeout is unavailable, not zero (accelerated clock)', async () => {
  session(); const timer = window.setTimeout
  window.setTimeout = (fn, ms) => { assert.equal(ms, 20000); return setTimeout(fn, 5) }
  fetchImpl = (_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))))
  try { await assert.rejects(model.getInvestorDistributionRegistry(), error => error.kind === 'timeout') }
  finally { window.setTimeout = timer }
  assert.ok(auth.isAuthenticated())
})
await check('late old-session response rejected centrally', async () => {
  session(); let respond; fetchImpl = () => new Promise(resolve => { respond = resolve })
  const pending = model.getInvestorDistributionRegistry(); session('synthetic-new-session'); respond(json(wire()))
  await assert.rejects(pending, error => error.name === 'AbortError')
})
await check('session-keyed canonical lifecycle and local-only overview reuse', async () => {
  const hook = await readFile(resolve(root, 'src/features/dashboard/useInvestorDistribution.ts'), 'utf8')
  assert.match(hook, /useSyncExternalStore\(subscribeSession, getSessionVersion/)
  assert.match(hook, /useRemote\(`dashboard-investor-registry:\$\{sessionVersion\}`/)
  assert.doesNotMatch(hook, /lastData|setInterval|Storage|fetch\(/)
  const panel = await readFile(resolve(root, 'src/features/dashboard/WhitelabelDistributionPanel.tsx'), 'utf8')
  assert.doesNotMatch(panel, /getDashboardOverview|useDashboardOverview|setInterval|Storage/)
  assert.match(panel, /view.retry === 'both'/); assert.match(panel, /registry.reload\(\)/); assert.match(panel, /onReloadOverview\(\)/)
})
auth.clearSession()
console.log(`Investor distribution contracts: ${checks} passed (synthetic math/SSR/GET; no live network)`)
