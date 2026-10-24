import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { ArrowLeft, Briefcase, Building2, CircleAlert, Info, RotateCw, ShieldCheck, TrendingUp } from 'lucide-react'
import { pushRouteKeepingScroll, replaceRouteKeepingScroll, useRestoreReplacedScroll } from '../../app/routeQuery'
import { useUrlSearchDraft } from '../../app/useUrlSearchDraft'
import { AppShell } from '../../components/shell/AppShell'
import { EmptyState } from '../../components/ui/EmptyState'
import { OutlineButton } from '../../components/ui/OutlineButton'
import { Tabs } from '../../components/ui/Tabs'
import { tabId, tabPanelId } from '../../components/ui/tabIds'
import { describeApiError } from '../../lib/apiErrors'
import type { RemoteState } from '../../lib/useRemoteResource'
import { DotMatrixBackground } from '../whitelabels/visuals/DotMatrixBackground'
import { WHITELABEL_STATUS_META, type WhitelabelListResult, type WhitelabelRecord } from '../whitelabels/whitelabelApi'
import states from '../operation/shared/ReadStates.module.css'
import { AccountDetailPanel, AccountDetailStatus } from './AccountDetailPanel'
import { AccountListPanel } from './AccountListPanel'
import { AccountsWhitelabelSelector } from './AccountsWhitelabelSelector'
import { ACCOUNT_KINDS, accountDisplayName, isAccountsWhitelabelId, kindMeta, type AccountKind } from './accountsApi'
import { TYPE_TABS_ID, scopedErrorView } from './accountsPresent'
import { ACCOUNT_SEARCH_MAX_LENGTH, accountsPageHref, parseAccountsRoute, type AccountsRouteState } from './accountsRoute'
import { useAccountDetail, useAccountList, useWhitelabelOptions, useWhitelabelRecord } from './useAccountsData'
import styles from './WhitelabelAccountsPage.module.css'
import { AdminCreateAction } from './admin/AdminLifecycleActions'

const MOBILE_QUERY = '(max-width: 767px)'
const STACKED_TABS_QUERY = '(max-width: 479px)'
const subscribeStackedTabs = (callback: () => void) => {
  const media = window.matchMedia(STACKED_TABS_QUERY)
  media.addEventListener('change', callback)
  return () => media.removeEventListener('change', callback)
}
const getStackedTabs = () => window.matchMedia(STACKED_TABS_QUERY).matches

const TYPE_TABS = ACCOUNT_KINDS.map((item) => ({
  value: item.kind,
  label: item.label,
  icon: item.kind === 'investor' ? TrendingUp : item.kind === 'entrepreneur' ? Briefcase : ShieldCheck,
}))

type WhitelabelAccountsPageProps = {
  /** Path segment: a Core Whitelabel id (numeric). Anything else (e.g. `wl_proto_01`) asks to choose one. */
  whitelabelId: string
  /** URL `?tipo=` / `?page=` / `?search=` / `?conta=` (validated here). */
  tipo?: string
  page?: string
  search?: string
  conta?: string
  /** Raw query string: identity of the URL-backed context (scroll restore, search draft). */
  routeKey?: string
}

/**
 * Contas do Whitelabel — Accounts Read Integration V1. Reads the Control
 * Plane (`GET /whitelabels/:id` to confirm the tenant, `GET
 * /whitelabels/:id/accounts?tipo=…` and `…/accounts/:accountId?tipo=…`).
 * Investors, entrepreneurs and administrators are separate account kinds with
 * separate id spaces. Read-only: no pause / reactivate / change Whitelabel /
 * invite / edit; no KYC or Company data is shown or inferred.
 */
export function WhitelabelAccountsPage({ whitelabelId, routeKey = '', ...params }: WhitelabelAccountsPageProps) {
  const serverId = isAccountsWhitelabelId(whitelabelId) ? whitelabelId : null
  const record = useWhitelabelRecord(serverId)
  // Registry for the selector: kept across tenant switches (the content below remounts per tenant).
  const options = useWhitelabelOptions()
  const whitelabel = record.state.status === 'success' ? record.state.data : null
  const recordError = record.state.status === 'error' ? describeApiError(record.state.error, 'o Whitelabel') : null
  // No tenant crumb while none is chosen (e.g. the prototype `wl_proto_01` default of the side menu).
  const tenantCrumb = whitelabel
    ? { label: whitelabel.name.length > 32 ? `${whitelabel.name.slice(0, 31).trimEnd()}…` : whitelabel.name, href: `#/whitelabels?id=${encodeURIComponent(whitelabel.id)}` }
    : serverId
      ? { label: recordError?.notFound ? 'Whitelabel não encontrado' : `Whitelabel #${serverId}` }
      : null
  return (
    <AppShell
      activeNav="plataformas"
      activeSubNav="contas"
      subNavHrefs={{
        contas: `#/whitelabels/${whitelabelId}/accounts`,
        'whitelabel-settings': `#/whitelabels/${whitelabelId}/settings`,
        'whitelabel-emails': `#/whitelabels/${whitelabelId}/emails`,
        financeiro: `#/whitelabels/${whitelabelId}/finance/gateways`,
      }}
      title="Contas do Whitelabel"
      location="Contas"
      breadcrumbs={[
        { label: 'Plataformas' },
        { label: 'Whitelabels', href: '#/whitelabels' },
        ...(tenantCrumb ? [tenantCrumb] : []),
        { label: 'Contas' },
      ]}
    >
      <AccountsContent
        key={whitelabelId}
        whitelabelId={whitelabelId}
        serverId={serverId}
        whitelabelState={record.state}
        onRetryWhitelabel={record.reload}
        optionsState={options.state}
        onRetryOptions={options.reload}
        routeKey={routeKey}
        params={params}
      />
    </AppShell>
  )
}

