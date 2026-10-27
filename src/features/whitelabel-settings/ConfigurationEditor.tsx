import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { Dialog } from '../../components/ui/Dialog'
import { OutlineButton } from '../../components/ui/OutlineButton'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { getSessionVersion, subscribeSession, useSessionOperator } from '../../lib/authSession'
import { getSettingsRead, type SettingsRead } from './settingsReadApi'
import { changeAt, cloneJson, compatibleConfig, CONFIG_DEFINITIONS, configValueError, sameJson, type ConfigCell, type ConfigOrigin, type Control, type Json } from './configurationContract'
import { CONFIG_MESSAGES, configurationLocked, getConfigurationAttempt, reconcileConfiguration, subscribeConfiguration, writeConfiguration } from './configurationClient'
import { beginNextSettingsWrite, executeSettingsReset, executeSettingsWrite, getSettingsWriteAttempt, reconcileSettingsWrite, settingsWriteKey, settingsWriteLocked, subscribeSettingsWrites } from './settingsWriteClient'
import { normalizeSettingValue, settingsFieldBaseline, settingsFieldLabel, settingsTextLimit, type SettingsField, type SettingValue } from './settingsWriteContract'
import { ConfigurationPreview } from './ConfigurationPreview'
import { configurationDisplayValue } from '../whitelabel-emails/emailBrandingDisplay'
import s from './ConfigurationStudio.module.css'

