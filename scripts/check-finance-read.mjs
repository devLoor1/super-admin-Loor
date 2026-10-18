import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { access, readdir, readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'
import * as fx from './fixtures/finance-read-fixtures.mjs'

// Finance Read Integration V1 — adapter, presentation, route and boundary contracts.
// In-memory only: an injected fetch double records every request (any non-GET fails
// the run), synthetic fixtures, no browser, no real token and no network.
// FINANCE READ: INTEGRATED (GET only). FINANCIAL WRITES: NOT IMPLEMENTED.
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
  if (record.method !== 'GET') throw new Error(`Finance Read issued a ${record.method}`)
  return fetchImpl(record.url, init)
}

const auth = await load('src/lib/authSession.ts')
const { ApiError } = await load('src/lib/api.ts')
const api = await load('src/features/finance-core/shared/financeApi.ts')
const view = await load('src/features/finance-core/shared/financePresentation.ts')
const route = await load('src/features/finance-core/shared/financeRoute.ts')

const operator = { id: 'synthetic-operator', name: 'Unit QA', email: 'qa@example.invalid', roles: ['FINANCIAL_ADMIN'] }
const session = () => ({ accessToken: 'synthetic-unit-token-f', tokenType: 'Bearer', operator })
const json = (value, status = 200) => new Response(JSON.stringify(value), { status })
const reset = () => { auth.clearSession(); auth.clearAuthNotice(); window.location.hash = ''; requests.length = 0; auth.persistSession(session()) }
const rejectedWith = (code) => (error) => error instanceof ApiError && error.kind === 'malformed' && error.code === code
const isMalformed = (error) => error instanceof ApiError && error.kind === 'malformed'
const keys = (request) => [...request.url.searchParams.keys()]
let checks = 0
async function check(name, action) {
  try { await action(); checks += 1 } catch (cause) { throw new Error(`Failed: ${name}`, { cause }) }
}

/* ---------- money: integer centavos, formatted only at the display boundary ---------- */
await check('formatCents: 12345 → "R$ 123,45" (BigInt arithmetic, no float division)', () => {
  assert.equal(view.formatCents(12345), 'R$ 123,45')
  assert.equal(view.formatCents(0), 'R$ 0,00')
  assert.equal(view.formatCents(5), 'R$ 0,05')
  assert.equal(view.formatCents(100), 'R$ 1,00')
  assert.equal(view.formatCents(123456789), 'R$ 1.234.567,89')
  assert.equal(view.formatCents(Number.MAX_SAFE_INTEGER), 'R$ 90.071.992.547.409,91')
  assert.equal(view.formatCents(-1500), '-R$ 15,00')
})
for (const bad of [null, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 2, '12345']) {
  await check('formatCents: null / non-integer is not money (never "R$ 0,00")', () => assert.equal(view.formatCents(bad), null))
}
await check('unavailable copy is explicit and never a zero amount', () => {
  assert.equal(view.AMOUNT_UNAVAILABLE, 'Valor indisponível'); assert.equal(view.BALANCE_UNAVAILABLE, 'Saldo indisponível')
  assert.ok(!/0,00/.test(view.AMOUNT_UNAVAILABLE + view.BALANCE_UNAVAILABLE))
})

/* ---------- investments ---------- */
await check('investment row: ids as strings, centavos kept as integer', () => {
  const row = api.parseInvestment(fx.investmentRow)
  assert.deepEqual([row.id, row.whitelabelId, row.investorId, row.opportunityId], ['9001', '4', '7001', '501'])
  assert.equal(row.amountCents, 12345); assert.equal(row.currency, 'BRL'); assert.equal(row.status, 'paid')
})
await check('failed investment: amountCents null stays null (never zero)', () => {
  const row = api.parseInvestment(fx.failedInvestmentRow)
  assert.equal(row.amountCents, null); assert.equal(view.formatCents(row.amountCents), null)
})
await check('investment detail: relations parsed; payment status independent of investment status', () => {
  const parsed = api.parseInvestmentDetail(fx.detail(fx.investmentDetail))
  assert.equal(parsed.status, 'processing'); assert.equal(parsed.payment.status, 'waiting_payment')
  assert.equal(parsed.payment.id, '8001'); assert.equal(parsed.investor.id, '7001'); assert.equal(parsed.opportunity.name, 'Synthetic Opportunity')
  assert.equal(api.parseInvestmentDetail(fx.detail({ ...fx.investmentDetail, payment: null })).payment, null)
})
for (const [label, bad] of [
  ['investor', { ...fx.investmentDetail, investor: { id: 7002, fullName: 'Other' } }],
  ['opportunity', { ...fx.investmentDetail, opportunity: { id: 502, name: 'Other' } }],
]) {
  await check(`investment detail: embedded ${label} of another record → IDENTITY_MISMATCH`, () =>
    assert.throws(() => api.parseInvestmentDetail(fx.detail(bad)), rejectedWith('IDENTITY_MISMATCH')))
}
for (const bad of [
  { ...fx.investmentRow, id: 'INV-0001' }, { ...fx.investmentRow, id: 0 }, { ...fx.investmentRow, whitelabelId: null },
  { ...fx.investmentRow, amountCents: -1 }, { ...fx.investmentRow, amountCents: 12.5 }, { ...fx.investmentRow, amountCents: '12345' },
  { ...fx.investmentRow, status: '' }, { ...fx.investmentRow, status: 42 }, null, [],
]) {
  await check('investment identity / amount / status are strict', () => assert.throws(() => api.parseInvestment(bad), isMalformed))
}
await check('investment currency other than BRL → MONEY_UNIT_MISMATCH', () =>
  assert.throws(() => api.parseInvestment({ ...fx.investmentRow, currency: 'USD' }), rejectedWith('MONEY_UNIT_MISMATCH')))

