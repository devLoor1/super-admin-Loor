import type { ReactNode, SVGProps } from 'react'
import type { LucideIcon } from 'lucide-react'

/**
 * Shared SVG primitives for the "central platform + orbiting modules" artwork.
 *
 * Extracted unchanged from the approved Login V1 illustration so the Dashboard
 * overview can reuse the same visual grammar. Every primitive takes the scene
 * `id` used to namespace gradient/filter ids — use one unique id per <svg>.
 *
 * Geometry note: the platform is a rounded square rotated 45° and squashed
 * vertically (isometric look). Its side walls are the same footprint offset
 * downward plus a band joining the left/right extremes. Gradients defined in
 * the square's local space with x1=y1=0 → x2=y2=1 map to screen-vertical after
 * that transform.
 */

// ---------------------------------------------------------------------------
// Shared definitions
// ---------------------------------------------------------------------------

type IsoDefsProps = {
  id: string
  /** Drop shadow under module cards. Defaults match the login artwork. */
  cardShadow?: { dy: number; blur: number; opacity: number }
}

export function IsoDefs({ id, cardShadow = { dy: 12, blur: 11, opacity: 0.6 } }: IsoDefsProps) {
  return (
    <defs>
      {/* Glass module cards */}
      <linearGradient id={`${id}-card-fill`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#3a3b50" stopOpacity="0.82" />
        <stop offset="1" stopColor="#1b1c27" stopOpacity="0.82" />
      </linearGradient>
      <linearGradient id={`${id}-card-stroke`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.24" />
        <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.06" />
        <stop offset="1" stopColor="#ffffff" stopOpacity="0.1" />
      </linearGradient>
      <filter id={`${id}-card-shadow`} x="-40%" y="-30%" width="180%" height="180%">
        <feDropShadow
          dx="0"
          dy={cardShadow.dy}
          stdDeviation={cardShadow.blur}
          floodColor="#05060a"
          floodOpacity={cardShadow.opacity}
        />
      </filter>

      {/* Platform faces */}
      <linearGradient id={`${id}-face-fill`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#393a52" />
        <stop offset="1" stopColor="#1e1f2d" />
      </linearGradient>
      <linearGradient id={`${id}-face-rim`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.4" />
        <stop offset="0.45" stopColor="#ffffff" stopOpacity="0.08" />
        <stop offset="1" stopColor="#d6d1ff" stopOpacity="0.34" />
      </linearGradient>
      <linearGradient id={`${id}-inset-fill`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#1c1d29" />
        <stop offset="1" stopColor="#2c2d41" />
      </linearGradient>
      <linearGradient id={`${id}-side-fill`} x1="0" y1="0" x2="1" y2="1">
        <SideStops />
      </linearGradient>
      <radialGradient id={`${id}-under-glow`}>
        <stop offset="0" stopColor="#6c5cff" stopOpacity="0.38" />
        <stop offset="0.55" stopColor="#5a4ce0" stopOpacity="0.16" />
        <stop offset="1" stopColor="#5a4ce0" stopOpacity="0" />
      </radialGradient>

      <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" />
      </filter>
      <filter id={`${id}-icon-glow`} x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#8b81ff" floodOpacity="0.8" />
      </filter>

      <radialGradient id={`${id}-node-halo`}>
        <stop offset="0" stopColor="#8b81ff" stopOpacity="0.65" />
        <stop offset="1" stopColor="#8b81ff" stopOpacity="0" />
      </radialGradient>
    </defs>
  )
}

function SideStops() {
  return (
    <>
      <stop offset="0" stopColor="#202131" />
      <stop offset="0.55" stopColor="#27283e" />
      <stop offset="0.86" stopColor="#353168" />
      <stop offset="1" stopColor="#5248b4" />
    </>
  )
}

// ---------------------------------------------------------------------------
// Platform
// ---------------------------------------------------------------------------

type IsoPlatformProps = {
  id: string
  /** Centre of the top face. */
  x: number
  y: number
  /** Square side / corner radius before the isometric transform. */
  side?: number
  radius?: number
  /** Vertical squash factor. */
  iso?: number
  /** Slab thickness in screen units. */
  depth?: number
  /** Recessed inner layer. */
  insetSide?: number
  insetRadius?: number
  /** Violet light under the slab. */
  underGlow?: { dy: number; rx: number; ry: number }
  /** Optional content drawn on top (e.g. an icon). */
  children?: ReactNode
}

export function IsoPlatform({
  id,
  x,
  y,
  side = 188,
  radius = 24,
  iso = 0.553,
  depth = 31,
  insetSide = 138,
  insetRadius = 17,
  underGlow = { dy: 76, rx: 180, ry: 64 },
  children,
}: IsoPlatformProps) {
  /** Horizontal half-extent of the rounded rhombus: (side/2 - r) * √2 + r. */
  const halfWidth = (side / 2 - radius) * Math.SQRT2 + radius
  const halfHeight = halfWidth * iso
  // Generous clip rectangles: they only need to cut everything above a given y.
  const clipX = x - 400
  const clipWidth = 800
  const clipHeight = 200

  const diamond = (dy: number, props: DiamondProps = {}) => (
    <Diamond cx={x} cy={y + dy} iso={iso} side={side} radius={radius} {...props} />
  )

  return (
    <g>
      <defs>
        <linearGradient
          id={`${id}-side-band`}
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1={y + depth - halfHeight}
          x2="0"
          y2={y + depth + halfHeight}
        >
          <SideStops />
        </linearGradient>
        {/* Only the front (lower) half of an outline is visible below the top face. */}
        <clipPath id={`${id}-front-seam`}>
          <rect x={clipX} y={y + depth / 2} width={clipWidth} height={clipHeight} />
        </clipPath>
        <clipPath id={`${id}-front-edge`}>
          <rect x={clipX} y={y + depth} width={clipWidth} height={clipHeight} />
        </clipPath>
      </defs>

      <ellipse cx={x} cy={y + underGlow.dy} rx={underGlow.rx} ry={underGlow.ry} fill={`url(#${id}-under-glow)`} />

      {/* Side walls: bottom footprint + a band joining the left/right extremes */}
      {diamond(depth, { fill: `url(#${id}-side-fill)` })}
      <rect x={x - halfWidth} y={y} width={halfWidth * 2} height={depth} fill={`url(#${id}-side-band)`} />

      {/* Seam between the two stacked plates */}
      <g clipPath={`url(#${id}-front-seam)`}>
        {diamond(depth / 2, { fill: 'none', stroke: '#ffffff', strokeOpacity: 0.12 })}
      </g>

      {/* Lit bottom edge: blurred bloom + crisp line */}
      <g clipPath={`url(#${id}-front-edge)`}>
        {diamond(depth, {
          fill: 'none',
          stroke: '#8f84ff',
          strokeWidth: 4,
          strokeOpacity: 0.5,
          filter: `url(#${id}-glow)`,
        })}
        {diamond(depth, { fill: 'none', stroke: '#a79eff', strokeOpacity: 0.85, strokeWidth: 1.3 })}
      </g>

      {/* Top face and recessed inner layer */}
      {diamond(0, { fill: `url(#${id}-face-fill)`, stroke: `url(#${id}-face-rim)`, strokeWidth: 1.2 })}
      {diamond(0, {
        side: insetSide,
        radius: insetRadius,
        fill: `url(#${id}-inset-fill)`,
        stroke: '#ffffff',
        strokeOpacity: 0.07,
      })}

      {children}
    </g>
  )
}

type DiamondProps = SVGProps<SVGRectElement> & {
  cx?: number
  cy?: number
  iso?: number
  side?: number
  radius?: number
}

/** Rounded square → rotated 45° → squashed: the platform's rhombus footprint. */
function Diamond({ cx = 0, cy = 0, iso = 1, side = 100, radius = 0, ...rest }: DiamondProps) {
  return (
    <rect
      x={-side / 2}
      y={-side / 2}
      width={side}
      height={side}
      rx={radius}
      transform={`translate(${cx} ${cy}) scale(1 ${iso}) rotate(45)`}
      vectorEffect="non-scaling-stroke"
      {...rest}
    />
  )
}

// ---------------------------------------------------------------------------
// Glass module card
// ---------------------------------------------------------------------------

type GlassCardProps = {
  id: string
  Icon: LucideIcon
  /** Card centre. */
  cx: number
  cy: number
  w: number
  h: number
  /** skewY angle in degrees — cards lean toward the platform like isometric faces. */
  skew: number
  radius?: number
  iconSize?: number
  /** Icon centre relative to the card centre. */
  iconCenterY?: number
  iconStrokeWidth?: number
  /** Two placeholder "text" bars under the icon. */
  bars?: boolean
}

export function GlassCard({
  id,
  Icon,
  cx,
  cy,
  w,
  h,
  skew,
  radius = 14,
  iconSize = 32,
  iconCenterY = -14,
  iconStrokeWidth = 1.5,
  bars = true,
}: GlassCardProps) {
  const bar = (y: number, length: number, opacity: number) => (
    <line
      x1={-length / 2}
      y1={y}
      x2={length / 2}
      y2={y}
      stroke="#ffffff"
      strokeOpacity={opacity}
      strokeWidth={5}
      strokeLinecap="round"
    />
  )

  return (
    <g transform={`translate(${cx} ${cy}) skewY(${skew})`}>
      <rect
        x={-w / 2}
        y={-h / 2}
        width={w}
        height={h}
        rx={radius}
        fill={`url(#${id}-card-fill)`}
        stroke={`url(#${id}-card-stroke)`}
        filter={`url(#${id}-card-shadow)`}
      />
      <Icon
        x={-iconSize / 2}
        y={iconCenterY - iconSize / 2}
        width={iconSize}
        height={iconSize}
        color="#e4e6f2"
        strokeWidth={iconStrokeWidth}
        absoluteStrokeWidth
      />
      {bars ? (
        <>
          {bar(19, w * 0.56, 0.16)}
          {bar(32, w * 0.31, 0.1)}
        </>
      ) : null}
    </g>
  )
}

// ---------------------------------------------------------------------------
// Network node
// ---------------------------------------------------------------------------

type GlowNodeProps = {
  id: string
  x: number
  y: number
  /** Smaller, fainter junction point. */
  dim?: boolean
  /** Uniform size multiplier (1 = login artwork). */
  scale?: number
}

export function GlowNode({ id, x, y, dim = false, scale = 1 }: GlowNodeProps) {
  return (
    <g>
      <circle cx={x} cy={y} r={(dim ? 6 : 11) * scale} fill={`url(#${id}-node-halo)`} />
      <circle cx={x} cy={y} r={(dim ? 2.2 : 3.8) * scale} fill="#c9c5ff" fillOpacity={dim ? 0.7 : 1} />
    </g>
  )
}
