import {
  Box,
  Building,
  ChartNoAxesCombined,
  Layers,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { GlassCard, GlowNode, IsoDefs, IsoPlatform } from '../../components/illustration/IsoScene'

/**
 * Decorative illustration: a central layered platform (the Super Admin)
 * connected to surrounding administrative modules (companies, users,
 * products, reports, settings) on an orbital network.
 *
 * Coordinates follow the approved reference image (viewBox = the region of the
 * image the artwork occupies), so positions can be checked against it 1:1.
 * Lightweight on purpose: plain SVG + lucide icons, no raster assets. The
 * drawing primitives live in components/illustration/IsoScene (shared with the
 * Dashboard overview); this file only holds the login scene's layout.
 */

/** Scene id — namespaces the SVG gradient/filter ids. */
const SCENE = 'pi'

/** Centre of the platform's top face. */
const PLATFORM = { x: 400, y: 475 }

type ModuleCard = {
  id: string
  Icon: LucideIcon
  cx: number
  cy: number
  w: number
  h: number
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

export function PlatformIllustration({ className }: { className?: string }) {
  const iconSize = 56

  return (
    <svg viewBox="50 205 710 540" className={className} aria-hidden="true" focusable="false">
      <IsoDefs id={SCENE} />

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

      <IsoPlatform id={SCENE} x={PLATFORM.x} y={PLATFORM.y}>
        <Layers
          x={PLATFORM.x - iconSize / 2}
          y={PLATFORM.y - iconSize / 2 - 3}
          width={iconSize}
          height={iconSize}
          color="#dedcff"
          strokeWidth={1.8}
          absoluteStrokeWidth
          filter={`url(#${SCENE}-icon-glow)`}
        />
      </IsoPlatform>

      {CARDS.map(({ id, ...card }) => (
        <GlassCard key={id} id={SCENE} {...card} />
      ))}

      {NODES.map((node) => (
        <GlowNode key={`${node.x}-${node.y}`} id={SCENE} x={node.x} y={node.y} dim={node.dim} />
      ))}
    </svg>
  )
}
