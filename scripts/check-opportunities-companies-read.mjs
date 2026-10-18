import assert from 'node:assert/strict'
import { access, readdir, readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'
import * as fx from './fixtures/opportunities-companies-fixtures.mjs'

// Opportunities + Companies Read Integration V1 — adapter, relationship, presentation, route and
// boundary contracts. In-memory only: an injected fetch double records every request (any non-GET
// fails the run), synthetic fixtures, no browser, no real token and no network.
// OPPORTUNITIES / COMPANIES READ: INTEGRATED (GET only). BUSINESS WRITES: NOT IMPLEMENTED.
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

const storage = new Map()
globalThis.sessionStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
}
globalThis.window = { setTimeout, clearTimeout, location: { hash: '' } }
const requests = []
let fetchImpl = async () => { throw new Error('Unexpected unit request') }
globalThis.fetch = (url, init = {}) => {
  const record = { url: new URL(String(url)), method: (init.method ?? 'GET').toUpperCase(), headers: { ...(init.headers ?? {}) }, body: init.body }
  requests.push(record)
  if (record.method !== 'GET') throw new Error(`Opportunities / Companies read issued a ${record.method}`)
  return fetchImpl(record.url, init)
}

const auth = await load('src/lib/authSession.ts')
const { ApiError } = await load('src/lib/api.ts')
const opp = await load('src/features/operation/opportunities/opportunityApi.ts')
const oppView = await load('src/features/operation/opportunities/opportunityPresent.ts')
const oppRoute = await load('src/features/operation/opportunities/opportunityRoute.ts')
const cmp = await load('src/features/operation/companies/companyApi.ts')
const cmpView = await load('src/features/operation/companies/companyPresent.ts')
const cmpRoute = await load('src/features/operation/companies/companyRoute.ts')
const relation = await load('src/features/operation/companies/companyRelation.ts')
const errors = await load('src/features/operation/shared/readErrors.ts')
const ids = await load('src/features/operation/shared/coreIds.ts')

const operator = { id: 'synthetic-operator', name: 'Unit QA', email: 'qa@example.invalid', roles: ['SUPPORT_ADMIN'] }
const session = () => ({ accessToken: 'synthetic-unit-token-o', tokenType: 'Bearer', operator })
const json = (value, status = 200) => new Response(JSON.stringify(value), { status })
const reset = () => { auth.clearSession(); auth.clearAuthNotice(); window.location.hash = ''; requests.length = 0; auth.persistSession(session()) }
const rejectedWith = (code) => (error) => error instanceof ApiError && error.kind === 'malformed' && error.code === code
const isMalformed = (error) => error instanceof ApiError && error.kind === 'malformed'
const keys = (request) => [...request.url.searchParams.keys()]
const listOpp = (overrides = {}) => opp.listOpportunities({ page: 1, search: '', sort: 'createdAt', order: 'desc', ...overrides })
const listCmp = (overrides = {}) => cmp.listCompanies({ page: 1, search: '', sort: 'createdAt', order: 'desc', ...overrides })
let checks = 0
async function check(name, action) {
  try { await action(); checks += 1 } catch (cause) { throw new Error(`Failed: ${name}`, { cause }) }
}

/* ---------- identifiers ---------- */
await check('Core ids: positive safe integers only (prototype ids, 0, negatives, floats, unsafe never sent)', () => {
  for (const id of ['1', '701', '9007199254740991']) assert.equal(ids.isPositiveCoreId(id), true)
  for (const id of ['0', '-1', '1.5', 'abc', '', 'opp_proto_001', 'cmp_proto_101', '9007199254740992', '1'.repeat(17), undefined]) assert.equal(ids.isPositiveCoreId(id), false)
})

