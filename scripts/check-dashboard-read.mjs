import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

// In-memory unit contracts only. No browser bypass, real token or network call.
// Same dependency-free TypeScript-loader convention as check-entrepreneur-read.
// The Dashboard fixture mirrors the shape observed on homolog (aggregate counts only, synthetic values).
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(pathToFileURL(resolve(root, 'package.json')))
const modules = new Map()
async function moduleUrl(path, sourceOverride) {
  const key = sourceOverride === undefined ? path : `${path}:baseline`
  if (modules.has(key)) return modules.get(key)
  if (path.endsWith('.css')) {
    const css = await readFile(path, 'utf8')
    const classes = Object.fromEntries([...css.matchAll(/\.([A-Za-z][\w-]*)/g)].map((match) => [match[1], `css-${match[1]}`]))
    return `data:text/javascript;base64,${Buffer.from(`export default ${JSON.stringify(classes)}`).toString('base64')}`
  }
  let code = ts.transpileModule(sourceOverride ?? await readFile(path, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
  }).outputText.replaceAll('import.meta.env', '({VITE_API_BASE_URL:"https://control-plane.example.invalid/api"})')
  for (const match of [...code.matchAll(/from\s+(['"])([^'"]+)\1/g)]) {
    const specifier = match[2]
    let url
    if (specifier.startsWith('.')) {
      const base = resolve(dirname(path), specifier)
      url = await moduleUrl(base.endsWith('.css') ? base : existsSync(`${base}.ts`) ? `${base}.ts` : `${base}.tsx`)
    } else url = pathToFileURL(require.resolve(specifier)).href
    code = code.replace(match[0], `from ${JSON.stringify(url)}`)
  }
  const url = `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
  modules.set(key, url)
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
const dash = await load('src/features/dashboard/dashboardApi.ts')
const operator = { id: 'synthetic-operator', name: 'Unit QA', email: 'qa@example.invalid', roles: ['SUPER_ADMIN'] }
const session = () => ({ accessToken: 'synthetic-unit-token-d', tokenType: 'Bearer', operator })
// Observed envelope (homolog, 2026-10-14): names and types; synthetic counts.
const observed = (overrides = {}, kpis = {}) => ({
  data: {
    scope: 'global',
    freshness: '2026-10-14T13:18:26.121Z',
    kpis: { whitelabels: 6, whitelabelsActive: 6, investors: 4762, entrepreneurs: 58, tenantAdmins: 6, ...kpis },
    events: [],
    operationalStatus: { core: 'ok', note: 'Aggregate counts only; service health probes are not included.' },
    ...overrides,
  },
})
const json = (value, status = 200) => new Response(JSON.stringify(value), { status })
const reset = () => { auth.clearSession(); auth.clearAuthNotice(); window.location.hash = '' }
let checks = 0
async function check(name, action) {
  try { await action(); checks += 1 } catch (cause) { throw new Error(`Failed: ${name}`, { cause }) }
}

await check('observed envelope maps only the proven KPIs (Whitelabels, Investors)', async () => {
  const parsed = dash.parseDashboardOverview(observed())
  assert.deepEqual(parsed, { scope: 'global', freshness: '2026-10-14T13:18:26.121Z', kpis: { whitelabels: 6, investors: 4762 } })
})
await check('ambiguous / undisplayed fields are never exposed to the UI', async () => {
  const parsed = dash.parseDashboardOverview(observed())
  assert.deepEqual(Object.keys(parsed.kpis).sort(), ['investors', 'whitelabels'])
  for (const key of ['events', 'operationalStatus', 'whitelabelsActive', 'tenantAdmins', 'entrepreneurs']) {
    assert.equal(JSON.stringify(parsed).includes(key), false, key)
  }
})
await check('zero is a real value, distinct from "not supplied"', async () => {
  const parsed = dash.parseDashboardOverview(observed({}, { whitelabels: 0, investors: 0 }))
  assert.equal(parsed.kpis.whitelabels, 0); assert.equal(parsed.kpis.investors, 0)
})
for (const [bad, label] of [[null, 'null'], [undefined, 'missing'], ['6', 'string'], [-1, 'negative'], [6.5, 'fraction'],
  [Number.MAX_SAFE_INTEGER + 1, 'unsafe'], [Number.NaN, 'NaN'], [{}, 'object'], [Infinity, 'infinity'],
  [-Infinity, 'negative infinity'], [true, 'boolean'], [[], 'array'], [6n, 'bigint']]) {
  await check(`a ${label} count is unavailable (null), never guessed or zeroed`, async () => {
    const body = observed({}, { whitelabels: bad, investors: bad })
    if (bad === undefined) { delete body.data.kpis.whitelabels; delete body.data.kpis.investors }
    const parsed = dash.parseDashboardOverview(body)
    assert.equal(parsed.kpis.whitelabels, null); assert.equal(parsed.kpis.investors, null)
  })
}
await check('one unavailable count does not hide the other', async () => {
  const parsed = dash.parseDashboardOverview(observed({}, { investors: null }))
  assert.equal(parsed.kpis.whitelabels, 6); assert.equal(parsed.kpis.investors, null)
})
for (const [bad, label] of [[[], 'array body'], [null, 'null body'], ['OK', 'text body'], [observed().data, 'unwrapped (not observed)'],
  [observed({ kpis: undefined }), 'kpis missing'], [observed({ kpis: [] }), 'kpis array']]) {
  await check(`malformed envelope fails closed: ${label}`, async () =>
    assert.throws(() => dash.parseDashboardOverview(bad), (error) => error.kind === 'malformed'))
}
for (const scope of ['whitelabel', 'tenant', '', undefined, null]) {
  await check(`non-global scope is rejected (${String(scope)}): tenant numbers never shown as global`, async () =>
    assert.throws(() => dash.parseDashboardOverview(observed({ scope })), (error) => error.kind === 'malformed'))
}
await check('freshness: valid instant kept, invalid → null; label in Brasília time', async () => {
  assert.equal(dash.parseDashboardOverview(observed({ freshness: 'not-a-date' })).freshness, null)
  assert.equal(dash.parseDashboardOverview(observed({ freshness: 7 })).freshness, null)
  assert.equal(dash.freshnessLabel('2026-10-14T13:18:26.121Z'), 'Atualizado às 10:18 (Brasília)')
  assert.equal(dash.freshnessLabel(null), 'Dados do Control Plane')
  assert.equal(dash.formatKpi(4762), '4.762'); assert.equal(dash.formatKpi(0), '0')
})
for (const bad of ['7', '2026-10-14', '2026-10-14T13:18:26', '2026-02-30T13:18:26Z', '2026-13-14T13:18:26Z']) {
  await check(`ambiguous or invalid freshness is unavailable: ${bad}`, async () => {
    assert.equal(dash.parseDashboardOverview(observed({ freshness: bad })).freshness, null)
    assert.equal(dash.freshnessLabel(bad), 'Dados do Control Plane')
  })
}
await check('explicit timestamp offsets represent the same instant, never a presumed Backend timezone', async () => {
  const value = '2026-10-14T10:18:26.121-03:00'
  assert.equal(dash.parseDashboardOverview(observed({ freshness: value })).freshness, value)
  assert.equal(dash.freshnessLabel(value), dash.freshnessLabel('2026-10-14T13:18:26.121Z'))
})
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const { Building } = require('lucide-react')
const cardPath = resolve(root, 'src/components/ui/MetricCard.tsx')
const currentCard = (await import(await moduleUrl(cardPath))).MetricCard
const baselineCard = (await import(await moduleUrl(cardPath,
  execFileSync('git', ['show', '692f3acbbb0e2dcc9d5abf0d44abc5c799aa0a1d:src/components/ui/MetricCard.tsx'], { cwd: root, encoding: 'utf8' })))).MetricCard
const cardProps = { label: 'Synthetic KPI', icon: Building, tone: 'blue', onOpen() {} }
for (const density of ['default', 'compact']) {
  await check(`legacy MetricCard markup is identical without a reading (${density})`, async () => {
    const props = { ...cardProps, density }
    assert.equal(renderToStaticMarkup(React.createElement(currentCard, props)), renderToStaticMarkup(React.createElement(baselineCard, props)))
  })
}
await check('MetricCard exposes narrow semantic loading, ready zero and unavailable states', async () => {
  const render = (reading) => renderToStaticMarkup(React.createElement(currentCard, { ...cardProps, reading }))
  assert.match(render({ state: 'loading' }), /aria-busy="true"/)
  assert.match(render({ state: 'loading' }), /Carregando/)
  assert.match(render({ state: 'ready', value: '0', status: 'Dados do Control Plane' }), />0<\/p>/)
  assert.match(render({ state: 'unavailable', status: 'Não informado' }), /Indisponível/)
  assert.doesNotMatch(render({ state: 'ready', value: '0', status: 'Dados do Control Plane' }), /aria-busy/)
})
await check('GET /dashboard: no query, Bearer + X-Correlation-ID, GET only', async () => {
  reset(); auth.persistSession(session())
  fetchImpl = async (url, options) => {
    const parsed = new URL(url)
    assert.equal(parsed.pathname, '/api/dashboard'); assert.equal(parsed.search, '')
    assert.equal(options.method, 'GET'); assert.equal(options.body, undefined)
    assert.equal(options.headers.Authorization, 'Bearer synthetic-unit-token-d')
    assert.match(options.headers['X-Correlation-ID'], /^[0-9a-f-]{36}$/)
    return json(observed())
  }
  assert.equal((await dash.getDashboardOverview()).kpis.investors, 4762)
})
await check('401 ends the session centrally; 403 / 502 / network keep it', async () => {
  reset(); auth.persistSession(session()); fetchImpl = async () => json({ code: 'FORBIDDEN' }, 403)
  await assert.rejects(dash.getDashboardOverview(), (error) => error.status === 403); assert.ok(auth.isAuthenticated())
  fetchImpl = async () => json({ code: 'CORE_HTTP_ERROR', message: 'Core request failed: raw detail', details: { coreStatus: 500 } }, 502)
  const failure = await dash.getDashboardOverview().catch((cause) => cause)
  assert.equal(failure.status, 502); assert.ok(auth.isAuthenticated())
  const view = errors.describeApiError(failure, 'os indicadores do Dashboard')
  assert.equal(`${view.title} ${view.description}`.includes('raw detail'), false); assert.equal(view.retryable, true)
  fetchImpl = async () => { throw new TypeError('Failed to fetch') }
  await assert.rejects(dash.getDashboardOverview(), (error) => error.kind === 'network'); assert.ok(auth.isAuthenticated())
  fetchImpl = async () => json({}, 401)
  await assert.rejects(dash.getDashboardOverview(), (error) => error.status === 401)
  assert.equal(auth.getAccessToken(), null); assert.equal(auth.peekAuthNotice(), 'session_expired')
})
await check('no session → no request', async () => {
  reset(); fetchImpl = async () => { assert.fail('Unexpected request') }
  await assert.rejects(dash.getDashboardOverview(), (error) => error.status === 401)
})
await check('Dashboard session foundation expects one canonical restored-session GET /auth/me', async () => {
  reset(); storage.set('loor_sa_access_token', 'synthetic-restored-dashboard-token')
  storage.set('loor_sa_operator', JSON.stringify(operator))
  let calls = 0
  fetchImpl = async (url, options) => {
    calls += 1
    assert.equal(url, 'https://control-plane.example.invalid/api/auth/me')
    assert.equal(options.method, 'GET'); assert.equal(options.body, undefined)
    assert.equal(options.headers.Authorization, 'Bearer synthetic-restored-dashboard-token')
    assert.match(options.headers['X-Correlation-ID'], /^[\da-f-]{36}$/i)
    return json(operator)
  }
  assert.equal(await auth.validateSession(), 'valid'); assert.equal(await auth.validateSession(), 'valid')
  assert.equal(calls, 1)
})
await check('Dashboard session foundation sends no hydration request without a session', async () => {
  reset(); fetchImpl = async () => { assert.fail('Unexpected auth/me without a stored session') }
  assert.equal(await auth.validateSession(), 'invalid')
})

// Source boundaries: the Dashboard reads only /dashboard and never prototype data, storage or Audit.
const dashboardDir = resolve(root, 'src/features/dashboard')
const sources = Object.fromEntries(await Promise.all((await readdir(dashboardDir)).filter((name) => /\.tsx?$/.test(name))
  .map(async (name) => [name, await readFile(resolve(dashboardDir, name), 'utf8')])))
await check('Dashboard sources: no storage access, no prototype seeds, no other API path', async () => {
  for (const [name, source] of Object.entries(sources)) {
    assert.equal(/sessionStorage|localStorage/.test(source), false, name)
    // `prototypeNotice` is the shell's notice helper, not prototype data.
    assert.equal(/from ['"][^'"]*(prototype(?!Notice)|Seeds|participants|finance-core|compliance-kyc|governance|audit)/i.test(source), false, name)
    assert.equal(/authenticatedGet\(\s*['"`](?!\/dashboard['"`])/.test(source), false, name)
    assert.equal(/fetch\(|method:\s*['"](POST|PUT|PATCH|DELETE)/.test(source), false, name)
  }
})
await check('pending panels stay data-ready (no series, shares, health or events)', async () => {
  assert.match(sources['OperationalStatusPanel.tsx'], /Aguardando integração/)
  assert.equal(/useDashboardOverview|dashboardApi/.test(sources['OperationalStatusPanel.tsx'] + sources['ActivityPanel.tsx']
    + sources['WhitelabelDistributionPanel.tsx'] + sources['RecentEventsPanel.tsx']), false)
  assert.match(sources['RecentEventsPanel.tsx'], /<tbody \/>/)
})
reset()
console.log(`Dashboard read contracts: ${checks} passed (synthetic, no network)`)
