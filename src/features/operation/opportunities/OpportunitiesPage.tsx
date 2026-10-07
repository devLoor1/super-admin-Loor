import { useMemo, useState, type CSSProperties } from 'react'
import { ChartColumn, Eye, FilePen, FilterX, Pause, Pencil, Play, Plus, Search, Target, X } from 'lucide-react'
import { IconTile } from '../../../components/ui/IconTile'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import primary from '../../../components/ui/PrimaryButton.module.css'
import fin from '../../finance-gateways/sections/FinanceSections.module.css'
import { MODALITY_CATALOG } from '../../finance-modalities/modalitiesModel'
import { PROTOTYPE_WHITELABELS } from '../../whitelabels/prototypeWhitelabels'
import {
  PAGE_SIZE,
  compareDate,
  compareText,
  formatDateTime,
  normalize,
  whitelabelName,
  type SortState,
} from '../shared/operationModel'
import { entrepreneurById } from '../shared/participants'
import {
  NoResults,
  OperationShell,
  PageIntro,
  Pagination,
  SortButton,
  SummaryCards,
  WhitelabelTag,
} from '../shared/OperationUi'
import shared from '../shared/Operation.module.css'
import { refNames, useCatalogResolver } from './classification'
import { OPPORTUNITY_STATUSES, OPPORTUNITY_STATUS_META, type Opportunity, type OpportunityStatus } from './opportunityModel'
import { useOpportunities } from './opportunityStore'
import { CatalogCell, ModalityChip, OpportunityStatusPill } from './OpportunityParts'
import styles from './Opportunities.module.css'

type SortKey = 'name' | 'status' | 'updatedAt'
const STATUS_ORDER: Record<OpportunityStatus, number> = { draft: 0, active: 1, paused: 2 }

/**
 * Oportunidades V1 — global operational list across Whitelabels.
 * Local filters/sort/pagination over the in-memory prototype store; no
 * delete, no financial data, nothing is fetched or sent.
 */