/* ---------- Opportunities: parsing ---------- */
await check('opportunity row: ids as strings, tokens kept, classification dimensions independent', () => {
  const row = opp.parseOpportunity(fx.opportunityRow)
  assert.deepEqual([row.id, row.whitelabelId, row.entrepreneurId], ['701', '4', '41'])
  assert.equal(row.status, 'active'); assert.equal(row.modality, 'debt')
  assert.deepEqual(row.segment, { id: '3', name: 'Capital de Giro' })
  assert.deepEqual(row.resourceUse, { code: 'working_capital', name: 'Capital de giro' })
  assert.equal(row.fundraisingCompletion, null); assert.equal(row.isPrivate, false); assert.equal(row.endedAt, null)
})
await check('opportunity row: the contract has no money / investment / company field and none is invented', () => {
  const row = opp.parseOpportunity({ ...fx.opportunityRow, amountCents: 100, investedAmount: 5, investorsCount: 3, progress: 0.5, company: { id: 9 } })
  assert.equal(Object.keys(row).some((key) => /amount|invest|progress|compan|cnpj|money|value|total/i.test(key)), false)
})
await check('opportunity row: unknown status / modality tokens are kept as sent, never converted', () => {
  const row = opp.parseOpportunity({ ...fx.opportunityRow, status: 'future_state', modality: 'hybrid' })
  assert.equal(row.status, 'future_state'); assert.equal(row.modality, 'hybrid')
  assert.deepEqual(oppView.opportunityStatusMeta('future_state'), { label: 'future_state', tone: 'muted' })
  assert.equal(oppView.modalityLabel('hybrid'), 'hybrid')
})
await check('opportunity row: missing display fields → null, never invented', () => {
  const row = opp.parseOpportunity({ id: 1, whitelabelId: 2, entrepreneurId: 3, status: 'review', modality: 'equity' })
  for (const field of ['name', 'businessName', 'segment', 'resourceUse', 'dueAt', 'openedAt', 'createdAt', 'isPrivate', 'fundraisingCompletion']) assert.equal(row[field], null, field)
  assert.equal(oppView.opportunityName(row), 'Oportunidade sem nome informado (#1)')
})
for (const bad of [
  { ...fx.opportunityRow, id: 'opp_proto_001' }, { ...fx.opportunityRow, id: 0 }, { ...fx.opportunityRow, whitelabelId: null },
  { ...fx.opportunityRow, entrepreneurId: '41' }, { ...fx.opportunityRow, status: '' }, { ...fx.opportunityRow, modality: null }, null, [],
]) {
  await check('opportunity identity / status / modality are strict', () => assert.throws(() => opp.parseOpportunity(bad), isMalformed))
}
await check('opportunity detail: wrapper required, extra fields parsed, quotas are a count', () => {
  const parsed = opp.parseOpportunityDetail(fx.detail(fx.opportunityDetail))
  assert.equal(parsed.description, 'Synthetic description.'); assert.equal(parsed.about, null); assert.equal(parsed.quotaQuantity, 100); assert.equal(parsed.reasonForArchiving, null)
  assert.equal(opp.parseOpportunityDetail(fx.detail({ ...fx.opportunityDetail, quotaQuantity: 1.5 })).quotaQuantity, null)
  assert.throws(() => opp.parseOpportunityDetail(fx.opportunityDetail), isMalformed)
})
for (const [label, body] of [
  ['missing meta', { data: [fx.opportunityRow] }],
  ['rows beyond total', fx.page([fx.opportunityRow, { ...fx.opportunityRow, id: 702 }], { total: 1 })],
  ['empty page inside range', fx.page([], { total: 5 })],
  ['lastPage inconsistent', fx.page([fx.opportunityRow], { total: 45, lastPage: 1 })],
  ['duplicate identities', fx.page([fx.opportunityRow, fx.opportunityRow], { total: 2 })],
  ['more rows than perPage', fx.page([fx.opportunityRow, { ...fx.opportunityRow, id: 702 }], { perPage: 1, total: 2, lastPage: 2 })],
  ['page zero', fx.page([fx.opportunityRow], { page: 0 })],
  ['direct array', [fx.opportunityRow]],
]) {
  await check(`malformed opportunity list fails closed: ${label}`, async () => {
    reset(); fetchImpl = async () => json(body)
    await assert.rejects(listOpp(), isMalformed)
  })
}
await check('opportunity list: page past the end (unclamped) is accepted as an empty page', async () => {
  reset(); fetchImpl = async () => json(fx.page([], { page: 9, total: 78, lastPage: 4 }))
  const result = await listOpp({ page: 9 })
  assert.equal(result.page, 9); assert.equal(result.lastPage, 4); assert.equal(result.rows.length, 0)
})
await check('opportunity list: a page / page size other than requested is rejected (PAGE_MISMATCH), never shown under the wrong number', async () => {
  reset(); fetchImpl = async () => json(fx.page([fx.opportunityRow], { page: 1, total: 45, lastPage: 3 }))
  await assert.rejects(listOpp({ page: 3 }), rejectedWith('PAGE_MISMATCH'))
  fetchImpl = async () => json(fx.page([fx.opportunityRow], { perPage: 10, total: 1 }))
  await assert.rejects(listOpp(), rejectedWith('PAGE_MISMATCH'))
  fetchImpl = async () => json(fx.page([fx.opportunityRow], { perPage: 1, total: 45, lastPage: 45 }))
  assert.equal((await listOpp({ perPage: 1 })).total, 45, 'the perPage=1 count reads still match')
})

