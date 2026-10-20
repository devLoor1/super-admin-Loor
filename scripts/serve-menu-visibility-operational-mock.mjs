import { createServer } from 'node:http'

// Browser-QA interception ONLY. Loopback, volatile synthetic state, no upstream,
// database, real credentials, disk writes or application import. API base :4321/api.
const ids=['dashboard','plataformas','whitelabels','contas','whitelabel-settings','whitelabel-emails','operacao','operation-opportunities','operation-investors','operation-entrepreneurs','financeiro','finance-gateways','finance-modalities','finance-catalogs','finance-investments','finance-payments','finance-wallets','compliance','compliance-kyc','auditoria','sistema','configuracoes','ajuda']
let config,mode,requests,role,release
const all=()=>Object.fromEntries(ids.map(id=>[id,true]))
function reset(){config={scope:'global',visibility:all(),version:0,updatedAt:null,updatedBy:null,lockedIds:['dashboard','configuracoes']};mode='success';requests=[];role='SUPER_ADMIN';release=null}
reset()
const server=createServer(async(req,res)=>{
  res.setHeader('Access-Control-Allow-Origin','*')
  res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type, X-Correlation-ID')
  res.setHeader('Access-Control-Allow-Methods','GET, PUT, POST, OPTIONS')
  res.setHeader('Content-Type','application/json')
  const url=new URL(req.url,'http://127.0.0.1:4321')
  const send=(status,body)=>{res.statusCode=status;res.end(JSON.stringify(body))}
  if(req.method==='OPTIONS'){res.statusCode=204;res.end();return}
  if(req.method==='GET'&&url.pathname==='/__mock/reset'){reset();send(200,{reset:true});return}
  if(req.method==='GET'&&url.pathname==='/__mock/mode'){mode=url.searchParams.get('value')||'success';role=url.searchParams.get('role')||'SUPER_ADMIN';send(200,{mode,role});return}
  if(req.method==='GET'&&url.pathname==='/__mock/state'){send(200,{config,mode,requests});return}
  // Stage C varied sidebar fixtures. Loopback-only controls; never a real API.
  if(req.method==='GET'&&url.pathname==='/__mock/config'){
    const hidden=(url.searchParams.get('hidden')||'').split(',')
    config={...config,visibility:Object.fromEntries(ids.map(id=>[id,!hidden.includes(id)]))}
    send(200,{configured:true});return
  }
  if(req.method==='GET'&&url.pathname==='/__mock/release'){release?.();release=null;send(200,{released:true});return}
  requests.push({method:req.method,path:url.pathname})
  const operator={id:role==='OTHER_ADMIN'?'synthetic-other':'synthetic-operator',name:'Synthetic QA',email:'qa@example.invalid',roles:[role==='OTHER_ADMIN'?'SUPER_ADMIN':role]}
  if(req.method==='POST'&&url.pathname==='/api/auth/login'){send(200,{accessToken:'synthetic-loopback-only',tokenType:'Bearer',operator});return}
  if(req.method==='GET'&&url.pathname==='/api/auth/me'){send(200,operator);return}
  if(url.pathname==='/api/homolog/menu-visibility'){
    if(req.method==='GET'){
      if(mode==='get-pending') await new Promise(r=>release=r)
      if(mode==='get-error'){send(500,{code:'SYNTHETIC_GET_FAILURE'});return}
      if(mode==='get-forbidden'){send(403,{code:'FORBIDDEN'});return}
      if(mode==='get-malformed'){send(200,{data:{scope:'global'}});return}
      if(mode==='read-failed'&&config.version){send(503,{code:'SYNTHETIC_GET_FAILURE'});return}
      send(200,{data:config});return
    }
    if(req.method==='PUT'){
      let text='';for await(const chunk of req)text+=chunk
      let body;try{body=JSON.parse(text)}catch{send(400,{});return}
      requests.at(-1).body=body
      if(role!=='SUPER_ADMIN'){send(403,{code:'FORBIDDEN'});return}
      if(Object.keys(body).sort().join()!=='version,visibility'||Object.keys(body.visibility||{}).length!==23||!ids.every(id=>typeof body.visibility[id]==='boolean')||!Number.isSafeInteger(body.version)||body.version<0){send(400,{code:'E_INVALID_MENU_VISIBILITY'});return}
      if(!body.visibility.dashboard||!body.visibility.configuracoes||mode==='locked'){send(400,{code:'E_MENU_LOCKED'});return}
      if(mode==='forbidden'){send(403,{code:'FORBIDDEN'});return}
      if(body.version!==config.version){send(409,{code:'E_MENU_VERSION_CONFLICT',currentVersion:config.version});return}
      const persist=()=>{config={...config,visibility:body.visibility,version:config.version+1,updatedAt:'2026-10-20T12:00:00.000Z',updatedBy:operator.id}}
      if(mode==='pending') await new Promise(r=>release=r)
      persist()
      if(mode==='conflict-after'){send(409,{code:'E_MENU_VERSION_CONFLICT',currentVersion:config.version});return}
      if(mode==='conflict-other'){config={...config,version:config.version+1,visibility:{...all(),contas:false}};send(409,{code:'E_MENU_VERSION_CONFLICT',currentVersion:config.version});return}
      if(mode==='uncertain'){send(503,{code:'SYNTHETIC_LOST_RESPONSE'});return}
      if(mode==='malformed'){send(200,{unexpected:true});return}
      send(200,{data:config});return
    }
  }
  // Other prototype routes may load, but cannot cause any business mutation.
  send(404,{code:'SYNTHETIC_ROUTE_NOT_FOUND'})
})
server.listen(4321,'127.0.0.1',()=>console.log('Synthetic-only Menu Visibility API: http://127.0.0.1:4321'))