export function OpportunitiesPage({ entrepreneurId }: { entrepreneurId?: string }) {
  const opportunities = useOpportunities()
  const catalogs = useCatalogResolver()
  const [query, setQuery] = useState('')
  const [whitelabel, setWhitelabel] = useState('all')
  const [status, setStatus] = useState<'all' | OpportunityStatus>('all')
  const [modality, setModality] = useState('all')
  const [segment, setSegment] = useState('all')
  const [resourceUse, setResourceUse] = useState('all')
  const [entrepreneur, setEntrepreneur] = useState(entrepreneurId ?? '')
  const [sort, setSort] = useState<SortState<SortKey>>({ key: 'updatedAt', direction: 'descending' })
  const [page, setPage] = useState(1)

  // A new `?empreendedor=` context (e.g. from Empreendedores) replaces the local one.
  const [routeEntrepreneur, setRouteEntrepreneur] = useState(entrepreneurId)
  if (routeEntrepreneur !== entrepreneurId) {
    setRouteEntrepreneur(entrepreneurId)
    setEntrepreneur(entrepreneurId ?? '')
    setPage(1)
  }
  const entrepreneurProfile = entrepreneur ? entrepreneurById(entrepreneur) : undefined

  const scopedWhitelabels = PROTOTYPE_WHITELABELS.filter((item) => whitelabel === 'all' || item.id === whitelabel)

  const filtered = useMemo(() => {
    const needle = normalize(query)
    const rows = opportunities.filter((item) => {
      if (whitelabel !== 'all' && item.whitelabelId !== whitelabel) return false
      if (status !== 'all' && item.status !== status) return false
      if (modality !== 'all' && item.modality !== modality) return false
      if (segment !== 'all' && !item.segmentIds.includes(segment)) return false
      if (resourceUse !== 'all' && !item.resourceUseIds.includes(resourceUse)) return false
      if (entrepreneur && item.entrepreneurId !== entrepreneur) return false
      return !needle || normalize(`${item.name} ${item.id}`).includes(needle)
    })
    const direction = sort.direction === 'ascending' ? 1 : -1
    return [...rows].sort((a, b) => {
      if (sort.key === 'updatedAt') {
        // Records without a date stay last in both directions.
        if (!a.updatedAt || !b.updatedAt) return compareDate(a.updatedAt, b.updatedAt)
        return direction * compareDate(a.updatedAt, b.updatedAt)
      }
      const value = sort.key === 'name' ? compareText(a.name, b.name) : STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      return direction * (value || compareText(a.name, b.name))
    })
  }, [opportunities, query, whitelabel, status, modality, segment, resourceUse, entrepreneur, sort])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pageCount)
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)
  const filtersActive =
    Boolean(query.trim()) ||
    [whitelabel, status, modality, segment, resourceUse].some((value) => value !== 'all') ||
    Boolean(entrepreneur)

  const counts = OPPORTUNITY_STATUSES.reduce(
    (acc, key) => ({ ...acc, [key]: opportunities.filter((item) => item.status === key).length }),
    {} as Record<OpportunityStatus, number>,
  )

  function update<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value)
      setPage(1)
    }
  }

  function changeWhitelabel(value: string) {
    setWhitelabel(value)
    // Catalog records belong to one Whitelabel: drop a record filter from another tenant.
    if (value !== 'all') {
      if (segment !== 'all' && !catalogs.segmentsOf(value).some((item) => item.id === segment)) setSegment('all')
      if (resourceUse !== 'all' && !catalogs.resourceUsesOf(value).some((item) => item.id === resourceUse)) setResourceUse('all')
    }
    setPage(1)
  }

  function clearFilters() {
    setQuery('')
    setWhitelabel('all')
    setStatus('all')
    setModality('all')
    setSegment('all')
    setResourceUse('all')
    removeEntrepreneurFilter()
    setPage(1)
  }

  function removeEntrepreneurFilter() {
    setEntrepreneur('')
    setPage(1)
    // Keep the visible context and URL in sync: refresh must not resurrect it.
    if (entrepreneurId !== undefined) window.location.hash = '#/operation/opportunities'
  }

  function toggleSort(key: SortKey) {
    setSort((currentSort) =>
      currentSort.key !== key
        ? { key, direction: key === 'updatedAt' ? 'descending' : 'ascending' }
        : { key, direction: currentSort.direction === 'ascending' ? 'descending' : 'ascending' },
    )
  }

  const sortHeader = (key: SortKey, label: string) => (
    <SortButton label={label} sorted={sort.key === key} direction={sort.direction} onClick={() => toggleSort(key)} />
  )
  const ariaSort = (key: SortKey) => (sort.key === key ? sort.direction : undefined)

  return (
    <OperationShell section="opportunities" title="Oportunidades">
      <PageIntro
        text="Gerencie as oportunidades de todos os Whitelabels em um só lugar. Protótipo local: criação e edição ficam nesta sessão do navegador."
        actions={
          <a href="#/operation/opportunities/new" className={`${primary.button} ${shared.ctaButton}`} data-create-opportunity>
            <Plus size={17} strokeWidth={2} aria-hidden="true" />
            Nova oportunidade
          </a>
        }
      />

      <SummaryCards
        title="Resumo das oportunidades locais"
        note="Contagens do estado local deste protótipo (todos os Whitelabels) — não são dados de produção."
        cards={[
          { label: 'Total de oportunidades', value: opportunities.length, detail: 'Todos os Whitelabels', icon: ChartColumn, tone: 'blue' },
          { label: 'Rascunho', value: counts.draft, detail: 'Estado do protótipo', icon: FilePen, tone: 'indigo' },
          { label: 'Ativas', value: counts.active, detail: 'Estado do protótipo', icon: Play, tone: 'teal' },
          { label: 'Pausadas', value: counts.paused, detail: 'Estado do protótipo', icon: Pause, tone: 'amber' },
        ]}
      />

      <section className={`${fin.card} ${shared.listCard}`} aria-labelledby="opp-list-title">
        <h2 id="opp-list-title" className="visually-hidden">
          Lista de oportunidades
        </h2>
        <div className={shared.filters} style={{ '--filter-count': 5 } as CSSProperties}>
          <label className={fin.search}>
            <Search size={16} strokeWidth={1.8} aria-hidden="true" />
            <span className="visually-hidden">Buscar por nome ou ID da oportunidade</span>
            <input
              type="search"
              value={query}
              placeholder="Buscar por nome ou ID da oportunidade…"
              onChange={(event) => update(setQuery)(event.target.value)}
            />
          </label>
          <div className={shared.filterSelects}>
            <label className={fin.filter}>
              <span className="visually-hidden">Filtrar por Whitelabel</span>
              <select value={whitelabel} onChange={(event) => changeWhitelabel(event.target.value)}>
                <option value="all">Todos os Whitelabels</option>
                {PROTOTYPE_WHITELABELS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={fin.filter}>
              <span className="visually-hidden">Filtrar por status</span>
              <select value={status} onChange={(event) => update(setStatus)(event.target.value as 'all' | OpportunityStatus)}>
                <option value="all">Todos os status</option>
                {OPPORTUNITY_STATUSES.map((key) => (
                  <option key={key} value={key}>
                    {OPPORTUNITY_STATUS_META[key].label}
                  </option>
                ))}
              </select>
            </label>
            <label className={fin.filter}>
              <span className="visually-hidden">Filtrar por modalidade</span>
              <select value={modality} onChange={(event) => update(setModality)(event.target.value)}>
                <option value="all">Todas as modalidades</option>
                {MODALITY_CATALOG.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={fin.filter}>
              <span className="visually-hidden">Filtrar por segmento</span>
              <select value={segment} onChange={(event) => update(setSegment)(event.target.value)}>
                <option value="all">Todos os segmentos</option>
                {scopedWhitelabels.map((item) => {
                  const options = catalogs.segmentsOf(item.id)
                  return options.length ? (
                    <optgroup key={item.id} label={`Segmentos de ${item.name}`}>
                      {options.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                          {option.status === 'inactive' ? ' (inativo)' : ''}
                        </option>
                      ))}
                    </optgroup>
                  ) : null
                })}
              </select>
            </label>
            <label className={fin.filter}>
              <span className="visually-hidden">Filtrar por uso dos recursos</span>
              <select value={resourceUse} onChange={(event) => update(setResourceUse)(event.target.value)}>
                <option value="all">Todos os usos dos recursos</option>
                {scopedWhitelabels.map((item) => {
                  const options = catalogs.resourceUsesOf(item.id)
                  return options.length ? (
                    <optgroup key={item.id} label={`Usos dos recursos de ${item.name}`}>
                      {options.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                          {option.status === 'inactive' ? ' (inativo)' : ''}
                        </option>
                      ))}
                    </optgroup>
                  ) : null
                })}
              </select>
            </label>
          </div>
          <OutlineButton className={shared.clearButton} onClick={clearFilters} disabled={!filtersActive}>
            <FilterX size={15} strokeWidth={1.8} aria-hidden="true" />
            Limpar filtros
          </OutlineButton>
        </div>

        {entrepreneur ? (
          <div className={shared.activeFilters}>
            <span>Contexto:</span>
            <span className={shared.filterChip} data-entrepreneur-filter={entrepreneur}>
              Empreendedor: {entrepreneurProfile?.account.name ?? entrepreneur}
              <button
                type="button"
                onClick={removeEntrepreneurFilter}
                aria-label={`Remover filtro do empreendedor ${entrepreneurProfile?.account.name ?? entrepreneur}`}
              >
                <X size={14} strokeWidth={2} aria-hidden="true" />
              </button>
            </span>
          </div>
        ) : null}

        <div className={fin.tableArea}>
          <table className={`${fin.table} ${shared.table} ${styles.table}`}>
            <caption className="visually-hidden">Oportunidades de todos os Whitelabels (protótipo local)</caption>
            <thead>
              <tr>
                <th scope="col" className={styles.colName} aria-sort={ariaSort('name')}>
                  {sortHeader('name', 'Oportunidade')}
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
                <th scope="col" className={styles.colStatus} aria-sort={ariaSort('status')}>
                  {sortHeader('status', 'Status')}
                </th>
                <th scope="col" className={styles.colUpdated} aria-sort={ariaSort('updatedAt')}>
                  {sortHeader('updatedAt', 'Atualizada em')}
                </th>
                <th scope="col" className={shared.colActions}>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <OpportunityRow key={item.id} item={item} classification={catalogs.resolve(item)} />
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? (
            <NoResults
              title="Nenhuma oportunidade encontrada"
              description={filtersActive ? 'Ajuste a busca ou os filtros.' : 'Use “Nova oportunidade” para criar a primeira.'}
            />
          ) : null}
        </div>

        <div className={shared.footer}>
          <p className={shared.range} aria-live="polite">
            {filtered.length
              ? `Mostrando ${(current - 1) * PAGE_SIZE + 1}–${Math.min(current * PAGE_SIZE, filtered.length)} de ${filtered.length} ${
                  filtered.length === 1 ? 'oportunidade' : 'oportunidades'
                }`
              : 'Nenhuma oportunidade'}
            {filtersActive ? ` (filtradas de ${opportunities.length})` : ''}
          </p>
          <Pagination label="Paginação de oportunidades" page={current} pageCount={pageCount} onPage={setPage} />
        </div>
      </section>
    </OperationShell>
  )
}

