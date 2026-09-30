import type { SVGProps } from 'react'
import {
  Box,
  Building,
  ChartNoAxesCombined,
  Layers,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react'

/**
 * Decorative illustration: a central layered platform (the Super Admin)
 * connected to surrounding administrative modules (companies, users,
 * products, reports, settings) on an orbital network.
 *
 * Coordinates follow the approved reference image (viewBox = the region of the
 * image the artwork occupies), so positions can be checked against it 1:1.
 * Lightweight on purpose: plain SVG + lucide icons, no raster assets. Final
 * artwork is expected to be revisited in a later phase.
 */

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

/** Centre of the platform's top face. */
const PLATFORM = { x: 400, y: 475 }
/** Vertical squash that turns a rotated square into an isometric-looking rhombus. */
const ISO = 0.553
/** Square side / corner radius before the isometric transform. */
const FACE_SIDE = 188
const FACE_RADIUS = 24
/** Slab thickness in screen px. */
const DEPTH = 31
/** Horizontal half-extent of the rounded rhombus: (side/2 - r) * √2 + r. */
const HALF_WIDTH = (FACE_SIDE / 2 - FACE_RADIUS) * Math.SQRT2 + FACE_RADIUS
/** Vertical half-extent of the rounded rhombus. */
const HALF_HEIGHT = HALF_WIDTH * ISO

type ModuleCard = {
  id: string
  Icon: LucideIcon
  /** Card centre. */
  cx: number
  cy: number
  w: number
  h: number
  /** skewY angle in degrees — cards lean toward the platform like isometric faces. */
  skew: number
}

const CARDS: ModuleCard[] = [
  { id: 'companies', Icon: Building, cx: 190, cy: 357, w: 128, h: 124, skew: -9 },
  { id: 'users', Icon: Users, cx: 567, cy: 290, w: 116, h: 112, skew: 10 },
  { id: 'products', Icon: Box, cx: 677, cy: 506, w: 112, h: 112, skew: 11 },
  { id: 'reports', Icon: ChartNoAxesCombined, cx: 159, cy: 623, w: 108, h: 112, skew: -11 },
  { id: 'settings', Icon: Settings, cx: 533, cy: 666, w: 106, h: 108, skew: 9 },
]

/** Curves linking modules and orbit points to the platform. */
const LINKS: { d: string; dashed?: boolean; opacity?: number }[] = [
  { d: 'M256 367 C298 377 326 402 342 430', dashed: true }, // companies
  { d: 'M357 315 C328 336 322 386 352 418', opacity: 0.32 }, // top orbit node
  { d: 'M510 310 C472 330 452 378 458 418', opacity: 0.36 }, // users
  { d: 'M513 490 C556 490 580 514 621 511', dashed: true }, // products
  { d: 'M470 436 C520 410 574 406 604 420 C626 430 642 440 654 452', opacity: 0.3 },
  { d: 'M212 610 C258 600 290 560 318 541', dashed: true }, // reports
  { d: 'M462 540 C486 560 499 586 503 610', dashed: true }, // settings
  { d: 'M122 572 C116 520 168 470 251 471 C262 471 274 474 288 478', dashed: true, opacity: 0.4 },
]

/** Glowing network nodes. `dim` nodes are smaller junction points. */
const NODES: { x: number; y: number; dim?: boolean }[] = [
  { x: 256, y: 367 },
  { x: 510, y: 310 },
  { x: 621, y: 511 },
  { x: 212, y: 610 },
  { x: 604, y: 420 },
  // points on the outer orbit
  { x: 357, y: 315 },
  { x: 78, y: 480 },
  { x: 321, y: 680 },
  { x: 626, y: 632 },
  // junctions
  { x: 251, y: 471, dim: true },
  { x: 318, y: 541, dim: true },
  { x: 462, y: 540, dim: true },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PlatformIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="50 205 710 540"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <Defs />

      {/* Orbits */}
      <ellipse
        cx={398}
        cy={500}
        rx={322}
        ry={186}
        fill="none"
        stroke="#aaa5d7"
        strokeOpacity={0.3}
        strokeDasharray="3 5"
      />
      <ellipse cx={400} cy={496} rx={214} ry={124} fill="none" stroke="#aaa5d7" strokeOpacity={0.07} />

      {/* Connections */}
      <g fill="none" stroke="#a097ff" strokeWidth={1.1} strokeLinecap="round">
        {LINKS.map((link) => (
          <path
            key={link.d}
            d={link.d}
            strokeOpacity={link.opacity ?? 0.5}
            strokeDasharray={link.dashed ? '3 4' : undefined}
          />
        ))}
      </g>

      <Platform />

      {CARDS.map((card) => (
        <ModuleCardShape key={card.id} {...card} />
      ))}

      {NODES.map((node) => (
        <g key={`${node.x}-${node.y}`}>
          <circle cx={node.x} cy={node.y} r={node.dim ? 6 : 11} fill="url(#pi-node-halo)" />
          <circle
            cx={node.x}
            cy={node.y}
            r={node.dim ? 2.2 : 3.8}
            fill="#c9c5ff"
            fillOpacity={node.dim ? 0.7 : 1}
          />
        </g>
      ))}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Parts
// ---------------------------------------------------------------------------

function Defs() {
  return (
    <defs>
      {/* Glass module cards */}
      <linearGradient id="pi-card-fill" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#3a3b50" stopOpacity="0.82" />
        <stop offset="1" stopColor="#1b1c27" stopOpacity="0.82" />
      </linearGradient>
      <linearGradient id="pi-card-stroke" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.24" />
        <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.06" />
        <stop offset="1" stopColor="#ffffff" stopOpacity="0.1" />
      </linearGradient>
      <filter id="pi-card-shadow" x="-40%" y="-30%" width="180%" height="180%">
        <feDropShadow dx="0" dy="12" stdDeviation="11" floodColor="#05060a" floodOpacity="0.6" />
      </filter>

      {/* Platform — local diagonal gradients map to screen-vertical after the isometric transform */}
      <linearGradient id="pi-face-fill" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#393a52" />
        <stop offset="1" stopColor="#1e1f2d" />
      </linearGradient>
      <linearGradient id="pi-face-rim" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.4" />
        <stop offset="0.45" stopColor="#ffffff" stopOpacity="0.08" />
        <stop offset="1" stopColor="#d6d1ff" stopOpacity="0.34" />
      </linearGradient>
      <linearGradient id="pi-inset-fill" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#1c1d29" />
        <stop offset="1" stopColor="#2c2d41" />
      </linearGradient>
      <linearGradient id="pi-side-fill" x1="0" y1="0" x2="1" y2="1">
        <SideStops />
      </linearGradient>
      <linearGradient
        id="pi-side-band"
        gradientUnits="userSpaceOnUse"
        x1="0"
        y1={PLATFORM.y + DEPTH - HALF_HEIGHT}
        x2="0"
        y2={PLATFORM.y + DEPTH + HALF_HEIGHT}
      >
        <SideStops />
      </linearGradient>
      <radialGradient id="pi-under-glow">
        <stop offset="0" stopColor="#6c5cff" stopOpacity="0.38" />
        <stop offset="0.55" stopColor="#5a4ce0" stopOpacity="0.16" />
        <stop offset="1" stopColor="#5a4ce0" stopOpacity="0" />
      </radialGradient>

      {/* Only the front (lower) half of an outline is visible below the top face. */}
      <clipPath id="pi-front-seam">
        <rect x="0" y={PLATFORM.y + DEPTH / 2} width="800" height="200" />
      </clipPath>
      <clipPath id="pi-front-edge">
        <rect x="0" y={PLATFORM.y + DEPTH} width="800" height="200" />
      </clipPath>

      <filter id="pi-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" />
      </filter>
      <filter id="pi-icon-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#8b81ff" floodOpacity="0.8" />
      </filter>

      <radialGradient id="pi-node-halo">
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

type DiamondProps = SVGProps<SVGRectElement> & { dy?: number; side?: number; radius?: number }

/** Rounded square → rotated 45° → squashed: the platform's rhombus footprint. */
function Diamond({ dy = 0, side = FACE_SIDE, radius = FACE_RADIUS, ...rest }: DiamondProps) {
  return (
    <rect
      x={-side / 2}
      y={-side / 2}
      width={side}
      height={side}
      rx={radius}
      transform={`translate(${PLATFORM.x} ${PLATFORM.y + dy}) scale(1 ${ISO}) rotate(45)`}
      vectorEffect="non-scaling-stroke"
      {...rest}
    />
  )
}

function Platform() {
  const iconSize = 56
  return (
    <g>
      {/* Violet light spilling under the slab */}
      <ellipse cx={PLATFORM.x} cy={PLATFORM.y + 76} rx={180} ry={64} fill="url(#pi-under-glow)" />

      {/* Side walls: bottom footprint + a band joining the left/right extremes */}
      <Diamond dy={DEPTH} fill="url(#pi-side-fill)" />
      <rect
        x={PLATFORM.x - HALF_WIDTH}
        y={PLATFORM.y}
        width={HALF_WIDTH * 2}
        height={DEPTH}
        fill="url(#pi-side-band)"
      />

      {/* Seam between the two stacked plates */}
      <g clipPath="url(#pi-front-seam)">
        <Diamond dy={DEPTH / 2} fill="none" stroke="#ffffff" strokeOpacity={0.12} />
      </g>

      {/* Lit bottom edge: blurred bloom + crisp line */}
      <g clipPath="url(#pi-front-edge)">
        <Diamond dy={DEPTH} fill="none" stroke="#8f84ff" strokeWidth={4} strokeOpacity={0.5} filter="url(#pi-glow)" />
        <Diamond dy={DEPTH} fill="none" stroke="#a79eff" strokeOpacity={0.85} strokeWidth={1.3} />
      </g>

      {/* Top face and recessed inner layer */}
      <Diamond fill="url(#pi-face-fill)" stroke="url(#pi-face-rim)" strokeWidth={1.2} />
      <Diamond
        side={138}
        radius={17}
        fill="url(#pi-inset-fill)"
        stroke="#ffffff"
        strokeOpacity={0.07}
      />

      <Layers
        x={PLATFORM.x - iconSize / 2}
        y={PLATFORM.y - iconSize / 2 - 3}
        width={iconSize}
        height={iconSize}
        color="#dedcff"
        strokeWidth={1.8}
        absoluteStrokeWidth
        filter="url(#pi-icon-glow)"
      />
    </g>
  )
}

function ModuleCardShape({ Icon, cx, cy, w, h, skew }: ModuleCard) {
  const iconSize = 32
  const iconCenterY = -14
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
        rx={14}
        fill="url(#pi-card-fill)"
        stroke="url(#pi-card-stroke)"
        filter="url(#pi-card-shadow)"
      />
      <Icon
        x={-iconSize / 2}
        y={iconCenterY - iconSize / 2}
        width={iconSize}
        height={iconSize}
        color="#e4e6f2"
        strokeWidth={1.5}
        absoluteStrokeWidth
      />
      {bar(19, w * 0.56, 0.16)}
      {bar(32, w * 0.31, 0.1)}
    </g>
  )
}
