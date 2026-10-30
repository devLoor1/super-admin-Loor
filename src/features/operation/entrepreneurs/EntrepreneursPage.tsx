import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { CircleAlert, Eye, FilterX, Info, Mail, Play, RotateCw, ScanFace, Search, SearchX, Store, Target } from 'lucide-react'
import { replaceRouteKeepingScroll, useRestoreReplacedScroll } from '../../../app/routeQuery'
import { useUrlSearchDraft } from '../../../app/useUrlSearchDraft'
import { EmptyState } from '../../../components/ui/EmptyState'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import { StatusPill } from '../../../components/ui/StatusPill'
import { describeApiError, type ApiErrorView } from '../../../lib/apiErrors'
import { ApiError } from '../../../lib/api'
import { AccountAvatar, BusinessBadge } from '../../whitelabel-accounts/AccountBadges'
import fin from '../../finance-gateways/sections/FinanceSections.module.css'
import { formatWhitelabelDate, type WhitelabelRecord } from '../../whitelabels/whitelabelApi'
import { compareText, initials, type SortState } from '../shared/operationModel'
import { EntrepreneurViewSwitch } from '../shared/EntrepreneurViews'
import { OperationShell, PageIntro, SortButton, SummaryCards, type SummaryCard } from '../shared/OperationUi'
import { useWhitelabelOptions, useWhitelabelRecord } from '../shared/whitelabelContext'
import { WindowedPagination } from '../shared/WindowedPagination'
import shared from '../shared/Operation.module.css'
import styles from '../shared/Participants.module.css'
import states from '../shared/ReadStates.module.css'
import { accessMeta, formatCount, profileMeta, type EntrepreneurListResult, type EntrepreneurRecord } from './entrepreneurApi'
import {
  ENTREPRENEUR_SEARCH_MAX_LENGTH,
  entrepreneurHref,
  entrepreneursHref,
  parseEntrepreneurRoute,
  type EntrepreneurRouteState,
} from './entrepreneurRoute'
import { useEntrepreneurList } from './useEntrepreneurData'

type EntrepreneursPageProps = {
  /** URL `?whitelabel=` — Core Whitelabel id; selects the server-scoped read. */
  whitelabel?: string
  /** URL `?page=` / `?search=` (validated here). */
  page?: string
  search?: string
  /** Raw query string: identity of the URL-backed context (scroll restore). */
  routeKey?: string
}

/**
 * Empreendedores — operational supervision across Whitelabels, reading the
 * Control Plane: `GET /entrepreneurs` (all Whitelabels) or
 * `GET /whitelabels/:id/accounts?tipo=empreendedores` (one Whitelabel, scoped
 * by the server). Read-only. The contract has no Company, KYC, opportunity
 * or finance data: those show as pending, never with illustrative values.
 * This module integrates Entrepreneurs; it does not implement "Empresas"
 * (a separate prototype page, reached through the view switch, never joined here).
 */
export function EntrepreneursPage(props: EntrepreneursPageProps) {
  return (
    <OperationShell section="entrepreneurs" title="Empreendedores">
      <PageIntro
        text="Consulte perfis de empreendedores e seus vínculos por Whitelabel."
        readOnly
        actions={<EntrepreneurViewSwitch current="entrepreneurs" />}
      />
      <EntrepreneurList {...props} />
    </OperationShell>
  )
}

type SortKey = 'name' | 'createdAt'
const SKELETON_ROWS = 6

function sortRows(rows: EntrepreneurRecord[], sort: SortState<SortKey> | null) {
  if (!sort) return rows
  const direction = sort.direction === 'ascending' ? 1 : -1
  return [...rows].sort((a, b) => {
    if (sort.key === 'createdAt') {
      // Instants, not strings; missing dates always last.
      if (!a.createdAt || !b.createdAt) return a.createdAt === b.createdAt ? 0 : a.createdAt ? -1 : 1
      return direction * (Date.parse(a.createdAt) - Date.parse(b.createdAt))
    }
    return direction * compareText(a.fullName ?? '', b.fullName ?? '')
  })
}

