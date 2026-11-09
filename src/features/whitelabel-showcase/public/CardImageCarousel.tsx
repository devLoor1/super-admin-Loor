/*
 * Ported from FRONT-WEB/src/views/mock/whitelabels/CardImageCarousel.tsx (approved showcase).
 * Preserved: crossfade slides, 5 s autoplay after decode, pause on hover/focus/hidden/off-screen,
 * explicit pause, reduced motion, dots with ←/→/Home/End, swipe, parallax, aria-hidden inactive slides.
 * Adapted (COMPORTAMENTO-E-MIDIA.md "ajustes futuros"): a single image renders statically without
 * carousel region, dots, play/pause or announcements; DOM ids come from the card instance id;
 * decode state is tracked per slide id so edited lists stay consistent; lucide icons replace react-icons/fi.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { Pause, Play } from 'lucide-react'
import { swipeDirection } from './motion'
import type { Point } from './motion'
import { useCardAutoplay } from './useCardAutoplay'
import { usePointerParallax } from './usePointerParallax'
import type { ShowcaseSlide } from './showcaseTypes'

type Props = { id: string; label: string; slides: readonly ShowcaseSlide[]; parallax: boolean }

export function CardImageCarousel(props: Props) {
  return props.slides.length > 1 ? <MultiSlideCarousel {...props} /> : <SingleImage {...props} />
}

function SingleImage({ id, slides, parallax }: Props) {
  const slide = slides[0]
  const { container, onPointerMove, onPointerLeave } = usePointerParallax(parallax, slide?.id ?? 'empty')
  const [failed, setFailed] = useState(false)
  return (
    <div className="wl-carousel wl-carousel--card wl-carousel--single" ref={container} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
      <div className="wl-image-viewport" id={`${id}-image`}>
        {slide ? <img className="wl-carousel-image wl-card-slide is-active" src={slide.src} alt={slide.alt} width={slide.width ?? 1440} height={slide.height ?? 720} loading="eager" decoding="async" draggable={false} onError={() => setFailed(true)} /> : null}
      </div>
      {failed && <span className="wl-image-error" role="status">A imagem não pôde ser carregada.</span>}
    </div>
  )
}

function MultiSlideCarousel({ id, label, slides, parallax }: Props) {
  const [index, setIndex] = useState(0)
  const [loaded, setLoaded] = useState<readonly string[]>([])
  const [failed, setFailed] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const mounted = useRef(true)
  const touchStart = useRef<Point | null>(null)
  const dots = useRef<Array<HTMLButtonElement | null>>([])
  const safeIndex = Math.min(index, slides.length - 1)
  const { container, onPointerMove, onPointerLeave } = usePointerParallax(parallax, slides[safeIndex].id)
  const advance = useCallback(() => setIndex((current) => (current + 1) % slides.length), [slides.length])
  const allLoaded = slides.every(slide => loaded.includes(slide.id))
  const autoplay = useCardAutoplay(container, advance, allLoaded && slides.length > 1)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const markLoaded = async (image: HTMLImageElement, slideId: string) => {
    try { await image.decode() } catch { if (!image.naturalWidth) return }
    if (mounted.current) setLoaded((current) => current.includes(slideId) ? current : [...current, slideId])
  }
  const select = (value: number) => {
    const next = (value + slides.length) % slides.length
    if (!loaded.includes(slides[next].id)) return
    setIndex(next)
    setAnnouncement(`Imagem ${next + 1} de ${slides.length} — ${label}`)
    autoplay.restart()
  }
  const onDotKey = (event: KeyboardEvent<HTMLButtonElement>, selected: number) => {
    const next = event.key === 'ArrowRight' ? (selected + 1) % slides.length
      : event.key === 'ArrowLeft' ? (selected - 1 + slides.length) % slides.length
        : event.key === 'Home' ? 0 : event.key === 'End' ? slides.length - 1 : null
    if (next === null) return
    event.preventDefault()
    select(next)
    dots.current[next]?.focus()
  }
  const onTouchEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (!touchStart.current || event.pointerType !== 'touch') return
    const direction = swipeDirection(touchStart.current, { x: event.clientX, y: event.clientY })
    touchStart.current = null
    if (direction) select(safeIndex + direction)
  }
  const action = `${autoplay.state.userPaused ? 'Reproduzir' : 'Pausar'} imagens de ${label}`

  return (
    <div
      className="wl-carousel wl-carousel--card"
      role="region"
      aria-roledescription="carrossel"
      aria-label={label}
      data-autoplay={autoplay.state.running ? 'playing' : 'paused'}
      ref={container}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerDown={(event) => {
        if (event.pointerType === 'touch' && !(event.target as HTMLElement).closest('button')) {
          touchStart.current = { x: event.clientX, y: event.clientY }
        }
      }}
      onPointerUp={onTouchEnd}
      onPointerCancel={() => { touchStart.current = null }}
    >
      <div className="wl-image-viewport" id={`${id}-image`} aria-live="off">
        {slides.map((slide, position) => <img
          key={slide.id}
          className={`wl-carousel-image wl-card-slide${position === safeIndex ? ' is-active' : ''}`}
          src={slide.src}
          alt={slide.alt}
          aria-hidden={position !== safeIndex}
          width={slide.width ?? 1440}
          height={slide.height ?? 720}
          loading="eager"
          decoding="async"
          draggable={false}
          onLoad={(event) => { void markLoaded(event.currentTarget, slide.id) }}
          onError={() => setFailed(true)}
        />)}
      </div>
      <div className="wl-carousel-controls" aria-label={`Navegação de imagens — ${label}`}>
        <div className="wl-pagination">
          {slides.map((slide, position) => <button
            key={slide.id}
            ref={(node) => { dots.current[position] = node }}
            className="wl-dot"
            type="button"
            aria-label={`Mostrar imagem ${position + 1} de ${slides.length} — ${label}`}
            aria-pressed={position === safeIndex}
            aria-controls={`${id}-image`}
            disabled={!loaded.includes(slide.id)}
            onClick={() => select(position)}
            onKeyDown={(event) => onDotKey(event, position)}
          ><span aria-hidden="true" /></button>)}
        </div>
        <button type="button" className="wl-playback" aria-label={action} aria-controls={`${id}-image`} title={action} onClick={autoplay.toggle}>
          {autoplay.state.userPaused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
        </button>
      </div>
      <span className="wl-sr-only" aria-live="polite" aria-atomic="true">{announcement}</span>
      {failed && <span className="wl-image-error" role="status">Uma imagem não pôde ser carregada.</span>}
    </div>
  )
}
