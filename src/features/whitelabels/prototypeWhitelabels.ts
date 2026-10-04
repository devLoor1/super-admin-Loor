import type { StatusTone } from '../../components/ui/StatusPill'

/**
 * ILLUSTRATIVE PROTOTYPE ROWS — not production data and not a backend contract.
 *
 * Three rows taken from the approved Whitelabels V1 image so the table,
 * filters and selection can be demonstrated. Counts and dates are left empty
 * (null → "—") on purpose: nothing here comes from an integration.
 * The status vocabulary is visual-only and must be reconciled with the
 * Control Plane before real data is wired in.
 */

export type WhitelabelStatus = 'active' | 'setup' | 'draft' | 'inactive'

export type Whitelabel = {
  /** Local prototype identifier (shown as "ID"). */
  id: string
  name: string
  domain: string
  slug: string
  status: WhitelabelStatus
  /** Avatar: initial letter, or a neutral icon when `initial` is omitted. */
  initial?: string
  avatarTone: 'blue' | 'violet' | 'neutral'
  admins: number | null
  applications: number | null
  integrations: number | null
  updatedAt: string | null
}

export const STATUS_META: Record<WhitelabelStatus, { label: string; tone: StatusTone }> = {
  active: { label: 'Ativo', tone: 'success' },
  setup: { label: 'Em configuração', tone: 'warning' },
  draft: { label: 'Rascunho', tone: 'neutral' },
  inactive: { label: 'Inativo', tone: 'muted' },
}

export const PROTOTYPE_WHITELABELS: Whitelabel[] = [
  {
    id: 'wl_proto_01',
    name: 'Finapop',
    domain: 'finapop.com.br',
    slug: 'finapop',
    status: 'active',
    initial: 'F',
    avatarTone: 'blue',
    admins: null,
    applications: null,
    integrations: null,
    updatedAt: null,
  },
  {
    id: 'wl_proto_02',
    name: 'Loor',
    domain: 'loor.com.br',
    slug: 'loor',
    status: 'setup',
    initial: 'L',
    avatarTone: 'violet',
    admins: null,
    applications: null,
    integrations: null,
    updatedAt: null,
  },
  {
    id: 'wl_proto_03',
    name: 'Nova Plataforma',
    domain: 'plataforma.com.br',
    slug: 'nova-plataforma',
    status: 'draft',
    avatarTone: 'neutral',
    admins: null,
    applications: null,
    integrations: null,
    updatedAt: null,
  },
]
