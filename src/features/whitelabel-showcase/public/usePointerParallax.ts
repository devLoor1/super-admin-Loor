/* Ported from FRONT-WEB/src/views/mock/whitelabels/usePointerParallax.ts (approved showcase). Logic unchanged; React 19 ref typing. */
import { useEffect, useRef } from 'react'
import type { PointerEvent } from 'react'
import { parallaxPolicy, pointerOffset } from './motion'

export function usePointerParallax(enabled: boolean, slideId: string) {
  const container = useRef<HTMLDivElement>(null)
  const permitted = useRef(false)
  const animation = useRef(0)
  const current = useRef({ x: 0, y: 0 })
  const target = useRef({ x: 0, y: 0 })

  const reset = () => {
    cancelAnimationFrame(animation.current)
    animation.current = 0
    current.current = { x: 0, y: 0 }
    target.current = { x: 0, y: 0 }
    container.current?.style.setProperty('--wl-image-x', '0px')
    container.current?.style.setProperty('--wl-image-y', '0px')
  }

  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)')
    const pointer = matchMedia('(hover: hover) and (pointer: fine)')
    const update = () => {
      const policy = parallaxPolicy(enabled, reduce.matches, pointer.matches)
      permitted.current = policy === 'enabled'
      if (container.current) container.current.dataset.parallax = policy
      reset()
    }
    update()
    reduce.addEventListener('change', update)
    pointer.addEventListener('change', update)
    window.addEventListener('blur', reset)
    return () => {
      reduce.removeEventListener('change', update)
      pointer.removeEventListener('change', update)
      window.removeEventListener('blur', reset)
      reset()
    }
  }, [enabled])

  useEffect(reset, [slideId])

  const animate = () => {
    current.current.x += (target.current.x - current.current.x) * 0.12
    current.current.y += (target.current.y - current.current.y) * 0.12
    container.current?.style.setProperty('--wl-image-x', `${current.current.x.toFixed(3)}px`)
    container.current?.style.setProperty('--wl-image-y', `${current.current.y.toFixed(3)}px`)
    if (Math.abs(target.current.x - current.current.x) + Math.abs(target.current.y - current.current.y) > 0.02) {
      animation.current = requestAnimationFrame(animate)
    } else {
      current.current = { ...target.current }
      container.current?.style.setProperty('--wl-image-x', `${target.current.x}px`)
      container.current?.style.setProperty('--wl-image-y', `${target.current.y}px`)
      animation.current = 0
    }
  }

  const schedule = () => {
    if (!animation.current) animation.current = requestAnimationFrame(animate)
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!permitted.current || event.pointerType !== 'mouse' || !container.current) return
    const rect = container.current.getBoundingClientRect()
    target.current = pointerOffset(event.clientX - rect.left, event.clientY - rect.top, rect.width, rect.height)
    schedule()
  }

  const onPointerLeave = () => {
    if (!permitted.current) return
    target.current = { x: 0, y: 0 }
    schedule()
  }

  return { container, onPointerMove, onPointerLeave }
}
