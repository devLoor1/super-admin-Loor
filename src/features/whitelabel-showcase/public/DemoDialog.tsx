/* Ported from FRONT-WEB/src/views/mock/whitelabels/DemoDialog.tsx (approved demonstrative CTA dialog). Logic unchanged; lucide icons. */
import { useEffect, useId, useRef } from 'react'
import { ArrowRight, X } from 'lucide-react'

export interface DemoContent {
  title: string
  description: string
  image?: string
  imageAlt?: string
}

interface Props {
  content: DemoContent | null
  onClose: () => void
  headingLevel?: 2 | 3 | 4
}

export function DemoDialog({ content, onClose, headingLevel = 2 }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const restoreFocus = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const descriptionId = useId()
  const Heading = `h${headingLevel}` as 'h2'

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (content && !element.open) {
      restoreFocus.current = document.activeElement as HTMLElement
      element.showModal()
    } else if (!content && element.open) {
      element.close()
      restoreFocus.current?.focus()
    }
  }, [content])

  useEffect(() => {
    const element = dialog.current
    if (!element || !content) return
    // Keep Tab within the modal; native dialog also makes the background inert.
    const containFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const controls = element.querySelectorAll<HTMLButtonElement>('button:not([disabled])')
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
    const dismissBackdrop = (event: MouseEvent) => {
      if (event.target !== element) return
      const rect = element.getBoundingClientRect()
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose()
    }
    element.addEventListener('click', dismissBackdrop)
    element.addEventListener('keydown', containFocus)
    return () => {
      element.removeEventListener('click', dismissBackdrop)
      element.removeEventListener('keydown', containFocus)
    }
  }, [content, onClose])

  return (
    <dialog
      ref={dialog}
      className="wl-dialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => { event.preventDefault(); onClose() }}
    >
      {content && <>
        <button type="button" className="wl-dialog-close wl-icon-button" aria-label="Fechar demonstração" onClick={onClose}><X aria-hidden="true" /></button>
        <p className="wl-eyebrow">DEMONSTRAÇÃO VISUAL</p>
        <Heading id={titleId} className="wl-dialog-title">{content.title}</Heading>
        {content.image && <img className="wl-dialog-image" src={content.image} alt={content.imageAlt ?? ''} width={1774} height={887} />}
        <p id={descriptionId}>{content.description}</p>
        <p className="wl-demo-note">Nenhum cadastro, envio ou operação é realizado nesta prévia.</p>
        <button type="button" className="wl-button wl-button--blue" onClick={onClose}>Voltar à vitrine <ArrowRight aria-hidden="true" /></button>
      </>}
    </dialog>
  )
}
