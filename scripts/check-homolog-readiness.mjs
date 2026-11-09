import assert from 'node:assert/strict'
import { opportunityWriteExclusions } from './reviewed-opportunity-write-boundary.mjs'
import { withoutSettingsReadiness } from './reviewed-settings-boundary.mjs'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { moduleLoader, root, reactUrl, renderUrl } from './operators-test-harness.mjs'
import { reviewedOperators, withoutOperators, withoutOperatorsEntry } from './reviewed-operators-boundary.mjs'
const {createElement:h}=await import(reactUrl),{renderToStaticMarkup:render}=await import(renderUrl)
globalThis.window={location:{hash:'#/settings/operators'},setTimeout,clearTimeout,matchMedia:()=>({matches:true,addEventListener(){},removeEventListener(){}})}
globalThis.document={hidden:false}
globalThis.__operatorRoles=['SUPER_ADMIN'];globalThis.__operatorRead={status:'loading'}
const authStub=`export const useSessionOperator=()=>({id:'synthetic',name:'QA',roles:globalThis.__operatorRoles});export const getOperator=useSessionOperator;export const getSessionVersion=()=>0;export const subscribeSession=()=>()=>{};export const logout=()=>{};export const getAccessToken=()=>null;export const handleUnauthorized=()=>{};`
const overrides={
  'src/lib/authSession.ts':authStub,
  'src/components/shell/AppShell.tsx':`import {createElement as h} from ${JSON.stringify(reactUrl)};export const AppShell=({children})=>h('main',null,children);`,
  'src/features/whitelabels/visuals/DotMatrixBackground.tsx':'export const DotMatrixBackground=()=>null;',
  'src/features/control-plane-operators/useOperators.ts':`export const useOperators=()=>({state:globalThis.__operatorRead,allowed:globalThis.__operatorRoles.includes('SUPER_ADMIN'),reload(){}});export const useOperatorDetail=useOperators;`,
}
let checks=0;async function check(name,fn){try{await fn();checks++}catch(cause){throw Error(name,{cause})}}
const realViews=['settings','dashboard','whitelabels','accounts','operation-investors','operation-investor','operation-entrepreneurs','operation-entrepreneur','operation-opportunities','operation-opportunity','operation-opportunity-new','operation-opportunity-edit','operation-company-list','operation-company','finance-investments','finance-investment','finance-payments','finance-payment','finance-wallets','finance-wallet','compliance-kyc','compliance-kyc-case','audit','audit-event','settings-menu-visibility','control-plane-operators','control-plane-operator']
const mockViews=['emails','finance','finance-modalities','finance-catalogs']
const id='c'+'a'.repeat(24)
for(const development of [false,true]){
  const load=moduleLoader({development,overrides}),p=await load('src/app/presentationAvailability.ts')
  for(const view of realViews)await check(`${development?'DEV':'production'} real route ${view} retained`,()=>assert.equal(p.viewAvailable(view),true))
  for(const view of mockViews)await check(`${development?'DEV':'production'} mock route ${view}`,()=>assert.equal(p.viewAvailable(view),development))
  const nav=[{id:'dashboard',href:'#/dashboard'},{id:'configuracoes',href:'#/settings/menu-visibility'},{id:'sistema',href:'#/system'},{id:'ajuda',href:'#/help'},{id:'plataformas',href:'#/whitelabels',children:[{id:'whitelabels',href:'#/whitelabels'},{id:'whitelabel-settings',href:'#/whitelabels/wl_proto_01/settings'},{id:'whitelabel-emails',href:'#/whitelabels/wl_proto_01/emails'}]},{id:'financeiro',href:'#/whitelabels/wl_proto_01/finance/gateways',children:[{id:'finance-gateways',href:'mock'},{id:'finance-modalities',href:'mock'},{id:'finance-catalogs',href:'mock'},{id:'finance-investments',href:'#/finance/investments'},{id:'finance-payments',href:'#/finance/payments'},{id:'finance-wallets',href:'#/finance/wallets'}]}]
  await check('actual readiness navigation transformation, immutable saved model',()=>{const before=JSON.stringify(nav),ready=p.readinessNavigation(nav);assert.equal(JSON.stringify(nav),before);if(development)assert.equal(ready,nav);else{assert.deepEqual(ready.map(i=>i.id),['dashboard','configuracoes','plataformas','financeiro']);assert.equal(ready[2].children.length,2);assert.equal(ready[2].children[1].href,'#/whitelabels/select/settings');assert.equal(ready[3].children.length,3);assert.equal(ready[3].href,'#/finance/investments')}})
  await check('mock tabs production hidden, local preserved',()=>assert.equal(p.readinessTabs([{value:'overview'},{value:'activity'},{value:'atividade'}]).length,development?3:1))
  const {TopHeader}=await load('src/components/shell/TopHeader.tsx')
  await check('actual rendered header command hygiene',()=>{const html=render(h(TopHeader,{title:'Operadores',location:'Configurações',navOpen:false,onOpenNav(){}}));assert.equal(html.includes('aria-label="Notificações"'),development);assert.equal(html.includes('role="search"'),development);assert.ok(html.includes('menu do usuário'))})
  const {DashboardPage}=await load('src/features/dashboard/DashboardPage.tsx')
  await check('actual rendered Dashboard placeholders/KPIs',()=>{const html=render(h(DashboardPage));assert.equal((html.match(/data-kpi=/g)||[]).length,development?5:4);assert.equal(html.includes('data-kpi="kyc"'),development);assert.equal(html.includes('Status operacional'),development)})
  const {OperatorsEntry,OperatorFeedback}=await load('src/features/control-plane-operators/OperatorUi.tsx'),{OperatorsListPage}=await load('src/features/control-plane-operators/OperatorsListPage.tsx'),{OperatorDetailPage}=await load('src/features/control-plane-operators/OperatorDetailPage.tsx')
  const api=await load('src/features/control-plane-operators/operatorApi.ts')
  const {AccountAccessActions}=await load('src/features/whitelabel-accounts/access/AccountAccessActions.tsx')
  for(const roles of [['SUPER_ADMIN'],['SUPPORT_ADMIN'],['READ_ONLY'],['COMPLIANCE_ADMIN']])for(const kind of ['investor','entrepreneur','admin'])await check('actual access action readiness, domain and role restrictions',()=>{
    globalThis.__operatorRoles=roles
    const detail={kind,record:{id:'3',whitelabelId:'4',accessState:'active'}},html=render(h(AccountAccessActions,{detail,tenantId:'4'}))
    assert.equal(html.includes('Pausar acesso'),kind!=='admin'&&roles.some(r=>['SUPER_ADMIN','SUPPORT_ADMIN'].includes(r)))
    assert.equal(render(h(AccountAccessActions,{detail,tenantId:'6'})),'')
  })
  const row=api.parseOperator({id,name:'Synthetic QA',email:'qa@example.invalid',status:'FUTURE',roles:['SUPER_ADMIN','READ_ONLY'],roleDetails:[{slug:'SUPER_ADMIN',name:'Administrator'},{slug:'READ_ONLY',name:'Consulta'}],lastLoginAt:null,createdAt:'2026-10-23T12:00:00Z',updatedAt:'2026-10-23T12:00:00Z',passwordHash:'DO_NOT_RENDER'})
  for(const roles of [['SUPER_ADMIN'],['READ_ONLY'],['COMPLIANCE_ADMIN'],['FINANCIAL_ADMIN'],['SUPPORT_ADMIN'],[]])await check('role-aware rendered discovery and direct-route data denial',()=>{
    globalThis.__operatorRoles=roles;globalThis.__operatorRead={status:'success',data:{rows:[row],page:1,perPage:20,total:1,lastPage:1}}
    const allowed=roles.includes('SUPER_ADMIN'),entry=render(h(OperatorsEntry)),list=render(h(OperatorsListPage,{rawQuery:''}));assert.equal(entry.includes('Consultar operadores'),allowed);assert.equal(list.includes('Synthetic QA'),allowed);assert.equal(list.includes('Acesso não permitido'),!allowed)
    globalThis.__operatorRead={status:'success',data:row};const detail=render(h(OperatorDetailPage,{id}));assert.equal(detail.includes('Synthetic QA'),allowed);assert.equal(detail.includes('Acesso não permitido'),!allowed)
  })
  globalThis.__operatorRoles=['SUPER_ADMIN']
  for(const state of [{status:'loading'},{status:'success',data:{rows:[],page:1,perPage:20,total:0,lastPage:1}},{status:'success',data:{rows:[row],page:1,perPage:20,total:1,lastPage:1}}])await check('real list states, no operational writes or raw secrets',()=>{globalThis.__operatorRead=state;const html=render(h(OperatorsListPage,{rawQuery:''}));assert.doesNotMatch(html,/Criar operador|Editar operador|Ativar|Desativar|Redefinir senha|Enviar convite|DO_NOT_RENDER|qa@example.invalid/);if(state.status==='success')assert.ok(html.includes(state.data.total===0?'Nenhum operador nesta página':'SUPER_ADMIN'));else assert.ok(html.includes('Carregando operadores'))})
  await check('null time, roles and neutral unknown status rendered',()=>{globalThis.__operatorRead={status:'success',data:row};const html=render(h(OperatorDetailPage,{id}));assert.ok(html.includes('Não registrado / indisponível'));assert.ok(html.includes('READ_ONLY'));assert.ok(html.includes('Status não reconhecido'));assert.doesNotMatch(html,/type="(?:text|email|password)"|DO_NOT_RENDER/)})
  const {ApiError}=await load('src/lib/api.ts')
  for(const status of [403,404,502])await check('truthful error render, no error → zero/fake success',()=>{const html=render(h(OperatorFeedback,{error:new ApiError(status,{}),retry(){}}));assert.equal(html.includes('Tentar novamente'),status>=500);assert.doesNotMatch(html,/0 operadores|Nenhum operador|Salvo com sucesso/)})
  await check('invalid Operator direct identity no data',()=>{globalThis.__operatorRead={status:'idle'};assert.ok(render(h(OperatorDetailPage,{id:'1'})).includes('Endereço inválido'))})
}
await check('exact later-delivery guards retain previous runtime byte-for-byte',async()=>{
  const git=(...a)=>execFileSync('git',a,{cwd:root,encoding:'utf8'}).replaceAll('\r\n','\n')
  const app=await readFile(resolve(root,'src/app/App.tsx'),'utf8'),menu=await readFile(resolve(root,'src/features/menu-visibility/MenuVisibilityPage.tsx'),'utf8')
  assert.equal(withoutOperators(app),git('show','9f4d696:src/app/App.tsx'));assert.equal(withoutOperatorsEntry(menu),git('show','9f4d696:src/features/menu-visibility/MenuVisibilityPage.tsx'))
  assert.throws(()=>withoutOperators(app+'\n// unrelated'))
  assert.throws(()=>withoutOperators(app.replace("import { OperatorsListPage }","import { OperatorsListPage, Extra }")))
  assert.throws(()=>withoutOperatorsEntry(menu+'\n// unrelated'))
  assert.equal(reviewedOperators('src/features/control-plane-operators/Unknown.ts'),false);assert.equal(reviewedOperators('src/lib/apiClient.ts'),false)
  for(const path of ['src/lib','src/components','src/features/dashboard','src/features/governance-audit','src/features/compliance-kyc','src/features/operation','src/features/finance-core','src/features/menu-visibility/menuRegistry.ts','src/features/menu-visibility/visibilityPolicy.ts','src/features/menu-visibility/visibilityResolver.ts','src/features/menu-visibility/menuVisibilityApi.ts','package.json','package-lock.json','netlify.toml','docs/homolog-readiness-hygiene-v1.md'])assert.equal(git('diff','9f4d696','--',path,...opportunityWriteExclusions()),'',path)
  assert.equal(withoutSettingsReadiness(await readFile(resolve(root,'src/app/presentationAvailability.ts'),'utf8')),git('show','9f4d696:src/app/presentationAvailability.ts'))
})
await check('durable actionable policy and instructions',async()=>{const policy=await readFile(resolve(root,'docs/homolog-readiness-policy.md'),'utf8'),agents=await readFile(resolve(root,'AGENTS.md'),'utf8');assert.match(agents,/homolog-readiness-policy.md/);assert.match(policy,/check-homolog-readiness.mjs/);assert.match(policy,/no automatic CI release-blocking gate/);assert.match(policy,/privacy|Privacy/);assert.match(agents,/Block promotion/)})
console.log(`Homolog readiness: ${checks} checks passed (actual rendered DEV + production semantics, synthetic roles/states)`)
