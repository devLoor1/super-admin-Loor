// OriginKit Text Carousel — original GSAP character exit/entry and badge sizing.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { useReducedMotion, useVisibleMotion } from './useVisualMotion'
import styles from './RotatingDashboardTitle.module.css'

const TEXTS = ['Global', 'Whitelabels', 'Operações', 'Plataformas']
const ROTATION_INTERVAL_MS = 3500
const TRANSITION = { duration: 0.3, staggerChildren: 0.012, ease: 'power2.out' }

// Same grapheme-aware splitting as the supplied source; Portuguese labels.
function splitIntoCharacters(text: string) {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    return Array.from(new Intl.Segmenter('pt-BR', { granularity: 'grapheme' }).segment(text), (part) => part.segment)
  }
  return Array.from(text)
}

export function RotatingDashboardTitle() {
  const [currentTextIndex, setCurrentTextIndex] = useState(0)
  const rootRef = useRef<HTMLSpanElement>(null)
  const contentRef = useRef<HTMLSpanElement>(null)
  const badgeRef = useRef<HTMLSpanElement>(null)
  const isAnimating = useRef(false)
  const hasSizedBadge = useRef(false)
  const reduced = useReducedMotion()
  const visible = useVisibleMotion(rootRef)
  const index = reduced ? 0 : currentTextIndex
  const characters = useMemo(() => splitIntoCharacters(TEXTS[index]), [index])

  useEffect(() => {
    if (reduced || !visible) return
    const content = contentRef.current
    if (!content) return
    const interval = window.setInterval(() => {
      if (isAnimating.current) return
      const chars = content.querySelectorAll('[data-carousel-char]')
      isAnimating.current = true
      gsap.killTweensOf(chars)
      gsap.to(chars, {
        yPercent: -120, opacity: 0, duration: TRANSITION.duration,
        stagger: { each: TRANSITION.staggerChildren, from: 'start' },
        ease: TRANSITION.ease,
        onComplete: () => setCurrentTextIndex((value) => (value + 1) % TEXTS.length),
      })
    }, ROTATION_INTERVAL_MS)
    return () => window.clearInterval(interval)
  }, [reduced, visible])

  useLayoutEffect(() => {
    const content = contentRef.current
    const badge = badgeRef.current
    if (!content || !badge) return
    const chars = content.querySelectorAll('[data-carousel-char]')
    gsap.killTweensOf(chars)
    gsap.killTweensOf(badge)
    isAnimating.current = false
    const resize = () => {
      const nextWidth = content.scrollWidth + 12
      gsap.killTweensOf(badge)
      if (!hasSizedBadge.current || reduced || !visible) {
        hasSizedBadge.current = true
        gsap.set(badge, { width: nextWidth })
      } else gsap.to(badge, { width: nextWidth, duration: TRANSITION.duration, ease: TRANSITION.ease })
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(content)
    if (reduced || !visible) gsap.set(chars, { yPercent: 0, opacity: 1 })
    else {
      isAnimating.current = true
      gsap.fromTo(chars, { yPercent: 100, opacity: 0 }, {
        yPercent: 0, opacity: 1, duration: TRANSITION.duration,
        stagger: { each: TRANSITION.staggerChildren, from: 'start' }, ease: TRANSITION.ease,
        onComplete: () => { isAnimating.current = false },
      })
    }
    return () => {
      observer.disconnect()
      gsap.killTweensOf(chars)
      gsap.killTweensOf(badge)
      isAnimating.current = false
    }
  }, [characters, reduced, visible])

  return (
    <span ref={rootRef} className={styles.title} aria-hidden="true" data-dashboard-carousel data-interval={ROTATION_INTERVAL_MS}>
      <span>Dashboard</span>
      <span className={styles.slot}>
        <span className={styles.sizer}>{TEXTS.map((text) => <span key={text}>{text}</span>)}</span>
        <span ref={badgeRef} className={styles.badge}>
          <span ref={contentRef} className={styles.content}>
            {characters.map((char, charIndex) => <span key={`${index}-${charIndex}`} data-carousel-char className={styles.char}>{char}</span>)}
          </span>
        </span>
      </span>
    </span>
  )
}
