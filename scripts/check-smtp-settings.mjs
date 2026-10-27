import assert from 'node:assert/strict'
import { readFile } from './reviewed-consolidation-boundary.mjs'
import { resolve } from 'node:path'
import { moduleLoader, root, reactUrl, renderUrl } from './operators-test-harness.mjs'

const { createElement: h } = await import(reactUrl)
const { renderToStaticMarkup: render } = await import(renderUrl)
const storage = new Map()
globalThis.sessionStorage = { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) }
globalThis.window = { setTimeout, clearTimeout, location: { hash: '' }, matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }) }
globalThis.document = { hidden: false }
let requests = 0, request = async () => assert.fail('Unexpected synthetic request')
globalThis.fetch = (...args) => { requests++; return request(...args) }
const load = moduleLoader()
const api = await load('src/features/whitelabel-emails/smtpReadApi.ts')
const auth = await load('src/lib/authSession.ts')
const { ApiError } = await load('src/lib/api.ts')
const { SmtpReadCards, SmtpReadFeedback } = await load('src/features/whitelabel-emails/OperationalSmtpPage.tsx')
const fixture = () => ({ data: { id: 12, whitelabelId: 6, host: 'smtp.qa.example.invalid', port: 587, secure: false, hasUsername: true, hasPassword: true, configured: true, active: false, fromEmail: 'sender@qa.example.invalid', fromName: 'Synthetic QA sender', tlsRejectUnauthorized: true, version: '12:2026-10-26T13:15:00.000Z', createdAt: '2026-10-25T13:15:00.000Z', updatedAt: null } })
const response = (body, status = 200) => new Response(JSON.stringify(body), { status })
const session = (roles = ['SUPER_ADMIN']) => auth.persistSession({ accessToken: 'synthetic-only-token', tokenType: 'Bearer', operator: { id: 'synthetic-operator', name: 'QA', email: 'qa@example.invalid', roles } })
const malformed = error => error.kind === 'malformed'
let checks = 0
async function check(label, fn) { try { await fn(); checks++ } catch (cause) { throw Error(label, { cause }) } }

