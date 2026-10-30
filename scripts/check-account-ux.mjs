import assert from 'node:assert/strict'
import { reviewedParticipantCreation, participantCreationExclusions } from './reviewed-participant-creation-boundary.mjs'
import { execFileSync as nativeGit } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'
import { accountUxBaseline, accountUxFiles, accountUxPaths, beforeAccountUx, reviewedAccountUx, verifyAccountUxSource } from './reviewed-account-ux-boundary.mjs'
import { beforeConsolidation, execFileSync as historicalGit } from './reviewed-consolidation-boundary.mjs'
import { reviewedSetSmtp, setSmtpExclusions } from './reviewed-set-smtp-boundary.mjs'
import { reviewedAstSettings, astSettingsExclusions } from './reviewed-ast-settings-boundary.mjs'
import { reviewedOperationalUx, operationalUxExclusions } from './reviewed-operational-ux-boundary.mjs'

// Read and execute current candidates directly. Historical normalization cannot
// satisfy the rendered component, animation-effect, or CSS assertions below.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const text = path => readFileSync(resolve(root, path), 'utf8').replaceAll('\r\n', '\n')
const git = (...args) => nativeGit('git', args, { cwd: root, encoding: 'utf8' }).replaceAll('\r\n', '\n')
const dataModule = code => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
const reactUrl = pathToFileURL(require.resolve('react')).href
const renderUrl = pathToFileURL(require.resolve('react-dom/server')).href
const { createElement: h } = await import(reactUrl)
const { renderToStaticMarkup: render } = await import(renderUrl)
let checks = 0
async function check(label, run) { try { await run(); checks++ } catch (cause) { throw Error(label, { cause }) } }

