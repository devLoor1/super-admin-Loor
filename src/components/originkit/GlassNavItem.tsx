// OriginKit Light Glass Button — original light falloff, edge aiming and ring masks.
// One actual navigation control; decorative layers never contain another control.
import { useEffect, useLayoutEffect, useRef, type MouseEventHandler, type PointerEvent, type ReactNode } from 'react'
import { useReducedMotion } from './useVisualMotion'
import styles from './GlassNavItem.module.css'

type Props = {
  children: ReactNode
  href?: string
  active: boolean
  label: string
  className: string
  onClick: MouseEventHandler<HTMLAnchorElement | HTMLButtonElement>
}

const LIGHT_FADE = 0.6
const AIM_BLEND = 0.18
const LIGHT_FALLOFF: Array<[number, number]> = [
  [0, 1], [0.08, 0.95], [0.18, 0.85], [0.3, 0.7], [0.42, 0.54],
  [0.55, 0.38], [0.68, 0.24], [0.8, 0.13], [0.9, 0.06], [0.96, 0.02], [1, 0],
]
const LIGHT_GRADIENT = [1, 0.34].map((peak, i) =>
  `radial-gradient(circle ${i ? 'calc(var(--lr, 0px) * 1.9)' : 'var(--lr, 0px)'} at var(--mx, 50%) var(--my, 50%), ${LIGHT_FALLOFF.map(([at, k]) => `rgba(173, 158, 255, ${0.45 * peak * k}) ${Math.round(at * 100)}%`).join(', ')})`,
).join(', ')
const clamp01 = (value: number) => Math.max(0, Math.min(1, value))
const lightRadius = (w: number, h: number) => Math.max(w, h) * 0.4

export function GlassNavItem({ children, href, active, label, className, onClick }: Props) {
  const controlRef = useRef<HTMLElement | null>(null)
  const lightRef = useRef<HTMLSpanElement>(null)
  const strokeRef = useRef<HTMLSpanElement>(null)
  const target = useRef({ x: 0.5, y: 0.5, on: 0 })
  const current = useRef({ x: 0.5, y: 0.5, on: 0 })
  const frame = useRef<number | null>(null)
  const last = useRef(0)
  const box = useRef({ w: 0, h: 0 })
  const reduced = useReducedMotion()

  const stop = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    frame.current = null
    last.current = 0
  }

  const paint = () => {
    const root = controlRef.current
    const c = current.current
    if (!root) return
    root.style.setProperty('--mx', `${(c.x * 100).toFixed(2)}%`)
    root.style.setProperty('--my', `${(c.y * 100).toFixed(2)}%`)
    if (lightRef.current) lightRef.current.style.opacity = (c.on * 0.55).toFixed(3)
    const el = strokeRef.current
    if (!el) return
    const { w, h } = box.current
    const d = clamp01(Math.max(Math.abs(c.x - 0.5), Math.abs(c.y - 0.5)) * 2)
    let angle = 0
    let half = 30
    if (w > 0 && h > 0) {
      const px = c.x * w
      const py = c.y * h
      const s = Math.max(1, Math.min(w, h) * AIM_BLEND)
      const sides: Array<[number, number, number]> = [[px, 0, py], [w - px, w, py], [py, px, 0], [h - py, px, h]]
      const near = Math.min(...sides.map((value) => value[0]))
      let wt = 0, ax = 0, ay = 0
      for (const [dist, sx, sy] of sides) {
        const k = Math.exp(-(dist - near) / s)
        wt += k; ax += k * sx; ay += k * sy
      }
      const ex = ax / wt - w / 2
      const ey = ay / wt - h / 2
      angle = Math.atan2(ey, ex) * 180 / Math.PI + 90
      half = Math.atan(lightRadius(w, h) * LIGHT_FADE / Math.max(1, Math.hypot(ex, ey))) * 180 / Math.PI
    }
    el.style.setProperty('--la', angle.toFixed(1))
    el.style.setProperty('--lw', Math.max(3, Math.min(70, half)).toFixed(1))
    el.style.opacity = clamp01(c.on * d * d * 0.55).toFixed(3)
  }

  const tick = (time: number) => {
    const c = current.current, g = target.current
    const dt = last.current ? Math.min(0.05, (time - last.current) / 1000) : 1 / 60
    last.current = time
    const per = 0.5 - 0.65 * 0.46 // Supplied smoothness: 65.
    const k = 1 - Math.pow(1 - per, dt * 60)
    c.x += (g.x - c.x) * k; c.y += (g.y - c.y) * k; c.on += (g.on - c.on) * k
    paint()
    const settled = Math.abs(g.x - c.x) < 0.001 && Math.abs(g.y - c.y) < 0.001 && Math.abs(g.on - c.on) < 0.002
    // Unlike the original, also stop at a settled hover instead of looping forever.
    if (settled) { Object.assign(c, g); paint(); stop(); return }
    frame.current = requestAnimationFrame(tick)
  }

  const kick = () => {
    if (reduced) { Object.assign(current.current, target.current); paint(); return }
    if (frame.current === null) frame.current = requestAnimationFrame(tick)
  }

  const track = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'mouse') return
    const rect = event.currentTarget.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    target.current.x = clamp01((event.clientX - rect.left) / rect.width)
    target.current.y = clamp01((event.clientY - rect.top) / rect.height)
    kick()
  }

  useLayoutEffect(() => {
    const root = controlRef.current
    if (!root) return
    const read = () => {
      const { width: w, height: h } = root.getBoundingClientRect()
      box.current = { w, h }
      // Same radius-from-percent formula, adjusted to the navigation row.
      root.style.setProperty('--glass-radius', `${Math.min(w, h) / 2 * 0.38}px`)
      root.style.setProperty('--lr', `${lightRadius(w, h).toFixed(1)}px`)
    }
    read()
    const observer = new ResizeObserver(read)
    observer.observe(root)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const hidden = () => { if (document.hidden) stop() }
    document.addEventListener('visibilitychange', hidden)
    return () => { stop(); document.removeEventListener('visibilitychange', hidden) }
  }, [])

  useEffect(() => {
    if (reduced) { stop(); Object.assign(current.current, target.current); paint() }
  }, [reduced])

  const visuals = (
    <>
      <span className={styles.fill} aria-hidden="true" />
      <span ref={lightRef} className={styles.light} style={{ background: LIGHT_GRADIENT }} aria-hidden="true" />
      <span className={`${styles.ring} ${styles.baseRing}`} aria-hidden="true" />
      <span ref={strokeRef} className={`${styles.ring} ${styles.edgeLight}`} aria-hidden="true" />
      <span className={styles.content}>{children}</span>
    </>
  )
  const common = {
    ref: (element: HTMLElement | null) => { controlRef.current = element },
    className: `${className} ${styles.control}`,
    'data-active': active || undefined,
    'data-tooltip': label,
    'data-glass-nav': true,
    onClick,
    onPointerMove: track,
    onPointerEnter: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType !== 'mouse') return
      track(event); target.current.on = 1; kick()
    },
    onPointerLeave: () => { target.current.on = 0; kick() },
    onFocus: () => { target.current = { x: 0.5, y: 0.3, on: 1 }; kick() },
    onBlur: () => { target.current.on = 0; kick() },
  }
  return href
    ? <a {...common} href={href} aria-current={active ? 'page' : undefined}>{visuals}</a>
    : <button {...common} type="button">{visuals}</button>
}
