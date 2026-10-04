import {
  Box,
  ChartColumnIncreasing,
  CircleHelp,
  Cog,
  FileSearch,
  House,
  LayoutGrid,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = {
  id: string
  label: string
  icon: LucideIcon
  /** Only screens that exist in the prototype have a destination. */
  href?: string
}

/**
 * Top-level domains shown in the approved shell. The architecture proposal
 * groups modules under these domains (e.g. Plataformas → Whitelabels,
 * Administradores, Configurações/Plataforma, SMTP); nested pages are
 * intentionally not exposed yet.
 */
export const PRIMARY_NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: House, href: '#/dashboard' },
  // Plataformas is the parent domain of the Whitelabels page (its only screen so far).
  { id: 'plataformas', label: 'Plataformas', icon: LayoutGrid, href: '#/whitelabels' },
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
