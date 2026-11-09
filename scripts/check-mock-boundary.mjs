/** Permanent mock-branch safety + protocol regression. No browser or network is used. */
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'

const root = process.cwd(), require = createRequire(import.meta.url)
const api = await fs.readFile(path.join(root, 'src/lib/api.ts'), 'utf8')
const html = await fs.readFile(path.join(root, 'index.html'), 'utf8')
const deploymentGuard = await fs.readFile(path.join(root, 'netlify.toml'), 'utf8')
assert.match(api, /response = await mockRequest\(/)
assert.doesNotMatch(api, /import\.meta\.env|\bfetch\s*\(/)
assert.match(html, /connect-src 'none'/)
assert.match(html, /form-action 'none'/)
assert.match(deploymentGuard, /ignore = "exit 0"/)
assert.match(deploymentGuard, /process\.exit\(1\)/)
const auth = await fs.readFile(path.join(root, 'src/lib/authSession.ts'), 'utf8')
assert.match(auth, /loor_sa_mock_session/)
assert.doesNotMatch(auth, /'loor_sa_access_token'|'loor_sa_operator'/)
async function auditSource(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) await auditSource(p)
    else if (/\.[jt]sx?$/.test(p)) assert.doesNotMatch(await fs.readFile(p, 'utf8'), /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\s*\(|navigator\.sendBeacon\s*\(/, p)
  }
}
await auditSource(path.join(root, 'src'))

// Transpile only source dependencies into an isolated OS temp directory; never edit application files.
const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'loor-offline-mock-'))
const outputs = new Map()
async function compile(file) {
  if (outputs.has(file)) return outputs.get(file)
  const target = path.join(temp, `${outputs.size}.mjs`)
  outputs.set(file, target)
  if (file.endsWith('.json')) { await fs.writeFile(target, `export default ${await fs.readFile(file, 'utf8')}`); return target }
  let js = ts.transpileModule(await fs.readFile(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const matches = [...js.matchAll(/(^\s*(?:import|export)[^\n]*?\sfrom\s*)(['"])([^'"]+)\2/gm)]
  for (const match of matches) {
    const specifier = match[3]
    let destination
    if (specifier.startsWith('.')) {
      const base = path.resolve(path.dirname(file), specifier)
      let found
      for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}.json`]) { try { if ((await fs.stat(candidate)).isFile()) { found = candidate; break } } catch {} }
      assert.ok(found, `unresolved ${specifier} from ${file}`)
      destination = await compile(found)
    } else destination = require.resolve(specifier)
    js = js.replace(match[0], `${match[1]}${JSON.stringify(pathToFileURL(destination).href)}`)
  }
  await fs.writeFile(target, js)
  return target
}
let assertions = 0
try {
  const { mockRequest } = await import(pathToFileURL(await compile(path.join(root, 'src/mock/mockBackend.ts'))).href)
  const load = async p => import(pathToFileURL(await compile(path.join(root, p))).href)
  const whitelabel = await load('src/features/whitelabels/whitelabelApi.ts')
  const investor = await load('src/features/operation/investors/investorApi.ts')
  const entrepreneur = await load('src/features/operation/entrepreneurs/entrepreneurApi.ts')
  const opportunity = await load('src/features/operation/opportunities/opportunityApi.ts')
  const company = await load('src/features/operation/companies/companyApi.ts')
  const finance = await load('src/features/finance-core/shared/financeApi.ts')
  const kyc = await load('src/features/compliance-kyc/kycReadApi.ts')
  const audit = await load('src/features/governance-audit/auditApi.ts')
  const settings = await load('src/features/whitelabel-settings/settingsReadApi.ts')
  const operators = await load('src/features/control-plane-operators/operatorApi.ts')
  const visibility = await load('src/features/menu-visibility/menuVisibilityContract.ts')
  const writeContract = await load('src/features/operation/opportunities/write/opportunityWriteContract.ts')
  const adminContract = await load('src/features/whitelabel-accounts/admin/adminLifecycleContract.ts')
  const login = await mockRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email: 'demo@example.invalid', password: 'demo' }) })
  const session = await login.json(), headers = { Authorization: `Bearer ${session.accessToken}` }
  const request = async (p, method = 'GET', body) => mockRequest(p, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const get = async p => { const response = await request(p); assert.equal(response.status, 200, p); assertions++; return response.json() }
  const lists = [
    ['/whitelabels', whitelabel.parseWhitelabelList], ['/investors', investor.parseInvestorList], ['/entrepreneurs', entrepreneur.parseEntrepreneurList],
    ['/opportunities', raw => opportunity.parsePage(raw, opportunity.parseOpportunity, r => r.id)], ['/companies?perPage=10', company.parseCompanyList], ['/audit?perPage=8', audit.parseAuditList],
  ]
  for (const [p, parse] of lists) assert.ok(parse(await get(p)).rows.length > 0, p)
  assert.ok(whitelabel.parseWhitelabel(await get('/whitelabels/1')))
  assert.ok(investor.parseInvestorDetail(await get('/investors/1')))
  assert.ok(entrepreneur.parseEntrepreneurDetail(await get('/entrepreneurs/1')))
  assert.ok(opportunity.parseOpportunityDetail(await get('/opportunities/1')))
  assert.ok(company.parseCompanyDetail(await get('/companies/301')))
  const accounts = await load('src/features/whitelabel-accounts/accountsApi.ts')
  for (const [kind, tipo] of [['investor', 'investidores'], ['entrepreneur', 'empreendedores'], ['admin', 'administradores']]) {
    assert.ok(accounts.parseAccountList(await get(`/whitelabels/1/accounts?tipo=${tipo}`), kind, '1').rows.length)
    assert.ok(accounts.parseAccountDetail(await get(`/whitelabels/1/accounts/1?tipo=${tipo}`), kind))
  }
  for (const [route, parser] of [['investments', finance.parseInvestmentDetail], ['payments', finance.parsePaymentDetail], ['wallets', finance.parseWalletDetail]]) {
    const list = await get(`/${route}`)
    assert.ok(list.data.length)
    for (const row of list.data) assert.ok(parser(await get(`/${route}/${row.id}`)))
  }
  const movements = await get('/wallets/1/movements')
  for (const row of movements.data) assert.ok(finance.parseMovement(row))
  assert.ok(kyc.parseKycReadPage(await get('/compliance/kyc'), 1).rows.length)
  assert.ok(kyc.parseKycReadDetail(await get('/compliance/kyc/101'), '101'))
  assert.ok(settings.parseSettingsRead(await get('/whitelabels/1/settings'), '1'))
  assert.ok(operators.parseOperatorPage(await get('/operators'), { page: 1, search: '', order: 'desc' }).rows.length)
  assert.equal(visibility.parseMenuVisibilityResponse(await get('/homolog/menu-visibility')).version, 1)
  assert.equal((await request('/payments/45', 'PATCH', { status: 'paid' })).status, 405)
  assert.equal((await request('/wallets/1/cashout', 'POST', {})).status, 405)
  assert.equal((await request('https://real.example/api', 'POST')).status, 400)
  assert.equal((await request('//real.example/api')).status, 400)
  assert.equal((await mockRequest('/auth/me', { headers: { Authorization: 'Bearer existing-real-token-must-fail' } })).status, 401)
  const created = await request('/whitelabels', 'POST', { name: 'Demo local', slug: 'demo-local', baseUrl: 'https://demo.example.invalid' })
  assert.equal(created.status, 201)
  const createdRow = (await created.json()).data
  assert.equal((await get(`/whitelabels/${createdRow.id}`)).name, 'Demo local')
  assert.equal((await request(`/whitelabels/${createdRow.id}`, 'PATCH', { name: 'Demo editado' })).status, 200)
  assert.equal((await get(`/whitelabels/${createdRow.id}`)).name, 'Demo editado')
  assert.equal((await request('/whitelabels/1/accounts/1/pause?tipo=investidores', 'POST', { reason: 'Somente demonstração' })).status, 201)
  assert.equal((await get('/whitelabels/1/accounts/1?tipo=investidores')).data.accessState, 'paused')
  assert.equal((await request('/whitelabels/1/accounts/1/reactivate?tipo=investidores', 'POST')).status, 201)
  assert.equal((await get('/whitelabels/1/accounts/1?tipo=investidores')).data.accessState, 'active')
  const newAdmin = await request('/whitelabels/1/admins', 'POST', { email: 'new-admin@example.invalid', password: 'demonstration-only' })
  assert.equal(newAdmin.status, 201)
  const adminRow = adminContract.adminReceipt(await newAdmin.json(), '1')
  assert.equal(adminRow.accessState, 'active')
  const deactivated = await request(`/whitelabels/1/admins/${adminRow.id}/deactivate`, 'PATCH')
  assert.equal(adminContract.adminReceipt(await deactivated.json(), '1', adminRow.id).businessState, 'disabled')
  const dedicatedAdminRead = await get(`/whitelabels/1/admins/${adminRow.id}`)
  assert.equal(dedicatedAdminRead.status, 200)
  assert.equal(adminContract.adminReceipt(dedicatedAdminRead.data, '1', adminRow.id).accessState, 'paused')
  for (const kind of ['entrepreneurs', 'segments', 'resource-utilizations', 'contracts', 'investor-profiles']) {
    assert.ok(writeContract.parseHelper(await get(`/opportunities/helpers/${kind}?whitelabelId=1`), '1', kind).length)
  }
  const newOpportunity = await request('/opportunities', 'POST', { whitelabelId: 1, entrepreneurId: 1, modality: 'debt', is_private: false,
    opportunity: { name: 'Oportunidade Demo local', business_name: 'Empresa Demo', about: 'Texto de exemplo', description: 'Exemplo', image_id: 100 } })
  assert.equal(newOpportunity.status, 201)
  const createdOpportunity = await newOpportunity.json(), opportunityId = String(createdOpportunity.data.id)
  assert.equal(writeContract.parseEditable(createdOpportunity, opportunityId, '1').status, 'review')
  const editedOpportunity = await request(`/opportunities/${opportunityId}`, 'PATCH', { about: 'Descrição alterada somente na demonstração.' })
  assert.equal(writeContract.parseEditable(await editedOpportunity.json(), opportunityId, '1').values.about, 'Descrição alterada somente na demonstração.')
  assert.equal((await request(`/opportunities/${opportunityId}/archive`, 'POST', { reason: 'Arquivamento da demonstração somente local.' })).status, 201)
  assert.equal(opportunity.parseOpportunityDetail(await get(`/opportunities/${opportunityId}`)).status, 'archived')
  const originalMenu = await get('/homolog/menu-visibility'), newMap = { ...originalMenu.data.visibility, ajuda: false }
  const menuSaved = await request('/homolog/menu-visibility', 'PUT', { version: originalMenu.data.version, visibility: newMap })
  assert.equal(menuSaved.status, 200)
  assert.equal(visibility.parseMenuVisibilityResponse(await menuSaved.json()).version, 2)
  assert.equal((await request('/homolog/menu-visibility', 'PUT', { version: 1, visibility: newMap })).status, 409)
  const readonlyLogin = await mockRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email: 'readonly@example.invalid', password: 'demo' }) })
  const readonlySession = await readonlyLogin.json(), readonlyHeaders = { Authorization: `Bearer ${readonlySession.accessToken}` }
  assert.equal((await mockRequest('/whitelabels', { method: 'POST', headers: readonlyHeaders, body: '{}' })).status, 403)
  assert.equal((await mockRequest('/operators', { headers: readonlyHeaders })).status, 403)
  console.log(`Mock isolation/protocol passed: ${assertions} successful protocol reads plus static network, independent Finance, local mutation and session rejection checks. No network invoked.`)
} finally {
  // Absolute mkdtemp-owned directory only; no repository paths are removed.
  assert.ok(path.resolve(temp).startsWith(path.resolve(os.tmpdir()) + path.sep))
  await fs.rm(temp, { recursive: true, force: true })
}
