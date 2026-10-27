import { SearchX } from 'lucide-react'
import { EmptyState } from '../../components/ui/EmptyState'
import { OutlineButton } from '../../components/ui/OutlineButton'
import { replaceRouteKeepingScroll, useRestoreReplacedScroll } from '../../app/routeQuery'
import fin from '../finance-gateways/sections/FinanceSections.module.css'
import { InfoNote, PageIntro } from '../operation/shared/OperationUi'
import shared from '../operation/shared/Operation.module.css'
import { KycShell } from './KycUi'
import { KycReadFeedback, KycReadStatus } from './KycReadUi'
import { kycReadDateText } from './kycReadPresent'
import { useKycReadList } from './useKycRead'
import styles from './KycRead.module.css'

/** Authoritative FaceMatch-backed cases. No prototype filters, enrichment or per-page aggregate claims. */
export function KycListPage({ participant, whitelabel, status, routeKey }: { participant?: string; whitelabel?: string; status?: string; routeKey: string }) {
  useRestoreReplacedScroll(routeKey)
  const params = new URLSearchParams(routeKey.replace(/^\?/, ''))
  const rawPage = params.get('page')
  const page = rawPage && /^[1-9]\d{0,5}$/.test(rawPage) ? Number(rawPage) : 1
  const query = useKycReadList(page)
  const result = query.state.status === 'success' ? query.state.data : null
  const unsupported = Boolean(participant || whitelabel || status || [...params.keys()].some(key => key !== 'page'))
  const goPage = (next: number) => replaceRouteKeepingScroll(`#/compliance/kyc${next > 1 ? `?page=${next}` : ''}`)
  return <KycShell>
    <PageIntro text="Consulte casos KYC vinculados a Face Match de investidores." readOnly />
    {unsupported || rawPage !== null && page === 1 && rawPage !== '1' ? <p role="status" className={styles.unavailable}>Parâmetros não suportados foram ignorados. A consulta usa apenas paginação, sem filtro de participante, Whitelabel ou status.</p> : null}
    {!result ? <KycReadFeedback error={query.state.status === 'error' ? query.state.error : undefined} retry={query.reload} /> :
      <section className={`${fin.card} ${shared.listCard}`} aria-labelledby="kyc-list-title" data-kyc-state="loaded">
        <div className={styles.listHeading}><h2 id="kyc-list-title" className={fin.cardTitleSm}>Casos KYC</h2><p>{result.total.toLocaleString('pt-BR')} casos vinculados a Face Match</p></div>
        {result.rows.length ? <><p className={styles.scrollHint}>Role a tabela horizontalmente para ver todas as colunas. No teclado, foque a tabela e use as setas.</p><div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Casos KYC: tabela com rolagem horizontal">
          <table className={`${fin.table} ${styles.table}`}><caption className="visually-hidden">Casos vinculados a Face Match; IDs em ordem decrescente. Datas em Brasília.</caption>
            <thead><tr>{['Caso KYC', 'Investidor', 'Whitelabel', 'Status composto', 'Face Match', 'Atualizado em'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
            <tbody>{result.rows.map(row => <tr className={fin.row} key={row.id} data-kyc-case={row.id}>
              <td><a className={shared.rowLink} href={`#/compliance/kyc/${row.id}`}>Caso #{row.id}</a></td>
              <td>{row.investorName ?? 'Nome não informado'}<p className={shared.rowId}>{row.investorId ? `Investidor #${row.investorId}` : 'Vínculo não informado'}</p></td>
              <td>{row.whitelabelId ? `Whitelabel #${row.whitelabelId}` : 'Não informado'}</td>
              <td><KycReadStatus value={row.status} /></td><td><KycReadStatus value={row.faceMatchStatus} /></td>
              <td>{kycReadDateText(row.updatedAt)}</td>
            </tr>)}</tbody>
          </table>
        </div></> : <EmptyState icon={SearchX} title="Nenhum caso nesta página" description="O Control Plane não retornou casos vinculados a Face Match nesta página." />}
        <nav className={styles.pager} aria-label="Paginação dos casos KYC">
          <p role="status">Página {result.page} de {result.lastPage} · {result.rows.length} registros nesta página</p>
          <div className={styles.pagerActions}><OutlineButton disabled={page === 1} onClick={() => goPage(page - 1)}>Página anterior</OutlineButton><OutlineButton disabled={page >= result.lastPage} onClick={() => goPage(page + 1)}>Próxima página</OutlineButton></div>
        </nav>
      </section>}
    <InfoNote>Esta lista não representa todas as validações KYC da plataforma. Busca, filtros e totais por status não estão disponíveis nesta integração. Nenhuma decisão ou alteração de acesso é executada aqui.</InfoNote>
  </KycShell>
}
