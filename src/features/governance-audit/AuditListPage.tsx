import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { CircleAlert, Eye, FileText, FilterX, RotateCw, Search, SearchX } from 'lucide-react'
import { replaceRouteKeepingScroll, useRestoreReplacedScroll } from '../../app/routeQuery'
import { useUrlSearchDraft } from '../../app/useUrlSearchDraft'
import { EmptyState } from '../../components/ui/EmptyState'
import { OutlineButton } from '../../components/ui/OutlineButton'
import { describeApiError } from '../../lib/apiErrors'
import fin from '../finance-gateways/sections/FinanceSections.module.css'
import { InfoNote, PageIntro } from '../operation/shared/OperationUi'
import { formatDateTime } from '../operation/shared/operationModel'
import shared from '../operation/shared/Operation.module.css'
import states from '../operation/shared/ReadStates.module.css'
import { WindowedPagination } from '../operation/shared/WindowedPagination'
import type { AuditListResult, AuditOrder, AuditRecord } from './auditApi'
import { actionLabel, actorName, resourceText } from './auditPresent'
import { AUDIT_SEARCH_MAX_LENGTH, AUDIT_FILTER_KEYS, AUDIT_FILTER_LABELS, auditHasFilters, auditEventHref, auditListHref, parseAuditRoute, removeAuditFilter, updateAuditQuery, type AuditRouteParams, type AuditRouteState } from './auditRoute'
import { AuditFilters } from './AuditFilters'
import { ActorCell, AuditShell, EventIcon, EventWhitelabel, ResultPill } from './AuditUi'
import { useAuditList } from './useAuditData'
import styles from './Audit.module.css'

const SKELETON_ROWS = 6
const COUNT_FORMAT = new Intl.NumberFormat('pt-BR')

/**
 * `#/audit` — Auditoria (Governança): the Control Plane audit log, READ-ONLY.
 * Server-side investigation only; nothing is filtered or sorted on the client.
 * No edit, delete, revert, restore, replay, reprocess or export.
 */
export function AuditListPage(props: AuditRouteParams & { routeKey: string }) {
  return (
    <AuditShell>
      <PageIntro text="Investigue logins de operadores e ações administrativas registradas." readOnly />
      <AuditList {...props} />
      <InfoNote>
        <strong>Auditoria é somente leitura.</strong> Os eventos vêm do registro de auditoria do Control Plane e não podem ser editados,
        excluídos, revertidos, restaurados, reprocessados ou exportados aqui. Um evento descreve o que foi registrado — não indica que o
        módulo citado esteja integrado. Eventos de auditoria não são atividade operacional.
      </InfoNote>
    </AuditShell>
  )
}

