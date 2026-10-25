import assert from 'node:assert/strict'
import { reviewedAdminLifecycle } from './reviewed-admin-lifecycle-boundary.mjs'
import { reviewedOpportunityWrite } from './reviewed-opportunity-write-boundary.mjs'
import { readdir } from 'node:fs/promises'
import { readFile } from './reviewed-consolidation-boundary.mjs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'
import { IS_LENGTH_REFERENCE, IS_URL_REFERENCE, RECORD_A, RECORD_B, STRICTER_THAN_IS_URL } from './fixtures/whitelabel-mutation-mocks.mjs'

// Whitelabel CRUD Safe Preparation V1 — in-memory contract checks (synthetic, no network).
// Default-OFF form/command contracts. Raw HTTP/session access remains outside
// the UI. The guarded real transport has independent intercepted tests in
// check-whitelabel-operational.mjs; injected runner scenarios remain in the mock suite.
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
// dependency. Only hooks/presentational imports are stubbed; form, command,
// contract and PendingActionButton implementations are the production source.
// Browser/native dialog/keyboard behavior is separately verified in a browser.
const componentModules = new Map()
const dataModule = (code) => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
const hookModule = dataModule(`
  export const useState = value => globalThis.__wlCrudHooks.useState(value);
  export const useRef = () => ({ current: null });
  export const useEffect = () => {};
  export const useId = () => 'synthetic-menu';
  export const useMemo = action => action();
  export const useCallback = action => action;
`)
const REAL_TS = new Set(['./whitelabelForm', './whitelabelMutationContract', './whitelabelCommands', './whitelabelMutationOutcome', '../whitelabelApi'])
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
    else if (REAL_TS.has(specifier)) url = await moduleUrl(resolve(dirname(path), `${specifier}.ts`))
    else if (specifier === './useWhitelabelMutation') url = dataModule(`export const useWhitelabelMutation = () => ({state:{phase:'idle'},hasAttempt:false,command:null,isBusy:()=>false,reset:()=>true});`)
    else if (specifier === './MutationStates') url = await componentUrl(resolve(dirname(path), `${specifier}.tsx`))
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

