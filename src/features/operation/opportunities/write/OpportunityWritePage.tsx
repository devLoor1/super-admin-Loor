import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { useUnsavedChangesGuard } from '../../../../app/useUnsavedChangesGuard'
import { Dialog } from '../../../../components/ui/Dialog'
import { OutlineButton } from '../../../../components/ui/OutlineButton'
import { PrimaryButton } from '../../../../components/ui/PrimaryButton'
import { ApiError } from '../../../../lib/api'
import { describeApiError } from '../../../../lib/apiErrors'
import { getSessionVersion, subscribeSession, useSessionOperator } from '../../../../lib/authSession'
import { useRemote } from '../../../../lib/useRemoteResource'
import { OperationShell } from '../../shared/OperationUi'
import { useWhitelabelOptions, useWhitelabelRecord } from '../../shared/whitelabelContext'
import { approvalPayload, allowedFields, createFields, emptyCreateDraft, getEditable, getHelpers, invalid, patchPayload, reasonPayload, validId, validateImage, type ApprovalDraft, type CreateDraft, type EditableOpportunity, type Helpers, type PatchKey } from './opportunityWriteContract'
import { attemptLocked, beginNextOpportunityCommand, commandKey, executeOpportunity, getOpportunityAttempt, reconcileOpportunity, subscribeOpportunityAttempts, uploadOpportunityImage, type Command } from './opportunityWriteClient'
import css from './OpportunityWrite.module.css'

