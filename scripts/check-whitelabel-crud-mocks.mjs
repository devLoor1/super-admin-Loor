import assert from 'node:assert/strict'
import { readFile } from './reviewed-consolidation-boundary.mjs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'
import { ERROR_BODIES, RECORD_A, RECORD_B, createMockReadback, createMockTransport, rawCoreRow, wire } from './fixtures/whitelabel-mutation-mocks.mjs'

// Whitelabel CRUD Safe Preparation V1 — MOCK-ONLY mutation scenarios.
// The production command builders, outcome interpreter and attempt runner are
// driven by an injected fake transport (scripts/fixtures). Nothing here can
// reach a network: `fetch` throws, and the only transport is the fixture.
// Mock responses mirror the Nest source; they are NOT proof of the real Core envelope.
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
let networkAttempts = 0
globalThis.fetch = async () => { networkAttempts += 1; throw new Error('Unexpected network request') }

const { ApiError } = await load('src/lib/api.ts')
const commands = await load('src/features/whitelabels/crud/whitelabelCommands.ts')
const outcome = await load('src/features/whitelabels/crud/whitelabelMutationOutcome.ts')
const { createWhitelabelMutationRunner, slotKeyFor } = await load('src/features/whitelabels/crud/whitelabelMutationRunner.ts')

let checks = 0
async function check(name, action) {
  try { await action(); checks += 1 } catch (cause) {
    if (cause instanceof Error && cause.stack) cause.stack = cause.stack.replace(/data:text\/javascript;base64,[A-Za-z0-9+/=]+/g, '<in-memory-module>')
    throw new Error(`Failed: ${name}`, { cause })
  }
}
const flush = () => new Promise((resolve) => setImmediate(resolve))

const NEW = Object.freeze({ name: 'Synthetic Gamma', slug: 'synthetic-gamma', baseUrl: 'https://gamma.example.test' })
const CREATED = Object.freeze({ ...RECORD_B, id: '12', ...NEW, domain: 'gamma.example.test', createdAt: '2026-10-16T10:00:00.000Z', updatedAt: '2026-10-16T10:00:00.000Z' })
const createCommand = commands.buildCreateCommand(NEW).command
const renameA = commands.buildNameUpdateCommand({ selectedId: RECORD_A.id, record: RECORD_A, draft: { name: 'Renamed Alpha' } }).command
const renamedA = Object.freeze({ ...RECORD_A, name: 'Renamed Alpha', updatedAt: '2026-10-16T10:05:00.000Z' })

const CREATE_SCENARIOS = {
  success: () => ({ status: 201, body: { data: wire(CREATED) } }),
  'invalid DTO (400)': () => ({ status: 400, body: ERROR_BODIES.validation(['baseUrl must be a URL address', 'property status should not exist']) }),
  'duplicate slug, generic Core 422': () => ({ status: 422, body: ERROR_BODIES.coreUnprocessable() }),
  'duplicate slug, E_SLUG_TAKEN 422': () => ({ status: 422, body: ERROR_BODIES.slugTaken() }),
  'duplicate slug, current Nest E_SLUG_TAKEN 409': () => ({ status: 409, body: ERROR_BODIES.slugConflict() }),
  'generic 409 is not a duplicate-slug assertion': () => ({ status: 409, body: { code: 'HTTP_ERROR' } }),
  'forbidden (403)': () => ({ status: 403, body: ERROR_BODIES.forbidden() }),
  'Audit failure after Core success (500)': () => ({ status: 500, body: ERROR_BODIES.auditFailure() }),
  'Core unavailable (503)': () => ({ status: 503, body: ERROR_BODIES.coreUnavailable() }),
  timeout: () => ({ kind: 'timeout' }),
  'uncertain: raw Core body in a 2xx': () => ({ status: 201, body: { data: rawCoreRow(CREATED) } }),
  'uncertain: network': () => ({ kind: 'network' }),
}
const CREATE_EXPECTED = {
  success: ['confirmed'],
  'invalid DTO (400)': ['rejected', 'validation'],
  'duplicate slug, generic Core 422': ['rejected', 'unprocessable'],
  'duplicate slug, E_SLUG_TAKEN 422': ['rejected', 'slug-taken'],
  'duplicate slug, current Nest E_SLUG_TAKEN 409': ['rejected', 'slug-taken'],
  'generic 409 is not a duplicate-slug assertion': ['rejected', 'refused'],
  'forbidden (403)': ['rejected', 'forbidden'],
  'Audit failure after Core success (500)': ['uncertain', 'server-error'],
  'Core unavailable (503)': ['uncertain', 'unavailable'],
  timeout: ['uncertain', 'timeout'],
  'uncertain: raw Core body in a 2xx': ['uncertain', 'unverified-response'],
  'uncertain: network': ['uncertain', 'network'],
}

