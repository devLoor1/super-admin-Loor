import { useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Database,
  LayoutGrid,
  Pencil,
  Plus,
  Search,
  SearchX,
  Trash2,
} from 'lucide-react'
import { EmptyState } from '../../../components/ui/EmptyState'
import { IconTile } from '../../../components/ui/IconTile'
import { PrimaryButton } from '../../../components/ui/PrimaryButton'
import { StatusPill } from '../../../components/ui/StatusPill'
import fin from '../../finance-gateways/sections/FinanceSections.module.css'
import {
  CATALOG_META,
  PAGE_SIZE,
  STATUS_META,
  normalizeName,
  sortItems,
  type CatalogItem,
  type CatalogKind,
  type SortKey,
  type SortState,
  type StatusFilter,
} from '../catalogModel'
import styles from './CatalogSections.module.css'

const ICON = { segment: LayoutGrid, resource_use: Database } as const
const TONE = { segment: 'violet', resource_use: 'teal' } as const

type Props = {
  kind: CatalogKind
  items: CatalogItem[]
  whitelabelName: string
  /** Last created/edited item: the list clears filters if needed and shows its page. */
  reveal: { id: string; nonce: number } | null
  onCreate: () => void
  onEdit: (item: CatalogItem) => void
  onDelete: (item: CatalogItem) => void
}

/**
 * One catalog (Segments OR Resource Uses): search, status filter, sorting,
 * local pagination and per-row edit/delete. No bulk or cross-catalog actions.
 */
