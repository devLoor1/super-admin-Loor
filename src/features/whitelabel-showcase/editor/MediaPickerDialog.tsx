import { useEffect, useRef, useState } from 'react'
import { ImagePlus, LoaderCircle, Upload } from 'lucide-react'
import { Dialog } from '../../../components/ui/Dialog'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import { createUploadAttempts, hasUncertainUpload, ingestUpload, runUploadAttempt, UPLOAD_GUIDANCE, type UploadPurpose } from '../showcaseMedia'
import { useShowcaseActor } from './editorHooks'
import styles from './ShowcaseEditor.module.css'

export type PickedMedia = { assetRef: string; fileName: string; warnings: string[]; suggestedAlt: string }

/** A completed upload applies only to the still-open picker and its current attempt. */
export function MediaPickerDialog({ purpose, title, onPicked, onClose }: {
  purpose: UploadPurpose
  title: string
  onPicked: (media: PickedMedia) => void
  onClose: () => void
}) {
  const { actor, canEdit } = useShowcaseActor()
  const input = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<{ phase: 'idle' | 'sending' | 'error' | 'uncertain'; message: string }>(() => hasUncertainUpload() ? { phase: 'uncertain', message: 'Há um envio sem confirmação nesta sessão. Confira o ocorrido antes de enviar outro arquivo.' } : { phase: 'idle', message: '' })
  const [attempts] = useState(createUploadAttempts)
  // Closing the picker (unmount) abandons a pending attempt; reopening the effect (StrictMode) reopens it.
  useEffect(() => {
    attempts.open()
    return () => attempts.close()
  }, [attempts])
  const guide = UPLOAD_GUIDANCE[purpose]

  async function choose(file: File | undefined) {
    if (!file || !canEdit) return
    setState({ phase: 'sending', message: `Enviando ${file.name}…` })
    const outcome = await runUploadAttempt(attempts, () => ingestUpload(actor, file, purpose))
    if (input.current) input.current.value = ''
    if (outcome.status === 'ignored') return
    if (outcome.status === 'error') {
      setState({ phase: outcome.uncertain ? 'uncertain' : 'error', message: outcome.message })
      return
    }
    onPicked({ assetRef: outcome.entry.assetRef, fileName: outcome.entry.fileName, warnings: outcome.warnings, suggestedAlt: '' })
  }

  return (
    <Dialog
      title={title}
      description="O novo arquivo vale somente para esta posição deste contexto. Outros cards, o banner e a origem não mudam."
      icon={ImagePlus}
      size="lg"
      onClose={onClose}
      footer={<OutlineButton onClick={onClose}>Cancelar</OutlineButton>}
    >
      <div className={styles.pickerSection}>
        <h3 className={styles.pickerTitle}>Enviar arquivo</h3>
        <p className={styles.hint}>{guide.summary}</p>
        <input ref={input} className="visually-hidden" type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg" tabIndex={-1} aria-hidden="true" onChange={event => void choose(event.target.files?.[0])} />
        <OutlineButton onClick={() => input.current?.click()} disabled={!canEdit || state.phase === 'sending' || state.phase === 'uncertain'}>
          {state.phase === 'sending' ? <LoaderCircle size={16} className={styles.spin} aria-hidden="true" /> : <Upload size={16} aria-hidden="true" />}
          Escolher arquivo JPG ou PNG
        </OutlineButton>
        <p className={state.phase === 'error' || state.phase === 'uncertain' ? styles.errorText : styles.hint} role={state.phase === 'error' || state.phase === 'uncertain' ? 'alert' : 'status'}>{state.message}</p>
        <p className={styles.hint}>O arquivo é enviado para a mídia da vitrine. A imagem só entra na configuração depois de “Salvar alterações”. Fechar este seletor impede a aplicação de um resultado pendente.</p>
      </div>
    </Dialog>
  )
}
