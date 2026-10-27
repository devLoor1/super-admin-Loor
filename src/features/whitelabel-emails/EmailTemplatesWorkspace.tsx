import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Monitor, ShieldCheck, Smartphone } from 'lucide-react'
import { Dialog } from '../../components/ui/Dialog'
import { OutlineButton } from '../../components/ui/OutlineButton'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { useUnsavedChangesGuard } from '../../app/useUnsavedChangesGuard'
import { getSessionVersion, subscribeSession, useSessionOperator } from '../../lib/authSession'
import { describeApiError } from '../../lib/apiErrors'
import { canReadEmailTemplates, canWriteEmailTemplates, emailPreviewDocument, getEmailTemplates, getEmailTypes, previewEmail, type EmailPreview, type EmailPreviewCommand, type EmailTemplate, type EmailTemplateType } from './emailTemplatesApi'
import { defaultEditorial, editorialErrors, editorialLabels, readEditorial, serializeEditorial, supportsEditorial, type EditorialDraft } from './emailEditorialModel'
import { beginNextTemplateWrite, executeTemplateWrite, getTemplateAttempt, reconcileTemplateWrite, subscribeTemplateWrites, templateBusy, templateLocked, type TemplateAttempt, type TemplateWrite } from './emailTemplateWrites'
import { EMAIL_PREVIEW_VIEWPORT, emailPreviewScale, watchEmailPreviewWidth } from './emailPreviewGeometry'
import s from '../whitelabel-settings/ConfigurationStudio.module.css'
import e from './EmailTemplatesWorkspace.module.css'