type Mode='create'|'edit'
type Props={mode:Mode;opportunityId?:string}
const labels:Record<string,string>={name:'Nome da oportunidade',business_name:'Nome empresarial',about:'Sobre a oportunidade',description:'Descrição',promotional_video_url:'Vídeo promocional (YouTube)',whatsapp_group:'Grupo WhatsApp',cpf:'CPF do responsável',spe_cnpj:'CNPJ da SPE',company_cnpj:'CNPJ canônico da empresa'}
export function WriteFeedback({error,retry}:{error:unknown;retry?:()=>void}){if(error instanceof ApiError&&error.code==='OPPORTUNITY_INPUT_INVALID')return <div role="alert" className={css.feedback}><h2>Revise os dados antes de enviar</h2><p>Confira os campos obrigatórios, escolhas e formatos. Imagens: JPG/PNG, até 20 MiB cada, no máximo 3 extras. Esta validação é local; nenhuma solicitação foi enviada.</p></div>;const view=describeApiError(error,'os dados da oportunidade');return <div role="alert" className={css.feedback}><h2>{view.title}</h2><p>{view.description}</p>{view.correlationId&&<p>Correlação: {view.correlationId}</p>}{retry&&view.retryable&&<OutlineButton onClick={retry}>Tentar consulta novamente</OutlineButton>}</div>}
function Field({label,children}:{label:string;children:ReactNode}){return <label className={css.field}><span>{label}</span>{children}</label>}
function ChoiceSelect({label,value,onChange,options,disabled=false}:{label:string;value:string;onChange:(v:string)=>void;options:{value:string;label:string;disabled?:boolean}[];disabled?:boolean}){return <Field label={label}><select value={value} disabled={disabled} onChange={e=>onChange(e.target.value)}><option value="">Selecionar…</option>{options.map(o=><option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>)}</select></Field>}
const booleanOptions=[{value:'false',label:'Não'},{value:'true',label:'Sim'}]
function Card({title,children}:{title:string;children:ReactNode}){return <section className={css.card}><h2>{title}</h2><div className={css.grid}>{children}</div></section>}
export function OpportunityWritePage(props:Props){
  const roles=useSessionOperator()?.roles,version=useSyncExternalStore(subscribeSession,getSessionVersion,getSessionVersion)
  if(!roles?.includes('SUPER_ADMIN'))return <OperationShell section="opportunities" title="Oportunidades"><div role="alert">Acesso não permitido. Somente SUPER_ADMIN pode preparar comandos.</div></OperationShell>
  return <WriteScope key={`${version}:${props.mode}:${props.opportunityId??''}`} {...props} version={version}/>
}
function WriteScope({mode,opportunityId,version}:Props&{version:number}){
  const [editorState,setEditorState]=useState({dirty:false,locked:false}),[pendingTenant,setPendingTenant]=useState<string|null>(null)
  const [selected,setSelected]=useState(''),detail=useRemote(mode==='edit'&&opportunityId&&validId(opportunityId)?`write-detail:${version}:${opportunityId}`:null,s=>getEditable(opportunityId!,undefined,s))
  const tenant=mode==='edit'&&detail.state.status==='success'?detail.state.data.whitelabelId:selected
  const registry=useWhitelabelOptions(),record=useWhitelabelRecord(validId(tenant)?tenant:null)
  const helpers=useRemote(record.state.status==='success'?`write-helpers:${version}:${tenant}`:null,s=>getHelpers(tenant,s))
  return <OperationShell section="opportunities" title={mode==='create'?'Nova oportunidade':'Preparar edição'} trail={[mode==='create'?'Nova oportunidade':`Editar #${opportunityId}`]}>
    <a href={mode==='edit'?`#/operation/opportunities/${opportunityId}`:'#/operation/opportunities'}>Voltar para consulta</a>
    <p className={css.notice}>Candidato local pré-aceite. Validar somente com transporte sintético/interceptado. Nenhuma escrita real foi autorizada. Esta tela não é publicada em homolog.</p>
    {mode==='create'&&<div className={css.card}><ChoiceSelect label="Whitelabel do Control Plane" value={selected} disabled={editorState.locked} onChange={v=>{if(editorState.dirty)setPendingTenant(v);else setSelected(v)}} options={registry.state.status==='success'?registry.state.data.rows.filter(r=>validId(r.id)).map(r=>({value:r.id,label:`${r.name} · #${r.id}`,disabled:r.status!=='active'})):[]}/>{registry.state.status==='error'&&<WriteFeedback error={registry.state.error} retry={registry.reload}/>}</div>}
    {mode==='edit'&&(!opportunityId||!validId(opportunityId))?<p role="alert">Identificador de oportunidade inválido.</p>:detail.state.status==='error'?<WriteFeedback error={detail.state.error} retry={detail.reload}/>:mode==='edit'&&detail.state.status!=='success'?<p role="status">Consultando oportunidade…</p>:!tenant?<p>Selecione um Whitelabel real para preparar a criação.</p>:record.state.status==='error'?<WriteFeedback error={record.state.error} retry={record.reload}/>:helpers.state.status==='error'?<WriteFeedback error={helpers.state.error} retry={helpers.reload}/>:record.state.status!=='success'||helpers.state.status!=='success'?<p role="status">Consultando contexto e catálogos autoritativos…</p>:<div key={tenant}>
      <p className={css.context}>Whitelabel #{tenant} · {record.state.data.name}</p>
      <Editor key={`${tenant}:${mode}`} mode={mode} version={version} tenant={tenant} helpers={helpers.state.data} initial={detail.state.status==='success'?detail.state.data:undefined} onState={setEditorState}/>
    </div>}
    {pendingTenant!==null&&<Dialog title="Trocar Whitelabel e descartar rascunho?" description="Os campos não são transferidos entre tenants. Nenhuma alteração de negócio será enviada." onClose={()=>setPendingTenant(null)} footer={<><OutlineButton onClick={()=>setPendingTenant(null)}>Continuar editando</OutlineButton><OutlineButton onClick={()=>{setEditorState({dirty:false,locked:false});setSelected(pendingTenant);setPendingTenant(null)}}>Descartar e trocar</OutlineButton></>}>A troca inicia um novo contexto autoritativo.</Dialog>}
  </OperationShell>
}
function Editor({mode,tenant,version,helpers:h,initial:seed,onState}:{mode:Mode;tenant:string;version:number;helpers:Helpers;initial?:EditableOpportunity;onState:(value:{dirty:boolean;locked:boolean})=>void}){
  const [initial,setInitial]=useState(seed)
  const [draft,setDraft]=useState<CreateDraft>(emptyCreateDraft),[changes,setChanges]=useState<Record<string,unknown>>({}),[banner,setBanner]=useState<File|null>(null),[extras,setExtras]=useState<File[]>([])
  const [imageIds,setImageIds]=useState<Record<string,number>>({}),images=useRef<Record<string,number>>({}),[imageUncertain,setImageUncertain]=useState(false)
  const [busy,setBusy]=useState(false),busyRef=useRef(false),[error,setError]=useState<unknown>(null),[modal,setModal]=useState<'create'|'patch'|'deny'|'archive'|'approve'|null>(null),[reason,setReason]=useState('')
  const [approval,setApproval]=useState<ApprovalDraft>({contract:'',profile:'',fee:'',opened:'',due:'',years:'',months:'',days:''}),[providerAccepted,setProviderAccepted]=useState(false)
  const [epoch,setEpoch]=useState(0),uploadKeys=useRef<Record<string,string>>({})
  const scope=useRef<AbortController|null>(null)
  useEffect(()=>{const controller=new AbortController();scope.current=controller;return()=>controller.abort()},[])
  const key=mode==='create'?`${tenant}:create:${draft.entrepreneurId}`:`${tenant}:${initial!.id}`
  const attempt=useSyncExternalStore(subscribeOpportunityAttempts,()=>getOpportunityAttempt(key,version),()=>null)
  const locked=busy||imageUncertain||attemptLocked(attempt),editable=mode==='create'||!!initial&&allowedFields(initial.status).length>0
  const dirty=Object.keys(changes).length>0||Object.values(draft).some(Boolean)||!!banner||extras.length>0
  useEffect(()=>{onState({dirty:dirty&&attempt?.phase!=='confirmed',locked:locked||Object.keys(imageIds).length>0})},[dirty,attempt?.phase,locked,imageIds,onState])
  const guard=useUnsavedChangesGuard(dirty&&attempt?.phase!=='confirmed',()=>{})
  const cancelRef=useRef<HTMLButtonElement>(null)
  function set(k:keyof CreateDraft,v:string){setDraft(prev=>({...prev,[k]:v}));setError(null)}
  function edit(k:PatchKey,v:unknown){setChanges(prev=>({...prev,[k]:v}));setError(null)}
  function fileChoice(files:FileList|null,extra=false){try{const rows=Array.from(files??[]);if(extra&&rows.length>3)throw invalid();rows.forEach(validateImage);if(extra)setExtras(rows);else setBanner(rows[0]??null);for(const k of Object.keys(uploadKeys.current))if(extra?k.startsWith('extra-'):k==='banner')delete uploadKeys.current[k];for(const k of Object.keys(images.current))if(extra?k.startsWith('extra-'):k==='banner')delete images.current[k];setImageIds({...images.current});setError(null)}catch(e){setError(e)}}
  const choice=(rows:Helpers[keyof Helpers],code=false)=>rows.map(r=>({value:code?r.code!:r.id,label:`${r.label} · #${r.id}`,disabled:r.profileFilled===false}))
  const input=(label:string,k:keyof CreateDraft,type='text')=><Field label={label}><input type={type} value={draft[k]} inputMode={type==='text'&&['maxGoal','minimum','warrantyAmount','profitability','participation'].includes(k)?'decimal':undefined} onChange={e=>set(k,e.target.value)}/></Field>
  function validate(next:typeof modal){
    if(next==='create'){createFields(draft,h,tenant);if(!banner)throw invalid();validateImage(banner);extras.forEach(validateImage)}
    if(next==='patch'){patchPayload(initial!,changes,h);if(banner)validateImage(banner)}
    if(next==='deny'||next==='archive')reasonPayload(reason)
    if(next==='approve'){approvalPayload(approval,h,initial!);if(!providerAccepted)throw invalid()}
  }
  async function uploaded(file:File,slot:string,extra=false){if(images.current[slot])return images.current[slot];const uploadKey=uploadKeys.current[slot]??(uploadKeys.current[slot]=`image:${tenant}:${crypto.randomUUID()}`)
    try{const id=await uploadOpportunityImage(file,extra?'opportunities/extra_images':'opportunities/banner',uploadKey,version,scope.current?.signal);images.current={...images.current,[slot]:id};setImageIds({...images.current});return id}
    catch(e){if(getOpportunityAttempt(uploadKey,version)?.phase==='uncertain')setImageUncertain(true);throw e}
  }
  async function confirm(){
    if(busyRef.current||locked||!modal)return
    try{validate(modal)}catch(e){setError(e);return}
    busyRef.current=true;setBusy(true);setError(null)
    try{
      let command:Command
      if(modal==='create'){const id=await uploaded(banner!,'banner'),ids=[];for(let i=0;i<extras.length;i++)ids.push(await uploaded(extras[i],`extra-${i}`,true));command={action:'create',tenantId:tenant,draft:{...draft},banner:id,extras:ids}}
      else if(modal==='patch'){const updated={...changes};if(banner)updated.image_id=await uploaded(banner,'banner');command={action:'patch',tenantId:tenant,id:initial!.id,baseline:initial!,changes:updated}}
      else if(modal==='approve')command={action:'approve',tenantId:tenant,id:initial!.id,draft:{...approval},providerEffectsAccepted:providerAccepted}
      else command={action:modal,tenantId:tenant,id:initial!.id,reason}
      if(commandKey(command)!==key)throw invalid()
      await executeOpportunity(command,version,scope.current?.signal)
      const state=getOpportunityAttempt(key,version)
      if(state?.phase==='confirmed'){if(mode==='edit'&&state.opportunityId)setInitial(await getEditable(state.opportunityId,tenant));setChanges({});setBanner(null);setExtras([]);setModal(null);setEpoch(v=>v+1)}
      else setModal(null)
    }catch(e){setError(e)}finally{busyRef.current=false;setBusy(false)}
  }
  function prepare(action:'create'|'patch'){try{validate(action);if(action==='patch'&&!Object.keys(patchPayload(initial!,changes,h)).length&&!banner){setError(invalid());return}setModal(action)}catch(e){setError(e)}}
  return <div className={css.editor} data-write-candidate key={epoch}>
    {initial&&<p className={css.context}>Oportunidade #{initial.id} · {initial.status}</p>}
    {attempt&&<div role="status" className={css.notice}>Comando {attempt.action}: <strong>{attempt.phase}</strong>{attempt.opportunityId&&<> · Oportunidade #{attempt.opportunityId}</>}{attempt.status&&<> · HTTP {attempt.status}</>}{attempt.correlationId&&<> · Correlação {attempt.correlationId}</>}
      {['uncertain','readback_matches'].includes(attempt.phase)&&<p>Resultado incerto ou apenas leitura consistente. Não repetir o comando. Reconcilie pelo ID/correlação; uma leitura sem alteração não prova ausência de efeitos.</p>}
      {attempt.opportunityId&&<a href={`#/operation/opportunities/${attempt.opportunityId}`}>Consultar oportunidade</a>}
      {attempt.phase==='uncertain'&&attempt.opportunityId&&<OutlineButton onClick={()=>void reconcileOpportunity(key,version).catch(setError)}>Reconciliar por GET</OutlineButton>}
      {attempt.phase==='confirmed'&&<p>Estado e campos editáveis confirmados por resposta e GET. Este DTO não confirma valores monetários, vínculos de contrato ou efeitos do provedor.</p>}
      {attempt.phase==='confirmed'&&mode==='edit'&&<OutlineButton onClick={()=>void getEditable(initial!.id,tenant).then(value=>{beginNextOpportunityCommand(key,version);setInitial(value);setChanges({});setBanner(null);images.current={};uploadKeys.current={};setImageIds({})}).catch(setError)}>Atualizar e preparar próximo comando</OutlineButton>}
    </div>}
    {!!error&&<><p className={css.hint}>Confira os campos obrigatórios, formatos, limites e escolhas dos catálogos. Nenhuma mensagem bruta do Backend é exibida.</p><WriteFeedback error={error}/></>}
    {imageUncertain&&<div role="alert" className={css.notice}>Resultado do upload incerto. Não reenviar nem criar a oportunidade; a API não fornece recuperação automática do arquivo. Reconciliar com Ops.</div>}
    {Object.keys(imageIds).length>0&&<p className={css.hint}>Imagens recebidas: {Object.entries(imageIds).map(([slot,id])=>`${slot}: #${id}`).join(' · ')}. Preservadas em caso de falha posterior; nenhum reenvio automático.</p>}
    {!editable?<p role="status">Estado {initial?.status}: não permite edição ou revisão.</p>:<>
    <form onSubmit={e=>{e.preventDefault();prepare(mode==='create'?'create':'patch')}}>
      <fieldset disabled={locked}><legend className="visually-hidden">Dados da oportunidade</legend>
      {mode==='create'?<>
        <Card title="Responsável e classificação"><ChoiceSelect label="Empreendedor do Whitelabel" value={draft.entrepreneurId} onChange={v=>set('entrepreneurId',v)} options={choice(h.entrepreneurs)}/><ChoiceSelect label="Modalidade" value={draft.modality} onChange={v=>set('modality',v)} options={[{value:'debt',label:'Debt'},{value:'equity',label:'Equity'}]}/><ChoiceSelect label="Oferta privada" value={draft.isPrivate} onChange={v=>set('isPrivate',v)} options={booleanOptions}/><ChoiceSelect label="Garantia (variante qualificada)" value={draft.warranty} onChange={v=>set('warranty',v)} options={[{value:'false',label:'Sem garantia'}]}/><ChoiceSelect label="Segmento (ID)" value={draft.segmentId} onChange={v=>set('segmentId',v)} options={choice(h.segments)}/><ChoiceSelect label="Uso dos recursos (código)" value={draft.resourceCode} onChange={v=>set('resourceCode',v)} options={choice(h['resource-utilizations'],true)}/>
          <p className={css.hint}>Perfil pessoal preenchido não comprova Company, endereço, banco ou Pix. O Core verifica esses pré-requisitos. Company CNPJ é aplicado pelo Core, sem autofill inferido. A política do tenant pode recusar Equity.</p>
        </Card>
        <Card title="Apresentação e identificação">{input('Nome da oportunidade','name')}{input('Nome empresarial','businessName')}{input('CPF do responsável','cpf')}{input('CNPJ da SPE','speCnpj')}{input('Vídeo YouTube (opcional)','video')}<Field label="Sobre a oportunidade"><textarea value={draft.about} onChange={e=>set('about',e.target.value)}/></Field><Field label="Descrição"><textarea value={draft.description} onChange={e=>set('description',e.target.value)}/></Field>{draft.isPrivate==='true'&&<Field label="CPFs autorizados (um por linha)"><textarea value={draft.allowedCpfs} onChange={e=>set('allowedCpfs',e.target.value)}/></Field>}</Card>
        <Card title="Valores — BRL → centavos no envio">{input('Meta máxima (R$, sem separador de milhar)','maxGoal')}{input('Investimento mínimo (R$)','minimum')}{input('Valor da garantia (R$; informe explicitamente)','warrantyAmount')}<p className={css.hint}>Sem arredondamento ou valores preenchidos automaticamente. Sem garantia: informe o valor coerente; o Backend é autoritativo.</p></Card>
        {draft.modality==='equity'&&<Card title="Equity">{input('Participação (%)','participation')}</Card>}
        {draft.modality==='debt'&&<Card title="Debt">{input('Rentabilidade (%)','profitability')}<ChoiceSelect label="Base da rentabilidade" value={draft.basis} onChange={v=>set('basis',v)} options={[{value:'annual',label:'Anual'},{value:'monthly',label:'Mensal'}]}/><ChoiceSelect label="Frequência de pagamento" value={draft.frequency} onChange={v=>set('frequency',v)} options={['mensal','bimestral','trimestral','semestral','anual','unica'].map(v=>({value:v,label:v}))}/>{input('Quantidade de parcelas','installments')}{input('Carência — anos (opcional)','graceYears')}{input('Carência — meses (opcional)','graceMonths')}{input('Carência — dias (opcional)','graceDays')}{input('Início do pagamento (opcional)','paymentStart','date')}<ChoiceSelect label="Parcela única (omitir quando não informado)" value={draft.singleInstallment} onChange={v=>set('singleInstallment',v)} options={booleanOptions}/></Card>}
      </>:<Card title="PATCH parcial — apenas campos alterados">
        {allowedFields(initial!.status).filter(k=>!['image_id','segment_id','resource_utilization','is_private','company_cnpj'].includes(k)).map(k=><Field key={k} label={labels[k]??k}>{k==='description'||k==='about'?<textarea value={String(changes[k]??initial!.values[k]??'')} onChange={e=>edit(k,e.target.value)}/>:<input value={String(Object.hasOwn(changes,k)?changes[k]??'':initial!.values[k]??'')} onChange={e=>edit(k,['promotional_video_url','whatsapp_group'].includes(k)&&e.target.value===''?null:e.target.value)}/>}</Field>)}
        <ChoiceSelect label="Segmento (alterar explicitamente)" value={String(changes.segment_id??initial!.values.segment_id??'')} onChange={v=>edit('segment_id',Number(v))} options={choice(h.segments)}/><ChoiceSelect label="Uso dos recursos (alterar explicitamente)" value={String(changes.resource_utilization??initial!.values.resource_utilization??'')} onChange={v=>edit('resource_utilization',v)} options={choice(h['resource-utilizations'],true)}/><ChoiceSelect label="Oferta privada" value={String(changes.is_private??initial!.values.is_private??'')} onChange={v=>edit('is_private',v==='true')} options={booleanOptions}/>
        <p className={css.hint}>Company CNPJ é somente confirmação canônica e permanece omitido. CPF e SPE não são editáveis em active. Modalidade, valores, Debt/Equity, endereço/banco/Pix, parcelas e datas não pertencem a este PATCH.</p>
      </Card>}
      <Card title="Imagens"><Field label={mode==='create'?'Banner obrigatório — JPG/PNG até 20 MiB':'Substituir banner (opcional) — JPG/PNG até 20 MiB'}><input type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" disabled={!!imageIds.banner} onChange={e=>fileChoice(e.target.files)}/></Field>{initial?.values.image_id&&<p>Banner atual: arquivo #{initial.values.image_id}. Nenhuma URL de imagem foi inferida.</p>}{mode==='create'&&<Field label="Imagens extras (0–3), até 20 MiB cada"><input type="file" multiple accept="image/jpeg,image/png,.jpg,.jpeg,.png" disabled={Object.keys(imageIds).some(k=>k.startsWith('extra-'))} onChange={e=>fileChoice(e.target.files,true)}/></Field>}<p className={css.hint}>Uploads só ocorrem após confirmação e validação dos demais campos. Nenhum arquivo é removido automaticamente.</p></Card>
      <div className={css.actions}><PrimaryButton type="submit">{mode==='create'?'Revisar criação':'Revisar PATCH'}</PrimaryButton></div>
      </fieldset>
    </form>
    {mode==='edit'&&initial?.status==='review'&&<Card title="Revisão — ações independentes"><OutlineButton disabled={locked} onClick={()=>{setReason('');setModal('deny')}}>Preparar negativa</OutlineButton><OutlineButton disabled={locked} onClick={()=>{setReason('');setModal('archive')}}>Preparar arquivamento</OutlineButton><OutlineButton disabled={locked} onClick={()=>setModal('approve')}>Preparar aprovação</OutlineButton></Card>}
    </>}
    {modal&&<Dialog title={modal==='create'?'Confirmar criação em review':modal==='patch'?'Confirmar PATCH parcial':modal==='approve'?'Preparar aprovação com efeitos externos':modal==='deny'?'Negar e arquivar':'Arquivar oportunidade'} description={`Whitelabel #${tenant}${initial?` · Oportunidade #${initial.id}`:` · Empreendedor #${draft.entrepreneurId}`}. Candidato local; somente transporte interceptado nesta fase.`} initialFocusRef={cancelRef} onClose={()=>{if(!busy)setModal(null)}} footer={<><OutlineButton ref={cancelRef} disabled={busy} onClick={()=>setModal(null)}>Cancelar</OutlineButton><PrimaryButton disabled={busy||imageUncertain||modal==='approve'&&!providerAccepted} onClick={()=>void confirm()}>Confirmar uma vez</PrimaryButton></>}>
      {!!error&&<p role="alert">Não foi possível enviar. Confira os campos deste diálogo: motivo com no mínimo 20 caracteres, contrato do tenant, datas e valores válidos. Nenhum reenvio automático.</p>}
      {(modal==='deny'||modal==='archive')&&<Field label="Motivo (mínimo 20 caracteres)"><textarea value={reason} minLength={20} disabled={busy} onChange={e=>setReason(e.target.value)}/><span>Ambas as ações persistem archived. Não há estado denied nem restauração automática.</span></Field>}
      {modal==='approve'&&<div className={css.grid}><ChoiceSelect label="Contrato do Whitelabel" value={approval.contract} onChange={v=>setApproval(d=>({...d,contract:v}))} options={choice(h.contracts)} disabled={busy}/><ChoiceSelect label="Perfil do investidor (opcional)" value={approval.profile} onChange={v=>setApproval(d=>({...d,profile:v}))} options={choice(h['investor-profiles'])} disabled={busy}/>{([['fee','Taxa LOOR (%) — opcional'],['opened','Abertura — opcional'],['due','Encerramento — opcional'],['years','Carência anos — opcional'],['months','Carência meses — opcional'],['days','Carência dias — opcional']] as const).map(([k,label])=><Field key={k} label={label}><input type={k==='opened'||k==='due'?'date':'text'} value={approval[k]} disabled={busy} onChange={e=>setApproval(d=>({...d,[k]:e.target.value}))}/></Field>)}<p className={css.notice}>Contrato listado não comprova arquivo livre. O Backend verifica elegibilidade. Aprovação pode provisionar Crenor/BCodex e webhooks antes da transação. Não há idempotency-key ou recuperação automática de órfãos; active sozinho não comprova todos os efeitos. Não enviar credenciais aqui. Aprovação real exige autorização separada e plano Ops.</p><Field label="Reconheço os efeitos externos no cenário sintético"><input type="checkbox" checked={providerAccepted} disabled={busy} onChange={e=>setProviderAccepted(e.target.checked)}/></Field></div>}
      <p className={css.hint}>Uma submissão, sem repetição automática. Falha de rede, timeout, 5xx ou resposta inválida exige leitura/reconciliação, não novo envio. Upload confirmado será reutilizado, não reenviado.</p>
    </Dialog>}
    {guard.pending&&<Dialog title="Sair com alterações locais?" description="O rascunho será descartado, mas nenhum upload ou efeito do Backend será removido. Em resultado incerto, registre os IDs e reconcilie antes de repetir." onClose={guard.stay} footer={<><OutlineButton onClick={guard.stay}>Continuar editando</OutlineButton><OutlineButton onClick={guard.discardAndContinue}>Descartar rascunho e sair</OutlineButton></>}>Há alterações ou arquivos selecionados nesta página.</Dialog>}
  </div>
}
