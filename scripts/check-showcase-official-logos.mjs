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
const catalog = await load(prefix + 'showcaseLogoCatalog.ts')
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
const official=await load(prefix+'showcaseOfficialLogos.ts')
const png=readFileSync(resolve(root,prefix+'assets/loor-logo.png'))
const sources=[source,{...source,whitelabelId:'7',slug:'laguna-homologacao',name:'Laguna',baseUrl:'https://laguna.investor.loor.vc'},{...source,whitelabelId:'4',slug:'finapop-homologacao',name:'Fina Pop',baseUrl:'https://finapop.investidor.loor.vc'}]
const version=n=>'sha256:'+String(n).repeat(64)
function manifest(selected=source,n=1){
 const origin=official.officialLogoOrigin(selected)
 return {schemaVersion:1,environment:'homolog',whitelabelId:Number(selected.whitelabelId),slug:selected.slug,origin,brandingVersion:version(n),versionKind:'source-configuration-and-build',contentDigest:null,variants:[{id:'header',label:'Logo do cabeçalho',url:origin+'/assets/current-logo.png',version:version(n),mime:'image/png'}]}
}
let calls=[],manifestReply,fileReply,reply,checks=0
const json=(status,value)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}})
globalThis.fetch=async(address,options={})=>{
 const url=new URL(address);calls.push({url,options})
 if(url.origin===api)return reply(url,options)
 assert.ok(sources.some(item=>official.officialLogoOrigin(item)===url.origin),'No unqualified external network')
 return url.pathname==='/branding/logo-manifest.json'?manifestReply(url,options):fileReply(url,options)
}
function setup(){
 session();calls=[];const doc=document();media.hydrateStoredMedia(wire(doc))
 manifestReply=url=>json(200,manifest(sources.find(item=>official.officialLogoOrigin(item)===url.origin)))
 fileReply=()=>new Response(png,{headers:{'content-type':'image/png'}})
 reply=()=>json(201,{data:{asset_ref:uuid(9),wtlb_id:6,slot:'showcase',original_name:'official.png',mime:'image/png',size_bytes:png.length,url:'https://assets.example.invalid/copy.png'}})
 globalThis.createImageBitmap=async()=>({width:236,height:64,close(){}})
 return doc
}
const posts=()=>calls.filter(call=>call.options.method==='POST')
const controller=()=>new AbortController()
async function choice(selected=source){return (await official.loadOfficialLogoOptions(actor(),selected))[0]}
async function check(name,fn){try{await fn();checks++}catch(error){if(error.stack)error.stack=error.stack.replace(/data:text\/javascript;base64,[A-Za-z0-9+/=]+/g,'<in-memory-module>');throw Error(name+'\n'+(error.stack||error.message))}}

