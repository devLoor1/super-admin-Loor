import { useCallback, useState } from 'react'
import { Dialog } from '../../components/ui/Dialog'
import { OutlineButton } from '../../components/ui/OutlineButton'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { useUnsavedChangesGuard } from '../../app/useUnsavedChangesGuard'
import { CONFIG_DEFINITIONS, isConfigCell, type ConfigCell, type ConfigOrigin } from './configurationContract'
import { CompositeConfigurationEditor, ScalarConfigurationEditor, type EditorState } from './ConfigurationEditor'
import { PlatformAssetEditor } from './PlatformAssetEditor'
import { ConfigurationPreview } from './ConfigurationPreview'
import { isSettingsField, settingsFieldLabel, SETTINGS_FIELDS } from './settingsWriteContract'
import { APP_AUTH_GROUPS, APP_ENTRY_GROUPS } from './appContentRead'
import { configHref, type ConfigArea } from './configRoute'
import type { SettingsRead } from './settingsReadApi'
import s from './ConfigurationStudio.module.css'

const groups:{id:string;title:string;cells:string[]}[]=[
  {id:'login',title:'Login',cells:['login.title','login.subtitle','login.bullets','login.entry_presentation','login.layout_preset','login.brand_panel_text_color','login.main_area_image']},
  {id:'register',title:'Cadastro',cells:['register.content','register.entry_presentation','register.main_area_image']},
  {id:'quick_profile',title:'Completar dados',cells:['quick_profile.theme','quick_profile.entry_presentation','quick_profile.main_area_image']},
  {id:'wallet',title:'Carteira',cells:['dashboard.components']},
  {id:'offers',title:'Ofertas',cells:['offers.presentation']},
  {id:'terminology',title:'Terminologia',cells:['terminology.config']},
  {id:'features',title:'Funcionalidades',cells:SETTINGS_FIELDS.filter(cell=>cell.startsWith('features.'))},
]
const appGroups=[{id:'app_entry',title:'Acesso e cadastro',cells:['app_entry.content']},{id:'app_authenticated',title:'Área autenticada',cells:['app_authenticated.content']},{id:'terminology',title:'Terminologia',cells:['terminology.config']}]
const label=(cell:string)=>isConfigCell(cell)?CONFIG_DEFINITIONS[cell].title:isSettingsField(cell)?settingsFieldLabel(cell):cell
function AssetPane({id,data,cell,origin,onReload,onState,dirty}:{id:string;data:SettingsRead;cell:ConfigCell;origin:ConfigOrigin;onReload:()=>void;onState:(state:EditorState)=>void;dirty:boolean}){
  const [narrow,setNarrow]=useState<'edit'|'preview'>('edit'),[imageDraft,setImageDraft]=useState<string|null|undefined>(undefined)
  return <><div className={s.mobileSwitch}><button aria-pressed={narrow==='edit'} onClick={()=>setNarrow('edit')}>Editor</button><button aria-pressed={narrow==='preview'} onClick={()=>setNarrow('preview')}>Prévia</button></div><div className={s.split}><div className={s.editor} data-active={narrow==='edit'}><PlatformAssetEditor id={id} cell={cell} baseline={origin} onReload={onReload} onState={onState} onPreview={setImageDraft}/></div><div className={s.preview} data-active={narrow==='preview'}><ConfigurationPreview data={data} cell={cell} saved={!dirty} imageDraft={dirty?imageDraft:undefined}/></div></div></>
}
export function ConfigurationStudio({id,data,area,selectedCell,onReload}:{id:string;data:SettingsRead;area:ConfigArea;selectedCell?:string;onReload:()=>void}) {
  const available=area==='app'?appGroups:groups,defaultCell=area==='app'?'app_entry.content':'login.title'
  const cell=selectedCell??defaultCell,group=available.find(group=>group.cells.includes(cell))
  const [state,setState]=useState<EditorState>({dirty:false,busy:false}),[screen,setScreen]=useState('')
  const onState=useCallback((next:EditorState)=>setState(current=>current.dirty===next.dirty&&current.busy===next.busy?current:next),[])
  const guard=useUnsavedChangesGuard(state.dirty||state.busy,()=>setState({dirty:false,busy:false}))
  const appScreens=cell==='app_entry.content'?APP_ENTRY_GROUPS:cell==='app_authenticated.content'?APP_AUTH_GROUPS:[]
  const currentScreen=appScreens.find(item=>item.id===screen)?.id??appScreens[0]?.id
  const origin=isConfigCell(cell)?data.configuration[cell]:undefined
  return <section className={s.studio} aria-label={area==='app'?'Editor do Platform App':'Editor da Plataforma'}>
    <header className={s.heading}><div><span className={s.eyebrow}>{area==='app'?'Platform App':'Plataforma'}</span><h2>{area==='app'?'Conteúdo do aplicativo':'Experiência do investidor'}</h2><p>Edite no contexto da página e compare o rascunho com a configuração salva.</p></div><span className={state.dirty?s.draftBadge:s.savedBadge}>{state.dirty?'Alterações não salvas':'Leitura do servidor'}</span></header>
    <div className={s.workbench}><nav className={s.areaNav} aria-label="Páginas e configurações"><span>{area==='app'?'ÁREAS DO APLICATIVO':'PÁGINAS E RECURSOS'}</span>{available.map(item=><a key={item.id} href={configHref(id,area,item.cells[0])} aria-current={group?.id===item.id?'page':undefined}>{item.title}<span aria-hidden="true">›</span></a>)}<p>O Whitelabel permanece identificado na navegação.</p></nav>
      <div className={s.workspace}>{!group?<div role="alert" className={s.editor}><h3>Configuração não disponível nesta área</h3><p>Escolha uma das páginas ao lado.</p></div>:<>
        <div className={s.workspaceTitle}><div><h3>{group.title}</h3><p>{label(cell)}</p></div></div>
        <nav className={s.contextTabs} aria-label={`Configurações de ${group.title}`}>{group.cells.map(item=><a key={item} href={configHref(id,area,item)} aria-current={cell===item?'page':undefined}>{item.endsWith('.entry_presentation')?'Aparência':item.endsWith('.main_area_image')?'Imagem':label(item)}</a>)}</nav>
        {appScreens.length>0&&<label className={`${s.field} ${s.screenSelector}`}>Tela do aplicativo<select value={currentScreen} onChange={e=>setScreen(e.target.value)}>{appScreens.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select><small>A alteração de tela mantém o rascunho da mesma configuração.</small></label>}
        {isSettingsField(cell)?data.provenance[cell]?<ScalarConfigurationEditor key={cell} id={id} data={data} field={cell} onReload={onReload} onState={onState}/>:<p className={s.editor}>Proveniência não fornecida. Não é seguro editar este valor.</p>:isConfigCell(cell)&&origin?cell.endsWith('.main_area_image')?<AssetPane key={cell} id={id} data={data} cell={cell} origin={origin} onReload={onReload} onState={onState} dirty={state.dirty}/>:<CompositeConfigurationEditor key={cell} id={id} data={data} cell={cell} screen={currentScreen} onReload={onReload} onState={onState}/>:<p className={s.editor}>O servidor não retornou proveniência para esta configuração. Nenhum valor será inventado.</p>}
      </>}</div>
    </div>
    {guard.pending&&<Dialog title={state.busy?'Aguarde a solicitação':'Descartar rascunho?'} description="A navegação muda o contexto de edição." onClose={guard.stay} footer={<><OutlineButton onClick={guard.stay}>Continuar aqui</OutlineButton><PrimaryButton disabled={state.busy} onClick={guard.discardAndContinue}>Descartar e continuar</PrimaryButton></>}><p>{state.busy?'A gravação já começou. Aguarde o resultado para evitar perder o estado de recuperação.':'As alterações locais não salvas serão descartadas. Nenhuma configuração salva será alterada.'}</p></Dialog>}
  </section>
}
