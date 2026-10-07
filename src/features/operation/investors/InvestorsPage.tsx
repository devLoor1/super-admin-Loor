import { ChartColumn, Play, ScanFace, UsersRound } from 'lucide-react'
import { countLabel } from '../shared/operationModel'
import { INVESTOR_PROFILES } from '../shared/participants'
import { OperationShell, PageIntro } from '../shared/OperationUi'
import { ParticipantList, type ParticipantListConfig } from '../shared/ParticipantList'
import { associationsOf } from './prototypeInvestments'

const CONFIG: ParticipantListConfig = {
  singular: 'investidor',
  plural: 'investidores',
  detailHref: (id) => `#/operation/investors/${id}`,
  relation: {
    column: 'Investimentos',
    filterLabel: 'Filtrar por vínculos de investimento',
    anyLabel: 'Com e sem investimentos',
    withLabel: 'Com investimentos',
    withoutLabel: 'Sem investimentos',
    count: (profile) => associationsOf(profile.id).length,
    format: (count) => countLabel(count, 'vínculo', 'vínculos', 'Sem investimentos'),
    summaryLabel: 'Com investimentos',
    summaryIcon: ChartColumn,
  },
  summaryIcons: { total: UsersRound, active: Play, kyc: ScanFace },
}

/**
 * Investidores V1 — operational supervision across Whitelabels: find,
 * inspect, understand context, navigate to the responsible domain. Not
 * Accounts, not Financeiro › Investimentos, not Compliance / KYC.
 */
export function InvestorsPage() {
  return (
    <OperationShell section="investors" title="Investidores">
      <PageIntro text="Acompanhe investidores de todos os Whitelabels em uma só visão operacional. Somente leitura: conta, investimentos e KYC ficam nos módulos responsáveis." />
      <ParticipantList profiles={INVESTOR_PROFILES} config={CONFIG} />
    </OperationShell>
  )
}
