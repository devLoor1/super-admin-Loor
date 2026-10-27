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
check('operational page delegates editing without introducing transport or legal publication', () => {
  assert.doesNotMatch(runtime, /method:.*(?:PUT|POST|PATCH|DELETE)|TermsWriteEditor|dangerouslySetInnerHTML/)
})
// AST replaces the old detached SET editor with the contextual studio. Render
// that physical integration instead of normalizing it to historical JSX or
// retaining the superseded rule that qualified App content cannot be edited.
// Only auth/read hooks and the shared shell are fixtures; the page, studio,
// editor selection, role gating, provenance checks and previews remain actual.
globalThis.fetch = () => { throw Error('Configuration evolution must not request a Backend') }
const setContract = await load('src/features/whitelabel-settings/settingsWriteContract.ts')
const fixture = globalThis.__configEvolutionFixture = { roles: ['SUPER_ADMIN'], data: null, smtp: null }
const raw = source()
raw.data.provenance = setContract.SETTINGS_FIELDS.map(cell => {
  const [page,key] = cell.split('.')
  const value = page === 'features' ? true : key === 'bullets' ? ['Primeiro destaque','Segundo destaque','Terceiro destaque'] : `Texto salvo ${key}`
  raw.data.settings[page] ??= {}; raw.data.settings[page][key] = value
  return { page,key,stored:true,storedValue:value,effectiveValue:value,source:'stored',version:'synthetic-set-v1' }
})
for (const kind of ['entry', 'authenticated']) {
  const page = kind === 'entry' ? 'app_entry' : 'app_authenticated', value = payload(kind)
  raw.data.settings[page] = { content: value }
  raw.data.provenance.push({ page,key:'content',stored:true,storedValue:value,effectiveValue:value,source:'stored',version:'synthetic-app-v1' })
}
fixture.data = api.parseSettingsRead(raw, '400')
const integrated = moduleLoader({ overrides: {
  'src/lib/authSession.ts': `export const getOperator=()=>({id:'synthetic',roles:globalThis.__configEvolutionFixture.roles});export const useSessionOperator=getOperator;export const getSessionVersion=()=>1;export const subscribeSession=()=>()=>{};export const getAccessToken=()=>null;export const handleUnauthorized=()=>{};`,
  'src/components/shell/AppShell.tsx': `import {createElement as h} from ${JSON.stringify(reactUrl)};export const AppShell=({children})=>h('main',null,children);`,
  'src/features/operation/shared/whitelabelContext.ts': `const tenant={id:'400',name:'Synthetic tenant',slug:'synthetic',status:'active'};export const useWhitelabelRecord=id=>({state:id==='400'?{status:'success',data:tenant}:{status:'loading'},reload(){}});export const useWhitelabelOptions=()=>({state:{status:'success',data:{rows:[tenant]}},reload(){}});`,
  'src/features/whitelabel-settings/useSettingsRead.ts': `export const useSettingsRead=()=>({state:{status:'success',data:globalThis.__configEvolutionFixture.data},reload(){}});`,
  'src/features/whitelabel-emails/useSmtpRead.ts': `export const useSmtpRead=()=>({state:{status:'success',data:globalThis.__configEvolutionFixture.smtp},reload(){}});`,
  // These tabs are outside this SMTP regression; fail if routing selects them.
  'src/features/whitelabel-emails/EmailTemplatesWorkspace.tsx': `export function EmailTemplatesWorkspace(){throw Error('SMTP regression selected templates')}`,
  'src/features/whitelabel-emails/EmailBrandingWorkspace.tsx': `export function EmailBrandingWorkspace(){throw Error('SMTP regression selected branding')}`,
} })
const { OperationalSettingsPage } = await integrated('src/features/whitelabel-settings/OperationalSettingsPage.tsx')
for (const role of ['SUPER_ADMIN','READ_ONLY']) {
  fixture.roles = [role]
  for (const cell of setContract.SETTINGS_FIELDS) check(`actual studio preserves ${role} SET access for ${cell}`, () => {
    const html = render(h(OperationalSettingsPage, { whitelabelId:'400',area:'platform',cell }))
    assert.match(html,/Editor da Plataforma/)
    assert.match(html,/Substituição própria armazenada/)
    assert.equal(html.includes('Editar configuração'),role==='SUPER_ADMIN')
    assert.equal(html.includes('Salvar configuração'),role==='SUPER_ADMIN')
    assert.equal(html.includes('Remover substituição'),role==='SUPER_ADMIN')
    assert.match(html,/<fieldset[^>]*disabled/)
  })
  for (const cell of ['app_entry.content','app_authenticated.content']) check(`qualified ${role} App editor is reached through the operational area`, () => {
    const html = render(h(OperationalSettingsPage, { whitelabelId:'400',area:'app',cell }))
    assert.match(html,/Editor do Platform App|Conteúdo do aplicativo/)
    assert.match(html,/Persisted QA text/)
    assert.equal(html.includes('Editar configuração'),role==='SUPER_ADMIN')
    assert.equal(html.includes('Salvar configuração'),role==='SUPER_ADMIN')
  })
}
fixture.roles = ['SUPER_ADMIN']
for (const area of ['terms','identity']) check(`actual ${area} route remains read-only even with an editable cell query`, () => {
  const html = render(h(OperationalSettingsPage, { whitelabelId:'400',area,cell:'login.title' }))
  assert.doesNotMatch(html,/Editar configuração|Salvar configuração|Publicar revisão|Remover substituição|Editor da Plataforma|Editor do Platform App/)
})
check('actual studio requires provenance before offering SET edits', () => {
  const prior = fixture.data
  fixture.data = api.parseSettingsRead(source(), '400')
  try {
    const html = render(h(OperationalSettingsPage, { whitelabelId:'400',area:'platform',cell:'login.title' }))
    assert.match(html,/Proveniência não fornecida/)
    assert.doesNotMatch(html,/Editar configuração|Salvar configuração|Remover substituição/)
  } finally { fixture.data = prior }
})
const smtpApi = await load('src/features/whitelabel-emails/smtpReadApi.ts')
fixture.smtp = smtpApi.parseSmtpRead({data:{id:901,whitelabelId:400,host:'smtp.example.invalid',port:587,secure:false,hasUsername:true,hasPassword:true,configured:true,active:false,version:'synthetic-smtp-v1',fromEmail:'qa@example.invalid',fromName:'Synthetic sender',tlsRejectUnauthorized:true,createdAt:null,updatedAt:null}},'400')
const { OperationalSmtpPage } = await integrated('src/features/whitelabel-emails/OperationalSmtpPage.tsx')
for (const role of ['SUPER_ADMIN','READ_ONLY']) check(`SMTP area retains the authorized metadata editor for ${role}`, () => {
  fixture.roles = [role]
  const html = render(h(OperationalSmtpPage, { whitelabelId:'400',section:'smtp' }))
  assert.match(html,/smtp\.example\.invalid/)
  assert.equal(html.includes('Editar metadados SMTP'),role==='SUPER_ADMIN')
  assert.doesNotMatch(html,/<input[^>]+(?:name|type)="(?:password|username)"/)
})
delete globalThis.__configEvolutionFixture
const registry = await load('src/features/menu-visibility/menuRegistry.ts')
check('no new persisted visibility identifiers', () => { assert.equal(registry.MENU_VISIBILITY_IDS.length, 23); assert.equal(registry.MENU_VISIBILITY_IDS.includes('platform-app'), false); assert.equal(registry.MENU_VISIBILITY_IDS.includes('whitelabel-settings'), true) })
console.log(`Tenant configuration evolution: ${checks} checks passed (actual read projections, public App contracts and rendered navigation; no network)`)
