import { useEffect, useRef, useState } from 'react'
import { ImagePlus, LoaderCircle, Upload } from 'lucide-react'
import { Dialog } from '../../../components/ui/Dialog'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import { createUploadAttempts, hasUncertainUpload, ingestUpload, mediaUrl, runUploadAttempt, UPLOAD_GUIDANCE, type UploadPurpose } from '../showcaseMedia'
import { existingLogoOptions, selectExistingLogo } from '../showcaseLogoCatalog'
import type { CardSource } from '../showcaseModel'
import { useShowcaseState } from '../showcaseStore'
import { useShowcaseMedia } from '../public/useShowcaseMedia'
import { useShowcaseActor } from './editorHooks'
import styles from './ShowcaseEditor.module.css'

export type PickedMedia = { assetRef: string; fileName: string; warnings: string[]; suggestedAlt: string }

/** A completed upload applies only to the still-open picker and its current attempt. */
export function MediaPickerDialog({ purpose, title, logoSource, onPicked, onClose }: {
  purpose: UploadPurpose
  title: string
  logoSource?: CardSource
  onPicked: (media: PickedMedia) => void
  onClose: () => void
}) {
  const { actor, canEdit } = useShowcaseActor()
  const input = useRef<HTMLInputElement>(null)
  const inProgress = useRef(false)
  const download = useRef<AbortController | null>(null)
  const [mode, setMode] = useState<'existing' | 'upload'>(purpose === 'logo' ? 'existing' : 'upload')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const showcase = useShowcaseState()
  const logos = purpose === 'logo' && logoSource ? existingLogoOptions(showcase.draft, logoSource) : []
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
    if (!option || !canEdit || inProgress.current || (hasUncertainUpload() && option.kind === 'file')) return
    inProgress.current = true
    const controller = new AbortController(); download.current = controller
    setState({ phase: 'sending', message: option.kind === 'reference' ? 'Selecionando logo…' : 'Preparando uma cópia desta logo para a vitrine…' })
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
      {purpose === 'logo' && <div className={styles.logoModes} role="group" aria-label="Forma de escolher a logo">
        <OutlineButton aria-pressed={mode === 'existing'} disabled={state.phase === 'sending'} onClick={() => setMode('existing')}>Usar logo existente</OutlineButton>
        <OutlineButton aria-pressed={mode === 'upload'} disabled={state.phase === 'sending'} onClick={() => setMode('upload')}>Enviar nova logo</OutlineButton>
      </div>}
      {purpose === 'logo' && mode === 'existing' && <div className={styles.pickerSection}>
        <h3 className={styles.pickerTitle}>Logos disponíveis</h3>
        <p className={styles.hint}>Primeiro as opções da origem deste card. Inclui logos já vinculadas à vitrine e arquivos identificados do site; não é um catálogo global de marcas.</p>
        <fieldset className={styles.logoChoices} disabled={!canEdit || state.phase === 'sending'}>
          <legend className="visually-hidden">Escolha uma logo</legend>
          {logos.map(option => <label key={option.id} className={styles.logoChoice}>
            <input type="radio" name="existing-logo" value={option.id} checked={selectedId === option.id} onChange={() => setSelectedId(option.id)} />
            <span className={styles.logoThumbnail} data-background={option.background}>
              <img src={option.kind === 'reference' ? mediaUrl(option.assetRef) || undefined : option.url} alt={`${option.whitelabel} — ${option.variant}`} onError={() => { if (option.kind === 'reference') refreshLogo(option.assetRef) }} />
            </span>
            <strong>{option.whitelabel}</strong><span>{option.variant}</span><small>{option.provenance}</small>
            <small>{option.kind === 'reference' ? 'Reutiliza a mídia da WL6, sem novo envio.' : 'Cria uma cópia para a WL6 somente ao usar esta logo.'}</small>
          </label>)}
        </fieldset>
        {!logos.length && <p className={styles.hint}>Nenhuma logo identificada está disponível neste contexto. Você pode enviar uma nova logo.</p>}
        <OutlineButton onClick={() => void applySelectedLogo()} disabled={!canEdit || !selectedId || state.phase === 'sending' || (hasUncertainUpload() && logos.find(item => item.id === selectedId)?.kind === 'file')}>
          {state.phase === 'sending' && <LoaderCircle size={16} className={styles.spin} aria-hidden="true" />}Usar logo selecionada
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
      <p className={styles.hint}>A imagem só entra na configuração depois de “Salvar alterações”. Fechar este seletor impede a aplicação de um resultado pendente. Nenhum arquivo original é alterado.</p>
    </Dialog>
  )
}
