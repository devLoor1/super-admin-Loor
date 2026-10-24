import { ApiError } from '../../../../lib/api'
import { authenticatedGet } from '../../../../lib/apiClient'
import { parseOpportunityDetail, type OpportunityDetail } from '../opportunityApi'

// Official SA-BE-001 contract, CP86aa366. Narrow projection: no raw helper emails/provider data.
export const validId = (v: string) => /^[1-9]\d{0,15}$/.test(v) && Number.isSafeInteger(Number(v))
export const isBag = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v)
export const invalid = () => new ApiError(422, { code: 'OPPORTUNITY_INPUT_INVALID' })
const malformed = () => new ApiError(200, {}, { kind: 'malformed' })
function id(v: unknown) { if (typeof v !== 'number' || !Number.isSafeInteger(v) || v <= 0) throw malformed(); return String(v) }
export type HelperKind = 'entrepreneurs' | 'segments' | 'resource-utilizations' | 'contracts' | 'investor-profiles'
export type Choice = { id: string; label: string; whitelabelId: string; code?: string; profileFilled?: boolean }
export type Helpers = Record<HelperKind, Choice[]>
export function parseHelper(raw: unknown, tenant: string, kind: HelperKind): Choice[] {
  if (!validId(tenant) || !isBag(raw) || !Array.isArray(raw.data)) throw malformed()
  const rows = raw.data.map(v => {
    if (!isBag(v) || id(v.whitelabelId) !== tenant) throw malformed()
    const key = id(v.id), label = kind === 'entrepreneurs' ? v.fullName : kind === 'investor-profiles' ? v.title : v.name
    if (label !== null && typeof label !== 'string') throw malformed()
    if (kind === 'entrepreneurs' && typeof v.personalInformationFilled !== 'boolean') throw malformed()
    if (kind === 'resource-utilizations' && (typeof v.code !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(v.code))) throw malformed()
    return { id:key, whitelabelId:tenant, label:typeof label === 'string' && label.trim() ? label.trim().slice(0,256) : `Registro #${key}`,
      ...(kind === 'entrepreneurs' ? { profileFilled:v.personalInformationFilled as boolean } : {}), ...(kind === 'resource-utilizations' ? { code:v.code as string } : {}) }
  })
  if (new Set(rows.map(r => r.id)).size !== rows.length || kind === 'resource-utilizations' && new Set(rows.map(r => r.code)).size !== rows.length) throw malformed()
  return rows
}
export async function getHelpers(tenant: string, signal?: AbortSignal): Promise<Helpers> {
  if (!validId(tenant)) throw invalid()
  const kinds: HelperKind[] = ['entrepreneurs','segments','resource-utilizations','contracts','investor-profiles']
  return Object.fromEntries(await Promise.all(kinds.map(async kind => [kind,parseHelper(await authenticatedGet(`/opportunities/helpers/${kind}`,{query:{whitelabelId:tenant},signal}),tenant,kind)]))) as Helpers
}
export const REVIEW_FIELDS = ['name','business_name','about','description','segment_id','resource_utilization','image_id','promotional_video_url','whatsapp_group','company_cnpj','spe_cnpj','cpf','is_private'] as const
export type PatchKey = typeof REVIEW_FIELDS[number]
export type PatchValue = string | number | boolean | null
export const allowedFields = (status: string): readonly PatchKey[] => status === 'review' ? REVIEW_FIELDS : status === 'active' ? REVIEW_FIELDS.filter(k => k !== 'spe_cnpj' && k !== 'cpf') : []
const aliases: Partial<Record<PatchKey,string>> = { business_name:'businessName',image_id:'imageId',promotional_video_url:'promotionalVideoUrl',whatsapp_group:'whatsappGroup',company_cnpj:'companyCnpj',spe_cnpj:'speCnpj',is_private:'isPrivate' }
export type EditableOpportunity = OpportunityDetail & { values: Partial<Record<PatchKey,PatchValue>> }
export function parseEditable(raw: unknown, expectedId?: string, tenant?: string): EditableOpportunity {
  const detail = parseOpportunityDetail(raw)
  if (expectedId && detail.id !== expectedId || tenant && detail.whitelabelId !== tenant || !isBag(raw) || !isBag(raw.data)) throw malformed()
  const values: EditableOpportunity['values'] = {}, source = raw.data
  for (const key of REVIEW_FIELDS) {
    const alias = aliases[key], own = Object.hasOwn(source,key), other = alias && Object.hasOwn(source,alias)
    if (own && other && source[key] !== source[alias!]) throw malformed()
    if (!own && !other) continue
    const v = own ? source[key] : source[alias!]
    if (v !== null && (key === 'is_private' ? typeof v !== 'boolean' : key === 'image_id' || key === 'segment_id' ? typeof v !== 'number' || !Number.isSafeInteger(v) || v <= 0 : typeof v !== 'string')) throw malformed()
    values[key] = v as PatchValue
  }
  return { ...detail, values }
}
export async function getEditable(id: string, tenant?: string, signal?: AbortSignal) {
  if (!validId(id) || tenant !== undefined && !validId(tenant)) throw invalid()
  return parseEditable(await authenticatedGet(`/opportunities/${id}`,{signal}),id,tenant)
}
const requiredText = (v: unknown, max = 256) => { if (typeof v !== 'string' || !v.trim() || v.length > max) throw invalid(); return v.trim() }
export function decimal(v: string, min: number, max: number, places=4) {
  if (!(places === 0 ? /^\d+$/ : new RegExp(`^\\d+(?:[.,]\\d{1,${places}})?$`)).test(v)) throw invalid()
  const n=Number(v.replace(',','.')); if (!Number.isFinite(n) || n < min || n > max) throw invalid(); return n
}
/** Admin create contract uses integer BRL centavos; exact decimal parsing, no rounding. */
export function brlCents(v: string, min=100) {
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(v.trim())) throw invalid()
  const [whole,fraction='']=v.trim().replace(',','.').split('.'), n=Number(whole)*100+Number(fraction.padEnd(2,'0'))
  if (!Number.isSafeInteger(n) || n < min || n > 99_999_999_999) throw invalid()
  return n
}
export function documentNumber(v: string, type: 'cpf' | 'cnpj') {
  const s=v.replace(/[.\-/\s]/g,''); const size=type==='cpf'?11:14
  if (!new RegExp(`^\\d{${size}}$`).test(s) || /^(\d)\1+$/.test(s)) throw invalid()
  for(let extra=0;extra<2;extra++) { const n=size-2+extra; let sum=0
    for(let i=0;i<n;i++) sum+=Number(s[i])*(type==='cpf'?n+1-i:((n-1-i)%8)+2)
    const rem=sum%11, digit=rem<2?0:11-rem; if(Number(s[n])!==digit)throw invalid()
  }
  return s
}
function choose(rows: Choice[], key: string, code=false) { const found=rows.find(r=>(code?r.code:r.id)===key); if(!found)throw invalid(); return found }
function optionalUrl(v: string, youtube=false) { if(v==='')return null; let u:URL; try{u=new URL(v)}catch{throw invalid()}; if(!['http:','https:'].includes(u.protocol)||u.username||u.password||youtube&&!['youtube.com','www.youtube.com','youtu.be','m.youtube.com'].includes(u.hostname))throw invalid(); return v }
export type CreateDraft = {
  entrepreneurId:string; modality:string; isPrivate:string; name:string; businessName:string; about:string; description:string; cpf:string; speCnpj:string; segmentId:string; resourceCode:string; video:string
  maxGoal:string; minimum:string; warrantyAmount:string; warranty:string; allowedCpfs:string
  participation:string; profitability:string; frequency:string; basis:string; installments:string; graceYears:string; graceMonths:string; graceDays:string; paymentStart:string; singleInstallment:string
}
export function emptyCreateDraft(): CreateDraft { return Object.fromEntries(['entrepreneurId','modality','isPrivate','name','businessName','about','description','cpf','speCnpj','segmentId','resourceCode','video','maxGoal','minimum','warrantyAmount','warranty','allowedCpfs','participation','profitability','frequency','basis','installments','graceYears','graceMonths','graceDays','paymentStart','singleInstallment'].map(k=>[k,''])) as CreateDraft }
function booleanChoice(v:string) { if(v!=='true'&&v!=='false')throw invalid();return v==='true' }
function grace(years:string,months:string,days:string,positive=false) { if(!years&&!months&&!days)return undefined;const parts=[years,months,days].map(v=>decimal(v,0,Number.MAX_SAFE_INTEGER,0)); if(positive&&!parts.some(v=>v>0))throw invalid();return {years:parts[0],months:parts[1],days:parts[2]} }
function dateOnly(v:string) { if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v+'T00:00:00Z'))||new Date(v+'T00:00:00Z').toISOString().slice(0,10)!==v)throw invalid();return v }
export function createFields(d:CreateDraft,h:Helpers,tenant:string) {
  if(!validId(tenant)||Object.keys(h).some(k=>h[k as HelperKind].some(v=>v.whitelabelId!==tenant)))throw invalid()
  const owner=choose(h.entrepreneurs,d.entrepreneurId);if(owner.profileFilled!==true)throw invalid()
  if(!['debt','equity'].includes(d.modality)||booleanChoice(d.warranty))throw invalid() // No authoritative warranty catalog in this scope; qualified no-warranty variant only.
  const privateOffer=booleanChoice(d.isPrivate)
  const body={whitelabelId:Number(tenant),entrepreneurId:Number(owner.id),is_private:privateOffer,modality:d.modality,warranty:false,members:[],monetary:{max_goal:brlCents(d.maxGoal),min_investment_value:brlCents(d.minimum),warranty_amount:brlCents(d.warrantyAmount,0)},opportunity:{segment_id:Number(choose(h.segments,d.segmentId).id),resource_utilization:choose(h['resource-utilizations'],d.resourceCode,true).code!,name:requiredText(d.name),business_name:requiredText(d.businessName),about:requiredText(d.about,100_000),description:requiredText(d.description,100_000),cpf:documentNumber(d.cpf,'cpf'),spe_cnpj:documentNumber(d.speCnpj,'cnpj'),promotional_video_url:optionalUrl(d.video,true)}}
  const extra:Record<string,unknown>={}
  if(privateOffer) { const cpfs=d.allowedCpfs.split(/[\n,;]/).map(s=>s.trim()).filter(Boolean).map(v=>documentNumber(v,'cpf'));if(!cpfs.length||new Set(cpfs).size!==cpfs.length)throw invalid();extra.allowed_cpfs=cpfs }
  if(d.modality==='equity')extra.equity={participation:decimal(d.participation,0,99.9999)}
  else {
    if(!['mensal','bimestral','trimestral','semestral','anual','unica'].includes(d.frequency)||!['annual','monthly'].includes(d.basis))throw invalid()
    const period=grace(d.graceYears,d.graceMonths,d.graceDays)
    extra.debt={percentage_profitability:decimal(d.profitability,0,100),payment_frequency:d.frequency,profitability_basis:d.basis,total_installments:decimal(d.installments,1,600,0),...(period?{grace_period_detail:period}:{}),...(d.paymentStart?{payment_start_at:dateOnly(d.paymentStart)}:{}),...(d.singleInstallment?{single_installment:booleanChoice(d.singleInstallment)}:{})}
  }
  return {...body,...extra}
}
export function createPayload(d:CreateDraft,h:Helpers,tenant:string,banner:number,extras:number[]) {
  if(!Number.isSafeInteger(banner)||banner<=0||extras.length>3||extras.some(v=>!Number.isSafeInteger(v)||v<=0)||new Set([banner,...extras]).size!==extras.length+1)throw invalid()
  const fields=createFields(d,h,tenant)
  return {...fields,opportunity:{...fields.opportunity,image_id:banner},extra_images:[...extras]}
}
export function patchPayload(current:EditableOpportunity,changes:Record<string,unknown>,h:Helpers) {
  const allowed=allowedFields(current.status),body:Record<string,PatchValue>={}
  for(const [key,raw] of Object.entries(changes)) {
    if(!allowed.includes(key as PatchKey)||raw===undefined)throw invalid()
    const k=key as PatchKey;let value:PatchValue
    if(k==='image_id'||k==='segment_id') { if(typeof raw!=='number'||!Number.isSafeInteger(raw)||raw<=0)throw invalid();if(k==='segment_id')choose(h.segments,String(raw));value=raw }
    else if(k==='is_private') { if(typeof raw!=='boolean')throw invalid();value=raw }
    else if(k==='promotional_video_url'||k==='whatsapp_group') { if(raw!==null&&typeof raw!=='string')throw invalid();value=raw===null?null:k==='promotional_video_url'?optionalUrl(raw,true):raw }
    else {
      if(typeof raw!=='string')throw invalid();value=raw
      if(k==='name'||k==='business_name'){if(!value.trim()||value.length>255)throw invalid()}
      if(k==='resource_utilization'){value=requiredText(value,64);choose(h['resource-utilizations'],value,true)}
      // PATCH intentionally has the documented length rules, not create's checksum rules.
      if(k==='cpf'&&(value.length<11||value.length>14)||['spe_cnpj','company_cnpj'].includes(k)&&(value.length<14||value.length>18))throw invalid()
      if(k==='company_cnpj'&&value!==current.values.company_cnpj)throw invalid()
    }
    if(value!==current.values[k])body[k]=value
  }
  return body
}
export type ApprovalDraft={contract:string;profile:string;fee:string;opened:string;due:string;years:string;months:string;days:string}
export function approvalPayload(d:ApprovalDraft,h:Helpers,current:EditableOpportunity) {
  if(current.status!=='review')throw invalid()
  const body:Record<string,unknown>={contract_id:Number(choose(h.contracts,d.contract).id)}
  if(d.profile)body.investor_profile_id=Number(choose(h['investor-profiles'],d.profile).id)
  if(d.fee)body.loor_percent_fee=decimal(d.fee,0,99)
  if(d.opened)body.opened_at=dateOnly(d.opened)
  if(d.due)body.due_at=dateOnly(d.due)
  if(d.opened&&d.due&&d.due<=d.opened)throw invalid()
  const period=grace(d.years,d.months,d.days,true);if(period){if(current.modality!=='debt')throw invalid();body.grace_period=period}
  return body
}
export function reasonPayload(reason:string) {const value=reason.trim();if(value.length<20)throw invalid();return {reason:value} }
export function validateImage(file:File) { if(!['image/jpeg','image/png'].includes(file.type)||! /\.(jpe?g|png)$/i.test(file.name)||file.size<=0||file.size>20*1024*1024)throw invalid() }
