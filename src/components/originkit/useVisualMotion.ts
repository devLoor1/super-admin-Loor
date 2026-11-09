import { useEffect, useState, useSyncExternalStore, type RefObject } from 'react'

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

function subscribeMotion(onChange: () => void) {
  const media = window.matchMedia(REDUCED_MOTION)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

export function useReducedMotion() {
  return useSyncExternalStore(subscribeMotion, () => window.matchMedia(REDUCED_MOTION).matches, () => true)
}

/** Stop decorative work while its region is off-screen or the document is hidden. */
export function useVisibleMotion(ref: RefObject<HTMLElement | null>) {
  const [active, setActive] = useState(() => !document.hidden)
  useEffect(() => {
    let intersecting = true
    const update = () => setActive(intersecting && !document.hidden)
    const observer = new IntersectionObserver(([entry]) => {
      intersecting = entry.isIntersecting
      update()
    })
    if (ref.current) observer.observe(ref.current)
    document.addEventListener('visibilitychange', update)
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', update)
    }
  }, [ref])
  return active
}
