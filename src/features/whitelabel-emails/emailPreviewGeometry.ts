export const EMAIL_PREVIEW_VIEWPORT = {
  desktop: { width: 600, height: 900 },
  mobile: { width: 360, height: 900 },
} as const

export function emailPreviewScale(availableWidth: number, viewportWidth: number): number {
  if (!Number.isFinite(availableWidth) || availableWidth <= 0) return 1
  return Math.min(1, availableWidth / viewportWidth)
}

/** The observed host reserves its own aspect ratio. The absolute, transformed
 * iframe cannot resize that host. Ignore hidden/unchanged geometry, and never
 * observe iframe content or access its sandboxed document. */
export function watchEmailPreviewWidth(host: HTMLElement, onWidth: (width: number) => void): () => void {
  let lastWidth = 0
  const publish = (width: number) => {
    const stableWidth = Math.floor(width * 100) / 100
    if (!Number.isFinite(stableWidth) || stableWidth <= 0 || stableWidth === lastWidth) return
    lastWidth = stableWidth
    onWidth(stableWidth)
  }
  const measure = () => publish(host.clientWidth)
  measure()
  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(entries => { for (const entry of entries) if (entry.target === host) publish(entry.contentRect.width) })
    observer.observe(host)
    return () => observer.disconnect()
  }
  window.addEventListener('resize', measure)
  return () => window.removeEventListener('resize', measure)
}