export function CatalogPanel({ kind, items, whitelabelName, reveal, onCreate, onEdit, onDelete }: Props) {
  const meta = CATALOG_META[kind]
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [sort, setSort] = useState<SortState>({ key: 'name', direction: 'ascending' })
  const [page, setPage] = useState(1)
  const [handledReveal, setHandledReveal] = useState(reveal?.nonce ?? 0)

  const filtered = useMemo(() => {
    const needle = normalizeName(query)
    const scoped = items.filter((item) => {
      if (status !== 'all' && item.status !== status) return false
      return !needle || normalizeName(`${item.name} ${item.description}`).includes(needle)
    })
    return sortItems(scoped, sort)
  }, [items, query, status, sort])

  // A newly saved item may be filtered out or on another page: show it (state
  // adjusted during render when the reveal request changes).
  if (reveal && reveal.nonce !== handledReveal) {
    setHandledReveal(reveal.nonce)
    const target = items.find((item) => item.id === reveal.id)
    const visible = filtered.findIndex((item) => item.id === reveal.id)
    if (target && visible === -1) {
      setQuery('')
      setStatus('all')
      const index = sortItems(items, sort).findIndex((item) => item.id === reveal.id)
      setPage(Math.floor(index / PAGE_SIZE) + 1)
    } else if (visible >= 0) {
      setPage(Math.floor(visible / PAGE_SIZE) + 1)
    }
  }

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pageCount)
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)
  const rangeStart = filtered.length ? (current - 1) * PAGE_SIZE + 1 : 0
  const rangeEnd = Math.min(current * PAGE_SIZE, filtered.length)
  const activeCount = items.filter((item) => item.status === 'active').length
  const filtersActive = Boolean(query.trim()) || status !== 'all'

  function toggleSort(key: SortKey) {
    setSort((currentSort) =>
      currentSort.key !== key
        ? { key, direction: 'ascending' }
        : { key, direction: currentSort.direction === 'ascending' ? 'descending' : 'ascending' },
    )
  }

  const sortHeader = (key: SortKey, label: string) => {
    const sorted = sort.key === key
    const Icon = !sorted ? ArrowUpDown : sort.direction === 'ascending' ? ArrowUp : ArrowDown
    return (
      <button type="button" className={styles.sortButton} onClick={() => toggleSort(key)}>
        {label}
        <Icon className={styles.sortIcon} size={13} strokeWidth={1.9} aria-hidden="true" data-active={sorted || undefined} />
      </button>
    )
  }

  const titleId = `${meta.idPrefix}-title`
  return (
    <section className={`${fin.card} ${styles.panel}`} aria-labelledby={titleId} data-catalog={kind} data-detail-stage>
      <header className={styles.panelHeader}>
        <IconTile icon={ICON[kind]} tone={TONE[kind]} size="lg" />
        <div className={styles.panelHeading}>
          <h2 id={titleId} className={fin.cardTitle}>
            {meta.title}
          </h2>
          <p className={fin.cardSubtitle}>{meta.subtitle}</p>
        </div>
        <PrimaryButton
          className={`${fin.headerButton} ${kind === 'resource_use' ? styles.tealButton : ''}`}
          onClick={onCreate}
          data-create={kind}
        >
          <Plus size={16} strokeWidth={2} aria-hidden="true" />
          {meta.newLabel}
        </PrimaryButton>
      </header>

      <div className={styles.controls}>
        <label className={fin.search}>
          <Search size={16} strokeWidth={1.8} aria-hidden="true" />
          <span className="visually-hidden">{meta.searchLabel}</span>
          <input
            type="search"
            value={query}
            placeholder={`${meta.searchLabel}…`}
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(1)
            }}
          />
        </label>
        <label className={fin.filter}>
          <span className="visually-hidden">Filtrar {meta.plural} por status</span>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as StatusFilter)
              setPage(1)
            }}
          >
            <option value="all">Todos os status</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>
        </label>
        <p className={styles.count} aria-live="polite">
          {filtersActive ? `${filtered.length} de ${items.length} ${meta.plural}` : `${items.length} ${meta.plural}`}
        </p>
      </div>

      <div className={fin.tableArea}>
        <table className={`${fin.table} ${styles.table}`}>
          <caption className="visually-hidden">
            {meta.title} de {whitelabelName}
          </caption>
          <thead>
            <tr>
              <th scope="col" aria-sort={sort.key === 'name' ? sort.direction : undefined}>
                {sortHeader('name', 'Nome')}
              </th>
              <th scope="col" className={styles.colDesc}>
                Descrição
              </th>
              <th scope="col" className={styles.colStatus} aria-sort={sort.key === 'status' ? sort.direction : undefined}>
                {sortHeader('status', 'Status')}
              </th>
              <th scope="col" className={styles.colActions}>
                <span className="visually-hidden">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => {
              const statusMeta = STATUS_META[item.status]
              return (
                <tr key={item.id} className={fin.row} data-item={item.id} data-recent={reveal?.id === item.id || undefined}>
                  <td className={styles.colName}>
                    <span className={styles.name}>{item.name}</span>
                    <span className={styles.descInline}>{item.description || '—'}</span>
                    <span className={styles.statusInline}>
                      <StatusPill tone={statusMeta.tone} label={statusMeta.label} />
                    </span>
                  </td>
                  <td className={styles.colDesc}>
                    {item.description ? item.description : <span className={styles.empty}>Sem descrição</span>}
                  </td>
                  <td className={styles.colStatus}>
                    <StatusPill tone={statusMeta.tone} label={statusMeta.label} />
                  </td>
                  <td className={styles.colActions}>
                    <span className={fin.rowActions}>
                      <button
                        type="button"
                        className={`${fin.iconButton} ${styles.actionButton}`}
                        onClick={() => onEdit(item)}
                        aria-label={`Editar ${meta.singular} ${item.name}`}
                        data-edit={item.id}
                      >
                        <Pencil size={15} strokeWidth={1.8} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className={`${fin.iconButton} ${fin.iconDanger} ${styles.actionButton} ${styles.deleteButton}`}
                        onClick={() => onDelete(item)}
                        aria-label={`Excluir ${meta.singular} ${item.name}`}
                        data-delete={item.id}
                      >
                        <Trash2 size={15} strokeWidth={1.8} aria-hidden="true" />
                      </button>
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {rows.length === 0 ? (
          <div className={fin.emptyBox}>
            {items.length === 0 ? (
              <EmptyState
                icon={ICON[kind]}
                title={`Nenhum ${meta.singular} cadastrado`}
                description={`Use “${meta.newLabel}” para criar o primeiro item deste catálogo.`}
              />
            ) : (
              <EmptyState icon={SearchX} title={`Nenhum ${meta.singular} encontrado`} description="Ajuste a busca ou o filtro de status." />
            )}
          </div>
        ) : null}
      </div>

      <div className={styles.footer}>
        <p className={styles.range}>
          {filtered.length
            ? `Mostrando ${rangeStart}–${rangeEnd} de ${filtered.length} ${meta.plural}`
            : `Mostrando 0 de ${items.length} ${meta.plural}`}
          {` · ${activeCount} ${activeCount === 1 ? 'ativo' : 'ativos'}, ${items.length - activeCount} ${
            items.length - activeCount === 1 ? 'inativo' : 'inativos'
          }`}
        </p>
        {pageCount > 1 ? (
          <nav className={styles.pagination} aria-label={`Paginação de ${meta.plural}`}>
            <button
              type="button"
              className={styles.pageButton}
              disabled={current === 1}
              onClick={() => setPage(current - 1)}
              aria-label="Página anterior"
            >
              <ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />
            </button>
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
              <button
                key={number}
                type="button"
                className={styles.pageButton}
                aria-current={number === current ? 'page' : undefined}
                aria-label={`Página ${number}`}
                onClick={() => setPage(number)}
              >
                {number}
              </button>
            ))}
            <button
              type="button"
              className={styles.pageButton}
              disabled={current === pageCount}
              onClick={() => setPage(current + 1)}
              aria-label="Próxima página"
            >
              <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" />
            </button>
          </nav>
        ) : null}
      </div>
    </section>
  )
}
