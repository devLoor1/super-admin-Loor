import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

// Isolated synthetic transport. No live identity, mail or API call is used.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), require = createRequire(import.meta.url), modules = new Map()
const dataModule = code => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
async function moduleUrl(path) {
  if (modules.has(path)) return modules.get(path)
  let code = ts.transpileModule(await readFile(resolve(root, path), 'utf8'), { fileName: path, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } }).outputText.replaceAll('import.meta.env', '({DEV:false,VITE_API_BASE_URL:"https://control-plane.example.invalid/api"})')
  for (const match of [...code.matchAll(/from\s+(['"])([^'"]+)\1/g)]) {
    let target
    if (match[2].startsWith('.')) { const base = resolve(root, dirname(path), match[2]), absolute = existsSync(base + '.ts') ? base + '.ts' : base + '.tsx'; target = await moduleUrl(absolute.slice(root.length + 1).replaceAll('\\', '/')) }
    else target = pathToFileURL(require.resolve(match[2])).href
    code = code.replace(match[0], `from ${JSON.stringify(target)}`)
  }
  const url = dataModule(code); modules.set(path, url); return url
}
const load = async path => import(await moduleUrl(path)), storage = new Map()
globalThis.sessionStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) }
globalThis.window = { setTimeout, clearTimeout, location: { hash: '' } }
globalThis.document = { hidden: false }
let dispatch = async () => assert.fail('Unexpected synthetic fetch')
globalThis.fetch = (...args) => dispatch(...args)
const api = await load('src/features/whitelabel-emails/emailTemplatesApi.ts'), writes = await load('src/features/whitelabel-emails/emailTemplateWrites.ts'), editorial = await load('src/features/whitelabel-emails/emailEditorialModel.ts'), linked = await load('src/features/whitelabel-emails/editorial/linkedTemplateModel.ts'), auth = await load('src/lib/authSession.ts')
const branding = await load('src/features/whitelabel-emails/emailBrandingDisplay.ts'), configuration = await load('src/features/whitelabel-settings/configurationContract.ts')
const geometry = await load('src/features/whitelabel-emails/emailPreviewGeometry.ts')
let checks = 0, sequence = 88000
async function check(label, fn) { try { await fn(); checks++ } catch (cause) { throw Error(label, { cause }) } }
const response = (data, status = 200) => new Response(JSON.stringify({ data }), { status })
const login = (roles = ['SUPER_ADMIN']) => { auth.persistSession({ accessToken: 'synthetic-email-test-only', tokenType: 'Bearer', operator: { id: 'qa', name: 'Synthetic', email: 'qa@example.invalid', roles } }); return auth.getSessionVersion() }
function row(tenant = '6', id = 1, extra = {}) { return { id, wtlb_id: Number(tenant), name: 'Synthetic template', type: 'email_confirmation', subject: 'Synthetic subject', body_html: '<p>{{nome}} {{url}}</p>', available_variables: ['nome','url'], active: false, is_default: false, created_at: null, updated_at: null, version: '1', capabilityVersion: 1, ...extra } }
const type = { type: 'email_confirmation', label: 'Confirmação', description: 'Mensagem', available_variables: ['nome', 'url'], required_variables: ['url'], capabilityVersion: 1 }
await check('catalog is strict and required variables must be available', () => { assert.deepEqual(api.parseEmailTypes({ data: [type] }), [type]); assert.throws(() => api.parseEmailTypes({ data: [type, type] })); assert.throws(() => api.parseEmailTypes({ data: [{ ...type, required_variables: ['secret'] }] })) })
for (const id of ['0', '06', '-1', 'prototype', '6/7', '1e3']) await check(`canonical tenant ${id} rejected`, () => assert.throws(() => api.emailTemplatePath(id)))
await check('template ownership rejects cross-tenant, tenant-default and global-custom', () => {
  assert.equal(api.parseEmailTemplateRow(row(), '6').wtlb_id, 6)
  for (const invalid of [row('7'), row('6', 1, { is_default: true }), row('6', 1, { wtlb_id: null })]) assert.throws(() => api.parseEmailTemplateRow(invalid, '6'))
  assert.equal(api.parseEmailTemplateRow(row('6', 1, { wtlb_id: null, is_default: true }), '6').is_default, true)
})
for (const key of ['password', 'username', 'token', 'credentials', 'client_secret']) await check(`reject private ${key} without accessing it`, () => { const value = row(); Object.defineProperty(value, key, { enumerable: true, get() { throw Error('Secret accessed') } }); assert.throws(() => api.parseEmailTemplateRow(value, '6'), error => error.kind === 'malformed') })
for (const field of ['active','is_default']) await check(`boolean ${field} is strict`, () => assert.throws(() => api.parseEmailTemplateRow(row('6', 1, { [field]: 1 }), '6')))
await check('list rejects wrong type and duplicate record', () => { assert.throws(() => api.parseEmailTemplateList({ data: [row()] }, '6', 'other')); assert.throws(() => api.parseEmailTemplateList({ data: [row(), row()] }, '6', 'email_confirmation')) })
for (const typeName of ['email_confirmation', 'investment_contract', ...Object.keys(linked.LINKED_TEMPLATE_CONFIG)]) await check(`Admin structured serializer ${typeName} roundtrips and protects system variables`, () => {
  const draft = editorial.defaultEditorial(typeName), serialized = editorial.serializeEditorial(typeName, draft)
  assert.ok(serialized); assert.deepEqual(editorial.readEditorial(typeName, serialized.subject, serialized.body_html), draft)
  assert.equal(editorial.readEditorial(typeName, serialized.subject, serialized.body_html + '<p>unrecognized extension</p>'), null)
  assert.equal(editorial.serializeEditorial(typeName, { ...draft, greeting: '{{secret}}' }), null)
  assert.equal(editorial.serializeEditorial(typeName, { ...draft, greeting: '<script>alert(1)</script>' }), null)
})
await check('unknown future type has no fabricated editor fallback', () => { assert.equal(editorial.defaultEditorial('future_type'), null); assert.equal(editorial.supportsEditorial('future_type'), false) })
await check('legacy branding display matches Core nullish aliases without changing stored values', () => {
  const original = { primaryColor: '#123456', logoUrl: 'https://qa.example.invalid/logo.png', extension: { untouched: true } }, snapshot = JSON.stringify(original)
  assert.equal(branding.configurationDisplayValue('email_branding.config', original, ['primary_color']), '#123456')
  assert.equal(branding.configurationDisplayValue('email_branding.config', original, ['logo_url']), original.logoUrl)
  assert.equal(JSON.stringify(original), snapshot)
  for (const [key, value] of [['primary_color', '#654321'], ['logo_url', 'https://qa.example.invalid/other.png']]) assert.equal(branding.configurationDisplayValue('email_branding.config', { ...original, [key]: value }, [key]), value)
  assert.equal(branding.configurationDisplayValue('email_branding.config', { ...original, primary_color: null }, ['primary_color']), original.primaryColor)
  assert.equal(branding.configurationDisplayValue('email_branding.config', { ...original, logo_url: null }, ['logo_url']), original.logoUrl)
  assert.equal(branding.configurationDisplayValue('email_branding.config', { primary_color: null }, ['primary_color']), null)
  assert.equal(branding.configurationDisplayValue('quick_profile.theme', original, ['primary_color']), undefined)
  const edited = configuration.changeAt(original, ['primary_color'], '#998877')
  assert.deepEqual(edited, { ...original, primary_color: '#998877' }); assert.equal(JSON.stringify(original), snapshot)
})
await check('preview normalizes Core legacy colors without changing saved data on logo-only edits', async () => {
  login(['READ_ONLY']); let sent
  dispatch = async (_url, options) => { sent = JSON.parse(options.body); return response({ subject: 'Example', body_html: '<p>Example</p>', renderSource: 'core-email-template-service', sampleData: true, externalImagesBlocked: true, capabilityVersion: 1 }) }
  for (const color of ['AABBCC', '#AABBCC', '#AABBCCDD', ' AABBCCDD ']) for (const key of ['primary_color', 'primaryColor']) {
    const original = Object.freeze({ [key]: color, logo_url: 'https://qa.example.invalid/new-logo.png', extension: Object.freeze({ untouched: true }) }), snapshot = JSON.stringify(original)
    const brandingDraft = branding.emailBrandingPreviewDraft(original)
    assert.deepEqual(brandingDraft, { primary_color: '#aabbcc', logo_url: original.logo_url })
    await api.previewEmail('6', { type: 'email_confirmation', subject: 'Hello', body_html: '<p>Example</p>', brandingDraft })
    assert.deepEqual(sent.brandingDraft, brandingDraft); assert.equal(JSON.stringify(original), snapshot)
  }
})
await check('preview branding keeps stored null distinct while matching Core alias rendering', () => {
  assert.deepEqual(branding.emailBrandingPreviewDraft({}), {})
  assert.deepEqual(branding.emailBrandingPreviewDraft(null), { primary_color: null, logo_url: null })
  const saved = Object.freeze({ primary_color: null, primaryColor: '#aabbcc', logo_url: null, logoUrl: 'https://qa.example.invalid/logo.png' })
  assert.deepEqual(branding.emailBrandingPreviewDraft(saved), { primary_color: '#aabbcc', logo_url: saved.logoUrl })
  assert.equal(saved.primary_color, null); assert.equal(saved.logo_url, null)
  assert.deepEqual(branding.emailBrandingPreviewDraft({ primary_color: null, logo_url: null }), { primary_color: null, logo_url: null })
  for (const value of [{ primary_color: 'invalid' }, { primary_color: '#12345' }, { primary_color: 123456 }, { logo_url: false }, []]) assert.equal(branding.emailBrandingPreviewDraft(value), null)
})
function fixture(operation = 'save', mode = 'normal', create = false) {
  const tenant = String(++sequence), session = login(), baseline = row(tenant), initial = create ? [] : [baseline], records = [...initial], seen = []
  const value = { name: 'Edited QA', subject: baseline.subject, body_html: baseline.body_html, active: false }
  const command = { tenant, type: baseline.type, baseline: create ? null : baseline, baselineList: initial, value, operation }
  dispatch = async (url, options) => {
    const body = options.body ? JSON.parse(options.body) : undefined; seen.push({ url, method: options.method, body })
    if (options.method === 'GET') {
      if (mode === 'stale') return response([row(tenant, 1, { version: 'new' })])
      return response(/\/\d+$/.test(url) ? records.find(record => record.id === Number(url.split('/').at(-1))) : records)
    }
    if (mode === '422') return response({ message: 'SECRET_RESPONSE' }, 422)
    if (mode === 'networkUnchanged') throw new TypeError('Synthetic timeout')
    if (operation === 'delete') records.splice(0)
    else if (create) records.push(row(tenant, 2, { ...value, version: '2' }))
    else records[0] = row(tenant, 1, { ...value, version: '2' })
    if (mode === 'networkCommit') throw new TypeError('Synthetic disconnected after commit')
    if (mode === 'replaceSession') login(['READ_ONLY'])
    if (mode === 'malformed') return response({ token: 'SECRET_RESPONSE' }, create ? 201 : 200)
    return response(operation === 'delete' ? { id: 1, whitelabelId: Number(tenant), deleted: true } : records[0], create ? 201 : 200)
  }
  return { tenant, session, command, seen, records, attempt: () => writes.getTemplateAttempt(tenant, 'email_confirmation', session) }
}
await check('one inactive create, authoritative list/detail readback', async () => { const f = fixture('save', 'normal', true); await writes.executeTemplateWrite(f.command, f.session); assert.equal(f.attempt().phase, 'confirmed'); assert.deepEqual(f.seen.map(item => item.method), ['GET','POST','GET','GET']); assert.equal(f.seen[1].body.active, false); assert.equal(f.attempt().result.id, 2) })
await check('partial PATCH only changed editable fields', async () => { const f = fixture(); await writes.executeTemplateWrite(f.command, f.session); assert.equal(f.attempt().phase, 'confirmed'); assert.deepEqual(f.seen.find(item => item.method === 'PATCH').body, { name: 'Edited QA' }) })
await check('DELETE only own existing template with list absence readback', async () => { const f = fixture('delete'); await writes.executeTemplateWrite(f.command, f.session); assert.equal(f.attempt().phase, 'confirmed'); assert.deepEqual(f.seen.map(item => item.method), ['GET','GET','DELETE','GET']); assert.equal(f.attempt().deletedId, 1) })
await check('global defaults cannot mutate', async () => { const f = fixture(); f.command.baseline = row(f.tenant, 1, { is_default: true, wtlb_id: null }); await assert.rejects(writes.executeTemplateWrite(f.command, f.session), error => error.status === 403); assert.equal(f.seen.length, 0) })
await check('unknown write fields cannot enter the request', async () => { const f = fixture(); f.command.value.token = 'DO_NOT_SEND'; await assert.rejects(writes.executeTemplateWrite(f.command, f.session), error => error.status === 422); assert.equal(f.seen.length, 0) })
for (const roles of [['READ_ONLY'], ['SUPPORT_ADMIN'], []]) await check(`write role ${roles} rejected before request`, async () => { const f = fixture(), session = login(roles); await assert.rejects(writes.executeTemplateWrite(f.command, session), error => error.status === 403); assert.equal(f.seen.length, 0) })
await check('preflight stale prevents dispatch', async () => { const f = fixture('save','stale'); await writes.executeTemplateWrite(f.command, f.session); assert.equal(f.attempt().phase, 'stale'); assert.deepEqual(f.seen.map(item => item.method), ['GET']); writes.beginNextTemplateWrite(f.tenant, f.command.type, f.session); assert.equal(f.attempt(), undefined) })
for (const mode of ['networkCommit', 'malformed', 'networkUnchanged']) await check(`${mode} locks uncertain writes; reconciliation GET only`, async () => { const f = fixture('save', mode); await writes.executeTemplateWrite(f.command, f.session); assert.equal(f.attempt().phase, mode === 'networkUnchanged' ? 'uncertain' : 'readback_matches'); const count = f.seen.filter(item => item.method !== 'GET').length; await writes.reconcileTemplateWrite(f.tenant, f.command.type, f.session); assert.equal(f.seen.filter(item => item.method !== 'GET').length, count); await assert.rejects(writes.executeTemplateWrite(f.command, f.session), error => error.status === 409); assert.throws(() => writes.beginNextTemplateWrite(f.tenant, f.command.type, f.session)); assert.doesNotMatch(JSON.stringify(f.attempt()), /SECRET_RESPONSE/) })
await check('known validation rejection never retried', async () => { const f = fixture('save', '422'); await writes.executeTemplateWrite(f.command, f.session); assert.equal(f.attempt().phase, 'rejected'); assert.equal(f.seen.filter(item => item.method === 'PATCH').length, 1) })
await check('session replacement after dispatch remains uncertain', async () => { const f = fixture('save', 'replaceSession'); await writes.executeTemplateWrite(f.command, f.session); assert.equal(f.attempt().phase, 'uncertain'); assert.equal(writes.getTemplateAttempt(f.tenant, f.command.type, auth.getSessionVersion()), undefined) })
await check('preview is render-only body with server samples, current tenant and RBAC', async () => {
  login(['READ_ONLY']); let sent
  dispatch = async (url, options) => { sent = { url, method: options.method, body: JSON.parse(options.body) }; return response({ subject: 'Rendered example', body_html: '<p>Example</p>', renderSource: 'core-email-template-service', sampleData: true, externalImagesBlocked: true, capabilityVersion: 1 }) }
  const command = { type: 'email_confirmation', subject: 'Hello', body_html: '<p>{{nome}}</p>', variables: { token: 'DO_NOT_SEND' }, brandingDraft: { primary_color: '#112233', ignored: 'DO_NOT_SEND' } }
  await api.previewEmail('6', command); assert.equal(sent.url, 'https://control-plane.example.invalid/api/whitelabels/6/emails/templates/preview'); assert.equal(sent.method, 'POST'); assert.equal(sent.body.variables, undefined); assert.deepEqual(sent.body.brandingDraft, { primary_color: '#112233' }); assert.doesNotMatch(JSON.stringify(sent), /DO_NOT_SEND/)
})
for (const logo of ['http://example.invalid/logo.png','https://user:pass@example.invalid/logo.png','https://example.invalid/logo.png?token=x']) await check('preview rejects unsafe logo', async () => { await assert.rejects(api.previewEmail('6', { type: 'email_confirmation', subject: 'Hello', body_html: '<p>Example</p>', brandingDraft: { logo_url: logo } }), error => error.status === 422) })
await check('preview contract refuses arbitrary local renderer or unsafe image status', () => { for (const extra of [{ renderSource: 'local' }, { sampleData: false }, { externalImagesBlocked: false }]) assert.throws(() => api.parseEmailPreview({ data: { subject: 'Example', body_html: '<p>Example</p>', renderSource: 'core-email-template-service', sampleData: true, externalImagesBlocked: true, capabilityVersion: 1, ...extra } })) })
await check('preview boundary blocks image fetch/execution/navigation and never injects shell HTML', async () => {
  const source = await readFile(resolve(root, 'src/features/whitelabel-emails/EmailTemplatesWorkspace.tsx'), 'utf8'), apiSource = await readFile(resolve(root, 'src/features/whitelabel-emails/emailTemplatesApi.ts'), 'utf8')
  assert.match(source, /sandbox=""/); assert.match(source, /referrerPolicy="no-referrer"/); assert.doesNotMatch(source, /dangerouslySetInnerHTML/); assert.match(apiSource, /img-src 'none'/); assert.match(apiSource, /form-action 'none'/); assert.match(apiSource, /querySelectorAll\('script,style,iframe/); assert.match(apiSource, /document.createElement\('template'\)/)
})
await check('email viewport remains 600/360 while the whole document scales without upscaling', () => {
  assert.equal(geometry.EMAIL_PREVIEW_VIEWPORT.desktop.width, 600); assert.equal(geometry.EMAIL_PREVIEW_VIEWPORT.mobile.width, 360)
  for (const width of [208, 240, 320, 390, 600, 900]) for (const viewport of Object.values(geometry.EMAIL_PREVIEW_VIEWPORT)) { const scale = geometry.emailPreviewScale(width, viewport.width); assert.ok(scale > 0 && scale <= 1); assert.ok(viewport.width * scale <= width + 0.0001) }
  for (const width of [0, -1, NaN, Infinity]) assert.equal(geometry.emailPreviewScale(width, 600), 1)
})
await check('resize observer ignores hidden/duplicate/unrelated geometry and disconnects', () => {
  const host = { clientWidth: 240 }, widths = []; let callback, observed, disconnected = false
  globalThis.ResizeObserver = class { constructor(fn) { callback = fn } observe(value) { observed = value } disconnect() { disconnected = true } }
  const stop = geometry.watchEmailPreviewWidth(host, width => widths.push(width)); assert.equal(observed, host); assert.deepEqual(widths, [240])
  for (const width of [240, 240.001, 0, NaN, 240]) callback([{ target: host, contentRect: { width } }])
  callback([{ target: {}, contentRect: { width: 999 } }]); assert.deepEqual(widths, [240])
  callback([{ target: host, contentRect: { width: 320 } }]); callback([{ target: host, contentRect: { width: 320 } }]); assert.deepEqual(widths, [240, 320])
  stop(); assert.equal(disconnected, true); delete globalThis.ResizeObserver
})
await check('resize fallback removes its listener and never accesses iframe internals', () => {
  const host = { clientWidth: 0 }, widths = []; let listener, removed
  window.addEventListener = (name, fn) => { assert.equal(name, 'resize'); listener = fn }; window.removeEventListener = (name, fn) => { assert.equal(name, 'resize'); removed = fn }
  const stop = geometry.watchEmailPreviewWidth(host, width => widths.push(width)); assert.deepEqual(widths, []); host.clientWidth = 320; listener(); listener(); assert.deepEqual(widths, [320]); stop(); assert.equal(removed, listener)
})
console.log(`Email templates: ${checks} focused synthetic checks passed. No live requests or mail.`)
