import { useEffect, useMemo, type CSSProperties } from 'react'
import { CalendarDays, ChartColumn, CircleAlert, Eye, FilePen, FileText, FilterX, Info, RotateCw, Search, SearchX } from 'lucide-react'
import { replaceRouteKeepingScroll, useRestoreReplacedScroll } from '../../app/routeQuery'
import { useUrlSearchDraft } from '../../app/useUrlSearchDraft'
import { EmptyState } from '../../components/ui/EmptyState'
import { OutlineButton } from '../../components/ui/OutlineButton'
import { describeApiError } from '../../lib/apiErrors'
import fin from '../finance-gateways/sections/FinanceSections.module.css'
import { InfoNote, PageIntro, SummaryCards } from '../operation/shared/OperationUi'
import { formatDateTime } from '../operation/shared/operationModel'
import shared from '../operation/shared/Operation.module.css'
import states from '../operation/shared/ReadStates.module.css'
import { WindowedPagination } from '../operation/shared/WindowedPagination'
import type { AuditListResult, AuditOrder, AuditRecord } from './auditApi'
import { actionLabel, actorName, resourceText } from './auditPresent'
import { AUDIT_SEARCH_MAX_LENGTH, auditEventHref, auditListHref, parseAuditRoute, type AuditRouteParams, type AuditRouteState } from './auditRoute'
import { ActorCell, AuditShell, EventIcon, EventWhitelabel, ResultPill } from './AuditUi'
import { useAuditList } from './useAuditData'
import styles from './Audit.module.css'

const SKELETON_ROWS = 6
const COUNT_FORMAT = new Intl.NumberFormat('pt-BR')

/**
 * `#/audit` — Auditoria (Governança): the Control Plane audit log, READ-ONLY.
 * Server-side page, search (action / resource type / resource id) and date
 * order are the only supported operations; nothing is filtered or sorted on
 * the client. No edit, delete, revert, restore, replay, reprocess or export.
 */
export function AuditListPage(props: AuditRouteParams & { routeKey: string }) {
  return (
    <AuditShell>
      <PageIntro text="Consulte o registro de auditoria do Control Plane (logins de operadores e ações administrativas registradas). Consulta somente leitura." />
      <AuditList {...props} />
      <InfoNote>
        <strong>Auditoria é somente leitura.</strong> Os eventos vêm do registro de auditoria do Control Plane e não podem ser editados,
        excluídos, revertidos, restaurados, reprocessados ou exportados aqui. Um evento descreve o que foi registrado — não indica que o
        módulo citado esteja integrado. Eventos de auditoria não são atividade operacional.
      </InfoNote>
    </AuditShell>
  )
}

