import assert from 'node:assert/strict'
import { readdir } from 'node:fs/promises'
import { readFile } from './reviewed-consolidation-boundary.mjs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

// In-memory unit contracts only. No browser bypass, real token or network call.
// Same dependency-free TypeScript-loader convention as check-audit-read.
// Fixtures mirror the Accounts row structures observed on homolog (synthetic values only).
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
const api = await load('src/features/whitelabel-accounts/accountsApi.ts')
const route = await load('src/features/whitelabel-accounts/accountsRoute.ts')
const present = await load('src/features/whitelabel-accounts/accountsPresent.ts')
const operator = { id: 'synthetic-operator', name: 'Unit QA', email: 'qa@example.invalid', roles: ['SUPER_ADMIN'] }
const session = () => ({ accessToken: 'synthetic-unit-token-accounts', tokenType: 'Bearer', operator })
// Observed structures (homolog, 2026-10-15): field names / types / tokens only; synthetic values.
const investor = { id: 3, type: 'investor', fullName: 'Synthetic Investor', email: 'investor@example.invalid', phone: '11900000003',
  whitelabelId: 4, accessState: 'active', businessState: 'approved', emailVerifiedAt: '2026-09-01T12:00:00.000Z',
  termsAcceptedAt: '2026-09-01T12:00:00.000Z', termsRevisionId: 2, createdAt: '2026-09-01T12:00:00.000Z', updatedAt: '2026-10-01T12:00:00.000Z' }
const investorDetail = { ...investor, investorType: 'pessoa_fisica', personalInformationFilled: 1, reasonForDeny: null }
const entrepreneur = { id: 3, type: 'entrepreneur', whitelabelId: 4, email: 'entrepreneur@example.invalid', fullName: 'Synthetic Entrepreneur',
  phone: '11900000017', accessState: 'active', businessState: 'incomplete', emailVerifiedAt: null,
  createdAt: '2026-09-01T12:00:00.000Z', updatedAt: '2026-10-01T12:00:00.000Z' }
const admin = { id: 3, type: 'admin', whitelabelId: 4, email: 'admin@example.invalid', fullName: null, accessState: 'active',
  businessState: 'active', invitation: 'accepted', isSuperAdmin: false, createdAt: '2026-09-01T12:00:00.000Z', updatedAt: '2026-10-01T12:00:00.000Z' }
const meta = (overrides = {}) => ({ page: 1, perPage: 8, total: 1, lastPage: 1, ...overrides })
const json = (value, status = 200) => new Response(JSON.stringify(value), { status })
const reset = () => { auth.clearSession(); auth.clearAuthNotice(); window.location.hash = '' }
let checks = 0
async function check(name, action) {
  try { await action(); checks += 1 } catch (cause) { throw new Error(`Failed: ${name}`, { cause }) }
}
const malformed = (code) => (error) => error.kind === 'malformed' && (code === undefined || error.code === code)

