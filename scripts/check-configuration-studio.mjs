import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'
import { moduleLoader, root } from './operators-test-harness.mjs'

const storage=new Map()
globalThis.sessionStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}
globalThis.window={setTimeout,clearTimeout,location:{hash:''}}
globalThis.document={hidden:false}
let dispatch=async()=>{throw Error('Unexpected request')}
globalThis.fetch=(...args)=>dispatch(...args)
const load=moduleLoader({development:false})
const contract=await load('src/features/whitelabel-settings/configurationContract.ts')
const client=await load('src/features/whitelabel-settings/configurationClient.ts')
const read=await load('src/features/whitelabel-settings/settingsReadApi.ts')
const auth=await load('src/lib/authSession.ts')
let checks=0,sequence=76000
async function test(name,fn){try{await fn();checks++}catch(cause){throw Error(name,{cause})}}
const response=(body,status=200)=>new Response(JSON.stringify(body),{status})
function fixture(mode='normal',cell='login.entry_presentation',roles=['SUPER_ADMIN']) {
  const id=String(++sequence)
  auth.persistSession({accessToken:'synthetic-studio-only',tokenType:'Bearer',operator:{id:'qa',name:'Synthetic',email:'qa@example.invalid',roles}})
  const session=auth.getSessionVersion(),initial=structuredClone(contract.CONFIG_DEFINITIONS[cell].initial)
  initial.extension={future:{retain:['safe',null,3]}}
  const [page,key]=cell.split('.'),origin={page,key,stored:true,storedValue:initial,effectiveValue:initial,source:'stored',version:'v1'}
  const raw={data:{whitelabel:{id:Number(id),name:'Synthetic',slug:'qa',baseUrl:'https://qa.example.invalid',isActive:false},settings:{[page]:{[key]:initial}},provenance:[origin],terms:{current:null,history:[]}}}
  const baseline=contract.readConfigOrigins([origin])[cell],seen=[],state={mode}
  dispatch=async(url,options)=>{
    const method=options.method,body=options.body?JSON.parse(options.body):undefined
    seen.push({method,url,body})
    const written=seen.some(r=>r.method!=='GET')
    if(method==='GET'){
      if(state.mode==='readFail'&&written)return response({},502)
      if(state.mode==='wrongTenant'&&written)return response({data:{...raw.data,whitelabel:{...raw.data.whitelabel,id:Number(id)+1}}})
      return response(raw)
    }
    if(state.mode==='reject')return response({code:'PRIVATE_ERROR',message:'SECRET_NOT_FOR_UI'},422)
    if(state.mode==='network')throw new TypeError('Synthetic transport')
    let receipt
    if(method==='PUT'){
      Object.assign(origin,{stored:true,storedValue:body.value,effectiveValue:body.value,source:'stored',version:'v2'})
      raw.data.settings[page][key]=body.value
      receipt={id:900,...body}
    }else{
      Object.assign(origin,{stored:false,storedValue:null,effectiveValue:null,source:'absent',version:null})
      delete raw.data.settings[page][key]
      receipt={page,key,deleted:true,stored:false,effectiveValue:null,source:'absent',version:null}
    }
    if(state.mode==='commit500')return response({},500)
    if(state.mode==='malformed')return response({data:{...receipt,key:'wrong'}})
    if(state.mode==='sessionChange')auth.clearSession()
    return response({data:receipt})
  }
  const value=contract.changeAt(initial,['regions','brand','backgroundColor'],'#112233')
  return{id,session,baseline,value,seen,state,origin,raw,cell,attempt:()=>client.getConfigurationAttempt(id,cell)}
}
await test('public qualified raw extensions retained but separate from render projection',()=>{
  const f=fixture();const parsed=read.parseSettingsRead(f.raw,f.id)
  assert.deepEqual(parsed.configuration[f.cell].storedValue.extension,{future:{retain:['safe',null,3]}})
  assert.deepEqual(contract.changeAt(f.value,['regions','main','textColor'],'#abcdef').extension,f.value.extension)
  assert.equal(f.baseline.storedValue.regions.brand.backgroundColor,'#211b45')
})
for(const source of ['stored','default','absent'])await test(`origin ${source}`,()=>{
  const raw={stored:source==='stored',storedValue:source==='stored'?null:null,effectiveValue:source==='default'?{}:null,source,version:source==='stored'?'v':null}
  assert.equal(contract.configOrigin(raw).source,source)
})
for(const value of [undefined,()=>{},NaN,Infinity,new Date(),JSON.parse('{"__proto__":{}}')])await test('reject non-JSON/unsafe extension',()=>assert.throws(()=>contract.cloneJson(value)))
await test('future version remains read only',()=>{const f=fixture();assert.ok(contract.configValueError(f.cell,{...f.value,version:2}))})
await test('single PUT + authoritative preflight/readback',async()=>{const f=fixture();await client.writeConfiguration(f.id,f.cell,f.baseline,f.value,f.session);assert.equal(f.attempt().phase,'confirmed');assert.deepEqual(f.seen.map(r=>r.method),['GET','PUT','GET']);assert.deepEqual(f.seen[1].body.value.extension,f.value.extension)})
await test('stale data: zero writes',async()=>{const f=fixture();f.origin.version='other';await client.writeConfiguration(f.id,f.cell,f.baseline,f.value,f.session);assert.equal(f.attempt().phase,'stale');assert.deepEqual(f.seen.map(r=>r.method),['GET'])})
await test('READ_ONLY cannot write',async()=>{const f=fixture('normal','login.entry_presentation',['READ_ONLY']);await assert.rejects(client.writeConfiguration(f.id,f.cell,f.baseline,f.value,f.session));assert.equal(f.seen.length,0)})
await test('reset restores absence through DELETE',async()=>{const f=fixture();await client.writeConfiguration(f.id,f.cell,f.baseline,undefined,f.session);assert.equal(f.attempt().phase,'confirmed');assert.deepEqual(f.seen.map(r=>r.method),['GET','DELETE','GET']);assert.equal(f.origin.stored,false)})
for(const mode of ['commit500','malformed','network','readFail','wrongTenant'])await test(`uncertainty ${mode} never resends`,async()=>{
  const f=fixture(mode);await client.writeConfiguration(f.id,f.cell,f.baseline,f.value,f.session)
  assert.ok(['uncertain','readback_matches'].includes(f.attempt().phase))
  await assert.rejects(client.writeConfiguration(f.id,f.cell,f.baseline,f.value,f.session))
  assert.equal(f.seen.filter(r=>r.method==='PUT').length,1)
  f.state.mode='normal';await client.reconcileConfiguration(f.id,f.cell,f.session)
  assert.equal(f.seen.filter(r=>r.method==='PUT').length,1)
  if(['readFail','wrongTenant'].includes(mode))assert.equal(f.attempt().phase,'confirmed')
  if(['commit500','malformed'].includes(mode))assert.equal(f.attempt().phase,'readback_matches')
})
await test('known 422 remains rejected, no speculative write',async()=>{const f=fixture('reject');await client.writeConfiguration(f.id,f.cell,f.baseline,f.value,f.session);assert.equal(f.attempt().phase,'rejected');assert.equal(JSON.stringify(f.attempt()).includes('SECRET'),false)})
await test('explicit null is not rewritten by mere field inspection',()=>{const f=fixture();const v=contract.changeAt({...f.value,unknown:null},['regions','main','textColor'],'#000000');assert.equal(v.unknown,null)})
await test('optional App path editing never injects other screen defaults',()=>{
  const cell='app_entry.content',initial=contract.CONFIG_DEFINITIONS[cell].initial
  const next=contract.changeAt(initial,['screens','login','submitLabel'],'Acessar')
  assert.deepEqual(Object.keys(next.screens),['login']);assert.deepEqual(Object.keys(next.screens.login),['submitLabel']);assert.equal(contract.configValueError(cell,next),null)
})
const { ConfigurationPreview } = await load('src/features/whitelabel-settings/ConfigurationPreview.tsx')
for (const page of ['login', 'register', 'quick_profile']) await test(`rendered ${page} preview keeps Quick Profile colors in their own page`, () => {
  const f=fixture(),data=read.parseSettingsRead(f.raw,f.id)
  // No page-specific presentation exists, so a leak would enter through the
  // fallback styles even though the Login/Cadastro configuration never set it.
  delete data.configuration['login.entry_presentation']
  const theme={sideTitle:'Perfil inicial',sideSubtitle:'Texto do perfil',primaryColor:'#aa1122',backgroundColor:'#bb3344',textColor:'#cc5566'}
  data.configuration['quick_profile.theme']={stored:true,storedValue:theme,effectiveValue:theme,source:'stored',version:'theme-v1'}
  const html=renderToStaticMarkup(createElement(ConfigurationPreview,{data,cell:`${page}.entry_presentation`,saved:true}))
  for (const color of ['#aa1122','#bb3344','#cc5566']) assert.equal(html.includes(color),page==='quick_profile',`${page}: ${color}`)
})
await test('Cadastro auxiliary copy reacts to drafts while saved preview keeps authoritative copy',()=>{
  const f=fixture(),data=read.parseSettingsRead(f.raw,f.id),cell='register.content'
  const saved={...contract.CONFIG_DEFINITIONS[cell].initial,values:{title:'Cadastro',introduction:'Introdução',auxiliaryText:'Apoio salvo no servidor',submitLabel:'Continuar'}}
  const draft=contract.changeAt(saved,['values','auxiliaryText'],'Apoio do rascunho local')
  data.configuration[cell]={stored:true,storedValue:saved,effectiveValue:saved,source:'stored',version:'registration-v1'}
  const draftHtml=renderToStaticMarkup(createElement(ConfigurationPreview,{data,cell,override:{cell,value:draft},saved:false}))
  const savedHtml=renderToStaticMarkup(createElement(ConfigurationPreview,{data,cell,override:{cell,value:draft},saved:true}))
  assert.match(draftHtml,/Apoio do rascunho local/);assert.doesNotMatch(draftHtml,/Apoio salvo no servidor/)
  assert.match(savedHtml,/Apoio salvo no servidor/);assert.doesNotMatch(savedHtml,/Apoio do rascunho local/)
})
// Exercise the physical editors' real event handlers and state transitions.
// Only React's hook scheduler and child rendering are shallow; both write
// clients, provenance parsing and all requests use the synthetic fixture above.
const settingsWrites=await load('src/features/whitelabel-settings/settingsWriteClient.ts')
const settingsContract=await load('src/features/whitelabel-settings/settingsWriteContract.ts')
const brandingDisplay=await load('src/features/whitelabel-emails/emailBrandingDisplay.ts')
function mountEditor(name,props){
  const slots=[],effects=[];let cursor=0,tree
  const slot=initial=>{const i=cursor++;if(!(i in slots))slots[i]={value:typeof initial==='function'?initial():initial};return[slots[i].value,v=>{slots[i].value=typeof v==='function'?v(slots[i].value):v}]}
  const hooks={useState:slot,useId:()=>`field-${cursor++}`,useRef:initial=>slot(()=>({current:initial}))[0],useSyncExternalStore:(_,snapshot)=>snapshot(),useEffect(fn,deps){const i=cursor++,previous=slots[i];if(!previous||!deps||deps.some((v,j)=>v!==previous.deps[j])){slots[i]={deps,cleanup:previous?.cleanup};effects.push(()=>{slots[i].cleanup?.();slots[i].cleanup=fn()})}}}
  const modules={react:hooks,'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props}),Fragment:'Fragment'},'../../components/ui/Dialog':{Dialog:'Dialog'},'../../components/ui/OutlineButton':{OutlineButton:'OutlineButton'},'../../components/ui/PrimaryButton':{PrimaryButton:'PrimaryButton'},'../../lib/authSession':{...auth,useSessionOperator:auth.getOperator},'./settingsReadApi':read,'./configurationContract':contract,'./configurationClient':client,'./settingsWriteClient':settingsWrites,'./settingsWriteContract':settingsContract,'./ConfigurationPreview':{ConfigurationPreview:'ConfigurationPreview'},'../whitelabel-emails/emailBrandingDisplay':brandingDisplay,'./ConfigurationStudio.module.css':{default:new Proxy({},{get:(_,key)=>String(key)})}}
  const exports={}
  runInNewContext(ts.transpileModule(readFileSync(resolve(root,'src/features/whitelabel-settings/ConfigurationEditor.tsx'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:path=>{assert.ok(modules[path],`Unexpected editor dependency ${path}`);return modules[path]},AbortController})
  const nodes=value=>!value||typeof value!=='object'?[]:Array.isArray(value)?value.flatMap(nodes):[value,...nodes(value.props?.children),...nodes(value.props?.footer)]
  const text=value=>value==null||typeof value==='boolean'?'':typeof value!=='object'?String(value):Array.isArray(value)?value.map(text).join(''):text(value.props?.children)
  const view={render(){cursor=0;tree=exports[name](props);while(effects.length)effects.shift()();return view},find(predicate){const found=nodes(tree).find(predicate);assert.ok(found,'Expected editor control');return found},button(label){return view.find(node=>['OutlineButton','PrimaryButton'].includes(node.type)&&text(node)===label)},dispose(){for(const s of slots)s.cleanup?.()}}
  return view.render()
}
async function settle(){for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve))}
await test('stale composite draft is explicitly discarded before a fresh edit preserves remote extensions',async()=>{
  const f=fixture(),data=read.parseSettingsRead(f.raw,f.id);let held
  const view=mountEditor('CompositeConfigurationEditor',{id:f.id,data,cell:f.cell,onReload(){},onState:state=>{held=state}})
  view.button('Editar configuração').props.onClick();view.render()
  view.find(node=>node.props?.control?.path.join('/')==='regions/brand/backgroundColor').props.onChange('#123456');view.render()
  f.origin.storedValue.extension.remoteAddition={keep:true};f.origin.version='remote-v2'
  view.button('Salvar configuração').props.onClick();await settle();view.render()
  assert.equal(f.attempt().phase,'stale');assert.equal(held.dirty,true)
  view.button('Descartar rascunho e atualizar referência').props.onClick();await settle();view.render()
  assert.equal(held.dirty,false);assert.equal(f.seen.filter(row=>row.method==='PUT').length,0)
  view.button('Editar configuração').props.onClick();view.render()
  view.find(node=>node.props?.control?.path.join('/')==='regions/brand/backgroundColor').props.onChange('#654321');view.render()
  view.button('Salvar configuração').props.onClick();await settle();view.render()
  assert.equal(f.attempt().phase,'confirmed');assert.deepEqual(f.seen.find(row=>row.method==='PUT').body.value.extension.remoteAddition,{keep:true})
  view.dispose()
})
for(const mode of ['readFail','commit500'])await test(`composite GET recovery ${mode} refreshes only confirmed persistence`,async()=>{
  const f=fixture(mode),data=read.parseSettingsRead(f.raw,f.id);let reloads=0,held
  const view=mountEditor('CompositeConfigurationEditor',{id:f.id,data,cell:f.cell,onReload(){reloads++},onState:state=>{held=state}})
  view.button('Editar configuração').props.onClick();view.render()
  view.find(node=>node.props?.control?.path.join('/')==='regions/brand/backgroundColor').props.onChange('#123456');view.render()
  view.button('Salvar configuração').props.onClick();await settle();view.render()
  assert.equal(reloads,0);f.state.mode='normal'
  view.button('Consultar resultado por GET').props.onClick();await settle();view.render()
  assert.equal(reloads,mode==='readFail'?1:0);assert.equal(held.dirty,mode!=='readFail')
  assert.equal(f.seen.filter(row=>row.method==='PUT').length,1)
  if(mode==='commit500')assert.equal(view.button('Salvar configuração').props.disabled,true)
  view.dispose()
})
await test('scalar confirmed GET recovery closes editing and reloads rather than leaving a locked draft',async()=>{
  const f=fixture('readFail'),field='login.title',scalar={page:'login',key:'title',stored:true,storedValue:'Título anterior',effectiveValue:'Título anterior',source:'stored',version:'scalar-v1'}
  f.raw.data.provenance.push(scalar);f.raw.data.settings.login.title=scalar.effectiveValue
  const data=read.parseSettingsRead(f.raw,f.id);let held,reloads=0
  // The shared fixture routes PUT by its selected cell; adapt its authoritative
  // scalar row after dispatch while retaining the same fail-first GET behavior.
  const original=dispatch
  dispatch=async(url,options)=>{const result=await original(url,options);if(options.method==='PUT'){const body=JSON.parse(options.body);Object.assign(scalar,{storedValue:body.value,effectiveValue:body.value,version:'scalar-v2'});f.raw.data.settings.login.title=body.value;return response({data:{id:901,...body}})}return result}
  const view=mountEditor('ScalarConfigurationEditor',{id:f.id,data,field,onReload(){reloads++},onState:state=>{held=state}})
  view.button('Editar configuração').props.onClick();view.render()
  view.find(node=>node.type==='textarea').props.onChange({target:{value:'Título atualizado'}});view.render()
  view.button('Salvar configuração').props.onClick();await settle();view.render()
  assert.equal(settingsWrites.getSettingsWriteAttempt(settingsWrites.settingsWriteKey(f.id,field),f.session).phase,'uncertain')
  f.state.mode='normal';view.button('Consultar por GET').props.onClick();await settle();view.render()
  assert.equal(reloads,1);assert.equal(held.dirty,false);assert.equal(view.button('Editar configuração').props.disabled,false)
  assert.equal(f.seen.filter(row=>row.method==='PUT').length,1)
  view.dispose()
})
console.log(`Configuration studio: ${checks} checks passed; synthetic only, no live network.`)
