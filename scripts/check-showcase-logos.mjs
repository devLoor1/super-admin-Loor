import assert from 'node:assert/strict'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { dirname, resolve, basename } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import ts from 'typescript'

// Physical frontend modules with intercepted transport. No live API or storage requests.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), require = createRequire(import.meta.url)
const app = 'https://loor-super-admin.netlify.app', api = 'https://backend-super-admin-loor.onrender.com'
const data = code => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
const env = { VITE_SHOWCASE_ENABLED: 'true', VITE_API_BASE_URL: `${api}/api` }
const cache = new Map()
async function moduleUrl(path) {
  if (cache.has(path)) return cache.get(path)
  if (path.endsWith('.css')) return data('export default new Proxy({}, {get:(_,key)=>String(key)})')
  let code = ts.transpileModule(readFileSync(path, 'utf8'), { fileName: path, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } }).outputText.replaceAll('import.meta.env', JSON.stringify(env))
  // Exercise the post-cutover writer variant only in intercepted Node transport.
  if (path.endsWith('showcaseRelease.ts')) code = code.replace(/SHOWCASE_V2_WRITES_ENABLED = false/, 'SHOWCASE_V2_WRITES_ENABLED = true')
  for (const match of [...code.matchAll(/from\s+(['"])([^'"]+)\1/g)]) {
    const spec = match[2]
    let target
    if (spec.endsWith('.png?no-inline')) target = data(`export default ${JSON.stringify(`${app}/assets/${basename(spec.split('?')[0])}`)}`)
    else if (spec.startsWith('.')) {
      const base = resolve(dirname(path), spec)
      const found = [base, `${base}.ts`, `${base}.tsx`].find(p => existsSync(p) && statSync(p).isFile())
      assert.ok(found, spec); target = await moduleUrl(found)
    } else target = pathToFileURL(require.resolve(spec)).href
    code = code.replace(match[0], `from ${JSON.stringify(target)}`)
  }
  const result = data(code); cache.set(path, result); return result
}
const load = async path => import(await moduleUrl(resolve(root, path)))
const storage = new Map()
globalThis.sessionStorage = { getItem: k => storage.get(k) ?? null, setItem: (k,v) => storage.set(k,v), removeItem: k => storage.delete(k) }
globalThis.window = { location: { href: `${app}/`, origin: app }, setTimeout, clearTimeout }
globalThis.createImageBitmap = async () => ({ width: 236, height: 64, close() {} })
const prefix = 'src/features/whitelabel-showcase/'
const auth = await load('src/lib/authSession.ts'), model = await load(prefix + 'showcaseModel.ts')
const codec = await load(prefix + 'showcaseCodec.ts'), media = await load(prefix + 'showcaseMedia.ts')
const catalog = await load(prefix + 'showcaseLogoCatalog.ts'), store = await load(prefix + 'showcaseStore.ts')
const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const source = { whitelabelId: '6', slug: 'homologacao', name: 'LOØR Homologação', baseUrl: 'https://homolog.loor.vc/wallet', logical: null }
const actor = () => ({ roles: auth.getOperator()?.roles, sessionVersion: auth.getSessionVersion() })
const session = (roles=['SUPER_ADMIN']) => auth.persistSession({ accessToken:'synthetic-only',tokenType:'Bearer',operator:{id:'synthetic',name:'Synthetic',email:'synthetic@example.invalid',roles} })
function document() {
  const card = model.createCardInstance({source}); card.shortDescription = 'Synthetic test only'
  card.logo={assetRef:uuid(3),alt:'LOØR',fileName:'logo.png',origin:'upload'}
  card.images=[model.newImageAssociation(uuid(4),'photo.png','Photo')]
  return {...model.emptyShowcaseDocument(),banner:{images:[model.newImageAssociation(uuid(2),'banner.png','Banner')]},sections:[{...card,type:'card'}]}
}
function wire(doc) {
  const value={data:{configured:true,revision:7,schemaVersion:2,owner:{whitelabelId:6,slug:'homologacao'},document:codec.encodeShowcaseDocument(doc)}}
  for(const image of [...value.data.document.banner.images,...value.data.document.sections.flatMap(c=>[c.logo,...c.images])]) image.url=`https://assets.example.invalid/${image.assetRef}.png?temporary=not-persisted`
  return value
}
const png=readFileSync(resolve(root,prefix+'assets/loor-logo.png'))
let calls=[], reply, fileReply, checks=0
const json=(status,value)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}})
globalThis.fetch=async(address,options={})=>{
  const url=new URL(address); calls.push({url,options})
  if(url.origin===app) { assert.match(url.pathname,/^\/assets\/loor-logo(?:-white-solid)?\.png$/); return fileReply(url,options) }
  assert.equal(url.origin,api,'Unexpected external network is forbidden'); return reply(url,options)
}
function setup() {
  session(); calls=[]; const doc=document(); media.hydrateStoredMedia(wire(doc))
  fileReply=()=>new Response(png,{status:200,headers:{'content-type':'image/png','content-length':String(png.length)}})
  reply=()=>json(201,{data:{asset_ref:uuid(9),wtlb_id:6,slot:'showcase',original_name:'copy.png',mime:'image/png',size_bytes:png.length,url:'https://assets.example.invalid/copy.png'}})
  return doc
}
const uploads=()=>calls.filter(c=>c.options.method==='POST')
async function check(name,fn) {try {await fn();checks++}catch(error){if(error.stack)error.stack=error.stack.replace(/data:text\/javascript;base64,[A-Za-z0-9+/=]+/g,'<in-memory-module>');throw Error(name+'\n'+(error.stack||error.message))}}

