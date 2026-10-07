import { Play, ScanFace, Store, Target } from 'lucide-react'
import { useOpportunities } from '../opportunities/opportunityStore'
import { countLabel } from '../shared/operationModel'
import { ENTREPRENEUR_PROFILES } from '../shared/participants'
import { OperationShell, PageIntro } from '../shared/OperationUi'
import { ParticipantList, type ParticipantListConfig } from '../shared/ParticipantList'

/**
 * Empreendedores V1 — operational view of opportunity originators across
 * Whitelabels. The Opportunities count is read live from the Opportunities
 * store (references only); nothing here creates or edits Opportunities.
 */
export function EntrepreneursPage() {
  const opportunities = useOpportunities()
  const countOf = (id: string) => opportunities.filter((item) => item.entrepreneurId === id).length

  const config: ParticipantListConfig = {
    singular: 'empreendedor',
    plural: 'empreendedores',
    detailHref: (id) => `#/operation/entrepreneurs/${id}`,
    relation: {
      column: 'Oportunidades',
      filterLabel: 'Filtrar por oportunidades vinculadas',
      anyLabel: 'Com e sem oportunidades',
      withLabel: 'Com oportunidades',
      withoutLabel: 'Sem oportunidades',
      count: (profile) => countOf(profile.id),
      format: (count) => countLabel(count, 'oportunidade', 'oportunidades', 'Sem oportunidades'),
      summaryLabel: 'Com oportunidades',
      summaryIcon: Target,
    },
    summaryIcons: { total: Store, active: Play, kyc: ScanFace },
  }

  return (
    <OperationShell section="entrepreneurs" title="Empreendedores">
      <PageIntro text="Acompanhe empreendedores de todos os Whitelabels em uma só visão operacional. Somente leitura: conta, oportunidades e KYC ficam nos módulos responsáveis." />
      <ParticipantList profiles={ENTREPRENEUR_PROFILES} config={config} />
    </OperationShell>
  )
}
