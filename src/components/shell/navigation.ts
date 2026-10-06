import {
  Box,
  Building2,
  ChartColumnIncreasing,
  CircleHelp,
  Cog,
  FileSearch,
  House,
  LayoutGrid,
  Mail,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
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
    // Plataformas is the parent context of the Whitelabels, Contas, Config. do Whitelabel and E-mails screens.
    children: [
      { id: 'whitelabels', label: 'Whitelabels', icon: Building2, href: '#/whitelabels' },
      // Contas, Config. do Whitelabel and E-mails are tenant-first: by default they open the first
      // illustrative Whitelabel; pages pass `subNavHrefs` for the current one.
      { id: 'contas', label: 'Contas', icon: UsersRound, href: '#/whitelabels/wl_proto_01/accounts' },
      { id: 'whitelabel-settings', label: 'Config. do Whitelabel', icon: SlidersHorizontal, href: '#/whitelabels/wl_proto_01/settings' },
      { id: 'whitelabel-emails', label: 'E-mails', icon: Mail, href: '#/whitelabels/wl_proto_01/emails' },
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
