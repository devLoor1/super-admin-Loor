import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'

// Synthetic-only, exercising the real pure resolver/resource. No network or auth bypass.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(pathToFileURL(resolve(root, 'package.json')))
const cache = new Map()
async function loadUrl(path) {
  if (cache.has(path)) return cache.get(path)
  let code = ts.transpileModule(await readFile(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
  for (const m of [...code.matchAll(/from\s+(['"])([^'"]+)\1/g)]) {
    const base = resolve(dirname(path), m[2])
    const url = m[2].startsWith('.') ? await loadUrl(existsSync(base + '.ts') ? base + '.ts' : base + '.tsx') : pathToFileURL(require.resolve(m[2])).href
    code = code.replace(m[0], `from ${JSON.stringify(url)}`)
  }
  const url = `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
  cache.set(path, url)
  return url
}
const load = async name => import(await loadUrl(resolve(root, name)))
const { createVisibilityResource } = await load('src/features/menu-visibility/visibilityResource.ts')
const { sidebarNavigation, filterSidebarItems } = await load('src/features/menu-visibility/sidebarVisibility.ts')
const { mapFrom } = await load('src/features/menu-visibility/visibilityModel.ts')
const { PRIMARY_NAV, UTILITY_NAV } = await load('src/components/shell/navigation.ts')
const all = mapFrom(() => true)
const data = (map = all, version = 1) => ({ map, version, scope: 'global', saved: true, updatedAt: '2026-10-20T12:00:00.000Z', updatedBy: 'synthetic', readAt: '2026-10-20T12:00:01.000Z', unknownIds: [] })
let checks = 0
const check = (test, message) => { assert.ok(test, message); checks++ }
const flatten = items => items.flatMap(i => [i.id, ...flatten(i.children ?? [])])
const nav = map => sidebarNavigation({ state: { status: 'success', data: data(map) } })
const ids = n => [...flatten(n.primary), ...flatten(n.utility)]
const hiddenChild = mapFrom(id => id !== 'finance-payments')
check(!ids(nav(hiddenChild)).includes('finance-payments') && ids(nav(hiddenChild)).includes('finance-wallets'), 'one child hidden without sibling loss')
const parentOff = mapFrom(id => id !== 'financeiro')
check(!ids(nav(parentOff)).some(id => id.startsWith('finance-')) && parentOff['finance-payments'], 'hidden parent retains child preference')
check(ids(nav(all)).includes('finance-payments'), 'restoring parent reveals enabled children')
const none = mapFrom(() => false)
check(ids(nav(none)).join() === 'dashboard,configuracoes', 'mandatory IDs always present even server violation')
for (const target of ['sistema', 'ajuda']) {
  const n = nav(mapFrom(id => id !== target))
  check(!ids(n).includes(target) && ids(n).includes('configuracoes') && ids(n).includes(target === 'sistema' ? 'ajuda' : 'sistema'), 'independent utility ' + target)
}
const original = JSON.stringify([PRIMARY_NAV, UTILITY_NAV])
check(ids(nav(all)).length === 23 && !ids(nav(all)).includes('operation-companies'), 'exact approved IDs, Companies remains contextual')
const filtered = filterSidebarItems(PRIMARY_NAV, hiddenChild)
for (const item of filtered) {
  const before = PRIMARY_NAV.find(n => n.id === item.id)
  check(item.href === before.href && item.label === before.label && item.icon === before.icon, 'destinations/identity retained ' + item.id)
}
check(JSON.stringify([PRIMARY_NAV, UTILITY_NAV]) === original, 'navigation objects never mutated')
check(ids(sidebarNavigation({ state: { status: 'loading' } })).join() === 'dashboard,configuracoes', 'initial GET cannot flash hidden modules')
for (const error of [new Error('timeout'), new Error('500'), new Error('403'), new Error('malformed')]) {
  const n = sidebarNavigation({ state: { status: 'error', error }, lastData: data(none) })
  check(n.mode === 'fallback' && n.primary === PRIMARY_NAV && n.utility === UTILITY_NAV, 'labelled recoverable fallback, not invented persisted values: ' + error.message)
}
check(sidebarNavigation({ state: { status: 'loading' }, lastData: data(hiddenChild) }).mode === 'refreshing', 'same-session refresh retains real last GET')

const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b }); return { promise, resolve, reject } }
const tick = () => new Promise(resolve => setImmediate(resolve))
const reads = []
const resource = createVisibilityResource(signal => { const d = deferred(); reads.push({ ...d, signal }); return d.promise })
resource.setSession('operator-A:1')
let notifications = 0
const unsub1 = resource.subscribe(() => notifications++)
const unsub2 = resource.subscribe(() => notifications++)
await tick()
check(reads.length === 1 && resource.getSnapshot().state.status === 'loading', 'deduped sidebar/page subscriptions')
reads[0].resolve(data(hiddenChild)); await tick()
check(resource.getSnapshot().state.data.map === hiddenChild, 'GET success used without transformation')
unsub1(); unsub2()
const unsub3 = resource.subscribe(() => notifications++)
await tick()
check(reads.length === 1, 'Back/Forward/route remount reuse session GET')
const refresh = resource.revalidate()
await tick()
check(reads.length === 2 && resource.getSnapshot().lastData.map === hiddenChild, 'explicit reload creates fresh GET, preserving real prior data')
reads[1].reject(new Error('503')); await assert.rejects(refresh); await tick()
check(resource.getSnapshot().state.status === 'error' && resource.getSnapshot().lastData.map === hiddenChild, 'failed GET labelled; previous editor reference remains separate')
check(reads.length === 2, 'no automatic retry loop')
const recover = resource.revalidate(); await tick(); reads[2].resolve(data()); await recover
check(resource.getSnapshot().state.status === 'success', 'explicit recovery succeeds')

// Post-Save read MUST supersede an already-running pre-Save GET.
const old = resource.revalidate(); const oldRejected = assert.rejects(old, e => e.name === 'AbortError')
await tick()
const afterSave = resource.revalidate(); await tick()
check(reads[3].signal.aborted && reads.length === 5, 'post-Save revalidation cancels pre-Save request')
reads[4].resolve(data(hiddenChild, 2)); await afterSave
reads[3].resolve(data(all, 1)); await oldRejected
check(resource.getSnapshot().state.data.version === 2 && !ids(sidebarNavigation(resource.getSnapshot())).includes('finance-payments'), 'confirmed Save GET immediately filters sidebar; stale old GET ignored')

const stale = resource.revalidate(); const staleRejected = assert.rejects(stale, e => e.name === 'AbortError'); await tick()
resource.setSession('operator-B:2')
check(resource.getSnapshot().lastData === undefined && ids(sidebarNavigation(resource.getSnapshot())).join() === 'dashboard,configuracoes', 'operator change synchronously clears old map')
await tick(); reads[6].resolve(data(all, 9)); await tick(); reads[5].resolve(data(none, 3)); await staleRejected
check(resource.getSnapshot().state.data.version === 9, 'previous operator response cannot leak')
resource.setSession(null)
check(resource.getSnapshot().state.status === 'idle' && !resource.getSnapshot().lastData, 'logout clears state')
await assert.rejects(resource.revalidate(), e => e.name === 'AbortError')
check(reads.length === 7, 'no GET or retry without session')
unsub3()
check(notifications > 0, 'external-store notifications delivered')

// Routing, tenant overrides, drawer focus and RBAC remain owned by unchanged code.
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' })
for (const path of ['src/app', 'src/lib/authSession.ts', 'src/components/shell/AppShell.tsx', 'src/components/shell/navigation.ts', 'src/features/dashboard']) {
  check(!git('diff', '--name-only', 'cc1ae35', '--', path).trim(), 'Stage C leaves routes/shortcuts/auth/focus shell unchanged: ' + path)
}
const sidebar = await readFile(resolve(root, 'src/components/shell/Sidebar.tsx'), 'utf8')
check(sidebar.includes('subNavHrefs?.[child.id] ?? child.href') && sidebar.includes('subNavHrefs?.[item.id] ?? item.href'), 'tenant-specific destinations preserved')
check(sidebar.includes('aria-current={current') && sidebar.includes('currentType={childIsCurrent'), 'active states retained')
check(sidebar.includes('data-sidebar-visibility={navigation.mode}') && sidebar.includes('Recarregar visibilidade do menu'), 'fallback labelled and recoverable')
check(!/navigate|redirect|location\.|Storage|authenticated.*Write/.test(sidebar), 'sidebar neither guards routes nor writes')
const hook = await readFile(resolve(root, 'src/features/menu-visibility/useVisibilitySource.ts'), 'utf8')
check(hook.includes('subscribeSession(() => resource.setSession(session()))'), 'canonical session lifecycle connected')
const save = await readFile(resolve(root, 'src/features/menu-visibility/useVisibilitySave.ts'), 'utf8')
check(save.includes('read: revalidateMenuVisibility'), 'Stage B coordinator readback shares fresh authoritative resource')
console.log(`Menu Visibility Stage C: ${checks} checks passed (synthetic only, zero live writes)`)
