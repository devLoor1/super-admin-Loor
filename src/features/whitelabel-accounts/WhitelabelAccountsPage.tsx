import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { ArrowLeft, Briefcase, Building2, ShieldCheck, TrendingUp, UserPlus, UsersRound } from 'lucide-react'
import { AppShell } from '../../components/shell/AppShell'
import { usePrototypeNotice } from '../../components/shell/prototypeNotice'
import { EmptyState } from '../../components/ui/EmptyState'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { Tabs } from '../../components/ui/Tabs'
import { tabId, tabPanelId } from '../../components/ui/tabIds'
import { DotMatrixBackground } from '../whitelabels/visuals/DotMatrixBackground'
import { PROTOTYPE_WHITELABELS, type Whitelabel } from '../whitelabels/prototypeWhitelabels'
import { AccountDetailPanel } from './AccountDetailPanel'
import { AccountListPanel } from './AccountListPanel'
import { TYPE_TABS_ID, type AccessFilter, type Sort } from './accountListConfig'
import {
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_LABEL,
  normalize,
  type Account,
  type AccountEvent,
  type AccountType,
  type AdminAccount,
} from './accountModel'
import { PROTOTYPE_ACCOUNTS, adminDependencies } from './prototypeAccounts'
import { useWhitelabelSettings } from '../whitelabel-settings/settingsStore'
import { PauseAccessDialog, ReactivateAccessDialog } from './dialogs/AccessDialogs'
import { ChangeWhitelabelDialog } from './dialogs/ChangeWhitelabelDialog'
import { NewAdminDialog, type NewAdminInput } from './dialogs/NewAdminDialog'
import { WhitelabelContextSelector } from './WhitelabelContextSelector'
import styles from './WhitelabelAccountsPage.module.css'

const PAGE_SIZE = 8
const MOBILE_QUERY = '(max-width: 767px)'
const STACKED_TABS_QUERY = '(max-width: 479px)'
const subscribeStackedTabs = (callback: () => void) => {
  const media = window.matchMedia(STACKED_TABS_QUERY)
  media.addEventListener('change', callback)
  return () => media.removeEventListener('change', callback)
}
const getStackedTabs = () => window.matchMedia(STACKED_TABS_QUERY).matches

const TYPE_TABS = ACCOUNT_TYPES.map((type) => ({
  value: type.value,
  label: type.label,
  icon: type.value === 'investor' ? TrendingUp : type.value === 'entrepreneur' ? Briefcase : ShieldCheck,
}))

type DialogState =
  | { kind: 'pause' | 'reactivate' | 'transfer'; accountId: string }
  | { kind: 'new-admin' }
  | null

/**
 * Whitelabel Account Control V1 — tenant-first account management.
 *
 * Frontend-only prototype: illustrative accounts, local filters, local
 * pause/reactivate, a simulated Whitelabel change and a local Admin form.
 * Nothing is fetched, persisted, authorized or sent to a Backend.
 */
export function WhitelabelAccountsPage({ whitelabelId, initialType }: { whitelabelId: string; initialType?: AccountType }) {
  const whitelabel = PROTOTYPE_WHITELABELS.find((item) => item.id === whitelabelId)
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
        { label: whitelabel?.name ?? 'Whitelabel não encontrado' },
        { label: 'Contas' },
      ]}
    >
      {whitelabel ? (
        <AccountsContent whitelabel={whitelabel} initialType={initialType} />
      ) : (
        <div className={styles.notFound}>
          <EmptyState
            icon={Building2}
            title="Whitelabel não encontrado"
            description={
              <>
                Nenhum Whitelabel ilustrativo usa o ID “{whitelabelId}”.{' '}
                <a href="#/whitelabels" className={styles.inlineLink}>
                  Voltar para Whitelabels
                </a>
              </>
            }
          />
        </div>
      )}
    </AppShell>
  )
}

