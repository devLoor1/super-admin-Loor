import assert from 'node:assert/strict'
import { opportunityWriteExclusions } from './reviewed-opportunity-write-boundary.mjs'
import { execFileSync } from 'node:child_process'
import { withoutReadinessGate } from './reviewed-360-boundary.mjs'
import { withoutOperatorsEntry } from './reviewed-operators-boundary.mjs'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'
import { investor, entrepreneur } from './fixtures/overview-360-fixtures.mjs'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'), require=createRequire(pathToFileURL(resolve(root,'package.json'))), modules=new Map()
async function moduleUrl(path){
  if(modules.has(path))return modules.get(path)
  let code=ts.transpileModule(await readFile(path,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replaceAll('import.meta.env','({DEV:false,VITE_API_BASE_URL:"https://control-plane.example.invalid/api"})')
  for(const m of [...code.matchAll(/from\s+(['"])([^'"]+)\1/g)]){const spec=m[2],url=spec.startsWith('.')?await moduleUrl(resolve(dirname(path),`${spec}.ts`)):pathToFileURL(require.resolve(spec)).href;code=code.replace(m[0],`from ${JSON.stringify(url)}`)}
  const url=`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;modules.set(path,url);return url
}
const load=async p=>import(await moduleUrl(resolve(root,p))), read=p=>readFile(resolve(root,p),'utf8')
const storage=new Map();globalThis.sessionStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}
globalThis.window={setTimeout,clearTimeout,location:{hash:''}}
let fetchImpl=async()=>{throw Error('unexpected synthetic GET')};globalThis.fetch=(...a)=>fetchImpl(...a)
const inv=await load('src/features/operation/investors/investorOverviewApi.ts'),ent=await load('src/features/operation/entrepreneurs/entrepreneurOverviewApi.ts'),shared=await load('src/features/operation/shared/overviewContract.ts')
const policy=await load('src/app/presentationAvailability.ts'), auth=await load('src/lib/authSession.ts'),{ApiError}=await load('src/lib/api.ts')
const session=()=>auth.persistSession({accessToken:'synthetic-only',tokenType:'Bearer',operator:{id:'synthetic',name:'QA',email:'qa@example.invalid',roles:['SUPER_ADMIN']}})
let checks=0;async function check(name,fn){try{await fn();checks++}catch(e){throw Error(`${name}: ${e.message}`,{cause:e})}}
const malformed=e=>e instanceof ApiError&&e.kind==='malformed', json=(b,status=200)=>new Response(JSON.stringify(b),{status})
for(const [domain,fixture,parse,get,id] of [['Investor',investor,inv.parseInvestorOverview,inv.getInvestorOverview,'100'],['Entrepreneur',entrepreneur,ent.parseEntrepreneurOverview,ent.getEntrepreneurOverview,'200']]){
  await check(`${domain} valid`,()=>assert.equal(parse(fixture(),id)[domain.toLowerCase()].id,id))
  for(const bad of [null,[],{}, {data:null}])await check(`${domain} envelope`,()=>assert.throws(()=>parse(bad,id),malformed))
  for(const bad of [0,-1,1.5,'100',Number.MAX_SAFE_INTEGER+1])await check(`${domain} wire identity`,()=>{const w=fixture();w.data[domain.toLowerCase()].id=bad;assert.throws(()=>parse(w,id),malformed)})
  await check(`${domain} requested identity`,()=>assert.throws(()=>parse(fixture(),'999'),malformed))
  for(const bad of ['0','01','inv_proto_1','100/approve'])await check(`${domain} invalid path no network`,async()=>{fetchImpl=()=>assert.fail('network on invalid id');await assert.rejects(get(bad))})
  await check(`${domain} privacy projection`,()=>assert.ok(!/PRIVATE_|banking|documents|provider|rawStatus|riskScore|"email":|"phone":/.test(JSON.stringify(parse(fixture(),id)))))
  for(const state of ['active','paused',null,'future_state'])await check(`${domain} access state not inferred`,()=>{const w=fixture();w.data.account.accessState=state;assert.equal(parse(w,id).account.accessState,state)})
  await check(`${domain} nullable account`,()=>{const w=fixture();w.data.account=null;assert.equal(parse(w,id).account,null)})
  await check(`${domain} invalid date not displayed`,()=>{const w=fixture();w.data.account.updatedAt='2026-02-30T00:00:00Z';assert.equal(parse(w,id).account.updatedAt,null)})
  await check(`${domain} canonical GET only`,async()=>{session();fetchImpl=async(u,o)=>{assert.equal(new URL(u).pathname,`/api/${domain.toLowerCase()}s/${id}/overview`);assert.equal(o.method,'GET');assert.equal(new URL(u).search,'');return json(fixture())};await get(id)})
  for(const status of [401,403,404,500,502])await check(`${domain} HTTP ${status}`,async()=>{session();fetchImpl=async()=>json({code:'SYNTHETIC'},status);await assert.rejects(get(id),e=>e.status===status);assert.equal(!!auth.getAccessToken(),status!==401)})
  await check(`${domain} cancellation`,async()=>{session();const c=new AbortController();c.abort();fetchImpl=async()=>{throw new DOMException('abort','AbortError')};await assert.rejects(get(id,c.signal),e=>e.name==='AbortError')})
  await check(`${domain} network`,async()=>{session();fetchImpl=async()=>{throw new TypeError('offline')};await assert.rejects(get(id),e=>e.kind==='network')})
  await check(`${domain} stale session`,async()=>{session();fetchImpl=async()=>{auth.clearSession();return json(fixture())};await assert.rejects(get(id),e=>e.name==='AbortError')})
  await check(`${domain} timeout bounded`,async()=>{session();window.setTimeout=fn=>setTimeout(fn,5);fetchImpl=(_u,o)=>new Promise((_r,reject)=>o.signal.addEventListener('abort',()=>reject(new DOMException('timeout','AbortError')),{once:true}));try{await assert.rejects(get(id),e=>e.kind==='timeout')}finally{window.setTimeout=setTimeout}})
}
for(const block of ['personalData','kyc','summary','wallet'])await check(`Investor null ${block}`,()=>{const w=investor();w.data[block]=null;assert.equal(inv.parseInvestorOverview(w,'100')[block],null)})
for(const field of ['recentInvestments','recentPayments'])for(const length of [0,10,11])await check(`Investor ${field} cap${length}`,()=>{const w=investor();w.data[field]=Array.from({length},(_,i)=>({...w.data[field][0],id:i+1}));if(length>10)assert.throws(()=>inv.parseInvestorOverview(w,'100'),malformed);else assert.equal(inv.parseInvestorOverview(w,'100')[field==='recentInvestments'?'investments':'payments'].length,length)})
await check('Investor KYC summary independent of FaceMatch',()=>{const d=inv.parseInvestorOverview(investor(),'100');assert.equal(d.kyc.status,'approved');assert.equal(d.kyc.faceMatch.status,'pending');assert.notEqual(d.kyc.faceMatch.id,d.investor.id)})
await check('Investor absent FaceMatch no invented case',()=>{const w=investor();w.data.kyc.faceMatch=null;assert.equal(inv.parseInvestorOverview(w,'100').kyc.faceMatch,null)})
await check('Investor unsafe FaceMatch id rejected',()=>{const w=investor();w.data.kyc.faceMatch.id='100';assert.throws(()=>inv.parseInvestorOverview(w,'100'),malformed)})
for(const [field,value] of [['whitelabelId',9],['ownerId',9],['ownerType','investor'],['currency','USD'],['authoritativeBalanceCents',1.23]])await check(`Investor wallet ${field}`,()=>{const w=investor();w.data.wallet.balance[field]=value;assert.throws(()=>inv.parseInvestorOverview(w,'100'),malformed)})
for(const n of [0,12345,123456789012,-12345])await check(`signed ledger ${n}`,()=>{const w=investor();w.data.wallet.balance.authoritativeBalanceCents=n;assert.equal(inv.parseInvestorOverview(w,'100').wallet.balanceCents,n)})
for(const n of [1.23,-1,'123',Number.MAX_SAFE_INTEGER+1])await check('unsafe summary amount',()=>{const w=investor();w.data.summary.investedAmountCents=n;assert.throws(()=>inv.parseInvestorOverview(w,'100'),malformed)})
await check('BRL cents scaling',()=>assert.equal(shared.money(12345).replace(/\s/g,''),'R$123,45'))
await check('nullable total not zero',()=>assert.equal(shared.money(null),'Não disponível'))
await check('Entrepreneur Company null distinct',()=>{const w=entrepreneur();w.data.company=null;assert.equal(ent.parseEntrepreneurOverview(w,'200').company,null);delete w.data.company;assert.throws(()=>ent.parseEntrepreneurOverview(w,'200'),malformed)})
await check('Entrepreneur Company safe source',()=>{const c=ent.parseEntrepreneurOverview(entrepreneur(),'200').company;assert.equal(c.id,'300');assert.equal(c.cnpjMasked,'**.***.***/****-00')})
await check('Entrepreneur Company raw identifier hidden',()=>{const w=entrepreneur();w.data.company.cnpj='12345678000190';assert.equal(ent.parseEntrepreneurOverview(w,'200').company.cnpjMasked,null)})
await check('Entrepreneur tenant mismatch',()=>{const w=entrepreneur();w.data.opportunities[0].whitelabelId=8;assert.throws(()=>ent.parseEntrepreneurOverview(w,'200'),malformed)})
for(const length of [0,50,51])await check(`Entrepreneur cap${length}`,()=>{const w=entrepreneur();w.data.opportunities=Array.from({length},(_,i)=>({...w.data.opportunities[0],id:i+1}));w.data.summary.byStatus.review=length;if(length>50)assert.throws(()=>ent.parseEntrepreneurOverview(w,'200'),malformed);else assert.equal(ent.parseEntrepreneurOverview(w,'200').opportunities.length,length)})
await check('Entrepreneur full vs capped counts',()=>{const d=ent.parseEntrepreneurOverview(entrepreneur(),'200');assert.equal(d.summary.opportunitiesCount,150);assert.equal(d.opportunities.length,1);assert.equal(d.summary.totalRaisedCents,null)})
for(const view of policy.MOCK_ONLY_VIEWS)await check(`readiness route ${view}`,()=>{assert.equal(policy.viewAvailable(view,false),false);assert.equal(policy.viewAvailable(view,true),true)})
for(const view of ['accounts','operation-investor','operation-entrepreneur','operation-opportunity','finance-wallet','compliance-kyc','audit','settings-menu-visibility'])await check(`real route retained ${view}`,()=>assert.equal(policy.viewAvailable(view,false),true))
await check('eligibility preserves preference results without mutation',()=>{const items=[{id:'dashboard',href:'#/dashboard'},{id:'configuracoes',href:'#/settings/menu-visibility'},{id:'sistema'},{id:'financeiro',href:'#/whitelabels/wl_proto_01/finance/gateways',children:[{id:'finance-gateways',href:'mock'},{id:'finance-wallets',href:'#/finance/wallets'}]},{id:'contas',href:'#/whitelabels/wl_proto_01/accounts'}];const before=JSON.stringify(items),n=policy.readinessNavigation(items,false);assert.equal(JSON.stringify(items),before);assert.deepEqual(n.map(i=>i.id),['dashboard','configuracoes','financeiro','contas']);assert.equal(n[2].children.length,1);assert.equal(n[3].href,'#/whitelabels/select/accounts');assert.equal(policy.readinessNavigation(items,true),items)})
await check('contextual Accounts link retained',()=>assert.equal(policy.readinessHref('contas','#/whitelabels/4/accounts',false),'#/whitelabels/4/accounts'))
await check('session scoped hooks no cross-session lastData',async()=>{const t=await read('src/features/operation/shared/useOverview.ts');assert.match(t,/useSyncExternalStore/);assert.match(t,/getSessionVersion/);assert.ok(!/lastData|setInterval/.test(t))})
await check('Investor lazy extra read only',async()=>{const t=await read('src/features/operation/investors/InvestorDetailPage.tsx');assert.match(t,/InvestorRegistration/);assert.ok(!/useWhitelabelRecord|useInvestorDetail|useEntrepreneurCompany/.test(t));assert.match(t,/p.whitelabelId !== whitelabelId/)})
await check('Entrepreneur no duplicate Company read or KYC route',async()=>{const t=await read('src/features/operation/entrepreneurs/EntrepreneurDetailPage.tsx');assert.ok(!/useEntrepreneurCompany|useEntrepreneurDetail|#\/compliance\/kyc\//.test(t))})
await check('auth gate precedes readiness gate',async()=>{const t=await read('src/app/App.tsx');assert.ok(t.indexOf("if (!authed || route.view === 'login')")<t.indexOf('if (!viewAvailable(route.view))'))})
await check('App differs from accepted baseline only by exact post-auth readiness gate',async()=>{const baseline=execFileSync('git',['show','cf79cca5066771a2edd20ad404f1b0f59527ce29:src/app/App.tsx'],{cwd:root,encoding:'utf8'}).replaceAll('\r\n','\n');assert.equal(withoutReadinessGate(await read('src/app/App.tsx')),baseline)})
await check('canonical auth, menu registry/preferences/save and dependencies untouched',async()=>{assert.equal(execFileSync('git',['diff','cf79cca5066771a2edd20ad404f1b0f59527ce29','--','src/lib','src/features/menu-visibility','src/components/shell/navigation.ts','package.json','package-lock.json',':(exclude)src/features/menu-visibility/MenuVisibilityPage.tsx',...opportunityWriteExclusions()],{cwd:root,encoding:'utf8'}),'');assert.equal(withoutOperatorsEntry(await read('src/features/menu-visibility/MenuVisibilityPage.tsx')),execFileSync('git',['show','cf79cca:src/features/menu-visibility/MenuVisibilityPage.tsx'],{cwd:root,encoding:'utf8'}).replaceAll('\r\n','\n'))})
for(const f of ['src/features/operation/investors/investorOverviewApi.ts','src/features/operation/entrepreneurs/entrepreneurOverviewApi.ts','src/app/presentationAvailability.ts'])await check(`no writes or runtime bypass ${f}`,async()=>{assert.ok(!/authenticatedWrite|localStorage|sessionStorage|window.location|hostname|console\.|fetch\(|POST|PUT|PATCH|DELETE/.test(await read(f)))})
console.log(`Overview 360 + readiness: ${checks} focused checks passed (synthetic only, no live network)`)
