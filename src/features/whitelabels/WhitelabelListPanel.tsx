import type { CSSProperties, MouseEvent } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Filter,
  Info,
  MoreHorizontal,
  Plus,
  RotateCw,
  SearchX,
  Building,
} from 'lucide-react'
import { EmptyState } from '../../components/ui/EmptyState'
import { FilterChips } from '../../components/ui/FilterChips'
import { OutlineButton } from '../../components/ui/OutlineButton'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { SearchField } from '../../components/ui/SearchField'
import { SelectField } from '../../components/ui/SelectField'
import { StatusPill } from '../../components/ui/StatusPill'
import { describeApiError } from '../../lib/apiErrors'
import { WhitelabelIdentity } from './visuals/WhitelabelIdentity'
import type { RemoteState } from './useWhitelabelData'
import {
  WHITELABEL_STATUS_META,
  formatWhitelabelDate,
  type WhitelabelListResult,
  type WhitelabelRecord,
  type WhitelabelStatusFilter,
} from './whitelabelApi'
import { SEARCH_MAX_LENGTH } from './whitelabelRoute'
import styles from './WhitelabelListPanel.module.css'

export type SortKey = 'name' | 'domain' | 'status' | 'updatedAt'
export type Sort = { key: SortKey; direction: 'ascending' | 'descending' } | null

type WhitelabelListPanelProps = {
  /** `GET /whitelabels` result for the current URL-backed page / search / status. */
  state: RemoteState<WhitelabelListResult>
  /** Last successful result (any query): keeps the pagination in place while reloading. */
  lastData: WhitelabelListResult | null
  /** Rows to show (Backend order, or locally sorted when the result is complete). */
  rows: WhitelabelRecord[]
  /** Local sorting is offered only when every result is on this single page. */
  sortable: boolean
  onRetry: () => void
  page: number
  onPageChange: (page: number) => void
  query: string
  onQueryChange: (value: string) => void
  status: WhitelabelStatusFilter
  onStatusChange: (value: WhitelabelStatusFilter) => void
  onClearFilters: () => void
  ignored: string[]
  sort: Sort
  onSortChange: (value: Sort) => void
  activeId?: string
  onActivate: (id: string) => void
  /** Row "…": shows that Whitelabel's detail and moves focus to its actions (no destructive control in rows). */
  onOpenActions: (id: string) => void
  /** "Novo Whitelabel": opens the review-only create flow. */
  onCreate: () => void
  accentColor: string
}

const CHIPS: { value: WhitelabelStatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Ativos' },
  { value: 'inactive', label: 'Inativos' },
]

const COLUMNS: { key: SortKey | null; label: string; className: string }[] = [
  { key: 'name', label: 'Nome', className: 'colName' },
  { key: 'domain', label: 'Domínio', className: 'colDomain' },
  { key: 'status', label: 'Status', className: 'colStatus' },
  { key: null, label: 'Administradores', className: 'colAdmins' },
  { key: null, label: 'Aplicações', className: 'colApps' },
  { key: 'updatedAt', label: 'Atualizado em', className: 'colUpdated' },
]

const SKELETON_ROWS = 5

/**
 * Main list backed by `GET /whitelabels`: server-side search and status
 * filter, server pagination (Backend `meta`), loading / error / empty states.
 */
