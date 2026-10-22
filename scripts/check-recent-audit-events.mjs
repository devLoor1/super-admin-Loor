import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

// Maintained synthetic contracts / SSR / canonical GET tests, never a live request.
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
const api = await load('src/features/governance-audit/auditApi.ts')
const model = await load('src/features/dashboard/recentAuditEvents.ts')
const { RecentAuditContent, RecentEventsPanel } = await load('src/features/dashboard/RecentEventsPanel.tsx')
const React = require('react'), { renderToStaticMarkup } = require('react-dom/server')
const operator = { id: 'synthetic-preview-operator', name: 'Synthetic QA', email: 'qa@example.invalid', roles: ['SUPER_ADMIN'] }
const session = (token = 'synthetic-preview-token') => { auth.clearSession(); auth.clearAuthNotice(); auth.persistSession({ accessToken: token, tokenType: 'Bearer', operator }) }
const now = '2026-10-22T02:30:00Z'
const row = (index = 0, overrides = {}) => ({ id: `ckqasafepreview${String(index).padStart(10, '0')}`, action: 'LOGIN_SUCCESS', result: 'success',
  superAdminId: 'synthetic-actor', superAdmin: { id: 'synthetic-actor', name: 'Synthetic Operator', email: 'private-actor@example.invalid' },
  resourceType: null, resourceId: null, whitelabelId: null, beforeData: { password: 'PRIVATE_PASSWORD' }, afterData: { email: 'attempt@example.invalid', secret: 'PRIVATE_SECRET' },
  ip: '198.51.100.123', userAgent: 'PRIVATE_USER_AGENT', correlationId: 'PRIVATE_ROW_CORRELATION',
  createdAt: new Date(Date.parse(now) - index * 60000).toISOString(), ...overrides })
const wire = (total = 8, overrides = {}, rows = Array.from({ length: Math.min(8, total) }, (_, i) => row(i))) => ({
  data: rows, meta: { page: 1, perPage: 8, total, lastPage: Math.max(1, Math.ceil(total / 8)), ...overrides },
})
const preview = body => model.projectRecentAuditEvents(api.parseAuditList(body), now)
const render = view => renderToStaticMarkup(React.createElement(RecentAuditContent, { view, onRetry() {} }))
const json = (body, status = 200) => new Response(JSON.stringify(body), { status })
const read = signal => model.getRecentAuditEvents(signal ?? new AbortController().signal)
let checks = 0
async function check(name, action) { try { await action(); checks++ } catch (cause) { throw Error(`Failed: ${name}: ${cause.message}`) } }

