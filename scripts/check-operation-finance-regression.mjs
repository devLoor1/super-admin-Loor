import assert from 'node:assert/strict'
import { access } from 'node:fs/promises'
import { readFile } from './reviewed-consolidation-boundary.mjs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

// Maintained source/model regression checks. No browser, real token or network.
// Historical browser runners lived only in scratch sessions, not this repository.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(pathToFileURL(resolve(root, 'package.json')))
const modules = new Map()
async function moduleUrl(path) {
  if (modules.has(path)) return modules.get(path)
  let code = ts.transpileModule(await readFile(path, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText.replaceAll('import.meta.env', '({VITE_API_BASE_URL:"https://contract.example.invalid/api"})')
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
globalThis.fetch = () => { throw new Error('Unexpected network operation in model regression') }
let checks = 0
function check(condition, message) { assert.ok(condition, message); checks += 1 }

const participants = await load('src/features/operation/shared/participants.ts')
const { PROTOTYPE_KYC_CASES: cases } = await load('src/features/compliance-kyc/prototypeKyc.ts')
const investor = await load('src/features/operation/investors/investorApi.ts')
const entrepreneur = await load('src/features/operation/entrepreneurs/entrepreneurApi.ts')
const entrepreneurRoute = await load('src/features/operation/entrepreneurs/entrepreneurRoute.ts')
const route = await load('src/features/operation/investors/investorRoute.ts')
const operation = await load('src/features/operation/shared/operationModel.ts')
const financeApi = await load('src/features/finance-core/shared/financeApi.ts')

// Finance Read Integration V1 replaced the illustrative Finance Core records with the
// Control Plane reads (`check-finance-read.mjs` covers the adapters). The prototype
// record modules are gone, so no screen can fall back to them, and no prototype
// identifier can reach the Backend.
for (const file of ['financeCoreRecords.ts', 'prototypeFinanceCore.ts', 'financeCoreRefs.ts', 'financeCoreModel.ts']) {
  await assert.rejects(access(resolve(root, 'src/features/finance-core/shared', file)), undefined, `${file}: illustrative Finance records removed`)
  checks += 1
}
const FINANCE_SCREENS = [
  'investments/InvestmentsPage.tsx', 'investments/InvestmentDetailPage.tsx',
  'payments/PaymentsPage.tsx', 'payments/PaymentDetailPage.tsx',
  'wallets/WalletsPage.tsx', 'wallets/WalletDetailPage.tsx', 'shared/FinanceCoreUi.tsx',
]
for (const file of FINANCE_SCREENS) {
  const source = await readFile(resolve(root, 'src/features/finance-core', file), 'utf8')
  check(!/from\s+['"][^'"]*(?:financeCoreRecords|prototypeFinanceCore|financeCoreRefs|financeCoreModel|shared\/participants|prototypeKyc|prototypeWhitelabels|prototypeAccounts|opportunityStore)['"]/.test(source), `${file}: no prototype record fallback in Finance Read screens`)
  check(!/sessionStorage|localStorage|\bfetch\s*\(|apiClient/.test(source), `${file}: screens use the Finance read adapter, never storage or transport`)
}
const financeAdapter = await readFile(resolve(root, 'src/features/finance-core/shared/financeApi.ts'), 'utf8')
check(!/\b(?:apiRequest|authenticatedPost|authenticatedPut|authenticatedPatch|authenticatedDelete)\b/.test(financeAdapter), 'Finance adapter is GET-only')
for (const prototypeId of ['INV-0001', 'PG-0001', 'WAL-0001', 'wal-001', 'inv-1', '0', '-1', '1.5', '']) {
  check(!financeApi.isServerFinanceId(prototypeId), `Prototype-style id "${prototypeId}" can never be sent to the Control Plane`)
}
check(financeApi.isServerFinanceId('4') && financeApi.isServerFinanceId('2140'), 'Backend numeric ids are accepted')
check(participants.ENTREPRENEUR_PROFILES.length > 0, 'Entrepreneur prototype remains available')
for (const item of participants.ENTREPRENEUR_PROFILES) {
  check(item.kind === 'entrepreneur' && item.id === item.account.id, 'Entrepreneur identity retained')
  check(item.whitelabelId === item.account.whitelabelId, 'Entrepreneur tenant retained')
}
for (const item of cases.filter(item => item.participantType === 'investor')) {
  check(investor.isPrototypeId(item.participantId), 'KYC prototypes still use prototype identity, never silently remapped')
  check(!investor.isServerInvestorId(item.participantId), 'Prototype KYC participant cannot be sent to Core')
}
for (const item of cases.filter(item => item.participantType === 'entrepreneur')) {
  check(entrepreneur.isPrototypeId(item.participantId), 'KYC Entrepreneur identity remains prototype-only')
  check(!entrepreneur.isServerEntrepreneurId(item.participantId), 'KYC prototypes cannot become Core Entrepreneurs')
}

const list = await readFile(resolve(root, 'src/features/operation/investors/InvestorsPage.tsx'), 'utf8')
const detail = await readFile(resolve(root, 'src/features/operation/investors/InvestorDetailPage.tsx'), 'utf8')
const api = await readFile(resolve(root, 'src/features/operation/investors/investorApi.ts'), 'utf8')
const app = await readFile(resolve(root, 'src/app/App.tsx'), 'utf8')
for (const source of [list, detail]) {
  check(!/from\s+['"][^'"]*(?:prototypeInvestments|shared\/participants|prototypeFinanceCore|prototypeKyc)['"]/.test(source), 'No prototype record fallback in authoritative Investor screens')
  check(!/sessionStorage|localStorage|\bfetch\s*\(/.test(source), 'Screens must use canonical read/auth layer')
  check(source.includes('Validação do cadastro'), 'Registration validation is explicitly distinct from KYC')
}
check(detail.includes('Resumo KYC da visão 360°') && detail.includes('Resumo financeiro'), 'Overview replaces obsolete unavailable KYC/Finance panels')
check(detail.includes('valid={isPositiveCoreId(investorId)}'), 'Non-Core links reach controlled unavailable identity')
check(!/PENDING|usePrototypeNotice/.test(detail), 'Real Investor ids cannot enter prototype destinations')
check(!/\b(?:apiRequest|authenticatedPost|authenticatedPut|authenticatedPatch|authenticatedDelete)\s*\(/.test(api), 'Adapter is GET-only')
check(app.includes('returnTo={route.returnTo}'), 'Detail return context survives a full document reload')
await assert.rejects(access(resolve(root, 'src/features/operation/investors/prototypeInvestments.ts')))
checks += 1
const entrepreneurList = await readFile(resolve(root, 'src/features/operation/entrepreneurs/EntrepreneursPage.tsx'), 'utf8')
const entrepreneurDetail = await readFile(resolve(root, 'src/features/operation/entrepreneurs/EntrepreneurDetailPage.tsx'), 'utf8')
for (const source of [entrepreneurList, entrepreneurDetail]) {
  check(!/from\s+['"][^'"]*(?:shared\/participants|prototypeKyc|opportunityStore|financeCoreRecords)['"]/.test(source), 'No prototype join in authoritative Entrepreneur screens')
  check(!/sessionStorage|localStorage|\bfetch\s*\(/.test(source), 'Entrepreneurs use canonical auth/read transport')
}
check(!entrepreneurDetail.includes('useOperationActivity'), 'No fabricated Entrepreneur session audit activity')
// Opportunities + Companies Read V1: the Company is no longer "pending" — it is read from
// GET /entrepreneurs/:id/company (0..1), tenant-scoped, and never fabricated (see check-opportunities-companies-read).
const companyPanel = await readFile(resolve(root, 'src/features/operation/companies/EntrepreneurCompanyPanel.tsx'), 'utf8')
check(entrepreneurDetail.includes('useEntrepreneurOverview(entrepreneurId)'), 'Company is read authoritatively in overview without duplicate request')
check(!entrepreneurDetail.includes('Aguardando integração da empresa') && companyPanel.includes('Sem empresa vinculada'), 'Company absence is the confirmed Backend state, not a pending placeholder')
check(entrepreneurDetail.includes('valid={isPositiveCoreId(entrepreneurId)}'), 'Prototype-origin Entrepreneur links do not reach Core')
check(!/PENDING|usePrototypeNotice/.test(entrepreneurDetail), 'Real Entrepreneur ids do not enter prototype destinations')
for (const component of ['ParticipantList.tsx', 'ParticipantDetail.tsx']) {
  await assert.rejects(access(resolve(root, `src/features/operation/shared/${component}`)))
  checks += 1
}
for (const source of [list, entrepreneurList]) check(source.includes('search.pendingSearch()'), 'Both participant lists carry pending search into navigation')
const entrepreneurContext = entrepreneurRoute.entrepreneursHref({ whitelabelId: '4', page: 2, search: 'Synthetic' })
const entrepreneurReturn = new URLSearchParams(entrepreneurRoute.entrepreneurHref('41', entrepreneurContext).split('?')[1]).get('returnTo')
check(entrepreneurRoute.entrepreneurListReturnHash(entrepreneurReturn) === entrepreneurContext, 'Entrepreneur return context survives reload')
for (const sourceText of [list, entrepreneurList]) {
  const tree = ts.createSourceFile('Page.tsx', sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  let declaration
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'navigate') declaration = node
    ts.forEachChild(node, visit)
  }
  visit(tree)
  assert.ok(declaration, 'Actual list navigation must remain tested')
  const compiled = ts.transpileModule(declaration.getText(tree), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  let destination
  const navigate = new Function('route', 'search', 'replaceRouteKeepingScroll', 'investorsHref', 'entrepreneursHref', `${compiled}; return navigate`)(
    { whitelabelId: '4', page: 2, search: 'old' }, { pendingSearch: () => 'new' }, value => { destination = value },
    route.investorsHref, entrepreneurRoute.entrepreneursHref,
  )
  navigate({ page: 3 })
  const query = new URLSearchParams(destination.split('?')[1])
  check(query.get('search') === 'new' && !query.has('page'), 'Pending search plus pagination resets to page one, not a page of the old result')
}

function localFunction(name) {
  const source = ts.createSourceFile('InvestorsPage.tsx', list, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const declaration = source.statements.find(item => ts.isFunctionDeclaration(item) && item.name?.text === name)
  assert.ok(declaration, `${name} must remain covered`)
  const code = ts.transpileModule(declaration.getText(source), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText
  return new Function('compareText', `${code}; return ${name}`)(operation.compareText)
}
const pages = localFunction('pageItems')
for (const [current, last] of [[1, 1], [1, 3], [1, 596], [300, 596], [596, 596]]) {
  const items = pages(current, last)
  check(items.includes(current) && items.includes(1) && items.includes(last), 'Pagination includes current/first/last')
  check(items.length <= 7, 'Pagination does not render hundreds of page buttons')
  check(items.filter(x => x !== 'gap').every(x => x >= 1 && x <= last), 'Pagination is bounded')
}
const sort = localFunction('sortRows')
const rows = [{ id: '1', createdAt: '2026-10-13T10:00:00-03:00' }, { id: '2', createdAt: '2026-10-13T12:00:00Z' }, { id: '3', createdAt: null }]
check(sort(rows, { key: 'createdAt', direction: 'ascending' }).map(x => x.id).join() === '2,1,3', 'Dates sort by instant, null last')
check(sort(rows, { key: 'createdAt', direction: 'descending' }).map(x => x.id).join() === '1,2,3', 'Descending dates preserve null last')
check(rows.map(x => x.id).join() === '1,2,3', 'Local sort never mutates source records')
const scoped = route.investorsHref({ whitelabelId: '4', page: 2, search: 'Synthetic' })
const returnTo = new URLSearchParams(route.investorHref('41', scoped).split('?')[1]).get('returnTo')
check(route.investorListReturnHash(returnTo) === scoped, 'Scoped detail returns to exact context after reload')
console.log(`Operation/Finance/Investor boundary regression: ${checks} passed (source/models, no network)`)
