import { useEffect, useMemo, type CSSProperties } from 'react'
import { Building2, CircleAlert, Eye, FilterX, Info, RotateCw, Search, SearchX } from 'lucide-react'
import { replaceRouteKeepingScroll, useRestoreReplacedScroll } from '../../../app/routeQuery'
import { useUrlSearchDraft } from '../../../app/useUrlSearchDraft'
import { EmptyState } from '../../../components/ui/EmptyState'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import fin from '../../finance-gateways/sections/FinanceSections.module.css'
import type { WhitelabelRecord } from '../../whitelabels/whitelabelApi'
import { entrepreneurHref } from '../entrepreneurs/entrepreneurRoute'
import { EntrepreneurViewSwitch } from '../shared/EntrepreneurViews'
import { OperationShell, PageIntro } from '../shared/OperationUi'
import { operationReadErrorView } from '../shared/readErrors'
import { useWhitelabelOptions, useWhitelabelRecord } from '../shared/whitelabelContext'
import { WindowedPagination } from '../shared/WindowedPagination'
import shared from '../shared/Operation.module.css'
import states from '../shared/ReadStates.module.css'
import {
  COMPANY_SEARCH_MAX_LENGTH,
  COMPANY_SORT_KEYS,
  COMPANY_STATUSES,
  type CompanyQuery,
  type CompanyRecord,
  type CompanySortKey,
  type CompanyStatus,
  type SortOrder,
} from './companyApi'
import { ORDER_LABEL, SORT_LABEL, companyDisplayName, companyStatusMeta, formatCnpj, formatCount } from './companyPresent'
import { companiesHref, companyHref, parseCompanyRoute, type CompanyListProps, type CompanyRouteState } from './companyRoute'
import { CompanyStatusBadge, CompanyTenant, NoData } from './CompanyParts'
import { useCompanyList } from './useCompanyData'
import styles from './Companies.module.css'

/**
 * `#/operation/companies` — Empresas, a contextual page under Operação ›
 * Empreendedores (the sidebar keeps the stable `operation-entrepreneurs` item;
 * no menu id is added). READ-ONLY list from `GET /companies`: search,
 * Whitelabel, status, sorting and pagination are applied by the Control Plane
 * (URL-backed). No Company create, edit or delete. Company ≠ Entrepreneur:
 * the link is `company.entrepreneurId`; nothing is derived from Entrepreneur data.
 */
export function CompaniesPage(props: CompanyListProps) {
  return (
    <OperationShell section="entrepreneurs" title="Empresas" trail={['Empresas']}>
      <PageIntro
        text="Empresas dos empreendedores de todos os Whitelabels, com dados do Control Plane: razão social, nome fantasia, CNPJ, validação e vínculo com o empreendedor (no máximo uma empresa por empreendedor). Somente leitura."
        actions={<EntrepreneurViewSwitch current="companies" />}
      />
      <CompanyList {...props} />
    </OperationShell>
  )
}

const SKELETON_ROWS = 6