for (const total of [0, 1, 3, 7, 8, 9, 123, 100000]) await check(`latest preview complete for total${total}, not history enumeration`, () => {
  const data = preview(wire(total)); assert.equal(data.total, total); assert.equal(data.rows.length, Math.min(8, total))
  assert.equal(data.consultedAt, now); assert.deepEqual(data.rows.map(r => r.id), wire(total).data.map(r => r.id))
})
for (const meta of [{ page: 2 }, { page: 0 }, { perPage: 20 }, { perPage: 7 }, { total: 9, lastPage: 1 },
  { total: -1 }, { total: '8' }, { total: 8.5 }, { total: Number.MAX_SAFE_INTEGER + 1 }, { lastPage: 2 }, { lastPage: '1' }]) {
  await check(`invalid/mismatched metadata ${JSON.stringify(meta)}`, () => assert.throws(() => preview(wire(8, meta)), e => e.kind === 'malformed'))
}
await check('unchanged Audit adapter retains its documented zero-lastPage normalization; preview validates normalized metadata', () => {
  assert.equal(preview(wire(0, { lastPage: 0 })).rows.length, 0)
  assert.equal(preview(wire(8, { lastPage: 0 })).rows.length, 8)
  assert.throws(() => preview(wire(20, { lastPage: 0 })), e => e.kind === 'malformed')
})
for (const count of [0, 1, 7, 9]) await check(`eight-row preview rejects incomplete/extra ${count} rows`, () => {
  assert.throws(() => preview(wire(20, {}, Array.from({ length: count }, (_, i) => row(i)))), e => e.kind === 'malformed')
})
for (const body of [null, {}, [], { data: [], meta: null }, { data: 'bad', meta: {} }]) {
  await check('invalid envelope is not an empty log', () => assert.throws(() => preview(body), e => e.kind === 'malformed'))
}
for (const bad of [{ id: '' }, { id: 'invalid/id' }, { action: '' }, { action: '<script>' }, { createdAt: null },
  { createdAt: '2026-10-21T12:00:00' }, { createdAt: '2026-02-30T12:00:00Z' }, { createdAt: '2026-10-21T25:00:00Z' },
  { createdAt: '2026-10-21T12:00:00+25:00' }, { superAdmin: { id: 'different-actor' } }]) {
  await check(`existing strict Audit parser rejects required field ${JSON.stringify(bad)}`, () => {
    assert.throws(() => preview(wire(1, {}, [row(0, bad)])), e => e.kind === 'malformed')
  })
}
await check('duplicate event identities rejected', () => assert.throws(() => preview(wire(2, {}, [row(), row()])), e => e.kind === 'malformed'))
await check('newest-first chronology required without silently re-sorting', () => assert.throws(() => preview(wire(2, {}, [row(1), row(0)])), e => e.kind === 'malformed'))
await check('equal timestamp preserves server tie order, no invented secondary sort', () => {
  const data = preview(wire(2, {}, [row(2, { createdAt: now }), row(1, { createdAt: now })]))
  assert.deepEqual(data.rows.map(r => r.id), [row(2).id, row(1).id])
})
await check('Sao Paulo date formatting independent of process timezone / midnight offsets', () => {
  const data = preview(wire(2, {}, [row(0, { createdAt: '2026-10-22T03:00:00Z' }), row(1, { createdAt: '2026-10-22T02:59:00Z' })]))
  assert.deepEqual(data.rows.map(r => r.dateTime), ['22/10/2026 00:00', '21/10/2026 23:59'])
})
await check('safe labels, missing actor/resource/tenant and known/unknown results', () => {
  const rows = [row(0, { action: 'LOGIN_FAILURE', result: 'failed', superAdminId: null, superAdmin: null }),
    row(1, { action: 'UPDATE_WHITELABEL', whitelabelId: 6, resourceType: 'whitelabel', resourceId: '6' }),
    row(2, { action: 'FUTURE_ACTION', result: 'pending', resourceType: 'future_resource', resourceId: 'safe-id' })]
  const data = preview(wire(3, {}, rows))
  assert.equal(data.rows[0].event, 'Tentativa de login recusada'); assert.equal(data.rows[0].operator, 'Não identificado')
  assert.equal(data.rows[0].resource, 'Sem recurso registrado'); assert.equal(data.rows[0].whitelabel, 'Sem Whitelabel')
  assert.deepEqual(data.rows[0].result, { label: 'Falha', tone: 'danger' })
  assert.equal(data.rows[1].event, 'Whitelabel atualizado'); assert.equal(data.rows[1].resource, 'Whitelabel · 6')
  assert.equal(data.rows[1].whitelabel, 'Whitelabel ID 6'); assert.equal(data.rows[1].operator, 'Synthetic Operator')
  assert.deepEqual(data.rows[2].result, { label: 'pending', tone: 'muted' }); assert.equal(data.rows[2].event, 'FUTURE_ACTION')
})
await check('projection retains only approved fields and uses existing masking, never attempted login/email as actor', () => {
  const data = preview(wire(1, {}, [row(0, { superAdminId: null, superAdmin: null })]))
  assert.deepEqual(Object.keys(data.rows[0]).sort(), ['id','event','resource','whitelabel','operator','result','createdAt','dateTime'].sort())
  assert.doesNotMatch(JSON.stringify(data), /PRIVATE_|198\.51\.100|private-actor|attempt@example/)
  const masked = preview(wire(1, {}, [row(0, { superAdmin: { id: 'synthetic-actor', name: 'name@example.invalid' }, result: 'Bearer synthetic-secret' })]))
  assert.doesNotMatch(JSON.stringify(masked), /name@example|synthetic-secret/)
})
await check('SSR six approved columns / eight rows / scope / timezone / zero sensitive values / no detail routes', () => {
  const html = render(model.recentAuditView({ status: 'success', data: preview(wire(123)) }))
  assert.equal((html.match(/data-recent-audit-row/g) ?? []).length, 8)
  for (const label of ['Evento','Recurso','Whitelabel','Operador','Resultado','Data e hora']) assert.ok(html.includes(`>${label}</th>`))
  assert.match(html, /role="region".*tabindex="0"/); assert.equal((html.match(/scope="col"/g) ?? []).length, 6)
  assert.equal((html.match(/scope="row"/g) ?? []).length, 8); assert.match(html, /8 de 123 registros/)
  assert.match(html, /America\/Sao_Paulo/); assert.match(html, /Consulta em/); assert.match(html, /não representa atividade operacional/)
  assert.doesNotMatch(html, /PRIVATE_|198\.51\.100|private-actor|beforeData|afterData|Módulo|href=|\/audit\//)
})
await check('approved heading/subtitle, actual Ver todos action, no new filters', () => {
  const html = renderToStaticMarkup(React.createElement(RecentEventsPanel))
  assert.match(html, /Últimos eventos de auditoria/); assert.match(html, /Registros recentes de autenticação e ações administrativas\./)
  assert.match(html, /data-recent-events-all/); assert.match(html, /Ver todos/); assert.doesNotMatch(html, /<select|<input|integrações estiverem ativas/)
})
await check('authoritative empty log is distinct from loading/unavailable; never fake zeros/events', () => {
  const html = render(model.recentAuditView({ status: 'success', data: preview(wire(0)) }))
  assert.match(html, /Nenhum evento de auditoria registrado\./); assert.match(html, /0 de 0 registros/)
  assert.doesNotMatch(html, /data-recent-audit-row|data-recent-audit-skeleton|Tentar novamente/)
  for (const status of ['idle','loading']) {
    const loading = render(model.recentAuditView({ status })); assert.match(loading, /aria-busy="true"/)
    assert.equal((loading.match(/data-recent-audit-skeleton/g) ?? []).length, 8)
    assert.doesNotMatch(loading, /data-recent-audit-row|Nenhum evento de auditoria registrado/)
  }
})
for (const [status, kind] of [[0,'network'],[0,'timeout'],[200,'malformed'],[500,'http'],[502,'http'],[503,'http'],[401,'http'],[403,'http']]) {
  await check(`safe panel-specific error ${status}/${kind}, no rows/stale zero, proper retry`, () => {
    const view = model.recentAuditView({ status: 'error', error: new ApiError(status,{ message:'PRIVATE_SERVER_BODY' },{ kind,correlationId:'safe-diagnostic' }) })
    const html = render(view); assert.equal(view.status,'unavailable'); assert.equal(view.retryable, status !== 401 && status !== 403)
    assert.match(html, /safe-diagnostic/); assert.doesNotMatch(html, /PRIVATE_|data-recent-audit-row|Nenhum evento de auditoria registrado/)
    assert.equal(html.includes('Tentar novamente'), status !== 401 && status !== 403)
  })
}
await check('canonical exact page1/per8 GET, desc default/empty search omitted, one read, no extra query', async () => {
  session(); let calls = 0
  fetchImpl = async (url, options) => {
    calls++; const parsed = new URL(url); assert.equal(parsed.pathname,'/api/audit')
    assert.deepEqual(Object.fromEntries(parsed.searchParams), {page:'1',perPage:'8'})
    assert.equal(options.method,'GET'); assert.ok(options.headers.Authorization); assert.ok(options.headers['X-Correlation-ID'])
    return json(wire(123))
  }
  const data = await read(); assert.equal(calls,1); assert.equal(data.total,123); assert.equal(data.rows.length,8)
  assert.deepEqual(Object.keys(data).sort(), ['rows','total','consultedAt'].sort())
  assert.ok(Number.isFinite(Date.parse(data.consultedAt))); assert.doesNotMatch(JSON.stringify(data), /PRIVATE_|198\.51\.100|private-actor/)
})
for (const status of [401,403,503]) await check(`HTTP${status} has no fallback/retry; only401 clears canonical session`, async () => {
  session(); let calls=0; fetchImpl=async()=>{calls++;return json({message:'PRIVATE_BODY'},status)}
  await assert.rejects(read(), e=>e.status===status); assert.equal(calls,1); assert.equal(auth.isAuthenticated(),status!==401)
})
await check('malformed/incomplete or ascending wire page fails closed through reused adapter/projection', async () => {
  for (const body of [wire(123,{},[row()]),wire(2,{},[row(1),row(0)]),wire(1,{},[row(0,{createdAt:null})])]) {
    session(); fetchImpl=async()=>json(body); await assert.rejects(read(),e=>e.kind==='malformed')
  }
})
await check('network and canonical20s timeout are errors, not zero; no automatic retries', async () => {
  session(); fetchImpl=async()=>{throw new TypeError('offline')}; await assert.rejects(read(),e=>e.kind==='network')
  const original=window.setTimeout; window.setTimeout=(fn,ms)=>{assert.equal(ms,20000);return setTimeout(fn,5)}
  fetchImpl=(_url,options)=>new Promise((_resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError'))))
  try {await assert.rejects(read(),e=>e.kind==='timeout')} finally {window.setTimeout=original}
})
await check('abort and changed-session late response cannot publish/remember old data for another operator', async () => {
  session(); const controller=new AbortController()
  fetchImpl=(_url,options)=>new Promise((_resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError'))))
  const pending=read(controller.signal);controller.abort();await assert.rejects(pending,e=>e.name==='AbortError')
  let finish;fetchImpl=()=>new Promise(resolve=>{finish=resolve})
  const old=read();session('synthetic-replacement-token');finish(json(wire(1)))
  await assert.rejects(old,e=>e.name==='AbortError');assert.equal(api.loadedAuditRecord(row().id),null)
})
await check('session-keyed lifecycle / no lastData/polling/storage/logging/new transport; safe navigation only', async () => {
  const hook=await readFile(resolve(root,'src/features/dashboard/useRecentAuditEvents.ts'),'utf8')
  assert.match(hook,/useSyncExternalStore\(subscribeSession, getSessionVersion/);assert.match(hook,/useRemote\(`dashboard-recent-audit:\$\{version\}`/)
  const paths=['recentAuditEvents.ts','useRecentAuditEvents.ts','RecentEventsPanel.tsx']
  for(const path of paths){const source=await readFile(resolve(root,'src/features/dashboard',path),'utf8');assert.doesNotMatch(source,/lastData\.|setInterval|sessionStorage|localStorage|console\.|fetch\(|authenticatedGet\(|method:\s*['"](?:POST|PUT|PATCH|DELETE)/)}
  const panel=await readFile(resolve(root,'src/features/dashboard/RecentEventsPanel.tsx'),'utf8')
  assert.match(panel,/window.location.assign\('#\/audit'\)/);assert.doesNotMatch(panel,/auditEventHref|loadedAuditRecord|\.afterData|\.beforeData|\.ip|\.email|\.userAgent/)
})
await check('protected source byte-identical to accepted Daily Opportunity baseline, no dependencies/auth/flags/domain changes', () => {
  for(const path of ['src/lib','src/app','src/components','src/features/governance-audit','src/features/menu-visibility','src/features/whitelabels','src/features/finance-core','src/features/operation',
    'src/features/dashboard/ActivityPanel.tsx','src/features/dashboard/ActivityPanel.module.css','src/features/dashboard/dailyOpportunities.ts','src/features/dashboard/useDailyOpportunities.ts',
    'src/features/dashboard/dashboardApi.ts','src/features/dashboard/dashboardCounts.ts','src/features/dashboard/useDashboardOverview.ts',
    'src/features/dashboard/WhitelabelDistributionPanel.tsx','src/features/dashboard/WhitelabelDistributionPanel.module.css','src/features/dashboard/investorDistribution.ts','src/features/dashboard/useInvestorDistribution.ts',
    'src/features/dashboard/OperationalStatusPanel.tsx','src/features/dashboard/QuickActionsPanel.tsx','src/features/dashboard/DashboardPage.module.css','package.json','package-lock.json']) {
    const changed = execFileSync('git',['diff','--name-only','e89840d','--',path],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(Boolean)
    // Later KYC migration changes only unavailable-association copy in these
    // profiles; check-kyc-read reverses the exact strings and byte-compares them.
    const copyOnly = path === 'src/features/operation' ? ['src/features/operation/investors/InvestorDetailPage.tsx','src/features/operation/entrepreneurs/EntrepreneurDetailPage.tsx'] : []
    assert.deepEqual(changed.filter(file => !copyOnly.includes(file)),[],path)
  }
})
auth.clearSession()
console.log(`Recent Audit Events V1: ${checks} passed (synthetic contract/privacy/SSR/GET; no live network)`)