/* ---------- envelopes: money unit and page metadata ---------- */
for (const money of [undefined, null, { currency: 'USD', unit: 'centavos' }, { currency: 'BRL', unit: 'reais' }, { currency: 'BRL' }]) {
  await check('every envelope must declare BRL centavos (list and detail)', async () => {
    reset(); fetchImpl = async () => json({ ...fx.page([fx.investmentRow]), money })
    await assert.rejects(api.listInvestments({ page: 1, search: '', sort: 'createdAt', order: 'desc' }), rejectedWith('MONEY_UNIT_MISMATCH'))
    fetchImpl = async () => json({ data: fx.investmentRow, money })
    await assert.rejects(api.getInvestment('9001'), rejectedWith('MONEY_UNIT_MISMATCH'))
  })
}
for (const [label, body] of [
  ['missing meta', { data: [fx.investmentRow], money: fx.MONEY }],
  ['rows beyond total', fx.page([fx.investmentRow, { ...fx.investmentRow, id: 9003 }], { total: 1 })],
  ['empty page inside range', fx.page([], { total: 5 })],
  ['lastPage inconsistent', fx.page([fx.investmentRow], { total: 45, lastPage: 1 })],
  ['duplicate identities', fx.page([fx.investmentRow, fx.investmentRow], { total: 2 })],
  ['more rows than perPage', fx.page([fx.investmentRow, { ...fx.investmentRow, id: 9003 }], { perPage: 1, total: 2, lastPage: 2 })],
  ['unsafe total', fx.page([fx.investmentRow], { total: Number.MAX_SAFE_INTEGER + 1 })],
  ['page zero', fx.page([fx.investmentRow], { page: 0 })],
  ['direct array', [fx.investmentRow]],
]) {
  await check(`malformed list envelope fails closed: ${label}`, async () => {
    reset(); fetchImpl = async () => json(body)
    await assert.rejects(api.listInvestments({ page: 1, search: '', sort: 'createdAt', order: 'desc' }), isMalformed)
  })
}
await check('structurally broken envelope is reported as malformed (structure checked before the money declaration)', async () => {
  reset(); fetchImpl = async () => json({ data: [{ id: 'x' }], meta: {} })
  await assert.rejects(api.listPayments({ page: 1, search: '', sort: 'createdAt', order: 'desc' }), (error) => isMalformed(error) && error.code === undefined)
})
await check('overflow page (unclamped endpoints): empty rows with meta.page = requested is accepted', async () => {
  reset(); fetchImpl = async () => json(fx.page([], { page: 99, total: 3, lastPage: 1 }))
  const result = await api.listInvestments({ page: 99, search: '', sort: 'createdAt', order: 'desc' })
  assert.equal(result.page, 99); assert.equal(result.rows.length, 0); assert.equal(result.lastPage, 1)
})

/* ---------- investments: exact query and scope ---------- */
await check('investments list: documented params only, perPage 20, empty search omitted', async () => {
  reset(); fetchImpl = async () => json(fx.page([fx.investmentRow]))
  await api.listInvestments({ page: 2, search: '', sort: 'createdAt', order: 'desc' })
  const [request] = requests
  assert.equal(request.url.pathname, '/api/investments'); assert.equal(request.method, 'GET')
  assert.deepEqual(keys(request), ['page', 'perPage', 'sort', 'order'])
  assert.equal(request.url.searchParams.get('perPage'), '20')
  assert.equal(request.headers.Authorization, 'Bearer synthetic-unit-token-f')
})
await check('investments list: every filter maps to its documented key', async () => {
  reset(); fetchImpl = async () => json(fx.page([fx.investmentRow]))
  await api.listInvestments({ page: 1, search: 'A&B', status: 'paid', whitelabelId: '4', investorId: '7001', opportunityId: '501', sort: 'status', order: 'asc' })
  assert.deepEqual(Object.fromEntries(requests[0].url.searchParams), {
    page: '1', perPage: '20', search: 'A&B', status: 'paid', investorId: '7001', opportunityId: '501', sort: 'status', order: 'asc', whitelabelId: '4',
  })
})
for (const [label, filter, row] of [
  ['Whitelabel', { whitelabelId: '4' }, { ...fx.investmentRow, whitelabelId: 6 }],
  ['investor', { investorId: '7001' }, { ...fx.investmentRow, investorId: 7002 }],
  ['opportunity', { opportunityId: '501' }, { ...fx.investmentRow, opportunityId: 502 }],
  ['status', { status: 'paid' }, { ...fx.investmentRow, status: 'failed', amountCents: null }],
]) {
  await check(`investments: a row outside the applied ${label} filter rejects the page (SCOPE_MISMATCH)`, async () => {
    reset(); fetchImpl = async () => json(fx.page([fx.investmentRow, { ...row, id: 9010 }], { total: 2 }))
    await assert.rejects(api.listInvestments({ page: 1, search: '', sort: 'createdAt', order: 'desc', ...filter }), rejectedWith('SCOPE_MISMATCH'))
  })
}
await check('investment detail: id must match the requested record', async () => {
  reset(); fetchImpl = async () => json(fx.detail({ ...fx.investmentDetail, id: 9002 }))
  await assert.rejects(api.getInvestment('9001'), rejectedWith('IDENTITY_MISMATCH'))
  fetchImpl = async () => json(fx.detail(fx.investmentDetail))
  assert.equal((await api.getInvestment('9001')).id, '9001')
  assert.equal(requests.at(-1).url.pathname, '/api/investments/9001')
})

