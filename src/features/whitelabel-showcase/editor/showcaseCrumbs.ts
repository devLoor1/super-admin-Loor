import type { Breadcrumb } from '../../../components/shell/TopHeader'
import { SHOWCASE_SIMULATION } from '../showcaseMapping'

/** Breadcrumb trail of the approved hierarchy: Plataformas → Homolog Loor → Configurações → Plataforma → Vitrine. */
export function showcaseCrumbs(tenantId: string, extra: Breadcrumb[]): Breadcrumb[] {
  return [
    { label: 'Plataformas', href: '#/whitelabels' },
    { label: SHOWCASE_SIMULATION.logicalOwner.label, href: `#/whitelabels?id=${encodeURIComponent(tenantId)}` },
    { label: 'Configurações', href: `#/whitelabels/${encodeURIComponent(tenantId)}/settings` },
    { label: 'Plataforma', href: `#/whitelabels/${encodeURIComponent(tenantId)}/settings` },
    ...extra,
  ]
}

