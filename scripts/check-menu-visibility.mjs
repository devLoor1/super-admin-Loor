import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

// Menu Visibility Frontend V1 — non-persisting prototype checks (synthetic, no network).
// MENU VISIBILITY FRONTEND V1 IS A NON-PERSISTING PROTOTYPE. THE REAL APPLICATION
// NAVIGATION IS NOT MODIFIED BY PROTOTYPE TOGGLES. These checks fail if production
// code can request GET/PUT menu-visibility, persist the draft in browser storage,
// leak it globally, or drift from the approved stable menu IDs.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(pathToFileURL(resolve(root, 'package.json')))
const modules = new Map()
async function moduleUrl(path, override) {
  const key = override === undefined ? path : `${path}:${override}`
  if (modules.has(key)) return modules.get(key)
  if (path.endsWith('.css')) return `data:text/javascript;base64,${Buffer.from('export default new Proxy({}, {get:(_,key)=>String(key)})').toString('base64')}`
  let code = ts.transpileModule(override ?? await readFile(path, 'utf8'), {
    fileName: path,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
  }).outputText.replaceAll('import.meta.env', '({VITE_API_BASE_URL:"https://control-plane.example.invalid/api"})')
  for (const match of [...code.matchAll(/from\s+(['"])([^'"]+)\1/g)]) {
    const specifier = match[2]
    const base = resolve(dirname(path), specifier)
    const url = specifier.startsWith('data:') ? specifier : specifier.startsWith('.')
      ? await moduleUrl(base.endsWith('.css') ? base : existsSync(`${base}.ts`) ? `${base}.ts` : `${base}.tsx`)
      : pathToFileURL(require.resolve(specifier)).href
    code = code.replace(match[0], `from ${JSON.stringify(url)}`)
  }
  const url = `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
  modules.set(key, url)
  return url
}
const load = async (path, override) => import(await moduleUrl(resolve(root, path), override))
globalThis.fetch = () => {
  throw new Error('Unexpected network operation in Menu Visibility checks')
}
let checks = 0
function check(condition, message) {
  assert.ok(condition, message)
  checks += 1
}

// Stable IDs exactly as listed in the Backend requirement (order not significant).
const APPROVED = [
  'dashboard',
  'plataformas', 'whitelabels', 'contas', 'whitelabel-settings', 'whitelabel-emails',
  'operacao', 'operation-opportunities', 'operation-investors', 'operation-entrepreneurs',
  'financeiro', 'finance-gateways', 'finance-modalities', 'finance-catalogs', 'finance-investments', 'finance-payments', 'finance-wallets',
  'compliance', 'compliance-kyc',
  'auditoria',
  'sistema', 'configuracoes', 'ajuda',
]

const nav = await load('src/components/shell/navigation.ts')
const registry = await load('src/features/menu-visibility/menuRegistry.ts')
const model = await load('src/features/menu-visibility/visibilityModel.ts')
const contract = await load('src/features/menu-visibility/menuVisibilityContract.ts')
const route = await load('src/features/menu-visibility/menuVisibilityRoute.ts')
const proto = await load('src/features/menu-visibility/prototypeVisibility.ts')
const { ApiError } = await load('src/lib/api.ts')

/* ---------- registry: approved IDs only, identity read from navigation ---------- */
const ids = [...registry.MENU_VISIBILITY_IDS]
check(ids.length === APPROVED.length && new Set(ids).size === ids.length, 'Registry has the approved number of unique IDs')
check(APPROVED.every((id) => ids.includes(id)) && ids.every((id) => APPROVED.includes(id)), 'Registry IDs equal the approved stable IDs')
check(!ids.includes('operation-companies') && !ids.some((id) => /compan|empresa/i.test(id)), 'Companies has no visibility ID')
const entryIds = registry.MENU_ENTRIES.map((entry) => entry.id)
check(entryIds.length === ids.length && entryIds.every((id) => ids.includes(id)), 'Every approved ID has exactly one navigation entry')
const navFlat = [...nav.PRIMARY_NAV, ...nav.UTILITY_NAV].flatMap((item) => [
  { item, parent: null, area: nav.PRIMARY_NAV.includes(item) ? 'primary' : 'utility' },
  ...(item.children ?? []).map((child) => ({ item: child, parent: item.id, area: nav.PRIMARY_NAV.includes(item) ? 'primary' : 'utility' })),
])
check(navFlat.every(({ item }) => ids.includes(item.id)), 'Every current navigation entry is covered (no unapproved menu item to decide)')
check(navFlat.map(({ item }) => item.id).join() === entryIds.join(), 'Registry keeps the real sidebar order')
for (const { item, parent, area } of navFlat) {
  const entry = registry.menuEntry(item.id)
  check(entry.label === item.label && entry.icon === item.icon, `${item.id}: label and icon come from navigation (not duplicated)`)
  check(entry.parentId === parent && entry.area === area, `${item.id}: hierarchy comes from navigation`)
}
check(registry.menuEntry('operation-investors').parentId === 'operacao' && registry.menuEntry('finance-wallets').parentId === 'financeiro', 'Parent / child pairs')
check(registry.menuEntry('sistema').children.length === 0, 'Sistema has no children in the current navigation')
check(registry.menuEntry('configuracoes').parentId === null && registry.menuEntry('ajuda').parentId === null, 'Configurações / Ajuda are not presented as Sistema children (open question)')
check(['dashboard', 'auditoria'].every((id) => registry.menuEntry(id).parentId === null && registry.menuEntry(id).children.length === 0), 'Dashboard and Auditoria are standalone')
check(registry.isMenuId('dashboard') && !registry.isMenuId('operation-companies') && !registry.isMenuId('__proto__') && !registry.isMenuId(42), 'isMenuId accepts approved IDs only')
check(Object.isFrozen(registry.MENU_ENTRIES) && registry.MENU_ENTRIES.every((entry) => Object.isFrozen(entry)), 'Registry is read-only')

/* ---------- prototype initial state ---------- */
const initial = proto.prototypeInitialMap()
check(ids.every((id) => initial[id] === true) && Object.keys(initial).length === ids.length, 'Prototype default: every known module visible')
check(proto.prototypeInitialMap() !== initial && Object.isFrozen(initial), 'Fresh frozen map per call (no shared singleton draft)')
check(/não foi carregado do backend/i.test(proto.PROTOTYPE_INITIAL_SOURCE.description), 'Initial source is labelled as not loaded from the Backend')

/* ---------- parent / child semantics ---------- */
const P = 'operacao'
const C = 'operation-investors'
let map = initial
check(model.isEffectivelyVisible(map, C), 'parent=true child=true → child visible')
map = model.setPreference(map, P, false)
check(!model.isEffectivelyVisible(map, C) && map[C] === true, 'parent=false child=true → child hidden, stored child stays true')
check(model.effectiveState(map, C).state === 'hidden-by-parent' && model.effectiveState(map, C).hiddenBy === P, 'Reason: hidden by parent')
check(registry.menuEntry(P).children.every((child) => map[child.id] === initial[child.id]), 'Hiding a parent does not rewrite child preferences')
const withChildOff = model.setPreference(map, C, false)
check(!model.isEffectivelyVisible(withChildOff, C) && model.effectiveState(withChildOff, C).state === 'hidden', 'parent=false child=false → child hidden')
map = model.setPreference(map, P, true)
check(model.isEffectivelyVisible(map, C) && map[C] === true, 'parent=true again child=true → child visible again')
const off = model.setPreference(initial, 'financeiro', false)
check(initial.financeiro === true, 'setPreference never mutates the previous map')
check(Object.keys(off).filter((id) => off[id] !== initial[id]).join() === 'financeiro', 'setPreference changes only one ID')
check(model.setPreference(initial, 'dashboard', true) === initial, 'No-op change keeps the same map')
check(model.effectiveMap(off)['finance-wallets'] === false && off['finance-wallets'] === true, 'Effective map applies parent && child')
const sistemaOff = model.setPreference(initial, 'sistema', false)
check(model.isEffectivelyVisible(sistemaOff, 'configuracoes') && model.isEffectivelyVisible(sistemaOff, 'ajuda'), 'No invented Sistema → Configurações / Ajuda override')

/* ---------- draft diff ---------- */
let draft = model.setPreference(initial, 'operation-investors', false)
draft = model.setPreference(draft, 'financeiro', false)
check(model.isDirty(initial, draft) && !model.isDirty(initial, initial), 'Dirty detection')
const changes = model.preferenceChanges(initial, draft)
check(changes.map((c) => `${c.id}:${c.from}>${c.to}`).join() === 'operation-investors:true>false,financeiro:true>false', 'Diff lists only meaningful preference changes, in sidebar order')
const effects = model.effectConsequences(initial, draft)
const wallet = effects.find((item) => item.id === 'finance-wallets')
check(wallet && wallet.preference === true && wallet.from === true && wallet.to === false && wallet.hiddenBy === 'financeiro', 'Wallet: Visível → Visível but effectively hidden by Financeiro')
check(effects.length === registry.menuEntry('financeiro').children.length && !effects.some((item) => item.id === 'operation-investors'), 'Consequences exclude items whose own preference changed')
const restored = model.setPreference(draft, 'financeiro', true)
check(model.effectConsequences(draft, restored).every((item) => item.to === true), 'Showing the parent again brings children back')
check(model.countEffectivelyHidden(draft) === 1 + 1 + registry.menuEntry('financeiro').children.length, 'Hidden count = own + parent-hidden')
const discarded = initial
check(!model.isDirty(initial, discarded), 'Discard returns to the prototype initial state')

/* ---------- candidate contract (not integrated) ---------- */
const C2 = contract.MENU_VISIBILITY_CONTRACT
check(C2.integrated === false && C2.scope === 'global' && C2.environment === 'homolog', 'Contract not integrated; global homolog scope')
check(C2.getEndpoint === 'GET /api/homolog/menu-visibility' && C2.putEndpoint === 'PUT /api/homolog/menu-visibility', 'Reference endpoints recorded as documentation strings')
check(C2.putShape === 'full-map-pending' && C2.missingKnownId === 'default-visible-pending' && C2.unknownId === 'ignore-pending', 'Full map, default-visible and unknown-ID rules are PENDING')
const body = contract.putRequestPreview(draft)
check(Object.keys(body).join() === 'visibility' && Object.keys(body.visibility).join() === ids.join(), 'PUT preview = complete map of every known ID')
check(Object.values(body.visibility).every((value) => typeof value === 'boolean') && body.visibility['finance-wallets'] === true && body.visibility.financeiro === false, 'PUT preview carries stored preferences, not effective values')
const normalized = contract.normalizeVisibilityCandidate({
  data: { scope: 'global', visibility: { dashboard: false, 'operation-companies': false, 'unknown-module': true }, updatedAt: '2026-10-15T12:00:00Z', updatedBy: 'operator-1' },
})
check(normalized.ok && normalized.map.dashboard === false && !('operation-companies' in normalized.map) && !('unknown-module' in normalized.map), 'Unknown IDs never enter the map')
check(normalized.unknownIds.join() === 'operation-companies,unknown-module', 'Unknown IDs are reported as drift')
check(normalized.defaultedIds.length === ids.length - 1 && normalized.map.financeiro === true, 'Missing known IDs default to visible (pending rule) and are reported')
check(normalized.updatedAt === '2026-10-15T12:00:00Z' && normalized.updatedBy === 'operator-1', 'updatedAt / updatedBy pass through')
check(!contract.normalizeVisibilityCandidate({ data: { scope: 'global', visibility: { dashboard: 'false' } } }).ok, 'Non-boolean known value → malformed, nothing applied')
check(!contract.normalizeVisibilityCandidate({ data: { scope: 'whitelabel', visibility: {} } }).ok, 'Non-global scope → malformed')
check(!contract.normalizeVisibilityCandidate(null).ok && !contract.normalizeVisibilityCandidate({ data: { scope: 'global', visibility: [] } }).ok, 'Malformed envelopes rejected')

/* ---------- future error presentation ---------- */
const load503 = contract.describeVisibilityError(new ApiError(503, {}, {}), 'load')
check(load503.kind === 'unavailable' && load503.retryable, 'GET 5xx → unavailable + retry')
const load403 = contract.describeVisibilityError(new ApiError(403, {}, {}), 'load')
check(load403.kind === 'forbidden' && !load403.retryable, 'GET 403 → forbidden, no retry')
check(contract.describeVisibilityError(new ApiError(200, {}, { kind: 'malformed' }), 'load').retryable, 'GET malformed → safe retryable error')
check(contract.describeVisibilityError(new ApiError(401, {}, {}), 'load').kind === 'session', '401 stays canonical session behavior')
check(contract.describeVisibilityError(new ApiError(400, {}, {}), 'save').kind === 'invalid', 'PUT 400 → invalid map')
check(contract.describeVisibilityError(new ApiError(403, {}, {}), 'save').kind === 'forbidden', 'PUT 403 → forbidden')
check(contract.describeVisibilityError(new ApiError(409, {}, {}), 'save').kind === 'conflict', 'PUT 409 → conflict (if defined)')
for (const error of [new ApiError(0, {}, { kind: 'timeout' }), new ApiError(0, {}, { kind: 'network' }), new ApiError(502, {}, {}), new Error('x')]) {
  check(/pode ou não ter sido aplicada/.test(contract.describeVisibilityError(error, 'save').description), 'Uncertain save outcome is never presented as failure-for-sure')
}
check(!JSON.stringify(contract.describeVisibilityError(new ApiError(500, { message: 'raw upstream detail' }, {}), 'load')).includes('raw upstream'), 'Raw Backend messages are never shown')

/* ---------- route ---------- */
check(route.parseVisibilityRoute({}).preview === undefined, 'No preview by default')
check(route.parseVisibilityRoute({ previa: 'sem-permissao' }).preview === 'forbidden', 'Preview parses')
check(route.parseVisibilityRoute({ previa: 'dashboard=false' }).ignored.length === 1, 'Unknown preview values are ignored (the URL holds no configuration)')
check(route.menuVisibilityHref() === '#/settings/menu-visibility' && route.menuVisibilityHref('error') === '#/settings/menu-visibility?previa=erro', 'Hrefs')

/* ---------- source boundaries ---------- */
const featureDir = resolve(root, 'src/features/menu-visibility')
const featureFiles = (await readdir(featureDir)).filter((name) => /\.(ts|tsx)$/.test(name))
check(featureFiles.length >= 10, 'Menu Visibility module files exist')
const codeOnly = (source, name) =>
  ts.transpileModule(source, {
    fileName: name,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.Preserve, removeComments: true },
  }).outputText
for (const name of featureFiles) {
  const source = await readFile(resolve(featureDir, name), 'utf8')
  const code = codeOnly(source, name)
  check(!/\bfetch\s*\(|apiRequest|authenticated(Get|Post|Put|Patch|Delete)|XMLHttpRequest|sendBeacon|WebSocket|EventSource/.test(code), `${name}: no request code`)
  check(!/localStorage|sessionStorage|indexedDB|document\.cookie|caches\.|navigator\.storage/.test(code), `${name}: no browser storage`)
  check(!/createContext|\.Provider\b|useSyncExternalStore/.test(code), `${name}: no global context / store for the draft`)
  check(!/^(let|var)\s/m.test(code), `${name}: no module-level mutable singleton`)
  check(!/operation-companies/.test(code), `${name}: no Companies menu ID`)
}
async function walk(path) {
  const out = []
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const full = resolve(path, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(full)))
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full)
  }
  return out
}
const allowedMentions = new Set([
  'src/features/menu-visibility/menuVisibilityContract.ts',
  'src/features/menu-visibility/menuVisibilityRoute.ts',
  'src/features/menu-visibility/MenuVisibilityPage.tsx',
  'src/components/shell/navigation.ts',
  'src/app/App.tsx',
])
for (const file of await walk(resolve(root, 'src'))) {
  const rel = relative(root, file).replaceAll('\\', '/')
  const code = codeOnly(await readFile(file, 'utf8'), file)
  if (/homolog\/menu-visibility|menu-visibility/.test(code)) check(allowedMentions.has(rel), `${rel}: may mention menu-visibility only as a route or documented endpoint`)
  if (/homolog\/menu-visibility/.test(code)) check(rel === 'src/features/menu-visibility/menuVisibilityContract.ts', `${rel}: endpoint string only in the contract module`)
  if (!rel.startsWith('src/features/menu-visibility/') && rel !== 'src/app/App.tsx') {
    check(!/from\s+['"][^'"]*menu-visibility\//.test(code), `${rel}: nothing outside the page route imports Menu Visibility state`)
  }
  check(!code.includes('operation-companies'), `${rel}: no operation-companies ID`)
}
const api = codeOnly(await readFile(resolve(root, 'src/lib/api.ts'), 'utf8'), 'api.ts')
check(!/menu-visibility|homolog/.test(api), 'Shared API client has no Menu Visibility request')
const contractCode = codeOnly(await readFile(resolve(featureDir, 'menuVisibilityContract.ts'), 'utf8'), 'contract.ts')
check(!/\bfetch\b|apiRequest|authenticated/.test(contractCode), 'Contract module holds types and strings only')
const navigationSource = await readFile(resolve(root, 'src/components/shell/navigation.ts'), 'utf8')
check(navigationSource.includes("{ id: 'configuracoes', label: 'Configurações', icon: Cog, href: '#/settings/menu-visibility' }"), 'Configurações (existing ID) opens Visibilidade dos módulos')
check(!/visible|hidden|visibility/i.test(codeOnly(navigationSource, 'navigation.ts').replace("'#/settings/menu-visibility'", '')), 'navigation.ts holds no visibility state (only the Configurações destination)')
const sidebar = await readFile(resolve(root, 'src/components/shell/Sidebar.tsx'), 'utf8')
check(sidebar.includes('items={PRIMARY_NAV}') && sidebar.includes('items={UTILITY_NAV}') && !/visib/i.test(sidebar), 'Real sidebar still renders navigation.ts directly, with no visibility filter')
const app = await readFile(resolve(root, 'src/app/App.tsx'), 'utf8')
check(app.includes("path === 'settings/menu-visibility'") && app.includes("'settings-menu-visibility',\n])"), 'Route exists and is session-guarded')
check(!/visib/i.test(app.replace(/MenuVisibilityPage|menu-visibility|settings-menu-visibility|Visibilidade dos módulos|non-persisting prototype/g, '')), 'No route resolver / guard change based on visibility')
const page = await readFile(resolve(featureDir, 'MenuVisibilityPage.tsx'), 'utf8')
check(page.includes('activeNav="configuracoes"') && !/activeNav="(?!configuracoes)/.test(page), 'Page uses the existing configuracoes identity')
check(page.includes('useUnsavedChangesGuard(dirty'), 'Unsaved-change guard follows the draft dirty state')
const dialogs = await readFile(resolve(featureDir, 'VisibilityDialogs.tsx'), 'utf8')
check(dialogs.includes('aria-disabled="true"') && dialogs.includes('event.preventDefault()') && dialogs.includes('Persistência aguardando integração do Backend'), 'Final save is aria-disabled and explained')
check(!/restaurad[oa] do servidor/i.test(page + dialogs), 'Discard never claims a server restore')

/* ---------- documentation ---------- */
const docs = await readFile(resolve(root, 'docs/menu-visibility-frontend-v1.md'), 'utf8')
check(docs.includes('MENU VISIBILITY FRONTEND V1 IS A NON-PERSISTING PROTOTYPE.'), 'Docs: non-persisting prototype statement')
check(docs.includes('THE REAL APPLICATION NAVIGATION IS NOT MODIFIED BY PROTOTYPE TOGGLES.'), 'Docs: real navigation statement')
check(docs.includes('DEFAULT-VISIBLE PENDING BACKEND CONFIRMATION'), 'Docs: default-visible pending')

/* ---------- actual rendered controls, preview, review, and sidebar ---------- */
const { createElement: h } = require('react')
const { renderToStaticMarkup: render } = require('react-dom/server')
const { VisibilityControls } = await load('src/features/menu-visibility/VisibilityControls.tsx')
const { VisibilityPreview } = await load('src/features/menu-visibility/VisibilityPreview.tsx')
const { VisibilityReviewDialog } = await load('src/features/menu-visibility/VisibilityDialogs.tsx')
const { Sidebar } = await load('src/components/shell/Sidebar.tsx')
const sidebarProps = { activeId: 'configuracoes', open: false, onClose() {} }
const sidebarBefore = render(h(Sidebar, sidebarProps))
for (const parent of ['plataformas', 'operacao', 'financeiro', 'compliance']) {
  const hidden = model.setPreference(initial, parent, false)
  const controls = render(h(VisibilityControls, { base: initial, draft: hidden, onChange() {} }))
  const preview = render(h(VisibilityPreview, { draft: hidden }))
  const review = render(h(VisibilityReviewDialog, { base: initial, draft: hidden, onClose() {} }))
  check((controls.match(/role="switch"/g) ?? []).length === 23, 'Rendered controls expose exactly 23 named switches')
  for (const child of registry.menuEntry(parent).children) {
    check(controls.includes(`data-menu-id="${child.id}" data-child="" data-effective="hidden-by-parent"`), 'Actual child row explains the inherited result')
    check(controls.includes(`aria-checked="true"`) && controls.includes('Preferência própria mantida: visível.'), 'Actual controls distinguish stored preference from effective state')
    check(!preview.includes(`data-preview-id="${child.id}"`) && preview.includes(`data-preview-hidden-id="${child.id}"`), 'Actual preview omits inherited-hidden child and explains it separately')
    check(!review.includes(`data-review-change="${child.id}"`) && review.includes(`data-review-effect="${child.id}"`), 'Actual review does not invent child preference changes')
  }
  check((review.match(/data-review-change=/g) ?? []).length === 1, 'Primary review diff includes only the parent preference')
  check(review.includes('aria-disabled="true"') && review.includes('não enviado'), 'Actual pending save and candidate-map wording')
  check(!/<a\b|<button\b/.test(preview), 'Preview has no interactive routing or mutation controls')
  check(render(h(Sidebar, sidebarProps)) === sidebarBefore, 'Rendering/toggling prototype state leaves the actual Sidebar identical')
}
const baselineNav = execFileSync('git', ['show', '91cd26a:src/components/shell/navigation.ts'], { cwd: root, encoding: 'utf8' })
const navBefore = await load('src/components/shell/navigation.ts', baselineNav)
const flatten = source => [...source.PRIMARY_NAV, ...source.UTILITY_NAV].flatMap(x => [x, ...(x.children ?? [])])
const beforeEntries = flatten(navBefore), afterEntries = flatten(nav)
check(beforeEntries.length === afterEntries.length, 'No new sidebar entry')
for (let i = 0; i < beforeEntries.length; i += 1) {
  const before = beforeEntries[i], after = afterEntries[i]
  check(before.id === after.id && before.label === after.label && before.icon === after.icon, 'Existing IDs, labels, icons and order retained')
  check(before.id === 'configuracoes' ? before.href === undefined && after.href === '#/settings/menu-visibility' : before.href === after.href, 'Configurações is the sole destination change; no implemented destination displaced')
}

/* Actual source hook/route selection; synchronous hook stubs do not test React timing. */
const sourcePath = 'src/features/menu-visibility/useVisibilitySource.ts'
const sourceText = await readFile(resolve(root, sourcePath), 'utf8')
const reactStub = `data:text/javascript;base64,${Buffer.from('export const useMemo=f=>f();export const useEffect=()=>{};export const useState=v=>[v,()=>{}];').toString('base64')}`
const hookText = sourceText.replace("from 'react'", `from '${reactStub}'`)
const sourceHook = await load(sourcePath, hookText)
check(sourceHook.useVisibilitySource().state.data.updatedAt === null && sourceHook.useVisibilitySource().state.data.updatedBy === null, 'Actual source supplies no fabricated metadata')
for (const [preview, status] of [['loading', 'loading'], ['unavailable', 'error'], ['forbidden', 'error'], ['error', 'error'], ['save-failed', 'success']]) {
  check(sourceHook.useVisibilitySource(preview).state.status === status, 'Actual hook uses explicit request-free prototype state')
}
const futureHook = await load(sourcePath, hookText.replaceAll('MENU_VISIBILITY_CONTRACT.integrated', 'true'))
const futureRoute = await load('src/features/menu-visibility/menuVisibilityRoute.ts', (await readFile(resolve(featureDir, 'menuVisibilityRoute.ts'), 'utf8')).replaceAll('MENU_VISIBILITY_CONTRACT.integrated', 'true'))
for (const value of ['carregando', 'indisponivel', 'sem-permissao', 'erro', 'falha-ao-salvar']) {
  check(futureRoute.parseVisibilityRoute({ previa: value }).preview === undefined, 'Future integrated parser rejects every preview')
}
check(futureHook.useVisibilitySource('error').state.status === 'success', 'Future source cannot be pinned by a prototype preview (not an integration implementation)')

/* Syntax-level transport/storage detection, including aliases and bracket access. */
function unsafeCapability(source, storage = false) {
  const ast = ts.createSourceFile('fixture.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const names = storage ? /^(localStorage|sessionStorage|indexedDB|cookie|caches)$/ : /^(fetch|apiRequest|authenticatedGet|authenticatedPost|authenticatedPut|authenticatedPatch|authenticatedDelete|XMLHttpRequest|sendBeacon|WebSocket|EventSource)$/
  let found = false
  function visit(node) {
    if (ts.isIdentifier(node) && names.test(node.text)) found = true
    if (ts.isElementAccessExpression(node) && ts.isStringLiteralLike(node.argumentExpression) && names.test(node.argumentExpression.text)) found = true
    if (!storage && ts.isImportDeclaration(node) && /(^|\/)(axios|ky|ofetch|superagent|apiClient)(\/|$)/.test(node.moduleSpecifier.text)) found = true
    ts.forEachChild(node, visit)
  }
  visit(ast)
  return found
}
for (const name of featureFiles) {
  const text = await readFile(resolve(featureDir, name), 'utf8')
  check(!unsafeCapability(text), `${name}: no transport capability, including aliased imports`)
  check(!unsafeCapability(text, true), `${name}: no browser persistence capability`)
}
for (const text of ['window["fetch"]("/api/homolog/menu-visibility")', 'import {authenticatedGet as get} from "./apiClient"', 'import client from "axios"; client.put("/menu-visibility")']) check(unsafeCapability(text), 'Planted transport/alias detected in memory')
for (const text of ['window["localStorage"].setItem("draft","x")', 'indexedDB.open("draft")', 'document.cookie="draft=x"']) check(unsafeCapability(text, true), 'Planted storage capability detected in memory')
check(!unsafeCapability('// fetch()\nconst explanation="fetch unavailable"') && !unsafeCapability('const explanation="localStorage is not used"', true), 'Detectors ignore comments and explanatory strings')

/* Execute the shared guard lifecycle with deterministic hooks/event targets.
 * This covers installation/cleanup and callbacks, not browser history timing.
 */
const runtime = { slots: [], cursor: 0, effects: [], documentListeners: new Map(), windowListeners: new Map(), guard: null }
globalThis.__menuGuardTest = runtime
const dataModule = text => `data:text/javascript;base64,${Buffer.from(text).toString('base64')}`
const guardReact = dataModule(`
const r=globalThis.__menuGuardTest;
export const useRef=v=>{const i=r.cursor++;return r.slots[i]??(r.slots[i]={current:v})};
export const useState=v=>{const i=r.cursor++;if(!(i in r.slots))r.slots[i]=v;return[r.slots[i],x=>{r.slots[i]=typeof x==='function'?x(r.slots[i]):x}]};
export const useCallback=f=>{r.cursor++;return f};
export const useEffect=(f,deps)=>{const i=r.cursor++;const old=r.slots[i];if(!old||!deps||deps.some((x,j)=>!Object.is(x,old.deps[j])))r.effects.push(()=>{old?.cleanup?.();r.slots[i]={deps,cleanup:f()}})};
`)
const guardNavigation = dataModule('const r=globalThis.__menuGuardTest;export const registerPrototypeNavigationGuard=fn=>{r.guard=fn;return()=>{r.guard=null}}')
const guardPath = 'src/app/useUnsavedChangesGuard.ts'
const guardCode = (await readFile(resolve(root, guardPath), 'utf8')).replace("from 'react'", `from '${guardReact}'`).replace("from './prototypeNavigation'", `from '${guardNavigation}'`)
globalThis.document = { addEventListener: (k,v)=>runtime.documentListeners.set(k,v), removeEventListener: (k,v)=>{if(runtime.documentListeners.get(k)===v)runtime.documentListeners.delete(k)} }
globalThis.window = { location: { hash: '#/settings/menu-visibility' }, addEventListener: (k,v)=>runtime.windowListeners.set(k,v), removeEventListener: (k,v)=>{if(runtime.windowListeners.get(k)===v)runtime.windowListeners.delete(k)} }
const guardModule = await load(guardPath, guardCode)
let discardedCount = 0
function renderGuard(dirty) {
  runtime.cursor=0
  const hook=guardModule.useUnsavedChangesGuard(dirty,()=>{discardedCount+=1})
  for(const effect of runtime.effects.splice(0))effect()
  return hook
}
renderGuard(false)
check(runtime.windowListeners.size===0&&runtime.documentListeners.size===0&&runtime.guard===null,'Clean guard installs no navigation/click/beforeunload listeners')
renderGuard(true)
check(runtime.windowListeners.has('beforeunload')&&runtime.documentListeners.has('click')&&typeof runtime.guard==='function','Dirty guard installs protection')
let prevented=false
runtime.windowListeners.get('beforeunload')({preventDefault(){prevented=true},returnValue:null})
check(prevented,'Dirty unload requests the native warning')
runtime.documentListeners.get('click')({defaultPrevented:false,button:0,target:{closest:()=>({getAttribute:()=> '#/dashboard'})},preventDefault(){},stopPropagation(){}})
let guardState=renderGuard(true)
check(guardState.pending?.hash==='#/dashboard','Dirty link queues navigation without leaving')
guardState.stay();guardState=renderGuard(true)
check(guardState.pending===null&&window.location.hash==='#/settings/menu-visibility','Stay preserves the draft route')
let resumed=false
check(runtime.guard({hash:'#/audit',resume(){resumed=true}})===false,'Dirty history navigation is deferred')
guardState=renderGuard(true);guardState.discardAndContinue();renderGuard(false)
check(resumed&&discardedCount===1,'Discard resumes exactly the queued navigation')
check(runtime.windowListeners.size===0&&runtime.documentListeners.size===0&&runtime.guard===null,'Discard/clean removes all protection listeners')
renderGuard(true)
for(const slot of runtime.slots)slot?.cleanup?.()
check(runtime.windowListeners.size===0&&runtime.documentListeners.size===0&&runtime.guard===null,'Unmount removes all protection listeners')
delete globalThis.__menuGuardTest

console.log(`Menu Visibility Frontend V1 prototype boundaries: ${checks} passed (no network, no storage, no GET/PUT menu-visibility)`)