/* ---------- payments ---------- */
await check('payment row and detail parse; references kept for partial display', () => {
  const row = api.parsePayment(fx.paymentRow)
  assert.deepEqual([row.id, row.investmentId, row.whitelabelId], ['8001', '9001', '4'])
  assert.equal(row.amountCents, 12345); assert.equal(row.paymentMethod, 'pix'); assert.equal(row.provider, 'synthpay')
  const parsed = api.parsePaymentDetail(fx.detail(fx.paymentDetail, { domain: 'payment' }))
  assert.equal(parsed.liquidationAt, null); assert.equal(parsed.externalEndToEndId, fx.paymentDetail.externalEndToEndId)
})
for (const bad of [{ ...fx.paymentRow, amountCents: null }, { ...fx.paymentRow, investmentId: null }, { ...fx.paymentRow, amountCents: -5 }]) {
  await check('payments always carry an investment and a non-negative integer amount', () => assert.throws(() => api.parsePayment(bad), isMalformed))
}
await check('payments list: documented params; investmentId / provider never sent', async () => {
  reset(); fetchImpl = async () => json(fx.page([fx.paymentRow], {}, { domain: 'payment' }))
  await api.listPayments({ page: 1, search: 'synthetic', status: 'paid', whitelabelId: '4', investorId: '7001', opportunityId: '501', sort: 'amount', order: 'desc' })
  assert.deepEqual(keys(requests[0]), ['page', 'perPage', 'search', 'status', 'whitelabelId', 'investorId', 'opportunityId', 'sort', 'order'])
  assert.equal(requests[0].url.pathname, '/api/payments')
})
await check('payments: status filter contradicted by a row → SCOPE_MISMATCH', async () => {
  reset(); fetchImpl = async () => json(fx.page([{ ...fx.paymentRow, status: 'refunded' }]))
  await assert.rejects(api.listPayments({ page: 1, search: '', status: 'paid', sort: 'createdAt', order: 'desc' }), rejectedWith('SCOPE_MISMATCH'))
})
await check('payment detail: id must match; 404 maps to the not-found view', async () => {
  reset(); fetchImpl = async () => json(fx.detail({ ...fx.paymentDetail, id: 8002 }))
  await assert.rejects(api.getPayment('8001'), rejectedWith('IDENTITY_MISMATCH'))
  fetchImpl = async () => json({ statusCode: 404, code: 'E_PAYMENT_NOT_FOUND', message: 'Payment not found' }, 404)
  await assert.rejects(api.getPayment('8001'), (error) => view.financeErrorView(error, 'o pagamento').notFound === true)
})

/* ---------- wallets ---------- */
await check('wallet row: one wallet per Whitelabel, authoritative balance as sent (negative allowed)', () => {
  const row = api.parseWallet(fx.walletRow)
  assert.deepEqual([row.id, row.whitelabelId, row.ownerId], ['4', '4', '4'])
  assert.equal(row.authoritativeBalanceCents, 250000)
  assert.equal(api.parseWallet(fx.walletRowB).authoritativeBalanceCents, -1500)
  assert.equal(api.parseWallet({ ...fx.walletRow, authoritativeBalanceCents: null }).authoritativeBalanceCents, null)
})
for (const bad of [
  { ...fx.walletRow, whitelabelId: 6 }, { ...fx.walletRow, ownerId: 6 }, { ...fx.walletRow, ownerType: 'investor' },
]) {
  await check('wallet identity model other than id = whitelabelId = ownerId → WALLET_IDENTITY_MISMATCH', () =>
    assert.throws(() => api.parseWallet(bad), rejectedWith('WALLET_IDENTITY_MISMATCH')))
}
for (const bad of [{ ...fx.walletRow, authoritativeBalanceCents: 10.5 }, { ...fx.walletRow, authoritativeBalanceCents: '250000' }]) {
  await check('wallet balance must be integer centavos', () => assert.throws(() => api.parseWallet(bad), isMalformed))
}
await check('wallet detail: Backend summary kept as sent, never recomputed', () => {
  const parsed = api.parseWalletDetail(fx.detail(fx.walletDetail))
  assert.deepEqual(parsed.summary, fx.walletDetail.summary)
  const odd = api.parseWalletDetail(fx.detail({ ...fx.walletDetail, summary: { ...fx.walletDetail.summary, totalInCents: 1 } }))
  assert.equal(odd.authoritativeBalanceCents, 250000, 'balance is not derived from in − out')
})
await check('wallet detail: two different authoritative balances → BALANCE_MISMATCH', () =>
  assert.throws(() => api.parseWalletDetail(fx.detail({ ...fx.walletDetail, summary: { ...fx.walletDetail.summary, authoritativeBalanceCents: 1 } })), rejectedWith('BALANCE_MISMATCH')))
await check('wallet detail: one balance missing and the other present → BALANCE_MISMATCH (never shown side by side)', () => {
  assert.throws(() => api.parseWalletDetail(fx.detail({ ...fx.walletDetail, authoritativeBalanceCents: null })), rejectedWith('BALANCE_MISMATCH'))
  assert.throws(() => api.parseWalletDetail(fx.detail({ ...fx.walletDetail, summary: { ...fx.walletDetail.summary, authoritativeBalanceCents: null } })), rejectedWith('BALANCE_MISMATCH'))
  const both = api.parseWalletDetail(fx.detail({ ...fx.walletDetail, authoritativeBalanceCents: null, summary: { ...fx.walletDetail.summary, authoritativeBalanceCents: null } }))
  assert.equal(both.authoritativeBalanceCents, null); assert.equal(both.summary.authoritativeBalanceCents, null)
})
await check('wallet summary: a missing total or count is unavailable (null), not zero and not a rejection', () => {
  const parsed = api.parseWalletDetail(fx.detail({ ...fx.walletDetail, summary: { ...fx.walletDetail.summary, totalInCents: null, countOut: null } }))
  assert.equal(parsed.summary.totalInCents, null); assert.equal(parsed.summary.countOut, null); assert.equal(parsed.summary.totalOutCents, 150000)
  assert.throws(() => api.parseWalletDetail(fx.detail({ ...fx.walletDetail, summary: { ...fx.walletDetail.summary, totalOutCents: -1 } })), isMalformed)
})
await check('wallets list: documented params (search, sort createdAt|name); tenants read uses perPage 100', async () => {
  reset(); fetchImpl = async () => json(fx.page([fx.walletRow, fx.walletRowB], { total: 2 }, { domain: 'wallet_balance' }))
  await api.listWallets({ page: 1, search: '', sort: 'name', order: 'asc' })
  assert.deepEqual(keys(requests[0]), ['page', 'perPage', 'sort', 'order'])
  await api.listFinanceTenants()
  assert.deepEqual(Object.fromEntries(requests[1].url.searchParams), { page: '1', perPage: '100', sort: 'name', order: 'asc' })
  assert.deepEqual([...api.WALLET_SORT_KEYS], ['createdAt', 'name'])
})
await check('wallet detail: requested id must be the returned wallet', async () => {
  reset(); fetchImpl = async () => json(fx.detail({ ...fx.walletDetail, id: 6, whitelabelId: 6, ownerId: 6 }))
  await assert.rejects(api.getWallet('4'), rejectedWith('WALLET_IDENTITY_MISMATCH'))
})

