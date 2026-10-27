import { ApiError } from '../../lib/api'
import { APP_AUTH_GROUPS, APP_ENTRY_GROUPS } from './appContentRead'

export type Json = null | string | number | boolean | Json[] | { [key: string]: Json }
export type JsonObject = { [key: string]: Json }
export const record = (v: unknown): v is JsonObject => v !== null && typeof v === 'object' && !Array.isArray(v) && [Object.prototype, null].includes(Object.getPrototypeOf(v))
export const CONFIG_CELLS = ['login.layout_preset', 'login.brand_panel_text_color', 'register.content', 'quick_profile.theme', 'login.entry_presentation', 'register.entry_presentation', 'quick_profile.entry_presentation', 'login.main_area_image', 'register.main_area_image', 'quick_profile.main_area_image', 'dashboard.components', 'offers.presentation', 'terminology.config', 'app_entry.content', 'app_authenticated.content', 'email_branding.config'] as const
export type ConfigCell = typeof CONFIG_CELLS[number]
export type ConfigOrigin = { stored: boolean; storedValue: Json; effectiveValue: Json; source: 'stored' | 'default' | 'absent'; version: string | null }
export type ConfigOrigins = Partial<Record<ConfigCell, ConfigOrigin>>
export const isConfigCell = (v: unknown): v is ConfigCell => typeof v === 'string' && CONFIG_CELLS.includes(v as ConfigCell)
const fail = () => new ApiError(422, { code: 'CONFIGURATION_INVALID' })

