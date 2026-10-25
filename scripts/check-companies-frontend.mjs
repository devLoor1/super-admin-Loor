import assert from 'node:assert/strict'
import { execFileSync } from './reviewed-consolidation-boundary.mjs'
import { access, readdir } from 'node:fs/promises'
import { readFile } from './reviewed-consolidation-boundary.mjs'
import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'
import * as fx from './fixtures/opportunities-companies-fixtures.mjs'

// Companies Frontend — authoritative read boundaries (Opportunities + Companies Read Integration V1).
// Replaces the Companies Frontend V1 prototype checks: the prototype source, preview states and
// illustrative provenance no longer exist, so the checks now cover the integrated GET-only screens:
// stale-request safety of the actual read hooks (A→B switches, late / delayed responses, populated →
// absent), the four Entrepreneur → Company outcomes rendered by the actual components (failure is
// never "no Company"), route safety, the stable Empreendedores navigation (no menu id, no sidebar
// entry), and source boundaries. Synthetic fixtures, an injected GET-only fetch double, no network.
// Every removed / modified prototype invariant is listed in docs/opportunities-companies-read-integration-v1.md (§H).
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(pathToFileURL(resolve(root, 'package.json')))

/** Transpiling loader; `bare` replaces bare specifiers (e.g. a hook runtime for 'react'), with its own cache. */
function makeLoader(bare = {}) {
  const modules = new Map()
  async function moduleUrl(path, sourceOverride) {
    const key = sourceOverride === undefined ? path : `${path}:${sourceOverride}`
    if (modules.has(key)) return modules.get(key)
    if (path.endsWith('.css')) {
      const css = await readFile(path, 'utf8')
      const classes = Object.fromEntries([...css.matchAll(/\.([A-Za-z][\w-]*)/g)].map((match) => [match[1], `css-${match[1]}`]))
      return `data:text/javascript;base64,${Buffer.from(`export default ${JSON.stringify(classes)}`).toString('base64')}`
    }
    let code = ts.transpileModule(sourceOverride ?? await readFile(path, 'utf8'), {
      fileName: path,
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
    }).outputText.replaceAll('import.meta.env', '({VITE_API_BASE_URL:"https://control-plane.example.invalid/api"})')
    for (const match of [...code.matchAll(/from\s+(['"])([^'"]+)\1/g)]) {
      const specifier = match[2]
      const base = resolve(dirname(path), specifier)
      const url = Object.hasOwn(bare, specifier) ? bare[specifier] : specifier.startsWith('.')
        ? await moduleUrl(base.endsWith('.css') ? base : existsSync(`${base}.ts`) ? `${base}.ts` : `${base}.tsx`)
        : pathToFileURL(require.resolve(specifier)).href
      code = code.replace(match[0], `from ${JSON.stringify(url)}`)
    }
    const url = `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
    modules.set(key, url)
    return url
  }
  return async (path, sourceOverride) => import(await moduleUrl(resolve(root, path), sourceOverride))
}
const load = makeLoader()

/* ---------- environment: session, GET-only fetch double with controllable responses ---------- */
const storage = new Map()
globalThis.sessionStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) }
globalThis.window = { setTimeout, clearTimeout, location: { hash: '' }, scrollY: 0, scrollTo() {}, addEventListener() {}, removeEventListener() {} }
const requests = []
let respond = () => { throw new Error('Unexpected network operation in Companies checks') }
globalThis.fetch = (url, init = {}) => {
  const record = { url: new URL(String(url)), method: (init.method ?? 'GET').toUpperCase(), signal: init.signal, aborted: false }
  requests.push(record)
  if (record.method !== 'GET') throw new Error(`Companies frontend issued a ${record.method}`)
  return new Promise((resolvePromise, reject) => {
    record.resolve = resolvePromise
    record.reject = reject
    init.signal?.addEventListener('abort', () => { record.aborted = true; reject(new DOMException('Aborted', 'AbortError')) }, { once: true })
    respond(record)
  })
}
const json = (value, status = 200) => new Response(JSON.stringify(value), { status })
const tick = async () => { for (let index = 0; index < 8; index += 1) await new Promise((done) => setImmediate(done)) }

let checks = 0
async function check(name, action) {
  try { await action(); checks += 1 } catch (cause) { throw new Error(`Failed: ${name}`, { cause }) }
}

const auth = await load('src/lib/authSession.ts')
const { ApiError } = await load('src/lib/api.ts')
const route = await load('src/features/operation/companies/companyRoute.ts')
const present = await load('src/features/operation/companies/companyPresent.ts')
const relation = await load('src/features/operation/companies/companyRelation.ts')
const cmp = await load('src/features/operation/companies/companyApi.ts')
auth.persistSession({ accessToken: 'synthetic-unit-token-c', tokenType: 'Bearer', operator: { id: 'synthetic-operator', name: 'Unit QA', email: 'qa@example.invalid', roles: ['READ_ONLY'] } })

/* ---------- stale-request safety: the actual read hooks on a minimal hook runtime ---------- */
// The real `useRemote` (src/lib/useRemoteResource.ts) and `useCompanyData.ts` run unchanged; only
// 'react' is replaced by a slot-based runtime that re-renders on state changes and runs effects with
// dependency comparison and cleanup (abort). React's own lifecycle is covered by browser QA.
function createRuntime() {
  let slots = []
  let cursor = 0
  let pending = []
  let dirty = false
  let current = null
  const changed = (prev, next) => !prev || !next || prev.length !== next.length || next.some((value, index) => !Object.is(value, prev[index]))
  const effect = (fn, deps) => {
    const index = cursor++
    const prev = slots[index]
    if (!prev || changed(prev.deps, deps)) {
      pending.push(() => {
        prev?.cleanup?.()
        slots[index] = { deps, cleanup: fn() ?? undefined }
      })
    }
  }
  const hooks = {
    useState(initial) {
      const index = cursor++
      if (!slots[index]) {
        const slot = { value: typeof initial === 'function' ? initial() : initial }
        slot.set = (next) => {
          const value = typeof next === 'function' ? next(slot.value) : next
          if (!Object.is(value, slot.value)) { slot.value = value; dirty = true }
        }
        slots[index] = slot
      }
      return [slots[index].value, slots[index].set]
    },
    useRef(initial) { const index = cursor++; slots[index] ??= { current: initial }; return slots[index] },
    useCallback(fn, deps) { const index = cursor++; if (!slots[index] || changed(slots[index].deps, deps)) slots[index] = { fn, deps }; return slots[index].fn },
    useMemo(fn, deps) { const index = cursor++; if (!slots[index] || changed(slots[index].deps, deps)) slots[index] = { value: fn(), deps }; return slots[index].value },
    useEffect: effect,
    useLayoutEffect: effect,
    useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot(),
  }
  function render(component) {
    current = component
    let output
    let passes = 0
    do {
      if ((passes += 1) > 20) throw new Error('Render loop')
      dirty = false
      cursor = 0
      pending = []
      output = component()
      for (const run of pending) run()
    } while (dirty)
    return output
  }
  return {
    hooks,
    render,
    rerender: () => render(current),
    unmount: () => { for (const slot of slots) slot?.cleanup?.(); slots = [] },
  }
}
let activeRuntime = null
globalThis.__companiesHookRuntime = () => activeRuntime.hooks
const reactStub = `data:text/javascript;base64,${Buffer.from(['useState', 'useRef', 'useCallback', 'useMemo', 'useEffect', 'useLayoutEffect', 'useSyncExternalStore']
  .map((name) => `export const ${name} = (...args) => globalThis.__companiesHookRuntime().${name}(...args);`).join('\n')).toString('base64')}`
const hookLoad = makeLoader({ react: reactStub })
const hooks = await hookLoad('src/features/operation/companies/useCompanyData.ts')
const hookRelation = await hookLoad('src/features/operation/companies/companyRelation.ts')
const runtime = () => (activeRuntime = createRuntime())
const lastRequest = () => requests.at(-1)
const companyOf = (entrepreneurId, extra = {}) => fx.detail({ ...fx.companyDetail, id: Number(entrepreneurId) + 1000, entrepreneurId: Number(entrepreneurId), ...extra }, { cardinality: fx.CARDINALITY })
respond = () => {}

await check('relationship hook: A → B switch shows loading for B, never A’s Company; A is aborted; A’s late answer is ignored', async () => {
  const rt = runtime()
  requests.length = 0
  let props = { entrepreneurId: '41', whitelabelId: '4' }
  const view = () => hooks.useEntrepreneurCompany(props.entrepreneurId, props.whitelabelId)
  assert.equal(rt.render(view).state.status, 'loading')
  const requestA = lastRequest()
  assert.equal(requestA.url.pathname, '/api/entrepreneurs/41/company')
  assert.equal(requestA.url.searchParams.get('whitelabelId'), '4')
  props = { entrepreneurId: '42', whitelabelId: '4' }
  const switched = rt.rerender()
  assert.equal(switched.state.status, 'loading')
  assert.equal(hookRelation.companyRelationState(switched), 'loading')
  assert.equal(requestA.aborted, true, 'the previous Entrepreneur request is aborted')
  const requestB = lastRequest()
  assert.equal(requestB.url.pathname, '/api/entrepreneurs/42/company')
  requestA.resolve(json(companyOf(41)))
  await tick()
  assert.equal(rt.rerender().state.status, 'loading', 'a late answer for A never fills B')
  requestB.resolve(json(companyOf(42)))
  await tick()
  const settled = rt.rerender()
  assert.equal(settled.state.status, 'success')
  assert.equal(settled.state.data.entrepreneurId, '42')
  assert.equal(settled.state.data.id, '1042')
  rt.unmount()
})

await check('relationship hook: a populated Company followed by an Entrepreneur without one → loading, then confirmed absence (no carry-over)', async () => {
  const rt = runtime()
  requests.length = 0
  let props = { entrepreneurId: '41', whitelabelId: '4' }
  const view = () => hooks.useEntrepreneurCompany(props.entrepreneurId, props.whitelabelId)
  rt.render(view)
  lastRequest().resolve(json(companyOf(41)))
  await tick()
  assert.equal(hookRelation.companyRelationState(rt.rerender()), 'present')
  props = { entrepreneurId: '43', whitelabelId: '4' }
  const pending = rt.rerender()
  assert.equal(pending.state.status, 'loading', 'the previous Company is not shown for the next Entrepreneur')
  lastRequest().resolve(json({ data: null }))
  await tick()
  const absent = rt.rerender()
  assert.equal(hookRelation.companyRelationState(absent), 'absent')
  assert.equal(absent.state.data, null)
  rt.unmount()
})

await check('relationship hook: delayed response for an earlier Entrepreneur after a newer one settled is ignored (B → A → late B)', async () => {
  const rt = runtime()
  requests.length = 0
  let props = { entrepreneurId: '42', whitelabelId: '4' }
  const view = () => hooks.useEntrepreneurCompany(props.entrepreneurId, props.whitelabelId)
  rt.render(view)
  const requestB = lastRequest()
  props = { entrepreneurId: '41', whitelabelId: '4' }
  rt.rerender()
  const requestA = lastRequest()
  requestA.resolve(json({ data: null }))
  await tick()
  assert.equal(hookRelation.companyRelationState(rt.rerender()), 'absent')
  // The aborted B request can no longer settle; even a forced late value does not change A.
  try { requestB.resolve(json(companyOf(42))) } catch { /* already rejected */ }
  await tick()
  const still = rt.rerender()
  assert.equal(hookRelation.companyRelationState(still), 'absent')
  assert.equal(still.state.data, null)
  rt.unmount()
})

await check('relationship hook: the same Entrepreneur id under another Whitelabel is a different read (tenant in the key)', async () => {
  const rt = runtime()
  requests.length = 0
  let props = { entrepreneurId: '41', whitelabelId: '4' }
  const view = () => hooks.useEntrepreneurCompany(props.entrepreneurId, props.whitelabelId)
  rt.render(view)
  lastRequest().resolve(json(companyOf(41)))
  await tick()
  assert.equal(rt.rerender().state.status, 'success')
  props = { entrepreneurId: '41', whitelabelId: '6' }
  assert.equal(rt.rerender().state.status, 'loading')
  assert.equal(lastRequest().url.searchParams.get('whitelabelId'), '6')
  lastRequest().resolve(json({ code: 'E_ENTREPRENEUR_NOT_FOUND', message: 'synthetic' }, 404))
  await tick()
  assert.equal(hookRelation.companyRelationState(rt.rerender()), 'entrepreneur-not-found')
  rt.unmount()
})

await check('relationship hook: a temporary failure is an error (never absence); retry issues one new GET and recovers', async () => {
  const rt = runtime()
  requests.length = 0
  const view = () => hooks.useEntrepreneurCompany('41', '4')
  rt.render(view)
  lastRequest().resolve(json({ code: 'E_UPSTREAM', message: 'synthetic' }, 503))
  await tick()
  const failed = rt.rerender()
  assert.equal(failed.state.status, 'error')
  assert.equal(hookRelation.companyRelationState(failed), 'error')
  assert.equal(requests.length, 1, 'no automatic retry')
  failed.reload()
  assert.equal(rt.rerender().state.status, 'loading')
  assert.equal(requests.length, 2)
  lastRequest().resolve(json(companyOf(41)))
  await tick()
  assert.equal(hookRelation.companyRelationState(rt.rerender()), 'present')
  rt.unmount()
})

await check('relationship hook: returning to an already-settled key (A → B → A) shows only A’s own answer, never B’s (shared useRemote cache behaviour)', async () => {
  const rt = runtime()
  requests.length = 0
  let props = { entrepreneurId: '41', whitelabelId: '4' }
  const view = () => hooks.useEntrepreneurCompany(props.entrepreneurId, props.whitelabelId)
  rt.render(view)
  lastRequest().resolve(json(companyOf(41)))
  await tick()
  assert.equal(rt.rerender().state.data.entrepreneurId, '41')
  props = { entrepreneurId: '43', whitelabelId: '4' }
  assert.equal(rt.rerender().state.status, 'loading')
  const requestB = lastRequest()
  props = { entrepreneurId: '41', whitelabelId: '4' }
  const back = rt.rerender()
  assert.equal(requestB.aborted, true, 'B is aborted and can never settle into A')
  assert.ok(back.state.status === 'loading' || back.state.data?.entrepreneurId === '41', 'only A’s own answer (or loading) is shown for A')
  rt.unmount()
})
await check('relationship hook: no Entrepreneur → no request (idle), never a guessed id', async () => {
  const rt = runtime()
  requests.length = 0
  assert.equal(rt.render(() => hooks.useEntrepreneurCompany(null, '4')).state.status, 'idle')
  assert.equal(requests.length, 0)
  rt.unmount()
})

await check('detail hook: Company A → B keeps B loading until B answers; A’s late answer is ignored', async () => {
  const rt = runtime()
  requests.length = 0
  let id = '9'
  const view = () => hooks.useCompanyDetail(id)
  rt.render(view)
  const requestA = lastRequest()
  assert.equal(requestA.url.pathname, '/api/companies/9')
  id = '10'
  assert.equal(rt.rerender().state.status, 'loading')
  const requestB = lastRequest()
  assert.equal(requestB.url.pathname, '/api/companies/10')
  assert.equal(requestA.aborted, true)
  requestB.resolve(json(fx.detail({ ...fx.companyDetail, id: 10, entrepreneurId: 42 }, { cardinality: fx.CARDINALITY })))
  await tick()
  const settled = rt.rerender()
  assert.equal(settled.state.data.id, '10')
  assert.equal(settled.state.data.entrepreneurId, '42')
  rt.unmount()
})

await check('list hook: a query change shows loading (never the previous page as current); the previous page is only kept for the pager bound', async () => {
  const rt = runtime()
  requests.length = 0
  let query = { page: 1, search: '', sort: 'createdAt', order: 'desc' }
  const view = () => hooks.useCompanyList(query)
  rt.render(view)
  lastRequest().resolve(json(fx.companyPage([fx.companyRow, fx.companyRowB], { perPage: 10, total: 12, lastPage: 2 })))
  await tick()
  assert.equal(rt.rerender().state.data.rows.length, 2)
  query = { ...query, whitelabelId: '6' }
  const next = rt.rerender()
  assert.equal(next.state.status, 'loading')
  assert.equal(next.lastData.lastPage, 2, 'lastData only keeps the pager in place')
  assert.equal(lastRequest().url.searchParams.get('whitelabelId'), '6')
  lastRequest().resolve(json(fx.companyPage([], { perPage: 10, total: 0, lastPage: 1 })))
  await tick()
  const empty = rt.rerender()
  assert.equal(empty.state.status, 'success')
  assert.equal(empty.state.data.rows.length, 0)
  rt.unmount()
})
await check('every hook request was a GET', () => assert.ok(requests.every((request) => request.method === 'GET')))

/* ---------- the actual relationship / status / switch components (react-dom/server) ---------- */
const { renderToStaticMarkup } = await import('react-dom/server')
const partsUi = await load('src/features/operation/companies/CompanyParts.tsx')
const panelUi = await load('src/features/operation/companies/EntrepreneurCompanyPanel.tsx')
const switchUi = await load('src/features/operation/shared/EntrepreneurViews.tsx')
const reloads = []
const remote = (state) => ({ state, reload: () => reloads.push(1), lastData: null })
const presentCompany = cmp.parseCompanyDetail(fx.detail(fx.companyDetail, { cardinality: fx.CARDINALITY }))
const httpError = (status, code) => new ApiError(status, { code, message: 'synthetic' })
const REMOTES = {
  loading: remote({ status: 'loading' }),
  present: remote({ status: 'success', data: presentCompany }),
  absent: remote({ status: 'success', data: null }),
  'entrepreneur-not-found': remote({ status: 'error', error: httpError(404, 'E_ENTREPRENEUR_NOT_FOUND') }),
}
const ERRORS = {
  '503': { error: httpError(503, 'E_UPSTREAM'), retry: true },
  '500': { error: httpError(500), retry: true },
  '429': { error: httpError(429, 'E_RATE_LIMITED'), retry: true },
  '403': { error: httpError(403, 'E_FORBIDDEN'), retry: false },
  '400': { error: httpError(400, 'E_VALIDATION'), retry: false },
  'other 404': { error: httpError(404, 'E_NOT_FOUND'), retry: false },
  network: { error: new ApiError(0, {}, { kind: 'network' }), retry: true },
  timeout: { error: new ApiError(0, {}, { kind: 'timeout' }), retry: true },
  malformed: { error: new ApiError(200, {}, { kind: 'malformed' }), retry: true },
  'cardinality mismatch': { error: new ApiError(200, { code: 'CARDINALITY_MISMATCH' }, { kind: 'malformed' }), retry: true },
  'identity mismatch': { error: new ApiError(200, { code: 'IDENTITY_MISMATCH' }, { kind: 'malformed' }), retry: true },
}
const visible = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

await check('compact value: Company present → link to the Company by its own id; never "Sem empresa"', () => {
  const html = renderToStaticMarkup(panelUi.CompanyRelationValue({ remote: REMOTES.present }))
  assert.match(html, /href="#\/operation\/companies\/9"/)
  assert.match(html, /data-company-value="present"/)
  assert.ok(html.includes('Synthetic Legal Name Ltda') && !html.includes('Sem empresa'))
})
await check('compact value: confirmed absence → "Sem empresa vinculada" without any link', () => {
  const html = renderToStaticMarkup(panelUi.CompanyRelationValue({ remote: REMOTES.absent }))
  assert.ok(html.includes('Sem empresa vinculada') && !html.includes('<a '))
})
await check('compact value: loading and Entrepreneur-not-found are never "no Company"', () => {
  const loadingHtml = renderToStaticMarkup(panelUi.CompanyRelationValue({ remote: REMOTES.loading }))
  assert.ok(loadingHtml.includes('Carregando') && !loadingHtml.includes('Sem empresa'))
  const missing = renderToStaticMarkup(panelUi.CompanyRelationValue({ remote: REMOTES['entrepreneur-not-found'] }))
  assert.ok(missing.includes('Vínculo não confirmado') && !missing.includes('Sem empresa'))
})
for (const [label, { error }] of Object.entries(ERRORS)) {
  await check(`compact value: ${label} → "Empresa indisponível", never "Sem empresa vinculada"`, () => {
    const html = renderToStaticMarkup(panelUi.CompanyRelationValue({ remote: remote({ status: 'error', error }) }))
    assert.ok(html.includes('Empresa indisponível') && !html.includes('Sem empresa'))
  })
}
for (const variant of ['entrepreneur', 'opportunity']) {
  await check(`panel (${variant}): Company present shows the authoritative record (formatted CNPJ, status, own id, link)`, () => {
    const html = renderToStaticMarkup(panelUi.EntrepreneurCompanyPanel({ remote: REMOTES.present, variant, entrepreneurId: '41' }))
    assert.match(html, /data-company-panel="present"/)
    assert.match(html, /data-company-present="9"/)
    assert.match(html, /data-open-company="9"/)
    assert.ok(html.includes('00.000.000/0001-00') && html.includes('Validação pendente') && html.includes('Synthetic Trade'))
    assert.ok(!html.includes('Sem empresa') && !html.includes('role="alert"'))
    assert.ok(!/R\$|BRL|investid|captado/i.test(visible(html)), 'no financial value is attached to the Company')
  })
  await check(`panel (${variant}): confirmed absence → "Sem empresa vinculada", no synthetic Company, no retry`, () => {
    const html = renderToStaticMarkup(panelUi.EntrepreneurCompanyPanel({ remote: REMOTES.absent, variant, entrepreneurId: '41' }))
    assert.match(html, /data-company-panel="absent"/)
    assert.ok(html.includes('data-company-absent') && html.includes('Sem empresa vinculada'))
    assert.ok(!html.includes('data-company-present') && !html.includes('data-retry') && !html.includes('CNPJ'))
  })
  await check(`panel (${variant}): Entrepreneur not found → "Vínculo não confirmado" (not "no Company")`, () => {
    const html = renderToStaticMarkup(panelUi.EntrepreneurCompanyPanel({ remote: REMOTES['entrepreneur-not-found'], variant, entrepreneurId: '41' }))
    assert.match(html, /data-company-panel="entrepreneur-not-found"/)
    assert.ok(html.includes('data-company-entrepreneur-missing') && html.includes('Vínculo não confirmado') && html.includes('Isto não significa que ele não tenha empresa'))
    assert.ok(!html.includes('Sem empresa vinculada') && !html.includes('data-company-present'))
  })
  await check(`panel (${variant}): loading is busy and shows no Company and no absence`, () => {
    const html = renderToStaticMarkup(panelUi.EntrepreneurCompanyPanel({ remote: REMOTES.loading, variant, entrepreneurId: '41' }))
    assert.match(html, /data-company-panel="loading"/)
    assert.match(html, /aria-busy="true"/)
    assert.ok(!html.includes('Sem empresa') && !html.includes('data-company-present') && !html.includes('role="alert"'))
  })
  for (const [label, { error, retry }] of Object.entries(ERRORS)) {
    await check(`panel (${variant}): ${label} → error ${retry ? 'with' : 'without'} retry; the Company is never declared absent`, () => {
      const html = renderToStaticMarkup(panelUi.EntrepreneurCompanyPanel({ remote: remote({ status: 'error', error }), variant, entrepreneurId: '41' }))
      assert.match(html, /data-company-panel="error"/)
      assert.ok(html.includes('data-company-error') && html.includes('role="alert"') && html.includes('A empresa não é dada como inexistente.'))
      assert.ok(!html.includes('Sem empresa vinculada') && !html.includes('data-company-present'))
      assert.equal(html.includes('data-retry'), retry)
    })
  }
}
await check('panel: a non-specific 404 never claims that a record "does not exist" (nothing was confirmed)', () => {
  const html = renderToStaticMarkup(panelUi.EntrepreneurCompanyPanel({ remote: remote({ status: 'error', error: httpError(404, 'E_NOT_FOUND') }), variant: 'entrepreneur', entrepreneurId: '41' }))
  assert.ok(html.includes('nem o empreendedor nem a empresa foram confirmados') && !html.includes('não existe') && !html.includes('Sem empresa vinculada'))
})
await check('panel copy: the Opportunity variant names the Entrepreneur’s Company, never an Opportunity Company', () => {
  const html = renderToStaticMarkup(panelUi.EntrepreneurCompanyPanel({ remote: REMOTES.present, variant: 'opportunity', entrepreneurId: '41' }))
  assert.ok(html.includes('Empresa do empreendedor responsável') && html.includes('O contrato de Oportunidades não traz empresa') && html.includes('empreendedor #41'))
  assert.ok(!/empresa da oportunidade/i.test(visible(html)))
})
await check('panel: missing names use the neutral fallback (never the Entrepreneur name); missing trade name / CNPJ are "Não informado"', () => {
  const nameless = cmp.parseCompanyDetail(fx.detail({ ...fx.companyDetail, legalName: null, tradeName: null, cnpj: null }, { cardinality: fx.CARDINALITY }))
  const html = renderToStaticMarkup(panelUi.EntrepreneurCompanyPanel({ remote: remote({ status: 'success', data: nameless }), variant: 'entrepreneur', entrepreneurId: '41' }))
  assert.ok(html.includes(present.COMPANY_NAME_FALLBACK) && (html.match(/Não informado/g) ?? []).length >= 2)
})
await check('status badge: documented tokens labelled with text (never colour alone); unknown tokens shown as sent, neutral', () => {
  const expected = { pending: 'Validação pendente', validated: 'Validada', invalid: 'Inválida', not_found: 'Não encontrada na validação', unavailable: 'Validação indisponível' }
  for (const [token, label] of Object.entries(expected)) assert.ok(renderToStaticMarkup(partsUi.CompanyStatusBadge({ status: token })).includes(label))
  const raw = renderToStaticMarkup(partsUi.CompanyStatusBadge({ status: 'ANY_FUTURE_VALUE' }))
  assert.ok(raw.includes('ANY_FUTURE_VALUE') && raw.includes('data-tone="neutral"'))
  assert.ok(renderToStaticMarkup(partsUi.CompanyStatusBadge({ status: 'constructor' })).includes('constructor'), 'inherited keys are not labels')
})
await check('relationship state: only http 404 + E_ENTREPRENEUR_NOT_FOUND is "Entrepreneur not found"', () => {
  assert.equal(relation.companyRelationState(remote({ status: 'error', error: httpError(404, 'E_ENTREPRENEUR_NOT_FOUND') })), 'entrepreneur-not-found')
  assert.equal(relation.companyRelationState(remote({ status: 'error', error: httpError(404, 'E_COMPANY_NOT_FOUND') })), 'error')
  assert.equal(relation.companyRelationState(remote({ status: 'error', error: new ApiError(404, { code: 'E_ENTREPRENEUR_NOT_FOUND' }, { kind: 'malformed' }) })), 'error')
  assert.equal(relation.companyRelationState(remote({ status: 'idle' })), 'loading')
})
for (const current of ['companies', 'entrepreneurs']) {
  await check(`view switch (${current}): exactly one current link, plain navigation, no prototype wording`, () => {
    const html = renderToStaticMarkup(switchUi.EntrepreneurViewSwitch({ current }))
    assert.equal((html.match(/aria-current="page"/g) ?? []).length, 1)
    assert.ok(html.includes(`data-view-link="${current}" aria-current="page"`) || new RegExp(`aria-current="page"[^>]*data-view-link="${current}"`).test(html) || html.includes(`aria-current="page" data-view-link="${current}"`))
    assert.ok(!/role="tab|role="button/.test(html) && !/Protótipo|ilustrativ/i.test(html))
    assert.ok(html.includes('href="#/operation/entrepreneurs"') && html.includes('href="#/operation/companies"'))
  })
}

/* ---------- fixture hygiene (synthetic only) ---------- */
function cnpjCheckDigitsValid(value) {
  const digits = value.split('').map(Number)
  const calc = (length) => {
    const weights = length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const sum = weights.reduce((total, weight, index) => total + weight * digits[index], 0)
    const rest = sum % 11
    return rest < 2 ? 0 : 11 - rest
  }
  return calc(12) === digits[12] && calc(13) === digits[13]
}
await check('fixtures: every CNPJ is 14 digits with INVALID check digits (not issuable); contacts use reserved domains; no real Whitelabel names', async () => {
  // Validator self-test on a value whose check digits are computed here (no real CNPJ literal in the repository).
  const base = '987654320001'
  const withDigit = (digits) => {
    const weights = digits.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const rest = weights.reduce((total, weight, index) => total + weight * Number(digits[index]), 0) % 11
    return digits + (rest < 2 ? 0 : 11 - rest)
  }
  assert.ok(cnpjCheckDigitsValid(withDigit(withDigit(base))), 'the validator recognises valid check digits')
  assert.ok(!cnpjCheckDigitsValid(`${base}00`), 'the validator rejects invalid check digits')
  const source = await readFile(resolve(root, 'scripts/fixtures/opportunities-companies-fixtures.mjs'), 'utf8')
  const cnpjs = [fx.companyRow, fx.companyRowB, fx.companyDetail].map((row) => row.cnpj)
  for (const value of cnpjs) assert.ok(/^\d{14}$/.test(value) && !cnpjCheckDigitsValid(value), value)
  for (const match of source.matchAll(/[\w.+-]+@([\w.-]+)/g)) assert.match(match[1], /^example\.(invalid|test)$/)
  assert.ok(!/Finapop|Loor|Nova Plataforma|Cerrado|Sertão/i.test(source))
})

/* ---------- route state ---------- */
await check('route: valid state parses; previa is reported and never applied', () => {
  const parsed = route.parseCompanyRoute({ whitelabel: '4', status: 'validated', page: '2', search: '  Bravo ', sort: 'legalName', order: 'asc', previa: 'erro' })
  assert.deepEqual(parsed.state, { whitelabelId: '4', status: 'validated', page: 2, search: 'Bravo', sort: 'legalName', order: 'asc' })
  assert.equal(parsed.ignored.length, 1)
  assert.match(parsed.ignored[0], /prévia/)
})
await check('route: invalid values (prototype Whitelabel slug, unknown status / sort, page 0) are reported and dropped', () => {
  const parsed = route.parseCompanyRoute({ whitelabel: 'wl_proto_cmp_beta', status: 'approved', page: '0', sort: 'tradeName', order: 'up' })
  assert.equal(parsed.ignored.length, 5)
  assert.deepEqual(parsed.state, { whitelabelId: undefined, status: undefined, page: 1, search: '', sort: 'createdAt', order: 'desc' })
})
const context = route.companiesHref({ whitelabelId: '4', status: 'pending', page: 2, search: 'Bravo', sort: 'cnpj', order: 'asc' })
await check('route: list href mirrors the documented query; detail href carries the list context; it survives reload', () => {
  assert.equal(context, '#/operation/companies?whitelabel=4&status=pending&search=Bravo&sort=cnpj&order=asc&page=2')
  const detailHref = route.companyHref('9', context)
  assert.ok(detailHref.startsWith('#/operation/companies/9?returnTo='))
  assert.equal(route.companyListReturnHash(new URLSearchParams(detailHref.split('?')[1]).get('returnTo')), context)
  assert.equal(route.companyHref('9'), '#/operation/companies/9')
})
await check('route: only the Companies list is a return destination; unsafe or foreign targets fail closed', () => {
  for (const unsafe of ['#/operation/entrepreneurs/1', 'https://example.invalid/#/operation/companies', 'javascript:alert(1)', '#/operation/companies/9', '#/operation/companies-evil', '//example.invalid', '#/operation/companies?returnTo=https://example.invalid']) {
    assert.equal(route.companyListReturnHash(unsafe), '#/operation/companies', unsafe)
  }
  assert.equal(route.companyListReturnHash('#/operation/companies?whitelabel=x&previa=erro&status=nope'), '#/operation/companies', 'invalid values never survive the return trip')
})

/* ---------- page frame: Companies stays under Empreendedores (breadcrumb baseline 075809e) ---------- */
const shellPath = 'src/features/operation/shared/OperationUi.tsx'
function shellUnderTest(source) {
  const ast = ts.createSourceFile('OperationUi.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const declarations = ast.statements.filter((node) =>
    (ts.isFunctionDeclaration(node) && node.name?.text === 'OperationShell') ||
    (ts.isVariableStatement(node) && node.declarationList.declarations.some((item) => item.name.getText(ast) === 'SECTION_LABEL')),
  )
  assert.equal(declarations.length, 2, 'Exact page-frame declarations must be exercised')
  return 'const AppShell="app-shell", QueuedNotice="queued-notice", DotMatrixBackground="dot-matrix"; const styles={page:"page",layout:"layout"};\n' +
    declarations.map((node) => ts.createPrinter().printNode(ts.EmitHint.Unspecified, node, ast)).join('\n')
}
const currentShell = await load(shellPath, shellUnderTest(await readFile(resolve(root, shellPath), 'utf8')))
const baselineShell = await load(shellPath, shellUnderTest(execFileSync('git', ['show', '075809e:src/features/operation/shared/OperationUi.tsx'], { cwd: root, encoding: 'utf8' })))
await check('page frame: prior Operation breadcrumb callers keep the exact baseline behaviour', () => {
  for (const section of ['entrepreneurs', 'investors', 'opportunities']) {
    for (const trail of [[], ['Não encontrado'], ['ID 17'], ['Nome longo', 'Editar']]) {
      const props = { section, title: 'Example', trail, children: null }
      assert.equal(JSON.stringify(currentShell.OperationShell(props).props.breadcrumbs), JSON.stringify(baselineShell.OperationShell(props).props.breadcrumbs))
    }
  }
})
await check('page frame: the Companies trail inserts its safe list link without changing section ownership', () => {
  const crumbs = currentShell.OperationShell({ section: 'entrepreneurs', title: 'Empresas', trail: [{ label: 'Empresas', href: route.companyListReturnHash(context) }, 'Example'], children: null }).props.breadcrumbs
  assert.equal(crumbs[2].href, context)
  assert.equal(crumbs.at(-1).label, 'Example')
  assert.ok(crumbs.filter((item) => item.href).every((item) => item.href.startsWith('#/operation/')))
})

/* ---------- AST detectors (proved with planted violations, no production file changed) ---------- */
function requestIdentifiers(source, fileName = 'fixture.tsx') {
  const ast = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const found = new Set()
  const visit = (node) => {
    if (ts.isIdentifier(node) && /^(fetch|authenticatedGet|authenticatedPost|authenticatedPatch|authenticatedPut|authenticatedDelete|apiRequest|XMLHttpRequest|sendBeacon|WebSocket|EventSource)$/.test(node.text)) found.add(node.text)
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && /(^|\/)(axios|ky|superagent|ofetch|companiesApi)(\/|$)/i.test(node.moduleSpecifier.text)) found.add(node.moduleSpecifier.text)
    if (ts.isImportDeclaration(node) && /(^|\/)lib\/api$/.test(node.moduleSpecifier.text) && node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)
      && node.importClause.namedBindings.elements.some((item) => (item.propertyName ?? item.name).text === 'apiRequest')) found.add('apiRequest')
    ts.forEachChild(node, visit)
  }
  visit(ast)
  return found
}
function hasForbiddenMenuId(source) {
  const ast = ts.createSourceFile('menu.ts', source, ts.ScriptTarget.Latest, true)
  let found = false
  const visit = (node) => { if (ts.isStringLiteralLike(node) && node.text === 'operation-companies') found = true; ts.forEachChild(node, visit) }
  visit(ast)
  return found
}
await check('detectors: planted transports / aliases are caught; comments and quoted examples are not', () => {
  for (const violation of ['fetch("/companies")', 'window.fetch("/companies")', 'const { fetch: request } = window', 'import request from "axios"; request.get("/companies")',
    'import { authenticatedGet as get } from "./apiClient"', 'import { apiRequest as r } from "../../../lib/api"', 'new XMLHttpRequest()', 'navigator.sendBeacon("/companies", "")']) {
    assert.ok(requestIdentifiers(violation).size > 0, violation)
  }
  assert.equal(requestIdentifiers('// fetch("/companies")\nconst explanation = "fetch(/companies) is unavailable"').size, 0)
  assert.ok(hasForbiddenMenuId('const nav = { id: "operation-companies" }') && !hasForbiddenMenuId('// never add operation-companies'))
})

/* ---------- source boundaries ---------- */
const dir = resolve(root, 'src/features/operation/companies')
const files = (await readdir(dir)).filter((name) => /\.(ts|tsx)$/.test(name)).sort()
await check('Companies module: exactly the reviewed authoritative files (prototype / contract-candidate files removed)', () => {
  assert.deepEqual(files, ['CompaniesPage.tsx', 'CompanyDetailPage.tsx', 'CompanyParts.tsx', 'EntrepreneurCompanyPanel.tsx', 'companyApi.ts', 'companyPresent.ts', 'companyRelation.ts', 'companyRoute.ts', 'useCompanyData.ts'])
})
const ALLOWED_EXTERNAL = {
  '../shared/businessPresentation': ['formatPhone'],
  '../entrepreneurs/entrepreneurRoute': ['entrepreneurHref'],
  '../../whitelabels/whitelabelApi': ['formatWhitelabelDate', 'WhitelabelRecord'],
  '../../whitelabel-accounts/accountModel': ['BusinessTone'],
  '../../whitelabel-accounts/AccountBadges': ['BusinessBadge'],
  '../../../lib/api': ['ApiError'],
  '../../../lib/apiClient': ['authenticatedGet'],
  '../../../lib/useRemoteResource': ['useRemote'],
  '../shared/whitelabelContext': ['useWhitelabelOptions', 'useWhitelabelRecord'],
  '../shared/readErrors': ['operationReadErrorView'],
  '../shared/coreIds': ['isPositiveCoreId'],
  '../shared/operationActivity': ['addOperationActivity'],
  '../shared/operationModel': ['crumbLabel'],
}
for (const name of files) {
  const source = await readFile(resolve(dir, name), 'utf8')
  const code = ts.transpileModule(source, {
    fileName: name,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.Preserve, removeComments: true },
  }).outputText
  await check(`${name}: request code only in the adapter (authenticatedGet), nowhere else`, () => {
    assert.deepEqual([...requestIdentifiers(source, name)], name === 'companyApi.ts' ? ['authenticatedGet'] : [])
  })
  await check(`${name}: no browser storage, no session access, no prototype join, no reused foreign state vocabulary`, () => {
    assert.ok(!/sessionStorage|localStorage|indexedDB|readSession|authSession/.test(code))
    assert.ok(!/prototype|_proto_|participants'|opportunityStore|financeCoreRecords|PROTOTYPE_/i.test(code))
    assert.ok(!/businessState|accessState|kycStatus|COMPANY_VALIDATION_META|ProvenanceNotice|previewState/.test(code))
  })
  for (const match of source.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+'([^']+)'/g)) {
    const specifier = match[2]
    if (specifier.startsWith('./') || /\.css$|^react$|^lucide-react$|components\/(ui|shell)\/|app\/(routeQuery|useUrlSearchDraft)$|shared\/(OperationUi|EntrepreneurViews|WindowedPagination)$/.test(specifier)) continue
    await check(`${name}: only reviewed names from ${specifier}`, () => {
      assert.ok(Object.hasOwn(ALLOWED_EXTERNAL, specifier), `unreviewed import ${specifier}`)
      const names = match[1].split(',').map((part) => part.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0]).filter(Boolean)
      assert.ok(names.every((item) => ALLOWED_EXTERNAL[specifier].includes(item)), names.join(', '))
    })
  }
}
const listPage = await readFile(resolve(dir, 'CompaniesPage.tsx'), 'utf8')
const detailPage = await readFile(resolve(dir, 'CompanyDetailPage.tsx'), 'utf8')
await check('screens: the sidebar keeps the stable Empreendedores item (section="entrepreneurs") on list and every detail state', () => {
  assert.equal((listPage.match(/section="entrepreneurs"/g) ?? []).length, 1)
  assert.equal((detailPage.match(/<OperationShell /g) ?? []).length, (detailPage.match(/<OperationShell section="entrepreneurs"/g) ?? []).length)
})
await check('screens: no Company CRUD, no financial values, other domains explicitly unavailable', () => {
  assert.ok(!/onClick=\{[^}]*(create|edit|delete|remove|save|approve|deny)/i.test(listPage + detailPage))
  assert.ok(!/R\$|BRL|currency|formatMoney|investedAmount|fundraisingProgress/.test(listPage + detailPage))
  assert.ok(detailPage.includes('Outros domínios') && detailPage.includes('Indisponível') && detailPage.includes('Aguardando integração do KYC'))
})
await check('screens: failure is never empty — the empty states render only on success with zero rows', () => {
  const code = listPage.replace(/\s+/g, ' ')
  assert.ok(code.includes('!listError && data && !loading && data.rows.length === 0'))
  assert.ok(code.includes("data-list-empty={filtersActive ? 'filtered' : 'list'}"))
  assert.ok(code.includes('{listError ? ( <div className={states.feedback} role="alert" data-list-error>'))
})
await check('detail: authorized phone is formatted in full, CNPJ only formatted, relationships linked by the Company’s own fields', () => {
  assert.ok(detailPage.includes('formatPhone(company.phone)'))
  assert.ok(detailPage.includes('formatCnpj(company.cnpj)'))
  assert.ok(detailPage.includes('entrepreneurHref(company.entrepreneurId)'))
  assert.ok(!/entrepreneurHref\(company\.id\)|whitelabels\?id=\$\{[^}]*company\.id/.test(detailPage), 'Company id is never used as another entity id')
})
const entrepreneurApiSource = await readFile(resolve(root, 'src/features/operation/entrepreneurs/entrepreneurApi.ts'), 'utf8')
await check('Entrepreneur adapter is unchanged by Companies (no Company export or /company path there)', () => {
  assert.ok(!/export[^\n]*Compan|\/compan/i.test(entrepreneurApiSource))
})
await check('Entrepreneur list: no per-row Company read (no N+1); Entrepreneur profile: exactly the relationship hook and panel', async () => {
  const listSource = await readFile(resolve(root, 'src/features/operation/entrepreneurs/EntrepreneursPage.tsx'), 'utf8')
  assert.ok(!/from\s+'[^']*companies\//.test(listSource))
  const profile = await readFile(resolve(root, 'src/features/operation/entrepreneurs/EntrepreneurDetailPage.tsx'), 'utf8')
  const imports = [...profile.matchAll(/import\s+\{([^}]*)\}\s+from\s+'(\.\.\/companies\/[^']+)'/g)].map((match) => `${match[2]}:${match[1].trim()}`).sort()
  assert.deepEqual(imports, ['../companies/companyRoute:companyHref'])
  assert.equal((profile.match(/useEntrepreneurCompany\(/g) ?? []).length, 0)
  assert.ok(profile.includes('useEntrepreneurOverview(entrepreneurId)'))
  assert.ok(profile.includes('companyHref(c.id'))
})
const navigation = await readFile(resolve(root, 'src/components/shell/navigation.ts'), 'utf8')
await check('navigation: no Companies entry in the shared navigation / menu configuration', () => {
  assert.ok(!/compan|empresa/i.test(ts.transpileModule(navigation, { compilerOptions: { removeComments: true } }).outputText))
})
async function walk(path) {
  const out = []
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const full = resolve(path, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(full)))
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full)
  }
  return out
}
await check('no operation-companies menu id anywhere in src', async () => {
  for (const file of await walk(resolve(root, 'src'))) assert.ok(!hasForbiddenMenuId(await readFile(file, 'utf8')), file)
})
const app = await readFile(resolve(root, 'src/app/App.tsx'), 'utf8')
await check('App: list and detail routes exist; list params reach the page; detail is keyed by the Company id', () => {
  assert.ok(app.includes("path === 'operation/companies'") && app.includes('COMPANY_PATH'))
  assert.ok(app.includes('<CompaniesPage {...route.params} />'))
  assert.ok(app.includes('<CompanyDetailPage key={route.companyId} companyId={route.companyId} returnTo={route.returnTo}'))
})
await check('removed: the prototype contract candidate, prototype source and a parallel companiesApi', async () => {
  for (const file of ['companyContract.ts', 'prototypeCompanies.ts', 'companiesApi.ts']) await assert.rejects(access(resolve(dir, file)))
})
await check('docs: the integration doc states the read-only integration; the prototype doc is marked superseded', async () => {
  const doc = await readFile(resolve(root, 'docs/opportunities-companies-read-integration-v1.md'), 'utf8')
  assert.ok(doc.includes('OPPORTUNITIES + COMPANIES READ INTEGRATION V1') && doc.includes('READ-ONLY'))
  for (const section of ['## A.', '## B.', '## C.', '## D.', '## E.', '## F.', '## G.', '## H.', '## I.']) assert.ok(doc.includes(section), section)
  const prototypeDoc = await readFile(resolve(root, 'docs/companies-frontend-v1.md'), 'utf8')
  assert.match(prototypeDoc.split('\n').slice(0, 12).join('\n'), /SUPERSEDED/)
})
await check('every request in this suite was a GET', () => assert.ok(requests.every((request) => request.method === 'GET')))

console.log(`Companies Frontend — authoritative read boundaries: ${checks} passed (synthetic fixtures, GET-only fetch double, no network, no business writes)`)
