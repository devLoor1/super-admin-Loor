import assert from 'node:assert/strict'
import { moduleLoader, reactUrl, renderUrl } from './operators-test-harness.mjs'

// Synthetic transport only. No live assets, storage, mail or tenant writes.
const storage = new Map()
globalThis.sessionStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) }
globalThis.window = { setTimeout, clearTimeout, location: { hash: '' } }
globalThis.document = { hidden: false }
let dispatch = async () => { throw new Error('Unexpected request') }
globalThis.fetch = (...args) => dispatch(...args)
const load = moduleLoader()
const client = await load('src/features/whitelabel-settings/platformAssetClient.ts')
const auth = await load('src/lib/authSession.ts')
const contract = await load('src/features/whitelabel-settings/configurationContract.ts')
const response = (body, status = 200) => new Response(JSON.stringify(body), { status })
const ref = 'b00b0f32-bbf3-436f-9e56-64d48a609408'
const file = new File([new Uint8Array([137, 80, 78, 71])], 'synthetic.png', { type: 'image/png' })
let tenant = 89000, count = 0
async function check(name, fn) { try { await fn(); count++ } catch (cause) { throw new Error(name, { cause }) } }
function fixture(mode = 'normal', roles = ['SUPER_ADMIN']) {
  const id = String(++tenant), seen = [], state = { mode, deleted: false }
  auth.persistSession({ accessToken: 'synthetic-asset-test-only', tokenType: 'Bearer', operator: { id: 'qa', name: 'Synthetic', email: 'qa@example.invalid', roles } })
  const session = auth.getSessionVersion()
  const asset = { asset_ref: ref, slot: 'main_area', wtlb_id: Number(id), mime: 'image/png', size_bytes: file.size, url: 'https://images.example.invalid/a.png?signature=one', updated_at: '2026-10-27T00:00:00Z' }
  dispatch = async (url, options) => {
    seen.push({ url, method: options.method, body: options.body })
    if (options.method === 'GET') {
      if (state.mode === 'emptyRead503') return response({}, 503)
      if (state.mode === 'read404' || state.deleted) return response({}, 404)
      if (state.mode === 'read503') return response({}, 503)
      if (state.mode === 'foreign') return response({ data: { ...asset, wtlb_id: Number(id) + 1 } })
      return response({ data: { ...asset, ...(state.readStamp ? { updated_at: state.readStamp } : {}), url: state.mode === 'nullUrl' ? null : 'https://images.example.invalid/a.png?signature=rotated' } })
    }
    if (state.mode === 'rejected') return response({}, 422)
    if (state.mode === 'lost') throw new TypeError('Synthetic network loss')
    if (options.method === 'DELETE') {
      state.deleted = !['notDeleted', 'emptyNotDeleted'].includes(state.mode)
      if (['emptyDelete', 'emptyNotDeleted', 'emptyRead503'].includes(state.mode)) return new Response(null, { status: 200 })
      if (state.mode === 'malformedDelete') return response({ unexpected: true })
      return response({ data: null })
    }
    if (state.mode === 'badReceipt') return response({ data: { ...asset, size_bytes: -1 } }, options.method === 'POST' ? 201 : 200)
    return response({ data: { ...asset, url: state.mode === 'nullUrl' ? null : asset.url } }, options.method === 'POST' ? 201 : 200)
  }
  return { id, session, seen, state, asset, attempt: () => client.assetAttempt(id) }
}
await check('exact file contract', () => {
  assert.equal(client.assetFileError(file), null)
  for (const invalid of [new File([], 'a.png', { type: 'image/png' }), new File(['x'], 'a.svg', { type: 'image/svg+xml' }), new File(['x'], 'a.jpg', { type: 'image/png' })]) assert.ok(client.assetFileError(invalid))
  assert.ok(client.assetFileError({ name: 'a.png', type: 'image/png', size: 20 * 1024 * 1024 + 1 }))
})
await check('one upload, real multipart names, independent GET, rotating signed URL', async () => {
  const f = fixture(), asset = await client.mutatePlatformAsset(f.id, 'upload', f.session, file, undefined, 'login.main_area_image')
  assert.equal(f.attempt().phase, 'confirmed'); assert.equal(asset.ref, ref)
  assert.deepEqual(f.seen.map(item => item.method), ['POST', 'GET'])
  assert.deepEqual([...f.seen[0].body.keys()], ['image', 'slot']); assert.equal(f.seen[0].body.get('slot'), 'main_area')
  assert.match(asset.url, /rotated/)
})
await check('accepted upload then 404 stays uncertain with exact orphan ref', async () => {
  const f = fixture('read404')
  await assert.rejects(client.mutatePlatformAsset(f.id, 'upload', f.session, file, undefined, 'register.main_area_image'))
  assert.equal(f.attempt().phase, 'uncertain'); assert.equal(f.attempt().ref, ref); assert.equal(f.attempt().cell, 'register.main_area_image')
  await assert.rejects(client.mutatePlatformAsset(f.id, 'upload', f.session, file), error => error.status === 409)
  f.state.mode = 'normal'; const recovered = await client.reconcilePlatformAsset(f.id, f.session)
  assert.equal(recovered.ref, ref); assert.equal(f.attempt().phase, 'confirmed')
  assert.deepEqual(f.seen.map(item => item.method), ['POST', 'GET', 'GET'])
})
await check('receipt milliseconds truncated by storage confirm without another mutation', async () => {
  const f = fixture()
  f.asset.updated_at = '2026-10-30T00:14:34.355-03:00'
  f.state.readStamp = '2026-10-30T03:14:34.000Z'
  const result = await client.mutatePlatformAsset(f.id, 'upload', f.session, file)
  assert.equal(result.ref, ref); assert.equal(f.attempt().phase, 'confirmed')
  assert.deepEqual(f.seen.map(x => x.method), ['POST', 'GET'])
})
await check('timestamp drift, invalid timestamps and nonzero unequal precision stay uncertain', async () => {
  for (const stamp of ['2026-10-30T03:14:33.000Z', '2026-10-30T03:14:35.000Z', '2026-10-30T03:14:34.200Z', 'not-a-date']) {
    const f = fixture(); f.asset.updated_at = '2026-10-30T00:14:34.355-03:00'; f.state.readStamp = stamp
    await assert.rejects(client.mutatePlatformAsset(f.id, 'upload', f.session, file))
    assert.equal(f.attempt().phase, 'uncertain'); assert.equal(f.seen.filter(x => x.method === 'POST').length, 1)
  }
})
await check('equivalent timezone timestamp is accepted without precision loss', async () => {
  const f = fixture(); f.asset.updated_at = '2026-10-30T00:14:34.355-03:00'; f.state.readStamp = '2026-10-30T03:14:34.355Z'
  await client.mutatePlatformAsset(f.id, 'upload', f.session, file)
  assert.equal(f.attempt().phase, 'confirmed')
})
await check('network failure before receipt never retries or guesses an identity', async () => {
  const f = fixture('lost'); await assert.rejects(client.mutatePlatformAsset(f.id, 'upload', f.session, file))
  assert.equal(f.attempt().phase, 'uncertain'); assert.equal(f.attempt().ref, undefined)
  await assert.rejects(client.reconcilePlatformAsset(f.id, f.session)); assert.equal(f.seen.length, 1)
})
await check('malformed receipt retains scoped identity without claiming confirmation', async () => {
  const f = fixture('badReceipt'); await assert.rejects(client.mutatePlatformAsset(f.id, 'upload', f.session, file))
  assert.equal(f.attempt().ref, ref); assert.equal(f.attempt().phase, 'uncertain')
  await assert.rejects(client.reconcilePlatformAsset(f.id, f.session)); assert.equal(f.attempt().phase, 'uncertain')
  assert.equal(f.seen.filter(item => item.method === 'POST').length, 1)
})
await check('cross-tenant readback cannot confirm upload', async () => {
  const f = fixture('foreign'); await assert.rejects(client.mutatePlatformAsset(f.id, 'upload', f.session, file))
  assert.equal(f.attempt().phase, 'uncertain')
})
await check('read-only operator cannot upload replace or delete', async () => {
  const f = fixture('normal', ['READ_ONLY'])
  for (const action of ['upload', 'replace', 'delete']) await assert.rejects(client.mutatePlatformAsset(f.id, action, f.session, file, action === 'upload' ? undefined : ref), error => error.status === 403)
  assert.equal(f.seen.length, 0)
})
await check('definite mutation rejection is distinct from failed GET', async () => {
  const f = fixture('rejected'); await assert.rejects(client.mutatePlatformAsset(f.id, 'upload', f.session, file))
  assert.equal(f.attempt().phase, 'rejected'); assert.deepEqual(f.seen.map(item => item.method), ['POST'])
})
await check('null storage URL is honest unavailable rendering, not unknown mutation', async () => {
  const f = fixture('nullUrl'), asset = await client.mutatePlatformAsset(f.id, 'upload', f.session, file)
  assert.equal(asset.url, null); assert.equal(f.attempt().phase, 'confirmed')
})
await check('nullable legacy metadata follows the Core read projection', () => {
  const f = fixture(), asset = client.parsePlatformAsset({ data: { ...f.asset, mime: null, size_bytes: null, url: null } }, f.id)
  assert.equal(asset.mime, null); assert.equal(asset.size, null); assert.equal(asset.url, null)
})
await check('replace uses one PUT and reads same ref', async () => {
  const f = fixture(), asset = await client.mutatePlatformAsset(f.id, 'replace', f.session, file, ref)
  assert.equal(asset.ref, ref); assert.deepEqual(f.seen.map(item => item.method), ['PUT', 'GET'])
})
await check('delete confirms receipt and authoritative 404', async () => {
  const f = fixture(); assert.equal(await client.mutatePlatformAsset(f.id, 'delete', f.session, undefined, ref), null)
  assert.equal(f.attempt().phase, 'confirmed'); assert.deepEqual(f.seen.map(item => item.method), ['DELETE', 'GET'])
})
await check('delete receipt without absence remains uncertain', async () => {
  const f = fixture('notDeleted'); await assert.rejects(client.mutatePlatformAsset(f.id, 'delete', f.session, undefined, ref))
  assert.equal(f.attempt().phase, 'uncertain')
})
await check('empty HTTP 200 delete receipt still requires authoritative absence', async () => {
  const f = fixture('emptyDelete')
  assert.equal(await client.mutatePlatformAsset(f.id, 'delete', f.session, undefined, ref), null)
  assert.equal(f.attempt().phase, 'confirmed')
  assert.deepEqual(f.seen.map(x => x.method), ['DELETE', 'GET'])
  const present = fixture('emptyNotDeleted')
  await assert.rejects(client.mutatePlatformAsset(present.id, 'delete', present.session, undefined, ref))
  assert.equal(present.attempt().phase, 'uncertain')
  assert.equal(present.seen.filter(x => x.method === 'DELETE').length, 1)
})
await check('unexpected delete body cannot be confirmed by absence alone', async () => {
  const f = fixture('malformedDelete')
  await assert.rejects(client.mutatePlatformAsset(f.id, 'delete', f.session, undefined, ref))
  await assert.rejects(client.reconcilePlatformAsset(f.id, f.session))
  assert.equal(f.attempt().phase, 'uncertain')
  assert.equal(f.seen.filter(x => x.method === 'DELETE').length, 1)
})
await check('empty delete receipt survives failed readback and GET-only recovery', async () => {
  const f = fixture('emptyRead503')
  await assert.rejects(client.mutatePlatformAsset(f.id, 'delete', f.session, undefined, ref))
  assert.equal(f.attempt().phase, 'uncertain'); assert.equal(f.attempt().receipt, true)
  f.state.mode = 'normal'
  assert.equal(await client.reconcilePlatformAsset(f.id, f.session), null)
  assert.equal(f.attempt().phase, 'confirmed')
  assert.deepEqual(f.seen.map(x => x.method), ['DELETE', 'GET', 'GET'])
})
await check('partial and multiline web composites preserve exact strings and extensions', () => {
  const quick = { sideSubtitle: '  Texto\n' + 'x'.repeat(4001), future: { value: null } }
  assert.equal(contract.configValueError('quick_profile.theme', quick), null)
  const registration = { capabilityId: 'platform.entry-journey.registration-content', version: 1, values: { introduction: '  Texto\n<literal>  ' }, future: 42 }
  assert.equal(contract.configValueError('register.content', registration), null)
  const changed = contract.changeAt(registration, ['values', 'submitLabel'], 'Criar')
  assert.equal(changed.values.introduction, registration.values.introduction); assert.equal(changed.future, 42)
  assert.notEqual(contract.configValueError('app_entry.content', { capabilityId: 'platform.app.entry-content', version: 1, locale: 'pt-BR', screens: { login: { submitLabel: '' } } }), null)
})
const { createElement: h } = await import(reactUrl), { renderToStaticMarkup: render } = await import(renderUrl)
globalThis.__assetTestAuth = auth
const ui = await moduleLoader({ overrides: { 'src/lib/authSession.ts': 'export const useSessionOperator=()=>globalThis.__assetTestAuth.getOperator();export const getOperator=useSessionOperator;export const getAccessToken=()=>globalThis.__assetTestAuth.getAccessToken();export const getSessionVersion=()=>globalThis.__assetTestAuth.getSessionVersion();export const subscribeSession=()=>()=>{};export const handleUnauthorized=()=>{};' } })('src/features/whitelabel-settings/PlatformAssetEditor.tsx')
await check('rendered role boundary and explicit absent preview', () => {
  const baseline = { stored: false, storedValue: null, effectiveValue: null, source: 'absent', version: null }
  for (const roles of [['SUPER_ADMIN'], ['READ_ONLY']]) {
    const f = fixture('normal', roles), html = render(h(ui.PlatformAssetEditor, { id: f.id, cell: 'login.main_area_image', baseline, onReload() {} }))
    assert.equal(html.includes('Selecionar imagem PNG'), roles.includes('SUPER_ADMIN'))
    assert.equal(html.includes('Retomar arquivo já enviado'), roles.includes('SUPER_ADMIN'))
    assert.equal(html.includes('Consultar arquivo existente'), roles.includes('SUPER_ADMIN'))
    assert.match(html, /Sem imagem configurada/); assert.match(html, /Não comprova aplicação/)
  }
})
auth.clearSession()
console.log('Platform assets: ' + count + ' focused checks passed (synthetic transport; no live mutations)')