/* ---------- type vocabulary and identity ---------- */
await check('tipo is the only type vocabulary; kinds map 1:1', async () => {
  assert.deepEqual(api.ACCOUNT_KINDS.map((item) => [item.kind, item.tipo]), [['investor', 'investidores'], ['entrepreneur', 'empreendedores'], ['admin', 'administradores']])
  assert.equal(api.kindFromTipo('administradores'), 'admin'); assert.equal(api.kindFromTipo('admins'), undefined); assert.equal(api.kindFromTipo('admin'), undefined)
})
await check('investor / entrepreneur rows reuse the Operation projections (same Core id)', async () => {
  const inv = api.parseAccountList({ data: [investor], meta: meta() }, 'investor', '4').rows[0]
  assert.equal(inv.kind, 'investor'); assert.equal(inv.record.id, '3'); assert.equal(inv.record.whitelabelId, '4'); assert.equal(inv.record.businessState, 'approved')
  const ent = api.parseAccountList({ data: [entrepreneur], meta: meta() }, 'entrepreneur', '4').rows[0]
  assert.equal(ent.kind, 'entrepreneur'); assert.equal(ent.record.id, '3'); assert.equal(ent.record.businessState, 'incomplete')
})
await check('admin rows: strict identity, display fields as sent (no name, raw tokens, raw flag)', async () => {
  const row = api.parseAdmin(admin)
  assert.deepEqual(row, { id: '3', whitelabelId: '4', email: 'admin@example.invalid', name:null, nameReadbackAvailable:false, fullName: null, accessState: 'active', businessState: 'active',
    invitation: 'accepted', isSuperAdmin: false, createdAt: admin.createdAt, updatedAt: admin.updatedAt })
  assert.equal(api.parseAdmin({ ...admin, isSuperAdmin: 'false', invitation: '<b>' }).isSuperAdmin, null)
  assert.equal(api.parseAdmin({ ...admin, invitation: '<b>' }).invitation, null)
})
await check('same number in three domains = three distinct accounts (kind-qualified identity)', async () => {
  const rows = ['investor', 'entrepreneur', 'admin'].map((kind, index) => api.parseAccountList({ data: [[investor, entrepreneur, admin][index]], meta: meta() }, kind, '4').rows[0])
  assert.deepEqual(rows.map((row) => `${row.kind}:${row.record.id}`), ['investor:3', 'entrepreneur:3', 'admin:3'])
})
for (const [kind, bad, label] of [
  ['investor', { ...investor, type: 'entrepreneur' }, 'entrepreneur row under investidores'],
  ['investor', { ...admin }, 'admin row under investidores'],
  ['investor', { ...investor, type: undefined }, 'investor row without type'],
  ['entrepreneur', { ...investor }, 'investor row under empreendedores'],
  ['admin', { ...investor }, 'investor row under administradores'],
  ['admin', { ...admin, type: undefined }, 'admin row without type'],
  ['admin', { ...admin, id: '3' }, 'string admin id'],
  ['admin', { ...admin, id: 0 }, 'zero admin id'],
  ['admin', { ...admin, whitelabelId: 'wl_proto_01' }, 'prototype tenant id'],
  ['admin', null, 'null row'],
]) {
  await check(`rejects ${label}`, async () => assert.throws(() => api.parseAccountList({ data: [bad], meta: meta() }, kind, '4'), malformed()))
}
await check('list meta must be consistent (no client-side repair)', async () => {
  for (const [body, label] of [
    [{ data: [admin, { ...admin, id: 4 }], meta: meta({ perPage: 1, total: 2, lastPage: 2 }) }, 'rows > perPage'],
    [{ data: [admin], meta: meta({ total: 9, lastPage: 1 }) }, 'lastPage inconsistent'],
    [{ data: [admin, admin], meta: meta({ total: 2 }) }, 'duplicate ids'],
    [{ data: [admin], meta: meta({ total: 0, lastPage: 1 }) }, 'rows with total 0'],
    [{ data: [], meta: meta({ total: 3, lastPage: 1 }) }, 'empty in-range page'],
    [{ data: {}, meta: meta() }, 'data not an array'],
    [{ data: [admin] }, 'missing meta'],
  ]) assert.throws(() => api.parseAccountList(body, 'admin', '4'), malformed(), label)
  assert.equal(api.parseAccountList({ data: [], meta: meta({ total: 0, lastPage: 0 }) }, 'admin', '4').lastPage, 1)
})
await check('a row of another Whitelabel invalidates the whole page (SCOPE_MISMATCH)', async () => {
  assert.throws(() => api.parseAccountList({ data: [{ ...admin, whitelabelId: 6 }], meta: meta() }, 'admin', '4'), malformed('SCOPE_MISMATCH'))
  assert.throws(() => api.parseAccountList({ data: [{ ...investor, whitelabelId: 7 }], meta: meta() }, 'investor', '4'), malformed('SCOPE_MISMATCH'))
})
await check('detail: wrapped body, kind checked, investor extras kept', async () => {
  const inv = api.parseAccountDetail({ data: investorDetail }, 'investor')
  assert.equal(inv.record.investorType, 'pessoa_fisica'); assert.equal(inv.record.personalInformationFilled, true)
  assert.equal(api.parseAccountDetail({ data: admin }, 'admin').record.invitation, 'accepted')
  assert.equal(api.parseAccountDetail(admin, 'admin').record.id, '3')
  assert.throws(() => api.parseAccountDetail({ data: admin }, 'investor'), malformed())
  assert.throws(() => api.parseAccountDetail({ data: investorDetail }, 'admin'), malformed())
  assert.throws(() => api.parseAccountDetail({ data: entrepreneur }, 'investor'), malformed())
})

