import { useMemo, useState, type CSSProperties } from 'react'
import { CalendarDays, ChartColumn, Eye, FilePen, FileText, FilterX, Info, Search } from 'lucide-react'
import { replaceRouteKeepingScroll, useRestoreReplacedScroll } from '../../app/routeQuery'
import { OutlineButton } from '../../components/ui/OutlineButton'
import fin from '../finance-gateways/sections/FinanceSections.module.css'
import { ContextChip, DateStack, SortSelect, type SortOption } from '../finance-core/shared/FinanceCoreUi'
import { InfoNote, NoResults, PageIntro, Pagination, SortButton, SummaryCards } from '../operation/shared/OperationUi'
import { PAGE_SIZE, compareDate, compareText, formatDateTime, normalize, type SortState } from '../operation/shared/operationModel'
import shared from '../operation/shared/Operation.module.css'
import { PROTOTYPE_WHITELABELS } from '../whitelabels/prototypeWhitelabels'
import { hasChanges } from './auditFormat'
import {
  AUDIT_ACTIONS,
  AUDIT_ACTION_LABEL,
  AUDIT_ACTORS,
  AUDIT_MODULES,
  AUDIT_MODULE_META,
  AUDIT_PERIOD_LABEL,
  AUDIT_REFERENCE_DAY,
  AUDIT_RESOURCE_LABEL,
  AUDIT_RESULTS,
  AUDIT_RESULT_META,
  actorById,
  auditEventHref,
  inPeriod,
  isAuditAction,
  isAuditResourceType,
  type AuditModule,
  type AuditPeriod,
  type AuditResult,
} from './auditModel'
import { auditListHref, whitelabelLabel } from './auditRefs'
import { PROTOTYPE_AUDIT_EVENTS } from './prototypeAudit'
import { ActorCell, AuditShell, ChangesTag, EventWhitelabel, ModuleIcon, ModuleTag, ResultPill } from './AuditUi'
import styles from './Audit.module.css'

type SortKey = 'createdAt' | 'id' | 'event' | 'module' | 'actor' | 'result'

/** Whitelabel filter values: a tenant id, or "global" for Control Plane events without one. */
const GLOBAL = 'global'
/** Actor filter value for unauthenticated attempts. */
const ANONYMOUS = 'anonymous'

const SORT_OPTIONS: SortOption<SortKey>[] = [
  { key: 'createdAt', label: 'Data e hora', ascending: 'mais antigo', descending: 'mais recente' },
  { key: 'id', label: 'Evento / ID', ascending: 'crescente', descending: 'decrescente' },
  { key: 'event', label: 'Ação', ascending: 'A–Z', descending: 'Z–A' },
  { key: 'module', label: 'Módulo', ascending: 'A–Z', descending: 'Z–A' },
  { key: 'actor', label: 'Ator', ascending: 'A–Z', descending: 'Z–A' },
  { key: 'result', label: 'Resultado', ascending: 'Sucesso primeiro', descending: 'Falha primeiro' },
]

const referenceText = AUDIT_REFERENCE_DAY.split('-').reverse().join('/')
const actorName = (id: string | null) => (id ? actorById(id)?.name ?? id : 'Não autenticado')

/**
 * `#/audit` — Auditoria V1 (Governança): global, READ-ONLY consultation of
 * illustrative governance events. No edit, delete, revert, restore, replay,
 * reprocess or export. URL-backed context: `?resourceType=` + `?resourceId=`
 * (chip), `?whitelabel=`, `?actor=`, `?action=`; unknown values are ignored
 * with a visible note. Search, module, result, period, sort and page are local.
 */