function CompanyList({ whitelabel, status, search: searchParam, page, sort, order, previa, routeKey = '' }: CompanyListProps) {
  useRestoreReplacedScroll(routeKey)
  const { state: route, ignored } = useMemo(
    () => parseCompanyRoute({ whitelabel, status, search: searchParam, page, sort, order, previa }),
    [whitelabel, status, searchParam, page, sort, order, previa],
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

  /* ---------- Companies (server-filtered) ---------- */
  const query: CompanyQuery = { page: route.page, search: route.search, whitelabelId: route.whitelabelId, status: route.status, sort: route.sort, order: route.order }
  const list = useCompanyList(query)
  const data = list.state.status === 'success' ? list.state.data : null
  const pageOutOfRange = data !== null && data.rows.length === 0 && data.total > 0
  const loading = list.state.status === 'loading' || list.state.status === 'idle' || pageOutOfRange
  const listError = list.state.status === 'error' ? operationReadErrorView(list.state.error, 'as empresas') : null

  const search = useUrlSearchDraft({
    urlSearch: route.search,
    urlKey: routeKey,
    maxLength: COMPANY_SEARCH_MAX_LENGTH,
    commit: (next) => replaceRouteKeepingScroll(companiesHref({ ...route, search: next, page: 1 })),
  })

  /** Any change other than the page returns to page 1; the pending search is carried, never the stale URL value. */
  function navigate(next: Partial<CompanyRouteState>) {
    const pendingSearch = search.pendingSearch()
    const resetPage = !('page' in next) || pendingSearch !== route.search
    replaceRouteKeepingScroll(companiesHref({ ...route, search: pendingSearch, ...next, page: resetPage ? 1 : next.page }))
  }

  // A page past the end answers an empty page with meta.page = requested: clamp once to the last page.
  useEffect(() => {
    if (!data) return
    const target = data.total === 0 ? 1 : Math.min(route.page, data.lastPage)
    if (target !== route.page) replaceRouteKeepingScroll(companiesHref({ ...route, page: target }))
  }, [data, route])

  const filtersActive = route.search !== '' || search.draft.trim() !== '' || Boolean(route.whitelabelId || route.status)
  function clearFilters() {
    search.clear()
    replaceRouteKeepingScroll(companiesHref({ sort: route.sort, order: route.order }))
  }

  const listContext = companiesHref(route)
  const scopeLabel = route.whitelabelId ? whitelabelName(route.whitelabelId) : 'Todos os Whitelabels'
  const registryHasScope = !route.whitelabelId || Boolean(scopeFromRegistry)
  const pagerData = data ?? list.lastData
  const columns = [styles.colName, styles.colTrade, styles.colTax, styles.colEntrepreneur, styles.colWl, styles.colStatus, shared.colActions]

  return (
    <section className={`${fin.card} ${shared.listCard}`} aria-labelledby="company-list-title" data-company-list>
      <h2 id="company-list-title" className="visually-hidden">
        Lista de empresas
      </h2>
      <div className={shared.filters} style={{ '--filter-count': 4 } as CSSProperties}>
        <label className={fin.search}>
          <Search size={16} strokeWidth={1.8} aria-hidden="true" />
          <span className="visually-hidden">Buscar empresas por razão social, nome fantasia ou CNPJ (busca feita pelo Control Plane)</span>
          <input
            id="company-search"
            type="search"
            value={search.draft}
            maxLength={COMPANY_SEARCH_MAX_LENGTH}
            placeholder="Buscar por razão social, nome fantasia ou CNPJ…"
            onChange={(event) => search.setDraft(event.target.value)}
          />
        </label>
        <div className={shared.filterSelects}>
          <label className={fin.filter}>
            <span className="visually-hidden">Filtrar por Whitelabel</span>
            <select
              id="company-whitelabel"
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
          <label className={fin.filter}>
            <span className="visually-hidden">Filtrar por status de validação</span>
            <select id="company-status" value={route.status ?? 'all'} onChange={(event) => navigate({ status: event.target.value === 'all' ? undefined : (event.target.value as CompanyStatus) })}>
              <option value="all">Todos os status</option>
              {COMPANY_STATUSES.map((key) => (
                <option key={key} value={key}>
                  {companyStatusMeta(key).label}
                </option>
              ))}
            </select>
          </label>
          <label className={fin.filter}>
            <span className="visually-hidden">Ordenar empresas</span>
            <select
              id="company-sort"
              value={`${route.sort}:${route.order}`}
              onChange={(event) => {
                const [sortKey, sortOrder] = event.target.value.split(':') as [CompanySortKey, SortOrder]
                navigate({ sort: sortKey, order: sortOrder })
              }}
            >
              {COMPANY_SORT_KEYS.flatMap((key) =>
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
            Empresas de <strong>{scope.name}</strong> (ID {scope.id}), filtradas pelo Control Plane.{' '}
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
              Empresas ({scopeLabel}), dados do Control Plane{data ? `, página ${data.page} de ${data.lastPage}` : ''}. Ordenação: {SORT_LABEL[route.sort]} (
              {ORDER_LABEL[route.sort][route.order]}).
            </caption>
            <thead>
              <tr>
                <th scope="col" className={styles.colName}>
                  Razão social
                </th>
                <th scope="col" className={styles.colTrade}>
                  Nome fantasia
                </th>
                <th scope="col" className={styles.colTax}>
                  CNPJ
                </th>
                <th scope="col" className={styles.colEntrepreneur}>
                  Empreendedor
                </th>
                <th scope="col" className={styles.colWl}>
                  Whitelabel
                </th>
                <th scope="col" className={styles.colStatus}>
                  Validação
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
                : data?.rows.map((row) => <CompanyRow key={row.id} row={row} tenant={whitelabelName(row.whitelabelId)} href={companyHref(row.id, listContext)} />)}
            </tbody>
          </table>
        )}

        {!listError && data && !loading && data.rows.length === 0 ? (
          <div className={states.feedback} data-list-empty={filtersActive ? 'filtered' : 'list'}>
            {filtersActive ? (
              <>
                <EmptyState icon={SearchX} title="Nenhuma empresa encontrada" description="O Control Plane não encontrou empresas para estes filtros." />
                <OutlineButton onClick={clearFilters}>Limpar filtros</OutlineButton>
              </>
            ) : (
              <EmptyState icon={Building2} title="Nenhuma empresa cadastrada" description="O Control Plane não retornou empresas." />
            )}
          </div>
        ) : null}
      </div>

      {listError ? null : (
        <div className={shared.footer}>
          <p className={shared.range} aria-live="polite">
            {data && !loading ? rangeText(data) : 'Carregando empresas…'}
            <span className={states.pending}> · Dados do Control Plane</span>
          </p>
          {pagerData && pagerData.lastPage > 1 ? (
            <WindowedPagination label="Paginação de empresas" current={route.page} last={pagerData.lastPage} disabled={loading} onChange={(next) => navigate({ page: next })} />
          ) : null}
        </div>
      )}
    </section>
  )
}