for (const [name, respond] of Object.entries(CREATE_SCENARIOS)) {
  await check(`create mock — ${name}`, async () => {
    const mock = createMockTransport({ ApiError, respond })
    const reads = createMockReadback({ ApiError, records: [RECORD_A, RECORD_B] })
    const runner = createWhitelabelMutationRunner({ transport: mock.transport, readback: reads.port })
    const submitted = runner.submit(createCommand)
    assert.equal(submitted.accepted, true)
    const state = await submitted.done
    const [expectedState, expectedDetail] = CREATE_EXPECTED[name]
    assert.equal(state.phase, 'settled')
    assert.equal(state.outcome.state, expectedState)
    if (expectedDetail) assert.equal(state.outcome.state === 'rejected' ? state.outcome.reason : state.outcome.cause, expectedDetail)
    assert.equal(mock.calls.length, 1, 'exactly one transport call; no automatic retry')
    assert.deepEqual(mock.calls[0].body, NEW, 'the body is exactly the built command')
    assert.deepEqual(Object.keys(mock.calls[0].body), ['name', 'slug', 'baseUrl'])
    assert.equal(reads.calls.length, 0, 'create sends without a pre-read')
    const view = outcome.describeMutationOutcome(state.outcome)
    assert.equal(/synthetic-private-backend-message|Insufficient role|ThrottlerException|Internal server error/.test(`${view.title} ${view.description} ${view.next}`), false)
    if (expectedState === 'confirmed') assert.equal(state.outcome.record.id, '12')
    if (expectedState === 'uncertain') assert.deepEqual(runner.submit(createCommand), { accepted: false, reason: 'verify-first' })
  })
}

