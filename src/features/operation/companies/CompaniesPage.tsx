import { useEffect, useMemo, type CSSProperties } from 'react'
import { Building2, CircleAlert, Eye, FilterX, Info, RotateCw, Search, SearchX, Unplug } from 'lucide-react'
import { replaceRouteKeepingScroll, useRestoreReplacedScroll } from '../../../app/routeQuery'
import { useUrlSearchDraft } from '../../../app/useUrlSearchDraft'
import { EmptyState } from '../../../components/ui/EmptyState'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import { describeApiError } from '../../../lib/apiErrors'
import fin from '../../finance-gateways/sections/FinanceSections.module.css'
import { EntrepreneurViewSwitch } from '../shared/EntrepreneurViews'
import { OperationShell, PageIntro } from '../shared/OperationUi'
import { WindowedPagination } from '../shared/WindowedPagination'
import shared from '../shared/Operation.module.css'
import states from '../shared/ReadStates.module.css'
import type { CompanyView } from './companyPresent'
import {
  COMPANY_PAGE_SIZE,
  COMPANY_SEARCH_MAX_LENGTH,
  companiesHref,
  companyHref,
  parseCompanyRoute,
  type CompanyRouteState,
} from './companyRoute'
import { NoData, OfficialStatus, PreviewNotice, ProvenanceNotice, RelationValue } from './CompanyParts'
import { useCompanyList, type CompanyListData } from './useCompanyData'
import styles from './Companies.module.css'

type CompaniesPageProps = {
  /** URL `?whitelabel=` — illustrative Whitelabel ref while the prototype source is active. */
  whitelabel?: string
  /** URL `?page=` / `?search=` (validated here). */
  page?: string
  search?: string
  /** URL `?previa=` — prototype-only state preview. */
  previa?: string
  /** Raw query string: identity of the URL-backed context (scroll restore). */
  routeKey?: string
}

/**
 * `#/operation/companies` — Empresas, a contextual page under Operação ›
 * Empreendedores (the sidebar keeps the stable `operation-entrepreneurs`
 * item; no menu id is added). COMPANIES FRONTEND V1 IS A PROTOTYPE: no
 * Company contract is integrated, every row comes from the isolated
 * illustrative source and nothing is requested. Read-only; no Company CRUD.
 * Company ≠ Entrepreneur: no Company is derived from Entrepreneur data.
 */
export function CompaniesPage(props: CompaniesPageProps) {
  return (
    <OperationShell section="entrepreneurs" title="Empresas" trail={['Empresas']}>
      <PageIntro
        text="Visão própria de Empresas: razão social, nome fantasia, CNPJ e referências de relacionamento."
        actions={<EntrepreneurViewSwitch current="companies" />}
      />
      <ProvenanceNotice />
      <CompanyList {...props} />
    </OperationShell>
  )
}

const SKELETON_ROWS = 6

