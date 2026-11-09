import { useEffect, useRef, type ReactNode } from 'react'
import styles from './OrbitBorderFrame.module.css'

// OriginKit Orbit Border Button's mask, conic comet, squared solid arc and
// cubic expansion, adapted to a decorative frame (no button/link/scale behavior).
const solidOf = (arc: number) => (arc * arc) / 360
const ticks = new Set<(time: number) => void>()
let frame = 0
let lastPaint = 0

// All event cards share one 30 fps clock; offscreen/reduced-motion frames detach.
function tick(time: number) {
  frame = 0
  if (time - lastPaint >= 1000 / 30) {
    lastPaint = time
    ticks.forEach((paint) => paint(time))
  }
  if (ticks.size) frame = requestAnimationFrame(tick)
}

function subscribe(paint: (time: number) => void) {
  ticks.add(paint)
  if (!frame) frame = requestAnimationFrame(tick)
  return () => {
    ticks.delete(paint)
    if (!ticks.size) {
      cancelAnimationFrame(frame)
      frame = 0
      lastPaint = 0
    }
  }
}

type Props = {
  children: ReactNode
  className?: string
  enabled: boolean
  productRequirement: boolean
  changed?: boolean
}

export function OrbitBorderFrame({ children, className = '', enabled, productRequirement, changed }: Props) {
  const root = useRef<HTMLDivElement>(null)
  const comet = useRef<HTMLSpanElement>(null)
  const pointer = useRef(false)
  const focus = useRef(false)
  const updateArc = useRef<() => void>(() => {})

  useEffect(() => {
    const element = root.current
    const ring = comet.current
    if (!element || !ring) return

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const idleArc = productRequirement ? 112 : 88
    const fillArc = productRequirement ? 300 : 250
    const speed = enabled ? (productRequirement ? 22 : 18) : 12
    let angle = productRequirement ? 150 : 30
    let arc = idleArc
    let fromArc = arc
    let targetArc = arc
    let started = 0
    let last = 0
    let visible = false
    let detach: (() => void) | undefined

    function paintArc(value: number) {
      ring!.style.setProperty('--comet-arc', `${value}deg`)
      ring!.style.setProperty('--comet-solid', `${solidOf(value)}deg`)
    }

    function paint(time: number) {
      if (last) angle = (angle - (speed * Math.min(time - last, 64)) / 1000) % 360
      last = time
      ring!.style.transform = `rotate(${angle}deg)`
      if (arc !== targetArc) {
        const progress = Math.min((time - started) / 450, 1)
        arc = fromArc + (targetArc - fromArc) * (1 - (1 - progress) ** 3)
        paintArc(arc)
      }
    }

    function setArc() {
      targetArc = pointer.current || focus.current ? fillArc : idleArc
      fromArc = arc
      started = performance.now()
      if (motion.matches) {
        arc = targetArc
        paintArc(arc)
      }
    }

    function syncMotion() {
      const animate = visible && !document.hidden && !motion.matches
      if (animate && !detach) detach = subscribe(paint)
      if (!animate && detach) {
        detach()
        detach = undefined
        last = 0
      }
      if (motion.matches) ring!.style.transform = 'rotate(30deg)'
      setArc()
    }

    // Source diagonal sizing, using observer geometry rather than layout reads
    // during animation. The existing card CSS remains responsible for its radius.
    const resize = new ResizeObserver(([entry]) => {
      if (!entry) return
      const box = entry.borderBoxSize[0]
      const width = box?.inlineSize ?? entry.contentRect.width
      const height = box?.blockSize ?? entry.contentRect.height
      const side = Math.ceil(Math.hypot(width, height) * 1.02)
      ring.style.width = `${side}px`
      ring.style.height = `${side}px`
      ring.style.margin = `${-side / 2}px 0 0 ${-side / 2}px`
    })
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false
      syncMotion()
    })
    paintArc(arc)
    ring.style.transform = `rotate(${angle}deg)`
    updateArc.current = setArc
    resize.observe(element, { box: 'border-box' })
    intersection.observe(element)
    motion.addEventListener('change', syncMotion)
    document.addEventListener('visibilitychange', syncMotion)
    syncMotion()

    return () => {
      detach?.()
      resize.disconnect()
      intersection.disconnect()
      motion.removeEventListener('change', syncMotion)
      document.removeEventListener('visibilitychange', syncMotion)
      updateArc.current = () => {}
    }
  }, [enabled, productRequirement])

  return (
    <div
      ref={root}
      className={`${styles.frame} ${className}`}
      data-orbit-frame
      data-enabled={enabled}
      data-requirement={productRequirement}
      data-changed={changed || undefined}
      onPointerEnter={() => { pointer.current = true; updateArc.current() }}
      onPointerLeave={() => { pointer.current = false; updateArc.current() }}
      onFocusCapture={() => { focus.current = true; updateArc.current() }}
      onBlurCapture={(event) => {
        focus.current = event.currentTarget.contains(event.relatedTarget)
        updateArc.current()
      }}
    >
      <span className={styles.band} aria-hidden="true">
        <span ref={comet} className={styles.comet}>
          <span className={styles.glow} />
          <span className={styles.core} />
        </span>
      </span>
      {children}
    </div>
  )
}