export type EditorState = {dirty:boolean;busy:boolean}
type Props = {id:string;data:SettingsRead;onReload:()=>void;onState:(state:EditorState)=>void}
export function ConfigInput({control,value,onChange,disabled}: {control:Control;value:Json|undefined;onChange:(value:Json)=>void;disabled:boolean}) {
  const id=useId(),shown=typeof value==='string'||typeof value==='number'?value:''
  return <label className={s.field} htmlFor={id}>{control.label}
    {control.kind==='boolean'?<select id={id} disabled={disabled} value={typeof value==='boolean'?String(value):''} onChange={e=>onChange(e.target.value==='true')}><option value="" disabled>Não informado</option><option value="true">Sim</option><option value="false">Não</option></select>
      :control.kind==='select'?<select id={id} disabled={disabled} value={typeof value==='string'?value:''} onChange={e=>onChange(e.target.value)}><option value="" disabled>Não informado</option>{control.options?.map(option=><option key={option}>{option}</option>)}</select>
      :control.kind==='number'?<input id={id} type="number" step="any" min={control.min} max={control.max} disabled={disabled} value={shown} onChange={e=>onChange(e.target.value===''?null:Number(e.target.value))}/>
      :control.kind==='color'?<div className={s.colorRow}><input aria-label={`Paleta: ${control.label}`} type="color" disabled={disabled} value={typeof value==='string'&&/^#[\da-f]{6}$/i.test(value)?value:'#334155'} onChange={e=>onChange(e.target.value)}/><input id={id} aria-label={control.label} disabled={disabled} value={shown} placeholder="#RRGGBB" maxLength={7} onChange={e=>onChange(e.target.value)}/></div>
      :control.kind==='text'&&(control.max??240)>150?<textarea id={id} rows={3} disabled={disabled} value={shown} maxLength={control.max} onChange={e=>onChange(e.target.value)}/>
      :<input id={id} disabled={disabled} value={shown} type={control.kind==='url'?'url':'text'} maxLength={control.max} onChange={e=>onChange(e.target.value)}/>}
    {value===undefined?<small>Ausente neste valor. Não será preenchido automaticamente ao salvar.</small>:value===null?<small>Valor explícito null; será preservado até você editá-lo.</small>:null}
  </label>
}
export function OriginDetails({origin,cell}:{origin:ConfigOrigin;cell:string}) {
  return <details className={s.provenance}><summary>Origem e comportamento ao salvar</summary><p>{origin.stored?'Substituição própria armazenada.':origin.source==='default'?'Padrão herdado, sem substituição.':'Sem substituição nem padrão retornado.'}</p><p>Uma célula por solicitação: <code>{cell}</code>. Propriedades não editadas são preservadas. A conferência prévia reduz conflitos, sem bloqueio atômico no servidor.</p></details>
}
export function CompositeConfigurationEditor({id,data,cell,onReload,onState,screen,renderPreview}:{cell:ConfigCell;screen?:string;renderPreview?:(value:Json,saved:boolean)=>ReactNode}&Props) {
  const [baseline,setBaseline]=useState(data.configuration[cell]!)
  const [draft,setDraft]=useState<Json>(()=>cloneJson(baseline.stored?baseline.storedValue:baseline.effectiveValue))
  const [editing,setEditing]=useState(false),[saved,setSaved]=useState(true),[narrow,setNarrow]=useState<'edit'|'preview'>('edit')
  const [reset,setReset]=useState(false),[error,setError]=useState(''),[refreshing,setRefreshing]=useState(false)
  const [acknowledgedStale,setAcknowledgedStale]=useState<ReturnType<typeof getConfigurationAttempt>>(undefined)
  const [,update]=useState(0),version=useSyncExternalStore(subscribeSession,getSessionVersion,getSessionVersion)
  const operator=useSessionOperator(),controller=useRef<AbortController|null>(null)
  useEffect(()=>subscribeConfiguration(()=>update(n=>n+1)),[])
  useEffect(()=>()=>controller.current?.abort(),[])
  const attempt=getConfigurationAttempt(id,cell),locked=configurationLocked(attempt),busy=refreshing||attempt?.phase==='checking'||attempt?.phase==='sending'
  const current=baseline.stored?baseline.storedValue:baseline.effectiveValue
  const dirty=editing&&(!sameJson(current,draft)||!baseline.stored)
  useEffect(()=>{onState({dirty,busy});return()=>onState({dirty:false,busy:false})},[dirty,busy,onState])
  const canWrite=operator?.roles.includes('SUPER_ADMIN')===true,definition=CONFIG_DEFINITIONS[cell],valid=configValueError(cell,draft)
  const supported=compatibleConfig(cell,current)
  const fields=definition.fields.filter(field=>!screen||field.path[1]===screen)
  async function save(value:Json|undefined){
    if(!canWrite||locked||busy||value!==undefined&&valid)return
    setError('');controller.current=new AbortController()
    try{await writeConfiguration(id,cell,baseline,value,version,controller.current.signal);if(getConfigurationAttempt(id,cell)?.phase==='confirmed'){setEditing(false);onReload()}}
    catch{setError('Não foi possível concluir a solicitação. Nenhum reenvio automático será feito.')}
    setReset(false)
  }
  async function refresh(){
    if(busy)return
    setRefreshing(true);setError('');controller.current=new AbortController()
    try{const next=(await getSettingsRead(id,controller.current.signal)).configuration[cell];if(!next||getSessionVersion()!==version||controller.current.signal.aborted)throw Error('scope');setBaseline(next);setDraft(cloneJson(next.stored?next.storedValue:next.effectiveValue));setEditing(false);setSaved(true);setAcknowledgedStale(attempt);setError('Rascunho descartado e referência atualizada. Inicie uma nova edição sobre o valor atual do servidor.')}
    catch{setError('A referência não pôde ser atualizada.')}
    finally{setRefreshing(false)}
  }
  async function reconcile(){
    if(!canWrite||busy)return
    setRefreshing(true);setError('')
    try{await reconcileConfiguration(id,cell,version);if(getSessionVersion()===version&&getConfigurationAttempt(id,cell)?.phase==='confirmed'){setEditing(false);setSaved(true);onReload()}}
    catch{setError('Consulta indisponível. A gravação continua bloqueada.')}
    finally{setRefreshing(false)}
  }
  return <><div className={s.mobileSwitch}><button aria-pressed={narrow==='edit'} onClick={()=>setNarrow('edit')}>Editor</button><button aria-pressed={narrow==='preview'} onClick={()=>setNarrow('preview')}>Prévia</button></div><div className={s.split}>
    <div className={s.editor} data-active={narrow==='edit'}><div className={s.sectionLead}><h4>{definition.title}</h4><p>{definition.description}</p></div>
      {!editing&&canWrite&&!locked&&<OutlineButton onClick={()=>{setDraft(cloneJson(supported?current:definition.initial));setEditing(true);setSaved(false)}} disabled={current!==null&&!supported}>{supported?'Editar configuração':current===null?'Preparar configuração própria':'Versão não suportada'}</OutlineButton>}
      {editing&&!supported&&<p className={s.note}>Proposta inicial explícita. Estes valores ainda não foram salvos e não representam um padrão retornado pelo servidor.</p>}
      {!supported&&current!==null&&<p role="alert">A versão recebida não é compatível com este editor. O valor original será preservado.</p>}
      {(editing||supported)&&<fieldset className={s.fieldset} disabled={!editing||!canWrite||locked||busy}><legend className="visually-hidden">Campos de {definition.title}</legend>{fields.map(control=><ConfigInput key={control.path.join('/')} control={control} value={configurationDisplayValue(cell,draft,control.path)} disabled={!editing||!canWrite||locked||busy} onChange={next=>{setDraft(value=>changeAt(value,control.path,next));setSaved(false)}}/>)}</fieldset>}
      {editing&&valid&&<p role="alert" className={s.error}>{valid}</p>}<OriginDetails origin={baseline} cell={cell}/>
      {attempt&&attempt!==acknowledgedStale&&<p role="status">{CONFIG_MESSAGES[attempt.phase]}{attempt.status?` HTTP ${attempt.status}.`:''}</p>}{error&&<p role="status">{error}</p>}
      {attempt?.phase==='stale'&&attempt!==acknowledgedStale&&<OutlineButton disabled={busy} onClick={()=>void refresh()}>Descartar rascunho e atualizar referência</OutlineButton>}
      {canWrite&&['uncertain','readback_matches'].includes(attempt?.phase??'')&&<OutlineButton disabled={busy} onClick={()=>void reconcile()}>Consultar resultado por GET</OutlineButton>}
    </div><div className={s.preview} data-active={narrow==='preview'}><div className={s.previewMode}><button aria-pressed={!saved} onClick={()=>setSaved(false)}>Rascunho</button><button aria-pressed={saved} onClick={()=>setSaved(true)}>Salvo</button></div>{renderPreview?renderPreview(saved||!editing?baseline.effectiveValue:draft,saved||!editing):<ConfigurationPreview data={{...data,configuration:{...data.configuration,[cell]:baseline}}} cell={cell} override={editing?{cell,value:draft}:null} saved={saved} screen={screen}/>}</div>
  </div><footer className={s.footer}><span>{dirty?'Alterações não salvas.':canWrite?'Sem alteração pendente.':'Consulta autorizada. Edição requer SUPER_ADMIN.'}</span>{canWrite&&<div><OutlineButton disabled={!editing||busy||locked} onClick={()=>{setEditing(false);setDraft(cloneJson(current));setSaved(true)}}>Descartar</OutlineButton><OutlineButton disabled={!baseline.stored||busy||locked} onClick={()=>setReset(true)}>Remover substituição</OutlineButton><PrimaryButton disabled={!dirty||!!valid||busy||locked} onClick={()=>void save(draft)}>Salvar configuração</PrimaryButton></div>}</footer>
  {reset&&<Dialog title="Remover substituição?" description={definition.title} onClose={()=>setReset(false)} footer={<><OutlineButton onClick={()=>setReset(false)}>Cancelar</OutlineButton><PrimaryButton disabled={busy||locked} onClick={()=>void save(undefined)}>Confirmar remoção</PrimaryButton></>}><p>Remove somente a substituição desta configuração. O padrão retornado pelo servidor ou a ausência serão restaurados; nenhuma cópia do padrão será gravada.</p></Dialog>}</>
}

/** Contextual presentation over the unchanged SET-01 transport and invariants. */
export function ScalarConfigurationEditor({id,data,field,onReload,onState}:Props&{field:SettingsField}) {
  const [baseline]=useState(()=>settingsFieldBaseline(data,field)),version=useSyncExternalStore(subscribeSession,getSessionVersion,getSessionVersion),operator=useSessionOperator()
  const initial:SettingValue=baseline.value.state==='value'?baseline.value.value:field.startsWith('features.')?false:field==='login.bullets'?['','','']:''
  const [value,setValue]=useState(initial),[editing,setEditing]=useState(false),[saved,setSaved]=useState(true),[reset,setReset]=useState(false),[narrow,setNarrow]=useState<'edit'|'preview'>('edit'),[error,setError]=useState(''),[refreshing,setRefreshing]=useState(false)
  const [,update]=useState(0),controller=useRef<AbortController|null>(null)
  useEffect(()=>subscribeSettingsWrites(()=>update(n=>n+1)),[])
  useEffect(()=>()=>controller.current?.abort(),[])
  const attempt=getSettingsWriteAttempt(settingsWriteKey(id,field),version),busy=refreshing||!!attempt&&['checking','sending','reconciling'].includes(attempt.phase),locked=settingsWriteLocked(attempt),dirty=editing&&(!sameJson(value,initial)||!baseline.provenance.stored)
  useEffect(()=>{onState({dirty,busy});return()=>onState({dirty:false,busy:false})},[dirty,busy,onState])
  let valid=true;try{normalizeSettingValue(field,value)}catch{valid=false}
  const canWrite=operator?.roles.includes('SUPER_ADMIN')===true
  async function save(remove=false){
    if(!canWrite||locked||busy||!remove&&!valid)return
    setError('');controller.current=new AbortController()
    try{if(remove)await executeSettingsReset({tenantId:id,field,baseline},version,controller.current.signal,[field]);else await executeSettingsWrite({tenantId:id,field,baseline,value},version,controller.current.signal,[field]);if(getSettingsWriteAttempt(settingsWriteKey(id,field),version)?.phase==='confirmed'){setEditing(false);onReload()}}
    catch{setError('Solicitação não concluída; não será reenviada automaticamente.')}setReset(false)
  }
  async function reconcile(){
    if(!canWrite||busy)return
    setRefreshing(true);setError('')
    try{await reconcileSettingsWrite(id,field,version,[field]);if(getSessionVersion()===version&&getSettingsWriteAttempt(settingsWriteKey(id,field),version)?.phase==='confirmed'){setEditing(false);setSaved(true);onReload()}}
    catch{setError('Consulta indisponível. A gravação continua bloqueada.')}
    finally{setRefreshing(false)}
  }
  return <><div className={s.mobileSwitch}><button aria-pressed={narrow==='edit'} onClick={()=>setNarrow('edit')}>Editor</button><button aria-pressed={narrow==='preview'} onClick={()=>setNarrow('preview')}>Prévia</button></div><div className={s.split}><div className={s.editor} data-active={narrow==='edit'}><div className={s.sectionLead}><h4>{settingsFieldLabel(field)}</h4><p>{field.startsWith('features.')?'Altera apenas a disponibilidade configurada, sem executar operações.':'Mensagem institucional da página de login.'}</p></div>
    {!editing&&canWrite&&<OutlineButton disabled={locked&&attempt?.phase!=='confirmed'} onClick={()=>{if(attempt?.phase==='confirmed')beginNextSettingsWrite(id,field,version,[field]);setEditing(true);setSaved(false)}}>Editar configuração</OutlineButton>}
    <fieldset className={s.fieldset} disabled={!editing||locked||busy}>{typeof value==='boolean'?<label className={s.field}><input type="checkbox" checked={value} onChange={e=>{setValue(e.target.checked);setSaved(false)}}/>{settingsFieldLabel(field)}</label>:Array.isArray(value)?value.map((v,i)=><label className={s.field} key={i}>Destaque {i+1}<input value={v} maxLength={settingsTextLimit(field)} onChange={e=>{setValue(value.map((item,n)=>n===i?e.target.value:item));setSaved(false)}}/></label>):<label className={s.field}>{settingsFieldLabel(field)}<textarea rows={field==='login.title'?2:4} value={value} maxLength={settingsTextLimit(field)} onChange={e=>{setValue(e.target.value);setSaved(false)}}/></label>}</fieldset>
    {editing&&!valid&&<p role="alert">Preencha os campos dentro dos limites, sem HTML ou dados de autenticação.</p>}<OriginDetails cell={field} origin={baseline.provenance}/>
    {attempt&&<p role="status">{attempt.phase==='confirmed'?'HTTP 200 e leitura confirmada.':attempt.phase==='stale'?'O valor mudou no servidor. Descarte este rascunho e recarregue para revisar a nova referência.':attempt.phase==='uncertain'||attempt.phase==='readback_matches'?'Resultado não confirmado. Gravações bloqueadas; consulte por GET.':busy?'Solicitação em andamento. Aguarde a leitura de confirmação.':'A solicitação não foi confirmada.'}</p>}{error&&<p role="alert">{error}</p>}
    {canWrite&&['uncertain','readback_matches'].includes(attempt?.phase??'')&&<OutlineButton disabled={busy} onClick={()=>void reconcile()}>Consultar por GET</OutlineButton>}
    {attempt?.phase==='stale'&&!editing&&<OutlineButton disabled={busy} onClick={onReload}>Recarregar referência por GET</OutlineButton>}
    </div><div className={s.preview} data-active={narrow==='preview'}><div className={s.previewMode}><button aria-pressed={!saved} onClick={()=>setSaved(false)}>Rascunho</button><button aria-pressed={saved} onClick={()=>setSaved(true)}>Salvo</button></div><ConfigurationPreview data={data} cell={field} override={editing?{cell:field,value}:null} saved={saved}/></div></div>
    <footer className={s.footer}><span>{dirty?'Alterações não salvas.':'Configuração lida do servidor.'}</span>{canWrite&&<div><OutlineButton disabled={!editing||busy||locked} onClick={()=>{setValue(initial);setEditing(false);setSaved(true)}}>Descartar</OutlineButton><OutlineButton disabled={!baseline.provenance.stored||busy||locked} onClick={()=>setReset(true)}>Remover substituição</OutlineButton><PrimaryButton disabled={!dirty||!valid||busy||locked||attempt?.phase==='stale'} onClick={()=>void save()}>Salvar configuração</PrimaryButton></div>}</footer>
    {reset&&<Dialog title="Remover substituição?" description={settingsFieldLabel(field)} onClose={()=>setReset(false)} footer={<><OutlineButton onClick={()=>setReset(false)}>Cancelar</OutlineButton><PrimaryButton disabled={busy||locked} onClick={()=>void save(true)}>Confirmar remoção</PrimaryButton></>}><p>O valor volta ao padrão herdado ou à ausência, conforme o servidor. Não altera outras configurações.</p></Dialog>}</>
}
