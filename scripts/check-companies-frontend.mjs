import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { access, readdir, readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

// Companies Frontend V1 — prototype boundary checks (synthetic, no network).
// COMPANIES FRONTEND V1 IS A PROTOTYPE. NO AUTHORITATIVE COMPANY BACKEND
// CONTRACT IS CURRENTLY INTEGRATED: these checks also prove that no request
// code exists and that prototype references cannot reach the real APIs.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(pathToFileURL(resolve(root, 'package.json')))
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
    const url = specifier.startsWith('data:') ? specifier : specifier.startsWith('.')
      ? await moduleUrl(base.endsWith('.css') ? base : existsSync(`${base}.ts`) ? `${base}.ts` : `${base}.tsx`)
      : pathToFileURL(require.resolve(specifier)).href
    code = code.replace(match[0], `from ${JSON.stringify(url)}`)
  }
  const url = `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
  modules.set(key, url)
  return url
}
const load = async (path, sourceOverride) => import(await moduleUrl(resolve(root, path), sourceOverride))
globalThis.fetch = () => {
  throw new Error('Unexpected network operation in Companies checks')
}
let checks = 0
function check(condition, message) {
  assert.ok(condition, message)
  checks += 1
}

const contract = await load('src/features/operation/companies/companyContract.ts')
const proto = await load('src/features/operation/companies/prototypeCompanies.ts')
const present = await load('src/features/operation/companies/companyPresent.ts')
const route = await load('src/features/operation/companies/companyRoute.ts')
const entrepreneur = await load('src/features/operation/entrepreneurs/entrepreneurApi.ts')
const whitelabel = await load('src/features/whitelabels/whitelabelApi.ts')
const { PROTOTYPE_ACCOUNTS } = await load('src/features/whitelabel-accounts/prototypeAccounts.ts')
const { PROTOTYPE_WHITELABELS } = await load('src/features/whitelabels/prototypeWhitelabels.ts')

/* ---------- contract: candidate only, not integrated ---------- */
check(contract.COMPANY_CONTRACT.integrated === false, 'No Company contract is integrated')
check(contract.COMPANY_CONTRACT.serverFeatures.statusFilter === 'not-supported', 'No status filter until the Backend supports one')

/* ---------- prototype source: isolated, frozen, synthetic ---------- */
const companies = proto.PROTOTYPE_COMPANIES
const before = JSON.stringify(companies)
check(companies.length > 10, 'Enough illustrative rows to exercise pagination')
check(Object.isFrozen(companies) && Object.isFrozen(proto.PROTOTYPE_COMPANY_WHITELABELS), 'Prototype collections are read-only')
check(new Set(companies.map((item) => item.id)).size === companies.length, 'Illustrative Company ids are unique')
const realNames = new Set(
  PROTOTYPE_ACCOUNTS.flatMap((account) => [account.name, account.email, account.company?.name, account.company?.document].filter(Boolean)),
)
const realWhitelabelNames = new Set(PROTOTYPE_WHITELABELS.map((item) => item.name))
for (const item of companies) {
  check(Object.isFrozen(item), 'Illustrative Company is read-only')
  check(item.provenance === 'prototype' && proto.isPrototypeCompanyId(item.id), 'Prototype provenance and cmp_proto_ id')
  check(!entrepreneur.isServerEntrepreneurId(item.id) && !whitelabel.isServerWhitelabelId(item.id), 'Company id is never a Core id')
  check(item.officialStatus === null, 'No Company status vocabulary is invented')
  check(item.taxId === null || /^00000000\d{6}$/.test(item.taxId), 'Tax identifiers are synthetic (root 00.000.000)')
  if (item.entrepreneur) {
    check(entrepreneur.isPrototypeId(item.entrepreneur.ref), 'Entrepreneur reference is prototype-only (_proto_)')
    check(!entrepreneur.isServerEntrepreneurId(item.entrepreneur.ref), 'Entrepreneur reference can never be sent to GET /entrepreneurs/:id')
    check(item.entrepreneur.ref !== item.id, 'entrepreneurId ≠ companyId')
  }
  if (item.whitelabel) {
    check(!whitelabel.isServerWhitelabelId(item.whitelabel.ref), 'Whitelabel reference can never be sent to GET /whitelabels/:id')
    check(proto.PROTOTYPE_COMPANY_WHITELABELS.includes(item.whitelabel), 'Whitelabel reference comes from the illustrative list')
  }
  for (const value of [item.legalName, item.tradeName, item.entrepreneur?.label, item.whitelabel?.label]) {
    if (value === null || value === undefined) continue
    check(!realNames.has(value) && !realWhitelabelNames.has(value), 'No name reused from Entrepreneur / Account / Whitelabel prototypes')
    check(!value.includes('@'), 'No e-mail in Company data')
  }
}
for (const name of ['Finapop', 'Loor', 'Nova Plataforma']) {
  check(!JSON.stringify(companies).includes(name), `No real-looking Whitelabel name (${name}) in Company data`)
}
const entrepreneurRefs = companies.map((item) => item.entrepreneur?.ref).filter(Boolean)
check(new Set(entrepreneurRefs).size === entrepreneurRefs.length, 'No Entrepreneur grouping is implied by the illustrative data')
check(['legalName', 'tradeName', 'taxId', 'entrepreneur', 'whitelabel', 'createdAt'].every((key) => companies.some((item) => item[key] === null)), 'Missing values are represented')
check(companies.some((item) => (item.legalName ?? '').length > 120), 'A long legal name is represented')

/* ---------- local query (prototype stand-in for GET /companies) ---------- */
const all = proto.queryPrototypeCompanies({ page: 1, perPage: 10, search: '' })
check(all.total === companies.length && all.rows.length === 10 && all.lastPage === Math.ceil(companies.length / 10), 'Pagination meta is consistent')
const page2 = proto.queryPrototypeCompanies({ page: 2, perPage: 10, search: '' })
check(page2.rows.length === companies.length - 10 && page2.rows[0].id === companies[10].id, 'Second page continues the order')
check(proto.queryPrototypeCompanies({ page: 1, perPage: 10, search: 'indigo' }).rows.map((item) => item.id).join() === 'cmp_proto_109', 'Search ignores case and accents')
check(proto.queryPrototypeCompanies({ page: 1, perPage: 10, search: 'zzz-nothing' }).total === 0, 'Empty search result')
const alfa = proto.queryPrototypeCompanies({ page: 1, perPage: 10, search: '', whitelabel: 'wl_proto_cmp_alfa' })
check(alfa.total > 0 && alfa.rows.every((item) => item.whitelabel?.ref === 'wl_proto_cmp_alfa') && !alfa.scopeMissing, 'Whitelabel filter scopes rows')
const unknownScope = proto.queryPrototypeCompanies({ page: 1, perPage: 10, search: '', whitelabel: '4' })
check(unknownScope.scopeMissing && unknownScope.total === 0, 'A Core Whitelabel id is not an illustrative scope (no mapping is inferred)')
check(before === JSON.stringify(companies), 'Queries never mutate the prototype source')

/* ---------- presentation model ---------- */
check(present.maskTaxId('00000000000101') === '••.•••.•••/0001-01', 'CNPJ is masked for display')
check(present.maskTaxId('00.000.000/0001-01') === '••.•••.•••/0001-01', 'Formatted CNPJ is masked the same way')
check(present.maskTaxId('123') === '••••' && present.maskTaxId(null) === null && present.maskTaxId('  ') === null, 'Non-standard values are fully masked, not validated')
for (const item of companies) {
  const view = present.viewFromPrototype(item)
  check(view.provenance === 'prototype', 'Prototype provenance travels with the view')
  for (const relation of [view.entrepreneur, view.whitelabel]) {
    check(relation.kind === 'illustrative' || relation.kind === 'missing', 'Prototype relationships are illustrative or missing')
    check(!('href' in relation), 'No link is built for a prototype reference')
  }
  check(view.displayName.length > 0, 'Every row has a display name (fallback when missing)')
}
check(present.viewFromPrototype(proto.prototypeCompanyById('cmp_proto_113')).displayName === present.COMPANY_NAME_FALLBACK, 'Missing names use the neutral fallback')
const candidate = {
  id: '900',
  entrepreneurId: '41',
  whitelabelId: '4',
  legalName: '  Synthetic Legal  ',
  tradeName: null,
  taxId: '00000000000199',
  officialStatus: 'ANY_FUTURE_VALUE',
  createdAt: null,
  updatedAt: null,
}
const future = present.viewFromCandidate(candidate)
check(future.provenance === 'backend' && future.displayName === 'Synthetic Legal', 'Future Backend view is prepared')
check(future.entrepreneur.kind === 'core' && future.entrepreneur.href === '#/operation/entrepreneurs/41', 'Future link uses company.entrepreneurId only')
check(future.whitelabel.kind === 'core' && future.whitelabel.href === '#/whitelabels?id=4', 'Future Whitelabel link uses company.whitelabelId only')
check(future.officialStatus === 'ANY_FUTURE_VALUE', 'Future status is shown raw (no vocabulary mapping)')
const unsafe = present.viewFromCandidate({ ...candidate, entrepreneurId: 'ent_proto_cmp_01', whitelabelId: 'wl_proto_cmp_alfa' })
check(unsafe.entrepreneur.href === null && unsafe.whitelabel.href === null, 'Non-Core ids are never linked')

// Entity namespaces are independent, not numerically disjoint. Nor may the
// presenter collapse multiple Companies into an Entrepreneur-keyed singleton.
const siblings = [candidate, { ...candidate, id: '901' }].map(present.viewFromCandidate)
check(siblings.length === 2 && siblings[0].id !== siblings[1].id, 'Two Companies retain their independent identities')
check(siblings.every((item) => item.entrepreneur.id === '41'), 'Multiple Companies may reference the same Entrepreneur')
const coincidingIds = present.viewFromCandidate({ ...candidate, id: '41', legalName: null, tradeName: null })
check(coincidingIds.id === '41' && coincidingIds.entrepreneur.href === '#/operation/entrepreneurs/41', 'Equal numeric values do not conflate Company and Entrepreneur')
check(coincidingIds.displayName === present.COMPANY_NAME_FALLBACK, 'No Company name inferred from the related Entrepreneur')

// Render the actual relationship/status/switch components, rather than only
// looking for href strings in their source. No browser or network is involved.
const { renderToStaticMarkup } = await import('react-dom/server')
const partsUi = await load('src/features/operation/companies/CompanyParts.tsx')
const switchUi = await load('src/features/operation/shared/EntrepreneurViews.tsx')
for (const item of companies) {
  const view = present.viewFromPrototype(item)
  for (const kind of ['entrepreneur', 'whitelabel']) {
    const html = renderToStaticMarkup(partsUi.RelationValue({ relation: view[kind], kind }))
    check(!html.includes('<a '), `Actual ${kind} component never links prototype relationships`)
  }
}
check(!renderToStaticMarkup(partsUi.RelationValue({ relation: { kind: 'illustrative', label: 'Example', ref: 'ent_proto_cmp_01', href: '#/operation/entrepreneurs/1' }, kind: 'entrepreneur' })).includes('<a '), 'An injected href cannot upgrade illustrative provenance')
const rawStatus = renderToStaticMarkup(partsUi.OfficialStatus({ status: 'ANY_FUTURE_VALUE' }))
check(rawStatus.includes('ANY_FUTURE_VALUE') && rawStatus.includes('data-tone="neutral"'), 'Future raw status is not mapped to an invented lifecycle')
check(renderToStaticMarkup(partsUi.OfficialStatus({ status: null })).includes('Aguardando integração'), 'Absent official status remains pending')
for (const current of ['companies', 'entrepreneurs']) {
  const html = renderToStaticMarkup(switchUi.EntrepreneurViewSwitch({ current }))
  check((html.match(/aria-current="page"/g) ?? []).length === 1, 'Exactly one sibling view is current')
  check(!/role="tab|role="button/.test(html) && html.includes('Protótipo'), 'View switch uses navigation links and explicit prototype wording')
}

/* ---------- route state ---------- */
const parsed = route.parseCompanyRoute({ whitelabel: 'wl_proto_cmp_beta', page: '2', search: '  Bravo ', previa: 'erro' })
check(parsed.ignored.length === 0 && parsed.state.page === 2 && parsed.state.search === 'Bravo' && parsed.state.preview === 'error', 'URL state parses')
const invalid = route.parseCompanyRoute({ whitelabel: '<x>', page: '0', previa: 'drop' })
check(invalid.ignored.length === 3 && invalid.state.page === 1 && invalid.state.whitelabel === undefined && invalid.state.preview === undefined, 'Invalid URL values are reported and ignored')
const context = route.companiesHref({ whitelabel: 'wl_proto_cmp_beta', page: 2, search: 'Bravo' })
check(context === '#/operation/companies?whitelabel=wl_proto_cmp_beta&page=2&search=Bravo', 'List href mirrors the candidate query')
const detailHref = route.companyHref('cmp_proto_102', context)
check(detailHref.startsWith('#/operation/companies/cmp_proto_102?returnTo='), 'Detail href carries the list context')
check(route.companyListReturnHash(new URLSearchParams(detailHref.split('?')[1]).get('returnTo')) === context, 'Return context survives reload')
check(route.companyListReturnHash('#/operation/entrepreneurs/1') === '#/operation/companies', 'Only the Companies list is a return destination')
check(route.companyListReturnHash('https://example.invalid/#/operation/companies') === '#/operation/companies', 'External return destinations are refused')
const detailIgnored = []
check(route.parseCompanyPreview('vazio', ['loading', 'unavailable', 'error'], detailIgnored) === undefined && detailIgnored.length === 1, 'Detail rejects list-only previews')
for (const unsafeReturn of ['javascript:alert(1)', '#/operation/companies/cmp_proto_101', '#/operation/companies-evil', '//example.invalid', '#/operation/companies?returnTo=https://example.invalid']) {
  check(route.companyListReturnHash(unsafeReturn) === '#/operation/companies', 'Unsafe or non-list return target fails closed')
}

// Execute the real source hooks with minimal synchronous hook primitives.
// This isolates data/state selection, not React effect/timer lifecycle (browser QA covers that).
const hookPath = 'src/features/operation/companies/useCompanyData.ts'
const hookSource = await readFile(resolve(root, hookPath), 'utf8')
const reactStub = `data:text/javascript;base64,${Buffer.from('export const useMemo=fn=>fn(); export const useEffect=()=>{}; export const useState=value=>[value,()=>{}];').toString('base64')}`
const hookCode = hookSource.replace(/from 'react'/, `from '${reactStub}'`)
const hooks = await load(hookPath, hookCode)
check(hooks.useCompanyList({ page: 1, perPage: 10, search: '' }).state.data.rows.length === 10, 'Actual list hook selects only local Company rows')
for (const [preview, expected] of [['loading', 'loading'], ['unavailable', 'unavailable'], ['error', 'error'], ['empty', 'success']]) {
  check(hooks.useCompanyList({ page: 1, perPage: 10, search: '', preview }).state.status === expected, 'Actual list hook supports explicit prototype state preview')
}
check(hooks.useCompanyDetail('4').state.status === 'error' && hooks.useCompanyDetail('4').state.error.status === 404, 'Real-looking numeric Company id is not mapped to a prototype')
check(hooks.useCompanyList({ page: 1, perPage: 10, search: '', whitelabel: '4' }).state.data.scopeMissing, 'Real tenant scope cannot select prototype Companies')
const futureHooks = await load(hookPath, hookCode.replaceAll('COMPANY_CONTRACT.integrated', 'true'))
check(futureHooks.useCompanyList({ page: 1, perPage: 10, search: '', preview: 'error' }).state.status === 'success', 'Preview cannot pin the list once the integration flag changes')
check(futureHooks.useCompanyDetail('cmp_proto_101', 'error').state.status === 'success', 'Preview cannot pin detail once the integration flag changes')
const routeSource = await readFile(resolve(root, 'src/features/operation/companies/companyRoute.ts'), 'utf8')
const futureRoute = await load('src/features/operation/companies/companyRoute.ts', routeSource.replaceAll('COMPANY_CONTRACT.integrated', 'true'))
const previewIgnored = []
check(futureRoute.parseCompanyPreview('erro', ['error'], previewIgnored) === undefined && previewIgnored.length === 1, 'Future integrated route rejects preview parameters')

// Execute the actual page-frame function (only rendering dependencies are
// replaced with inert element names). All prior string-only breadcrumb calls
// must keep precisely the baseline props; Companies adds one constrained link.
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
for (const section of ['entrepreneurs', 'investors', 'opportunities']) {
  for (const trail of [[], ['Não encontrado'], ['ID 17'], ['Nome longo', 'Editar']]) {
    const props = { section, title: 'Example', trail, children: null }
    check(JSON.stringify(currentShell.OperationShell(props).props.breadcrumbs) === JSON.stringify(baselineShell.OperationShell(props).props.breadcrumbs), 'Prior Operation breadcrumb callers retain exact baseline behavior')
  }
}
const linkedCrumb = { label: 'Empresas', href: route.companyListReturnHash(context) }
const companyCrumbs = currentShell.OperationShell({ section: 'entrepreneurs', title: 'Empresas', trail: [linkedCrumb, 'Example'], children: null }).props.breadcrumbs
check(companyCrumbs[2].href === context && companyCrumbs.at(-1).label === 'Example', 'Companies inserts its safe list link without changing section ownership')
check(companyCrumbs.filter((item) => item.href).every((item) => item.href.startsWith('#/operation/')), 'Every Company trail destination stays internal to Operation')

// AST-based detectors ignore comments/string examples while catching aliased
// transports and forbidden menu IDs. Prove the detector with in-memory violations.
function hasRequestCode(source, fileName = 'fixture.tsx') {
  const ast = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  let found = false
  const visit = (node) => {
    if (ts.isIdentifier(node) && /^(fetch|authenticatedGet|authenticatedPost|apiRequest|XMLHttpRequest|sendBeacon|WebSocket|EventSource)$/.test(node.text)) found = true
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && /(^|\/)(axios|ky|superagent|ofetch|apiClient|companiesApi)(\/|$)/i.test(node.moduleSpecifier.text)) found = true
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
for (const violation of ['fetch("/companies")', 'window.fetch("/companies")', 'const { fetch: request } = window', 'import request from "axios"; request.get("/companies")', 'import { authenticatedGet as get } from "./apiClient"', 'new XMLHttpRequest()', 'navigator.sendBeacon("/companies", "")']) {
  check(hasRequestCode(violation), 'Detector rejects a planted transport/alias (no production file changed)')
}
check(!hasRequestCode('// fetch("/companies")\nconst explanation = "fetch(/companies) is unavailable"'), 'Transport detector ignores comments and quoted examples')
check(hasForbiddenMenuId('const nav = { id: "operation-companies" }') && !hasForbiddenMenuId('// never add operation-companies'), 'Menu detector distinguishes executable config from commentary')

/* ---------- source boundaries ---------- */
const dir = resolve(root, 'src/features/operation/companies')
const files = (await readdir(dir)).filter((name) => /\.(ts|tsx)$/.test(name))
check(files.length >= 8, 'Companies module files exist')
const allowedExternal = {
  '../entrepreneurs/entrepreneurApi': ['isServerEntrepreneurId'],
  '../entrepreneurs/entrepreneurRoute': ['entrepreneurHref'],
  '../../whitelabels/whitelabelApi': ['isServerWhitelabelId', 'formatWhitelabelDate'],
  '../../../lib/api': ['ApiError'],
  '../../../lib/apiErrors': ['describeApiError'],
}
for (const name of files) {
  const source = await readFile(resolve(dir, name), 'utf8')
  // Code only (comments may name what the module must never do).
  const code = ts.transpileModule(source, {
    fileName: name,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.Preserve, removeComments: true },
  }).outputText
  check(!hasRequestCode(source, name), `${name}: no request code or transport imports`)
  check(!/sessionStorage|localStorage|indexedDB/.test(code), `${name}: no browser storage`)
  check(!/useEntrepreneur(List|Detail)|useWhitelabel(Options|Record)|useInvestor|useAccounts/.test(source), `${name}: no real-module data hook`)
  check(!/shared\/participants|prototypeAccounts|prototypeWhitelabels|prototypeKyc|opportunityStore|financeCoreRecords|accountModel/.test(source), `${name}: no join with other prototypes`)
  check(!/businessState|accessState|kycStatus|CompanyValidation|COMPANY_VALIDATION_META/.test(code), `${name}: no reused state vocabulary`)
  for (const match of source.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+'([^']+)'/g)) {
    const specifier = match[2]
    if (!(specifier in allowedExternal)) continue
    const names = match[1].split(',').map((part) => part.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0]).filter(Boolean)
    check(names.every((item) => allowedExternal[specifier].includes(item)), `${name}: only pure helpers from ${specifier}`)
  }
}
const contractSource = await readFile(resolve(dir, 'companyContract.ts'), 'utf8')
check(contractSource.includes('NO AUTHORITATIVE COMPANY BACKEND'), 'Contract module states that nothing is integrated')
const entrepreneurApiSource = await readFile(resolve(root, 'src/features/operation/entrepreneurs/entrepreneurApi.ts'), 'utf8')
check(!/export[^\n]*Compan|\/companies/i.test(entrepreneurApiSource), 'Companies are not added to the Entrepreneur adapter')
for (const page of ['EntrepreneursPage.tsx', 'EntrepreneurDetailPage.tsx']) {
  const source = await readFile(resolve(root, `src/features/operation/entrepreneurs/${page}`), 'utf8')
  check(!/from\s+'[^']*companies\//.test(source), `${page}: no Company data joined into Entrepreneur screens`)
}
const navigation = await readFile(resolve(root, 'src/components/shell/navigation.ts'), 'utf8')
check(!/compan|empresa/i.test(ts.transpileModule(navigation, { compilerOptions: { removeComments: true } }).outputText), 'No Companies entry in the shared navigation / menu configuration')
async function walk(path) {
  const out = []
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const full = resolve(path, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(full)))
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full)
  }
  return out
}
for (const file of await walk(resolve(root, 'src'))) {
  check(!hasForbiddenMenuId(await readFile(file, 'utf8')), 'No operation-companies menu id anywhere in src')
}
const app = await readFile(resolve(root, 'src/app/App.tsx'), 'utf8')
check(app.includes("path === 'operation/companies'") && app.includes('COMPANY_PATH'), 'List and detail routes exist')
check(app.includes('previa={route.previa}') && app.includes('returnTo={route.returnTo} previa'), 'Route state reaches the pages')
const listPage = await readFile(resolve(dir, 'CompaniesPage.tsx'), 'utf8')
const detailPage = await readFile(resolve(dir, 'CompanyDetailPage.tsx'), 'utf8')
const parts = await readFile(resolve(dir, 'CompanyParts.tsx'), 'utf8')
check(parts.includes('Dados ilustrativos — integração de Empresas pendente'), 'Provenance copy exists')
check(listPage.includes('<ProvenanceNotice />') && detailPage.includes('<ProvenanceNotice detail />'), 'Both screens show provenance')
check(listPage.includes('section="entrepreneurs"') && detailPage.includes('section="entrepreneurs"'), 'Sidebar keeps the stable Empreendedores item')
check(detailPage.includes('Aguardando integração do KYC') && !/R\$|BRL|currency/.test(detailPage + listPage), 'KYC pending; no financial values')
check(!/onClick=\{[^}]*(create|edit|delete|remove|save)/i.test(listPage + detailPage), 'No Company CRUD actions')
const docs = await readFile(resolve(root, 'docs/companies-frontend-v1.md'), 'utf8')
check(docs.includes('COMPANIES FRONTEND V1 IS A PROTOTYPE. NO AUTHORITATIVE COMPANY BACKEND CONTRACT IS CURRENTLY INTEGRATED.'), 'Docs carry the explicit prototype statement')
await assert.rejects(access(resolve(root, 'src/features/operation/companies/companiesApi.ts')))
checks += 1

console.log(`Companies Frontend V1 prototype boundaries: ${checks} passed (no network, no Company contract integrated)`)
