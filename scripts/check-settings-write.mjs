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
let checks = 0, sequence = 60000
async function check(name, fn) { try { await fn(); checks++ } catch (cause) { throw Error(name, { cause }) } }
const response = (body, status = 200) => new Response(JSON.stringify(body), { status })
const login = (roles = ['SUPER_ADMIN']) => {
  auth.persistSession({ accessToken: 'synthetic-settings-test-only', tokenType: 'Bearer', operator: { id: 'qa', name: 'Synthetic', email: 'qa@example.invalid', roles } })
  return auth.getSessionVersion()
}
function fixture(mode = 'normal', field = 'login.title') {
  const id = String(++sequence), version = login(), state = { mode }, seen = []
  const raw = { data: { whitelabel: { id: Number(id), slug: 'synthetic-settings', name: 'Synthetic Settings', baseUrl: 'https://qa.example.invalid', isActive: false }, settings: { login: { title: 'Existing title', subtitle: 'Existing subtitle', bullets: ['First', 'Second', 'Third'] }, features: Object.fromEntries(Object.keys(read.FEATURE_LABELS).map(key => [key, false])), smtp: { password: 'RAW_PRIVATE_BAG_SENTINEL' } }, provenance: [], terms: { current: null, history: [] } } }
  for (const name of contract.SETTINGS_FIELDS) {
    const [page, key] = name.split('.'), value = raw.data.settings[page][key]
    raw.data.provenance.push({ page, key, stored: true, storedValue: value, effectiveValue: value, source: 'stored', version: `${name}:v1` })
  }
  const original = read.parseSettingsRead(raw, id)
  dispatch = async (url, options) => {
    const method = options.method, body = options.body ? JSON.parse(options.body) : undefined
    seen.push({ url, method, body, hasAuth: options.headers.Authorization === 'Bearer synthetic-settings-test-only' })
    const written = seen.some(r => r.method !== 'GET')
    if (method === 'GET') {
      if (state.mode === 'echoPreflight') return response({ code: 'PRIVATE_CODE_SENTINEL_password', correlationId: 'PRIVATE_CORRELATION_SENTINEL_token', message: 'PRIVATE_MESSAGE_SENTINEL_secret' }, 500)
      if (state.mode === 'getFailAfter' && written) return response({}, 502)
      if (state.mode === 'wrongTenantAfter' && written) return response({ data: { ...raw.data, whitelabel: { ...raw.data.whitelabel, id: Number(id) + 1 } } })
      return response(raw)
    }
    assert.ok(['PUT', 'DELETE'].includes(method))
    if (state.mode === 'knownError') return response({ code: 'E_VALIDATION', correlationId: '550e8400-e29b-41d4-a716-446655440000', message: 'PRIVATE_MESSAGE_SENTINEL_secret' }, 422)
    if (/^\d+$/.test(state.mode)) return response({}, Number(state.mode))
    if (state.mode === 'network') throw new TypeError('Synthetic offline')
    const [page, key] = field.split('.'), cell = raw.data.provenance.find(p => p.page === page && p.key === key)
    let receipt
    if (method === 'PUT') {
      raw.data.settings[body.page][body.key] = body.value
      Object.assign(cell, { stored: true, storedValue: body.value, effectiveValue: body.value, source: 'stored', version: `${field}:v2` })
      receipt = { id: 7000, ...body, private: 'UNEXPECTED_RECEIPT_SENTINEL' }
    } else {
      const deleted = cell.stored, effectiveValue = page === 'features' ? true : null, source = page === 'features' ? 'default' : 'absent'
      delete raw.data.settings[page][key]
      if (page === 'login') raw.data.settings[page][key] = ''
      Object.assign(cell, { stored: false, storedValue: null, effectiveValue, source, version: null })
      receipt = { deleted, page, key, stored: false, effectiveValue, source, version: null }
    }
    if (state.mode === 'replaceSession') login(['READ_ONLY'])
    if (state.mode === '500commit' || state.mode === 'echoCommit') return response({ code: 'PRIVATE_CODE_SENTINEL_password', correlationId: 'PRIVATE_CORRELATION_SENTINEL_token', message: 'PRIVATE_MESSAGE_SENTINEL_secret' }, 500)
    if (state.mode === 'networkCommit') throw new TypeError('Synthetic disconnect after commit')
    if (state.mode === 'badBody') return response({ data: { ...receipt, page: 'wrong' } })
    return response({ data: receipt }, state.mode === 'unexpectedStatus' ? 201 : 200)
  }
  const value = field === 'login.bullets' ? ['Updated A', 'Updated B', 'Updated C'] : field.startsWith('features.') ? true : 'Updated synthetic copy'
  const command = { tenantId: id, field, baseline: contract.settingsFieldBaseline(original, field), value }
  return { id, version, state, seen, raw, original, command, fields: [field], cell: () => raw.data.provenance.find(p => `${p.page}.${p.key}` === field), attempt: () => client.getSettingsWriteAttempt(client.settingsWriteKey(id, field), version) }
}
for (const field of contract.SETTINGS_FIELDS) await check(`qualified exact row ${field}`, () => {
  const f = fixture('normal', field), payload = contract.settingPayload(f.command), [page, key] = field.split('.')
  assert.deepEqual(payload, { page, key, value: f.command.value }); assert.deepEqual(Object.keys(payload), ['page', 'key', 'value'])
})
for (const field of ['smtp.password', 'terms.current', 'quick_profile.theme', 'app_entry.content', 'features.unknown', '__proto__.title', 'Login.title']) await check(`unreleased field ${field}`, () => {
  const f = fixture(); assert.throws(() => contract.settingPayload({ ...f.command, field })); assert.throws(() => contract.settingResetPath({ ...f.command, field }))
})
for (const id of ['0', '08', '8e0', '8/../9', 'wl_proto_01', '9007199254740992']) await check(`canonical tenant ${id}`, () => { const f = fixture(); assert.throws(() => contract.settingPayload({ ...f.command, tenantId: id })) })
for (const value of [null, undefined, 1, {}, [], '', '  ', '<b>text</b>', 'Line\nBreak', '\u0000', '\u0085', '\u200b', '\u202e', 'Bearer synthetic-only-value', '-----BEGIN PRIVATE KEY-----', 'x'.repeat(241)]) await check('invalid copy fails closed', () => assert.throws(() => contract.normalizeSettingValue('login.title', value)))
await check('bounds and exact string restoration without normalization', () => {
  assert.equal(contract.normalizeSettingValue('login.title', '  Cafe\u0301  '), '  Cafe\u0301  ')
  assert.equal(contract.normalizeSettingValue('login.subtitle', 'x'.repeat(1000)).length, 1000); assert.throws(() => contract.normalizeSettingValue('login.subtitle', 'x'.repeat(1001)))
  for (const value of ['true', 0, 1, null]) assert.throws(() => contract.normalizeSettingValue('features.wallet_visible', value))
  for (const value of [[], ['One'], ['One', 'Two', ''], ['One', 'Two', 'Three', 'Four']]) assert.throws(() => contract.normalizeSettingValue('login.bullets', value))
})
for (const [value, source, stored] of [[null, 'absent', false], ['Inherited', 'default', false], ['', 'stored', true], [null, 'stored', true]]) await check(`provenance distinctions ${source}/${String(value)}/${stored}`, () => {
  const f = fixture(); Object.assign(f.cell(), { stored, source, storedValue: stored ? value : null, effectiveValue: value, version: stored ? 'v1' : null }); f.raw.data.settings.login.title = 'Conflicting bag'
  const baseline = contract.settingsFieldBaseline(read.parseSettingsRead(f.raw, f.id), 'login.title')
  assert.equal(baseline.provenance.source, source); assert.equal(baseline.provenance.stored, stored)
  assert.deepEqual(baseline.value, source === 'absent' ? { state: 'missing' } : value === null ? { state: 'null' } : { state: 'value', value })
  if (!stored) assert.equal(contract.isExactlyRestorableSetting('login.title', baseline), true)
})
await check('strict false preserved', () => { const f = fixture('normal', 'features.wallet_visible'), p = f.command.baseline; assert.equal(p.provenance.storedValue, false); assert.deepEqual(p.value, { state: 'value', value: false }) })
for (const change of [p => { delete p.storedValue }, p => { delete p.version }, p => { p.stored = false }, p => { p.source = 'default' }, p => { p.effectiveValue = {} }, p => { p.storedValue = {} }]) await check('malformed qualified provenance rejected', () => { const f = fixture(); change(f.cell()); assert.throws(() => read.parseSettingsRead(f.raw, f.id)) })
await check('stored null is not confused with absence or a separately supplied effective value', () => { const f = fixture(); Object.assign(f.cell(), { storedValue: null, effectiveValue: 'Consumer presentation' }); const p = contract.settingsFieldBaseline(read.parseSettingsRead(f.raw, f.id), 'login.title'); assert.equal(p.provenance.stored, true); assert.equal(p.provenance.storedValue, null); assert.equal(p.value.value, 'Consumer presentation') })
await check('unknown private provenance excluded without reading its value', () => { const f = fixture(); f.raw.data.provenance.push({ page: 'smtp', key: 'password', get storedValue() { throw Error('private') } }); const parsed = read.parseSettingsRead(f.raw, f.id); assert.equal(Object.keys(parsed.provenance).length, 11); assert.doesNotMatch(JSON.stringify(parsed), /RAW_PRIVATE/) })
await check('historical reads work without provenance but writes fail closed', () => { const f = fixture(); delete f.raw.data.provenance; const parsed = read.parseSettingsRead(f.raw, f.id); assert.equal(parsed.experience.title.value, 'Existing title'); assert.throws(() => contract.settingsFieldBaseline(parsed, 'login.title')); assert.throws(() => contract.settingPayload({ ...f.command, baseline: { state: 'missing' } })) })
for (const field of ['login.title', 'login.subtitle', 'login.bullets', 'features.wallet_visible']) await check(`one PUT with receipt and authoritative read ${field}`, async () => {
  const f = fixture('normal', field); await client.executeSettingsWrite(f.command, f.version, undefined, f.fields)
  assert.equal(f.attempt().phase, 'confirmed'); assert.deepEqual(f.seen.map(r => r.method), ['GET', 'PUT', 'GET']); assert.deepEqual(f.seen[1].body, contract.settingPayload(f.command)); assert.ok(f.seen.every(r => r.hasAuth))
  assert.doesNotMatch(JSON.stringify(f.attempt()), /RAW_PRIVATE|UNEXPECTED_RECEIPT|Existing title|Updated synthetic/); await assert.rejects(client.executeSettingsWrite(f.command, f.version, undefined, f.fields), e => e.status === 409)
})
for (const field of ['login.title', 'features.wallet_visible']) await check(`DELETE reset and authoritative absence/default ${field}`, async () => {
  const f = fixture('normal', field); await client.executeSettingsReset(f.command, f.version, undefined, f.fields)
  assert.equal(f.attempt().phase, 'confirmed'); assert.equal(f.attempt().deleted, true); assert.deepEqual(f.seen.map(r => r.method), ['GET', 'DELETE', 'GET']); assert.equal(f.seen[1].body, undefined)
  const [page, key] = field.split('.'); assert.equal(f.seen[1].url, `https://control-plane.example.invalid/api/whitelabels/${f.id}/settings/${encodeURIComponent(page)}/${encodeURIComponent(key)}/override`)
  const baseline = contract.settingsFieldBaseline(read.parseSettingsRead(f.raw, f.id), field); assert.equal(baseline.provenance.stored, false); assert.equal(baseline.provenance.source, page === 'features' ? 'default' : 'absent')
})
await check('deleted false is confirmed truthfully', async () => {
  const f = fixture(); Object.assign(f.cell(), { stored: false, storedValue: null, effectiveValue: null, source: 'absent', version: null }); const command = { ...f.command, baseline: contract.settingsFieldBaseline(read.parseSettingsRead(f.raw, f.id), f.command.field) }
  await client.executeSettingsReset(command, f.version, undefined, f.fields); assert.equal(f.attempt().phase, 'confirmed'); assert.equal(f.attempt().deleted, false)
})
for (const roles of [['READ_ONLY'], ['SUPPORT_ADMIN'], ['FINANCIAL_ADMIN'], [], ['super_admin']]) await check(`save/reset RBAC ${roles}`, async () => { const f = fixture(), version = login(roles); await assert.rejects(client.executeSettingsWrite(f.command, version, undefined, f.fields), e => e.status === 403); await assert.rejects(client.executeSettingsReset(f.command, version, undefined, f.fields), e => e.status === 403); assert.equal(f.seen.length, 0) })
await check('empty scope and replaced session fail before transport', async () => { const f = fixture(); await assert.rejects(client.executeSettingsWrite(f.command, f.version), e => e.code === 'SETTINGS_WRITES_NOT_RELEASED'); login(); await assert.rejects(client.executeSettingsWrite(f.command, f.version, undefined, f.fields), e => e.status === 401); assert.equal(f.seen.length, 0) })
for (const mutate of [f => { f.cell().version = 'concurrent:v2' }, f => { f.cell().storedValue = f.cell().effectiveValue = 'Concurrent value' }]) await check('exact value/version conflict prevents dispatch', async () => { const f = fixture(); mutate(f); await client.executeSettingsWrite(f.command, f.version, undefined, f.fields); assert.equal(f.attempt().phase, 'stale'); assert.deepEqual(f.seen.map(r => r.method), ['GET']) })
await check('no-op suppression applies to stored override, not inherited equality', async () => {
  const f = fixture(); await client.executeSettingsWrite({ ...f.command, value: 'Existing title' }, f.version, undefined, f.fields); assert.equal(f.attempt().code, 'SETTINGS_NO_CHANGE')
  const a = fixture(); Object.assign(a.cell(), { stored: false, storedValue: null, effectiveValue: 'Inherited', source: 'default', version: null }); await client.executeSettingsWrite({ ...a.command, baseline: contract.settingsFieldBaseline(read.parseSettingsRead(a.raw, a.id), 'login.title'), value: 'Inherited' }, a.version, undefined, a.fields); assert.equal(a.attempt().phase, 'confirmed')
})
await check('duplicate submission locks synchronously', async () => { const f = fixture(), first = client.executeSettingsWrite(f.command, f.version, undefined, f.fields); await assert.rejects(client.executeSettingsWrite(f.command, f.version, undefined, f.fields), e => e.status === 409); await first; assert.equal(f.seen.filter(r => r.method === 'PUT').length, 1) })
for (const mode of ['400', '403', '404', '409', '422']) await check(`definite ${mode} rejection no retry`, async () => { const f = fixture(mode); await client.executeSettingsWrite(f.command, f.version, undefined, f.fields); assert.equal(f.attempt().phase, 'rejected'); assert.deepEqual(f.seen.map(r => r.method), ['GET', 'PUT']) })
for (const mode of ['500commit', 'networkCommit', 'badBody', 'unexpectedStatus']) for (const operation of ['save', 'reset']) await check(`${operation}/${mode}: readback matches is not a confirmed receipt`, async () => {
  const f = fixture(mode); await (operation === 'save' ? client.executeSettingsWrite : client.executeSettingsReset)(f.command, f.version, undefined, f.fields); assert.equal(f.attempt().phase, 'readback_matches'); assert.equal(f.seen.filter(r => r.method !== 'GET').length, 1)
  assert.throws(() => client.beginNextSettingsWrite(f.id, f.command.field, f.version, f.fields), e => e.status === 409); await client.reconcileSettingsWrite(f.id, f.command.field, f.version, f.fields); assert.equal(f.seen.filter(r => r.method !== 'GET').length, 1)
})
for (const mode of ['network', 'getFailAfter', 'wrongTenantAfter', 'replaceSession', '401']) await check(`${mode}: unknown outcome locked`, async () => { const f = fixture(mode); await client.executeSettingsWrite(f.command, f.version, undefined, f.fields); assert.equal(f.attempt().phase, 'uncertain'); assert.equal(f.seen.filter(r => r.method === 'PUT').length, 1) })
await check('uncertain result blocks another cell in same tenant', async () => { const f = fixture('network'); await client.executeSettingsWrite(f.command, f.version, undefined, f.fields); const field = 'login.subtitle'; await assert.rejects(client.executeSettingsWrite({ ...f.command, field, baseline: contract.settingsFieldBaseline(f.original, field) }, f.version, undefined, [field]), e => e.status === 409) })
for (const mode of ['echoPreflight', 'echoCommit']) await check(`${mode}: untrusted error metadata excluded`, async () => { const f = fixture(mode); await client.executeSettingsWrite(f.command, f.version, undefined, f.fields); assert.doesNotMatch(JSON.stringify(f.attempt()), /PRIVATE_|password|token|secret/); assert.equal(f.attempt().code, undefined); assert.equal(f.attempt().correlationId, undefined) })
await check('safe code and UUID only', async () => { const f = fixture('knownError'); await client.executeSettingsWrite(f.command, f.version, undefined, f.fields); assert.equal(f.attempt().code, 'E_VALIDATION'); assert.equal(f.attempt().correlationId, '550e8400-e29b-41d4-a716-446655440000'); assert.doesNotMatch(JSON.stringify(f.attempt()), /PRIVATE_/) })
await check('abort before request sends nothing', async () => { const f = fixture(), c = new AbortController(); c.abort(); await assert.rejects(client.executeSettingsWrite(f.command, f.version, c.signal, f.fields), e => e.name === 'AbortError'); assert.equal(f.seen.length, 0) })
for (const mode of ['abort', 'session']) await check(`${mode} during preflight prevents late dispatch`, async () => {
  const f = fixture(), c = new AbortController(); let complete
  dispatch = async (_url, options) => { f.seen.push({ method: options.method }); return new Promise(resolve => { complete = () => resolve(response(f.raw)) }) }
  const pending = client.executeSettingsWrite(f.command, f.version, c.signal, f.fields)
  if (mode === 'abort') c.abort(); else login(['READ_ONLY'])
  complete(); await pending; assert.deepEqual(f.seen.map(r => r.method), ['GET'])
})
await check('one explicit synthetic create/remove cycle restores semantic absence and unrelated cells', async () => {
  const f = fixture(); Object.assign(f.cell(), { stored: false, storedValue: null, effectiveValue: null, source: 'absent', version: null }); f.raw.data.settings.login.title = ''
  const original = contract.settingsFieldBaseline(read.parseSettingsRead(f.raw, f.id), 'login.title'), unrelated = JSON.stringify(f.raw.data.provenance.slice(1))
  await client.executeSettingsWrite({ ...f.command, baseline: original }, f.version, undefined, f.fields); assert.equal(f.attempt().phase, 'confirmed')
  client.beginNextSettingsWrite(f.id, 'login.title', f.version, f.fields)
  await client.executeSettingsReset({ ...f.command, baseline: contract.settingsFieldBaseline(read.parseSettingsRead(f.raw, f.id), 'login.title') }, f.version, undefined, f.fields)
  assert.equal(f.attempt().phase, 'confirmed'); assert.deepEqual(contract.settingsFieldBaseline(read.parseSettingsRead(f.raw, f.id), 'login.title'), original); assert.equal(JSON.stringify(f.raw.data.provenance.slice(1)), unrelated)
  assert.deepEqual(f.seen.filter(r => r.method !== 'GET').map(r => r.method), ['PUT', 'DELETE'])
})
await check('an exact stored string is restored byte-for-byte despite changed informational version', async () => {
  const f = fixture(), storedValue = '  Cafe\u0301  '; Object.assign(f.cell(), { storedValue, effectiveValue: storedValue }); f.raw.data.settings.login.title = storedValue
  await client.executeSettingsWrite({ ...f.command, baseline: contract.settingsFieldBaseline(read.parseSettingsRead(f.raw, f.id), 'login.title') }, f.version, undefined, f.fields); assert.equal(f.attempt().phase, 'confirmed')
  client.beginNextSettingsWrite(f.id, 'login.title', f.version, f.fields)
  await client.executeSettingsWrite({ ...f.command, baseline: contract.settingsFieldBaseline(read.parseSettingsRead(f.raw, f.id), 'login.title'), value: storedValue }, f.version, undefined, f.fields)
  assert.equal(f.attempt().phase, 'confirmed'); assert.equal(f.cell().storedValue, storedValue); assert.equal(f.seen.filter(r => r.method === 'PUT')[1].body.value, storedValue)
})
await check('only confirmed outcomes acknowledged for next explicit operation', async () => { const f = fixture(); await client.executeSettingsWrite(f.command, f.version, undefined, f.fields); client.beginNextSettingsWrite(f.id, f.command.field, f.version, f.fields); assert.equal(f.attempt(), null) })
await check('GET recovery can complete a previously valid receipt without resending', async () => { const f = fixture('getFailAfter'); await client.executeSettingsWrite(f.command, f.version, undefined, f.fields); assert.equal(f.attempt().phase, 'uncertain'); assert.equal(f.attempt().receiptConfirmed, true); f.state.mode = 'normal'; await client.reconcileSettingsWrite(f.id, f.command.field, f.version, f.fields); assert.equal(f.attempt().phase, 'confirmed'); assert.equal(f.seen.filter(r => r.method === 'PUT').length, 1) })
await check('row and reset receipts reject inconsistent identity/shape', () => { assert.throws(() => contract.parseSettingReceipt({ data: { id: 1, page: 'smtp', key: 'password', value: 'Expected' } }, 'login.title', 'Expected')); assert.throws(() => contract.parseSettingResetReceipt({ data: { deleted: true, page: 'login', key: 'title', stored: true, effectiveValue: null, source: 'absent', version: null } }, 'login.title')); assert.throws(() => contract.parseSettingResetReceipt({ data: { deleted: 'true', page: 'login', key: 'title', stored: false, effectiveValue: null, source: 'absent', version: null } }, 'login.title')) })
const { createElement: h } = await import(reactUrl), { renderToStaticMarkup: render } = await import(renderUrl)
globalThis.__settingsWriteAuth = auth
const uiAuth = 'export const useSessionOperator=()=>globalThis.__settingsWriteAuth.getOperator();export const getOperator=useSessionOperator;export const getAccessToken=()=>globalThis.__settingsWriteAuth.getAccessToken();export const getSessionVersion=()=>globalThis.__settingsWriteAuth.getSessionVersion();export const subscribeSession=()=>()=>{};export const handleUnauthorized=()=>{};'
const ui = await moduleLoader({ overrides: { 'src/lib/authSession.ts': uiAuth } })('src/features/whitelabel-settings/SettingsWriteEditor.tsx')
for (const roles of [['SUPER_ADMIN'], ['READ_ONLY'], ['SUPPORT_ADMIN'], []]) await check(`rendered scope/provenance/RBAC boundary ${roles}`, () => {
  const f = fixture(); login(roles); assert.equal(render(h(ui.SettingsWriteEditor, { id: f.id, data: f.original, onReload() {} })), '')
  const html = render(h(ui.SettingsWriteEditor, { id: f.id, data: f.original, onReload() {}, releasedFields: f.fields })); assert.equal(html.includes('Editar configuração'), roles.includes('SUPER_ADMIN')); assert.doesNotMatch(html, /RAW_PRIVATE|Publicar|password/)
  assert.equal(render(h(ui.SettingsWriteEditor, { id: '9', data: f.original, onReload() {}, releasedFields: f.fields })), ''); assert.equal(render(h(ui.SettingsWriteEditor, { id: f.id, data: { ...f.original, provenance: {} }, onReload() {}, releasedFields: f.fields })), '')
})
await check('guarded native dialog, reset and draft-preserving reload; no automatic resend/secret persistence', async () => {
  const editor = await readFile(resolve(root, 'src/features/whitelabel-settings/SettingsWriteEditor.tsx'), 'utf8'), source = await readFile(resolve(root, 'src/features/whitelabel-settings/settingsWriteClient.ts'), 'utf8')
  assert.match(editor, /useUnsavedChangesGuard\(pendingWrite/); assert.match(editor, /disabled=\{pendingWrite\}/); assert.match(editor, /executeSettingsReset/); assert.match(editor, /Recarregar referência e preservar rascunho/); assert.match(editor, /key=\{`\$\{id\}:\$\{version\}`\}/); assert.doesNotMatch(editor, /reload\.current\(\)/)
  assert.doesNotMatch(source, /localStorage|sessionStorage|setInterval|console\.|\/admin\/|\/internal\/|method: 'POST'|method: 'PATCH'|If-Match|expectedVersion/)
})
auth.clearSession()
console.log(`Settings write: ${checks} focused checks passed (synthetic transport only; no live mutation)`)
