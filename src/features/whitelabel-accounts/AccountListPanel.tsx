import type { MouseEvent } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  MoreHorizontal,
  SearchX,
  ShieldCheck,
  UsersRound,
} from 'lucide-react'
import { EmptyState } from '../../components/ui/EmptyState'
import { OutlineButton } from '../../components/ui/OutlineButton'
import { SearchField } from '../../components/ui/SearchField'
import { SelectField } from '../../components/ui/SelectField'
import { StatusPill } from '../../components/ui/StatusPill'
import { tabId, tabPanelId } from '../../components/ui/tabIds'
import { AccountAvatar, BusinessBadge } from './AccountBadges'
import {
  ACCESS_META,
  ACCOUNT_TYPE_LABEL,
  ADMIN_INVITATION_META,
  businessState,
  formatDateTime,
  initials,
  type Account,
  type AccountType,
} from './accountModel'
import { BUSINESS_FILTERS, SEARCH_HINT, SEARCH_LABEL, TYPE_TABS_ID, type AccessFilter, type Sort, type SortKey } from './accountListConfig'
import styles from './AccountListPanel.module.css'

type AccountListPanelProps = {
  type: AccountType
  whitelabelName: string
  rows: Account[]
  filteredCount: number
  scopedCount: number
  rangeStart: number
  rangeEnd: number
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  query: string
  onQueryChange: (value: string) => void
  access: AccessFilter
  onAccessChange: (value: AccessFilter) => void
  business: string
  onBusinessChange: (value: string) => void
  sort: Sort
  onSortChange: (value: Sort) => void
  activeId?: string
  onActivate: (id: string) => void
  onOpenActions: (id: string) => void
  onClearFilters: () => void
}

/**
 * Account list for the selected Whitelabel and account type: local search,
 * access/business filters, name/activity sorting, single-row selection and
 * local pagination. It is the tab panel of the account-type tabs.
 */