function currentLoader({ development = false, overrides = {} } = {}) {
  const cache = new Map()
  async function url(path) {
    if (cache.has(path)) return cache.get(path)
    if (overrides[path]) return dataModule(overrides[path])
    if (path.endsWith('.css')) return dataModule('export default new Proxy({}, {get:(_,key)=>String(key)})')
    let code = ts.transpileModule(text(path), { fileName: path, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } }).outputText
      .replaceAll('import.meta.env', `({DEV:${development},VITE_API_BASE_URL:"https://control-plane.example.invalid/api"})`)
    for (const match of [...code.matchAll(/from\s+(['"])([^'"]+)\1/g)]) {
      let target
      if (match[2].startsWith('.')) {
        const base = resolve(root, dirname(path), match[2])
        const absolute = base.endsWith('.css') ? base : existsSync(base + '.ts') ? base + '.ts' : base + '.tsx'
        target = await url(relative(root, absolute).replaceAll('\\', '/'))
      } else target = pathToFileURL(require.resolve(match[2])).href
      code = code.replace(match[0], `from ${JSON.stringify(target)}`)
    }
    const result = dataModule(code); cache.set(path, result); return result
  }
  return async path => import(await url(path))
}
function block(source, selector) {
  const start = source.indexOf(selector + ' {')
  assert.ok(start >= 0, `Missing CSS selector: ${selector}`)
  const open = source.indexOf('{', start)
  let depth = 1, at = open + 1
  for (; at < source.length && depth; at++) { if (source[at] === '{') depth++; if (source[at] === '}') depth-- }
  assert.equal(depth, 0, `Unclosed CSS selector: ${selector}`)
  return source.slice(open + 1, at - 1)
}

await check('only the eight reviewed runtime paths changed from the operational baseline', () => {
  const changed = [...new Set((git('diff', '--name-only', accountUxBaseline, '--', 'src') + '\n' + git('ls-files', '--others', '--exclude-standard', '--', 'src')).trim().split('\n').filter(Boolean))].sort()
  assert.deepEqual(accountUxFiles().sort(), [...accountUxPaths].sort())
  // A later Settings/SMTP unit is independently checked against exact final
  // pins; do not repin or broaden this historical eight-file UX acceptance.
  assert.deepEqual(changed.filter(path => !reviewedParticipantCreation(path) && !reviewedSetSmtp(path) && !reviewedAstSettings(path) && (!reviewedOperationalUx(path) || accountUxPaths.includes(path))), [...accountUxPaths].sort())
})
for (const path of accountUxPaths) await check(`exact reviewed source and adversarial rejection: ${path}`, () => {
  const actual = text(path), previous = git('show', `${accountUxBaseline}:${path}`)
  assert.equal(reviewedAccountUx(path), true)
  assert.equal(verifyAccountUxSource(path, actual), true)
  assert.notEqual(actual, previous)
  assert.equal(beforeAccountUx(path, actual), previous)
  assert.equal(beforeAccountUx(path, previous), previous)
  assert.throws(() => verifyAccountUxSource(path, actual + '\n/* unreviewed */'))
  assert.throws(() => beforeAccountUx(path, actual + '\n/* unreviewed */'))
  const historical = beforeConsolidation(path, actual)
  assert.equal(beforeConsolidation(path, historical), historical)
})
for (const path of ['src/lib/apiClient.ts', 'src/mock/mockBackend.ts', 'src/components/ui/Unknown.tsx', 'src/features/whitelabel-accounts/admin/adminLifecycleClient.ts', 'constructor', '__proto__']) await check(`unlisted source never exempted: ${path}`, () => {
  assert.equal(reviewedAccountUx(path), false)
  assert.equal(verifyAccountUxSource(path, '// unrelated'), false)
})
await check('previous manifests, authoritative transport and business behavior preserved byte for byte', () => {
  for (const path of ['scripts/consolidation-reviewed-files.json', 'scripts/settings-evolution-reviewed-files.json']) assert.equal(text(path), git('show', `${accountUxBaseline}:${path}`))
  const laterExactPaths = [...setSmtpExclusions(), ...astSettingsExclusions(), ...operationalUxExclusions(), ...participantCreationExclusions()]
  for (const path of ['src/lib', 'src/app', 'src/features/menu-visibility', 'src/features/operation', 'src/features/whitelabel-settings', 'src/features/whitelabel-emails', 'src/features/whitelabel-accounts/admin/AdminLifecycleActions.tsx', 'src/features/whitelabel-accounts/admin/adminLifecycleContract.ts', 'src/features/whitelabel-accounts/admin/adminLifecycleClient.ts', 'package.json', 'package-lock.json', 'netlify.toml']) assert.equal(git('diff', accountUxBaseline, '--', path, ...laterExactPaths), '', path)
  assert.equal(historicalGit('git', ['diff', '--name-only', accountUxBaseline, '--', 'src'], { cwd: root, encoding: 'utf8' }).trim(), '')
  const args = ['diff', '--name-only', '450b9d5a5a1eabb6f986222bf2e08e0b18a71464', accountUxBaseline, '--', 'src']
  assert.equal(historicalGit('git', args, { cwd: root, encoding: 'utf8' }), nativeGit('git', args, { cwd: root, encoding: 'utf8' }))
})
await check('header delta removes only the rotating title and its import', () => {
  const path = 'src/components/shell/TopHeader.tsx'
  const previous = git('show', `${accountUxBaseline}:${path}`)
  const expected = previous.replace("import { RotatingDashboardTitle } from '../originkit/RotatingDashboardTitle'\n", '')
    .replace("{title === 'Dashboard Global' ? <><span className=\"visually-hidden\">Dashboard Global</span><RotatingDashboardTitle /></> : title}", '{title}')
  assert.notEqual(expected, previous)
  assert.equal(text(path), expected)
})

globalThis.window = { setTimeout, clearTimeout, location: { hash: '' }, matchMedia: () => ({ matches: true, addEventListener(){}, removeEventListener(){} }) }
globalThis.document = { hidden: false }
globalThis.fetch = () => { throw Error('Shared UX suite must not request a Backend') }
const authStub = `export const useSessionOperator=()=>({id:'synthetic',name:'QA',roles:['SUPER_ADMIN']});export const getOperator=useSessionOperator;export const logout=()=>{};export const getSessionVersion=()=>0;export const subscribeSession=()=>()=>{};export const getAccessToken=()=>null;export const handleUnauthorized=()=>{};`
for (const development of [false, true]) {
  const load = currentLoader({ development, overrides: { 'src/lib/authSession.ts': authStub } })
  const { TopHeader } = await load('src/components/shell/TopHeader.tsx')
  for (const title of ['Dashboard Global', 'Contas', 'Configurações']) await check(`current header SSR stable and hygienic (${development}, ${title})`, () => {
    const html = render(h(TopHeader, { title, location: 'QA', navOpen: false, onOpenNav(){} }))
    assert.equal((html.match(/<h1\b/g) || []).length, 1)
    assert.match(html, new RegExp(`<h1[^>]*>${title}</h1>`))
    assert.doesNotMatch(html, /role="search"|aria-label="Notificações"|RotatingDashboard|visually-hidden/)
    assert.match(html, /aria-label="Abrir menu"/)
    assert.match(html, /menu do usuário/)
  })
  await check(`current header preserves contextual breadcrumb links (${development})`, () => {
    const html = render(h(TopHeader, { title: 'Contas', location: '', breadcrumbs: [{ label: 'Whitelabels', href: '#/whitelabels' }, { label: 'Synthetic tenant' }, { label: 'Contas' }], navOpen: false, onOpenNav(){} }))
    assert.match(html, /aria-label="Trilha de navegação"/)
    assert.match(html, /href="#\/whitelabels"/)
    assert.equal((html.match(/aria-current="page"/g) || []).length, 1)
  })
  const { Dialog } = await load('src/components/ui/Dialog.tsx')
  await check(`native dialog retains accessible semantics and escaped content (${development})`, () => {
    const html = render(h(Dialog, { title: 'Criar administrador', description: '<unsafe>', onClose(){}, footer: h('button', null, 'Cancelar') }, h('input', { type: 'email', required: true })))
    assert.match(html, /<dialog[^>]*aria-labelledby=/)
    assert.match(html, /aria-describedby=/)
    assert.match(html, /aria-label="Fechar"/)
    assert.match(html, /&lt;unsafe&gt;/)
    assert.match(html, /type="email" required=""/)
  })
}

await check('coherent restrained CSS motion, no layout transition and reduced-motion override', () => {
  const tokens = text('src/styles/tokens.css'), dialog = text('src/components/ui/Dialog.module.css')
  assert.match(tokens, /--motion-duration-micro:\s*150ms/)
  assert.match(tokens, /--motion-duration-panel:\s*210ms/)
  assert.match(tokens, /--motion-ease:\s*cubic-bezier\(0\.2, 0\.7, 0\.2, 1\)/)
  assert.match(tokens, /--transition-fast:\s*var\(--motion-duration-micro\) var\(--motion-ease\)/)
  assert.match(block(dialog, '.dialog[open]'), /animation:\s*dialog-in var\(--motion-duration-panel\) var\(--motion-ease\)/)
  assert.match(dialog, /transform:\s*translateY\(4px\) scale\(0\.995\)/)
  const reduced = block(text('src/styles/global.css'), '@media (prefers-reduced-motion: reduce)')
  assert.match(reduced, /transition-duration:\s*0\.01ms !important/)
  assert.match(reduced, /animation-duration:\s*0\.01ms !important/)
  for (const path of ['src/components/ui/PrimaryButton.module.css', 'src/components/ui/OutlineButton.module.css']) assert.doesNotMatch(text(path), /transition:\s*(?:all|width|height|padding|margin)/)
})
await check('dialog and administrator controls retain small-screen wrapping and reachable targets', () => {
  const dialog = text('src/components/ui/Dialog.module.css'), close = block(dialog, '.close')
  assert.match(close, /width:\s*44px/); assert.match(close, /height:\s*44px/)
  assert.match(block(dialog, '.heading'), /overflow-wrap:\s*anywhere/)
  assert.match(block(dialog, '.dialog'), /max-height:\s*calc\(100dvh - 32px\)/)
  assert.match(block(dialog, '.body'), /overflow-y:\s*auto/)
  const admin = text('src/features/whitelabel-accounts/admin/AdminLifecycle.module.css')
  assert.match(block(admin, '.form'), /gap:\s*18px/)
  assert.match(block(admin, '.field input'), /min-height:\s*46px/)
  assert.match(block(admin, '.field input:focus-visible'), /outline:\s*2px/)
})
for (const path of ['src/components/ui/PrimaryButton.module.css', 'src/components/ui/OutlineButton.module.css']) await check(`disabled/coarse-pointer/focus affordances: ${path}`, () => {
  const css = text(path)
  assert.match(block(css, '.button:disabled'), /cursor:\s*not-allowed/)
  assert.match(block(css, '.button:disabled'), /opacity:\s*0\.55/)
  assert.match(css, /\.button:hover:not\(:disabled\)/)
  assert.match(block(css, '@media (pointer: coarse)'), /min-height:\s*44px/)
  assert.match(block(css, '@media (pointer: coarse)'), /white-space:\s*normal/)
  assert.match(block(css, '.button:focus-visible'), /var\(--focus-ring-dark\)/)
})
await check('decorative dot field has less contrast and cannot intercept input', () => {
  const css = text('src/features/whitelabels/visuals/DotMatrixBackground.module.css')
  assert.match(css, /opacity:\s*0\.16/)
  assert.match(css, /pointer-events:\s*none/)
})

// Execute the actual DetailTransition with controlled hook/effect scheduling.
// Browser QA verifies native geometry/focus; this tests identity sequencing,
// cleanup, reduced-motion changes and same-record refresh without timers/network.
const hooks = { slots: [], cursor: 0, queued: [], animations: [], reduced: false, notifications: [], scope: { current: { querySelectorAll: () => [1, 2] } } }
hooks.animate = (_selector, frames, options) => {
  const result = { frames, options, stopped: false, callbacks: [], then(fn){ this.callbacks.push(fn); return this }, stop(){ this.stopped = true }, complete(){ for (const fn of this.callbacks) fn() } }
  hooks.animations.push(result); return result
}
globalThis.__accountUxHooks = hooks
const hookUrl = dataModule(`
export function useState(initial){const s=globalThis.__accountUxHooks,i=s.cursor++;if(!s.slots[i])s.slots[i]={value:initial};return [s.slots[i].value,v=>{s.slots[i].value=typeof v==='function'?v(s.slots[i].value):v}];}
export function useRef(initial){const s=globalThis.__accountUxHooks,i=s.cursor++;if(!s.slots[i])s.slots[i]={current:initial};return s.slots[i];}
export function useLayoutEffect(run,deps){const s=globalThis.__accountUxHooks,i=s.cursor++,old=s.slots[i];if(!deps||!old||deps.some((v,n)=>!Object.is(v,old.deps[n]))){s.queued.push(()=>{old?.cleanup?.();s.slots[i]={deps,cleanup:run()};});}}
`)
const motionUrl = dataModule(`export const useAnimate=()=>[globalThis.__accountUxHooks.scope,globalThis.__accountUxHooks.animate];export const useReducedMotion=()=>globalThis.__accountUxHooks.reduced;export const stagger=value=>({stagger:value});`)
let detailCode = ts.transpileModule(text('src/components/ui/DetailTransition.tsx'), { fileName: 'DetailTransition.tsx', compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } }).outputText
for (const match of [...detailCode.matchAll(/from\s+(['"])([^'"]+)\1/g)]) detailCode = detailCode.replace(match[0], `from ${JSON.stringify(match[2] === 'react' ? hookUrl : match[2] === 'framer-motion' ? motionUrl : pathToFileURL(require.resolve(match[2])).href)}`)
const { DetailTransition } = await import(dataModule(detailCode))
const onDisplay = id => hooks.notifications.push(id)
function display(item) {
  hooks.cursor = 0; hooks.queued = []
  const tree = DetailTransition({ item, className: 'detail', sectionId: 'synthetic-detail', labelledBy: 'synthetic-title', onDisplay, children: current => h('div', { 'data-detail-stage': true, 'data-current-id': current.id }, current.name) })
  for (const run of hooks.queued) run()
  return tree
}
await check('detail entrance is bounded; same-identity refresh does not replay it', () => {
  let tree = display({ id: 'a', name: 'First' })
  assert.equal(hooks.animations.length, 1)
  const entrance = hooks.animations[0]
  assert.deepEqual(entrance.frames, { opacity: [0, 1], y: [4, 0] })
  assert.equal(entrance.options.duration, 0.18)
  assert.deepEqual(entrance.options.delay, { stagger: 0.012 })
  assert.equal(entrance.options.type, undefined)
  tree = display({ id: 'a', name: 'Refreshed' })
  assert.equal(hooks.animations.length, 1)
  assert.match(render(tree), /Refreshed/)
  assert.equal(tree.props.tabIndex, -1)
  assert.equal(tree.props['aria-labelledby'], 'synthetic-title')
})
await check('detail identity swap keeps one inert outgoing region then hands off incoming identity', () => {
  let tree = display({ id: 'b', name: 'Second' })
  assert.equal(tree.props.inert, true)
  assert.match(render(tree), /data-current-id="a"/)
  assert.equal(hooks.animations[0].stopped, true)
  const exit = hooks.animations.at(-1)
  assert.equal(exit.options.duration, 0.09)
  assert.deepEqual(exit.frames, { opacity: 0, y: -2 })
  exit.complete()
  tree = display({ id: 'b', name: 'Second' })
  assert.equal(tree.props.inert, false)
  assert.match(render(tree), /Second/)
  assert.equal(hooks.notifications.at(-1), 'b')
})
await check('superseded identity animation cannot commit stale content', () => {
  display({ id: 'c', name: 'Cancelled' })
  const cancelled = hooks.animations.at(-1)
  display({ id: 'd', name: 'Latest' })
  const latest = hooks.animations.at(-1)
  assert.equal(cancelled.stopped, true)
  cancelled.complete()
  assert.equal(hooks.slots[0].value.id, 'b')
  latest.complete()
  const tree = display({ id: 'd', name: 'Latest' })
  assert.match(render(tree), /Latest/)
  assert.doesNotMatch(render(tree), /Cancelled/)
})
await check('reduced-motion identity change is immediate and cannot resurrect old content when preference changes', () => {
  hooks.reduced = true
  let tree = display({ id: 'e', name: 'Reduced current' })
  assert.equal(hooks.animations.at(-1).options.duration, 0)
  assert.equal(tree.props.inert, false)
  assert.match(render(tree), /Reduced current/)
  // Commit any state synchronized by the reduced-motion layout effect.
  tree = display({ id: 'e', name: 'Reduced current' })
  hooks.reduced = false
  tree = display({ id: 'e', name: 'Reduced current' })
  assert.equal(tree.props.inert, false)
  assert.match(render(tree), /Reduced current/)
  assert.doesNotMatch(render(tree), /Latest/)
  const before = hooks.animations.length
  tree = display({ id: 'e', name: 'Current refresh' })
  assert.equal(hooks.animations.length, before)
  assert.match(render(tree), /Current refresh/)
})
console.log(`Account UX: ${checks} checks passed (native candidate SSR/effects/CSS; exact source pins; no network)`)
