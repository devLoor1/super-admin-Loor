import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'
import { reviewedAuditFilters, withoutAuditRawQuery } from './reviewed-audit-filters-boundary.mjs'

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'), modules=new Map(), require=createRequire(import.meta.url)
async function moduleUrl(path){
  if(modules.has(path))return modules.get(path)
  let code=ts.transpileModule(await readFile(path,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replaceAll('import.meta.env','({VITE_API_BASE_URL:"https://control-plane.example.invalid/api"})')
  for(const m of [...code.matchAll(/from\s+(['"])([^'"]+)\1/g)])code=code.replace(m[0],`from ${JSON.stringify(m[2].startsWith('.')?await moduleUrl(resolve(dirname(path),m[2]+'.ts')):pathToFileURL(require.resolve(m[2])).href)}`)
  const url=`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;modules.set(path,url);return url
}
const load=async p=>import(await moduleUrl(resolve(root,p)))
const storage=new Map()
globalThis.sessionStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}
globalThis.window={setTimeout,clearTimeout,location:{hash:''}}
let fetchImpl=()=>assert.fail('Unexpected network')
globalThis.fetch=(...a)=>fetchImpl(...a)
const route=await load('src/features/governance-audit/auditRoute.ts'), dates=await load('src/features/governance-audit/auditDates.ts')
const api=await load('src/features/governance-audit/auditApi.ts'), auth=await load('src/lib/authSession.ts'), errors=await load('src/lib/apiErrors.ts')
let checks=0
async function check(name,fn){try{await fn();checks++}catch(cause){throw new Error(name,{cause})}}
const id='c'+'a'.repeat(24)
const full={search:'LOGIN',order:'asc',operatorId:id,action:'LOGIN_SUCCESS',resourceType:'whitelabel',resourceId:'42',whitelabelId:'4',result:'success',from:'2026-10-01T03:00:00.000Z',to:'2026-10-24T02:59:59.999Z',page:3}
const query=state=>route.auditListHref(state).split('?')[1]??''
const parse=raw=>route.parseAuditRoute({rawQuery:raw})
await check('canonical deterministic exact names, defaults omitted',()=>{
  assert.deepEqual(parse(query(full)).state,full);assert.equal(route.auditListHref(), '#/audit')
  assert.deepEqual([...new URLSearchParams(query(full)).keys()],route.AUDIT_FILTER_KEYS)
  assert.equal(route.auditListHref({order:'desc',page:1,search:' '}),'#/audit')
})
for(const [key,value] of Object.entries(full))await check(`single ${key} retained across reload`,()=>assert.equal(parse(query({[key]:value})).state[key],value))
for(const [key,value] of Object.entries(full))await check(`duplicate ${key} rejected`,()=>assert.equal(parse(`${query(full)}&${key}=${encodeURIComponent(String(value))}`).valid,false))
for(const raw of ['page=0','page=-1','page=1.5','page=1000000','order=sideways','sort=createdAt','module=finance','operatorId=anonymous','operatorId=USR-SA-01','whitelabelId=0','whitelabelId=-1','whitelabelId=01','whitelabelId=1.5','result=FAILED','result=error','action=Login+realizado','resourceType=x%3Cscript','resourceId=a%2Fb','actor=anonymous','whitelabel=global','whitelabel=wl_proto_01','constructor=a','__proto__=x',`search=${'x'.repeat(81)}`,'search=Bearer+synthetic-secret','search=person%40example.invalid','search=x%00y','from=2026-02-30T00%3A00%3A00Z','from=2026-01-01','from=2026-01-01T00%3A00%3A00','from=2026-01-01T24%3A00%3A00Z','from=2026-01-02T00%3A00%3A00Z&to=2026-01-01T00%3A00%3A00Z'])await check(`invalid URL ${raw.slice(0,30)} blocks`,()=>assert.equal(parse(raw).valid,false))
await check('legacy aliases normalize, canonical conflicts reject',()=>{
  assert.equal(route.auditListHref(parse(`actor=${id}&whitelabel=4`).state),`#/audit?operatorId=${id}&whitelabelId=4`)
  assert.equal(parse(`actor=${id}&operatorId=${id}`).valid,false)
  assert.equal(parse('whitelabel=4&whitelabelId=4').valid,false)
})
await check('literal second question mark is not truncated into a broader query',()=>{
  assert.equal(parse('action=LOGIN_SUCCESS?result=failed').valid,false)
  assert.equal(parse('search=LOGIN?literal').state.search,'LOGIN?literal')
  assert.equal(route.auditListReturnHash('#/audit?action=LOGIN_SUCCESS?result=failed'),'#/audit?action=LOGIN_SUCCESS%3Fresult%3Dfailed')
})
for(const key of route.AUDIT_FILTER_KEYS.filter(k=>k!=='page'))await check(`remove ${key} retains other filters and resets page`,()=>{
  const p=parse(route.removeAuditFilter(query(full),key).split('?')[1]);assert.equal(p.valid,true);assert.equal(p.state.page,1)
  for(const k of Object.keys(full).filter(k=>k!==key&&k!=='page'))assert.equal(p.state[k],full[k])
})
for(const patch of [{page:4},{search:'FUTURE',page:1},{order:'desc',page:1},{action:'FUTURE_ACTION',page:1}])await check('patch keeps all unrelated filters',()=>{
  const p=parse(route.updateAuditQuery(query(full),patch).split('?')[1]);assert.deepEqual(p.state,{...full,...patch})
})
await check('invalid restrictions preserved until explicit removal',()=>{
  const raw='result=bad&unknown=x&action=LOGIN_SUCCESS'
  assert.equal(parse(route.updateAuditQuery(raw,{search:'LOGIN',page:1}).split('?')[1]).valid,false)
  const first=route.removeAuditFilter(raw,'unknown');assert.equal(parse(first.split('?')[1]).valid,false)
  const next=route.removeAuditFilter(first.split('?')[1],'result');assert.equal(next,'#/audit?action=LOGIN_SUCCESS')
})
await check('detail return carries ALL filters, invalid remains invalid, no external redirect',()=>{
  const context=route.auditListHref(full), href=route.auditEventHref('ckqaev00000000000000000001',context)
  assert.equal(route.auditListReturnHash(new URLSearchParams(href.split('?')[1]).get('returnTo')),context)
  assert.equal(route.auditListReturnHash('#/audit?actor=anonymous'),'#/audit?actor=anonymous')
  for(const bad of ['https://example.invalid','#/audit-other','#/audit/id','#/audit?x=y#evil'])assert.equal(route.auditListReturnHash(bad),'#/audit')
})
for(const [day,start,end] of [
  ['2026-10-23','2026-10-23T03:00:00.000Z','2026-10-24T02:59:59.999Z'],
  ['2024-02-29','2024-02-29T03:00:00.000Z','2024-03-01T02:59:59.999Z'],
  ['2026-12-31','2026-12-31T03:00:00.000Z','2027-01-01T02:59:59.999Z'],
  ['2018-11-04','2018-11-04T03:00:00.000Z','2018-11-05T01:59:59.999Z'],
  ['2019-02-16','2019-02-16T02:00:00.000Z','2019-02-17T02:59:59.999Z'],
])for(const tz of ['UTC','Asia/Tokyo','America/Los_Angeles'])await check(`inclusive day ${day} independent of ${tz}`,()=>{
  const before=process.env.TZ;process.env.TZ=tz
  try{assert.equal(dates.auditDayBoundary(day),start);assert.equal(dates.auditDayBoundary(day,true),end);assert.equal(dates.auditLocalDate(start),day);assert.equal(dates.auditLocalDate(end),day)}finally{if(before===undefined)delete process.env.TZ;else process.env.TZ=before}
})
for(const day of ['2026-02-29','2026-04-31','2026-13-01','0','2026-1-01','9999-12-31'])await check(`bad calendar ${day}`,()=>assert.throws(()=>dates.auditDayBoundary(day)))
await check('offset instant normalized without changing time',()=>assert.equal(parse('from=2018-11-04T01%3A00%3A00-02%3A00').state.from,'2018-11-04T03:00:00.000Z'))

const row={id:'ckqaev00000000000000000001',superAdminId:id,superAdmin:{id,name:'Synthetic Operator',email:'qa@example.invalid'},action:'LOGIN_SUCCESS',resourceType:'whitelabel',resourceId:'42',whitelabelId:4,result:'success',createdAt:'2026-10-23T12:00:00.000Z',beforeData:null,afterData:null}
const json=(value,status=200)=>new Response(JSON.stringify(value),{status})
const body=(data=[row],meta={})=>({data,meta:{page:1,perPage:8,total:data.length,lastPage:1,...meta}})
const session=()=>auth.persistSession({accessToken:'synthetic-audit-only',tokenType:'Bearer',operator:{id,name:'Synthetic',email:'qa@example.invalid',roles:['SUPER_ADMIN']}})
const params={...full,page:1}
for(const key of Object.keys(full))await check(`GET exact ${key} filter whitelist`,async()=>{
  session();let calls=0
  fetchImpl=async(u,o)=>{calls++;assert.equal(o.method,'GET');assert.equal(o.body,undefined);const q=Object.fromEntries(new URL(u).searchParams);assert.deepEqual(q,{page:'1',perPage:'8',...(key==='page'?{}:key==='order'?{order:'asc'}:{[key]:String(full[key])})});assert.ok(o.headers['X-Correlation-ID']);return json(body())}
  await api.listAuditEvents({page:1,search:'',order:'desc',[key]:key==='page'?1:full[key]});assert.equal(calls,1)
})
await check('combined query server-side, no local narrowing, authoritative total',async()=>{
  session();fetchImpl=async(u)=>{assert.deepEqual(Object.fromEntries(new URL(u).searchParams),{...Object.fromEntries(Object.entries(params).map(([k,v])=>[k,String(v)])),perPage:'8'});return json(body([row],{total:101,lastPage:13}))}
  assert.equal((await api.listAuditEvents(params)).total,101)
})
await check('valid zero is not error',async()=>{session();fetchImpl=async()=>json(body([]));assert.equal((await api.listAuditEvents(params)).total,0)})
for(const [bad,label] of [[body([row],{page:2}),'wrong page'],[body([row],{perPage:9}),'wrong page size'],[body([row,row]),'duplicate'],[body([row],{total:99}),'wrong last page'],[body([{...row,createdAt:'2026-02-30T00:00:00Z'}]),'calendar'],[body([{...row,createdAt:'2026-10-22T12:00:00Z'},row]),'wrong order']])await check(`malformed ${label}`,async()=>{session();fetchImpl=async()=>json(bad);await assert.rejects(api.listAuditEvents({...params,order:'desc'}),e=>e.kind==='malformed')})
for(const status of [400,401,403,500,502])await check(`HTTP ${status} isolated/central`,async()=>{session();fetchImpl=async()=>json({message:'PRIVATE_BACKEND_TEXT'},status);const e=await api.listAuditEvents(params).catch(e=>e);assert.equal(e.status,status);assert.equal(!!auth.getAccessToken(),status!==401);assert.ok(!JSON.stringify(errors.describeApiError(e,'eventos')).includes('PRIVATE_BACKEND_TEXT'))})
await check('session replacement rejects late response and memory',async()=>{session();fetchImpl=async()=>{auth.clearSession();session();return json(body())};await assert.rejects(api.listAuditEvents(params),e=>e.name==='AbortError');assert.equal(api.loadedAuditRecord(row.id),null)})
await check('network',async()=>{session();fetchImpl=async()=>{throw new TypeError('offline')};await assert.rejects(api.listAuditEvents(params),e=>e.kind==='network')})
await check('bounded timeout',async()=>{session();window.setTimeout=fn=>setTimeout(fn,5);fetchImpl=(_u,o)=>new Promise((_r,reject)=>o.signal.addEventListener('abort',()=>reject(new DOMException('timeout','AbortError')),{once:true}));try{await assert.rejects(api.listAuditEvents(params),e=>e.kind==='timeout')}finally{window.setTimeout=setTimeout}})
await check('abort',async()=>{session();const c=new AbortController();c.abort();fetchImpl=async()=>{throw new DOMException('abort','AbortError')};await assert.rejects(api.listAuditEvents(params,c.signal),e=>e.name==='AbortError')})
const read=p=>readFile(resolve(root,p),'utf8')
await check('invalid URL hook null, session key, no stale footer',async()=>{const s=await read('src/features/governance-audit/AuditListPage.tsx'),h=await read('src/features/governance-audit/useAuditData.ts');assert.match(s,/useAuditList\(valid \? route : null\)/);assert.doesNotMatch(s,/lastData|\.filter\(.*record/);assert.match(h,/useSyncExternalStore/);assert.match(h,/\$\{version\}/)})
await check('truthful summary, exact zero state, semantic controls and focus',async()=>{const s=await read('src/features/governance-audit/AuditListPage.tsx'),f=await read('src/features/governance-audit/AuditFilters.tsx'),css=await read('src/features/governance-audit/Audit.module.css');assert.doesNotMatch(s,/Com alterações|Últimos 7 dias|label: 'Hoje'/);assert.match(s,/Nenhum evento encontrado para os filtros selecionados\./);assert.match(s,/<summary>Filtros avançados/);assert.match(s,/role="status"/);assert.match(f,/<form onSubmit/);assert.match(f,/type="date"/);assert.match(css,/:focus-visible/);assert.match(f,/route\[key\].*day === auditLocalDate/)})
await check('protected runtime source unchanged outside the exact Audit raw-query adaptations',()=>{
  const git=(...a)=>execFileSync('git',a,{cwd:root,encoding:'utf8'}).replaceAll('\r\n','\n')
  assert.equal(git('diff','cd25769','--','src/features/dashboard','src/features/compliance-kyc','src/features/operation','src/features/finance-core','src/features/menu-visibility','src/components','src/lib','src/app/routeQuery.ts','src/app/useUrlSearchDraft.ts','src/app/presentationAvailability.ts','package.json','package-lock.json'),'')
})
await check('historical guard normalization rejects extra App changes and unrelated paths',async()=>{
  const source=await read('src/app/App.tsx')
  assert.equal(reviewedAuditFilters('src/app/App.tsx'),true)
  assert.equal(reviewedAuditFilters('src/lib/apiClient.ts'),false)
  assert.equal(reviewedAuditFilters('src/features/governance-audit/UnreviewedClient.ts'),false)
  assert.throws(()=>withoutAuditRawQuery(source+'\n// unrelated change'))
  assert.throws(()=>withoutAuditRawQuery(source.replace('rawQuery={route.search}','rawQuery={route.search}\n        rawQuery={route.search}')))
  const baseline=execFileSync('git',['show','cd25769:src/app/App.tsx'],{cwd:root,encoding:'utf8'}).replaceAll('\r\n','\n')
  assert.equal(withoutAuditRawQuery(source),baseline)
})
auth.clearSession()
console.log(`Audit advanced filters: ${checks} focused checks passed (synthetic/source, no live network)`)
