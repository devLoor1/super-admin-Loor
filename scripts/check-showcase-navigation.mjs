import assert from 'node:assert/strict'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

// Physical current candidates only. No historical boundary can satisfy behavior.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const source = path => readFileSync(resolve(root, path), 'utf8').replaceAll('\r\n', '\n')
const reactUrl = pathToFileURL(require.resolve('react')).href
const { createElement: h } = await import(reactUrl)
const { renderToStaticMarkup: render } = await import(pathToFileURL(require.resolve('react-dom/server')).href)
const dataModule = code => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
const homologApi = 'https://backend-super-admin-loor.onrender.com/api'
globalThis.fetch = () => { throw Error('Showcase navigation checks must never request a Backend') }
let checks = 0
async function check(label, run) { try { await run(); checks++ } catch (cause) { throw Error(label, { cause }) } }

function resolveImport(from, specifier) {
  const base = resolve(root, dirname(from), specifier)
  const absolute = [base, `${base}.ts`, `${base}.tsx`, resolve(base, 'index.ts'), resolve(base, 'index.tsx')]
    .find(path => existsSync(path) && statSync(path).isFile())
  assert.ok(absolute, `${from} -> ${specifier}`)
  return relative(root, absolute).replaceAll('\\', '/')
}
function loader({ environment = {}, overrides = {} } = {}) {
  const cache = new Map()
  async function url(path) {
    if (cache.has(path)) return cache.get(path)
    if (Object.hasOwn(overrides, path)) return dataModule(overrides[path])
    if (path.endsWith('.css')) return dataModule('export default new Proxy({}, {get:(_,key)=>String(key)})')
    let code = ts.transpileModule(source(path), { fileName: path, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } }).outputText
      .replaceAll('import.meta.env', `(${JSON.stringify(environment)})`)
    for (const match of [...code.matchAll(/from\s+(['"])([^'"]+)\1/g)]) {
      const target = match[2].startsWith('.') ? await url(resolveImport(path, match[2])) : pathToFileURL(require.resolve(match[2])).href
      code = code.replace(match[0], `from ${JSON.stringify(target)}`)
    }
    const result = dataModule(code)
    cache.set(path, result)
    return result
  }
  return async path => import(await url(path))
}

const authStub = `export const isAuthenticated=()=>globalThis.__showcaseAuthed;export const subscribeSession=()=>()=>{};export const validateSession=async()=>({status:'valid'});export const useSessionOperator=()=>({roles:globalThis.__showcaseRoles});export const getOperator=useSessionOperator;export const getAccessToken=()=>globalThis.__showcaseAuthed?'synthetic-token':null;export const getSessionVersion=()=>1;export const handleUnauthorized=()=>{};export const logout=()=>{};`
const featureOverrides = {}
const appTree = ts.createSourceFile('App.tsx', source('src/app/App.tsx'), ts.ScriptTarget.Latest, true)
for (const node of appTree.statements) {
  if (!ts.isImportDeclaration(node) || !node.moduleSpecifier.text.includes('/features/') || !node.importClause || node.importClause.isTypeOnly) continue
  const names = node.importClause.namedBindings?.elements?.filter(element => !element.isTypeOnly).map(element => element.name.text) ?? []
  if (names.length) featureOverrides[resolveImport('src/app/App.tsx', node.moduleSpecifier.text)] = `import {createElement as h} from ${JSON.stringify(reactUrl)};${names.map(name => `export const ${name}=(props)=>h('section',{'data-page':${JSON.stringify(name)},'data-tenant':props?.tenantId,'data-tab':props?.tab,'data-instance':props?.instanceId});`).join('')}`
}
const shellStub = `import {createElement as h} from ${JSON.stringify(reactUrl)};export const AppShell=({children})=>h('main',null,children);`
const baseOverrides = { ...featureOverrides, 'src/lib/authSession.ts': authStub, 'src/components/shell/AppShell.tsx': shellStub }
const cardId = '9b8254c6-8f36-44dd-a3fe-238f2e0560df'
const editor = '#/whitelabels/6/settings/plataforma/vitrine'

for (const development of [false, true]) {
  for (const flag of [undefined, 'false', 'TRUE', '1', 'true']) {
    const enabled = flag === 'true'
    const load = loader({ environment: { DEV: development, VITE_API_BASE_URL: homologApi, VITE_SHOWCASE_ENABLED: flag }, overrides: baseOverrides })
    const availability = await load('src/app/presentationAvailability.ts')
    const { App } = await load('src/app/App.tsx')
    globalThis.__showcaseAuthed = true
    globalThis.__showcaseRoles = ['SUPER_ADMIN']
    for (const [hash, page] of [[editor, 'ShowcaseSettingsPage'], [`${editor}?aba=cards`, 'ShowcaseSettingsPage'], [`${editor}/cards/${cardId}`, 'CardEditorPage']]) {
      await check(`Actual App route gate DEV=${development} flag=${flag}: ${hash}`, () => {
        globalThis.window = { location: { hash } }
        const html = render(h(App))
        assert.equal(html.includes(`data-page="${page}"`), enabled)
        assert.equal(html.includes('data-readiness-unavailable'), !enabled)
      })
    }
    await check(`Central presentation gate matches build gate DEV=${development} flag=${flag}`, () => {
      assert.equal(availability.viewAvailable('settings-showcase'), enabled)
      assert.equal(availability.viewAvailable('settings-showcase-card'), enabled)
      assert.equal(availability.viewAvailable('dashboard'), true)
      assert.equal(availability.viewAvailable('settings'), true)
    })
    await check(`Login remains required before editor gate DEV=${development} flag=${flag}`, () => {
      globalThis.__showcaseAuthed = false
      globalThis.window = { location: { hash: editor } }
      assert.ok(render(h(App)).includes('data-page="LoginPage"'))
      globalThis.__showcaseAuthed = true
    })
    if (enabled) {
      for (const suffix of ['?aba=unknown', '?aba=cards&aba=banner', '?extra=1', `/cards/${cardId}?campo=a&campo=b`, `/cards/${cardId}?extra=1`]) {
        await check(`Actual App refuses ambiguous/unsupported query ${suffix}`, () => {
          globalThis.window = { location: { hash: editor + suffix } }
          assert.ok(render(h(App)).includes('data-readiness-unavailable'))
        })
      }
      for (const [hash, page] of [['#/dashboard', 'DashboardPage'], ['#/whitelabels/6/settings', 'OperationalSettingsPage'], ['#/whitelabels/7/accounts', 'WhitelabelAccountsPage']]) {
        await check(`Existing route retained ${hash}`, () => {
          globalThis.window = { location: { hash } }
          assert.ok(render(h(App)).includes(`data-page="${page}"`))
        })
      }
    }
  }
}

for (const api of [homologApi, 'https://api.example.invalid/api', 'https://backend-super-admin-loor.onrender.com/api/other']) {
  const load = loader({ environment: { VITE_API_BASE_URL: api, VITE_SHOWCASE_ENABLED: 'true' }, overrides: { 'src/lib/authSession.ts': authStub } })
  const access = await load('src/features/whitelabel-showcase/showcaseAccess.ts')
  for (const roles of [['SUPER_ADMIN'], ['READ_ONLY'], ['SUPPORT_ADMIN'], []]) {
    for (const [tenantId, tenantSlug] of [['6', 'homologacao'], ['4', 'homolog-loor-demo'], ['6', 'laguna-homologacao'], ['7', 'laguna-homologacao'], ['6', undefined]]) {
      await check(`Real context/role entry gate ${api}/${tenantId}/${tenantSlug}/${roles}`, () => {
        const allowed = api === homologApi && tenantId === '6' && tenantSlug === 'homologacao' && roles.some(role => role === 'SUPER_ADMIN' || role === 'READ_ONLY')
        assert.equal(access.showcaseSettingsEntryHref({ tenantId, tenantSlug, roles }) !== null, allowed)
        assert.equal(access.canEditShowcase(roles), roles.includes('SUPER_ADMIN'))
      })
    }
  }
}

const guardLoad = loader()
const frameLoad = loader({ environment: { VITE_API_BASE_URL: homologApi, VITE_SHOWCASE_ENABLED: 'true' }, overrides: {
  'src/lib/authSession.ts': authStub,
  'src/components/shell/AppShell.tsx': shellStub,
  'src/features/whitelabels/visuals/DotMatrixBackground.tsx': 'export const DotMatrixBackground=()=>null;',
  'src/features/whitelabel-showcase/editor/editorHooks.ts': `export const useShowcaseActor=()=>({actor:{roles:globalThis.__showcaseRoles,sessionVersion:1},canEdit:globalThis.__showcaseRoles.includes('SUPER_ADMIN'),canView:globalThis.__showcaseRoles.some(r=>['SUPER_ADMIN','READ_ONLY'].includes(r))});`,
  'src/features/operation/shared/whitelabelContext.ts': `export const useWhitelabelRecord=id=>{globalThis.__showcaseOwnerQueries.push(id);return{state:globalThis.__showcaseOwner,reload(){}}};`,
  'src/features/whitelabel-showcase/showcaseStore.ts': `export const useShowcaseState=()=>globalThis.__showcaseFrameState;export const getShowcaseState=useShowcaseState;export const loadShowcase=()=>{throw Error('Effects are not executed during static rendering')};`,
} })
const { ShowcaseFrame } = await frameLoad('src/features/whitelabel-showcase/editor/ShowcaseFrame.tsx')
const { ShowcaseEntryCard } = await frameLoad('src/features/whitelabel-showcase/editor/ShowcaseEntryCard.tsx')
for (const roles of [['SUPER_ADMIN'], ['READ_ONLY'], ['SUPPORT_ADMIN'], []]) {
  for (const [tenantId, slug] of [['6', 'homologacao'], ['4', 'homolog-loor-demo'], ['6', 'laguna-homologacao']]) {
    await check(`Actual entry and direct frame require authoritative owner ${roles}/${tenantId}/${slug}`, () => {
      globalThis.__showcaseRoles = roles
      globalThis.__showcaseOwnerQueries = []
      globalThis.__showcaseOwner = { status: 'success', data: { id: tenantId, slug } }
      globalThis.__showcaseFrameState = { loadPhase: 'ready' }
      const permittedRole = roles.some(role => ['SUPER_ADMIN', 'READ_ONLY'].includes(role))
      const allowed = permittedRole && tenantId === '6' && slug === 'homologacao'
      const html = render(h(ShowcaseFrame, { tenantId, title: 'Vitrine', crumbs: [] }, h('p', null, 'PRIVATE_EDITOR_CHILD')))
      assert.equal(html.includes('PRIVATE_EDITOR_CHILD'), allowed)
      assert.deepEqual(globalThis.__showcaseOwnerQueries, [permittedRole && tenantId === '6' ? '6' : null])
      const entry = render(h(ShowcaseEntryCard, { record: { id: tenantId, slug } }))
      assert.equal(entry.includes('Vitrine de White Labels'), allowed)
    })
  }
}
for (const phase of ['idle', 'loading', 'error']) {
  await check(`Actual frame never fabricates content for load state ${phase}`, () => {
    globalThis.__showcaseRoles = ['SUPER_ADMIN']
    globalThis.__showcaseOwnerQueries = []
    globalThis.__showcaseOwner = { status: 'success', data: { id: '6', slug: 'homologacao' } }
    globalThis.__showcaseFrameState = { loadPhase: phase, message: 'Synthetic safe error' }
    const html = render(h(ShowcaseFrame, { tenantId: '6', title: 'Vitrine', crumbs: [] }, h('p', null, 'PRIVATE_EDITOR_CHILD')))
    assert.equal(html.includes('PRIVATE_EDITOR_CHILD'), false)
    assert.ok(html.includes(phase === 'error' ? 'Não foi possível carregar' : 'Carregando configuração'))
  })
}
await check('Actual frame rejects a response with a different ID even if the slug matches', () => {
  globalThis.__showcaseRoles = ['SUPER_ADMIN']
  globalThis.__showcaseOwnerQueries = []
  globalThis.__showcaseOwner = { status: 'success', data: { id: '7', slug: 'homologacao' } }
  globalThis.__showcaseFrameState = { loadPhase: 'ready' }
  const html = render(h(ShowcaseFrame, { tenantId: '6', title: 'Vitrine', crumbs: [] }, h('p', null, 'PRIVATE_EDITOR_CHILD')))
  assert.equal(html.includes('PRIVATE_EDITOR_CHILD'), false)
  assert.ok(html.includes('registro confirmado não corresponde'))
})
const guard = await guardLoad('src/app/navigationGuard.ts')
await check('Voluntary logout consults guard before session clearing; cancel preserves caller', () => {
  let clears = 0
  let held
  const unregister = guard.registerLogoutGuard(proceed => { held = proceed; return false })
  guard.requestLogout(() => { clears++ })
  assert.equal(clears, 0)
  assert.equal(typeof held, 'function')
  // Cancelling never invokes the held continuation.
  assert.equal(clears, 0)
  held()
  assert.equal(clears, 1)
  unregister()
  guard.requestLogout(() => { clears++ })
  assert.equal(clears, 2)
})
await check('Leaving editor unregisters its guard; older cleanup cannot remove newer guard', () => {
  let cleared = 0, latest = 0
  const old = guard.registerLogoutGuard(() => false)
  const current = guard.registerLogoutGuard(() => { latest++; return true })
  old()
  guard.requestLogout(() => { cleared++ })
  assert.equal(latest, 1)
  assert.equal(cleared, 1)
  current()
  guard.requestLogout(() => { cleared++ })
  assert.equal(latest, 1)
  assert.equal(cleared, 2)
})
await check('Fallback logout guard is consulted only without a mounted page guard, and cleans up', () => {
  let cleared = 0, fallbackPrompts = 0, pagePrompts = 0
  const unregisterFallback = guard.registerFallbackLogoutGuard(() => { fallbackPrompts++; return false })
  guard.requestLogout(() => { cleared++ })
  assert.equal(cleared, 0)
  assert.equal(fallbackPrompts, 1)
  const unregisterPage = guard.registerLogoutGuard(() => { pagePrompts++; return true })
  guard.requestLogout(() => { cleared++ })
  assert.equal(cleared, 1)
  assert.equal(pagePrompts, 1)
  assert.equal(fallbackPrompts, 1)
  unregisterPage()
  const newer = guard.registerFallbackLogoutGuard(() => true)
  unregisterFallback()
  guard.requestLogout(() => { cleared++ })
  assert.equal(cleared, 2)
  newer()
  guard.requestLogout(() => { cleared++ })
  assert.equal(cleared, 3)
})
await check('Actual App retained-draft fallback asks once, honors cancellation and bypasses clean state', () => {
  let pending = false, confirmation = false, prompts = 0, cleared = 0
  const effects = []
  globalThis.window = { location: { hash: '#/dashboard' }, confirm: () => { prompts++; return confirmation } }
  const compiled = ts.transpileModule(source('src/app/App.tsx'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const jsx = (type, props) => ({ type, props })
  const modules = {
    react: { useEffect: fn => { effects.push(fn) }, useState: value => [typeof value === 'function' ? value() : value, () => {}] },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    '../lib/authSession': { isAuthenticated: () => true, subscribeSession: () => () => {}, validateSession: async () => ({ status: 'valid' }) },
    './navigationGuard': guard,
    './presentationAvailability': { viewAvailable: () => true },
    '../features/whitelabel-showcase/showcaseStore': { installDraftUnloadProtection: () => () => {}, hasPendingDraft: () => pending },
  }
  const exports = {}
  new Function('require', 'exports', compiled)(name => Object.hasOwn(modules, name) ? modules[name] : new Proxy({}, { get: (_, key) => key }), exports)
  exports.App()
  const cleanup = effects[1]()
  guard.requestLogout(() => { cleared++ })
  assert.equal(cleared, 1)
  assert.equal(prompts, 0)
  pending = true
  guard.requestLogout(() => { cleared++ })
  assert.equal(cleared, 1)
  assert.equal(prompts, 1)
  confirmation = true
  guard.requestLogout(() => { cleared++ })
  assert.equal(cleared, 2)
  assert.equal(prompts, 2)
  cleanup()
  confirmation = false
  guard.requestLogout(() => { cleared++ })
  assert.equal(cleared, 3)
  assert.equal(prompts, 2)
})
await check('Actual header logout handler uses the shared guard, preserving immediate logout elsewhere', () => {
  let cleared = 0, held
  const compiled = ts.transpileModule(source('src/components/shell/TopHeader.tsx'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const jsx = (type, props) => ({ type, props })
  const modules = {
    react: { useEffect() {}, useId: () => 'synthetic-menu', useRef: () => ({ current: null }), useState: () => [true, () => {}] },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'lucide-react': new Proxy({}, { get: (_, name) => name }),
    '../../lib/authSession': { logout: () => { cleared++ }, useSessionOperator: () => ({ name: 'Synthetic operator' }) },
    '../../app/navigationGuard': guard,
    './TopHeader.module.css': { default: new Proxy({}, { get: (_, name) => name }) },
  }
  const exports = {}
  new Function('require', 'exports', compiled)(name => { assert.ok(Object.hasOwn(modules, name), `Unexpected header import ${name}`); return modules[name] }, exports)
  const tree = exports.TopHeader({ title: 'Vitrine', location: '', navOpen: false, onOpenNav() {} })
  function find(node) {
    if (!node || typeof node !== 'object') return undefined
    if (node.props?.role === 'menuitem') return node
    for (const child of [node.props?.children].flat(Infinity)) { const match = find(child); if (match) return match }
  }
  const button = find(tree)
  assert.ok(button)
  const unregister = guard.registerLogoutGuard(proceed => { held = proceed; return false })
  button.props.onClick()
  assert.equal(cleared, 0)
  held()
  assert.equal(cleared, 1)
  unregister()
  button.props.onClick()
  assert.equal(cleared, 2)
})
function leaveHookHarness(onConfirm) {
  const slots = []
  let cursor = 0
  const compiled = ts.transpileModule(source('src/features/whitelabel-showcase/editor/useShowcaseLeaveGuard.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const react = {
    useState(initial) {
      const index = cursor++
      if (!(index in slots)) slots[index] = initial
      return [slots[index], next => { slots[index] = typeof next === 'function' ? next(slots[index]) : next }]
    },
    useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial } },
    useCallback: callback => callback,
    // Registration/cleanup is covered by the actual shared guards above. This
    // harness isolates the actual hook's async confirmation state machine.
    useEffect() {},
  }
  const exports = {}
  new Function('require', 'exports', compiled)(name => {
    if (name === 'react') return react
    if (name === '../../../app/navigationGuard' || name === './showcaseNavigation') return {}
    throw Error(`Unexpected leave hook import ${name}`)
  }, exports)
  const prompt = { title: 'Synthetic discard', description: 'Synthetic QA', confirmLabel: 'Confirm', onConfirm }
  globalThis.window = { location: { hash: '#/whitelabels/6/settings/plataforma/vitrine' } }
  return { render() { cursor = 0; return exports.useShowcaseLeaveGuard(() => prompt, true) } }
}
await check('Actual leave hook waits for authoritative discard before navigating', async () => {
  let complete, calls = 0
  const pending = new Promise(resolve => { complete = resolve })
  const harness = leaveHookHarness(() => { calls++; return pending })
  harness.render().request('#/dashboard')
  const state = harness.render()
  const operation = state.confirm()
  assert.equal(window.location.hash, '#/whitelabels/6/settings/plataforma/vitrine')
  assert.equal(harness.render().confirming, true)
  assert.equal(calls, 1)
  complete(true)
  await operation
  assert.equal(window.location.hash, '#/dashboard')
  assert.equal(harness.render().confirming, false)
  assert.equal(harness.render().pending, null)
})
await check('Actual leave hook rejects failed discard without losing the editor route', async () => {
  for (const outcome of [false, new Error('synthetic GET failure')]) {
    const harness = leaveHookHarness(async () => { if (outcome instanceof Error) throw outcome; return outcome })
    harness.render().request('#/dashboard')
    await harness.render().confirm()
    assert.equal(window.location.hash, '#/whitelabels/6/settings/plataforma/vitrine')
    assert.equal(harness.render().confirming, false)
    assert.equal(harness.render().pending, null)
  }
})
await check('Actual leave hook locks duplicate confirmation and cancellation while pending', async () => {
  let complete, calls = 0
  const pending = new Promise(resolve => { complete = resolve })
  const harness = leaveHookHarness(() => { calls++; return pending })
  harness.render().request('#/dashboard')
  const state = harness.render(), operation = state.confirm()
  await state.confirm()
  state.cancel()
  assert.equal(calls, 1)
  assert.ok(harness.render().pending)
  assert.equal(harness.render().confirming, true)
  complete(false)
  await operation
  assert.equal(window.location.hash, '#/whitelabels/6/settings/plataforma/vitrine')
  harness.render().request('#/dashboard')
  harness.render().cancel()
  assert.equal(harness.render().pending, null)
})
await check('23 persisted IDs and existing permissions remain byte-identical', () => {
  for (const path of ['src/features/menu-visibility/menuRegistry.ts', 'src/features/menu-visibility/visibilityPolicy.ts', 'src/features/menu-visibility/visibilityResolver.ts', 'src/lib/authSession.ts']) {
    assert.equal(source(path), execFileSync('git', ['show', `d49815d:${path}`], { cwd: root, encoding: 'utf8' }).replaceAll('\r\n', '\n'))
  }
})
const registry = await guardLoad('src/features/menu-visibility/menuRegistry.ts')
assert.equal(registry.MENU_VISIBILITY_IDS.length, 23)
assert.equal(new Set(registry.MENU_VISIBILITY_IDS).size, 23)
console.log(`Showcase navigation: ${checks} checks passed (physical App/header/guards; synthetic roles; no network).`)
