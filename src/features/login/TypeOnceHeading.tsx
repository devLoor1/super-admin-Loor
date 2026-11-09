import { useEffect, useState } from 'react'
import styles from './LoginForm.module.css'

const HEADING = 'Acesso administrativo'

// A one-pass adaptation of the supplied OriginKit Type Sequence. Reserving the
// final text's footprint keeps the form and subtitle from shifting mid-type.
export function TypeOnceHeading() {
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const [visibleCount, setVisibleCount] = useState(() => reducedMotion ? HEADING.length : 0)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => {
      setReducedMotion(media.matches)
      if (media.matches) setVisibleCount(HEADING.length)
    }
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (reducedMotion) return
    const timer = window.setInterval(() => {
      setVisibleCount((count) => {
        if (count >= HEADING.length - 1) window.clearInterval(timer)
        return Math.min(count + 1, HEADING.length)
      })
    }, 42)
    return () => window.clearInterval(timer)
  }, [reducedMotion])

  return (
    <h1 id="login-title" className={styles.title} aria-label={HEADING}>
      <span className={styles.titleMeasure} aria-hidden="true">{HEADING}</span>
      <span className={styles.titleTyped} aria-hidden="true">{HEADING.slice(0, visibleCount)}</span>
    </h1>
  )
}
