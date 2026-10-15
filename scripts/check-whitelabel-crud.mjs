import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

// Whitelabel CRUD Frontend V1 — in-memory contract checks (synthetic, no network).
// NO LIVE MUTATIONS ARE ENABLED: these checks also prove that no request code exists.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(pathToFileURL(resolve(root, 'package.json')))
const modules = new Map()
async function moduleUrl(path) {
  if (modules.has(path)) return modules.get(path)
  let code = ts.transpileModule(await readFile(path, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText.replaceAll('import.meta.env', '({VITE_API_BASE_URL:"https://control-plane.example.invalid/api"})')
  for (const match of [...code.matchAll(/from\s+(['"])([^'"]+)\1/g)]) {
    const specifier = match[2]
    const url = specifier.startsWith('.')
      ? await moduleUrl(resolve(dirname(path), `${specifier}.ts`))
      : pathToFileURL(require.resolve(specifier)).href
    code = code.replace(match[0], `from ${JSON.stringify(url)}`)
  }
  const url = `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
  modules.set(path, url)
  return url
}
const load = async (path) => import(await moduleUrl(resolve(root, path)))

// Exercise the actual TSX event handlers without a DOM/network or another test
// dependency. Only hooks/presentational imports are stubbed; form, contract and
// PendingActionButton implementations are the production source. Browser/native
// dialog/keyboard behavior is separately verified in the built-in browser.
const componentModules = new Map()
const dataModule = (code) => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
const hookModule = dataModule(`
  export const useState = value => globalThis.__wlCrudHooks.useState(value);
  export const useRef = () => ({ current: null });
  export const useEffect = () => {};
  export const useId = () => 'synthetic-lifecycle';
`)
async function componentUrl(path) {
  if (componentModules.has(path)) return componentModules.get(path)
  let code = ts.transpileModule(await readFile(path, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  for (const match of [...code.matchAll(/import\s+([^;]+?)\s+from\s+(['"])([^'"]+)\2/g)]) {
    const [, clause, , specifier] = match
    let url
    if (specifier === 'react') url = hookModule
    else if (specifier === 'react/jsx-runtime') url = pathToFileURL(require.resolve(specifier)).href
    else if (specifier.endsWith('.css')) url = dataModule('export default new Proxy({}, {get: (_, key) => key});')
    else if (specifier === './whitelabelForm' || specifier === './whitelabelMutationContract' || specifier === '../whitelabelApi') {
      url = await moduleUrl(resolve(dirname(path), `${specifier}.ts`))
    } else if (specifier === './MutationStates') url = await componentUrl(resolve(dirname(path), `${specifier}.tsx`))
    else {
      const names = clause.replace(/[{}]/g, '').split(',').map(value => value.trim()).filter(Boolean)
      url = dataModule(names.map(name => `export const ${name} = () => null;`).join('\n'))
    }
    code = code.replace(match[0], `import ${clause} from ${JSON.stringify(url)}`)
  }
  const url = dataModule(code)
  componentModules.set(path, url)
  return url
}
const loadComponent = async (name) => import(await componentUrl(resolve(root, 'src/features/whitelabels/crud', name)))
function renderHarness(Component, props) {
  const state = []
  let cursor = 0
  const hooks = { useState(initial) {
    const index = cursor++
    if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial
    return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value }]
  } }
  return { render() { cursor = 0; globalThis.__wlCrudHooks = hooks; return Component(props) } }
}
function findElement(node, predicate) {
  if (!node || typeof node !== 'object') return null
  if (predicate(node)) return node
  for (const child of Array.isArray(node) ? node : Object.values(node.props ?? {})) {
    const found = findElement(child, predicate)
    if (found) return found
  }
  return null
}
const byId = (tree, id) => findElement(tree, element => element.props?.id === id)
const buttonText = (tree, text) => findElement(tree, element => element.props?.children === text && element.props?.onClick)
let requests = 0
globalThis.fetch = async () => { requests += 1; throw new Error('Unexpected request') }

const form = await load('src/features/whitelabels/crud/whitelabelForm.ts')
const contract = await load('src/features/whitelabels/crud/whitelabelMutationContract.ts')
const { ApiError } = await load('src/lib/api.ts')
const record = {
  id: '4', name: 'Synthetic Platform', slug: 'synthetic-platform', baseUrl: 'https://synthetic.example.test', domain: 'synthetic.example.test',
  status: 'active', admins: 2, applications: null, integrations: null, createdAt: '2026-01-10T12:00:00.000Z', updatedAt: '2026-10-01T12:00:00.000Z',
}
let checks = 0
async function check(name, action) {
  try { await action(); checks += 1 } catch (cause) {
    if (cause instanceof Error && cause.stack) cause.stack = cause.stack.replace(/data:text\/javascript;base64,[A-Za-z0-9+/=]+/g, '<in-memory-module>')
    throw new Error(`Failed: ${name}`, { cause })
  }
}

/* ---------- create form ---------- */
await check('create: name and slug required, URL base optional (A / A / B)', async () => {
  assert.deepEqual(Object.keys(form.validateCreate(form.EMPTY_DRAFT)).sort(), ['name', 'slug'])
  assert.deepEqual(form.validateCreate({ name: 'Ok Name', slug: 'ok-name', baseUrl: '' }), {})
  assert.equal(form.FIELD_META.name.createClass, 'A'); assert.equal(form.FIELD_META.slug.createClass, 'A'); assert.equal(form.FIELD_META.baseUrl.createClass, 'B')
  assert.equal(form.FIELD_META.slug.editClass, 'C')
})
await check('create: name length 2–120 after whitespace normalization', async () => {
  assert.ok(form.validateCreate({ name: ' A ', slug: 'a', baseUrl: '' }).name)
  assert.ok(form.validateCreate({ name: 'x'.repeat(121), slug: 'a', baseUrl: '' }).name)
  assert.equal(form.validateCreate({ name: 'x'.repeat(120), slug: 'a', baseUrl: '' }).name, undefined)
  assert.equal(form.tidyName('  Nova   Plataforma \n'), 'Nova Plataforma')
  assert.deepEqual(form.normalizeDraft({ name: '  A   B ', slug: ' ab ', baseUrl: ' https://x.example.test ' }), { name: 'A B', slug: 'ab', baseUrl: 'https://x.example.test' })
})
await check('create: slug mirrors the draft DTO (lowercase, digits, hyphen, ≤ 80)', async () => {
  for (const bad of ['Upper', 'com espaço', 'acentuação', 'under_score', 'dot.slug', 'x'.repeat(81)]) {
    assert.ok(form.validateCreate({ name: 'Ok', slug: bad, baseUrl: '' }).slug, bad)
  }
  for (const good of ['abc', 'a-1', '123', 'x'.repeat(80)]) assert.equal(form.validateCreate({ name: 'Ok', slug: good, baseUrl: '' }).slug, undefined, good)
})
await check('create: URL base must be an absolute http(s) URL when given', async () => {
  for (const bad of ['finapop.com.br', 'ftp://x.example.test', 'https://', 'https://exa mple.test', 'javascript:alert(1)']) {
    assert.ok(form.validateCreate({ name: 'Ok', slug: 'ok', baseUrl: bad }).baseUrl, bad)
  }
  for (const good of ['https://x.example.test', 'http://localhost:3000', 'https://a.example.test/path']) {
    assert.equal(form.validateCreate({ name: 'Ok', slug: 'ok', baseUrl: good }).baseUrl, undefined, good)
  }
})
await check('create: dirty only with typed (non-blank) content', async () => {
  assert.equal(form.isCreateDirty({ name: '   ', slug: '', baseUrl: ' ' }), false)
  assert.equal(form.isCreateDirty({ name: 'a', slug: '', baseUrl: '' }), true)
})

/* ---------- edit form ---------- */
await check('edit: starts from the authoritative record; only name / URL base are candidates', async () => {
  const draft = form.draftFromRecord(record)
  assert.deepEqual(draft, { name: record.name, slug: record.slug, baseUrl: record.baseUrl })
  assert.deepEqual(form.changedFields(record, draft), [])
  assert.deepEqual(form.changedFields(record, { ...draft, slug: 'other-slug' }), [], 'slug is never an edit candidate')
  const changes = form.changedFields(record, { ...draft, name: '  Renamed   Platform ' })
  assert.deepEqual(changes, [{ key: 'name', label: 'Nome', before: record.name, after: 'Renamed Platform' }])
})
await check('edit: clearing an existing URL base is pending (no contract) — blocked, not guessed', async () => {
  assert.ok(form.validateEdit(record, { ...form.draftFromRecord(record), baseUrl: '  ' }).baseUrl)
  assert.equal(form.validateEdit({ ...record, baseUrl: null }, { ...form.draftFromRecord({ ...record, baseUrl: null }) }).baseUrl, undefined)
  assert.ok(form.validateEdit(record, { ...form.draftFromRecord(record), name: '' }).name)
})
await check('edit: immutable / derived values are read-only facts', async () => {
  const labels = form.readOnlyFacts(record).map((fact) => fact.label)
  assert.deepEqual(labels, ['ID', 'Identificador (slug)', 'Status', 'Domínio', 'Criado em', 'Última atualização'])
  assert.equal(form.readOnlyFacts(record)[0].value, '4')
})

/* ---------- mutation contract (types + presentation only) ---------- */
await check('every Whitelabel mutation is unavailable (Backend pending)', async () => {
  for (const action of ['create', 'update', 'lifecycle']) {
    assert.equal(contract.WHITELABEL_MUTATIONS[action].available, false, action)
    assert.match(contract.WHITELABEL_MUTATIONS[action].pendingLabel, /aguardando integração do Backend/)
  }
})
await check('request previews: normalized create body; update carries changed candidates only', async () => {
  assert.deepEqual(contract.createRequestPreview({ name: ' Nova  Plataforma ', slug: ' nova ', baseUrl: ' ' }), { name: 'Nova Plataforma', slug: 'nova' })
  assert.deepEqual(contract.createRequestPreview({ name: 'N', slug: 'n', baseUrl: 'https://n.example.test' }), { name: 'N', slug: 'n', baseUrl: 'https://n.example.test' })
  assert.deepEqual(contract.updateRequestPreview(record, form.draftFromRecord(record)), {})
  const preview = contract.updateRequestPreview(record, { name: 'Renamed', slug: 'hacked', baseUrl: 'https://new.example.test' })
  assert.deepEqual(preview, { name: 'Renamed', baseUrl: 'https://new.example.test' })
  for (const key of ['id', 'slug', 'status', 'domain', 'createdAt', 'updatedAt']) assert.equal(key in preview, false, key)
})
await check('dependency domains are listed without counts', async () => {
  assert.deepEqual(contract.DEPENDENCY_DOMAINS, ['Contas', 'Investidores', 'Empreendedores', 'Empresas', 'Oportunidades', 'Investimentos', 'Pagamentos', 'Wallets'])
})
const raw = 'synthetic-private-backend-message'
const http = (status, code) => new ApiError(status, { message: raw, code, correlationId: 'cid-synthetic-1' })
for (const [error, action, kind, retryable] of [
  [http(400), 'create', 'invalid', false],
  [http(422), 'update', 'invalid', false],
  [http(401), 'create', 'session', false],
  [http(403), 'lifecycle', 'forbidden', false],
  [http(404), 'update', 'not-found', false],
  [http(409), 'create', 'conflict', false],
  [http(409), 'update', 'conflict', false],
  [http(409, 'WHITELABEL_HAS_DEPENDENCIES'), 'lifecycle', 'dependencies', false],
  [http(500), 'create', 'unavailable', true],
  [http(502, 'CORE_HTTP_ERROR'), 'lifecycle', 'unavailable', true],
  [new ApiError(0, {}, { kind: 'network' }), 'update', 'unavailable', true],
  [new ApiError(0, {}, { kind: 'timeout' }), 'create', 'unavailable', true],
  [new ApiError(200, {}, { kind: 'malformed' }), 'create', 'unavailable', true],
  [new Error(raw), 'update', 'unavailable', true],
  [http(418), 'create', 'invalid', false],
]) {
  await check(`mutation error ${error.status ?? 'unknown'} (${error.kind ?? 'Error'}) on ${action} → ${kind}`, async () => {
    const view = contract.describeMutationError(error, action)
    assert.equal(view.kind, kind); assert.equal(view.retryable, retryable)
    assert.equal(`${view.title} ${view.description}`.includes(raw), false, 'raw Backend text never shown')
    if (error instanceof ApiError && error.kind === 'http') assert.equal(view.correlationId, 'cid-synthetic-1')
  })
}
await check('no response / 5xx never claims the operation did not happen (non-idempotent safety)', async () => {
  assert.match(contract.describeMutationError(new ApiError(0, {}, { kind: 'timeout' }), 'create').description, /pode ou não ter sido criado/)
  assert.match(contract.describeMutationError(http(503), 'update').description, /podem ou não ter sido aplicadas/)
  assert.match(contract.describeMutationError(new ApiError(0, {}, { kind: 'network' }), 'lifecycle').description, /pode ou não ter sido alterado/)
})
await check('409 on deactivate/remove reads as dependency-blocked (no counts)', async () => {
  const view = contract.describeMutationError(http(409), 'lifecycle')
  assert.match(view.description, /possui dependências e não pode ser removido/)
  assert.equal(/\d/.test(view.description), false)
})

/* ---------- source boundaries: no mutation request code anywhere ---------- */
const wlDir = resolve(root, 'src/features/whitelabels')
const crudFiles = (await readdir(resolve(wlDir, 'crud'))).filter((name) => /\.tsx?$/.test(name)).sort()
await check('crud module: the expected files only', async () => {
  assert.deepEqual(crudFiles, ['MutationStates.tsx', 'WhitelabelActionsMenu.tsx', 'WhitelabelFormDialog.tsx', 'WhitelabelLifecycleDialog.tsx',
    'whitelabelForm.ts', 'whitelabelMutationContract.ts'])
})
const crudSources = Object.fromEntries(await Promise.all(crudFiles.map(async (name) => [name, await readFile(resolve(wlDir, 'crud', name), 'utf8')])))
await check('crud sources: no request code, storage, logging or prototype data', async () => {
  for (const [name, source] of Object.entries(crudSources)) {
    const code = source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')
    assert.equal(/fetch\(|apiRequest|authenticatedGet|XMLHttpRequest|sendBeacon|method\s*:/.test(code), false, name)
    assert.equal(/sessionStorage|localStorage|indexedDB/.test(code), false, name)
    assert.equal(/console\.(log|info|debug|warn|error)/.test(code), false, name)
    assert.equal(/prototypeWhitelabels|PROTOTYPE_|usePrototypeNotice/.test(code), false, name)
  }
})
await check('final commit buttons are aria-disabled pending buttons, never submit', async () => {
  assert.match(crudSources['MutationStates.tsx'], /aria-disabled="true"/)
  assert.match(crudSources['MutationStates.tsx'], /onClick=\{\(event\) => event\.preventDefault\(\)\}/)
  assert.match(crudSources['WhitelabelFormDialog.tsx'], /<PendingActionButton label=\{editing \? 'Salvar alterações' : 'Criar Whitelabel'\}/)
  assert.match(crudSources['WhitelabelLifecycleDialog.tsx'], /<PendingActionButton label="Desativar ou remover"/)
  // Dialogs expose no "saved / created / removed" callback the page could use to alter authoritative data.
  for (const name of ['WhitelabelFormDialog.tsx', 'WhitelabelLifecycleDialog.tsx']) {
    assert.equal(/onSave|onCreated|onSaved|onRemoved|onDeleted|onConfirm\b/.test(crudSources[name]), false, name)
  }
})
await check('the Whitelabel read adapter stays GET-only; no mutation verb exists in the frontend', async () => {
  const api = await readFile(resolve(wlDir, 'whitelabelApi.ts'), 'utf8')
  assert.equal(/'POST'|'PATCH'|'PUT'|'DELETE'|apiRequest\(/.test(api), false)
  const walk = async (dir) => (await Promise.all((await readdir(dir, { withFileTypes: true })).map((entry) =>
    entry.isDirectory() ? walk(resolve(dir, entry.name)) : /\.tsx?$/.test(entry.name) ? [resolve(dir, entry.name)] : []))).flat()
  for (const file of await walk(resolve(root, 'src'))) {
    const source = await readFile(file, 'utf8')
    assert.equal(/method:\s*['"](PATCH|PUT|DELETE)['"]/.test(source), false, file)
    if (/method:\s*['"]POST['"]/.test(source)) assert.match(file.replaceAll('\\', '/'), /src\/lib\/authSession\.ts$/, 'only the login uses POST')
  }
})
await check('page wiring: dialogs get the loaded record; no list / detail state is written', async () => {
  const page = await readFile(resolve(wlDir, 'WhitelabelsPage.tsx'), 'utf8')
  assert.match(page, /<WhitelabelFormDialog\s+mode="create"/)
  assert.match(page, /<WhitelabelFormDialog mode="edit" record=\{dialog\.record\}/)
  assert.match(page, /<WhitelabelLifecycleDialog record=\{dialog\.record\}/)
  assert.equal(/setListData|setRows|rows\.push|rows\.splice|rows\.unshift|\.data\.rows\s*=/.test(page), false)
})
await check('row actions: mobile reveal preserves specific menu focus, including the already-selected row', async () => {
  const page = await readFile(resolve(wlDir, 'WhitelabelsPage.tsx'), 'utf8')
  assert.match(page, /const actionFocused = panel\?\.querySelector\('\[data-wl-actions\]'\) === document\.activeElement/)
  assert.match(page, /if \(!actionFocused\) panel\?\.focus/)
  assert.match(page, /if \(selectedId === id && detail\.state\.status === 'success'\) \{[\s\S]*?if \(window\.matchMedia\(MOBILE_QUERY\)\.matches\) revealDetail\(\)/)
  const menu = crudSources['WhitelabelActionsMenu.tsx']
  assert.match(menu, /aria-label=\{`Ações de \$\{name\}`\}/)
  assert.match(menu, /data-wl-actions/)
})

/* ---------- actual handlers: click / keyboard-equivalent / programmatic submit ---------- */
const { WhitelabelFormDialog } = await loadComponent('WhitelabelFormDialog.tsx')
const { WhitelabelLifecycleDialog } = await loadComponent('WhitelabelLifecycleDialog.tsx')
const { PendingActionButton } = await loadComponent('MutationStates.tsx')
let focused = null
globalThis.document = { getElementById: id => ({ focus: () => { focused = id } }) }
globalThis.window = { requestAnimationFrame: action => action() }
const enterValue = (harness, id, value) => byId(harness.render(), id).props.onChange({ target: { value } })
const submitForm = (harness, id) => {
  let prevented = false
  byId(harness.render(), id).props.onSubmit({ preventDefault: () => { prevented = true } })
  assert.equal(prevented, true, 'click, Enter and requestSubmit all prevent native form navigation')
}
function assertFinalInert(tree) {
  const pending = findElement(tree, element => element.type === PendingActionButton)
  assert.ok(pending, 'review / confirmation contains a pending action')
  const button = PendingActionButton(pending.props)
  assert.equal(button.type, 'button')
  assert.equal(button.props.type, 'button')
  assert.equal(button.props['aria-disabled'], 'true')
  assert.ok(button.props['aria-describedby'])
  let prevented = false
  button.props.onClick({ preventDefault: () => { prevented = true } })
  assert.equal(prevented, true)
  assert.equal(requests, 0, 'even direct activation cannot issue a request')
}
await check('actual create handler: invalid programmatic submit prevents default and focuses first error', async () => {
  const h = renderHarness(WhitelabelFormDialog, { mode: 'create', onClose() {} })
  submitForm(h, 'wl-create')
  assert.equal(focused, 'wl-create-name')
  assert.equal(byId(h.render(), 'wl-create-name').props['aria-invalid'], true)
  assert.equal(requests, 0)
})
for (const trigger of ['button submit', 'keyboard Enter', 'programmatic requestSubmit']) {
  await check(`actual create handler: ${trigger} stops at review; final activation cannot write`, async () => {
    const h = renderHarness(WhitelabelFormDialog, { mode: 'create', onClose() {} })
    enterValue(h, 'wl-create-name', ' Synthetic   Draft ')
    enterValue(h, 'wl-create-slug', 'synthetic-draft')
    submitForm(h, 'wl-create')
    assert.equal(findElement(h.render(), element => element.props?.['data-step'] === 'review')?.props['data-wl-form'], 'create')
    assertFinalInert(h.render())
  })
}
await check('actual edit handler: server initial values, changed-only review, no record overwrite or write', async () => {
  const before = JSON.stringify(record)
  const h = renderHarness(WhitelabelFormDialog, { mode: 'edit', record, onClose() {} })
  assert.equal(byId(h.render(), 'wl-edit-name').props.value, record.name)
  assert.equal(byId(h.render(), 'wl-edit-baseUrl').props.value, record.baseUrl)
  submitForm(h, 'wl-edit')
  assert.ok(findElement(h.render(), element => element.props?.['data-form-note']))
  enterValue(h, 'wl-edit-name', 'Renamed synthetic')
  submitForm(h, 'wl-edit')
  assert.ok(findElement(h.render(), element => element.props?.['data-change'] === 'name'))
  assert.equal(findElement(h.render(), element => element.props?.['data-change'] === 'baseUrl'), null)
  assertFinalInert(h.render())
  assert.equal(JSON.stringify(record), before)
})
await check('actual create close: pristine closes; dirty asks before discarding, without persistence', async () => {
  let closed = 0
  const h = renderHarness(WhitelabelFormDialog, { mode: 'create', onClose() { closed += 1 } })
  buttonText(h.render(), 'Cancelar').props.onClick()
  assert.equal(closed, 1)
  enterValue(h, 'wl-create-name', 'Draft')
  h.render().props.onClose()
  assert.equal(closed, 1)
  assert.ok(findElement(h.render(), element => element.props?.['data-discard']))
  assert.equal(requests, 0)
})
await check('actual lifecycle: wrong and correct slug keep final action inert and server record intact', async () => {
  const before = JSON.stringify(record)
  const h = renderHarness(WhitelabelLifecycleDialog, { record, onClose() {} })
  assertFinalInert(h.render())
  const confirm = tree => findElement(tree, element => element.props?.['data-confirm-input'])
  confirm(h.render()).props.onChange({ target: { value: 'wrong-synthetic-slug' } })
  assert.equal(findElement(h.render(), element => element.props?.['data-match'] === true), null)
  assertFinalInert(h.render())
  confirm(h.render()).props.onChange({ target: { value: record.slug } })
  assert.ok(findElement(h.render(), element => element.props?.['data-match'] === true))
  assertFinalInert(h.render())
  assert.equal(JSON.stringify(record), before)
})
await check('provisional rules and final pending label are explicit in production UI', async () => {
  assert.match(crudSources['WhitelabelFormDialog.tsx'], /Regras provisórias de revisão/)
  assert.match(crudSources['WhitelabelFormDialog.tsx'], /Limite provisório/)
  assert.match(crudSources['MutationStates.tsx'], /\{label\} \(pendente\)/)
  assert.match(form.readOnlyFacts(record).find(fact => fact.label === 'Status').note, /pendente/)
})
delete globalThis.__wlCrudHooks
assert.equal(requests, 0, 'no request was attempted by these checks')
console.log(`Whitelabel CRUD frontend contracts: ${checks} passed (synthetic, no network, zero mutation requests)`)
