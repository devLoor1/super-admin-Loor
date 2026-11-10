/*
 * Ported from FRONT-WEB/src/views/mock/whitelabels/ImageCarousel.tsx (approved hero carousel).
 * Preserved: manual navigation only (no autoplay), arrows + dots, ←/→/Home/End, swipe, parallax,
 * "Conceito ilustrativo" caption. Adapted: with one image there is no carousel region, control or
 * announcement; ids come from the render instance; lucide icons replace react-icons/fi.
 */
import { useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { swipeDirection } from './motion'
import type { Point } from './motion'
import { usePointerParallax } from './usePointerParallax'
import type { ShowcaseSlide } from './showcaseTypes'

type Props = { id: string; label: string; slides: readonly ShowcaseSlide[]; parallax: boolean }

export function ImageCarousel({ id, label, slides, parallax }: Props) {
  const [index, setIndex] = useState(0)
  const touchStart = useRef<Point | null>(null)
  const dots = useRef<Array<HTMLButtonElement | null>>([])
  const safeIndex = Math.min(index, Math.max(0, slides.length - 1))
  const slide = slides[safeIndex]
  const multiple = slides.length > 1
  const { container, onPointerMove, onPointerLeave } = usePointerParallax(parallax, slide?.id ?? 'empty')
  const select = (value: number) => setIndex((value + slides.length) % slides.length)
  const onTouchEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (!multiple || !touchStart.current || event.pointerType !== 'touch') return
    const direction = swipeDirection(touchStart.current, { x: event.clientX, y: event.clientY })
    touchStart.current = null
    if (direction) select(safeIndex + direction)
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

  return (
    <div
      className="wl-carousel wl-carousel--hero"
      role={multiple ? 'region' : undefined}
      aria-roledescription={multiple ? 'carrossel' : undefined}
      aria-label={multiple ? label : undefined}
      ref={container}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerDown={(event) => {
        if (multiple && event.pointerType === 'touch' && !(event.target as HTMLElement).closest('button')) {
          touchStart.current = { x: event.clientX, y: event.clientY }
        }
      }}
      onPointerUp={onTouchEnd}
      onPointerCancel={() => { touchStart.current = null }}
    >
      <div className="wl-image-viewport" id={`${id}-image`}>
        {slide ? <img
          className="wl-carousel-image"
          src={slide.src}
          alt={slide.alt}
          width={slide.width ?? 1586}
          height={slide.height ?? 992}
          loading="eager"
          decoding="async"
          draggable={false}
          onError={slide.onError}
        /> : null}
      </div>
      {multiple && (
        <div className="wl-carousel-controls" aria-label={`Navegação de imagens — ${label}`}>
          <button type="button" className="wl-carousel-arrow" aria-label="Imagem anterior do hero" aria-controls={`${id}-image`} onClick={() => select(safeIndex - 1)}><ChevronLeft aria-hidden="true" /></button>
          <div className="wl-pagination">
            {slides.map((item, position) => (
              <button
                key={item.id}
                ref={(node) => { dots.current[position] = node }}
                className="wl-dot"
                type="button"
                aria-label={`Mostrar imagem ${position + 1} de ${slides.length} — ${label}`}
                aria-pressed={position === safeIndex}
                aria-controls={`${id}-image`}
                onClick={() => select(position)}
                onKeyDown={(event) => onDotKey(event, position)}
              ><span aria-hidden="true" /></button>
            ))}
          </div>
          <button type="button" className="wl-carousel-arrow" aria-label="Próxima imagem do hero" aria-controls={`${id}-image`} onClick={() => select(safeIndex + 1)}><ChevronRight aria-hidden="true" /></button>
        </div>
      )}
      {multiple && <span className="wl-sr-only" aria-live="polite" aria-atomic="true">Imagem {safeIndex + 1} de {slides.length}</span>}
      <span className="wl-illustration-caption">Conceito ilustrativo</span>
    </div>
  )
}
