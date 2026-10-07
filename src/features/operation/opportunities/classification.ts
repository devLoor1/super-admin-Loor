import type { CatalogItem } from '../../finance-catalogs/catalogModel'
import { useCatalogsSnapshot } from '../../finance-catalogs/catalogStore'
import type { Opportunity } from './opportunityModel'

/*
 * Resolves the catalog references an Opportunity holds. Segments are looked up
 * ONLY in the Segment catalog and Resource Uses ONLY in the Resource Use
 * catalog of the opportunity's Whitelabel — a same-named record in the other
 * catalog is never used, and nothing is copied into the Opportunity.
 */

export type ResolvedRef = {
  id: string
  name: string
  /** `missing`: the record no longer exists in the local catalog (e.g. deleted in this session). */
  state: 'active' | 'inactive' | 'missing'
}

export function resolveRefs(ids: string[], catalog: readonly Readonly<CatalogItem>[] | undefined): ResolvedRef[] {
  return ids.map((id) => {
    const item = catalog?.find((entry) => entry.id === id)
    return item ? { id, name: item.name, state: item.status } : { id, name: 'Registro não encontrado', state: 'missing' }
  })
}

export function useCatalogResolver() {
  const { segments, resourceUses } = useCatalogsSnapshot()
  return {
    segmentsOf: (whitelabelId: string) => segments[whitelabelId] ?? [],
    resourceUsesOf: (whitelabelId: string) => resourceUses[whitelabelId] ?? [],
    resolve: (opportunity: Pick<Opportunity, 'whitelabelId' | 'segmentIds' | 'resourceUseIds'>) => ({
      segments: resolveRefs(opportunity.segmentIds, segments[opportunity.whitelabelId]),
      resourceUses: resolveRefs(opportunity.resourceUseIds, resourceUses[opportunity.whitelabelId]),
    }),
  }
}

/** Plain-text names for compact summaries ("Tecnologia, Agronegócio (inativo)"). */
export const refNames = (items: ResolvedRef[]) =>
  items.map((item) => (item.state === 'missing' ? `${item.id} (fora do catálogo)` : item.state === 'inactive' ? `${item.name} (inativo)` : item.name))
