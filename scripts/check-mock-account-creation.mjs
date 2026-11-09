/** Account creation demonstration: isolated in-memory behavior, never Backend E2E. */
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'

const root = process.cwd(), require = createRequire(import.meta.url)
const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'loor-account-creation-'))
let compiledSequence = 0

// Each loader gets independent module identities, equivalent to resetting the demo tab.
function createLoader() {
  const outputs = new Map()
  async function compile(file) {
    if (outputs.has(file)) return outputs.get(file)
    const destination = path.join(temporaryRoot, `${compiledSequence++}.mjs`)
    outputs.set(file, destination)
    if (file.endsWith('.json')) {
      await fs.writeFile(destination, `export default ${await fs.readFile(file, 'utf8')}`)
      return destination
    }
    let source = ts.transpileModule(await fs.readFile(file, 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
    }).outputText
    for (const match of [...source.matchAll(/(^\s*(?:import|export)[^\n]*?\sfrom\s*)(['"])([^'"]+)\2/gm)]) {
      const specifier = match[3]
      let resolved
      if (specifier.startsWith('.')) {
        const base = path.resolve(path.dirname(file), specifier)
        for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}.json`]) {
          try { if ((await fs.stat(candidate)).isFile()) { resolved = await compile(candidate); break } } catch {}
        }
        assert.ok(resolved, `Unresolved ${specifier} from ${file}`)
      } else resolved = require.resolve(specifier)
      source = source.replace(match[0], `${match[1]}${JSON.stringify(pathToFileURL(resolved).href)}`)
    }
    await fs.writeFile(destination, source)
    return destination
  }
  return async relative => import(pathToFileURL(await compile(path.join(root, relative))).href)
}

const networkDescriptors = new Map()
let networkAttempts = 0
for (const name of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource']) {
  networkDescriptors.set(name, Object.getOwnPropertyDescriptor(globalThis, name))
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value: function () {
    networkAttempts++
    throw new Error(`Network forbidden during offline account creation: ${name}`)
  } })
}

try {
  const load = createLoader()
  const { mockRequest } = await load('src/mock/mockBackend.ts')
  const accounts = await load('src/features/whitelabel-accounts/accountsApi.ts')
  const investors = await load('src/features/operation/investors/investorApi.ts')
  const entrepreneurs = await load('src/features/operation/entrepreneurs/entrepreneurApi.ts')
  const investorOverview = await load('src/features/operation/investors/investorOverviewApi.ts')
  const entrepreneurOverview = await load('src/features/operation/entrepreneurs/entrepreneurOverviewApi.ts')
  const admin = await load('src/features/whitelabel-accounts/admin/adminLifecycleContract.ts')
  const drafts = await load('src/mock/account-creation/accountCreationDrafts.ts')
  const model = await load('src/mock/account-creation/accountCreationModel.ts')
  assert.equal(investors.investorTypeLabel('pessoa_fisica'), 'Pessoa física')
  assert.equal(investors.investorTypeLabel('pessoa_juridica'), 'Pessoa jurídica')
  assert.equal(investors.investorTypeLabel('unknown_type'), 'unknown_type')
  const login = async (email = 'demo@example.invalid') => {
    const response = await mockRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email, password: 'demo' }) })
    assert.equal(response.status, 200)
    return { Authorization: `Bearer ${(await response.json()).accessToken}` }
  }
  const headers = await login()
  const request = (route, method = 'GET', body, auth = headers) => mockRequest(route, {
    method, headers: auth, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const get = async route => {
    const response = await request(route)
    assert.equal(response.status, 200, route)
    return response.json()
  }

  const creationRoute = (tenant, kind) => `/mock/account-creation/whitelabels/${tenant}/${kind}`
  const investorInput = { full_name: '  Investidora Demo Inicial  ', email: '  ACCOUNT-CREATION@example.invalid  ', phone: '+55 (11) 99999-0000', investor_type: 'pessoa_fisica' }
  const entrepreneurInput = { full_name: 'Empreendedora Demo Inicial', email: 'account-creation@example.invalid', phone: '11988880000' }
  const financeBefore = Object.fromEntries(await Promise.all(['wallets', 'payments', 'investments'].map(async route => [route, await get(`/${route}`)])))
  const initialInvestors = await get('/investors?perPage=100')
  const initialEntrepreneurs = await get('/entrepreneurs?perPage=100')

  // The pure validator rejects malformed fields and unsupported creation responsibilities.
  assert.deepEqual(model.validateAccountCreation('investor', investorInput).errors, {})
  assert.deepEqual(model.validateAccountCreation('entrepreneur', entrepreneurInput).errors, {})
  assert.deepEqual(model.validateAccountCreation('investor', { ...investorInput, full_name: 'x'.repeat(256), phone: '12345' }).errors, {})
  assert.deepEqual(model.validateAccountCreation('investor', { ...investorInput, phone: '1'.repeat(18) }).errors, {})
  for (const patch of [
    { full_name: '' }, { full_name: 'AB' }, { full_name: 'x'.repeat(257) },
    { email: 'invalid' }, { email: 'one@@example.invalid' }, { email: `${'x'.repeat(244)}@example.invalid` },
    { phone: '' }, { phone: '1234' }, { phone: '1'.repeat(19) }, { phone: '119text88800' },
    { investor_type: 'individual' }, { investor_type: '' }, { password: 'never-accepted' }, { termsAcceptedAt: '2026-10-26' },
  ]) {
    const input = { ...investorInput, ...patch }
    assert.ok(Object.keys(model.validateAccountCreation('investor', input).errors).length, `Validator accepted ${JSON.stringify(patch)}`)
    const response = await request(creationRoute('1', 'investor'), 'POST', input)
    assert.equal(response.status, 422, JSON.stringify(patch))
    assert.equal((await response.json()).code, 'MOCK_ACCOUNT_INPUT_INVALID')
  }
  assert.ok(Object.keys(model.validateAccountCreation('entrepreneur', { ...entrepreneurInput, investor_type: 'pessoa_fisica' }).errors).length)
  assert.equal((await request(creationRoute('1', 'entrepreneur'), 'POST', { ...entrepreneurInput, investor_type: 'pessoa_fisica' })).status, 422)
  assert.equal((await request(creationRoute('999999', 'investor'), 'POST', investorInput)).status, 404)
  assert.equal((await request(creationRoute('1', 'admin'), 'POST', investorInput)).status, 405)
  assert.equal((await request(creationRoute('1', 'investor'))).status, 405)
  assert.equal((await get('/investors?perPage=100')).meta.total, initialInvestors.meta.total, 'Invalid attempts must not create accounts')
  assert.equal((await get('/entrepreneurs?perPage=100')).meta.total, initialEntrepreneurs.meta.total)

  // Drafts are memory-only and isolated by both canonical tenant identity and domain kind.
  drafts.resetAccountDrafts()
  assert.equal(drafts.hasAccountDraft('1', 'investor'), false)
  assert.equal(drafts.getAccountDraft('1', 'investor').investor_type, 'pessoa_fisica')
  for (const tenant of ['0', '01', '1e3', '1.5', '9007199254740992']) assert.throws(() => drafts.getAccountDraft(tenant, 'investor'))
  assert.throws(() => drafts.getAccountDraft('1', 'admin'))
  let draftNotifications = 0
  const unsubscribe = drafts.subscribeAccountDrafts(() => { draftNotifications++ })
  const savedInput = { full_name: 'Rascunho Inicial', email: 'draft@example.invalid', phone: '11988880000', investor_type: 'pessoa_fisica' }
  drafts.saveAccountDraft('1', 'investor', savedInput)
  savedInput.full_name = 'Mutation outside the store'
  assert.equal(drafts.getAccountDraft('1', 'investor').full_name, 'Rascunho Inicial')
  assert.equal(drafts.hasAccountDraft('1', 'investor'), true)
  assert.equal(drafts.hasAccountDraft('2', 'investor'), false)
  assert.equal(drafts.hasAccountDraft('1', 'entrepreneur'), false)
  assert.equal(drafts.getAccountDraft('2', 'investor').email, '')
  assert.equal(drafts.getAccountDraft('1', 'entrepreneur').email, '')
  drafts.saveAccountDraft('1', 'investor', { email: 'edited-draft@example.invalid' })
  assert.equal(drafts.getAccountDraft('1', 'investor').full_name, 'Rascunho Inicial')
  assert.equal(drafts.getAccountDraft('1', 'investor').email, 'edited-draft@example.invalid')
  const returnedDraft = drafts.getAccountDraft('1', 'investor')
  try { returnedDraft.full_name = 'Mutation of a returned value' } catch {}
  assert.equal(drafts.getAccountDraft('1', 'investor').full_name, 'Rascunho Inicial')
  drafts.saveAccountDraft('2', 'investor', { full_name: 'Outro tenant' })
  drafts.saveAccountDraft('1', 'entrepreneur', { full_name: 'Outro tipo' })
  drafts.discardAccountDraft('1', 'investor')
  assert.equal(drafts.hasAccountDraft('1', 'investor'), false)
  assert.equal(drafts.getAccountDraft('1', 'investor').email, '')
  assert.equal(drafts.getAccountDraft('2', 'investor').full_name, 'Outro tenant')
  assert.equal(drafts.getAccountDraft('1', 'entrepreneur').full_name, 'Outro tipo')
  assert.ok(draftNotifications > 0)
  unsubscribe()
  const notificationCount = draftNotifications
  drafts.resetAccountDrafts()
  assert.equal(draftNotifications, notificationCount)
  assert.equal(drafts.hasAccountDraft('2', 'investor'), false)
  assert.equal(drafts.hasAccountDraft('1', 'entrepreneur'), false)

  // The app-lifetime session binding still clears drafts while creation forms are unmounted.
  const sessionListeners = new Set()
  const stopWatchingSession = drafts.watchAccountDraftSession(listener => {
    sessionListeners.add(listener)
    return () => sessionListeners.delete(listener)
  })
  const unmountFormObserver = drafts.subscribeAccountDrafts(() => {})
  drafts.saveAccountDraft('1', 'investor', { full_name: 'Draft from previous operator' })
  drafts.saveAccountDraft('2', 'investor', { full_name: 'Other tenant from previous operator' })
  drafts.saveAccountDraft('1', 'entrepreneur', { full_name: 'Other domain from previous operator' })
  unmountFormObserver()
  for (const listener of sessionListeners) listener()
  assert.equal(drafts.hasAccountDraft('1', 'investor'), false)
  assert.equal(drafts.hasAccountDraft('2', 'investor'), false)
  assert.equal(drafts.hasAccountDraft('1', 'entrepreneur'), false)
  stopWatchingSession()
  assert.equal(sessionListeners.size, 0)
  drafts.saveAccountDraft('1', 'investor', { full_name: 'Independent draft after watcher cleanup' })
  for (const listener of sessionListeners) listener()
  assert.equal(drafts.hasAccountDraft('1', 'investor'), true)
  drafts.resetAccountDrafts()

  const abortedCreate = new AbortController()
  const interruptedRequest = mockRequest(creationRoute('1', 'investor'), {
    method: 'POST', headers, signal: abortedCreate.signal, body: JSON.stringify(investorInput),
  })
  abortedCreate.abort()
  await assert.rejects(interruptedRequest, error => error.name === 'AbortError')
  assert.equal((await get('/investors?perPage=100')).meta.total, initialInvestors.meta.total, 'Cancellation before completion must not persist a record')

  const created = []
  for (const [kind, input, tipo, route, parseDomain] of [
    ['investor', investorInput, 'investidores', 'investors', investors.parseInvestorDetail],
    ['entrepreneur', entrepreneurInput, 'empreendedores', 'entrepreneurs', entrepreneurs.parseEntrepreneurDetail],
  ]) {
    const response = await request(creationRoute('1', kind), 'POST', input)
    assert.equal(response.status, 201, kind)
    const receipt = await response.json(), row = receipt.data
    assert.equal(receipt.mockOnly, true)
    assert.ok(Number.isSafeInteger(row.id) && row.id > 0)
    assert.equal(row.whitelabelId, 1)
    assert.equal(row.type, kind)
    assert.equal(row.fullName, input.full_name.trim())
    assert.equal(row.email, input.email.trim().toLowerCase())
    assert.equal(row.emailVerifiedAt, null)
    assert.equal(row.termsAcceptedAt, null)
    assert.equal(row.termsRevisionId, null)
    assert.equal(row.credentialsProvisioned, false)
    assert.equal(row.personalInformationFilled, false)
    assert.equal(Object.hasOwn(row, 'password'), false)
    assert.equal(row.businessState, kind === 'investor' ? 'waiting' : 'incomplete')
    const scoped = await get(`/whitelabels/1/accounts/${row.id}?tipo=${tipo}`)
    assert.equal(accounts.parseAccountDetail(scoped, kind).record.id, String(row.id))
    const syntheticRead = await get(`${creationRoute('1', kind)}/${row.id}`)
    assert.equal(syntheticRead.mockOnly, true)
    assert.equal(syntheticRead.data.id, row.id)
    assert.equal((await request(`${creationRoute('2', kind)}/${row.id}`)).status, 404)
    assert.equal((await get(`${creationRoute('1', kind)}/1`)).data, null, 'Existing demonstration seed must not be relabelled as a newly created account')
    const domain = parseDomain(await get(`/${route}/${row.id}`))
    assert.equal(domain.id, String(row.id))
    assert.equal(domain.whitelabelId, '1')
    assert.equal(domain.emailVerifiedAt, null)
    const scopedList = accounts.parseAccountList(await get(`/whitelabels/1/accounts?tipo=${tipo}&search=${encodeURIComponent(row.email)}`), kind, '1')
    assert.equal(scopedList.rows.length, 1)
    assert.equal(scopedList.rows[0].record.id, String(row.id))
    assert.equal((await request(`/whitelabels/2/accounts/${row.id}?tipo=${tipo}`)).status, 404)
    assert.equal((await get(`/whitelabels/2/accounts?tipo=${tipo}&search=${encodeURIComponent(row.email)}`)).data.length, 0)
    const duplicate = await request(creationRoute('1', kind), 'POST', { ...input, email: `  ${row.email.toUpperCase()}  ` })
    assert.equal(duplicate.status, 409)
    assert.equal((await duplicate.json()).code, 'MOCK_EMAIL_TAKEN')
    const otherTenantResponse = await request(creationRoute('2', kind), 'POST', { ...input, email: `  ${row.email.toUpperCase()}  ` })
    assert.equal(otherTenantResponse.status, 201, 'Core participant identities are scoped by tenant and domain')
    const otherTenantRow = (await otherTenantResponse.json()).data
    assert.equal(otherTenantRow.whitelabelId, 2)
    assert.notEqual(otherTenantRow.id, row.id)
    const otherTenantScoped = accounts.parseAccountDetail(await get(`/whitelabels/2/accounts/${otherTenantRow.id}?tipo=${tipo}`), kind)
    assert.equal(otherTenantScoped.record.whitelabelId, '2')
    assert.equal(otherTenantScoped.record.email, row.email)
    assert.equal((await request(`/whitelabels/1/accounts/${otherTenantRow.id}?tipo=${tipo}`)).status, 404)
    created.push({ kind, row: otherTenantRow })
    const overviewRaw = await get(`/${route}/${row.id}/overview`)
    const overview = overviewRaw.data
    const parsedOverview = kind === 'investor'
      ? investorOverview.parseInvestorOverview(overviewRaw, String(row.id))
      : entrepreneurOverview.parseEntrepreneurOverview(overviewRaw, String(row.id))
    assert.equal(parsedOverview.account.emailVerifiedAt, null)
    assert.equal(parsedOverview.account.lastLoginAt, null)
    assert.equal(overview.account.emailVerifiedAt, null)
    assert.equal(overview.account.lastLoginAt, null)
    if (kind === 'investor') {
      assert.equal(parsedOverview.investor.id, String(row.id))
      assert.equal(parsedOverview.personalData.personalInformationFilled, false)
      assert.equal(parsedOverview.kyc, null)
      assert.equal(parsedOverview.wallet, null)
      assert.equal(overview.personalData.personalInformationFilled, false)
      assert.equal(overview.wallet, null)
      assert.doesNotMatch(JSON.stringify(overview.kyc), /approved|accepted|verified/)
      assert.equal(overview.summary.investmentsCount, 0)
      assert.equal(overview.summary.investedAmountCents, 0)
      assert.equal(overview.summary.paymentsCount, 0)
      assert.deepEqual(overview.recentInvestments, [])
      assert.deepEqual(overview.recentPayments, [])
    } else {
      assert.equal(parsedOverview.entrepreneur.id, String(row.id))
      assert.equal(parsedOverview.company, null)
      assert.equal(overview.company, null)
      assert.equal(overview.summary.opportunitiesCount, 0)
      assert.deepEqual(overview.opportunities, [])
    }
    created.push({ kind, row })
  }
  const juridical = await request(creationRoute('2', 'investor'), 'POST', { ...investorInput, full_name: 'Representante Demo PJ', email: 'account-creation-pj@example.invalid', investor_type: 'pessoa_juridica' })
  assert.equal(juridical.status, 201)
  assert.equal((await juridical.json()).data.investorType, 'pessoa_juridica')
  assert.equal((await get('/investors?perPage=100')).meta.total, initialInvestors.meta.total + 3)
  assert.equal((await get('/entrepreneurs?perPage=100')).meta.total, initialEntrepreneurs.meta.total + 2)

  for (const roleEmail of ['readonly@example.invalid', 'support@example.invalid']) {
    const roleHeaders = await login(roleEmail)
    assert.equal((await request(creationRoute('1', 'investor'), 'POST', { ...investorInput, email: `${roleEmail.split('@')[0]}-new@example.invalid` }, roleHeaders)).status, 403)
  }
  assert.equal((await request(creationRoute('1', 'investor'), 'POST', investorInput, {})).status, 401)
  assert.equal((await request(creationRoute('1', 'investor'), 'POST', investorInput, { Authorization: 'Bearer real-token-is-unusable' })).status, 401)
  for (const route of ['wallets', 'payments', 'investments']) assert.deepEqual(await get(`/${route}`), financeBefore[route], `Account creation mutated ${route}`)

  // Reload/reset creates a fresh synthetic database and draft realm, without persistence.
  drafts.saveAccountDraft('1', 'investor', { full_name: 'Rascunho antes do reset' })
  const loadAfterReset = createLoader()
  const resetMock = await loadAfterReset('src/mock/mockBackend.ts')
  const resetDrafts = await loadAfterReset('src/mock/account-creation/accountCreationDrafts.ts')
  assert.equal(resetDrafts.hasAccountDraft('1', 'investor'), false)
  for (const { kind, row } of created) {
    const route = kind === 'investor' ? 'investors' : 'entrepreneurs'
    assert.equal((await resetMock.mockRequest(`/${route}/${row.id}`, { headers })).status, 404)
  }

  // The existing administrator credential contract remains the single Admin creation path.
  assert.throws(() => admin.createAdminPayload({ email: 'invalid', password: 'demo-password' }))
  assert.throws(() => admin.createAdminPayload({ email: 'admin@example.invalid', password: '1234567' }))
  assert.throws(() => admin.createAdminPayload({ email: 'admin@example.invalid', password: 'x'.repeat(61) }))
  assert.equal(admin.createAdminPayload({ email: '  ADMIN@example.invalid ', password: '12345678' }).email, 'admin@example.invalid')
  const adminResponse = await request('/whitelabels/1/admins', 'POST', admin.createAdminPayload({
    email: 'account-creation-admin@example.invalid', password: 'synthetic-password',
  }))
  assert.equal(adminResponse.status, 201)
  const adminRaw = await adminResponse.json()
  assert.notEqual(adminRaw.data.invitation, 'accepted')
  assert.equal(adminRaw.data.emailVerifiedAt, null)
  assert.equal(adminRaw.data.credentialsProvisioned, false)
  assert.equal(Object.hasOwn(adminRaw.data, 'password'), false)
  const adminRecord = admin.adminReceipt(adminRaw, '1')
  const adminRead = await get(`/whitelabels/1/admins/${adminRecord.id}`)
  assert.equal(admin.adminReceipt(adminRead.data, '1', adminRecord.id).id, adminRecord.id)
  assert.equal((await request(`/whitelabels/2/admins/${adminRecord.id}`)).status, 404)
  assert.equal((await request('/whitelabels/1/admins', 'POST', { email: 'account-creation-admin@example.invalid', password: 'synthetic-password' })).status, 422)

  // Every unsupported or external destination must remain inside the refusal boundary.
  for (const route of ['https://outside.example.invalid/accounts', '//outside.example.invalid/accounts', '/\\outside.example.invalid/accounts']) {
    assert.equal((await request(route, 'POST', {})).status, 400)
  }
  assert.equal((await request('/investors', 'POST', {})).status, 405)
  assert.equal((await request('/entrepreneurs', 'POST', {})).status, 405)
  assert.equal((await request('/wallets/1/cashout', 'POST', {})).status, 405)
  assert.equal((await request('/payments/1', 'PATCH', { status: 'paid' })).status, 405)
  assert.equal(networkAttempts, 0)

  console.log('Mock account creation passed: participant validation, immutable tenant/type drafts, 3 creation/readback variants, pending onboarding truthfulness, duplicate/role isolation, existing Admin contract, independent reset and frozen Finance. No network invoked.')
} finally {
  for (const [name, descriptor] of networkDescriptors) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor)
    else delete globalThis[name]
  }
  assert.ok(path.resolve(temporaryRoot).startsWith(path.resolve(os.tmpdir()) + path.sep))
  await fs.rm(temporaryRoot, { recursive: true, force: true })
}
