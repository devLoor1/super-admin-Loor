import { ApiError, apiRequest } from '../../../../lib/api'
import { opportunityActionAvailable } from '../../../../app/presentationAvailability'
import { getAccessToken, getOperator, getSessionVersion, handleUnauthorized } from '../../../../lib/authSession'
import { getTenantWhitelabel } from '../../shared/whitelabelContext'
import { approvalPayload, createPayload, getEditable, getHelpers, invalid, isBag, parseEditable, patchPayload, reasonPayload, validId, validateImage, type ApprovalDraft, type CreateDraft, type EditableOpportunity } from './opportunityWriteContract'

export type Command =
  | {action:'create';tenantId:string;draft:CreateDraft;banner:number;extras:number[]}
  | {action:'patch';tenantId:string;id:string;baseline:EditableOpportunity;changes:Record<string,unknown>}
  | {action:'deny'|'archive';tenantId:string;id:string;reason:string}
  | {action:'approve';tenantId:string;id:string;draft:ApprovalDraft;providerEffectsAccepted:boolean}
export type Attempt = {phase:'checking'|'sending'|'reconciling'|'confirmed'|'readback_matches'|'uncertain'|'rejected'|'stale';action:string;opportunityId?:string;imageId?:number;status?:number;correlationId?:string;version:number}
const attempts=new Map<string,Attempt>(), recovery=new Map<string,()=>Promise<boolean>>(), listeners=new Set<()=>void>()
const lockedPhases=new Set(['checking','sending','reconciling','uncertain','confirmed','readback_matches'])
const foreignAttempt:Attempt={phase:'uncertain',action:'previous',version:-1}
export const attemptLocked=(a:Attempt|null|undefined)=>!!a&&lockedPhases.has(a.phase)
export const commandKey=(c:Command)=>c.action==='create'?`${c.tenantId}:create:${c.draft.entrepreneurId}`:`${c.tenantId}:${c.id}`
export function subscribeOpportunityAttempts(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener)}}
export function getOpportunityAttempt(key:string,version:number){const a=attempts.get(key);return !a?null:a.version===version?a:attemptLocked(a)?foreignAttempt:null}
/** A new deliberate command may start only after a previously confirmed result. Never clears uncertainty. */
export function beginNextOpportunityCommand(key:string,version:number){authorize(version);const a=attempts.get(key);if(!a||a.version!==version||a.phase!=='confirmed')throw new ApiError(409,{code:'ATTEMPT_LOCKED'});attempts.delete(key);recovery.delete(key);for(const l of listeners)l()}
function publish(key:string,a:Attempt){attempts.set(key,a);for(const l of listeners)l()}
function authorize(version:number,action='patch'){
  if(!opportunityActionAvailable(action))throw new ApiError(403,{code:'OPPORTUNITY_WRITES_NOT_RELEASED'})
  const token=getAccessToken();if(!token||version!==getSessionVersion())throw new ApiError(401,{code:'NO_SESSION'})
  if(!getOperator()?.roles.includes('SUPER_ADMIN'))throw new ApiError(403,{code:'WRITE_FORBIDDEN'})
  return token
}
const current=(version:number,token:string)=>version===getSessionVersion()&&token===getAccessToken()
const rejectedHttp=(e:unknown)=>e instanceof ApiError&&e.kind==='http'&&[400,403,404,422].includes(e.status)
function recordError(a:Attempt,e:unknown):Attempt{return {...a,...(e instanceof ApiError?{status:e.status,correlationId:e.correlationId}:{})}}
function compareValues(record:EditableOpportunity,body:Record<string,unknown>){return Object.entries(body).every(([k,v])=>record.values[k as keyof typeof record.values]===v)}
export async function executeOpportunity(input:Command,version:number,signal?:AbortSignal){
  const command=structuredClone(input)
  const token=authorize(version,command.action)
  if(signal?.aborted)throw new DOMException('Cancelled','AbortError')
  if(!['create','patch','approve','deny','archive'].includes(command.action)||!validId(command.tenantId)||command.action!=='create'&&!validId(command.id))throw invalid()
  const key=commandKey(command);if(attemptLocked(attempts.get(key)))throw new ApiError(409,{code:'ATTEMPT_LOCKED'})
  let a:Attempt={phase:'checking',action:command.action,version,...(command.action!=='create'?{opportunityId:command.id}:{})}
  publish(key,a)
  let body:Record<string,unknown>, baseline:EditableOpportunity|undefined
  try{
    if(command.action==='create'){
      const tenant=await getTenantWhitelabel(command.tenantId,signal);if(tenant.status!=='active')throw invalid()
      body=createPayload(command.draft,await getHelpers(command.tenantId,signal),command.tenantId,command.banner,command.extras)
    }else{
      baseline=await getEditable(command.id,command.tenantId,signal)
      if(command.action==='patch'){
        if(command.baseline.id!==command.id||command.baseline.whitelabelId!==command.tenantId||command.baseline.status!==baseline.status||Object.keys(command.changes).some(k=>command.baseline.values[k as keyof EditableOpportunity['values']]!==baseline!.values[k as keyof EditableOpportunity['values']])){publish(key,{...a,phase:'stale'});return}
        // The released about-only field has no catalog dependency. Wider DEV edits keep all helper checks.
        body=patchPayload(baseline,command.changes,await getHelpers(command.tenantId,signal));if(!Object.keys(body).length){publish(key,{...a,phase:'rejected'});return}
      }else{
        if(baseline.status!=='review')throw invalid()
        if(command.action==='approve'){if(!command.providerEffectsAccepted)throw invalid();body=approvalPayload(command.draft,await getHelpers(command.tenantId,signal),baseline)}
        else body=reasonPayload(command.reason)
      }
    }
    if(signal?.aborted||!current(version,token))throw new DOMException('Scope changed','AbortError')
    authorize(version,command.action)
  }catch(error){publish(key,recordError({...a,phase:'rejected'},error));return}
  // No optimistic-concurrency guarantee: the Backend has no version/idempotency contract.
  a={...a,phase:'sending'};publish(key,a)
  let accepted=false
  const path=command.action==='create'?'/opportunities':`/opportunities/${command.id}${command.action==='patch'?'':`/${command.action}`}`
  try{
    const raw=await apiRequest<unknown>(path,{method:command.action==='patch'?'PATCH':'POST',token,body,signal,timeoutMs:20_000,successStatus:command.action==='patch'?200:201})
    if(!current(version,token))throw new DOMException('Session changed','AbortError')
    // Capture a returned ID before deeper verification; never repeat a create to recover an ID.
    if(command.action==='create'&&isBag(raw)&&isBag(raw.data)&&typeof raw.data.id==='number'&&validId(String(raw.data.id))){a={...a,opportunityId:String(raw.data.id)};publish(key,a)}
    const result=isBag(raw)&&isBag(raw.data)?raw.data:null
    if(!result||typeof result.id!=='number')throw new ApiError(200,{}, {kind:'malformed'})
    const parsed=parseEditable(raw,a.opportunityId,command.tenantId)
    if(command.action==='create'&&parsed.entrepreneurId!==command.draft.entrepreneurId)throw invalid()
    if(command.action==='create'&&(parsed.status!=='review'||!compareValues(parsed,body!.opportunity as Record<string,unknown>)||parsed.isPrivate!==body!.is_private))throw invalid()
    if(command.action==='patch'&&(parsed.status!==baseline!.status||!compareValues(parsed,body!)))throw invalid()
    if((command.action==='deny'||command.action==='archive')&&(parsed.status!=='archived'||parsed.reasonForArchiving!==body!.reason))throw invalid()
    if(command.action==='approve'&&parsed.status!=='active')throw invalid()
    accepted=true
  }catch(error){
    a=recordError(a,error)
    if(error instanceof ApiError&&error.status===401)handleUnauthorized(token,version)
    if(current(version,token)&&rejectedHttp(error)){publish(key,{...a,phase:'rejected'});return}
  }
  if(signal?.aborted||!current(version,token)){publish(key,{...a,phase:'uncertain'});return}
  const opportunityId=a.opportunityId
  if(!opportunityId){publish(key,{...a,phase:'uncertain'});return}
  const expected=body!
  recovery.set(key,async()=>{
    const record=await getEditable(opportunityId,command.tenantId)
    if(!current(version,token))throw new DOMException('Session changed','AbortError')
    if(command.action==='create')return record.status==='review'&&record.entrepreneurId===command.draft.entrepreneurId&&compareValues(record,expected.opportunity as Record<string,unknown>)&&record.isPrivate===expected.is_private
    if(command.action==='patch')return record.status===baseline!.status&&compareValues(record,expected)
    return record.status===(command.action==='approve'?'active':'archived')&&(command.action==='approve'||record.reasonForArchiving===expected.reason)
  })
  publish(key,{...a,phase:'reconciling'})
  try{const matches=await recovery.get(key)!();publish(key,{...a,phase:matches?(accepted?'confirmed':'readback_matches'):'uncertain'})}
  catch{publish(key,{...a,phase:'uncertain'})}
}
/** Explicit GET only. Does not unlock an uncertain command or automatically resend it. */
export async function reconcileOpportunity(key:string,version:number){
  authorize(version);const a=attempts.get(key);if(!a||a.version!==version||!recovery.has(key)||['checking','sending','reconciling'].includes(a.phase))return
  try{const matches=await recovery.get(key)!();publish(key,{...a,phase:matches?'readback_matches':'uncertain'})}catch{publish(key,{...a,phase:'uncertain'})}
}
export async function uploadOpportunityImage(file:File,folder:'opportunities/banner'|'opportunities/extra_images',key:string,version:number,signal?:AbortSignal){
  validateImage(file);const token=authorize(version,'image')
  if(signal?.aborted)throw new DOMException('Cancelled','AbortError')
  if(!['opportunities/banner','opportunities/extra_images'].includes(folder)||!key.startsWith('image:'))throw invalid()
  if(attemptLocked(attempts.get(key)))throw new ApiError(409,{code:'IMAGE_ATTEMPT_LOCKED'})
  let a:Attempt={phase:'sending',action:'image',version};publish(key,a)
  const body=new FormData();body.append('image',file);body.append('folder',folder)
  try{
    const raw=await apiRequest<unknown>('/opportunities/helpers/images',{method:'POST',token,body,signal,timeoutMs:20_000,successStatus:201})
    if(!current(version,token))throw new DOMException('Session changed','AbortError')
    if(!isBag(raw)||!isBag(raw.data)||typeof raw.data.id!=='number'||!validId(String(raw.data.id)))throw new ApiError(201,{}, {kind:'malformed'})
    a={...a,phase:'confirmed',imageId:raw.data.id};publish(key,a);return raw.data.id
  }catch(error){if(error instanceof ApiError&&error.status===401)handleUnauthorized(token,version);publish(key,recordError({...a,phase:rejectedHttp(error)?'rejected':'uncertain'},error));throw error}
}
