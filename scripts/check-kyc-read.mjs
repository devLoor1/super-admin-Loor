import assert from 'node:assert/strict'
import { reviewedAuditFilters } from './reviewed-audit-filters-boundary.mjs'
import { outsideReviewed360, reviewed360 } from './reviewed-360-boundary.mjs'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'
import { row, page, detail } from './fixtures/kyc-read-fixtures.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), modules = new Map()
const require = createRequire(pathToFileURL(resolve(root, 'package.json')))
async function moduleUrl(path) {
  if (modules.has(path)) return modules.get(path)
  let code = ts.transpileModule(await readFile(path, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
    .replaceAll('import.meta.env', '({VITE_API_BASE_URL:"https://control-plane.example.invalid/api"})')
  for (const match of [...code.matchAll(/from\s+(['"])([^'"]+)\1/g)]) {
    const spec = match[2], url = spec.startsWith('.') ? await moduleUrl(resolve(dirname(path), `${spec}.ts`)) : pathToFileURL(require.resolve(spec)).href
    code = code.replace(match[0], `from ${JSON.stringify(url)}`)
  }
  const url = `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
  modules.set(path, url); return url
}
const load = async p => import(await moduleUrl(resolve(root, p)))
const storage = new Map()
globalThis.sessionStorage = { getItem: k => storage.get(k) ?? null, setItem: (k,v) => storage.set(k,v), removeItem: k => storage.delete(k) }
globalThis.window = { setTimeout, clearTimeout, location: { hash: '' } }
let fetchImpl = async () => { throw Error('Unexpected synthetic request') }
globalThis.fetch = (...args) => fetchImpl(...args)
const auth = await load('src/lib/authSession.ts'), api = await load('src/features/compliance-kyc/kycReadApi.ts')
const present = await load('src/features/compliance-kyc/kycReadPresent.ts'), { describeApiError } = await load('src/lib/apiErrors.ts')
const { ApiError } = await load('src/lib/api.ts')
const operator = { id: 'synthetic', name: 'QA', email: 'qa@example.invalid', roles: ['SUPER_ADMIN'] }
const session = () => auth.persistSession({ accessToken: 'synthetic-only-token', tokenType: 'Bearer', operator })
const json = (b, status = 200) => new Response(JSON.stringify(b), { status })
let checks = 0
async function check(name, fn) { try { await fn(); checks++ } catch (cause) { throw Error(`${name}: ${cause.message}`) } }
const malformed = e => e instanceof ApiError && e.kind === 'malformed'
for (const total of [0,1,19,20,21,23,1000]) for (const p of [1,2,51]) await check(`pagination ${p}/${total}`, () => {
  const result = api.parseKycReadPage(page(p,total),p)
  assert.equal(result.total,total); assert.equal(result.rows.length, Math.min(20,Math.max(0,total-(p-1)*20)))
})
for (const invalid of [null,{},[],{data:[],meta:null},{data:{},meta:{}}]) await check('invalid envelope', () => assert.throws(() => api.parseKycReadPage(invalid,1),malformed))
for (const changed of [{page:2},{perPage:10},{total:'23'},{total:-1},{lastPage:1},{page:1.5}]) await check('metadata mismatch', () => {
  const wire=page(); Object.assign(wire.meta,changed); assert.throws(() => api.parseKycReadPage(wire,1),malformed)
})
for (const bad of ['',0,-1,1.5,'100','kyc_proto_0001',Number.MAX_SAFE_INTEGER+1]) await check('case wire id strict', () => assert.throws(() => api.parseKycReadRow(row(0,{id:bad})),malformed))
for (const bad of ['','0','-1','01','1.5','kyc_proto_0001','inv_proto_001','bureau:900','100/approve']) await check('route id rejected', async () => {
  assert.equal(api.isKycReadId(bad),false); await assert.rejects(api.getKycReadCase(bad),e=>e.status===404)
})
await check('incomplete page rejected', () => assert.throws(() => api.parseKycReadPage({...page(),data:[row()]},1),malformed))
await check('duplicate IDs rejected', () => { const wire=page();wire.data[1]=wire.data[0];assert.throws(()=>api.parseKycReadPage(wire,1),malformed) })
await check('detail identity continuity', () => { assert.equal(api.parseKycReadDetail(detail(),'100').id,'100');assert.throws(()=>api.parseKycReadDetail(detail(),'900'),malformed) })
await check('detail tenant contradiction rejected', () => assert.throws(()=>api.parseKycReadDetail(detail({whitelabel:{id:7}}),'100'),malformed))
for (const key of ['investor','whitelabel','document','ocr','bureau','faceMatch','personalDataValidation','history']) await check(`nullable ${key}`, () => {
  const wire=detail({[key]:null,...(key==='whitelabel'?{investor:null}:{})});const parsed=api.parseKycReadDetail(wire,'100')
  assert.equal(parsed[key==='whitelabel'?'whitelabelId':key],null)
})
await check('allowlist discards all private payloads and manual decision', () => {
  const projected=JSON.stringify(api.parseKycReadDetail(detail(),'100'));assert.ok(!/PRIVATE_|score|manualReview|email|raw|image|reason|reviewedBy/.test(projected))
})
for (const mask of ['12345678901','123.456.789-01','*12345678901','PRIVATE_SECRET','<img>']) await check('unsafe mask hidden',()=>assert.equal(api.kycReadMask(mask),null))
await check('mask preserves already masked source',()=>assert.equal(api.kycReadMask('***.***.***-00'),'***.***.***-00'))
await check('embedded personal identifiers redacted',()=>{assert.ok(!api.kycReadName('QA 123.456.789-01 qa@example.invalid').includes('123.456'));assert.ok(!api.kycReadName('QA 12.345.678/0001-90').includes('12.345'))})
for (const date of ['bad','2026-02-30T12:00:00Z','2026-10-22T25:00:00Z','2026-10-22T12:00:00','2026-10-22T12:00:00+25:00']) await check('bad timestamp unavailable',()=>assert.equal(api.kycReadDate(date),null))
await check('explicit Brasilia date',()=>assert.equal(present.kycReadDateText('2026-10-22T03:00:00Z'),'22/10/2026 00:00'))
await check('unknown tokens remain neutral, not approval',()=>{assert.equal(api.kycReadStatus('FUTURE').tone,'muted');assert.equal(api.kycReadStatus('__proto__').tone,'muted');assert.equal(api.kycReadStatus(null).label,'Não informado')})
await check('FaceMatch does not derive overall status',()=>{const d=api.parseKycReadDetail(detail(),'100');assert.equal(d.status,'pending');assert.equal(d.faceMatch.status,'approved')})
await check('no invented history transitions',()=>assert.equal(api.parseKycReadDetail(detail({history:[]}),'100').history.length,0))
await check('GET-only exact supported queries',async()=>{
  session();const calls=[];fetchImpl=async(u,o)=>{calls.push([new URL(u),o]);return json(page())};await api.listKycReadCases(1)
  assert.equal(calls[0][0].pathname,'/api/compliance/kyc');assert.equal(calls[0][0].search,'?page=1&perPage=20');assert.equal(calls[0][1].method,'GET')
  fetchImpl=async(u,o)=>{assert.ok(String(u).endsWith('/100'));assert.equal(o.method,'GET');return json(detail())};await api.getKycReadCase('100')
})
for(const status of [401,403,404,500,502]) await check(`HTTP ${status}`,async()=>{
  session();fetchImpl=async()=>json({code:'SYNTHETIC'},status);await assert.rejects(api.listKycReadCases(1),e=>{const view=describeApiError(e,'KYC');assert.equal(view.retryable,status>=500);return e.status===status})
  if(status===401)assert.equal(auth.getAccessToken(),null)
})
await check('network error classification',async()=>{session();fetchImpl=async()=>{throw new TypeError('synthetic offline')};await assert.rejects(api.listKycReadCases(1),e=>e.kind==='network')})
await check('cancellation',async()=>{session();const ctrl=new AbortController();ctrl.abort();fetchImpl=async()=>{throw new DOMException('cancelled','AbortError')};await assert.rejects(api.listKycReadCases(1,ctrl.signal),e=>e.name==='AbortError')})
await check('late response rejected after session change',async()=>{session();fetchImpl=async()=>{auth.clearSession();return json(page())};await assert.rejects(api.listKycReadCases(1),e=>e.name==='AbortError')})
await check('canonical timeout is distinguished from network/401',async()=>{
  session();window.setTimeout=fn=>setTimeout(fn,5)
  fetchImpl=(_u,o)=>new Promise((_resolve,reject)=>o.signal.addEventListener('abort',()=>reject(new DOMException('timeout','AbortError')),{once:true}))
  await assert.rejects(api.listKycReadCases(1),e=>e.kind==='timeout'&&!!auth.getAccessToken());window.setTimeout=setTimeout
})
const read = p => readFile(resolve(root,p),'utf8')
for(const file of ['KycListPage.tsx','KycDetailPage.tsx','kycReadApi.ts','useKycRead.ts','KycReadUi.tsx']) await check(`real path isolated ${file}`,async()=>{
  const text=await read(`src/features/compliance-kyc/${file}`);assert.ok(!/from ['"].*(?:prototypeKyc|kycStore|kycRefs|KycDialogs|shared\/participants)/.test(text));assert.ok(!/localStorage|sessionStorage|console\.|recordDecision|reviewEvidence|addPendingIssue|authenticatedWrite/.test(text))
})
await check('hook session/abort lifecycle uses canonical read hook without lastData',async()=>{const t=await read('src/features/compliance-kyc/useKycRead.ts');assert.ok(t.includes('getSessionVersion'));assert.ok(t.includes('useRemote'));assert.ok(!/lastData|setInterval/.test(t))})
await check('no unsupported filters or global status counts',async()=>{const t=await read('src/features/compliance-kyc/KycListPage.tsx');assert.ok(!/<select|type="search"|\.filter\(|SummaryCards|PROTOTYPE_/.test(t))})
await check('FaceMatch is detail section; no decisions/session activity',async()=>{const t=await read('src/features/compliance-kyc/KycDetailPage.tsx');assert.ok(t.includes('title="Face Match"'));assert.ok(!/onClick|Dialog|useState|SessionActivityCard/.test(t))})
await check('Dashboard and auth implementations unchanged',async()=>{
  for(const path of ['src/features/dashboard','src/features/governance-audit','src/lib/authSession.ts','src/lib/apiClient.ts','src/components/shell']) assert.deepEqual(outsideReviewed360(execFileSync('git',['diff','--name-only','6969a89','--',path],{cwd:root,encoding:'utf8'})).filter(file=>!reviewedAuditFilters(file)),[])
})
await check('participant profiles differ only by the exact obsolete KYC copy replacements', async()=>{
  for(const [kind, replacements] of [
    ['investors',[
      ['A associação deste investidor a um caso Face Match não foi carregada. Consulte a lista em Compliance › KYC; o ID do investidor não é um ID de caso. Nenhuma navegação foi feita.','Compliance › KYC ainda é um protótipo; não há caso KYC do Control Plane vinculado a este investidor. Nenhuma navegação foi feita.'],
      ['Compliance › KYC — vínculo a um caso ainda indisponível','Compliance › KYC — ainda em protótipo, não integrado']]],
    ['entrepreneurs',[
      ['A lista KYC disponível cobre casos Face Match de investidores, não casos deste empreendedor. Nenhuma navegação foi feita.','Compliance › KYC ainda é um protótipo; não há caso KYC do Control Plane vinculado a este empreendedor. Nenhuma navegação foi feita.'],
      ['Compliance › KYC — caso de empreendedor indisponível neste contrato','Compliance › KYC — ainda em protótipo, não integrado']]],
  ]){
    const path=`src/features/operation/${kind}/${kind==='investors'?'Investor':'Entrepreneur'}DetailPage.tsx`
    // Preserve the exact accepted KYC copy migration historically; the current
    // profiles are replaced by the independently tested, exact-pinned 360 unit.
    assert.equal(reviewed360(path),true)
    let source=execFileSync('git',['show',`cf79cca5066771a2edd20ad404f1b0f59527ce29:${path}`],{cwd:root,encoding:'utf8'}).replaceAll('\r\n','\n')
    for(const [next,old] of replacements){assert.equal(source.split(next).length,2);source=source.replace(next,old)}
    assert.equal(source,execFileSync('git',['show',`6969a89:${path}`],{cwd:root,encoding:'utf8'}).replaceAll('\r\n','\n'))
  }
})
console.log(`KYC Read V1: ${checks} focused synthetic checks passed (no live network)`)
