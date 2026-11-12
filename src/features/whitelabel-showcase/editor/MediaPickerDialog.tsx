import { useEffect, useRef, useState } from 'react'
import { ImagePlus, LoaderCircle, Upload } from 'lucide-react'
import { Dialog } from '../../../components/ui/Dialog'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import { createUploadAttempts, hasUncertainUpload, ingestUpload, mediaUrl, runUploadAttempt, UPLOAD_GUIDANCE, type UploadPurpose } from '../showcaseMedia'
import { existingLogoOptions, loadSourceImageOptions, selectExistingLogo, type ExistingLogoOption } from '../showcaseLogoCatalog'
import { SHOWCASE_V2_WRITES_ENABLED } from '../showcaseRelease'
import type { CardSource } from '../showcaseModel'
import { useShowcaseState } from '../showcaseStore'
import { useShowcaseMedia } from '../public/useShowcaseMedia'
import { useShowcaseActor } from './editorHooks'
import styles from './ShowcaseEditor.module.css'

export type PickedMedia = { assetRef: string; fileName: string; warnings: string[]; suggestedAlt: string }

function OptionThumbnail({ option, refresh }: { option: ExistingLogoOption; refresh: (assetRef: string) => void }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const url = option.kind === 'reference' ? mediaUrl(option.assetRef) : option.kind === 'source' ? option.previewUrl : option.url
  return <span className={styles.logoThumbnail} data-background={option.background}>
    {url && failedUrl !== url ? <img src={url} alt={`${option.whitelabel} — ${option.variant}`} onError={() => { setFailedUrl(url); if (option.kind === 'reference') refresh(option.assetRef) }} /> : <span style={{ color: option.background === 'light' ? '#172035' : '#fff' }}>Prévia indisponível</span>}
  </span>
}

