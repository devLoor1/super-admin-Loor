import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

// Intercepted transport only. Nothing contacts Backend, storage or a browser profile.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(resolve(root, 'package.json'))
const data = code => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
const react = data('export const useSyncExternalStore = (_, get) => get();')
const BASE = 'https://backend-super-admin-loor.onrender.com/api'
async function environment(flag, base = BASE) {
  const cache = new Map(), env = { VITE_API_BASE_URL: base, VITE_SHOWCASE_ENABLED: flag }
  async function url(path) {
    if (cache.has(path)) return cache.get(path)
    let code = ts.transpileModule(await readFile(path, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText.replaceAll('import.meta.env', `(${JSON.stringify(env)})`)
    for (const match of [...code.matchAll(/from\s+(['"])([^'"]+)\1/g)]) {
      const spec = match[2]
      const target = spec === 'react' ? react : spec.startsWith('.') ? await url(resolve(dirname(path), spec + '.ts')) : pathToFileURL(require.resolve(spec)).href
      code = code.replace(match[0], 'from ' + JSON.stringify(target))
    }
    const target = data(code); cache.set(path, target); return target
  }
  const load = async path => import(await url(resolve(root, path)))
  const storage = new Map()
  globalThis.sessionStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) }
  globalThis.window = { setTimeout: (fn, ms) => setTimeout(fn, ms === 20000 ? 25 : ms), clearTimeout }
  const auth = await load('src/lib/authSession.ts')
  const session = (roles = ['SUPER_ADMIN']) => { auth.persistSession({ accessToken: 'synthetic-only', tokenType: 'Bearer', operator: { id: 'synthetic', name: 'Synthetic', email: 'synthetic@example.invalid', roles } }); return { roles, sessionVersion: auth.getSessionVersion() } }
  return { load, auth, session }
}
let calls = [], answer, checks = 0
const response = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'X-Correlation-ID': 'synthetic-correlation' } })
globalThis.fetch = async (address, options) => {
  const url = new URL(address)
  assert.equal(url.origin, new URL(BASE).origin, 'unexpected network destination blocked')
  calls.push({ url, options })
  return answer(url, options)
}
async function check(name, fn) {
  try { await fn(); checks++ } catch (cause) {
    if (cause.stack) cause.stack = cause.stack.replace(/data:text\/javascript;base64,[A-Za-z0-9+/=]+/g, '<in-memory-module>')
    throw new Error(name + '\n' + (cause.stack || cause.message))
  }
}
const prefix = 'src/features/whitelabel-showcase/'
for (const [flag, base] of [[undefined, BASE], ['false', BASE], ['TRUE', BASE], ['1', BASE], ['true', 'https://other.example.invalid/api'], ['true', 'https://backend-super-admin-loor.onrender.com/api/other']]) {
  await check('explicit exact flag and canonical homolog API gate ' + flag + base, async () => {
    const e = await environment(flag, base); e.session(); calls = []
    const { showcaseRequest } = await e.load(prefix + 'showcaseClient.ts')
    await assert.rejects(showcaseRequest('/whitelabels/6/showcase'), error => error.code === 'E_SHOWCASE_NOT_AVAILABLE')
    assert.equal(calls.length, 0)
  })
}
const e = await environment('true'), actor = () => ({ roles: e.auth.getOperator()?.roles, sessionVersion: e.auth.getSessionVersion() })
const model = await e.load(prefix + 'showcaseModel.ts')
const codec = await e.load(prefix + 'showcaseCodec.ts')
const access = await e.load(prefix + 'showcaseAccess.ts')
const media = await e.load(prefix + 'showcaseMedia.ts')
const repo = await e.load(prefix + 'showcaseRepository.ts')
const store = await e.load(prefix + 'showcaseStore.ts')
const lookup = await e.load(prefix + 'showcaseSourceLookup.ts')
const client = await e.load(prefix + 'showcaseClient.ts')
const validation = await e.load(prefix + 'showcaseValidation.ts')
const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
function validDocument() {
  const card = model.createCardInstance({ source: { whitelabelId: '12', slug: 'source-tenant', name: 'Source', logical: null } })
  card.shortDescription = 'Manual description'; card.logo = { assetRef: uuid(3), alt: 'Logo', fileName: 'logo.png', origin: 'upload' }
  card.images = [model.newImageAssociation(uuid(4), 'card.jpg', 'Card photo')]
  return { ...model.emptyShowcaseDocument(), banner: { images: [model.newImageAssociation(uuid(2), 'banner.png', 'Banner photo')] }, cards: [card] }
}
const emptyWire = () => ({ data: { configured: false, revision: null, schemaVersion: 1, document: null, owner: { whitelabelId: 6, slug: 'homologacao' } } })
const storedWire = (document, revision = 1) => ({ data: { configured: true, revision, schemaVersion: 1, document: codec.encodeShowcaseDocument(document), owner: { whitelabelId: 6, slug: 'homologacao' } } })
const assetWire = ref => ({ data: { asset_ref: ref, slot: 'showcase', wtlb_id: 6, original_name: 'image.png', mime: 'image/png', size_bytes: 9, url: 'https://assets.example.invalid/image.png' } })
const mutations = () => calls.filter(call => call.options.method !== 'GET')
await check('real owner six, exact slug, no fixture owner; same source creates independent cards', () => {
  e.session()
  assert.equal(access.showcaseAvailableFor({ tenantId: '4', tenantSlug: 'homologacao' }), false)
  assert.equal(access.showcaseAvailableFor({ tenantId: '6', tenantSlug: 'other' }), false)
  assert.equal(access.showcaseAvailableFor({ tenantId: '6', tenantSlug: 'homologacao' }), true)
  const a = validDocument(), b = model.createCardInstance({ source: a.cards[0].source })
  assert.notEqual(a.cards[0].instanceId, b.instanceId); assert.equal(b.logo, null); assert.equal(b.shortDescription, '')
})
await check('unconfigured GET is async empty revision null; failed read never supplies an example', async () => {
  e.session(); calls = []; answer = () => response(200, emptyWire())
  assert.equal(store.getShowcaseState().loadPhase, 'idle')
  await store.loadShowcase(actor())
  assert.equal(store.getShowcaseState().loadPhase, 'ready'); assert.equal(store.getShowcaseState().baseRevision, null)
  assert.deepEqual(store.getShowcaseState().draft.cards, []); assert.deepEqual(store.getShowcaseState().draft.banner.images, [])
  e.session(); answer = () => response(404, { code: 'E_SHOWCASE_NOT_AVAILABLE' }); await store.loadShowcase(actor())
  assert.equal(store.getShowcaseState().loadPhase, 'error'); assert.equal(store.getShowcaseState().draft.cards.length, 0)
})
await check('codec allowlist, canonical intro/null/source numeric and strict public projection', () => {
  const doc = validDocument(); doc.secret = 'never'; doc.cards[0].source.secret = 'never'
  const wire = codec.encodeShowcaseDocument(doc), serialized = JSON.stringify(wire)
  for (const forbidden of ['fileName', 'copiedDefaults', 'logical', 'origin', 'owner', 'never', 'introduction']) assert.equal(serialized.includes('"' + forbidden + '"'), false)
  assert.equal(wire.intro, null); assert.equal(wire.cards[0].source.whitelabelId, 12)
  assert.deepEqual(codec.encodeShowcaseDocument(codec.decodeShowcaseDocument(wire)), wire)
  const publicDoc = { banner: { images: wire.banner.images.map(i => ({ ...i, url: 'https://assets.example.invalid/banner.png' })) }, intro: null, cards: wire.cards.map(c => ({ ...c, logo: { ...c.logo, url: 'javascript:alert(1)' }, images: c.images.map(i => ({ ...i, url: 'https://assets.example.invalid/card.png' })) })) }
  const parsed = codec.decodePublicShowcase({ data: { configured: true, revision: 1, schemaVersion: 1, document: publicDoc, warnings: ['secret'] } })
  assert.equal(parsed.document.cards[0].logo.url, null)
  for (const forbidden of ['assetRef', 'internalTitle', 'source', 'warnings']) assert.equal(JSON.stringify(parsed).includes('"' + forbidden + '"'), false)
  assert.deepEqual(codec.decodePublicShowcase({ data: { configured: false, revision: null, document: null } }), { configured: false, revision: null, document: null })
  assert.throws(() => codec.decodeStoredShowcase({ data: { ...emptyWire().data, revision: 0 } }))
})
await check('save validation rejects foreign owner, synthetic refs, decorative alt, duplicate IDs and forbidden markdown', () => {
  for (const change of [doc => { doc.owner.whitelabelId = 4 }, doc => { doc.banner.images[0].assetRef = 'blob:local' }, doc => { doc.banner.images[0].decorative = true }, doc => { doc.cards[0].images[0].associationId = doc.banner.images[0].associationId }, doc => { doc.introduction = { title: 'Title', subtitle: '', bodyMarkdown: '`code`', markdownVersion: 1 } }]) {
    const doc = validDocument(); change(doc); assert.ok(validation.validateShowcase(doc, () => true).length); assert.throws(() => codec.encodeShowcaseDocument(doc))
  }
})
await check('first PUT uses JSON null exactly, full canonical payload and no identity/settings fields', async () => {
  e.session(); calls = []; const doc = validDocument()
  answer = (url, options) => options.method === 'PUT' ? response(200, storedWire(doc)) : url.pathname.endsWith('/showcase') ? response(200, emptyWire()) : response(200, assetWire(url.pathname.split('/').at(-1)))
  await store.loadShowcase(actor()); media.rememberDocumentAssets(doc); store.updateDraft(actor(), () => doc)
  await store.saveDraft(actor())
  assert.equal(store.getShowcaseState().phase, 'saved'); assert.equal(store.getShowcaseState().baseRevision, 1)
  const sent = JSON.parse(mutations()[0].options.body)
  assert.deepEqual(Object.keys(sent).sort(), ['document', 'expectedRevision', 'schemaVersion']); assert.equal(sent.expectedRevision, null)
  assert.equal(mutations().length, 1); assert.equal(mutations()[0].options.method, 'PUT')
  assert.equal(mutations()[0].options.headers['Idempotency-Key'], undefined)
})
await check('READ_ONLY can GET but cannot mutate; SUPPORT_ADMIN and missing session cannot read', async () => {
  e.session(['READ_ONLY']); calls = []; answer = () => response(200, emptyWire())
  await repo.fetchStoredShowcase(actor()); await assert.rejects(repo.saveShowcase({ actor: actor(), expectedRevision: null, document: validDocument() }), error => error.status === 403)
  assert.equal(mutations().length, 0)
  for (const roles of [['SUPPORT_ADMIN'], []]) { e.session(roles); calls = []; await assert.rejects(repo.fetchStoredShowcase(actor())); assert.equal(calls.length, 0) }
  e.auth.clearSession(); await assert.rejects(repo.fetchStoredShowcase(actor()), error => error.status === 401)
})
await check('409 fetches authoritative current revision and preserves draft without another PUT', async () => {
  e.session(); calls = []; const doc = validDocument(), current = structuredClone(doc); current.cards[0].displayName = 'Concurrent'
  answer = (url, options) => options.method === 'PUT' ? response(409, { code: 'E_SHOWCASE_REVISION_CONFLICT', data: storedWire(current, 2).data }) : url.pathname.endsWith('/showcase') ? response(200, mutations().length ? storedWire(current, 2) : emptyWire()) : response(200, assetWire(url.pathname.split('/').at(-1)))
  await store.loadShowcase(actor()); media.rememberDocumentAssets(doc); store.updateDraft(actor(), () => doc); await store.saveDraft(actor())
  assert.equal(store.getShowcaseState().phase, 'conflict'); assert.equal(store.getShowcaseState().draft.cards[0].displayName, 'Source')
  assert.equal(store.getShowcaseState().conflictRevision, 2); assert.equal((await store.saveDraft(actor())).status, 'blocked'); assert.equal(mutations().length, 1)
})
for (const outcome of ['applied', 'not-applied', 'diverged', 'read-failed']) await check('uncertain PUT/manual reconciliation ' + outcome, async () => {
  e.session(); calls = []; const doc = validDocument()
  answer = (url, options) => options.method === 'PUT' ? response(503, {}) : url.pathname.endsWith('/showcase') ? response(200, emptyWire()) : response(200, assetWire(url.pathname.split('/').at(-1)))
  await store.loadShowcase(actor()); media.rememberDocumentAssets(doc); store.updateDraft(actor(), () => doc); await store.saveDraft(actor())
  assert.equal(store.getShowcaseState().phase, 'uncertain'); assert.equal((await store.saveDraft(actor())).status, 'blocked')
  answer = (url) => !url.pathname.endsWith('/showcase') ? response(200, assetWire(url.pathname.split('/').at(-1))) : outcome === 'read-failed' ? response(503, {}) : response(200, outcome === 'not-applied' ? emptyWire() : storedWire(doc, outcome === 'diverged' ? 3 : 1))
  await store.reconcileDraft(actor())
  assert.equal(store.getShowcaseState().phase, { applied: 'saved', 'not-applied': 'failed', diverged: 'conflict', 'read-failed': 'uncertain' }[outcome]); assert.equal(mutations().length, 1)
})
await check('session replacement clears sensitive drafts/media and ignores late GET', async () => {
  e.session(); calls = []; let release
  answer = () => new Promise(resolve => { release = resolve })
  const pending = store.loadShowcase(actor()); e.session(['READ_ONLY']); release(response(200, storedWire(validDocument()))); await pending
  assert.equal(store.getShowcaseState().loadPhase, 'idle'); assert.equal(store.getShowcaseState().draft.cards.length, 0); assert.equal(media.resolveMedia(uuid(2)), undefined)
})
const row = (id, slug, name = 'Source') => ({ id, idKey: String(id), slug, name, baseUrl: 'https://tenant.example.invalid', isActive: true, status: 'active' })
await check('active paginated name/slug options, exact slug all-page coverage, direct ID one GET', async () => {
  e.session(); calls = []
  answer = (url) => response(200, url.pathname.endsWith('/12') ? row(12, 'source-tenant') : { data: [row(Number(url.searchParams.get('page')) === 1 ? 11 : 12, Number(url.searchParams.get('page')) === 1 ? 'source-tenant-other' : 'source-tenant')], meta: { page: Number(url.searchParams.get('page')), perPage: 1, total: 2, lastPage: 2 } })
  const found = await lookup.lookupSourceBySlug('source-tenant'); assert.equal(found.status, 'found'); assert.equal(calls.length, 2)
  assert.ok(calls.every(call => call.url.searchParams.get('active') === 'true'))
  calls = []; const selected = await lookup.lookupSourceById('12'); assert.equal(selected.status, 'found'); assert.equal(calls.length, 1); assert.equal(calls[0].url.pathname, '/api/whitelabels/12')
  assert.equal(lookup.classifyLookup('source-tenant', [{ id: '12', slug: 'source-tenant', name: 'Source', status: 'active' }], false).status, 'inconclusive')
})
await check('asset owner/slot/ref checks, ephemeral renewal, no PUT/DELETE assets', async () => {
  e.session(); calls = []; let signed = 1
  answer = () => response(200, { data: { ...assetWire(uuid(2)).data, url: `https://assets.example.invalid/${signed++}.png` } })
  const first = await media.ensureMedia(uuid(2)), next = await media.ensureMedia(uuid(2), true)
  assert.notEqual(first.url, next.url); assert.equal(calls.length, 2)
  await assert.rejects(client.showcaseRequest('/whitelabels/6/platform/assets/' + uuid(2), { method: 'PUT', actor: actor(), body: {} }))
  answer = () => response(200, { data: { ...assetWire(uuid(4)).data, slot: 'main_area' } })
  await assert.rejects(media.ensureMedia(uuid(4))); assert.equal(media.hasMedia(uuid(4)), false)
})
await check('upload PNG signature 20 MiB, new POST showcase only, uncertainty latches across picker reopen', async () => {
  e.session(); calls = []; globalThis.createImageBitmap = async () => ({ width: 100, height: 100, close() {} })
  const bytes = new Uint8Array([137,80,78,71,13,10,26,10,0]), file = new File([bytes], 'image.png', { type: 'image/png' })
  assert.equal(media.checkUploadCandidate({ name: 'x.png', type: 'image/png', size: 20 * 1024 * 1024 + 1 }, bytes).ok, false)
  assert.equal(media.checkUploadCandidate({ name: 'x.jpg', type: 'image/jpeg', size: 9 }, bytes).ok, false)
  answer = () => response(201, assetWire(uuid(9)))
  const good = await media.ingestUpload(actor(), file, 'logo'); assert.equal(good.ok, true); assert.equal(mutations().length, 1)
  assert.equal(mutations()[0].options.body.get('slot'), 'showcase'); assert.equal(mutations()[0].options.method, 'POST')
  answer = () => response(503, {}); const bad = await media.ingestUpload(actor(), file, 'banner'); assert.equal(bad.uncertain, true)
  await media.ingestUpload(actor(), file, 'banner'); assert.equal(mutations().length, 2); assert.equal(media.hasUncertainUpload(), true)
  const attempts = media.createUploadAttempts(); let deliver
  const delayed = media.runUploadAttempt(attempts, () => new Promise(resolve => { deliver = resolve })); attempts.close(); deliver(good)
  assert.equal((await delayed).status, 'ignored')
})
await check('transport refuses runtime method/path/body smuggling before fetch', async () => {
  e.session(); calls = []
  for (const method of ['DELETE', 'PATCH', 'OPTIONS', 'invalid']) await assert.rejects(client.showcaseRequest('/whitelabels/6/platform/assets', { method, actor: actor() }), error => error.code === 'INVALID_SHOWCASE_METHOD')
  for (const path of ['/whitelabels/4/showcase', '/whitelabels/6/settings', '/whitelabels/6/platform/assets/../../settings']) await assert.rejects(client.showcaseRequest(path, { method: 'PUT', actor: actor(), body: {} }))
  const form = new FormData(); form.append('slot', 'main_area'); form.append('image', new Blob(['png'], { type: 'image/png' }))
  await assert.rejects(client.showcaseRequest('/whitelabels/6/platform/assets', { method: 'POST', actor: actor(), body: form }))
  assert.equal(calls.length, 0)
  const doc = validDocument(); doc.cards[0].internalTitle = ''; doc.cards[0].source.baseUrl = 'https://tenant.example.invalid'
  const wire = codec.encodeShowcaseDocument(doc)
  assert.deepEqual(codec.encodeShowcaseDocument(codec.decodeShowcaseDocument(wire)), wire)
  answer = () => response(200, storedWire(doc))
  await client.showcaseRequest('/whitelabels/6/showcase', { method: 'PUT', actor: actor(), body: { schemaVersion: 1, expectedRevision: null, document: { ...wire, secret: 'drop' }, owner: 4, extra: 'drop' } })
  assert.equal(JSON.stringify(JSON.parse(mutations()[0].options.body)).includes('drop'), false)
})
for (const status of [400, 401, 403, 404, 422, 429]) await check('PUT refused ' + status + ' is no success and no retry', async () => {
  e.session(); calls = []; answer = () => response(status, { code: status === 404 ? 'E_SHOWCASE_NOT_AVAILABLE' : 'E_VALIDATION', message: 'unsafe raw backend text' })
  const result = await repo.saveShowcase({ actor: actor(), expectedRevision: null, document: validDocument() })
  assert.equal(result.status, 'rejected'); assert.equal(mutations().length, 1); assert.equal(result.message.includes('unsafe'), false)
  if (status === 401) assert.equal(e.auth.getAccessToken(), null)
})
await check('in-flight save blocks double submission and background reload', async () => {
  e.session(); calls = []; const doc = validDocument(); let release
  answer = () => response(200, emptyWire()); await store.loadShowcase(actor()); media.rememberDocumentAssets(doc); store.updateDraft(actor(), () => doc)
  answer = (url, options) => options.method === 'PUT' ? new Promise(resolve => { release = resolve }) : response(200, assetWire(url.pathname.split('/').at(-1)))
  const pending = store.saveDraft(actor()); assert.equal((await store.saveDraft(actor())).status, 'blocked'); await store.loadShowcase(actor())
  release(response(200, storedWire(doc))); await pending; assert.equal(store.getShowcaseState().phase, 'saved'); assert.equal(mutations().length, 1)
})
await check('late upload does not poison the replacement session cache/uncertainty latch', async () => {
  e.session(); calls = []; let release
  const file = new File([new Uint8Array([137,80,78,71,13,10,26,10,0])], 'image.png', { type: 'image/png' })
  answer = () => new Promise(resolve => { release = resolve })
  const pending = media.ingestUpload(actor(), file, 'logo')
  while (!release) await new Promise(resolve => setImmediate(resolve))
  e.session(); release(response(201, assetWire(uuid(10)))); await pending
  assert.equal(media.hasUncertainUpload(), false); assert.equal(media.resolveMedia(uuid(10)), undefined)
})
await check('display-only auth hydration preserves draft, media and uncertain attempt', async () => {
  e.session(); calls = []; const doc = validDocument()
  answer = (url, options) => options.method === 'PUT' ? response(503, {}) : url.pathname.endsWith('/showcase') ? response(200, emptyWire()) : response(200, assetWire(url.pathname.split('/').at(-1)))
  await store.loadShowcase(actor()); media.rememberDocumentAssets(doc); store.updateDraft(actor(), () => doc); await store.saveDraft(actor())
  answer = () => response(200, { id: 'synthetic', name: 'Updated display', email: 'display@example.invalid', roles: ['SUPER_ADMIN'] })
  assert.equal(await e.auth.validateSession(), 'valid')
  assert.equal(store.getShowcaseState().phase, 'uncertain'); assert.equal(store.getShowcaseState().draft.cards.length, 1)
  assert.equal(media.hasMedia(uuid(2)), true); assert.equal((await store.saveDraft(actor())).status, 'blocked')
})
await check('runtime has no seed/simulation/fixture imports or synthetic media reference', async () => {
  const walk = async directory => (await Promise.all((await readdir(directory, { withFileTypes: true })).map(entry => entry.isDirectory() ? walk(resolve(directory, entry.name)) : /\.tsx?$/.test(entry.name) ? [resolve(directory, entry.name)] : []))).flat()
  for (const path of await walk(resolve(root, prefix))) {
    const source = await readFile(path, 'utf8')
    assert.equal(/from\s+['"][^'"]*(fixtures|showcaseSimulation)|upload-simulado:|copia-proprietario:/.test(source), false, path)
  }
})
console.log(`Showcase operational: ${checks} checks passed (intercepted transport, no live network)`)
