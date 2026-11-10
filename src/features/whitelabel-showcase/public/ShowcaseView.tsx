/*
 * Document-driven port of FRONT-WEB/src/views/mock/whitelabels/WhitelabelShowcase.tsx.
 * Preserved: hero copy/CTAs (fixed in V1), portfolio heading and note, card geometry,
 * independent carousels, closing section, header/footer and demonstrative dialogs.
 * New (approved proposal): optional introductory section between hero and cards;
 * banner, cards and their media come from the configuration document.
 * React keys and DOM ids use the card instance id, never the source White Label.
 */
import { useState, type CSSProperties, type MouseEvent } from 'react'
import { ArrowRight, ImageOff } from 'lucide-react'
import { mediaUrl, resolveMedia } from '../showcaseMedia'
import { lowerPanelColor, type CardInstance, type ImageAssociation, type ShowcaseDocument } from '../showcaseModel'
import { CardImageCarousel } from './CardImageCarousel'
import { DemoDialog, type DemoContent } from './DemoDialog'
import { ImageCarousel } from './ImageCarousel'
import { MarkdownContent } from './MarkdownContent'
import { Heading, regulatoryNotice, ShowcaseFooter, ShowcaseHeader } from './ShowcaseChrome'
import type { ShowcaseSlide } from './showcaseTypes'
import './showcase.css'
import { useShowcaseMedia } from './useShowcaseMedia'

export type ShowcaseSection = 'header' | 'hero' | 'intro' | 'portfolio' | 'closing' | 'footer'
const ALL_SECTIONS: readonly ShowcaseSection[] = ['header', 'hero', 'intro', 'portfolio', 'closing', 'footer']

type Props = {
  document: ShowcaseDocument
  sections?: readonly ShowcaseSection[]
  /** Unique per rendered instance (editor previews and the public page may coexist). */
  idPrefix: string
  /** Editor preview: no sticky header/skip link; heading levels shifted below the panel heading. */
  embedded?: boolean
  headingOffset?: number
  portfolioHeading?: boolean
  portfolioNote?: boolean
  /** Editor-only placeholders for missing media; never used by the public projection. */
  editorPlaceholders?: boolean
  parallax?: boolean
}

function slidesFor(images: readonly ImageAssociation[], refresh: (assetRef: string) => void): ShowcaseSlide[] {
  return images.flatMap(image => {
    const entry = resolveMedia(image.assetRef)
    return entry?.url ? [{ id: image.associationId, src: entry.url, onError: () => refresh(image.assetRef), alt: image.decorative ? '' : image.alt, width: entry.width ?? undefined, height: entry.height ?? undefined }] : []
  })
}

function cardStyle(card: CardInstance): CSSProperties {
  return { '--wl-panel': card.colors.panel, '--wl-panel-lower': lowerPanelColor(card.colors.panel), '--wl-divider': card.colors.divider } as CSSProperties
}

function MissingMedia({ label }: { label: string }) {
  return <div className="wl-missing-media"><ImageOff aria-hidden="true" /><span>{label}</span></div>
}

