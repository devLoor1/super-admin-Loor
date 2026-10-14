import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

// In-memory unit contracts only. No browser bypass, real token or network call.
// Same dependency-free TypeScript-loader convention as check-whitelabel-read.
// Investor fixtures mirror the field names/types observed on homolog (no real values).
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

const auth = await load('src/lib/authSession.ts')
const errors = await load('src/lib/apiErrors.ts')
const inv = await load('src/features/operation/investors/investorApi.ts')
const route = await load('src/features/operation/investors/investorRoute.ts')
const operator = { id: 'synthetic-operator', name: 'Unit QA', email: 'qa@example.invalid', roles: ['SUPER_ADMIN'] }
const session = () => ({ accessToken: 'synthetic-unit-token-a', tokenType: 'Bearer', operator })
// Observed list projection (homolog, 2026-10-13): names and types only, synthetic values.
const row = { id: 41, type: 'investor', fullName: 'Synthetic Investor', email: 'investor@example.invalid', phone: '11900000041',
  whitelabelId: 4, accessState: 'active', businessState: 'waiting', emailVerifiedAt: '2026-05-02T10:00:00.000Z',
  termsAcceptedAt: null, termsRevisionId: null, createdAt: '2026-09-01T12:00:00.000Z', updatedAt: '2026-10-01T12:00:00.000Z' }
const detail = { ...row, investorType: 'pessoa_fisica', personalInformationFilled: 0, reasonForDeny: null }
const meta = (overrides = {}) => ({ page: 1, perPage: 8, total: 1, lastPage: 1, ...overrides })
const json = (value, status = 200) => new Response(JSON.stringify(value), { status })
const reset = () => { storageFailure = false; auth.clearSession(); auth.clearAuthNotice(); window.location.hash = '' }
let checks = 0
async function check(name, action) {
  try { await action(); checks += 1 } catch (cause) { throw new Error(`Failed: ${name}`, { cause }) }
}

