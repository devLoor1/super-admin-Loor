import { useEffect, useRef, useState } from 'react'
import { ImagePlus, LoaderCircle, Upload } from 'lucide-react'
import { Dialog } from '../../../components/ui/Dialog'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import { approvedExamples, createUploadAttempts, ingestUpload, runUploadAttempt, UPLOAD_GUIDANCE, type MediaEntry, type UploadPurpose } from '../showcaseMedia'
import { useShowcaseActor } from './editorHooks'
import styles from './ShowcaseEditor.module.css'

export type PickedMedia = { assetRef: string; fileName: string; warnings: string[]; suggestedAlt: string }

/**
 * Chooses the media for one association: a local file (validated, referenced
 * by a blob: URL, never uploaded) or an approved example bundled with the mock.
 * Either way the caller creates a NEW, independent association/reference.
 * An upload still processing when the picker closes (X, Escape, backdrop) or
 * when another choice is made is abandoned: its result is never delivered.
 */
export function MediaPickerDialog({ purpose, title, onPicked, onClose }: {
  purpose: UploadPurpose
  title: string
  onPicked: (media: PickedMedia) => void
  onClose: () => void
}) {
  const { actor } = useShowcaseActor()
  const input = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<{ phase: 'idle' | 'sending' | 'error'; message: string }>({ phase: 'idle', message: '' })
  const [attempts] = useState(createUploadAttempts)
  // Closing the picker (unmount) abandons a pending attempt; reopening the effect (StrictMode) reopens it.
  useEffect(() => {
    attempts.open()
    return () => attempts.close()
  }, [attempts])
  const examples = approvedExamples(purpose === 'logo' ? 'logo' : 'foto')
  const guide = UPLOAD_GUIDANCE[purpose]

  async function choose(file: File | undefined) {
    if (!file) return
    setState({ phase: 'sending', message: `Enviando ${file.name}… (simulado: o arquivo permanece neste navegador)` })
    const outcome = await runUploadAttempt(attempts, () => ingestUpload(actor, file, purpose))
    if (input.current) input.current.value = ''
    if (outcome.status === 'ignored') return
    if (outcome.status === 'error') {
      setState({ phase: 'error', message: outcome.message })
      return
    }
    onPicked({ assetRef: outcome.entry.assetRef, fileName: outcome.entry.fileName, warnings: outcome.warnings, suggestedAlt: '' })
  }

  const pickExample = (entry: MediaEntry) => {
    attempts.supersede()
    onPicked({ assetRef: entry.assetRef, fileName: entry.fileName, warnings: [], suggestedAlt: '' })
  }

  return (
    <Dialog
      title={title}
      description="O novo arquivo vale somente para esta posição deste contexto. Outros cards, o banner e a origem não mudam."
      icon={ImagePlus}
      size="lg"
      onClose={onClose}
      footer={<OutlineButton onClick={onClose} disabled={state.phase === 'sending'}>Cancelar</OutlineButton>}
    >
      <div className={styles.pickerSection}>
        <h3 className={styles.pickerTitle}>Enviar arquivo</h3>
        <p className={styles.hint}>{guide.summary}</p>
        <input ref={input} className="visually-hidden" type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg" tabIndex={-1} aria-hidden="true" onChange={event => void choose(event.target.files?.[0])} />
        <OutlineButton onClick={() => input.current?.click()} disabled={state.phase === 'sending'}>
          {state.phase === 'sending' ? <LoaderCircle size={16} className={styles.spin} aria-hidden="true" /> : <Upload size={16} aria-hidden="true" />}
          Escolher arquivo JPG ou PNG
        </OutlineButton>
        <p className={state.phase === 'error' ? styles.errorText : styles.hint} role={state.phase === 'error' ? 'alert' : 'status'}>{state.message}</p>
        <p className={styles.hint}>Envio simulado: a referência existe só nesta aba e desaparece ao recarregar. Nenhum arquivo é transmitido.</p>
      </div>
      <div className={styles.pickerSection}>
        <h3 className={styles.pickerTitle}>Ou usar um exemplo aprovado (somente mock)</h3>
        <ul className={styles.exampleGrid} data-kind={purpose === 'logo' ? 'logo' : 'foto'}>
          {examples.map(entry => (
            <li key={entry.assetRef}>
              <button type="button" className={styles.exampleButton} onClick={() => pickExample(entry)} disabled={state.phase === 'sending'}>
                <img src={entry.url} alt="" width={entry.width ?? undefined} height={entry.height ?? undefined} loading="lazy" />
                <span>{entry.fileName}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Dialog>
  )
}