/* ---------- requests ---------- */
await check('list sends only tipo / page / perPage / search (never access, sort, order, type)', async () => {
  reset(); auth.persistSession(session())
  const seen = []
  fetchImpl = async (url, options) => {
    const parsed = new URL(url)
    assert.equal(parsed.pathname, '/api/whitelabels/4/accounts'); assert.equal(options.method, 'GET'); assert.equal(options.body, undefined)
    assert.equal(options.headers.Authorization, 'Bearer synthetic-unit-token-accounts')
    seen.push(Object.fromEntries(parsed.searchParams))
    const tipo = parsed.searchParams.get('tipo')
    const page = Number(parsed.searchParams.get('page'))
    return json({ data: [tipo === 'investidores' ? investor : tipo === 'empreendedores' ? entrepreneur : admin], meta: meta({ page, total: page > 1 ? 9 : 1, lastPage: page > 1 ? 2 : 1 }) })
  }
  await api.listAccounts({ whitelabelId: '4', kind: 'investor', page: 1, search: '' })
  await api.listAccounts({ whitelabelId: '4', kind: 'entrepreneur', page: 2, search: 'maria' })
  await api.listAccounts({ whitelabelId: '4', kind: 'admin', page: 1, search: '' })
  assert.deepEqual(seen, [
    { tipo: 'investidores', page: '1', perPage: '8' },
    { tipo: 'empreendedores', page: '2', perPage: '8', search: 'maria' },
    { tipo: 'administradores', page: '1', perPage: '8' },
  ])
})
await check('non-Core Whitelabel / account ids never reach the API', async () => {
  reset(); auth.persistSession(session())
  fetchImpl = async () => { throw new Error('Unexpected request') }
  await assert.rejects(api.listAccounts({ whitelabelId: 'wl_proto_01', kind: 'admin', page: 1, search: '' }), (error) => error.status === 404 && error.code === 'INVALID_WHITELABEL_ID')
  for (const id of ['inv_proto_0001', '01', '0', '1e3', '-1', '', '3 ', '9007199254740992', '9'.repeat(19)]) {
    await assert.rejects(api.getAccount({ whitelabelId: '4', kind: 'investor', accountId: id }), (error) => error.status === 404 && error.code === 'INVALID_ACCOUNT_ID', id)
  }
  await assert.rejects(api.getAccount({ whitelabelId: 'abc', kind: 'admin', accountId: '3' }), (error) => error.code === 'INVALID_WHITELABEL_ID')
  for (const id of ['0', '04', '4e0', '4 ', '9007199254740992']) {
    await assert.rejects(api.listAccounts({ whitelabelId: id, kind: 'admin', page: 1, search: '' }), (error) => error.code === 'INVALID_WHITELABEL_ID')
    await assert.rejects(api.getAccount({ whitelabelId: id, kind: 'admin', accountId: '3' }), (error) => error.code === 'INVALID_WHITELABEL_ID')
  }
  assert.equal(errors.describeApiError(new (await load('src/lib/api.ts')).ApiError(404, { code: 'INVALID_ACCOUNT_ID' }), 'a conta').notFound, true)
})
await check('detail: tenant-scoped path, kind in tipo; identity and tenant must match the request', async () => {
  reset(); auth.persistSession(session())
  const seen = []
  let body = { data: admin }
  fetchImpl = async (url, options) => {
    const parsed = new URL(url)
    assert.equal(options.method, 'GET'); assert.equal(options.body, undefined)
    seen.push(`${parsed.pathname}?${parsed.searchParams}`)
    return json(body)
  }
  assert.equal((await api.getAccount({ whitelabelId: '4', kind: 'admin', accountId: '3' })).kind, 'admin')
  body = { data: investorDetail }
  assert.equal((await api.getAccount({ whitelabelId: '4', kind: 'investor', accountId: '3' })).record.investorType, 'pessoa_fisica')
  assert.deepEqual(seen, ['/api/whitelabels/4/accounts/3?tipo=administradores', '/api/whitelabels/4/accounts/3?tipo=investidores'])
  body = { data: { ...investorDetail, id: 4 } }
  await assert.rejects(api.getAccount({ whitelabelId: '4', kind: 'investor', accountId: '3' }), malformed('SCOPE_MISMATCH'))
  body = { data: { ...admin, whitelabelId: 6 } }
  await assert.rejects(api.getAccount({ whitelabelId: '4', kind: 'admin', accountId: '3' }), malformed('SCOPE_MISMATCH'))
  body = { data: admin }
  await assert.rejects(api.getAccount({ whitelabelId: '4', kind: 'entrepreneur', accountId: '3' }), malformed())
})
await check('errors: 404 not found; 400 refused; 403 / 502 / network keep the session; 401 ends it; no raw text', async () => {
  reset(); auth.persistSession(session())
  const ref = { whitelabelId: '4', kind: 'admin', accountId: '99' }
  fetchImpl = async () => json({ code: 'CORE_HTTP_ERROR', message: 'Core said: not found' }, 404)
  let failure = await api.getAccount(ref).catch((cause) => cause)
  assert.equal(errors.describeApiError(failure, 'a conta').notFound, true)
  fetchImpl = async () => json({ code: 'HTTP_ERROR', message: ['property access should not exist'] }, 400)
  failure = await api.listAccounts({ whitelabelId: '4', kind: 'admin', page: 1, search: '' }).catch((cause) => cause)
  assert.equal(errors.describeApiError(failure, 'as contas').title, 'Consulta não aceita')
  fetchImpl = async () => json({ code: 'FORBIDDEN' }, 403)
  await assert.rejects(api.getAccount(ref), (error) => error.status === 403); assert.ok(auth.isAuthenticated())
  fetchImpl = async () => json({ code: 'CORE_HTTP_ERROR', message: 'Upstream raw detail: stack at Core' }, 502)
  failure = await api.listAccounts({ whitelabelId: '4', kind: 'investor', page: 1, search: '' }).catch((cause) => cause)
  const view = errors.describeApiError(failure, 'os investidores')
  assert.equal(view.title, 'Control Plane indisponível'); assert.equal(`${view.title} ${view.description}`.includes('raw'), false); assert.ok(auth.isAuthenticated())
  fetchImpl = async () => { throw new TypeError('Failed to fetch') }
  await assert.rejects(api.getAccount(ref), (error) => error.kind === 'network'); assert.ok(auth.isAuthenticated())
  fetchImpl = async () => new Response('<html>gateway</html>', { status: 200 })
  await assert.rejects(api.getAccount(ref), (error) => error.kind === 'malformed'); assert.ok(auth.isAuthenticated())
  fetchImpl = async () => json({}, 401)
  await assert.rejects(api.getAccount(ref), (error) => error.status === 401)
  assert.equal(auth.getAccessToken(), null); assert.equal(auth.peekAuthNotice(), 'session_expired')
})
await check('scope mismatch has its own wording; other errors keep the shared view', async () => {
  const { ApiError } = await load('src/lib/api.ts')
  const scope = new ApiError(200, { code: 'SCOPE_MISMATCH' }, { kind: 'malformed' })
  assert.equal(present.scopedErrorView(scope, errors.describeApiError(scope, 'x'), 'list', 'administradores').title, 'Escopo do Whitelabel não confirmado')
  assert.equal(present.scopedErrorView(scope, errors.describeApiError(scope, 'x'), 'detail').title, 'Conta não confirmada')
  const other = new ApiError(500, {})
  assert.equal(present.scopedErrorView(other, errors.describeApiError(other, 'x'), 'list').title, 'Control Plane indisponível')
})

