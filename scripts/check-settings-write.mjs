import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { moduleLoader, root, reactUrl, renderUrl } from './operators-test-harness.mjs'

const storage = new Map()
globalThis.sessionStorage = { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) }
globalThis.window = { setTimeout, clearTimeout, location: { hash: '' } }
globalThis.document = { hidden: false }
let dispatch = async () => { throw Error('Unexpected synthetic request') }
globalThis.fetch = (...args) => dispatch(...args)
const load = moduleLoader({ development: false })
const contract = await load('src/features/whitelabel-settings/settingsWriteContract.ts')
const client = await load('src/features/whitelabel-settings/settingsWriteClient.ts')
const read = await load('src/features/whitelabel-settings/settingsReadApi.ts')
const auth = await load('src/lib/authSession.ts')
let checks = 0, sequence = 40000
async function check(name, fn) { try { await fn(); checks++ } catch (cause) { throw Error(name, { cause }) } }
const response = (body, status = 200) => new Response(JSON.stringify(body), { status })
const login = (roles = ['SUPER_ADMIN']) => {
  auth.persistSession({ accessToken: 'synthetic-settings-test-only', tokenType: 'Bearer', operator: { id: 'qa', name: 'Synthetic', email: 'qa@example.invalid', roles } })
  return auth.getSessionVersion()
}
function fixture(mode = 'normal', field = 'login.title') {
  const id = String(++sequence), version = login(), state = { mode }, seen = []
  const raw = { data: { whitelabel: { id: Number(id), slug: 'synthetic-settings', name: 'Synthetic Settings', baseUrl: 'https://qa.example.invalid', isActive: false }, settings: { login: { title: 'Existing title', subtitle: 'Existing subtitle', bullets: ['First', 'Second', 'Third'] }, features: { wallet_visible: false }, smtp: { password: 'RAW_PRIVATE_BAG_SENTINEL' } }, terms: { current: null, history: [] } } }
  const original = read.parseSettingsRead(raw, id)
  dispatch = async (url, options) => {
    const method = options.method, body = options.body ? JSON.parse(options.body) : undefined
    seen.push({ url, method, body, signal: options.signal, hasAuth: options.headers.Authorization === 'Bearer synthetic-settings-test-only' })
    if (method === 'GET') {
      if (state.mode === 'echoPreflight') return response({ code: 'PRIVATE_CODE_SENTINEL_password', correlationId: 'PRIVATE_CORRELATION_SENTINEL_token', message: 'PRIVATE_MESSAGE_SENTINEL_secret' }, 500)
      if (state.mode === 'getFailAfter' && seen.some(r => r.method === 'PUT')) return response({}, 502)
      if (state.mode === 'wrongTenantAfter' && seen.some(r => r.method === 'PUT')) return response({ data: { ...raw.data, whitelabel: { ...raw.data.whitelabel, id: Number(id) + 1 } } })
      return response(raw)
    }
    assert.equal(method, 'PUT')
    if (state.mode === 'knownError') return response({ code: 'E_VALIDATION', correlationId: '550e8400-e29b-41d4-a716-446655440000', message: 'PRIVATE_MESSAGE_SENTINEL_secret' }, 422)
    if (/^\d+$/.test(state.mode)) return response({}, Number(state.mode))
    if (state.mode === 'network') throw new TypeError('Synthetic offline')
    raw.data.settings[body.page] ??= {}
    raw.data.settings[body.page][body.key] = body.value
    if (state.mode === 'replaceSession') login(['READ_ONLY'])
    if (state.mode === '500commit') return response({ code: 'SYNTHETIC_AUDIT_FAILURE', correlationId: 'synthetic-correlation' }, 500)
    if (state.mode === 'echoCommit') return response({ code: 'PRIVATE_CODE_SENTINEL_password', correlationId: 'PRIVATE_CORRELATION_SENTINEL_token', message: 'PRIVATE_MESSAGE_SENTINEL_secret' }, 500)
    if (state.mode === 'networkCommit') throw new TypeError('Synthetic disconnect after commit')
    if (state.mode === 'badBody') return response({ data: { id: 'wrong', page: body.page, key: body.key, value: body.value } })
    return response({ data: { id: 7000, ...body, private: 'UNEXPECTED_RECEIPT_SENTINEL' } }, state.mode === 'unexpectedStatus' ? 201 : 200)
  }
  const value = field === 'login.bullets' ? ['Updated A', 'Updated B', 'Updated C'] : field.startsWith('features.') ? true : 'Updated synthetic copy'
  const command = { tenantId: id, field, baseline: contract.settingsFieldValue(original, field), value }
  return { id, version, state, seen, raw, original, command, fields: [field], attempt: () => client.getSettingsWriteAttempt(client.settingsWriteKey(id, field), version) }
}
for (const field of contract.SETTINGS_FIELDS) await check(`qualified exact row ${field}`, () => {
  const value = field.startsWith('features.') ? false : field === 'login.bullets' ? ['One', 'Two', 'Three'] : 'Valid synthetic copy'
  const payload = contract.settingPayload({ tenantId: '8', field, baseline: { state: 'missing' }, value })
  const [page, key] = field.split('.')
  assert.deepEqual(payload, { page, key, value }); assert.deepEqual(Object.keys(payload), ['page', 'key', 'value'])
})
for (const field of ['smtp.password', 'terms.current', 'quick_profile.theme', 'terminology.config', 'app_entry.content', 'app_authenticated.content', 'login.main_area_image', 'features.unknown', '__proto__.title', '', 'Login.title']) await check(`unqualified key ${field} fails before transport`, () => {
  assert.throws(() => contract.settingPayload({ tenantId: '8', field, baseline: { state: 'missing' }, value: 'No' }))
})
for (const id of ['0', '08', '8e0', '8/../9', 'wl_proto_01', '9007199254740992']) await check(`noncanonical tenant ${id}`, () => assert.throws(() => contract.settingPayload({ tenantId: id, field: 'login.title', baseline: { state: 'missing' }, value: 'Valid' })))
for (const value of [null, undefined, 1, {}, [], '', '  ', '<b>text</b>', 'Line\nBreak', '\u0000', '\u0085', '\u200b', '\u202e', 'Bearer synthetic-only-value', '-----BEGIN PRIVATE KEY-----', 'x'.repeat(241)]) await check('copy input fails closed without silent truncation', () => assert.throws(() => contract.normalizeSettingValue('login.title', value)))
await check('NFC/trim normalization and defensive field-specific limits', () => {
  assert.equal(contract.normalizeSettingValue('login.title', '  Cafe\u0301  '), 'Café')
  assert.equal(contract.normalizeSettingValue('login.subtitle', 'x'.repeat(1000)).length, 1000)
  assert.throws(() => contract.normalizeSettingValue('login.subtitle', 'x'.repeat(1001)))
  for (const value of ['true', 'false', 0, 1, null]) assert.throws(() => contract.normalizeSettingValue('features.wallet_visible', value))
  for (const value of [[], ['One'], ['One', 'Two', ''], ['One', 'Two', 'Three', 'Four'], ['One', {}, 'Three']]) assert.throws(() => contract.normalizeSettingValue('login.bullets', value))
})
await check('missing/null/empty and false remain exact baselines', () => {
  const f = fixture()
  for (const v of [undefined, null, '']) {
    if (v === undefined) delete f.raw.data.settings.login.title; else f.raw.data.settings.login.title = v
    assert.deepEqual(contract.settingsFieldValue(read.parseSettingsRead(f.raw, f.id), 'login.title'), v === undefined ? { state: 'missing' } : v === null ? { state: 'null' } : { state: 'value', value: '' })
  }
  assert.deepEqual(contract.settingsFieldValue(f.original, 'features.wallet_visible'), { state: 'value', value: false })
  assert.throws(() => contract.settingPayload({ ...f.command, baseline: { state: 'missing', value: 'extra' } }))
})
await check('reversible smoke distinguishes existing restorable values from absent/default/normalized changes', () => {
  assert.equal(contract.isExactlyRestorableSetting('login.title', { state: 'value', value: 'Existing title' }), true)
  for (const baseline of [{ state: 'missing' }, { state: 'null' }, { state: 'value', value: '' }, { state: 'value', value: ' Existing title ' }, { state: 'value', value: 'Cafe\u0301' }, { state: 'value', value: 'x'.repeat(241) }]) assert.equal(contract.isExactlyRestorableSetting('login.title', baseline), false)
})
for (const field of ['login.title', 'login.subtitle', 'login.bullets', 'features.wallet_visible']) await check(`${field}: one PUT, fresh GET before, authoritative GET after`, async () => {
  const f = fixture('normal', field)
  await client.executeSettingsWrite(f.command, f.version, undefined, f.fields)
  assert.equal(f.attempt().phase, 'confirmed'); assert.deepEqual(f.seen.map(r => r.method), ['GET', 'PUT', 'GET'])
  assert.equal(f.seen[1].url, `https://control-plane.example.invalid/api/whitelabels/${f.id}/settings`)
  assert.deepEqual(f.seen[1].body, contract.settingPayload(f.command)); assert.ok(f.seen.every(r => r.hasAuth))
  assert.doesNotMatch(JSON.stringify(f.attempt()), /RAW_PRIVATE|UNEXPECTED_RECEIPT|Existing title|Updated synthetic copy/)
  await assert.rejects(client.executeSettingsWrite(f.command, f.version, undefined, f.fields), e => e.code === 'SETTINGS_ATTEMPT_LOCKED')
})
await check('default release scope denies every mutation before a request', async () => {
  const f = fixture(); await assert.rejects(client.executeSettingsWrite(f.command, f.version), e => e.code === 'SETTINGS_WRITES_NOT_RELEASED'); assert.equal(f.seen.length, 0)
})
for (const roles of [['READ_ONLY'], ['SUPPORT_ADMIN'], ['FINANCIAL_ADMIN'], [], ['super_admin']]) await check(`SUPER_ADMIN only: ${roles}`, async () => {
  const f = fixture(), version = login(roles)
  await assert.rejects(client.executeSettingsWrite(f.command, version, undefined, f.fields), e => e.code === 'SETTINGS_WRITE_FORBIDDEN'); assert.equal(f.seen.length, 0)
})
await check('expired/replaced session cannot start a write', async () => { const f = fixture(); login(); await assert.rejects(client.executeSettingsWrite(f.command, f.version, undefined, f.fields), e => e.status === 401); assert.equal(f.seen.length, 0) })
await check('changed baseline prevents PUT', async () => { const f = fixture(); f.raw.data.settings.login.title = 'Concurrent edit'; await client.executeSettingsWrite(f.command, f.version, undefined, f.fields); assert.equal(f.attempt().phase, 'stale'); assert.deepEqual(f.seen.map(r => r.method), ['GET']) })
await check('unchanged value prevents PUT', async () => { const f = fixture(); await client.executeSettingsWrite({ ...f.command, value: 'Existing title' }, f.version, undefined, f.fields); assert.equal(f.attempt().code, 'SETTINGS_NO_CHANGE'); assert.deepEqual(f.seen.map(r => r.method), ['GET']) })
await check('duplicate submission locks before the first preflight resolves', async () => { const f = fixture(), first = client.executeSettingsWrite(f.command, f.version, undefined, f.fields); await assert.rejects(client.executeSettingsWrite(f.command, f.version, undefined, f.fields), e => e.status === 409); await first; assert.equal(f.seen.filter(r => r.method === 'PUT').length, 1) })
for (const mode of ['400', '403', '404', '409', '422']) await check(`definite HTTP ${mode}: no automatic retry`, async () => { const f = fixture(mode); await client.executeSettingsWrite(f.command, f.version, undefined, f.fields); assert.equal(f.attempt().phase, 'rejected'); assert.deepEqual(f.seen.map(r => r.method), ['GET', 'PUT']) })
for (const mode of ['500commit', 'networkCommit', 'badBody', 'unexpectedStatus']) await check(`${mode}: GET reconciles persisted row without claiming clean receipt`, async () => {
  const f = fixture(mode); await client.executeSettingsWrite(f.command, f.version, undefined, f.fields)
  assert.equal(f.attempt().phase, 'readback_matches'); assert.equal(f.seen.filter(r => r.method === 'PUT').length, 1)
  await client.reconcileSettingsWrite(f.id, f.command.field, f.version, f.fields); assert.equal(f.seen.filter(r => r.method === 'PUT').length, 1)
})
for (const mode of ['echoPreflight', 'echoCommit']) await check(`${mode}: arbitrary credential-like server metadata is discarded`, async () => {
  const f = fixture(mode); await client.executeSettingsWrite(f.command, f.version, undefined, f.fields)
  assert.equal(f.attempt().phase, mode === 'echoPreflight' ? 'rejected' : 'readback_matches')
  assert.equal(f.attempt().status, 500); assert.equal(f.attempt().code, undefined); assert.equal(f.attempt().correlationId, undefined)
  assert.doesNotMatch(JSON.stringify(f.attempt()), /PRIVATE_|password|token|secret/)
  assert.equal(f.seen.filter(r => r.method === 'PUT').length, mode === 'echoPreflight' ? 0 : 1)
})
await check('known safe code and UUID reference survive without retaining an arbitrary message', async () => {
  const f = fixture('knownError'); await client.executeSettingsWrite(f.command, f.version, undefined, f.fields)
  assert.equal(f.attempt().phase, 'rejected'); assert.equal(f.attempt().code, 'E_VALIDATION')
  assert.equal(f.attempt().correlationId, '550e8400-e29b-41d4-a716-446655440000'); assert.doesNotMatch(JSON.stringify(f.attempt()), /PRIVATE_|secret/)
})
for (const mode of ['network', 'getFailAfter', 'wrongTenantAfter', 'replaceSession', '401']) await check(`${mode}: unknown outcomes stay locked, never resend`, async () => {
  const f = fixture(mode); await client.executeSettingsWrite(f.command, f.version, undefined, f.fields); assert.equal(f.attempt().phase, 'uncertain')
  if (mode === '401') assert.equal(auth.getAccessToken(), null)
  else if (mode !== 'replaceSession') await assert.rejects(client.executeSettingsWrite(f.command, f.version, undefined, f.fields), e => e.status === 409)
  assert.equal(f.seen.filter(r => r.method === 'PUT').length, 1)
})
await check('abort before request never starts transport', async () => { const f = fixture(), c = new AbortController(); c.abort(); await assert.rejects(client.executeSettingsWrite(f.command, f.version, c.signal, f.fields), e => e.name === 'AbortError'); assert.equal(f.seen.length, 0) })
await check('abort or session replacement during preflight cannot dispatch a late PUT', async () => {
  for (const mode of ['abort', 'replace']) {
    const f = fixture(), c = new AbortController(); let complete
    dispatch = async (_url, o) => { f.seen.push({ method: o.method }); return new Promise(resolve => { complete = () => resolve(response(f.raw)) }) }
    const pending = client.executeSettingsWrite(f.command, f.version, c.signal, f.fields)
    if (mode === 'abort') c.abort(); else login(['READ_ONLY'])
    complete(); await pending; assert.deepEqual(f.seen.map(r => r.method), ['GET'])
  }
})
await check('only verified outcomes can be acknowledged for another explicit operation', async () => {
  const f = fixture(); await client.executeSettingsWrite(f.command, f.version, undefined, f.fields); client.beginNextSettingsWrite(f.id, f.command.field, f.version, f.fields); assert.equal(f.attempt(), null)
  const u = fixture('network'); await client.executeSettingsWrite(u.command, u.version, undefined, u.fields); assert.throws(() => client.beginNextSettingsWrite(u.id, u.command.field, u.version, u.fields), e => e.status === 409)
})
await check('receipt is limited to exact row/type/value; tenant identity comes from scoped GET', () => {
  for (const row of [{ id: 1, page: 'smtp', key: 'password', value: 'Expected' }, { id: 1, page: 'login', key: 'title', value: null }, { id: 0, page: 'login', key: 'title', value: 'Expected' }]) assert.throws(() => contract.parseSettingReceipt({ data: row }, 'login.title', 'Expected'))
  assert.deepEqual(contract.parseSettingReceipt({ data: { id: 2, page: 'login', key: 'title', value: 'Expected', secret: 'IGNORED' } }, 'login.title', 'Expected'), { id: 2 })
})
const { createElement: h } = await import(reactUrl), { renderToStaticMarkup: render } = await import(renderUrl)
globalThis.__settingsWriteAuth = auth
const uiAuth = 'export const useSessionOperator=()=>globalThis.__settingsWriteAuth.getOperator();export const getOperator=useSessionOperator;export const getAccessToken=()=>globalThis.__settingsWriteAuth.getAccessToken();export const getSessionVersion=()=>globalThis.__settingsWriteAuth.getSessionVersion();export const subscribeSession=()=>()=>{};export const handleUnauthorized=()=>{};'
const ui = await moduleLoader({ overrides: { 'src/lib/authSession.ts': uiAuth } })('src/features/whitelabel-settings/SettingsWriteEditor.tsx')
for (const roles of [['SUPER_ADMIN'], ['READ_ONLY'], ['SUPPORT_ADMIN'], []]) await check(`render release + role boundary ${roles}`, () => {
  const f = fixture(); login(roles)
  assert.equal(render(h(ui.SettingsWriteEditor, { id: f.id, data: f.original, onReload() {} })), '')
  const html = render(h(ui.SettingsWriteEditor, { id: f.id, data: f.original, onReload() {}, releasedFields: f.fields }))
  assert.equal(html.includes('Editar configuração'), roles.includes('SUPER_ADMIN')); assert.doesNotMatch(html, /RAW_PRIVATE|<form|Publicar|password/)
  assert.equal(render(h(ui.SettingsWriteEditor, { id: '9', data: f.original, onReload() {}, releasedFields: f.fields })), '')
})
await check('editor uses native guarded dialog and dedicated CSS; no secret storage/retry/backend workaround', async () => {
  const editor = await readFile(resolve(root, 'src/features/whitelabel-settings/SettingsWriteEditor.tsx'), 'utf8')
  const source = await readFile(resolve(root, 'src/features/whitelabel-settings/settingsWriteClient.ts'), 'utf8')
  assert.match(editor, /useUnsavedChangesGuard/); assert.match(editor, /Confirmar e salvar uma vez/); assert.match(editor, /useSyncExternalStore\(subscribeSession/)
  assert.match(editor, /key=\{`\$\{id\}:\$\{version\}`\}/); assert.match(editor, /Dialog/)
  assert.doesNotMatch(source, /localStorage|sessionStorage|setInterval|console\.|\/admin\/|\/internal\/|method: 'POST'|method: 'PATCH'|method: 'DELETE'/)
})
auth.clearSession()
console.log(`Settings write: ${checks} focused checks passed (synthetic transport only; no live mutation)`)
