import { SearchX } from 'lucide-react'
import { EmptyState } from '../../components/ui/EmptyState'
import fin from '../finance-gateways/sections/FinanceSections.module.css'
import { KeyValueList } from '../finance-core/shared/FinanceCoreUi'
import { BackLink, InfoNote } from '../operation/shared/OperationUi'
import shared from '../operation/shared/Operation.module.css'
import { KycShell } from './KycUi'
import { KycReadFeedback, KycReadSection, KycReadStatus } from './KycReadUi'
import { kycReadDateText, kycReadTicketText } from './kycReadPresent'
import { isKycReadId, kycReadHistoryLabel } from './kycReadApi'
import { useKycReadDetail } from './useKycRead'
import styles from './KycRead.module.css'

const unavailable = <p className={styles.unavailable}>Dados não disponíveis neste caso. Ausência não significa aprovação.</p>
/** Face Match stays inside one read-only case. No local review, issue, decision or fake history store. */
export function KycDetailPage({ kycCaseId }: { kycCaseId: string }) {
  const query = useKycReadDetail(kycCaseId)
  const detail = query.state.status === 'success' ? query.state.data : null
  return <KycShell trail={[isKycReadId(kycCaseId) ? `Caso #${kycCaseId}` : 'Caso indisponível']}>
    <div><BackLink href="#/compliance/kyc" label="Voltar para KYC" /></div>
    {!isKycReadId(kycCaseId) ? <section className={fin.card} data-kyc-state="invalid"><EmptyState icon={SearchX} title="Caso KYC indisponível" description="Este endereço não contém um ID de caso válido do Control Plane. IDs de protótipo ou de participante não resolvem um caso automaticamente. Nenhuma consulta foi enviada." /></section> :
      !detail ? <KycReadFeedback error={query.state.status === 'error' ? query.state.error : undefined} retry={query.reload} /> : <>
        <section className={`${fin.card} ${styles.hero}`} data-kyc-state="loaded" aria-labelledby="kyc-case-title">
          <div><h2 id="kyc-case-title">Caso KYC #{detail.id}</h2><p>ID de caso baseado no registro Face Match. Não é o ID do investidor.</p></div><KycReadStatus value={detail.status} />
        </section>
        <InfoNote>Somente leitura. Status composto informado pelo Core; Face Match isoladamente aprovado não implica KYC concluído. Documentos, biometria, texto OCR e dados brutos de provedores não são exibidos. Revisar, aprovar, reprovar ou criar pendências não está disponível.</InfoNote>
        <div className={styles.grid}>
          <KycReadSection title="Participante e contexto">
            <KeyValueList rows={[
              { label: 'Participante', value: detail.investor?.fullName ?? 'Não informado' },
              { label: 'Tipo', value: detail.investor ? 'Investidor' : 'Não informado' },
              { label: 'Investidor', value: detail.investor ? <a className={shared.inlineLink} href={`#/operation/investors/${detail.investor.id}`}>Investidor #{detail.investor.id}</a> : 'Vínculo não informado' },
              { label: 'Whitelabel', value: detail.whitelabelId ? `Whitelabel #${detail.whitelabelId}` : 'Não informado' },
              { label: 'Documento mascarado', value: detail.investor?.documentMasked ?? 'Não disponível' },
            ]} />
          </KycReadSection>
          <KycReadSection title="Validação de dados pessoais / bureau">{detail.personalDataValidation || detail.bureau ? <KeyValueList rows={[
            { label: 'Validação pessoal', value: <KycReadStatus value={detail.personalDataValidation?.status ?? null} /> },
            { label: 'Bureau', value: <KycReadStatus value={detail.bureau?.status ?? null} /> },
            { label: 'Resultado registrado', value: <KycReadStatus value={detail.bureau?.result ?? null} /> },
            { label: 'Consultado em (Brasília)', value: kycReadDateText(detail.bureau?.consultedAt ?? null) },
            { label: 'Documento mascarado', value: detail.bureau?.documentMasked ?? 'Não disponível' },
          ]} /> : unavailable}</KycReadSection>
          <KycReadSection title="Documento — metadados">{detail.document ? <KeyValueList rows={[
            { label: 'Tipo', value: detail.document.type === 'identity' ? 'Identidade' : 'Não informado' },
            { label: 'Envio', value: <KycReadStatus value={detail.document.status} /> },
            { label: 'Validação registrada', value: <KycReadStatus value={detail.document.validation} /> },
            { label: 'Data registrada (Brasília)', value: kycReadDateText(detail.document.submittedAt) },
          ]} /> : unavailable}<p className={styles.unavailable}>Arquivos e imagens de documentos não são disponibilizados nesta consulta.</p></KycReadSection>
          <KycReadSection title="OCR — processamento">{detail.ocr ? <KeyValueList rows={[
            { label: 'Status', value: <KycReadStatus value={detail.ocr.status} /> },
            { label: 'Ticket', value: kycReadTicketText(detail.ocr.ticketPresent) },
          ]} /> : unavailable}<p className={styles.unavailable}>Presença de ticket não comprova comparação de campos nem aprovação. Texto extraído não é exibido.</p></KycReadSection>
          <KycReadSection title="Face Match">{detail.faceMatch ? <KeyValueList rows={[
            { label: 'Status', value: <KycReadStatus value={detail.faceMatch.status} /> },
            { label: 'Ticket', value: kycReadTicketText(detail.faceMatch.ticketPresent) },
            { label: 'Enviado em (Brasília)', value: kycReadDateText(detail.faceMatch.submittedAt) },
            { label: 'Processado em (Brasília)', value: kycReadDateText(detail.faceMatch.processedAt) },
          ]} /> : unavailable}<p className={styles.unavailable}>Sem imagem biométrica, valor do ticket ou pontuação de confiança.</p></KycReadSection>
          <KycReadSection title="Histórico registrado">{detail.history === null ? unavailable : detail.history.length === 0 ? <p className={styles.unavailable}>Nenhum evento retornado pelo Core.</p> : <ol className={styles.history}>{detail.history.map((event, index) => <li key={index}>
            <span>{kycReadHistoryLabel(event.event)}</span><KycReadStatus value={event.status} /><time dateTime={event.createdAt ?? undefined}>{kycReadDateText(event.createdAt)}</time>
          </li>)}</ol>}<p className={styles.unavailable}>Resumo do Core, não uma trilha completa de decisões. Nenhuma atividade local é acrescentada. Auditoria de governança permanece independente.</p></KycReadSection>
        </div>
      </>}
  </KycShell>
}
