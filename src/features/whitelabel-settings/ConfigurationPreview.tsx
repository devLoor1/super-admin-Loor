import { useEffect, useState } from 'react'
import { Check, LockKeyhole, Monitor, Smartphone } from 'lucide-react'
import { record, valueAt, type ConfigCell, type Json } from './configurationContract'
import { AppConfigurationPreview } from './AppConfigurationPreview'
import { businessText } from '../operation/shared/businessPresentation'
import { getPlatformAsset, assetReference } from './platformAssetClient'
import type { SettingsRead } from './settingsReadApi'
import s from './ConfigurationStudio.module.css'

const copy = (v: unknown, missing = 'Não configurado') => typeof v === 'string' && v.trim() ? businessText(v,4000)??'Conteúdo indisponível' : missing
const color = (v: unknown, fallback: string) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : fallback
const number = (v: unknown, fallback: number) => typeof v === 'number' && Number.isFinite(v) ? v : fallback
const surfaceColor = (v: unknown, opacity: unknown) => {
  const hex=color(v,'#ffffff'),alpha=Math.min(1,Math.max(.65,number(opacity,.94)))
  return `rgba(${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)},${alpha})`
}
const at = (v: Json, path: string) => valueAt(v, path.split('/'))
const readText = (field: {state:string;value?:unknown}) => field.state === 'value' ? field.value : null
export type PreviewOverride = { cell: string; value: Json } | null