await check('safe projection distinguishes complete credentials and inactive server', () => {
  const parsed = api.parseSmtpRead(fixture(), '6')
  assert.equal(parsed.state, 'saved'); assert.equal(parsed.tenantId, '6'); assert.equal(parsed.id, '12')
  assert.equal(parsed.configured, true); assert.equal(parsed.hasUsername, true); assert.equal(parsed.hasPassword, true); assert.equal(parsed.active, false); assert.equal(parsed.version, fixture().data.version)
  assert.equal(parsed.secure, false); assert.equal(parsed.port, 587); assert.equal(parsed.updatedAt, null)
  assert.doesNotMatch(JSON.stringify(parsed), /PRIVATE_CREDENTIAL_SENTINEL|"username"|"password"|"auth"/)
})
await check('unexpected username is rejected without reading its value', () => {
  const raw = fixture()
  Object.defineProperty(raw.data, 'username', { enumerable: true, get() { throw new Error('Credential value was accessed') } })
  assert.throws(() => api.parseSmtpRead(raw, '6'), malformed)
})
await check('unrelated unknown fields never enter the safe projection', () => {
  const raw = fixture(); raw.data.extra = { credentials: 'PRIVATE_CREDENTIAL_SENTINEL' }; raw.metadata = { token: 'PRIVATE_CREDENTIAL_SENTINEL' }
  assert.doesNotMatch(JSON.stringify(api.parseSmtpRead(raw, '6')), /PRIVATE_CREDENTIAL_SENTINEL|extra|metadata|username/)
})
await check('unexpected response password rejects without accessing its value', () => {
  const raw = fixture()
  Object.defineProperty(raw.data, 'password', { enumerable: true, get() { throw new Error('Unexpected secret was accessed') } })
  assert.throws(() => api.parseSmtpRead(raw, '6'), malformed)
})
await check('authoritative no-config remains distinct from malformed and unavailable', () => {
  assert.deepEqual(api.parseSmtpRead({ data: null }, '6'), { state: 'missing', tenantId: '6' })
  for (const raw of [null, [], {}, { data: undefined }, { data: [] }, { data: {} }]) assert.throws(() => api.parseSmtpRead(raw, '6'), malformed)
})
for (const id of ['0', '00', '06', '-6', '+6', '6.0', '6e0', 'select', 'wl_proto_01', '', '6/../7', '9007199254740992', null]) await check(`noncanonical tenant rejected: ${id}`, async () => {
  assert.equal(api.isSmtpTenantId(id), false)
  const before = requests; await assert.rejects(api.getSmtpRead(id), error => error.status === 404); assert.equal(requests, before)
})
for (const id of ['1', '6', '999', '9007199254740991']) await check(`canonical tenant accepted: ${id}`, () => assert.equal(api.isSmtpTenantId(id), true))
for (const value of [7, '6', 0, -6, 6.5, null, undefined, Number.MAX_SAFE_INTEGER + 1]) await check('tenant mismatch or wrong type is not rendered', () => {
  const raw = fixture(); raw.data.whitelabelId = value; assert.throws(() => api.parseSmtpRead(raw, '6'), malformed)
})
for (const value of ['12', 0, -1, 12.5, null, undefined, Number.MAX_SAFE_INTEGER + 1]) await check('configuration ID is a strict positive safe integer', () => {
  const raw = fixture(); raw.data.id = value; assert.throws(() => api.parseSmtpRead(raw, '6'), malformed)
})
for (const field of ['secure', 'hasUsername', 'hasPassword', 'configured', 'active', 'tlsRejectUnauthorized']) {
  const stored = ['secure', 'active', 'tlsRejectUnauthorized'].includes(field)
  for (const value of stored ? [0, 1] : []) await check(`${field} accepts live Core database boolean`, () => {
    const raw = fixture(); raw.data[field] = value; assert.equal(api.parseSmtpRead(raw, '6')[field], value === 1)
  })
  for (const value of ['false', ...(stored ? [2, -1] : [0, 1]), null, undefined, []]) await check(`${field} does not coerce ambiguous booleans`, () => {
    const raw = fixture(); raw.data[field] = value; assert.throws(() => api.parseSmtpRead(raw, '6'), malformed)
  })
}
await check('configured cannot claim a complete config without the reported credential', () => {
  const raw = fixture(); raw.data.hasPassword = false; assert.throws(() => api.parseSmtpRead(raw, '6'), malformed)
  raw.data.configured = false; assert.equal(api.parseSmtpRead(raw, '6').configured, false)
})
for (const value of [0, 65536, 587.5, '587', null, undefined, NaN, Infinity]) await check('port must be within numeric transport bounds', () => {
  const raw = fixture(); raw.data.port = value; assert.throws(() => api.parseSmtpRead(raw, '6'), malformed)
})
for (const value of [1, 465, 587, 65535]) await check('valid numeric port preserved', () => {
  const raw = fixture(); raw.data.port = value; assert.equal(api.parseSmtpRead(raw, '6').port, value)
})
for (const host of ['', 'smtp://qa.invalid', 'user@host.invalid', 'host.invalid/path', 'host.invalid?password=x', 'host.invalid#fragment', 'host.invalid:587', 'host.invalid\\path', 'Bearer synthetic-only', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJxYSJ9.signature', 'x'.repeat(257), null]) await check('invalid or credential-like host rejected', () => {
  const raw = fixture(); raw.data.host = host; assert.throws(() => api.parseSmtpRead(raw, '6'), malformed)
})
for (const email of ['', 'sender', 'sender@localhost', 'two@@qa.invalid', 'x<script>@qa.invalid', 'Bearer synthetic-only', 'x'.repeat(257), null]) await check('sender must be safe bounded email metadata', () => {
  const raw = fixture(); raw.data.fromEmail = email; assert.throws(() => api.parseSmtpRead(raw, '6'), malformed)
})
for (const value of [null, '', 'Synthetic sender']) await check('nullable and empty sender names remain explicit', () => {
  const raw = fixture(); raw.data.fromName = value; assert.equal(api.parseSmtpRead(raw, '6').fromName, value)
})
for (const value of [undefined, {}, 'Bearer synthetic-only', 'bad\u0000name', 'x'.repeat(257)]) await check('malformed sender name rejected', () => {
  const raw = fixture(); raw.data.fromName = value; assert.throws(() => api.parseSmtpRead(raw, '6'), malformed)
})
for (const field of ['createdAt', 'updatedAt']) {
  for (const value of [null, '2024-02-29T12:00:00Z', '2026-10-25T12:00:00.000-03:00']) await check('valid ISO date or null preserved', () => {
    const raw = fixture(); raw.data[field] = value; assert.equal(api.parseSmtpRead(raw, '6')[field], value)
  })
  for (const value of [undefined, '', 1, 'bad', '2026-02-29T00:00:00Z', '2026-02-30T00:00:00Z', '2026-13-01T00:00:00Z', '2026-10-25T24:00:00Z', '2026-10-25T00:60:00Z', '2026-10-25T00:00:60Z', '2026-10-25T00:00:00+24:00', '2026-10-25', '2026-10-25T00:00:00']) await check('malformed/invalid calendar date rejected', () => {
    const raw = fixture(); raw.data[field] = value; assert.throws(() => api.parseSmtpRead(raw, '6'), malformed)
  })
}
for (const key of ['username', 'password', 'replaceUsername', 'replacePassword', 'passwordHash', 'password_hash', 'credentials', 'authorization', 'auth', 'apiKey', 'api_key', 'clientSecret', 'client_secret', 'accessToken', 'refresh_token', 'token']) await check('unexpected known secret field cannot enter state', () => {
  const raw = fixture(); raw.data[key] = 'PRIVATE_CREDENTIAL_SENTINEL'; assert.throws(() => api.parseSmtpRead(raw, '6'), malformed)
})
for (const roles of [['SUPER_ADMIN'], ['READ_ONLY'], ['SUPER_ADMIN', 'READ_ONLY'], ['SUPPORT_ADMIN'], ['COMPLIANCE_ADMIN'], ['FINANCIAL_ADMIN'], [], ['super_admin']]) await check(`read role authorization ${roles}`, async () => {
  const allowed = roles.some(role => ['SUPER_ADMIN', 'READ_ONLY'].includes(role))
  assert.equal(api.canReadSmtp(roles), allowed); session(roles)
  request = async () => response(fixture())
  const before = requests
  if (allowed) assert.equal((await api.getSmtpRead('6')).state, 'saved')
  else { await assert.rejects(api.getSmtpRead('6'), error => error.status === 403); assert.equal(requests, before) }
})
await check('request uses canonical GET/correlation/abort with no write body', async () => {
  session(); const controller = new AbortController(); let seen
  request = async (url, options) => { seen = { url, options }; return response(fixture()) }
  await api.getSmtpRead('6', controller.signal)
  assert.equal(seen.url, 'https://control-plane.example.invalid/api/whitelabels/6/emails/smtp')
  assert.equal(seen.options.method, 'GET'); assert.equal(seen.options.body, undefined)
  assert.equal(seen.options.headers.Authorization, 'Bearer synthetic-only-token')
  assert.match(seen.options.headers['X-Correlation-ID'], /^[a-f0-9-]{36}$/); assert.ok(seen.options.signal)
})
for (const status of [401, 403, 404, 422, 429, 500, 502]) await check(`HTTP ${status} remains isolated and safe, without automatic retry`, async () => {
  session(); const before = requests; request = async () => response({ message: 'PRIVATE_CREDENTIAL_SENTINEL' }, status)
  const error = await api.getSmtpRead('6').catch(error => error)
  assert.equal(error.status, status); assert.equal(requests, before + 1)
  assert.doesNotMatch(error.message, /PRIVATE_CREDENTIAL_SENTINEL/)
  assert.equal(!!auth.getAccessToken(), status !== 401)
  const html = render(h(SmtpReadFeedback, { error, retry() {} }))
  assert.doesNotMatch(html, /PRIVATE_CREDENTIAL_SENTINEL|sender@qa|Configuração completa conforme API/)
})
await check('error metadata cannot retain echoed credentials; canonical correlation survives', async () => {
  session(); request = async () => response({ message: 'PRIVATE_CREDENTIAL_SENTINEL', code: 'PRIVATE_CREDENTIAL_SENTINEL', correlationId: 'PRIVATE_CREDENTIAL_SENTINEL' }, 500)
  const unsafe = await api.getSmtpRead('6').catch(error => error)
  assert.doesNotMatch(JSON.stringify(unsafe), /PRIVATE_CREDENTIAL_SENTINEL/)
  assert.doesNotMatch(render(h(SmtpReadFeedback, { error: new ApiError(500, { correlationId: 'PRIVATE_CREDENTIAL_SENTINEL' }), retry() {} })), /PRIVATE_CREDENTIAL_SENTINEL/)
  const correlationId = 'aaaabbbb-cccc-dddd-eeee-ffff00001111'
  request = async () => response({ correlationId }, 500)
  const safe = await api.getSmtpRead('6').catch(error => error)
  assert.equal(safe.correlationId, correlationId); assert.ok(render(h(SmtpReadFeedback, { error: safe, retry() {} })).includes(correlationId))
})
await check('session replacement cancels successful late read', async () => {
  session(); let finish
  request = () => new Promise(resolve => { finish = resolve })
  const pending = api.getSmtpRead('6'); session(['READ_ONLY']); finish(response(fixture()))
  await assert.rejects(pending, error => error.name === 'AbortError')
})
await check('network failure is not reported as missing config; retry is explicit', async () => {
  session(); const before = requests; request = async () => { throw TypeError('PRIVATE_CREDENTIAL_SENTINEL') }
  const error = await api.getSmtpRead('6').catch(error => error)
  assert.equal(error.kind, 'network'); assert.equal(requests, before + 1)
  const html = render(h(SmtpReadFeedback, { error, retry() {} }))
  assert.ok(html.includes('Tentar novamente')); assert.doesNotMatch(html, /PRIVATE_CREDENTIAL_SENTINEL|Sem configuração própria/)
  request = async () => response({ data: null }); assert.equal((await api.getSmtpRead('6')).state, 'missing')
})
await check('timeout is bounded; no implicit second request', async () => {
  session(); const before = requests
  window.setTimeout = fn => setTimeout(fn, 5)
  request = (_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('timeout', 'AbortError')), { once: true }))
  try { await assert.rejects(api.getSmtpRead('6'), error => error.kind === 'timeout'); assert.equal(requests, before + 1) }
  finally { window.setTimeout = setTimeout }
})
await check('caller cancellation is not a retryable timeout or success', async () => {
  session(); const controller = new AbortController()
  request = (_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('cancel', 'AbortError')), { once: true }))
  const pending = api.getSmtpRead('6', controller.signal); controller.abort()
  await assert.rejects(pending, error => error.name === 'AbortError')
})
await check('saved metadata renders safely and never offers credential/edit/test controls', () => {
  const parsed = api.parseSmtpRead(fixture(), '6'), html = render(h(SmtpReadCards, { data: parsed }))
  assert.ok(html.includes('smtp.qa.example.invalid')); assert.ok(html.includes('sender@qa.example.invalid')); assert.ok(html.includes('587'))
  assert.ok(html.includes('Configuração completa conforme API')); assert.ok(html.includes('Servidor próprio ativo')); assert.ok(html.includes('Credencial configurada conforme API'))
  assert.ok(html.includes('não comprova validade ou entrega')); assert.ok(html.includes('envia uma mensagem real'))
  assert.doesNotMatch(html, /PRIVATE_CREDENTIAL_SENTINEL|username|password|<input|<textarea|<form|Salvar|Enviar teste|Testar SMTP/)
  assert.ok(html.includes('aria-labelledby="smtp-state-title"'))
})
await check('missing metadata never implies delivery validated or inherited config fetched', () => {
  const html = render(h(SmtpReadCards, { data: { state: 'missing', tenantId: '6' } }))
  assert.ok(html.includes('Sem configuração própria')); assert.ok(html.includes('podem usar o envio global'))
  assert.ok(html.includes('não comprova entrega ou a configuração global')); assert.doesNotMatch(html, /<input|Salvar|Envio validado/)
})
await check('safe UI errors only; retry available for malformed/network/timeout', () => {
  for (const kind of ['malformed', 'network', 'timeout']) {
    const html = render(h(SmtpReadFeedback, { error: new ApiError(0, { message: 'PRIVATE_CREDENTIAL_SENTINEL' }, { kind }), retry() {} }))
    assert.ok(html.includes('Tentar novamente')); assert.doesNotMatch(html, /PRIVATE_CREDENTIAL_SENTINEL/)
  }
})
await check('session/tenant hook and authorized tenant detail gate avoid stale data', async () => {
  const hook = await readFile(resolve(root, 'src/features/whitelabel-emails/useSmtpRead.ts'), 'utf8')
  const page = await readFile(resolve(root, 'src/features/whitelabel-emails/OperationalSmtpPage.tsx'), 'utf8')
  assert.match(hook, /smtp:\$\{session\}:\$\{id\}/); assert.match(hook, /allowed && id && isSmtpTenantId/)
  assert.match(page, /useWhitelabelRecord\(id\)/); assert.match(page, /ConfirmedSmtp key=\{id\}/); assert.match(page, /SmtpTenant key=\{session\}/)
  assert.doesNotMatch(hook + page, /lastData|sessionStorage|localStorage|setInterval|dangerouslySetInnerHTML|prototypeEmails|prototypeStore/)
})
await check('operational SMTP unit has no business write transport or credential field access', async () => {
  const paths = ['smtpReadApi.ts', 'useSmtpRead.ts', 'OperationalSmtpPage.tsx']
  for (const path of paths) {
    const source = await readFile(resolve(root, 'src/features/whitelabel-emails', path), 'utf8')
    assert.doesNotMatch(source, /method\s*:\s*['"](?:POST|PUT|PATCH|DELETE)['"]|apiRequest\(|console\.|\b(?:row|data|raw|config)\.(?:username|password)\b|\[['"](?:username|password)['"]\]/)
  }
})

auth.clearSession()
console.log(`SMTP settings: ${checks} focused checks passed (synthetic GET transport and rendered projection; no live request or write)`)
