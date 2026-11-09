import { DetailList, InfoNote } from '../shared/OperationUi'
import { OverviewAccount, OverviewCard, OverviewHero, OverviewRead, OverviewTabs } from '../shared/OverviewUi'
import { overviewDate, overviewStatus } from '../shared/overviewPresent'
import { isPositiveCoreId } from '../shared/coreIds'
import { money } from '../shared/overviewContract'
import { useEntrepreneurOverview } from '../shared/useOverview'
import { entrepreneurListReturnHash } from './entrepreneurRoute'
import type { EntrepreneurOverview } from './entrepreneurOverviewApi'
import { companyHref } from '../companies/companyRoute'
import shared from '../shared/Operation.module.css'

export function EntrepreneurDetailPage({ entrepreneurId, returnTo }: { entrepreneurId: string; returnTo?: string }) {
  const detail = useEntrepreneurOverview(entrepreneurId)
  return <OverviewRead {...detail} valid={isPositiveCoreId(entrepreneurId)} section="entrepreneurs" title="Empreendedores" listHref={entrepreneurListReturnHash(returnTo)}>
    {data => <EntrepreneurProfile key={data.entrepreneur.id} data={data} />}
  </OverviewRead>
}
function EntrepreneurProfile({ data: d }: { data: EntrepreneurOverview }) {
  const { entrepreneur: p, company: c, summary: s } = d
  return <>
    <OverviewHero value={p} access={d.account?.accessState} kind="empreendedor" />
    <OverviewTabs sections={[
      { id: 'overview', label: 'Visão geral', content: <div className={shared.panelGrid}>
        <OverviewCard title="Informações principais" note="Identidade Core, não uma conta de investidor."><DetailList rows={[
          { label: 'Nome', value: p.fullName ?? 'Não informado' },
          { label: 'Dados pessoais preenchidos', value: p.personalInformationFilled === null ? 'Não informado' : p.personalInformationFilled ? 'Sim' : 'Não' },
          { label: 'Criado em', value: overviewDate(p.createdAt) },
        ]} /></OverviewCard><OverviewAccount value={d.account} />
      </div> },
      { id: 'company', label: 'Empresa', content: <OverviewCard title="Empresa vinculada" note="1 Empreendedor → 0..1 Empresa. Resumo autoritativo do overview, sem consulta duplicada.">
        {c ? <><DetailList rows={[
          { label: 'ID da empresa', value: c.id },
          { label: 'Razão social', value: c.legalName ?? 'Não informado' },
          { label: 'Nome fantasia', value: c.tradeName ?? 'Não informado' },
          { label: 'CNPJ mascarado', value: c.cnpjMasked ?? 'Não disponível' },
          { label: 'Status', value: overviewStatus(c.status) },
        ]} /><a className={shared.inlineLink} href={companyHref(c.id, `#/operation/companies?whitelabel=${p.whitelabelId}`)}>Consultar empresa #{c.id}</a><p>O cadastro independente de Empresas oferece detalhes adicionais de validação e contato.</p></> : <p data-company-state="absent">Sem empresa vinculada — company: null na origem.</p>}
      </OverviewCard> },
      { id: 'relation', label: 'Oportunidades', content: <>
        <OverviewCard title="Resumo de oportunidades" note="Totais completos na origem; distribuição por status limitada à prévia retornada."><DetailList rows={[
          { label: 'Total (consulta completa)', value: s?.opportunitiesCount ?? 'Não disponível' },
          { label: 'Ativas (consulta completa)', value: s?.activeOpportunities ?? 'Não disponível' },
          { label: 'Total captado', value: money(s?.totalRaisedCents ?? null) },
          ...(s ? Object.entries(s.byStatus).map(([status, count]) => ({ label: `${status} (somente prévia)`, value: count })) : []),
        ]} /></OverviewCard>
        <OverviewCard title="Oportunidades retornadas" note={`Prévia de até 50 registros (${d.opportunities.length} retornados); não é a população completa.`}>
          {d.opportunities.length ? <DetailList rows={d.opportunities.map(r => ({ label: `Oportunidade #${r.id}`, value: <><a className={shared.inlineLink} href={`#/operation/opportunities/${r.id}`}>{r.name ?? `Oportunidade #${r.id}`}</a><p>{overviewStatus(r.status)} · {overviewDate(r.createdAt)}</p></> }))} /> : <p>Nenhuma oportunidade retornada nesta prévia.</p>}
        </OverviewCard>
      </> },
    ]} />
    <InfoNote>Somente leitura. Ferramentas e documentos são placeholders na origem: listas vazias não demonstram ausência de documentos ou módulos desativados. O KYC Face Match de investidores não cobre este empreendedor.</InfoNote>
  </>
}
