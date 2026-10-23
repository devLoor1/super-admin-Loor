import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { moduleLoader, root, reactUrl, renderUrl } from './operators-test-harness.mjs'
import {reviewedAccountAccess,verifyAccountAccessSource} from './reviewed-account-access-boundary.mjs'

// Injected fetch only: never a live account, credential or business mutation.
const storage = new Map()
globalThis.sessionStorage = { getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k) }
globalThis.window = { setTimeout:(fn,ms)=>setTimeout(fn,ms===20000?30:ms),clearTimeout,location:{hash:''},matchMedia:()=>({matches:true,addEventListener(){},removeEventListener(){}}) }
globalThis.document = { hidden:false }
let fetchImpl=async()=>{throw Error('Unexpected synthetic request')}
globalThis.fetch=(...args)=>fetchImpl(...args)
const load=moduleLoader(),auth=await load('src/lib/authSession.ts'),contract=await load('src/features/whitelabel-accounts/access/accountAccessContract.ts'),client=await load('src/features/whitelabel-accounts/access/accountAccessClient.ts')
let checks=0,sequence=100
async function check(name,fn){try{await fn();checks++}catch(cause){throw Error(name,{cause})}}
const response=(value,status=200)=>new Response(JSON.stringify(value),{status})
const rolesSession=(roles=['SUPER_ADMIN'])=>{auth.persistSession({accessToken:'synthetic-access-token',tokenType:'Bearer',operator:{id:'synthetic',name:'QA',email:'qa@example.invalid',roles}});return auth.getSessionVersion()}
function fixture(kind='investor'){
 const id=String(++sequence),ref={whitelabelId:'4',accountId:id,kind},command={...ref,action:'pause',from:'active',reason:'Synthetic QA reason — never live'},state={access:'active'},seen=[]
 const wire=()=>({id:Number(id),type:kind,whitelabelId:4,email:'qa@example.invalid',fullName:null,phone:null,accessState:state.access,businessState:kind==='investor'?'approved':'profile_complete',personalInformationFilled:true,investorType:'individual',emailVerifiedAt:null,createdAt:null,updatedAt:null})
 const receipt=()=>({data:{accountId:Number(id),accountType:kind,whitelabelId:4,accessState:state.access,reason:'DO_NOT_RETAIN_SERVER_REASON',note:'DO_NOT_RENDER_RAW_NOTE'}})
 fetchImpl=async(url,options)=>{seen.push({url,options});if(options.method==='POST'){state.access=new URL(url).pathname.endsWith('/pause')?'paused':'active';return response(receipt(),201)}return response({data:wire()})}
 return{ref,command,state,seen,wire,receipt,version:rolesSession()}
}
const waitFor=async fn=>{for(let i=0;i<100&&!fn();i++)await new Promise(r=>setTimeout(r,1));assert.ok(fn(),'Synthetic operation did not reach expected stage')}

