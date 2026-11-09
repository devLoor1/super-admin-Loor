import { useEffect, useRef, type CSSProperties } from 'react'
import { useAnimate, useReducedMotion, type AnimationPlaybackControls } from 'framer-motion'
import { DEFAULT_WHITELABEL_ACCENT } from './visualAccent'
import styles from './WhitelabelIdentity.module.css'

/** OriginKit Radial Reveal's pointer anchor, far-corner radius and clip tween,
 * adapted to a non-interactive visual child of the existing row selection button. */
export function WhitelabelIdentity({ name, selected, accentColor = DEFAULT_WHITELABEL_ACCENT }: {
  name: string
  selected: boolean
  accentColor?: string
}) {
  const [scope, animate] = useAnimate<HTMLSpanElement>()
  const overlayRef = useRef<HTMLSpanElement>(null)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const host = scope.current
    const row = host?.closest('tr')
    const overlay = overlayRef.current
    if (!host || !row || !overlay) return
    let control: AnimationPlaybackControls | undefined
    let hovered = false
    let focused = false
    const clip = { r: 0, x: 50, y: 50, max: 150 }
    const apply = () => { overlay.style.clipPath = `circle(${clip.r}% at ${clip.x}% ${clip.y}%)` }
    const grow = (to: number) => {
      control?.stop()
      if (reducedMotion) { clip.r = to; apply(); return }
      control = animate(clip.r, to, {
        type: 'tween', ease: 'easeInOut', duration: 0.45,
        onUpdate: (radius) => { clip.r = radius; apply() },
      })
    }
    const anchor = (event?: PointerEvent) => {
      const rect = overlay.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      const x = event ? Math.max(0, Math.min(rect.width, event.clientX - rect.left)) : rect.width / 2
      const y = event ? Math.max(0, Math.min(rect.height, event.clientY - rect.top)) : rect.height / 2
      const unit = Math.hypot(rect.width, rect.height) / Math.SQRT2
      const far = Math.max(Math.hypot(x, y), Math.hypot(rect.width - x, y), Math.hypot(x, rect.height - y), Math.hypot(rect.width - x, rect.height - y))
      clip.x = x / rect.width * 100
      clip.y = y / rect.height * 100
      clip.max = far / unit * 100 + 2
    }
    const enter = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      hovered = true
      anchor(event)
      apply()
      grow(clip.max)
    }
    const leave = (event: PointerEvent) => {
      hovered = false
      if (focused) return
      if (clip.r >= clip.max - 0.5) { anchor(event); clip.r = clip.max; apply() }
      grow(0)
    }
    const focus = (event: FocusEvent) => {
      if (!(event.target instanceof HTMLElement) || !event.target.matches(':focus-visible')) return
      focused = true
      anchor()
      apply()
      grow(clip.max)
    }
    const blur = (event: FocusEvent) => {
      if (event.relatedTarget instanceof Node && row.contains(event.relatedTarget)) return
      focused = false
      if (!hovered) grow(0)
    }
    row.addEventListener('pointerenter', enter)
    row.addEventListener('pointerleave', leave)
    row.addEventListener('focusin', focus)
    row.addEventListener('focusout', blur)
    // Preserve visible keyboard state if the motion preference changes while focused.
    focused = !!row.querySelector(':focus-visible')
    if (focused || row.matches(':hover')) { anchor(); grow(clip.max) } else apply()
    return () => {
      control?.stop()
      row.removeEventListener('pointerenter', enter)
      row.removeEventListener('pointerleave', leave)
      row.removeEventListener('focusin', focus)
      row.removeEventListener('focusout', blur)
    }
  }, [animate, reducedMotion, scope])

  return (
    <span ref={scope} className={styles.identity} data-whitelabel-identity data-selected={selected || undefined} style={{ '--wl-accent': accentColor } as CSSProperties}>
      <span className={styles.face}>{name}</span>
      <span ref={overlayRef} className={styles.reveal} aria-hidden="true">{name}</span>
    </span>
  )
}