/* ---------- movements ---------- */
await check('movement: kind gives direction, amount unsigned, masked document kept as sent', () => {
  const parsed = api.parseMovement(fx.movementRow)
  assert.equal(parsed.kind, 'in'); assert.equal(parsed.amountCents, 12345)
  assert.equal(parsed.counterparty.document, '***.***.***-00'); assert.equal(parsed.opportunity.id, '501')
  assert.equal(api.parseMovement(fx.movementOut).kind, 'out'); assert.equal(api.parseMovement(fx.movementOut).amountCents, 500)
  assert.equal(api.parseMovement({ ...fx.movementRow, status: 'synthetic_source_state' }).status, 'synthetic_source_state')
})
await check('movement status is opaque free text, not a token or a global enum', () => {
  for (const status of ['awaiting reconciliation', 'settlement.pending', 'Em análise', 'synthetic '.repeat(6).trim()]) {
    const parsed = api.parseMovement({ ...fx.movementRow, status })
    assert.equal(parsed.status, status)
    assert.equal(view.movementStatusLabel(parsed.status), status)
  }
  for (const status of [null, undefined, '', '   ']) {
    assert.equal(api.parseMovement({ ...fx.movementRow, status }).status, null)
  }
})
await check('free-text movement status still passes the whole-response privacy gate', () => {
  const syntheticDocument = ['123', '456', '789', '00'].join('')
  assert.throws(() => api.parseMovement({ ...fx.movementRow, status: `CPF ${syntheticDocument}` }), rejectedWith('UNMASKED_DOCUMENT'))
})
for (const bad of [{ ...fx.movementRow, kind: 'credit' }, { ...fx.movementRow, amountCents: -12345 }, { ...fx.movementRow, id: '' }, { ...fx.movementRow, id: 'x'.repeat(81) }]) {
  await check('movement kind / unsigned amount / id are strict', () => assert.throws(() => api.parseMovement(bad), isMalformed))
}
for (const document of ['123.456.789-00', '12345678900', '12.345.678/0001-00', '12345678000100', '123.***.789-09', 'unmasked']) {
  await check(`unmasked counterparty document rejects the movement (privacy gate): ${document.replace(/\d/g, '#')}`, () =>
    assert.throws(() => api.parseMovement({ ...fx.movementRow, counterparty: { ...fx.movementRow.counterparty, document } }), rejectedWith('UNMASKED_DOCUMENT')))
}
for (const document of [null, '', '   ', '***.***.***-00', '•••.•••.•••-00', '**.***.***/0001-**', '**.***.***/0001-12', 'XXX.XXX.XXX-00', '123.***.***-00']) {
  await check('masked or absent documents are accepted as sent', () =>
    assert.doesNotThrow(() => api.parseMovement({ ...fx.movementRow, counterparty: { ...fx.movementRow.counterparty, document } })))
}
for (const [field, value] of [
  ['description', 'Repasse 123.456.789-00'], ['description', 'Doc 12345678900'], ['description', 'Doc 123 456 789 00'], ['description', 'Doc 123456789-00'],
  ['name', 'Synthetic 12.345.678/0001-00'], ['opportunity', 'Oportunidade 123.456.789-00'],
]) {
  await check(`a document written into free text is rejected too (${field})`, () => {
    const row = field === 'name'
      ? { ...fx.movementRow, counterparty: { ...fx.movementRow.counterparty, name: value } }
      : field === 'opportunity' ? { ...fx.movementRow, opportunity: { id: 501, name: value } } : { ...fx.movementRow, [field]: value }
    assert.throws(() => api.parseMovement(row), rejectedWith('UNMASKED_DOCUMENT'))
  })
}
for (const reference of [
  { pix_key: '12345678900' }, { pix_key: 12345678900 }, { document: '123.456.789-00' }, { investor_document: 'unmasked' },
  { payout_note: 'CPF 123 456 789 00' }, { txid: '123.456.789-00' }, { end_to_end_id: '12345678000100' },
]) {
  await check(`origin references pass the privacy gate: ${Object.keys(reference)[0]}`, () =>
    assert.throws(() => api.parseMovement({ ...fx.movementRow, reference }), rejectedWith('UNMASKED_DOCUMENT')))
}
await check('opaque transaction references with digit runs are not mistaken for documents', () => {
  const parsed = api.parseMovement({ ...fx.movementRow, reference: { txid: 'ab12345678901cdSYNTH000000000000', end_to_end_id: 'E0000SYNTH12345678901ABCDEFGHIJKL', investment_id: 9001, document: '***.***.***-00' } })
  assert.equal(parsed.reference.investment_id, 9001); assert.equal(parsed.reference.document, '***.***.***-00')
})
await check('investment detail: a document inside embedded names is rejected', () =>
  assert.throws(() => api.parseInvestmentDetail(fx.detail({ ...fx.investmentDetail, investor: { ...fx.investmentDetail.investor, fullName: 'Synthetic 123.456.789-00' } })), rejectedWith('UNMASKED_DOCUMENT')))
