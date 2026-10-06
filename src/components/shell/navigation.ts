import {
  Box,
  Building2,
  ChartColumnIncreasing,
  CircleHelp,
  Cog,
  FileSearch,
  House,
  LayoutGrid,
  Settings,
  ShieldCheck,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = {
  id: string
  label: string
  icon: LucideIcon
  /** Only screens that exist in the prototype have a destination. */
  href?: string
  /** Screens inside this domain. Shown under the parent while the domain is active. */
  children?: NavItem[]
}

/**
 * Top-level domains shown in the approved shell. The architecture proposal
 * groups modules under these domains (e.g. Plataformas → Whitelabels,
 * Administradores, Configurações/Plataforma, SMTP); only screens that exist in
 * the prototype are exposed as nested entries.
 */
export const PRIMARY_NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: House, href: '#/dashboard' },
  {
    id: 'plataformas',
    label: 'Plataformas',
    icon: LayoutGrid,
    href: '#/whitelabels',
    // Plataformas is the parent context of the Whitelabels and Contas screens.
    children: [
      { id: 'whitelabels', label: 'Whitelabels', icon: Building2, href: '#/whitelabels' },
      // Contas is tenant-first: the entry opens the first illustrative Whitelabel.
      { id: 'contas', label: 'Contas', icon: UsersRound, href: '#/whitelabels/wl_proto_01/accounts' },
    ],
  },
  { id: 'operacao', label: 'Operação', icon: Box },
  { id: 'financeiro', label: 'Financeiro', icon: ChartColumnIncreasing },
  { id: 'compliance', label: 'Compliance', icon: ShieldCheck },
  { id: 'sistema', label: 'Sistema', icon: Settings },
  { id: 'auditoria', label: 'Auditoria', icon: FileSearch },
]

export const UTILITY_NAV: NavItem[] = [
  { id: 'configuracoes', label: 'Configurações', icon: Cog },
  { id: 'ajuda', label: 'Ajuda', icon: CircleHelp },
]