function AccountsContent({
  whitelabelId,
  serverId,
  whitelabelState,
  onRetryWhitelabel,
  optionsState,
  onRetryOptions,
  routeKey,
  params,
}: {
  whitelabelId: string
  serverId: string | null
  whitelabelState: RemoteState<WhitelabelRecord>
  onRetryWhitelabel: () => void
  optionsState: RemoteState<WhitelabelListResult>
  onRetryOptions: () => void
  routeKey: string
  params: { tipo?: string; page?: string; search?: string; conta?: string }
}) {
  useRestoreReplacedScroll(routeKey)
  const stackedTabs = useSyncExternalStore(subscribeStackedTabs, getStackedTabs)
  const { tipo, page: pageParam, search: searchParam, conta } = params
  const { state: route, ignored } = useMemo(
    () => parseAccountsRoute({ tipo, page: pageParam, search: searchParam, conta }),
    [tipo, pageParam, searchParam, conta],
  )

  /* ---------- Whitelabel context: registry (selector) + tenant confirmation ---------- */
  const registry = optionsState.status === 'success' ? optionsState.data.rows : null
  const optionsStatus = optionsState.status === 'success' ? 'success' : optionsState.status === 'error' ? 'error' : 'loading'
  const whitelabel = whitelabelState.status === 'success' ? whitelabelState.data : null
  const whitelabelError = whitelabelState.status === 'error' ? describeApiError(whitelabelState.error, 'o Whitelabel') : null

  /* ---------- Accounts (requested in parallel; shown only for the confirmed tenant) ---------- */
  const list = useAccountList(serverId ? { whitelabelId: serverId, kind: route.kind, page: route.page, search: route.search } : null)
  const listData = list.state.status === 'success' ? list.state.data : null
  // A page past the last one is corrected below; until then it is not "empty".
  const pageOutOfRange = listData !== null && listData.rows.length === 0 && listData.total > 0
  const listState: RemoteState<NonNullable<typeof listData>> = !whitelabel || pageOutOfRange ? { status: 'loading' } : list.state

  // Detail: the URL account when present, otherwise the first row of the current page (Backend order).
  const selectedId = route.accountId ?? listData?.rows[0]?.record.id ?? null
  const detail = useAccountDetail(serverId && selectedId ? { whitelabelId: serverId, kind: route.kind, accountId: selectedId } : null)

  function href(next: Partial<AccountsRouteState>) {
    return accountsPageHref(whitelabelId, { kind: route.kind, search: route.search, ...next })
  }

  // Search: typed text is debounced into the URL (and so into `?search=` on the API).
  const search = useUrlSearchDraft({
    urlSearch: route.search,
    urlKey: routeKey,
    maxLength: ACCOUNT_SEARCH_MAX_LENGTH,
    commit: (next) => replaceRouteKeepingScroll(href({ search: next })),
  })

  // Kind / page changes carry the pending search, never the stale URL value.
  function changeKind(kind: AccountKind) {
    replaceRouteKeepingScroll(href({ kind, search: search.pendingSearch() }))
  }
  function changePage(page: number) {
    const pendingSearch = search.pendingSearch()
    replaceRouteKeepingScroll(href({ search: pendingSearch, page: pendingSearch !== route.search ? undefined : page }))
  }
  function clearSearch() {
    search.clear()
    replaceRouteKeepingScroll(href({ search: '' }))
  }

  // Clamp an out-of-range page to the last one reported by the Backend.
  useEffect(() => {
    if (!listData || !serverId) return
    const target = listData.total === 0 ? 1 : Math.min(route.page, listData.lastPage)
    if (target !== route.page) {
      replaceRouteKeepingScroll(
        accountsPageHref(serverId, { kind: route.kind, page: target, search: route.search, accountId: route.accountId }),
      )
    }
  }, [listData, serverId, route.kind, route.page, route.search, route.accountId])

  // Stacked layout: bring the detail into view once the chosen row's route renders,
  // and again when its data arrives (the loaded panel is taller than the loading one).
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
      const panel = document.getElementById('account-detail')
      panel?.focus({ preventScroll: true })
      panel?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' })
    })
  }

  function activate(id: string) {
    const mobile = window.matchMedia(MOBILE_QUERY).matches
    if (selectedId === id && route.accountId === id) {
      if (mobile) revealDetail()
      return
    }
    revealPending.current = mobile
    // Each selection is its own history entry: Back / Forward step through selections.
    pushRouteKeepingScroll(href({ page: route.page, accountId: id }))
  }

  function selectWhitelabel(id: string) {
    // Another tenant is another page: keep the kind, start from its first page.
    pushRouteKeepingScroll(accountsPageHref(id, { kind: route.kind }))
  }

  const selector = (
    <AccountsWhitelabelSelector
      current={whitelabel}
      pendingId={serverId && !whitelabel && !whitelabelError ? serverId : undefined}
      options={registry}
      optionsStatus={optionsStatus}
      onRetryOptions={onRetryOptions}
      onSelect={selectWhitelabel}
    />
  )
  const contextRow = (
    <section className={styles.context} aria-label="Contexto da página">
      <div className={styles.intro}>
        <a href={whitelabel ? `#/whitelabels?id=${encodeURIComponent(whitelabel.id)}` : '#/whitelabels'} className={styles.back}>
          <ArrowLeft size={15} strokeWidth={1.9} aria-hidden="true" />
          Voltar para Whitelabels
        </a>
        <p className={styles.subtitle}>
          Consulte administradores, investidores e empreendedores do Whitelabel selecionado, com dados do Control Plane.
          A gestão de acesso de investidores e empreendedores depende da permissão do operador.
        </p>
      </div>
      {selector}
    </section>
  )

  /* ---------- Tenant not established: choose / not found / error ---------- */
  if (!serverId || whitelabelError) {
    return (
      <div className={styles.page}>
        <DotMatrixBackground />
        <div className={styles.single}>
          {contextRow}
          <div className={styles.notFound} data-whitelabel-state={!serverId ? 'choose' : whitelabelError?.notFound ? 'not-found' : 'error'}>
            {!serverId ? (
              <ChooseWhitelabel
                requestedId={whitelabelId}
                registry={registry}
                status={optionsStatus}
                kind={route.kind}
                onRetry={onRetryOptions}
              />
            ) : whitelabelError?.notFound ? (
              <EmptyState
                icon={Building2}
                title="Whitelabel não encontrado"
                description={
                  <>
                    Nenhum Whitelabel com o ID {serverId} existe no Control Plane.{' '}
                    <a href="#/whitelabels" className={styles.inlineLink}>
                      Voltar para Whitelabels
                    </a>
                  </>
                }
              />
            ) : whitelabelError ? (
              <div className={states.feedback} role="alert">
                <EmptyState icon={CircleAlert} title={whitelabelError.title} description={whitelabelError.description} />
                {whitelabelError.correlationId ? (
                  <p className={states.diagnostic}>
                    Código de diagnóstico: <code className={states.code}>{whitelabelError.correlationId}</code>
                  </p>
                ) : null}
                {whitelabelError.retryable ? (
                  <OutlineButton onClick={onRetryWhitelabel}>
                    <RotateCw size={14} strokeWidth={1.8} aria-hidden="true" />
                    Tentar novamente
                  </OutlineButton>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  /* ---------- Detail region ---------- */
  const meta = kindMeta(route.kind)
  const whitelabelName = whitelabel?.name ?? `Whitelabel #${serverId}`
  const detailError =
    detail.state.status === 'error'
      ? scopedErrorView(detail.state.error, describeApiError(detail.state.error, `o ${meta.singular.toLowerCase()}`), 'detail')
      : null
  let detailPanel
  let announcement: string
  if (whitelabel && detail.state.status === 'success') {
    detailPanel = <AccountDetailPanel detail={detail.state.data} whitelabel={whitelabel} />
    announcement = `Detalhes de ${accountDisplayName(detail.state.data)} em exibição.`
  } else if (detailError?.notFound && selectedId) {
    detailPanel = (
      <AccountDetailStatus
        kind="not-found"
        accountKind={route.kind}
        id={selectedId}
        whitelabelName={whitelabelName}
        onClose={() => replaceRouteKeepingScroll(href({ page: route.page }))}
      />
    )
    announcement = 'Conta não encontrada.'
  } else if (detailError) {
    detailPanel = <AccountDetailStatus kind="error" error={detailError} onRetry={detail.reload} />
    announcement = 'Não foi possível carregar os detalhes da conta.'
  } else if (!whitelabel || detail.state.status === 'loading' || listState.status === 'loading' || listState.status === 'idle') {
    detailPanel = <AccountDetailStatus kind="loading" />
    announcement = 'Carregando detalhes da conta…'
  } else if (listState.status === 'error') {
    detailPanel = <AccountDetailStatus kind="unavailable" />
    announcement = 'Detalhes indisponíveis.'
  } else {
    detailPanel = (
      <AccountDetailStatus
        kind="empty"
        description={route.search ? 'Nenhum resultado para esta busca.' : `Não há ${meta.label.toLowerCase()} em ${whitelabelName}.`}
      />
    )
    announcement = 'Nenhuma conta em exibição.'
  }

  return (
    <div className={styles.page}>
      <DotMatrixBackground />

      <div className={styles.layout}>
        {contextRow}

        <div className={styles.typeRow}>
          <Tabs
            variant="segmented"
            orientation={stackedTabs ? 'vertical' : 'horizontal'}
            idPrefix={TYPE_TABS_ID}
            label="Tipo de conta"
            tabs={TYPE_TABS}
            value={route.kind}
            onChange={changeKind}
            className={styles.typeTabs}
          />
          <p className={styles.readOnly} data-read-only-note>
            <Info size={14} strokeWidth={1.9} aria-hidden="true" />
            {route.kind === 'admin' ? 'Consulta e gestão de administradores' : 'Somente leitura'}
          </p>
        </div>

        <div className={styles.list}>
          {route.kind === 'admin' && whitelabel && <div><AdminCreateAction key={whitelabel.id} whitelabel={whitelabel} /></div>}
          <AccountListPanel
            kind={route.kind}
            whitelabelName={whitelabelName}
            state={listState}
            lastData={list.lastData}
            search={route.search}
            page={route.page}
            onPageChange={changePage}
            query={search.draft}
            onQueryChange={search.setDraft}
            onClearSearch={clearSearch}
            ignored={ignored}
            activeId={selectedId ?? undefined}
            onActivate={activate}
            onRetry={list.reload}
          />
          {/* Inactive type tabs reference panels that are empty while hidden. */}
          {ACCOUNT_KINDS.filter((item) => item.kind !== route.kind).map((item) => (
            <div key={item.kind} role="tabpanel" hidden id={tabPanelId(TYPE_TABS_ID, item.kind)} aria-labelledby={tabId(TYPE_TABS_ID, item.kind)} />
          ))}
        </div>

        <div className={styles.detail}>{detailPanel}</div>
      </div>

      <p className="visually-hidden" role="status">
        {announcement}
      </p>
    </div>
  )
}

/** A non-Core id in the path (e.g. the prototype `wl_proto_01` default): pick a real Whitelabel. */
function ChooseWhitelabel({
  requestedId,
  registry,
  status,
  kind,
  onRetry,
}: {
  requestedId: string
  registry: WhitelabelRecord[] | null
  status: 'loading' | 'error' | 'success'
  kind: AccountKind
  onRetry: () => void
}) {
  return (
    <div className={styles.choose}>
      <EmptyState
        icon={Building2}
        title="Selecione um Whitelabel"
        description={requestedId === 'select' ? 'Escolha um Whitelabel do Control Plane para consultar as contas.' : `“${requestedId.length > 32 ? `${requestedId.slice(0, 32)}…` : requestedId}” não é um Whitelabel do Control Plane. Escolha um Whitelabel para consultar as contas.`}
      />
      {status === 'loading' ? (
        <p className={styles.chooseStatus} role="status">
          Carregando Whitelabels…
        </p>
      ) : status === 'error' ? (
        <div className={states.feedback} role="alert">
          <p className={styles.chooseStatus}>Não foi possível carregar a lista de Whitelabels.</p>
          <OutlineButton onClick={onRetry}>
            <RotateCw size={14} strokeWidth={1.8} aria-hidden="true" />
            Tentar novamente
          </OutlineButton>
        </div>
      ) : registry && registry.length ? (
        <ul className={styles.chooseList} aria-label="Whitelabels do Control Plane">
          {registry.map((row) => (
            <li key={row.id}>
              <a href={accountsPageHref(row.id, { kind })} className={styles.chooseLink} data-choose-whitelabel={row.id}>
                <span className={styles.chooseName}>{row.name}</span>
                <span className={styles.chooseMeta}>
                  {row.domain ?? row.slug} · {WHITELABEL_STATUS_META[row.status].label} · ID {row.id}
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.chooseStatus}>Nenhum Whitelabel cadastrado no Control Plane.</p>
      )}
    </div>
  )
}