await check('one unmasked row rejects the WHOLE movements page (nothing partial is shown)', async () => {
  reset()
  fetchImpl = async () => json(fx.page([fx.movementRow, { ...fx.movementOut, counterparty: { type: 'investor', name: 'X', document: '12345678900' } }], { total: 2 }))
  await assert.rejects(api.listWalletMovements('4', { page: 1 }), rejectedWith('UNMASKED_DOCUMENT'))
})
await check('movements: only page / perPage / kind / category / opportunityId — never search, sort or order', async () => {
  reset(); fetchImpl = async () => json(fx.page([fx.movementRow], {}, { domain: 'wallet_movement' }))
  await api.listWalletMovements('4', { page: 3, kind: 'in', category: 'investment_paid', opportunityId: '501' })
  const [request] = requests
  assert.equal(request.url.pathname, '/api/wallets/4/movements')
  assert.deepEqual(keys(request), ['page', 'perPage', 'kind', 'category', 'opportunityId'])
  for (const forbidden of ['search', 'sort', 'order', 'whitelabelId']) assert.equal(request.url.searchParams.has(forbidden), false)
  fetchImpl = async () => json(fx.page([fx.movementRow]))
  await api.listWalletMovements('4', { page: 1 })
  assert.deepEqual(keys(requests[1]), ['page', 'perPage'])
})
await check('movements: server clamp (meta.page = lastPage) accepted; meta.page beyond lastPage rejected', async () => {
  reset(); fetchImpl = async () => json(fx.page([fx.movementRow], { page: 3, total: 41, lastPage: 3 }))
  assert.equal((await api.listWalletMovements('4', { page: 999 })).page, 3)
  fetchImpl = async () => json(fx.page([], { page: 999, total: 41, lastPage: 3 }))
  await assert.rejects(api.listWalletMovements('4', { page: 999 }), isMalformed)
})
for (const [label, query, row] of [
  ['kind', { kind: 'in' }, fx.movementOut],
  ['category', { category: 'refund' }, fx.movementRow],
  ['opportunity', { opportunityId: '777' }, fx.movementRow],
]) {
  await check(`movements: a row outside the applied ${label} filter → SCOPE_MISMATCH`, async () => {
    reset(); fetchImpl = async () => json(fx.page([row]))
    await assert.rejects(api.listWalletMovements('4', { page: 1, ...query }), rejectedWith('SCOPE_MISMATCH'))
  })
}

/* ---------- wallet investments alias ---------- */
await check('alias: /wallets/:id/investments, no whitelabelId param, every row scoped to the wallet', async () => {
  reset(); fetchImpl = async () => json(fx.page([fx.investmentRow]))
  await api.listWalletInvestments('4', { page: 1, status: 'paid', sort: 'createdAt', order: 'desc' })
  assert.equal(requests[0].url.pathname, '/api/wallets/4/investments')
  assert.deepEqual(keys(requests[0]), ['page', 'perPage', 'status', 'sort', 'order'])
  fetchImpl = async () => json(fx.page([{ ...fx.investmentRow, whitelabelId: 6 }]))
  await assert.rejects(api.listWalletInvestments('4', { page: 1, sort: 'createdAt', order: 'desc' }), rejectedWith('SCOPE_MISMATCH'))
})
await check('one cross-tenant row rejects the entire alias page, not just that row', async () => {
  reset(); fetchImpl = async () => json(fx.page([fx.investmentRow, { ...fx.investmentRow, id: 9002, whitelabelId: 6 }], { total: 2 }))
  await assert.rejects(api.listWalletInvestments('4', { page: 1, sort: 'createdAt', order: 'desc' }), rejectedWith('SCOPE_MISMATCH'))
})
await check('read parsing does not mutate or synchronize source records across domains', () => {
  function freeze(value) {
    if (value && typeof value === 'object') {
      Object.values(value).forEach(freeze)
      Object.freeze(value)
    }
    return value
  }
  const inputs = freeze(structuredClone({
    investment: fx.detail(fx.investmentDetail), payment: fx.detail({ ...fx.paymentDetail, status: 'refunded' }),
    wallet: fx.detail(fx.walletDetail), movement: fx.movementRow,
  }))
  const before = JSON.stringify(inputs)
  const investment = api.parseInvestmentDetail(inputs.investment)
  const payment = api.parsePaymentDetail(inputs.payment)
  const wallet = api.parseWalletDetail(inputs.wallet)
  api.parseMovement(inputs.movement)
  assert.equal(investment.status, 'processing')
  assert.equal(investment.payment.status, 'waiting_payment')
  assert.equal(payment.status, 'refunded')
  assert.equal(wallet.authoritativeBalanceCents, inputs.wallet.data.authoritativeBalanceCents)
  assert.equal(JSON.stringify(inputs), before)
})

/* ---------- identifiers never reach the API unless they are Backend ids ---------- */
await check('prototype / malformed ids and filters are refused locally, with no request', async () => {
  reset(); fetchImpl = async () => { assert.fail('Unexpected request') }
  for (const id of ['INV-0001', 'PG-0001', 'WAL-0001', 'abc', '0', '-4', '4.5', '', '1'.repeat(19), '9007199254740992', '1'.repeat(17)]) {
    await assert.rejects(api.getInvestment(id), (error) => error.status === 404)
    await assert.rejects(api.getPayment(id), (error) => error.status === 404)
    await assert.rejects(api.getWallet(id), (error) => error.status === 404)
    await assert.rejects(api.listWalletMovements(id, { page: 1 }), (error) => error.status === 404)
    await assert.rejects(api.listWalletInvestments(id, { page: 1, sort: 'createdAt', order: 'desc' }), (error) => error.status === 404)
  }
  await assert.rejects(api.listInvestments({ page: 1, search: '', whitelabelId: 'wl_proto_01', sort: 'createdAt', order: 'desc' }), (error) => error.status === 400)
  await assert.rejects(api.listPayments({ page: 1, search: '', investorId: 'inv_proto', sort: 'createdAt', order: 'desc' }), (error) => error.status === 400)
  await assert.rejects(api.listWalletMovements('4', { page: 1, opportunityId: 'opp-1' }), (error) => error.status === 400)
  assert.equal(requests.length, 0)
})