/* ---------- Opportunities: exact query, scope, detail ---------- */
await check('opportunity list: documented defaults, perPage 20, empty search omitted', async () => {
  reset(); fetchImpl = async () => json(fx.page([fx.opportunityRow], { page: 2, total: 21, lastPage: 2 }))
  await listOpp({ page: 2 })
  const [request] = requests
  assert.equal(request.url.pathname, '/api/opportunities'); assert.equal(request.method, 'GET')
  assert.deepEqual(Object.fromEntries(request.url.searchParams), { page: '2', perPage: '20', sort: 'createdAt', order: 'desc' })
  assert.equal(request.headers.Authorization, 'Bearer synthetic-unit-token-o')
  assert.ok(request.headers['X-Correlation-ID'])
})
await check('opportunity list: every filter maps to its documented key; entrepreneurId / per_page never sent', async () => {
  reset(); fetchImpl = async () => json(fx.page([fx.opportunityRow]))
  await listOpp({ search: 'A&B', whitelabelId: '4', status: 'active', modality: 'debt', sort: 'dueAt', order: 'asc' })
  assert.deepEqual(keys(requests[0]), ['page', 'perPage', 'search', 'whitelabelId', 'status', 'modality', 'sort', 'order'])
  assert.equal(requests[0].url.searchParams.get('search'), 'A&B')
  for (const forbidden of ['entrepreneurId', 'per_page', 'empreendedor']) assert.equal(requests[0].url.searchParams.has(forbidden), false)
  assert.deepEqual([...opp.OPPORTUNITY_SORT_KEYS], ['createdAt', 'updatedAt', 'name', 'status', 'dueAt'])
  assert.deepEqual([...opp.OPPORTUNITY_STATUSES], ['review', 'active', 'finished', 'archived'])
  assert.deepEqual([...opp.OPPORTUNITY_MODALITIES], ['equity', 'debt'])
})
for (const [label, filter, row] of [
  ['Whitelabel', { whitelabelId: '4' }, { ...fx.opportunityRow, whitelabelId: 6 }],
  ['status', { status: 'active' }, { ...fx.opportunityRow, status: 'finished' }],
  ['modality', { modality: 'debt' }, { ...fx.opportunityRow, modality: 'equity' }],
]) {
  await check(`opportunity list: a row outside the applied ${label} filter rejects the page (SCOPE_MISMATCH)`, async () => {
    reset(); fetchImpl = async () => json(fx.page([fx.opportunityRow, { ...row, id: 799 }], { total: 2 }))
    await assert.rejects(listOpp(filter), rejectedWith('SCOPE_MISMATCH'))
  })
}
await check('opportunity detail: id must match; 404 E_OPPORTUNITY_NOT_FOUND → not-found view', async () => {
  reset(); fetchImpl = async () => json(fx.detail({ ...fx.opportunityDetail, id: 702 }))
  await assert.rejects(opp.getOpportunity('701'), rejectedWith('IDENTITY_MISMATCH'))
  fetchImpl = async () => json(fx.detail(fx.opportunityDetail))
  assert.equal((await opp.getOpportunity('701')).id, '701'); assert.equal(requests.at(-1).url.pathname, '/api/opportunities/701')
  fetchImpl = async () => json({ statusCode: 404, code: 'E_OPPORTUNITY_NOT_FOUND', message: 'Opportunity not found' }, 404)
  await assert.rejects(opp.getOpportunity('701'), (error) => errors.operationReadErrorView(error, 'a oportunidade').notFound === true)
})

/* ---------- Companies: parsing ---------- */
await check('company row: ids as strings, CNPJ kept as sent, status token kept', () => {
  const row = cmp.parseCompany(fx.companyRow)
  assert.deepEqual([row.id, row.entrepreneurId, row.whitelabelId], ['9', '41', '4'])
  assert.equal(row.cnpj, '00000000000100'); assert.equal(row.status, 'pending')
  assert.equal(cmp.parseCompany({ ...fx.companyRow, status: 'future_state' }).status, 'future_state')
  assert.equal(cmp.parseCompany(fx.companyRowB).tradeName, null)
})
for (const bad of [{ ...fx.companyRow, id: 'cmp_proto_101' }, { ...fx.companyRow, entrepreneurId: null }, { ...fx.companyRow, whitelabelId: 0 }, { ...fx.companyRow, status: '' }, null]) {
  await check('company identity / relationship / status are strict', () => assert.throws(() => cmp.parseCompany(bad), isMalformed))
}
await check('company detail: wrapper required, contact and validation fields parsed', () => {
  const parsed = cmp.parseCompanyDetail(fx.detail(fx.companyDetail, { cardinality: fx.CARDINALITY }))
  assert.equal(parsed.email, 'company@example.invalid'); assert.equal(parsed.phone, '11900000041'); assert.equal(parsed.validationSource, null)
  assert.throws(() => cmp.parseCompanyDetail(fx.companyDetail), isMalformed)
})
await check('documented cardinality 0..1: accepted when present or absent; a different model is rejected', () => {
  assert.equal(cmp.parseCompanyList(fx.companyPage([fx.companyRow])).rows.length, 1)
  assert.equal(cmp.parseCompanyList(fx.page([fx.companyRow])).rows.length, 1)
  for (const cardinality of [{ ...fx.CARDINALITY, entrepreneurToCompany: '0..N' }, { ...fx.CARDINALITY, companyToEntrepreneur: '0..1' }, 'x']) {
    assert.throws(() => cmp.parseCompanyList({ ...fx.companyPage([fx.companyRow]), cardinality }), rejectedWith('CARDINALITY_MISMATCH'))
  }
})
await check('two Companies for one Entrepreneur in a page contradict 0..1 (CARDINALITY_MISMATCH)', () =>
  assert.throws(() => cmp.parseCompanyList(fx.companyPage([fx.companyRow, { ...fx.companyRowB, entrepreneurId: 41 }], { total: 2 })), rejectedWith('CARDINALITY_MISMATCH')))
await check('company identities are independent namespaces (equal numbers do not merge records)', () => {
  const coinciding = cmp.parseCompany({ ...fx.companyRow, id: 41, entrepreneurId: 41, whitelabelId: 41 })
  assert.deepEqual([coinciding.id, coinciding.entrepreneurId, coinciding.whitelabelId], ['41', '41', '41'])
  assert.equal(cmpView.companyDisplayName({ legalName: null, tradeName: null }), 'Empresa sem razão social informada')
})