function AuditList({ routeKey, ...params }: AuditRouteParams & { routeKey: string }) {
  useRestoreReplacedScroll(routeKey)
  const rawQuery = params.rawQuery ?? routeKey
  const { state: route, issues, valid } = useMemo(() => parseAuditRoute({ rawQuery }), [rawQuery])
  const list = useAuditList(valid ? route : null)
  const data = list.state.status === 'success' ? list.state.data : null
  const pageOutOfRange = data !== null && data.rows.length === 0 && data.total > 0
  const loading = list.state.status === 'loading' || list.state.status === 'idle' || pageOutOfRange
  const error = list.state.status === 'error' ? describeApiError(list.state.error, 'os eventos de auditoria') : null
  const [searchError, setSearchError] = useState('')
  const safeSearch = (next: string) => parseAuditRoute({ search: next }).valid

  const search = useUrlSearchDraft({
    urlSearch: route.search,
    urlKey: routeKey,
    maxLength: AUDIT_SEARCH_MAX_LENGTH,
    commit: (next) => {
      if (!safeSearch(next)) { setSearchError('Busca inválida. Não use credenciais ou dados pessoais; nada foi enviado à URL ou ao servidor.'); return }
      setSearchError('')
      replaceRouteKeepingScroll(updateAuditQuery(rawQuery, { search: next, page: 1 }))
    },
  })

  function navigate(next: Partial<AuditRouteState>) {
    const pending = search.pendingSearch()
    if (!safeSearch(pending)) { setSearchError('Corrija a busca antes de continuar.'); return }
    replaceRouteKeepingScroll(updateAuditQuery(rawQuery, { search: pending, page: 1, ...next }))
  }

  // An out-of-range page is replaced by the last page the Control Plane reports.
  useEffect(() => {
    if (!data) return
    const target = data.total === 0 ? 1 : Math.min(route.page, data.lastPage)
    if (target !== route.page) replaceRouteKeepingScroll(auditListHref({ ...route, page: target }))
  }, [data, route])

  const filtersActive = auditHasFilters(route) || search.draft.trim() !== '' || route.order !== 'desc' || issues.length > 0
  function clearFilters() {
    setSearchError('')
    search.clear()
    replaceRouteKeepingScroll(auditListHref())
  }

  const listContext = auditListHref(route)
  const pagerData = data

  return (
    <>
      <section className={`${fin.card} ${styles.summary}`} aria-label="Resumo dos eventos de auditoria">
        <FileText size={20} aria-hidden="true" /><div><h2>Total de eventos{auditHasFilters(route) ? ' da consulta filtrada' : ''}</h2>
        <p aria-live="polite">{data ? COUNT_FORMAT.format(data.total) : '—'} <span> · Total informado pelo Control Plane para a consulta atual</span></p></div>
      </section>

      <section className={`${fin.card} ${shared.listCard}`} aria-labelledby="audit-list-title" data-audit-list>
        <h2 id="audit-list-title" className={shared.listHeading}>
          Lista de eventos de auditoria
        </h2>
        <div className={shared.filters} style={{ '--filter-count': 2 } as CSSProperties}>
          <label className={`${fin.search} ${fin.labeledSearch}`}>
            <span className={fin.controlLabel} aria-hidden="true">Busca</span>
            <Search size={16} strokeWidth={1.8} aria-hidden="true" />
            <span className="visually-hidden">Buscar por código da ação, tipo de recurso, ID do recurso ou Correlation ID (busca feita pelo Control Plane)</span>
            <input
              id="audit-search"
              type="search"
              value={search.draft}
              maxLength={AUDIT_SEARCH_MAX_LENGTH}
              placeholder="Buscar ação, recurso ou Correlation ID…"
              onChange={(event) => search.setDraft(event.target.value)}
            />
          </label>
          <div className={shared.filterSelects}>
            <label className={`${fin.filter} ${fin.labeledFilter}`}>
              <span className={fin.controlLabel} aria-hidden="true">Ordenação</span>
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

        <details className={styles.advanced}>
          <summary>Filtros avançados</summary>
          <AuditFilters key={routeKey} route={route} rawQuery={rawQuery} apply={hash => {
            const pending = search.pendingSearch()
            if (!safeSearch(pending)) { setSearchError('Corrija a busca antes de aplicar os filtros.'); return }
            replaceRouteKeepingScroll(updateAuditQuery(hash.split('?')[1] ?? '', { search: pending, page: 1 }))
          }} />
        </details>
        {searchError ? <p role="alert" className={styles.filterIssues}>{searchError}</p> : null}
        {!valid ? <div role="alert" className={styles.filterIssues} data-invalid-filters>
          <h3>Filtros da URL inválidos ou não suportados</h3><p>Nenhuma consulta foi enviada. Corrija ou remova os filtros para continuar.</p>
          <ul>{issues.map((issue, index) => <li key={`${issue.key}-${index}`}>{issue.message} <button type="button" onClick={() => replaceRouteKeepingScroll(removeAuditFilter(rawQuery, issue.key))}>Remover restrição {index + 1}</button></li>)}</ul>
        </div> : null}
        {valid && filtersActive ? <div className={styles.chips} aria-label="Filtros aplicados" role="status">
          {AUDIT_FILTER_KEYS.filter(key => key !== 'page' && !!route[key] && !(key === 'order' && route.order === 'desc')).map(key => <button type="button" key={key} onClick={() => { if (key === 'search') search.clear(); replaceRouteKeepingScroll(removeAuditFilter(rawQuery, key)) }} aria-label={`Remover ${AUDIT_FILTER_LABELS[key]}`}>
            {AUDIT_FILTER_LABELS[key]}: {key === 'result' ? route.result === 'success' ? 'Sucesso' : 'Falha' : key === 'order' ? 'Mais antigos primeiro' : route[key]} <span aria-hidden="true">×</span>
          </button>)}
        </div> : null}

        {valid ? <><div className={fin.tableArea}>
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
              {auditHasFilters(route) ? (
                <>
                  <EmptyState
                    icon={SearchX}
                    title="Nenhum evento encontrado para os filtros selecionados."
                    description="Altere ou limpe os filtros para consultar outros eventos."
                  />
                  <OutlineButton
                    onClick={clearFilters}
                  >
                    Limpar filtros
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
        )}</> : null}
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