/* ---------- URL state ---------- */
await check('URL: tipo / page / search / conta; invalid tipo or page reported and not applied', async () => {
  assert.deepEqual(route.parseAccountsRoute({}).state, { kind: 'investor', page: 1, search: '', accountId: undefined })
  assert.deepEqual(route.parseAccountsRoute({ tipo: 'administradores', page: '3', search: '  ana ', conta: ' 12 ' }).state,
    { kind: 'admin', page: 3, search: 'ana', accountId: '12' })
  const parsed = route.parseAccountsRoute({ tipo: 'admins', page: '0', search: ` ${'x'.repeat(200)} `, conta: 'inv_proto_0001' })
  assert.deepEqual(parsed.state, { kind: 'investor', page: 1, search: 'x'.repeat(120), accountId: 'inv_proto_0001' })
  assert.equal(parsed.ignored.length, 2)
  assert.equal(route.accountsPageHref('4'), '#/whitelabels/4/accounts?tipo=investidores')
  assert.equal(route.accountsPageHref('4', { kind: 'admin', page: 2, search: 'a & b', accountId: '3' }),
    '#/whitelabels/4/accounts?tipo=administradores&page=2&search=a+%26+b&conta=3')
  assert.equal(route.accountsPageHref('4', { kind: 'entrepreneur', page: 1 }), '#/whitelabels/4/accounts?tipo=empreendedores')
})