/* ---------- Companies: exact query, scope, detail ---------- */
await check('company list: documented params only (search, whitelabelId, status, sort, order), perPage 10', async () => {
  reset(); fetchImpl = async () => json(fx.companyPage([fx.companyRow]))
  await listCmp()
  assert.deepEqual(Object.fromEntries(requests[0].url.searchParams), { page: '1', perPage: '10', sort: 'createdAt', order: 'desc' })
  await listCmp({ search: '0000', whitelabelId: '4', status: 'pending', sort: 'legalName', order: 'asc' })
  assert.deepEqual(keys(requests[1]), ['page', 'perPage', 'search', 'whitelabelId', 'status', 'sort', 'order'])
  assert.equal(requests[1].url.pathname, '/api/companies')
  assert.equal(requests[1].url.searchParams.has('entrepreneurId'), false)
  assert.deepEqual([...cmp.COMPANY_SORT_KEYS], ['createdAt', 'updatedAt', 'legalName', 'cnpj'])
  assert.deepEqual([...cmp.COMPANY_STATUSES], ['pending', 'validated', 'invalid', 'not_found', 'unavailable'])
})
await check('company list: a pasted formatted CNPJ is searched by its digits; other text is sent as typed', async () => {
  assert.equal(cmp.parseCompanySearch('00.000.000/0001-00'), '00000000000100')
  assert.equal(cmp.parseCompanySearch(' 00000000 0001 00 '), '00000000000100')
  assert.equal(cmp.parseCompanySearch('Sintética 1'), 'Sintética 1')
  assert.equal(cmp.parseCompanySearch('Loja 12/3'), 'Loja 12/3')
  assert.equal(cmp.parseCompanySearch('./-'), './-')
  reset(); fetchImpl = async () => json(fx.companyPage([fx.companyRow]))
  await listCmp({ search: '00.000.000/0001-00' })
  assert.equal(requests[0].url.searchParams.get('search'), '00000000000100')
})
await check('company list: a page / page size other than requested is rejected (PAGE_MISMATCH)', async () => {
  reset(); fetchImpl = async () => json(fx.companyPage([fx.companyRow], { page: 1, total: 13, lastPage: 2 }))
  await assert.rejects(listCmp({ page: 2 }), rejectedWith('PAGE_MISMATCH'))
  fetchImpl = async () => json(fx.companyPage([fx.companyRow], { perPage: 20 }))
  await assert.rejects(listCmp(), rejectedWith('PAGE_MISMATCH'))
})
for (const [label, filter, row] of [['Whitelabel', { whitelabelId: '4' }, { ...fx.companyRowB, whitelabelId: 6 }], ['status', { status: 'pending' }, fx.companyRowB]]) {
  await check(`company list: a row outside the applied ${label} filter rejects the page (SCOPE_MISMATCH)`, async () => {
    reset(); fetchImpl = async () => json(fx.companyPage([fx.companyRow, row], { total: 2 }))
    await assert.rejects(listCmp(filter), rejectedWith('SCOPE_MISMATCH'))
  })
}
await check('company detail: id must match; 404 E_COMPANY_NOT_FOUND → not-found view', async () => {
  reset(); fetchImpl = async () => json(fx.detail({ ...fx.companyDetail, id: 10 }, { cardinality: fx.CARDINALITY }))
  await assert.rejects(cmp.getCompany('9'), rejectedWith('IDENTITY_MISMATCH'))
  fetchImpl = async () => json({ statusCode: 404, code: 'E_COMPANY_NOT_FOUND', message: 'Company not found' }, 404)
  await assert.rejects(cmp.getCompany('9'), (error) => errors.operationReadErrorView(error, 'a empresa').notFound === true)
})

