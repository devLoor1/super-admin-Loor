import { Info } from 'lucide-react'
import type { ImageAssociation } from '../showcaseModel'
import { updateDraft } from '../showcaseStore'
import { fieldIds } from '../showcaseValidation'
import { useShowcaseActor } from './editorHooks'
import { ImageListEditor } from './ImageListEditor'
import styles from './ShowcaseEditor.module.css'

/** Board 03: banner photographs only. Hero copy and CTAs are preserved in V1. */
export function BannerTab({ images, showErrors }: { images: readonly ImageAssociation[]; showErrors: boolean }) {
  const { actor, canEdit } = useShowcaseActor()
  return (
    <section className={styles.panel} aria-labelledby="vitrine-banner-titulo">
      <header className={styles.panelHead}>
        <div>
          <h2 className={styles.panelTitle} id="vitrine-banner-titulo">Imagens do banner</h2>
          <p className={styles.panelSubtitle}>De 1 a 4 imagens. Ordem independente dos cards.</p>
        </div>
      </header>
      <ImageListEditor
        images={images}
        purpose="banner"
        listId={fieldIds.bannerList}
        readOnly={!canEdit}
        showErrors={showErrors}
        onChange={next => updateDraft(actor, draft => ({ ...draft, banner: { images: next } }))}
      />
      <p className={styles.infoBox}><Info size={16} aria-hidden="true" />Mantenha o assunto principal ao centro ou à direita: o texto do banner ocupa a esquerda e, no celular, a foto não é exibida.</p>
      <p className={styles.panelFoot}><Info size={16} aria-hidden="true" />Texto e CTAs do banner preservados na V1.</p>
    </section>
  )
}