function CompanyList({ whitelabel, page: pageParam, search: searchParam, previa, routeKey = '' }: CompaniesPageProps) {
  useRestoreReplacedScroll(routeKey)
  const { state: route, ignored } = useMemo(
    () => parseCompanyRoute({ whitelabel, page: pageParam, search: searchParam, previa }),
    [whitelabel, pageParam, searchParam, previa],
  )

  const list = useCompanyList({ page: route.page, perPage: COMPANY_PAGE_SIZE, search: route.search, whitelabel: route.whitelabel, preview: route.preview })
  const data = list.state.status === 'success' ? list.state.data : null
  const pageOutOfRange = data !== null && data.rows.length === 0 && data.total > 0
  const loading = list.state.status === 'loading' || pageOutOfRange
  const unavailable = list.state.status === 'unavailable'
  const listError = list.state.status === 'error' ? describeApiError(list.state.error, 'as empresas') : null
  const scopeMissing = data?.scopeMissing ?? false
  const scope = route.whitelabel ? list.whitelabelOptions.find((item) => item.ref === route.whitelabel) : undefined

  // Search: typed text is debounced into the URL (the future `?search=` of `GET /companies`).
  const search = useUrlSearchDraft({
    urlSearch: route.search,
    urlKey: routeKey,
    maxLength: COMPANY_SEARCH_MAX_LENGTH,
    commit: (next) => replaceRouteKeepingScroll(companiesHref({ whitelabel: route.whitelabel, preview: route.preview, search: next })),
  })

  // Scope / page changes carry the pending search, never the stale URL value.
  function navigate(next: Partial<CompanyRouteState>) {
    const pendingSearch = search.pendingSearch()
    replaceRouteKeepingScroll(
      companiesHref({ whitelabel: route.whitelabel, preview: route.preview, search: pendingSearch, ...next,
        page: pendingSearch !== route.search ? undefined : next.page }),
    )
  }

  // Clamp an out-of-range page to the last one reported by the source.
  useEffect(() => {
    if (!data) return
    const target = data.total === 0 ? 1 : Math.min(route.page, data.lastPage)
    if (target !== route.page) {
      replaceRouteKeepingScroll(companiesHref({ whitelabel: route.whitelabel, page: target, search: route.search, preview: route.preview }))
    }
  }, [data, route.page, route.search, route.whitelabel, route.preview])

  const filtersActive = route.search !== '' || search.draft.trim() !== '' || route.whitelabel !== undefined
  function clearFilters() {
    search.clear()
    replaceRouteKeepingScroll(companiesHref({ preview: route.preview }))
  }

  const listContext = companiesHref(route)
  const scopeLabel = scope?.label ?? 'Todos os Whitelabels'
  const showTable = !unavailable && !listError && !scopeMissing

  return (
    <section className={`${fin.card} ${shared.listCard}`} aria-labelledby="company-list-title" data-company-list>
      <h2 id="company-list-title" className="visually-hidden">
        Lista de empresas (dados ilustrativos)
      </h2>
      <div className={shared.filters} style={{ '--filter-count': 4 } as CSSProperties}>
        <label className={fin.search}>
          <Search size={16} strokeWidth={1.8} aria-hidden="true" />
          <span className="visually-hidden">Buscar empresas por razão social ou nome fantasia (busca local nos dados ilustrativos)</span>
          <input
            id="company-search"
            type="search"
            value={search.draft}
            maxLength={COMPANY_SEARCH_MAX_LENGTH}
            placeholder="Buscar empresas…"
            onChange={(event) => search.setDraft(event.target.value)}
          />
        </label>
        <div className={shared.filterSelects}>
          <label className={fin.filter}>
            <span className="visually-hidden">Whitelabel (referências ilustrativas do protótipo)</span>
            <select
              id="company-whitelabel"
              value={route.whitelabel ?? 'all'}
              onChange={(event) => navigate({ whitelabel: event.target.value === 'all' ? undefined : event.target.value })}
            >
              <option value="all">Todos os Whitelabels</option>
              {list.whitelabelOptions.map((item) => (
                <option key={item.ref} value={item.ref}>
                  {item.label}
                </option>
              ))}
              {route.whitelabel && !scope ? <option value={route.whitelabel}>Referência {route.whitelabel}</option> : null}
            </select>
          </label>
        </div>
        <OutlineButton className={shared.clearButton} onClick={clearFilters} disabled={!filtersActive}>
          <FilterX size={15} strokeWidth={1.8} aria-hidden="true" />
          Limpar filtros
        </OutlineButton>
      </div>

      {route.preview ? <PreviewNotice preview={route.preview} exitHref={companiesHref({ ...route, preview: undefined })} /> : null}
      {scope ? (
        <p className={states.scopeNote} data-scope-note>
          <Info size={14} strokeWidth={1.9} aria-hidden="true" />
          <span>
            Empresas ilustrativas de <strong>{scope.label}</strong> — referência do protótipo, sem vínculo com os Whitelabels do Control Plane.
          </span>
        </p>
      ) : null}
      {ignored.length ? (
        <p className={states.ignoredNote} role="status" data-ignored-params>
          <Info size={14} strokeWidth={1.9} aria-hidden="true" />
          Filtro da URL não reconhecido e ignorado: {ignored.join(', ')}.
        </p>
      ) : null}

      <div className={fin.tableArea}>
        {unavailable ? (
          <div className={states.feedback} data-company-state="unavailable">
            <EmptyState
              icon={Unplug}
              title="Contrato de Empresas indisponível"
              description="O Control Plane ainda não oferece a listagem de Empresas. Nenhuma empresa é exibida e nenhuma requisição foi feita."
            />
          </div>
        ) : listError ? (
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
        ) : scopeMissing ? (
          <div className={states.feedback} data-scope-missing>
            <EmptyState
              icon={SearchX}
              title="Whitelabel não encontrado"
              description={`Nenhum Whitelabel ilustrativo usa a referência “${route.whitelabel}”.`}
            />
            <OutlineButton onClick={clearFilters}>Ver todas as empresas</OutlineButton>
          </div>
        ) : (
          <table className={`${fin.table} ${shared.table} ${styles.table}`} aria-busy={loading || undefined}>
            <caption className="visually-hidden">
              Empresas ({scopeLabel}) — dados ilustrativos do protótipo, integração de Empresas pendente
              {data ? `, página ${data.page} de ${data.lastPage}` : ''}. Busca e filtro locais. Status oficial: aguardando integração.
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
                  Status oficial
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
                      <td className={styles.colName}>
                        <span className={`${states.skeleton} ${states.skeletonWide}`} />
                      </td>
                      {[styles.colTrade, styles.colTax, styles.colEntrepreneur, styles.colWl, styles.colStatus, shared.colActions].map((className) => (
                        <td key={className} className={className}>
                          <span className={states.skeleton} />
                        </td>
                      ))}
                    </tr>
                  ))
                : (data?.rows ?? []).map((row) => <CompanyRow key={row.id} row={row} listContext={listContext} />)}
            </tbody>
          </table>
        )}

        {showTable && data && !loading && data.rows.length === 0 ? (
          <div className={states.feedback} data-list-empty={route.search ? 'search' : 'list'}>
            {route.search ? (
              <>
                <EmptyState icon={SearchX} title="Nenhuma empresa encontrada" description="Nenhuma empresa ilustrativa corresponde a esta busca." />
                <OutlineButton
                  onClick={() => {
                    search.clear()
                    replaceRouteKeepingScroll(companiesHref({ whitelabel: route.whitelabel, preview: route.preview }))
                  }}
                >
                  Limpar busca
                </OutlineButton>
              </>
            ) : (
              <EmptyState
                icon={Building2}
                title={route.whitelabel ? 'Nenhuma empresa neste Whitelabel' : 'Nenhuma empresa'}
                description="Quando a integração estiver disponível, as empresas do Control Plane aparecerão aqui."
              />
            )}
          </div>
        ) : null}
      </div>

      {showTable ? (
        <div className={shared.footer}>
          <p className={shared.range} aria-live="polite">
            {data && !loading
              ? data.total === 0
                ? 'Nenhuma empresa'
                : `Mostrando ${rangeLabel(data)} de ${data.total} ${data.total === 1 ? 'empresa ilustrativa' : 'empresas ilustrativas'}`
              : 'Carregando empresas…'}
            <span className={states.pending}> · Busca e filtro locais do protótipo · Status oficial aguardando integração</span>
          </p>
          {data && data.lastPage > 1 ? (
            <WindowedPagination
              label="Paginação de empresas"
              current={route.page}
              last={data.lastPage}
              disabled={loading}
              onChange={(page) => navigate({ page })}
            />
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

function rangeLabel(data: CompanyListData) {
  const from = (data.page - 1) * data.perPage + 1
  const to = from + data.rows.length - 1
  return from === to ? String(from) : `${from}–${to}`
}

function CompanyRow({ row, listContext }: { row: CompanyView; listContext: string }) {
  const href = companyHref(row.id, listContext)
  return (
    <tr className={fin.row} data-company={row.id} data-provenance={row.provenance}>
      <td className={styles.colName}>
        <span className={shared.cellMain}>
          <span className={styles.nameIcon} aria-hidden="true">
            <Building2 size={16} strokeWidth={1.7} />
          </span>
          <span className={shared.cellText}>
            <a href={href} className={shared.rowLink}>
              {row.displayName}
            </a>
            <span className={shared.rowId}>
              {row.provenance === 'prototype' ? 'ID ilustrativo' : 'ID'} {row.id}
            </span>
            <span className={`${styles.meta} ${styles.metaTrade}`}>Nome fantasia: {row.tradeName ?? 'não informado'}</span>
            <span className={`${styles.meta} ${styles.metaTax}`}>CNPJ: {row.taxIdMasked ?? 'não informado'}</span>
            <span className={`${styles.meta} ${styles.metaEntrepreneur}`}>
              Empreendedor: {relationText(row.entrepreneur)}
            </span>
            <span className={`${styles.meta} ${styles.metaWl}`}>Whitelabel: {relationText(row.whitelabel)}</span>
            {row.officialStatus ? <span className={`${styles.meta} ${styles.metaStatus}`}>Status oficial: {row.officialStatus}</span> : null}
          </span>
        </span>
      </td>
      <td className={styles.colTrade}>{row.tradeName ?? <NoData />}</td>
      <td className={`${styles.colTax} ${styles.mono}`}>{row.taxIdMasked ?? <NoData />}</td>
      <td className={styles.colEntrepreneur}>
        <RelationValue relation={row.entrepreneur} kind="entrepreneur" />
      </td>
      <td className={styles.colWl}>
        <RelationValue relation={row.whitelabel} kind="whitelabel" />
      </td>
      <td className={styles.colStatus}>
        <OfficialStatus status={row.officialStatus} compact />
      </td>
      <td className={shared.colActions}>
        <a href={href} className={`${fin.iconButton} ${shared.actionLink}`} aria-label={`Abrir empresa ${row.displayName}`} data-open-company={row.id}>
          <Eye size={15} strokeWidth={1.8} aria-hidden="true" />
        </a>
      </td>
    </tr>
  )
}

function relationText(relation: CompanyView['entrepreneur']) {
  if (relation.kind === 'missing') return 'não informado'
  return relation.kind === 'illustrative' ? relation.label : `#${relation.id}`
}