/* ---------- Entrepreneur → Company (0..1) ---------- */
await check('relationship: present → the Company of the requested Entrepreneur, tenant-scoped query', async () => {
  reset(); fetchImpl = async () => json(fx.detail(fx.companyDetail, { cardinality: fx.CARDINALITY }))
  const company = await cmp.getEntrepreneurCompany('41', '4')
  assert.equal(company.id, '9'); assert.equal(company.entrepreneurId, '41')
  assert.equal(requests[0].url.pathname, '/api/entrepreneurs/41/company')
  assert.deepEqual(Object.fromEntries(requests[0].url.searchParams), { whitelabelId: '4' })
  await cmp.getEntrepreneurCompany('41', undefined)
  assert.deepEqual(keys(requests[1]), [])
})
await check('relationship: 200 { data: null } → confirmed absence (null), never a synthetic Company', async () => {
  reset(); fetchImpl = async () => json({ data: null, cardinality: fx.CARDINALITY })
  assert.equal(await cmp.getEntrepreneurCompany('41', '4'), null)
  assert.equal(relation.companyRelationState({ state: { status: 'success', data: null } }), 'absent')
})
for (const [label, body] of [['empty body', {}], ['data missing', { cardinality: fx.CARDINALITY }], ['data not an object', { data: 'none' }], ['array', [fx.companyDetail]]]) {
  await check(`relationship: ${label} is malformed — never read as "no Company"`, async () => {
    reset(); fetchImpl = async () => json(body)
    await assert.rejects(cmp.getEntrepreneurCompany('41', '4'), isMalformed)
  })
}
await check('relationship: a Company of another Entrepreneur / Whitelabel is rejected (no cross-record contamination)', async () => {
  reset(); fetchImpl = async () => json(fx.detail({ ...fx.companyDetail, entrepreneurId: 42 }, { cardinality: fx.CARDINALITY }))
  await assert.rejects(cmp.getEntrepreneurCompany('41', '4'), rejectedWith('IDENTITY_MISMATCH'))
  fetchImpl = async () => json(fx.detail({ ...fx.companyDetail, whitelabelId: 6 }, { cardinality: fx.CARDINALITY }))
  await assert.rejects(cmp.getEntrepreneurCompany('41', '4'), rejectedWith('SCOPE_MISMATCH'))
  fetchImpl = async () => json(fx.detail(fx.companyDetail, { cardinality: { ...fx.CARDINALITY, entrepreneurToCompany: '0..N' } }))
  await assert.rejects(cmp.getEntrepreneurCompany('41', '4'), rejectedWith('CARDINALITY_MISMATCH'))
})
await check('relationship: 404 E_ENTREPRENEUR_NOT_FOUND ≠ no Company; other 404 / 5xx / 400 are errors, never absence', async () => {
  reset(); fetchImpl = async () => json({ statusCode: 404, code: 'E_ENTREPRENEUR_NOT_FOUND', message: 'Entrepreneur not found' }, 404)
  const notFound = await cmp.getEntrepreneurCompany('999999', '4').catch((error) => error)
  assert.equal(relation.companyRelationState({ state: { status: 'error', error: notFound } }), 'entrepreneur-not-found')
  for (const [status, code] of [[404, 'E_COMPANY_NOT_FOUND'], [404, 'HTTP_ERROR'], [502, 'CORE_HTTP_ERROR'], [500, undefined], [400, 'E_VALIDATION'], [403, 'FORBIDDEN'], [429, undefined]]) {
    fetchImpl = async () => json({ statusCode: status, code }, status)
    const error = await cmp.getEntrepreneurCompany('41', '4').catch((caught) => caught)
    assert.equal(relation.companyRelationState({ state: { status: 'error', error } }), 'error', `${status} ${code}`)
  }
  const malformed = await (async () => { fetchImpl = async () => json({}); return cmp.getEntrepreneurCompany('41', '4').catch((caught) => caught) })()
  assert.equal(relation.companyRelationState({ state: { status: 'error', error: malformed } }), 'error')
  assert.equal(relation.companyRelationState({ state: { status: 'loading' } }), 'loading')
  assert.equal(relation.companyRelationState({ state: { status: 'idle' } }), 'loading')
  assert.equal(relation.companyRelationState({ state: { status: 'success', data: cmp.parseCompanyDetail(fx.detail(fx.companyDetail)) } }), 'present')
})
await check('relationship: invalid Entrepreneur / Whitelabel ids are refused locally (400), with no request', async () => {
  reset(); fetchImpl = async () => { assert.fail('Unexpected request') }
  for (const id of ['abc', '0', '-3', 'emp_proto_001', '']) await assert.rejects(cmp.getEntrepreneurCompany(id, '4'), (error) => error.status === 400 && error.code === 'E_VALIDATION')
  await assert.rejects(cmp.getEntrepreneurCompany('41', 'wl_proto_01'), (error) => error.status === 400)
  for (const id of ['opp_proto_001', '0', 'abc']) await assert.rejects(opp.getOpportunity(id), (error) => error.status === 404)
  for (const id of ['cmp_proto_101', '0', 'x']) await assert.rejects(cmp.getCompany(id), (error) => error.status === 404)
  await assert.rejects(listOpp({ whitelabelId: 'wl_proto_01' }), (error) => error.status === 400)
  await assert.rejects(listCmp({ whitelabelId: '0' }), (error) => error.status === 400)
  assert.equal(requests.length, 0)
})

/* ---------- authorization and failure copy ---------- */
await check('401 ends the session centrally; 403 / 429 / 5xx keep it', async () => {
  reset(); fetchImpl = async () => json({ code: 'FORBIDDEN', message: 'Insufficient role' }, 403)
  await assert.rejects(listOpp(), (error) => error.status === 403); assert.ok(auth.isAuthenticated())
  await assert.rejects(cmp.getEntrepreneurCompany('41', '4'), (error) => error.status === 403); assert.ok(auth.isAuthenticated())
  fetchImpl = async () => json({}, 429)
  await assert.rejects(listCmp(), (error) => error.status === 429); assert.ok(auth.isAuthenticated())
  fetchImpl = async () => json({ code: 'CORE_HTTP_ERROR' }, 502)
  await assert.rejects(opp.getOpportunity('701'), (error) => error.status === 502); assert.ok(auth.isAuthenticated())
  fetchImpl = async () => json({}, 401)
  await assert.rejects(listOpp(), (error) => error.status === 401)
  assert.equal(auth.getAccessToken(), null); assert.equal(auth.peekAuthNotice(), 'session_expired')
})
await check('error copy: 403 permission (not retryable), 400 not retryable, 429 throttled, rejection codes specific', () => {
  const e403 = errors.operationReadErrorView(new ApiError(403, { code: 'FORBIDDEN' }), 'as oportunidades')
  assert.equal(e403.title, 'Acesso não permitido'); assert.equal(e403.retryable, false); assert.equal(e403.notFound, false)
  const e400 = errors.operationReadErrorView(new ApiError(400, { code: 'HTTP_ERROR' }), 'as empresas')
  assert.equal(e400.title, 'Consulta não aceita'); assert.equal(e400.retryable, false)
  assert.equal(errors.operationReadErrorView(new ApiError(429, {}), 'x').title, 'Muitas consultas')
  for (const code of ['SCOPE_MISMATCH', 'IDENTITY_MISMATCH', 'CARDINALITY_MISMATCH', 'PAGE_MISMATCH']) {
    const view = errors.operationReadErrorView(new ApiError(200, { code }, { kind: 'malformed' }), 'x')
    assert.ok(/nada foi exibido/.test(view.description) && view.retryable, code)
  }
  for (const kind of ['network', 'timeout']) assert.equal(errors.operationReadErrorView(new ApiError(0, {}, { kind }), 'x').retryable, true)
})
await check('every adapter request was a GET', () => assert.ok(requests.every((request) => request.method === 'GET')))

