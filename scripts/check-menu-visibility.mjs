import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

// Menu Visibility Integration V1 — Stage A checks + Stage B PREPARATION checks (synthetic fixtures, no real network).
// STAGE B PRODUCT RULES: PREPARED. STAGE B LIVE WRITE: NOT ENABLED. REAL SIDEBAR ENFORCEMENT: NOT ENABLED.
// AUTHORITATIVE CONFIGURATION READ: INTEGRATED. GLOBAL CONFIGURATION UPDATE: NOT ENABLED.
// REAL NAVIGATION ENFORCEMENT: NOT ENABLED.
// These checks fail if the GET adapter accepts a payload it should refuse, if any
// write request (PUT / PATCH / POST / DELETE) becomes possible, if the draft can be
// persisted or leaked, if the real sidebar / routes start reading visibility, or if
// the prototype `?previa=` override comes back.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(pathToFileURL(resolve(root, 'package.json')))
const BASELINE = 'bb9bef0d563964637cd8d8306a13755ce6ca5545'
const modules = new Map()
async function moduleUrl(path, override) {
  const key = override === undefined ? path : `${path}:${override}`
  if (modules.has(key)) return modules.get(key)
  if (path.endsWith('.css')) return `data:text/javascript;base64,${Buffer.from('export default new Proxy({}, {get:(_,key)=>String(key)})').toString('base64')}`
  let code = ts.transpileModule(override ?? await readFile(path, 'utf8'), {
    fileName: path,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
  }).outputText.replaceAll('import.meta.env', '({VITE_API_BASE_URL:"https://control-plane.example.invalid/api"})')
  for (const match of [...code.matchAll(/from\s+(['"])([^'"]+)\1/g)]) {
    const specifier = match[2]
    const base = resolve(dirname(path), specifier)
    const url = specifier.startsWith('data:') ? specifier : specifier.startsWith('.')
      ? await moduleUrl(base.endsWith('.css') ? base : existsSync(`${base}.ts`) ? `${base}.ts` : `${base}.tsx`)
      : pathToFileURL(require.resolve(specifier)).href
    code = code.replace(match[0], `from ${JSON.stringify(url)}`)
  }
  const url = `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
  modules.set(key, url)
  return url
}
const load = async (path, override) => import(await moduleUrl(resolve(root, path), override))
const dataModule = (text) => `data:text/javascript;base64,${Buffer.from(text).toString('base64')}`

// Session + transport doubles. Every request is recorded; anything but GET fails the run.
const storage = new Map()
globalThis.sessionStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
}
globalThis.window = { setTimeout, clearTimeout, location: { hash: '' } }
const requests = []
const allRequests = []
let fetchImpl = async () => {
  throw new Error('Unexpected network operation in Menu Visibility checks')
}
globalThis.fetch = (url, init = {}) => {
  const record = { url: String(url), method: (init.method ?? 'GET').toUpperCase(), headers: { ...(init.headers ?? {}) }, body: init.body }
  requests.push(record)
  allRequests.push(record)
  return fetchImpl(url, init)
}

let checks = 0
function check(condition, message) {
  assert.ok(condition, message)
  checks += 1
}
async function rejects(promise, predicate, message) {
  try {
    await promise
  } catch (error) {
    check(predicate(error), message)
    return error
  }
  assert.fail(`${message} (resolved instead of rejecting)`)
}

// Stable IDs exactly as listed in the Backend requirement and `menu-ids.ts` (46bf79d), in that order.
const APPROVED = [
  'dashboard',
  'plataformas', 'whitelabels', 'contas', 'whitelabel-settings', 'whitelabel-emails',
  'operacao', 'operation-opportunities', 'operation-investors', 'operation-entrepreneurs',
  'financeiro', 'finance-gateways', 'finance-modalities', 'finance-catalogs', 'finance-investments', 'finance-payments', 'finance-wallets',
  'compliance', 'compliance-kyc',
  'auditoria',
  'sistema', 'configuracoes', 'ajuda',
]

const auth = await load('src/lib/authSession.ts')
const { ApiError, isAbortError } = await load('src/lib/api.ts')
const nav = await load('src/components/shell/navigation.ts')
const registry = await load('src/features/menu-visibility/menuRegistry.ts')
const model = await load('src/features/menu-visibility/visibilityModel.ts')
const contract = await load('src/features/menu-visibility/menuVisibilityContract.ts')
const api = await load('src/features/menu-visibility/menuVisibilityApi.ts')
const route = await load('src/features/menu-visibility/menuVisibilityRoute.ts')

/* ---------- registry: approved IDs only, identity read from navigation ---------- */
const ids = [...registry.MENU_VISIBILITY_IDS]
check(ids.join() === APPROVED.join(), 'Registry IDs equal the Backend stable IDs, in the same order')
check(new Set(ids).size === 23, 'Exactly 23 unique stable IDs')
check(!ids.includes('operation-companies') && !ids.some((id) => /compan|empresa/i.test(id)), 'Companies has no visibility ID')
const entryIds = registry.MENU_ENTRIES.map((entry) => entry.id)
check(entryIds.length === ids.length && entryIds.every((id) => ids.includes(id)), 'Every approved ID has exactly one navigation entry')
const navFlat = [...nav.PRIMARY_NAV, ...nav.UTILITY_NAV].flatMap((item) => [
  { item, parent: null, area: nav.PRIMARY_NAV.includes(item) ? 'primary' : 'utility' },
  ...(item.children ?? []).map((child) => ({ item: child, parent: item.id, area: nav.PRIMARY_NAV.includes(item) ? 'primary' : 'utility' })),
])
check(navFlat.every(({ item }) => ids.includes(item.id)), 'Every current navigation entry is covered (no unapproved menu item)')
check(navFlat.map(({ item }) => item.id).join() === entryIds.join(), 'Registry keeps the real sidebar order')
for (const { item, parent, area } of navFlat) {
  const entry = registry.menuEntry(item.id)
  check(entry.label === item.label && entry.icon === item.icon, `${item.id}: label and icon come from navigation (not duplicated)`)
  check(entry.parentId === parent && entry.area === area, `${item.id}: hierarchy comes from navigation`)
}
check(registry.menuEntry('operation-investors').parentId === 'operacao' && registry.menuEntry('finance-wallets').parentId === 'financeiro', 'Parent / child pairs')
check(registry.menuEntry('sistema').children.length === 0, 'Sistema has no children in the current navigation')
check(registry.menuEntry('configuracoes').parentId === null && registry.menuEntry('ajuda').parentId === null, 'Configurações / Ajuda are not Sistema children')
check(['dashboard', 'auditoria'].every((id) => registry.menuEntry(id).parentId === null && registry.menuEntry(id).children.length === 0), 'Dashboard and Auditoria are standalone')
check(registry.isMenuId('dashboard') && !registry.isMenuId('operation-companies') && !registry.isMenuId('__proto__') && !registry.isMenuId(42), 'isMenuId accepts approved IDs only')
check(Object.isFrozen(registry.MENU_ENTRIES) && registry.MENU_ENTRIES.every((entry) => Object.isFrozen(entry)), 'Registry is read-only')

/* ---------- contract flags ---------- */
const C = contract.MENU_VISIBILITY_CONTRACT
check(C.stage === 'A' && C.readIntegrated === true, 'Stage A: authoritative read integrated')
check(C.updateEnabled === false && C.enforcementEnabled === false, 'Stage A: update and real enforcement NOT enabled')
check(C.scope === 'global' && C.environment === 'homolog' && C.getPath === '/homolog/menu-visibility', 'Global homolog scope; GET path for the canonical client')
check(C.getEndpoint === 'GET /api/homolog/menu-visibility' && C.putEndpoint === 'PUT /api/homolog/menu-visibility', 'Endpoints recorded as documentation strings')

/* ---------- GET envelope adapter ---------- */
// Live structure (homolog, 2026-10-15): all 23 IDs, booleans, registry order; never saved → metadata null.
const liveVisibility = Object.fromEntries(APPROVED.map((id) => [id, true]))
const livePayload = { data: { scope: 'global', visibility: liveVisibility, updatedAt: null, updatedBy: null } }
const live = contract.parseMenuVisibilityResponse(livePayload)
check(ids.every((id) => live.map[id] === true) && Object.keys(live.map).join() === ids.join(), 'Live shape: 23 IDs mapped as returned')
check(live.saved === false && live.updatedAt === null && live.updatedBy === null && live.unknownIds.length === 0, 'Never saved: metadata null, labelled as Control Plane defaults (saved=false)')
check(live.map !== liveVisibility && Object.isFrozen(live.map) && Object.isFrozen(live), 'Adapter returns a fresh frozen copy, never the response object')
const savedPayload = {
  data: {
    scope: 'global',
    visibility: { ...liveVisibility, financeiro: false, 'operation-investors': false, dashboard: false },
    updatedAt: '2026-10-15T18:30:12.345Z',
    updatedBy: 'ckqaop00000000000000000001',
  },
}
const frozenPayload = structuredClone(savedPayload)
const deepFreeze = (value) => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze)
    Object.freeze(value)
  }
  return value
}
deepFreeze(frozenPayload)
const saved = contract.parseMenuVisibilityResponse(frozenPayload)
check(saved.map.financeiro === false && saved.map['operation-investors'] === false && saved.map.dashboard === false && saved.map.contas === true, 'Persisted false values are kept exactly (no all-visible default)')
check(saved.saved === true && saved.updatedAt === '2026-10-15T18:30:12.345Z' && saved.updatedBy === 'ckqaop00000000000000000001', 'Saved metadata passes through')
check(JSON.stringify(frozenPayload) === JSON.stringify(savedPayload), 'The (deep-frozen) response object is never mutated')

const unknown = contract.parseMenuVisibilityResponse({
  data: { ...livePayload.data, visibility: { ...liveVisibility, 'operation-companies': false, 'future-module': true, 'bad key <x>': 1 } },
})
check(!('operation-companies' in unknown.map) && !('future-module' in unknown.map) && Object.keys(unknown.map).length === 23, 'Unknown IDs never enter the map (no new item / route)')
check(unknown.unknownIds.join() === 'operation-companies,future-module,(ID inválido)', 'Unknown IDs reported as drift (unsafe keys masked)')
const many = Object.fromEntries(Array.from({ length: 40 }, (_, index) => [`extra-${index}`, true]))
check(contract.parseMenuVisibilityResponse({ data: { ...livePayload.data, visibility: { ...liveVisibility, ...many } } }).unknownIds.length === 20, 'Drift report is bounded')

const isMismatch = (error) => error instanceof ApiError && error.kind === 'malformed' && error.code === contract.MENU_VISIBILITY_REGISTRY_MISMATCH
const isMalformed = (error) => error instanceof ApiError && error.kind === 'malformed' && error.code === contract.MENU_VISIBILITY_MALFORMED
function throws(fn, predicate, message) {
  try {
    fn()
  } catch (error) {
    check(predicate(error), message)
    return
  }
  assert.fail(`${message} (did not throw)`)
}
for (const id of ['dashboard', 'finance-wallets', 'ajuda']) {
  const missing = { ...liveVisibility }
  delete missing[id]
  throws(() => contract.parseMenuVisibilityResponse({ data: { ...livePayload.data, visibility: missing } }), isMismatch, `Missing ${id} → registry mismatch (no invented value)`)
}
throws(() => contract.parseMenuVisibilityResponse({ data: { ...livePayload.data, visibility: Object.create(liveVisibility) } }), isMismatch, 'Inherited keys do not count as returned IDs')
for (const value of ['false', 1, 0, null, {}, []]) {
  throws(() => contract.parseMenuVisibilityResponse({ data: { ...livePayload.data, visibility: { ...liveVisibility, contas: value } } }), isMalformed, `Non-boolean known value (${JSON.stringify(value)}) → malformed`)
}
for (const [payload, label] of [
  [null, 'null body'],
  [[], 'array body'],
  [{ visibility: liveVisibility }, 'bare map without envelope'],
  [{ data: null }, 'data null'],
  [{ data: { ...livePayload.data, scope: 'whitelabel' } }, 'non-global scope'],
  [{ data: { ...livePayload.data, scope: undefined } }, 'missing scope'],
  [{ data: { ...livePayload.data, visibility: [] } }, 'visibility array'],
  [{ data: { ...livePayload.data, visibility: null } }, 'visibility null'],
  [{ data: { ...livePayload.data, updatedAt: 'yesterday' } }, 'invalid updatedAt'],
  [{ data: { ...livePayload.data, updatedAt: '2026-02-30T10:00:00.000Z' } }, 'impossible updatedAt date'],
  [{ data: { ...livePayload.data, updatedAt: 1760550000000 } }, 'numeric updatedAt'],
  [{ data: { ...livePayload.data, updatedAt: undefined } }, 'missing updatedAt'],
  [{ data: { ...livePayload.data, updatedBy: { id: 'x' } } }, 'object updatedBy'],
  [{ data: { ...livePayload.data, updatedBy: 42 } }, 'numeric updatedBy'],
  [{ data: { ...livePayload.data, updatedBy: '' } }, 'empty updatedBy'],
  [{ data: { ...livePayload.data, updatedBy: 'operator@example.invalid' } }, 'non-identifier updatedBy'],
]) {
  throws(() => contract.parseMenuVisibilityResponse(payload), isMalformed, `Malformed envelope rejected: ${label}`)
}
// Stage B readiness only: the Backend PUT answers with the same envelope (no request is made here).
const mockedPutAnswer = { data: { scope: 'global', visibility: { ...liveVisibility, ajuda: false }, updatedAt: '2026-10-15T19:00:00.000Z', updatedBy: 'ckqaop00000000000000000002' } }
const putParsed = contract.parseMenuVisibilityResponse(mockedPutAnswer)
check(putParsed.saved && putParsed.map.ajuda === false, 'Mocked PUT answer (same envelope) is validated by the same adapter')

/* ---------- canonical authenticated client: the only request ---------- */
const operator = { id: 'synthetic-operator', name: 'Unit QA', email: 'qa@example.invalid', roles: ['SUPER_ADMIN'] }
const session = () => ({ accessToken: 'synthetic-unit-token-menu', tokenType: 'Bearer', operator })
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })
const reset = () => {
  auth.clearSession()
  auth.clearAuthNotice()
  window.location.hash = ''
  requests.length = 0
}

reset()
auth.persistSession(session())
fetchImpl = async () => json(livePayload)
const read = await api.fetchMenuVisibility()
check(requests.length === 1, 'One request per read')
check(requests[0].url === 'https://control-plane.example.invalid/api/homolog/menu-visibility', 'GET /api/homolog/menu-visibility with no query parameters')
check(requests[0].method === 'GET' && requests[0].body === undefined, 'Method GET, no body')
check(requests[0].headers.Authorization === 'Bearer synthetic-unit-token-menu', 'Bearer from the canonical session')
check(/^[0-9a-f-]{36}$/.test(requests[0].headers['X-Correlation-ID']), 'Fresh X-Correlation-ID per request')
check(read.map.dashboard === true && read.saved === false && Number.isFinite(Date.parse(read.readAt)), 'Parsed configuration plus client read time')

reset()
auth.persistSession(session())
fetchImpl = async () => json({ statusCode: 401, code: 'UNAUTHORIZED', message: 'Unauthorized' }, 401)
await rejects(api.fetchMenuVisibility(), (error) => error instanceof ApiError && error.status === 401, '401 rejects')
check(auth.getAccessToken() === null && auth.peekAuthNotice() === 'session_expired', '401 → canonical session invalidation (session cleared, expired notice)')
check(requests.length === 1, '401 is never retried')

reset()
auth.persistSession(session())
fetchImpl = async () => json({ statusCode: 403, code: 'FORBIDDEN', message: 'Insufficient role' }, 403)
await rejects(api.fetchMenuVisibility(), (error) => error instanceof ApiError && error.status === 403, '403 rejects')
check(auth.getAccessToken() === 'synthetic-unit-token-menu', '403 keeps the session (permission, not authentication)')

reset()
auth.persistSession(session())
fetchImpl = async () => json({ statusCode: 404, code: 'HTTP_ERROR', message: 'Cannot GET /api/homolog/menu-visibility' }, 404)
await rejects(api.fetchMenuVisibility(), (error) => error instanceof ApiError && error.status === 404, '404 (unsupported endpoint) rejects')

reset()
auth.persistSession(session())
fetchImpl = async () => new Response('<html>proxy</html>', { status: 200 })
await rejects(api.fetchMenuVisibility(), (error) => error instanceof ApiError && error.kind === 'malformed', 'Non-JSON 200 → malformed')
fetchImpl = async () => json({ data: { scope: 'global', visibility: { dashboard: true } , updatedAt: null, updatedBy: null } })
await rejects(api.fetchMenuVisibility(), isMismatch, 'Partial map from the transport → registry mismatch')
fetchImpl = async () => {
  throw new TypeError('Failed to fetch')
}
await rejects(api.fetchMenuVisibility(), (error) => error instanceof ApiError && error.kind === 'network', 'No response → network error')

reset()
auth.persistSession(session())
const aborted = new AbortController()
aborted.abort()
fetchImpl = async (_url, init) => {
  if (init.signal?.aborted) throw new DOMException('aborted', 'AbortError')
  return json(livePayload)
}
await rejects(api.fetchMenuVisibility(aborted.signal), isAbortError, 'Caller cancellation propagates as AbortError (ignored by the request model)')

reset()
auth.persistSession(session())
window.setTimeout = (fn) => setTimeout(fn, 0)
fetchImpl = (_url, init) => new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))))
await rejects(api.fetchMenuVisibility(), (error) => error instanceof ApiError && error.kind === 'timeout', 'Exceeded time budget → timeout error')
window.setTimeout = setTimeout

reset()
auth.persistSession(session())
fetchImpl = async () => {
  auth.clearSession()
  auth.persistSession({ ...session(), accessToken: 'synthetic-unit-token-other' })
  return json(livePayload)
}
await rejects(api.fetchMenuVisibility(), isAbortError, 'An answer for a previous session is discarded')

reset()
await rejects(api.fetchMenuVisibility(), (error) => error instanceof ApiError && error.status === 401, 'No session → 401 before any request')
check(requests.length === 0, 'No request without a session')
fetchImpl = async () => {
  throw new Error('Unexpected network operation in Menu Visibility checks')
}

/* ---------- parent / child semantics on the authoritative map ---------- */
const P = 'operacao'
const CH = 'operation-investors'
let map = live.map
check(model.isEffectivelyVisible(map, CH), 'parent=true child=true → child visible')
map = model.setPreference(map, P, false)
check(!model.isEffectivelyVisible(map, CH) && map[CH] === true, 'parent=false child=true → child hidden, stored child stays true')
check(model.effectiveState(map, CH).state === 'hidden-by-parent' && model.effectiveState(map, CH).hiddenBy === P, 'Reason: hidden by parent')
check(registry.menuEntry(P).children.every((child) => map[child.id] === live.map[child.id]), 'Hiding a parent does not rewrite child preferences')
const withChildOff = model.setPreference(map, CH, false)
check(!model.isEffectivelyVisible(withChildOff, CH) && model.effectiveState(withChildOff, CH).state === 'hidden', 'parent=false child=false → child hidden')
map = model.setPreference(map, P, true)
check(model.isEffectivelyVisible(map, CH) && map[CH] === true, 'parent=true again child=true → child visible again')
check(saved.map['finance-wallets'] === true && !model.isEffectivelyVisible(saved.map, 'finance-wallets'), 'Persisted parent=false hides a child whose persisted preference is true')
check(model.effectiveState(saved.map, 'finance-wallets').hiddenBy === 'financeiro', 'Persisted inheritance names the hiding parent')
const off = model.setPreference(saved.map, 'contas', false)
check(saved.map.contas === true && Object.keys(off).filter((id) => off[id] !== saved.map[id]).join() === 'contas', 'setPreference never mutates the reference and changes one ID')
check(model.setPreference(saved.map, 'dashboard', false) === saved.map, 'No-op change keeps the same map')
const sistemaOff = model.setPreference(live.map, 'sistema', false)
check(model.isEffectivelyVisible(sistemaOff, 'configuracoes') && model.isEffectivelyVisible(sistemaOff, 'ajuda'), 'No invented Sistema → Configurações / Ajuda override')

/* ---------- draft against the persisted reference ---------- */
const reference = saved.map
let draft = model.setPreference(reference, 'financeiro', true)
draft = model.setPreference(draft, 'contas', false)
check(model.isDirty(reference, draft) && !model.isDirty(reference, reference), 'Dirty detection against the persisted reference')
const changes = model.preferenceChanges(reference, draft)
check(changes.map((c) => `${c.id}:${c.from}>${c.to}`).join() === 'contas:true>false,financeiro:false>true', 'Diff lists only preference changes vs the persisted values, in sidebar order')
const effects = model.effectConsequences(reference, draft)
const wallet = effects.find((item) => item.id === 'finance-wallets')
check(wallet && wallet.preference === true && wallet.from === false && wallet.to === true, 'Wallet comes back when the persisted-hidden Financeiro is shown in the draft')
check(!effects.some((item) => item.id === 'contas' || item.id === 'financeiro'), 'Consequences exclude items whose own preference changed')
const hideFinance = model.effectConsequences(live.map, model.setPreference(live.map, 'financeiro', false))
check(hideFinance.length === registry.menuEntry('financeiro').children.length && hideFinance.every((item) => item.preference && item.from && !item.to && item.hiddenBy === 'financeiro'), 'Financeiro Visível → Oculto: children keep preference, effectively hidden')
check(!model.isDirty(reference, reference) && model.preferenceChanges(reference, reference).length === 0, 'Discard (draft := reference) returns exactly to the persisted values')
check(model.countEffectivelyHidden(reference) === 3 + registry.menuEntry('financeiro').children.length, 'Persisted hidden count = own (dashboard, investors, financeiro) + parent-hidden')

/* ---------- future PUT body (never sent) ---------- */
const body = contract.putRequestPreview(draft)
check(Object.keys(body).join() === 'visibility' && Object.keys(body.visibility).join() === ids.join(), 'PUT preview = complete map of every known ID, registry order (Backend rejects partial maps)')
check(body.visibility['finance-wallets'] === true && body.visibility.contas === false && body.visibility.dashboard === false, 'PUT preview carries stored preferences, not effective values')

/* ---------- error presentation ---------- */
const view = (error, operation = 'load') => contract.describeVisibilityError(error, operation)
check(view(new ApiError(401, {}, {})).kind === 'session' && !view(new ApiError(401, {}, {})).retryable, '401 → session view, no retry (canonical layer ends the session)')
check(view(new ApiError(403, {}, {})).kind === 'forbidden' && !view(new ApiError(403, {}, {})).retryable, '403 → permission denied, no retry')
check(view(new ApiError(404, {}, {})).kind === 'unsupported' && view(new ApiError(404, {}, {})).retryable, '404 → unsupported endpoint, retry offered')
for (const status of [500, 502, 503]) check(view(new ApiError(status, {}, {})).kind === 'unavailable' && view(new ApiError(status, {}, {})).retryable, `${status} → unavailable + retry`)
check(view(new ApiError(429, {}, {})).retryable, '429 → retry later')
check(view(new ApiError(0, {}, { kind: 'timeout' })).title.includes('tempo') && view(new ApiError(0, {}, { kind: 'timeout' })).retryable, 'Timeout → explicit timeout copy + retry')
check(view(new ApiError(0, {}, { kind: 'network' })).retryable, 'Network → retry')
check(view(new ApiError(200, { code: contract.MENU_VISIBILITY_MALFORMED }, { kind: 'malformed' })).title === 'Resposta inesperada do Control Plane', 'Malformed → safe copy')
check(view(new ApiError(200, { code: contract.MENU_VISIBILITY_REGISTRY_MISMATCH }, { kind: 'malformed' })).title === 'Registro de módulos divergente', 'Registry mismatch → distinct copy')
check(view(new Error('boom')).retryable, 'Unexpected error → generic retryable copy')
check(!JSON.stringify(view(new ApiError(500, { message: 'raw upstream detail' }, {}))).includes('raw upstream'), 'Raw Backend messages are never shown')
check(view(new ApiError(500, { correlationId: 'corr-123' }, {})).correlationId === 'corr-123', 'Correlation id kept for diagnosis')
// Mocked PUT failures (Stage B readiness; no PUT is sent).
check(view(new ApiError(400, { code: 'E_INVALID_MENU_VISIBILITY' }, {}), 'save').kind === 'invalid', 'Mocked PUT 400 → invalid map')
check(view(new ApiError(403, {}, {}), 'save').kind === 'forbidden', 'Mocked PUT 403 → forbidden')
check(view(new ApiError(409, {}, {}), 'save').kind === 'conflict', 'Mocked PUT 409 → conflict (not implemented by the Backend today)')
for (const error of [new ApiError(0, {}, { kind: 'timeout' }), new ApiError(0, {}, { kind: 'network' }), new ApiError(502, {}, {}), new ApiError(200, {}, { kind: 'malformed' }), new Error('x')]) {
  check(/pode ou não ter sido aplicada/.test(view(error, 'save').description), 'Uncertain PUT outcome is never presented as failure-for-sure')
}

/* ---------- route: no prototype override ---------- */
check(JSON.stringify(route.parseVisibilityRoute({})) === '{"ignored":[]}', 'No parameter, nothing ignored')
for (const value of ['carregando', 'indisponivel', 'sem-permissao', 'erro', 'falha-ao-salvar', 'dashboard=false']) {
  const parsed = route.parseVisibilityRoute({ previa: value })
  check(!('preview' in parsed) && parsed.ignored.length === 1, `?previa=${value} can no longer pin a state; it is reported as ignored`)
}
check(route.menuVisibilityHref() === '#/settings/menu-visibility', 'Href')

/* ---------- source boundaries ---------- */
const featureDir = resolve(root, 'src/features/menu-visibility')
const featureFiles = (await readdir(featureDir)).filter((name) => /\.(ts|tsx)$/.test(name))
check(!featureFiles.includes('prototypeVisibility.ts') && featureFiles.includes('menuVisibilityApi.ts'), 'Prototype source removed; API module present')
const codeOnly = (source, name) =>
  ts.transpileModule(source, {
    fileName: name,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.Preserve, removeComments: true },
  }).outputText
// Keep the prototype review's syntax-aware capability checks: a regex for
// `fetch(` alone misses aliases and computed access such as window['fetch'].
function unsafeCapability(source, storage = false, allowCanonicalGet = false) {
  const ast = ts.createSourceFile('fixture.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const names = storage
    ? /^(localStorage|sessionStorage|indexedDB|cookie|caches)$/
    : /^(fetch|apiRequest|authenticatedGet|authenticatedPost|authenticatedPut|authenticatedPatch|authenticatedDelete|XMLHttpRequest|sendBeacon|WebSocket|EventSource)$/
  let found = false
  const forbidden = (name) => names.test(name) && !(allowCanonicalGet && name === 'authenticatedGet')
  function visit(node) {
    if (ts.isIdentifier(node) && forbidden(node.text)) found = true
    if (ts.isElementAccessExpression(node) && ts.isStringLiteralLike(node.argumentExpression) && forbidden(node.argumentExpression.text)) found = true
    if (!storage && ts.isImportDeclaration(node)) {
      const module = node.moduleSpecifier.text
      if (/(^|\/)(axios|ky|ofetch|superagent)(\/|$)/.test(module)) found = true
      if (/(^|\/)apiClient$/.test(module)) {
        const clause = node.importClause
        const bindings = clause?.namedBindings
        const onlyGet = allowCanonicalGet && !clause?.name && bindings && ts.isNamedImports(bindings)
          && bindings.elements.length === 1 && (bindings.elements[0].propertyName ?? bindings.elements[0].name).text === 'authenticatedGet'
        if (!onlyGet) found = true
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)
  return found
}
for (const name of featureFiles) {
  const source = await readFile(resolve(featureDir, name), 'utf8')
  const code = codeOnly(source, name)
  check(!unsafeCapability(source, false, name === 'menuVisibilityApi.ts'), `${name}: syntax-aware transport boundary, including aliases/computed access`)
  check(!unsafeCapability(source, true), `${name}: syntax-aware browser persistence boundary`)
  check(!/\bfetch\s*\(|apiRequest|authenticated(Post|Put|Patch|Delete)|XMLHttpRequest|sendBeacon|WebSocket|EventSource/.test(code), `${name}: no raw transport or write client`)
  check(!/\bmethod\s*:/.test(code), `${name}: no request method override (GET only)`)
  check(name === 'menuVisibilityApi.ts' ? /authenticatedGet\(/.test(code) : !/authenticatedGet/.test(code), `${name}: only the API module uses the canonical GET`)
  check(!/localStorage|sessionStorage|indexedDB|document\.cookie|caches\.|navigator\.storage/.test(code), `${name}: no browser storage`)
  check(!/createContext|\.Provider\b|useSyncExternalStore/.test(code), `${name}: no global context / store for the configuration or draft`)
  check(!/^(let|var)\s/m.test(code), `${name}: no module-level mutable singleton`)
  check(!/operation-companies/.test(code), `${name}: no Companies menu ID`)
  check(!/prototypeVisibility|prototypeInitialMap|previewSaveError|PREVIEW_LABEL/.test(code), `${name}: no prototype source or preview override`)
}
for (const source of ['window["fetch"]("/api/homolog/menu-visibility")', 'const send = fetch; send("/x")', 'import {authenticatedPut as save} from "./apiClient"', 'import client from "axios"; client.put("/x")']) {
  check(unsafeCapability(source, false, true), 'Planted raw/aliased write capability detected even in the GET module')
}
for (const source of ['window["localStorage"].setItem("draft","x")', 'indexedDB.open("draft")', 'document["cookie"]="draft=x"']) {
  check(unsafeCapability(source, true), 'Planted computed storage capability detected')
}
check(!unsafeCapability('// fetch()\nconst explanation="fetch unavailable"') && !unsafeCapability('const explanation="localStorage is not used"', true), 'Syntax checks ignore comments and explanatory strings')
async function walk(path) {
  const out = []
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const full = resolve(path, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(full)))
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full)
  }
  return out
}
const allowedMentions = new Set([
  'src/features/menu-visibility/menuVisibilityContract.ts',
  'src/features/menu-visibility/menuVisibilityRoute.ts',
  'src/features/menu-visibility/MenuVisibilityPage.tsx',
  // request-model key of the single read
  'src/features/menu-visibility/useVisibilitySource.ts',
  'src/components/shell/navigation.ts',
  'src/app/App.tsx',
])
for (const file of await walk(resolve(root, 'src'))) {
  const rel = relative(root, file).replaceAll('\\', '/')
  const code = codeOnly(await readFile(file, 'utf8'), file)
  if (/menu-visibility/.test(code)) check(allowedMentions.has(rel), `${rel}: may mention menu-visibility only as a route or documented endpoint`)
  if (/homolog\/menu-visibility/.test(code)) check(rel === 'src/features/menu-visibility/menuVisibilityContract.ts', `${rel}: endpoint string only in the contract module`)
  if (!rel.startsWith('src/features/menu-visibility/') && rel !== 'src/app/App.tsx') {
    check(!/from\s+['"][^'"]*menu-visibility\//.test(code), `${rel}: nothing outside the page route imports Menu Visibility state`)
  }
  check(!code.includes('operation-companies'), `${rel}: no operation-companies ID`)
}
const apiModule = codeOnly(await readFile(resolve(featureDir, 'menuVisibilityApi.ts'), 'utf8'), 'api.ts')
check(/authenticatedGet\(MENU_VISIBILITY_CONTRACT\.getPath, \{ signal \}\)/.test(apiModule), 'GET through the canonical client with the caller signal and no query')
const hook = codeOnly(await readFile(resolve(featureDir, 'useVisibilitySource.ts'), 'utf8'), 'hook.ts')
check(/useRemote\('menu-visibility', fetchMenuVisibility\)/.test(hook) && /export function useMenuVisibilityConfig\(\)/.test(hook), 'Source uses the shared abortable request model; takes no override argument')

// The real shell, routes, landing and shared clients are byte-identical to the baseline.
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' })
for (const path of ['src/components', 'src/lib', 'src/features/dashboard', 'src/app/useUnsavedChangesGuard.ts', 'src/app/prototypeNavigation.ts', 'src/app/routeQuery.ts', 'src/app/useUrlSearchDraft.ts']) {
  check(git('diff', '--name-only', BASELINE, '--', path).trim() === '', `${path}: unchanged from ${BASELINE.slice(0, 7)} (sidebar, shortcuts, shared clients)`)
}
const appNow = codeOnly(await readFile(resolve(root, 'src/app/App.tsx'), 'utf8'), 'App.tsx')
const appBefore = codeOnly(git('show', `${BASELINE}:src/app/App.tsx`), 'App.tsx')
check(appNow === appBefore, 'App.tsx code identical to the baseline (route resolver, session guard and post-login landing unchanged; comments only)')
const changedOutside = git('diff', '--name-only', BASELINE, '--', 'src').split('\n').filter(Boolean).filter((path) => !path.startsWith('src/features/menu-visibility/') && path !== 'src/app/App.tsx')
const untrackedOutside = git('ls-files', '--others', '--exclude-standard', '--', 'src').split('\n').filter(Boolean).filter((path) => !path.startsWith('src/features/menu-visibility/'))
check(changedOutside.length === 0 && untrackedOutside.length === 0, 'No other source file changed (Opportunities, Companies, Finance and every other module untouched)')

const page = await readFile(resolve(featureDir, 'MenuVisibilityPage.tsx'), 'utf8')
check(page.includes('activeNav="configuracoes"') && !/activeNav="(?!configuracoes)/.test(page), 'Page uses the existing configuracoes identity')
check(page.includes('useUnsavedChangesGuard(dirty'), 'Unsaved-change guard follows the draft dirty state')
check(page.includes('const [reference] = useState(loaded)') && !/setReference/.test(page), 'Reference captured once per mount: no later answer and no local save can rewrite it')
check(!/updatedAt\s*[:=]\s*new Date|updatedBy\s*[:=]/.test(codeOnly(page, 'page.tsx')), 'No local updatedAt / updatedBy')
check(page.includes('Descartar alterações não salvas') && !/Restaurar prévia inicial|prévia inicial/i.test(page), 'Discard wording refers to unsaved changes, not a prototype preview')
const dialogs = await readFile(resolve(featureDir, 'VisibilityDialogs.tsx'), 'utf8')
check(dialogs.includes('aria-disabled="true"') && dialogs.includes('event.preventDefault()') && dialogs.includes('Aplicação e persistência aguardam validação das regras e autorização.'), 'Final save is aria-disabled, inert and explained')
check(!/prévia inicial|todos os módulos visíveis/i.test(dialogs), 'Discard dialog restores the persisted configuration, not a default')
check(!/salv[ao] com sucesso|configuração salva|alterações salvas/i.test(page + dialogs), 'No success state for a save that never happens')
const allFeatureCode = (await Promise.all(featureFiles.map(async (name) => codeOnly(await readFile(resolve(featureDir, name), 'utf8'), name)))).join('\n')
check(!/governance-audit|['"`]\/audit|UPDATE_MENU_VISIBILITY|auditApi/.test(allFeatureCode), 'Frontend creates no Audit records (no Audit module, path or action)')

/* ---------- documentation ---------- */
const docs = await readFile(resolve(root, 'docs/menu-visibility-read-integration-v1.md'), 'utf8')
for (const line of ['MENU VISIBILITY INTEGRATION V1 — STAGE A', 'AUTHORITATIVE CONFIGURATION READ: INTEGRATED', 'GLOBAL CONFIGURATION UPDATE: NOT ENABLED', 'REAL NAVIGATION ENFORCEMENT: NOT ENABLED']) {
  check(docs.includes(line), `Docs: "${line}"`)
}
const stageBDocs = await readFile(resolve(root, 'docs/menu-visibility-stage-b-preparation.md'), 'utf8')
for (const line of ['STAGE B PRODUCT RULES: PREPARED', 'STAGE B LIVE WRITE: NOT ENABLED', 'REAL SIDEBAR ENFORCEMENT: NOT ENABLED']) {
  check(stageBDocs.includes(line), `Stage B docs: "${line}"`)
}
const legacyDocs = await readFile(resolve(root, 'docs/menu-visibility-frontend-v1.md'), 'utf8')
check(legacyDocs.includes('menu-visibility-read-integration-v1.md') && /superseded/i.test(legacyDocs), 'Prototype doc points to the Stage A doc for superseded sections')

/* ---------- rendered controls, preview, review and the real sidebar ---------- */
const { createElement: h } = require('react')
const { renderToStaticMarkup: render } = require('react-dom/server')
const { VisibilityControls } = await load('src/features/menu-visibility/VisibilityControls.tsx')
const { VisibilityPreview } = await load('src/features/menu-visibility/VisibilityPreview.tsx')
const { VisibilityReviewDialog } = await load('src/features/menu-visibility/VisibilityDialogs.tsx')
const { Sidebar } = await load('src/components/shell/Sidebar.tsx')
const sidebarProps = { activeId: 'configuracoes', open: false, onClose() {} }
const sidebarBefore = render(h(Sidebar, sidebarProps))
for (const parent of ['plataformas', 'operacao', 'financeiro', 'compliance']) {
  const hidden = model.setPreference(live.map, parent, false)
  const controls = render(h(VisibilityControls, { base: live.map, draft: hidden, onChange() {} }))
  const preview = render(h(VisibilityPreview, { draft: hidden }))
  const review = render(h(VisibilityReviewDialog, { base: live.map, draft: hidden, onClose() {} }))
  check((controls.match(/role="switch"/g) ?? []).length === 23, 'Rendered controls expose exactly 23 named switches')
  check(controls.includes(`data-menu-id="${parent}"`) && controls.includes('data-persisted-value="visible"') && controls.includes('Configuração persistida: visível.'), 'Changed row shows its persisted value')
  for (const child of registry.menuEntry(parent).children) {
    check(controls.includes(`data-menu-id="${child.id}" data-child="" data-effective="hidden-by-parent"`), 'Child row explains the inherited result')
    check(!preview.includes(`data-preview-id="${child.id}"`) && preview.includes(`data-preview-hidden-id="${child.id}"`), 'Preview omits inherited-hidden child and explains it separately')
    check(!review.includes(`data-review-change="${child.id}"`) && review.includes(`data-review-effect="${child.id}"`), 'Review does not invent child preference changes')
  }
  check((review.match(/data-review-change=/g) ?? []).length === 1, 'Primary review diff includes only the parent preference')
  check(review.includes('aria-disabled="true"') && review.includes('não enviado') && review.includes('configuração persistida'), 'Review compares with the persisted configuration; save pending; map not sent')
  check(!/<a\b|<button\b/.test(preview), 'Preview has no interactive routing or mutation controls')
  check(render(h(Sidebar, sidebarProps)) === sidebarBefore, 'Toggling the draft leaves the actual Sidebar identical')
}
const persistedControls = render(h(VisibilityControls, { base: saved.map, draft: saved.map, onChange() {} }))
const switchTag = (html, id) => (html.match(new RegExp(`<button[^>]*data-visibility-switch="${id}"[^>]*>`)) ?? [''])[0]
check(switchTag(persistedControls, 'dashboard').includes('aria-checked="false"') && switchTag(persistedControls, 'contas').includes('aria-checked="true"'), 'Persisted dashboard=false renders unchecked; contas=true checked')
check(!persistedControls.includes('data-changed'), 'Untouched draft equal to the persisted configuration shows no change')
check(render(h(Sidebar, sidebarProps)) === sidebarBefore, 'A persisted configuration with hidden modules leaves the actual Sidebar identical (no enforcement)')

/* ---------- rendered page states (stubbed source; frame stubbed) ---------- */
globalThis.__menuPageState = { state: { status: 'loading' }, reload() {} }
const pageSource = (await readFile(resolve(featureDir, 'MenuVisibilityPage.tsx'), 'utf8'))
  .replace("from './useVisibilitySource'", `from '${dataModule('export const useMenuVisibilityConfig=()=>globalThis.__menuPageState')}'`)
  .replace("from '../../components/shell/AppShell'", `from '${dataModule("import {createElement as h} from 'react';export const AppShell=({children})=>h('main',null,children)".replace("'react'", JSON.stringify(pathToFileURL(require.resolve('react')).href)))}'`)
  .replace("from '../whitelabels/visuals/DotMatrixBackground'", `from '${dataModule('export const DotMatrixBackground=()=>null')}'`)
  .replace("from '../../app/useUnsavedChangesGuard'", `from '${dataModule('export const useUnsavedChangesGuard=()=>({pending:null,stay(){},discardAndContinue(){}})')}'`)
  // Test-only operator double (SSR has no session snapshot): mocked roles, never a production bypass.
  .replace("from '../../lib/authSession'", `from '${dataModule('export const useSessionOperator=()=>globalThis.__menuOperator')}'`)
check(!pageSource.includes("from '../../lib/authSession'") && (await readFile(resolve(featureDir, 'MenuVisibilityPage.tsx'), 'utf8')).includes("import { useSessionOperator } from '../../lib/authSession'"), 'Page reads the operator through the canonical session hook (stubbed only here)')
const operatorWith = (...roles) => ({ id: 'synthetic-operator', name: 'Unit QA', email: 'qa@example.invalid', roles })
globalThis.__menuOperator = operatorWith('SUPER_ADMIN')
const { MenuVisibilityPage } = await load('src/features/menu-visibility/MenuVisibilityPage.tsx', pageSource)
const renderPage = (state, previa, operator = operatorWith('SUPER_ADMIN')) => {
  globalThis.__menuPageState = { state, reload() {} }
  globalThis.__menuOperator = operator
  return render(h(MenuVisibilityPage, { previa }))
}
const loadingHtml = renderPage({ status: 'loading' })
check(loadingHtml.includes('data-visibility-state="loading"') && !loadingHtml.includes('role="switch"'), 'Loading: no switches, no illustrative values')
check(loadingHtml.includes('data-visibility-legend') && loadingHtml.includes('Aplicação real'), 'Source legend names persisted / draft / preview / real application')
for (const [error, kind] of [
  [new ApiError(403, {}, {}), 'forbidden'],
  [new ApiError(404, {}, {}), 'unsupported'],
  [new ApiError(503, {}, {}), 'unavailable'],
  [new ApiError(0, {}, { kind: 'timeout' }), 'unavailable'],
  [new ApiError(200, { code: contract.MENU_VISIBILITY_REGISTRY_MISMATCH }, { kind: 'malformed' }), 'unavailable'],
]) {
  const html = renderPage({ status: 'error', error })
  check(html.includes(`data-error-kind="${kind}"`) && !html.includes('role="switch"') && !html.includes('data-visibility-persisted'), `Error (${kind}): real error state, no fallback preferences`)
  check(html.includes('data-retry') === (kind !== 'forbidden'), `Error (${kind}): retry only when it can help`)
}
const neverSaved = renderPage({ status: 'success', data: { ...live, readAt: '2026-10-15T18:00:00.000Z' } })
check(neverSaved.includes('data-saved="false"') && neverSaved.includes('Nunca salva — valores padrão informados pelo Control Plane'), 'Never saved: labelled as Control Plane defaults, not a saved row')
check(neverSaved.includes('data-updated-by=""') || neverSaved.includes('—'), 'Never saved: no invented operator')
const savedHtml = renderPage({ status: 'success', data: { ...saved, readAt: '2026-10-15T18:31:00.000Z' } })
check(savedHtml.includes('data-saved="true"') && savedHtml.includes('dateTime="2026-10-15T18:30:12.345Z"') && savedHtml.includes('ckqaop00000000000000000001'), 'Saved: Backend metadata shown as returned')
check(savedHtml.includes('data-persisted-not-applied') && savedHtml.includes('não aplica'), 'Persisted hidden modules are stated as not applied to the real sidebar')
check((savedHtml.match(/role="switch"/g) ?? []).length === 23 && !savedHtml.includes('data-draft-bar'), 'Initial draft equals the persisted configuration (no change bar)')
const driftHtml = renderPage({ status: 'success', data: { ...unknown, readAt: '2026-10-15T18:00:00.000Z' } })
check(driftHtml.includes('data-unknown-ids="3"') && !driftHtml.includes('data-menu-id="operation-companies"'), 'Unknown IDs: drift notice, never rendered as items')
const previaHtml = renderPage({ status: 'success', data: { ...live, readAt: '2026-10-15T18:00:00.000Z' } }, 'erro')
check(previaHtml.includes('data-ignored-params') && previaHtml.includes('role="switch"') && !previaHtml.includes('data-error-kind'), '?previa=erro is ignored: the persisted configuration still renders')

/* ==================== STAGE B PREPARATION — approved Product rules ==================== */
const policy = await load('src/features/menu-visibility/visibilityPolicy.ts')
const resolver = await load('src/features/menu-visibility/visibilityResolver.ts')
const update = await load('src/features/menu-visibility/menuVisibilityUpdate.ts')

/* ---------- rules 1, 2, 6: protected modules ---------- */
check(policy.PROTECTED_MENU_IDS.join() === 'dashboard,configuracoes' && Object.isFrozen(policy.PROTECTED_MENU_IDS), 'Exactly Dashboard and Configurações are protected')
check(policy.PROTECTED_EXPLANATION.dashboard === 'Sempre visível — módulo obrigatório.' && policy.PROTECTED_EXPLANATION.configuracoes === 'Sempre visível — acesso à gestão de módulos.', 'Protected explanations')
check(policy.HIDEABLE_MENU_IDS.length === 21 && !policy.HIDEABLE_MENU_IDS.includes('dashboard') && !policy.HIDEABLE_MENU_IDS.includes('configuracoes'), '21 hideable IDs')
check(ids.every((id) => policy.isProtectedMenuId(id) === (id === 'dashboard' || id === 'configuracoes')), 'isProtectedMenuId matches the rule only')
for (const id of ['dashboard', 'configuracoes']) {
  check(policy.setDraftPreference(live.map, id, false) === live.map, `${id}: hiding is refused in the draft (same map, nothing silently discarded)`)
  check(policy.setDraftPreference(saved.map, id, true)[id] === true, `${id}: showing is allowed`)
}
check(policy.setDraftPreference(saved.map, 'dashboard', true).dashboard === true && saved.map.dashboard === false, 'Showing a protected module never mutates the reference')
check(policy.setDraftPreference(live.map, 'contas', false).contas === false, 'Non-protected modules keep normal editing')
check(policy.setDraftPreference(live.map, 'sistema', false).sistema === false && policy.setDraftPreference(live.map, 'ajuda', false).ajuda === false, 'Sistema and Ajuda stay hideable')
check(policy.policyViolations(live.map).length === 0, 'Live homolog configuration has no policy violation')
const violating = contract.parseMenuVisibilityResponse({ data: { ...livePayload.data, visibility: { ...liveVisibility, dashboard: false, configuracoes: false }, updatedAt: '2026-10-16T10:00:00.000Z', updatedBy: 'ckqaop00000000000000000001' } })
check(violating.map.dashboard === false && violating.map.configuracoes === false, 'Adapter keeps a violating server value exactly (no silent rewrite)')
check(policy.policyViolations(violating.map).map((v) => v.id).join() === 'dashboard,configuracoes', 'Server violations detected for both protected modules')
const restoredDraft = policy.restoreProtectedInDraft(violating.map)
check(restoredDraft.dashboard && restoredDraft.configuracoes && violating.map.dashboard === false, 'Explicit draft correction leaves the server reference untouched')
check(Object.keys(restoredDraft).filter((id) => restoredDraft[id] !== violating.map[id]).join() === 'dashboard,configuracoes', 'Draft correction changes only the protected modules')

/* ---------- rule 3: independent utilities ---------- */
const sistemaHidden = resolver.resolveVisibility(policy.setDraftPreference(live.map, 'sistema', false))
check(!sistemaHidden.byId.sistema.sidebarVisible && sistemaHidden.byId.configuracoes.sidebarVisible && sistemaHidden.byId.ajuda.sidebarVisible, 'Hiding Sistema affects neither Configurações nor Ajuda')
check(['sistema', 'configuracoes', 'ajuda'].every((id) => sistemaHidden.byId[id].parentId === null), 'No parent / child between Sistema, Configurações and Ajuda')
const ajudaHidden = resolver.resolveVisibility(policy.setDraftPreference(live.map, 'ajuda', false))
check(!ajudaHidden.byId.ajuda.sidebarVisible && ajudaHidden.byId.sistema.sidebarVisible && ajudaHidden.byId.configuracoes.sidebarVisible, 'Hiding Ajuda affects nothing else')

/* ---------- pure resolver: sidebar-only, rule 8 ---------- */
const all = resolver.resolveVisibility(live.map)
check(all.entries.length === 23 && all.entries.map((e) => e.id).join() === entryIds.join() && all.hidden.length === 0 && all.violations.length === 0, 'All visible: 23 entries in sidebar order')
check(all.sidebar.primary.map((n) => n.id).join() === registry.MENU_TREE.primary.map((e) => e.id).join() && all.sidebar.utility.map((n) => n.id).join() === 'configuracoes,ajuda', 'Sidebar tree mirrors the real navigation')
check(Object.isFrozen(all) && Object.isFrozen(all.entries) && all.entries.every((e) => Object.isFrozen(e)), 'Resolution is immutable')
const opOff = resolver.resolveVisibility(policy.setDraftPreference(live.map, 'operacao', false))
check(opOff.byId.operacao.preference === false && opOff.byId['operation-investors'].preference === true, 'Stored: operacao=false, operation-investors=true (child preserved)')
check(!opOff.byId['operation-investors'].sidebarVisible && opOff.byId['operation-investors'].reason === 'hidden-by-parent' && opOff.byId['operation-investors'].hiddenBy === 'operacao', 'Effective: Investidores hidden through its parent')
check(!opOff.sidebar.primary.some((n) => n.id === 'operacao') && opOff.hidden.length === 4, 'Hidden parent removes its subtree from the sidebar')
const opBack = resolver.resolveVisibility(policy.setDraftPreference(policy.setDraftPreference(live.map, 'operacao', false), 'operacao', true))
check(opBack.byId['operation-investors'].sidebarVisible && opBack.sidebar.primary.find((n) => n.id === 'operacao').children.length === 3, 'Restoring the parent brings Investidores back (preference never destroyed)')
const childOff = resolver.resolveVisibility(policy.setDraftPreference(policy.setDraftPreference(live.map, 'operation-investors', false), 'operacao', false))
check(childOff.byId['operation-investors'].reason === 'hidden-own-preference' && childOff.byId['operation-investors'].preference === false && !childOff.byId['operation-investors'].sidebarVisible, 'Own-false child under a hidden parent: reason is its own preference, value kept false')
const childOffBack = resolver.resolveVisibility(policy.setDraftPreference(live.map, 'operation-investors', false))
check(childOffBack.byId['operation-investors'].reason === 'hidden-own-preference' && childOffBack.byId.operacao.sidebarVisible, 'Child hidden by its own preference while the parent stays visible')
const viol = resolver.resolveVisibility(violating.map)
check(viol.byId.dashboard.preference === false && viol.byId.dashboard.sidebarVisible && viol.byId.dashboard.reason === 'protected-always-visible' && viol.byId.dashboard.policyViolation, 'Protected + stored false: preference reported as false, shown anyway, flagged')
check(viol.violations.length === 2 && viol.sidebar.utility.some((n) => n.id === 'configuracoes') && viol.sidebar.primary[0].id === 'dashboard', 'Protected modules always in the sidebar; violations listed')
check(resolver.countSidebarHidden(violating.map) === 0, 'Protected violations never count as hidden')
const frozenMap = Object.freeze({ ...saved.map })
resolver.resolveVisibility(frozenMap)
check(JSON.stringify(frozenMap) === JSON.stringify(saved.map), 'Resolver never mutates its input')

/* ---------- rules 4, 5: direct routes, shortcuts, internal links (pure specification) ---------- */
check(JSON.stringify(policy.VISIBILITY_SCOPE) === JSON.stringify({ sidebar: 'affected', directRoutes: 'unaffected', dashboardShortcuts: 'unaffected', internalLinks: 'unaffected', postLoginLanding: 'unaffected', authorization: 'unaffected' }), 'Scope: sidebar only')
check(Object.isFrozen(policy.VISIBILITY_SCOPE) && opOff.scope === policy.VISIBILITY_SCOPE, 'Every resolution carries the frozen sidebar-only scope')
for (const resolution of [opOff, childOff, viol, resolver.resolveVisibility(saved.map)]) {
  check(resolution.entries.every((e) => e.directRoute === 'unaffected' && e.shortcuts === 'unaffected' && e.internalLinks === 'unaffected'), 'Hidden or visible, every module keeps direct route / shortcut / internal-link access')
}
const resolverCode = codeOnly(await readFile(resolve(featureDir, 'visibilityResolver.ts'), 'utf8'), 'resolver.ts')
const policyCode = codeOnly(await readFile(resolve(featureDir, 'visibilityPolicy.ts'), 'utf8'), 'policy.ts')
for (const [name, code] of [['visibilityResolver.ts', resolverCode], ['visibilityPolicy.ts', policyCode]]) {
  check(!/window|document|location|history|navigate|redirect|useState|useEffect|from 'react'|apiClient|authSession|Storage/.test(code), `${name}: pure (no DOM, routing, React, transport, session or storage)`)
}
const sidebarSource = await readFile(resolve(root, 'src/components/shell/Sidebar.tsx'), 'utf8')
const appSource = await readFile(resolve(root, 'src/app/App.tsx'), 'utf8')
const dashboardDir = (await readdir(resolve(root, 'src/features/dashboard'))).filter((name) => /\.(ts|tsx)$/.test(name))
for (const [name, source] of [['Sidebar.tsx', sidebarSource], ['App.tsx', appSource], ...(await Promise.all(dashboardDir.map(async (n) => [n, await readFile(resolve(root, 'src/features/dashboard', n), 'utf8')])))]) {
  check(!/visibilityResolver|visibilityPolicy|resolveVisibility|menuVisibilityUpdate/.test(source), `${name}: resolver / policy not wired (real sidebar, routes, landing and shortcuts untouched)`)
}

/* ---------- rule 7: roles ---------- */
const accessCases = [
  [['SUPER_ADMIN'], 'edit', 'edit'],
  [['SUPPORT_ADMIN'], 'read', 'read'],
  [['READ_ONLY'], 'read', 'read'],
  [['FINANCIAL_ADMIN'], 'none', 'read'],
  [['COMPLIANCE_ADMIN'], 'none', 'read'],
  [['READ_ONLY', 'SUPER_ADMIN'], 'edit', 'edit'],
  [['FINANCIAL_ADMIN', 'SUPPORT_ADMIN'], 'read', 'read'],
  [['super_admin'], 'none', 'read'],
  [['__proto__', 'toString'], 'none', 'read'],
  [[], 'none', 'read'],
  [null, 'none', 'read'],
  [undefined, 'none', 'read'],
]
for (const [roles, access, mode] of accessCases) {
  check(policy.expectedAccess(roles) === access && policy.presentationMode(roles) === mode, `Roles ${JSON.stringify(roles)} → access ${access}, presentation ${mode}`)
}

/* ---------- candidate payload (future PUT, never sent) ---------- */
const cand = update.buildUpdateCandidate(live.map, policy.setDraftPreference(live.map, 'financeiro', false), 'edit')
check(cand.valid && cand.sendable === false && cand.endpoint === 'PUT /api/homolog/menu-visibility', 'Valid candidate is still not sendable')
check(Object.keys(cand.body).join() === 'visibility' && Object.keys(cand.body.visibility).join() === ids.join() && cand.body.visibility.financeiro === false && cand.body.visibility['finance-wallets'] === true, 'Candidate = complete 23-ID map of stored preferences')
check(cand.body.visibility.dashboard === true && cand.body.visibility.configuracoes === true, 'Protected IDs are true in a valid candidate')
check(update.STAGE_B_ACTIVATION_BLOCKERS.join() === 'stage-b-not-enabled,server-protected-ids-not-enforced,server-concurrency-not-implemented,server-audit-not-atomic' && cand.blockedBy === update.STAGE_B_ACTIVATION_BLOCKERS, 'Candidate lists the activation blockers')
const invalidCand = update.buildUpdateCandidate(violating.map, violating.map, 'edit')
check(!invalidCand.valid && invalidCand.issues.filter((i) => i.kind === 'protected-hidden').length === 2 && invalidCand.issues.some((i) => i.kind === 'no-changes'), 'A server violation makes the candidate invalid (and is not normalized)')
check(invalidCand.body.visibility.dashboard === false, 'Invalid candidate shows the real value, never a silent true')
check(update.buildUpdateCandidate(violating.map, restoredDraft, 'edit').valid, 'After explicit draft correction the candidate becomes valid')
check(update.buildUpdateCandidate(live.map, live.map, 'edit').issues.map((i) => i.kind).join() === 'no-changes', 'No-op candidate flagged')
check(update.buildUpdateCandidate(live.map, policy.setDraftPreference(live.map, 'contas', false), 'read').issues.some((i) => i.kind === 'read-only'), 'Read-only role candidate flagged')
// Runtime callers must not bypass the typed map boundary: never label a partial,
// non-boolean or extra-ID candidate as valid (or silently strip unknown keys).
const candidateDraft = { ...live.map, contas: false }
const invalidCandidateMap = (error) => error instanceof TypeError
for (const id of ids) {
  const partial = { ...candidateDraft }
  delete partial[id]
  throws(() => update.buildUpdateCandidate(live.map, partial, 'edit'), invalidCandidateMap, `Candidate rejects missing draft ID ${id}`)
  throws(() => update.buildUpdateCandidate(partial, candidateDraft, 'edit'), invalidCandidateMap, `Candidate rejects missing reference ID ${id}`)
}
for (const malformedMap of [null, undefined, [], true, 42, 'map', Object.create(candidateDraft), { ...candidateDraft, unexpected: true }]) {
  throws(() => update.buildUpdateCandidate(live.map, malformedMap, 'edit'), invalidCandidateMap, 'Candidate rejects malformed/inherited/extra-key draft')
  throws(() => update.buildUpdateCandidate(malformedMap, candidateDraft, 'edit'), invalidCandidateMap, 'Candidate rejects malformed/inherited/extra-key reference')
}
for (const value of [undefined, null, 0, 1, 'false', {}]) {
  throws(() => update.buildUpdateCandidate(live.map, { ...candidateDraft, ajuda: value }, 'edit'), invalidCandidateMap, 'Candidate rejects non-boolean value')
}
check(Object.isFrozen(cand.body) && Object.isFrozen(cand.body.visibility), 'Candidate body and complete map are immutable snapshots')
const mutableDraft = { ...candidateDraft }
const immutableCandidate = update.buildUpdateCandidate(live.map, mutableDraft, 'edit')
mutableDraft.contas = true
check(immutableCandidate.body.visibility.contas === false, 'Candidate never aliases the mutable input')
for (const mode of [undefined, null, 'none', 'SUPER_ADMIN', 'EDIT']) {
  check(!update.buildUpdateCandidate(live.map, candidateDraft, mode).valid, 'Unrecognized candidate mode never gains edit capability')
}
for (let attempt = 0; attempt < 50; attempt += 1) {
  let map = live.map
  for (const id of ids) map = policy.setDraftPreference(map, id, (attempt * 7 + id.length) % 3 !== 0)
  const candidate = update.buildUpdateCandidate(live.map, map, 'edit')
  check(candidate.body.visibility.dashboard === true && candidate.body.visibility.configuracoes === true, 'Any draft built through the policy setter keeps protected IDs true')
}

/* ---------- mocked PUT outcomes (TEST-ONLY injected transport; production has none) ---------- */
const echo = (candidate, overrides = {}) => ({ data: { scope: 'global', visibility: { ...candidate.body.visibility }, updatedAt: '2026-10-16T12:00:00.000Z', updatedBy: 'ckqaop00000000000000000001', ...overrides } })
const mockTransport = (scenario) => {
  const sent = []
  const send = async (request) => {
    sent.push(request)
    switch (scenario) {
      case 'success': return { ok: true, body: echo(request.candidate) }
      case 'success-normalized': return { ok: true, body: echo(request.candidate, { visibility: { ...request.candidate.body.visibility, contas: !request.candidate.body.visibility.contas } }) }
      case 'success-malformed': return { ok: true, body: { ok: true } }
      case '400': return { ok: false, error: new ApiError(400, { code: 'E_INVALID_MENU_VISIBILITY', message: 'Missing menu id in visibility map: ajuda' }) }
      case '401': return { ok: false, error: new ApiError(401, { code: 'UNAUTHORIZED' }) }
      case '403': return { ok: false, error: new ApiError(403, { code: 'FORBIDDEN' }) }
      case '409': return { ok: false, error: new ApiError(409, { code: 'HYPOTHETICAL_CONFLICT' }) }
      case 'timeout': return { ok: false, error: new ApiError(0, {}, { kind: 'timeout' }) }
      case 'network': return { ok: false, error: new ApiError(0, {}, { kind: 'network' }) }
      case '500-audit-failure': return { ok: false, error: new ApiError(500, { code: 'INTERNAL_ERROR', message: 'Internal server error' }) }
      case '503': return { ok: false, error: new ApiError(503, {}) }
      default: throw new Error(`unknown scenario ${scenario}`)
    }
  }
  return { send, sent }
}
// Test-only orchestration: one send per explicit operator action; an uncertain result leads to read-back, never to another send.
async function simulateSave(scenario, candidate, readback) {
  const transport = mockTransport(scenario)
  const outcome = update.interpretSaveOutcome(candidate, await transport.send({ candidate }))
  const reconciled = outcome.state === 'uncertain' && readback ? update.reconcileReadback(candidate, live.map, readback) : null
  return { outcome, reconciled, sends: transport.sent.length }
}
const toSave = update.buildUpdateCandidate(live.map, policy.setDraftPreference(live.map, 'contas', false), 'edit')
const asConfig = (map) => contract.parseMenuVisibilityResponse({ data: { scope: 'global', visibility: { ...map }, updatedAt: '2026-10-16T12:00:00.000Z', updatedBy: 'ckqaop00000000000000000001' } })
const expectations = [
  ['success', 'confirmed'], ['success-normalized', 'uncertain'], ['success-malformed', 'uncertain'],
  ['400', 'rejected', 'invalid'], ['401', 'rejected', 'session'], ['403', 'rejected', 'forbidden'], ['409', 'rejected', 'conflict'],
  ['timeout', 'uncertain'], ['network', 'uncertain'], ['500-audit-failure', 'uncertain'], ['503', 'uncertain'],
]
for (const [scenario, state, reason] of expectations) {
  const { outcome, sends } = await simulateSave(scenario, toSave)
  check(outcome.state === state && (reason === undefined || outcome.reason === reason), `Mocked PUT ${scenario} → ${state}${reason ? ` (${reason})` : ''}`)
  check(sends === 1, `Mocked PUT ${scenario}: exactly one send, no automatic retry`)
  if (state === 'uncertain') check(outcome.next === 'authoritative-readback' && /pode ou não ter sido aplicada/.test(outcome.view.description), `Mocked PUT ${scenario}: uncertain → read-back, never presented as failure-for-sure`)
  if (state === 'confirmed') check(outcome.config.saved && outcome.config.map.contas === false, 'Confirmed only with a valid echo of the candidate')
}
check((await simulateSave('500-audit-failure', toSave, asConfig(toSave.body.visibility))).reconciled === 'applied', 'Audit failure after save: read-back shows the change was applied')
check((await simulateSave('timeout', toSave, asConfig(live.map))).reconciled === 'not-applied', 'Timeout: read-back shows the change was not applied')
check((await simulateSave('503', toSave, asConfig({ ...live.map, financeiro: false }))).reconciled === 'diverged', 'Read-back with a third state (concurrent save; no version / ETag) → diverged, review again')
check(!/retry|setTimeout|setInterval/i.test(codeOnly(await readFile(resolve(featureDir, 'menuVisibilityUpdate.ts'), 'utf8'), 'update.ts')), 'Update design has no retry or timer logic')
check(!featureFiles.some((name) => /mock|transport/i.test(name)), 'No mock transport ships in the feature source')

// Test-only FUTURE action orchestration, not an implementation shipped in src.
// A single-send assertion alone does not prove duplicate prevention. Hold the
// injected transport, activate twice, and verify ambiguous results stay locked
// until readback. There is deliberately no automatic retry or real request.
function mockSaveAction(candidate, transport) {
  let phase = 'ready'
  return {
    async submit() {
      if (!candidate.valid) return { blocked: 'invalid-candidate' }
      if (phase !== 'ready') return { blocked: phase }
      phase = 'in-flight'
      const outcome = update.interpretSaveOutcome(candidate, await transport.send({ candidate }))
      phase = outcome.state === 'uncertain' ? 'readback-required' : outcome.state === 'confirmed' ? 'confirmed' : 'rejected'
      return outcome
    },
    readback(config) {
      assert.equal(phase, 'readback-required')
      const result = update.reconcileReadback(candidate, live.map, config)
      phase = result === 'not-applied' ? 'ready' : result === 'applied' ? 'confirmed' : 'review-required'
      return result
    },
  }
}
let releaseMock, heldSends = 0
const heldAction = mockSaveAction(toSave, { send: () => { heldSends += 1; return new Promise((resolve) => { releaseMock = resolve }) } })
const firstSubmit = heldAction.submit()
check((await heldAction.submit()).blocked === 'in-flight' && heldSends === 1, 'Duplicate activation during pending mock action sends only once')
releaseMock({ ok: true, body: echo(toSave) })
check((await firstSubmit).state === 'confirmed' && (await heldAction.submit()).blocked === 'confirmed' && heldSends === 1, 'Confirmed mock action cannot be replayed')
for (const scenario of ['timeout', 'network', '500-audit-failure', '503']) {
  const transport = mockTransport(scenario)
  const action = mockSaveAction(toSave, transport)
  check((await action.submit()).state === 'uncertain', `Mock ${scenario}: outcome stays uncertain`)
  check((await action.submit()).blocked === 'readback-required' && transport.sent.length === 1, `Mock ${scenario}: no duplicate before readback`)
  check(action.readback(asConfig(toSave.body.visibility)) === 'applied', `Mock ${scenario}: authoritative readback can confirm application`)
  check((await action.submit()).blocked === 'confirmed' && transport.sent.length === 1, `Mock ${scenario}: applied readback prevents duplicate save`)
}
const notAppliedAction = mockSaveAction(toSave, mockTransport('network'))
await notAppliedAction.submit()
check(notAppliedAction.readback(asConfig(live.map)) === 'not-applied', 'Mock readback proves not-applied before a later deliberate action')
const divergedAction = mockSaveAction(toSave, mockTransport('503'))
await divergedAction.submit()
check(divergedAction.readback(asConfig({ ...live.map, financeiro: false })) === 'diverged' && (await divergedAction.submit()).blocked === 'review-required', 'Diverged readback requires review rather than retry')
const refusedTransport = mockTransport('success')
check((await mockSaveAction(invalidCand, refusedTransport).submit()).blocked === 'invalid-candidate' && refusedTransport.sent.length === 0, 'Invalid candidate causes zero simulated sends')

/* ---------- rendered Stage B controls ---------- */
const lockedHtml = render(h(VisibilityControls, { base: live.map, draft: live.map, onChange() {} }))
for (const id of ['dashboard', 'configuracoes']) {
  const tag = switchTag(lockedHtml, id)
  check(tag.includes('aria-disabled="true"') && tag.includes('data-locked=""') && tag.includes('(bloqueado)') && !/\sdisabled=""/.test(tag), `${id}: locked switch stays focusable, aria-disabled and named as locked`)
  check(lockedHtml.includes(`data-menu-id="${id}"`) && lockedHtml.includes(policy.PROTECTED_EXPLANATION[id]), `${id}: protected explanation rendered`)
}
check((lockedHtml.match(/data-locked=""/g) ?? []).length === 2 && (lockedHtml.match(/role="switch"/g) ?? []).length === 23, 'Exactly two locked switches among 23')
check(!switchTag(lockedHtml, 'sistema').includes('aria-disabled') && !switchTag(lockedHtml, 'ajuda').includes('aria-disabled'), 'Sistema and Ajuda stay editable')
let lockedCalls = 0, changeCalls = 0
const lockedEl = h(VisibilityControls, { base: live.map, draft: live.map, onChange() { changeCalls += 1 }, onLockedAttempt() { lockedCalls += 1 } })
check(render(lockedEl).includes('data-independence-note'), 'Utility independence note rendered')
const violatingControls = render(h(VisibilityControls, { base: violating.map, draft: violating.map, onChange() {} }))
check(switchTag(violatingControls, 'dashboard').includes('aria-checked="false"') && violatingControls.includes('data-violation-note') && violatingControls.includes('correção no servidor'), 'Server violation: locked switch shows the real false + conflict note')
const readOnlyControls = render(h(VisibilityControls, { base: saved.map, draft: saved.map, onChange() {}, readOnly: true }))
check(!readOnlyControls.includes('role="switch"') && (readOnlyControls.match(/data-read-only-state=/g) ?? []).length === 23 && readOnlyControls.includes('data-read-only="true"'), 'Read-only: no switches, 23 described states')
check(lockedCalls === 0 && changeCalls === 0, 'Rendering never invokes change handlers')

/* ---------- rendered page per role ---------- */
const editHtml = renderPage({ status: 'success', data: { ...live, readAt: '2026-10-16T10:00:00.000Z' } })
check(editHtml.includes('data-expected-access="edit"'), 'SUPER_ADMIN notice: edit')
check(editHtml.includes('data-access-mode="edit"') && editHtml.includes('data-visibility-draft') && (editHtml.match(/role="switch"/g) ?? []).length === 23, 'SUPER_ADMIN: editable draft with 23 switches (2 locked)')
for (const role of ['SUPPORT_ADMIN', 'READ_ONLY']) {
  const html = renderPage({ status: 'success', data: { ...saved, readAt: '2026-10-16T10:00:00.000Z' } }, undefined, operatorWith(role))
  check(html.includes('data-access-mode="read"') && html.includes('data-visibility-read-only') && !html.includes('data-visibility-draft'), `${role}: read-only presentation`)
  check(!html.includes('role="switch"') && !html.includes('data-draft-bar') && !html.includes('data-review') && !html.includes('data-discard') && !html.includes('data-restore-protected'), `${role}: no editing controls, no review, no Save path`)
  check(html.includes('data-preview-subject="configuração persistida"') && html.includes('data-persisted-hidden="8"'), `${role}: preview of the persisted configuration (protected Dashboard never counted as hidden)`)
}
for (const role of ['FINANCIAL_ADMIN', 'COMPLIANCE_ADMIN']) {
  const forbiddenHtml = renderPage({ status: 'error', error: new ApiError(403, { code: 'FORBIDDEN' }) }, undefined, operatorWith(role))
  check(forbiddenHtml.includes('data-error-kind="forbidden"') && !forbiddenHtml.includes('data-retry') && !forbiddenHtml.includes('role="switch"'), `${role}: canonical Backend 403 → no access, no retry`)
  check(forbiddenHtml.includes('data-expected-access="none"') && forbiddenHtml.includes('Sem acesso previsto para o seu perfil') && !forbiddenHtml.includes('Seu perfil pode consultar'), `${role}: notice never claims read access`)
  const driftHtml2 = renderPage({ status: 'success', data: { ...live, readAt: '2026-10-16T10:00:00.000Z' } }, undefined, operatorWith(role))
  check(driftHtml2.includes('data-access-mode="read"') && !driftHtml2.includes('role="switch"'), `${role}: if the Backend ever answered, still never editable`)
}
check(renderPage({ status: 'success', data: { ...live, readAt: '2026-10-16T10:00:00.000Z' } }, undefined, null).includes('data-access-mode="read"'), 'No operator in session: read-only, never editable')
const violationEdit = renderPage({ status: 'success', data: { ...violating, readAt: '2026-10-16T10:00:00.000Z' } })
check(violationEdit.includes('data-policy-violation="dashboard configuracoes"') && violationEdit.includes('Inconsistência na configuração persistida') && violationEdit.includes('data-restore-protected'), 'SUPER_ADMIN: server violation surfaced with explicit draft correction')
check(switchTag(violationEdit, 'dashboard').includes('aria-checked="false"') && !violationEdit.includes('data-draft-bar'), 'Server violation is shown as stored; nothing auto-corrected (no draft change)')
const violationRead = renderPage({ status: 'success', data: { ...violating, readAt: '2026-10-16T10:00:00.000Z' } }, undefined, operatorWith('READ_ONLY'))
check(violationRead.includes('data-policy-violation') && !violationRead.includes('data-restore-protected'), 'Read-only: violation surfaced without any correction control')
check(editHtml.includes('rotas diretas') || editHtml.includes('URL direta'), 'Page states the sidebar-only scope')

/* ---------- review with protected modules ---------- */
const reviewInvalid = render(h(VisibilityReviewDialog, { base: violating.map, draft: violating.map, onClose() {} }))
check(reviewInvalid.includes('data-review-invalid') && !reviewInvalid.includes('data-candidate-valid'), 'Review flags an invalid candidate inherited from the server')
const reviewFixed = render(h(VisibilityReviewDialog, { base: violating.map, draft: restoredDraft, onClose() {} }))
check(!reviewFixed.includes('data-review-invalid') && reviewFixed.includes('data-candidate-valid="true"') && (reviewFixed.match(/data-review-change=/g) ?? []).length === 2, 'Review after explicit correction: valid, two protected changes listed')
const reviewNormal = render(h(VisibilityReviewDialog, { base: live.map, draft: policy.setDraftPreference(live.map, 'financeiro', false), onClose() {} }))
check(reviewNormal.includes('data-review-protected-id="dashboard"') && reviewNormal.includes('data-review-protected-id="configuracoes"') && reviewNormal.includes('data-review-sidebar-count="16"'), 'Review lists protected modules and the resulting sidebar (16 of 23)')
check(reviewNormal.includes('aria-disabled="true"') && reviewNormal.includes('não enviado') && reviewNormal.includes('Aplicação e persistência aguardam validação das regras e autorização.'), 'Save stays disabled with the approved explanation')
check(reviewNormal.includes('rotas diretas'), 'Review states sidebar-only effect')
check(render(h(Sidebar, sidebarProps)) === sidebarBefore, 'After every Stage B render, the real Sidebar is identical')

/* ---------- mutation controls: reproduce the eight reported fault classes ---------- */
// Mutants exist only in data: module URLs. Nothing is patched on disk and no
// request is made. The source replacements introduce faults; assertions inspect
// actual model/render behavior, not the replacement text.
async function mutant(name, before, after) {
  const path = `src/features/menu-visibility/${name}`
  const source = await readFile(resolve(root, path), 'utf8')
  assert.ok(source.includes(before), `Mutation control still targets ${name}`)
  return load(path, source.replace(before, after))
}
const hideableProtected = await mutant('visibilityPolicy.ts', 'if (!visible && isProtectedMenuId(id)) return map', 'if (false) return map')
check(hideableProtected.setDraftPreference(live.map, 'dashboard', false).dashboard !== true, 'Mutation detected: protected module made hideable')
const hiddenProtected = await mutant('visibilityResolver.ts', 'sidebarVisible: true, reason: preference', 'sidebarVisible: false, reason: preference')
check(!hiddenProtected.resolveVisibility(violating.map).byId.dashboard.sidebarVisible, 'Mutation detected: protected item omitted from preview')
const editableSupport = await mutant('visibilityPolicy.ts', "SUPPORT_ADMIN: 'read'", "SUPPORT_ADMIN: 'edit'")
check(editableSupport.presentationMode(['SUPPORT_ADMIN']) !== 'read', 'Mutation detected: Support granted edit presentation')
const rejectedUncertain = await mutant('menuVisibilityUpdate.ts', 'result.error.status < 500', 'result.error.status >= 500')
check(rejectedUncertain.interpretSaveOutcome(toSave, { ok: false, error: new ApiError(500, {}) }).state !== 'uncertain', 'Mutation detected: Audit-style 5xx incorrectly treated as certain rejection')
const editableReadOnly = await mutant('VisibilityControls.tsx', '{readOnly ? (', '{false ? (')
check(render(h(editableReadOnly.VisibilityControls, { base: live.map, draft: live.map, readOnly: true, onChange() {} })).includes('role="switch"'), 'Mutation detected: read-only controls made editable')
const sendableCandidate = await mutant('menuVisibilityUpdate.ts', 'sendable: false,', 'sendable: true,')
check(sendableCandidate.buildUpdateCandidate(live.map, candidateDraft, 'edit').sendable !== false, 'Mutation detected: preparation candidate made sendable')
const plantedSidebarImport = `import {resolveVisibility as resolveMenu} from '../../features/menu-visibility/visibilityResolver';\n${sidebarSource}\nexport const plantedResolver = resolveMenu;`
check(/from\s+['"][^'"]*menu-visibility\//.test(codeOnly(plantedSidebarImport, 'Sidebar.tsx')), 'Mutation detected: resolver imported outside its isolated feature')
const unfocusableLocked = await mutant('VisibilityControls.tsx', 'aria-disabled="true"', 'disabled')
const unfocusableHtml = render(h(unfocusableLocked.VisibilityControls, { base: live.map, draft: live.map, onChange() {} }))
check(/\sdisabled=""/.test(switchTag(unfocusableHtml, 'dashboard')), 'Mutation detected: locked explanation removed from keyboard focus order')

delete globalThis.__menuPageState

/* ---------- actual shared read hook: deterministic overlapping/abandoned requests ---------- */
// Exercise the real hook, not a reimplementation of its cancellation policy.
// Minimal hook primitives model committed effects; real React/browser timing is
// checked separately with the local fixture server.
const remoteSource = ts.transpileModule(await readFile(resolve(root, 'src/lib/useRemoteResource.ts'), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText
function remoteHarness() {
  let cursor = 0, dirty = true, mounted = true, output, writesAfterUnmount = 0
  const slots = [], layout = [], effects = [], pending = []
  const changed = (a, b) => !a || !b || a.length !== b.length || a.some((v, i) => !Object.is(v, b[i]))
  function effect(queue, fn, deps) {
    const i = cursor++, old = slots[i]
    if (changed(old?.deps, deps)) {
      slots[i] = { deps, cleanup: old?.cleanup }
      queue.push(() => { slots[i].cleanup?.(); slots[i].cleanup = fn() })
    }
  }
  const react = {
    useState(initial) {
      const i = cursor++
      if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial
      return [slots[i], (next) => {
        if (!mounted) { writesAfterUnmount += 1; return }
        const value = typeof next === 'function' ? next(slots[i]) : next
        if (!Object.is(value, slots[i])) { slots[i] = value; dirty = true }
      }]
    },
    useRef(initial) { return slots[cursor++] ??= { current: initial } },
    useCallback(fn) { cursor += 1; return fn },
    useEffect(fn, deps) { effect(effects, fn, deps) },
    useLayoutEffect(fn, deps) { effect(layout, fn, deps) },
  }
  const exports = {}
  new Function('require', 'exports', remoteSource)((name) => {
    if (name === 'react') return react
    assert.equal(name, './api')
    return { isAbortError }
  }, exports)
  const load = (signal) => new Promise((resolve, reject) => pending.push({ signal, resolve, reject }))
  function flush() {
    let turns = 0
    while (dirty) {
      assert.ok(++turns < 20, 'No read/render loop')
      dirty = false; cursor = 0
      output = exports.useRemote('menu-visibility', load)
      while (layout.length) layout.shift()()
      while (effects.length) effects.shift()()
    }
    return output
  }
  flush()
  return {
    pending, state: () => flush().state,
    retry() { output.reload(); flush() },
    async settle(index, value, reject = false) {
      pending[index][reject ? 'reject' : 'resolve'](value)
      await Promise.resolve(); await Promise.resolve()
      return flush().state
    },
    unmount() { mounted = false; for (const slot of slots) slot?.cleanup?.() },
    writesAfterUnmount: () => writesAfterUnmount,
  }
}
const overlap = remoteHarness()
check(overlap.state().status === 'loading' && overlap.pending.length === 1, 'Actual read hook starts exactly one GET, no defaults')
overlap.retry()
check(overlap.pending[0].signal.aborted && overlap.pending.length === 2, 'Retry aborts the old read and starts exactly one new read')
await overlap.settle(1, saved)
check(overlap.state().status === 'success' && overlap.state().data === saved, 'New response becomes the authoritative reference')
await overlap.settle(0, live)
check(overlap.state().data === saved, 'Old response cannot overwrite the newer reference')
overlap.unmount()
const abandoned = remoteHarness()
abandoned.unmount()
check(abandoned.pending[0].signal.aborted, 'Unmount cancels the pending read')
await abandoned.settle(0, live)
check(abandoned.writesAfterUnmount() === 0, 'Abandoned late response performs no state update')
const retryRead = remoteHarness()
await retryRead.settle(0, new ApiError(503, {}), true)
check(retryRead.state().status === 'error' && retryRead.pending.length === 1, 'Read error has no fallback and no automatic retry')
retryRead.retry()
check(retryRead.state().status === 'loading' && retryRead.pending.length === 2, 'Explicit retry clears the error to loading')
await retryRead.settle(1, live)
check(retryRead.state().status === 'success' && retryRead.state().data === live, 'Explicit retry succeeds coherently')
retryRead.unmount()
const cancelledRead = remoteHarness()
await cancelledRead.settle(0, new DOMException('cancelled', 'AbortError'), true)
check(cancelledRead.state().status === 'loading' && cancelledRead.pending.length === 1, 'Cancellation does not surface a misleading error or retry')
cancelledRead.unmount()

/* ---------- unsaved-changes guard lifecycle (shared hook, deterministic doubles) ---------- */
const runtime = { slots: [], cursor: 0, effects: [], documentListeners: new Map(), windowListeners: new Map(), guard: null }
globalThis.__menuGuardTest = runtime
const guardReact = dataModule(`
const r=globalThis.__menuGuardTest;
export const useRef=v=>{const i=r.cursor++;return r.slots[i]??(r.slots[i]={current:v})};
export const useState=v=>{const i=r.cursor++;if(!(i in r.slots))r.slots[i]=v;return[r.slots[i],x=>{r.slots[i]=typeof x==='function'?x(r.slots[i]):x}]};
export const useCallback=f=>{r.cursor++;return f};
export const useEffect=(f,deps)=>{const i=r.cursor++;const old=r.slots[i];if(!old||!deps||deps.some((x,j)=>!Object.is(x,old.deps[j])))r.effects.push(()=>{old?.cleanup?.();r.slots[i]={deps,cleanup:f()}})};
`)
const guardNavigation = dataModule('const r=globalThis.__menuGuardTest;export const registerPrototypeNavigationGuard=fn=>{r.guard=fn;return()=>{r.guard=null}}')
const guardPath = 'src/app/useUnsavedChangesGuard.ts'
const guardCode = (await readFile(resolve(root, guardPath), 'utf8')).replace("from 'react'", `from '${guardReact}'`).replace("from './prototypeNavigation'", `from '${guardNavigation}'`)
globalThis.document = { addEventListener: (k, v) => runtime.documentListeners.set(k, v), removeEventListener: (k, v) => { if (runtime.documentListeners.get(k) === v) runtime.documentListeners.delete(k) } }
globalThis.window = { location: { hash: '#/settings/menu-visibility' }, addEventListener: (k, v) => runtime.windowListeners.set(k, v), removeEventListener: (k, v) => { if (runtime.windowListeners.get(k) === v) runtime.windowListeners.delete(k) } }
const guardModule = await load(guardPath, guardCode)
let discardedCount = 0
function renderGuard(dirty) {
  runtime.cursor = 0
  const hookResult = guardModule.useUnsavedChangesGuard(dirty, () => { discardedCount += 1 })
  for (const effect of runtime.effects.splice(0)) effect()
  return hookResult
}
renderGuard(false)
check(runtime.windowListeners.size === 0 && runtime.documentListeners.size === 0 && runtime.guard === null, 'Clean guard installs no navigation/click/beforeunload listeners')
renderGuard(true)
check(runtime.windowListeners.has('beforeunload') && runtime.documentListeners.has('click') && typeof runtime.guard === 'function', 'Dirty guard installs protection')
let prevented = false
runtime.windowListeners.get('beforeunload')({ preventDefault() { prevented = true }, returnValue: null })
check(prevented, 'Dirty unload (reload) requests the native warning')
runtime.documentListeners.get('click')({ defaultPrevented: false, button: 0, target: { closest: () => ({ getAttribute: () => '#/dashboard' }) }, preventDefault() {}, stopPropagation() {} })
let guardState = renderGuard(true)
check(guardState.pending?.hash === '#/dashboard', 'Dirty link queues navigation without leaving')
guardState.stay()
guardState = renderGuard(true)
check(guardState.pending === null && window.location.hash === '#/settings/menu-visibility', 'Stay preserves the draft route')
let resumed = false
check(runtime.guard({ hash: '#/audit', resume() { resumed = true } }) === false, 'Dirty history navigation is deferred')
guardState = renderGuard(true)
guardState.discardAndContinue()
renderGuard(false)
check(resumed && discardedCount === 1, 'Discard resumes exactly the queued navigation')
check(runtime.windowListeners.size === 0 && runtime.documentListeners.size === 0 && runtime.guard === null, 'Discard/clean removes all protection listeners')
renderGuard(true)
for (const slot of runtime.slots) slot?.cleanup?.()
check(runtime.windowListeners.size === 0 && runtime.documentListeners.size === 0 && runtime.guard === null, 'Unmount removes all protection listeners')
delete globalThis.__menuGuardTest

/* ---------- whole run: GET only ---------- */
check(allRequests.length > 0 && allRequests.every((request) => request.method === 'GET'), 'Every request made during the checks was a GET (zero PUT / PATCH / POST / DELETE)')
check(allRequests.every((request) => request.url.endsWith('/homolog/menu-visibility')), 'Only the menu-visibility read was requested')

console.log(`Menu Visibility — Stage A + Stage B preparation: ${checks} passed (synthetic fixtures; GET only; mocked PUT outcomes; no storage; save and enforcement not enabled)`)