const UPDATE_SCENARIOS = {
  success: [() => ({ status: 200, body: { data: wire(renamedA) } }), 'confirmed'],
  'invalid name (400)': [() => ({ status: 400, body: ERROR_BODIES.validation(['name must be shorter than or equal to 120 characters']) }), 'rejected', 'validation'],
  'not found (404)': [() => ({ status: 404, body: ERROR_BODIES.notFound() }), 'rejected', 'not-found'],
  'forbidden (403)': [() => ({ status: 403, body: ERROR_BODIES.forbidden() }), 'rejected', 'forbidden'],
  'Audit failure after Core success (500)': [() => ({ status: 500, body: ERROR_BODIES.auditFailure() }), 'uncertain', 'server-error'],
  'Core unavailable (503)': [() => ({ status: 503, body: ERROR_BODIES.coreUnavailable() }), 'uncertain', 'unavailable'],
  timeout: [() => ({ kind: 'timeout' }), 'uncertain', 'timeout'],
  'uncertain: 200 echoing the old name': [() => ({ status: 200, body: { data: wire(RECORD_A) } }), 'uncertain', 'unverified-response'],
}
for (const [name, [respond, expectedState, expectedDetail]] of Object.entries(UPDATE_SCENARIOS)) {
  await check(`name update mock — ${name}`, async () => {
    const mock = createMockTransport({ ApiError, respond })
    const reads = createMockReadback({ ApiError, records: [RECORD_A, RECORD_B] })
    const runner = createWhitelabelMutationRunner({ transport: mock.transport, readback: reads.port })
    const state = await runner.submit(renameA).done
    assert.equal(state.outcome.state, expectedState)
    if (expectedDetail) assert.equal(state.outcome.state === 'rejected' ? state.outcome.reason : state.outcome.cause, expectedDetail)
    assert.deepEqual(reads.calls, [['get', RECORD_A.id]], 'one authoritative pre-read of the target')
    assert.equal(mock.calls.length, 1)
    assert.deepEqual(mock.calls[0], { operation: 'update-name', targetId: RECORD_A.id, route: `PATCH /api/whitelabels/${RECORD_A.id}`, body: { name: 'Renamed Alpha' } })
    if (expectedState === 'uncertain') assert.equal(runner.submit(renameA).reason, 'verify-first')
  })
}
await check('name update mock — stale record: changed after the edit opened → nothing sent', async () => {
  const mock = createMockTransport({ ApiError, respond: UPDATE_SCENARIOS.success[0] })
  const reads = createMockReadback({ ApiError, records: [{ ...RECORD_A, name: 'Renamed Elsewhere', updatedAt: '2026-10-16T09:00:00.000Z' }, RECORD_B] })
  const runner = createWhitelabelMutationRunner({ transport: mock.transport, readback: reads.port })
  const state = await runner.submit(renameA).done
  assert.equal(state.outcome.state, 'stale')
  assert.equal(state.outcome.latest.name, 'Renamed Elsewhere')
  assert.equal(mock.calls.length, 0, 'no PATCH for a stale draft')
  assert.equal(runner.submit(renameA).reason, 'review-required')
  assert.match(outcome.describeMutationOutcome(state.outcome).description, /Nada foi enviado/)
})
await check('name update mock — target deleted before submit: pre-read 404 → not found, nothing sent', async () => {
  const mock = createMockTransport({ ApiError, respond: UPDATE_SCENARIOS.success[0] })
  const reads = createMockReadback({ ApiError, records: [RECORD_B] })
  const runner = createWhitelabelMutationRunner({ transport: mock.transport, readback: reads.port })
  const state = await runner.submit(renameA).done
  assert.equal(state.outcome.reason, 'not-found')
  assert.equal(mock.calls.length, 0)
})
await check('name update mock — pre-read unavailable: check-failed, nothing sent, manual resubmit allowed', async () => {
  const mock = createMockTransport({ ApiError, respond: UPDATE_SCENARIOS.success[0] })
  const runner = createWhitelabelMutationRunner({
    transport: mock.transport,
    readback: { getWhitelabel: async () => { throw new ApiError(0, {}, { kind: 'network' }) }, findBySlug: async () => ({ rows: [], complete: true }) },
  })
  const state = await runner.submit(renameA).done
  assert.equal(state.phase, 'check-failed')
  assert.equal(mock.calls.length, 0)
  assert.equal(runner.submit(renameA).accepted, true)
})

/* ---------- error states (every listed status / kind) ---------- */
for (const [label, spec, command, state] of [
  ['400', { status: 400, body: ERROR_BODIES.validation(['name must be longer than or equal to 2 characters']) }, createCommand, 'rejected'],
  ['422 generic', { status: 422, body: ERROR_BODIES.coreUnprocessable() }, renameA, 'rejected'],
  ['401', { status: 401, body: ERROR_BODIES.unauthorized() }, createCommand, 'rejected'],
  ['403', { status: 403, body: ERROR_BODIES.forbidden() }, renameA, 'rejected'],
  ['404', { status: 404, body: ERROR_BODIES.notFound() }, renameA, 'rejected'],
  ['429', { status: 429, body: ERROR_BODIES.throttled() }, createCommand, 'rejected'],
  ['503', { status: 503, body: ERROR_BODIES.coreUnavailable() }, createCommand, 'uncertain'],
  ['timeout', { kind: 'timeout' }, renameA, 'uncertain'],
  ['network', { kind: 'network' }, createCommand, 'uncertain'],
  ['malformed', { kind: 'malformed' }, renameA, 'uncertain'],
]) {
  await check(`error state ${label} on ${command.operation} → ${state}, safe copy, correlation id kept`, async () => {
    const mock = createMockTransport({ ApiError, respond: () => spec })
    const reads = createMockReadback({ ApiError, records: [RECORD_A, RECORD_B] })
    const runner = createWhitelabelMutationRunner({ transport: mock.transport, readback: reads.port })
    const settled = await runner.submit(command).done
    assert.equal(settled.outcome.state, state)
    const view = outcome.describeMutationOutcome(settled.outcome)
    assert.ok(view.title && view.description && view.next)
    if (spec.body) assert.equal(view.correlationId, spec.body.correlationId)
    else assert.equal(view.correlationId, 'cid-synthetic-client')
  })
}