export function ShowcaseView({ document, sections = ALL_SECTIONS, idPrefix, embedded = false, headingOffset = 0, portfolioHeading = true, portfolioNote = true, editorPlaceholders = false, parallax = true }: Props) {
  const [dialog, setDialog] = useState<DemoContent | null>(null)
  const refreshMedia = useShowcaseMedia([...document.banner.images.map(image => image.assetRef), ...document.cards.flatMap(card => [...card.images.map(image => image.assetRef), ...(card.logo ? [card.logo.assetRef] : [])])])
  const show = (section: ShowcaseSection) => sections.includes(section)
  const level = (base: number) => base + headingOffset
  const ids = { hero: `${idPrefix}-inicio`, portfolio: `${idPrefix}-plataformas`, main: `${idPrefix}-conteudo` }
  const scrollTo = (id: string) => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    window.document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }
  const contact = () => setDialog({
    title: 'Uma White Label com a sua marca.',
    description: 'Esta demonstração apresenta como uma plataforma LOØR pode expressar a identidade do seu município. O canal de conversa comercial será definido para a versão final.',
  })
  const openPlatform = (card: CardInstance, slides: ShowcaseSlide[]) => setDialog({
    title: card.displayName,
    description: `${card.shortDescription} Prévia do card. O destino comercial será definido para a vitrine pública.`,
    image: slides[0]?.src,
    imageAlt: slides[0]?.alt,
  })
  const demonstrate = (label: string) => setDialog({
    title: label,
    description: label === 'Aviso regulatório' ? regulatoryNotice
      : label === 'Idioma — Português' ? 'Esta prévia da vitrine está disponível em português brasileiro.'
        : label === 'Aparência — tema claro' ? 'A direção visual em avaliação utiliza o tema claro da LOØR.'
          : `O item “${label}” preserva a navegação da homepage de referência. Seu destino não está conectado nesta demonstração da vitrine.`,
  })
  const bannerSlides = slidesFor(document.banner.images, refreshMedia)
  // Only the full page owns a main landmark; editor previews live inside the Super Admin <main>.
  const Main = embedded ? 'div' : 'main'
  const intro = document.introduction

  return (
    <div className={`wl-page${embedded ? ' wl-page--embedded' : ''}`}>
      <div className="wl-showcase">
        {!embedded && <a className="wl-skip-link" href={`#${ids.main}`} onClick={(event: MouseEvent) => { event.preventDefault(); window.document.getElementById(ids.main)?.focus() }}>Pular para o conteúdo</a>}
        {show('header') && <ShowcaseHeader onDemonstrate={demonstrate} onHome={() => scrollTo(ids.hero)} />}
        <Main id={ids.main} tabIndex={embedded ? undefined : -1} className="wl-main">
          {show('hero') && <section id={ids.hero} className="wl-hero" aria-labelledby={`${idPrefix}-hero-title`}>
            <div className="wl-hero-scene">
              {bannerSlides.length
                ? <ImageCarousel key={bannerSlides.map(slide => slide.id).join('|')} id={`${idPrefix}-hero`} label="Hero — plataformas LOØR" slides={bannerSlides} parallax={parallax} />
                : editorPlaceholders ? <MissingMedia label="Banner sem imagem" /> : null}
            </div>
            <div className="wl-container wl-hero-content">
              <div className="wl-hero-message">
                <p className="wl-eyebrow">PLATAFORMAS WHITE LABEL LOØR</p>
                <Heading level={level(1)} className="wl-hero-title" id={`${idPrefix}-hero-title`}>Sua marca.<br />Sua plataforma.<br />Seu <span>impacto.</span></Heading>
                <p className="wl-hero-description">Uma plataforma de financiamento coletivo com a identidade do seu município.</p>
                <div className="wl-hero-actions">
                  <button type="button" className="wl-button wl-button--white" onClick={contact}>Quero uma White Label</button>
                  <a href={`#${ids.portfolio}`} className="wl-button wl-button--outline" onClick={(event) => { event.preventDefault(); scrollTo(ids.portfolio) }}>Conheça as plataformas</a>
                </div>
              </div>
            </div>
          </section>}
          {show('intro') && intro && <section className="wl-container wl-intro" aria-labelledby={`${idPrefix}-intro-title`}>
            <Heading level={level(2)} className="wl-intro-title" id={`${idPrefix}-intro-title`}>{intro.title}</Heading>
            {intro.subtitle.trim() ? <p className="wl-intro-subtitle">{intro.subtitle}</p> : null}
            <MarkdownContent className="wl-intro-body" source={intro.bodyMarkdown} />
          </section>}
          {show('portfolio') && <section id={ids.portfolio} className="wl-container wl-portfolio" aria-labelledby={portfolioHeading ? `${idPrefix}-portfolio-title` : undefined} aria-label={portfolioHeading ? undefined : 'Cards de White Labels'}>
            {portfolioHeading && <Heading level={level(2)} className="wl-portfolio-title" id={`${idPrefix}-portfolio-title`}>Uma tecnologia. Diferentes identidades.</Heading>}
            <div className="wl-platforms">
              {document.cards.map(card => {
                const slides = slidesFor(card.images, refreshMedia)
                const logoUrl = mediaUrl(card.logo?.assetRef)
                const logoEntry = card.logo ? resolveMedia(card.logo.assetRef) : undefined
                const nameId = `${idPrefix}-card-${card.instanceId}-name`
                return <article key={card.instanceId} className="wl-platform" style={cardStyle(card)} aria-labelledby={nameId}>
                  {slides.length
                    ? <CardImageCarousel key={slides.map(slide => slide.id).join('|')} id={`${idPrefix}-card-${card.instanceId}`} label={card.displayName} slides={slides} parallax={parallax} />
                    : <div className="wl-carousel wl-carousel--card">{editorPlaceholders ? <MissingMedia label="Adicione ao menos uma fotografia" /> : null}</div>}
                  <div className="wl-platform-info">
                    <Heading level={level(3)} className="wl-platform-name" id={nameId}>
                      {logoUrl
                        ? <img className="wl-brand-logo" src={logoUrl} alt={card.logo?.alt ?? card.displayName} width={logoEntry?.width ?? 2172} height={logoEntry?.height ?? 724} loading="lazy" onError={() => card.logo && refreshMedia(card.logo.assetRef)} />
                        : <span className="wl-brand-fallback">{card.displayName || (editorPlaceholders ? 'Logo ausente' : '')}</span>}
                    </Heading>
                    <div className="wl-platform-details">
                      <p>{card.shortDescription}</p>
                      <button type="button" className="wl-platform-link" aria-label={`Conhecer plataforma ${card.displayName}`} onClick={() => openPlatform(card, slides)}>Conhecer plataforma <ArrowRight aria-hidden="true" /></button>
                    </div>
                  </div>
                </article>
              })}
            </div>
            {portfolioNote && <p className="wl-portfolio-note">Marcas e segmentos ilustrativos.</p>}
          </section>}
          {show('closing') && <section className="wl-closing" aria-labelledby={`${idPrefix}-closing-title`}>
            <div className="wl-container wl-closing-inner">
              <div>
                <Heading level={level(2)} className="wl-closing-title" id={`${idPrefix}-closing-title`}>A próxima plataforma pode levar a sua marca.</Heading>
                <p>Converse com a LOØR sobre uma White Label para o seu município.</p>
              </div>
              <button type="button" className="wl-button wl-button--blue" onClick={contact}>Quero uma White Label</button>
            </div>
          </section>}
        </Main>
        {show('footer') && <ShowcaseFooter onDemonstrate={demonstrate} headingLevel={level(2)} />}
        <DemoDialog content={dialog} onClose={() => setDialog(null)} headingLevel={Math.min(4, level(2)) as 2 | 3 | 4} />
      </div>
    </div>
  )
}