for(const kind of ['investor','entrepreneur'])await check(`${kind}: exactly one pause then one explicit reactivation, real GET projection`,async()=>{
 const f=fixture(kind);await client.changeAccountAccess(f.command,f.version)
 assert.equal(f.seen.filter(r=>r.options.method==='POST').length,1);assert.equal(f.seen.length,3)
 const post=f.seen.find(r=>r.options.method==='POST');assert.equal(post.url,`https://control-plane.example.invalid/api/whitelabels/4/accounts/${f.ref.accountId}/pause?tipo=${kind==='investor'?'investidores':'empreendedores'}`)
 assert.deepEqual(JSON.parse(post.options.body),{reason:f.command.reason});assert.equal(post.options.headers.Authorization,'Bearer synthetic-access-token');assert.match(post.options.headers['X-Correlation-ID'],/^[0-9a-f-]{36}$/)
 assert.equal(client.accessAttempt(f.ref,f.version).phase,'confirmed');assert.equal(client.accessAttempt(f.ref,f.version).responseAccepted,true)
 assert.doesNotMatch(JSON.stringify(client.accessAttempt(f.ref,f.version)),/DO_NOT_|Synthetic QA reason/)
 await client.changeAccountAccess({...f.ref,action:'reactivate',from:'paused'},f.version)
 assert.equal(f.state.access,'active');assert.equal(f.seen.filter(r=>r.options.method==='POST').length,2);assert.equal(f.seen.filter(r=>r.options.method==='POST')[1].options.body,undefined)
})
for(const roles of [['SUPER_ADMIN'],['SUPPORT_ADMIN'],['READ_ONLY'],['COMPLIANCE_ADMIN'],['FINANCIAL_ADMIN'],[],['super_admin']])await check(`actual transport role guard ${roles}`,async()=>{
 const f=fixture();f.version=rolesSession(roles)
 if(roles.includes('SUPER_ADMIN')||roles.includes('SUPPORT_ADMIN'))await client.changeAccountAccess(f.command,f.version)
 else{await assert.rejects(client.changeAccountAccess(f.command,f.version),e=>e.status===403);assert.equal(f.seen.length,0)}
})
for(const mutation of [{kind:'admin'},{kind:'operator'},{accountId:'01'},{accountId:'0'},{whitelabelId:'wl_proto_1'},{whitelabelId:'0'},{accountId:'9007199254740992'},{from:'paused'},{action:'delete'},{method:'DELETE'},{body:{status:'active'}},{reason:''},{reason:' \n '},{reason:'a'.repeat(501)}])await check(`invalid command rejected before fetch: ${Object.keys(mutation)}`,async()=>{
 const f=fixture();await assert.rejects(client.changeAccountAccess({...f.command,...mutation},f.version));assert.equal(f.seen.length,0)
})
await check('Core permits a single nonblank character; trim safely; reactivation rejects a reason',()=>{
 const f=fixture();assert.equal(contract.validateAccessCommand({...f.command,reason:' x '}).reason,'x');assert.throws(()=>contract.validateAccessCommand({...f.command,action:'reactivate',from:'paused',reason:'no'}))
})
await check('fresh state changes / scope mismatch / missing account never send POST',async()=>{
 for(const mode of ['paused','unknown','scope','missing']){
  const f=fixture();fetchImpl=async(url,options)=>{f.seen.push({url,options});return response({data:{...f.wire(),...(mode==='scope'?{whitelabelId:6}:{accessState:mode})}},mode==='missing'?404:200)}
  await client.changeAccountAccess(f.command,f.version);assert.ok(!f.seen.some(x=>x.options.method==='POST'))
 }
})
await check('double submit is synchronously locked, including direct transport calls',async()=>{
 const f=fixture();let finish
 fetchImpl=async(url,options)=>{f.seen.push({url,options});if(options.method==='POST')return new Promise(r=>{finish=()=>{f.state.access='paused';r(response(f.receipt(),201))}});return response({data:f.wire()})}
 const first=client.changeAccountAccess(f.command,f.version);await waitFor(()=>finish);await assert.rejects(client.changeAccountAccess(f.command,f.version),e=>e.code==='ACCESS_ATTEMPT_LOCKED');finish();await first;assert.equal(f.seen.filter(x=>x.options.method==='POST').length,1)
})
for(const failure of ['audit500','upstream502','network','wrong-status','wrong-identity'])await check(`post-commit ${failure}: GET confirms, no duplicate, no fake accepted response`,async()=>{
 const f=fixture();fetchImpl=async(url,options)=>{f.seen.push({url,options});if(options.method==='POST'){f.state.access='paused';if(failure==='network')throw TypeError('Synthetic offline');if(failure==='wrong-status')return response(f.receipt(),200);if(failure==='wrong-identity')return response({data:{...f.receipt().data,accountId:999}},201);return response({code:'SYNTHETIC_FAILURE'},failure==='audit500'?500:502)}return response({data:f.wire()})}
 await client.changeAccountAccess(f.command,f.version);assert.equal(client.accessAttempt(f.ref,f.version).phase,'confirmed');assert.equal(client.accessAttempt(f.ref,f.version).responseAccepted,false);assert.equal(f.seen.filter(x=>x.options.method==='POST').length,1)
})
await check('timeout + unchanged read locks repeats; explicit reconciliation is GET-only',async()=>{
 const f=fixture();fetchImpl=async(url,options)=>{f.seen.push({url,options});if(options.method==='POST')return new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('Synthetic abort','AbortError'))));return response({data:f.wire()})}
 await client.changeAccountAccess(f.command,f.version);assert.equal(client.accessAttempt(f.ref,f.version).phase,'unchanged');await assert.rejects(client.changeAccountAccess(f.command,f.version),e=>e.status===409)
 await client.reconcileAccountAccess(f.ref,f.version);assert.equal(client.accessAttempt(f.ref,f.version).phase,'unchanged');assert.equal(f.seen.filter(x=>x.options.method==='POST').length,1)
 f.state.access='paused';await client.reconcileAccountAccess(f.ref,f.version);assert.equal(client.accessAttempt(f.ref,f.version).phase,'confirmed')
})
await check('failed GET after accepted write remains uncertain until explicit GET recovery',async()=>{
 const f=fixture();let reads=0
 fetchImpl=async(url,options)=>{f.seen.push({url,options});if(options.method==='POST'){f.state.access='paused';return response(f.receipt(),201)}if(++reads===2)return response({},502);return response({data:f.wire()})}
 await client.changeAccountAccess(f.command,f.version);assert.equal(client.accessAttempt(f.ref,f.version).phase,'uncertain');await client.reconcileAccountAccess(f.ref,f.version);assert.equal(client.accessAttempt(f.ref,f.version).phase,'confirmed');assert.equal(f.seen.filter(x=>x.options.method==='POST').length,1)
})
for(const status of [400,401,403,404,422])await check(`authoritative rejection ${status}, central 401 and no fake success`,async()=>{
 const f=fixture();fetchImpl=async(url,options)=>{f.seen.push({url,options});return options.method==='POST'?response({message:'DO_NOT_RETAIN_PRIVATE_REASON'},status):response({data:f.wire()})}
 await client.changeAccountAccess(f.command,f.version);const attempt=client.accessAttempt(f.ref,f.version);assert.notEqual(attempt.phase,'confirmed');assert.doesNotMatch(JSON.stringify(attempt),/DO_NOT_RETAIN/);if(status===401)assert.equal(auth.getAccessToken(),null)
})
await check('session replacement after dispatch suppresses late accepted success; next session GET only',async()=>{
 const f=fixture();let finish
 fetchImpl=async(url,options)=>{f.seen.push({url,options});if(options.method==='POST')return new Promise(r=>{finish=()=>{f.state.access='paused';r(response(f.receipt(),201))}});return response({data:f.wire()})}
 const pending=client.changeAccountAccess(f.command,f.version);await waitFor(()=>finish);const next=rolesSession(['SUPPORT_ADMIN']);finish();await pending
 assert.equal(client.accessAttempt(f.ref,next).phase,'uncertain');assert.equal(client.accessAttempt(f.ref,next).responseAccepted,false);await client.reconcileAccountAccess(f.ref,next);assert.equal(client.accessAttempt(f.ref,next).phase,'confirmed');assert.equal(f.seen.filter(x=>x.options.method==='POST').length,1)
})
await check('unmount/cancellation during preflight prevents a late POST',async()=>{
 const f=fixture(),controller=new AbortController();fetchImpl=async(url,options)=>{f.seen.push({url,options});return new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('Cancelled','AbortError'))))}
 const pending=client.changeAccountAccess(f.command,f.version,controller.signal);controller.abort();await pending;assert.ok(!f.seen.some(x=>x.options.method==='POST'))
})

