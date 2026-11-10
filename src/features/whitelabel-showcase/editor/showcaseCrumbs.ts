import type { Breadcrumb } from '../../../components/shell/TopHeader'

/** Breadcrumb trail of the approved hierarchy: Plataformas → Homolog Loor → Configurações → Plataforma → Vitrine. */
export function showcaseCrumbs(tenantId: string, extra: Breadcrumb[]): Breadcrumb[] {
  return [
    { label: 'Plataformas', href: '#/whitelabels' },
    { label: 'Homolog Loor', href: `#/whitelabels?id=${encodeURIComponent(tenantId)}` },
    { label: 'Configurações', href: `#/whitelabels/${encodeURIComponent(tenantId)}/settings` },
    { label: 'Plataforma', href: `#/whitelabels/${encodeURIComponent(tenantId)}/settings` },
    ...extra,
  ]
}
