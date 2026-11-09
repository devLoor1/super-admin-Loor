/* Ported from FRONT-WEB/src/views/mock/whitelabels/useCardAutoplay.ts (approved showcase). Logic unchanged; React 19 ref typing. */
import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { createCardPlayback } from './autoplay'
import type { PlaybackSnapshot } from './autoplay'

export function useCardAutoplay(container: RefObject<HTMLDivElement | null>, advance: () => void, ready: boolean) {
  const playback = useRef<ReturnType<typeof createCardPlayback> | null>(null)
  const [state, setState] = useState<PlaybackSnapshot>(() => ({
    userPaused: matchMedia('(prefers-reduced-motion: reduce)').matches,
    pageVisible: !document.hidden,
    inViewport: false,
    hovered: false,
    focused: false,
    ready: false,
    running: false,
  }))

  useEffect(() => {
    const card = container.current?.closest('article')
    if (!card) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)')
    const player = createCardPlayback({
      initial: {
        userPaused: reduced.matches,
        pageVisible: !document.hidden,
        inViewport: false,
        hovered: finePointer.matches && card.matches(':hover'),
        focused: card.contains(document.activeElement),
        ready: false,
      },
      advance,
      notify: setState,
      schedule: (callback, delay) => window.setTimeout(callback, delay),
      cancel: (timer) => window.clearTimeout(timer),
    })
    playback.current = player
    const enter = (event: PointerEvent) => { if (event.pointerType === 'mouse') player.update({ hovered: true }) }
    const leave = () => player.update({ hovered: false })
    const focus = () => player.update({ focused: true })
    const blur = (event: FocusEvent) => player.update({ focused: event.relatedTarget instanceof Node && card.contains(event.relatedTarget) })
    const visibility = () => player.update({ pageVisible: !document.hidden })
    const motion = () => { if (reduced.matches) player.update({ userPaused: true }) }
    const pointer = () => player.update({ hovered: finePointer.matches && card.matches(':hover') })
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => {
      player.update({ inViewport: entry.isIntersecting && entry.intersectionRatio >= 0.1 })
    }, { threshold: [0, 0.1] })
    observer?.observe(card)
    card.addEventListener('pointerenter', enter)
    card.addEventListener('pointerleave', leave)
    card.addEventListener('focusin', focus)
    card.addEventListener('focusout', blur)
    document.addEventListener('visibilitychange', visibility)
    reduced.addEventListener('change', motion)
    finePointer.addEventListener('change', pointer)
    return () => {
      player.dispose()
      playback.current = null
      observer?.disconnect()
      card.removeEventListener('pointerenter', enter)
      card.removeEventListener('pointerleave', leave)
      card.removeEventListener('focusin', focus)
      card.removeEventListener('focusout', blur)
      document.removeEventListener('visibilitychange', visibility)
      reduced.removeEventListener('change', motion)
      finePointer.removeEventListener('change', pointer)
    }
  }, [container, advance])

  useEffect(() => { playback.current?.update({ ready }) }, [ready])

  return {
    state,
    restart: () => playback.current?.restart(),
    toggle: () => {
      const player = playback.current
      if (player) player.update({ userPaused: !player.snapshot().userPaused })
    },
  }
}
