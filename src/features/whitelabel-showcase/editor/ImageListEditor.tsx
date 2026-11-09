import { useState, type DragEvent } from 'react'
import { ArrowDown, ArrowUp, GripVertical, ImageOff, Plus, Trash2, Upload } from 'lucide-react'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import { mediaUrl, resolveMedia, UPLOAD_GUIDANCE, type UploadPurpose } from '../showcaseMedia'
import { addImage, MAX_IMAGES, moveItem, newImageAssociation, removeImage, replaceImage, type ImageAssociation } from '../showcaseModel'
import { fieldIds } from '../showcaseValidation'
import { MediaPickerDialog, type PickedMedia } from './MediaPickerDialog'
import styles from './ShowcaseEditor.module.css'

type Picker = { mode: 'add' } | { mode: 'replace'; associationId: string; position: number }

/**
 * Ordered list of 1–4 image associations for ONE context (banner or one card).
 * Add, replace and remove act only on this list; drag-and-drop has accessible
 * "move up/down" alternatives with announced positions.
 */
export function ImageListEditor({ images, onChange, purpose, listId, readOnly, showErrors }: {
  images: readonly ImageAssociation[]
  onChange: (images: ImageAssociation[]) => void
  purpose: Exclude<UploadPurpose, 'logo'>
  listId: string
  readOnly: boolean
  showErrors: boolean
}) {
  const [picker, setPicker] = useState<Picker | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [warnings, setWarnings] = useState<Record<string, string[]>>({})
  const [dragging, setDragging] = useState<number | null>(null)
  const full = images.length >= MAX_IMAGES

  function picked(media: PickedMedia) {
    if (!picker) return
    let next: ImageAssociation[]
    let associationId: string
    if (picker.mode === 'add') {
      const association = newImageAssociation(media.assetRef, media.fileName)
      next = addImage(images, association)
      associationId = association.associationId
      setAnnouncement(`Imagem adicionada na posição ${next.length} de ${next.length}. Descreva-a ou marque-a como decorativa.`)
    } else {
      next = replaceImage(images, picker.associationId, media.assetRef, media.fileName)
      associationId = next[picker.position].associationId
      setAnnouncement(`Imagem ${picker.position + 1} substituída. A referência anterior não foi apagada.`)
    }
    setWarnings(current => ({ ...current, [associationId]: media.warnings }))
    setPicker(null)
    onChange(next)
    window.requestAnimationFrame(() => document.getElementById(fieldIds.imageAlt(associationId))?.focus())
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= images.length) return
    onChange(moveItem(images, from, to))
    setAnnouncement(`Imagem movida para a posição ${to + 1} de ${images.length}.`)
  }

  function update(associationId: string, patch: Partial<ImageAssociation>) {
    onChange(images.map(image => image.associationId === associationId ? { ...image, ...patch } : image))
  }

  const onDrop = (event: DragEvent, to: number) => {
    event.preventDefault()
    if (dragging !== null) move(dragging, to)
    setDragging(null)
  }

  return (
    <div className={styles.imageList} id={listId} tabIndex={-1}>
      <p className={styles.counter}>{images.length} de {MAX_IMAGES}</p>
      {images.length === 0 ? (
        <div className={styles.missingBox} data-invalid={showErrors || undefined}>
          <ImageOff size={22} aria-hidden="true" />
          <p>Adicione ao menos uma fotografia.</p>
        </div>
      ) : null}
      <ol className={styles.imageRows}>
        {images.map((image, index) => {
          const url = mediaUrl(image.assetRef)
          const entry = resolveMedia(image.assetRef)
          const altId = fieldIds.imageAlt(image.associationId)
          const altMissing = !image.decorative && !image.alt.trim()
          return (
            <li
              key={image.associationId}
              className={styles.imageRow}
              data-dragging={dragging === index || undefined}
              onDragOver={event => { if (dragging !== null) event.preventDefault() }}
              onDrop={event => onDrop(event, index)}
            >
              <div className={styles.rowMain}>
                {/* Only the handle starts a drag, so text fields inside the row stay selectable. */}
                <span
                  className={styles.handle}
                  aria-hidden="true"
                  draggable={!readOnly}
                  onDragStart={event => {
                    setDragging(index)
                    event.dataTransfer.effectAllowed = 'move'
                    event.dataTransfer.setData('text/plain', image.associationId)
                    const row = event.currentTarget.closest('li')
                    if (row) event.dataTransfer.setDragImage(row, 24, 24)
                  }}
                  onDragEnd={() => setDragging(null)}
                ><GripVertical size={18} /></span>
                <span className={styles.order} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <span className={styles.thumb}>{url ? <img src={url} alt="" /> : <ImageOff size={18} aria-label="Arquivo indisponível" />}</span>
                <span className={styles.fileName}>
                  <span className="visually-hidden">Imagem {index + 1}: </span>{image.fileName}
                  <small>{entry?.origin === 'upload-simulado' ? 'Envio simulado nesta aba' : entry?.origin === 'aprovado' ? 'Exemplo aprovado' : url ? 'Referência existente' : 'Arquivo indisponível nesta sessão'}</small>
                </span>
                {!readOnly && <span className={styles.rowActions}>
                  <OutlineButton onClick={() => setPicker({ mode: 'replace', associationId: image.associationId, position: index })}><Upload size={15} aria-hidden="true" />Substituir<span className="visually-hidden"> imagem {index + 1}</span></OutlineButton>
                  <OutlineButton onClick={() => { onChange(removeImage(images, image.associationId)); setAnnouncement(`Imagem ${index + 1} removida desta lista. O arquivo não foi apagado.`) }}><Trash2 size={15} aria-hidden="true" />Remover<span className="visually-hidden"> imagem {index + 1}</span></OutlineButton>
                  <button type="button" className={styles.iconButton} aria-label={`Mover imagem ${index + 1} para cima`} disabled={index === 0} onClick={() => move(index, index - 1)}><ArrowUp size={16} aria-hidden="true" /></button>
                  <button type="button" className={styles.iconButton} aria-label={`Mover imagem ${index + 1} para baixo`} disabled={index === images.length - 1} onClick={() => move(index, index + 1)}><ArrowDown size={16} aria-hidden="true" /></button>
                </span>}
              </div>
              <div className={styles.altRow}>
                <label className={styles.inlineField}>
                  <span>Texto alternativo</span>
                  <input id={altId} value={image.alt} disabled={readOnly || image.decorative} placeholder={image.decorative ? 'Imagem decorativa: alt vazio' : 'Descreva o conteúdo da imagem'} aria-invalid={showErrors && altMissing ? true : undefined} aria-describedby={`${altId}-hint`} onChange={event => update(image.associationId, { alt: event.target.value })} />
                </label>
                <label className={styles.checkField}>
                  <input type="checkbox" checked={image.decorative} disabled={readOnly} onChange={event => update(image.associationId, { decorative: event.target.checked })} />
                  Decorativa
                </label>
                <small id={`${altId}-hint`} className={showErrors && altMissing ? styles.errorText : styles.hint}>
                  {image.decorative ? 'Leitores de tela ignoram imagens decorativas.' : altMissing ? 'Obrigatório para imagens informativas.' : 'Informativa: o texto é lido por leitores de tela.'}
                </small>
              </div>
              {warnings[image.associationId]?.length ? <ul className={styles.warningList}>{warnings[image.associationId].map(text => <li key={text}>{text}</li>)}</ul> : null}
            </li>
          )
        })}
      </ol>
      {!readOnly && <button type="button" className={styles.addDashed} disabled={full} onClick={() => setPicker({ mode: 'add' })}>
        <Plus size={18} aria-hidden="true" />{full ? `Limite de ${MAX_IMAGES} imagens atingido` : 'Adicionar imagem'}
      </button>}
      <p className={styles.hint}>{UPLOAD_GUIDANCE[purpose].summary}</p>
      <p className="visually-hidden" aria-live="polite" aria-atomic="true">{announcement}</p>
      {picker && <MediaPickerDialog
        purpose={purpose}
        title={picker.mode === 'add' ? 'Adicionar imagem' : `Substituir imagem ${String(picker.position + 1).padStart(2, '0')}`}
        onPicked={picked}
        onClose={() => setPicker(null)}
      />}
    </div>
  )
}