function EntrepreneurList({ whitelabel, page: pageParam, search: searchParam, routeKey = '' }: EntrepreneursPageProps) {
  useRestoreReplacedScroll(routeKey)
  const { state: route, ignored } = useMemo(
    () => parseEntrepreneurRoute({ whitelabel, page: pageParam, search: searchParam }),
    [whitelabel, pageParam, searchParam],
  )

  /* ---------- Whitelabel registry (names + selector) and scope confirmation ---------- */
  const options = useWhitelabelOptions()
  const registry = options.state.status === 'success' ? options.state.data : null
  const registryComplete = registry !== null && registry.lastPage <= 1
  const scopeFromRegistry = route.whitelabelId ? registry?.rows.find((row) => row.id === route.whitelabelId) : undefined
  // The registry page did not settle the scope (failed, or > 100 Whitelabels): confirm it directly.
  const confirmScope = route.whitelabelId !== undefined && !scopeFromRegistry && (options.state.status === 'error' || (registry !== null && !registryComplete))
  const scopeRecord = useWhitelabelRecord(confirmScope ? route.whitelabelId! : null)
  const scope: WhitelabelRecord | undefined =
    scopeFromRegistry ?? (scopeRecord.state.status === 'success' ? scopeRecord.state.data : undefined)
  // The scoped read answers 200 + empty for an unknown Whitelabel, so its existence is confirmed separately.
  const scopeMissing =
    route.whitelabelId !== undefined &&
    ((registryComplete && !scopeFromRegistry) ||
      (scopeRecord.state.status === 'error' && describeApiError(scopeRecord.state.error, 'o Whitelabel').notFound))

  const whitelabelName = (id: string) =>
    registry?.rows.find((row) => row.id === id)?.name ?? (scope?.id === id ? scope.name : `Whitelabel #${id}`)

  /* ---------- Entrepreneurs (global or server-scoped) ---------- */
  const list = useEntrepreneurList({ whitelabelId: route.whitelabelId, page: route.page, search: route.search })
  const data = list.state.status === 'success' ? list.state.data : null
  const pageOutOfRange = data !== null && data.rows.length === 0 && data.total > 0
  const loading = list.state.status === 'loading' || list.state.status === 'idle' || pageOutOfRange
  const listError = list.state.status === 'error' ? listErrorView(list.state.error) : null

  // Local sorting only when the whole (filtered) result is on this page.
  const sortable = data !== null && data.lastPage <= 1 && data.rows.length >= data.total
  const [sort, setSort] = useState<SortState<SortKey> | null>(null)
  const rows = useMemo(() => (data ? (sortable ? sortRows(data.rows, sort) : data.rows) : []), [data, sortable, sort])

  // Search: typed text is debounced into the URL (and so into `?search=` on the API).
  const search = useUrlSearchDraft({
    urlSearch: route.search,
    urlKey: routeKey,
    maxLength: ENTREPRENEUR_SEARCH_MAX_LENGTH,
    commit: (next) => replaceRouteKeepingScroll(entrepreneursHref({ whitelabelId: route.whitelabelId, search: next })),
  })

  // Scope / page changes carry the pending search, never the stale URL value.
  function navigate(next: Partial<EntrepreneurRouteState>) {
    const pendingSearch = search.pendingSearch()
    replaceRouteKeepingScroll(entrepreneursHref({ whitelabelId: route.whitelabelId, search: pendingSearch, ...next,
      page: pendingSearch !== route.search ? undefined : next.page }))
  }

  // Clamp an out-of-range page to the last one reported by the Backend.
  useEffect(() => {
    if (!data) return
    const target = data.total === 0 ? 1 : Math.min(route.page, data.lastPage)
    if (target !== route.page) {
      replaceRouteKeepingScroll(entrepreneursHref({ whitelabelId: route.whitelabelId, page: target, search: route.search }))
    }
  }, [data, route.page, route.search, route.whitelabelId])

  const filtersActive = route.search !== '' || search.draft.trim() !== '' || route.whitelabelId !== undefined
  function clearFilters() {
    search.clear()
    replaceRouteKeepingScroll(entrepreneursHref())
  }

  function toggleSort(key: SortKey) {
    setSort((current) =>
      current?.key !== key
        ? { key, direction: key === 'createdAt' ? 'descending' : 'ascending' }
        : { key, direction: current.direction === 'ascending' ? 'descending' : 'ascending' },
    )
  }

  const scopeLabel = route.whitelabelId ? whitelabelName(route.whitelabelId) : 'Todos os Whitelabels'
  const cards: SummaryCard[] = [
    {
      label: 'Total de empreendedores',
      value: data ? formatCount(data.total) : null,
      detail: route.search ? `${scopeLabel} · resultado da busca` : scopeLabel,
      icon: Store,
      tone: 'blue',
    },
    { label: 'Ativos', value: null, detail: 'Sem contagem agregada no Control Plane', icon: Play, tone: 'teal' },
    { label: 'KYC não concluído', value: null, detail: 'Aguardando integração (Compliance › KYC)', icon: ScanFace, tone: 'amber' },
    { label: 'Com oportunidades', value: null, detail: 'Aguardando integração (Oportunidades)', icon: Target, tone: 'violet' },
  ]

  const listContext = entrepreneursHref(route)
  const registryHasScope = !route.whitelabelId || Boolean(scopeFromRegistry)
  const pagerData = data ?? list.lastData

  return (
    <>
      <SummaryCards
        title="Resumo de empreendedores"
        cards={cards}
        note="Total informado pelo Control Plane para o escopo atual. Os demais indicadores aguardam integração; nenhum valor ilustrativo é exibido."
      />

      <section className={`${fin.card} ${shared.listCard}`} aria-labelledby="participant-list-title" data-entrepreneur-list>
        <h2 id="participant-list-title" className={shared.listHeading}>
          Lista de empreendedores
        </h2>
        <div className={shared.filters} style={{ '--filter-count': 4 } as CSSProperties}>
          <label className={`${fin.search} ${fin.labeledSearch}`}>
            <span className={fin.controlLabel} aria-hidden="true">Busca</span>
            <Search size={16} strokeWidth={1.8} aria-hidden="true" />
            <span className="visually-hidden">Buscar empreendedores (busca feita pelo Control Plane)</span>
            <input
              id="entrepreneur-search"
              type="search"
              value={search.draft}
              maxLength={ENTREPRENEUR_SEARCH_MAX_LENGTH}
              placeholder="Buscar empreendedores…"
              onChange={(event) => search.setDraft(event.target.value)}
            />
          </label>
          <div className={shared.filterSelects}>
            <label className={`${fin.filter} ${fin.labeledFilter}`}>
              <span className={fin.controlLabel} aria-hidden="true">Whitelabel</span>
              <span className="visually-hidden">Whitelabel (consulta separada por Whitelabel no Control Plane)</span>
              <select
                id="entrepreneur-whitelabel"
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
                {!registryHasScope && route.whitelabelId ? (
                  <option value={route.whitelabelId}>{whitelabelName(route.whitelabelId)}</option>
                ) : null}
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
              Empreendedores de <strong>{scope.name}</strong> (ID {scope.id}), separados pelo Control Plane.{' '}
              <a href={`#/whitelabels?id=${encodeURIComponent(scope.id)}`} className={shared.inlineLink}>
                Ver Whitelabel
              </a>
            </span>
          </p>
        ) : null}
        {options.state.status === 'error' && !route.whitelabelId ? (
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
          {scopeMissing ? (
            <div className={states.feedback} data-scope-missing>
              <EmptyState
                icon={SearchX}
                title="Whitelabel não encontrado"
                description={`Nenhum Whitelabel com o ID ${route.whitelabelId} existe no Control Plane.`}
              />
              <OutlineButton onClick={clearFilters}>Ver todos os empreendedores</OutlineButton>
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
                <OutlineButton onClick={list.reload}>
                  <RotateCw size={14} strokeWidth={1.8} aria-hidden="true" />
                  Tentar novamente
                </OutlineButton>
              ) : null}
            </div>
          ) : (
            <table className={`${fin.table} ${shared.table} ${styles.table}`} aria-busy={loading || undefined}>
              <caption className="visually-hidden">
                Empreendedores ({scopeLabel}), dados do Control Plane{data ? `, página ${data.page} de ${data.lastPage}` : ''}.{' '}
                {sortable
                  ? 'As colunas ordenáveis ordenam todos os resultados.'
                  : 'Ordenação por coluna indisponível: os resultados ocupam mais de uma página.'}{' '}
                Situação do cadastro é a completude do perfil, não o KYC nem a empresa. Oportunidades: aguardando integração.
              </caption>
              <thead>
                <tr>
                  <th scope="col" className={styles.colName} aria-sort={sortable && sort?.key === 'name' ? sort.direction : undefined}>
                    {sortable ? (
                      <SortButton label="Empreendedor" sorted={sort?.key === 'name'} direction={sort?.direction ?? 'ascending'} onClick={() => toggleSort('name')} />
                    ) : (
                      'Empreendedor'
                    )}
                  </th>
                  <th scope="col" className={styles.colEmail}>
                    E-mail
                  </th>
                  <th scope="col" className={styles.colWl}>
                    Whitelabel
                  </th>
                  <th scope="col" className={styles.colStatus}>
                    Status da conta
                  </th>
                  <th scope="col" className={`${styles.colKyc} ${states.statusHeading}`}>
                    Situação do cadastro
                  </th>
                  <th scope="col" className={styles.colRelation}>
                    Oportunidades
                  </th>
                  <th
                    scope="col"
                    className={styles.colActivity}
                    aria-sort={sortable && sort?.key === 'createdAt' ? sort.direction : undefined}
                  >
                    {sortable ? (
                      <SortButton label="Cadastro" sorted={sort?.key === 'createdAt'} direction={sort?.direction ?? 'descending'} onClick={() => toggleSort('createdAt')} />
                    ) : (
                      'Cadastro'
                    )}
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
                        {[styles.colEmail, styles.colWl, styles.colStatus, styles.colKyc, styles.colRelation, styles.colActivity, shared.colActions].map(
                          (className) => (
                            <td key={className} className={className}>
                              <span className={states.skeleton} />
                            </td>
                          ),
                        )}
                      </tr>
                    ))
                  : rows.map((row) => (
                      <EntrepreneurRow key={row.id} row={row} whitelabelName={whitelabelName(row.whitelabelId)} listContext={listContext} />
                    ))}
              </tbody>
            </table>
          )}

          {!scopeMissing && !listError && data && !loading && rows.length === 0 ? (
            <div className={states.feedback} data-list-empty>
              {route.search ? (
                <>
                  <EmptyState
                    icon={SearchX}
                    title="Nenhum empreendedor encontrado"
                    description="O Control Plane não encontrou empreendedores para esta busca."
                  />
                  <OutlineButton
                    onClick={() => {
                      search.clear()
                      replaceRouteKeepingScroll(entrepreneursHref({ whitelabelId: route.whitelabelId }))
                    }}
                  >
                    Limpar busca
                  </OutlineButton>
                </>
              ) : (
                <EmptyState
                  icon={Store}
                  title={route.whitelabelId ? 'Nenhum empreendedor neste Whitelabel' : 'Nenhum empreendedor cadastrado'}
                  description="O Control Plane não retornou empreendedores para este escopo."
                />
              )}
            </div>
          ) : null}
        </div>

        {scopeMissing || listError ? null : (
          <div className={shared.footer}>
            <p className={shared.range} aria-live="polite">
              {data && !loading
                ? data.total === 0
                  ? 'Nenhum empreendedor'
                  : `Mostrando ${rangeLabel(data)} de ${formatCount(data.total)} ${data.total === 1 ? 'empreendedor' : 'empreendedores'}`
                : 'Carregando empreendedores…'}
              <span className={states.pending}>
                {' '}
                · Dados do Control Plane{data && !sortable ? ' · Ordenação indisponível com várias páginas' : ''}
              </span>
            </p>
            {pagerData && pagerData.lastPage > 1 ? (
              <WindowedPagination
                label="Paginação de empreendedores"
                current={route.page}
                last={pagerData.lastPage}
                disabled={loading}
                onChange={(page) => navigate({ page })}
              />
            ) : null}
          </div>
        )}
      </section>
    </>
  )
}

