/* Ported from FRONT-WEB/src/views/mock/whitelabels/motion.ts (approved showcase, branch mock @8a927d5 + local refinements). Logic unchanged. */
export interface Point {
  x: number
  y: number
}

export const MAX_PARALLAX_PX = 6

/** Bounded offsets also protect against stale/out-of-frame pointer coordinates. */
export function pointerOffset(x: number, y: number, width: number, height: number): Point {
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) {
    return { x: 0, y: 0 }
  }
  const clamp = (value: number) => Math.max(-1, Math.min(1, value))
  return {
    x: clamp((x / width - 0.5) * 2) * MAX_PARALLAX_PX,
    y: clamp((y / height - 0.5) * 2) * MAX_PARALLAX_PX,
  }
}

export function parallaxPolicy(enabled: boolean, reducedMotion: boolean, finePointer: boolean) {
  if (!enabled) return 'disabled-by-preview'
  if (reducedMotion) return 'reduced-motion'
  if (!finePointer) return 'coarse-pointer'
  return 'enabled'
}

export function swipeDirection(start: Point, end: Point): -1 | 0 | 1 {
  const dx = end.x - start.x
  const dy = end.y - start.y
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.3) return 0
  return dx < 0 ? 1 : -1
}
