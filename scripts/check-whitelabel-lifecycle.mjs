import assert from 'node:assert/strict'
import { readFile } from './reviewed-consolidation-boundary.mjs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'
import { RECORD_A, wire } from './fixtures/whitelabel-mutation-mocks.mjs'

// Synthetic transport interception only. No upstream, real token or live mutations.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(resolve(root, 'package.json'))
const data = code => 'data:text/javascript;base64,' + Buffer.from(code).toString('base64')
async function environment(flag, writeFlag='false') {
  const cache = new Map()
  const env = {VITE_API_BASE_URL:'https://lifecycle.example.invalid/api',VITE_WHITELABEL_LIFECYCLE_ENABLED:flag,VITE_WHITELABEL_WRITES_ENABLED:writeFlag}
  async function url(path) {
    if(cache.has(path))return cache.get(path)
    let code=ts.transpileModule(await readFile(path,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replaceAll('import.meta.env','('+JSON.stringify(env)+')')
    for(const m of [...code.matchAll(/from\s+(['"])([^'"]+)\1/g)]) {
      const spec=m[2], target=spec.startsWith('.')?await url(resolve(dirname(path),spec+'.ts')):pathToFileURL(require.resolve(spec)).href
      code=code.replace(m[0],'from '+JSON.stringify(target))
    }
    const result=data(code);cache.set(path,result);return result
  }
  const load=async path=>import(await url(resolve(root,path)))
  const storage=new Map()
  globalThis.sessionStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}
  globalThis.window={setTimeout:(f,ms)=>setTimeout(f,ms===20000?10:ms),clearTimeout}
  const auth=await load('src/lib/authSession.ts')
  const session=(roles=['SUPER_ADMIN'])=>auth.persistSession({accessToken:'synthetic-only',tokenType:'Bearer',operator:{id:'synthetic',name:'QA',email:'qa@example.invalid',roles}})
  session()
  return {load,auth,session}
}
let checks=0,calls=[],answer
async function check(name, fn){try{await fn();checks++}catch(cause){throw new Error(name,{cause})}}
globalThis.fetch=async(url,options)=>{
  assert.equal(new URL(url).origin,'https://lifecycle.example.invalid')
  calls.push({url:new URL(url),options});return answer(options)
}
const reply=(status,body)=>new Response(JSON.stringify(body),{status})
const active={...RECORD_A,status:'active'},inactive={...active,status:'inactive'}
const e=await environment('true')
const commands=await e.load('src/features/whitelabels/crud/whitelabelCommands.ts')
const outcomes=await e.load('src/features/whitelabels/crud/whitelabelMutationOutcome.ts')
const {ApiError}=await e.load('src/lib/api.ts')
const {authenticatedWhitelabelWrite:write}=await e.load('src/lib/whitelabelWriteClient.ts')
const {createWhitelabelMutationRunner:make}=await e.load('src/features/whitelabels/crud/whitelabelMutationRunner.ts')
const build=(operation,record=operation==='activate'?inactive:active)=>commands.buildLifecycleCommand({selectedId:record.id,record,operation})
for(const operation of ['activate','deactivate','logical-delete']){
  const command=build(operation).command,result={...active,status:command.expectedStatus}
  await check(operation+' exact method/route; no body or route/identity smuggling',async()=>{
    e.session();calls=[];answer=()=>reply(200,{data:wire(result)})
    const response=await write({...command,route:'PUT /api/unrelated',body:{slug:'wrong'},expectedStatus:'deleted'},e.auth.getSessionVersion())
    assert.equal(calls.length,1);assert.equal(calls[0].options.method,operation==='logical-delete'?'DELETE':'PATCH')
    assert.equal(calls[0].url.pathname,'/api/whitelabels/'+active.id+(operation==='logical-delete'?'':'/'+operation))
    assert.equal(calls[0].options.body,undefined)
    assert.equal(outcomes.interpretMutationResult(command,{ok:true,body:response}).state,'confirmed')
  })
  await check(operation+' two GETs, shared lock, double click => one mutation, retained identity',async()=>{
    let record=operation==='activate'?inactive:active,reads=0,writes=0,release
    const gate=new Promise(resolve=>release=resolve)
    const runner=make({transport:async()=>{writes++;record=result;await gate;return {ok:true,body:{data:wire(result)}}},readback:{getWhitelabel:async()=>{reads++;return record},findBySlug:async()=>{throw Error('unexpected')}}})
    const attempt=runner.submit(command)
    assert.equal(runner.submit(command).reason,'in-flight')
    await new Promise(resolve=>setImmediate(resolve));assert.equal(writes,1)
    runner.select('whitelabel:999');assert.equal(runner.visible().phase,'idle')
    release();const state=await attempt.done
    assert.equal(state.phase,'verified');assert.equal(state.readback,'applied');assert.equal(state.record.id,active.id)
    assert.equal(state.record.slug,active.slug);assert.equal(state.record.status,command.expectedStatus);assert.equal(reads,2);assert.equal(writes,1)
    assert.equal(runner.submit(command).reason,'review-required')
  })
  for(const changed of ['id','name','slug','baseUrl','updatedAt','status']) await check(operation+' stale '+changed+' prevents dispatch',async()=>{
    let writes=0
    const runner=make({transport:async()=>{writes++;return {ok:true,body:{}}},readback:{getWhitelabel:async()=>({...command.baseline,id:command.targetId,[changed]:changed==='status'?command.expectedStatus:'changed'}),findBySlug:async()=>({rows:[],complete:true})}})
    const state=await runner.submit(command).done
    assert.equal(state.outcome.state,'stale');assert.equal(writes,0)
  })
  for(const kind of ['network','timeout','malformed',500,503,'bad-identity','wrong-active']) await check(operation+' uncertain '+kind+' reads current state, never retries',async()=>{
    let reads=0,writes=0
    const runner=make({transport:async()=>{writes++;return typeof kind==='number'?{ok:false,error:new ApiError(kind,{})}:kind==='bad-identity'?{ok:true,body:{data:wire({...result,slug:'unrelated'})}}:kind==='wrong-active'?{ok:true,body:{data:{...wire(result),isActive:result.status!=='active'}}}:{ok:false,error:new ApiError(0,{}, {kind})}},readback:{getWhitelabel:async()=>++reads===1?{...active,status:command.baseline.status}:result,findBySlug:async()=>{throw Error('unexpected')}}})
    const state=await runner.submit(command).done
    assert.equal(state.outcome.state,'uncertain');assert.equal(state.phase,'verified');assert.equal(state.readback,'applied');assert.equal(writes,1);assert.equal(reads,2)
    assert.match(outcomes.describeReadback(operation,'applied').description,/não a autoria/)
  })
  await check(operation+' failed post-GET blocks writes; manual verification only',async()=>{
    let reads=0,writes=0,fail=true
    const runner=make({transport:async()=>{writes++;return {ok:true,body:{data:wire(result)}}},readback:{getWhitelabel:async()=>{if(++reads===1)return {...active,status:command.baseline.status};if(fail)throw Error('offline');return result},findBySlug:async()=>({rows:[],complete:true})}})
    const state=await runner.submit(command).done
    assert.equal(state.phase,'verify-failed');assert.equal(runner.reset('whitelabel:'+active.id),false)
    assert.equal(runner.submit(command).reason,'verify-first');fail=false
    assert.equal((await runner.verify('whitelabel:'+active.id)).readback,'applied');assert.equal(writes,1)
  })
}
for(const id of ['0','01','-1','1.5','abc','../8','8/activate','', '1234567890123456789']) await check('invalid numeric target '+id,()=>assert.equal(build('activate',{...inactive,id}).ok,false))
await check('selected identity mismatch',()=>assert.equal(commands.buildLifecycleCommand({selectedId:'999',record:inactive,operation:'activate'}).reason,'target-mismatch'))
for(const op of ['activate','deactivate','logical-delete']) await check('wrong current state '+op,()=>assert.equal(build(op,op==='activate'?active:inactive).reason,'state-mismatch'))
await check('unknown operation refused',()=>assert.equal(build('destroy').ok,false))
for(const roles of [['READ_ONLY'],['SUPPORT_ADMIN'],[],['ADMIN']])await check('role denied '+roles,async()=>{
  e.session(roles);calls=[]
  await assert.rejects(write(build('activate').command,e.auth.getSessionVersion()),error=>error.status===403);assert.equal(calls.length,0)
})
await check('missing/changed session denied before fetch',async()=>{
  e.session();const version=e.auth.getSessionVersion();e.auth.clearSession();calls=[]
  await assert.rejects(write(build('activate').command,version),error=>error.status===401);assert.equal(calls.length,0)
})
await check('late response after session replacement is uncertain',async()=>{
  e.session();calls=[];answer=()=>{e.session();return reply(200,{data:wire(active)})}
  await assert.rejects(write(build('activate').command,e.auth.getSessionVersion()),error=>error.kind==='network')
  assert.equal(calls.length,1)
})
await check('disposed runner ignores delayed result and never reads new-session data',async()=>{
  let release,reads=0
  const runner=make({transport:()=>new Promise(resolve=>release=resolve),readback:{getWhitelabel:async()=>{reads++;return inactive},findBySlug:async()=>({rows:[],complete:true})}})
  const attempt=runner.submit(build('activate').command);await new Promise(resolve=>setImmediate(resolve));runner.dispose()
  release({ok:true,body:{data:wire(active)}});await attempt.done
  assert.equal(reads,1);assert.ok(runner.ignoredCount()>0)
})
for(const flag of [undefined,'false','TRUE','1'])await check('lifecycle flag exact true only '+flag,async()=>{
  const x=await environment(flag,'true'),{authenticatedWhitelabelWrite:w}=await x.load('src/lib/whitelabelWriteClient.ts');calls=[]
  await assert.rejects(w(build('activate').command,x.auth.getSessionVersion()),error=>error.code==='WHITELABEL_WRITES_DISABLED');assert.equal(calls.length,0)
})
const dialog=await readFile(resolve(root,'src/features/whitelabels/crud/WhitelabelLifecycleDialog.tsx'),'utf8')
await check('confirmation semantics, fresh GET, typed slug and no hard delete claims',()=>{
  for(const text of ['não é exclusão física','sem exclusão em cascata','reativação continua','Digite o slug','Conferi nome, ID e slug','getWhitelabel(record.id, signal)','slug === record.slug'])assert.ok(dialog.includes(text),text)
})
console.log('Whitelabel Lifecycle V1: '+checks+' passed (synthetic only, no live network)')
