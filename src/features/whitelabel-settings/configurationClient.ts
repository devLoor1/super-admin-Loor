import { ApiError, apiRequest } from '../../lib/api'
import { getAccessToken, getOperator, getSessionVersion, handleUnauthorized } from '../../lib/authSession'
import { getSettingsRead, isSettingsTenantId } from './settingsReadApi'
import { cloneJson, configOrigin, configValueError, isConfigCell, record, sameJson, type ConfigCell, type ConfigOrigin, type Json } from './configurationContract'

export type ConfigAttempt={phase:'checking'|'sending'|'confirmed'|'stale'|'rejected'|'uncertain'|'readback_matches';operation:'save'|'reset';status?:number;correlationId?:string;deleted?:boolean;receiptConfirmed?:boolean;session:number}
const attempts=new Map<string,ConfigAttempt>(), recoveries=new Map<string,()=>Promise<boolean>>(), listeners=new Set<()=>void>()
export const configurationKey=(tenant:string,cell:ConfigCell)=>`${tenant}:${cell}`
export const configurationLocked=(a:ConfigAttempt|undefined)=>!!a&&['checking','sending','uncertain','readback_matches'].includes(a.phase)
export const getConfigurationAttempt=(tenant:string,cell:ConfigCell)=>attempts.get(configurationKey(tenant,cell))
export const subscribeConfiguration=(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn)}}
const publish=(key:string,a:ConfigAttempt)=>{attempts.set(key,a);for(const listener of listeners)listener()}
function authorize(tenant:string,cell:ConfigCell,session:number){
  if(!isSettingsTenantId(tenant)||!isConfigCell(cell))throw new ApiError(422,{code:'CONFIGURATION_INVALID'})
  if(!getOperator()?.roles.includes('SUPER_ADMIN'))throw new ApiError(403,{code:'FORBIDDEN'})
  const token=getAccessToken()
  if(!token||getSessionVersion()!==session)throw new ApiError(401,{code:'NO_SESSION'})
  return token
}
const metadata=(error:unknown)=>error instanceof ApiError?{status:error.status,...(error.correlationId&&/^[a-f0-9-]{36}$/i.test(error.correlationId)?{correlationId:error.correlationId}:{})}:{}
export async function writeConfiguration(tenant:string,cell:ConfigCell,baseline:ConfigOrigin,value:Json|undefined,session:number,signal?:AbortSignal){
  const token=authorize(tenant,cell,session),key=configurationKey(tenant,cell),operation=value===undefined?'reset':'save'
  const expected=value===undefined?undefined:cloneJson(value)
  if(expected!==undefined&&configValueError(cell,expected))throw new ApiError(422,{code:'CONFIGURATION_INVALID'})
  if([...attempts].some(([k,a])=>k.startsWith(`${tenant}:`)&&configurationLocked(a)))throw new ApiError(409,{code:'CONFIGURATION_LOCKED'})
  let attempt:ConfigAttempt={phase:'checking',operation,session}
  publish(key,attempt)
  try{
    const current=(await getSettingsRead(tenant,signal)).configuration[cell]
    if(!current||!sameJson(current,baseline)){publish(key,{...attempt,phase:'stale'});return}
    if(signal?.aborted||getAccessToken()!==token||getSessionVersion()!==session)throw new ApiError(401,{code:'NO_SESSION'})
    if(expected!==undefined&&baseline.stored&&sameJson(expected,baseline.storedValue)){publish(key,{...attempt,phase:'rejected'});return}
  }catch(error){publish(key,{...attempt,phase:'rejected',...metadata(error)});return}
  const [page,property]=cell.split('.')
  attempt={...attempt,phase:'sending'};publish(key,attempt)
  let receipt=false, resetOrigin:ConfigOrigin|undefined
  try{
    const raw=await apiRequest<unknown>(operation==='save'?`/whitelabels/${tenant}/settings`:`/whitelabels/${tenant}/settings/${encodeURIComponent(page)}/${encodeURIComponent(property)}/override`,{method:operation==='save'?'PUT':'DELETE',...(operation==='save'?{body:{page,key:property,value:expected}}:{}),token,signal,timeoutMs:25_000,successStatus:200})
    if(!record(raw)||!record(raw.data)||raw.data.page!==page||raw.data.key!==property)throw new ApiError(200,{}, {kind:'malformed'})
    if(operation==='save'){
      if(typeof raw.data.id!=='number'||raw.data.id<=0||!sameJson(raw.data.value,expected))throw new ApiError(200,{}, {kind:'malformed'})
    }else{
      if(typeof raw.data.deleted!=='boolean'||raw.data.stored!==false)throw new ApiError(200,{}, {kind:'malformed'})
      resetOrigin=configOrigin({...raw.data,storedValue:null});attempt={...attempt,deleted:raw.data.deleted}
    }
    receipt=true;attempt={...attempt,status:200,receiptConfirmed:true}
  }catch(error){
    attempt={...attempt,...metadata(error)}
    if(error instanceof ApiError&&error.status===401)handleUnauthorized(token,session)
    if(error instanceof ApiError&&error.kind==='http'&&[400,403,404,409,413,415,422].includes(error.status)){publish(key,{...attempt,phase:'rejected'});return}
  }
  recoveries.set(key,async()=>{
    authorize(tenant,cell,session)
    const current=(await getSettingsRead(tenant)).configuration[cell]
    return !!current&&(operation==='save'?current.stored&&sameJson(current.storedValue,expected)&&sameJson(current.effectiveValue,expected):!current.stored&&(!resetOrigin||sameJson(current,resetOrigin)))
  })
  try{if(signal?.aborted||getSessionVersion()!==session||getAccessToken()!==token)throw new Error('scope');const matches=await recoveries.get(key)!();publish(key,{...attempt,phase:matches?receipt?'confirmed':'readback_matches':'uncertain'})}
  catch{publish(key,{...attempt,phase:'uncertain'})}
}
/** Explicit GET reconciliation only; an uncertain receipt never becomes a confirmed write. */
export async function reconcileConfiguration(tenant:string,cell:ConfigCell,session:number){
  authorize(tenant,cell,session)
  const key=configurationKey(tenant,cell),attempt=attempts.get(key),recover=recoveries.get(key)
  if(!attempt||attempt.session!==session||!recover||!['uncertain','readback_matches'].includes(attempt.phase))return
  try{publish(key,{...attempt,phase:await recover()?attempt.receiptConfirmed?'confirmed':'readback_matches':'uncertain'})}catch{publish(key,{...attempt,phase:'uncertain'})}
}
export const CONFIG_MESSAGES:Record<ConfigAttempt['phase'],string>={checking:'Conferindo a configuração atual…',sending:'Solicitação enviada uma vez. Aguardando confirmação por GET…',confirmed:'Configuração salva e confirmada pelo servidor.',stale:'A configuração mudou no servidor. Atualize a referência antes de revisar sua alteração.',rejected:'O servidor não confirmou a alteração. Revise os campos e a referência.',uncertain:'Resultado incerto. Não repita a gravação; consulte o estado atual.',readback_matches:'GET corresponde ao esperado, mas a resposta da gravação não foi confirmada. Novas gravações continuam bloqueadas.'}
