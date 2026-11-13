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
const sources=[source,{...source,whitelabelId:'7',slug:'laguna-homologacao',name:'Laguna',baseUrl:'https://laguna.investor.loor.vc'},{...source,whitelabelId:'4',slug:'finapop-homologacao',name:'Fina Pop',baseUrl:'https://finapop.investidor.loor.vc'}]
const version=n=>'sha256:'+String(n).repeat(64)
const sourceWire=s=>({id:Number(s.whitelabelId),idKey:s.whitelabelId,slug:s.slug,name:s.name,status:'active',baseUrl:s.baseUrl})
function manifest(selected=source,n=1){
 const origin=official.officialLogoOrigin(selected)
 return {schemaVersion:1,environment:'homolog',whitelabelId:Number(selected.whitelabelId),slug:selected.slug,origin,brandingVersion:version(n),versionKind:'source-configuration-and-build',contentDigest:null,variants:[{id:'header',label:'Logo do cabeçalho',url:origin+'/assets/current-logo.png',version:version(n),mime:'image/png'}]}
}
let calls=[],manifestReply,reply,sourceReply,checks=0
const json=(status,value)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}})
globalThis.fetch=async(address,options={})=>{
 const url=new URL(address);calls.push({url,options})
 if(url.origin===api){const matched=/^\/api\/whitelabels\/(\d+)$/.exec(url.pathname);return matched?sourceReply(matched[1],options):reply(url,options)}
 return manifestReply(url,options)
}
function setup(){
 session();calls=[];const doc=document();media.hydrateStoredMedia(wire(doc))
 sourceReply=id=>json(200,sourceWire(sources.find(item=>item.whitelabelId===id)||source))
 manifestReply=url=>json(200,manifest(sources.find(item=>official.officialLogoOrigin(item)===url.origin)))
 reply=()=>{throw new Error('Unexpected application request')}
 return doc
}
const mutations=()=>calls.filter(call=>['POST','PUT','DELETE','PATCH'].includes(call.options.method))
const controller=()=>new AbortController()
async function choice(selected=source){return (await official.loadOfficialLogoOptions(actor(),selected))[0]}
async function check(name,fn){try{await fn();checks++}catch(error){if(error.stack)error.stack=error.stack.replace(/data:text\/javascript;base64,[A-Za-z0-9+/=]+/g,'<in-memory-module>');throw Error(name+'\n'+(error.stack||error.message))}}
const bind=(selected=source)=>({kind:'official',source:{whitelabelId:Number(selected.whitelabelId),slug:selected.slug},variantId:'header',alt:'Official logo'})
function officialWire(doc,url='https://assets.example.invalid/official.png',revision=11){
 const result=wire(doc);result.data.revision=revision;const card=result.data.document.sections.find(s=>s.type==='card');card.logo={...bind(),url,resolveStatus:url?'ok':'unavailable',brandingVersion:version(1),contentDigest:null};return result
}