export function AuditListPage({
  resourceType,
  resourceId,
  whitelabel,
  actor,
  action,
  routeKey,
}: {
  resourceType?: string
  resourceId?: string
  whitelabel?: string
  actor?: string
  action?: string
  routeKey: string
}) {
  useRestoreReplacedScroll(routeKey)
  const events = PROTOTYPE_AUDIT_EVENTS
  const [query, setQuery] = useState('')
  const [module, setModule] = useState<'all' | AuditModule>('all')
  const [result, setResult] = useState<'all' | AuditResult>('all')
  const [period, setPeriod] = useState<AuditPeriod>('all')
  const [sort, setSort] = useState<SortState<SortKey>>({ key: 'createdAt', direction: 'descending' })
  const [page, setPage] = useState(1)

  // URL-backed filters: valid values apply; unknown ones are ignored and said so.
  const whitelabelFilter =
    whitelabel === GLOBAL || PROTOTYPE_WHITELABELS.some((item) => item.id === whitelabel) ? (whitelabel as string) : 'all'
  const actorFilter = actor === ANONYMOUS || AUDIT_ACTORS.some((item) => item.id === actor) ? (actor as string) : 'all'
  const actionFilter = isAuditAction(action) ? action : 'all'
  const resourceTypeFilter = isAuditResourceType(resourceType) ? resourceType : undefined
  const ignored = [
    whitelabel && whitelabelFilter === 'all' ? `whitelabel “${whitelabel}”` : null,
    actor && actorFilter === 'all' ? `actor “${actor}”` : null,
    action && actionFilter === 'all' ? `action “${action}”` : null,
    resourceType && !resourceTypeFilter ? `resourceType “${resourceType}”` : null,
  ].filter(Boolean)

  // An unknown resourceType also drops its resourceId: the pair is ignored together.
  const resourceIdFilter = resourceTypeFilter || !resourceType ? resourceId : undefined
  const urlContext = {
    resourceType: resourceTypeFilter,
    resourceId: resourceIdFilter,
    whitelabel: whitelabelFilter === 'all' ? undefined : whitelabelFilter,
    actor: actorFilter === 'all' ? undefined : actorFilter,
    action: actionFilter === 'all' ? undefined : actionFilter,
  }
  const resourceContext = urlContext.resourceType || urlContext.resourceId

  function navigate(next: Parameters<typeof auditListHref>[0]) {
    setPage(1)
    replaceRouteKeepingScroll(auditListHref(next))
  }

  const rows = useMemo(() => {
    const needle = normalize(query)
    const filtered = events.filter((event) => {
      if (resourceTypeFilter && event.resourceType !== resourceTypeFilter) return false
      if (resourceIdFilter && event.resourceId !== resourceIdFilter) return false
      if (whitelabelFilter === GLOBAL ? event.whitelabelId !== null : whitelabelFilter !== 'all' && event.whitelabelId !== whitelabelFilter) {
        return false
      }
      if (actorFilter === ANONYMOUS ? event.actorId !== null : actorFilter !== 'all' && event.actorId !== actorFilter) return false
      if (actionFilter !== 'all' && event.action !== actionFilter) return false
      if (module !== 'all' && event.module !== module) return false
      if (result !== 'all' && event.result !== result) return false
      if (!inPeriod(event.createdAt, period)) return false
      if (!needle) return true
      return normalize(
        [
          event.id,
          event.actorId ?? '',
          actorName(event.actorId),
          event.action,
          AUDIT_ACTION_LABEL[event.action],
          event.resourceId ?? '',
          event.resourceLabel,
          event.correlationId,
        ].join(' '),
      ).includes(needle)
    })
    const direction = sort.direction === 'ascending' ? 1 : -1
    return [...filtered].sort((a, b) => {
      const value =
        sort.key === 'createdAt'
          ? compareDate(a.createdAt, b.createdAt)
          : sort.key === 'id'
            ? compareText(a.id, b.id)
            : sort.key === 'event'
              ? compareText(AUDIT_ACTION_LABEL[a.action], AUDIT_ACTION_LABEL[b.action])
              : sort.key === 'module'
                ? compareText(AUDIT_MODULE_META[a.module].label, AUDIT_MODULE_META[b.module].label)
                : sort.key === 'actor'
                  ? compareText(actorName(a.actorId), actorName(b.actorId))
                  : AUDIT_RESULTS.indexOf(a.result) - AUDIT_RESULTS.indexOf(b.result)
      return direction * value || compareText(b.id, a.id)
    })
  }, [events, query, resourceTypeFilter, resourceIdFilter, whitelabelFilter, actorFilter, actionFilter, module, result, period, sort])

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const current = Math.min(page, pageCount)
  const visible = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)
  const filtersActive =
    Boolean(query.trim()) ||
    module !== 'all' ||
    result !== 'all' ||
    period !== 'all' ||
    Boolean(resourceType || resourceId || whitelabel || actor || action)

  const changed = events.filter((event) => hasChanges(event)).length
  const failures = events.filter((event) => event.result === 'failure').length
  const today = events.filter((event) => inPeriod(event.createdAt, 'today')).length
  const last7 = events.filter((event) => inPeriod(event.createdAt, 'last7')).length

  function update<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value)
      setPage(1)
    }
  }

  function clearFilters() {
    setQuery('')
    setModule('all')
    setResult('all')
    setPeriod('all')
    setPage(1)
    if (resourceType || resourceId || whitelabel || actor || action) replaceRouteKeepingScroll(auditListHref())
  }

  function toggleSort(key: SortKey) {
    setPage(1)
    setSort((currentSort) =>
      currentSort.key !== key
        ? { key, direction: key === 'createdAt' ? 'descending' : 'ascending' }
        : { key, direction: currentSort.direction === 'ascending' ? 'descending' : 'ascending' },
    )
  }

  const sortHeader = (key: SortKey, label: string) => (
    <SortButton label={label} sorted={sort.key === key} direction={sort.direction} onClick={() => toggleSort(key)} />
  )
  const ariaSort = (key: SortKey) => (sort.key === key ? sort.direction : undefined)

  const resourceChipLabel = [
    urlContext.resourceType ? AUDIT_RESOURCE_LABEL[urlContext.resourceType] : 'Recurso',
    urlContext.resourceId ?? null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <AuditShell>
      <PageIntro text="Consulte eventos de governança e alterações relevantes em todos os Whitelabels. Consulta somente leitura." />

      <SummaryCards
        title="Resumo dos eventos de auditoria"
        note={`Contagens dos eventos ilustrativos do protótipo; “Hoje” e “Últimos 7 dias” usam a data de referência ${referenceText}. Não são métricas de produção e o Backend ainda não emite estes eventos.`}
        cards={[
          { label: 'Total de eventos', value: events.length, detail: `${failures} com falha`, icon: FileText, tone: 'blue' },
          { label: 'Com alterações', value: changed, detail: 'Antes / depois registrados', icon: FilePen, tone: 'amber' },
          { label: 'Hoje', value: today, detail: `Referência: ${referenceText}`, icon: CalendarDays, tone: 'teal' },
          { label: 'Últimos 7 dias', value: last7, detail: `Até ${referenceText}`, icon: ChartColumn, tone: 'violet' },
        ]}
      />

      <section className={`${fin.card} ${shared.listCard}`} aria-labelledby="audit-list-title">
        <h2 id="audit-list-title" className="visually-hidden">
          Lista de eventos de auditoria
        </h2>
        <div className={shared.filters} style={{ '--filter-count': 6 } as CSSProperties}>
          <label className={fin.search}>
            <Search size={16} strokeWidth={1.8} aria-hidden="true" />
            <span className="visually-hidden">Buscar por ID do evento, ator, ação, ID do recurso ou correlation ID</span>
            <input
              type="search"
              value={query}
              placeholder="Buscar por evento, ator, ação, recurso ou correlation ID…"
              onChange={(event) => update(setQuery)(event.target.value)}
            />
          </label>
          <div className={shared.filterSelects}>
            <label className={fin.filter}>
              <span className="visually-hidden">Filtrar por Whitelabel</span>
              <select
                value={whitelabelFilter}
                onChange={(event) => navigate({ ...urlContext, whitelabel: event.target.value === 'all' ? undefined : event.target.value })}
                data-filter="whitelabel"
              >
                <option value="all">Todos os Whitelabels</option>
                {PROTOTYPE_WHITELABELS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
                <option value={GLOBAL}>Global (sem Whitelabel)</option>
              </select>
            </label>
            <label className={fin.filter}>
              <span className="visually-hidden">Filtrar por módulo</span>
              <select value={module} onChange={(event) => update(setModule)(event.target.value as 'all' | AuditModule)} data-filter="module">
                <option value="all">Todos os módulos</option>
                {AUDIT_MODULES.map((key) => (
                  <option key={key} value={key}>
                    {AUDIT_MODULE_META[key].label}
                  </option>
                ))}
              </select>
            </label>
            <label className={fin.filter}>
              <span className="visually-hidden">Filtrar por ação</span>
              <select
                value={actionFilter}
                onChange={(event) => navigate({ ...urlContext, action: event.target.value === 'all' ? undefined : event.target.value })}
                data-filter="action"
              >
                <option value="all">Todas as ações</option>
                {AUDIT_ACTIONS.map((key) => (
                  <option key={key} value={key}>
                    {AUDIT_ACTION_LABEL[key]}
                  </option>
                ))}
              </select>
            </label>
            <label className={fin.filter}>
              <span className="visually-hidden">Filtrar por ator</span>
              <select
                value={actorFilter}
                onChange={(event) => navigate({ ...urlContext, actor: event.target.value === 'all' ? undefined : event.target.value })}
                data-filter="actor"
              >
                <option value="all">Todos os atores</option>
                {AUDIT_ACTORS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.id})
                  </option>
                ))}
                <option value={ANONYMOUS}>Não autenticado</option>
              </select>
            </label>
            <label className={fin.filter}>
              <span className="visually-hidden">Filtrar por resultado</span>
              <select value={result} onChange={(event) => update(setResult)(event.target.value as 'all' | AuditResult)} data-filter="result">
                <option value="all">Todos os resultados</option>
                {AUDIT_RESULTS.map((key) => (
                  <option key={key} value={key}>
                    {AUDIT_RESULT_META[key].label}
                  </option>
                ))}
              </select>
            </label>
            <label className={fin.filter}>
              <span className="visually-hidden">Filtrar por período</span>
              <select value={period} onChange={(event) => update(setPeriod)(event.target.value as AuditPeriod)} data-filter="period">
                {(Object.keys(AUDIT_PERIOD_LABEL) as AuditPeriod[]).map((key) => (
                  <option key={key} value={key}>
                    {AUDIT_PERIOD_LABEL[key]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <OutlineButton className={shared.clearButton} onClick={clearFilters} disabled={!filtersActive}>
            <FilterX size={15} strokeWidth={1.8} aria-hidden="true" />
            Limpar filtros
          </OutlineButton>
        </div>

        {resourceContext ? (
          <ContextChip
            dataName="resource"
            label={`Recurso: ${resourceChipLabel}`}
            removeLabel="Remover filtro do recurso"
            onRemove={() => navigate({ ...urlContext, resourceType: undefined, resourceId: undefined })}
          />
        ) : null}

        {ignored.length ? (
          <p className={styles.ignoredNote} role="status" data-ignored-params>
            <Info size={14} strokeWidth={1.8} aria-hidden="true" />
            Filtro da URL não reconhecido e ignorado: {ignored.join(', ')}.
          </p>
        ) : null}

        <SortSelect
          className={styles.sortVisible}
          options={SORT_OPTIONS}
          sort={sort}
          onChange={(next) => {
            setSort(next)
            setPage(1)
          }}
        />

        <div className={fin.tableArea}>
          <table className={`${fin.table} ${shared.table} ${styles.table}`}>
            <caption className="visually-hidden">Eventos de auditoria ilustrativos de todos os Whitelabels (somente leitura)</caption>
            <thead>
              <tr>
                <th scope="col" className={styles.colEvent} aria-sort={ariaSort('id')}>
                  {sortHeader('id', 'Evento / ID')}
                </th>
                <th scope="col" className={styles.colAction} aria-sort={ariaSort('event')}>
                  {sortHeader('event', 'Ação')}
                </th>
                <th scope="col" className={styles.colModule} aria-sort={ariaSort('module')}>
                  {sortHeader('module', 'Módulo / Recurso')}
                </th>
                <th scope="col" className={styles.colWl}>
                  Whitelabel
                </th>
                <th scope="col" className={styles.colActor} aria-sort={ariaSort('actor')}>
                  {sortHeader('actor', 'Ator')}
                </th>
                <th scope="col" className={styles.colResult} aria-sort={ariaSort('result')}>
                  {sortHeader('result', 'Resultado')}
                </th>
                <th scope="col" className={styles.colDate} aria-sort={ariaSort('createdAt')}>
                  {sortHeader('createdAt', 'Data e hora')}
                </th>
                <th scope="col" className={shared.colActions}>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((event) => {
                const href = auditEventHref(event.id)
                const label = AUDIT_ACTION_LABEL[event.action]
                return (
                  <tr key={event.id} className={fin.row} data-audit-event={event.id}>
                    <td className={styles.colEvent}>
                      <span className={shared.cellMain}>
                        <span className={styles.eventIcon}>
                          <ModuleIcon module={event.module} />
                        </span>
                        <span className={shared.cellText}>
                          <a href={href} className={shared.rowLink}>
                            {label}
                          </a>
                          <span className={shared.rowId}>{event.id}</span>
                          <span className={styles.metaAction}>
                            <code className={styles.code}>{event.action}</code>
                          </span>
                          <span className={styles.metaModule}>
                            {AUDIT_MODULE_META[event.module].label} · {event.resourceLabel}
                            {event.resourceId ? ` (${event.resourceId})` : ''}
                          </span>
                          <span className={styles.metaContext}>
                            {whitelabelLabel(event.whitelabelId)} · {actorName(event.actorId)}
                          </span>
                          <span className={styles.metaDate}>{formatDateTime(event.createdAt)}</span>
                          <span className={styles.metaStates}>
                            <ResultPill result={event.result} />
                            <ChangesTag changed={hasChanges(event)} />
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className={styles.colAction}>
                      <span className={shared.cellText}>
                        <code className={styles.code}>{event.action}</code>
                        <ChangesTag changed={hasChanges(event)} />
                      </span>
                    </td>
                    <td className={styles.colModule}>
                      <span className={shared.cellText}>
                        <ModuleTag module={event.module} />
                        <span className={styles.resourceLabel}>{event.resourceLabel}</span>
                        <span className={shared.rowId}>
                          {AUDIT_RESOURCE_LABEL[event.resourceType]}
                          {event.resourceId ? ` · ${event.resourceId}` : ''}
                        </span>
                      </span>
                    </td>
                    <td className={styles.colWl}>
                      <EventWhitelabel whitelabelId={event.whitelabelId} />
                    </td>
                    <td className={styles.colActor}>
                      <ActorCell actorId={event.actorId} />
                    </td>
                    <td className={styles.colResult}>
                      <ResultPill result={event.result} />
                    </td>
                    <td className={styles.colDate}>
                      <DateStack iso={event.createdAt} />
                    </td>
                    <td className={shared.colActions}>
                      <a
                        href={href}
                        className={`${fin.iconButton} ${shared.actionLink}`}
                        aria-label={`Ver evento ${event.id}`}
                        data-open-record={event.id}
                      >
                        <Eye size={15} strokeWidth={1.8} aria-hidden="true" />
                      </a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {visible.length === 0 ? (
            <NoResults
              title="Nenhum evento encontrado"
              description={
                resourceContext
                  ? 'Nenhum evento ilustrativo para este recurso com os filtros atuais. Remova o contexto ou ajuste os filtros.'
                  : 'Ajuste a busca ou os filtros.'
              }
            />
          ) : null}
        </div>

        <div className={shared.footer}>
          <p className={shared.range} aria-live="polite">
            {rows.length
              ? `Mostrando ${(current - 1) * PAGE_SIZE + 1}–${Math.min(current * PAGE_SIZE, rows.length)} de ${rows.length} ${
                  rows.length === 1 ? 'evento' : 'eventos'
                }`
              : 'Nenhum evento'}
            {filtersActive ? ` (filtrados de ${events.length})` : ''}
          </p>
          <Pagination label="Paginação de eventos de auditoria" page={current} pageCount={pageCount} onPage={setPage} />
        </div>
      </section>

      <InfoNote>
        <strong>Auditoria V1 é um módulo de consulta somente leitura.</strong> Não permite editar, excluir, alterar antes / depois, reverter,
        restaurar, reprocessar ou exportar eventos. Os eventos são ilustrativos; ações locais de outros módulos (como o KYC) não geram
        eventos aqui.
      </InfoNote>
    </AuditShell>
  )
}