function AccountsContent({ whitelabel, initialType }: { whitelabel: Whitelabel; initialType?: AccountType }) {
  const notify = usePrototypeNotice()
  const settings = useWhitelabelSettings(whitelabel.id)
  // Local prototype state for every illustrative Whitelabel (survives context switches).
  const [accounts, setAccounts] = useState<Account[]>(PROTOTYPE_ACCOUNTS)
  const [events, setEvents] = useState<Record<string, AccountEvent[]>>({})
  const [type, setType] = useState<AccountType>(initialType ?? 'investor')
  const [query, setQuery] = useState('')
  const [access, setAccess] = useState<AccessFilter>('all')
  const [business, setBusiness] = useState('all')
  const [sort, setSort] = useState<Sort>(null)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Record<string, string>>({})
  const [dialog, setDialog] = useState<DialogState>(null)
  const sequence = useRef(0)
  const pendingActionFocus = useRef<string | null>(null)
  const stackedTabs = useSyncExternalStore(subscribeStackedTabs, getStackedTabs)
  const focusDisplayedActions = useCallback((id: string) => {
    if (pendingActionFocus.current !== id) return
    document.querySelector<HTMLElement>('#account-detail [data-access-action]')?.focus({ preventScroll: true })
    pendingActionFocus.current = null
  }, [])

  // A new `?tipo=` from navigation selects that tab; a new Whitelabel resets paging.
  const [previous, setPrevious] = useState({ initialType, whitelabelId: whitelabel.id })
  if (previous.initialType !== initialType || previous.whitelabelId !== whitelabel.id) {
    setPrevious({ initialType, whitelabelId: whitelabel.id })
    if (initialType && previous.initialType !== initialType) {
      setType(initialType)
      setBusiness('all')
    }
    setPage(1)
  }

  const scoped = useMemo(
    () => accounts.filter((account) => account.whitelabelId === whitelabel.id && account.type === type),
    [accounts, whitelabel.id, type],
  )

  const rows = useMemo(() => {
    const needle = normalize(query)
    const digits = query.replace(/\D/g, '')
    const filtered = scoped.filter((account) => {
      if (access !== 'all' && account.accessState !== access) return false
      if (business !== 'all') {
        const value =
          account.type === 'investor' ? account.validation : account.type === 'entrepreneur' ? account.company.validation : account.role
        if (value !== business) return false
      }
      if (!needle) return true
      const fields = [account.name, account.email, account.id]
      const documents = [account.document, account.type === 'entrepreneur' ? account.company.document : null]
      return (
        fields.some((field) => normalize(field).includes(needle)) ||
        (digits.length >= 3 && documents.some((document) => document?.replace(/\D/g, '').includes(digits)))
      )
    })
    if (!sort) return filtered
    const factor = sort.direction === 'ascending' ? 1 : -1
    return [...filtered].sort((a, b) => {
      if (sort.key === 'name') return factor * a.name.localeCompare(b.name, 'pt-BR')
      // Missing activity sorts last in both directions.
      if (!a.lastActivityAt) return b.lastActivityAt ? 1 : 0
      if (!b.lastActivityAt) return -1
      return factor * a.lastActivityAt.localeCompare(b.lastActivityAt)
    })
  }, [scoped, query, access, business, sort])

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const selectionKey = `${whitelabel.id}:${type}`
  const active = pageRows.find((row) => row.id === selected[selectionKey]) ?? pageRows[0]
  const dialogAccount = dialog && dialog.kind !== 'new-admin' ? accounts.find((item) => item.id === dialog.accountId) : undefined

  function resetPaging<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value)
      setPage(1)
    }
  }

  function changeType(value: AccountType) {
    setType(value)
    setBusiness('all')
    setPage(1)
  }

  function clearFilters() {
    setQuery('')
    setAccess('all')
    setBusiness('all')
    setPage(1)
  }

  function activate(id: string, focusActions = false) {
    pendingActionFocus.current = focusActions ? id : null
    setSelected((current) => ({ ...current, [selectionKey]: id }))
    window.requestAnimationFrame(() => {
      const detail = document.getElementById('account-detail')
      if (window.matchMedia(MOBILE_QUERY).matches) {
        const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
        detail?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' })
      }
      if (focusActions && document.getElementById('acc-detail-title')?.dataset.accountId === id) {
        // Same identity: no transition/mount is needed for the focus handoff.
        focusDisplayedActions(id)
      }
    })
  }

  function addEvent(accountId: string, event: Omit<AccountEvent, 'id' | 'at'>) {
    sequence.current += 1
    const entry: AccountEvent = { ...event, id: `evt_local_${sequence.current}`, at: new Date().toISOString() }
    setEvents((current) => ({ ...current, [accountId]: [entry, ...(current[accountId] ?? [])] }))
  }

  function updateAccount(accountId: string, change: (account: Account) => Account) {
    setAccounts((current) => current.map((account) => (account.id === accountId ? change(account) : account)))
  }

  function pause(account: Account, reason: string) {
    updateAccount(account.id, (item) => ({ ...item, accessState: 'paused' }))
    addEvent(account.id, { kind: 'paused', title: 'Acesso pausado', reason })
    setDialog(null)
    notify(`Acesso de ${account.name} pausado neste protótipo. Backend: implementação pendente.`)
  }

  function reactivate(account: Account, note: string) {
    updateAccount(account.id, (item) => ({ ...item, accessState: 'active' }))
    addEvent(account.id, { kind: 'reactivated', title: 'Acesso reativado', reason: note || undefined })
    setDialog(null)
    notify(`Acesso de ${account.name} reativado neste protótipo. Os demais estados não mudaram.`)
  }

  function simulateTransfer(account: Account, destinationId: string, reason: string) {
    const destination = PROTOTYPE_WHITELABELS.find((item) => item.id === destinationId)
    updateAccount(account.id, (item) => ({
      ...item,
      transferRequest: { toWhitelabelId: destinationId, requestedAt: new Date().toISOString() },
    }))
    addEvent(account.id, {
      kind: 'transfer_requested',
      title: `Alteração de Whitelabel simulada: ${whitelabel.name} → ${destination?.name ?? destinationId} (nada foi migrado)`,
      reason,
    })
  }

  function discardTransfer(account: Account) {
    updateAccount(account.id, (item) => ({ ...item, transferRequest: undefined }))
    addEvent(account.id, { kind: 'transfer_requested', title: 'Simulação de alteração de Whitelabel descartada' })
    notify(`Simulação de alteração de Whitelabel de ${account.name} descartada.`)
  }

  function createAdmin(input: NewAdminInput) {
    sequence.current += 1
    const id = `adm_local_${String(sequence.current).padStart(3, '0')}`
    const account: AdminAccount = {
      id,
      type: 'admin',
      whitelabelId: whitelabel.id,
      name: input.name,
      email: input.email,
      document: null,
      phone: null,
      accessState: input.accessState,
      createdAt: new Date().toISOString(),
      lastActivityAt: null,
      role: input.role,
      invitation: 'pending',
      dependencies: adminDependencies('pending'),
    }
    setAccounts((current) => [...current, account])
    addEvent(id, { kind: 'created', title: 'Administrador adicionado ao protótipo (convite pendente, nenhum e-mail enviado)' })
    // Show the new row: clear filters, jump to its page and select it.
    const adminCount = accounts.filter((item) => item.whitelabelId === whitelabel.id && item.type === 'admin').length + 1
    setQuery('')
    setAccess('all')
    setBusiness('all')
    setSort(null)
    setPage(Math.ceil(adminCount / PAGE_SIZE))
    setSelected((current) => ({ ...current, [`${whitelabel.id}:admin`]: id }))
    setDialog(null)
    notify(`${input.name} adicionado localmente a ${whitelabel.name}. Nenhum convite foi enviado.`)
  }

  const focusAccessAction = () => document.querySelector<HTMLElement>('#account-detail [data-access-action]')

  return (
    <div className={styles.page}>
      <DotMatrixBackground />

      <div className={styles.layout}>
        <section className={styles.context} aria-label="Contexto da página">
          <div className={styles.intro}>
            <a href="#/whitelabels" className={styles.back}>
              <ArrowLeft size={15} strokeWidth={1.9} aria-hidden="true" />
              Voltar para Whitelabels
            </a>
            <p className={styles.subtitle}>
              Gerencie administradores, investidores e empreendedores do Whitelabel selecionado.
            </p>
          </div>
          <WhitelabelContextSelector
            current={whitelabel}
            options={PROTOTYPE_WHITELABELS}
            onSelect={(id) => {
              window.location.hash = `#/whitelabels/${id}/accounts`
            }}
          />
        </section>

        <div className={styles.typeRow}>
          <Tabs
            variant="segmented"
            orientation={stackedTabs ? 'vertical' : 'horizontal'}
            idPrefix={TYPE_TABS_ID}
            label="Tipo de conta"
            tabs={TYPE_TABS}
            value={type}
            onChange={changeType}
            className={styles.typeTabs}
          />
          {type === 'admin' ? (
            <PrimaryButton className={styles.newAdmin} onClick={() => setDialog({ kind: 'new-admin' })}>
              <UserPlus size={18} strokeWidth={1.9} aria-hidden="true" />
              Novo administrador
            </PrimaryButton>
          ) : null}
        </div>

        <div className={styles.list}>
          <AccountListPanel
            type={type}
            whitelabelName={whitelabel.name}
            rows={pageRows}
            filteredCount={rows.length}
            scopedCount={scoped.length}
            rangeStart={rows.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}
            rangeEnd={Math.min(currentPage * PAGE_SIZE, rows.length)}
            page={currentPage}
            pageCount={pageCount}
            onPageChange={setPage}
            query={query}
            onQueryChange={resetPaging(setQuery)}
            access={access}
            onAccessChange={resetPaging(setAccess)}
            business={business}
            onBusinessChange={resetPaging(setBusiness)}
            sort={sort}
            onSortChange={setSort}
            activeId={active?.id}
            onActivate={(id) => activate(id)}
            onOpenActions={(id) => activate(id, true)}
            onClearFilters={clearFilters}
          />
          {/* Inactive type tabs reference panels that are empty while hidden. */}
          {ACCOUNT_TYPES.filter((item) => item.value !== type).map((item) => (
            <div
              key={item.value}
              role="tabpanel"
              hidden
              id={tabPanelId(TYPE_TABS_ID, item.value)}
              aria-labelledby={tabId(TYPE_TABS_ID, item.value)}
            />
          ))}
        </div>

        <div className={styles.detail}>
          {active ? (
            <AccountDetailPanel
              account={active}
              whitelabel={whitelabel}
              whitelabels={PROTOTYPE_WHITELABELS}
              events={events[active.id] ?? []}
              currentTermsRevision={settings?.terms.current?.revision ?? null}
              onPause={() => setDialog({ kind: 'pause', accountId: active.id })}
              onReactivate={() => setDialog({ kind: 'reactivate', accountId: active.id })}
              onTransfer={() => setDialog({ kind: 'transfer', accountId: active.id })}
              onDiscardTransfer={() => discardTransfer(active)}
              onNotify={notify}
              onDisplay={focusDisplayedActions}
            />
          ) : (
            <section id="account-detail" className={styles.noSelection} aria-label="Detalhes da conta" tabIndex={-1}>
              <EmptyState
                icon={UsersRound}
                title="Nenhuma conta em exibição"
                description={
                  scoped.length
                    ? 'Ajuste a busca ou os filtros para consultar os detalhes de uma conta ilustrativa.'
                    : `Não há ${ACCOUNT_TYPE_LABEL[type].label.toLowerCase()} ilustrativos em ${whitelabel.name}.`
                }
              />
            </section>
          )}
        </div>
      </div>

      <p className="visually-hidden" role="status">
        {active ? `Detalhes de ${active.name} em exibição.` : 'Nenhuma conta em exibição.'}
      </p>

      {dialog?.kind === 'pause' && dialogAccount ? (
        <PauseAccessDialog
          account={dialogAccount}
          whitelabel={whitelabel}
          onCancel={() => setDialog(null)}
          onConfirm={(reason) => pause(dialogAccount, reason)}
          fallbackFocus={focusAccessAction}
        />
      ) : null}
      {dialog?.kind === 'reactivate' && dialogAccount ? (
        <ReactivateAccessDialog
          account={dialogAccount}
          whitelabel={whitelabel}
          onCancel={() => setDialog(null)}
          onConfirm={(note) => reactivate(dialogAccount, note)}
          fallbackFocus={focusAccessAction}
        />
      ) : null}
      {dialog?.kind === 'transfer' && dialogAccount ? (
        <ChangeWhitelabelDialog
          account={dialogAccount}
          whitelabel={whitelabel}
          whitelabels={PROTOTYPE_WHITELABELS}
          onCancel={() => setDialog(null)}
          onConfirm={(destinationId, reason) => simulateTransfer(dialogAccount, destinationId, reason)}
          fallbackFocus={() => document.querySelector<HTMLElement>('#account-detail [data-transfer-action]')}
        />
      ) : null}
      {dialog?.kind === 'new-admin' ? (
        <NewAdminDialog
          whitelabel={whitelabel}
          existingEmails={accounts.filter((item) => item.whitelabelId === whitelabel.id).map((item) => item.email)}
          onCancel={() => setDialog(null)}
          onCreate={createAdmin}
        />
      ) : null}
    </div>
  )
}
