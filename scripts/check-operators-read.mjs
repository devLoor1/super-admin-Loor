import assert from 'node:assert/strict'
import { readFile } from './reviewed-consolidation-boundary.mjs'
import { resolve } from 'node:path'
import { moduleLoader, root } from './operators-test-harness.mjs'
const load = moduleLoader()
const storage = new Map()
globalThis.sessionStorage = { getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k) }
globalThis.window = {setTimeout,clearTimeout,location:{hash:''}}
let fetchImpl=()=>assert.fail('Unexpected request'); let requests=0
globalThis.fetch=(u,o)=>{requests++;assert.equal(o.method,'GET');assert.equal(o.body,undefined);return fetchImpl(u,o)}
const api=await load('src/features/control-plane-operators/operatorApi.ts'), route=await load('src/features/control-plane-operators/operatorRoute.ts'), auth=await load('src/lib/authSession.ts'), errors=await load('src/lib/apiErrors.ts')
const id='c'+'a'.repeat(24), id2='c'+'b'.repeat(24), query={page:1,search:'',order:'desc'}
const row={id,name:'Synthetic Operator',email:'qa@example.invalid',status:'ACTIVE',roles:['SUPER_ADMIN','READ_ONLY'],roleDetails:[{slug:'SUPER_ADMIN',name:'Super administrator'},{slug:'READ_ONLY',name:'Consulta'}],lastLoginAt:null,createdAt:'2026-10-23T12:00:00.000Z',updatedAt:'2026-10-23T12:00:00.000Z',passwordHash:'SENSITIVE_SENTINEL',accessToken:'SENSITIVE_SENTINEL'}
const page=(rows=[row],meta={})=>({data:rows,meta:{page:1,perPage:20,total:rows.length,lastPage:1,...meta}})
const json=(b,s=200)=>new Response(JSON.stringify(b),{status:s})
const session=(roles=['SUPER_ADMIN'])=>auth.persistSession({accessToken:'synthetic-only',tokenType:'Bearer',operator:{id,name:'Synthetic',email:'qa@example.invalid',roles}})
let checks=0;async function check(name,fn){try{await fn();checks++}catch(cause){throw Error(name,{cause})}}
const malformed=e=>e.kind==='malformed'
await check('authorized operator email stays complete; credentials are discarded and all roles remain',()=>{const r=api.parseOperator(row);assert.deepEqual(r.roles,row.roles);assert.equal(r.lastLoginAt,null);assert.equal(r.email,'qa@example.invalid');assert.doesNotMatch(JSON.stringify(r),/SENSITIVE_SENTINEL|password|accessToken/)})
await check('explicit business names are not rewritten and credential-like text is rejected',()=>{assert.equal(api.parseOperator({...row,name:'qa@example.invalid'}).name,'qa@example.invalid');for(const field of ['name','email'])assert.throws(()=>api.parseOperator({...row,[field]:'Bearer synthetic-only'}),malformed)})
for(const v of ['c'+'a'.repeat(24),'c'+'123456789012345678901234'])await check('CUID accepted',()=>assert.equal(api.isOperatorId(v),true))
for(const v of ['1','c1','op_proto_1','C'+'A'.repeat(24),id+'/roles','%2F',null])await check('non CP ID rejected',()=>assert.equal(api.isOperatorId(v),false))
for(const b of [null,[],{}, {data:[]},page([row],{perPage:100}),page([row],{page:2}),page([row],{lastPage:9}),page([row],{total:-1}),page([row],{total:22,lastPage:2}),page([row,row]),page([{...row,id:'1'}]),page([{...row,roles:['READ_ONLY','READ_ONLY']}]),page([{...row,roleDetails:[]}]),page([{...row,lastLoginAt:undefined}]),page([{...row,createdAt:'2026-02-30T00:00:00Z'}])])await check('malformed envelope/meta/identity/roles/time',()=>assert.throws(()=>api.parseOperatorPage(b,query),malformed))
await check('valid zero authoritative',()=>assert.equal(api.parseOperatorPage(page([]),query).total,0))
await check('out-of-range valid page empty',()=>assert.equal(api.parseOperatorPage(page([],{page:2,total:1}),{...query,page:2}).page,2))
await check('unknown status preserved, not guessed',()=>assert.equal(api.parseOperator({...row,status:'FUTURE'}).status,'FUTURE'))
await check('detail identity strict',()=>{assert.equal(api.parseOperatorDetail({data:row},id).id,id);assert.throws(()=>api.parseOperatorDetail({data:row},id2),malformed)})
for(const date of ['bad','2026-02-29T00:00:00Z','2026-13-01T00:00:00Z','2026-01-01T24:00:00Z','2026-01-01','2026-01-01T00:00:00'])await check('bad timestamp',()=>assert.throws(()=>api.operatorDate(date)))
await check('ordering cannot be silently wrong',()=>{const second={...row,id:id2,createdAt:'2026-10-24T00:00:00Z'};assert.throws(()=>api.parseOperatorPage(page([row,second]),query),malformed);assert.equal(api.parseOperatorPage(page([row,second]),{...query,order:'asc'}).rows.length,2)})
for(const raw of ['sort=name','status=ACTIVE','roles=SUPER_ADMIN','whitelabel=4','page=0','page=01','page=1.5','page=1000000','page=1&page=2','order=bad','order=asc&order=desc','search=a&search=b','search=%00','returnTo=x','search='+ 'x'.repeat(121)])await check('invalid route blocks request instead of widening',()=>assert.equal(route.parseOperatorRoute(raw).valid,false))
await check('canonical route/context only',()=>{const q={page:2,search:'Synthetic & QA',order:'asc'},h=route.operatorListHref(q);assert.deepEqual(route.parseOperatorRoute(h.split('?')[1]).query,q);assert.equal(route.operatorReturnHref(h),h);for(const bad of ['https://example.invalid','#/settings/operators/x','#/settings/operators?sort=bad'])assert.equal(route.operatorReturnHref(bad),route.OPERATORS_HREF)})
await check('list exact whitelist GET',async()=>{session();fetchImpl=async(u)=>{assert.equal(new URL(u).pathname,'/api/operators');assert.deepEqual(Object.fromEntries(new URL(u).searchParams),{page:'1',perPage:'20',search:'Synthetic',order:'asc'});return json(page())};assert.equal((await api.listOperators({...query,search:'Synthetic',order:'asc'})).total,1)})
await check('detail canonical GET',async()=>{session();fetchImpl=async(u)=>{assert.equal(new URL(u).pathname,'/api/operators/'+id);assert.equal(new URL(u).search,'');return json({data:row})};await api.getOperatorDetail(id)})
for(const roles of [[],['READ_ONLY'],['SUPPORT_ADMIN'],['COMPLIANCE_ADMIN'],['FINANCIAL_ADMIN']])await check('non SUPER_ADMIN no request',async()=>{session(roles);const n=requests;await assert.rejects(api.listOperators(query),e=>e.status===403);await assert.rejects(api.getOperatorDetail(id),e=>e.status===403);assert.equal(requests,n)})
await check('invalid input no request',async()=>{session();const n=requests;await assert.rejects(api.getOperatorDetail('1'));await assert.rejects(api.listOperators({...query,page:0}));assert.equal(requests,n)})
for(const status of [400,401,403,404,500,502])await check(`HTTP ${status} isolated/central and safe`,async()=>{session();fetchImpl=async()=>json({message:'PRIVATE_ERROR'},status);const e=await api.listOperators(query).catch(e=>e);assert.equal(e.status,status);assert.equal(!!auth.getAccessToken(),status!==401);const view=errors.describeApiError(e,'operadores');assert.doesNotMatch(JSON.stringify(view),/PRIVATE_ERROR/);if([401,403,404].includes(status))assert.equal(view.retryable,false)})
await check('session replacement rejects late payload',async()=>{session();fetchImpl=async()=>{auth.clearSession();session();return json(page())};await assert.rejects(api.listOperators(query),e=>e.name==='AbortError')})
await check('network and explicit retry',async()=>{session();fetchImpl=async()=>{throw TypeError('offline')};await assert.rejects(api.listOperators(query),e=>e.kind==='network');fetchImpl=async()=>json(page());assert.equal((await api.listOperators(query)).total,1)})
await check('bounded timeout',async()=>{session();window.setTimeout=fn=>setTimeout(fn,5);fetchImpl=(_u,o)=>new Promise((_r,j)=>o.signal.addEventListener('abort',()=>j(new DOMException('timeout','AbortError')),{once:true}));try{await assert.rejects(api.listOperators(query),e=>e.kind==='timeout')}finally{window.setTimeout=setTimeout}})
await check('cancel read',async()=>{session();const c=new AbortController();c.abort();fetchImpl=async()=>{throw new DOMException('cancel','AbortError')};await assert.rejects(api.listOperators(query,c.signal),e=>e.name==='AbortError')})
await check('hook session gate; never lastData/persistence/polling',async()=>{const s=await readFile(resolve(root,'src/features/control-plane-operators/useOperators.ts'),'utf8');assert.match(s,/useSyncExternalStore/);assert.match(s,/allowed &&/);assert.match(s,/\$\{session\}/);assert.doesNotMatch(s,/lastData|sessionStorage|localStorage|setInterval/)})
auth.clearSession(); console.log(`Operators read: ${checks} focused checks passed (synthetic, GET only)`)