/* ---------- presentation ---------- */
await check('registration states keep their own vocabulary; never KYC, never Company', async () => {
  const row = (kind, record) => ({ kind, record })
  assert.deepEqual(present.businessView(row('investor', { businessState: 'approved' })), { label: 'Aprovada', tone: 'positive' })
  assert.deepEqual(present.businessView(row('investor', { businessState: 'waiting' })), { label: 'Aguardando', tone: 'pending' })
  assert.deepEqual(present.businessView(row('entrepreneur', { businessState: 'incomplete' })), { label: 'Cadastro incompleto', tone: 'pending' })
  assert.deepEqual(present.businessView(row('admin', { businessState: 'active', invitation: 'accepted' })), { label: 'active', tone: 'neutral' })
  assert.deepEqual(present.businessView(row('admin', { businessState: 'future', invitation: 'expired' })), { label: 'future', tone: 'neutral' })
  assert.deepEqual(present.businessView(row('investor', { businessState: 'constructor' })), { label: 'constructor', tone: 'neutral' })
  assert.equal(present.businessView(row('admin', { businessState: null, invitation: 'accepted' })), null)
  for (const heading of Object.values(present.BUSINESS_HEADING)) assert.equal(/kyc|empresa|company/i.test(heading), false, heading)
  assert.deepEqual(api.rawTokenMeta('active'), { label: 'active', tone: 'neutral' })
})
await check('display name / avatar: recorded name, else e-mail, else neutral fallback', async () => {
  assert.equal(api.accountDisplayName({ kind: 'admin', record: api.parseAdmin(admin) }), 'admin@example.invalid')
  assert.equal(api.accountDisplayName({ kind: 'admin', record: api.parseAdmin({ ...admin, email: null }) }), 'Nome não informado')
  assert.equal(present.accountInitials({ fullName: null, email: 'admin@example.invalid' }), 'A')
  assert.equal(present.accountInitials({ fullName: null, email: null }), '?')
  assert.equal(present.accountInitials({ fullName: 'Synthetic Investor', email: null }), 'SI')
})

/* ---------- source boundaries ---------- */
const accountsDir = resolve(root, 'src/features/whitelabel-accounts')
const screens = ['WhitelabelAccountsPage.tsx', 'AccountListPanel.tsx', 'AccountDetailPanel.tsx', 'AccountsWhitelabelSelector.tsx',
  'accountsApi.ts', 'accountsRoute.ts', 'accountsPresent.ts', 'useAccountsData.ts']