for(const selected of sources)await check(`Exact identity ${selected.whitelabelId}/${selected.slug} only; no write or override mutation`,async()=>{
 const doc=setup(),before=structuredClone(doc),options=await official.loadOfficialLogoOptions(actor(),selected)
 assert.equal(options.length,1);assert.equal(options[0].sourceId,selected.whitelabelId);assert.equal(options[0].sourceSlug,selected.slug)
 assert.equal(options[0].kind,'official');assert.equal(options[0].variantId,'header');assert.equal(options[0].environment,'homolog')
 assert.equal(calls.length,1);assert.equal(calls[0].options.cache,'no-store');assert.equal(calls[0].options.credentials,'omit');assert.equal(calls[0].options.redirect,'error');assert.equal(posts().length,0);assert.deepEqual(doc,before)
})
await check('Identity, slug, environment and manifest origin mismatches never qualify',()=>{
 setup();for(const field of [{whitelabelId:7},{slug:'other'},{environment:'production'},{origin:'https://other.example.invalid'},{schemaVersion:2},{versionKind:'unqualified'},{contentDigest:'not-a-digest'}])assert.throws(()=>official.decodeOfficialLogoManifest({...manifest(),...field},source))
 for(const changed of [{...source,whitelabelId:'7'},{...source,slug:'other'},{...source,baseUrl:'https://other.example.invalid'}])assert.equal(official.officialLogoOrigin(changed),null)
})
await check('Only official header variants qualify; main_area, unknown variants, unsafe URLs and duplicate entries are rejected',()=>{
 setup();const good=manifest();for(const item of [{...good.variants[0],id:'main_area'},{...good.variants[0],id:'favicon'},{...good.variants[0],version:version(2)},{...good.variants[0],url:'javascript:invalid()'},{...good.variants[0],url:'https://user:secret@example.invalid/image.png'}])assert.throws(()=>official.decodeOfficialLogoManifest({...good,variants:[item]},source))
 assert.throws(()=>official.decodeOfficialLogoManifest({...good,variants:[...good.variants,...good.variants]},source))
 assert.equal(official.decodeOfficialLogoManifest({...good,contentDigest:version(3)},source).length,1)
})
await check('Actual Finapop absence is represented by 404/SPA, not a replacement logo or photos',async()=>{
 setup();manifestReply=()=>new Response('',{status:404});assert.deepEqual(await official.loadOfficialLogoOptions(actor(),sources[2]),[])
 manifestReply=()=>new Response('<html>SPA</html>',{headers:{'content-type':'text/html'}});await assert.rejects(official.loadOfficialLogoOptions(actor(),sources[2]))
 assert.equal(posts().length,0);assert.ok(calls.every(call=>call.url.pathname==='/branding/logo-manifest.json'))
})
await check('Empty, unknown origin and recoverable error never reuse cached or bundled choices',async()=>{
 setup();const old=await choice();manifestReply=()=>json(200,{...manifest(),variants:[]});assert.deepEqual(await official.loadOfficialLogoOptions(actor(),source),[])
 assert.equal((await official.importOfficialLogo(actor(),old,controller().signal)).ok,false)
 manifestReply=()=>json(503,{});await assert.rejects(official.loadOfficialLogoOptions(actor(),source))
 manifestReply=()=>json(200,manifest());assert.equal((await choice()).sourceId,'6')
 const count=calls.length;assert.deepEqual(await official.loadOfficialLogoOptions(actor(),{...source,whitelabelId:'99'}),[]);assert.equal(calls.length,count);assert.equal(posts().length,0)
})
await check('Fresh version preserves stable identity/variant while evicting old-version import permission',async()=>{
 const doc=setup(),before=structuredClone(doc),old=await choice();manifestReply=()=>json(200,{...manifest(source,2),variants:[{...manifest(source,2).variants[0],url:'https://homolog.loor.vc/assets/new-logo.png'}]})
 const current=await choice();assert.equal(current.sourceId,old.sourceId);assert.equal(current.variantId,old.variantId);assert.notEqual(current.id,old.id);assert.notEqual(current.version,old.version)
 assert.equal((await official.importOfficialLogo(actor(),old,controller().signal)).ok,false)
 assert.equal((await official.importOfficialLogo(actor(),current,controller().signal)).ok,true);assert.equal(posts().length,1);assert.deepEqual(doc,before)
})
await check('Slower previous discovery cannot override a newer manifest for the same identity',async()=>{
 setup();let release;manifestReply=()=>new Promise(resolve=>{release=resolve})
 const old=official.loadOfficialLogoOptions(actor(),source);const oldRejected=assert.rejects(old)
 manifestReply=()=>json(200,manifest(source,2));const current=await choice()
 release(json(200,manifest()));await oldRejected
 assert.equal((await official.importOfficialLogo(actor(),current,controller().signal)).ok,true);assert.equal(posts().length,1)
})
await check('Aborted previous source discovery cannot produce selectable results after switching sources',async()=>{
 setup();let release;manifestReply=()=>new Promise(resolve=>{release=resolve});const oldController=controller()
 const old=official.loadOfficialLogoOptions(actor(),source,oldController.signal);const oldRejected=assert.rejects(old)
 oldController.abort();manifestReply=()=>json(200,manifest(sources[1]));const current=await choice(sources[1]);release(json(200,manifest()));await oldRejected
 assert.equal(current.sourceId,'7');assert.equal(posts().length,0)
})
await check('Official reuse needs no file picker: one binary download and existing owner6 PNG upload',async()=>{
 const doc=setup(),before=structuredClone(doc),selected=await choice();calls=[]
 const result=await catalog.selectExistingLogo(actor(),selected,controller().signal)
 assert.equal(result.ok,true);assert.equal(result.entry.assetRef,uuid(9));assert.equal(calls.length,2);assert.equal(posts().length,1)
 const body=posts()[0].options.body;assert.equal(body.get('slot'),'showcase');assert.ok(body.get('image') instanceof File)
 assert.deepEqual(new Uint8Array(await body.get('image').arrayBuffer()),new Uint8Array(png));assert.deepEqual(doc,before)
 assert.equal(posts()[0].url.pathname,'/api/whitelabels/6/platform/assets')
})
await check('Caller cannot substitute discovered URL, MIME or unrecognized identity/version',async()=>{
 setup();const selected=await choice();calls=[]
 assert.equal((await official.importOfficialLogo(actor(),{...selected,url:'https://other.example.invalid/file.png',mime:'image/svg+xml'},controller().signal)).ok,true)
 assert.equal(calls[0].url.origin,'https://homolog.loor.vc')
 calls=[];for(const changed of [{...selected,id:'unknown'},{...selected,sourceId:'7'},{...selected,sourceSlug:'another'}])assert.equal((await official.importOfficialLogo(actor(),changed,controller().signal)).ok,false)
 assert.equal(calls.length,0)
})
for(const role of ['READ_ONLY','SUPPORT_ADMIN'])await check(`${role} cannot upload official source; READ_ONLY can consult`,async()=>{
 setup();session([role]);if(role==='READ_ONLY'){const selected=await choice();await assert.rejects(official.importOfficialLogo(actor(),selected,controller().signal))}else await assert.rejects(official.loadOfficialLogoOptions(actor(),source))
 assert.equal(posts().length,0)
})
await check('SVG and WebP remain official previews without broadening manual upload formats',async()=>{
 setup();for(const mime of ['image/svg+xml','image/webp']){
 manifestReply=()=>json(200,{...manifest(),variants:[{...manifest().variants[0],mime}]});const selected=await choice();assert.equal(selected.mime,mime);assert.equal(official.canImportOfficialLogo(selected),false)
 const count=calls.length;assert.equal((await official.importOfficialLogo(actor(),selected,controller().signal)).ok,false);assert.equal(calls.length,count)
 }assert.equal(posts().length,0)
})
await check('Unspecified external MIME is qualified from actual bytes; invalid binary never uploads',async()=>{
 setup();manifestReply=()=>json(200,{...manifest(),variants:[{...manifest().variants[0],mime:null}]});const selected=await choice()
 fileReply=()=>new Response('<svg/>',{headers:{'content-type':'image/svg+xml'}});assert.equal((await official.importOfficialLogo(actor(),selected,controller().signal)).ok,false)
 fileReply=()=>new Response('not PNG',{headers:{'content-type':'image/png'}});assert.equal((await official.importOfficialLogo(actor(),selected,controller().signal)).ok,false)
 assert.equal(posts().length,0);fileReply=()=>new Response(png,{headers:{'content-type':'image/png'}});assert.equal((await official.importOfficialLogo(actor(),selected,controller().signal)).ok,true)
})
await check('Unreadable official file preserves override and permits one explicit retry',async()=>{
 const doc=setup(),before=structuredClone(doc),selected=await choice();fileReply=()=>new Response('',{status:404})
 assert.equal((await official.importOfficialLogo(actor(),selected,controller().signal)).ok,false);assert.equal(posts().length,0)
 fileReply=()=>new Response(png,{headers:{'content-type':'image/png'}});assert.equal((await official.importOfficialLogo(actor(),selected,controller().signal)).ok,true);assert.equal(posts().length,1);assert.deepEqual(doc,before)
})
await check('Closing during download ignores late read and sends no upload',async()=>{
 const doc=setup(),before=structuredClone(doc),selected=await choice(),abort=controller(),attempts=media.createUploadAttempts();let release
 fileReply=()=>new Promise(resolve=>{release=resolve})
 const pending=media.runUploadAttempt(attempts,()=>official.importOfficialLogo(actor(),selected,abort.signal))
 attempts.close();abort.abort();release(new Response(png,{headers:{'content-type':'image/png'}}))
 assert.equal((await pending).status,'ignored');assert.equal(posts().length,0);assert.deepEqual(doc,before)
})
await check('Closing during image decoding prevents the later POST, not only the callback',async()=>{
 setup();const selected=await choice(),abort=controller();let release
 globalThis.createImageBitmap=()=>new Promise(resolve=>{release=resolve})
 const pending=official.importOfficialLogo(actor(),selected,abort.signal)
 while(!release)await new Promise(resolve=>setImmediate(resolve))
 abort.abort();release({width:236,height:64,close(){}});assert.equal((await pending).ok,false);assert.equal(posts().length,0)
})
await check('Session replacement during download prevents the POST',async()=>{
 setup();const selected=await choice();let release;fileReply=()=>new Promise(resolve=>{release=resolve})
 const pending=official.importOfficialLogo(actor(),selected,controller().signal);const rejected=assert.rejects(pending)
 session(['READ_ONLY']);release(new Response(png,{headers:{'content-type':'image/png'}}));await rejected;assert.equal(posts().length,0)
})
await check('Concurrent/reopened import cannot double-submit; close after dispatch ignores result without claiming cancellation',async()=>{
 setup();const selected=await choice(),abort=controller(),attempts=media.createUploadAttempts();let release
 reply=()=>new Promise(resolve=>{release=resolve});const pending=media.runUploadAttempt(attempts,()=>official.importOfficialLogo(actor(),selected,abort.signal))
 while(!release)await new Promise(resolve=>setImmediate(resolve))
 const duplicate=await official.importOfficialLogo(actor(),selected,controller().signal);assert.equal(duplicate.ok,false);assert.equal(posts().length,1)
 attempts.close();abort.abort();assert.equal(posts()[0].options.signal.aborted,false)
 release(json(201,{data:{asset_ref:uuid(9),wtlb_id:6,slot:'showcase',url:null}}));assert.equal((await pending).status,'ignored')
})
await check('Uncertain import does not retry, delete or mutate editorial state',async()=>{
 const doc=setup(),before=structuredClone(doc),selected=await choice();reply=()=>json(503,{code:'QA_UNCERTAIN'})
 const result=await official.importOfficialLogo(actor(),selected,controller().signal);assert.equal(result.ok,false);assert.equal(result.uncertain,true)
 assert.equal((await official.importOfficialLogo(actor(),selected,controller().signal)).ok,false);assert.equal(posts().length,1);assert.equal(calls.some(call=>call.options.method==='DELETE'),false);assert.deepEqual(doc,before)
})
await check('Actual picker remount key changes with source, slug, canonical origin, role and session',async()=>{
 setup();const code=readFileSync(resolve(root,prefix+'editor/MediaPickerDialog.tsx'),'utf8')
 const tree=ts.createSourceFile('MediaPickerDialog.tsx',code,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX)
 const wrapper=tree.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='MediaPickerDialog');assert.ok(wrapper)
 const executable=ts.transpileModule(wrapper.getText(tree).replace('export ',''),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.React}}).outputText
 const make=new Function('React','useShowcaseActor','ScopedMediaPickerDialog',executable+';return MediaPickerDialog')({createElement:(_type,props)=>props},()=>({actor:actor()}),()=>{})
 const props={purpose:'logo',logoSource:source},key=make(props).key
 for(const changed of [sources[1],{...source,slug:'other'},{...source,baseUrl:'https://other.example.invalid'}])assert.notEqual(make({...props,logoSource:changed}).key,key)
 session(['READ_ONLY']);assert.notEqual(make(props).key,key)
})
await check('Actual SSR logo picker contains no main_area, saved-card catalogue, bundled variants or write on opening',async()=>{
 setup();const {createElement:h}=await import('react'),{renderToStaticMarkup:render}=await import('react-dom/server'),{MediaPickerDialog}=await load(prefix+'editor/MediaPickerDialog.tsx')
 const props={purpose:'logo',logoSource:source,title:'Logo',onPicked(){},onClose(){}}
 const html=render(h(MediaPickerDialog,props));for(const text of ['Logo oficial da origem','não acompanha automaticamente','personalizada atual'])assert.ok(html.includes(text))
 for(const text of ['main_area','Site · escura','Vitrine · clara','Já na vitrine'])assert.equal(html.includes(text),false)
 session(['READ_ONLY']);const read=render(h(MediaPickerDialog,props));assert.match(read,/<fieldset[^>]*disabled/);assert.equal(calls.length,0)
})
console.log(`Showcase official logos: ${checks} checks passed (physical modules, simulated manifests/binary/API, SSR; no live network, brand publication or visual acceptance).`)