export function AccountListPanel({
  type,
  whitelabelName,
  rows,
  filteredCount,
  scopedCount,
  rangeStart,
  rangeEnd,
  page,
  pageCount,
  onPageChange,
  query,
  onQueryChange,
  access,
  onAccessChange,
  business,
  onBusinessChange,
  sort,
  onSortChange,
  activeId,
  onActivate,
  onOpenActions,
  onClearFilters,
}: AccountListPanelProps) {
  const typeMeta = ACCOUNT_TYPE_LABEL[type]
  const businessFilter = BUSINESS_FILTERS[type]
  const filtersActive = query !== '' || access !== 'all' || business !== 'all'

  function toggleSort(key: SortKey) {
    if (sort?.key !== key) onSortChange({ key, direction: 'ascending' })
    else onSortChange({ key, direction: sort.direction === 'ascending' ? 'descending' : 'ascending' })
  }

  // Mouse convenience: clicking a row (outside its own controls) shows its details.
  function onRowClick(event: MouseEvent<HTMLTableRowElement>, id: string) {
    if ((event.target as HTMLElement).closest('button, input, a, select')) return
    onActivate(id)
  }

  const sortHeader = (key: SortKey, label: string) => {
    const sorted = sort?.key === key
    return { sorted, label, key }
  }
  const nameSort = sortHeader('name', 'Nome')
  const activitySort = sortHeader('lastActivityAt', 'Última atividade')

  return (
    <section
      className={styles.panel}
      role="tabpanel"
      id={tabPanelId(TYPE_TABS_ID, type)}
      aria-labelledby={tabId(TYPE_TABS_ID, type)}
    >
      <div className={styles.controls}>
        <SearchField
          id="acc-search"
          className={styles.search}
          label={SEARCH_LABEL[type]}
          placeholder={SEARCH_HINT[type]}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
        <SelectField
          id="acc-access"
          label="Filtrar por status de acesso"
          icon={Filter}
          value={access}
          onChange={(event) => onAccessChange(event.target.value as AccessFilter)}
        >
          <option value="all">Todos os acessos</option>
          <option value="active">Acesso ativo</option>
          <option value="paused">Acesso pausado</option>
        </SelectField>
        <SelectField
          id="acc-business"
          label={`Filtrar por ${businessFilter.label.toLowerCase()}`}
          value={business}
          onChange={(event) => onBusinessChange(event.target.value)}
        >
          <option value="all">{businessFilter.all}</option>
          {businessFilter.options.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectField>
      </div>

      <p className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.legendDot} aria-hidden="true" />
          <span>
            <strong>Acesso</strong> (Ativa / Pausada): muda só com Pausar ou Reativar
          </span>
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendSquare} aria-hidden="true" />
          <span>
            <strong>{businessFilter.label.replace(' (conceitual)', '')}</strong>: estado {type === 'admin' ? 'conceitual' : 'de negócio'}, independente do acesso
          </span>
        </span>
      </p>

      <div className={styles.tableArea}>
        <table className={styles.table} data-type={type}>
          <caption className="visually-hidden">
            {typeMeta.label} de {whitelabelName} (dados ilustrativos). Use o nome de cada linha para ver os detalhes e as
            ações da conta.
          </caption>
          <thead>
            <tr>
              <th scope="col" className={styles.colName} aria-sort={nameSort.sorted ? sort?.direction : undefined}>
                <button type="button" className={styles.sortButton} onClick={() => toggleSort('name')}>
                  Nome
                  <SortIcon state={nameSort.sorted ? sort!.direction : null} />
                </button>
              </th>
              <th scope="col" className={styles.colEmail}>
                E-mail
              </th>
              <th scope="col" className={styles.colAccess}>
                Acesso
              </th>
              <th scope="col" className={styles.colBusiness}>
                {businessFilter.label.replace(' (conceitual)', '')}
              </th>
              {type === 'admin' ? (
                <th scope="col" className={styles.colExtra}>
                  Convite
                </th>
              ) : (
                <th scope="col" className={styles.colExtra} aria-sort={activitySort.sorted ? sort?.direction : undefined}>
                  <button type="button" className={styles.sortButton} onClick={() => toggleSort('lastActivityAt')}>
                    Última atividade
                    <SortIcon state={activitySort.sorted ? sort!.direction : null} />
                  </button>
                </th>
              )}
              <th scope="col" className={styles.colActions}>
                <span className="visually-hidden">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isActive = row.id === activeId
              const accessMeta = ACCESS_META[row.accessState]
              const state = businessState(row)
              const activity = formatDateTime(row.lastActivityAt)
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
                      aria-controls="account-detail"
                    >
                      <AccountAvatar initials={initials(row.name)} />
                      <span className={styles.nameText}>
                        <span className={styles.name}>{row.name}</span>
                        <span className={styles.subline}>{row.id}</span>
                        <span className={styles.nameEmail}>{row.email}</span>
                        <span className="visually-hidden">, ver detalhes</span>
                      </span>
                    </button>
                    {/* Narrow panels: states move under the name (their columns are hidden). */}
                    <span className={styles.nameStates}>
                      <StatusPill tone={accessMeta.tone} label={accessMeta.label} />
                      <BusinessBadge tone={state.tone} label={state.label} />
                    </span>
                  </td>
                  <td className={styles.colEmail}>{row.email}</td>
                  <td className={styles.colAccess}>
                    <StatusPill tone={accessMeta.tone} label={accessMeta.label} />
                  </td>
                  <td className={styles.colBusiness}>
                    <BusinessBadge tone={state.tone} label={state.label} />
                  </td>
                  <td className={styles.colExtra}>
                    {row.type === 'admin' ? (
                      <BusinessBadge tone={ADMIN_INVITATION_META[row.invitation].tone} label={ADMIN_INVITATION_META[row.invitation].label} />
                    ) : activity ? (
                      <span className={styles.activity}>
                        <span>{activity.slice(0, 10)}</span>
                        <span className={styles.subline}>{activity.slice(11)}</span>
                      </span>
                    ) : (
                      <>
                        <span aria-hidden="true">—</span>
                        <span className="visually-hidden">sem registro</span>
                      </>
                    )}
                  </td>
                  <td className={styles.colActions}>
                    <button
                      type="button"
                      className={styles.moreButton}
                      onClick={() => onOpenActions(row.id)}
                      aria-label={`Ações da conta de ${row.name}`}
                      aria-controls="account-detail"
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
            {scopedCount === 0 ? (
              <EmptyState
                icon={type === 'admin' ? ShieldCheck : UsersRound}
                title={`Nenhum ${typeMeta.singular.toLowerCase()} em ${whitelabelName}`}
                description={
                  type === 'admin'
                    ? 'Este Whitelabel ilustrativo ainda não tem administradores além dos listados. Use "Novo administrador" para simular um convite.'
                    : 'Este Whitelabel ilustrativo ainda não possui contas deste tipo.'
                }
              />
            ) : (
              <EmptyState
                icon={SearchX}
                title="Nenhuma conta encontrada"
                description="Ajuste a busca ou os filtros para ver outros resultados."
              />
            )}
            {filtersActive && scopedCount > 0 ? <OutlineButton onClick={onClearFilters}>Limpar filtros</OutlineButton> : null}
          </div>
        ) : null}
      </div>

      <div className={styles.footer}>
        <p className={styles.count} aria-live="polite">
          {filteredCount === 0
            ? `Mostrando 0 de ${scopedCount} resultados`
            : `Mostrando ${rangeStart}–${rangeEnd} de ${filteredCount} resultados`}
          {filteredCount !== scopedCount && filteredCount > 0 ? ` (filtrados de ${scopedCount})` : ''}
          <span className={styles.illustrative}> · Dados ilustrativos</span>
        </p>
        {pageCount > 1 ? (
          <nav className={styles.pagination} aria-label="Paginação">
            <button
              type="button"
              className={styles.pageButton}
              disabled={page === 1}
              onClick={() => onPageChange(page - 1)}
              aria-label="Página anterior"
            >
              <ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />
            </button>
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
              <button
                key={number}
                type="button"
                className={styles.pageButton}
                aria-current={number === page ? 'page' : undefined}
                aria-label={`Página ${number}`}
                onClick={() => onPageChange(number)}
              >
                {number}
              </button>
            ))}
            <button
              type="button"
              className={styles.pageButton}
              disabled={page === pageCount}
              onClick={() => onPageChange(page + 1)}
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

function SortIcon({ state }: { state: 'ascending' | 'descending' | null }) {
  const Icon = state === 'ascending' ? ArrowUp : state === 'descending' ? ArrowDown : ArrowUpDown
  return <Icon className={styles.sortIcon} size={13} strokeWidth={1.9} aria-hidden="true" data-active={state ? true : undefined} />
}
