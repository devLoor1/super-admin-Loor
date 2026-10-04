import { Building, ChartNoAxesColumnIncreasing, ShieldCheck, Users } from 'lucide-react'
import { GlassCard, GlowNode, IsoDefs, IsoPlatform } from '../../components/illustration/IsoScene'

/** Scene id — namespaces the SVG gradient/filter ids. */
const SCENE = 'ov'

/** Centre of the platform's top face (reference image coordinates). */
const PLATFORM = { x: 1128, y: 349 }

const CARDS = [
  { id: 'whitelabels', Icon: Building, cx: 1033, cy: 305, skew: -12 },
  { id: 'users', Icon: Users, cx: 1210, cy: 288, skew: 10.5 },
  { id: 'reports', Icon: ChartNoAxesColumnIncreasing, cx: 996, cy: 386, skew: -12 },
  { id: 'compliance', Icon: ShieldCheck, cx: 1267, cy: 372, skew: 11.5 },
]

const LINKS: { d: string; dashed?: boolean; opacity?: number }[] = [
  { d: 'M1061 310 C1075 314 1085 322 1093 332', dashed: true },
  { d: 'M1183 294 C1168 300 1160 314 1158 330', opacity: 0.4 },
  { d: 'M1024 387 C1048 384 1068 378 1086 370', dashed: true },
  { d: 'M1241 376 C1222 372 1204 364 1188 357', dashed: true },
]

const NODES: { x: number; y: number; dim?: boolean }[] = [
  { x: 948, y: 339 },
  { x: 1094, y: 292 },
  { x: 1183, y: 294 },
  { x: 1236, y: 337 },
  { x: 1024, y: 387 },
  { x: 1241, y: 376 },
  { x: 1309, y: 366 },
  { x: 1061, y: 310, dim: true },
]

/**
 * Compact version of the login artwork for the "Supervisão global" panel:
 * the same platform/glass-card/node primitives, four modules (whitelabels,
 * users, reports, compliance), no platform icon. Coordinates follow the
 * approved Dashboard image so the scene can be compared against it 1:1.
 */
export function GlobalOverviewIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="930 248 395 172" className={className} aria-hidden="true" focusable="false">
      <IsoDefs id={SCENE} cardShadow={{ dy: 7, blur: 6, opacity: 0.55 }} />

      <ellipse
        cx={1128}
        cy={353}
        rx={181}
        ry={62}
        fill="none"
        stroke="#aaa5d7"
        strokeOpacity={0.3}
        strokeDasharray="3 4"
      />
      <ellipse cx={1128} cy={357} rx={122} ry={42} fill="none" stroke="#aaa5d7" strokeOpacity={0.12} strokeDasharray="3 4" />

      <g fill="none" stroke="#a097ff" strokeWidth={1} strokeLinecap="round">
        {LINKS.map((link) => (
          <path
            key={link.d}
            d={link.d}
            strokeOpacity={link.opacity ?? 0.5}
            strokeDasharray={link.dashed ? '3 3' : undefined}
          />
        ))}
      </g>

      <IsoPlatform
        id={SCENE}
        x={PLATFORM.x}
        y={PLATFORM.y}
        side={104}
        radius={11}
        iso={0.593}
        depth={16}
        insetSide={76}
        insetRadius={8}
        underGlow={{ dy: 40, rx: 96, ry: 32 }}
      />

      {CARDS.map(({ id, ...card }) => (
        <GlassCard
          key={id}
          id={SCENE}
          {...card}
          w={54}
          h={55}
          radius={8}
          iconSize={22}
          iconCenterY={0}
          iconStrokeWidth={1.4}
          bars={false}
        />
      ))}

      {NODES.map((node) => (
        <GlowNode key={`${node.x}-${node.y}`} id={SCENE} x={node.x} y={node.y} dim={node.dim} scale={0.75} />
      ))}
    </svg>
  )
}
