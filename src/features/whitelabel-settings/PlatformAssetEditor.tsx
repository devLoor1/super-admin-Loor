import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import { ImagePlus, RefreshCw, Trash2, Upload } from 'lucide-react'
import { Dialog } from '../../components/ui/Dialog'
import { OutlineButton } from '../../components/ui/OutlineButton'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { useUnsavedChangesGuard } from '../../app/useUnsavedChangesGuard'
import { getSessionVersion, subscribeSession, useSessionOperator } from '../../lib/authSession'
import { ApiError } from '../../lib/api'
import { cloneJson, record, sameJson, type ConfigCell, type ConfigOrigin, type Json, type JsonObject } from './configurationContract'
import { CONFIG_MESSAGES, configurationLocked, getConfigurationAttempt, reconcileConfiguration, subscribeConfiguration, writeConfiguration } from './configurationClient'
import { assetAttempt, assetFileError, assetLocked, assetReference, getPlatformAsset, mutatePlatformAsset, reconcilePlatformAsset, subscribeAssets, type PlatformAsset } from './platformAssetClient'
import { getSettingsRead } from './settingsReadApi'
import styles from './PlatformAssetEditor.module.css'

const pages = ['login', 'register', 'quick_profile'] as const
const pageNames = { login: 'Login', register: 'Cadastro', quick_profile: 'Completar dados' }
const imageCells = pages.map(page => `${page}.main_area_image` as ConfigCell)
const pendingAssets = new Map<string, PlatformAsset>()
// Session-only cleanup reference after confirmed unlink/reset; never an association.
const detachedAssets = new Map<string, PlatformAsset>()
const keyFor = (id: string, cell: ConfigCell, session: number) => `${id}:${cell}:${session}`
const sourceValue = (origin: ConfigOrigin) => origin.stored ? origin.storedValue : origin.effectiveValue
const refFrom = (value: Json) => record(value) && assetReference(value.assetRef) ? value.assetRef : null
const isEnabled = (value: Json) => record(value) && value.enabled === true
function validImage(value: Json) {
  return value === null || record(value) && (!Object.hasOwn(value, 'capabilityId') || value.capabilityId === 'platform.main_area_image') && (!Object.hasOwn(value, 'version') || value.version === 1) && typeof value.enabled === 'boolean' && (value.assetRef === null || assetReference(value.assetRef)) && (!value.enabled || assetReference(value.assetRef)) && !Object.hasOwn(value, 'url')
}
function payload(origin: ConfigOrigin, ref: string | null, enabled: boolean): JsonObject {
  // Only a stored object is the editing baseline; inherited fallbacks stay out of storage.
  return { ...(origin.stored && record(origin.storedValue) ? cloneJson(origin.storedValue) as JsonObject : {}), capabilityId: 'platform.main_area_image', version: 1, enabled, assetRef: ref }
}
type Dependency = { cell: ConfigCell; origin: ConfigOrigin }
type Action = { kind: 'replace' | 'delete'; ref: string; dependencies: Dependency[]; all: Dependency[]; file?: File }
export type PlatformAssetEditorProps = { id: string; cell: ConfigCell; baseline: ConfigOrigin; onReload: () => void; onPreview?: (url: string | null) => void; onState?: (state: { dirty: boolean; busy: boolean }) => void }

