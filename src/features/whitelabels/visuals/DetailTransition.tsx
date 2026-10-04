import { useLayoutEffect, useState, type ReactNode } from 'react'
import { useAnimate, useReducedMotion, stagger } from 'framer-motion'
import type { Whitelabel } from '../prototypeWhitelabels'

/** Live Chat's scoped spring/stagger language, without bubbles, typing or chat UI.
 * One persistent region, no overlapping accessible copies or focus handoff. */
export function DetailTransition({ whitelabel, className, children }: {
  whitelabel: Whitelabel
  className: string
  children: (displayed: Whitelabel) => ReactNode
}) {
  const [displayed, setDisplayed] = useState(whitelabel)
  const [scope, animate] = useAnimate<HTMLElement>()
  const reducedMotion = useReducedMotion()

  useLayoutEffect(() => {
    let cancelled = false
    const stages = scope.current?.querySelectorAll('[data-detail-stage]')
    if (!stages?.length) return
    if (reducedMotion) {
      animate('[data-detail-stage]', { opacity: 1, y: 0 }, { duration: 0 })
      return
    }
    if (displayed.id !== whitelabel.id) {
      const exit = animate('[data-detail-stage]', { opacity: 0, y: -4 }, { duration: 0.12, ease: 'easeOut' })
      exit.then(() => { if (!cancelled) setDisplayed(whitelabel) })
      return () => { cancelled = true; exit.stop() }
    }
    const enter = animate('[data-detail-stage]', { opacity: [0, 1], y: [6, 0] }, {
      type: 'spring', stiffness: 450, damping: 28, mass: 1,
      delay: stagger(0.055), visualDuration: 0.38,
    })
    return () => { enter.stop() }
  }, [animate, displayed.id, reducedMotion, scope, whitelabel])

  return (
    <section ref={scope} id="whitelabel-detail" className={className} aria-labelledby="wl-detail-title" tabIndex={-1}>
      {children(reducedMotion ? whitelabel : displayed)}
    </section>
  )
}
