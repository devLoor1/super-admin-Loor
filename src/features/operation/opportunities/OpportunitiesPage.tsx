import { useEffect, useMemo, type CSSProperties } from 'react'
import { opportunityActionAvailable } from '../../../app/presentationAvailability'
import { Archive, ChartColumn, CircleAlert, CircleCheck, Eye, FilterX, Hourglass, Info, RotateCw, Search, SearchX, Target } from 'lucide-react'
import { replaceRouteKeepingScroll, useRestoreReplacedScroll } from '../../../app/routeQuery'
import { useUrlSearchDraft } from '../../../app/useUrlSearchDraft'
import { EmptyState } from '../../../components/ui/EmptyState'
import { IconTile } from '../../../components/ui/IconTile'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import outline from '../../../components/ui/OutlineButton.module.css'
import { useSessionOperator } from '../../../lib/authSession'
import fin from '../../finance-gateways/sections/FinanceSections.module.css'
import type { WhitelabelRecord } from '../../whitelabels/whitelabelApi'
import { entrepreneurHref } from '../entrepreneurs/entrepreneurRoute'
import { OperationShell, PageIntro, SummaryCards, type SummaryCard } from '../shared/OperationUi'
import { operationReadErrorView } from '../shared/readErrors'
import { useWhitelabelOptions, useWhitelabelRecord } from '../shared/whitelabelContext'
import { WindowedPagination } from '../shared/WindowedPagination'
import shared from '../shared/Operation.module.css'
import states from '../shared/ReadStates.module.css'
import {
  OPPORTUNITY_MODALITIES,
  OPPORTUNITY_SEARCH_MAX_LENGTH,
  OPPORTUNITY_SORT_KEYS,
  OPPORTUNITY_STATUSES,
  type OpportunityModality,
  type OpportunityQuery,
  type OpportunityRecord,
  type OpportunitySortKey,
  type OpportunityStatus,
  type SortOrder,
} from './opportunityApi'
import { ORDER_LABEL, SORT_LABEL, formatCount, modalityLabel, opportunityDate, opportunityName, opportunityStatusMeta } from './opportunityPresent'
import {
  opportunitiesHref,
  opportunityHref,
  parseOpportunityListRoute,
  type OpportunityListProps,
  type OpportunityListRoute,
} from './opportunityRoute'
import { ModalityChip, OpportunityStatusPill, TenantName } from './OpportunityParts'
import { useOpportunityList } from './useOpportunityData'
import styles from './Opportunities.module.css'

/**
 * `#/operation/opportunities` — Oportunidades (Opportunities Read V1): global,
 * Read-only list from `GET /opportunities`. Search, Whitelabel, status and
 * modality filters, sorting and pagination are applied by the Control Plane
 * (URL-backed). Creation is a separate SUPER_ADMIN flow; the list never writes.
 */
export function OpportunitiesPage(props: OpportunityListProps) {
  const roles = useSessionOperator()?.roles ?? []
  const canCreate = opportunityActionAvailable('create') && roles.includes('SUPER_ADMIN')
  return (
    <OperationShell section="opportunities" title="Oportunidades">
      <PageIntro
        text="Consulte as oportunidades e acompanhe seus estados por Whitelabel."
        actions={canCreate && <a href="#/operation/opportunities/new" className={`${outline.button} ${shared.secondaryButton}`} data-opportunity-create>Nova oportunidade</a>}
      />
      <OpportunityList {...props} />
    </OperationShell>
  )
}

const SKELETON_ROWS = 6