/* ---------- presentation ---------- */
await check('status / modality / goal labels: known tokens labelled, inherited keys and unknown tokens shown as sent', () => {
  assert.equal(oppView.opportunityStatusMeta('review').label, 'Em análise'); assert.equal(oppView.opportunityStatusMeta('archived').label, 'Arquivada')
  assert.equal(oppView.modalityLabel('equity'), 'Equity'); assert.equal(oppView.modalityLabel('debt'), 'Debt')
  assert.equal(oppView.fundraisingLabel('reached_minimum_goal'), 'Meta mínima atingida'); assert.equal(oppView.fundraisingLabel(null), 'Não informado')
  assert.equal(oppView.privacyLabel(true), 'Privada'); assert.equal(oppView.privacyLabel(null), 'Não informado')
  assert.equal(cmpView.companyStatusMeta('validated').label, 'Validada'); assert.equal(cmpView.companyStatusMeta('not_found').label, 'Não encontrada na validação')
  for (const token of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
    assert.equal(oppView.opportunityStatusMeta(token).label, token); assert.equal(oppView.modalityLabel(token), token)
    assert.equal(cmpView.companyStatusMeta(token).label, token); assert.equal(oppView.fundraisingLabel(token), token)
  }
})
await check('dates: live timestamps carry the São Paulo offset (-03:00) and render as that local calendar date', () => {
  // Live 2026-10-18: dueAt / openedAt / endedAt / createdAt / updatedAt are full timestamps with -03:00, some at local midnight.
  assert.equal(oppView.opportunityDate(fx.opportunityRow.dueAt), '01/12/2026')
  assert.equal(oppView.opportunityDate('2026-12-01T00:00:00.000-03:00', true), '01/12/2026, 00:00')
  assert.equal(oppView.opportunityDate(null), null)
})
await check('status sort is labelled as Backend order (token order), never as alphabetical by the Portuguese label', () => {
  assert.deepEqual(oppView.ORDER_LABEL.status, { asc: 'ordem do Control Plane', desc: 'ordem inversa do Control Plane' })
  assert.equal(oppView.ORDER_LABEL.name.asc, 'A–Z')
})
await check('CNPJ is formatted for reading only (never completed, validated or invented)', () => {
  assert.equal(cmpView.formatCnpj('00000000000100'), '00.000.000/0001-00')
  assert.equal(cmpView.formatCnpj('123'), '123'); assert.equal(cmpView.formatCnpj('00.000.000/0001-00'), '00.000.000/0001-00'); assert.equal(cmpView.formatCnpj(null), null)
})

