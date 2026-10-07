import {
  Box,
  Briefcase,
  Building2,
  ChartColumnIncreasing,
  CircleHelp,
  Cog,
  FileSearch,
  House,
  LayoutGrid,
  Link2,
  ListChecks,
  Mail,
  Settings,
  Shapes,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  TrendingUp,
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
  {
    id: 'operacao',
    label: 'Operação',
    icon: Box,
    href: '#/operation/opportunities',
    // Three sibling, logically independent modules; global (not tenant-first) lists.
    children: [
      { id: 'operation-opportunities', label: 'Oportunidades', icon: Target, href: '#/operation/opportunities' },
      { id: 'operation-investors', label: 'Investidores', icon: TrendingUp, href: '#/operation/investors' },
      { id: 'operation-entrepreneurs', label: 'Empreendedores', icon: Briefcase, href: '#/operation/entrepreneurs' },
    ],
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    icon: ChartColumnIncreasing,
    // Tenant-first like the Plataformas screens: pages pass `subNavHrefs` (parent included).
    href: '#/whitelabels/wl_proto_01/finance/gateways',
    children: [
      { id: 'finance-gateways', label: 'Gateways e contas', icon: Link2, href: '#/whitelabels/wl_proto_01/finance/gateways' },
      { id: 'finance-modalities', label: 'Modalidades e regras', icon: ListChecks, href: '#/whitelabels/wl_proto_01/finance/modalities' },
      // One entry for the combined screen: Segments and Resource Uses stay independent catalogs.
      {
        id: 'finance-catalogs',
        label: 'Segmentos e usos dos recursos',
        icon: Shapes,
        href: '#/whitelabels/wl_proto_01/finance/segments-resource-uses',
      },
    ],
  },
  { id: 'compliance', label: 'Compliance', icon: ShieldCheck },
  { id: 'sistema', label: 'Sistema', icon: Settings },
  { id: 'auditoria', label: 'Auditoria', icon: FileSearch },
]

export const UTILITY_NAV: NavItem[] = [
  { id: 'configuracoes', label: 'Configurações', icon: Cog },
  { id: 'ajuda', label: 'Ajuda', icon: CircleHelp },
]
