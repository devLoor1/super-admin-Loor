import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'
import { RECORD_A, wire } from './fixtures/whitelabel-mutation-mocks.mjs'

// Every fetch is intercepted. No real credential, service, browser profile or business record.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(resolve(root, 'package.json'))
const data = text => 'data:text/javascript;base64,' + Buffer.from(text).toString('base64')
const hooks = data(`
  export const useState = x => globalThis.__wlOperationalHooks.useState(x);
  export const useRef = x => globalThis.__wlOperationalHooks.useRef(x);
  export const useEffect = (f,d) => globalThis.__wlOperationalHooks.useEffect(f,d);
  export const useSyncExternalStore = (_,get) => get();
  export const useLayoutEffect = () => {};
  export const useId = () => 'mock-id';
  export const useMemo = f => f();
  export const useCallback = f => f;
`)
async function environment(flag) {
  const cache = new Map()
  const env = { VITE_API_BASE_URL: 'https://control-plane.example.invalid/api', VITE_WHITELABEL_WRITES_ENABLED: flag }
  async function url(path) {
    if (cache.has(path)) return cache.get(path)
    if (path.endsWith('.css')) return data('export default new Proxy({}, {get:(_,k)=>k});')
    let code = ts.transpileModule(await readFile(path, 'utf8'), { compilerOptions: {
      target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX,
    } }).outputText.replaceAll('import.meta.env', '(' + JSON.stringify(env) + ')')
    for (const m of [...code.matchAll(/from\s+(['"])([^'"]+)\1/g)]) {
      const spec = m[2]
      let target
      if (spec === 'react') target = hooks
      else if (spec.startsWith('.')) {
        const base = resolve(dirname(path), spec)
        target = await url(base.endsWith('.css') ? base : base + (await readFile(base + '.ts').then(() => true, () => false) ? '.ts' : '.tsx'))
      } else target = pathToFileURL(require.resolve(spec)).href
      code = code.replace(m[0], 'from ' + JSON.stringify(target))
    }
    const result = data(code)
    cache.set(path, result)
    return result
  }
  const load = async path => import(await url(resolve(root, path)))
  const storage = new Map()
  globalThis.sessionStorage = { getItem: k => storage.get(k) ?? null, setItem: (k,v) => storage.set(k,v), removeItem: k => storage.delete(k) }
  globalThis.window = { setTimeout: (fn,ms) => setTimeout(fn, ms === 20000 ? 15 : ms), clearTimeout,
    addEventListener() {}, removeEventListener() {}, requestAnimationFrame: fn => fn() }
  globalThis.document = { getElementById: () => ({ focus() {} }) }
  const auth = await load('src/lib/authSession.ts')
  const session = roles => auth.persistSession({ accessToken: 'synthetic-only', tokenType: 'Bearer', operator: {id:'mock-operator',name:'Mock',email:'mock@example.invalid',roles} })
  session(['SUPER_ADMIN'])
  return { load, auth, session }
}
let count = 0
async function check(name, fn) {
  try { await fn(); count++ } catch (error) {
    if (error.stack) error.stack = error.stack.replace(/data:text\/javascript;base64,[A-Za-z0-9+/=]+/g, '<in-memory-module>')
    throw new Error(name, { cause: error })
  }
}
let calls = [], answer
globalThis.fetch = async (address, options) => {
  const u = new URL(address)
  assert.equal(u.origin, 'https://control-plane.example.invalid', 'unexpected destination blocked')
  calls.push({ path:u.pathname, query:u.searchParams, options })
  return answer(u, options)
}
const reply = (status, body) => new Response(JSON.stringify(body), {status,headers:{'X-Correlation-ID':'synthetic-correlation'}})
const CREATED = { ...RECORD_A, id:'42', name:'Operational Mock', slug:'operational-mock', baseUrl:'http://localhost:3000', domain:'localhost' }
const DRAFT = {name:CREATED.name,slug:CREATED.slug,baseUrl:CREATED.baseUrl}
for (const flag of [undefined, 'false', 'TRUE', '1']) await check('inactive/missing flag prevents direct network writes: ' + flag, async () => {
  const e = await environment(flag)
  const { authenticatedWhitelabelWrite } = await e.load('src/lib/whitelabelWriteClient.ts')
  const { buildCreateCommand, buildNameUpdateCommand } = await e.load('src/features/whitelabels/crud/whitelabelCommands.ts')
  calls=[]
  for (const command of [buildCreateCommand(DRAFT).command, buildNameUpdateCommand({selectedId:RECORD_A.id,record:RECORD_A,draft:{name:'Renamed Mock'}}).command]) {
    await assert.rejects(authenticatedWhitelabelWrite(command,e.auth.getSessionVersion()), err => err.code === 'WHITELABEL_WRITES_DISABLED')
  }
  assert.equal(calls.length,0)
})
const e = await environment('true')
const commands = await e.load('src/features/whitelabels/crud/whitelabelCommands.ts')
const outcomes = await e.load('src/features/whitelabels/crud/whitelabelMutationOutcome.ts')
const { authenticatedWhitelabelWrite: write } = await e.load('src/lib/whitelabelWriteClient.ts')
const { getWhitelabelOperationalRunner: runner, findWhitelabelBySlug } = await e.load('src/features/whitelabels/crud/whitelabelOperationalApi.ts')
const create = commands.buildCreateCommand(DRAFT).command
const edit = commands.buildNameUpdateCommand({ selectedId:RECORD_A.id,record:RECORD_A,draft:{name:'Renamed Mock'} }).command
const RENAMED = {...RECORD_A,name:'Renamed Mock'}
const fresh = () => { e.session(['SUPER_ADMIN']); calls=[] }
const writes = () => calls.filter(c => ['POST','PATCH'].includes(c.options.method))
const page = (rows, number=1, total=rows.length, lastPage=1) => ({data:rows.map(wire),meta:{page:number,perPage:10,total,lastPage}})
await check('valid Create is one authenticated POST with exactly three fields and active 201 identity', async () => {
  fresh(); answer=()=>reply(201,{data:wire(CREATED)})
  const response=await write({...create,route:'POST /api/unrelated',body:{...create.body,isActive:false,extra:1}},e.auth.getSessionVersion())
  assert.equal(calls[0].path,'/api/whitelabels')
  assert.deepEqual(JSON.parse(calls[0].options.body),DRAFT)
  assert.equal(calls[0].options.headers.Authorization,'Bearer synthetic-only')
  assert.equal(calls[0].options.headers['Idempotency-Key'],undefined)
  assert.equal(outcomes.interpretMutationResult(create,{ok:true,body:response}).state,'confirmed')
  assert.equal(writes().length,1)
})
await check('PATCH body is name only; target comes from selected command, not route/draft fields', async () => {
  fresh(); answer=()=>reply(200,{data:wire(RENAMED)})
  await write({...edit,route:'PATCH /api/whitelabels/999',body:{...edit.body,slug:'other',baseUrl:'https://other.invalid',id:999}},e.auth.getSessionVersion())
  assert.equal(calls[0].path,'/api/whitelabels/'+RECORD_A.id)
  assert.deepEqual(JSON.parse(calls[0].options.body),{name:'Renamed Mock'})
})
for (const roles of [['SUPPORT_ADMIN'],['READ_ONLY'],[],['ADMIN']]) await check('denied roles cannot invoke mutation transport: '+roles,async()=>{
  e.session(roles);calls=[]
  await assert.rejects(write(create,e.auth.getSessionVersion()),err=>err.status===403)
  assert.equal(calls.length,0)
})
await check('session replacement between pre-read and write prevents any PATCH',async()=>{
  fresh(); const r=runner()
  answer=()=>{e.session(['SUPER_ADMIN']);return reply(200,wire(RECORD_A))}
  await r.submit(edit).done
  assert.equal(writes().length,0)
})
for (const [status,code,expected] of [[400,'E_VALIDATION','validation'],[409,'E_SLUG_TAKEN','slug-taken'],[403,'FORBIDDEN','forbidden'],[401,'UNAUTHORIZED','session']]) {
  await check('real transport handles '+status,async()=>{
    fresh();answer=()=>reply(status,{code,message:['name invalid']})
    const state=await runner().submit(create).done
    assert.equal(state.outcome.reason,expected)
    assert.equal(writes().length,1)
    if(status===401) assert.equal(e.auth.getAccessToken(),null)
  })
}
for (const spec of ['timeout','network',500,502,503,'wrong-status','inactive','malformed','wrong-identity']) await check('uncertain Create never retries automatically: '+spec,async()=>{
  fresh()
  answer=(_,options)=> {
    if(spec==='timeout') return new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('mock','AbortError'))))
    if(spec==='network') throw new TypeError('synthetic offline')
    if(typeof spec==='number') return reply(spec,{code:'UNAVAILABLE'})
    if(spec==='wrong-status') return reply(200,{data:wire(CREATED)})
    if(spec==='inactive') return reply(201,{data:{...wire(CREATED),isActive:false,status:'inactive'}})
    if(spec==='wrong-identity') return reply(201,{data:wire({...CREATED,slug:'someone-else'})})
    return new Response('<invalid>',{status:201})
  }
  const r=runner(),state=await r.submit(create).done
  assert.equal(state.outcome.state,'uncertain')
  assert.equal(r.submit(create).reason,'verify-first')
  assert.equal(r.reset('create'),false)
  assert.equal(writes().length,1)
})
await check('GET reconciliation compares exact slug and all identity values without attributing the POST',async()=>{
  fresh();answer=()=>reply(503,{})
  const r=runner();await r.submit(create).done
  answer=(url,options)=>{assert.equal(options.method,'GET');assert.equal(url.searchParams.get('search'),DRAFT.slug);return reply(200,page([CREATED]))}
  const state=await r.verify('create')
  assert.equal(state.readback,'found');assert.equal(state.record.id,'42')
  assert.equal(r.submit(create).reason,'review-required')
  assert.equal(outcomes.describeReadback('create','found').tone,'warning')
  assert.equal(writes().length,1)
  for(const record of [{...CREATED,name:'Someone else'},{...CREATED,baseUrl:'https://else.invalid'}]) {
    assert.equal(outcomes.reconcileCreateReadback(create,{rows:[record],complete:true}).result,'diverged')
  }
  assert.equal(outcomes.reconcileCreateReadback(create,{rows:[{...CREATED,slug:CREATED.slug+'-suffix'}],complete:true}).result,'not-applied')
})
await check('GET search paginates; changing totals or missing pages never prove absence',async()=>{
  fresh();let n=0
  answer=()=>reply(200,page(n++===0?[{...CREATED,id:'41',slug:'other'}]:[CREATED],n,2,2))
  const search=await findWhitelabelBySlug(DRAFT.slug)
  assert.equal(search.complete,true);assert.equal(calls.length,2)
  calls=[];answer=()=>reply(200,page([],1,1,2))
  await assert.rejects(findWhitelabelBySlug(DRAFT.slug))
})
for(const [latest,expected] of [[RENAMED,'applied'],[RECORD_A,'not-applied'],[{...RECORD_A,name:'Concurrent name'},'diverged']]) await check('uncertain PATCH reconciles GET '+expected,async()=>{
  fresh();answer=(_,opts)=>opts.method==='GET'?reply(200,wire(RECORD_A)):reply(502,{})
  const r=runner();assert.equal((await r.submit(edit).done).outcome.state,'uncertain')
  assert.equal(r.submit(edit).reason,'verify-first')
  answer=()=>reply(200,wire(latest));assert.equal((await r.verify('whitelabel:'+RECORD_A.id)).readback,expected)
  assert.equal(writes().length,1)
})
for(const [status,body,expected] of [[200,wire({...RECORD_A,name:'Stale'}),'stale'],[404,{code:'E_WHITELABEL_NOT_FOUND'},'rejected']]) await check('freshness pre-read prevents stale/missing PATCH '+status,async()=>{
  fresh();answer=()=>reply(status,body)
  assert.equal((await runner().submit(edit).done).outcome.state,expected)
  assert.equal(writes().length,0)
})
await check('double submit while fetch is pending produces one request',async()=>{
  fresh();let release;answer=()=>new Promise(resolve=>{release=resolve})
  const r=runner(),first=r.submit(create)
  assert.equal(r.submit(create).reason,'in-flight')
  assert.equal(writes().length,1)
  release(reply(201,{data:wire(CREATED)}));await first.done
  assert.equal(r.submit(create).reason,'review-required')
})

// Real dialog handlers and production hook/coordinator; only React's renderer is simulated.
function harness(Component,props) {
  let slots=[],position=0,effects=[]
  const context={useState(initial){let i=position++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],v=>{slots[i]=typeof v==='function'?v(slots[i]):v}]},
    useRef(value){let i=position++;return slots[i]??(slots[i]={current:value})},
    useEffect(fn,deps){let i=position++;if(!slots[i]||!deps||deps.some((d,j)=>!Object.is(d,slots[i][j]))){slots[i]=deps;effects.push(fn)}}}
  return {render(){position=0;effects=[];globalThis.__wlOperationalHooks=context;let tree=Component(props);for(const f of effects)f();return tree}}
}
const find=(node,predicate)=> {if(!node||typeof node!=='object')return null;if(Array.isArray(node)){for(const x of node){let r=find(x,predicate);if(r)return r}return null}return predicate(node)?node:find(node.props?.children,predicate)||find(node.props?.footer,predicate)}
const byId=(h,id)=>find(h.render(),x=>x.props?.id===id)
const text=node=>typeof node==='string'?node:Array.isArray(node)?node.map(text).join(''):node?.props?text(node.props.children):''
const button=(h,label)=>find(h.render(),x=>x.props?.onClick&&text(x.props.children)===label)
const set=(h,id,value)=>byId(h,id).props.onChange({target:{value}})
const review=(h,id)=>byId(h,id).props.onSubmit({preventDefault(){}})
const {WhitelabelCreateDialog}=await e.load('src/features/whitelabels/crud/WhitelabelCreateDialog.tsx')
const {WhitelabelNameEditDialog}=await e.load('src/features/whitelabels/crud/WhitelabelNameEditDialog.tsx')
await check('Create UI requires fields, reviews, blocks double click, then refreshes only confirmed success',async()=>{
  fresh();let refreshed=0;answer=()=>reply(201,{data:wire(CREATED)})
  const h=harness(WhitelabelCreateDialog,{onClose(){},onConfirmed(record){assert.equal(record.id,'42');refreshed++}})
  review(h,'wl-create');assert.equal(byId(h,'wl-create-name').props['aria-invalid'],true);assert.equal(writes().length,0)
  for(const key of ['name','slug','baseUrl'])set(h,'wl-create-'+key,DRAFT[key])
  review(h,'wl-create');assert.equal(writes().length,0)
  const send=button(h,'Confirmar criação');assert.ok(send);send.props.onClick();send.props.onClick()
  await new Promise(resolve=>setImmediate(resolve));h.render();h.render()
  assert.equal(writes().length,1);assert.equal(refreshed,1)
})
await check('Edit UI sends name only after review and refreshes authoritative data',async()=>{
  fresh();let refreshed=0;answer=(_,opts)=>opts.method==='GET'?reply(200,wire(RECORD_A)):reply(200,{data:wire(RENAMED)})
  const h=harness(WhitelabelNameEditDialog,{record:RECORD_A,latest:RECORD_A,selectedId:RECORD_A.id,onClose(){},onConfirmed(){refreshed++}})
  assert.equal(byId(h,'wl-edit-slug'),null);assert.equal(byId(h,'wl-edit-baseUrl'),null)
  set(h,'wl-edit-name','Renamed Mock');review(h,'wl-edit');assert.equal(writes().length,0)
  button(h,'Confirmar novo nome').props.onClick();await new Promise(resolve=>setImmediate(resolve));h.render()
  assert.equal(writes().length,1);assert.equal(refreshed,1)
  assert.deepEqual(JSON.parse(writes()[0].options.body),{name:'Renamed Mock'})
})
await check('uncertain Create UI retains attempt after close/reopen; GET found never fabricates success',async()=>{
  fresh();let refreshed=0,inspected=null,closed=0;answer=()=>reply(503,{})
  const props={onClose(){closed++},onConfirmed(){refreshed++},onInspectRecord(record){inspected=record.id}},h=harness(WhitelabelCreateDialog,props)
  for(const key of ['name','slug','baseUrl'])set(h,'wl-create-'+key,DRAFT[key])
  review(h,'wl-create');button(h,'Confirmar criação').props.onClick()
  await new Promise(resolve=>setImmediate(resolve))
  let state=find(h.render(),x=>x.type?.name==='OperationalMutationState')
  assert.equal(state.props.mutation.state.outcome.state,'uncertain')
  answer=()=>reply(200,page([CREATED]));await state.props.mutation.verify()
  const reopened=harness(WhitelabelCreateDialog,props)
  state=find(reopened.render(),x=>x.type?.name==='OperationalMutationState')
  assert.equal(state.props.mutation.state.readback,'found')
  assert.equal(button(reopened,'Confirmar criação'),null)
  assert.equal(refreshed,0);assert.equal(writes().length,1)
  state.props.onInspectRecord(state.props.mutation.state.record)
  assert.equal(inspected,'42');assert.equal(closed,1);assert.equal(runner().view('create').phase,'idle')
})
await check('uncertain Edit UI reconciles by authoritative GET and refreshes without resending PATCH',async()=>{
  fresh();let refreshed=0;answer=(_,opts)=>opts.method==='GET'?reply(200,wire(RECORD_A)):reply(503,{})
  const h=harness(WhitelabelNameEditDialog,{record:RECORD_A,latest:RECORD_A,selectedId:RECORD_A.id,onClose(){},onConfirmed(){refreshed++}})
  set(h,'wl-edit-name','Renamed Mock');review(h,'wl-edit');button(h,'Confirmar novo nome').props.onClick()
  await new Promise(resolve=>setImmediate(resolve))
  const state=find(h.render(),x=>x.type?.name==='OperationalMutationState')
  answer=()=>reply(200,wire(RENAMED));await state.props.mutation.verify();h.render()
  assert.equal(refreshed,1);assert.equal(writes().length,1)
  button(h,'Fechar').props.onClick()
  assert.equal(runner().view('whitelabel:'+RECORD_A.id).phase,'idle','a resolved read-back does not permanently block future manual edits')
})
await check('confirmed response must preserve immutable identity fields',async()=>{
  for(const key of ['id','slug','baseUrl']) {
    const wrong={...RENAMED,[key]:key==='id'?'999':'changed'}
    assert.equal(outcomes.interpretMutationResult(edit,{ok:true,body:{data:wire(wrong)}}).state,'uncertain')
  }
})
console.log('Whitelabel Operational V1: '+count+' passed (fetch intercepted, synthetic session/records, no live network)')