/* ---------- URL state ---------- */
await check('opportunity route: invalid values reported and dropped; empreendedor reported as unsupported', () => {
  const { state, ignored, unsupported } = oppRoute.parseOpportunityListRoute({
    whitelabel: 'wl_proto_01', status: 'paused', modalidade: 'working_capital', page: '0', sort: 'modality', order: 'up', empreendedor: 'emp_proto_001', search: ` ${'y'.repeat(200)} `,
  })
  assert.deepEqual([state.whitelabelId, state.status, state.modality, state.page, state.sort, state.order], [undefined, undefined, undefined, 1, 'createdAt', 'desc'])
  assert.equal(state.search.length, 120); assert.equal(ignored.length, 6); assert.equal(unsupported.length, 1)
  assert.equal(Object.hasOwn(state, 'entrepreneurId'), false)
})
await check('opportunity route: valid state survives an href round trip; detail return context is safe', () => {
  const state = { whitelabelId: '4', status: 'active', modality: 'debt', search: 'A&B', page: 3, sort: 'dueAt', order: 'asc' }
  const href = oppRoute.opportunitiesHref(state)
  assert.equal(href, '#/operation/opportunities?whitelabel=4&status=active&modalidade=debt&search=A%26B&sort=dueAt&order=asc&page=3')
  const parsed = oppRoute.parseOpportunityListRoute(Object.fromEntries(new URLSearchParams(href.split('?')[1])))
  assert.deepEqual(parsed.state, state); assert.equal(parsed.ignored.length + parsed.unsupported.length, 0)
  const detail = oppRoute.opportunityHref('701', href)
  assert.equal(oppRoute.opportunityListReturnHash(new URLSearchParams(detail.split('?')[1]).get('returnTo')), href)
  for (const unsafe of ['javascript:alert(1)', '#/whitelabels', 'https://example.invalid/#/operation/opportunities', '#/operation/opportunities-evil']) {
    assert.equal(oppRoute.opportunityListReturnHash(unsafe), '#/operation/opportunities')
  }
  assert.equal(oppRoute.opportunityListReturnHash('#/operation/opportunities?status=bogus&page=2'), '#/operation/opportunities?page=2')
})
await check('company route: previa reported (never applied), valid state round trips, return context safe', () => {
  const { state, ignored } = cmpRoute.parseCompanyRoute({ whitelabel: 'wl_proto_cmp_alfa', status: 'active', page: 'x', sort: 'tradeName', previa: 'erro' })
  assert.deepEqual([state.whitelabelId, state.status, state.page, state.sort], [undefined, undefined, 1, 'createdAt']); assert.equal(ignored.length, 5)
  assert.equal(Object.hasOwn(state, 'preview'), false)
  const href = cmpRoute.companiesHref({ whitelabelId: '4', status: 'pending', search: 'Synthetic', page: 2, sort: 'cnpj', order: 'asc' })
  assert.equal(href, '#/operation/companies?whitelabel=4&status=pending&search=Synthetic&sort=cnpj&order=asc&page=2')
  const detail = cmpRoute.companyHref('9', href)
  assert.equal(cmpRoute.companyListReturnHash(new URLSearchParams(detail.split('?')[1]).get('returnTo')), href)
  for (const unsafe of ['javascript:alert(1)', '#/operation/companies/9', '#/operation/companies-evil', '//example.invalid', '#/operation/entrepreneurs/1']) {
    assert.equal(cmpRoute.companyListReturnHash(unsafe), '#/operation/companies')
  }
  assert.equal(cmpRoute.companyListReturnHash('#/operation/companies?previa=erro'), '#/operation/companies')
})

