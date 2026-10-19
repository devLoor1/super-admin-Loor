import { createServer } from 'node:http'
import { RECORD_A, RECORD_B, wire } from './fixtures/whitelabel-mutation-mocks.mjs'

// Local browser-QA interception only. No upstream client, credentials, database or disk writes.
// Run with Vite's API base http://127.0.0.1:4319/api. Never imported by the application.
let rows, mode, roles, requests
const reset = () => { rows=[wire(RECORD_A),wire(RECORD_B)];mode='success';roles=['SUPER_ADMIN'];requests=[] }
reset()
const server=createServer(async(req,res)=>{
  res.setHeader('Access-Control-Allow-Origin','*')
  res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type, X-Correlation-ID')
  res.setHeader('Access-Control-Allow-Methods','GET, POST, PATCH, OPTIONS')
  res.setHeader('Content-Type','application/json')
  const url=new URL(req.url,'http://127.0.0.1:4319')
  const send=(status,body)=>{res.statusCode=status;res.end(JSON.stringify(body))}
  if(req.method==='OPTIONS'){res.statusCode=204;res.end();return}
  if(url.pathname==='/__mock/reset'){reset();send(200,{reset:true});return}
  if(url.pathname==='/__mock/mode') {mode=url.searchParams.get('value')||'success';roles=mode==='read-only'?['READ_ONLY']:['SUPER_ADMIN'];send(200,{mode});return}
  if(url.pathname==='/__mock/state'){send(200,{mode,requests,rows:rows.map(r=>({id:r.id,name:r.name,slug:r.slug,isActive:r.isActive}))});return}
  requests.push({method:req.method,path:url.pathname})
  if(req.method==='GET'&&url.pathname==='/api/auth/me'){send(200,{id:'mock-operator',name:'Mock Operator',email:'qa@example.invalid',roles});return}
  if(req.method==='GET'&&url.pathname==='/api/whitelabels'){
    const search=url.searchParams.get('search')?.toLowerCase()||''
    const filtered=rows.filter(r=>r.name.toLowerCase().includes(search)||r.slug.includes(search))
    const page=Number(url.searchParams.get('page')||1), perPage=Number(url.searchParams.get('perPage')||10)
    send(200,{data:filtered.slice((page-1)*perPage,page*perPage),meta:{page,perPage,total:filtered.length,lastPage:Math.max(1,Math.ceil(filtered.length/perPage))}});return
  }
  const detail=/^\/api\/whitelabels\/(\d+)$/.exec(url.pathname)
  if(req.method==='GET'&&detail){const row=rows.find(r=>String(r.id)===detail[1]);send(row?200:404,row||{code:'E_WHITELABEL_NOT_FOUND'});return}
  if((req.method==='POST'&&url.pathname==='/api/whitelabels')||(req.method==='PATCH'&&detail)){
    let text='';for await(const chunk of req)text+=chunk
    let body;try{body=JSON.parse(text)}catch{send(400,{code:'E_VALIDATION'});return}
    const keys=Object.keys(body).sort().join(',')
    if(keys!==(req.method==='POST'?'baseUrl,name,slug':'name')){send(400,{code:'E_VALIDATION'});return}
    requests.at(-1).body=body
    if(mode==='read-only'||mode==='forbidden'){send(403,{code:'FORBIDDEN'});return}
    if(mode==='duplicate'){send(409,{code:'E_SLUG_TAKEN'});return}
    if(mode==='validation'){send(400,{message:['name must be longer than 2 characters']});return}
    if(mode==='missing'){send(404,{code:'E_WHITELABEL_NOT_FOUND'});return}
    let row
    if(req.method==='POST'){
      if(rows.some(r=>r.slug===body.slug)){send(409,{code:'E_SLUG_TAKEN'});return}
      const id=Math.max(41,...rows.map(r=>r.id))+1
      row={...wire(RECORD_A),...body,id,idKey:String(id),domain:new URL(body.baseUrl).hostname,isActive:true,status:'active',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};rows.push(row)
    }else{
      row=rows.find(r=>String(r.id)===detail[1]);if(!row){send(404,{code:'E_WHITELABEL_NOT_FOUND'});return}
      row.name=body.name;row.updatedAt=new Date().toISOString()
    }
    if(mode==='uncertain'){send(503,{code:'MOCK_RESPONSE_LOST'});return}
    send(req.method==='POST'?201:200,{data:row});return
  }
  send(404,{code:'MOCK_ROUTE_NOT_FOUND'})
})
server.listen(4319,'127.0.0.1',()=>console.log('Synthetic-only Whitelabel API: http://127.0.0.1:4319'))