// Execute the real page selection/role handlers as well as the dialogs. Only
// its read hooks, shell and presentational children are replaced in memory.
async function loadPageContent() {
  const path = resolve(root, 'src/features/whitelabels/WhitelabelsPage.tsx')
  let code = ts.transpileModule(`${await readFile(path, 'utf8')}\nexport { WhitelabelsContent };`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  for (const match of [...code.matchAll(/import\s+([^;]+?)\s+from\s+(['"])([^'"]+)\2/g)]) {
    const [, clause, , specifier] = match
    let url
    if (specifier === 'react') url = hookModule
    else if (specifier === 'react/jsx-runtime') url = pathToFileURL(require.resolve(specifier)).href
    else if (specifier.endsWith('.css')) url = dataModule('export default new Proxy({}, {get: (_, key) => key});')
    else if (specifier.endsWith('/authSession')) url = dataModule('export const useSessionOperator = () => globalThis.__wlCrudPage.operator; export const getSessionVersion = () => 0;')
    else if (specifier === './useWhitelabelData') url = dataModule(`
      export const useWhitelabelList = () => ({state:{status:'success',data:globalThis.__wlCrudPage.list}});
      export const useWhitelabelDetail = id => ({state:{status:'success',data:globalThis.__wlCrudPage.records.find(record=>record.id===id)}});
    `)
    else if (['./crud/whitelabelMutationContract', './whitelabelRoute', './whitelabelApi'].includes(specifier)) url = await moduleUrl(resolve(dirname(path), `${specifier}.ts`))
    else if (specifier.endsWith('/prototypeNotice')) url = dataModule('export const usePrototypeNotice = () => () => {};')
    else if (specifier.endsWith('/notice')) url = dataModule('export const useNotice = () => message => { (globalThis.__wlCrudPage.notices ??= []).push(message); };')
    else {
      const names = clause.replace(/[{}]/g, '').split(',').map(value => value.trim()).filter(Boolean)
      url = dataModule(names.map(name => `export const ${name} = function ${name}() { return null; };`).join('\n'))
    }
    code = code.replace(match[0], `import ${clause} from ${JSON.stringify(url)}`)
  }
  return (await import(dataModule(code))).WhitelabelsContent
}
function renderHarness(Component, props) {
  const state = []
  let cursor = 0
  const hooks = { useState(initial) {
    const index = cursor++
    if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial
    return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value }]
  } }
  return { props, render() { cursor = 0; globalThis.__wlCrudHooks = hooks; return Component(this.props) } }
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
function findAll(node, predicate, found = []) {
  if (!node || typeof node !== 'object') return found
  if (predicate(node)) found.push(node)
  for (const child of Array.isArray(node) ? node : Object.values(node.props ?? {})) findAll(child, predicate, found)
  return found
}
function textOf(node) {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  return textOf(node.props?.children)
}
const byId = (tree, id) => findElement(tree, element => element.props?.id === id)
const buttonText = (tree, text) => findElement(tree, element => element.props?.children === text && element.props?.onClick)
let requests = 0
globalThis.fetch = async () => { requests += 1; throw new Error('Unexpected request') }

const form = await load('src/features/whitelabels/crud/whitelabelForm.ts')
const contract = await load('src/features/whitelabels/crud/whitelabelMutationContract.ts')
const commands = await load('src/features/whitelabels/crud/whitelabelCommands.ts')
const outcome = await load('src/features/whitelabels/crud/whitelabelMutationOutcome.ts')
const { ApiError } = await load('src/lib/api.ts')
const record = RECORD_A
let checks = 0
async function check(name, action) {
  try { await action(); checks += 1 } catch (cause) {
    if (cause instanceof Error && cause.stack) cause.stack = cause.stack.replace(/data:text\/javascript;base64,[A-Za-z0-9+/=]+/g, '<in-memory-module>')
    throw new Error(`Failed: ${name}`, { cause })
  }
}
const valid = { name: 'Ok Name', slug: 'ok-name', baseUrl: 'https://ok.example.test' }

/* ---------- create form: CreateWhitelabelDto (name, slug, baseUrl — all required) ---------- */
await check('create: name, slug AND URL base are all required (DTO: no @IsOptional on create)', async () => {
  assert.deepEqual(Object.keys(form.validateCreate(form.EMPTY_CREATE_DRAFT)).sort(), ['baseUrl', 'name', 'slug'])
  assert.deepEqual(form.validateCreate(valid), {})
  assert.ok(form.validateCreate({ ...valid, baseUrl: '' }).baseUrl, 'URL base can no longer be left empty')
  assert.ok(form.validateCreate({ ...valid, baseUrl: '   ' }).baseUrl)
  assert.deepEqual(form.CREATE_FIELDS, ['name', 'slug', 'baseUrl'])
})
await check('create: name length 2–120 after whitespace normalization', async () => {
  assert.ok(form.validateCreate({ ...valid, name: ' A ' }).name)
  assert.ok(form.validateCreate({ ...valid, name: 'x'.repeat(121) }).name)
  assert.equal(form.validateCreate({ ...valid, name: 'x'.repeat(120) }).name, undefined)
  assert.equal(form.tidyName('  Nova   Plataforma \n'), 'Nova Plataforma')
  assert.deepEqual(form.normalizeCreateDraft({ name: '  A   B ', slug: ' ab ', baseUrl: ' https://x.example.test ' }), { name: 'A B', slug: 'ab', baseUrl: 'https://x.example.test' })
})
await check('create: name length is counted like class-validator MinLength / MaxLength (validator.js isLength reference)', async () => {
  for (const [value, min2, max120] of IS_LENGTH_REFERENCE) {
    const length = form.dtoLength(value)
    assert.equal(length >= 2, min2, `min ${JSON.stringify(value)}`)
    assert.equal(length <= 120, max120, `max ${JSON.stringify(value).slice(0, 30)}`)
  }
})
await check('create: slug mirrors the DTO (lowercase, digits, hyphen, ≤ 80; never rewritten)', async () => {
  for (const bad of ['Upper', 'com espaço', 'acentuação', 'under_score', 'dot.slug', '-', '-abc', 'abc-', 'a--b', 'x'.repeat(81)]) {
    assert.ok(form.validateCreate({ ...valid, slug: bad }).slug, bad)
  }
  for (const good of ['abc', 'a-1', '123', 'x'.repeat(80)]) assert.equal(form.validateCreate({ ...valid, slug: good }).slug, undefined, good)
  assert.equal(form.normalizeCreateDraft({ ...valid, slug: ' Mixed-Case ' }).slug, 'Mixed-Case', 'no silent lower-casing: the operator fixes it')
})
await check('create: URL base must be an absolute http(s) URL (frontend subset of IsUrl({ require_tld: false }))', async () => {
  for (const bad of ['finapop.com.br', 'ftp://x.example.test', 'https://', 'https://exa mple.test', 'javascript:alert(1)', 'https://user:pw@x.example.test', 'https://x_y.example.test', 'https://x.example.test.']) {
    assert.ok(form.validateCreate({ ...valid, baseUrl: bad }).baseUrl, bad)
  }
  for (const good of ['https://x.example.test', 'http://localhost:3000', 'https://a.example.test/path', 'http://127.0.0.1:8080', 'http://intranet']) {
    assert.equal(form.validateCreate({ ...valid, baseUrl: good }).baseUrl, undefined, good)
  }
})
await check('create: every URL the frontend accepts is accepted by validator.js 13.15.35 isURL (recorded reference)', async () => {
  let accepted = 0
  for (const [value, isUrl] of IS_URL_REFERENCE) {
    if (form.baseUrlIssue(value) === null) {
      accepted += 1
      assert.equal(isUrl, true, `frontend accepts what IsUrl refuses: ${value.slice(0, 60)}`)
    }
  }
  assert.ok(accepted >= 25, 'the reference exercises accepted values too')
  for (const value of STRICTER_THAN_IS_URL) {
    assert.equal(IS_URL_REFERENCE.find(([item]) => item === value)?.[1], true, value)
    assert.notEqual(form.baseUrlIssue(value), null, `documented stricter case: ${value}`)
  }
})
await check('create: URL issues are specific and browser URL parsing is not the validator', async () => {
  assert.equal(form.baseUrlIssue(''), 'required')
  assert.equal(form.baseUrlIssue('plataforma.com.br'), 'scheme')
  assert.equal(form.baseUrlIssue('https://a b.test'), 'characters')
  assert.equal(form.baseUrlIssue('https://u:p@x.test'), 'credentials')
  assert.equal(form.baseUrlIssue('https://x.test:0'), 'port')
  assert.equal(form.baseUrlIssue('https://x.test:'), 'port')
  assert.equal(form.baseUrlIssue('https://[::1]:3000'), 'host')
  assert.equal(form.baseUrlIssue('http://999.1.1.1'), 'host', 'new URL() accepts it; IsUrl does not')
  assert.equal(form.baseUrlIssue(`https://x.test/${'p'.repeat(2080)}`), 'length')
  const source = await readFile(resolve(root, 'src/features/whitelabels/crud/WhitelabelCreateDialog.tsx'), 'utf8')
  assert.equal(/type="url"/.test(source), false, 'no native url input validation')
  assert.match(source, /noValidate/)
})
await check('create: dirty only with typed (non-blank) content', async () => {
  assert.equal(form.isCreateDirty({ name: '   ', slug: '', baseUrl: ' ' }), false)
  assert.equal(form.isCreateDirty({ name: '', slug: '', baseUrl: 'h' }), true)
})

/* ---------- pure create command ---------- */
await check('create command: exactly { name, slug, baseUrl } — normalized, frozen, deterministic', async () => {
  const draft = { name: ' Nova   Plataforma ', slug: ' nova-plataforma ', baseUrl: ' https://nova.example.test ' }
  const snapshot = JSON.stringify(draft)
  const first = commands.buildCreateCommand(draft)
  const second = commands.buildCreateCommand(draft)
  assert.equal(first.ok, true)
  assert.deepEqual(first, second, 'same input, same command')
  assert.deepEqual(Object.keys(first.command.body), ['name', 'slug', 'baseUrl'])
  assert.deepEqual(first.command.body, { name: 'Nova Plataforma', slug: 'nova-plataforma', baseUrl: 'https://nova.example.test' })
  assert.equal(first.command.operation, 'create'); assert.equal(first.command.targetId, null); assert.equal(first.command.route, 'POST /api/whitelabels')
  assert.ok(Object.isFrozen(first.command) && Object.isFrozen(first.command.body))
  assert.equal(JSON.stringify(draft), snapshot, 'the draft (form state) is never changed')
})
await check('create command: never id, status, active, timestamps, relations, unknown keys or null', async () => {
  const hostile = { ...valid, id: '99', status: 'inactive', active: false, isActive: false, createdAt: 'x', updatedAt: 'x', admins: 3, domain: 'x', counts: {}, extra: 'x' }
  const built = commands.buildCreateCommand(hostile)
  assert.equal(built.ok, true)
  assert.deepEqual(Object.keys(built.command.body), ['name', 'slug', 'baseUrl'])
  assert.equal(Object.values(built.command.body).some((value) => value === null || value === undefined), false)
  assert.equal(JSON.stringify(built.command.body).includes('99'), false)
})
await check('create command: invalid or non-string drafts produce errors, never a command', async () => {
  assert.equal(commands.buildCreateCommand(form.EMPTY_CREATE_DRAFT).ok, false)
  assert.equal(commands.buildCreateCommand({ ...valid, baseUrl: 'plataforma.com.br' }).ok, false)
  assert.equal(commands.buildCreateCommand({ name: null, slug: 7, baseUrl: undefined }).ok, false)
  assert.ok(commands.buildCreateCommand({ ...valid, name: 'A' }).errors.name)
})

/* ---------- name-only edit ---------- */
await check('edit: starts from the authoritative record; the draft holds the name ONLY (no hidden slug / URL path)', async () => {
  const draft = form.nameDraftFromRecord(record)
  assert.deepEqual(draft, { name: record.name })
  assert.equal(form.nameChange(record, draft), null)
  assert.equal(form.nameChange(record, { name: `  ${record.name.replace(' ', '   ')} ` }), null, 'whitespace-only is not a change')
  assert.deepEqual(form.nameChange(record, { name: '  Renamed   Platform ' }), { before: record.name, after: 'Renamed Platform' })
})
await check('edit command: PATCH body is exactly { name }; slug / baseUrl / id injected in the draft are ignored', async () => {
  const draft = { name: 'Renamed Alpha', slug: 'hacked', baseUrl: 'https://evil.example.test', id: RECORD_B.id, status: 'inactive' }
  const before = JSON.stringify(record)
  const built = commands.buildNameUpdateCommand({ selectedId: record.id, record, draft })
  assert.equal(built.ok, true)
  assert.deepEqual(built.command.body, { name: 'Renamed Alpha' })
  assert.deepEqual(Object.keys(built.command.body), ['name'])
  assert.equal(built.command.targetId, record.id)
  assert.equal(built.command.route, `PATCH /api/whitelabels/${record.id}`)
  assert.deepEqual(built.command.baseline, { name: record.name, updatedAt: record.updatedAt, slug: record.slug, baseUrl: record.baseUrl })
  assert.ok(Object.isFrozen(built.command.body))
  assert.equal(JSON.stringify(record), before)
})
await check('edit command: the selected ID is authoritative — A\'s draft can never target B', async () => {
  const draftForA = { name: 'Renamed Alpha' }
  assert.deepEqual(commands.buildNameUpdateCommand({ selectedId: RECORD_B.id, record: RECORD_A, draft: draftForA }), { ok: false, reason: 'target-mismatch' })
  assert.deepEqual(commands.buildNameUpdateCommand({ selectedId: null, record: RECORD_A, draft: draftForA }), { ok: false, reason: 'target-mismatch' })
  const forB = commands.buildNameUpdateCommand({ selectedId: RECORD_B.id, record: RECORD_B, draft: form.nameDraftFromRecord(RECORD_B) })
  assert.deepEqual(forB, { ok: false, reason: 'unchanged' }, 'B starts from B\'s own values, not A\'s draft')
  const renamedB = commands.buildNameUpdateCommand({ selectedId: RECORD_B.id, record: RECORD_B, draft: { name: 'Renamed Beta' } })
  assert.equal(renamedB.command.targetId, RECORD_B.id)
  assert.equal(renamedB.command.route.endsWith(`/${RECORD_B.id}`), true)
})
await check('edit command: unchanged, invalid name and non-server ids are refused', async () => {
  assert.equal(commands.buildNameUpdateCommand({ selectedId: record.id, record, draft: { name: record.name } }).reason, 'unchanged')
  assert.equal(commands.buildNameUpdateCommand({ selectedId: record.id, record, draft: { name: 'A' } }).reason, 'invalid-name')
  assert.equal(commands.buildNameUpdateCommand({ selectedId: record.id, record, draft: { name: '   ' } }).reason, 'invalid-name')
  const proto = { ...record, id: 'wl_proto_01' }
  assert.equal(commands.buildNameUpdateCommand({ selectedId: proto.id, record: proto, draft: { name: 'New' } }).reason, 'invalid-target')
})
await check('edit: stale detection when the authoritative record changed after the edit opened', async () => {
  assert.equal(form.isRecordStale(record, record), false)
  assert.equal(form.isRecordStale(record, null), false)
  assert.equal(form.isRecordStale(record, { ...record, updatedAt: '2026-10-02T00:00:00.000Z' }), true)
  assert.equal(form.isRecordStale(record, { ...record, name: 'Changed elsewhere' }), true)
  assert.equal(form.isRecordStale(record, RECORD_B), false, 'another ID is handled by the selection guard')
})
await check('edit: slug and URL base are read-only facts with the tenant-resolution explanation', async () => {
  const facts = form.readOnlyFacts(record)
  assert.deepEqual(facts.map((fact) => fact.label), ['ID', 'Identificador (slug)', 'URL base', 'Status', 'Domínio', 'Criado em', 'Última atualização'])
  assert.equal(facts[0].value, '4')
  for (const key of ['slug', 'baseUrl']) {
    const fact = facts.find((item) => item.key === key)
    assert.equal(fact.identity, true)
    assert.match(fact.note, /Somente leitura: alterar .* afeta a resolução do tenant/)
    assert.match(fact.note, /autorização separada/)
  }
  assert.match(facts.find((item) => item.key === 'status').note, /gerenciado separadamente; não enviado/)
})

/* ---------- availability, roles, blockers ---------- */
await check('every Whitelabel write is unavailable — for every role, SUPER_ADMIN included', async () => {
  for (const action of ['create', 'update-name', 'lifecycle']) assert.equal(contract.WHITELABEL_MUTATIONS[action].available, false, action)
  assert.equal(contract.WHITELABEL_MUTATIONS.create.pendingLabel, 'Criação aguardando liberação da integração.')
  assert.equal(contract.WHITELABEL_MUTATIONS['update-name'].pendingLabel, 'Edição aguardando liberação da integração.')
  assert.match(contract.WHITELABEL_MUTATIONS.lifecycle.reason, /inativo/)
  assert.ok(Object.isFrozen(contract.WHITELABEL_MUTATIONS))
})
await check('role-aware presentation: only SUPER_ADMIN gets the review flows; unknown sessions get none', async () => {
  assert.equal(contract.whitelabelWriteAccess(['SUPER_ADMIN']), 'super-admin')
  assert.equal(contract.whitelabelWriteAccess(['READ_ONLY', 'SUPER_ADMIN']), 'super-admin')
  for (const role of ['SUPPORT_ADMIN', 'READ_ONLY', 'FINANCIAL_ADMIN', 'COMPLIANCE_ADMIN', 'super_admin', 'SUPERADMIN']) {
    assert.equal(contract.whitelabelWriteAccess([role]), 'read-only', role)
  }
  assert.equal(contract.whitelabelWriteAccess([]), 'read-only')
  assert.equal(contract.whitelabelWriteAccess(null), 'unknown')
  assert.equal(contract.whitelabelWriteAccess(undefined), 'unknown')
  assert.match(contract.WRITE_ACCESS_NOTE['read-only'], /somente ao perfil Super Admin/)
})
await check('the contract-gate blockers A–H are carried forward, none marked resolved', async () => {
  assert.deepEqual(contract.WHITELABEL_OPEN_BLOCKERS.map((blocker) => blocker.id), ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'])
  assert.equal(contract.WHITELABEL_OPEN_BLOCKERS.some((blocker) => 'resolved' in blocker), false)
})

/* ---------- outcome interpretation (presentation of a future response) ---------- */
const createCommand = commands.buildCreateCommand(valid).command
const nameCommand = commands.buildNameUpdateCommand({ selectedId: record.id, record, draft: { name: 'Renamed Alpha' } }).command
const raw = 'synthetic-private-backend-message'
const http = (status, code, message = raw) => new ApiError(status, { message, code, correlationId: 'cid-synthetic-1' })
for (const [error, command, state, detail] of [
  [http(400, 'HTTP_ERROR', ['baseUrl must be a URL address', 'property id should not exist']), createCommand, 'rejected', 'validation'],
  [http(400, 'INVALID_WHITELABEL_ID'), nameCommand, 'rejected', 'refused'],
  [http(401, 'UNAUTHORIZED'), createCommand, 'rejected', 'session'],
  [http(403, 'FORBIDDEN'), nameCommand, 'rejected', 'forbidden'],
  [http(404), nameCommand, 'rejected', 'not-found'],
  [http(404), createCommand, 'rejected', 'refused'],
  [http(409), createCommand, 'rejected', 'refused'],
  [http(422, 'CORE_HTTP_ERROR'), createCommand, 'rejected', 'unprocessable'],
  [http(422, 'E_SLUG_TAKEN'), createCommand, 'rejected', 'slug-taken'],
  [http(422, 'E_SLUG_TAKEN'), nameCommand, 'rejected', 'unprocessable'],
  [http(429), nameCommand, 'rejected', 'rate-limited'],
  [http(500, 'INTERNAL_ERROR'), createCommand, 'uncertain', 'server-error'],
  [http(503, 'CORE_UNAVAILABLE'), nameCommand, 'uncertain', 'unavailable'],
  [new ApiError(0, {}, { kind: 'timeout' }), createCommand, 'uncertain', 'timeout'],
  [new ApiError(0, {}, { kind: 'network' }), nameCommand, 'uncertain', 'network'],
  [new ApiError(200, {}, { kind: 'malformed' }), createCommand, 'uncertain', 'malformed'],
  [new Error(raw), nameCommand, 'uncertain', 'unknown'],
]) {
  await check(`outcome ${error.status ?? '—'} ${error.code ?? error.kind ?? 'Error'} on ${command.operation} → ${state}/${detail}`, async () => {
    const result = outcome.interpretMutationResult(command, { ok: false, error })
    assert.equal(result.state, state)
    assert.equal(result.state === 'rejected' ? result.reason : result.cause, detail)
    const view = outcome.describeMutationOutcome(result)
    assert.equal(`${view.title} ${view.description} ${view.next}`.includes(raw), false, 'raw Backend text never shown')
    if (error instanceof ApiError && error.kind === 'http') assert.equal(view.correlationId, 'cid-synthetic-1')
    if (state === 'uncertain') assert.equal(view.allowsResubmit, false, 'uncertain never invites a resubmit')
  })
}
await check('outcome: 400 field names are taken from Nest messages, limited to the operation\'s fields', async () => {
  const create400 = outcome.interpretMutationResult(createCommand, { ok: false, error: http(400, 'HTTP_ERROR', ['name must be longer than or equal to 2 characters', 'slug must match /^[a-z0-9-]+$/ regular expression', 'baseUrl must be a URL address']) })
  assert.deepEqual(create400.fields, ['name', 'slug', 'baseUrl'])
  const edit400 = outcome.interpretMutationResult(nameCommand, { ok: false, error: http(400, 'HTTP_ERROR', ['slug must match /^[a-z0-9-]+$/ regular expression']) })
  assert.deepEqual(edit400.fields, [])
})
await check('outcome: 2xx is confirmed only with a readable record of the same identity', async () => {
  const created = { ...RECORD_B, slug: valid.slug, name: valid.name, baseUrl: valid.baseUrl }
  const wireCreated = { id: 7, idKey: '7', slug: created.slug, name: created.name, baseUrl: created.baseUrl, domain: 'ok.example.test', isActive: true, status: 'active', admins: 0, applications: null, integrations: null, createdAt: created.createdAt, updatedAt: created.updatedAt }
  assert.equal(outcome.interpretMutationResult(createCommand, { ok: true, body: { data: wireCreated } }).state, 'confirmed')
  assert.equal(outcome.interpretMutationResult(createCommand, { ok: true, body: { data: { ...wireCreated, slug: 'other-slug' } } }).cause, 'unverified-response')
  assert.equal(outcome.interpretMutationResult(createCommand, { ok: true, body: { data: { ...wireCreated, baseUrl: `${valid.baseUrl}/` } } }).cause, 'unverified-response', 'a normalized URL is not a confirmation — the read-back would say diverged too')
  assert.equal(outcome.interpretMutationResult(createCommand, { ok: true, body: { data: { ...wireCreated, name: 'Other Name' } } }).cause, 'unverified-response')
  assert.equal(outcome.interpretMutationResult(createCommand, { ok: true, body: { data: { id: 7, slug: valid.slug, base_url: valid.baseUrl } } }).cause, 'unverified-response', 'raw Core row')
  assert.equal(outcome.interpretMutationResult(createCommand, { ok: true, body: wireCreated }).cause, 'unverified-response', 'unwrapped body')
  assert.equal(outcome.interpretMutationResult(createCommand, { ok: true, body: null }).state, 'uncertain')
  const wireA = { id: 4, idKey: '4', slug: record.slug, name: 'Renamed Alpha', baseUrl: record.baseUrl, domain: record.domain, isActive: true, status: 'active', admins: 2, applications: null, integrations: null, createdAt: record.createdAt, updatedAt: '2026-10-16T00:00:00.000Z' }
  assert.equal(outcome.interpretMutationResult(nameCommand, { ok: true, body: { data: wireA } }).state, 'confirmed')
  assert.equal(outcome.interpretMutationResult(nameCommand, { ok: true, body: { data: { ...wireA, name: record.name } } }).state, 'uncertain', 'old name echoed')
  assert.equal(outcome.interpretMutationResult(nameCommand, { ok: true, body: { data: { ...wireA, id: 7, idKey: '7' } } }).state, 'uncertain', 'another id')
})
await check('outcome: uncertain is distinct from confirmed success, validation failure and 403', async () => {
  const states = new Set([
    outcome.interpretMutationResult(createCommand, { ok: false, error: http(500, 'INTERNAL_ERROR') }).state,
    outcome.interpretMutationResult(createCommand, { ok: false, error: http(400, 'HTTP_ERROR') }).state,
    outcome.interpretMutationResult(createCommand, { ok: false, error: http(403, 'FORBIDDEN') }).state,
  ])
  assert.deepEqual([...states].sort(), ['rejected', 'uncertain'])
  const uncertain = outcome.describeMutationOutcome(outcome.interpretMutationResult(createCommand, { ok: false, error: http(500, 'INTERNAL_ERROR') }))
  assert.match(uncertain.description, /pode ou não ter sido criado/)
  assert.match(uncertain.next, /Não envie de novo/)
  const forbidden = outcome.describeMutationOutcome(outcome.interpretMutationResult(createCommand, { ok: false, error: http(403, 'FORBIDDEN') }))
  assert.notEqual(forbidden.title, uncertain.title)
})
await check('outcome: E_SLUG_TAKEN is used when present but never required (generic 422 copy names the possibility)', async () => {
  const generic = outcome.describeMutationOutcome(outcome.interpretMutationResult(createCommand, { ok: false, error: http(422, 'CORE_HTTP_ERROR') }))
  assert.match(generic.description, /causa possível .*\(slug\) já estar em uso/)
  const specific = outcome.describeMutationOutcome(outcome.interpretMutationResult(createCommand, { ok: false, error: http(422, 'E_SLUG_TAKEN') }))
  assert.deepEqual(specific.fields, ['slug'])
})
await check('read-back reconciliation: applied / not-applied / diverged, exact slug and baseline name only', async () => {
  const mine = { ...RECORD_B, slug: valid.slug, name: valid.name, baseUrl: valid.baseUrl }
  assert.equal(outcome.reconcileCreateReadback(createCommand, { rows: [mine], complete: true }).result, 'found', 'GET cannot attribute a record to our POST')
  assert.equal(outcome.reconcileCreateReadback(createCommand, { rows: [{ ...mine, slug: `${valid.slug}-2` }], complete: true }).result, 'not-applied', 'search is fuzzy; only an exact slug counts')
  assert.equal(outcome.reconcileCreateReadback(createCommand, { rows: [], complete: false }).result, 'inconclusive', 'an incomplete page never proves absence')
  assert.equal(outcome.reconcileCreateReadback(createCommand, { rows: [mine, mine], complete: true }).result, 'diverged', 'ambiguous matches never confirm success')
  assert.equal(outcome.reconcileCreateReadback(createCommand, { rows: [{ ...mine, name: 'Someone Else' }], complete: true }).result, 'diverged')
  assert.equal(outcome.reconcileNameReadback(nameCommand, { ...record, name: 'Renamed Alpha' }), 'applied')
  assert.equal(outcome.reconcileNameReadback(nameCommand, record), 'not-applied')
  assert.equal(outcome.reconcileNameReadback(nameCommand, { ...record, name: 'Third Name' }), 'diverged')
  assert.equal(outcome.describeReadback('create', 'diverged').allowsResubmit, false)
  assert.equal(outcome.describeReadback('update-name', 'not-applied').allowsResubmit, true)
})

/* ---------- source boundaries: no request code, no production transport ---------- */
const wlDir = resolve(root, 'src/features/whitelabels')
const crudFiles = (await readdir(resolve(wlDir, 'crud'))).filter((name) => /\.tsx?$/.test(name)).sort()
await check('crud module: explicit reviewed files, including independently guarded lifecycle dialog', async () => {
  assert.deepEqual(crudFiles, ['MutationStates.tsx', 'OperationalMutationState.tsx', 'WhitelabelActionsMenu.tsx', 'WhitelabelCreateDialog.tsx', 'WhitelabelLifecycleDialog.tsx', 'WhitelabelNameEditDialog.tsx',
    'useWhitelabelMutation.ts', 'whitelabelCommands.ts', 'whitelabelForm.ts', 'whitelabelMutationContract.ts', 'whitelabelMutationOutcome.ts', 'whitelabelMutationRunner.ts', 'whitelabelOperationalApi.ts'])
})
const crudSources = Object.fromEntries(await Promise.all(crudFiles.map(async (name) => [name, await readFile(resolve(wlDir, 'crud', name), 'utf8')])))
const stripComments = (source) => source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')
await check('crud sources: no request code, storage, logging or prototype data', async () => {
  for (const [name, source] of Object.entries(crudSources)) {
    const code = stripComments(source)
    assert.equal(/fetch\(|apiRequest|authenticatedGet|XMLHttpRequest|sendBeacon|method\s*:|axios|\.post\(|\.patch\(/.test(code), false, name)
    assert.equal(/sessionStorage|localStorage|indexedDB/.test(code), false, name)
    assert.equal(/console\.(log|info|debug|warn|error)/.test(code), false, name)
    assert.equal(/prototypeWhitelabels|PROTOTYPE_|usePrototypeNotice/.test(code), false, name)
    assert.equal(/getAccessToken|Authorization|Bearer/.test(code), false, `${name}: no token access`)
  }
})
await check('only the narrow operational adapter/hook import the runner; nothing in src imports test fixtures', async () => {
  const walk = async (dir) => (await Promise.all((await readdir(dir, { withFileTypes: true })).map((entry) =>
    entry.isDirectory() ? walk(resolve(dir, entry.name)) : /\.tsx?$/.test(entry.name) ? [resolve(dir, entry.name)] : []))).flat()
  for (const file of await walk(resolve(root, 'src'))) {
    const source = await readFile(file, 'utf8')
    if(file.replaceAll('\\','/').endsWith('src/features/whitelabel-accounts/admin/adminLifecycleClient.ts')){
      assert.equal(reviewedAdminLifecycle('src/features/whitelabel-accounts/admin/adminLifecycleClient.ts'),true)
      continue
    }
    if (!['whitelabelMutationRunner.ts', 'whitelabelOperationalApi.ts', 'useWhitelabelMutation.ts'].some(name => file.endsWith(name))) assert.equal(/whitelabelMutationRunner/.test(source), false, file)
    assert.equal(/(from|import)\s*\(?\s*['"][^'"]*(scripts\/|fixtures\/|whitelabel-mutation-mocks)/.test(source), false, file)
    assert.equal(/createMockTransport|MockTransport|createMockReadback/.test(stripComments(source)), false, file)
  }
  const runner = stripComments(crudSources['whitelabelMutationRunner.ts'])
  assert.match(runner, /ports\.transport\(command\)/, 'the runner only calls an injected port')
  assert.equal(/setTimeout|setInterval|retry\(/.test(runner), false, 'no timers, no automatic retry')
})
await check('final commit buttons are aria-disabled pending buttons, never submit', async () => {
  assert.match(crudSources['MutationStates.tsx'], /aria-disabled="true"/)
  assert.match(crudSources['MutationStates.tsx'], /onClick=\{\(event\) => event\.preventDefault\(\)\}/)
  assert.match(crudSources['WhitelabelCreateDialog.tsx'], /<PendingActionButton label="Criar Whitelabel"/)
  assert.match(crudSources['WhitelabelNameEditDialog.tsx'], /<PendingActionButton label="Salvar nome"/)
  // Dialogs expose no "saved / created / removed" callback the page could use to alter authoritative data.
  for (const name of ['WhitelabelCreateDialog.tsx', 'WhitelabelNameEditDialog.tsx']) {
    assert.equal(/onSave|onCreated|onSaved|onRemoved|onDeleted|onConfirm\b|onSubmitted|transport/.test(stripComments(crudSources[name])), false, name)
    assert.match(crudSources[name], /useWhitelabelMutation/)
  }
})
await check('lifecycle: separate default-off flag and guarded menu/page handlers', async () => {
  const menu = crudSources['WhitelabelActionsMenu.tsx']
  assert.match(menu, /access === 'super-admin' && WHITELABEL_MUTATIONS.lifecycle.available && !!onLifecycle/)
  assert.match(menu, /if \(lifecycleAllowed\)/)
  assert.match(crudSources['whitelabelMutationContract.ts'], /VITE_WHITELABEL_LIFECYCLE_ENABLED === 'true'/)
  const page = await readFile(resolve(wlDir, 'WhitelabelsPage.tsx'), 'utf8')
  assert.match(page, /if \(!WHITELABEL_LIFECYCLE_ENABLED \|\| writeAccess !== 'super-admin'\) return/)
  assert.match(page, /<WhitelabelLifecycleDialog/)
})
await check('Whitelabel reads remain GET-only; writes confined to exact reviewed transports', async () => {
  const api = await readFile(resolve(wlDir, 'whitelabelApi.ts'), 'utf8')
  assert.equal(/'POST'|'PATCH'|'PUT'|'DELETE'|apiRequest\(/.test(api), false)
  const walk = async (dir) => (await Promise.all((await readdir(dir, { withFileTypes: true })).map((entry) =>
    entry.isDirectory() ? walk(resolve(dir, entry.name)) : /\.tsx?$/.test(entry.name) ? [resolve(dir, entry.name)] : []))).flat()
  for (const file of await walk(resolve(root, 'src'))) {
    const source = await readFile(file, 'utf8')
    if(file.replaceAll('\\','/').endsWith('src/features/operation/opportunities/write/opportunityWriteClient.ts')){
      assert.equal(reviewedOpportunityWrite('src/features/operation/opportunities/write/opportunityWriteClient.ts'),true)
      continue
    }
    if(file.replaceAll('\\','/').endsWith('src/features/whitelabel-accounts/access/accountAccessClient.ts')){
      const { reviewedAccountAccess }=await import('./reviewed-account-access-boundary.mjs')
      assert.equal(reviewedAccountAccess('src/features/whitelabel-accounts/access/accountAccessClient.ts'),true)
      continue
    }
    if (file.replaceAll('\\', '/').endsWith('src/lib/menuVisibilityWriteClient.ts')) {
      assert.match(source, /method: 'PUT'/)
      assert.match(source, /VITE_MENU_VISIBILITY_WRITES_ENABLED === 'true'/)
      assert.equal(/method:\s*['"](POST|PATCH|DELETE)['"]/.test(source), false)
      continue
    }
    if (file.replaceAll('\\', '/').endsWith('src/lib/whitelabelWriteClient.ts')) {
      assert.match(source, /method: safe\.operation === 'create' \? 'POST' : safe\.operation === 'logical-delete' \? 'DELETE' : 'PATCH'/)
      assert.match(source, /isLifecycleCommand\(command\) \? !WHITELABEL_LIFECYCLE_ENABLED : !WHITELABEL_WRITES_ENABLED/)
      assert.equal(/method:\s*['"](PUT|DELETE)['"]/.test(source), false)
      continue
    }
    assert.equal(/method:\s*['"](PATCH|PUT|DELETE)['"]/.test(source), false, file)
    if (/method:\s*['"]POST['"]/.test(source)) assert.match(file.replaceAll('\\', '/'), /src\/lib\/authSession\.ts$/, 'only the login uses POST')
  }
  const client = await readFile(resolve(root, 'src/lib/apiClient.ts'), 'utf8')
  assert.equal(/method/.test(stripComments(client)), false, 'the authenticated client exposes no method option')
})
await check('page wiring: dialogs get the selected authoritative record; no list / detail state is written', async () => {
  const page = await readFile(resolve(wlDir, 'WhitelabelsPage.tsx'), 'utf8')
  assert.match(page, /<WhitelabelCreateDialog onClose=/)
  assert.match(page, /dialog\?\.kind === 'edit' && dialog\.record\.id === selectedId \? \(\s*<WhitelabelNameEditDialog\s+key=\{dialog\.record\.id\}/)
  assert.match(page, /latest=\{loadedDetail\?\.id === dialog\.record\.id \? loadedDetail : null\}/)
  assert.match(page, /selectedId=\{selectedId\}/)
  assert.equal(/setListData|setRows|rows\.push|rows\.splice|rows\.unshift|\.data\.rows\s*=/.test(page), false)
  assert.equal(/prototypeWhitelabels|PROTOTYPE_WHITELABELS|fixtures/.test(page), false, 'no mock Whitelabel data on the screen')
})
await check('page identity safety: switching selection discards the open edit; edits open only for the loaded selected ID', async () => {
  const page = await readFile(resolve(wlDir, 'WhitelabelsPage.tsx'), 'utf8')
  assert.match(page, /if \(dialog && dialog.kind !== 'create' && dialog\.record\.id !== selectedId\) \{\s*setDialog\(null\)/)
  assert.match(page, /A revisão foi fechada porque outro Whitelabel foi selecionado/)
  assert.match(page, /if \(writeAccess !== 'super-admin'\) return\s+if \(record\.id !== selectedId \|\| loadedDetail\?\.id !== record\.id\) \{\s+notify\([^)]*\)\s+return/)
  assert.match(page, /setDialog\(\{ kind: 'edit', record: loadedDetail, sessionVersion: getSessionVersion\(\) \}\)/, 'the authoritative detail and session, not a transition copy')
})
await check('page roles: access comes from the existing session operator; restricted entry points explain instead of opening', async () => {
  const page = await readFile(resolve(wlDir, 'WhitelabelsPage.tsx'), 'utf8')
  assert.match(page, /const operator = useSessionOperator\(\)/)
  assert.match(page, /whitelabelWriteAccess\(operator\?\.roles\)/)
  assert.match(page, /if \(writeAccess !== 'super-admin'\) \{\s*notify\(WRITE_ACCESS_NOTE\[writeAccess\]\)\s*return/)
  const list = await readFile(resolve(wlDir, 'WhitelabelListPanel.tsx'), 'utf8')
  assert.match(list, /createAccess === 'super-admin' \?/)
  assert.match(list, /aria-disabled="true"\s+aria-describedby="wl-create-access-note"/)
  const detail = await readFile(resolve(wlDir, 'WhitelabelDetailPanel.tsx'), 'utf8')
  assert.match(detail, /access === 'super-admin' \?/)
  assert.match(detail, /aria-describedby="wl-edit-access-note"/)
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
const { WhitelabelCreateDialog } = await loadComponent('WhitelabelCreateDialog.tsx')
const { WhitelabelNameEditDialog } = await loadComponent('WhitelabelNameEditDialog.tsx')
const { WhitelabelActionsMenu } = await loadComponent('WhitelabelActionsMenu.tsx')
const { PendingActionButton, PendingBackendNotice } = await loadComponent('MutationStates.tsx')
const PageContent = await loadPageContent()
const pageChild = (tree, name) => findElement(tree, element => element.type?.name === name)
const pageScenario = () => {
  globalThis.__wlCrudPage = { operator: { roles: ['SUPER_ADMIN'] }, records: [RECORD_A, RECORD_B], list: { rows: [RECORD_A, RECORD_B], total: 2, lastPage: 1 } }
  return renderHarness(PageContent, { accentColor: '#7c3aed', routeKey: '', params: { whitelabelId: RECORD_A.id } })
}
await check('actual page: role loss closes create/edit drafts and never restores them on role regain', async () => {
  for (const roles of [['SUPPORT_ADMIN'], ['READ_ONLY'], [], null]) {
    for (const kind of ['create', 'edit']) {
      const h = pageScenario()
      const tree = h.render()
      if (kind === 'create') pageChild(tree, 'WhitelabelListPanel').props.onCreate()
      else pageChild(tree, 'WhitelabelDetailPanel').props.onEditName(RECORD_A)
      const dialogName = kind === 'create' ? 'WhitelabelCreateDialog' : 'WhitelabelNameEditDialog'
      assert.ok(pageChild(h.render(), dialogName))
      globalThis.__wlCrudPage.operator = roles === null ? null : { roles }
      h.render() // React rerenders after render-phase state adjustment.
      assert.equal(pageChild(h.render(), dialogName), null, `draft must close for ${JSON.stringify(roles)}`)
      assert.doesNotMatch(textOf(findElement(h.render(), element => element.props?.['data-crud-announcement'])), /Nada foi enviado/, 'closing a dialog must not assert the outcome of a potentially sent request')
      globalThis.__wlCrudPage.operator = { roles: ['SUPER_ADMIN'] }
      assert.equal(pageChild(h.render(), dialogName), null, 'no hidden draft survives role loss')
      assert.equal(requests, 0)
    }
  }
})
await check('actual page: moving A to B clears A draft; B opens from B detail and prepares B ID', async () => {
  const h = pageScenario()
  pageChild(h.render(), 'WhitelabelDetailPanel').props.onEditName(RECORD_A)
  assert.equal(pageChild(h.render(), 'WhitelabelNameEditDialog').props.record.id, RECORD_A.id)
  h.props.params = { whitelabelId: RECORD_B.id }
  h.render()
  assert.equal(pageChild(h.render(), 'WhitelabelNameEditDialog'), null)
  assert.doesNotMatch(textOf(findElement(h.render(), element => element.props?.['data-crud-announcement'])), /Nada foi enviado/, 'navigation cannot undo an already dispatched mutation')
  pageChild(h.render(), 'WhitelabelDetailPanel').props.onEditName(RECORD_A)
  assert.equal(pageChild(h.render(), 'WhitelabelNameEditDialog'), null, 'old target callback cannot open against B')
  pageChild(h.render(), 'WhitelabelDetailPanel').props.onEditName(RECORD_B)
  const props = pageChild(h.render(), 'WhitelabelNameEditDialog').props
  assert.equal(props.record, RECORD_B)
  assert.equal(props.selectedId, RECORD_B.id)
  const built = commands.buildNameUpdateCommand({ selectedId: props.selectedId, record: props.record, draft: { name: 'Renamed Beta' } })
  assert.equal(built.command.targetId, RECORD_B.id)
  assert.deepEqual(built.command.body, { name: 'Renamed Beta' })
})
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
  assert.ok(pending, 'review contains a pending action')
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
const requestPreview = (tree) => JSON.parse(textOf(findElement(tree, element => element.props?.['data-request-preview'])))
const requestRoute = (tree) => textOf(findElement(tree, element => element.props?.['data-request-route']))

await check('actual create handler: invalid programmatic submit prevents default and focuses first error', async () => {
  const h = renderHarness(WhitelabelCreateDialog, { onClose() {} })
  submitForm(h, 'wl-create')
  assert.equal(focused, 'wl-create-name')
  assert.equal(byId(h.render(), 'wl-create-name').props['aria-invalid'], true)
  assert.equal(byId(h.render(), 'wl-create-baseUrl').props['aria-invalid'], true, 'URL base is required')
  assert.equal(byId(h.render(), 'wl-create-baseUrl').props['aria-required'], 'true')
  assert.equal(requests, 0)
})
await check('actual create handler: a missing URL base stops before review and focuses it', async () => {
  const h = renderHarness(WhitelabelCreateDialog, { onClose() {} })
  enterValue(h, 'wl-create-name', 'Synthetic Draft')
  enterValue(h, 'wl-create-slug', 'synthetic-draft')
  submitForm(h, 'wl-create')
  assert.equal(focused, 'wl-create-baseUrl')
  assert.equal(findElement(h.render(), element => element.props?.['data-step'] === 'review'), null)
})
for (const trigger of ['button submit', 'keyboard Enter', 'programmatic requestSubmit']) {
  await check(`actual create handler: ${trigger} stops at review; exact body shown; final activation cannot write`, async () => {
    const h = renderHarness(WhitelabelCreateDialog, { onClose() {} })
    enterValue(h, 'wl-create-name', ' Synthetic   Draft ')
    enterValue(h, 'wl-create-slug', 'synthetic-draft')
    enterValue(h, 'wl-create-baseUrl', ' https://draft.example.test ')
    submitForm(h, 'wl-create')
    const tree = h.render()
    assert.equal(findElement(tree, element => element.props?.['data-step'] === 'review')?.props['data-wl-form'], 'create')
    assert.deepEqual(requestPreview(tree), { name: 'Synthetic Draft', slug: 'synthetic-draft', baseUrl: 'https://draft.example.test' })
    assert.equal(requestRoute(tree), 'POST /api/whitelabels')
    assertFinalInert(tree)
  })
}
await check('actual create review: tenant-identity notice, exact pending wording, back to edit and discard', async () => {
  let closed = 0
  const h = renderHarness(WhitelabelCreateDialog, { onClose() { closed += 1 } })
  enterValue(h, 'wl-create-name', 'Synthetic Draft')
  enterValue(h, 'wl-create-slug', 'synthetic-draft')
  enterValue(h, 'wl-create-baseUrl', 'https://draft.example.test')
  submitForm(h, 'wl-create')
  const tree = h.render()
  assert.match(textOf(findElement(tree, element => element.props?.['data-identity-notice'])), /slug e a URL base influenciam a identidade do tenant/)
  const pending = findElement(tree, element => element.type === PendingBackendNotice)
  assert.equal(pending.props.action, 'create')
  assert.equal(textOf(PendingBackendNotice(pending.props)).startsWith('Criação aguardando liberação da integração.'), true)
  findElement(tree, element => element.props?.['data-back-to-form']).props.onClick()
  assert.equal(findElement(h.render(), element => element.props?.['data-step'] === 'form')?.props['data-wl-form'], 'create')
  assert.equal(byId(h.render(), 'wl-create-slug').props.value, 'synthetic-draft', 'returning keeps the typed values')
  submitForm(h, 'wl-create')
  findElement(h.render(), element => element.props?.['data-review-discard']).props.onClick()
  findElement(h.render(), element => element.props?.['data-discard']).props.onClick()
  assert.equal(closed, 1)
  assert.equal(requests, 0)
})
await check('actual create close: pristine closes; dirty asks before discarding, without persistence', async () => {
  let closed = 0
  const h = renderHarness(WhitelabelCreateDialog, { onClose() { closed += 1 } })
  buttonText(h.render(), 'Cancelar').props.onClick()
  assert.equal(closed, 1)
  enterValue(h, 'wl-create-name', 'Draft')
  h.render().props.onClose()
  assert.equal(closed, 1)
  assert.ok(findElement(h.render(), element => element.props?.['data-discard']))
  assert.equal(requests, 0)
})
await check('actual edit handler: authoritative initial name, name-only inputs, unchanged note, diff review, no write', async () => {
  const before = JSON.stringify(record)
  const h = renderHarness(WhitelabelNameEditDialog, { record, latest: record, selectedId: record.id, onClose() {} })
  let tree = h.render()
  assert.equal(byId(tree, 'wl-edit-name').props.value, record.name)
  assert.equal(byId(tree, 'wl-edit-slug'), null, 'no slug input')
  assert.equal(byId(tree, 'wl-edit-baseUrl'), null, 'no URL base input')
  assert.equal(findAll(tree, element => element.type === 'input').length, 1, 'exactly one input: the name')
  assert.match(textOf(findElement(tree, element => element.props?.['data-identity-readonly'])), /afeta a resolução do tenant .* autorização separada/)
  submitForm(h, 'wl-edit')
  assert.ok(findElement(h.render(), element => element.props?.['data-form-note']), 'unchanged name')
  enterValue(h, 'wl-edit-name', 'Renamed synthetic')
  submitForm(h, 'wl-edit')
  tree = h.render()
  assert.ok(findElement(tree, element => element.props?.['data-change'] === 'name'))
  assert.equal(findAll(tree, element => element.props?.['data-change']).length, 1, 'only the name can differ')
  assert.deepEqual(requestPreview(tree), { name: 'Renamed synthetic' })
  assert.equal(requestRoute(tree), `PATCH /api/whitelabels/${record.id}`)
  const pending = findElement(tree, element => element.type === PendingBackendNotice)
  assert.equal(textOf(PendingBackendNotice(pending.props)).startsWith('Edição aguardando liberação da integração.'), true)
  assertFinalInert(tree)
  assert.equal(JSON.stringify(record), before)
})
await check('actual edit identity: a dialog for A rendered while B is selected cannot reach review or target B', async () => {
  const h = renderHarness(WhitelabelNameEditDialog, { record: RECORD_A, latest: null, selectedId: RECORD_B.id, onClose() {} })
  enterValue(h, 'wl-edit-name', 'Renamed Alpha')
  submitForm(h, 'wl-edit')
  const tree = h.render()
  assert.equal(findElement(tree, element => element.props?.['data-step'] === 'review'), null)
  assert.match(textOf(findElement(tree, element => element.props?.['data-form-note'])), /não é o que está selecionado/)
  const forB = renderHarness(WhitelabelNameEditDialog, { record: RECORD_B, latest: RECORD_B, selectedId: RECORD_B.id, onClose() {} })
  assert.equal(byId(forB.render(), 'wl-edit-name').props.value, RECORD_B.name, 'B opens with B\'s authoritative name')
  enterValue(forB, 'wl-edit-name', 'Renamed Beta')
  submitForm(forB, 'wl-edit')
  assert.equal(requestRoute(forB.render()), `PATCH /api/whitelabels/${RECORD_B.id}`)
  assert.equal(findElement(forB.render(), element => element.props?.['data-wl-target'])?.props['data-wl-target'], RECORD_B.id)
})
await check('actual edit notes: persistent live region; a non-server id gets its own message', async () => {
  const h = renderHarness(WhitelabelNameEditDialog, { record, latest: record, selectedId: record.id, onClose() {} })
  const region = findElement(h.render(), element => element.props?.['data-form-note-region'])
  assert.equal(region.props.role, 'status', 'the live region exists before any note appears')
  assert.equal(findElement(region, element => element.props?.['data-form-note']), null)
  const proto = { ...record, id: 'wl_proto_01' }
  const p = renderHarness(WhitelabelNameEditDialog, { record: proto, latest: null, selectedId: proto.id, onClose() {} })
  enterValue(p, 'wl-edit-name', 'Renamed')
  submitForm(p, 'wl-edit')
  assert.match(textOf(findElement(p.render(), element => element.props?.['data-form-note'])), /ID do Control Plane válido/)
})
await check('actual edit stale: a newer authoritative version blocks the review with a notice', async () => {
  const latest = { ...record, name: 'Renamed Elsewhere', updatedAt: '2026-10-15T00:00:00.000Z' }
  const h = renderHarness(WhitelabelNameEditDialog, { record, latest, selectedId: record.id, onClose() {} })
  assert.ok(findElement(h.render(), element => element.props?.['data-stale-notice']))
  enterValue(h, 'wl-edit-name', 'Renamed synthetic')
  submitForm(h, 'wl-edit')
  assert.equal(findElement(h.render(), element => element.props?.['data-step'] === 'review'), null)
  assert.match(textOf(findElement(h.render(), element => element.props?.['data-form-note'])), /Feche e reabra/)
})
await check('actual edit close: pristine closes; a changed name asks before discarding', async () => {
  let closed = 0
  const h = renderHarness(WhitelabelNameEditDialog, { record, latest: record, selectedId: record.id, onClose() { closed += 1 } })
  h.render().props.onClose()
  assert.equal(closed, 1)
  enterValue(h, 'wl-edit-name', 'Other')
  h.render().props.onClose()
  assert.equal(closed, 1)
  assert.ok(findElement(h.render(), element => element.props?.['data-discard']))
})
for (const access of ['super-admin', 'read-only', 'unknown']) {
  await check(`actual actions menu (${access}): lifecycle item inert without handler; edit opens only for SUPER_ADMIN`, async () => {
    let edits = 0
    const h = renderHarness(WhitelabelActionsMenu, { name: record.name, status: 'active', access, triggerClassName: 'kebab', onEditName() { edits += 1 } })
    const tree = h.render()
    const lifecycle = findElement(tree, element => element.props?.['data-menu-lifecycle'])
    assert.equal(lifecycle.props['data-menu-lifecycle'], 'deactivate')
    assert.equal(lifecycle.props['aria-disabled'], true)
    lifecycle.props.onClick() // no callback/flag: remains inert, including SUPER_ADMIN
    assert.match(textOf(lifecycle), /Desativar Whitelabel/)
    assert.equal(findElement(lifecycle, element => element.props?.id === lifecycle.props['aria-describedby'])?.props['aria-hidden'], 'true')
    const edit = findElement(tree, element => element.props?.['data-menu-edit'])
    if (access === 'super-admin') {
      assert.equal(edit.props['aria-disabled'], undefined)
      edit.props.onClick()
      assert.equal(edits, 1)
    } else {
      assert.equal(edit.props['aria-disabled'], 'true')
      assert.equal(edit.props.onClick, undefined)
      assert.equal(edit.props['data-restricted'], access)
      const note = findElement(edit, element => element.props?.id === edit.props['aria-describedby'])
      assert.equal(note.props['aria-hidden'], 'true', 'the reason is the description, not repeated in the name')
      assert.equal(edits, 0)
    }
    const inactive = renderHarness(WhitelabelActionsMenu, { name: record.name, status: 'inactive', access, triggerClassName: 'kebab', onEditName() {} })
    assert.equal(findElement(inactive.render(), element => element.props?.['data-menu-lifecycle']).props['data-menu-lifecycle'], 'activate')
  })
}
delete globalThis.__wlCrudHooks
assert.equal(requests, 0, 'no request was attempted by these checks')
console.log(`Whitelabel CRUD safe preparation contracts: ${checks} passed (synthetic, no network, zero mutation requests)`)