function AuditList({ routeKey, page, search: searchParam, order, resourceType, resourceId, whitelabel, actor, action }: AuditRouteParams & { routeKey: string }) {
  useRestoreReplacedScroll(routeKey)
  const { state: route, ignored } = useMemo(
    () => parseAuditRoute({ page, search: searchParam, order, resourceType, resourceId, whitelabel, actor, action }),
    [page, searchParam, order, resourceType, resourceId, whitelabel, actor, action],
  )
  const list = useAuditList({ page: route.page, search: route.search, order: route.order })
  const data = list.state.status === 'success' ? list.state.data : null
  const pageOutOfRange = data !== null && data.rows.length === 0 && data.total > 0
  const loading = list.state.status === 'loading' || list.state.status === 'idle' || pageOutOfRange
  const error = list.state.status === 'error' ? describeApiError(list.state.error, 'os eventos de auditoria') : null

  const search = useUrlSearchDraft({
    urlSearch: route.search,
    urlKey: routeKey,
    maxLength: AUDIT_SEARCH_MAX_LENGTH,
    commit: (next) => replaceRouteKeepingScroll(auditListHref({ order: route.order, search: next })),
  })

  function navigate(next: Partial<AuditRouteState>) {
    replaceRouteKeepingScroll(auditListHref({ order: route.order, search: search.pendingSearch(), ...next }))
  }

  // An out-of-range page is replaced by the last page the Control Plane reports.
  useEffect(() => {
    if (!data) return
    const target = data.total === 0 ? 1 : Math.min(route.page, data.lastPage)
    if (target !== route.page) replaceRouteKeepingScroll(auditListHref({ order: route.order, search: route.search, page: target }))
  }, [data, route.page, route.search, route.order])

  const filtersActive = route.search !== '' || search.draft.trim() !== '' || route.order !== 'desc' || ignored.length > 0
  function clearFilters() {
    search.clear()
    replaceRouteKeepingScroll(auditListHref())
  }

  const listContext = auditListHref(route)
  const pagerData = data ?? list.lastData

  return (
    <>
      <SummaryCards
        title="Resumo dos eventos de auditoria"
        note="Total informado pelo Control Plane para a consulta atual. Os demais indicadores não têm contagem no Control Plane e aguardam integração; nenhum valor ilustrativo é exibido."
        cards={[
          {
            label: 'Total de eventos',
            value: data ? COUNT_FORMAT.format(data.total) : null,
            detail: route.search ? 'Resultado da busca' : 'Registro do Control Plane',
            icon: FileText,
            tone: 'blue',
          },
          { label: 'Com alterações', value: null, detail: 'Sem contagem agregada no Control Plane', icon: FilePen, tone: 'amber' },
          { label: 'Hoje', value: null, detail: 'Sem contagem agregada no Control Plane', icon: CalendarDays, tone: 'teal' },
          { label: 'Últimos 7 dias', value: null, detail: 'Sem contagem agregada no Control Plane', icon: ChartColumn, tone: 'violet' },
        ]}
      />

      <section className={`${fin.card} ${shared.listCard}`} aria-labelledby="audit-list-title" data-audit-list>
        <h2 id="audit-list-title" className="visually-hidden">
          Lista de eventos de auditoria
        </h2>
        <div className={shared.filters} style={{ '--filter-count': 2 } as CSSProperties}>
          <label className={fin.search}>
            <Search size={16} strokeWidth={1.8} aria-hidden="true" />
            <span className="visually-hidden">Buscar por código da ação, tipo de recurso ou ID do recurso (busca feita pelo Control Plane)</span>
            <input
              id="audit-search"
              type="search"
              value={search.draft}
              maxLength={AUDIT_SEARCH_MAX_LENGTH}
              placeholder="Buscar por código da ação, tipo ou ID do recurso…"
              onChange={(event) => search.setDraft(event.target.value)}
            />
          </label>
          <div className={shared.filterSelects}>
            <label className={fin.filter}>
              <span className="visually-hidden">Ordem por data e hora</span>
              <select id="audit-order" value={route.order} onChange={(event) => navigate({ order: event.target.value as AuditOrder })}>
                <option value="desc">Mais recentes primeiro</option>
                <option value="asc">Mais antigos primeiro</option>
              </select>
            </label>
          </div>
          <OutlineButton className={shared.clearButton} onClick={clearFilters} disabled={!filtersActive}>
            <FilterX size={15} strokeWidth={1.8} aria-hidden="true" />
            Limpar filtros
          </OutlineButton>
        </div>

        {ignored.length ? (
          <p className={styles.ignoredNote} role="status" data-ignored-params>
            <Info size={14} strokeWidth={1.8} aria-hidden="true" />
            Filtro da URL não suportado pelo Control Plane e ignorado: {ignored.join(', ')}. A lista mostra todos os eventos da consulta.
          </p>
        ) : null}

        <div className={fin.tableArea}>
          {error ? (
            <div className={states.feedback} role="alert" data-list-error>
              <EmptyState icon={CircleAlert} title={error.title} description={error.description} />
              {error.correlationId ? (
                <p className={states.diagnostic}>
                  Código de diagnóstico: <code className={states.code}>{error.correlationId}</code>
                </p>
              ) : null}
              {error.retryable ? (
                <OutlineButton onClick={list.reload}>
                  <RotateCw size={14} strokeWidth={1.8} aria-hidden="true" />
                  Tentar novamente
                </OutlineButton>
              ) : null}
            </div>
          ) : (
            <table className={`${fin.table} ${shared.table} ${styles.table}`} aria-busy={loading || undefined}>
              <caption className="visually-hidden">
                Eventos de auditoria do Control Plane (somente leitura), ordenados por data e hora,{' '}
                {route.order === 'asc' ? 'mais antigos primeiro' : 'mais recentes primeiro'}
                {data ? `, página ${data.page} de ${data.lastPage}` : ''}.
              </caption>
              <thead>
                <tr>
                  <th scope="col" className={styles.colEvent}>
                    Evento / ID
                  </th>
                  <th scope="col" className={styles.colAction}>
                    Código da ação
                  </th>
                  <th scope="col" className={styles.colModule}>
                    Recurso
                  </th>
                  <th scope="col" className={styles.colWl}>
                    Whitelabel
                  </th>
                  <th scope="col" className={styles.colActor}>
                    Ator
                  </th>
                  <th scope="col" className={styles.colResult}>
                    Resultado
                  </th>
                  <th scope="col" className={styles.colDate} aria-sort={route.order === 'asc' ? 'ascending' : 'descending'}>
                    Data e hora
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
                        <td className={styles.colEvent}>
                          <span className={`${states.skeleton} ${states.skeletonWide}`} />
                        </td>
                        {[styles.colAction, styles.colModule, styles.colWl, styles.colActor, styles.colResult, styles.colDate, shared.colActions].map(
                          (className) => (
                            <td key={className} className={className}>
                              <span className={states.skeleton} />
                            </td>
                          ),
                        )}
                      </tr>
                    ))
                  : data?.rows.map((record) => <AuditRow key={record.id} record={record} listContext={listContext} />)}
              </tbody>
            </table>
          )}

          {!error && data && !loading && data.rows.length === 0 ? (
            <div className={states.feedback} data-list-empty>
              {route.search ? (
                <>
                  <EmptyState
                    icon={SearchX}
                    title="Nenhum evento encontrado"
                    description="O Control Plane não encontrou eventos cujo código da ação, tipo ou ID do recurso contenha esta busca."
                  />
                  <OutlineButton
                    onClick={() => {
                      search.clear()
                      replaceRouteKeepingScroll(auditListHref({ order: route.order }))
                    }}
                  >
                    Limpar busca
                  </OutlineButton>
                </>
              ) : (
                <EmptyState icon={FileText} title="Nenhum evento registrado" description="O registro de auditoria do Control Plane está vazio." />
              )}
            </div>
          ) : null}
        </div>

        {error ? null : (
          <div className={shared.footer}>
            <p className={shared.range} aria-live="polite">
              {data && !loading
                ? data.total === 0
                  ? 'Nenhum evento'
                  : `Mostrando ${rangeLabel(data)} de ${COUNT_FORMAT.format(data.total)} ${data.total === 1 ? 'evento' : 'eventos'}`
                : 'Carregando eventos…'}
              <span className={states.pending}> · Registro de auditoria do Control Plane</span>
            </p>
            {pagerData && pagerData.lastPage > 1 ? (
              <WindowedPagination
                label="Paginação de eventos de auditoria"
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

function rangeLabel(data: AuditListResult) {
  const from = (data.page - 1) * data.perPage + 1
  const to = from + data.rows.length - 1
  return from === to ? COUNT_FORMAT.format(from) : `${COUNT_FORMAT.format(from)}–${COUNT_FORMAT.format(to)}`
}

function AuditRow({ record, listContext }: { record: AuditRecord; listContext: string }) {
  const href = auditEventHref(record.id, listContext)
  const label = actionLabel(record.action)
  const resource = resourceText(record)
  const when = formatDateTime(record.createdAt) ?? '—'
  return (
    <tr className={fin.row} data-audit-event={record.id}>
      <td className={styles.colEvent}>
        <span className={shared.cellMain}>
          <span className={styles.eventIcon}>
            <EventIcon />
          </span>
          <span className={shared.cellText}>
            <a href={href} className={shared.rowLink}>
              {label}
            </a>
            <span className={shared.rowId}>{record.id}</span>
            <span className={styles.metaAction}>
              <code className={styles.code}>{record.action}</code>
            </span>
            <span className={styles.metaModule}>{resource ?? 'Sem recurso registrado'}</span>
            <span className={styles.metaContext}>
              {record.whitelabelId ? `Whitelabel ID ${record.whitelabelId}` : 'Sem Whitelabel'} · {actorName(record)}
            </span>
            <span className={styles.metaDate}>{when}</span>
            <span className={styles.metaStates}>
              <ResultPill result={record.result} />
            </span>
          </span>
        </span>
      </td>
      <td className={styles.colAction}>
        <code className={styles.code}>{record.action}</code>
      </td>
      <td className={styles.colModule}>{resource ?? <span className={shared.muted}>Sem recurso registrado</span>}</td>
      <td className={styles.colWl}>
        <EventWhitelabel whitelabelId={record.whitelabelId} />
      </td>
      <td className={styles.colActor}>
        <ActorCell record={record} />
      </td>
      <td className={styles.colResult}>
        <ResultPill result={record.result} />
      </td>
      <td className={`${styles.colDate} ${shared.dateCell}`}>{when}</td>
      <td className={shared.colActions}>
        <a href={href} className={`${fin.iconButton} ${shared.actionLink}`} aria-label={`Ver evento ${record.id}`} data-open-record={record.id}>
          <Eye size={15} strokeWidth={1.8} aria-hidden="true" />
        </a>
      </td>
    </tr>
  )
}