/* ---------- attempt rules ---------- */
await check('duplicate submit: repeated click + Enter while pending → exactly one request', async () => {
  const mock = createMockTransport({ ApiError, respond: CREATE_SCENARIOS.success, hold: true })
  const runner = createWhitelabelMutationRunner({ transport: mock.transport, readback: createMockReadback({ ApiError, records: [] }).port })
  const first = runner.submit(createCommand)
  const click = runner.submit(createCommand)
  const enter = runner.submit(createCommand)
  const other = runner.submit(renameA)
  assert.equal(first.accepted, true)
  for (const refused of [click, enter, other]) assert.deepEqual(refused, { accepted: false, reason: 'in-flight' })
  assert.equal(mock.calls.length, 1)
  assert.equal(runner.view('create').phase, 'pending', 'pending state is observable')
  assert.equal(runner.isBusy(), true)
  mock.release(0)
  const state = await first.done
  assert.equal(state.outcome.state, 'confirmed')
  assert.equal(runner.isBusy(), false)
  assert.equal(mock.calls.length, 1)
})
await check('response tied to its target; navigating to B does not retarget A\'s attempt', async () => {
  const mock = createMockTransport({ ApiError, respond: UPDATE_SCENARIOS.success[0], hold: true })
  const reads = createMockReadback({ ApiError, records: [RECORD_A, RECORD_B] })
  const runner = createWhitelabelMutationRunner({ transport: mock.transport, readback: reads.port })
  runner.select(slotKeyFor(renameA))
  const attempt = runner.submit(renameA)
  await flush()
  assert.equal(runner.visible().phase, 'pending')
  runner.select(`whitelabel:${RECORD_B.id}`)
  assert.equal(runner.visible().phase, 'idle', 'B shows nothing of A\'s attempt')
  mock.release(0)
  await attempt.done
  assert.equal(runner.visible().phase, 'idle', 'A\'s response does not land on B')
  assert.equal(runner.view(`whitelabel:${RECORD_A.id}`).outcome.state, 'confirmed')
  assert.equal(runner.view(`whitelabel:${RECORD_A.id}`).outcome.targetId, RECORD_A.id)
  assert.deepEqual(mock.calls.map((call) => call.targetId), [RECORD_A.id])
  const draftOfA = { name: 'Renamed Alpha' }
  assert.equal(commands.buildNameUpdateCommand({ selectedId: RECORD_B.id, record: RECORD_A, draft: draftOfA }).reason, 'target-mismatch')
  const forB = commands.buildNameUpdateCommand({ selectedId: RECORD_B.id, record: RECORD_B, draft: { name: 'Renamed Beta' } }).command
  const second = runner.submit(forB)
  await flush()
  assert.deepEqual(mock.calls.map((call) => call.targetId), [RECORD_A.id, RECORD_B.id], 'the payload for B targets B only')
  assert.equal(runner.view(`whitelabel:${RECORD_B.id}`).phase, 'pending')
  mock.release(1, { status: 200, body: { data: wire({ ...RECORD_B, name: 'Renamed Beta' }) } })
  await second.done
  assert.equal(runner.view(`whitelabel:${RECORD_B.id}`).outcome.state, 'confirmed')
  assert.equal(runner.view(`whitelabel:${RECORD_A.id}`).outcome.record.name, 'Renamed Alpha', 'A keeps its own outcome')
})
await check('stale responses are ignored: an older read-back finishing after a newer one, and anything after dispose()', async () => {
  const mock = createMockTransport({ ApiError, respond: () => ({ kind: 'timeout' }) })
  const reads = createMockReadback({ ApiError, records: [RECORD_A], hold: true })
  const runner = createWhitelabelMutationRunner({ transport: mock.transport, readback: reads.port })
  const key = slotKeyFor(renameA)
  const pre = runner.submit(renameA)
  reads.release(0)
  await pre.done
  assert.equal(runner.view(key).outcome.state, 'uncertain')
  const older = runner.verify(key)
  reads.store.set(RECORD_A.id, { ...renamedA })
  const newer = runner.verify(key)
  reads.release(2)
  await newer
  assert.equal(runner.view(key).readback, 'applied')
  reads.store.set(RECORD_A.id, { ...RECORD_A })
  reads.release(1)
  await older
  assert.equal(runner.view(key).readback, 'applied', 'the older read-back cannot overwrite the newer one')
  assert.equal(runner.ignoredCount(), 1)

  const held = createMockTransport({ ApiError, respond: CREATE_SCENARIOS.success, hold: true })
  const disposable = createWhitelabelMutationRunner({ transport: held.transport, readback: createMockReadback({ ApiError, records: [] }).port })
  const late = disposable.submit(createCommand)
  disposable.dispose()
  held.release(0)
  await late.done
  assert.equal(disposable.view('create').phase, 'pending', 'a response after dispose() is not applied')
  assert.equal(disposable.ignoredCount(), 1)
  assert.equal(disposable.submit(createCommand).reason, 'disposed')
})
await check('no automatic retry: uncertain blocks resubmission until a read-back; then a MANUAL resubmit sends once more', async () => {
  let answer = { kind: 'timeout' }
  const mock = createMockTransport({ ApiError, respond: () => answer })
  const reads = createMockReadback({ ApiError, records: [RECORD_A, RECORD_B] })
  const runner = createWhitelabelMutationRunner({ transport: mock.transport, readback: reads.port })
  await runner.submit(createCommand).done
  await flush()
  assert.equal(mock.calls.length, 1)
  assert.equal(runner.submit(createCommand).reason, 'verify-first')
  const verified = await runner.verify('create')
  assert.equal(verified.readback, 'not-applied')
  assert.deepEqual(reads.calls, [['search', NEW.slug]])
  assert.equal(mock.calls.length, 1, 'verification never re-sends')
  answer = CREATE_SCENARIOS.success()
  const manual = await runner.submit(createCommand).done
  assert.equal(manual.outcome.state, 'confirmed')
  assert.equal(mock.calls.length, 2)
  assert.equal(runner.submit(createCommand).reason, 'review-required', 'a confirmed create cannot be sent again')
})
await check('Audit-failure 500 after a Core success: uncertain, then the read-back finds the record (applied, not resent)', async () => {
  const mock = createMockTransport({ ApiError, respond: CREATE_SCENARIOS['Audit failure after Core success (500)'] })
  const reads = createMockReadback({ ApiError, records: [RECORD_A, RECORD_B] })
  const runner = createWhitelabelMutationRunner({ transport: mock.transport, readback: reads.port })
  const settled = await runner.submit(createCommand).done
  assert.equal(settled.outcome.state, 'uncertain')
  assert.match(outcome.describeMutationOutcome(settled.outcome).description, /auditoria/)
  reads.store.set(CREATED.id, { ...CREATED }) // Core had applied it
  const verified = await runner.verify('create')
  assert.equal(verified.readback, 'found')
  assert.equal(verified.record.id, CREATED.id)
  assert.equal(runner.submit(createCommand).reason, 'review-required')
  assert.equal(mock.calls.length, 1)
})
await check('read-back of a name edit: applied / not-applied / diverged (concurrent change)', async () => {
  for (const [stored, expected] of [[renamedA, 'applied'], [RECORD_A, 'not-applied'], [{ ...RECORD_A, name: 'Third Name' }, 'diverged']]) {
    const mock = createMockTransport({ ApiError, respond: () => ({ status: 503, body: ERROR_BODIES.coreUnavailable() }) })
    const reads = createMockReadback({ ApiError, records: [RECORD_A] })
    const runner = createWhitelabelMutationRunner({ transport: mock.transport, readback: reads.port })
    await runner.submit(renameA).done
    reads.store.set(RECORD_A.id, { ...stored })
    const verified = await runner.verify(slotKeyFor(renameA))
    assert.equal(verified.readback, expected)
    assert.equal(runner.submit(renameA).accepted, expected === 'not-applied')
  }
})
await check('reset is refused while a write is in flight and clears the slot afterwards', async () => {
  const mock = createMockTransport({ ApiError, respond: CREATE_SCENARIOS.success, hold: true })
  const runner = createWhitelabelMutationRunner({ transport: mock.transport, readback: createMockReadback({ ApiError, records: [] }).port })
  const attempt = runner.submit(createCommand)
  assert.equal(runner.reset('create'), false)
  mock.release(0)
  await attempt.done
  assert.equal(runner.reset('create'), true)
  assert.equal(runner.view('create').phase, 'idle')
})
await check('reset cannot bypass an uncertain result or its pending/failed read-back', async () => {
  const mock = createMockTransport({ ApiError, respond: () => ({ kind: 'timeout' }) })
  const reads = createMockReadback({ ApiError, records: [], hold: true })
  const runner = createWhitelabelMutationRunner({ transport: mock.transport, readback: reads.port })
  await runner.submit(createCommand).done
  assert.equal(runner.reset('create'), false)
  const verifying = runner.verify('create')
  assert.equal(runner.reset('create'), false)
  reads.release(0)
  await verifying
  assert.equal(runner.view('create').readback, 'not-applied')
  assert.equal(runner.reset('create'), true, 'only a completed authoritative check can release uncertainty')
  const failed = createWhitelabelMutationRunner({ transport: mock.transport, readback: { ...reads.port, findBySlug: async () => { throw new Error('Synthetic read failed') } } })
  await failed.submit(createCommand).done
  await failed.verify('create')
  assert.equal(failed.view('create').phase, 'verify-failed')
  assert.equal(failed.reset('create'), false)
  assert.equal(failed.submit(createCommand).reason, 'verify-first')
})
await check('an incomplete slug search cannot prove absence or unlock a retry', async () => {
  const mock = createMockTransport({ ApiError, respond: () => ({ kind: 'timeout' }) })
  const reads = createMockReadback({ ApiError, records: [] })
  let complete = false
  const runner = createWhitelabelMutationRunner({ transport: mock.transport,
    readback: { ...reads.port, findBySlug: async () => ({ rows: [], complete }) } })
  await runner.submit(createCommand).done
  await runner.verify('create')
  assert.equal(runner.view('create').readback, 'inconclusive')
  assert.equal(runner.submit(createCommand).reason, 'verify-first')
  assert.equal(runner.reset('create'), false)
  complete = true
  await runner.verify('create')
  assert.equal(runner.view('create').readback, 'not-applied')
  assert.equal(mock.calls.length, 1, 'only readbacks, no retry dispatched')
})
await check('mock fixtures are deterministic and never touch the network', async () => {
  assert.equal(networkAttempts, 0)
  assert.deepEqual(CREATE_SCENARIOS.success(), CREATE_SCENARIOS.success())
})
console.log(`Whitelabel CRUD mock-only mutation scenarios: ${checks} passed (injected fake transport, no network, no production transport)`)
