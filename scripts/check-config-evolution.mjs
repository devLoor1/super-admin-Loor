import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { moduleLoader, root, reactUrl, renderUrl } from './operators-test-harness.mjs'
const load = moduleLoader()
const { createElement: h } = await import(reactUrl), { renderToStaticMarkup: render } = await import(renderUrl)
globalThis.window = { setTimeout, clearTimeout, location: { hash: '' }, matchMedia: () => ({ matches: true, addEventListener(){}, removeEventListener(){} }) }
globalThis.document = { hidden: false }
let checks = 0
function check(name, fn) { try { fn(); checks++ } catch(cause) { throw Error(name, { cause }) } }
const app = await load('src/features/whitelabel-settings/appContentRead.ts')
const api = await load('src/features/whitelabel-settings/settingsReadApi.ts')
const nav = { ...await load('src/features/whitelabel-settings/configRoute.ts'), ...await load('src/features/whitelabel-settings/ConfigNavigation.tsx') }
const { PlatformAppRead } = await load('src/features/whitelabel-settings/PlatformAppRead.tsx')
const { SettingsReadCards } = await load('src/features/whitelabel-settings/OperationalSettingsPage.tsx')
const schema = kind => kind === 'entry' ? app.APP_ENTRY_GROUPS : app.APP_AUTH_GROUPS
function payload(kind) { return { capabilityId: kind === 'entry' ? 'platform.app.entry-content' : 'platform.app.authenticated-content', version: 1, locale: 'pt-BR', screens: Object.fromEntries(schema(kind).map(group => [group.id, Object.fromEntries(group.fields.map(field => [field.key, 'Persisted QA text']))])) } }
const source = () => ({ data: { whitelabel: { id: 400, name: 'Synthetic tenant', slug: 'synthetic', baseUrl: 'https://qa.example.invalid', isActive: true }, settings: {}, terms: { current: null, history: [] } } })
for (const kind of ['entry', 'authenticated']) {
  const page = kind === 'entry' ? 'app_entry' : 'app_authenticated'
  check(`${kind} missing is not consumer default`, () => assert.deepEqual(app.readAppContent({}, kind), { state: 'missing', groups: [] }))
  check(`${kind} null remains null`, () => assert.equal(app.readAppContent({ [page]: null }, kind).state, 'null'))
  check(`${kind} scalar page is incompatible`, () => assert.equal(app.readAppContent({ [page]: 42 }, kind).state, 'incompatible'))
  check(`${kind} exact field count`, () => { const out = app.readAppContent({ [page]: { content: payload(kind) } }, kind); assert.equal(out.groups.flatMap(g => g.fields).length, kind === 'entry' ? 20 : 13); assert.ok(out.groups.every(g => g.fields.every(f => f.reading.value === 'Persisted QA text'))) })
  for (const mutation of [p => p.version = 2, p => p.locale = 'en-US', p => p.capabilityId = 'future', p => p.screens = []]) check(`${kind} incompatible schema remains independent`, () => { const p = payload(kind); mutation(p); const raw = source(); raw.data.settings[page] = { content: p }; const parsed = api.parseSettingsRead(raw, '400'); assert.equal(parsed.app[kind].state, 'incompatible'); assert.equal(parsed.name.value, 'Synthetic tenant') })
  const group = schema(kind)[0], field = group.fields[0]
  for (const bad of ['', '   ', '<script>unsafe</script>', '{{token}}', '${token}', '%VALUE%', 'Bearer synthetic-secret', 'x\u0000y', 'x\u200by', 'a'.repeat(field.maxLength + 1), {}, false]) check(`${kind} invalid public field cannot reach React`, () => { const p = payload(kind); p.screens[group.id][field.key] = bad; const out = app.readAppContent({ [page]: { content: p } }, kind); assert.equal(out.groups[0].fields[0].reading.state, 'invalid'); assert.doesNotMatch(JSON.stringify(out), /synthetic-secret|<script>|Bearer/) })
  check(`${kind} unknown fields and credentials dropped`, () => { const p = payload(kind); p.password = 'SECRET_SENTINEL'; p.screens.unknown = { token: 'SECRET_SENTINEL' }; p.screens[group.id].unknown = 'SECRET_SENTINEL'; assert.doesNotMatch(JSON.stringify(app.readAppContent({ [page]: { content: p } }, kind)), /SECRET_SENTINEL|"unknown"|"password":/) })
  check(`${kind} getters are never invoked`, () => { const p = payload(kind); let read = false; Object.defineProperty(p.screens[group.id], field.key, { get(){ read = true; return 'SECRET_SENTINEL' } }); app.readAppContent({ [page]: { content: p } }, kind); assert.equal(read, false) })
}
for (const area of ['platform', 'app', 'identity', 'terms']) check(`canonical area ${area}`, () => assert.equal(nav.configArea(area), area))
for (const area of ['unknown', '../app', 'smtp', 'email', 'Platform', 'app&tenant=2']) check(`invalid area ${area}`, () => assert.equal(nav.configArea(area), null))
check('navigation keeps tenant and uses existing destinations', () => { const html = render(h(nav.ConfigNavigation, { id: '400', active: 'app' })); assert.equal((html.match(/aria-current="page"/g) || []).length, 1); assert.equal((html.match(/whitelabels\/400\//g) || []).length, 5); assert.match(html, /area=app/); assert.match(html, /emails\?section=smtp/); assert.doesNotMatch(html, /_proto_|wl_proto/) })
check('missing App content stays truthful', () => { const html = render(h(PlatformAppRead, { entry: { state: 'missing', groups: [] }, authenticated: { state: 'null', groups: [] } })); assert.match(html, /não foi informada/); assert.doesNotMatch(html, /Persisted QA text|Esqueci minha senha|type="text"|Salvar/) })
check('Terms remains text-only, no publication or HTML execution', () => { const raw = source(); raw.data.terms.current = { configured: true, revision_id: 4, revision: 4, title: 'QA', content_markdown: '<script>SECRET_SENTINEL</script>', published_at: '2026-10-25T12:00:00Z', updated_at: '2026-10-25T12:00:00Z' }; const html = render(h(SettingsReadCards, { data: api.parseSettingsRead(raw, '400'), area: 'terms' })); assert.match(html, /&lt;script&gt;/); assert.doesNotMatch(html, /<script>|dangerouslySetInnerHTML|Publicar revisão/) })
const runtime = await readFile(resolve(root, 'src/features/whitelabel-settings/OperationalSettingsPage.tsx'), 'utf8')
check('unaccepted write UI is not in operational import graph', () => assert.doesNotMatch(runtime, /import.*SettingsWriteEditor|releasedFields=|method:.*PUT/))
const registry = await load('src/features/menu-visibility/menuRegistry.ts')
check('no new persisted visibility identifiers', () => { assert.equal(registry.MENU_VISIBILITY_IDS.length, 23); assert.equal(registry.MENU_VISIBILITY_IDS.includes('platform-app'), false); assert.equal(registry.MENU_VISIBILITY_IDS.includes('whitelabel-settings'), true) })
console.log(`Tenant configuration evolution: ${checks} checks passed (actual read projections, public App contracts and rendered navigation; no network)`)