/* ---------- source boundaries ---------- */
function capabilities(source) {
  const ast = ts.createSourceFile('fixture.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const found = new Set()
  const names = /^(fetch|apiRequest|authenticatedGet|authenticatedPost|authenticatedPut|authenticatedPatch|authenticatedDelete|XMLHttpRequest|sendBeacon|WebSocket|EventSource|localStorage|sessionStorage|indexedDB|cookie|caches)$/
  function visit(node) {
    if (ts.isIdentifier(node) && names.test(node.text)) found.add(node.text)
    if (ts.isElementAccessExpression(node) && ts.isStringLiteralLike(node.argumentExpression) && names.test(node.argumentExpression.text)) found.add(node.argumentExpression.text)
    if (ts.isStringLiteralLike(node) && /^(POST|PUT|PATCH|DELETE)$/i.test(node.text)) found.add(`method:${node.text}`)
    if (ts.isPropertyAssignment(node) && node.name.getText(ast) === 'method') found.add('method-option')
    if (ts.isStringLiteralLike(node) && /\/(approve|deny)$/.test(node.text)) found.add(`write-path:${node.text}`)
    ts.forEachChild(node, visit)
  }
  visit(ast)
  return found
}
await check('capability scanner detects planted writes, aliases, approval paths and storage', () => {
  assert.ok(capabilities('fetch("/api/opportunities/1/approve", { method: "POST" })').has('method:POST'))
  assert.ok(capabilities('const path = `/opportunities/${id}` + "/approve"').size > 0)
  assert.ok(capabilities('const send = window["fetch"]; send("/x")').has('fetch'))
  assert.ok(capabilities('localStorage.setItem("x", "1")').has('localStorage'))
  assert.equal(capabilities('// fetch(); POST\nconst label = "Aprovação indisponível"').size, 0)
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
const domainFiles = [...(await walk(resolve(root, 'src/features/operation/opportunities'))), ...(await walk(resolve(root, 'src/features/operation/companies')))]
for (const file of domainFiles) {
  const rel = relative(root, file).replaceAll('\\', '/')
  const source = await readFile(file, 'utf8')
  const found = capabilities(source)
  await check(`${rel}: no write method, transport alias, approval path or browser persistence`, () => {
    if (rel.endsWith('/opportunityApi.ts') || rel.endsWith('/companyApi.ts')) assert.deepEqual([...found], ['authenticatedGet'])
    else assert.deepEqual([...found], [])
  })
  await check(`${rel}: no prototype source, fixture or fabricated record`, () => {
    assert.equal(/from\s+['"][^'"]*(prototype(?!Notice)|opportunityStore|participants(?!\.module\.css)|catalogStore|modalitiesStore|Seeds|fixtures)/i.test(source), false)
    assert.equal(/opp_proto_|cmp_proto_|wl_proto_|emp_proto_/.test(source), false)
  })
}
for (const file of ['opportunities/prototypeOpportunities.ts', 'opportunities/opportunityStore.ts', 'opportunities/opportunityModel.ts', 'opportunities/classification.ts',
  'opportunities/StatusDialog.tsx', 'opportunities/CatalogPicker.tsx', 'companies/prototypeCompanies.ts', 'companies/companyContract.ts']) {
  await check(`illustrative source removed from the application: ${file}`, () => assert.rejects(access(resolve(root, 'src/features/operation', file))))
}
/** Comment-free code (JSX kept), whitespace collapsed: text checks cannot be satisfied by a comment. */
async function code(path) {
  const source = await readFile(resolve(root, path), 'utf8')
  return ts.transpileModule(source, { fileName: path, compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.Preserve, removeComments: true } })
    .outputText.replace(/\s+/g, ' ')
}
await check('adapters: the only transport import is the canonical authenticatedGet; exports are reads only', async () => {
  for (const [path, mod] of [['src/features/operation/opportunities/opportunityApi.ts', opp], ['src/features/operation/companies/companyApi.ts', cmp]]) {
    assert.match(await readFile(resolve(root, path), 'utf8'), /^import \{ authenticatedGet \} from '\.\.\/\.\.\/\.\.\/lib\/apiClient'$/m)
    const fns = Object.keys(mod).filter((name) => typeof mod[name] === 'function')
    assert.ok(fns.every((name) => /^(list|get|parse|is)/.test(name)), fns.join(', '))
  }
  const entrepreneurApi = await code('src/features/operation/entrepreneurs/entrepreneurApi.ts')
  assert.equal(/compan|cnpj/i.test(entrepreneurApi), false, 'Companies are not added to the Entrepreneur adapter')
})
await check('read hooks: keys carry the record id / every query value (no stale record under a new identity)', async () => {
  const oppHooks = await code('src/features/operation/opportunities/useOpportunityData.ts')
  const cmpHooks = await code('src/features/operation/companies/useCompanyData.ts')
  for (const fragment of ['`opportunities:${JSON.stringify(params)}`', '`opportunity:${id}`']) assert.ok(oppHooks.includes(fragment), fragment)
  for (const fragment of ['`companies:${JSON.stringify(params)}`', '`company:${id}`', '`entrepreneur-company:${entrepreneurId}:${whitelabelId ?? \'\'}`']) assert.ok(cmpHooks.includes(fragment), fragment)
})
await check('Opportunity detail: the Company read is latched once its tab opens (no same-key re-entry on tab switches)', async () => {
  const detail = await code('src/features/operation/opportunities/OpportunityDetailPage.tsx')
  assert.ok(detail.includes('useEntrepreneurCompany(companyRequested ? opportunity.entrepreneurId : null, opportunity.whitelabelId)'))
  assert.ok(detail.includes("if (next === 'company') setCompanyRequested(true)"))
  assert.equal(/useEntrepreneurCompany\(tab === /.test(detail), false)
})
await check('Entrepreneur profile: Company read for THIS Entrepreneur and tenant; no pending placeholder; detail stays keyed by id', async () => {
  const detail = await code('src/features/operation/entrepreneurs/EntrepreneurDetailPage.tsx')
  assert.ok(detail.includes('useEntrepreneurCompany(entrepreneur.id, entrepreneur.whitelabelId)'))
  assert.ok(detail.includes('<EntrepreneurCompanyPanel remote={company} variant="entrepreneur" entrepreneurId={entrepreneur.id}'))
  assert.equal(detail.includes('Aguardando integração da empresa'), false)
  const app = await code('src/app/App.tsx')
  assert.match(app, /<EntrepreneurDetailPage key=\{route\.entrepreneurId\} entrepreneurId=\{route\.entrepreneurId\}/)
  assert.match(app, /<OpportunityDetailPage key=\{route\.opportunityId\} opportunityId=\{route\.opportunityId\} returnTo=\{route\.returnTo\} ?\/>/)
  assert.match(app, /<CompanyDetailPage key=\{route\.companyId\} companyId=\{route\.companyId\}/)
  assert.match(app, /<OpportunitiesPage \{\.\.\.route\.params\} ?\/>/); assert.match(app, /<CompaniesPage \{\.\.\.route\.params\} ?\/>/)
})
await check('list pages clamp a page past the end once (strictly smaller target), and filters reset the page', async () => {
  for (const path of ['src/features/operation/opportunities/OpportunitiesPage.tsx', 'src/features/operation/companies/CompaniesPage.tsx']) {
    const source = await code(path)
    assert.ok(source.includes('const target = data.total === 0 ? 1 : Math.min(route.page, data.lastPage);'), path)
    assert.ok(source.includes("const resetPage = !('page' in next) || pendingSearch !== route.search;"), path)
  }
})
await check('write routes stay but are read-only: no form, store or save in the Opportunity form route', async () => {
  const form = await code('src/features/operation/opportunities/OpportunityFormPage.tsx')
  assert.ok(form.includes('indisponível') && !/useState|onSubmit|<form|save|store/i.test(form))
})
await check('no Companies menu id or sidebar entry anywhere', async () => {
  for (const file of await walk(resolve(root, 'src'))) assert.equal((await code(relative(root, file))).includes("'operation-companies'"), false, relative(root, file))
  const navigation = await code('src/components/shell/navigation.ts')
  assert.equal(/compan|empresa/i.test(navigation), false)
})

console.log(`Opportunities + Companies Read V1 contracts: ${checks} passed (synthetic fixtures, injected GET-only transport, no network, no business writes)`)