const {createElement:h}=await import(reactUrl),{renderToStaticMarkup:render}=await import(renderUrl)
for(const development of [false,true])for(const roles of [['SUPER_ADMIN'],['SUPPORT_ADMIN'],['COMPLIANCE_ADMIN'],['READ_ONLY'],[]])for(const kind of ['investor','entrepreneur','admin'])await check(`rendered ${development?'DEV':'production'} ${roles} ${kind} eligibility`,async()=>{
 const uiLoad=moduleLoader({development,overrides:{'src/lib/authSession.ts':`export const useSessionOperator=()=>({roles:${JSON.stringify(roles)}});export const subscribeSession=()=>()=>{};export const getSessionVersion=()=>0;export const getAccessToken=()=>null;export const getOperator=useSessionOperator;export const handleUnauthorized=()=>{};`}})
 const {AccountAccessActions}=await uiLoad('src/features/whitelabel-accounts/access/AccountAccessActions.tsx')
 const allowed=roles.some(r=>['SUPER_ADMIN','SUPPORT_ADMIN'].includes(r))&&kind!=='admin'
 const detail={kind,record:{id:'3',whitelabelId:'4',accessState:'active'}}
 const html=render(h(AccountAccessActions,{detail,tenantId:'4'}));assert.equal(html.includes('Pausar acesso'),allowed);assert.doesNotMatch(html,/qa@example|DO_NOT_|Criar administrador|Redefinir senha/)
 assert.equal(render(h(AccountAccessActions,{detail,tenantId:'6'})),'');assert.equal(render(h(AccountAccessActions,{detail,tenantId:'4',current:false})),'')
 if(allowed){assert.match(render(h(AccountAccessActions,{detail:{kind,record:{...detail.record,accessState:'paused'}},tenantId:'4'})),/Reativar acesso/);assert.doesNotMatch(render(h(AccountAccessActions,{detail:{kind,record:{...detail.record,accessState:'FUTURE'}},tenantId:'4'})),/<button/)}
})
await check('protected source and narrowed domain boundaries remain intact',async()=>{
 const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim()
 for(const path of ['src/lib','src/app','src/components','src/features/operation','src/features/control-plane-operators','src/features/menu-visibility','package.json','package-lock.json','netlify.toml'])assert.equal(git('diff','b1dc5f1','--',path),'',path)
 for(const name of ['accountAccessContract.ts','accountAccessClient.ts','accountAccessRefresh.ts','AccountAccessActions.tsx']){
  const source=await readFile(resolve(root,'src/features/whitelabel-accounts/access',name),'utf8');assert.doesNotMatch(source,/console\.|sessionStorage|localStorage|\/admins|\/operators|prototypeAccounts/)
 }
 const source=await readFile(resolve(root,'src/features/whitelabel-accounts/access/accountAccessClient.ts'),'utf8');assert.equal((source.match(/method: 'POST'/g)||[]).length,1);assert.doesNotMatch(source,/method: '(PATCH|PUT|DELETE)'|afterData|\.message/)
})
await check('exact reviewed source boundaries reject unrelated bytes and unknown files',async()=>{
 const path='src/features/whitelabel-accounts/access/accountAccessClient.ts',source=await readFile(resolve(root,path),'utf8')
 assert.equal(reviewedAccountAccess(path),true);assert.throws(()=>verifyAccountAccessSource(path,source+'\n// unrelated'))
 assert.equal(reviewedAccountAccess('src/features/whitelabel-accounts/access/Unreviewed.ts'),false)
 assert.equal(reviewedAccountAccess('src/lib/apiClient.ts'),false)
})
console.log(`Account access lifecycle: ${checks} checks passed (synthetic fetch and rendered DEV/production; zero live writes)`)
