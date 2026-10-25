import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

// This suite intentionally reads current files directly: historical prototype
// fixtures and consolidation compatibility readers cannot satisfy these gates.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const reactUrl = pathToFileURL(require.resolve('react')).href
const { createElement: h } = await import(reactUrl)
const { renderToStaticMarkup: render } = await import(pathToFileURL(require.resolve('react-dom/server')).href)
const source = p => readFileSync(resolve(root, p), 'utf8')
const dataModule = code => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
let checks = 0
async function check(name, run) { try { await run(); checks++ } catch (cause) { throw Error(name, { cause }) } }
function resolveImport(from, specifier) {
  const base = resolve(root, dirname(from), specifier)
  const found = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, resolve(base, 'index.ts'), resolve(base, 'index.tsx')]
    .find(p => existsSync(p) && statSync(p).isFile())
  assert.ok(found, `Unresolved current import: ${from} -> ${specifier}`)
  return relative(root, found).replaceAll('\\', '/')
}
function allSources(dir = 'src') {
  return readdirSync(resolve(root, dir), { withFileTypes: true }).flatMap(entry => {
    const path = `${dir}/${entry.name}`
    return entry.isDirectory() ? allSources(path) : /\.[jt]sx?$/.test(path) ? [path] : []
  })
}
function imports(path) {
  const tree = ts.createSourceFile(path, source(path), ts.ScriptTarget.Latest, true)
  const found = []
  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) found.push(node.moduleSpecifier.text)
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || node.expression.getText(tree) === 'require') && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) found.push(node.arguments[0].text)
    ts.forEachChild(node, visit)
  }
  visit(tree)
  return found
}
function loader({ development = false, overrides = {} } = {}) {
  const cache = new Map()
  async function url(path) {
    if (cache.has(path)) return cache.get(path)
    if (overrides[path]) return dataModule(overrides[path])
    if (path.endsWith('.css')) return dataModule('export default new Proxy({}, {get:(_,key)=>String(key)})')
    let code = ts.transpileModule(source(path), { fileName: path, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } }).outputText
      .replaceAll('import.meta.env', `({DEV:${development},VITE_API_BASE_URL:"https://control-plane.example.invalid/api"})`)
    for (const match of [...code.matchAll(/from\s+(['"])([^'"]+)\1/g)]) {
      const target = match[2].startsWith('.') ? await url(resolveImport(path, match[2])) : pathToFileURL(require.resolve(match[2])).href
      code = code.replace(match[0], `from ${JSON.stringify(target)}`)
    }
    const result = dataModule(code); cache.set(path, result); return result
  }
  return async path => import(await url(path))
}

const graph = new Set()
function walk(path) { if (graph.has(path)) return; graph.add(path); if (!/\.[jt]sx?$/.test(path)) return; for (const specifier of imports(path)) if (specifier.startsWith('.')) walk(resolveImport(path, specifier)) }
walk('src/main.tsx')
await check('Operational entry graph cannot import historical fixtures or prototype stores', () => {
  for (const path of graph) {
    assert.ok(path.startsWith('src/'), path)
    assert.doesNotMatch(path, /(?:^|\/)tests\/|prototype(?:Whitelabels|Accounts|Kyc|Settings|Emails|Finance|Catalogs|Modalities)|(?:kyc|settings|email|finance|catalog|modalities)Store\.ts$/i)
  }
})
for (const path of allSources()) await check(`Current source contains no development-only mock allowance: ${path}`, () => {
  const code = source(path)
  assert.doesNotMatch(code, /import\.meta\.env\.DEV|PROTOTYPE_PRESENTATION|\bPROTOTYPE_[A-Z_]+\b/)
  for (const specifier of imports(path)) assert.doesNotMatch(specifier, /(?:^|\/)tests\/|prototypes\//)
})
const baseline = '450b9d5a5a1eabb6f986222bf2e08e0b18a71464'
for (const path of ['src/lib/authSession.ts', 'src/lib/authModel.ts', 'src/features/menu-visibility/menuRegistry.ts', 'src/features/menu-visibility/visibilityPolicy.ts', 'src/features/menu-visibility/visibilityResolver.ts', 'src/features/menu-visibility/menuVisibilityApi.ts']) {
  if (existsSync(resolve(root, path))) await check(`Authentication/RBAC/persisted Menu contract unchanged: ${path}`, () => {
    const previous = execFileSync('git', ['show', `${baseline}:${path}`], { cwd: root, encoding: 'utf8' }).replaceAll('\r\n', '\n')
    assert.equal(source(path).replaceAll('\r\n', '\n'), previous)
  })
}
const featureOverrides = {}
const appTree = ts.createSourceFile('App.tsx', source('src/app/App.tsx'), ts.ScriptTarget.Latest, true)
for (const node of appTree.statements) if (ts.isImportDeclaration(node) && node.moduleSpecifier.text.includes('/features/') && node.importClause && !node.importClause.isTypeOnly) {
  const names = node.importClause.namedBindings?.elements?.filter(e => !e.isTypeOnly).map(e => e.name.text) ?? []
  if (names.length) featureOverrides[resolveImport('src/app/App.tsx', node.moduleSpecifier.text)] = `import {createElement as h} from ${JSON.stringify(reactUrl)};${names.map(name => `export const ${name}=()=>h('section',{'data-current-page':${JSON.stringify(name)}});`).join('')}`
}
const authStub = `export const isAuthenticated=()=>globalThis.__operationalAuthed;export const subscribeSession=()=>()=>{};export const validateSession=async()=>({status:'valid'});export const useSessionOperator=()=>({roles:['SUPER_ADMIN']});export const logout=()=>{};`
const routeCases = [
  ['#/dashboard', 'DashboardPage'], ['#/whitelabels', 'WhitelabelsPage'], ['#/whitelabels/6/accounts', 'WhitelabelAccountsPage'], ['#/whitelabels/6/settings', 'OperationalSettingsPage'], ['#/whitelabels/6/settings?area=app', 'OperationalSettingsPage'], ['#/whitelabels/6/settings?area=terms', 'OperationalSettingsPage'], ['#/whitelabels/6/emails?section=smtp', 'OperationalSmtpPage'], ['#/whitelabels/select/emails?section=smtp', 'OperationalSmtpPage'],
  ['#/operation/opportunities', 'OpportunitiesPage'], ['#/operation/opportunities/new', 'OpportunityFormPage'], ['#/operation/opportunities/77/edit', 'OpportunityFormPage'], ['#/operation/opportunities/77', 'OpportunityDetailPage'],
  ['#/operation/investors', 'InvestorsPage'], ['#/operation/investors/77', 'InvestorDetailPage'], ['#/operation/entrepreneurs', 'EntrepreneursPage'], ['#/operation/entrepreneurs/30', 'EntrepreneurDetailPage'], ['#/operation/companies', 'CompaniesPage'], ['#/operation/companies/1', 'CompanyDetailPage'],
  ['#/finance/investments', 'InvestmentsPage'], ['#/finance/investments/1', 'InvestmentDetailPage'], ['#/finance/payments', 'PaymentsPage'], ['#/finance/payments/1', 'PaymentDetailPage'], ['#/finance/wallets', 'WalletsPage'], ['#/finance/wallets/6', 'WalletDetailPage'],
  ['#/compliance/kyc', 'KycListPage'], ['#/compliance/kyc/1', 'KycDetailPage'], ['#/audit', 'AuditListPage'], ['#/audit/caaaaaaaaaaaaaaaaaaaaaaaa', 'AuditDetailPage'], ['#/settings/menu-visibility', 'MenuVisibilityPage'], ['#/settings/operators', 'OperatorsListPage'], ['#/settings/operators/caaaaaaaaaaaaaaaaaaaaaaaa', 'OperatorDetailPage'],
]
for (const development of [false, true]) {
  const load = loader({ development, overrides: { ...featureOverrides, 'src/lib/authSession.ts': authStub, 'src/components/shell/AppShell.tsx': `import {createElement as h} from ${JSON.stringify(reactUrl)};export const AppShell=({children})=>h('main',null,children);` } })
  const { App } = await load('src/app/App.tsx')
  const availability = await load('src/app/presentationAvailability.ts')
  globalThis.__operationalAuthed = true
  for (const [hash, page] of routeCases) await check(`Real route retained (${development ? 'DEV' : 'production'}): ${hash}`, () => {
    globalThis.window = { location: { hash } }
    assert.ok(render(h(App)).includes(`data-current-page="${page}"`))
  })
  for (const hash of ['#/whitelabels/6/finance/gateways', '#/whitelabels/6/finance/modalities', '#/whitelabels/6/finance/segments-resource-uses']) await check(`Unsupported direct route remains truthful (${development}): ${hash}`, () => {
    globalThis.window = { location: { hash } }
    const html = render(h(App)); assert.ok(html.includes('data-readiness-unavailable')); assert.doesNotMatch(html, /data-current-page=/)
  })
  await check(`Session gate precedes operational and unavailable routes (${development})`, () => {
    globalThis.__operationalAuthed = false
    for (const hash of ['#/dashboard', '#/whitelabels/6/emails', '#/operation/opportunities/new']) { globalThis.window = { location: { hash } }; assert.ok(render(h(App)).includes('data-current-page="LoginPage"')) }
    globalThis.__operationalAuthed = true
  })
  const { PRIMARY_NAV, UTILITY_NAV } = await load('src/components/shell/navigation.ts')
  const { MENU_VISIBILITY_IDS } = await load('src/features/menu-visibility/menuRegistry.ts')
  await check(`Navigation is operational without changing 23 IDs (${development})`, () => {
    assert.equal(MENU_VISIBILITY_IDS.length, 23); assert.equal(new Set(MENU_VISIBILITY_IDS).size, 23)
    const ready = availability.readinessNavigation([...PRIMARY_NAV, ...UTILITY_NAV])
    assert.equal(ready.find(n => n.id === 'financeiro').href, '#/finance/investments')
    assert.ok(ready.some(n => n.id === 'dashboard')); assert.ok(ready.some(n => n.id === 'configuracoes'))
    const flat = ready.flatMap(n => [n, ...(n.children ?? [])]); assert.ok(flat.every(n => !n.href?.includes('_proto_')))
    assert.ok(!flat.some(n => ['finance-gateways', 'finance-modalities', 'finance-catalogs', 'sistema', 'ajuda'].includes(n.id)))
    assert.equal(flat.find(n => n.id === 'whitelabel-emails').href, '#/whitelabels/select/emails?section=smtp')
    assert.equal(availability.readinessHref('whitelabel-emails', '#/whitelabels/6/emails?section=smtp'), '#/whitelabels/6/emails?section=smtp')
    assert.equal(availability.readinessHref('whitelabel-emails', '#/whitelabels/wl_proto_01/emails'), '#/whitelabels/select/emails?section=smtp')
  })
  await check(`Only accepted Opportunity commands exposed (${development})`, () => {
    for (const action of ['create', 'image', 'patch', 'archive']) assert.equal(availability.opportunityActionAvailable(action), true)
    for (const action of ['approve', 'deny', 'cashout', 'refund']) assert.equal(availability.opportunityActionAvailable(action), false)
    assert.equal(availability.opportunityEditorialAvailable('review', ['SUPER_ADMIN']), true)
    for (const status of ['active', 'archived', 'finished']) assert.equal(availability.opportunityEditorialAvailable(status, ['SUPER_ADMIN']), false)
    assert.equal(availability.opportunityEditorialAvailable('review', ['READ_ONLY']), false)
    assert.deepEqual(availability.readinessTabs([{ value: 'overview' }, { value: 'activity' }, { value: 'atividade' }]), [{ value: 'overview' }])
  })
  const writeLoad = loader({ development, overrides: {
    'src/lib/authSession.ts': `export const getOperator=()=>({roles:globalThis.__operationalRoles});export const getAccessToken=()=> 'synthetic-test-session';export const getSessionVersion=()=>7;export const handleUnauthorized=()=>{};`,
    'src/lib/apiClient.ts': `export const authenticatedGet=async()=>{globalThis.__operationalRequests++;throw Error('Synthetic transport: no network');};`,
  } })
  globalThis.__operationalRoles = ['SUPER_ADMIN']; globalThis.__operationalRequests = 0
  const write = await writeLoad('src/features/operation/opportunities/write/opportunityWriteClient.ts')
  await check(`Approval/provider command rejected before transport (${development})`, async () => {
    await assert.rejects(write.executeOpportunity({ action: 'approve', tenantId: '6', id: '77' }, 7), e => e.code === 'OPPORTUNITY_WRITES_NOT_RELEASED')
    assert.equal(globalThis.__operationalRequests, 0)
  })
  await check(`Wide editorial PATCH rejected before transport (${development})`, async () => {
    await assert.rejects(write.executeOpportunity({ action: 'patch', tenantId: '6', id: '77', changes: { cpf: 'synthetic' } }, 7), e => e.code === 'OPPORTUNITY_SCOPE_NOT_RELEASED')
    assert.equal(globalThis.__operationalRequests, 0)
  })
  await check(`Write RBAC preserved before transport (${development})`, async () => {
    globalThis.__operationalRoles = ['READ_ONLY']
    await assert.rejects(write.executeOpportunity({ action: 'create', tenantId: '6' }, 7), e => e.code === 'WRITE_FORBIDDEN')
    assert.equal(globalThis.__operationalRequests, 0)
  })
  for (const status of [403, 502]) {
    const readLoad = loader({ development, overrides: { 'src/lib/apiClient.ts': `export const authenticatedGet=async()=>{const e=Error('Synthetic upstream failure');e.status=${status};throw e;};` } })
    const opportunities = await readLoad('src/features/operation/opportunities/opportunityApi.ts')
    const whitelabels = await readLoad('src/features/whitelabels/whitelabelApi.ts')
    await check(`Authoritative Opportunity error propagates, no fixture fallback (${development}, ${status})`, () => assert.rejects(opportunities.getOpportunity('77'), e => e.status === status))
    await check(`Authoritative Whitelabel error propagates, no fixture fallback (${development}, ${status})`, () => assert.rejects(whitelabels.getWhitelabel('6'), e => e.status === status))
  }
}
await check('Renamed navigation guard preserves declined Back/hash navigation without a business request', async () => {
  const listeners = new Map(); const location = { hash: '#/operation/opportunities/new', pathname: '/' }
  const history = { state: null, replaceState(state, _, url) { this.state = state; if (url?.startsWith('#')) location.hash = url }, go() { throw Error('Unexpected go for untagged entry') } }
  globalThis.window = { location, history, addEventListener(name, handler) { listeners.set(name, handler) }, removeEventListener(name) { listeners.delete(name) } }
  const guard = await loader()('src/app/navigationGuard.ts'); let accepted = 0; let requested
  const unsubscribe = guard.subscribeNavigation(() => accepted++)
  const unregister = guard.registerNavigationGuard(request => { requested = request; return false })
  history.state = null; location.hash = '#/dashboard'; listeners.get('hashchange')()
  assert.equal(accepted, 0); assert.equal(location.hash, '#/operation/opportunities/new'); assert.equal(requested.hash, '#/dashboard')
  unregister(); location.hash = '#/dashboard'; listeners.get('hashchange')(); assert.equal(accepted, 1)
  unsubscribe(); assert.equal(listeners.size, 0)
})
await check('Renamed Notice provider supplies the shared accessible context', async () => {
  const load = loader(); const { NoticeProvider } = await load('src/components/shell/NoticeProvider.tsx'); const { useNotice } = await load('src/components/shell/notice.ts')
  function Consumer() { return h('span', { 'data-notice-function': typeof useNotice() === 'function' }, 'notice context') }
  const html = render(h(NoticeProvider, null, h(Consumer))); assert.ok(html.includes('data-notice-function="true"')); assert.ok(html.includes('aria-live="polite"'))
})
console.log(`Operational/mock separation: ${checks} checks passed; ${graph.size} current runtime graph entries; no live network or business writes.`)