const sources = Object.fromEntries(await Promise.all(screens.map(async (name) => [name, await readFile(resolve(accountsDir, name), 'utf8')])))
await check('Accounts screens: no prototype data, no storage, no writes, no logging', async () => {
  for (const [name, source] of Object.entries(sources)) {
    assert.equal(/prototypeAccounts|prototypeWhitelabels|PROTOTYPE_|settingsStore|usePrototypeNotice|operationModel/.test(source), false, name)
    assert.equal(/sessionStorage|localStorage|indexedDB/.test(source), false, name)
    assert.equal(/method:\s*['"](POST|PUT|PATCH|DELETE)|fetch\(|apiRequest\(/.test(source), false, name)
    assert.equal(/console\.(log|info|debug|warn|error)/.test(source), false, name)
  }
})
await check('no Admin lifecycle or unrelated writes; access is a separately tested Investor/Entrepreneur boundary', async () => {
  for (const [name, source] of Object.entries(sources)) {
    assert.equal(/dialogs\/|PauseAccessDialog|ReactivateAccessDialog|ChangeWhitelabelDialog|NewAdminDialog|accountListConfig/.test(source), false, name)
    assert.equal(/\/pause|\/reactivate|onPause|onReactivate|onTransfer|Novo administrador|data-access-action/.test(source), false, name)
  }
  assert.match(sources['AccountDetailPanel.tsx'], /detail.kind === 'admin' && <AdminLifecycleActions/)
  assert.match(sources['AccountDetailPanel.tsx'], /data-write-actions="disabled"/)
  assert.match(sources['AccountDetailPanel.tsx'], /detail.kind !== 'admin' \? <AccountAccessActions/)
  assert.match(sources['AccountDetailPanel.tsx'], /current=\{actionsCurrent\}/)
})
await check('only accountsApi talks to the Control Plane, with GET reads and supported keys', async () => {
  for (const [name, source] of Object.entries(sources)) {
    if (name !== 'accountsApi.ts') assert.equal(/authenticatedGet/.test(source), false, name)
  }
  const query = sources['accountsApi.ts'].match(/query:\s*\{[^}]*\}/g)
  assert.deepEqual(query, [
    "query: { tipo: kindMeta(params.kind).tipo, page: params.page, perPage: ACCOUNT_PAGE_SIZE, search: params.search || undefined }",
    'query: { tipo: kindMeta(ref.kind).tipo }',
  ])
})
await check('KYC and Company are never mapped: pending notes only, proven cross-links only', async () => {
  for (const [name, source] of Object.entries(sources)) {
    assert.equal(/KYC_META|kycStatus|kycCase|compliance-kyc|\bcompany\.[a-z]|COMPANY_VALIDATION|[Rr]azão social|CNPJ:/.test(source), false, name)
  }
  const detail = sources['AccountDetailPanel.tsx']
  assert.match(detail, /Aguardando integração da empresa/)
  assert.match(detail, /Aguardando integração \(Compliance › KYC\)/)
  assert.match(detail, /investorHref\(record\.id\)/); assert.match(detail, /entrepreneurHref\(record\.id\)/)
  assert.equal(/accountsHref|#\/compliance|#\/finance/.test(detail), false)
})
await check('operational files retained; prototype fixtures isolated outside runtime', async () => {
  for (const name of ['accountListConfig.ts', 'dialogs/AccessDialogs.tsx', 'dialogs/ChangeWhitelabelDialog.tsx', 'dialogs/NewAdminDialog.tsx', 'dialogs/AccountDialogs.module.css']) {
    await assert.rejects(readFile(resolve(accountsDir, name), 'utf8'), { code: 'ENOENT' }, name)
  }
  const files = (await readdir(accountsDir)).filter((name) => /\.tsx?$/.test(name)).sort()
  assert.deepEqual(files, [...screens, 'AccountBadges.tsx', 'accountModel.ts'].sort())
})
await check('Dashboard stays independent of the Accounts screen', async () => {
  const dashboardDir = resolve(root, 'src/features/dashboard')
  for (const name of (await readdir(dashboardDir)).filter((file) => /\.tsx?$/.test(file))) {
    assert.equal(/whitelabel-accounts\/accounts|listAccounts|useAccountList/.test(await readFile(resolve(dashboardDir, name), 'utf8')), false, name)
  }
})
await check('pagination rejects oversized, impossible and wrong-request metadata', async () => {
  assert.throws(() => api.parseAccountList({ data: [admin], meta: meta({ perPage: 101 }) }, 'admin', '4'), malformed())
  assert.throws(() => api.parseAccountList({ data: [admin], meta: meta({ page: 2 }) }, 'admin', '4'), malformed())
  reset(); auth.persistSession(session())
  for (const responseMeta of [meta({ page: 2, total: 9, lastPage: 2 }), meta({ perPage: 7 })]) {
    fetchImpl = async () => json({ data: [admin], meta: responseMeta })
    await assert.rejects(api.listAccounts({ whitelabelId: '4', kind: 'admin', page: 1, search: '' }), malformed())
  }
})
await check('large middle-page pagination can wrap within narrow panels', async () => {
  const css = await readFile(resolve(accountsDir, 'AccountListPanel.module.css'), 'utf8')
  assert.match(css, /\.pagination\s*\{[^}]*flex-wrap:\s*wrap;[^}]*max-width:\s*100%/)
})
reset()
console.log(`Accounts read contracts: ${checks} passed (synthetic, no network)`)