type Remote<T> = { state: 'loading' } | { state: 'error'; error: unknown } | { state: 'ready'; data: T }
const equal = (first: unknown, second: unknown) => JSON.stringify(first) === JSON.stringify(second)
const messages: Record<TemplateAttempt['phase'], string> = {
  checking: 'Conferindo a configuração atual.', sending: 'Solicitação enviada uma vez. Aguarde.', reading: 'Consultando o resultado por GET.', confirmed: 'Alteração confirmada pela resposta e pela leitura autoritativa.', stale: 'O conteúdo mudou no servidor. Nada foi enviado. Recarregue a leitura e revise o rascunho.', rejected: 'Alteração não confirmada. Revise os campos antes de uma nova ação.', uncertain: 'Resultado incerto. Não envie novamente; consulte o estado por GET.', readback_matches: 'A leitura corresponde ao solicitado, mas a resposta da operação permanece incerta. Novas alterações estão bloqueadas.',
}
function Feedback({ error, retry }: { error: unknown; retry: () => void }) {
  const view = describeApiError(error, 'os templates deste Whitelabel')
  return <div role="alert" className={e.feedback}><h3>{view.title}</h3><p>{view.description}</p><p>Não será usado conteúdo de demonstração.</p>{view.retryable && <OutlineButton onClick={retry}>Consultar novamente</OutlineButton>}</div>
}
export function EmailTemplatesWorkspace({ tenantId }: { tenantId: string }) {
  const operator = useSessionOperator(), session = useSyncExternalStore(subscribeSession, getSessionVersion, getSessionVersion)
  if (!canReadEmailTemplates(operator?.roles)) return <p role="alert">Este perfil não pode consultar templates.</p>
  return <Catalog key={`${tenantId}:${session}`} tenantId={tenantId} session={session} writable={canWriteEmailTemplates(operator?.roles)} />
}
function Catalog({ tenantId, session, writable }: { tenantId: string; session: number; writable: boolean }) {
  const [catalog, setCatalog] = useState<Remote<EmailTemplateType[]>>({ state: 'loading' }), [epoch, setEpoch] = useState(0)
  const [type, setType] = useState(''), [held, setHeld] = useState({ dirty: false, busy: false }), [pending, setPending] = useState<{ run: () => void } | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    void getEmailTypes(tenantId, controller.signal).then(data => { if (!controller.signal.aborted) { setCatalog({ state: 'ready', data }); setType(current => data.some(item => item.type === current) ? current : data[0]?.type ?? '') } }).catch(error => { if (!controller.signal.aborted) setCatalog({ state: 'error', error }) })
    return () => controller.abort()
  }, [tenantId, epoch])
  const change = (run: () => void) => { if (held.busy) return; if (held.dirty) setPending({ run }); else run() }
  const selected = catalog.state === 'ready' ? catalog.data.find(item => item.type === type) : undefined
  return <section className={s.studio} aria-label="Templates e conteúdo de e-mail">
    <header className={s.heading}><div><span className={s.eyebrow}>E-MAIL · CONTEÚDO</span><h2>Templates de mensagem</h2><p>Textos editoriais, variáveis do sistema e prévia renderizada pelo Core.</p></div><span className={s.local}>Whitelabel #{tenantId}</span></header>
    {catalog.state === 'error' ? <Feedback error={catalog.error} retry={() => setEpoch(n => n + 1)} /> : catalog.state === 'loading' ? <p className={e.feedback} role="status">Consultando tipos de mensagem…</p> : <>
      <div className={s.emailIntro}><label className={s.field}>Tipo de mensagem<select value={type} disabled={held.busy} onChange={event => change(() => setType(event.target.value))}>{catalog.data.map(item => <option key={item.type} value={item.type}>{item.label}</option>)}</select></label><p className={s.note}>{selected?.description ?? 'Nenhum tipo de mensagem foi retornado.'}</p></div>
      {selected && <TemplateList key={type} tenantId={tenantId} session={session} type={selected} writable={writable} onState={setHeld} change={change} />}
    </>}
    {pending && <Dialog title="Descartar rascunho de e-mail?" description="Apenas edições locais serão descartadas." onClose={() => setPending(null)} footer={<><OutlineButton onClick={() => setPending(null)}>Continuar editando</OutlineButton><PrimaryButton onClick={() => { pending.run(); setPending(null); setHeld({ dirty: false, busy: false }) }}>Descartar e continuar</PrimaryButton></>}><p>O conteúdo já persistido permanece inalterado.</p></Dialog>}
  </section>
}
function TemplateList({ tenantId, session, type, writable, onState, change }: { tenantId: string; session: number; type: EmailTemplateType; writable: boolean; onState: (value: { dirty: boolean; busy: boolean }) => void; change: (run: () => void) => void }) {
  const [remote, setRemote] = useState<Remote<EmailTemplate[]>>({ state: 'loading' }), [epoch, setEpoch] = useState(0), [chosen, setChosen] = useState<number | null>(null), [creating, setCreating] = useState(false)
  const requested = useRef<number | undefined>(undefined)
  useEffect(() => {
    const controller = new AbortController()
    void getEmailTemplates(tenantId, type.type, controller.signal).then(data => {
      if (controller.signal.aborted) return
      setRemote({ state: 'ready', data }); setCreating(false)
      setChosen(current => data.some(row => row.id === requested.current) ? requested.current! : data.some(row => row.id === current) ? current : data.find(row => row.active && !row.is_default)?.id ?? data.find(row => row.active && row.is_default)?.id ?? data[0]?.id ?? null)
    }).catch(error => { if (!controller.signal.aborted) setRemote({ state: 'error', error }) })
    return () => controller.abort()
  }, [tenantId, type.type, epoch])
  const reload = (id?: number) => { requested.current = id; setEpoch(n => n + 1) }
  if (remote.state === 'error') return <Feedback error={remote.error} retry={reload} />
  if (remote.state !== 'ready') return <p className={e.feedback} role="status">Consultando templates…</p>
  const selected = remote.data.find(row => row.id === chosen) ?? null
  return <>
    <div className={e.recordBar}><label className={s.field}>Versão selecionada<select value={chosen ?? ''} onChange={event => change(() => { setChosen(Number(event.target.value)); setCreating(false) })}>{remote.data.length === 0 && <option value="">Nenhum template armazenado</option>}{remote.data.map(row => <option key={row.id} value={row.id}>{row.name} · {row.is_default ? 'padrão global' : 'próprio'} · {row.active ? 'ativo' : 'inativo'}</option>)}</select></label>{writable && supportsEditorial(type.type) && <OutlineButton disabled={creating} onClick={() => change(() => setCreating(true))}>Criar personalização</OutlineButton>}</div>
    <TemplateEditor key={`${chosen}:${creating}:${epoch}`} tenantId={tenantId} session={session} type={type} rows={remote.data} selected={selected} creating={creating} writable={writable} onState={onState} onReload={reload} onCancelCreate={() => setCreating(false)} />
  </>
}
function TemplateEditor({ tenantId, session, type, rows, selected, creating, writable, onState, onReload, onCancelCreate }: { tenantId: string; session: number; type: EmailTemplateType; rows: EmailTemplate[]; selected: EmailTemplate | null; creating: boolean; writable: boolean; onState: (value: { dirty: boolean; busy: boolean }) => void; onReload: (id?: number) => void; onCancelCreate: () => void }) {
  const parsed = selected ? readEditorial(type.type, selected.subject, selected.body_html) : null
  const [draft, setDraft] = useState<EditorialDraft | null>(parsed), [editing, setEditing] = useState(creating && !!parsed), [name, setName] = useState(creating ? `${type.label} · personalização` : selected?.name ?? ''), [active, setActive] = useState(creating ? false : selected?.active ?? false)
  const [narrow, setNarrow] = useState<'editor' | 'preview'>('editor'), [saved, setSaved] = useState(!creating), [confirmation, setConfirmation] = useState<'save' | 'delete' | null>(null), [error, setError] = useState(false)
  const [, refresh] = useState(0), inputId = useId()
  useEffect(() => subscribeTemplateWrites(() => refresh(n => n + 1)), [])
  const attempt = getTemplateAttempt(tenantId, type.type, session), busy = templateBusy(attempt), locked = templateLocked(attempt)
  const dirty = creating || editing && (!equal(draft, parsed) || name !== selected?.name || active !== selected?.active)
  useEffect(() => { onState({ dirty, busy }); return () => onState({ dirty: false, busy: false }) }, [dirty, busy, onState])
  const discard = () => { if (creating) onCancelCreate(); else { setDraft(parsed); setName(selected?.name ?? ''); setActive(selected?.active ?? false); setEditing(false) } }
  const guard = useUnsavedChangesGuard(dirty || busy, discard)
  const fields = draft ? editorialErrors(type.type, draft) : {}
  const serialized = useMemo(() => editing && draft ? serializeEditorial(type.type, draft) : null, [editing, draft, type.type])
  const allowed = writable && (creating || selected && !selected.is_default) && supportsEditorial(type.type)
  const command = useMemo<EmailPreviewCommand | null>(() => {
    if (!saved && serialized) return { type: type.type, ...serialized }
    if ((!editing || saved) && selected) return { type: type.type, subject: selected.subject, body_html: selected.body_html }
    return null
  }, [saved, serialized, selected, type.type, editing])
  const validName = name.trim().length > 0 && name.trim().length <= 256 && !/[<>\p{Cc}]/u.test(name)
  async function submit(operation: 'save' | 'delete') {
    if (!allowed || busy || locked || operation === 'save' && (!serialized || !validName)) return
    setConfirmation(null); setError(false)
    const value = operation === 'save' && serialized ? { name: name.trim(), ...serialized, active } : { name: selected!.name, subject: selected!.subject, body_html: selected!.body_html, active: selected!.active }
    const write: TemplateWrite = { tenant: tenantId, type: type.type, baseline: creating ? null : selected, baselineList: rows, value, operation }
    try { await executeTemplateWrite(write, session); const result = getTemplateAttempt(tenantId, type.type, session); if (result?.phase === 'confirmed') onReload(result.result?.id) } catch { setError(true) }
  }
  return <>
    <div className={s.workspaceTitle}><div><h3>{type.label}</h3><p>{creating ? 'Nova personalização · inicialmente inativa' : selected?.is_default ? 'Padrão global · somente leitura' : selected ? 'Conteúdo próprio deste Whitelabel' : 'Sem conteúdo armazenado para este tipo'}</p></div><span className={dirty ? s.draftBadge : s.savedBadge}>{dirty ? 'Rascunho não salvo' : 'Leitura atual'}</span></div>
    <div className={s.mobileSwitch}><button aria-pressed={narrow === 'editor'} onClick={() => setNarrow('editor')}>Editor</button><button aria-pressed={narrow === 'preview'} onClick={() => setNarrow('preview')}>Prévia</button></div>
    <div className={s.split}><div className={s.editor} data-active={narrow === 'editor'}>
      <div className={s.systemNotice}><ShieldCheck size={17} aria-hidden="true" /><p>Variáveis, links e blocos obrigatórios são inseridos pelo sistema. A edição não altera eventos de envio nem anexos.</p></div>
      {!editing && <div className={s.sectionLead}><h4>{parsed ? 'Texto estruturado' : 'Conteúdo preservado'}</h4><p>{parsed ? 'Abra a edição para ajustar os textos desta mensagem.' : 'Este conteúdo não usa o formato estruturado reconhecido. A prévia salva preserva o original; preparar uma versão estruturada é uma substituição explícita.'}</p>{allowed && <OutlineButton disabled={locked} onClick={() => { setDraft(parsed ?? defaultEditorial(type.type)); setEditing(true); setSaved(false) }}>{parsed ? 'Editar conteúdo' : 'Preparar versão estruturada'}</OutlineButton>}</div>}
      {editing && draft && <fieldset className={e.fields} disabled={locked || !allowed}>
        <legend className={e.legend}>Conteúdo editorial</legend><label className={s.field} htmlFor={`${inputId}-name`}>Nome interno<input id={`${inputId}-name`} value={name} maxLength={256} onChange={event => setName(event.target.value)} /></label>
        {Object.entries(draft).map(([field, value]) => <label className={s.field} key={field} htmlFor={`${inputId}-${field}`}>{editorialLabels[field] ?? field}{['subjectLine', 'greeting', 'actionLabel', 'detailsHeading'].includes(field) ? <input id={`${inputId}-${field}`} value={value} maxLength={2000} aria-invalid={!!fields[field]} aria-describedby={fields[field] ? `${inputId}-${field}-error` : undefined} onChange={event => setDraft(current => ({ ...current!, [field]: event.target.value }))} /> : <textarea id={`${inputId}-${field}`} rows={field === 'message' ? 5 : 3} value={value} maxLength={4000} aria-invalid={!!fields[field]} aria-describedby={fields[field] ? `${inputId}-${field}-error` : undefined} onChange={event => setDraft(current => ({ ...current!, [field]: event.target.value }))} />}{fields[field] && <small id={`${inputId}-${field}-error`} className={s.error}>{fields[field]}</small>}</label>)}
        <label className={e.checkbox}><input type="checkbox" checked={active} onChange={event => setActive(event.target.checked)} />Usar como template ativo deste tipo</label><p className={s.note}>Ao ativar, outros templates próprios do mesmo tipo deixam de estar ativos. Isso afeta mensagens futuras; salvar não envia e-mail.</p>
      </fieldset>}
      <details className={s.provenance}><summary>Variáveis e origem</summary><p>Obrigatórias: {type.required_variables.join(', ') || 'nenhuma informada'}.</p><p>Disponíveis: {type.available_variables.join(', ')}.</p>{selected && <p>Registro #{selected.id} · {selected.is_default ? 'padrão global protegido' : `Whitelabel #${selected.wtlb_id}`} · {selected.active ? 'ativo' : 'inativo'}.</p>}<p>A versão é informativa. Cada alteração confere o estado por GET antes e depois, sem bloqueio atômico de concorrência.</p></details>
    </div><div className={s.preview} data-active={narrow === 'preview'}><div className={s.previewMode}><button aria-pressed={!saved} onClick={() => setSaved(false)}>Rascunho</button><button aria-pressed={saved} onClick={() => setSaved(true)}>Salvo</button></div><EmailServerPreview tenantId={tenantId} command={command} label={saved ? 'Conteúdo salvo' : 'Prévia do rascunho'} /></div></div>
    {attempt && <div className={e.feedback} role="status" aria-live="polite"><p>{messages[attempt.phase]}</p>{attempt.status !== undefined && <p>HTTP {attempt.status || 'sem resposta'}</p>}{attempt.correlationId && <small>Referência: {attempt.correlationId}</small>}</div>}{error && <p className={e.feedback} role="alert">A ação não foi concluída. Nenhuma solicitação será repetida automaticamente.</p>}
    <footer className={s.footer}><span>{writable ? 'Prévia não salva nem envia mensagens.' : 'Perfil de consulta. Alterações indisponíveis.'}</span><div>{locked && !busy && <OutlineButton onClick={() => { void reconcileTemplateWrite(tenantId, type.type, session).catch(() => setError(true)) }}>Consultar resultado por GET</OutlineButton>}{attempt?.phase === 'stale' && <OutlineButton onClick={() => { beginNextTemplateWrite(tenantId, type.type, session); setEditing(false); onReload(selected?.id) }}>Descartar e atualizar leitura</OutlineButton>}{dirty && <OutlineButton disabled={busy} onClick={discard}>Descartar rascunho</OutlineButton>}{writable && selected && !selected.is_default && !creating && supportsEditorial(type.type) && <OutlineButton disabled={locked} onClick={() => setConfirmation('delete')}>Remover personalização</OutlineButton>}{allowed && <PrimaryButton disabled={locked || !editing || !serialized || !validName || !dirty || attempt?.phase === 'stale'} onClick={() => setConfirmation('save')}>{creating ? 'Criar personalização' : 'Salvar alterações'}</PrimaryButton>}</div></footer>
    {confirmation && <Dialog title={confirmation === 'delete' ? 'Remover este template?' : active ? 'Salvar template ativo?' : 'Salvar template inativo?'} description={`Whitelabel #${tenantId} · ${type.label}`} tone={confirmation === 'delete' || active ? 'warning' : 'violet'} onClose={() => setConfirmation(null)} footer={<><OutlineButton onClick={() => setConfirmation(null)}>Cancelar</OutlineButton><PrimaryButton onClick={() => { void submit(confirmation) }}>Confirmar</PrimaryButton></>}><p>{confirmation === 'delete' ? 'Somente a personalização selecionada será removida. O padrão global continua preservado. Se este template estiver ativo, mensagens futuras poderão voltar ao padrão.' : active ? 'Esta versão passa a ser usada em mensagens futuras deste tipo. Outros templates próprios do mesmo tipo serão desativados.' : 'A nova versão ficará armazenada sem assumir o envio deste tipo de mensagem.'}</p><p>Nenhuma mensagem será enviada por esta ação.</p></Dialog>}
    {guard.pending && <Dialog title="Descartar rascunho de e-mail?" description="O descarte não desfaz solicitações já enviadas." onClose={guard.stay} footer={<><OutlineButton onClick={guard.stay}>Continuar aqui</OutlineButton><PrimaryButton disabled={busy} onClick={guard.discardAndContinue}>Descartar e continuar</PrimaryButton></>}><p>{busy ? 'Aguarde a conclusão da solicitação.' : 'Apenas alterações locais serão descartadas.'}</p></Dialog>}
  </>
}
function ScaledEmailFrame({ document, title, mobile }: { document: string; title: string; mobile: boolean }) {
  const host = useRef<HTMLDivElement>(null), [available, setAvailable] = useState(0)
  const viewport = mobile ? EMAIL_PREVIEW_VIEWPORT.mobile : EMAIL_PREVIEW_VIEWPORT.desktop
  useLayoutEffect(() => host.current ? watchEmailPreviewWidth(host.current, setAvailable) : undefined, [])
  const scale = emailPreviewScale(available, viewport.width)
  return <div ref={host} className={e.iframeViewport} style={{ aspectRatio: `${viewport.width} / ${viewport.height}`, maxWidth: viewport.width }}>
    <iframe title={title} sandbox="" referrerPolicy="no-referrer" srcDoc={document} className={e.scaledIframe} style={{ width: viewport.width, height: viewport.height, transform: `scale(${scale})` }} />
  </div>
}
export function EmailServerPreview({ tenantId, command, label }: { tenantId: string; command: EmailPreviewCommand | null; label: string }) {
  const [state, setState] = useState<{ key: string; scope: string; previewKey?: string; preview?: EmailPreview; pending: boolean; error: boolean }>({ key: '', scope: '', pending: false, error: false }), [mobile, setMobile] = useState(false)
  const fingerprint = JSON.stringify(command)
  useEffect(() => {
    const request = JSON.parse(fingerprint) as EmailPreviewCommand | null
    if (!request) return
    const controller = new AbortController(), key = `${tenantId}:${fingerprint}`, scope = `${tenantId}:${request.type}`
    const timer = window.setTimeout(() => {
      setState(current => ({ key, scope, ...(current.scope === scope ? { preview: current.preview, previewKey: current.previewKey } : {}), pending: true, error: false }))
      void previewEmail(tenantId, request, controller.signal).then(preview => { if (!controller.signal.aborted) setState({ key, scope, previewKey: key, preview, pending: false, error: false }) }).catch(() => { if (!controller.signal.aborted) setState(current => ({ ...current, key, scope, pending: false, error: true })) })
    }, 450)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [tenantId, fingerprint])
  const relevant = command && state.key === `${tenantId}:${fingerprint}`, preview = command && state.scope === `${tenantId}:${command.type}` ? state.preview : undefined
  const stale = !!preview && state.previewKey !== `${tenantId}:${fingerprint}`
  const document = useMemo(() => preview ? emailPreviewDocument(preview.body_html) : '', [preview])
  return <><div className={s.previewHead}><div><strong>{label}</strong><p>Renderização do Core · exemplos sintéticos</p></div><div className={s.segment} aria-label="Tamanho da prévia"><button aria-label="Prévia desktop" aria-pressed={!mobile} onClick={() => setMobile(false)}><Monitor size={13} />Desktop</button><button aria-label="Prévia mobile" aria-pressed={mobile} onClick={() => setMobile(true)}><Smartphone size={13} />Mobile</button></div></div>
    {stale && <p role="status" className={s.note}>{relevant && state.error ? 'A atualização falhou. Abaixo está a última prévia anterior; ela não representa o rascunho atual.' : 'Atualizando. Abaixo está a última prévia anterior.'}</p>}
    <div className={`${s.emailFrame} ${e.previewFrame}`} style={{ maxWidth: mobile ? EMAIL_PREVIEW_VIEWPORT.mobile.width : EMAIL_PREVIEW_VIEWPORT.desktop.width, marginInline: 'auto' }} aria-busy={!!command && (!relevant || state.pending)}>{preview ? <><div className={s.subject}><span>ASSUNTO{stale ? ' · PRÉVIA ANTERIOR' : ''}</span><strong>{preview.subject}</strong></div><ScaledEmailFrame title={stale ? 'Prévia anterior isolada do e-mail' : 'Prévia isolada do e-mail'} document={document} mobile={mobile} /></> : <p className={e.previewEmpty} role="status">{!command ? 'Selecione conteúdo salvo ou preencha um rascunho válido para visualizar.' : relevant && state.error ? 'A prévia do servidor está indisponível. Nenhum conteúdo local será apresentado como resultado do Core.' : 'Preparando prévia…'}</p>}</div><p className={s.previewFoot}>Viewport de {mobile ? '360' : '600'} px, reduzido para caber nesta área. Links, imagens externas e ações estão bloqueados. A prévia não comprova envio nem entrega de e-mail.</p></>
}