await check('observed list projection maps to the Investor record (ids as strings, tokens kept)', async () => {
  const parsed = inv.parseInvestor(row)
  assert.equal(parsed.id, '41'); assert.equal(parsed.whitelabelId, '4')
  assert.equal(parsed.accessState, 'active'); assert.equal(parsed.businessState, 'waiting')
  assert.equal(parsed.termsAcceptedAt, null); assert.equal(parsed.termsRevisionId, null)
  assert.equal(Object.keys(parsed).some((key) => /kyc|invest(?!or)|wallet|payment/i.test(key)), false)
})
await check('display fields are tolerant: missing → null, never invented', async () => {
  const parsed = inv.parseInvestor({ id: 7, whitelabelId: 2 })
  for (const field of ['fullName', 'email', 'phone', 'accessState', 'businessState', 'createdAt']) assert.equal(parsed[field], null)
})
for (const bad of [{ ...row, id: 'inv_proto_001' }, { ...row, id: 0 }, { ...row, whitelabelId: null }, { ...row, whitelabelId: 'wl_proto_01' },
  { ...row, type: 'entrepreneur' }, null, []]) {
  await check('identity is strict: bad id / Whitelabel id / type fails closed', async () =>
    assert.throws(() => inv.parseInvestor(bad), (error) => error.kind === 'malformed'))
}
await check('detail: observed wrapper unwrapped, extra profile fields mapped', async () => {
  const parsed = inv.parseInvestorDetail({ data: detail })
  assert.equal(parsed.id, '41'); assert.equal(parsed.investorType, 'pessoa_fisica')
  assert.equal(parsed.personalInformationFilled, false); assert.equal(parsed.reasonForDeny, null)
  assert.equal(inv.parseInvestorDetail(detail).id, '41')
})
await check('list pagination validated; empty and out-of-range pages allowed', async () => {
  assert.equal(inv.parseInvestorList({ data: [row], meta: meta() }).rows.length, 1)
  assert.equal(inv.parseInvestorList({ data: [], meta: meta({ total: 0, lastPage: 1 }) }).total, 0)
  assert.equal(inv.parseInvestorList({ data: [], meta: meta({ page: 9, total: 3, lastPage: 1 }) }).page, 9)
})
for (const bad of [{}, { data: [row] }, { data: [row, row], meta: meta({ total: 2 }) }, { data: [], meta: meta({ total: 5 }) },
  { data: [row], meta: meta({ total: 0 }) }, { data: [row], meta: meta({ total: Number.MAX_SAFE_INTEGER + 1 }) },
  { data: [row], meta: meta({ page: Number.MAX_SAFE_INTEGER + 1 }) },
  { data: [row], meta: meta({ lastPage: Number.MAX_SAFE_INTEGER + 1 }) },
  { data: [row], meta: meta({ total: 20, lastPage: 1 }) },
  { data: Array(9).fill(0).map((_, i) => ({ ...row, id: i + 1 })), meta: meta({ total: 9 }) }]) {
  await check('malformed list / duplicate identities fail closed', async () =>
    assert.throws(() => inv.parseInvestorList(bad), (error) => error.kind === 'malformed'))
}
await check('scoped list: any row from another Whitelabel is a scope error, nothing returned', async () => {
  assert.throws(() => inv.parseInvestorList({ data: [{ ...row, whitelabelId: 6 }], meta: meta() }, '4'),
    (error) => error.kind === 'malformed' && error.code === 'SCOPE_MISMATCH')
  assert.equal(inv.parseInvestorList({ data: [row], meta: meta() }, '4').rows[0].whitelabelId, '4')
})
await check('global read sends only page / perPage / search (never whitelabelId)', async () => {
  reset(); auth.persistSession(session())
  fetchImpl = async (url, options) => {
    const parsed = new URL(url)
    assert.equal(parsed.pathname, '/api/investors'); assert.equal(options.method, 'GET')
    assert.deepEqual([...parsed.searchParams.keys()], ['page', 'perPage', 'search'])
    assert.equal(parsed.searchParams.get('perPage'), '8'); assert.equal(parsed.searchParams.get('search'), 'A&B')
    assert.equal(options.headers.Authorization, 'Bearer synthetic-unit-token-a')
    return json({ data: [row], meta: meta() })
  }
  assert.equal((await inv.listInvestors({ page: 2, search: 'A&B' })).rows[0].id, '41')
})
await check('Whitelabel separation uses the server-scoped Accounts read', async () => {
  reset(); auth.persistSession(session())
  fetchImpl = async (url) => {
    const parsed = new URL(url)
    assert.equal(parsed.pathname, '/api/whitelabels/4/accounts')
    assert.deepEqual(Object.fromEntries(parsed.searchParams), { tipo: 'investidores', page: '1', perPage: '8' })
    return json({ data: [row], meta: meta() })
  }
  assert.equal((await inv.listInvestors({ whitelabelId: '4', page: 1, search: '' })).rows.length, 1)
})
await check('prototype / non-numeric ids never reach the API', async () => {
  reset(); auth.persistSession(session()); fetchImpl = async () => { assert.fail('Unexpected request') }
  await assert.rejects(inv.getInvestor('inv_proto_001'), (error) => error.status === 404)
  await assert.rejects(inv.getInvestor('abc'), (error) => error.status === 404)
  await assert.rejects(inv.listInvestors({ whitelabelId: 'wl_proto_01', page: 1, search: '' }), (error) => error.status === 404)
  assert.equal(inv.isPrototypeId('inv_proto_001'), true); assert.equal(inv.isServerInvestorId('41'), true)
})
await check('detail: wrapped success, id must match, 404 → not-found view', async () => {
  reset(); auth.persistSession(session())
  fetchImpl = async (url) => { assert.ok(url.endsWith('/investors/41')); return json({ data: detail }) }
  assert.equal((await inv.getInvestor('41')).fullName, 'Synthetic Investor')
  fetchImpl = async () => json({ data: { ...detail, id: 42 } })
  await assert.rejects(inv.getInvestor('41'), (error) => error.kind === 'malformed')
  fetchImpl = async () => json({ statusCode: 404, code: 'CORE_HTTP_ERROR', message: 'Investor not found' }, 404)
  await assert.rejects(inv.getInvestor('41'), (error) => errors.describeApiError(error, 'o investidor').notFound)
})
await check('tenant-name lookup rejects a different Whitelabel identity', async () => {
  reset(); auth.persistSession(session())
  fetchImpl = async () => json({ id: 6, idKey: '6', name: 'Synthetic other tenant', status: 'active', isActive: true, counts: { admins: 0 } })
  await assert.rejects(inv.getInvestorWhitelabel('4'), (error) => error.kind === 'malformed')
  fetchImpl = async () => json({ id: 4, idKey: '4', name: 'Synthetic correct tenant', status: 'active', isActive: true, counts: { admins: 0 } })
  assert.equal((await inv.getInvestorWhitelabel('4')).id, '4')
})
await check('investor 401 ends the session centrally; 403 / 502 keep it', async () => {
  reset(); auth.persistSession(session()); fetchImpl = async () => json({}, 403)
  await assert.rejects(inv.listInvestors({ page: 1, search: '' }), (error) => error.status === 403); assert.ok(auth.isAuthenticated())
  fetchImpl = async () => json({ code: 'CORE_HTTP_ERROR', details: { coreStatus: 500 } }, 502)
  await assert.rejects(inv.getInvestor('41'), (error) => error.status === 502); assert.ok(auth.isAuthenticated())
  fetchImpl = async () => json({}, 401)
  await assert.rejects(inv.listInvestors({ page: 1, search: '' }), (error) => error.status === 401)
  assert.equal(auth.getAccessToken(), null); assert.equal(auth.peekAuthNotice(), 'session_expired')
})
await check('phone is masked (area code + last 4), full number never rendered', async () => {
  assert.equal(inv.maskPhone('11912345678'), '(11) •••••-5678'); assert.equal(inv.maskPhone('1132345678'), '(11) ••••-5678')
  assert.ok(!inv.maskPhone('5511912345678').includes('91234')); assert.equal(inv.maskPhone(null), null)
})
await check('labels: known tokens translated, unknown shown as sent, no KYC vocabulary', async () => {
  assert.equal(inv.validationMeta('approved').label, 'Aprovada'); assert.equal(inv.validationMeta('waiting').label, 'Aguardando')
  assert.equal(inv.validationMeta('denied').label, 'denied'); assert.equal(inv.accessMeta('active').label, 'Ativa')
  assert.equal(inv.accessMeta('paused').label, 'Pausada'); assert.equal(inv.investorTypeLabel('pessoa_fisica'), 'Pessoa física')
})
for (const state of ['constructor', 'toString', 'hasOwnProperty', 'future_validation']) {
  await check('unknown validation tokens cannot resolve inherited object properties', async () => {
    assert.deepEqual(inv.validationMeta(state), { label: state, tone: 'neutral' })
    assert.equal(typeof inv.validationMeta(state).label.toLowerCase(), 'string')
  })
}
await check('URL state: real Whitelabel ids only, bounded search, encoded hrefs', async () => {
  const parsed = route.parseInvestorRoute({ whitelabel: 'wl_proto_01', page: '0', search: ' y '.repeat(100) })
  assert.equal(parsed.state.whitelabelId, undefined); assert.equal(parsed.state.page, 1); assert.equal(parsed.ignored.length, 2)
  assert.equal(parsed.state.search.length, 120)
  assert.equal(route.investorsHref({ whitelabelId: '4', page: 2, search: 'A&B' }), '#/operation/investors?whitelabel=4&page=2&search=A%26B')
  assert.equal(route.investorHref('41'), '#/operation/investors/41')
})
await check('detail URL preserves list scope, page and search across reload', async () => {
  const context = route.investorsHref({ whitelabelId: '4', page: 2, search: 'A&B' })
  const href = route.investorHref('41', context)
  const returnTo = new URLSearchParams(href.split('?')[1]).get('returnTo')
  assert.equal(route.investorListReturnHash(returnTo), context)
  assert.equal(route.investorListReturnHash(), '#/operation/investors')
})
await check('URL query values survive space and ampersand encoding', async () => {
  const context = route.investorsHref({ whitelabelId: '4', search: 'Synthetic Investor & QA' })
  assert.equal(new URLSearchParams(context.split('?')[1]).get('search'), 'Synthetic Investor & QA')
  const encoded = route.investorHref('41', context)
  assert.equal(route.investorListReturnHash(new URLSearchParams(encoded.split('?')[1]).get('returnTo')), context)
})
for (const unsafe of ['https://example.invalid/', '//example.invalid/', '#/finance/wallets', '#/operation/investors/41', '#/operation/investors-other']) {
  await check('return destination is restricted to the internal Investor list', async () =>
    assert.equal(route.investorListReturnHash(unsafe), '#/operation/investors'))
}
reset()
console.log(`Investor read contracts: ${checks} passed (synthetic, no network)`)