export function WhitelabelListPanel({
  state,
  lastData,
  rows,
  sortable,
  onRetry,
  page,
  onPageChange,
  query,
  onQueryChange,
  status,
  onStatusChange,
  onClearFilters,
  ignored,
  sort,
  onSortChange,
  activeId,
  onActivate,
  onOpenActions,
  onCreate,
  accentColor,
}: WhitelabelListPanelProps) {
  function toggleSort(key: SortKey) {
    if (sort?.key !== key) onSortChange({ key, direction: 'ascending' })
    else onSortChange({ key, direction: sort.direction === 'ascending' ? 'descending' : 'ascending' })
  }

  // Mouse convenience: clicking anywhere on a row (outside its own controls) opens its details.
  function onRowClick(event: MouseEvent<HTMLTableRowElement>, id: string) {
    if ((event.target as HTMLElement).closest('button, input, a')) return
    onActivate(id)
  }

  const filtersActive = query.trim() !== '' || status !== 'all'
  const data = state.status === 'success' ? state.data : null
  const loading = state.status === 'loading' || state.status === 'idle'
  const error = state.status === 'error' ? describeApiError(state.error, 'os Whitelabels') : null
  const meta = data ?? (loading ? lastData : null)
  const activeSort = sortable ? sort : null

  return (
    <section className={styles.panel} aria-labelledby="wl-list-title" style={{ '--wl-accent': accentColor } as CSSProperties}>
      <div className={styles.header}>
        <div className={styles.heading}>
          <span className={styles.accentBar} aria-hidden="true" />
          <h2 id="wl-list-title" className={styles.title}>
            Lista de Whitelabels
          </h2>
          <p className={styles.subtitle}>Gerencie plataformas, domínios, administradores e integrações.</p>
        </div>
        <PrimaryButton
          className={styles.newButton}
          onClick={onCreate}
          data-wl-create
        >
          <Plus size={18} strokeWidth={1.9} aria-hidden="true" />
          Novo Whitelabel
        </PrimaryButton>
      </div>

      <div className={styles.controls}>
        <SearchField
          id="wl-search"
          label="Buscar Whitelabels (busca feita pelo Control Plane)"
          placeholder="Buscar Whitelabels..."
          value={query}
          maxLength={SEARCH_MAX_LENGTH}
          onChange={(event) => onQueryChange(event.target.value)}
        />
        <SelectField
          id="wl-status"
          label="Filtrar por status"
          icon={Filter}
          value={status}
          onChange={(event) => onStatusChange(event.target.value as WhitelabelStatusFilter)}
        >
          <option value="all">Todos os status</option>
          <option value="active">Ativo</option>
          <option value="inactive">Inativo</option>
        </SelectField>
      </div>

      <FilterChips label="Filtro rápido de status" options={CHIPS} value={status} onChange={onStatusChange} />

      {ignored.length ? (
        <p className={styles.ignoredNote} role="status" data-ignored-params>
          <Info size={14} strokeWidth={1.9} aria-hidden="true" />
          Filtro da URL não reconhecido e ignorado: {ignored.join(', ')}.
        </p>
      ) : null}

      <div className={styles.tableArea}>
        {error ? (
          <div className={styles.feedback} role="alert" data-list-error>
            <EmptyState icon={CircleAlert} title={error.title} description={error.description} />
            {error.correlationId ? (
              <p className={styles.diagnostic}>
                Código de diagnóstico: <code>{error.correlationId}</code>
              </p>
            ) : null}
            {error.retryable ? (
              <OutlineButton onClick={onRetry}>
                <RotateCw size={14} strokeWidth={1.8} aria-hidden="true" />
                Tentar novamente
              </OutlineButton>
            ) : null}
          </div>
        ) : (
          <table className={styles.table} aria-busy={loading || undefined}>
            <caption className="visually-hidden">
              Whitelabels do Control Plane{data ? `, página ${data.page} de ${data.lastPage}` : ''}. Use o nome de cada linha para ver os
              detalhes.{' '}
              {sortable
                ? 'As colunas ordenáveis ordenam todos os resultados.'
                : 'Ordenação por coluna indisponível: os resultados ocupam mais de uma página.'}{' '}
              Aplicações: o Control Plane ainda não fornece este dado.
            </caption>
            <thead>
              <tr>
                {COLUMNS.map((column) => {
                  const sorted = column.key !== null && activeSort?.key === column.key
                  return (
                    <th
                      key={column.label}
                      scope="col"
                      className={styles[column.className]}
                      aria-sort={sorted ? activeSort.direction : undefined}
                    >
                      {column.key && sortable ? (
                        <button type="button" className={styles.sortButton} onClick={() => toggleSort(column.key!)}>
                          {column.label}
                          <SortIcon state={sorted ? activeSort.direction : null} />
                        </button>
                      ) : (
                        column.label
                      )}
                    </th>
                  )
                })}
                <th scope="col" className={styles.colActions}>
                  <span className="visually-hidden">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: SKELETON_ROWS }, (_, index) => (
                    <tr key={index} className={styles.skeletonRow} aria-hidden="true" data-skeleton-row>
                      {COLUMNS.map((column) => (
                        <td key={column.label} className={styles[column.className]}>
                          <span className={styles.skeleton} />
                        </td>
                      ))}
                      <td className={styles.colActions} />
                    </tr>
                  ))
                : rows.map((row) => {
                    const isActive = row.id === activeId
                    const statusMeta = WHITELABEL_STATUS_META[row.status]
                    return (
                      <tr
                        key={row.id}
                        className={styles.row}
                        data-active={isActive || undefined}
                        data-whitelabel-id={row.id}
                        onClick={(event) => onRowClick(event, row.id)}
                      >
                        <td className={styles.colName}>
                          <button
                            type="button"
                            className={styles.nameButton}
                            onClick={() => onActivate(row.id)}
                            aria-current={isActive ? 'true' : undefined}
                            aria-controls="whitelabel-detail"
                          >
                            <span className={styles.nameText}>
                              <WhitelabelIdentity name={row.name} selected={isActive} accentColor={accentColor} />
                              {row.domain ? <span className={styles.nameDomain}>{row.domain}</span> : null}
                              <span className="visually-hidden">, ver detalhes</span>
                            </span>
                          </button>
                          {/* Very narrow panels: the status moves under the name (its column is hidden). */}
                          <span className={styles.nameStatus}>
                            <StatusPill tone={statusMeta.tone} label={statusMeta.label} />
                          </span>
                        </td>
                        <td className={styles.colDomain}>
                          <NoData value={row.domain} />
                        </td>
                        <td className={styles.colStatus}>
                          <StatusPill tone={statusMeta.tone} label={statusMeta.label} />
                        </td>
                        <td className={styles.colAdmins}>
                          <NoData value={row.admins} />
                        </td>
                        <td className={styles.colApps}>
                          <NoData value={row.applications} />
                        </td>
                        <td className={styles.colUpdated}>
                          <NoData value={formatWhitelabelDate(row.updatedAt)} />
                        </td>
                        <td className={styles.colActions}>
                          <button
                            type="button"
                            className={styles.moreButton}
                            onClick={() => onOpenActions(row.id)}
                            aria-label={`Abrir ações de ${row.name} no painel de detalhes`}
                            aria-controls="whitelabel-detail"
                          >
                            <MoreHorizontal size={18} strokeWidth={1.9} aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
            </tbody>
          </table>
        )}

        {data && rows.length === 0 ? (
          <div className={styles.empty} data-list-empty>
            {filtersActive ? (
              <>
                <EmptyState
                  icon={SearchX}
                  title="Nenhum Whitelabel encontrado"
                  description="O Control Plane não encontrou resultados para a busca ou o filtro de status atuais."
                />
                <OutlineButton onClick={onClearFilters}>Limpar filtros</OutlineButton>
              </>
            ) : (
              <EmptyState
                icon={Building}
                title="Nenhum Whitelabel cadastrado"
                description="O Control Plane não retornou nenhum Whitelabel."
              />
            )}
          </div>
        ) : null}
      </div>

      {error ? null : (
        <div className={styles.footer}>
          <p className={styles.count} aria-live="polite">
            {data ? (
              data.total === 0 ? 'Nenhum resultado' : `Mostrando ${rangeLabel(data)} de ${data.total}`
            ) : (
              'Carregando Whitelabels…'
            )}
            <span className={styles.illustrative}>
              {' '}
              · Dados do Control Plane{data && !sortable ? ' · Ordenação indisponível com várias páginas' : ''}
            </span>
          </p>
          {meta && meta.lastPage > 1 ? (
            <Pagination current={page} last={meta.lastPage} disabled={!data} onChange={onPageChange} />
          ) : null}
        </div>
      )}
    </section>
  )
}

function rangeLabel(data: WhitelabelListResult) {
  const from = (data.page - 1) * data.perPage + 1
  const to = from + data.rows.length - 1
  return from === to ? `${from}` : `${from}–${to}`
}

/** 1 … (current − 1) current (current + 1) … last; every page when there are ≤ 7. */
function pageItems(current: number, last: number): (number | 'gap')[] {
  if (last <= 7) return Array.from({ length: last }, (_, index) => index + 1)
  const middle = [current - 1, current, current + 1].filter((value) => value > 1 && value < last)
  const items: (number | 'gap')[] = [1]
  if (middle[0] > 2) items.push('gap')
  items.push(...middle)
  if (middle[middle.length - 1] < last - 1) items.push('gap')
  items.push(last)
  return items
}

function Pagination({
  current,
  last,
  disabled,
  onChange,
}: {
  current: number
  last: number
  disabled: boolean
  onChange: (page: number) => void
}) {
  return (
    <nav className={styles.pagination} aria-label="Paginação">
      <button
        type="button"
        className={styles.pageButton}
        disabled={disabled || current <= 1}
        onClick={() => onChange(current - 1)}
        aria-label="Página anterior"
      >
        <ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />
      </button>
      {pageItems(Math.min(current, last), last).map((item, index) =>
        item === 'gap' ? (
          <span key={`gap-${index}`} className={styles.pageGap} aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            className={styles.pageButton}
            disabled={disabled}
            aria-current={item === current ? 'page' : undefined}
            aria-label={`Página ${item}`}
            onClick={() => (item === current ? undefined : onChange(item))}
          >
            {item}
          </button>
        ),
      )}
      <button
        type="button"
        className={styles.pageButton}
        disabled={disabled || current >= last}
        onClick={() => onChange(current + 1)}
        aria-label="Próxima página"
      >
        <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" />
      </button>
    </nav>
  )
}

function SortIcon({ state }: { state: 'ascending' | 'descending' | null }) {
  const Icon = state === 'ascending' ? ArrowUp : state === 'descending' ? ArrowDown : ArrowUpDown
  return <Icon className={styles.sortIcon} size={13} strokeWidth={1.9} aria-hidden="true" data-active={state ? true : undefined} />
}

/** "—" for values the Control Plane does not provide (announced as "sem dados"). */
function NoData({ value }: { value: number | string | null }) {
  if (value !== null) return <>{value}</>
  return (
    <>
      <span aria-hidden="true">—</span>
      <span className="visually-hidden">sem dados</span>
    </>
  )
}
