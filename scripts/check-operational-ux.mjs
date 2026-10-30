import assert from 'node:assert/strict'
import { reviewedAstSettings, astSettingsExclusions, withoutAstSettings } from './reviewed-ast-settings-boundary.mjs'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'
import {
  beforeOperationalUx, operationalUxBaseline, operationalUxDigest,
  operationalUxExclusions, operationalUxFiles, operationalUxFinalized,
  operationalUxReviewPaths, reviewedOperationalUx, verifyOperationalUxSource,
  withoutOperationalUx,
} from './reviewed-operational-ux-boundary.mjs'
import { beforeConsolidation, execFileSync as historicalGit } from './reviewed-consolidation-boundary.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
globalThis.fetch = () => { throw Error('Structural UX tests must not request a Backend') }
const require = createRequire(import.meta.url)
const normalize = value => value.replaceAll('\r\n', '\n')
// Deliberately native: behavioral tests never see historical normalized source.
const source = path => normalize(readFileSync(resolve(root, path), 'utf8'))
const git = (...args) => normalize(execFileSync('git', args, { cwd: root, encoding: 'utf8' }))
const manifest = JSON.parse(source('scripts/operational-ux-reviewed-files.json'))
let checks = 0
async function check(label, run) { try { await run(); checks++ } catch (cause) { throw Error(label, { cause }) } }

await check('review is finalized and covers the entire exact runtime delta', () => {
  assert.equal(operationalUxFinalized(), true, 'Finalize only after review of the completed source diff')
  const changed = [...new Set((git('diff', '--name-only', operationalUxBaseline, '--', 'src') + '\n' + git('ls-files', '--others', '--exclude-standard', '--', 'src')).trim().split('\n').filter(Boolean))].sort()
  assert.ok(changed.length > 0)
  assert.deepEqual(operationalUxFiles().sort(), changed.filter(path => operationalUxFiles().includes(path) || !reviewedAstSettings(path)))
  assert.ok(changed.every(path => operationalUxReviewPaths.includes(path) || reviewedAstSettings(path)))
})
for (const path of operationalUxFiles()) {
  await check(`exact current bytes, baseline and adversarial rejection: ${path}`, () => {
    const current = source(path), previous = git('show', `${operationalUxBaseline}:${path}`)
    assert.equal(manifest.files[path].before, operationalUxDigest(previous))
    assert.equal(manifest.files[path].after, operationalUxDigest(withoutAstSettings(path, current)))
    assert.equal(reviewedOperationalUx(path), true)
    assert.equal(verifyOperationalUxSource(path, current), true)
    assert.equal(beforeOperationalUx(path, current), previous)
    assert.equal(beforeOperationalUx(path, previous), previous)
    assert.throws(() => verifyOperationalUxSource(path, current + '\n// unreviewed'))
    assert.throws(() => beforeOperationalUx(path, current + '\n// unreviewed'))
    // An inherited adapter must never substitute an arbitrary supplied source.
    assert.equal(withoutOperationalUx(path, '// unrelated older bytes'), '// unrelated older bytes')
    const historical = beforeConsolidation(path, current)
    assert.equal(beforeConsolidation(path, historical), historical)
  })
}
for (const path of ['src/lib/apiClient.ts', 'src/app/App.tsx', 'src/features/menu-visibility/menuRegistry.ts', 'src/mock/mockBackend.ts', 'src/features/operation/Unknown.tsx', 'constructor', '__proto__']) {
  await check(`no unreviewed path receives compatibility: ${path}`, () => {
    assert.equal(reviewedOperationalUx(path), false)
    assert.equal(verifyOperationalUxSource(path, '// planted'), false)
  })
}
await check('previous review manifests remain immutable', () => {
  for (const path of ['consolidation-reviewed-files.json', 'settings-evolution-reviewed-files.json', 'account-ux-reviewed-files.json', 'set-smtp-reviewed-files.json']) {
    const file = `scripts/${path}`
    assert.equal(source(file), git('show', `${operationalUxBaseline}:${file}`), file)
  }
})
await check('auth, routing, menu, business clients, models, transport and dependencies remain unchanged', () => {
  // Runtime deltas outside these exact reviewed presentation files cannot hide
  // behind a directory exemption. Models/contracts/clients are not in the list.
  assert.equal(git('diff', operationalUxBaseline, '--', 'src', ...operationalUxExclusions(), ...astSettingsExclusions()), '')
  assert.equal(git('diff', operationalUxBaseline, '--', 'src/lib', 'src/app', 'src/features/menu-visibility', 'src/components/shell/navigation.ts', 'package.json', 'package-lock.json', 'netlify.toml', ...astSettingsExclusions()), '')
})
await check('native behavior readers and historical two-tree comparisons remain native', () => {
  const adapter = source('scripts/reviewed-consolidation-boundary.mjs')
  assert.match(adapter, /return nativeReadFile\(path, \.\.\.options\)/)
  assert.match(adapter, /return nativeReadFileSync\(path, \.\.\.options\)/)
  const args = ['diff', '--name-only', 'ebc2f49b328e7185b679e7413b355056b4b49554', operationalUxBaseline, '--', 'src']
  assert.equal(historicalGit('git', args, { cwd: root, encoding: 'utf8' }), execFileSync('git', args, { cwd: root, encoding: 'utf8' }))
})