function OpportunityList({ whitelabel, status, modalidade, search: searchParam, page, sort, order, empreendedor, routeKey = '' }: OpportunityListProps) {
  useRestoreReplacedScroll(routeKey)
  const { state: route, ignored, unsupported } = useMemo(
    () => parseOpportunityListRoute({ whitelabel, status, modalidade, search: searchParam, page, sort, order, empreendedor }),
    [whitelabel, status, modalidade, searchParam, page, sort, order, empreendedor],
  )

  /* ---------- Whitelabel registry (names + selector) and scope confirmation ---------- */
  const options = useWhitelabelOptions()
  const registry = options.state.status === 'success' ? options.state.data : null
  const registryComplete = registry !== null && registry.lastPage <= 1
  const scopeFromRegistry = route.whitelabelId ? registry?.rows.find((row) => row.id === route.whitelabelId) : undefined
  const confirmScope = route.whitelabelId !== undefined && !scopeFromRegistry && (options.state.status === 'error' || (registry !== null && !registryComplete))
  const scopeRecord = useWhitelabelRecord(confirmScope ? route.whitelabelId! : null)
  const scope: WhitelabelRecord | undefined = scopeFromRegistry ?? (scopeRecord.state.status === 'success' ? scopeRecord.state.data : undefined)
  const whitelabelName = (id: string) => registry?.rows.find((row) => row.id === id)?.name ?? (scope?.id === id ? scope.name : `Whitelabel #${id}`)

  /* ---------- Opportunities (server-filtered) ---------- */
  const query: OpportunityQuery = {
    page: route.page,
    search: route.search,
    whitelabelId: route.whitelabelId,
    status: route.status,
    modality: route.modality,
    sort: route.sort,
    order: route.order,
  }
  const list = useOpportunityList(query)
  const data = list.state.status === 'success' ? list.state.data : null
  // A page past the end answers an empty page with meta.page = requested: clamped below, never re-requested in a loop.
  const pageOutOfRange = data !== null && data.rows.length === 0 && data.total > 0
  const loading = list.state.status === 'loading' || list.state.status === 'idle' || pageOutOfRange
  const listError = list.state.status === 'error' ? operationReadErrorView(list.state.error, 'as oportunidades') : null

  /* Status counts: Backend totals (perPage=1 reads for the current scope); never a client count. */
  const scopeQuery = (statusFilter?: OpportunityStatus): OpportunityQuery => ({
    page: 1,
    perPage: 1,
    search: route.search,
    whitelabelId: route.whitelabelId,
    modality: route.modality,
    status: statusFilter,
    sort: 'createdAt',
    order: 'desc',
  })
  const totalCount = useOpportunityList(scopeQuery())
  const reviewCount = useOpportunityList(scopeQuery('review'))
  const activeCount = useOpportunityList(scopeQuery('active'))
  const finishedCount = useOpportunityList(scopeQuery('finished'))
  const countOf = (remote: ReturnType<typeof useOpportunityList>) => (remote.state.status === 'success' ? formatCount(remote.state.data.total) : null)

  const search = useUrlSearchDraft({
    urlSearch: route.search,
    urlKey: routeKey,
    maxLength: OPPORTUNITY_SEARCH_MAX_LENGTH,
    commit: (next) => replaceRouteKeepingScroll(opportunitiesHref({ ...route, search: next, page: 1 })),
  })

  /** Any change other than the page returns to page 1; the pending search is carried, never the stale URL value. */
  function navigate(next: Partial<OpportunityListRoute>) {
    const pendingSearch = search.pendingSearch()
    const resetPage = !('page' in next) || pendingSearch !== route.search
    replaceRouteKeepingScroll(opportunitiesHref({ ...route, search: pendingSearch, ...next, page: resetPage ? 1 : next.page }))
  }

  useEffect(() => {
    if (!data) return
    const target = data.total === 0 ? 1 : Math.min(route.page, data.lastPage)
    if (target !== route.page) replaceRouteKeepingScroll(opportunitiesHref({ ...route, page: target }))
  }, [data, route])

  const filtersActive = route.search !== '' || search.draft.trim() !== '' || Boolean(route.whitelabelId || route.status || route.modality)
  function clearFilters() {
    search.clear()
    replaceRouteKeepingScroll(opportunitiesHref({ sort: route.sort, order: route.order }))
  }

  const scopeLabel = route.whitelabelId ? whitelabelName(route.whitelabelId) : 'Todos os Whitelabels'
  const cards: SummaryCard[] = [
    { label: 'Total de oportunidades', value: countOf(totalCount), detail: route.search ? `${scopeLabel} · resultado da busca` : scopeLabel, icon: ChartColumn, tone: 'blue' },
    { label: 'Em análise', value: countOf(reviewCount), detail: 'Status: em análise', icon: Hourglass, tone: 'amber' },
    { label: 'Ativas', value: countOf(activeCount), detail: 'Status: ativa', icon: CircleCheck, tone: 'teal' },
    { label: 'Encerradas', value: countOf(finishedCount), detail: 'Status: encerrada', icon: Archive, tone: 'violet' },
  ]

  const listContext = opportunitiesHref(route)
  const registryHasScope = !route.whitelabelId || Boolean(scopeFromRegistry)
  const pagerData = data ?? list.lastData
  const columns = [styles.colName, styles.colWl, styles.colEnt, styles.colMod, styles.colSeg, styles.colRu, styles.colStatus, styles.colDue, styles.colUpdated, shared.colActions]

  return (
    <>
      <SummaryCards
        title="Resumo das oportunidades"
        cards={cards}
        note="Contagens informadas pelo Control Plane para o escopo atual (Whitelabel, modalidade e busca). Nenhum valor financeiro é exibido: o contrato de Oportunidades não traz valores."
      />

      <section className={`${fin.card} ${shared.listCard}`} aria-labelledby="opp-list-title" data-opportunity-list>
        <h2 id="opp-list-title" className={shared.listHeading}>
          Lista de oportunidades
        </h2>
        <div className={shared.filters} style={{ '--filter-count': 5 } as CSSProperties}>
          <label className={`${fin.search} ${fin.labeledSearch}`}>
            <span className={fin.controlLabel} aria-hidden="true">Busca</span>
            <Search size={16} strokeWidth={1.8} aria-hidden="true" />
            <span className="visually-hidden">Buscar por nome ou razão social da oportunidade (busca feita pelo Control Plane)</span>
            <input
              id="opportunity-search"
              type="search"
              value={search.draft}
              maxLength={OPPORTUNITY_SEARCH_MAX_LENGTH}
              placeholder="Buscar por nome ou razão social…"
              onChange={(event) => search.setDraft(event.target.value)}
            />
          </label>
          <div className={shared.filterSelects}>
            <label className={`${fin.filter} ${fin.labeledFilter}`}>
              <span className={fin.controlLabel} aria-hidden="true">Whitelabel</span>
              <span className="visually-hidden">Filtrar por Whitelabel</span>
              <select
                id="opportunity-whitelabel"
                value={route.whitelabelId ?? 'all'}
                disabled={options.state.status === 'loading' && !route.whitelabelId}
                onChange={(event) => navigate({ whitelabelId: event.target.value === 'all' ? undefined : event.target.value })}
              >
                <option value="all">Todos os Whitelabels</option>
                {registry?.rows.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
                {!registryHasScope && route.whitelabelId ? <option value={route.whitelabelId}>{whitelabelName(route.whitelabelId)}</option> : null}
              </select>
            </label>
            <label className={`${fin.filter} ${fin.labeledFilter}`}>
              <span className={fin.controlLabel} aria-hidden="true">Status</span>
              <span className="visually-hidden">Filtrar por status</span>
              <select id="opportunity-status" value={route.status ?? 'all'} onChange={(event) => navigate({ status: event.target.value === 'all' ? undefined : (event.target.value as OpportunityStatus) })}>
                <option value="all">Todos os status</option>
                {OPPORTUNITY_STATUSES.map((key) => (
                  <option key={key} value={key}>
                    {opportunityStatusMeta(key).label}
                  </option>
                ))}
              </select>
            </label>
            <label className={`${fin.filter} ${fin.labeledFilter}`}>
              <span className={fin.controlLabel} aria-hidden="true">Modalidade</span>
              <span className="visually-hidden">Filtrar por modalidade</span>
              <select
                id="opportunity-modality"
                value={route.modality ?? 'all'}
                onChange={(event) => navigate({ modality: event.target.value === 'all' ? undefined : (event.target.value as OpportunityModality) })}
              >
                <option value="all">Todas as modalidades</option>
                {OPPORTUNITY_MODALITIES.map((key) => (
                  <option key={key} value={key}>
                    {modalityLabel(key)}
                  </option>
                ))}
              </select>
            </label>
            <label className={`${fin.filter} ${fin.labeledFilter}`}>
              <span className={fin.controlLabel} aria-hidden="true">Ordenação</span>
              <span className="visually-hidden">Ordenar oportunidades</span>
              <select
                id="opportunity-sort"
                value={`${route.sort}:${route.order}`}
                onChange={(event) => {
                  const [sortKey, sortOrder] = event.target.value.split(':') as [OpportunitySortKey, SortOrder]
                  navigate({ sort: sortKey, order: sortOrder })
                }}
              >
                {OPPORTUNITY_SORT_KEYS.flatMap((key) =>
                  (['desc', 'asc'] as const).map((direction) => (
                    <option key={`${key}:${direction}`} value={`${key}:${direction}`}>
                      {SORT_LABEL[key]} ({ORDER_LABEL[key][direction]})
                    </option>
                  )),
                )}
              </select>
            </label>
          </div>
          <OutlineButton className={shared.clearButton} onClick={clearFilters} disabled={!filtersActive}>
            <FilterX size={15} strokeWidth={1.8} aria-hidden="true" />
            Limpar filtros
          </OutlineButton>
        </div>

        {route.whitelabelId && scope ? (
          <p className={states.scopeNote} data-scope-note>
            <Info size={14} strokeWidth={1.9} aria-hidden="true" />
            <span>
              Oportunidades de <strong>{scope.name}</strong> (ID {scope.id}), filtradas pelo Control Plane.{' '}
              <a href={`#/whitelabels?id=${encodeURIComponent(scope.id)}`} className={shared.inlineLink}>
                Ver Whitelabel
              </a>
            </span>
          </p>
        ) : null}
        {options.state.status === 'error' ? (
          <p className={states.ignoredNote} role="status">
            <Info size={14} strokeWidth={1.9} aria-hidden="true" />
            Não foi possível carregar a lista de Whitelabels; os nomes aparecem como “Whitelabel #ID”.
          </p>
        ) : null}
        {ignored.length ? (
          <p className={states.ignoredNote} role="status" data-ignored-params>
            <Info size={14} strokeWidth={1.9} aria-hidden="true" />
            Filtro da URL não reconhecido e ignorado: {ignored.join(', ')}.
          </p>
        ) : null}
        {unsupported.length ? (
          <p className={states.ignoredNote} role="status" data-unsupported-params>
            <Info size={14} strokeWidth={1.9} aria-hidden="true" />
            Filtro não oferecido pelo Control Plane e ignorado: {unsupported.join(', ')}. A lista abaixo não está filtrada por empreendedor.
          </p>
        ) : null}

        <div className={fin.tableArea}>
          {listError ? (
            <div className={states.feedback} role="alert" data-list-error>
              <EmptyState icon={CircleAlert} title={listError.title} description={listError.description} />
              {listError.correlationId ? (
                <p className={states.diagnostic}>
                  Código de diagnóstico: <code className={states.code}>{listError.correlationId}</code>
                </p>
              ) : null}
              {listError.retryable ? (
                <OutlineButton onClick={list.reload} data-retry>
                  <RotateCw size={14} strokeWidth={1.8} aria-hidden="true" />
                  Tentar novamente
                </OutlineButton>
              ) : null}
            </div>
          ) : (
            <table className={`${fin.table} ${shared.table} ${styles.table}`} aria-busy={loading || undefined}>
              <caption className="visually-hidden">
                Oportunidades ({scopeLabel}), dados do Control Plane{data ? `, página ${data.page} de ${data.lastPage}` : ''}. Ordenação:{' '}
                {SORT_LABEL[route.sort]} ({ORDER_LABEL[route.sort][route.order]}).
              </caption>
              <thead>
                <tr>
                  <th scope="col" className={styles.colName}>
                    Oportunidade
                  </th>
                  <th scope="col" className={styles.colWl}>
                    Whitelabel
                  </th>
                  <th scope="col" className={styles.colEnt}>
                    Empreendedor
                  </th>
                  <th scope="col" className={styles.colMod}>
                    Modalidade
                  </th>
                  <th scope="col" className={styles.colSeg}>
                    Segmento
                  </th>
                  <th scope="col" className={styles.colRu}>
                    Uso dos recursos
                  </th>
                  <th scope="col" className={styles.colStatus}>
                    Status
                  </th>
                  <th scope="col" className={styles.colDue}>
                    Prazo
                  </th>
                  <th scope="col" className={styles.colUpdated}>
                    Atualizada em
                  </th>
                  <th scope="col" className={shared.colActions}>
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: SKELETON_ROWS }, (_, index) => (
                      <tr key={index} className={states.skeletonRow} aria-hidden="true" data-skeleton-row>
                        {columns.map((className, cell) => (
                          <td key={`${className}-${cell}`} className={className}>
                            <span className={`${states.skeleton} ${cell === 0 ? states.skeletonWide : ''}`} />
                          </td>
                        ))}
                      </tr>
                    ))
                  : data?.rows.map((row) => (
                      <OpportunityRow key={row.id} row={row} tenant={whitelabelName(row.whitelabelId)} href={opportunityHref(row.id, listContext)} />
                    ))}
              </tbody>
            </table>
          )}

          {!listError && data && !loading && data.rows.length === 0 ? (
            <div className={states.feedback} data-list-empty={filtersActive ? 'filtered' : 'list'}>
              {filtersActive ? (
                <>
                  <EmptyState icon={SearchX} title="Nenhuma oportunidade encontrada" description="O Control Plane não encontrou oportunidades para estes filtros." />
                  <OutlineButton onClick={clearFilters}>Limpar filtros</OutlineButton>
                </>
              ) : (
                <EmptyState icon={Target} title="Nenhuma oportunidade registrada" description="O Control Plane não retornou oportunidades." />
              )}
            </div>
          ) : null}
        </div>

        {listError ? null : (
          <div className={shared.footer}>
            <p className={shared.range} aria-live="polite">
              {data && !loading ? rangeText(data) : 'Carregando oportunidades…'}
              <span className={states.pending}> · Dados do Control Plane</span>
            </p>
            {pagerData && pagerData.lastPage > 1 ? (
              <WindowedPagination label="Paginação de oportunidades" current={route.page} last={pagerData.lastPage} disabled={loading} onChange={(next) => navigate({ page: next })} />
            ) : null}
          </div>
        )}
      </section>
    </>
  )
}