/** Qualified display paths only. Unknown preserved extensions never enter the rendered tree. */
export function ConfigurationPreview({ data, cell, override = null, saved, imageDraft, screen }: {data:SettingsRead;cell:string;override?:PreviewOverride;saved:boolean;imageDraft?:string|null;screen?:string}) {
  const [mobile,setMobile] = useState(false)
  const page = cell.startsWith('register.') ? 'register' : cell.startsWith('quick_profile.') ? 'quick_profile' : 'login'
  const value = (key:ConfigCell):Json => !saved && override?.cell === key ? override.value : data.configuration[key]?.effectiveValue ?? null
  const scalar = (key:'login.title'|'login.subtitle'|'login.bullets') => !saved && override?.cell===key ? override.value : key==='login.title' ? readText(data.experience.title) : key==='login.subtitle' ? readText(data.experience.subtitle) : readText(data.experience.bullets)
  const imageConfig = value(`${page}.main_area_image`), ref = record(imageConfig) && imageConfig.enabled === true && assetReference(imageConfig.assetRef) ? imageConfig.assetRef : null
  const [asset,setAsset]=useState<{key:string;url:string|null;error:boolean}|null>(null)
  const assetKey = `${data.id}:${ref ?? ''}`
  useEffect(()=>{
    if(!ref)return
    const controller=new AbortController()
    void getPlatformAsset(data.id,ref,controller.signal).then(row=>{if(!controller.signal.aborted)setAsset({key:assetKey,url:row.url,error:false})}).catch(()=>{if(!controller.signal.aborted)setAsset({key:assetKey,url:null,error:true})})
    return()=>controller.abort()
  },[data.id,ref,assetKey])
  const currentImage = !saved && imageDraft !== undefined ? imageDraft : asset?.key===assetKey ? asset.url : null
  const tenantName=copy(readText(data.name),`Whitelabel ${data.id}`)
  let preview
  if(cell.startsWith('app_')) {
    preview=<AppConfigurationPreview value={value(cell as ConfigCell)} screen={screen} tenantName={tenantName}/>
  } else if(cell==='dashboard.components') {
    const config=value('dashboard.components'), items=record(config)&&Array.isArray(config.components)?config.components.filter(record).filter(item=>['wallet-kpis','wallet-opportunities','wallet-recent-investments'].includes(String(item.id))).sort((a,b)=>number(a.order,0)-number(b.order,0)):[]
    preview=<div className={s.surfacePreview}><h3>Carteira</h3>{items.filter(item=>item.visible===true).map(item=><section key={String(item.id)}><strong>{{'wallet-kpis':'Indicadores da carteira','wallet-opportunities':'Oportunidades disponíveis','wallet-recent-investments':'Investimentos recentes'}[String(item.id)]}</strong><div className={s.skeleton} aria-hidden="true"/><small>Área ilustrativa, sem valores financeiros</small></section>)}{!items.length&&<p>Composição não informada pelo servidor.</p>}</div>
  } else if(cell==='offers.presentation') {
    const config=value('offers.presentation'), compact=at(config,'catalogue/cardDensity')==='compact'
    preview=<div className={s.surfacePreview}><h3>Catálogo de oportunidades</h3><section style={{padding:compact?12:24}}><div className={s.coverSample} data-fit={String(at(config,'cover/fit'))} data-position={String(at(config,'cover/position'))}>Capa ilustrativa</div><h4>Oportunidade de exemplo</h4><p>Card {compact?'compacto':'confortável'}. Nenhum registro operacional.</p></section><h4>Detalhe público · {copy(at(config,'detail/headerLayout/public'))}</h4><div className={s.headerSample} data-layout={String(at(config,'detail/headerLayout/public'))}><span>Capa</span><strong>Título da oportunidade</strong></div><small>Carteira: cabeçalho {copy(at(config,'detail/headerLayout/wallet'))}</small></div>
  } else if(cell==='terminology.config') {
    const config=value('terminology.config')
    preview=<div className={s.surfacePreview}><h3>Vocabulário em contexto</h3>{['investmentPortfolio','investmentOffering','investorRole'].map(key=><section key={key}><strong>{copy(at(config,`values/${key}.label.plural`),'Padrão do consumidor')}</strong><p>{copy(at(config,`values/${key}.label.singular`),'Padrão do consumidor')}</p></section>)}</div>
  } else if(cell.startsWith('features.')) {
    const configured = !saved && override?.cell===cell ? override.value : data.features[cell.slice(9) as keyof typeof data.features]
    const enabled=typeof configured==='boolean'?configured:record(configured)&&configured.state==='value'?configured.value:null
    preview=<div className={s.surfacePreview}><LockKeyhole/><h3>Disponibilidade da funcionalidade</h3><p>{enabled===true?'Habilitada na configuração':enabled===false?'Desabilitada na configuração':'Não informada'}</p><p>O consumidor e as permissões determinam a disponibilidade final. Esta prévia não executa a funcionalidade.</p></div>
  } else if(cell==='email_branding.config') {
    const config=value('email_branding.config'),primary=record(config)?config.primary_color??config.primaryColor:null
    preview=<div className={s.emailFrame}><div className={s.mailCanvas}><div className={s.mailHeader} style={{background:color(primary,'#334155')}}>{tenantName}</div><div className={s.mailBody}><h3>Mensagem de exemplo</h3><p>Identidade visual dos e-mails transacionais.</p><div className={s.sampleCta} style={{background:color(primary,'#334155')}}>Ação do template · desativada</div><small>Logo externa é bloqueada nesta apresentação local. A prévia do template usa o renderer Core.</small></div></div></div>
  } else {
    const presentation=value(`${page}.entry_presentation`),quick=page==='quick_profile'?value('quick_profile.theme'):null,registration=value('register.content')
    const layout=at(presentation,'regions/brand/layoutPreset')??(page==='login'?value('login.layout_preset'):null)
    const brandText=at(presentation,'regions/brand/textColor')??(page==='login'?value('login.brand_panel_text_color'):record(quick)?quick.textColor:null)
    const title=page==='login'?scalar('login.title'):page==='register'?at(registration,'values/title'):record(quick)?quick.sideTitle:null
    const subtitle=page==='login'?scalar('login.subtitle'):page==='register'?at(registration,'values/introduction'):record(quick)?quick.sideSubtitle:null
    const bullets=page==='login'?scalar('login.bullets'):null
    const background=color(at(presentation,'regions/main/backgroundColor'),'#f8fafc')
    const surface=at(presentation,'regions/main/formSurface')
    preview=<div className={`${s.entryFrame} ${mobile?s.mobileFrame:''}`} data-layout={['side','top','hidden'].includes(String(layout))?String(layout):'side'} style={{background}}>
      {layout!=='hidden'&&<div className={s.brandPanel} style={{background:color(at(presentation,'regions/brand/backgroundColor')??(record(quick)?quick.backgroundColor:null),'#334155'),color:color(brandText,'#ffffff')}}><strong className={s.previewLogo}>{tenantName}</strong><h3>{copy(title)}</h3><p>{copy(subtitle)}</p>{Array.isArray(bullets)&&<ul>{bullets.filter(v=>typeof v==='string').slice(0,3).map((bullet,i)=><li key={i}><Check size={13}/>{copy(bullet)}</li>)}</ul>}</div>}
      <div className={s.formPanel} style={{color:color(at(presentation,'regions/main/textColor'),'#111827')}}>{currentImage&&<img className={s.entryImage} src={currentImage} referrerPolicy="no-referrer" alt="Imagem da área principal"/>}<div className={s.previewForm} style={record(surface)?{background:surface.enabled===false?'transparent':surfaceColor(surface.color,surface.opacity),borderRadius:number(surface.radius,16),padding:number(surface.padding,24),boxShadow:surface.shadow===false?'none':undefined}:undefined}><LockKeyhole size={18}/><h4>{page==='login'?'Acesse sua conta':page==='register'?copy(at(registration,'values/title'),'Crie sua conta'):'Complete seu perfil'}</h4><span>{page==='quick_profile'?'Nome completo':'E-mail'}</span><div className={s.sampleField}>Exemplo de apresentação</div><span>{page==='login'?'Senha':'Dados do cadastro'}</span><div className={s.sampleField}>••••••••</div>{page==='register'&&<small>{copy(at(registration,'values/auxiliaryText'))}</small>}<div className={s.sampleCta} style={{background:color(record(quick)?quick.primaryColor:null,'#334155')}}>{page==='login'?'Entrar':page==='register'?copy(at(registration,'values/submitLabel'),'Continuar'):'Continuar'}</div><small>Formulário ilustrativo · não interativo</small></div></div>
    </div>
  }
  return <><div className={s.previewHead}><div><strong>Prévia da experiência</strong><p>{saved?'Leitura autoritativa · estado salvo':'Rascunho · alterações não aplicadas'}</p></div><div className={s.segment}><button aria-pressed={!mobile} onClick={()=>setMobile(false)}><Monitor size={14}/>Desktop</button><button aria-pressed={mobile} onClick={()=>setMobile(true)}><Smartphone size={14}/>Mobile</button></div></div><div className={mobile?s.mobileFrame:undefined}>{preview}</div>{ref&&asset?.key===assetKey&&asset.error&&<p role="status">A imagem persistida não pôde ser carregada.</p>}<p className={s.previewFoot}>Prévia editorial baseada nos campos qualificados. Valores ausentes são indicados; a composição usa cores neutras de apresentação. Não comprova aplicação no site ou App publicado.</p></>
}
