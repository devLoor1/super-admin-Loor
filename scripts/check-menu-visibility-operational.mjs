import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'

// Synthetic only. All fetches intercepted, no credential/service/database access.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(resolve(root, 'package.json'))
const data = code => 'data:text/javascript;base64,' + Buffer.from(code).toString('base64')
async function environment(flag) {
  const cache = new Map()
  const env = { VITE_API_BASE_URL:'https://control-plane.example.invalid/api', VITE_MENU_VISIBILITY_WRITES_ENABLED:flag }
  async function moduleUrl(path) {
    if (cache.has(path)) return cache.get(path)
    let code=ts.transpileModule(await readFile(path,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText.replaceAll('import.meta.env','('+JSON.stringify(env)+')')
    for(const m of [...code.matchAll(/from\s+(['"])([^'"]+)\1/g)]) {
      const base=resolve(dirname(path),m[2])
      const url=m[2].startsWith('.')?await moduleUrl(base+(existsSync(base+'.ts')?'.ts':'.tsx')):pathToFileURL(require.resolve(m[2])).href
      code=code.replace(m[0],'from '+JSON.stringify(url))
    }
    const url=data(code);cache.set(path,url);return url
  }
  const load=async path=>import(await moduleUrl(resolve(root,path)))
  const storage=new Map();let storageReads=0
  globalThis.sessionStorage={getItem:k=>{storageReads++;return storage.get(k)??null},setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}
  globalThis.window={setTimeout:(fn,ms)=>setTimeout(fn,ms===20000?15:ms),clearTimeout,location:{hash:''}}
  const auth=await load('src/lib/authSession.ts')
  const session=(roles=['SUPER_ADMIN'],id='synthetic-operator')=>auth.persistSession({accessToken:'synthetic-only',tokenType:'Bearer',operator:{id,name:'Mock',email:'qa@example.invalid',roles}})
  session()
  return {load,auth,session,storage,reads:()=>storageReads}
}
let checks=0,calls=[],answer
async function check(name,fn){try{await fn();checks++}catch(error){console.error(name);throw error}}
globalThis.fetch=(url,options)=>{
  assert.equal(new URL(url).origin,'https://control-plane.example.invalid','No real network destination permitted')
  calls.push({url,options});return answer(url,options)
}
const reply=(status,body)=>new Response(JSON.stringify(body),{status,headers:{'X-Correlation-ID':'synthetic-correlation'}})
const modulePath='src/features/menu-visibility/'
for(const flag of [undefined,'false','TRUE','True','1',true,' true ']) await check('OFF flag stops direct invocation before token access: '+flag,async()=>{
  const e=await environment(flag)
  e.storage.set('VITE_MENU_VISIBILITY_WRITES_ENABLED','true')
  window.location.hash='#/settings/menu-visibility?VITE_MENU_VISIBILITY_WRITES_ENABLED=true'
  const client=await e.load('src/lib/menuVisibilityWriteClient.ts'),before=e.reads();calls=[]
  await assert.rejects(client.authenticatedMenuVisibilityWrite(null,null,'anything'),err=>err.code==='MENU_VISIBILITY_WRITES_DISABLED')
  assert.equal(e.reads(),before);assert.equal(calls.length,0)
})
const e=await environment('true')
const client=await e.load('src/lib/menuVisibilityWriteClient.ts')
const contract=await e.load(modulePath+'menuVisibilityContract.ts')
const update=await e.load(modulePath+'menuVisibilityUpdate.ts')
const {MENU_VISIBILITY_IDS:ids}=await e.load(modulePath+'menuRegistry.ts')
const {createVisibilitySaveCoordinator:create}=await e.load(modulePath+'visibilitySaveCoordinator.ts')
const {fetchMenuVisibility:read}=await e.load(modulePath+'menuVisibilityApi.ts')
const {ApiError}=await e.load('src/lib/api.ts')
const map=Object.fromEntries(ids.map(id=>[id,true]))
const wire=(version=0,visibility=map)=>({data:{scope:'global',version,visibility,updatedAt:version?'2026-10-20T12:00:00.000Z':null,updatedBy:version?'synthetic-operator':null,lockedIds:['dashboard','configuracoes']}})
const config=(version=0,visibility=map)=>Object.freeze({...contract.parseMenuVisibilityResponse(wire(version,visibility)),readAt:'2026-10-20T12:00:01.000Z'})
const base=config(),draft={...map,financeiro:false},candidate=update.buildUpdateCandidate(base,draft,'edit')
const fresh=()=>{e.session();calls=[]}
const put=()=>client.authenticatedMenuVisibilityWrite(base,draft,client.menuVisibilitySessionKey())
const coordinator=()=>{
  const key=client.menuVisibilitySessionKey()
  return create({operatorId:'synthetic-operator',write:(r,d)=>client.authenticatedMenuVisibilityWrite(r,d,key),read,isCurrent:()=>client.menuVisibilitySessionKey()===key})
}
await check('GET zero and saved versions retained; all 23 booleans exact',()=>{
  assert.equal(base.version,0);assert.equal(config(17).version,17);assert.equal(Object.keys(base.map).length,23)
})
for(const version of [undefined,null,-1,1.5,'1',true,NaN,Infinity,Number.MAX_SAFE_INTEGER+1]) await check('invalid/missing version refused: '+version,()=>assert.throws(()=>contract.parseMenuVisibilityResponse({data:{...wire().data,version}}),err=>err.code==='MENU_VISIBILITY_MALFORMED'))
await check('valid PUT exact full map plus original version; canonical Bearer/correlation headers',async()=>{
  fresh();answer=()=>reply(200,wire(1,draft));await put()
  assert.equal(calls.length,1);assert.equal(calls[0].options.method,'PUT');assert.equal(new URL(calls[0].url).pathname,'/api/homolog/menu-visibility')
  assert.deepEqual(JSON.parse(calls[0].options.body),{visibility:draft,version:0})
  assert.equal(calls[0].options.headers.Authorization,'Bearer synthetic-only');assert.ok(calls[0].options.headers['X-Correlation-ID'])
})
for(const roles of [[],['READ_ONLY'],['SUPPORT_ADMIN'],['FINANCIAL_ADMIN'],['COMPLIANCE_ADMIN'],['unknown']]) await check('role denied before network: '+roles,async()=>{
  e.session(roles);calls=[];await assert.rejects(put(),err=>err.status===403);assert.equal(calls.length,0)
})
await check('no session rejects without network',async()=>{fresh();e.auth.clearSession();await assert.rejects(put(),err=>err.status===401);assert.equal(calls.length,0)})
const invalids=[{...map,dashboard:false},{...map,configuracoes:false},{...draft,ajuda:1},{...draft,extra:true},{...draft,'operation-companies':true},Object.create(draft),null,[]]
for(const id of ids){const partial={...draft};delete partial[id];invalids.push(partial)}
for(const [index,value] of invalids.entries()) await check('malformed/protected map blocks direct transport '+index,async()=>{
  fresh();await assert.rejects(client.authenticatedMenuVisibilityWrite(base,value,client.menuVisibilitySessionKey()));assert.equal(calls.length,0)
})
await check('no change and drift prevent network; version cannot be invented',async()=>{
  fresh()
  for(const [r,d] of [[base,map],[{...base,unknownIds:['future']},draft],[{...base,version:undefined},draft],[{...base,version:-1},draft]]) await assert.rejects(client.authenticatedMenuVisibilityWrite(r,d,client.menuVisibilitySessionKey()))
  assert.equal(calls.length,0)
})
await check('actual coordinator one pending PUT, then one GET and applied only after both',async()=>{
  fresh();let release;answer=(_url,o)=>o.method==='PUT'?new Promise(r=>release=()=>r(reply(200,wire(1,draft)))):Promise.resolve(reply(200,wire(1,draft)))
  const c=coordinator(),first=c.submit(base,draft)
  assert.equal(c.getSnapshot().phase,'saving');assert.equal(await c.submit(base,draft),false);assert.equal(calls.length,1)
  release();await first
  assert.deepEqual(calls.map(c=>c.options.method),['PUT','GET']);assert.equal(c.getSnapshot().decision,'applied')
  assert.equal(await c.submit(base,draft),false)
})
for(const [name,status,response,current,decision] of [
  ['409 before write, same reference',409,{code:'E_MENU_VERSION_CONFLICT',currentVersion:0},wire(),'conflicted'],
  ['409 AFTER persistence, identical candidate',409,{code:'E_MENU_VERSION_CONFLICT',currentVersion:1},wire(1,draft),'conflicted'],
  ['concurrent third map/version',409,{code:'E_MENU_VERSION_CONFLICT',currentVersion:2},wire(2,{...map,contas:false}),'conflicted'],
  ['uncertain 503 persisted candidate',503,{code:'INTERNAL_ERROR'},wire(1,draft),'not-confirmed'],
  ['uncertain 503 same reference',503,{},wire(),'not-confirmed'],
  ['uncertain newer identical map',503,{},wire(2,draft),'diverged'],
  ['malformed 200',200,{ok:true},wire(1,draft),'not-confirmed'],
  ['wrong success HTTP',201,wire(1,draft),wire(1,draft),'not-confirmed'],
  ['wrong acknowledgement version',200,wire(2,draft),wire(2,draft),'diverged'],
  ['protected E_MENU_LOCKED',400,{code:'E_MENU_LOCKED'},wire(),'not-confirmed'],
  ['403 retains valid session',403,{code:'FORBIDDEN'},wire(),'not-confirmed'],
  ['200 then readback diverged',200,wire(1,draft),wire(2,{...map,ajuda:false}),'diverged'],
]) await check(name+' always GET, preserves reference/draft, never retries PUT',async()=>{
  fresh();answer=(_url,o)=>Promise.resolve(reply(o.method==='PUT'?status:200,o.method==='PUT'?response:current))
  const c=coordinator();await c.submit(base,draft);const state=c.getSnapshot()
  assert.equal(state.decision,decision);assert.equal(state.reference.version,0);assert.deepEqual(state.candidate.body,{visibility:draft,version:0})
  assert.deepEqual(calls.map(c=>c.options.method),['PUT','GET']);assert.equal(await c.submit(base,draft),false)
  assert.ok(e.auth.getAccessToken());assert.equal(c.acknowledge(),true);assert.equal(calls.length,2)
})
for(const kind of ['timeout','network']) await check(kind+' is uncertain, GET only retry, no false attribution',async()=>{
  fresh();answer=(_url,o)=>o.method==='PUT'?kind==='timeout'?new Promise((_,reject)=>o.signal.addEventListener('abort',()=>reject(new Error('timeout')))):Promise.reject(new Error('network')):Promise.resolve(reply(200,wire(1,draft)))
  const c=coordinator();await c.submit(base,draft);assert.equal(c.getSnapshot().decision,'not-confirmed')
  await c.retryReadback();assert.deepEqual(calls.map(c=>c.options.method),['PUT','GET','GET'])
})
await check('failed readback blocks resubmit/reset; explicit GET recovery only',async()=>{
  fresh();answer=(_url,o)=>Promise.resolve(reply(o.method==='PUT'?200:503,o.method==='PUT'?wire(1,draft):{}))
  const c=coordinator();await c.submit(base,draft)
  assert.equal(c.getSnapshot().decision,'not-confirmed');assert.equal(c.acknowledge(),false);assert.equal(await c.submit(base,draft),false)
  answer=()=>Promise.resolve(reply(200,wire(1,draft)));await c.retryReadback()
  assert.equal(c.getSnapshot().decision,'applied');assert.equal(calls.filter(c=>c.options.method==='PUT').length,1)
})
await check('failed refresh cannot reuse an older readback as the current global state',async()=>{
  fresh();answer=()=>Promise.resolve(reply(200,wire(1,draft)))
  const c=coordinator();await c.submit(base,draft)
  assert.equal(c.getSnapshot().decision,'applied')
  answer=()=>Promise.resolve(reply(503,{code:'SYNTHETIC_GET_FAILURE'}))
  await c.retryReadback()
  assert.equal(c.getSnapshot().decision,'not-confirmed')
  assert.equal(c.getSnapshot().readback,undefined)
  assert.equal(c.acknowledge(),false)
  assert.equal(await c.submit(base,draft),false)
  assert.equal(calls.filter(c=>c.options.method==='PUT').length,1)
})
await check('sequential change and restore use the latest GET version and restore all 23 preferences',async()=>{
  fresh();let current=wire()
  answer=(_url,o)=>{
    if(o.method==='PUT') {
      const body=JSON.parse(o.body)
      assert.equal(body.version,current.data.version)
      current=wire(current.data.version+1,body.visibility)
    }
    return Promise.resolve(reply(200,current))
  }
  const c=coordinator();await c.submit(base,draft)
  const saved=c.getSnapshot().readback
  assert.equal(c.getSnapshot().decision,'applied');assert.equal(saved.version,1)
  assert.equal(c.acknowledge(),true)
  await c.submit(saved,map)
  assert.equal(c.getSnapshot().decision,'applied')
  assert.equal(c.getSnapshot().readback.version,2)
  assert.deepEqual(c.getSnapshot().readback.map,map)
  assert.deepEqual(calls.filter(c=>c.options.method==='PUT').map(c=>JSON.parse(c.options.body).version),[0,1])
})
await check('401 ends only current session, no stale readback',async()=>{
  fresh();answer=()=>Promise.resolve(reply(401,{code:'UNAUTHORIZED'}));const c=coordinator();await c.submit(base,draft)
  assert.equal(e.auth.getAccessToken(),null);assert.equal(calls.length,1)
})
for(const status of [200,401,403]) await check('operator/session changes ignore stale '+status+' response and prevent new dispatch',async()=>{
  fresh();let release;answer=()=>new Promise(r=>release=()=>r(reply(status,wire(1,draft))))
  const key=client.menuVisibilitySessionKey(),c=coordinator(),pending=c.submit(base,draft)
  e.session(['SUPER_ADMIN'],'other-operator');release();await pending
  assert.equal(calls.length,1);assert.equal(c.getSnapshot().decision,undefined);assert.ok(e.auth.getAccessToken())
  await assert.rejects(client.authenticatedMenuVisibilityWrite(base,draft,key),err=>err.status===401);assert.equal(calls.length,1)
})
await check('same-session role hydration changes identity even without session version change',()=>{
  fresh();const key=client.menuVisibilitySessionKey();e.storage.set('loor_sa_operator',JSON.stringify({id:'synthetic-operator',name:'Mock',email:'qa@example.invalid',roles:['READ_ONLY']}))
  assert.notEqual(client.menuVisibilitySessionKey(),key)
})
await check('invalidated coordinator ignores late response; navigation keeps one attempt ledger',async()=>{
  fresh();let release;answer=()=>new Promise(r=>release=()=>r(reply(200,wire(1,draft))))
  const c=coordinator(),pending=c.submit(base,draft);const remounted=c
  assert.equal(await remounted.submit(base,draft),false);c.invalidate();release();await pending
  assert.equal(c.getSnapshot().phase,'idle');assert.equal(calls.length,1)
})
await check('readback does not confirm matching maps without valid acknowledgement/version',()=>{
  const uncertain={state:'uncertain',view:contract.describeVisibilityError(new ApiError(503,{}),'save')}
  assert.equal(update.reconcileReadback(candidate,base,config(1,draft),uncertain),'not-confirmed')
  assert.equal(update.reconcileReadback(candidate,base,config(0,map),uncertain),'not-confirmed')
  assert.equal(update.reconcileReadback(candidate,base,config(2,draft),uncertain),'diverged')
})
await check('acknowledgement by a different operator never confirms our attempt',()=>{
  const other=wire(1,draft);other.data.updatedBy='synthetic-other'
  const result=update.interpretSaveOutcome(candidate,{ok:true,body:other},'synthetic-operator')
  assert.equal(result.state,'uncertain')
  assert.equal(update.reconcileReadback(candidate,base,contract.parseMenuVisibilityResponse(other),result),'not-confirmed')
})
await check('shared shell, auth, GET transport and unrelated domains preserved; explicit later Lifecycle unit only',()=>{
  const changed=execFileSync('git',['diff','--name-only','c5ecb5a','--','src'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(Boolean)
  const lifecycleFiles = ['WhitelabelDetailPanel.tsx','WhitelabelsPage.tsx','crud/OperationalMutationState.tsx','crud/WhitelabelActionsMenu.tsx','crud/WhitelabelCrud.module.css','crud/WhitelabelLifecycleDialog.tsx','crud/useWhitelabelMutation.ts','crud/whitelabelCommands.ts','crud/whitelabelForm.ts','crud/whitelabelMutationContract.ts','crud/whitelabelMutationOutcome.ts','crud/whitelabelMutationRunner.ts','crud/whitelabelOperationalApi.ts'].map(p=>'src/features/whitelabels/'+p)
  assert.ok(changed.every(p=>p.startsWith('src/features/menu-visibility/') || [...lifecycleFiles,'src/lib/whitelabelWriteClient.ts','src/lib/menuVisibilityWriteClient.ts','src/components/shell/Sidebar.tsx','src/components/shell/Sidebar.module.css'].includes(p)))
})
await check('literal default OFF and narrow transport; no runtime activation/enforcement',async()=>{
  const source=await readFile(resolve(root,'src/lib/menuVisibilityWriteClient.ts'),'utf8')
  assert.ok(source.indexOf('if (!MENU_VISIBILITY_WRITES_ENABLED)')<source.indexOf('const token = getAccessToken()'))
  assert.equal(/fetch\(|localStorage|sessionStorage|location\.|method: '(POST|PATCH|DELETE)'/.test(source),false)
  assert.match(await readFile(resolve(root,'.env.example'),'utf8'),/VITE_MENU_VISIBILITY_WRITES_ENABLED=false/)
  for(const file of ['src/components/shell/Sidebar.tsx','src/components/shell/AppShell.tsx','src/app/App.tsx','src/components/shell/navigation.ts']) assert.equal(/visibilityResolver|menuVisibilityWriteClient/.test(await readFile(resolve(root,file),'utf8')),false)
})
console.log(`Menu Visibility Operational V1: ${checks} focused checks passed (all requests intercepted; zero live writes)`)
