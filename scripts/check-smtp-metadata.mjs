import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

// Current-source acceptance, separate from historical immutable read-contract checks.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), require = createRequire(import.meta.url), modules = new Map()
const dataModule = code => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
async function moduleUrl(path, forUi = false) {
  const cacheKey = `${forUi}:${path}`
  if (modules.has(cacheKey)) return modules.get(cacheKey)
  if (forUi && path === 'src/lib/authSession.ts') return dataModule('export const useSessionOperator=()=>globalThis.__smtpTestAuth.getOperator();export const getOperator=useSessionOperator;export const getAccessToken=()=>globalThis.__smtpTestAuth.getAccessToken();export const getSessionVersion=()=>globalThis.__smtpTestAuth.getSessionVersion();export const subscribeSession=fn=>globalThis.__smtpTestAuth.subscribeSession(fn);export const handleUnauthorized=(...args)=>globalThis.__smtpTestAuth.handleUnauthorized(...args);')
  if (path.endsWith('.css')) return dataModule('export default new Proxy({}, { get: (_, key) => String(key) })')
  let code = ts.transpileModule(await readFile(resolve(root, path), 'utf8'), { fileName: path, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } }).outputText.replaceAll('import.meta.env', '({DEV:false,VITE_API_BASE_URL:"https://control-plane.example.invalid/api"})')
  for (const m of [...code.matchAll(/from\s+(['"])([^'"]+)\1/g)]) {
    let target
    if (m[2].startsWith('.')) {
      const base = resolve(root, dirname(path), m[2]), absolute = base.endsWith('.css') ? base : existsSync(base + '.ts') ? base + '.ts' : base + '.tsx'
      target = await moduleUrl(absolute.slice(root.length + 1).replaceAll('\\', '/'), forUi)
    } else target = pathToFileURL(require.resolve(m[2])).href
    code = code.replace(m[0], `from ${JSON.stringify(target)}`)
  }
  const url = dataModule(code); modules.set(cacheKey, url); return url
}
const load = async path => import(await moduleUrl(path))
const storage = new Map()
globalThis.sessionStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) }
globalThis.window = { setTimeout, clearTimeout, location: { hash: '' }, matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }) }
globalThis.document = { hidden: false }
let dispatch = async () => assert.fail('Unexpected synthetic fetch')
globalThis.fetch = (...args) => dispatch(...args)
const read = await load('src/features/whitelabel-emails/smtpReadApi.ts'), contract = await load('src/features/whitelabel-emails/smtpWriteContract.ts'), client = await load('src/features/whitelabel-emails/smtpWriteClient.ts'), auth = await load('src/lib/authSession.ts')
const { createElement: h } = await import(pathToFileURL(require.resolve('react')).href), { renderToStaticMarkup: render } = await import(pathToFileURL(require.resolve('react-dom/server')).href)
globalThis.__smtpTestAuth = auth
const { SmtpMetadataEditor } = await import(await moduleUrl('src/features/whitelabel-emails/SmtpMetadataEditor.tsx', true))
let checks = 0, sequence = 81000
async function check(label, fn) { try { await fn(); checks++ } catch (cause) { throw Error(label, { cause }) } }
const response = (body, status = 200) => new Response(JSON.stringify(body), { status })
function login(roles = ['SUPER_ADMIN']) { auth.persistSession({ accessToken: 'synthetic-smtp-test-only', tokenType: 'Bearer', operator: { id: 'qa', name: 'Synthetic', email: 'qa@example.invalid', roles } }); return auth.getSessionVersion() }
function rawSmtp(id = 7) { return { data: { id: 6, whitelabelId: id, host: 'smtp.qa.example.invalid', port: 587, secure: 0, hasUsername: true, hasPassword: true, configured: true, active: 1, fromEmail: 'sender@qa.example.invalid', fromName: '  Original QA name  ', tlsRejectUnauthorized: true, version: '6:original', createdAt: '2026-10-26T13:00:00Z', updatedAt: '2026-10-26T13:00:00Z' } } }
function fixture(mode = 'normal') {
  const id = String(++sequence), session = login(), raw = rawSmtp(Number(id)), baseline = read.parseSmtpRead(raw, id), seen = [], state = { mode }
  dispatch = async (url, options) => {
    const body = options.body ? JSON.parse(options.body) : undefined
    seen.push({ url, method: options.method, body, headers: options.headers })
    if (options.method === 'GET') {
      if (state.mode === 'stale') return response({ data: { ...raw.data, version: '6:concurrent' } })
      if (state.mode === 'missing') return response({ data: null })
      if (state.mode === 'getFailure' && seen.some(r => r.method === 'PATCH')) return response({}, 502)
      return response(raw)
    }
    assert.equal(options.method, 'PATCH')
    assert.deepEqual(Object.keys(body), ['fromName'])
    if (state.mode === '422') return response({ code: 'E_VALIDATION', message: 'PRIVATE_ECHO', correlationId: 'PRIVATE_ECHO' }, 422)
    if (state.mode === 'networkUnchanged') throw TypeError('Synthetic disconnected')
    Object.assign(raw.data, body, { version: '6:changed', updatedAt: '2026-10-26T13:01:00Z' })
    if (state.mode === 'unrelatedChanged') raw.data.host = 'other.qa.example.invalid'
    if (state.mode === '500commit') return response({ message: 'PRIVATE_ECHO', correlationId: 'PRIVATE_ECHO' }, 500)
    if (state.mode === 'networkCommit') throw TypeError('Synthetic after commit')
    if (state.mode === 'malformed') return response({ data: { ...raw.data, username: 'PRIVATE_ECHO' } })
    if (state.mode === '201') return response(raw, 201)
    if (state.mode === 'replaceSession') login(['READ_ONLY'])
    return response(raw)
  }
  return { id, session, raw, baseline, seen, state, command: { tenantId: id, baseline, changes: { fromName: 'QA temporary' } }, attempt: () => client.getSmtpWriteAttempt(id, session) }
}
await check('safe completion DTO includes flags/version and exact original sender string', () => {
  const parsed = read.parseSmtpRead(rawSmtp(), '7')
  assert.equal(parsed.hasUsername, true); assert.equal(parsed.version, '6:original'); assert.equal(parsed.fromName, '  Original QA name  '); assert.equal(parsed.secure, false); assert.equal(parsed.active, true)
})
await check('safe server metadata is not silently normalized into a different baseline', () => {
  for (const field of ['host', 'fromEmail']) {
    const raw = rawSmtp(); raw.data[field] = ` ${raw.data[field]} `
    assert.throws(() => read.parseSmtpRead(raw, '7'), error => error.kind === 'malformed')
  }
})
for (const key of ['username', 'password', 'replaceUsername', 'replacePassword', 'credentials', 'token']) await check(`unexpected ${key} rejects without reading credential`, () => {
  const raw = rawSmtp(); Object.defineProperty(raw.data, key, { enumerable: true, get() { throw Error('Credential was accessed') } })
  assert.throws(() => read.parseSmtpRead(raw, '7'), error => error.kind === 'malformed')
})
for (const field of ['hasUsername', 'hasPassword', 'configured']) for (const value of [undefined, null, 0, 1, 'true']) await check(`strict presence flag ${field}/${value}`, () => {
  const raw = rawSmtp(); raw.data[field] = value; assert.throws(() => read.parseSmtpRead(raw, '7'), error => error.kind === 'malformed')
})
for (const value of [undefined, null, '', 1, 'Bearer synthetic-token', 'bad\u0000version']) await check(`invalid informational version ${value}`, () => {
  const raw = rawSmtp(); raw.data.version = value; assert.throws(() => read.parseSmtpRead(raw, '7'), error => error.kind === 'malformed')
})
await check('configured needs both reported credential-presence flags', () => {
  const raw = rawSmtp(); raw.data.hasUsername = false; assert.throws(() => read.parseSmtpRead(raw, '7'))
  raw.data.configured = false; assert.equal(read.parseSmtpRead(raw, '7').hasUsername, false)
})
await check('only changed metadata keys form PATCH; null clears fromName explicitly', () => {
  const baseline = read.parseSmtpRead(rawSmtp(), '7')
  assert.deepEqual(contract.smtpChanges(baseline, { ...contract.smtpMetadata(baseline), fromName: null }), { fromName: null })
  assert.deepEqual(contract.smtpChanges(baseline, { ...contract.smtpMetadata(baseline), active: false, port: 465 }), { port: 465, active: false })
  assert.throws(() => contract.smtpChanges(baseline, contract.smtpMetadata(baseline)), error => error.code === 'SMTP_NO_CHANGE')
})
for (const field of ['username', 'password', 'replaceUsername', 'replacePassword', 'version', 'configured', 'whitelabelId', 'id', 'unknown']) await check(`PATCH rejects ${field}`, () => {
  const baseline = read.parseSmtpRead(rawSmtp(), '7'); assert.throws(() => contract.smtpPatch({ tenantId: '7', baseline, changes: { [field]: 'forbidden' } }))
})
for (const [field, values] of Object.entries({ port: [null, '587', 0, 65536, 5.5], secure: [null, 0, 'false'], active: [null, 1], tlsRejectUnauthorized: [null, 'true'], fromName: [undefined, {}, '<b>QA</b>', 'bad\u0000name', 'Bearer synthetic', 'x'.repeat(257)], fromEmail: [null, 'invalid', 'a@localhost'], host: [null, 'host/path', 'user@host.invalid'] })) for (const value of values) await check(`invalid ${field} cannot dispatch`, () => {
  const baseline = read.parseSmtpRead(rawSmtp(), '7'); assert.throws(() => contract.smtpPatch({ tenantId: '7', baseline, changes: { [field]: value } }))
})
for (const value of [null, '', '  Original QA name  ', 'Café']) await check('sender restoration preserves exact string/null', () => {
  const baseline = read.parseSmtpRead(rawSmtp(), '7'); assert.equal(contract.validSmtpMetadataField('fromName', value), true)
  if (value !== baseline.fromName) assert.equal(contract.smtpPatch({ tenantId: '7', baseline, changes: { fromName: value } }).fromName, value)
})
await check('one PATCH only, authenticated preflight/readback and no fabricated version precondition', async () => {
  const f = fixture(); await client.executeSmtpWrite(f.command, f.session)
  assert.equal(f.attempt().phase, 'confirmed'); assert.deepEqual(f.seen.map(r => r.method), ['GET', 'PATCH', 'GET'])
  assert.deepEqual(f.seen[1].body, { fromName: 'QA temporary' }); assert.equal(f.seen[1].url, `https://control-plane.example.invalid/api/whitelabels/${f.id}/emails/smtp`)
  assert.equal(f.seen[1].headers.Authorization, 'Bearer synthetic-smtp-test-only'); assert.equal(f.seen[1].headers['If-Match'], undefined)
  await assert.rejects(client.executeSmtpWrite(f.command, f.session), error => error.code === 'SMTP_ATTEMPT_LOCKED')
  assert.equal(f.seen.filter(r => r.method === 'PATCH').length, 1)
  assert.doesNotMatch(JSON.stringify(f.attempt()), /Original QA|QA temporary|PRIVATE_ECHO|smtp\.qa|sender@/)
})
for (const mode of ['stale', 'missing']) await check(`${mode} preflight prevents PATCH`, async () => {
  const f = fixture(mode); await client.executeSmtpWrite(f.command, f.session); assert.equal(f.attempt().phase, 'stale'); assert.deepEqual(f.seen.map(r => r.method), ['GET'])
})
for (const roles of [['READ_ONLY'], ['SUPPORT_ADMIN'], ['super_admin'], []]) await check(`write denied before fetch ${roles}`, async () => {
  const f = fixture(), session = login(roles); await assert.rejects(client.executeSmtpWrite(f.command, session), error => error.status === 403); assert.equal(f.seen.length, 0)
  assert.equal(render(h(SmtpMetadataEditor, { id: f.id, data: f.baseline, onReload() {} })), '')
})
await check('SUPER_ADMIN sees metadata editor only for matching existing tenant', () => {
  const f = fixture(); const html = render(h(SmtpMetadataEditor, { id: f.id, data: f.baseline, onReload() {} }))
  assert.match(html, /Editar metadados SMTP/); assert.doesNotMatch(html, /Trocar senha|Enviar teste|<input/)
  assert.equal(render(h(SmtpMetadataEditor, { id: '7', data: f.baseline, onReload() {} })), '')
})
for (const mode of ['500commit', 'networkCommit', 'malformed', '201']) await check(`${mode} matching readback is distinguished from confirmed HTTP receipt`, async () => {
  const f = fixture(mode); await client.executeSmtpWrite(f.command, f.session); assert.equal(f.attempt().phase, 'readback_matches'); assert.equal(f.seen.filter(r => r.method === 'PATCH').length, 1)
  assert.doesNotMatch(JSON.stringify(f.attempt()), /PRIVATE_ECHO/)
  await client.reconcileSmtpWrite(f.id, f.session); assert.equal(f.seen.filter(r => r.method === 'PATCH').length, 1)
  assert.equal(client.smtpWriteVerified(f.attempt()), false); assert.equal(client.smtpWriteLocked(f.attempt()), true)
  assert.throws(() => client.beginNextSmtpWrite(f.id, f.session), error => error.code === 'SMTP_ATTEMPT_LOCKED')
  await assert.rejects(client.executeSmtpWrite(f.command, f.session), error => error.code === 'SMTP_ATTEMPT_LOCKED')
})
for (const mode of ['networkUnchanged', 'unrelatedChanged', 'getFailure', 'replaceSession']) await check(`${mode} remains uncertain without dependent write`, async () => {
  const f = fixture(mode); await client.executeSmtpWrite(f.command, f.session); assert.equal(f.attempt().phase, 'uncertain')
  if (mode !== 'replaceSession') { await client.reconcileSmtpWrite(f.id, f.session); assert.equal(f.attempt().phase, 'uncertain'); assert.throws(() => client.beginNextSmtpWrite(f.id, f.session)) }
  assert.equal(f.seen.filter(r => r.method === 'PATCH').length, 1)
})
await check('known validation response rejects with no automatic read/write retry', async () => {
  const f = fixture('422'); await client.executeSmtpWrite(f.command, f.session); assert.equal(f.attempt().phase, 'rejected'); assert.deepEqual(f.seen.map(r => r.method), ['GET', 'PATCH']); assert.doesNotMatch(JSON.stringify(f.attempt()), /PRIVATE_ECHO/)
})
await check('duplicate in-flight submission cannot dispatch twice', async () => {
  const f = fixture(); let finish
  dispatch = () => new Promise(resolve => { finish = resolve })
  const pending = client.executeSmtpWrite(f.command, f.session)
  await assert.rejects(client.executeSmtpWrite(f.command, f.session), error => error.code === 'SMTP_ATTEMPT_LOCKED')
  finish(response({ data: null })); await pending; assert.equal(f.attempt().phase, 'stale')
})
await check('abort and session replacement during preflight never dispatch a late PATCH', async () => {
  for (const mode of ['abort', 'session']) {
    const f = fixture(), controller = new AbortController(); let finish
    dispatch = (_url, options) => { f.seen.push({ method: options.method }); return new Promise(resolve => { finish = resolve }) }
    const pending = client.executeSmtpWrite(f.command, f.session, controller.signal)
    if (mode === 'abort') controller.abort(); else login(['SUPER_ADMIN'])
    finish(response(f.raw)); await pending; assert.deepEqual(f.seen.map(r => r.method), ['GET'])
  }
})
await check('authoritative 401 clears session, retains unknown outcome and never retries', async () => {
  const f = fixture()
  dispatch = async (_url, options) => { f.seen.push({ method: options.method }); return options.method === 'PATCH' ? response({}, 401) : response(f.raw) }
  await client.executeSmtpWrite(f.command, f.session); assert.equal(auth.getAccessToken(), null); assert.equal(f.attempt().phase, 'uncertain'); assert.deepEqual(f.seen.map(r => r.method), ['GET', 'PATCH'])
})
await check('write timeout with unchanged GET remains uncertain, locked and not retried', async () => {
  const f = fixture()
  window.setTimeout = fn => setTimeout(fn, 5)
  dispatch = async (_url, options) => {
    f.seen.push({ method: options.method })
    if (options.method === 'GET') return response(f.raw)
    return new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('timeout', 'AbortError')), { once: true }))
  }
  try {
    await client.executeSmtpWrite(f.command, f.session); assert.equal(f.attempt().phase, 'uncertain'); assert.equal(f.attempt().status, 0)
    await assert.rejects(client.executeSmtpWrite(f.command, f.session), error => error.code === 'SMTP_ATTEMPT_LOCKED'); assert.equal(f.seen.filter(r => r.method === 'PATCH').length, 1)
  } finally { window.setTimeout = setTimeout }
})
await check('new SUPER_ADMIN session can only explicitly GET-reconcile the original resource', async () => {
  const f = fixture('replaceSession'); await client.executeSmtpWrite(f.command, f.session)
  const session = login(['SUPER_ADMIN'])
  assert.equal(client.getSmtpWriteAttempt(f.id, session).phase, 'uncertain')
  await assert.rejects(client.executeSmtpWrite(f.command, session), error => error.code === 'SMTP_ATTEMPT_LOCKED')
  await client.reconcileSmtpWrite(f.id, session)
  assert.equal(client.getSmtpWriteAttempt(f.id, session).phase, 'readback_matches'); assert.equal(f.seen.filter(r => r.method === 'PATCH').length, 1)
})
await check('explicit new action follows verified GET only, and restoration is a separate exact PATCH', async () => {
  const f = fixture(); await client.executeSmtpWrite(f.command, f.session); client.beginNextSmtpWrite(f.id, f.session)
  const baseline = read.parseSmtpRead(f.raw, f.id)
  dispatch = async (_url, options) => { f.seen.push({ method: options.method, body: options.body && JSON.parse(options.body) }); if (options.method === 'PATCH') Object.assign(f.raw.data, JSON.parse(options.body)); return response(f.raw) }
  await client.executeSmtpWrite({ tenantId: f.id, baseline, changes: { fromName: f.baseline.fromName } }, f.session)
  assert.equal(f.raw.data.fromName, '  Original QA name  '); assert.equal(f.attempt().phase, 'confirmed')
  assert.equal(f.seen.filter(r => r.method === 'PATCH').length, 2)
})
await check('rebase preserves concurrent untouched host and sends only the operator-edited fromName', () => {
  const baseline = read.parseSmtpRead(rawSmtp(), '7'), draft = { ...contract.smtpMetadata(baseline), fromName: 'Operator draft' }
  const fresh = { ...baseline, host: 'concurrent.qa.example.invalid', port: 465, version: '6:concurrent' }
  const rebased = contract.rebaseSmtpDraft(baseline, draft, fresh)
  assert.equal(rebased.draft.host, fresh.host); assert.equal(rebased.draft.port, fresh.port); assert.equal(rebased.draft.fromName, 'Operator draft'); assert.deepEqual(rebased.conflicts, [])
  assert.deepEqual(contract.smtpChanges(fresh, rebased.draft), { fromName: 'Operator draft' })
})
await check('conflicting server change to the edited fromName is explicitly identified without dropping the draft', () => {
  const baseline = read.parseSmtpRead(rawSmtp(), '7'), draft = { ...contract.smtpMetadata(baseline), fromName: 'Operator draft' }, fresh = { ...baseline, fromName: 'Concurrent name', version: '6:concurrent' }
  const rebased = contract.rebaseSmtpDraft(baseline, draft, fresh)
  assert.equal(rebased.draft.fromName, 'Operator draft'); assert.deepEqual(rebased.conflicts, ['fromName'])
  const alreadyDesired = contract.rebaseSmtpDraft(baseline, draft, { ...fresh, fromName: 'Operator draft' })
  assert.deepEqual(alreadyDesired.conflicts, []); assert.throws(() => contract.smtpChanges({ ...fresh, fromName: 'Operator draft' }, alreadyDesired.draft), error => error.code === 'SMTP_NO_CHANGE')
  assert.throws(() => contract.rebaseSmtpDraft(baseline, draft, { ...fresh, tenantId: '8' }))
})
await check('current UI uses native guarded dialogs and no credential/send/create fallback', async () => {
  const editor = await readFile(resolve(root, 'src/features/whitelabel-emails/SmtpMetadataEditor.tsx'), 'utf8'), source = await readFile(resolve(root, 'src/features/whitelabel-emails/smtpWriteClient.ts'), 'utf8')
  assert.match(editor, /useUnsavedChangesGuard/); assert.match(editor, /Atualizar leitura, manter rascunho/); assert.match(editor, /getSessionVersion/); assert.match(editor, /key=\{`\$\{id\}:\$\{session\}`\}/)
  assert.doesNotMatch(editor, /useEffect\([^\n]*(?:onReload|reload\.current)/)
  assert.match(editor, /rebaseSmtpDraft\(baseline, draft, fresh\)/)
  assert.match(editor, /conflicts\.length > 0 && !conflictsReviewed/)
  assert.match(editor, /Revisei os valores atuais e confirmo somente minhas alterações/)
  assert.doesNotMatch(source, /method:\s*['"](?:POST|PUT|DELETE)['"]|\/test|replaceUsername|replacePassword|If-Match|expectedVersion|setInterval/)
})
auth.clearSession()
console.log(`SMTP metadata: ${checks} current-source contract, safety, rendered authorization and synthetic transport checks passed; zero live requests`)