/* ---------- authorization and failure states ---------- */
await check('401 ends the session centrally; 403 / 429 / 5xx keep it', async () => {
  reset(); fetchImpl = async () => json({ code: 'FORBIDDEN' }, 403)
  await assert.rejects(api.listPayments({ page: 1, search: '', sort: 'createdAt', order: 'desc' }), (error) => error.status === 403)
  assert.ok(auth.isAuthenticated())
  fetchImpl = async () => json({}, 429)
  await assert.rejects(api.getWallet('4'), (error) => error.status === 429); assert.ok(auth.isAuthenticated())
  fetchImpl = async () => json({ code: 'CORE_HTTP_ERROR' }, 502)
  await assert.rejects(api.listWallets({ page: 1, search: '', sort: 'name', order: 'asc' }), (error) => error.status === 502); assert.ok(auth.isAuthenticated())
  fetchImpl = async () => json({}, 401)
  await assert.rejects(api.listInvestments({ page: 1, search: '', sort: 'createdAt', order: 'desc' }), (error) => error.status === 401)
  assert.equal(auth.getAccessToken(), null); assert.equal(auth.peekAuthNotice(), 'session_expired')
})
await check('no session: nothing is requested', async () => {
  auth.clearSession(); requests.length = 0
  await assert.rejects(api.listWallets({ page: 1, search: '', sort: 'name', order: 'asc' }), (error) => error.status === 401)
  assert.equal(requests.length, 0)
})
await check('error copy: 403 permission, 400 not retryable, 429 throttled, rejection codes specific', () => {
  const e403 = view.financeErrorView(new ApiError(403, { code: 'FORBIDDEN' }), 'os pagamentos')
  assert.equal(e403.notFound, false)
  const e400 = view.financeErrorView(new ApiError(400, { code: 'E_VALIDATION' }), 'os investimentos')
  assert.equal(e400.title, 'Consulta não aceita'); assert.equal(e400.retryable, false)
  const e429 = view.financeErrorView(new ApiError(429, {}), 'as wallets')
  assert.equal(e429.title, 'Muitas consultas'); assert.equal(e429.retryable, true)
  for (const code of ['MONEY_UNIT_MISMATCH', 'UNMASKED_DOCUMENT', 'SCOPE_MISMATCH', 'IDENTITY_MISMATCH', 'WALLET_IDENTITY_MISMATCH', 'BALANCE_MISMATCH']) {
    const rejection = view.financeErrorView(new ApiError(200, { code }, { kind: 'malformed' }), 'x')
    assert.ok(rejection.title.length > 0 && /nada foi exibido|nenhum saldo foi exibido/i.test(rejection.description) && rejection.retryable, code)
  }
  for (const kind of ['network', 'timeout']) assert.equal(view.financeErrorView(new ApiError(0, {}, { kind }), 'x').retryable, true)
  const e404 = view.financeErrorView(new ApiError(404, { code: 'E_WALLET_NOT_FOUND' }), 'a wallet')
  assert.equal(e404.notFound, true)
})
await check('every adapter request is a GET (no write was ever attempted)', () => {
  assert.ok(requests.every((request) => request.method === 'GET'))
})

/* ---------- presentation ---------- */
await check('status labels: known tokens translated; unknown / inherited keys shown as sent', () => {
  assert.equal(view.investmentStatusMeta('waiting_payment').label, 'Aguardando pagamento')
  assert.equal(view.paymentStatusMeta('refunded').label, 'Reembolsado')
  for (const token of ['constructor', 'toString', '__proto__', 'future_state']) {
    assert.deepEqual(view.investmentStatusMeta(token), { label: token, tone: 'muted' })
    assert.deepEqual(view.paymentStatusMeta(token), { label: token, tone: 'muted' })
    assert.equal(view.movementStatusLabel(token), token)
    assert.equal(view.movementCategoryLabel(token), token)
  }
  assert.equal(view.movementStatusLabel(null), 'Não informado')
  assert.deepEqual(view.MOVEMENT_KIND_LABEL, { in: 'Entrada', out: 'Saída' })
})
await check('transaction references are shown partially (first 8 … last 4)', () => {
  assert.equal(view.partialReference('SYNTHTXID0000000000000000000ABCD'), 'SYNTHTXI…ABCD')
  assert.equal(view.partialReference('SHORT-REF'), 'SH…EF'); assert.equal(view.partialReference('ABC'), '••••'); assert.equal(view.partialReference(null), null)
  assert.equal(view.referenceEntry('pix_key', 'synthetic-key@example.invalid').value, 'syntheti…alid')
  assert.equal(view.referenceEntry('document', '***.***.***-00').partial, true)
  const entry = view.referenceEntry('txid', 'SYNTHTXID0000000000000000000ABCD')
  assert.equal(entry.value, 'SYNTHTXI…ABCD'); assert.equal(entry.partial, true)
  assert.equal(view.referenceEntry('end_to_end_id', 'E00000000SYNTHETIC0000000000WXYZ').value, 'E0000000…WXYZ')
  assert.equal(view.referenceEntry('investment_id', 9001).value, '9001')
})
await check('tenant names come from the wallet projection; fallback is "Whitelabel #ID", never a prototype name', () => {
  const tenants = { rows: [api.parseWallet(fx.walletRow)], page: 1, perPage: 100, total: 1, lastPage: 1 }
  assert.equal(view.tenantNames(tenants)('4'), 'Synthetic Tenant A')
  assert.equal(view.tenantNames(tenants)('9'), 'Whitelabel #9'); assert.equal(view.tenantNames(null)('4'), 'Whitelabel #4')
})
await check('server pagination text and buttons are bounded', () => {
  assert.equal(view.rangeText({ rows: [1, 2], page: 2, perPage: 20, total: 22, lastPage: 2 }, 'investimento', 'investimentos', 'Nenhum'), 'Mostrando 21–22 de 22 investimentos')
  assert.equal(view.rangeText({ rows: [], page: 1, perPage: 20, total: 0, lastPage: 1 }, 'a', 'b', 'Nenhum'), 'Nenhum')
  for (const [current, last] of [[1, 1], [1, 3], [1, 883], [440, 883], [883, 883]]) {
    const items = view.pageItems(current, last)
    assert.ok(items.includes(1) && items.includes(current) && items.includes(last) && items.length <= 7)
  }
})