function rangeText(data: { rows: unknown[]; page: number; perPage: number; total: number }) {
  if (data.total === 0) return 'Nenhuma empresa'
  const from = (data.page - 1) * data.perPage + 1
  const to = from + data.rows.length - 1
  const span = from === to ? formatCount(from) : `${formatCount(from)}–${formatCount(to)}`
  return `Mostrando ${span} de ${formatCount(data.total)} ${data.total === 1 ? 'empresa' : 'empresas'}`
}

function CompanyRow({ row, tenant, href }: { row: CompanyRecord; tenant: string; href: string }) {
  const name = companyDisplayName(row)
  const cnpj = formatCnpj(row.cnpj)
  return (
    <tr className={fin.row} data-company={row.id}>
      <td className={styles.colName}>
        <span className={shared.cellMain}>
          <span className={styles.nameIcon} aria-hidden="true">
            <Building2 size={16} strokeWidth={1.7} />
          </span>
          <span className={shared.cellText}>
            <a href={href} className={shared.rowLink}>
              {name}
            </a>
            <span className={shared.rowId}>ID {row.id}</span>
            <span className={`${styles.meta} ${styles.metaTrade}`}>Nome fantasia: {row.tradeName ?? 'não informado'}</span>
            <span className={`${styles.meta} ${styles.metaTax}`}>CNPJ: {cnpj ?? 'não informado'}</span>
            <span className={`${styles.meta} ${styles.metaEntrepreneur}`}>
              <a href={entrepreneurHref(row.entrepreneurId)} className={shared.inlineLink}>
                Empreendedor #{row.entrepreneurId}
              </a>
            </span>
            <span className={`${styles.meta} ${styles.metaWl}`}>Whitelabel: {tenant}</span>
            <span className={`${styles.meta} ${styles.metaStatus}`}>Validação: {companyStatusMeta(row.status).label}</span>
          </span>
        </span>
      </td>
      <td className={styles.colTrade}>{row.tradeName ?? <NoData />}</td>
      <td className={`${styles.colTax} ${styles.mono}`}>{cnpj ?? <NoData />}</td>
      <td className={styles.colEntrepreneur}>
        <a href={entrepreneurHref(row.entrepreneurId)} className={shared.inlineLink} aria-label={`Abrir empreendedor ${row.entrepreneurId} em Operação › Empreendedores`}>
          Empreendedor #{row.entrepreneurId}
        </a>
      </td>
      <td className={styles.colWl}>
        <CompanyTenant whitelabelId={row.whitelabelId} name={tenant} />
      </td>
      <td className={styles.colStatus}>
        <CompanyStatusBadge status={row.status} />
      </td>
      <td className={shared.colActions}>
        <a href={href} className={`${fin.iconButton} ${shared.actionLink}`} aria-label={`Abrir empresa ${name}`} data-open-company={row.id}>
          <Eye size={15} strokeWidth={1.8} aria-hidden="true" />
        </a>
      </td>
    </tr>
  )
}