/** Bounded JSON only. Retain extensions in qualified public cells; never render them. */
export function cloneJson(value: unknown, depth = 0): Json {
  if (depth > 14) throw fail()
  if (value === null || typeof value === 'boolean') return value
  if (typeof value === 'string' && value.length <= 200_000) return value
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (Array.isArray(value) && value.length <= 500) return value.map(item => cloneJson(item, depth + 1))
  if (record(value) && Object.keys(value).length <= 500) {
    const result: JsonObject = {}
    for (const key of Object.keys(value)) {
      if (['__proto__', 'constructor', 'prototype'].includes(key) || key.length > 256) throw fail()
      const descriptor = Object.getOwnPropertyDescriptor(value, key)
      if (!descriptor || !('value' in descriptor)) throw fail()
      result[key] = cloneJson(descriptor.value, depth + 1)
    }
    return result
  }
  throw fail()
}
export function configOrigin(raw: unknown): ConfigOrigin {
  if (!record(raw) || typeof raw.stored !== 'boolean' || !['stored', 'default', 'absent'].includes(String(raw.source)) || !(raw.version === null || typeof raw.version === 'string' && raw.version.length > 0 && raw.version.length <= 512)) throw fail()
  const storedValue = cloneJson(raw.storedValue), effectiveValue = cloneJson(raw.effectiveValue)
  if (raw.stored ? raw.source !== 'stored' : storedValue !== null || raw.version !== null || raw.source === 'stored') throw fail()
  if (raw.source === 'absent' && effectiveValue !== null || raw.source === 'default' && effectiveValue === null) throw fail()
  return { stored: raw.stored, storedValue, effectiveValue, source: raw.source as ConfigOrigin['source'], version: raw.version }
}
export function readConfigOrigins(raw: unknown): ConfigOrigins {
  const result: ConfigOrigins = {}
  if (raw === undefined) return result
  if (!Array.isArray(raw) || raw.length > 200) throw fail()
  for (const item of raw) {
    if (!record(item)) throw fail()
    const cell = `${item.page}.${item.key}`
    if (!isConfigCell(cell)) continue
    if (Object.hasOwn(result, cell)) throw fail()
    result[cell] = configOrigin(item)
  }
  return result
}
export type Control = { path: string[]; label: string; kind: 'text' | 'color' | 'select' | 'boolean' | 'number' | 'url'; max?: number; min?: number; options?: readonly string[]; optional?: boolean }
export type ConfigDefinition = { title: string; description: string; capability?: string; locale?: string; fields: Control[]; initial: Json }
const text = (path: string, label: string, max = 240): Control => ({ path: path.split('/'), label, kind: 'text', max })
const webText = (path: string, label: string, max?: number): Control => ({ path: path.split('/'), label, kind: 'text', ...(max === undefined ? {} : { max }) })
const color = (path: string, label: string): Control => ({ path: path.split('/'), label, kind: 'color' })
const choice = (path: string, label: string, options: string[]): Control => ({ path: path.split('/'), label, kind: 'select', options })
const boolean = (path: string, label: string): Control => ({ path: path.split('/'), label, kind: 'boolean' })
const number = (path: string, label: string, min: number, max: number): Control => ({ path: path.split('/'), label, kind: 'number', min, max })
const entryFields: Control[] = [color('regions/brand/backgroundColor','Fundo do painel da marca'),color('regions/brand/textColor','Texto do painel da marca'),choice('regions/brand/layoutPreset','Posição do painel',['side','top','hidden']),color('regions/main/backgroundColor','Fundo da área principal'),color('regions/main/textColor','Texto da área principal'),boolean('regions/main/formSurface/enabled','Superfície do formulário'),color('regions/main/formSurface/color','Cor do formulário'),number('regions/main/formSurface/opacity','Opacidade do formulário',0.65,1),number('regions/main/formSurface/radius','Cantos do formulário (px)',0,28),number('regions/main/formSurface/padding','Espaçamento do formulário (px)',12,36),boolean('regions/main/formSurface/shadow','Sombra do formulário')]
const entryInitial = (page: string): Json => ({capabilityId:'platform.entry-journey.presentation',version:1,page,regions:{brand:{backgroundColor:'#211b45',textColor:'#ffffff',layoutPreset:'side'},main:{backgroundColor:'#f8fafc',textColor:'#111827',formSurface:{enabled:true,color:'#ffffff',opacity:0.94,radius:16,padding:24,shadow:true}}}})
const image = (): ConfigDefinition => ({title:'Imagem da área principal',description:'Imagem da entrada, com recorte central e margem/cantos de 16 px.',capability:'platform.main_area_image',fields:[],initial:{capabilityId:'platform.main_area_image',version:1,enabled:false,assetRef:null}})
const app = (authenticated: boolean): ConfigDefinition => {
  const groups = authenticated ? APP_AUTH_GROUPS : APP_ENTRY_GROUPS
  const capability = authenticated ? 'platform.app.authenticated-content' : 'platform.app.entry-content'
  return {title:authenticated?'App · área autenticada':'App · acesso e cadastro',description:'Conteúdo editorial do aplicativo. Campos de segurança e operações permanecem definidos pelo produto.',capability,locale:'pt-BR',fields:groups.flatMap(group=>group.fields.map(field=>({...text(`screens/${group.id}/${field.key}`,`${group.label} · ${field.label}`,field.maxLength),optional:true}))),initial:{capabilityId:capability,version:1,locale:'pt-BR',screens:{}}}
}
export const CONFIG_DEFINITIONS: Record<ConfigCell, ConfigDefinition> = {
  'login.layout_preset':{title:'Disposição da marca',description:'Posição do painel institucional na página de login.',fields:[choice('','Disposição',['side','top','hidden'])],initial:'side'},
  'login.brand_panel_text_color':{title:'Contraste do painel',description:'Cor do texto institucional do Login.',fields:[color('','Cor do texto')],initial:'#ffffff'},
  'register.content':{title:'Cadastro · conteúdo',description:'Textos editoriais da criação de conta; não altera validações nem aceite legal.',capability:'platform.entry-journey.registration-content',fields:[webText('values/title','Título',60),webText('values/introduction','Introdução',180),webText('values/auxiliaryText','Texto auxiliar',140),webText('values/submitLabel','Ação principal',40)],initial:{capabilityId:'platform.entry-journey.registration-content',version:1,values:{title:'',introduction:'',auxiliaryText:'',submitLabel:''}}},
  'quick_profile.theme':{title:'Completar dados · conteúdo e cores',description:'Apenas a etapa de perfil inicial. Não altera a identidade global da plataforma.',fields:[webText('sideTitle','Título'),webText('sideSubtitle','Subtítulo'),color('primaryColor','Cor principal'),color('backgroundColor','Fundo'),color('textColor','Texto')],initial:{sideTitle:'',sideSubtitle:'',primaryColor:'#7c6cf0',backgroundColor:'#211b45',textColor:'#ffffff'}},
  'login.entry_presentation':{title:'Login · apresentação',description:'Cores, disposição da marca e superfície do formulário de acesso.',capability:'platform.entry-journey.presentation',fields:entryFields,initial:entryInitial('login')},
  'register.entry_presentation':{title:'Cadastro · apresentação',description:'Cores, disposição da marca e superfície do formulário de cadastro.',capability:'platform.entry-journey.presentation',fields:entryFields,initial:entryInitial('register')},
  'quick_profile.entry_presentation':{title:'Completar dados · apresentação',description:'Aparência da etapa inicial de dados do investidor.',capability:'platform.entry-journey.presentation',fields:entryFields,initial:entryInitial('quick_profile')},
  'login.main_area_image':image(),'register.main_area_image':image(),'quick_profile.main_area_image':image(),
  'dashboard.components':{title:'Carteira · composição',description:'Ordem e visibilidade das seções. Nenhuma alteração em saldos ou investimentos.',fields:['wallet-kpis','wallet-opportunities','wallet-recent-investments'].flatMap((id)=>[boolean(`components/@${id}/visible`,`${id==='wallet-kpis'?'Indicadores':id==='wallet-opportunities'?'Oportunidades':'Investimentos recentes'} · visível`),number(`components/@${id}/order`,'Ordem',0,Number.MAX_SAFE_INTEGER)]),initial:{version:1,components:[{id:'wallet-kpis',visible:true,order:10},{id:'wallet-opportunities',visible:true,order:20},{id:'wallet-recent-investments',visible:true,order:30}]}},
  'offers.presentation':{title:'Ofertas · apresentação',description:'Composição visual do catálogo e dos detalhes, sem alterar oportunidades.',capability:'platform.offers.presentation',fields:[choice('catalogue/cardDensity','Densidade dos cards',['comfortable','compact']),choice('cover/fit','Ajuste da imagem',['cover','contain']),choice('cover/position','Posição da imagem',['center','top']),choice('detail/headerLayout/public','Cabeçalho público',['stacked','overlay']),choice('detail/headerLayout/wallet','Cabeçalho na carteira',['stacked','overlay'])],initial:{capabilityId:'platform.offers.presentation',version:1,catalogue:{cardDensity:'comfortable'},cover:{fit:'cover',position:'center'},detail:{headerLayout:{public:'stacked',wallet:'stacked'}}}},
  'terminology.config':{title:'Terminologia',description:'Vocabulário compartilhado pelas superfícies qualificadas Web e App.',capability:'platform.terminology',locale:'pt-BR',fields:['investmentPortfolio','investmentOffering','investorRole'].flatMap((key,index)=>['singular','plural'].map(form=>({...text(`values/${key}.label.${form}`,`${['Carteira','Oportunidade','Investidor'][index]} · ${form}`,240),optional:true}))),initial:{capabilityId:'platform.terminology',version:1,locale:'pt-BR',values:{}}},
  'app_entry.content':app(false),'app_authenticated.content':app(true),
  'email_branding.config':{title:'Identidade dos e-mails',description:'Cor e logo de mensagens transacionais. Não altera a marca global, favicon ou PWA.',fields:[{...color('primary_color','Cor principal'),optional:true},{path:['logo_url'],label:'URL pública da logo',kind:'url',optional:true,max:2048}],initial:{}},
}
export function valueAt(value: Json, path: string[]): Json | undefined {
  if (path.length===1 && path[0]==='') return value
  let item: Json | undefined = value
  for (const key of path) item=key.startsWith('@') && Array.isArray(item) ? item.find(v=>record(v)&&v.id===key.slice(1)) : record(item)?item[key]:undefined
  return item
}
/** Only the explicitly edited paths are changed; unknown extensions round-trip unchanged. */
export function changeAt(value: Json, path: string[], next: Json): Json {
  if (!path.length || path.length===1 && path[0]==='') return cloneJson(next)
  const [key,...tail]=path
  if (key.startsWith('@')) {
    if (!Array.isArray(value)) throw fail()
    let found=false
    const result=value.map(item=>{if(record(item)&&item.id===key.slice(1)){found=true;return changeAt(item,tail,next)}return cloneJson(item)})
    if(!found)throw fail()
    return result
  }
  if (value!==null && !record(value)) throw fail()
  const copy:JsonObject=record(value)?cloneJson(value) as JsonObject:{}
  copy[key]=changeAt(copy[key]??null,tail,next)
  return copy
}
export function compatibleConfig(cell:ConfigCell,value:Json):boolean {
  const def=CONFIG_DEFINITIONS[cell]
  if(cell==='login.layout_preset')return typeof value==='string'
  if(cell==='login.brand_panel_text_color')return typeof value==='string'
  if(!record(value))return false
  if(def.capability && (value.capabilityId!==def.capability || value.version!==1))return false
  if(def.locale && value.locale!==def.locale)return false
  if(cell.endsWith('.entry_presentation')&&value.page!==cell.split('.')[0])return false
  if(cell.endsWith('.entry_presentation')){
    if(!record(value.regions))return false
    for(const region of ['brand','main'])if(Object.hasOwn(value.regions,region)&&!record(value.regions[region]))return false
    if(record(value.regions.main)&&Object.hasOwn(value.regions.main,'formSurface')&&!record(value.regions.main.formSurface))return false
  }
  if((cell==='register.content'||cell==='terminology.config')&&!record(value.values))return false
  if(cell==='app_entry.content'||cell==='app_authenticated.content'){
    if(!record(value.screens))return false
    const groups=cell==='app_entry.content'?APP_ENTRY_GROUPS:APP_AUTH_GROUPS
    if(groups.some(group=>Object.hasOwn(value.screens as JsonObject,group.id)&&!record((value.screens as JsonObject)[group.id])))return false
  }
  if(cell==='offers.presentation'){
    for(const part of ['catalogue','cover','detail'])if(Object.hasOwn(value,part)&&!record(value[part]))return false
    if(record(value.detail)&&Object.hasOwn(value.detail,'headerLayout')&&!record(value.detail.headerLayout))return false
  }
  if(cell==='dashboard.components'&&(value.version!==1||!Array.isArray(value.components)))return false
  return true
}
export function configValueError(cell:ConfigCell,value:Json):string|null {
  if(value===null&&cell!=='login.layout_preset'&&cell!=='login.brand_panel_text_color')return null
  if(!compatibleConfig(cell,value))return 'Contrato ou versão incompatível. Nenhum valor será substituído.'
  for(const field of CONFIG_DEFINITIONS[cell].fields){
    const v=valueAt(value,field.path)
    // A whole-row edit must not inject defaults for untouched, absent fields.
    if(v===undefined&&record(value))continue
    if(field.optional&&v===null&&cell==='email_branding.config')continue
    if(field.kind==='boolean'){if(typeof v!=='boolean')return `${field.label}: selecione Sim ou Não.`;continue}
    if(field.kind==='number'){if(typeof v!=='number'||!Number.isFinite(v)||v<(field.min??0)||v>(field.max??Infinity))return `${field.label}: valor fora do intervalo.`;continue}
    if(typeof v!=='string')return `${field.label}: valor obrigatório.`
    if(field.kind==='color'&&!(cell==='email_branding.config'?/^#?[\da-f]{6}([\da-f]{2})?$/i.test(v.trim()):/^#[\da-f]{6}$/i.test(v)))return `${field.label}: use #RRGGBB.`
    if(field.kind==='select'&&!field.options?.includes(v))return `${field.label}: escolha uma opção válida.`
    if(field.kind==='text'){
      const webCopy=cell==='register.content'||cell==='quick_profile.theme'
      if(!v.trim()||(webCopy?v.trim().length:v.length)>(field.max??Infinity)||!webCopy&&(/[<>\p{Cc}\p{Cf}]/u.test(v)||/\{\{|\}\}|\$\{|%[a-z_]+%/i.test(v)))return `${field.label}: texto inválido ou acima do limite.`
      if(cell==='terminology.config'){
        const normalized=v.normalize('NFC').trim()
        if(!/^[\p{L}\p{M}\p{N}\p{Zs} .,'’()&/+:-]+$/u.test(normalized)||/(?:\b[a-z][a-z0-9+.-]*:\/\/|\bwww\.|\b(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}\b)/i.test(normalized)||Array.from(normalized).filter(character=>!/\p{M}/u.test(character)).length>40)return `${field.label}: use até 40 caracteres de texto, sem links ou marcação.`
      }
    }
    if(field.kind==='url'){try{const u=new URL(v);if(!['http:','https:'].includes(u.protocol)||u.username||u.password||v!==v.trim()||/[\p{Cc}\p{Cf}]/u.test(v))throw fail()}catch{return 'Logo: use URL HTTP ou HTTPS pública sem credenciais ou caracteres de controle.'}}
  }
  if(cell.endsWith('.main_area_image')){
    if(!record(value)||typeof value.enabled!=='boolean'||!(value.assetRef===null||typeof value.assetRef==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value.assetRef))||value.enabled&&!value.assetRef||Object.hasOwn(value,'url'))return 'Referência de imagem inválida.'
  }
  if(cell==='dashboard.components'&&record(value)&&Array.isArray(value.components)){
    const ids=new Set<string>()
    for(const component of value.components){
      if(!record(component)||typeof component.id!=='string'||!component.id.trim()||ids.has(component.id))return 'As seções devem ter identidades válidas e únicas.'
      ids.add(component.id)
      if(Object.hasOwn(component,'visible')&&typeof component.visible!=='boolean'||Object.hasOwn(component,'order')&&!(typeof component.order==='number'&&Number.isSafeInteger(component.order)&&component.order>=0))return 'Visibilidade ou ordem inválida.'
    }
    if(Object.hasOwn(value,'presentation')){
      if(!record(value.presentation)||Object.hasOwn(value.presentation,'density')&&!['comfortable','compact'].includes(String(value.presentation.density))||Object.hasOwn(value.presentation,'emphasis')&&!['balanced','opportunities'].includes(String(value.presentation.emphasis)))return 'Apresentação da carteira inválida.'
    }
  }
  return null
}
export const sameJson=(left:unknown,right:unknown):boolean=>{
  const stable=(v:unknown):string=>record(v)?`{${Object.keys(v).sort().map(k=>`${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`:Array.isArray(v)?`[${v.map(stable).join(',')}]`:JSON.stringify(v)
  return stable(left)===stable(right)
}
