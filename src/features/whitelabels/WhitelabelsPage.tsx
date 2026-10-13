import { useEffect, useMemo, useRef, useState } from 'react'
import { Box, Building, ChartNoAxesColumnIncreasing, Link, type LucideIcon } from 'lucide-react'
import { pushRouteKeepingScroll, replaceRouteKeepingScroll, useRestoreReplacedScroll } from '../../app/routeQuery'
import { AppShell } from '../../components/shell/AppShell'
import { usePrototypeNotice } from '../../components/shell/prototypeNotice'
import type { Tone } from '../../components/ui/IconTile'
import { MetricCard } from '../../components/ui/MetricCard'
import { EmptyState } from '../../components/ui/EmptyState'
import { describeApiError } from '../../lib/apiErrors'
import { WhitelabelDetailPanel, WhitelabelDetailStatus } from './WhitelabelDetailPanel'
import { WhitelabelListPanel, type Sort } from './WhitelabelListPanel'
import { DotMatrixBackground } from './visuals/DotMatrixBackground'
import { DEFAULT_WHITELABEL_ACCENT } from './visuals/visualAccent'
import { useWhitelabelDetail, useWhitelabelList } from './useWhitelabelData'
import { WHITELABEL_STATUS_META, type WhitelabelRecord, type WhitelabelStatusFilter } from './whitelabelApi'
import { SEARCH_MAX_LENGTH, parseWhitelabelRoute, whitelabelsHref, type WhitelabelRouteState } from './whitelabelRoute'
import styles from './WhitelabelsPage.module.css'

type WhitelabelsPageProps = {
  accentColor?: string
  /** URL `?id=` — Backend Whitelabel id shown in the detail panel. */
  whitelabelId?: string
  /** URL `?page=`, `?search=`, `?status=` (validated here). */
  page?: string
  search?: string
  status?: string
  /** Raw query string: identity of the URL-backed context (scroll restore). */
  routeKey?: string
}

/**
 * Whitelabels V1 — list + detail for the Plataformas domain, reading the
 * Control Plane (`GET /whitelabels`, `GET /whitelabels/:id`). Read-only:
 * create / edit / activate / deactivate stay unavailable. The summary cards
 * are not integrated yet and keep their data-ready "—" state.
 */
export function WhitelabelsPage({ accentColor = DEFAULT_WHITELABEL_ACCENT, routeKey = '', ...params }: WhitelabelsPageProps) {
  return (
    <AppShell activeNav="plataformas" activeSubNav="whitelabels" title="Whitelabels" location="Whitelabels">
      <WhitelabelsContent accentColor={accentColor} routeKey={routeKey} params={params} />
    </AppShell>
  )
}

const SUMMARY: { id: string; label: string; icon: LucideIcon; tone: Tone }[] = [
  { id: 'total', label: 'Total de plataformas', icon: Building, tone: 'blue' },
  { id: 'active', label: 'Ativos', icon: ChartNoAxesColumnIncreasing, tone: 'teal' },
  { id: 'setup', label: 'Em configuração', icon: Box, tone: 'amber' },
  { id: 'integrations', label: 'Integrações', icon: Link, tone: 'violet' },
]

const MOBILE_QUERY = '(max-width: 767px)'
const SEARCH_DEBOUNCE_MS = 400

function sortRows(rows: WhitelabelRecord[], sort: Sort) {
  if (!sort) return rows
  const value = (row: WhitelabelRecord) =>
    sort.key === 'status'
      ? WHITELABEL_STATUS_META[row.status].label
      : sort.key === 'updatedAt'
        ? (row.updatedAt ?? '')
        : (row[sort.key] ?? '')
  const factor = sort.direction === 'ascending' ? 1 : -1
  return [...rows].sort((a, b) => {
    if (sort.key === 'updatedAt') {
      const comparison = a.updatedAt === null ? (b.updatedAt === null ? 0 : -1)
        : b.updatedAt === null ? 1 : Date.parse(a.updatedAt) - Date.parse(b.updatedAt)
      return factor * comparison
    }
    return factor * value(a).localeCompare(value(b), 'pt-BR')
  })
}

