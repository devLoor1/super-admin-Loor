import { useSyncExternalStore } from 'react'
import { getSessionVersion, subscribeSession } from '../../../lib/authSession'
import { useRemote } from '../../../lib/useRemoteResource'
import { describeApiError } from '../../../lib/apiErrors'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import { DetailList, InfoNote } from '../shared/OperationUi'
import { OverviewAccount, OverviewCard, OverviewHero, OverviewRead, OverviewTabs } from '../shared/OverviewUi'
import { overviewDate, overviewStatus } from '../shared/overviewPresent'
import { isPositiveCoreId } from '../shared/coreIds'
import { money } from '../shared/overviewContract'
import { useInvestorOverview } from '../shared/useOverview'
import { getInvestor, investorTypeLabel, validationMeta } from './investorApi'
import { investorListReturnHash } from './investorRoute'
import type { InvestorOverview } from './investorOverviewApi'
import { investmentHref, paymentHref, walletHref } from '../../finance-core/shared/financeRoute'
import shared from '../shared/Operation.module.css'

export function InvestorDetailPage({ investorId, returnTo }: { investorId: string; returnTo?: string }) {
  const detail = useInvestorOverview(investorId)
  return <OverviewRead {...detail} valid={isPositiveCoreId(investorId)} section="investors" title="Investidores" listHref={investorListReturnHash(returnTo)}>
    {data => <InvestorProfile key={data.investor.id} data={data} />}
  </OverviewRead>
}
function InvestorProfile({ data: d }: { data: InvestorOverview }) {
  const { investor: p, summary: s } = d
  return <>
    <OverviewHero value={p} access={d.account?.accessState} kind="investidor" />
    <OverviewTabs sections={[
      { id: 'overview', label: 'Visão geral', content: <div className={shared.panelGrid}>
        <OverviewCard title="Informações principais" note="Identidade Core, sem dados bancários ou documentos sem máscara."><DetailList rows={[
          { label: 'Documento', value: p.documentMasked ?? 'Não disponível' },
          { label: 'Validação do cadastro', value: overviewStatus(p.status) },
          { label: 'Tipo de investidor', value: investorTypeLabel(d.personalData?.investorType ?? null) ?? 'Não informado' },
          { label: 'Dados pessoais preenchidos', value: p.personalInformationFilled === null ? 'Não informado' : p.personalInformationFilled ? 'Sim' : 'Não' },
          { label: 'Criado em', value: overviewDate(p.createdAt) },
        ]} /></OverviewCard><OverviewAccount value={d.account} />
      </div> },
      { id: 'relation', label: 'Investimentos e pagamentos', content: <>
        <OverviewCard title="Resumo financeiro" note="Totais da consulta completa, não calculados pelas prévias abaixo."><DetailList rows={[
          { label: 'Investimentos (todos os estados)', value: s?.investmentsCount ?? 'Não disponível' },
          { label: 'Valor de investimentos pagos ou em devolução/devolvidos', value: money(s?.investedAmountCents ?? null) },
          { label: 'Cobranças PIX de investimento', value: s?.paymentsCount ?? 'Não disponível' },
        ]} /><InfoNote>O valor considera paid, processing_refund e refunded na origem. Não representa posição atual, patrimônio ou saldo do investidor.</InfoNote></OverviewCard>
        <div className={shared.panelGrid}>
          <OverviewCard title="Investimentos recentes" note="Prévia de até 10 registros, não o histórico completo.">{d.investments.length ? <DetailList rows={d.investments.map(r => ({ label: `Investimento #${r.id}`, value: <><a href={investmentHref(r.id)} className={shared.inlineLink}>Abrir investimento</a> · {overviewStatus(r.status)} · {money(r.amountCents)}<p>{r.opportunityName ?? 'Oportunidade não informada'} · {overviewDate(r.createdAt)}</p></> }))} /> : <p>Nenhum investimento retornado nesta prévia.</p>}</OverviewCard>
          <OverviewCard title="Pagamentos recentes" note="Prévia de até 10 cobranças, não recebimentos pessoais.">{d.payments.length ? <DetailList rows={d.payments.map(r => ({ label: `Pagamento #${r.id}`, value: <><a href={paymentHref(r.id)} className={shared.inlineLink}>Abrir pagamento</a> · {overviewStatus(r.status)} · {money(r.amountCents)}<p>{overviewDate(r.paymentAt)}</p></> }))} /> : <p>Nenhum pagamento retornado nesta prévia.</p>}</OverviewCard>
        </div>
      </> },
      { id: 'kyc', label: 'Compliance / KYC', content: <OverviewCard title="Resumo KYC da visão 360°" note="Validação cadastral, resumo KYC e caso Compliance têm semânticas independentes.">
        <DetailList rows={[
          { label: 'Validação do cadastro', value: overviewStatus(p.status) },
          { label: 'Resumo KYC (overview)', value: overviewStatus(d.kyc?.status) },
          { label: 'Bureau', value: overviewStatus(d.kyc?.bureau?.status) },
          { label: 'Face Match', value: overviewStatus(d.kyc?.faceMatch?.status) },
          { label: 'Face Match processado em', value: overviewDate(d.kyc?.faceMatch?.processedAt ?? null) },
        ]} />
        {d.kyc?.faceMatch?.id ? <a className={shared.inlineLink} href={`#/compliance/kyc/${d.kyc.faceMatch.id}`}>Consultar caso Face Match #{d.kyc.faceMatch.id}</a> : <p>Nenhum vínculo autoritativo a caso Face Match nesta leitura.</p>}
        <InfoNote>O resumo do overview não substitui o estado composto do caso Compliance. Ausência de caso não significa aprovação nem rejeição. Nenhuma decisão de KYC pode ser executada aqui.</InfoNote>
      </OverviewCard> },
      { id: 'wallet', label: 'Wallet do Whitelabel', content: <OverviewCard title="Ledger do Whitelabel" note="Não é uma conta pessoal nem o saldo do investidor.">
        {d.wallet ? <><DetailList rows={[
          { label: 'Whitelabel proprietário', value: `#${d.wallet.whitelabelId}` },
          { label: 'Saldo autoritativo do Whitelabel (BRL)', value: money(d.wallet.balanceCents) },
          { label: 'Data do saldo', value: overviewDate(d.wallet.updatedAt) },
        ]} /><a href={walletHref(d.wallet.whitelabelId)} className={shared.inlineLink}>Consultar Wallet do Whitelabel</a>
          <h4>Movimentos recentes do Whitelabel (até 5)</h4>{d.wallet.movements.length ? <DetailList rows={d.wallet.movements.map((r, index) => ({ label: `${index + 1}. ${r.kind === 'in' ? 'Entrada' : 'Saída'}`, value: <>{money(r.amountCents)} · {overviewDate(r.date)}</> }))} /> : <p>Nenhum movimento retornado.</p>}</> : <p>Ledger não disponível nesta leitura. Nenhum saldo pessoal é inferido.</p>}
      </OverviewCard> },
      { id: 'registration', label: 'Cadastro e Termos', content: <InvestorRegistration id={p.id} whitelabelId={p.whitelabelId} /> },
    ]} />
  </>
}
// Basic detail adds authoritative Terms acceptance, absent from overview. Loaded on demand only.
function InvestorRegistration({ id, whitelabelId }: { id: string; whitelabelId: string }) {
  const session = useSyncExternalStore(subscribeSession, getSessionVersion, () => 0)
  const detail = useRemote(`investor-registration:${session}:${id}`, signal => getInvestor(id, signal))
  const error = detail.state.status === 'error' ? describeApiError(detail.state.error, 'o cadastro') : null
  if (error) return <OverviewCard title={error.title}><p role="alert">{error.description}</p>{error.retryable ? <OutlineButton onClick={detail.reload}>Tentar novamente</OutlineButton> : null}</OverviewCard>
  if (detail.state.status !== 'success') return <OverviewCard title="Cadastro e Termos"><p role="status">Carregando cadastro…</p></OverviewCard>
  const p = detail.state.data
  if (p.id !== id || p.whitelabelId !== whitelabelId) return <OverviewCard title="Cadastro indisponível"><p role="alert">Relacionamento de identidade inconsistente.</p></OverviewCard>
  return <OverviewCard title="Cadastro e Termos" note="Leitura adicional do cadastro, independente do resumo KYC."><DetailList rows={[
    { label: 'Validação do cadastro', value: validationMeta(p.businessState)?.label ?? 'Não informado' },
    { label: 'Termos aceitos em', value: overviewDate(p.termsAcceptedAt) },
    { label: 'Revisão dos Termos', value: p.termsRevisionId ?? 'Não informado' },
  ]} /></OverviewCard>
}