function listErrorView(error: unknown): ApiErrorView {
  const view = describeApiError(error, 'os empreendedores')
  if (error instanceof ApiError && error.code === 'SCOPE_MISMATCH') {
    return {
      ...view,
      title: 'Escopo do Whitelabel não confirmado',
      description: 'O Control Plane retornou empreendedores de outro Whitelabel; nada foi exibido para não misturar Whitelabels.',
    }
  }
  return view
}

function rangeLabel(data: EntrepreneurListResult) {
  const from = (data.page - 1) * data.perPage + 1
  const to = from + data.rows.length - 1
  return from === to ? formatCount(from) : `${formatCount(from)}–${formatCount(to)}`
}

/** "—" for values the Control Plane does not provide (announced as "sem dados"). */
function NoData({ label = 'sem dados' }: { label?: string }) {
  return (
    <>
      <span aria-hidden="true">—</span>
      <span className="visually-hidden">{label}</span>
    </>
  )
}

function EntrepreneurRow({ row, whitelabelName, listContext }: { row: EntrepreneurRecord; whitelabelName: string; listContext: string }) {
  const access = accessMeta(row.accessState)
  const profile = profileMeta(row.businessState)
  const created = formatWhitelabelDate(row.createdAt)
  const name = row.fullName ?? 'Nome não informado'
  const href = entrepreneurHref(row.id, listContext)
  return (
    <tr className={fin.row} data-entrepreneur={row.id}>
      <td className={styles.colName}>
        <span className={shared.cellMain}>
          <span className={styles.avatar}>
            <AccountAvatar initials={row.fullName ? initials(row.fullName) : '?'} />
          </span>
          <span className={shared.cellText}>
            <a href={href} className={shared.rowLink}>
              {name}
            </a>
            <span className={shared.rowId}>ID {row.id}</span>
            <span className={styles.metaEmail}>{row.email ?? 'E-mail não informado'}</span>
            <span className={styles.metaContext}>{whitelabelName} · Oportunidades: aguardando integração</span>
            <span className={styles.metaActivity}>Cadastro: {created ?? '—'}</span>
            <span className={styles.metaStates}>
              {access ? <StatusPill tone={access.tone} label={`Conta ${access.label.toLowerCase()}`} /> : null}
              {profile ? <BusinessBadge tone={profile.tone} label={profile.label} /> : null}
            </span>
          </span>
        </span>
      </td>
      <td className={styles.colEmail}>
        {row.email ? (
          <span className={styles.email}>
            <Mail size={14} strokeWidth={1.8} aria-hidden="true" />
            {row.email}
          </span>
        ) : (
          <NoData />
        )}
      </td>
      <td className={styles.colWl}>
        <span className={shared.wlCell}>
          <span className={shared.wlMark} data-tone="neutral" aria-hidden="true">
            {whitelabelName.charAt(0).toLocaleUpperCase('pt-BR')}
          </span>
          {whitelabelName}
        </span>
      </td>
      <td className={styles.colStatus}>{access ? <StatusPill tone={access.tone} label={access.label} /> : <NoData />}</td>
      <td className={styles.colKyc}>{profile ? <BusinessBadge tone={profile.tone} label={profile.label} /> : <NoData />}</td>
      <td className={styles.colRelation}>
        <span className={states.pending}>
          <NoData label="aguardando integração" />
        </span>
      </td>
      <td className={`${styles.colActivity} ${shared.dateCell}`}>{created ?? <NoData />}</td>
      <td className={shared.colActions}>
        <a href={href} className={`${fin.iconButton} ${shared.actionLink}`} aria-label={`Abrir perfil de ${name}`} data-open-profile={row.id}>
          <Eye size={15} strokeWidth={1.8} aria-hidden="true" />
        </a>
      </td>
    </tr>
  )
}
