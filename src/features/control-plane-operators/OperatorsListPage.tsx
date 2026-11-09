import { useEffect, useMemo } from 'react'
import { SearchX } from 'lucide-react'
import { replaceRouteKeepingScroll, useRestoreReplacedScroll } from '../../app/routeQuery'
import { useUrlSearchDraft } from '../../app/useUrlSearchDraft'
import { EmptyState } from '../../components/ui/EmptyState'
import { OutlineButton } from '../../components/ui/OutlineButton'
import { InfoNote, PageIntro } from '../operation/shared/OperationUi'
import { WindowedPagination } from '../operation/shared/WindowedPagination'
import shared from '../operation/shared/Operation.module.css'
import fin from '../finance-gateways/sections/FinanceSections.module.css'
import { OperatorFeedback, OperatorRoles, OperatorShell, OperatorStatus } from './OperatorUi'
import { operatorDateText } from './operatorPresent'
import { operatorListHref, parseOperatorRoute } from './operatorRoute'
import { useOperators } from './useOperators'
import type { OperatorQuery } from './operatorApi'
import styles from './Operators.module.css'

export function OperatorsListPage({ rawQuery }: { rawQuery: string }) {
  useRestoreReplacedScroll(rawQuery)
  const { query, valid } = useMemo(() => parseOperatorRoute(rawQuery), [rawQuery])
  const remote = useOperators(valid ? query : null)
  const data = remote.state.status === 'success' ? remote.state.data : null
  const search = useUrlSearchDraft({ urlSearch: query.search, urlKey: rawQuery, maxLength: 120, commit: value => {
    if (valid) replaceRouteKeepingScroll(operatorListHref({ ...query, search: value, page: 1 }))
  } })
  const navigate = (patch: Partial<OperatorQuery>) => replaceRouteKeepingScroll(operatorListHref({ ...query, search: search.pendingSearch(), page: 1, ...patch }))
  const clear = () => { search.clear(); replaceRouteKeepingScroll(operatorListHref()) }
  useEffect(() => {
    if (data && query.page > data.lastPage) replaceRouteKeepingScroll(operatorListHref({ ...query, page: data.lastPage }))
  }, [data, query])
  const context = operatorListHref(query)
  return <OperatorShell>
    <PageIntro text="Consulte os operadores administrativos da plataforma, seus perfis de acesso e o estado de suas contas." />
    <InfoNote>Somente leitura. Operadores do Control Plane e administradores de Whitelabel são identidades distintas. Perfis atribuídos não representam uma matriz de permissões. Datas em Brasília.</InfoNote>
    {!remote.allowed ? <OperatorFeedback denied /> : <>
      <section className={fin.card} aria-label="Consulta de operadores">
        <div className={styles.filters}>
          <label>Buscar por nome ou e-mail<input type="search" maxLength={120} value={search.draft} onChange={e => search.setDraft(e.target.value)} disabled={!valid} /></label>
          <label>Ordenar por criação<select value={query.order} disabled={!valid} onChange={e => navigate({ order: e.target.value as OperatorQuery['order'] })}><option value="desc">Mais recentes primeiro</option><option value="asc">Mais antigos primeiro</option></select></label>
          <OutlineButton onClick={clear} disabled={valid && !query.search && query.order === 'desc' && !search.draft}>Limpar consulta</OutlineButton>
        </div>
      </section>
      {!valid ? <section className={fin.card} role="alert" data-operator-state="invalid-query"><h2>Parâmetros inválidos ou não suportados</h2><p>Nenhuma consulta foi enviada. Limpe a consulta para continuar. São aceitos somente página, busca e ordem de criação.</p></section> : !data ? <OperatorFeedback error={remote.state.status === 'error' ? remote.state.error : undefined} retry={remote.reload} /> : <section className={fin.card} data-operator-state="loaded" aria-labelledby="operators-list-title">
        <h2 id="operators-list-title" className={fin.cardTitleSm}>Operadores</h2>
        <p role="status">{data.total.toLocaleString('pt-BR')} operadores na consulta · Página {data.page} de {data.lastPage}</p>
        {data.rows.length ? <><p className={styles.hint}>Role a tabela horizontalmente para ver todas as colunas. No teclado, foque a tabela e use as setas.</p>
          <div className={styles.scroll} tabIndex={0} role="region" aria-label="Operadores: tabela com rolagem horizontal"><table className={`${fin.table} ${styles.table}`}>
            <caption className="visually-hidden">Operadores do Control Plane, somente leitura. Ordem por criação {query.order === 'asc' ? 'crescente' : 'decrescente'}. Datas em America/Sao_Paulo.</caption>
            <thead><tr>{['Operador', 'Identificador', 'Status', 'Perfis de acesso', 'Último acesso', 'Criado em', 'Consultar'].map(label => <th scope="col" key={label} aria-sort={label === 'Criado em' ? query.order === 'asc' ? 'ascending' : 'descending' : undefined}>{label}</th>)}</tr></thead>
            <tbody>{data.rows.map(row => <tr key={row.id} data-operator-row><td><strong>{row.name}</strong><p className={styles.hint}>{row.emailMasked}</p></td><td><code>{row.id}</code></td><td><OperatorStatus value={row.status} /></td><td><OperatorRoles roles={row.roles} /></td><td>{operatorDateText(row.lastLoginAt)}</td><td>{operatorDateText(row.createdAt)}</td><td><a className={shared.inlineLink} href={`#/settings/operators/${row.id}?returnTo=${encodeURIComponent(context)}`} aria-label={`Consultar operador ${row.name}`}>Consultar</a></td></tr>)}</tbody>
          </table></div></> : <EmptyState icon={SearchX} title={query.search ? 'Nenhum operador encontrado' : 'Nenhum operador nesta página'} description={query.search ? 'O Control Plane não retornou operadores para esta busca.' : 'O Control Plane retornou uma lista vazia nesta página.'} />}
        <div className={styles.footer}><p>{data.rows.length} registros nesta página · Total autoritativo do Control Plane</p><WindowedPagination label="Paginação dos operadores" current={data.page} last={data.lastPage} disabled={false} onChange={page => navigate({ page })} /></div>
      </section>}
    </>}
  </OperatorShell>
}