/* ---------- URL state ---------- */
await check('list routes: invalid values are reported and dropped, never sent', () => {
  const { state, ignored } = route.parseInvestmentListRoute({
    status: 'pago', whitelabel: 'wl_proto_01', investidor: 'abc', oportunidade: '0', page: '-1', sort: 'amount', order: 'up', wallet: 'wal-001', search: ` ${'y'.repeat(200)} `,
  })
  assert.equal(state.status, undefined); assert.equal(state.whitelabelId, undefined); assert.equal(state.investorId, undefined)
  assert.equal(state.opportunityId, undefined); assert.equal(state.page, 1); assert.equal(state.sort, 'createdAt'); assert.equal(state.order, 'desc')
  assert.equal(state.search.length, 120); assert.equal(ignored.length, 8)
  assert.ok(ignored.some((item) => item.startsWith('wallet ')), 'prototype ?wallet= reported, not mapped')
})
await check('list routes: valid values survive a full href round trip', () => {
  const state = { status: 'paid', whitelabelId: '4', investorId: '7001', opportunityId: '501', page: 3, search: 'A&B', sort: 'amount', order: 'asc' }
  const href = route.paymentsHref(state)
  assert.equal(href, '#/finance/payments?status=paid&whitelabel=4&investidor=7001&oportunidade=501&search=A%26B&sort=amount&order=asc&page=3')
  const parsed = route.parsePaymentListRoute(Object.fromEntries(new URLSearchParams(href.split('?')[1])))
  assert.deepEqual(parsed.state, state); assert.equal(parsed.ignored.length, 0)
  assert.equal(route.investmentsHref({ page: 1, sort: 'createdAt', order: 'desc', search: '' }), '#/finance/investments')
})
await check('sort keys: only documented keys are accepted per list', () => {
  assert.equal(route.parseInvestmentListRoute({ sort: 'amount' }).state.sort, 'createdAt')
  assert.equal(route.parsePaymentListRoute({ sort: 'amount' }).state.sort, 'amount')
  assert.equal(route.parseWalletListRoute({ sort: 'authoritativeBalanceCents' }).state.sort, 'name')
  assert.equal(route.parseWalletListRoute({}).state.order, 'asc')
})
await check('detail return context only returns to the module’s own list', () => {
  const context = route.investmentsHref({ status: 'paid', page: 2, sort: 'createdAt', order: 'desc', search: '' })
  const href = route.investmentHref('9001', context)
  assert.equal(route.investmentListReturnHash(new URLSearchParams(href.split('?')[1]).get('returnTo')), context)
  assert.equal(route.investmentListReturnHash('#/whitelabels?id=4'), '#/finance/investments')
  assert.equal(route.paymentListReturnHash('https://evil.example/#/finance/payments'), '#/finance/payments')
  assert.equal(route.paymentListReturnHash('#/finance/payments?status=bogus&page=2'), '#/finance/payments?page=2')
})
await check('wallet detail route: tab, movement and alias state round trip; invalid values ignored', () => {
  const state = { tab: 'movimentacoes', movementPage: 4, kind: 'out', category: 'refund', opportunityId: '501', investmentPage: 2, investmentStatus: 'paid', movementId: 'refund:31' }
  const href = route.walletHref('4', state)
  const parsed = route.parseWalletDetailRoute(Object.fromEntries(new URLSearchParams(href.split('?')[1])))
  assert.deepEqual({ ...parsed.state, returnTo: undefined }, { ...state, returnTo: undefined }); assert.equal(parsed.ignored.length, 0)
  const bad = route.parseWalletDetailRoute({ aba: 'saldo', tipo: 'credit', categoria: 'x', mpage: '0', istatus: 'pago', oportunidade: 'opp', movimento: 'MOV-0001<script>' })
  assert.equal(bad.state.tab, 'visao-geral'); assert.equal(bad.state.kind, undefined); assert.equal(bad.state.movementPage, 1); assert.equal(bad.state.movementId, undefined)
  assert.equal(bad.ignored.length, 7)
  assert.equal(api.isServerFinanceId('9007199254740991'), true)
  assert.equal(route.walletHref('4'), '#/finance/wallets/4')
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
    ts.forEachChild(node, visit)
  }
  visit(ast)
  return found
}
await check('capability scanner detects planted writes, aliases and storage', () => {
  assert.ok(capabilities('fetch("/api/payments", { method: "POST" })').has('method:POST'))
  assert.ok(capabilities('const send = window["fetch"]; send("/x")').has('fetch'))
  assert.ok(capabilities('sessionStorage.getItem("loor_sa_access_token")').has('sessionStorage'))
  assert.ok(capabilities('import { authenticatedPatch } from "../../../lib/apiClient"').has('authenticatedPatch'))
  assert.equal(capabilities('// fetch(); POST\nconst label = "Sem POST"').size, 0)
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
const financeFiles = await walk(resolve(root, 'src/features/finance-core'))
for (const file of financeFiles) {
  const rel = relative(root, file).replaceAll('\\', '/')
  const source = await readFile(file, 'utf8')
  const found = capabilities(source)
  await check(`${rel}: no write method, transport alias or browser persistence`, () => {
    if (rel === 'src/features/finance-core/shared/financeApi.ts') assert.deepEqual([...found], ['authenticatedGet'])
    else assert.deepEqual([...found], [])
  })
  await check(`${rel}: no prototype fixture, preview override or fabricated record`, () => {
    assert.equal(/from\s+['"][^'"]*(prototype(?!Notice)|financeCoreRecords|financeCoreRefs|financeCoreModel|participants|Seeds|fixtures)/i.test(source), false)
    assert.equal(/previa|INV-\d|PG-\d|WAL-\d|MOV-\d/.test(source), false)
  })
}
await check('financeApi: the only transport import is the canonical authenticatedGet', async () => {
  const source = await readFile(resolve(root, 'src/features/finance-core/shared/financeApi.ts'), 'utf8')
  assert.match(source, /^import \{ authenticatedGet \} from '\.\.\/\.\.\/\.\.\/lib\/apiClient'$/m)
  const exported = Object.keys(api).filter((name) => typeof api[name] === 'function')
  assert.ok(exported.every((name) => /^(list|get|parse|is)/.test(name)), `adapter exports only reads: ${exported.join(', ')}`)
})
/** Source without comments (JSX kept), whitespace collapsed: text checks below cannot be satisfied by a comment. */
async function code(path) {
  const source = await readFile(resolve(root, path), 'utf8')
  return ts.transpileModule(source, { fileName: path, compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.Preserve, removeComments: true } })
    .outputText.replace(/\s+/g, ' ')
}
await check('read hooks: keys include the record id / every query value (no stale result under a new context)', async () => {
  const source = await code('src/features/finance-core/shared/useFinanceData.ts')
  for (const fragment of ['`investments:${JSON.stringify(params)}`', '`investment:${id}`', '`payments:${JSON.stringify(params)}`', '`payment:${id}`',
    '`wallets:${JSON.stringify(params)}`', '`wallet:${id}`', '`movements:${walletId}:${JSON.stringify(params)}`', '`wallet-investments:${walletId}:${JSON.stringify(params)}`']) {
    assert.ok(source.includes(fragment), fragment)
  }
  assert.ok(source.includes('from "../../../lib/useRemoteResource"') || source.includes("from '../../../lib/useRemoteResource'"))
})
await check('screens: money only through <Money>, null shown as unavailable', async () => {
  const ui = await code('src/features/finance-core/shared/FinanceCoreUi.tsx')
  assert.match(ui, /export function Money\(\{ cents, unavailable = AMOUNT_UNAVAILABLE \}\)/)
  assert.match(ui, /const text = formatCents\(cents\); if \(text === null\)/)
  for (const file of financeFiles.filter((path) => /Page\.tsx$/.test(path))) {
    const source = await readFile(file, 'utf8')
    assert.equal(/\/\s*100\b|toFixed\(|parseFloat|reduce\(/.test(source), false, `${relative(root, file)}: no float money math or client-side sums`)
  }
})
await check('wallet movements panel follows the clamp downwards only (no endless page loop)', async () => {
  const source = await code('src/features/finance-core/wallets/WalletDetailPage.tsx')
  assert.ok(source.includes('if (data && data.page < route.movementPage) navigate({ movementPage: data.page, movementId: undefined });'))
  assert.equal(/data\.page !== route\.movementPage/.test(source), false)
})
await check('App routes hand the Finance pages raw URL params; wallet detail remounts per wallet', async () => {
  const app = await code('src/app/App.tsx')
  for (const page of ['InvestmentsPage', 'PaymentsPage', 'WalletsPage']) assert.match(app, new RegExp(`<${page} \\{\\.\\.\\.route\\.params\\} ?/>`))
  assert.match(app, /<WalletDetailPage key=\{route\.walletId\} walletId=\{route\.walletId\} routeKey=\{route\.search\} \{\.\.\.route\.params\} ?\/>/)
  assert.match(app, /<InvestmentDetailPage key=\{route\.investmentId\} investmentId=\{route\.investmentId\} returnTo=\{route\.returnTo\} ?\/>/)
  assert.match(app, /<PaymentDetailPage key=\{route\.paymentId\} paymentId=\{route\.paymentId\} returnTo=\{route\.returnTo\} ?\/>/)
})
await check('wallet existence is established before any alias or movement panel can mount', async () => {
  const source = await code('src/features/finance-core/wallets/WalletDetailPage.tsx')
  const guard = source.indexOf("if (detail.state.status !== 'success')")
  const content = source.indexOf('<WalletContent wallet={wallet}')
  assert.ok(guard >= 0 && content > guard)
  const outer = source.slice(source.indexOf('export function WalletDetailPage'), source.indexOf('function WalletContent'))
  assert.equal(/useWalletInvestments\(|useWalletMovements\(/.test(outer), false)
})
await check('Finance investor links use server identities; unintegrated Opportunity routes are never offered', async () => {
  for (const file of financeFiles.filter((path) => /Page\.tsx$/.test(path))) {
    const source = await readFile(file, 'utf8')
    assert.equal(/#\/operation\/opportunities|opportunityHref\(|opportunityById\(/.test(source), false, relative(root, file))
  }
  assert.equal(route.investorProfileHref('7001'), '#/operation/investors/7001')
})
await check('shared KYC/Audit components keep their baseline runtime bodies and prop behavior', async () => {
  const path = 'src/features/finance-core/shared/FinanceCoreUi.tsx'
  const baseline = execFileSync('git', ['show', `874ff9320fadc4e6a081fda9dd50359bcdfd4f89:${path}`], { cwd: root, encoding: 'utf8' })
  const current = await readFile(resolve(root, path), 'utf8')
  function functionCode(source, name) {
    const file = ts.createSourceFile('Shared.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const node = file.statements.find((item) => ts.isFunctionDeclaration(item) && item.name?.text === name)
    assert.ok(node, name)
    return ts.transpileModule(node.getText(file), { compilerOptions: { jsx: ts.JsxEmit.Preserve, removeComments: true } }).outputText
  }
  for (const name of ['KeyValueList', 'DetailHero', 'TabPanel', 'ContextChip', 'DateStack']) {
    assert.equal(functionCode(current, name), functionCode(baseline, name), name)
  }
  // The only runtime change in SortSelect is a backward-compatible optional label.
  const sort = functionCode(current, 'SortSelect')
    .replace(", label = 'Ordenar por'", '')
    .replace('{label}', 'Ordenar por')
  assert.equal(sort, functionCode(baseline, 'SortSelect'))
})
for (const file of ['financeCoreRecords.ts', 'prototypeFinanceCore.ts', 'financeCoreRefs.ts', 'financeCoreModel.ts']) {
  await check(`illustrative Finance records removed from the application: ${file}`, () =>
    assert.rejects(access(resolve(root, 'src/features/finance-core/shared', file))))
}
await check('Gateways, Modalities and Catalogs remain prototype screens (not reclassified as authoritative)', async () => {
  for (const dir of ['finance-gateways', 'finance-modalities', 'finance-catalogs']) {
    for (const file of await walk(resolve(root, 'src/features', dir))) {
      assert.equal(/financeApi|authenticatedGet|useFinanceData/.test(await readFile(file, 'utf8')), false, relative(root, file))
    }
  }
})

console.log(`Finance Read V1 contracts: ${checks} passed (synthetic fixtures, injected GET-only transport, no network, no financial writes)`)
