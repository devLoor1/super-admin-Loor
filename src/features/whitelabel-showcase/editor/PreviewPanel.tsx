import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Monitor, Smartphone } from 'lucide-react'
import styles from './ShowcaseEditor.module.css'

export type PreviewViewport = 'desktop' | 'mobile'
const LOGICAL_WIDTH: Record<PreviewViewport, number> = { desktop: 1280, mobile: 390 }

/**
 * Same-document preview (the CSP blocks frames). The showcase renders at a
 * logical width (1280 desktop / 390 mobile) inside a query container and is
 * scaled down visually when the panel is narrower, so the approved breakpoints
 * respond to the width actually rendered, not to the Super Admin viewport.
 */
export function PreviewFrame({ viewport, label, children }: { viewport: PreviewViewport; label: string; children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const [layout, setLayout] = useState({ scale: 1, height: 0, left: 0 })
  const logical = LOGICAL_WIDTH[viewport]

  useLayoutEffect(() => {
    const outerElement = outer.current, innerElement = inner.current
    if (!outerElement || !innerElement) return
    const update = () => {
      const available = outerElement.clientWidth
      const scale = Math.min(1, available / logical)
      const next = { scale, height: Math.ceil(innerElement.offsetHeight * scale), left: Math.max(0, (available - logical * scale) / 2) }
      setLayout(current => current.scale === next.scale && current.height === next.height && current.left === next.left ? current : next)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(outerElement)
    observer.observe(innerElement)
    return () => observer.disconnect()
  }, [logical])

  return (
    <div ref={outer} className={styles.frameOuter} style={{ height: layout.height || undefined }} data-viewport={viewport}>
      <div
        ref={inner}
        className={styles.frameInner}
        role="group"
        aria-label={`${label} — ${viewport === 'desktop' ? 'desktop' : 'mobile'}${layout.scale < 1 ? `, reduzida a ${Math.round(layout.scale * 100)}%` : ''}`}
        style={{ width: logical, transform: `scale(${layout.scale})`, left: layout.left }}
      >
        {children}
      </div>
    </div>
  )
}

export function ViewportToggle({ value, onChange }: { value: PreviewViewport; onChange: (value: PreviewViewport) => void }) {
  return (
    <div className={styles.segment} role="group" aria-label="Tamanho da prévia">
      <button type="button" aria-pressed={value === 'desktop'} onClick={() => onChange('desktop')}><Monitor size={15} aria-hidden="true" />Desktop</button>
      <button type="button" aria-pressed={value === 'mobile'} onClick={() => onChange('mobile')}><Smartphone size={15} aria-hidden="true" />Mobile</button>
    </div>
  )
}

export function PreviewPanel({ title, subtitle, viewport, onViewport, children, footer }: {
  title: string
  subtitle?: ReactNode
  viewport: PreviewViewport
  onViewport: (value: PreviewViewport) => void
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <section className={`${styles.panel} ${styles.previewPanel}`} aria-label={title}>
      <header className={styles.panelHead}>
        <div>
          <h2 className={styles.panelTitle}>{title}</h2>
          {subtitle ? <p className={styles.panelSubtitle}>{subtitle}</p> : null}
        </div>
        <ViewportToggle value={viewport} onChange={onViewport} />
      </header>
      <div className={styles.previewBody}>{children}</div>
      {footer ? <footer className={styles.previewFoot}>{footer}</footer> : null}
    </section>
  )
}