function WhitelabelsContent({
  accentColor,
  routeKey,
  params,
}: {
  accentColor: string
  routeKey: string
  params: { whitelabelId?: string; page?: string; search?: string; status?: string }
}) {
  const notify = usePrototypeNotice()
  useRestoreReplacedScroll(routeKey)

  const { whitelabelId, page: pageParam, search: searchParam, status: statusParam } = params
  const { state: route, ignored } = useMemo(
    () => parseWhitelabelRoute({ id: whitelabelId, page: pageParam, search: searchParam, status: statusParam }),
    [whitelabelId, pageParam, searchParam, statusParam],
  )

  const list = useWhitelabelList({ page: route.page, search: route.search, status: route.status })
  const listData = list.state.status === 'success' ? list.state.data : null
  // A page past the last one is corrected below; until then it is not "empty".
  const pageOutOfRange = listData !== null && listData.rows.length === 0 && listData.total > 0
  const listState = pageOutOfRange ? ({ status: 'loading' } as const) : list.state

  // Local sorting only when the whole (filtered) result is on this page: then it is a complete sort.
  const sortable = listData !== null && listData.lastPage <= 1 && listData.rows.length >= listData.total
  const [sort, setSort] = useState<Sort>(null)
  const rows = useMemo(() => (listData ? (sortable ? sortRows(listData.rows, sort) : listData.rows) : []), [listData, sortable, sort])

  // Detail: the URL id when present, otherwise the first row of the current page (Backend order).
  const selectedId = route.id ?? listData?.rows[0]?.id ?? null
  const detail = useWhitelabelDetail(selectedId)

  function navigate(next: Partial<WhitelabelRouteState>, mode: 'replace' | 'push' = 'replace') {
    const hash = whitelabelsHref({ search: route.search, status: route.status, ...next })
    if (mode === 'push') pushRouteKeepingScroll(hash)
    else replaceRouteKeepingScroll(hash)
  }

  // Clamp an out-of-range page to the last one reported by the Backend.
  useEffect(() => {
    if (!listData) return
    const target = listData.total === 0 ? 1 : Math.min(route.page, listData.lastPage)
    if (target !== route.page) {
      replaceRouteKeepingScroll(whitelabelsHref({ id: route.id, page: target, search: route.search, status: route.status }))
    }
  }, [listData, route.id, route.page, route.search, route.status])

  // Search: typed text is debounced into the URL (and so into `?search=` on the API).
  const [draft, setDraft] = useState(route.search)
  const ownSearch = useRef<string | null>(null)
  useEffect(() => {
    // Back / Forward or a link changed the URL search: show it. Our own update keeps the typed text.
    if (ownSearch.current !== route.search) setDraft(route.search)
    ownSearch.current = null
  }, [route.search])
  useEffect(() => {
    const next = draft.trim().slice(0, SEARCH_MAX_LENGTH)
    if (next === route.search) return
    const timer = window.setTimeout(() => {
      ownSearch.current = next
      replaceRouteKeepingScroll(whitelabelsHref({ search: next, status: route.status }))
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [draft, route.search, route.status])

  // Stacked phone layout: bring the detail panel into view once the chosen row's
  // route renders, and again when its data arrives (the loaded panel is taller
  // than the loading one, so the first scroll may stop short).
  const revealPending = useRef(false)
  const detailSettled = detail.state.status === 'success' || detail.state.status === 'error'
  useEffect(() => {
    if (!revealPending.current) return
    revealDetail()
    if (detailSettled) revealPending.current = false
  }, [routeKey, detailSettled])

  function revealDetail() {
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.requestAnimationFrame(() => {
      const panel = document.getElementById('whitelabel-detail')
      panel?.focus({ preventScroll: true })
      panel?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' })
    })
  }

  function activate(id: string) {
    const mobile = window.matchMedia(MOBILE_QUERY).matches
    if (route.id === id) {
      if (mobile) revealDetail()
      return
    }
    revealPending.current = mobile
    // Each selection is its own history entry: Back / Forward step through selections.
    navigate({ id, page: route.page }, 'push')
  }

  function clearFilters() {
    if (route.search !== '') ownSearch.current = ''
    setDraft('')
    navigate({ search: '', status: 'all' })
  }

  const detailError = detail.state.status === 'error' ? describeApiError(detail.state.error, 'o Whitelabel') : null
  let detailPanel
  let detailAnnouncement: string
  if (detail.state.status === 'success') {
    detailPanel = <WhitelabelDetailPanel whitelabel={detail.state.data} />
    detailAnnouncement = `Detalhes de ${detail.state.data.name} em exibição.`
  } else if (detailError?.notFound && selectedId) {
    detailPanel = <WhitelabelDetailStatus kind="not-found" id={selectedId} />
    detailAnnouncement = 'Whitelabel não encontrado.'
  } else if (detailError) {
    detailPanel = <WhitelabelDetailStatus kind="error" error={detailError} onRetry={detail.reload} />
    detailAnnouncement = 'Não foi possível carregar os detalhes do Whitelabel.'
  } else if (detail.state.status === 'loading' || listState.status === 'loading' || listState.status === 'idle') {
    detailPanel = <WhitelabelDetailStatus kind="loading" />
    detailAnnouncement = 'Carregando detalhes do Whitelabel…'
  } else if (listState.status === 'error') {
    detailPanel = <WhitelabelDetailStatus kind="unavailable" />
    detailAnnouncement = 'Detalhes indisponíveis.'
  } else {
    detailPanel = (
      <section className={styles.noSelection} aria-label="Detalhes do Whitelabel">
        <EmptyState icon={Building} title="Nenhum Whitelabel em exibição" description="Não há resultados para exibir detalhes." />
      </section>
    )
    detailAnnouncement = 'Nenhum Whitelabel em exibição.'
  }

  return (
    <div className={styles.page}>
      <DotMatrixBackground accentColor={accentColor} />
      <section aria-labelledby="wl-summary-heading">
        <h2 id="wl-summary-heading" className="visually-hidden">
          Resumo de whitelabels
        </h2>
        <ul className={styles.summary}>
          {SUMMARY.map((card) => (
            <li key={card.id} className={styles.summaryCell}>
              <MetricCard
                label={card.label}
                icon={card.icon}
                tone={card.tone}
                density="compact"
                onOpen={() =>
                  notify(`O indicador "${card.label}" ainda não está integrado; a lista abaixo já usa dados do Control Plane.`)
                }
              />
            </li>
          ))}
        </ul>
      </section>

      <div className={styles.split}>
        <WhitelabelListPanel
          state={listState}
          lastData={list.lastData}
          rows={rows}
          sortable={sortable}
          onRetry={list.reload}
          page={route.page}
          onPageChange={(page) => navigate({ page })}
          query={draft}
          onQueryChange={setDraft}
          status={route.status}
          onStatusChange={(status: WhitelabelStatusFilter) => navigate({ status })}
          onClearFilters={clearFilters}
          ignored={ignored}
          sort={sort}
          onSortChange={setSort}
          activeId={selectedId ?? undefined}
          onActivate={activate}
          accentColor={accentColor}
        />
        {detailPanel}
      </div>
      <p className="visually-hidden" role="status">
        {detailAnnouncement}
      </p>
    </div>
  )
}