/** A completed upload applies only to the still-open picker and its current attempt. */
export function MediaPickerDialog({ purpose, title, logoSource, onPicked, onClose }: {
  purpose: UploadPurpose
  title: string
  logoSource?: CardSource
  onPicked: (media: PickedMedia) => void
  onClose: () => void
}) {
  const { actor, canEdit: actorCanEdit } = useShowcaseActor()
  const canEdit = actorCanEdit && SHOWCASE_V2_WRITES_ENABLED
  const input = useRef<HTMLInputElement>(null)
  const inProgress = useRef(false)
  const download = useRef<AbortController | null>(null)
  const hasExisting = purpose === 'logo' || !!logoSource
  const [mode, setMode] = useState<'existing' | 'upload'>(hasExisting ? 'existing' : 'upload')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const showcase = useShowcaseState()
  const [discoveryResult, setDiscoveryResult] = useState<{ key: string; phase: 'empty' | 'ready' | 'error'; options: ExistingLogoOption[] }>({ key: '', phase: 'empty', options: [] })
  const [reloadOptions, setReloadOptions] = useState(0)
  const sourceId = logoSource?.whitelabelId, sourceSlug = logoSource?.slug
  const rolesKey = actor.roles?.join('|') ?? ''
  const sessionVersion = actor.sessionVersion
  const discoveryKey = JSON.stringify([sourceId, sourceSlug, rolesKey, sessionVersion, reloadOptions])
  const sourceOptions = discoveryResult.key === discoveryKey ? discoveryResult.options : []
  const discovery = sourceId && sourceSlug ? discoveryResult.key === discoveryKey ? discoveryResult.phase : 'loading' : 'empty'
  useEffect(() => {
    if (!sourceId || !sourceSlug) return
    const controller = new AbortController()
    const source: CardSource = { whitelabelId: sourceId, slug: sourceSlug, name: '', logical: null }
    void loadSourceImageOptions({ roles: rolesKey.split('|'), sessionVersion }, source, controller.signal).then(options => {
      if (controller.signal.aborted) return
      setDiscoveryResult({ key: discoveryKey, options, phase: options.length ? 'ready' : 'empty' })
    }).catch(() => { if (!controller.signal.aborted) setDiscoveryResult({ key: discoveryKey, options: [], phase: 'error' }) })
    return () => controller.abort()
  }, [sourceId, sourceSlug, rolesKey, sessionVersion, discoveryKey])
  const logos = [...sourceOptions, ...(purpose === 'logo' && logoSource ? existingLogoOptions(showcase.draft, logoSource) : [])]
  const refreshLogo = useShowcaseMedia(logos.flatMap(option => option.kind === 'reference' ? [option.assetRef] : []))
  const [state, setState] = useState<{ phase: 'idle' | 'sending' | 'error' | 'uncertain'; message: string }>(() => hasUncertainUpload() ? { phase: 'uncertain', message: 'Há um envio sem confirmação nesta sessão. Confira o ocorrido antes de enviar outro arquivo.' } : { phase: 'idle', message: '' })
  const [attempts] = useState(createUploadAttempts)
  // Closing the picker (unmount) abandons a pending attempt; reopening the effect (StrictMode) reopens it.
  useEffect(() => {
    attempts.open()
    return () => { attempts.close(); download.current?.abort() }
  }, [attempts])
  const guide = UPLOAD_GUIDANCE[purpose]

  async function choose(file: File | undefined) {
    if (!file || !canEdit || inProgress.current) return
    inProgress.current = true
    setState({ phase: 'sending', message: `Enviando ${file.name}…` })
    const outcome = await runUploadAttempt(attempts, () => ingestUpload(actor, file, purpose))
    inProgress.current = false
    if (input.current) input.current.value = ''
    if (outcome.status === 'ignored') return
    if (outcome.status === 'error') {
      setState({ phase: outcome.uncertain ? 'uncertain' : 'error', message: outcome.message })
      return
    }
    onPicked({ assetRef: outcome.entry.assetRef, fileName: outcome.entry.fileName, warnings: outcome.warnings, suggestedAlt: '' })
  }

  async function applySelectedLogo() {
    const option = logos.find(item => item.id === selectedId)
    if (!option || !canEdit || inProgress.current || (hasUncertainUpload() && option.kind !== 'reference')) return
    inProgress.current = true
    const controller = new AbortController(); download.current = controller
    setState({ phase: 'sending', message: option.kind === 'reference' ? 'Selecionando mídia…' : 'Preparando uma cópia desta imagem para a WL6…' })
    const outcome = await runUploadAttempt(attempts, () => selectExistingLogo(actor, option, controller.signal))
    inProgress.current = false
    if (outcome.status === 'ignored') return
    if (outcome.status === 'error') {
      setState({ phase: outcome.uncertain ? 'uncertain' : 'error', message: outcome.message })
      return
    }
    onPicked({ assetRef: outcome.entry.assetRef, fileName: outcome.entry.fileName || option.variant, warnings: outcome.warnings, suggestedAlt: option.suggestedAlt })
  }

  return (
    <Dialog
      title={title}
      description="A escolha vale somente para esta posição. Outros cards, o banner e a White Label de origem não mudam."
      icon={ImagePlus}
      size="lg"
      onClose={onClose}
      footer={<OutlineButton onClick={onClose}>Cancelar</OutlineButton>}
    >
      {hasExisting && <div className={styles.logoModes} role="group" aria-label="Forma de escolher a imagem">
        <OutlineButton aria-pressed={mode === 'existing'} disabled={state.phase === 'sending'} onClick={() => setMode('existing')}>Imagens existentes</OutlineButton>
        <OutlineButton aria-pressed={mode === 'upload'} disabled={state.phase === 'sending'} onClick={() => setMode('upload')}>{purpose === 'logo' ? 'Enviar nova logo' : 'Enviar nova imagem'}</OutlineButton>
      </div>}
      {hasExisting && mode === 'existing' && <div className={styles.pickerSection}>
        <h3 className={styles.pickerTitle}>Imagens disponíveis</h3>
        <p className={styles.hint}>As imagens da origem são arquivos de áreas de página (main_area); não são necessariamente logos institucionais. Confira a miniatura e a procedência antes de usar.</p>
        {logoSource && discovery === 'loading' && <p role="status">Consultando imagens de {logoSource.name || logoSource.slug}…</p>}
        {logoSource && discovery === 'empty' && <p className={styles.hint}>A origem não retornou imagens main_area. Isso não significa que a marca não possui logo; outras opções e o envio manual continuam disponíveis.</p>}
        {logoSource && discovery === 'error' && <div role="alert"><p>Não foi possível consultar as imagens da origem. As opções locais e a imagem atual foram preservadas.</p><OutlineButton disabled={state.phase === 'sending'} onClick={() => setReloadOptions(value => value + 1)}>Consultar novamente</OutlineButton></div>}
        <fieldset className={styles.logoChoices} disabled={!canEdit || state.phase === 'sending'}>
          <legend className="visually-hidden">Escolha uma imagem</legend>
          {logos.map(option => <label key={option.id} className={styles.logoChoice}>
            <input type="radio" name="existing-logo" value={option.id} checked={selectedId === option.id} onChange={() => setSelectedId(option.id)} />
            <OptionThumbnail option={option} refresh={refreshLogo} />
            <strong>{option.whitelabel}</strong><span>{option.variant}</span><small>{option.provenance}</small>
            <small>{option.kind === 'reference' ? 'Reutiliza a mídia da WL6, sem novo envio.' : 'Cria uma nova referência na WL6 somente ao confirmar o uso.'}</small>
          </label>)}
        </fieldset>
        {!logos.length && discovery !== 'loading' && <p className={styles.hint}>Nenhuma opção disponível neste contexto.</p>}
        <OutlineButton onClick={() => void applySelectedLogo()} disabled={!canEdit || !logos.some(item => item.id === selectedId) || state.phase === 'sending' || (hasUncertainUpload() && logos.find(item => item.id === selectedId)?.kind !== 'reference')}>
          {state.phase === 'sending' && <LoaderCircle size={16} className={styles.spin} aria-hidden="true" />}Usar imagem selecionada
        </OutlineButton>
      </div>}
      {mode === 'upload' && <div className={styles.pickerSection}>
        <h3 className={styles.pickerTitle}>{purpose === 'logo' ? 'Enviar nova logo' : 'Enviar arquivo'}</h3>
        <p className={styles.hint}>{guide.summary}</p>
        <input ref={input} className="visually-hidden" type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg" tabIndex={-1} aria-hidden="true" onChange={event => void choose(event.target.files?.[0])} />
        <OutlineButton onClick={() => input.current?.click()} disabled={!canEdit || state.phase === 'sending' || state.phase === 'uncertain'}>
          {state.phase === 'sending' ? <LoaderCircle size={16} className={styles.spin} aria-hidden="true" /> : <Upload size={16} aria-hidden="true" />}
          Escolher arquivo JPG ou PNG
        </OutlineButton>
      </div>}
      <p className={state.phase === 'error' || state.phase === 'uncertain' ? styles.errorText : styles.hint} role={state.phase === 'error' || state.phase === 'uncertain' ? 'alert' : 'status'}>{state.message}</p>
      {!SHOWCASE_V2_WRITES_ENABLED && <p role="status">Consulta disponível. Cópia, envio e salvamento aguardam a atualização dos leitores.</p>}
      <p className={styles.hint}>A imagem só entra na configuração depois de “Salvar alterações”. Fechar este seletor impede a aplicação de um resultado pendente, mas não comprova o cancelamento de uma operação já enviada ao servidor. Nenhum arquivo original é alterado ou excluído.</p>
    </Dialog>
  )
}
