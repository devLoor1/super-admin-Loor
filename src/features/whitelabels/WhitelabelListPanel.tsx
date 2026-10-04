import type { MouseEvent } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Filter, MoreHorizontal, Plus, SearchX } from 'lucide-react'
import { usePrototypeNotice } from '../../components/shell/prototypeNotice'
import { EmptyState } from '../../components/ui/EmptyState'
import { FilterChips } from '../../components/ui/FilterChips'
import { OutlineButton } from '../../components/ui/OutlineButton'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { SearchField } from '../../components/ui/SearchField'
import { SelectField } from '../../components/ui/SelectField'
import { StatusPill } from '../../components/ui/StatusPill'
import { EntityAvatar } from './EntityAvatar'
import { STATUS_META, type Whitelabel, type WhitelabelStatus } from './prototypeWhitelabels'
import styles from './WhitelabelListPanel.module.css'

export type StatusFilter = 'all' | WhitelabelStatus
export type SortKey = 'name' | 'domain' | 'status' | 'updatedAt'
type Sort = { key: SortKey; direction: 'ascending' | 'descending' } | null

type WhitelabelListPanelProps = {
  rows: Whitelabel[]
  total: number
  query: string
  onQueryChange: (value: string) => void
  status: StatusFilter
  onStatusChange: (value: StatusFilter) => void
  sort: Sort
  onSortChange: (value: Sort) => void
  activeId?: string
  onActivate: (id: string) => void
}

const CHIPS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Ativos' },
  { value: 'setup', label: 'Em configuração' },
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

/** Main list: search, status filters, sortable table, local selection and pagination footer. */
export function WhitelabelListPanel({
  rows,
  total,
  query,
  onQueryChange,
  status,
  onStatusChange,
  sort,
  onSortChange,
  activeId,
  onActivate,
}: WhitelabelListPanelProps) {
  const notify = usePrototypeNotice()
  function toggleSort(key: SortKey) {
    if (sort?.key !== key) onSortChange({ key, direction: 'ascending' })
    else onSortChange({ key, direction: sort.direction === 'ascending' ? 'descending' : 'ascending' })
  }

  // Mouse convenience: clicking anywhere on a row (outside its own controls) opens its details.
  function onRowClick(event: MouseEvent<HTMLTableRowElement>, id: string) {
    if ((event.target as HTMLElement).closest('button, input, a')) return
    onActivate(id)
  }

  const filtersActive = query !== '' || status !== 'all'

  return (
    <section className={styles.panel} aria-labelledby="wl-list-title">
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
          onClick={() => notify('Protótipo visual: a criação de Whitelabel ainda não está disponível.')}
        >
          <Plus size={18} strokeWidth={1.9} aria-hidden="true" />
          Novo Whitelabel
        </PrimaryButton>
      </div>

      <div className={styles.controls}>
        <SearchField
          id="wl-search"
          label="Buscar Whitelabels por nome, domínio ou slug"
          placeholder="Buscar por nome, domínio ou slug..."
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
        <SelectField
          id="wl-status"
          label="Filtrar por status"
          icon={Filter}
          value={status}
          onChange={(event) => onStatusChange(event.target.value as StatusFilter)}
        >
          <option value="all">Todos os status</option>
          <option value="active">Ativo</option>
          <option value="setup">Em configuração</option>
          <option value="draft">Rascunho</option>
          <option value="inactive">Inativo</option>
        </SelectField>
      </div>

      <FilterChips label="Filtro rápido de status" options={CHIPS} value={status} onChange={onStatusChange} />

      <div className={styles.tableArea}>
        <table className={styles.table}>
          <caption className="visually-hidden">
            Whitelabels (dados e status ilustrativos, não oficiais). Use o nome de cada linha para ver os detalhes. Aplicações é um conceito visual, não um módulo definido.
          </caption>
          <thead>
            <tr>
              {COLUMNS.map((column) => {
                const sorted = column.key !== null && sort?.key === column.key
                return (
                  <th
                    key={column.label}
                    scope="col"
                    className={styles[column.className]}
                    aria-sort={sorted ? sort.direction : undefined}
                  >
                    {column.key ? (
                      <button type="button" className={styles.sortButton} onClick={() => toggleSort(column.key!)}>
                        {column.label}
                        <SortIcon state={sorted ? sort.direction : null} />
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
            {rows.map((row) => {
              const isActive = row.id === activeId
              return (
                <tr
                  key={row.id}
                  className={styles.row}
                  data-active={isActive || undefined}
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
                      <EntityAvatar initial={row.initial} tone={row.avatarTone} />
                      <span className={styles.nameText}>
                        <span className={styles.name}>{row.name}</span>
                        <span className={styles.nameDomain}>{row.domain}</span>
                        <span className="visually-hidden">, ver detalhes</span>
                      </span>
                    </button>
                    {/* Very narrow panels: the status moves under the name (its column is hidden). */}
                    <span className={styles.nameStatus}>
                      <StatusPill tone={STATUS_META[row.status].tone} label={STATUS_META[row.status].label} />
                    </span>
                  </td>
                  <td className={styles.colDomain}>{row.domain}</td>
                  <td className={styles.colStatus}>
                    <StatusPill tone={STATUS_META[row.status].tone} label={STATUS_META[row.status].label} />
                  </td>
                  <td className={styles.colAdmins}>
                    <NoData value={row.admins} />
                  </td>
                  <td className={styles.colApps}>
                    <NoData value={row.applications} />
                  </td>
                  <td className={styles.colUpdated}>
                    <NoData value={row.updatedAt} />
                  </td>
                  <td className={styles.colActions}>
                    <button
                      type="button"
                      className={styles.moreButton}
                      onClick={() => notify(`Protótipo visual: as ações de ${row.name} ainda não estão disponíveis.`)}
                      aria-label={`Mais ações para ${row.name}`}
                    >
                      <MoreHorizontal size={18} strokeWidth={1.9} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {rows.length === 0 ? (
          <div className={styles.empty}>
            <EmptyState
              icon={SearchX}
              title="Nenhum Whitelabel encontrado"
              description="Ajuste a busca ou o filtro de status para ver outros resultados."
            />
            {filtersActive ? (
              <OutlineButton
                onClick={() => {
                  onQueryChange('')
                  onStatusChange('all')
                }}
              >
                Limpar filtros
              </OutlineButton>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className={styles.footer}>
        <p className={styles.count} aria-live="polite">
          Mostrando {rows.length} de {total} resultados
          <span className={styles.illustrative}> · Dados e status ilustrativos · Aplicações: conceito visual</span>
        </p>
        <nav className={styles.pagination} aria-label="Paginação">
          <button type="button" className={styles.pageButton} disabled aria-label="Página anterior">
            <ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />
          </button>
          <button type="button" className={styles.pageButton} aria-current="page" aria-label="Página 1">
            1
          </button>
          <button type="button" className={styles.pageButton} disabled aria-label="Próxima página">
            <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </nav>
      </div>
    </section>
  )
}

function SortIcon({ state }: { state: 'ascending' | 'descending' | null }) {
  const Icon = state === 'ascending' ? ArrowUp : state === 'descending' ? ArrowDown : ArrowUpDown
  return <Icon className={styles.sortIcon} size={13} strokeWidth={1.9} aria-hidden="true" data-active={state ? true : undefined} />
}

/** "—" placeholder for values no integration provides yet (announced as "sem dados"). */
function NoData({ value }: { value: number | string | null }) {
  if (value !== null) return <>{value}</>
  return (
    <>
      <span aria-hidden="true">—</span>
      <span className="visually-hidden">sem dados</span>
    </>
  )
}
