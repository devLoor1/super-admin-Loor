import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useAnimate, useReducedMotion, stagger } from 'framer-motion'

/** Live Chat's scoped spring/stagger language, without bubbles, typing or chat UI.
 * One persistent region, no overlapping accessible copies. An optional identity
 * callback supports explicit focus handoff once the incoming content mounts.
 *
 * Generic over any record with an `id` (Whitelabels, accounts). The sequence
 * runs only when the identity changes; an updated version of the same record
 * (e.g. a changed access state) renders immediately without re-animating. */
export function DetailTransition<T extends { id: string }>({
  item,
  className,
  sectionId = 'whitelabel-detail',
  labelledBy = 'wl-detail-title',
  onDisplay,
  children,
}: {
  item: T
  className: string
  /** DOM id of the persistent region (target of the list's aria-controls). */
  sectionId?: string
  /** Id of the heading that names the region. */
  labelledBy?: string
  /** Called after the displayed identity mounts, for an explicit focus handoff. */
  onDisplay?: (id: string) => void
  children: (displayed: T) => ReactNode
}) {
  const [displayed, setDisplayed] = useState(item)
  const latest = useRef(item)
  const [scope, animate] = useAnimate<HTMLElement>()
  const reducedMotion = useReducedMotion()
  const itemId = item.id

  // Runs before the sequence effect below, so the exit callback swaps in the latest data.
  useLayoutEffect(() => {
    latest.current = item
  })

  useLayoutEffect(() => {
    let cancelled = false
    const stages = scope.current?.querySelectorAll('[data-detail-stage]')
    if (!stages?.length) return
    if (reducedMotion) {
      animate('[data-detail-stage]', { opacity: 1, y: 0 }, { duration: 0 })
      return
    }
    if (displayed.id !== itemId) {
      const exit = animate('[data-detail-stage]', { opacity: 0, y: -4 }, { duration: 0.12, ease: 'easeOut' })
      exit.then(() => { if (!cancelled) setDisplayed(latest.current) })
      return () => { cancelled = true; exit.stop() }
    }
    const enter = animate('[data-detail-stage]', { opacity: [0, 1], y: [6, 0] }, {
      type: 'spring', stiffness: 450, damping: 28, mass: 1,
      delay: stagger(0.055), visualDuration: 0.38,
    })
    return () => { enter.stop() }
    // Identity changes drive the sequence; same-id updates must not replay it.
  }, [animate, displayed.id, reducedMotion, scope, itemId])

  // While the previous identity exits, keep showing it; otherwise show the latest data.
  const current = reducedMotion || displayed.id === item.id ? item : displayed

  useLayoutEffect(() => {
    onDisplay?.(current.id)
  }, [current.id, onDisplay])

  return (
    <section ref={scope} id={sectionId} className={className} aria-labelledby={labelledBy} tabIndex={-1} inert={current.id !== item.id}>
      {children(current)}
    </section>
  )
}