await check('Applying reused logo changes only selected instance and wire persists no URL/blob/file',async()=>{
 const doc=setup(),second=structuredClone(doc.sections[0]);second.instanceId=uuid(6);second.images[0].associationId=uuid(20);doc.sections.push(second)
 reply=()=>json(200,wire(doc));await store.loadShowcase(actor());const before=structuredClone(store.getShowcaseState().draft)
 const changed=structuredClone(before.sections[0]);changed.logo.assetRef=uuid(4);store.replaceCard(actor(),changed)
 const after=store.getShowcaseState().draft;assert.deepEqual(after.sections[1],before.sections[1]);assert.deepEqual(after.sections[0].source,before.sections[0].source)
 const encoded=JSON.stringify(codec.encodeShowcaseDocument(after));for(const key of ['"url"','"fileName"','"blob"','temporary='])assert.equal(encoded.includes(key),false)
})
await check('Actual card logo callback preserves same-ref fileName and stays clean',async()=>{
 const doc=setup();reply=()=>json(200,wire(doc));await store.loadShowcase(actor());calls=[]
 const selected={variant:'Personalização preservada',suggestedAlt:'LOØR'}
 const result={ok:true,entry:await media.ensureMedia(uuid(3))};assert.equal(result.ok,true)
 const code=readFileSync(resolve(root,prefix+'editor/CardEditorPage.tsx'),'utf8')
 const tree=ts.createSourceFile('CardEditorPage.tsx',code,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let callback
 function visit(node){
  if(ts.isJsxSelfClosingElement(node)&&node.tagName.getText(tree)==='MediaPickerDialog')callback=node.attributes.properties.find(prop=>ts.isJsxAttribute(prop)&&prop.name.getText(tree)==='onPicked')?.initializer?.expression
  ts.forEachChild(node,visit)
 }
 visit(tree);assert.ok(callback,'Exercise the actual JSX callback, not a duplicate implementation')
 const executable=ts.transpileModule(`const picked = ${callback.getText(tree)}`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText
 for(const fileName of [undefined,'','keep-this-original-name.png']){
  let card=structuredClone(store.getShowcaseState().draft.sections[0]);card.logo.fileName=fileName
  const before=structuredClone(card)
  const picked=new Function('card','update','setLogoPicker','setLogoWarnings','window','document','fieldIds',`${executable}; return picked`)(card,patch=>{card={...card,...patch}},()=>{},()=>{},{requestAnimationFrame(){}},{},{cardLogoAlt:'unused'})
  picked({assetRef:result.entry.assetRef,fileName:result.entry.fileName||selected.variant,suggestedAlt:selected.suggestedAlt,warnings:[]})
  assert.equal(card.logo.fileName,fileName);assert.ok(model.sameDocument(card,before),'Editor must remain clean after same-ref selection')
 }
 assert.equal(store.isDraftDirty(store.getShowcaseState()),false);assert.equal(calls.length,0)
})
await check('Actual picker SSR exposes two modes and labelled thumbnails, never writes on render',async()=>{
 const doc=setup();reply=()=>json(200,wire(doc));await store.loadShowcase(actor());calls=[]
 const {createElement:h}=await import('react'),{renderToStaticMarkup:render}=await import('react-dom/server')
 const {MediaPickerDialog}=await load(prefix+'editor/MediaPickerDialog.tsx')
 const html=render(h(MediaPickerDialog,{purpose:'logo',logoSource:source,title:'Logo',onPicked(){},onClose(){}}))
 for(const text of ['Logo oficial da origem','Enviar nova logo','Logo do cabeçalho publicado','Usar imagem selecionada'])assert.ok(html.includes(text),text)
 assert.equal(calls.length,0)
 session(['READ_ONLY']);const readonly=render(h(MediaPickerDialog,{purpose:'logo',logoSource:source,title:'Logo',onPicked(){},onClose(){}}))
 assert.match(readonly,/<fieldset[^>]*disabled/);assert.equal(calls.length,0)
})
const optionsWire = (variants = [{kind:'main_area',page:'login',pages:['login','register'],assetRef:uuid(90),slot:'main_area',previewUrl:'https://assets.example.invalid/source.png',mime:'image/png',originalName:'login-image.png'}]) => ({data:{whitelabelId:6,slug:'homologacao',name:'LOØR Homologação',variants}})
const sourceOption = () => catalog.decodeSourceImageOptions(optionsWire(),source)[0]
await check('Discovery reads actual source and labels main_area provenance, never copies on lookup',async()=>{
 setup();reply=(url,options)=>{assert.equal(url.pathname,'/api/whitelabels/6/logo-options');assert.equal(options.method,'GET');return json(200,optionsWire())}
 const options=await catalog.loadSourceImageOptions(actor(),source)
 assert.equal(options[0].kind,'source');assert.equal(options[0].sourceId,'6');assert.deepEqual(options[0].pages,['login','register'])
 assert.match(options[0].provenance,/Não classificado como logo institucional/);assert.equal(options[0].suggestedAlt,'');assert.equal(uploads().length,0)
})
await check('READ_ONLY reads source images but cannot copy, send or reuse',async()=>{
 setup();session(['READ_ONLY']);calls=[];reply=()=>json(200,optionsWire())
 assert.equal((await catalog.loadSourceImageOptions(actor(),source)).length,1)
 await assert.rejects(catalog.selectExistingLogo(actor(),sourceOption(),new AbortController().signal));assert.equal(uploads().length,0)
})
await check('Empty photographs discovery preserves the current document without fallback',async()=>{
 const doc=setup(),before=structuredClone(doc);reply=()=>json(200,optionsWire([]))
 assert.deepEqual(await catalog.loadSourceImageOptions(actor(),source),[]);assert.deepEqual(doc,before);assert.equal(uploads().length,0)
})
await check('Unavailable preview remains a valid option; mismatched source and duplicate assets fail clearly',()=>{
 setup();const value=optionsWire();value.data.variants[0].previewUrl=null;value.data.variants[0].mime=null;value.data.variants[0].originalName=null
 const missingMetadata=catalog.decodeSourceImageOptions(value,source)[0]
 assert.equal(missingMetadata.previewUrl,null);assert.equal(missingMetadata.originalName,'');assert.equal(missingMetadata.mime,'');assert.equal(missingMetadata.variant,'Imagem existente da origem')
 for(const invalid of [{data:{...value.data,whitelabelId:4}},{data:{...value.data,slug:'other'}},{data:{...value.data,variants:[...value.data.variants,...value.data.variants]}}])assert.throws(()=>catalog.decodeSourceImageOptions(invalid,source))
})
await check('Source discovery error is recoverable by a new explicit read with no copy',async()=>{
 setup();reply=()=>json(500,{code:'QA_READ_FAILURE'});await assert.rejects(catalog.loadSourceImageOptions(actor(),source))
 reply=()=>json(200,optionsWire());assert.equal((await catalog.loadSourceImageOptions(actor(),source)).length,1);assert.equal(uploads().length,0)
})
await check('Explicit source selection copies once to WL6 and qualifies new owner ref',async()=>{
 const doc=setup(),before=structuredClone(doc),result=await catalog.selectExistingLogo(actor(),sourceOption(),new AbortController().signal)
 assert.equal(result.ok,true);assert.equal(result.entry.assetRef,uuid(9));assert.notEqual(result.entry.assetRef,uuid(90));assert.equal(uploads().length,1)
 assert.equal(uploads()[0].url.pathname,'/api/whitelabels/6/platform/assets/copy')
 assert.deepEqual(JSON.parse(uploads()[0].options.body),{sourceWhitelabelId:6,sourceAssetRef:uuid(90)});assert.deepEqual(doc,before)
})
await check('Copy cannot be submitted twice while pending, including reopened picker',async()=>{
 setup();let release;reply=()=>new Promise(resolve=>{release=resolve})
 const pending=catalog.selectExistingLogo(actor(),sourceOption(),new AbortController().signal)
 while(!release)await new Promise(resolve=>setImmediate(resolve))
 const duplicate=await catalog.selectExistingLogo(actor(),sourceOption(),new AbortController().signal)
 assert.equal(duplicate.ok,false);assert.match(duplicate.message,/já está em andamento/);assert.equal(uploads().length,1)
 release(json(201,{data:{asset_ref:uuid(11),wtlb_id:6,slot:'showcase',url:null}}));assert.equal((await pending).ok,true)
})
await check('Unsaved copied media renews by owner asset GET without a repeated copy or draft mutation',async()=>{
 const doc=setup();reply=()=>json(200,wire(doc));await store.loadShowcase(actor())
 reply=()=>json(201,{data:{asset_ref:uuid(13),wtlb_id:6,slot:'showcase',url:'https://assets.example.invalid/old-copy.png'}})
 const copied=await catalog.selectExistingLogo(actor(),sourceOption(),new AbortController().signal);assert.equal(copied.ok,true)
 const changed=structuredClone(store.getShowcaseState().draft.sections[0]);changed.logo.assetRef=copied.entry.assetRef;store.replaceCard(actor(),changed)
 const before=structuredClone(store.getShowcaseState()),repo=await load(prefix+'showcaseRepository.ts');calls=[]
 reply=url=>json(200,url.pathname.endsWith('/showcase')?wire(doc):{data:{asset_ref:uuid(13),wtlb_id:6,slot:'showcase',url:'https://assets.example.invalid/renewed-copy.png'}})
 await repo.refreshShowcaseMedia(uuid(13),'https://assets.example.invalid/old-copy.png')
 assert.equal(media.mediaUrl(uuid(13)),'https://assets.example.invalid/renewed-copy.png');assert.equal(media.resolveMedia(uuid(13)).origin,'upload')
 assert.deepEqual(store.getShowcaseState(),before);assert.equal(uploads().length,0);assert.equal(calls.length,2)
 assert.equal(calls.filter(call=>call.url.pathname==='/api/whitelabels/6/platform/assets/'+uuid(13)).length,1)
})
await check('Close does not assert server cancellation and late copy cannot replace newer selection',async()=>{
 const doc=setup(),attempts=media.createUploadAttempts(),controller=new AbortController();let release
 reply=()=>new Promise(resolve=>{release=resolve})
 const pending=media.runUploadAttempt(attempts,()=>catalog.selectExistingLogo(actor(),sourceOption(),controller.signal))
 while(!release)await new Promise(resolve=>setImmediate(resolve))
 attempts.close();controller.abort();const newer={entry:await media.ensureMedia(doc.sections[0].logo.assetRef)}
 release(json(201,{data:{asset_ref:uuid(12),wtlb_id:6,slot:'showcase',url:null}}))
 assert.equal((await pending).status,'ignored');assert.equal(newer.entry.assetRef,uuid(3));assert.equal(uploads().length,1)
 assert.equal(uploads()[0].options.signal.aborted,false,'UI close must not abort a dispatched copy and imply cancellation')
})
await check('Uncertain copy blocks additional media mutations and never retries or deletes',async()=>{
 setup();reply=()=>json(503,{code:'QA_UNCERTAIN'})
 const first=await catalog.selectExistingLogo(actor(),sourceOption(),new AbortController().signal)
 assert.equal(first.ok,false);assert.equal(first.uncertain,true);assert.equal(media.hasUncertainUpload(),true)
 assert.equal((await catalog.selectExistingLogo(actor(),sourceOption(),new AbortController().signal)).ok,false);assert.equal(uploads().length,1)
 assert.equal(calls.some(call=>call.options.method==='DELETE'),false)
})
await check('Malformed copy owner, slot and reused source ref are uncertain and never become eligible',async()=>{
 for(const asset of [{asset_ref:uuid(99),wtlb_id:4,slot:'showcase'},{asset_ref:uuid(99),wtlb_id:6,slot:'main_area'},{asset_ref:uuid(90),wtlb_id:6,slot:'showcase'}]){
  setup();reply=()=>json(201,{data:{...asset,url:null}})
  const result=await catalog.selectExistingLogo(actor(),sourceOption(),new AbortController().signal)
  assert.equal(result.ok,false);assert.equal(result.uncertain,true);assert.equal(media.hasMedia(asset.asset_ref),false);assert.equal(uploads().length,1)
 }
})
await check('Malformed copy input and destination outside WL6 never reach transport',async()=>{
 setup();const client=await load(prefix+'showcaseClient.ts')
 for(const [path,body] of [['/whitelabels/4/platform/assets/copy',{sourceWhitelabelId:6,sourceAssetRef:uuid(90)}],['/whitelabels/6/platform/assets/copy',{sourceWhitelabelId:0,sourceAssetRef:uuid(90)}],['/whitelabels/6/platform/assets/copy',{sourceWhitelabelId:6,sourceAssetRef:'not-uuid'}]])await assert.rejects(client.showcaseRequest(path,{method:'POST',actor:actor(),body}))
 assert.equal(calls.length,0)
})
console.log(`Showcase logo selection: ${checks} checks passed (physical code, simulated post-cutover latch, intercepted binary/API transport and SSR; no live network).`)