const lists = [
  'src/features/operation/opportunities/OpportunitiesPage.tsx',
  'src/features/operation/investors/InvestorsPage.tsx',
  'src/features/operation/entrepreneurs/EntrepreneursPage.tsx',
  'src/features/operation/companies/CompaniesPage.tsx',
  'src/features/finance-core/investments/InvestmentsPage.tsx',
  'src/features/finance-core/payments/PaymentsPage.tsx',
  'src/features/finance-core/wallets/WalletsPage.tsx',
  'src/features/governance-audit/AuditListPage.tsx',
  'src/features/compliance-kyc/KycListPage.tsx',
  'src/features/control-plane-operators/OperatorsListPage.tsx',
]
const printer = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed })
function behavioralProjection(path, code) {
  const tree = ts.createSourceFile(path, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const controls = []
  function visit(node) {
    if (ts.isJsxAttribute(node) && /^(?:on[A-Z]\w*|disabled|value|checked|href|type|maxLength|name|id|aria-label|aria-labelledby|aria-describedby)$/.test(node.name.getText(tree))) {
      controls.push(printer.printNode(ts.EmitHint.Unspecified, node, tree))
    }
    ts.forEachChild(node, visit)
  }
  visit(tree)
  const transformed = ts.transform(tree, [context => rootNode => {
    const strip = node => ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)
      ? ts.factory.createIdentifier('__presentation__') : ts.visitEachChild(node, strip, context)
    return ts.visitNode(rootNode, strip)
  }])
  const logic = printer.printFile(transformed.transformed[0]); transformed.dispose()
  return { logic, controls: controls.sort() }
}
for (const path of lists) await check(`current list preserves query/state logic and interactive attributes: ${path}`, () => {
  const current = source(path), previous = git('show', `${operationalUxBaseline}:${path}`)
  assert.deepEqual(behavioralProjection(path, current), behavioralProjection(path, previous))
  if (current.includes('fin.labeledSearch')) {
    assert.match(current, /className=\{fin\.controlLabel\} aria-hidden="true">Busca<\/span>/)
    assert.match(current, /className=\{shared\.listHeading\}/)
    // The concise visual label supplements, rather than replaces, the original
    // specific accessible name and native input/select association.
    assert.equal((current.match(/<label className=\{`\$\{fin\.(?:search|filter)\}/g) ?? []).length, (previous.match(/<label className=\{fin\.(?:search|filter)\}/g) ?? []).length)
  }
})

for (const scope of [
  { page: 'src/features/whitelabels/WhitelabelsPage.tsx', panel: 'src/features/whitelabels/WhitelabelListPanel.tsx', css: 'src/features/whitelabels/WhitelabelsPage.module.css', target: 'wl-list-title', account: false },
  { page: 'src/features/whitelabel-accounts/WhitelabelAccountsPage.tsx', panel: 'src/features/whitelabel-accounts/AccountListPanel.tsx', css: 'src/features/whitelabel-accounts/WhitelabelAccountsPage.module.css', target: 'acc-list-title', account: true },
]) await check(`current narrow-detail return preserves the query and restores list focus: ${scope.page}`, () => {
  const text = source(scope.page)
  const tree = ts.createSourceFile(scope.page, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  let declaration
  function visit(node) { if (ts.isFunctionDeclaration(node) && node.name?.text === 'returnToList') declaration = node; ts.forEachChild(node, visit) }
  visit(tree)
  assert.ok(declaration, 'The visible return control must have an explicit handler')
  const code = ts.transpileModule(declaration.getText(tree), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
  const calls = [], revealPending = { current: true }, route = { page: 7 }
  const windowStub = { requestAnimationFrame: run => { calls.push('frame'); run() } }
  const documentStub = { getElementById: id => { assert.equal(id, scope.target); return {
    focus: options => calls.push(['focus', options]), scrollIntoView: options => calls.push(['scroll', options]),
  } } }
  const navigate = (value, mode) => calls.push(['navigate', value, mode])
  const href = value => { calls.push(['href', value]); return '#/whitelabels/6/accounts?tipo=investidores&search=synthetic&page=7' }
  const push = value => calls.push(['push', value])
  Function('revealPending', 'route', 'navigate', 'href', 'pushRouteKeepingScroll', 'window', 'document', `${code}; returnToList();`)(revealPending, route, navigate, href, push, windowStub, documentStub)
  assert.equal(revealPending.current, false)
  assert.deepEqual(calls, scope.account ? [
    ['href', { page: 7 }], ['push', '#/whitelabels/6/accounts?tipo=investidores&search=synthetic&page=7'], 'frame', ['focus', { preventScroll: true }], ['scroll', { block: 'start' }],
  ] : [['navigate', { page: 7 }, 'push'], 'frame', ['focus', { preventScroll: true }], ['scroll', { block: 'start' }]])
  assert.match(text, /type="button" className=\{styles\.returnButton\} onClick=\{returnToList\}/)
  assert.match(text, /data-detail-open=\{route\.(?:accountId|id) \? true : undefined\}/)
  const panel = source(scope.panel)
  assert.match(panel, new RegExp(`id="${scope.target}"[^>]*tabIndex=\\{-1\\}`))
  const css = source(scope.css)
  assert.match(css, /@media \(max-width: 1199px\)/)
  assert.match(css, /\[data-detail-open\] \.list\s*\{\s*display:\s*none/)
  assert.match(css, /\[data-detail-open\] \.detail\s*\{\s*display:\s*(?:grid|flex)/)
})

const dataModule = code => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
const reactUrl = pathToFileURL(require.resolve('react')).href
const { createElement: h } = await import(reactUrl)
const { renderToStaticMarkup: render } = await import(pathToFileURL(require.resolve('react-dom/server')).href)
function currentLoader() {
  const cache = new Map()
  const overrides = {
    'src/components/shell/AppShell.tsx': `import {createElement as h} from ${JSON.stringify(reactUrl)};export const AppShell=({children})=>h('main',null,children);`,
    'src/components/shell/notice.ts': 'export const useNotice=()=>()=>{};',
    'src/features/whitelabels/visuals/DotMatrixBackground.tsx': 'export const DotMatrixBackground=()=>null;',
  }
  async function url(path) {
    if (cache.has(path)) return cache.get(path)
    if (overrides[path]) return dataModule(overrides[path])
    if (path.endsWith('.css')) return dataModule('export default new Proxy({}, {get:(_,key)=>String(key)})')
    let code = ts.transpileModule(source(path), { fileName: path, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } }).outputText
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
const ui = await currentLoader()('src/features/operation/shared/OperationUi.tsx')
const icon = () => h('svg', { 'aria-hidden': true })
await check('current compact summary retains data, unavailable values and exact provenance', () => {
  const html = render(h(ui.SummaryCards, { title: 'Resumo de teste', note: 'Escopo autoritativo <não é HTML>', cards: [
    { label: 'Total', value: '17', detail: 'Tenant de teste', icon, tone: 'blue' },
    { label: 'Estado indisponível', value: null, detail: 'Sem projeção', icon, tone: 'neutral' },
  ] }))
  assert.equal((html.match(/<article\b/g) ?? []).length, 2)
  assert.match(html, /summaryStrip/)
  assert.match(html, />17<\/p>/)
  assert.match(html, /sem dados/)
  assert.match(html, /<details class="summaryProvenance">/)
  assert.match(html, /<summary>Escopo e origem dos indicadores<\/summary>/)
  assert.match(html, /Escopo autoritativo &lt;não é HTML&gt;/)
  assert.match(html, /Tenant de teste/)
})
await check('current introduction keeps action, return link and disabled semantics intact', () => {
  const html = render(h(ui.PageIntro, { text: 'Consulta <segura>', readOnly: true, back: h(ui.BackLink, { href: '#/operation/investors?page=2', label: 'Voltar à consulta' }), actions: h('button', { disabled: true, type: 'button' }, 'Indisponível') }))
  assert.match(html, /Somente leitura/)
  assert.match(html, /Consulta &lt;segura&gt;/)
  assert.match(html, /href="#\/operation\/investors\?page=2"/)
  assert.match(html, /<button disabled="" type="button">Indisponível<\/button>/)
  assert.doesNotMatch(render(h(ui.PageIntro, { text: 'Consulta' })), /Somente leitura/)
})
await check('current detail semantics and owner-domain navigation remain distinct', () => {
  const detail = render(h(ui.DetailList, { rows: [{ label: 'Identidade', value: '<safe>' }, { label: 'Vínculo', value: h('a', { href: '#/whitelabels?id=6' }, 'Whitelabel'), wide: true }] }))
  assert.match(detail, /<dl/); assert.equal((detail.match(/<dt>/g) ?? []).length, 2)
  assert.match(detail, /&lt;safe&gt;/)
  const links = render(h(ui.DomainNavCard, { title: 'Vínculos', intro: 'Domínios responsáveis', items: [
    { key: 'accounts', label: 'Contas', description: 'Acesso', href: '#/whitelabels/6/accounts', icon },
    { key: 'pending', label: 'Não publicado', description: 'Pendente', href: '#/not-real', pending: true, icon },
  ] }))
  assert.match(links, /data-nav="accounts"/)
  assert.doesNotMatch(links, /not-real|Não publicado/)
})
await check('current styles preserve visible labels, focus and responsive fallback', () => {
  const fin = source('src/features/finance-gateways/sections/FinanceSections.module.css')
  const op = source('src/features/operation/shared/Operation.module.css')
  assert.match(fin, /\.controlLabel\s*\{/)
  assert.match(fin, /\.labeledSearch input:focus-visible/)
  assert.match(fin, /\.labeledFilter select:focus-visible/)
  assert.match(fin, /\.summaryProvenance summary:focus-visible/)
  assert.match(fin, /\.labeledSearch > svg\s*\{[^}]*pointer-events:\s*none/s)
  assert.match(op, /@container \(max-width: 400px\)/)
  assert.match(op, /\.filterSelects\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/s)
  assert.doesNotMatch(fin + op, /transition:\s*(?:all|width|height|padding|margin)\b/)
})
console.log(`Operational structural UX: ${checks} checks passed; exact presentation delta, current-source AST/SSR and historical assertions preserved; no network.`)