function rangeText(data: { rows: unknown[]; page: number; perPage: number; total: number }) {
  if (data.total === 0) return 'Nenhuma oportunidade'
  const from = (data.page - 1) * data.perPage + 1
  const to = from + data.rows.length - 1
  const span = from === to ? formatCount(from) : `${formatCount(from)}–${formatCount(to)}`
  return `Mostrando ${span} de ${formatCount(data.total)} ${data.total === 1 ? 'oportunidade' : 'oportunidades'}`
}

function OpportunityRow({ row, tenant, href }: { row: OpportunityRecord; tenant: string; href: string }) {
  const name = opportunityName(row)
  const due = opportunityDate(row.dueAt)
  const updated = opportunityDate(row.updatedAt, true)
  return (
    <tr className={fin.row} data-opportunity={row.id}>
      <td className={styles.colName}>
        <span className={shared.cellMain}>
          <IconTile icon={Target} tone="violet" size="sm" className={styles.rowIcon} />
          <span className={shared.cellText}>
            <a href={href} className={shared.rowLink}>
              {name}
            </a>
            <span className={shared.rowId}>
              ID {row.id}
              {row.businessName ? ` · ${row.businessName}` : ''}
            </span>
            <span className={styles.metaParticipants}>
              {tenant} ·{' '}
              <a href={entrepreneurHref(row.entrepreneurId)} className={shared.inlineLink}>
                Empreendedor #{row.entrepreneurId}
              </a>
            </span>
            <span className={styles.metaClass}>
              Segmento: {row.segment?.name ?? '—'} · Uso dos recursos: {row.resourceUse?.name ?? row.resourceUse?.code ?? '—'}
            </span>
            <span className={styles.metaUpdated}>
              Prazo: {due ?? 'não informado'} · Atualizada em {updated ?? '—'}
            </span>
            <span className={styles.metaStatus}>
              <ModalityChip modality={row.modality} />
              <OpportunityStatusPill status={row.status} />
            </span>
          </span>
        </span>
      </td>
      <td className={styles.colWl}>
        <TenantName whitelabelId={row.whitelabelId} name={tenant} />
      </td>
      <td className={styles.colEnt}>
        <a href={entrepreneurHref(row.entrepreneurId)} className={shared.inlineLink} aria-label={`Abrir empreendedor ${row.entrepreneurId} em Operação › Empreendedores`}>
          Empreendedor #{row.entrepreneurId}
        </a>
      </td>
      <td className={styles.colMod}>
        <ModalityChip modality={row.modality} />
      </td>
      <td className={styles.colSeg}>{row.segment?.name ?? <span className={shared.muted}>—</span>}</td>
      <td className={styles.colRu}>{row.resourceUse ? row.resourceUse.name ?? row.resourceUse.code : <span className={shared.muted}>—</span>}</td>
      <td className={styles.colStatus}>
        <OpportunityStatusPill status={row.status} />
      </td>
      <td className={`${styles.colDue} ${shared.dateCell}`}>{due ?? <span className={shared.muted}>—</span>}</td>
      <td className={`${styles.colUpdated} ${shared.dateCell}`}>{updated ?? '—'}</td>
      <td className={shared.colActions}>
        <a href={href} className={`${fin.iconButton} ${shared.actionLink}`} aria-label={`Abrir oportunidade ${name}`} data-view-opportunity={row.id}>
          <Eye size={15} strokeWidth={1.8} aria-hidden="true" />
        </a>
      </td>
    </tr>
  )
}