export function PlatformAssetEditor(props: PlatformAssetEditorProps) {
  const session = useSyncExternalStore(subscribeSession, getSessionVersion, () => 0)
  const operator = useSessionOperator()
  if (!imageCells.includes(props.cell) || !operator?.roles.some(role => role === 'SUPER_ADMIN' || role === 'READ_ONLY')) return null
  return <AssetEditor key={`${props.id}:${props.cell}:${session}`} {...props} session={session} writable={!!operator?.roles.includes('SUPER_ADMIN')} />
}
function AssetEditor({ id, cell, baseline, onReload, onPreview, onState, session, writable }: PlatformAssetEditorProps & { session: number; writable: boolean }) {
  const key = keyFor(id, cell, session)
  const [origin, setOrigin] = useState(baseline)
  const [asset, setAsset] = useState<PlatformAsset | null>(null)
  const [candidate, setCandidate] = useState<PlatformAsset | null>(() => pendingAssets.get(key) ?? null)
  const [detached, setDetached] = useState<PlatformAsset | null>(() => detachedAssets.get(key) ?? null)
  const [file, setFile] = useState<File | null>(null)
  const [localUrl, setLocalUrl] = useState<string | null>(null)
  const [enabled, setEnabled] = useState(() => isEnabled(sourceValue(baseline)))
  const [loading, setLoading] = useState(false)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [action, setAction] = useState<Action | null>(null)
  const [confirm, setConfirm] = useState<'unlink' | 'reset' | null>(null)
  const [discard, setDiscard] = useState(false)
  const [recoveryRef, setRecoveryRef] = useState('')
  const [, update] = useState(0)
  const active = useRef(true), fileInput = useRef<HTMLInputElement>(null)
  const fileId = useId()
  const current = sourceValue(origin), currentRef = refFrom(current), compatible = validImage(current)
  const attempt = assetAttempt(id), configAttempt = getConfigurationAttempt(id, cell)
  const locked = assetLocked(id) || configurationLocked(configAttempt)
  const baselineEnabled = isEnabled(current)
  const changed = enabled !== baselineEnabled
  const dirty = !!file || !!candidate || changed
  const previewUrl = file ? localUrl : candidate?.url ?? (enabled ? asset?.url ?? null : null)
  const protectedDraft = dirty || attempt?.phase === 'uncertain'
  const busyState = working || attempt?.phase === 'sending' || configAttempt?.phase === 'checking' || configAttempt?.phase === 'sending'
  const guard = useUnsavedChangesGuard(!onState && (busyState || protectedDraft), () => { setFile(null) })
  const alive = useCallback(() => active.current && getSessionVersion() === session, [session])
  useEffect(() => { active.current = true; return () => { active.current = false } }, [])
  useEffect(() => subscribeAssets(() => update(n => n + 1)), [])
  useEffect(() => subscribeConfiguration(() => update(n => n + 1)), [])
  useEffect(() => { onState?.({ dirty: protectedDraft, busy: busyState }) }, [onState, protectedDraft, busyState])
  useEffect(() => {
    if (!file) { setLocalUrl(null); return }
    const url = URL.createObjectURL(file)
    setLocalUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])
  useEffect(() => { onPreview?.(previewUrl); return () => onPreview?.(null) }, [onPreview, previewUrl])
  useEffect(() => {
    const controller = new AbortController()
    setAsset(null)
    if (!currentRef || !compatible) return () => controller.abort()
    setLoading(true)
    getPlatformAsset(id, currentRef, controller.signal).then(result => { if (!controller.signal.aborted && alive()) setAsset(result) }).catch(() => { if (!controller.signal.aborted && alive()) setError('Não foi possível ler a imagem associada. Atualize a leitura antes de alterar o arquivo.') }).finally(() => { if (!controller.signal.aborted && alive()) setLoading(false) })
    return () => controller.abort()
  }, [id, currentRef, compatible, alive])
  function keepCandidate(next: PlatformAsset) { pendingAssets.set(key, next); setCandidate(next); setEnabled(true) }
  function clearFile() { setFile(null); if (fileInput.current) fileInput.current.value = '' }
  async function refresh() {
    if (working) return
    setWorking(true); setError(null)
    try {
      const fresh = (await getSettingsRead(id)).configuration[cell]
      if (!fresh) throw new Error('origin')
      const ref = refFrom(sourceValue(fresh)), image = ref ? await getPlatformAsset(id, ref) : null
      if (!alive()) return
      setOrigin(fresh); setAsset(image)
      if (candidate && ref === candidate.ref && getConfigurationAttempt(id, cell)?.phase === 'confirmed') { pendingAssets.delete(key); setCandidate(null); setEnabled(isEnabled(sourceValue(fresh))) }
      else if (!changed && !candidate) setEnabled(isEnabled(sourceValue(fresh)))
      setNotice('Referência atualizada. Revise o rascunho antes de salvar.'); onReload()
    } catch { if (alive()) setError('Não foi possível atualizar a referência. O rascunho foi mantido.') }
    finally { if (alive()) setWorking(false) }
  }
  async function upload() {
    if (!file || !writable || working || locked || candidate || !compatible) return
    setWorking(true); setError(null); setNotice(null)
    try {
      const fresh = (await getSettingsRead(id)).configuration[cell]
      if (!fresh || !sameJson(fresh, origin)) throw new ApiError(409, { code: 'BASELINE_CHANGED' })
      if (!alive()) return
      const result = await mutatePlatformAsset(id, 'upload', session, file, undefined, cell)
      if (!alive() || !result) return
      keepCandidate(result); clearFile(); setNotice('Imagem enviada e lida. Salve a associação para aplicá-la nesta página.')
    } catch (e) {
      if (alive()) setError(e instanceof ApiError && e.code === 'BASELINE_CHANGED' ? 'A configuração mudou. Atualize a referência antes de enviar.' : 'O envio não foi concluído com confirmação. Consulte o resultado antes de enviar outra imagem.')
    } finally { if (alive()) setWorking(false) }
  }
  async function save(value: Json | undefined) {
    if (!writable || working || locked) return
    setWorking(true); setError(null); setConfirm(null)
    try {
      await writeConfiguration(id, cell, origin, value, session)
      if (!alive()) return
      if (getConfigurationAttempt(id, cell)?.phase === 'confirmed') {
        const fresh = (await getSettingsRead(id)).configuration[cell]
        if (!fresh) throw new Error('origin')
        const ref = refFrom(sourceValue(fresh)), image = ref ? await getPlatformAsset(id, ref) : null
        if (!alive()) return
        if (asset && origin.stored && asset.ref === currentRef && ref !== asset.ref) { detachedAssets.set(key, asset); setDetached(asset) }
        setOrigin(fresh); setAsset(image); setEnabled(isEnabled(sourceValue(fresh)))
        if (candidate && ref === candidate.ref) { pendingAssets.delete(key); setCandidate(null) }
        onReload(); setNotice(value === undefined ? 'Substituição removida e origem conferida.' : 'Associação salva e lida. A prévia mostra a configuração persistida; a aplicação no consumidor exige verificação própria.')
      }
    } catch { if (alive()) setError('Não foi possível concluir a leitura final. A referência enviada foi preservada; não repita o upload.') }
    finally { if (alive()) setWorking(false) }
  }
  async function dependencies(ref: string): Promise<{ all: Dependency[]; dependencies: Dependency[] }> {
    const data = await getSettingsRead(id)
    const all = imageCells.map(item => { const provenance = data.configuration[item]; if (!provenance) throw new Error('incomplete'); return { cell: item, origin: provenance } })
    const dependencies = all.filter(item => refFrom(sourceValue(item.origin)) === ref)
    if (dependencies.some(item => !item.origin.stored)) throw new Error('shared baseline')
    return { all, dependencies }
  }
  async function inspect(kind: Action['kind'], ref: string) {
    if (!writable || working || locked) return
    setWorking(true); setError(null)
    try {
      await getPlatformAsset(id, ref)
      const inspected = await dependencies(ref)
      if (!alive()) return
      setAction({ kind, ref, ...inspected, ...(kind === 'replace' && file ? { file } : {}) })
    } catch { if (alive()) setError('Não foi possível qualificar o arquivo e todas as dependências. Imagens herdadas não podem ser removidas ou substituídas aqui.') }
    finally { if (alive()) setWorking(false) }
  }
  async function recoverExisting() {
    if (!writable || working || locked || file || candidate || currentRef || !assetReference(recoveryRef)) return
    setWorking(true); setError(null); setNotice(null)
    try {
      const image = await getPlatformAsset(id, recoveryRef)
      const checked = await dependencies(recoveryRef)
      if (checked.dependencies.length) throw new Error('already associated')
      const own = checked.all.find(item => item.cell === cell)?.origin
      if (!own || !sameJson(own, origin)) throw new Error('baseline changed')
      if (!alive()) return
      keepCandidate(image); setRecoveryRef('')
      setNotice('Arquivo existente confirmado por GET neste Whitelabel, sem associação nas páginas de entrada. Nenhum envio foi repetido. Revise antes de associar ou limpar.')
    } catch { if (alive()) setError('Não foi possível recuperar um arquivo próprio sem associações. Confira a referência e a configuração; nenhum envio ou alteração foi realizado.') }
    finally { if (alive()) setWorking(false) }
  }
  async function executeAction() {
    if (!action || !writable || working || locked) return
    const selected = action
    setWorking(true); setError(null)
    try {
      const fresh = await dependencies(selected.ref)
      if (!sameJson(fresh.all, selected.all)) { setAction(null); throw new Error('dependency changed') }
      if (!alive()) return
      const result = await mutatePlatformAsset(id, selected.kind, session, selected.file, selected.ref, cell)
      if (!alive()) return
      if (selected.kind === 'delete') {
        const after = await dependencies(selected.ref)
        if (after.dependencies.length) throw new Error('references remain')
        if (!alive()) return
        if (candidate?.ref === selected.ref) { pendingAssets.delete(key); setCandidate(null) }
        if (detached?.ref === selected.ref) { detachedAssets.delete(key); setDetached(null) }
        const own = after.all.find(item => item.cell === cell)!.origin
        setOrigin(own); setEnabled(isEnabled(sourceValue(own)))
        if (currentRef === selected.ref) setAsset(null)
        setNotice('Arquivo ausente por GET e referências conferidas. A remoção não restaura a ausência original da configuração; use Restaurar origem quando necessário.')
      } else if (result) {
        setAsset(result); clearFile(); setNotice('Arquivo substituído e lido. Todas as páginas listadas usam a nova imagem; a prévia usa a URL atualizada.')
      }
      setAction(null); onReload()
    } catch { if (alive()) { setAction(null); setError('A operação não foi confirmada integralmente. Reconsulte arquivo e dependências; nenhuma operação será repetida automaticamente.') } }
    finally { if (alive()) setWorking(false) }
  }
  async function reconcile() {
    if (!writable || working) return
    setWorking(true); setError(null)
    try {
      if (attempt?.phase === 'uncertain') {
        const image = await reconcilePlatformAsset(id, session)
        if (!alive()) return
        if (image && attempt.operation === 'upload' && attempt.cell === cell) { keepCandidate(image); clearFile() }
        else if (image && image.ref === currentRef) setAsset(image)
        else { setAsset(null); onReload() }
      }
      if (configurationLocked(configAttempt)) await reconcileConfiguration(id, cell, session)
      if (alive()) setNotice('Consulta concluída sem repetir a gravação. Confira o estado informado e atualize a referência quando necessário.')
    } catch { if (alive()) setError('O resultado continua incerto. Preserve a referência abaixo para recuperação; não faça novo envio.') }
    finally { if (alive()) setWorking(false) }
  }
  const displayRef = candidate?.ref ?? (attempt?.cell === cell && attempt.phase === 'uncertain' ? attempt.ref : null) ?? currentRef
  const removableRef = candidate?.ref ?? (origin.stored && asset?.ref === currentRef ? currentRef : null)
  return <section className={styles.editor} aria-label="Imagem da área principal">
    <div className={styles.status}><span>{candidate ? 'Enviada · associação pendente' : file || changed ? 'Rascunho local' : origin.stored ? 'Configuração salva' : origin.source === 'default' ? 'Padrão herdado' : 'Sem imagem configurada'}</span><OutlineButton disabled={working} onClick={() => { void refresh() }}><RefreshCw size={15} /> Atualizar leitura</OutlineButton></div>
    <div className={styles.preview} aria-label={file || candidate || changed ? 'Prévia do rascunho' : 'Prévia da configuração salva'}>
      {previewUrl ? <img src={previewUrl} alt="Imagem da área principal" referrerPolicy="no-referrer" onError={() => setError('A imagem não carregou. A associação pode existir; recarregue a URL antes de concluir a verificação visual.')} /> : <div><ImagePlus size={32} /><p>{loading ? 'Lendo a imagem…' : currentRef && enabled ? 'Imagem associada sem prévia disponível' : 'Área principal sem imagem'}</p></div>}
    </div>
    <p className={styles.caption}>{file || candidate || changed ? 'Prévia do rascunho' : 'Prévia salva por leitura'} · recorte central, margem e cantos de 16 px. Não comprova aplicação na página pública.</p>
    {!compatible && <p role="alert">A configuração usa um contrato incompatível. Atualize a leitura ou remova a substituição para restaurar a origem; nenhum campo será descartado silenciosamente.</p>}
    {writable ? <>
      <fieldset className={styles.controls} disabled={working || locked || !compatible}>
        <legend>Imagem desta página</legend>
        <label className={styles.file} htmlFor={fileId}><Upload size={18} /><span>{file ? file.name : 'Selecionar imagem PNG ou JPEG'}<small>Até 20 MiB · prévia local antes do envio</small></span><input ref={fileInput} id={fileId} type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg" disabled={!!candidate} onChange={e => { const selected = e.target.files?.[0]; setError(null); setNotice(null); if (!selected) return; const invalid = assetFileError(selected); if (invalid) { setError(invalid); e.target.value = ''; return }; setFile(selected) }} /></label>
        <label className={styles.toggle}><input type="checkbox" checked={enabled} disabled={!currentRef && !candidate} onChange={e => setEnabled(e.target.checked)} /> Exibir imagem nesta página</label>
        <div className={styles.actions}>
          {file && <PrimaryButton disabled={!!candidate} onClick={() => { void upload() }}><Upload size={16} /> Enviar nova imagem</PrimaryButton>}
          {(candidate || changed) && <PrimaryButton disabled={!!file || !!candidate && !enabled} onClick={() => { void save(payload(origin, candidate?.ref ?? currentRef, enabled)) }}>Salvar associação</PrimaryButton>}
          {(file || changed) && <OutlineButton onClick={() => setDiscard(true)}>Descartar rascunho</OutlineButton>}
          {file && currentRef && origin.stored && asset && !candidate && <OutlineButton onClick={() => { void inspect('replace', currentRef) }}>Substituir arquivo atual…</OutlineButton>}
        </div>
      </fieldset>
      {!file && !candidate && !currentRef && <details className={styles.details}>
        <summary>Retomar arquivo já enviado</summary>
        <p>Use a referência preservada de um envio anterior. A consulta verifica o Whitelabel e as três páginas de entrada; não envia nem associa um arquivo.</p>
        <label className={styles.recovery}>Referência do arquivo<input value={recoveryRef} onChange={e => setRecoveryRef(e.target.value.trim())} disabled={working || locked} autoComplete="off" spellCheck={false} /></label>
        <OutlineButton disabled={working || locked || !assetReference(recoveryRef)} onClick={() => { void recoverExisting() }}>Consultar arquivo existente</OutlineButton>
      </details>}
      <div className={styles.actions}>
        {currentRef && <OutlineButton disabled={working || locked || !compatible || !!candidate} onClick={() => setConfirm('unlink')}>Retirar desta página…</OutlineButton>}
        <OutlineButton disabled={working || locked || !origin.stored || !!candidate} onClick={() => setConfirm('reset')}>Restaurar origem…</OutlineButton>
        {removableRef && <OutlineButton disabled={working || locked} onClick={() => { void inspect('delete', removableRef) }}><Trash2 size={15} /> {candidate ? 'Limpar imagem enviada…' : 'Excluir arquivo…'}</OutlineButton>}
      </div>
    </> : <p>Seu perfil permite consultar a imagem e a configuração.</p>}
    {writable && detached && detached.ref !== removableRef && <div className={styles.notice}><p>Arquivo retirado da associação nesta sessão. A referência foi preservada para limpeza; nenhuma imagem será apagada automaticamente.</p><code>{detached.ref}</code><OutlineButton disabled={working || locked} onClick={() => { void inspect('delete', detached.ref) }}>Inspecionar arquivo retirado…</OutlineButton></div>}
    {candidate && <p className={styles.notice}>A imagem está armazenada, mas ainda não foi associada nesta página. Você pode salvar a associação ou inspecionar e limpar esse arquivo. O upload não será repetido.</p>}
    {attempt?.phase === 'uncertain' && <div className={styles.notice} role="status"><p>Resultado do arquivo incerto. {attempt.ref ? 'Referência preservada para consulta.' : 'O servidor não retornou uma identidade verificável. O envio está bloqueado para evitar duplicação.'}</p>{attempt.cell !== cell && <p>A operação pertence a outra página deste Whitelabel.</p>}{attempt.ref && <code>{attempt.ref}</code>}{writable && <OutlineButton disabled={working || !attempt.ref} onClick={() => { void reconcile() }}>Consultar resultado por GET</OutlineButton>}</div>}
    {configAttempt && <p role="status">{CONFIG_MESSAGES[configAttempt.phase]}</p>}
    {configAttempt && ['uncertain', 'readback_matches'].includes(configAttempt.phase) && writable && <OutlineButton disabled={working} onClick={() => { void reconcile() }}>Consultar associação por GET</OutlineButton>}
    {notice && <p role="status" className={styles.notice}>{notice}</p>}
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <details className={styles.details}><summary>Origem e referência</summary><p>{origin.stored ? origin.storedValue === null ? 'Valor nulo armazenado. Diferente de ausência de substituição.' : 'Substituição armazenada para este Whitelabel.' : origin.source === 'default' ? 'Valor padrão informado pelo servidor.' : 'Sem substituição nem padrão informado.'}</p>{displayRef && <p>Arquivo: <code>{displayRef}</code></p>}<p>Envio e associação são operações separadas. A exclusão de um arquivo pode retirar a imagem de várias páginas; as dependências serão exibidas antes da confirmação.</p></details>
    {confirm && <Dialog title={confirm === 'reset' ? 'Restaurar a origem da imagem?' : 'Retirar imagem desta página?'} description={confirm === 'reset' ? 'Remove a substituição com DELETE. O servidor volta a fornecer o padrão ou a ausência original.' : 'Salva a associação desabilitada, preservando os demais campos. O arquivo continua armazenado.'} onClose={() => setConfirm(null)} footer={<><OutlineButton onClick={() => setConfirm(null)}>Cancelar</OutlineButton><PrimaryButton disabled={working} onClick={() => { void save(confirm === 'reset' ? undefined : payload(origin, null, false)) }}>Confirmar</PrimaryButton></>}><p>A configuração será conferida novamente antes da alteração.</p></Dialog>}
    {action && <Dialog title={action.kind === 'delete' ? 'Excluir este arquivo?' : 'Substituir este arquivo?'} tone="warning" description={action.kind === 'delete' ? 'A exclusão apaga o arquivo e desabilita todas as associações listadas.' : 'A substituição altera a imagem em todas as páginas que usam esta referência.'} onClose={() => { if (!working) setAction(null) }} footer={<><OutlineButton disabled={working} onClick={() => setAction(null)}>Cancelar</OutlineButton><PrimaryButton disabled={working} onClick={() => { void executeAction() }}>{action.kind === 'delete' ? 'Excluir arquivo e associações' : 'Substituir arquivo'}</PrimaryButton></>}><div className={styles.dialog}><p>Whitelabel {id}</p><code>{action.ref}</code>{action.dependencies.length ? <ul>{action.dependencies.map(item => <li key={item.cell}>{pageNames[item.cell.split('.')[0] as keyof typeof pageNames]}</li>)}</ul> : <p>Nenhuma associação encontrada nas três páginas de entrada.</p>}<p>As dependências serão conferidas novamente antes do envio. Um arquivo herdado não é elegível para esta ação.</p></div></Dialog>}
    {(discard || guard.pending) && <Dialog title="Sair do rascunho?" description="A prévia local ainda não representa uma associação salva." tone="warning" onClose={() => { setDiscard(false); guard.stay() }} footer={<><OutlineButton onClick={() => { setDiscard(false); guard.stay() }}>Continuar editando</OutlineButton><PrimaryButton disabled={busyState} onClick={() => { if (busyState) return; clearFile(); setEnabled(baselineEnabled); setDiscard(false); if (guard.pending) guard.discardAndContinue() }}>Descartar prévia local</PrimaryButton></>}><p>Arquivos já enviados e operações incertas continuam registrados nesta sessão para recuperação. Descartar a prévia não apaga arquivos nem desfaz solicitações enviadas.</p></Dialog>}
  </section>
}