function OpportunityRow({
  item,
  classification,
}: {
  item: Opportunity
  classification: ReturnType<ReturnType<typeof useCatalogResolver>['resolve']>
}) {
  const entrepreneur = item.entrepreneurId ? entrepreneurById(item.entrepreneurId) : undefined
  const entrepreneurLabel = entrepreneur?.account.name ?? (item.entrepreneurId ? 'Empreendedor não encontrado' : 'Não vinculado')
  const updated = formatDateTime(item.updatedAt)
  const segments = refNames(classification.segments)
  const uses = refNames(classification.resourceUses)
  return (
    <tr className={fin.row} data-opportunity={item.id}>
      <td className={styles.colName}>
        <span className={shared.cellMain}>
          <IconTile icon={Target} tone="violet" size="sm" className={styles.rowIcon} />
          <span className={shared.cellText}>
            <a href={`#/operation/opportunities/${item.id}`} className={shared.rowLink}>
              {item.name}
            </a>
            <span className={shared.rowId}>{item.id}</span>
            <span className={styles.metaParticipants}>
              {whitelabelName(item.whitelabelId)} · {entrepreneurLabel}
            </span>
            <span className={styles.metaClass}>
              Segmentos: {segments.length ? segments.join(', ') : '—'} · Usos: {uses.length ? uses.join(', ') : '—'}
            </span>
            <span className={styles.metaUpdated}>Atualizada em {updated ?? '—'}</span>
            <span className={styles.metaStatus}>
              <ModalityChip modality={item.modality} />
              <OpportunityStatusPill status={item.status} />
            </span>
          </span>
        </span>
      </td>
      <td className={styles.colWl}>
        <WhitelabelTag whitelabelId={item.whitelabelId} />
      </td>
      <td className={styles.colEnt}>
        {entrepreneur ? entrepreneur.account.name : <span className={shared.muted}>{entrepreneurLabel}</span>}
      </td>
      <td className={styles.colMod}>
        <ModalityChip modality={item.modality} />
      </td>
      <td className={styles.colSeg}>
        <CatalogCell items={classification.segments} catalog="segment" emptyLabel="—" />
      </td>
      <td className={styles.colRu}>
        <CatalogCell items={classification.resourceUses} catalog="resource_use" emptyLabel="—" />
      </td>
      <td className={styles.colStatus}>
        <OpportunityStatusPill status={item.status} />
      </td>
      <td className={`${styles.colUpdated} ${shared.dateCell}`}>{updated ?? '—'}</td>
      <td className={shared.colActions}>
        <span className={fin.rowActions}>
          <a
            href={`#/operation/opportunities/${item.id}`}
            className={`${fin.iconButton} ${shared.actionLink}`}
            aria-label={`Abrir oportunidade ${item.name}`}
            data-view-opportunity={item.id}
          >
            <Eye size={15} strokeWidth={1.8} aria-hidden="true" />
          </a>
          <a
            href={`#/operation/opportunities/${item.id}/edit`}
            className={`${fin.iconButton} ${shared.actionLink}`}
            aria-label={`Editar oportunidade ${item.name}`}
            data-edit-opportunity={item.id}
          >
            <Pencil size={15} strokeWidth={1.8} aria-hidden="true" />
          </a>
        </span>
      </td>
    </tr>
  )
}
