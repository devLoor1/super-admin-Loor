import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

// In-memory unit contracts only. No browser bypass, real token or network call.
// Same dependency-free TypeScript-loader convention as check-investor-read.
// Entrepreneur fixtures mirror the field names/types observed on homolog (no real values).
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
const ent = await load('src/features/operation/entrepreneurs/entrepreneurApi.ts')
const route = await load('src/features/operation/entrepreneurs/entrepreneurRoute.ts')
const tenant = await load('src/features/operation/shared/whitelabelContext.ts')
const operator = { id: 'synthetic-operator', name: 'Unit QA', email: 'qa@example.invalid', roles: ['SUPER_ADMIN'] }
const session = () => ({ accessToken: 'synthetic-unit-token-e', tokenType: 'Bearer', operator })
// Observed projection (homolog, 2026-10-14): the same 11 fields on list, scoped list and detail.
// Names and types only; synthetic values.
const row = { id: 17, type: 'entrepreneur', whitelabelId: 4, email: 'entrepreneur@example.invalid', fullName: 'Synthetic Entrepreneur',
  phone: '11900000017', accessState: 'active', businessState: 'profile_complete', emailVerifiedAt: null,
  createdAt: '2026-09-01T12:00:00.000Z', updatedAt: '2026-10-01T12:00:00.000Z' }
const meta = (overrides = {}) => ({ page: 1, perPage: 8, total: 1, lastPage: 1, ...overrides })
const json = (value, status = 200) => new Response(JSON.stringify(value), { status })
const reset = () => { auth.clearSession(); auth.clearAuthNotice(); window.location.hash = '' }
let checks = 0
async function check(name, action) {
  try { await action(); checks += 1 } catch (cause) { throw new Error(`Failed: ${name}`, { cause }) }
}