for(const selected of sources)await check(`Exact identity ${selected.whitelabelId}/${selected.slug} from canonical registry; no mutations`,async()=>{
 const doc=setup(),before=structuredClone(doc),options=await official.loadOfficialLogoOptions(actor(),selected)
 assert.equal(options.length,1);assert.equal(options[0].sourceId,selected.whitelabelId);assert.equal(options[0].sourceSlug,selected.slug)
 assert.equal(options[0].kind,'official');assert.equal(options[0].variantId,'header');assert.equal(options[0].environment,'homolog')
 assert.equal(calls.length,2);assert.equal(calls[0].url.pathname,'/api/whitelabels/'+selected.whitelabelId);assert.equal(calls[1].options.cache,'no-store');assert.equal(calls[1].options.credentials,'omit');assert.equal(calls[1].options.redirect,'error');assert.equal(mutations().length,0);assert.deepEqual(doc,before)
})
await check('Canonical source baseUrl supersedes stale saved origin without changing editorial source',async()=>{
 setup();const stale={...source,baseUrl:'https://stale.example.invalid'};const option=await choice(stale);assert.equal(option.origin,'https://homolog.loor.vc');assert.ok(calls.every(c=>c.url.origin!=='https://stale.example.invalid'))
 sourceReply=()=>json(200,{...sourceWire(source),slug:'different'});await assert.rejects(choice());assert.equal(mutations().length,0)
})
await check('Manifest identity/environment/origin, URL and duplicate variants are rejected',()=>{
 setup();for(const field of [{whitelabelId:7},{slug:'other'},{environment:'production'},{origin:'https://other.example.invalid'},{schemaVersion:2},{versionKind:''}])assert.throws(()=>official.decodeOfficialLogoManifest({...manifest(),...field},source))
 const good=manifest();for(const item of [{...good.variants[0],id:''},{...good.variants[0],id:' header '},{...good.variants[0],url:'javascript:invalid()'},{...good.variants[0],url:'https://user:secret@example.invalid/image.png'}])assert.throws(()=>official.decodeOfficialLogoManifest({...good,variants:[item]},source))
 assert.throws(()=>official.decodeOfficialLogoManifest({...good,variants:[...good.variants,...good.variants]},source))
})
await check('Minimal Core manifest accepts optional metadata absence, SVG fragments and more than 40 variants',()=>{
 setup();const minimal={schemaVersion:1,environment:'homolog',whitelabelId:'6',slug:' HOMOLOGACAO ',versionKind:'configuration',variants:Array.from({length:41},(_,i)=>({id:'variant-'+i,url:'https://assets.example.invalid/logo.svg#'+i}))}
 const options=official.decodeOfficialLogoManifest(minimal,source);assert.equal(options.length,41);assert.equal(options[0].variant,'variant-0');assert.equal(options[0].version,null);assert.equal(options[0].mime,null);assert.ok(options[0].url.endsWith('#0'));assert.equal(options[0].sourceSlug,source.slug)
 assert.equal(official.decodeOfficialLogoManifest({...minimal,brandingVersion:'configuration-2',contentDigest:123},source)[0].version,'configuration-2')
})
await check('Legacy and explicit custom read identically and all new writes state kind explicitly',()=>{
 const doc=setup(),explicit=wire(doc),legacy=structuredClone(explicit);delete legacy.data.document.sections[0].logo.kind
 const a=codec.decodeStoredShowcase(explicit),b=codec.decodeStoredShowcase(legacy);assert.deepEqual(a.document,b.document);assert.equal(b.document.sections[0].logo.kind,'custom')
 assert.equal(codec.encodeShowcaseDocument(b.document).sections[0].logo.kind,'custom');assert.equal(b.document.sections[0].logo.assetRef,doc.sections[0].logo.assetRef)
})
await check('Official and unavailable decode without assetRef; canonical comparison ignores derived metadata only',()=>{
 const doc=setup(),a=officialWire(doc),b=structuredClone(a);b.data.document.sections[0].logo.url=null;b.data.document.sections[0].logo.brandingVersion=version(2);b.data.document.sections[0].logo.resolveStatus='unavailable'
 const aa=codec.decodeStoredShowcase(a),bb=codec.decodeStoredShowcase(b);assert.equal(codec.sameCanonicalDocument(aa.document,bb.document),true)
 const logo=codec.encodeShowcaseDocument(bb.document).sections[0].logo;assert.deepEqual(logo,bind());for(const key of ['assetRef','url','brandingVersion','contentDigest','resolveStatus','warnings'])assert.equal(key in logo,false)
 assert.equal(media.documentAssetRefs(bb.document).includes(undefined),false)
 for(const patch of [{alt:'Changed text'},{variantId:'alternate'},{source:{whitelabelId:7,slug:'laguna-homologacao'}}]){const changed=structuredClone(aa.document);Object.assign(changed.sections[0].logo,patch);assert.equal(codec.sameCanonicalDocument(aa.document,changed),false)}
})
await check('Official source mismatch, forbidden assetRef, invalid kind and variant are rejected without rewriting source',()=>{
 const doc=setup();for(const patch of [{assetRef:uuid(3)},{kind:'unknown'},{source:{whitelabelId:7,slug:'laguna-homologacao'}},{variantId:''}]){const value=officialWire(doc);Object.assign(value.data.document.sections[0].logo,patch);assert.throws(()=>codec.decodeStoredShowcase(value))}
})
await check('Official selection is synchronous draft binding with zero file GET, POST or PUT',async()=>{
 const doc=setup(),before=structuredClone(doc),selected=await choice();calls=[];const logo=official.selectOfficialLogo(actor(),selected,source,controller().signal)
 assert.deepEqual(logo,{...bind(),alt:source.name});assert.equal(calls.length,0);assert.deepEqual(doc,before);assert.equal(media.mediaUrl(model.logoMediaKey(logo)),selected.url)
 assert.equal((await catalog.selectExistingLogo(actor(),selected,controller().signal)).ok,false);assert.equal(calls.length,0)
})
await check('Canceled, stale and foreign choices cannot apply; no writes',async()=>{
 setup();const old=await choice(),abort=controller();abort.abort();assert.throws(()=>official.selectOfficialLogo(actor(),old,source,abort.signal))
 manifestReply=()=>json(200,manifest(source,2));const current=await choice();assert.throws(()=>official.selectOfficialLogo(actor(),old,source,controller().signal));assert.throws(()=>official.selectOfficialLogo(actor(),current,sources[1],controller().signal))
 assert.equal(official.selectOfficialLogo(actor(),current,source,controller().signal).variantId,'header');assert.equal(mutations().length,0)
})
await check('Source version change preserves stable binding and updates only transient media without PUT',async()=>{
 const doc=setup(),old=await choice(),logo=official.selectOfficialLogo(actor(),old,source,controller().signal);doc.sections[0].logo=logo;const before=codec.encodeShowcaseDocument(doc)
 manifestReply=()=>json(200,{...manifest(source,2),variants:[{...manifest(source,2).variants[0],url:'https://homolog.loor.vc/assets/new-logo.png'}]})
 const next=await choice();assert.equal(next.variantId,old.variantId);assert.notEqual(next.version,old.version);official.selectOfficialLogo(actor(),next,source,controller().signal)
 assert.equal(media.mediaUrl(model.logoMediaKey(logo)),'https://homolog.loor.vc/assets/new-logo.png');assert.deepEqual(codec.encodeShowcaseDocument(doc),before);assert.equal(mutations().length,0)
})
await check('Slow discovery is invalidated by a newer read of same source',async()=>{
 setup();let release;manifestReply=()=>new Promise(resolve=>{release=resolve});const old=official.loadOfficialLogoOptions(actor(),source),rejected=assert.rejects(old)
 while(!release)await new Promise(resolve=>setImmediate(resolve))
 manifestReply=()=>json(200,manifest(source,2));const current=await choice();release(json(200,manifest()));await rejected
 assert.equal(official.selectOfficialLogo(actor(),current,source,controller().signal).variantId,'header');assert.equal(mutations().length,0)
})
await check('Abort/source switch ignores late previous result',async()=>{
 setup();let release;manifestReply=()=>new Promise(resolve=>{release=resolve});const abort=controller(),old=official.loadOfficialLogoOptions(actor(),source,abort.signal),rejected=assert.rejects(old)
 while(!release)await new Promise(resolve=>setImmediate(resolve))
 abort.abort();manifestReply=()=>json(200,manifest(sources[1]));const next=await choice(sources[1]);release(json(200,manifest()));await rejected;assert.equal(next.sourceId,'7');assert.equal(mutations().length,0)
})
await check('Missing/error manifests preserve override, offer no foreign choices and recover on explicit read',async()=>{
 const doc=setup(),before=structuredClone(doc);manifestReply=()=>new Response('',{status:404});assert.deepEqual(await official.loadOfficialLogoOptions(actor(),sources[2]),[])
 manifestReply=()=>new Response('<html>SPA</html>',{headers:{'content-type':'text/html'}});await assert.rejects(choice(sources[2]))
 manifestReply=()=>json(503,{});await assert.rejects(choice());manifestReply=()=>json(200,manifest());assert.equal((await choice()).sourceId,'6');assert.deepEqual(doc,before);assert.equal(mutations().length,0)
})
for(const role of ['READ_ONLY','SUPPORT_ADMIN'])await check(`${role} cannot select official; READ_ONLY can consult`,async()=>{
 setup();session([role]);if(role==='READ_ONLY'){const selected=await choice();assert.throws(()=>official.selectOfficialLogo(actor(),selected,source,controller().signal))}else await assert.rejects(choice());assert.equal(mutations().length,0)
})
await check('SVG/WebP official links need no upload compatibility or binary transfer',async()=>{
 setup();for(const mime of ['image/svg+xml','image/webp']){manifestReply=()=>json(200,{...manifest(),variants:[{...manifest().variants[0],mime}]});const selected=await choice(),count=calls.length;assert.equal(official.selectOfficialLogo(actor(),selected,source,controller().signal).kind,'official');assert.equal(calls.length,count)}assert.equal(mutations().length,0)
})
await check('Official unavailable warning is allowlisted; diagnostics remain outside editorial content',()=>{
 const doc=setup(),value=officialWire(doc,null);value.data.warnings=[{code:'OFFICIAL_LOGO_UNAVAILABLE',instanceId:doc.sections[0].instanceId,sourceWhitelabelId:6,variantId:'header',reason:'private-diagnostic'}]
 const result=codec.decodeStoredShowcase(value);assert.equal(result.warnings[0].code,'OFFICIAL_LOGO_UNAVAILABLE');assert.equal('reason' in result.warnings[0],false);assert.equal(JSON.stringify(codec.encodeShowcaseDocument(result.document)).includes('private-diagnostic'),false)
})
await check('Remembered custom survives official read within session and restoration is explicit',()=>{
 const doc=setup(),original=media.previousCustomLogo(doc.sections[0]);media.hydrateStoredMedia(officialWire(doc));const linked=codec.decodeStoredShowcase(officialWire(doc)).document
 assert.equal(linked.sections[0].logo.kind,'official');assert.deepEqual(media.previousCustomLogo(linked.sections[0]),original)
 linked.sections[0].logo=media.previousCustomLogo(linked.sections[0]);assert.equal(codec.encodeShowcaseDocument(linked).sections[0].logo.kind,'custom');assert.equal(linked.sections[0].logo.assetRef,uuid(3));assert.equal(mutations().length,0)
 session();assert.equal(media.previousCustomLogo(linked.sections[0]),null)
})
const store=await load(prefix+'showcaseStore.ts'),repo=await load(prefix+'showcaseRepository.ts')
await check('Bounded official recovery uses showcase GET only, leaves draft/revision intact and refreshes URL',async()=>{
 const doc=setup();reply=()=>json(200,officialWire(doc,null));await store.loadShowcase(actor());const before=structuredClone(store.getShowcaseState()),key=model.logoMediaKey(before.draft.sections[0].logo);calls=[]
 reply=()=>json(200,officialWire(doc,'https://assets.example.invalid/new-official.png',12));await repo.refreshShowcaseMedia(key,'');assert.equal(calls.length,1);assert.ok(calls[0].url.pathname.endsWith('/showcase'));assert.deepEqual(store.getShowcaseState(),before);assert.equal(media.mediaUrl(key),'https://assets.example.invalid/new-official.png')
 await repo.refreshShowcaseMedia(key,'https://assets.example.invalid/new-official.png');assert.equal(calls.length,1);assert.equal(mutations().length,0)
})
await check('Actual official controls remove stale warning after recovery and explain the completed bounded check',async()=>{
 const doc=setup(),unavailable=officialWire(doc,null);unavailable.data.warnings=[{code:'OFFICIAL_LOGO_UNAVAILABLE',instanceId:doc.sections[0].instanceId,sourceWhitelabelId:6,variantId:'header'}];reply=()=>json(200,unavailable);await store.loadShowcase(actor())
 const card=store.getShowcaseState().draft.sections[0],logoKey=model.logoMediaKey(card.logo),code=readFileSync(resolve(root,prefix+'editor/CardEditorPage.tsx'),'utf8'),tree=ts.createSourceFile('CardEditorPage.tsx',code,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX)
 let fragment;function visit(node){if(ts.isConditionalExpression(node)&&node.condition.getText(tree)==="card.logo?.kind === 'official'"&&ts.isJsxFragment(node.whenTrue))fragment=node.whenTrue;ts.forEachChild(node,visit)}visit(tree);assert.ok(fragment)
 const React=await import('react'),{renderToStaticMarkup:render}=await import('react-dom/server'),compiled=ts.transpileModule('function controls(){return '+fragment.getText(tree)+'}',{compilerOptions:{target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React}}).outputText
 let state='idle';const make=new Function('React','styles','OutlineButton','card','logoKey','logoUrl','officialRecovery','setOfficialRecovery','refreshShowcaseMedia','canEdit','previousCustom','update','logoFailed',compiled+';return controls()')
 const controls=(logoFailed=false)=>make(React,{},props=>React.createElement('button',props),card,logoKey,media.mediaUrl(logoKey),state,value=>{state=value},repo.refreshShowcaseMedia,true,null,()=>{},logoFailed)
 assert.match(render(controls()),/A fonte oficial está indisponível/);reply=()=>json(200,officialWire(doc,'https://assets.example.invalid/recovered.png'));const button=controls().props.children.find(item=>React.isValidElement(item)&&item.props.onClick);button.props.onClick();assert.equal(state,'loading')
 for(let n=0;n<20&&state!=='complete';n++)await new Promise(resolve=>setImmediate(resolve));assert.equal(state,'complete');assert.equal(store.getShowcaseState().stored.warnings.length,1)
 const html=render(controls());assert.equal(html.includes('A fonte oficial está indisponível'),false);assert.match(html,/Conferência encerrada/);assert.match(html,/<button[^>]*disabled/);assert.equal(mutations().length,0)
 assert.match(render(controls(true)),/A fonte oficial está indisponível/)
})
await check('Save official, readback and explicit custom restore use exact contract; no asset IO',async()=>{
 const doc=setup();reply=()=>json(200,wire(doc));await store.loadShowcase(actor());const original=structuredClone(store.getShowcaseState().draft.sections[0].logo),changed=structuredClone(store.getShowcaseState().draft.sections[0]);changed.logo=bind();store.replaceCard(actor(),changed);calls=[]
 reply=(_url,options)=>{const body=JSON.parse(options.body);assert.deepEqual(body.document.sections[0].logo,bind());const result={data:{configured:true,revision:body.expectedRevision+1,schemaVersion:2,document:body.document}};result.data.document.sections[0].logo.url='https://assets.example.invalid/current.png';return json(200,result)}
 await store.saveDraft(actor());assert.equal(store.getShowcaseState().phase,'saved');assert.equal(mutations().length,1);assert.equal(calls[0].options.method,'PUT');assert.equal(store.getShowcaseState().draft.sections[0].logo.kind,'official')
 const restored=structuredClone(store.getShowcaseState().draft.sections[0]);restored.logo=original;store.replaceCard(actor(),restored);reply=(_url,options)=>{const body=JSON.parse(options.body);assert.equal(body.document.sections[0].logo.kind,'custom');return json(200,{data:{configured:true,revision:body.expectedRevision+1,schemaVersion:2,document:body.document}})}
 await store.saveDraft(actor());assert.equal(store.getShowcaseState().phase,'saved');assert.equal(store.getShowcaseState().draft.sections[0].logo.assetRef,original.assetRef);assert.equal(calls.length,2)
})
await check('Actual editor and preview logo elements replace a broken URL with a safe fallback and recover for a new URL',async()=>{
 const doc=setup(),card={...doc.sections[0],logo:bind()},React=await import('react'),{renderToStaticMarkup:render}=await import('react-dom/server')
 for(const file of ['editor/CardEditorPage.tsx','public/ShowcaseView.tsx']){
 const text=readFileSync(resolve(root,prefix+file),'utf8'),tree=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let choice
 function visit(node){if(ts.isConditionalExpression(node)&&node.condition.getText(tree)==='logoUrl && !logoFailed')choice=node;ts.forEachChild(node,visit)}visit(tree);assert.ok(choice)
 const compiled=ts.transpileModule('function image(){return '+choice.getText(tree)+'}',{compilerOptions:{target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React}}).outputText
 let failed=null,failedByCard={},refreshes=0;const key=model.logoMediaKey(card.logo),make=new Function('React','logoUrl','logoFailed','logoEntry','card','editorPlaceholders','logoKey','logoMediaKey','setFailedLogoUrl','setFailedLogoUrls','refreshMedia',compiled+';return image()')
 const image=url=>make(React,url,failed===url||failedByCard[card.instanceId]===url,undefined,card,true,key,model.logoMediaKey,value=>{failed=value},update=>{failedByCard=update(failedByCard)},()=>{refreshes++})
 const url='https://assets.example.invalid/failing.png';assert.match(render(image(url)),/<img/);image(url).props.onError();assert.equal(refreshes,1);assert.equal(render(image(url)).includes('<img'),false);assert.match(render(image('https://assets.example.invalid/recovered.png')),/<img/)
 }assert.equal(mutations().length,0)
})
await check('Downgrade422 and conflict409 preserve official draft; conflict reads once with no rePUT',async()=>{
 for(const [status,code] of [[422,'E_SHOWCASE_OFFICIAL_LOGO_DOWNGRADE'],[409,'E_SHOWCASE_REVISION_CONFLICT']]){
 const doc=setup();reply=()=>json(200,wire(doc));await store.loadShowcase(actor());const changed=structuredClone(store.getShowcaseState().draft.sections[0]);changed.logo=bind();store.replaceCard(actor(),changed);const before=structuredClone(store.getShowcaseState().draft);calls=[]
 reply=(_url,options)=>options.method==='PUT'?json(status,{code}):json(200,wire(doc));await store.saveDraft(actor());assert.deepEqual(store.getShowcaseState().draft,before);assert.equal(mutations().length,1);assert.equal(calls.length,status===409?2:1);if(status===422)assert.match(store.getShowcaseState().message,/formato antigo/)
 }
})
await check('Uncertain official response reconciles by GET; never repeats PUT',async()=>{
 const doc=setup();reply=()=>json(200,wire(doc));await store.loadShowcase(actor());const changed=structuredClone(store.getShowcaseState().draft.sections[0]);changed.logo=bind();store.replaceCard(actor(),changed);const draft=structuredClone(store.getShowcaseState().draft);calls=[];reply=()=>json(503,{code:'QA_UNCERTAIN'});await store.saveDraft(actor());assert.equal(store.getShowcaseState().phase,'uncertain');reply=()=>json(200,{data:{configured:true,revision:8,schemaVersion:2,owner:{whitelabelId:6,slug:'homologacao'},document:codec.encodeShowcaseDocument(draft)}});await store.reconcileDraft(actor());assert.equal(store.getShowcaseState().phase,'saved');assert.equal(mutations().length,1);assert.equal(calls.length,2)
})
await check('Actual picker remount key changes with source, canonical origin, role/session',async()=>{
 setup();const code=readFileSync(resolve(root,prefix+'editor/MediaPickerDialog.tsx'),'utf8'),tree=ts.createSourceFile('MediaPickerDialog.tsx',code,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),wrapper=tree.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='MediaPickerDialog');assert.ok(wrapper)
 const executable=ts.transpileModule(wrapper.getText(tree).replace('export ',''),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.React}}).outputText
 const make=new Function('React','useShowcaseActor','ScopedMediaPickerDialog',executable+';return MediaPickerDialog')({createElement:(_type,props)=>props},()=>({actor:actor()}),()=>{}),props={purpose:'logo',logoSource:source},key=make(props).key
 for(const changed of [sources[1],{...source,slug:'other'},{...source,baseUrl:'https://other.example.invalid'}])assert.notEqual(make({...props,logoSource:changed}).key,key);session(['READ_ONLY']);assert.notEqual(make(props).key,key)
})
await check('SSR shows binding description, no main_area/catalogue; READ_ONLY disables writes',async()=>{
 setup();const {createElement:h}=await import('react'),{renderToStaticMarkup:render}=await import('react-dom/server'),{MediaPickerDialog}=await load(prefix+'editor/MediaPickerDialog.tsx'),props={purpose:'logo',logoSource:source,title:'Logo',onPicked(){},onOfficialPicked(){},onClose(){}}
 const html=render(h(MediaPickerDialog,props));for(const text of ['Logo oficial da origem','sem copiar ou enviar arquivo','até 60 segundos'])assert.ok(html.includes(text));for(const text of ['main_area','Site · escura','Vitrine · clara','Já na vitrine'])assert.equal(html.includes(text),false)
 session(['READ_ONLY']);assert.match(render(h(MediaPickerDialog,props)),/<fieldset[^>]*disabled/);assert.equal(calls.length,0)
})
console.log(`Showcase official bindings: ${checks} checks passed (physical code, simulated registry/manifest/API, SSR; no live network or real brand changes).`)
