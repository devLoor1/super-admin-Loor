import assert from 'node:assert/strict'
import { outsideReviewed360 } from './reviewed-360-boundary.mjs'
import { execFileSync } from './reviewed-consolidation-boundary.mjs'
import { existsSync } from 'node:fs'
import { readFile } from './reviewed-consolidation-boundary.mjs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'
import { opportunityRow } from './fixtures/opportunities-companies-fixtures.mjs'

// Maintained synthetic math/SSR/GET tests. No live network or real credentials.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(pathToFileURL(resolve(root, 'package.json'))), modules = new Map()
async function moduleUrl(path) {
  if (modules.has(path)) return modules.get(path)
  if (path.endsWith('.css')) return `data:text/javascript;base64,${Buffer.from('export default new Proxy({},{get:(_,key)=>String(key)})').toString('base64')}`
  let code = ts.transpileModule(await readFile(path, 'utf8'), { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText.replaceAll('import.meta.env', '({VITE_API_BASE_URL:"https://control-plane.example.invalid/api"})')
  for (const match of [...code.matchAll(/from\s+(['"])([^'"]+)\1/g)]) {
    const specifier = match[2], base = resolve(dirname(path), specifier)
    const url = specifier.startsWith('.') ? await moduleUrl(base.endsWith('.css') ? base : existsSync(`${base}.ts`) ? `${base}.ts` : `${base}.tsx`)
      : pathToFileURL(require.resolve(specifier)).href
    code = code.replace(match[0], `from ${JSON.stringify(url)}`)
  }
  const url = `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
  modules.set(path, url); return url
}
const load = async path => import(await moduleUrl(resolve(root, path)))
const storage = new Map()
globalThis.sessionStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) }
globalThis.window = { setTimeout, clearTimeout, location: { hash: '' } }
let fetchImpl = async () => { throw Error('Unexpected synthetic request') }
globalThis.fetch = (...args) => fetchImpl(...args)
const auth = await load('src/lib/authSession.ts'), { ApiError } = await load('src/lib/api.ts')
const model = await load('src/features/dashboard/dailyOpportunities.ts')
const api = await load('src/features/operation/opportunities/opportunityApi.ts')
const { DailyOpportunityContent } = await load('src/features/dashboard/ActivityPanel.tsx')
const React = require('react'), { renderToStaticMarkup } = require('react-dom/server')
const operator = { id: 'synthetic-daily-qa', name: 'Synthetic QA', email: 'qa@example.invalid', roles: ['SUPER_ADMIN'] }
const session = (token = 'synthetic-daily-token') => { auth.clearSession(); auth.clearAuthNotice(); auth.persistSession({ accessToken: token, tokenType: 'Bearer', operator }) }
const source = (dates = []) => ({ rows: dates.map((createdAt, index) => ({ id: String(index + 1), createdAt })), page: 1, perPage: 100, total: dates.length, lastPage: 1 })
const wire = (dates = [], overrides = {}) => ({ data: dates.map((createdAt, index) => ({ ...opportunityRow, id: index + 1, createdAt,
  whitelabelId: index + 1, status: ['review', 'active', 'finished', 'archived'][index % 4] })),
  meta: { page: 1, perPage: 100, total: dates.length, lastPage: 1, ...overrides } })
const json = (body, status = 200) => new Response(JSON.stringify(body), { status })
const ready = series => ({ status: 'ready', ...series, consultedAt: '2026-10-21T17:00:00Z' })
const render = view => renderToStaticMarkup(React.createElement(DailyOpportunityContent, { view, onRetry() {} }))
const malformed = action => assert.throws(action, error => error.kind === 'malformed')
let checks = 0
async function check(name, action) { try { await action(); checks++ } catch (cause) { throw Error(`Failed: ${name}: ${cause.message}`) } }

for (const value of [null, undefined, '', '2026-10-21', '2026-10-21T00:00:00', '10/21/2026', '2026-10-21 12:00:00Z',
  '2026-02-29T00:00:00Z', '1900-02-29T00:00:00Z', '2026-04-31T00:00:00Z', '2026-13-01T00:00:00Z',
  '2026-00-01T00:00:00Z', '2026-10-00T00:00:00Z', '2026-10-21T24:00:00Z', '2026-10-21T23:60:00Z',
  '2026-10-21T23:59:60Z', '2026-10-21T00:00:00+25:00', '2026-10-21T00:00:00+03:60', '2026-10-21T00:00:00Z ', 0, {}, true]) {
  await check(`strict creation timestamp rejects ${String(value)}`, () => assert.equal(model.opportunityCreationInstant(value), null))
}
for (const value of ['2026-10-21T00:00:00Z', '2026-10-21T00:00:00.123456789Z', '2026-10-21T00:00:00-03:00',
  '2026-10-21T00:00:00+09:30', '2000-02-29T00:00:00Z', '2024-02-29T23:59:59.999-03:00', '0000-02-29T12:00:00Z']) {
  await check(`explicit valid ISO instant accepted ${value}`, () => assert.equal(model.opportunityCreationInstant(value), Date.parse(value)))
}
for (const [instant, expected] of [
  ['2026-10-22T02:59:59.999Z', '2026-10-21'], ['2026-10-22T03:00:00Z', '2026-10-22'],
  ['2026-10-21T03:00:00Z', '2026-10-21'], ['2026-10-21T02:59:59.999Z', '2026-10-20'],
  ['2026-01-01T02:59:59.999Z', '2025-12-31'], ['2026-01-01T03:00:00Z', '2026-01-01'],
  ['2026-10-21T12:00:00+09:00', '2026-10-21'], ['2026-10-21T00:00:00+09:00', '2026-10-20'],
  ['2018-11-04T03:00:00Z', '2018-11-04'], ['2018-11-04T02:59:59Z', '2018-11-03'],
  ['0000-02-29T12:00:00Z', '0000-02-29'],
]) await check(`Sao Paulo calendar boundary ${instant}`, () => assert.equal(model.saoPauloDateKey(Date.parse(instant)), expected))

await check('30 ascending consecutive buckets, today plus previous29; six axis labels from same model', () => {
  const series = model.buildDailyOpportunities(source(), '2026-10-21')
  assert.equal(series.buckets.length, 30); assert.equal(series.start, '2026-09-22'); assert.equal(series.end, '2026-10-21')
  for (let i = 1; i < 30; i++) assert.equal(Date.parse(series.buckets[i].date) - Date.parse(series.buckets[i - 1].date), 86400000)
  assert.deepEqual(model.DAILY_TICK_OFFSETS.map(i => series.buckets[i].label), ['22/09','28/09','04/10','10/10','16/10','21/10'])
})
for (const [reference, start] of [['2026-01-10', '2025-12-12'], ['2024-03-01', '2024-02-01'], ['2025-03-01', '2025-01-31'], ['2024-02-29', '2024-01-31']]) {
  await check(`month/year/leap window ${reference}`, () => {
    const series = model.buildDailyOpportunities(source(), reference)
    assert.equal(series.start, start); assert.equal(series.buckets.length, 30); assert.equal(series.buckets[29].date, reference)
  })
}
for (const bad of ['2026-02-30', '2026-10-21T12:00:00Z', '2026-1-1', 'not-a-date']) await check(`invalid fixed reference ${bad}`, () => malformed(() => model.buildDailyOpportunities(source(), bad)))
await check('first/last included boundaries, outside past/future excluded, no31st bucket', () => {
  const dates = ['2026-09-22T02:59:59.999Z','2026-09-22T03:00:00Z','2026-10-22T02:59:59.999Z','2026-10-22T03:00:00Z']
  const series = model.buildDailyOpportunities(source(dates), '2026-10-21')
  assert.equal(series.periodTotal, 2); assert.equal(series.sourceTotal, 4)
  assert.equal(series.buckets[0].count, 1); assert.equal(series.buckets[29].count, 1)
})
await check('same day, multiple tenants and ALL four statuses count; opened/updated/due do not', () => {
  const rows = wire(Array(4).fill('2026-10-21T03:00:00Z'))
  for (const row of rows.data) { row.openedAt = '2020-01-01T00:00:00Z'; row.updatedAt = '2030-01-01T00:00:00Z'; row.dueAt = '2040-01-01T00:00:00Z' }
  const result = api.parsePage(rows, api.parseOpportunity, row => row.id)
  const series = model.buildDailyOpportunities(result, '2026-10-21')
  assert.equal(series.periodTotal, 4); assert.equal(series.buckets[29].count, 4)
})
await check('old existing records produce valid zero, not a connection warning', () => {
  const series = model.buildDailyOpportunities(source(['2020-01-01T00:00:00Z']), '2026-10-21')
  assert.equal(series.sourceTotal, 1); assert.equal(series.periodTotal, 0); assert.ok(series.buckets.every(x => x.count === 0))
  assert.match(render(ready(series)), /Nenhuma oportunidade cadastrada neste período/)
  assert.doesNotMatch(render(ready(series)), /Conecte|Nenhum dado carregado|Protótipo/)
})
await check('zero records and exactly100 records complete; no hardcoded78', () => {
  assert.equal(model.buildDailyOpportunities(source(), '2026-10-21').periodTotal, 0)
  assert.equal(model.buildDailyOpportunities(source(Array(100).fill('2026-10-21T03:00:00Z')), '2026-10-21').periodTotal, 100)
})
for (const [key, value] of [['page',2],['perPage',20],['total',101],['total',-1],['total',1.5],['total','1'],['total',Number.MAX_SAFE_INTEGER + 1],['lastPage',2],['lastPage',0]]) {
  await check(`coverage requires ${key}, rejects ${value}`, () => { const rows = source(); rows[key] = value; malformed(() => model.buildDailyOpportunities(rows, '2026-10-21')) })
}
await check('no first-page-as-complete, duplicate or prototype IDs, unknown-date exclusions', () => {
  const rows = source(['2026-10-21T03:00:00Z']); rows.total = 2; malformed(() => model.buildDailyOpportunities(rows, '2026-10-21'))
  for (const id of ['0','01','wl_proto_1','9007199254740992']) { const rows = source(['2026-10-21T03:00:00Z']); rows.rows[0].id = id; malformed(() => model.buildDailyOpportunities(rows, '2026-10-21')) }
  const duplicate = source(['2026-10-21T03:00:00Z','2026-10-21T03:00:00Z']); duplicate.rows[1].id = duplicate.rows[0].id
  malformed(() => model.buildDailyOpportunities(duplicate, '2026-10-21'))
  for (const date of [null, '2020-01-01T00:00:00', '2020-02-30T00:00:00Z']) malformed(() => model.buildDailyOpportunities(source([date]), '2026-10-21'))
})
await check('output drops record identities/text and does not mutate input', () => {
  const rows = source(['2026-10-21T03:00:00Z']), before = JSON.stringify(rows)
  const series = model.buildDailyOpportunities(rows, '2026-10-21')
  assert.equal(JSON.stringify(rows), before)
  assert.deepEqual(Object.keys(series).sort(), ['buckets','start','end','periodTotal','sourceTotal'].sort())
  assert.deepEqual(Object.keys(series.buckets[0]).sort(), ['date','label','count'].sort())
})
await check('integer ticks, zero baseline, exact count placement and 30 real points', () => {
  const series = model.buildDailyOpportunities(source(['2026-09-22T03:00:00Z',...Array(7).fill('2026-10-21T03:00:00Z')]), '2026-10-21')
  const geometry = model.dailyOpportunityGeometry(series.buckets)
  assert.equal(geometry.top, 10); assert.deepEqual(geometry.ticks,[10,8,6,4,2,0])
  assert.equal(geometry.points.length, 30); assert.deepEqual(geometry.points[0], { x: 0, y: 154 * .9 })
  assert.deepEqual(geometry.points[29], { x: 442, y: 154 * (1 - .7) })
  assert.equal((geometry.path.match(/[ML]/g) ?? []).length,30)
  assert.ok(geometry.points.every(p => p.y >= 0 && p.y <= 154 && p.x >= 0 && p.x <= 442))
})
for (const maximum of [0,1,5,6,13,99,100]) await check(`readable enclosing scale for maximum ${maximum}`, () => {
  const series = model.buildDailyOpportunities(source(Array(maximum).fill('2026-10-21T03:00:00Z')), '2026-10-21')
  const geometry = model.dailyOpportunityGeometry(series.buckets)
  assert.ok(geometry.top >= maximum && geometry.top > 0); assert.equal(geometry.ticks.length, 6); assert.equal(geometry.ticks.at(-1), 0)
  assert.ok(geometry.ticks.every(Number.isSafeInteger)); assert.ok(geometry.points.every(p => Number.isFinite(p.y)))
  if (maximum === 0) assert.ok(geometry.points.every(p => p.y === 154))
})
await check('actual SSR accessible equivalent covers all30 dates/counts, range/timezone/total; SVG hidden', () => {
  const series = model.buildDailyOpportunities(source(['2026-10-21T03:00:00Z']), '2026-10-21'), html = render(ready(series))
  assert.equal((html.match(/data-daily-date=/g) ?? []).length, 30)
  assert.match(html, /22\/09\/2026–21\/10\/2026/); assert.match(html, /America\/Sao_Paulo/); assert.match(html, /Total no período: 1/)
  assert.match(html, /<summary>Ver dados diários \(30 dias\)<\/summary>/); assert.match(html, /role="region".*tabindex="0"/)
  assert.match(html, /<svg[^>]*aria-hidden="true"/); assert.match(html, /<path[^>]*data-daily-series/)
  assert.doesNotMatch(html, /tooltip|currency|Conecte/)
})
await check('loading/unavailable never fabricate30 zero buckets or stale SVG points', () => {
  for (const status of ['idle','loading']) {
    const html = render(model.dailyOpportunityView({ status })); assert.match(html, /aria-busy="true"/); assert.doesNotMatch(html, /data-daily-series|data-daily-date/)
  }
  const denied = model.dailyOpportunityView({ status: 'error', error: new ApiError(403,{message:'PRIVATE'}) })
  assert.equal(denied.retryable,false); assert.match(render(denied), /Acesso não permitido/); assert.doesNotMatch(render(denied), /PRIVATE|<button|data-daily-series|data-daily-date/)
})
for (const [status, kind] of [[0,'network'],[0,'timeout'],[200,'malformed'],[500,'http'],[502,'http'],[503,'http'],[401,'http'],[403,'http']]) {
  await check(`safe chart-specific error ${status}/${kind}`, () => {
    const view = model.dailyOpportunityView({ status: 'error', error: new ApiError(status,{message:'PRIVATE'},{kind,correlationId:'synthetic-diagnostic'}) })
    assert.equal(view.status,'unavailable'); assert.equal(view.retryable, status !== 401 && status !== 403)
    assert.equal(view.correlationId,'synthetic-diagnostic'); assert.doesNotMatch(JSON.stringify(view), /PRIVATE/)
  })
}
await check('canonical exact GET query, one read, all fields parsed then minimal projection', async () => {
  session(); let calls = 0
  fetchImpl = async (url, options) => {
    calls++; const parsed = new URL(url)
    assert.equal(parsed.pathname,'/api/opportunities'); assert.deepEqual(Object.fromEntries(parsed.searchParams), {page:'1',perPage:'100',sort:'createdAt',order:'desc'})
    assert.equal(options.method,'GET'); assert.ok(options.headers.Authorization); assert.ok(options.headers['X-Correlation-ID'])
    return json(wire(['2026-10-21T03:00:00Z']))
  }
  const result = await model.getDailyOpportunities()
  assert.equal(calls,1); assert.equal(result.sourceTotal,1); assert.equal(result.buckets.length,30)
  assert.equal(result.end,model.saoPauloDateKey(Date.parse(result.consultedAt)))
  assert.equal('rows' in result,false)
})
for (const meta of [{page:2},{perPage:10},{total:101,lastPage:2},{total:2},{total:'1'},{lastPage:2}]) await check(`live-shape incomplete metadata rejected ${JSON.stringify(meta)}`, async () => {
  session(); fetchImpl = async () => json(wire(['2026-10-21T03:00:00Z'],meta))
  await assert.rejects(model.getDailyOpportunities(), error => error.kind === 'malformed')
})
for (const createdAt of [null,'2026-10-21T00:00:00','2026-02-30T00:00:00Z']) await check(`shared tolerant date is strictly rejected for chart ${createdAt}`, async () => {
  session(); fetchImpl = async () => json(wire([createdAt]))
  const error = await model.getDailyOpportunities().catch(error => error)
  assert.equal(error.code,'DAILY_OPPORTUNITIES_CREATED_AT'); assert.match(model.dailyOpportunityView({status:'error',error}).description,/data de criação válida/)
})
for (const status of [401,403,503]) await check(`HTTP${status} no fallback/automatic retry`, async () => {
  session(); let calls=0; fetchImpl = async () => {calls++;return json({},status)}
  await assert.rejects(model.getDailyOpportunities(), error => error.status===status)
  assert.equal(calls,1); assert.equal(auth.isAuthenticated(),status!==401)
})
await check('network failure and canonical20s timeout, accelerated clock', async () => {
  session(); fetchImpl = async () => {throw new TypeError('offline')}
  await assert.rejects(model.getDailyOpportunities(), error => error.kind==='network')
  const original = window.setTimeout; window.setTimeout=(fn,ms)=>{assert.equal(ms,20000);return setTimeout(fn,5)}
  fetchImpl=(_url,options)=>new Promise((_resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError'))))
  try {await assert.rejects(model.getDailyOpportunities(),error=>error.kind==='timeout')} finally {window.setTimeout=original}
})
await check('cancellation and changed-session late success rejected', async () => {
  session(); const controller=new AbortController()
  fetchImpl=(_url,options)=>new Promise((_resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError'))))
  const pending=model.getDailyOpportunities(controller.signal);controller.abort();await assert.rejects(pending,error=>error.name==='AbortError')
  let finish; fetchImpl=()=>new Promise(resolve=>{finish=resolve})
  const old=model.getDailyOpportunities();session('synthetic-replacement-token');finish(json(wire([])))
  await assert.rejects(old,error=>error.name==='AbortError')
})
await check('session-keyed useRemote, no polling/storage/duplicate transport; period has no fake button', async () => {
  const hook=await readFile(resolve(root,'src/features/dashboard/useDailyOpportunities.ts'),'utf8')
  assert.match(hook,/useSyncExternalStore\(subscribeSession, getSessionVersion/);assert.match(hook,/useRemote\(`dashboard-daily-opportunities:\$\{version\}`/)
  assert.doesNotMatch(hook,/lastData|Storage|fetch\(|setInterval/)
  const panel=await readFile(resolve(root,'src/features/dashboard/ActivityPanel.tsx'),'utf8')
  assert.doesNotMatch(panel,/usePrototypeNotice|ChevronDown|periodTicks|new Date\(/)
  assert.match(panel,/actions=\{<span/)
})
await check('protected KPIs/distribution/auth/routing/shared adapter/flags/dependencies byte-identical to accepted baseline', () => {
  // Daily V1 did not change Recent Events. Its later authorized integration is separate.
  assert.equal(execFileSync('git',['diff','--name-only','e4c7b5e','e89840d','--','src/features/dashboard/RecentEventsPanel.tsx'],{cwd:root,encoding:'utf8'}).trim(),'')
  for (const path of ['src/features/dashboard/dashboardApi.ts','src/features/dashboard/dashboardCounts.ts','src/features/dashboard/useDashboardOverview.ts',
    'src/features/dashboard/investorDistribution.ts','src/features/dashboard/useInvestorDistribution.ts','src/features/dashboard/WhitelabelDistributionPanel.tsx','src/features/dashboard/WhitelabelDistributionPanel.module.css',
    'src/features/dashboard/OperationalStatusPanel.tsx','src/features/dashboard/DashboardPage.module.css',
    'src/lib','src/components','src/app','src/features/operation/opportunities/opportunityApi.ts','src/features/menu-visibility','src/features/whitelabels','package.json','package-lock.json']) {
    assert.deepEqual(outsideReviewed360(execFileSync('git',['diff','--name-only','e4c7b5e','--',path],{cwd:root,encoding:'utf8'})),[],path)
  }
})
auth.clearSession()
console.log(`Daily Opportunity Creation V1: ${checks} passed (synthetic math/calendar/SSR/GET; no live network)`)