await check('observed projection maps to the Entrepreneur record (ids as strings, tokens kept)', async () => {
  const parsed = ent.parseEntrepreneur(row)
  assert.equal(parsed.id, '17'); assert.equal(parsed.whitelabelId, '4')
  assert.equal(parsed.accessState, 'active'); assert.equal(parsed.businessState, 'profile_complete')
  assert.equal(parsed.emailVerifiedAt, null)
})
await check('no Company, KYC, opportunity, finance, account or user field is derived', async () => {
  const parsed = ent.parseEntrepreneur({ ...row, companyId: 9, cnpj: '00000000000000', kycStatus: 'approved', accountId: 3, userId: 5 })
  assert.equal(Object.keys(parsed).some((key) => /compan|cnpj|kyc|opportunit|invest|wallet|payment|account|user/i.test(key)), false)
  assert.deepEqual(Object.keys(parsed).sort(), ['accessState', 'businessState', 'createdAt', 'email', 'emailVerifiedAt', 'fullName', 'id',
    'phone', 'updatedAt', 'whitelabelId'])
})
await check('display fields are tolerant: missing → null, never invented', async () => {
  const parsed = ent.parseEntrepreneur({ id: 7, type: 'entrepreneur', whitelabelId: 2 })
  for (const field of ['fullName', 'email', 'phone', 'accessState', 'businessState', 'emailVerifiedAt', 'createdAt', 'updatedAt']) {
    assert.equal(parsed[field], null)
  }
})
for (const bad of [{ ...row, id: 'emp_proto_001' }, { ...row, id: 0 }, { ...row, id: '17' }, { ...row, whitelabelId: null },
  { ...row, whitelabelId: 'wl_proto_01' }, { ...row, type: 'investor' }, { ...row, type: undefined },
  { ...row, id: Number.MAX_SAFE_INTEGER + 1 }, null, []]) {
  await check('identity is strict: bad id / Whitelabel id / type fails closed', async () =>
    assert.throws(() => ent.parseEntrepreneur(bad), (error) => error.kind === 'malformed'))
}
await check('detail: observed { data } wrapper unwrapped; direct object accepted', async () => {
  assert.equal(ent.parseEntrepreneurDetail({ data: row }).id, '17')
  assert.equal(ent.parseEntrepreneurDetail(row).id, '17')
})
await check('list pagination validated; empty and out-of-range pages allowed', async () => {
  assert.equal(ent.parseEntrepreneurList({ data: [row], meta: meta() }).rows.length, 1)
  assert.equal(ent.parseEntrepreneurList({ data: [], meta: meta({ total: 0, lastPage: 1 }) }).total, 0)
  assert.equal(ent.parseEntrepreneurList({ data: [], meta: meta({ page: 9, total: 3, lastPage: 1 }) }).page, 9)
})
for (const bad of [{}, { data: [row] }, { data: [row, row], meta: meta({ total: 2 }) }, { data: [], meta: meta({ total: 5 }) },
  { data: [row], meta: meta({ total: 0 }) }, { data: [row], meta: meta({ total: Number.MAX_SAFE_INTEGER + 1 }) },
  { data: [row], meta: meta({ total: 20, lastPage: 1 }) },
  { data: Array(9).fill(0).map((_, i) => ({ ...row, id: i + 1 })), meta: meta({ total: 9, lastPage: 2 }) }]) {
  await check('malformed list / duplicate identities fail closed', async () =>
    assert.throws(() => ent.parseEntrepreneurList(bad), (error) => error.kind === 'malformed'))
}
await check('scoped list: any row from another Whitelabel is a scope error, nothing returned', async () => {
  assert.throws(() => ent.parseEntrepreneurList({ data: [{ ...row, whitelabelId: 6 }], meta: meta() }, '4'),
    (error) => error.kind === 'malformed' && error.code === 'SCOPE_MISMATCH')
  assert.equal(ent.parseEntrepreneurList({ data: [row], meta: meta() }, '4').rows[0].whitelabelId, '4')
})
await check('global read sends only page / perPage / search (never whitelabelId)', async () => {
  reset(); auth.persistSession(session())
  fetchImpl = async (url, options) => {
    const parsed = new URL(url)
    assert.equal(parsed.pathname, '/api/entrepreneurs'); assert.equal(options.method, 'GET')
    assert.deepEqual([...parsed.searchParams.keys()], ['page', 'perPage', 'search'])
    assert.equal(parsed.searchParams.get('perPage'), '8'); assert.equal(parsed.searchParams.get('search'), 'A&B')
    assert.equal(options.headers.Authorization, 'Bearer synthetic-unit-token-e')
    assert.match(options.headers['X-Correlation-ID'], /^[0-9a-f-]{36}$/)
    return json({ data: [row], meta: meta() })
  }
  assert.equal((await ent.listEntrepreneurs({ page: 2, search: 'A&B' })).rows[0].id, '17')
  fetchImpl = async (url) => { assert.deepEqual([...new URL(url).searchParams.keys()], ['page', 'perPage']); return json({ data: [row], meta: meta() }) }
  await ent.listEntrepreneurs({ page: 1, search: '' })
})
await check('Whitelabel separation uses the server-scoped Accounts read (tipo=empreendedores)', async () => {
  reset(); auth.persistSession(session())
  fetchImpl = async (url) => {
    const parsed = new URL(url)
    assert.equal(parsed.pathname, '/api/whitelabels/4/accounts')
    assert.deepEqual(Object.fromEntries(parsed.searchParams), { tipo: 'empreendedores', page: '1', perPage: '8' })
    return json({ data: [row], meta: meta() })
  }
  assert.equal((await ent.listEntrepreneurs({ whitelabelId: '4', page: 1, search: '' })).rows.length, 1)
})
await check('prototype / non-numeric ids never reach the API', async () => {
  reset(); auth.persistSession(session()); fetchImpl = async () => { assert.fail('Unexpected request') }
  await assert.rejects(ent.getEntrepreneur('emp_proto_001'), (error) => error.status === 404 && error.code === 'INVALID_ENTREPRENEUR_ID')
  await assert.rejects(ent.getEntrepreneur('abc'), (error) => error.status === 404)
  await assert.rejects(ent.getEntrepreneur('1'.repeat(19)), (error) => error.status === 404)
  await assert.rejects(ent.listEntrepreneurs({ whitelabelId: 'wl_proto_01', page: 1, search: '' }), (error) => error.status === 404)
  assert.equal(ent.isPrototypeId('emp_proto_001'), true); assert.equal(ent.isServerEntrepreneurId('17'), true)
  assert.equal(ent.isServerEntrepreneurId('emp_proto_001'), false)
})
await check('detail: wrapped success, id must match, 404 → not-found view', async () => {
  reset(); auth.persistSession(session())
  fetchImpl = async (url) => { assert.ok(url.endsWith('/entrepreneurs/17')); return json({ data: row }) }
  assert.equal((await ent.getEntrepreneur('17')).fullName, 'Synthetic Entrepreneur')
  fetchImpl = async () => json({ data: { ...row, id: 18 } })
  await assert.rejects(ent.getEntrepreneur('17'), (error) => error.kind === 'malformed')
  fetchImpl = async () => json({ statusCode: 404, code: 'CORE_HTTP_ERROR', message: 'Entrepreneur not found' }, 404)
  await assert.rejects(ent.getEntrepreneur('17'), (error) => errors.describeApiError(error, 'o empreendedor').notFound)
})
await check('backend error text is never surfaced in the error view', async () => {
  reset(); auth.persistSession(session())
  fetchImpl = async () => json({ statusCode: 502, code: 'CORE_HTTP_ERROR', message: 'Core request failed: raw detail', details: { coreStatus: 500 } }, 502)
  const error = await ent.listEntrepreneurs({ page: 1, search: '' }).catch((cause) => cause)
  const view = errors.describeApiError(error, 'os empreendedores')
  assert.equal(`${view.title} ${view.description}`.includes('raw detail'), false); assert.equal(view.retryable, true)
})
await check('tenant-name lookup (shared) rejects a different Whitelabel identity', async () => {
  reset(); auth.persistSession(session())
  fetchImpl = async () => json({ id: 6, idKey: '6', name: 'Synthetic other tenant', status: 'active', isActive: true, counts: { admins: 0 } })
  await assert.rejects(tenant.getTenantWhitelabel('4'), (error) => error.kind === 'malformed')
  fetchImpl = async () => json({ id: 4, idKey: '4', name: 'Synthetic correct tenant', status: 'active', isActive: true, counts: { admins: 0 } })
  assert.equal((await tenant.getTenantWhitelabel('4')).id, '4')
})
await check('entrepreneur 401 ends the session centrally; 403 / 502 / network keep it', async () => {
  reset(); auth.persistSession(session()); fetchImpl = async () => json({}, 403)
  await assert.rejects(ent.listEntrepreneurs({ page: 1, search: '' }), (error) => error.status === 403); assert.ok(auth.isAuthenticated())
  fetchImpl = async () => json({ code: 'CORE_HTTP_ERROR', details: { coreStatus: 500 } }, 502)
  await assert.rejects(ent.getEntrepreneur('17'), (error) => error.status === 502); assert.ok(auth.isAuthenticated())
  fetchImpl = async () => { throw new TypeError('Failed to fetch') }
  await assert.rejects(ent.getEntrepreneur('17'), (error) => error.kind === 'network'); assert.ok(auth.isAuthenticated())
  fetchImpl = async () => json({}, 401)
  await assert.rejects(ent.listEntrepreneurs({ whitelabelId: '4', page: 1, search: '' }), (error) => error.status === 401)
  assert.equal(auth.getAccessToken(), null); assert.equal(auth.peekAuthNotice(), 'session_expired')
})
await check('phone is masked (area code + last 4); full number never rendered', async () => {
  assert.equal(ent.maskPhone('11912345678'), '(11) •••••-5678'); assert.equal(ent.maskPhone('1132345678'), '(11) ••••-5678')
  assert.equal(ent.maskPhone('+5511912345678'), '(11) •••••-5678'); assert.equal(ent.maskPhone('551132345678'), '(11) ••••-5678')
  assert.equal(ent.maskPhone('5511912345678'), '(11) •••••-5678')
  const long = ent.maskPhone('123456789012345678')
  assert.ok(long.endsWith('-5678') && !long.includes('1234567')); assert.equal(ent.maskPhone('123'), '••••')
  assert.equal(ent.maskPhone(null), null)
})
await check('labels: profile completeness (not KYC); unknown tokens shown as sent', async () => {
  assert.deepEqual(ent.profileMeta('profile_complete'), { label: 'Cadastro completo', tone: 'positive' })
  assert.deepEqual(ent.profileMeta('incomplete'), { label: 'Cadastro incompleto', tone: 'pending' })
  assert.deepEqual(ent.profileMeta('under_review'), { label: 'under_review', tone: 'neutral' })
  assert.equal(ent.accessMeta('active').label, 'Ativa'); assert.equal(ent.accessMeta('paused').label, 'Pausada')
  assert.deepEqual(ent.accessMeta('blocked'), { label: 'blocked', tone: 'muted' })
  for (const value of ['Cadastro completo', 'Cadastro incompleto']) assert.equal(/kyc|aprovad|empresa/i.test(value), false)
})
await check('malformed and international phones never invent a Brazilian area code', async () => {
  for (const value of ['abc11912345678', '11912345678 ext 99', '++5511912345678', 'qa123@example.invalid']) {
    assert.equal(ent.maskPhone(value), '••••')
  }
  assert.equal(ent.maskPhone('+12125550123'), '•••••••-0123')
  assert.equal(ent.maskPhone('+442079460123'), '••••••••-0123')
  assert.equal(ent.maskPhone('(11) 91234-5678'), '(11) •••••-5678')
  assert.equal(ent.maskPhone(42), null)
  assert.equal(ent.maskPhone(' '), null)
})
for (const state of ['constructor', 'toString', 'hasOwnProperty']) {
  await check('unknown profile tokens cannot resolve inherited object properties', async () =>
    assert.deepEqual(ent.profileMeta(state), { label: state, tone: 'neutral' }))
}
await check('URL state: real Whitelabel ids only, bounded search, encoded hrefs', async () => {
  const parsed = route.parseEntrepreneurRoute({ whitelabel: 'wl_proto_01', page: '0', search: ' y '.repeat(100) })
  assert.equal(parsed.state.whitelabelId, undefined); assert.equal(parsed.state.page, 1); assert.equal(parsed.ignored.length, 2)
  assert.equal(parsed.state.search.length, 120)
  assert.equal(route.entrepreneursHref({ whitelabelId: '4', page: 2, search: 'A&B' }), '#/operation/entrepreneurs?whitelabel=4&page=2&search=A%26B')
  assert.equal(route.entrepreneurHref('17'), '#/operation/entrepreneurs/17')
})
await check('detail URL preserves list scope, page and search across reload', async () => {
  const context = route.entrepreneursHref({ whitelabelId: '4', page: 2, search: 'Synthetic & QA' })
  const href = route.entrepreneurHref('17', context)
  const returnTo = new URLSearchParams(href.split('?')[1]).get('returnTo')
  assert.equal(route.entrepreneurListReturnHash(returnTo), context)
  assert.equal(route.entrepreneurListReturnHash(), '#/operation/entrepreneurs')
})
for (const unsafe of ['https://example.invalid/', '//example.invalid/', '#/operation/investors?whitelabel=4', '#/operation/entrepreneurs/17',
  '#/operation/entrepreneurs-other', '#/finance/wallets']) {
  await check('return destination is restricted to the internal Entrepreneur list', async () =>
    assert.equal(route.entrepreneurListReturnHash(unsafe), '#/operation/entrepreneurs'))
}
reset()
console.log(`Entrepreneur read contracts: ${checks} passed (synthetic, no network)`)
