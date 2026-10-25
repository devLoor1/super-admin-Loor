import { useCallback, useMemo, useState } from 'react'
import { ArrowLeft, Building2, Link2 } from 'lucide-react'
import { useUnsavedChangesGuard } from '../../app/useUnsavedChangesGuard'
import { AppShell } from '../../components/shell/AppShell'
import { usePrototypeNotice } from '../../components/shell/prototypeNotice'
import { DetailTransition } from '../../components/ui/DetailTransition'
import { EmptyState } from '../../components/ui/EmptyState'
import { DotMatrixBackground } from '../whitelabels/visuals/DotMatrixBackground'
import { PROTOTYPE_WHITELABELS, type Whitelabel } from '../whitelabels/prototypeWhitelabels'
import { WhitelabelContextSelector } from '../whitelabel-accounts/WhitelabelContextSelector'
import { UnsavedChangesDialog } from '../whitelabel-settings/dialogs/UnsavedChangesDialog'
import { BankAccountDialog, ConfirmBankAccountDialog } from './dialogs/BankAccountDialogs'
import { NewGatewayDialog } from './dialogs/GatewayDialogs'
import {
  FINANCE_DRAFT_LABEL,
  GATEWAY_DRAFT_KEYS,
  bankName,
  displayStatusOf,
  maskPix,
  maskedAccount,
  providerOf,
  type BankAccount,
  type BankAccountDraft,
  type FinanceDraftKey,
} from './financeModel'
import { addFinanceActivity, nextLocalId, updateFinanceSettings, useFinanceActivity, useFinanceSettings } from './financeStore'
import { BankAccounts } from './sections/BankAccounts'
import { GatewayDetail } from './sections/GatewayDetail'
import { GatewayList, type StatusFilter } from './sections/GatewayList'
import { ModalitiesSummary, QuickActions } from './sections/SideSummary'
import { SummaryCards } from './sections/SummaryCards'
import styles from './FinanceGatewaysPage.module.css'

const financeHref = (id: string) => `#/whitelabels/${id}/finance/gateways`

/**
 * Finance / Gateways V1 — per-Whitelabel financial configuration: payment
 * gateways (illustrative providers), Whitelabel bank accounts and a modality
 * summary. Configuration only: no money movement, balances or payments.
 * Frontend prototype: every change is local to this session; nothing is sent.
 */
export function FinanceGatewaysPage({ whitelabelId }: { whitelabelId: string }) {
  const whitelabel = PROTOTYPE_WHITELABELS.find((item) => item.id === whitelabelId)
  return (
    <AppShell
      activeNav="financeiro"
      activeSubNav="finance-gateways"
      subNavHrefs={{
        financeiro: financeHref(whitelabelId),
        'finance-gateways': financeHref(whitelabelId),
        'finance-modalities': `#/whitelabels/${whitelabelId}/finance/modalities`,
        'finance-catalogs': `#/whitelabels/${whitelabelId}/finance/segments-resource-uses`,
      }}
      title="Financeiro / Gateways"
      location="Gateways"
      breadcrumbs={[
        { label: 'Financeiro' },
        { label: whitelabel?.name ?? 'Whitelabel não encontrado' },
        { label: 'Gateways' },
      ]}
    >
      {whitelabel ? (
        <FinanceContent whitelabel={whitelabel} />
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

function FinanceContent({ whitelabel }: { whitelabel: Whitelabel }) {
  const [dirty, setDirty] = useState<Partial<Record<FinanceDraftKey, boolean>>>({})
  const [draftReset, setDraftReset] = useState(0)

  const dirtyKeys = (Object.keys(FINANCE_DRAFT_LABEL) as FinanceDraftKey[]).filter((key) => dirty[key])
  const onDirtyChange = useCallback((key: FinanceDraftKey, value: boolean) => {
    setDirty((current) => (Boolean(current[key]) === value ? current : { ...current, [key]: value }))
  }, [])

  // Shared guard (Settings / E-mails): links, Back/Forward, reload and the selector.
  const { pending, requestNavigation, stay, discardAndContinue } = useUnsavedChangesGuard(dirtyKeys.length > 0, () => {
    setDirty({})
    setDraftReset((value) => value + 1)
  })

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
              Gateways de pagamento, contas bancárias e modalidades do Whitelabel selecionado. Somente configuração:
              nenhuma operação financeira é feita aqui.
            </p>
          </div>
          <WhitelabelContextSelector
            current={whitelabel}
            options={PROTOTYPE_WHITELABELS}
            onSelect={(id) => {
              const target = PROTOTYPE_WHITELABELS.find((item) => item.id === id)
              requestNavigation(financeHref(id), `trocar para ${target?.name ?? id}`)
            }}
          />
        </section>

        <DetailTransition item={whitelabel} className={styles.content} sectionId="finance-gateways" labelledBy="finance-gateways-label">
          {(displayed) => (
            <FinanceSections
              key={`${displayed.id}:${draftReset}`}
              whitelabel={displayed}
              dirty={dirty}
              onDirtyChange={onDirtyChange}
            />
          )}
        </DetailTransition>
      </div>

      {pending ? (
        <UnsavedChangesDialog
          sections={dirtyKeys.map((key) => FINANCE_DRAFT_LABEL[key])}
          destination={pending.destination}
          onStay={stay}
          onDiscard={discardAndContinue}
        />
      ) : null}
    </div>
  )
}

type BankDialog =
  | { kind: 'form'; account?: BankAccount }
  | { kind: 'deactivate' | 'remove'; account: BankAccount }
  | null

function FinanceSections({
  whitelabel,
  dirty,
  onDirtyChange,
}: {
  whitelabel: Whitelabel
  dirty: Partial<Record<FinanceDraftKey, boolean>>
  onDirtyChange: (key: FinanceDraftKey, dirty: boolean) => void
}) {
  const notify = usePrototypeNotice()
  const settings = useFinanceSettings(whitelabel.id)
  const activity = useFinanceActivity(whitelabel.id)
  const [selectedId, setSelectedId] = useState<string | null>(settings?.gateways[0]?.id ?? null)
  const [detailTab, setDetailTab] = useState<'overview' | 'credentials'>('overview')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [newGateway, setNewGateway] = useState(false)
  const [bankDialog, setBankDialog] = useState<BankDialog>(null)
  const [pendingGateway, setPendingGateway] = useState<string | null>(null)

  const onNewDirty = useCallback((value: boolean) => onDirtyChange('gateway-new', value), [onDirtyChange])
  const onBankDirty = useCallback((value: boolean) => onDirtyChange('bank-form', value), [onDirtyChange])

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return (settings?.gateways ?? []).filter((gateway) => {
      if (status !== 'all' && displayStatusOf(gateway) !== status) return false
      return !needle || providerOf(gateway.providerId).name.toLowerCase().includes(needle)
    })
  }, [settings, query, status])

  if (!settings) {
    return (
      <div className={styles.notFound} data-detail-stage>
        <p id="finance-gateways-label" className="visually-hidden">
          Financeiro de {whitelabel.name}
        </p>
        <EmptyState icon={Building2} title="Configuração indisponível" description="Não há dados financeiros ilustrativos para este Whitelabel." />
      </div>
    )
  }

  const selected = settings.gateways.find((gateway) => gateway.id === selectedId) ?? null
  const gatewayDirtyKeys = GATEWAY_DRAFT_KEYS.filter((key) => dirty[key])

  function focusDetailHeading() {
    window.requestAnimationFrame(() => document.getElementById('fin-gateway-detail-title')?.focus({ preventScroll: true }))
  }

  function selectGateway(id: string) {
    if (id === selectedId) return
    if (gatewayDirtyKeys.length) {
      setPendingGateway(id)
      return
    }
    setSelectedId(id)
    setDetailTab('overview')
    if (window.matchMedia('(max-width: 1359px)').matches) {
      window.requestAnimationFrame(() => {
        const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
        document.getElementById('fin-gateway-detail')?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' })
      })
    }
  }

  function createGateway(input: { providerId: string; role: 'primary' | 'secondary' | 'backup'; environment: 'sandbox' | 'production' }) {
    const id = nextLocalId('gw')
    const provider = providerOf(input.providerId)
    updateFinanceSettings(whitelabel.id, (current) => ({
      gateways: [
        ...current.gateways,
        {
          id,
          providerId: input.providerId,
          role: input.role,
          environment: input.environment,
          active: false,
          credentials: {
            clientId: { configured: false },
            apiKey: { configured: false },
            webhookSecret: { configured: false },
            accountId: { configured: false },
          },
          modalities: [],
          linkedBankAccountId: null,
          lastValidation: null,
        },
      ],
    }))
    addFinanceActivity(whitelabel.id, { kind: 'gateway_created', gatewayId: id, title: `${provider.name} adicionado localmente (inativo, sem credenciais)` })
    setNewGateway(false)
    setQuery('')
    setStatus('all')
    setSelectedId(id)
    setDetailTab('credentials')
    notify(`${provider.name} adicionado a ${whitelabel.name} neste protótipo. Informe as credenciais para concluir.`)
    focusDetailHeading()
  }

  function saveBank(draft: BankAccountDraft, existing?: BankAccount) {
    const accountDigits = draft.account.replace(/\D/g, '')
    const pixType = draft.pixType || null
    const pixHint = !pixType
      ? null
      : draft.pixKey
        ? maskPix(pixType, draft.pixKey)
        : existing?.pixType === pixType
          ? existing.pixHint
          : null
    // Only masked hints are stored: the typed account number and Pix key are dropped here.
    const next: BankAccount = {
      id: existing?.id ?? nextLocalId('ba'),
      bankCode: draft.bankCode,
      agency: draft.agency.trim(),
      accountLast4: accountDigits ? accountDigits.slice(-4) : (existing?.accountLast4 ?? ''),
      accountDigit: draft.accountDigit.trim().toUpperCase(),
      type: draft.type,
      holder: draft.holder.trim(),
      pixType,
      pixHint,
      status: existing?.status ?? 'active',
    }
    updateFinanceSettings(whitelabel.id, (current) => ({
      bankAccounts: existing
        ? current.bankAccounts.map((account) => (account.id === existing.id ? next : account))
        : [...current.bankAccounts, next],
    }))
    addFinanceActivity(whitelabel.id, {
      kind: existing ? 'bank_updated' : 'bank_created',
      title: `Conta bancária ${existing ? 'editada' : 'cadastrada'} localmente: ${bankName(next.bankCode)} ${maskedAccount(next)}`,
    })
    setBankDialog(null)
    notify(`Conta ${bankName(next.bankCode)} ${maskedAccount(next)} ${existing ? 'atualizada' : 'cadastrada'} neste protótipo. Nada foi enviado ao banco.`)
  }

  function setBankStatus(account: BankAccount, statusValue: BankAccount['status']) {
    updateFinanceSettings(whitelabel.id, (current) => ({
      bankAccounts: current.bankAccounts.map((item) => (item.id === account.id ? { ...item, status: statusValue } : item)),
    }))
    addFinanceActivity(whitelabel.id, {
      kind: statusValue === 'active' ? 'bank_reactivated' : 'bank_deactivated',
      title: `Conta bancária ${statusValue === 'active' ? 'reativada' : 'desativada'} localmente: ${bankName(account.bankCode)} ${maskedAccount(account)}`,
    })
    setBankDialog(null)
  }

  function removeBank(account: BankAccount) {
    updateFinanceSettings(whitelabel.id, (current) => ({
      bankAccounts: current.bankAccounts.filter((item) => item.id !== account.id),
      gateways: current.gateways.map((gateway) =>
        gateway.linkedBankAccountId === account.id ? { ...gateway, linkedBankAccountId: null } : gateway,
      ),
    }))
    addFinanceActivity(whitelabel.id, {
      kind: 'bank_removed',
      title: `Conta bancária removida do protótipo: ${bankName(account.bankCode)} ${maskedAccount(account)}`,
    })
    setBankDialog(null)
    notify('Conta removida desta sessão do protótipo.')
  }

  const focusCreateBank = () => document.querySelector<HTMLElement>('[data-create-bank]')

  return (
    <>
      <p id="finance-gateways-label" className="visually-hidden">
        Financeiro de {whitelabel.name}
      </p>
      <SummaryCards settings={settings} />
      <div className={styles.grid}>
        <div className={styles.areaList}>
          <GatewayList
            whitelabelName={whitelabel.name}
            gateways={settings.gateways}
            rows={rows}
            selectedId={selectedId}
            editedId={gatewayDirtyKeys.length ? selectedId : null}
            query={query}
            onQueryChange={setQuery}
            status={status}
            onStatusChange={setStatus}
            onSelect={selectGateway}
            onCreate={() => setNewGateway(true)}
          />
        </div>
        <div className={styles.areaDetail}>
          {selected ? (
            <GatewayDetail
              key={`${selected.id}:${detailTab}`}
              initialTab={detailTab}
              whitelabelId={whitelabel.id}
              gateway={selected}
              gateways={settings.gateways}
              bankAccounts={settings.bankAccounts}
              activity={activity}
              onDirtyChange={onDirtyChange}
              notify={notify}
            />
          ) : (
            <section id="fin-gateway-detail" className={styles.noSelection} aria-label="Detalhes do gateway" data-detail-stage>
              <EmptyState
                icon={Link2}
                title="Nenhum gateway selecionado"
                description="Configure um gateway para ver credenciais, dependências e ações locais."
              />
            </section>
          )}
        </div>
        <div className={styles.areaBanks}>
          <BankAccounts
            whitelabelName={whitelabel.name}
            accounts={settings.bankAccounts}
            activity={activity}
            onCreate={() => setBankDialog({ kind: 'form' })}
            onEdit={(account) => setBankDialog({ kind: 'form', account })}
            onDeactivate={(account) => setBankDialog({ kind: 'deactivate', account })}
            onReactivate={(account) => setBankStatus(account, 'active')}
            onRemove={(account) => setBankDialog({ kind: 'remove', account })}
          />
        </div>
        <div className={styles.areaSide}>
          <ModalitiesSummary settings={settings} />
          <QuickActions
            modalitiesHref={`#/whitelabels/${whitelabel.id}/finance/modalities`}
            auditHref={`#/audit?whitelabel=${whitelabel.id}&resourceType=gateway`}
            onConfigureGateway={() => setNewGateway(true)}
            onCreateBank={() => setBankDialog({ kind: 'form' })}
          />
        </div>
      </div>

      {newGateway ? (
        <NewGatewayDialog
          whitelabelName={whitelabel.name}
          hasPrimary={settings.gateways.some((gateway) => gateway.role === 'primary')}
          onCancel={() => setNewGateway(false)}
          onCreate={createGateway}
          onDirtyChange={onNewDirty}
        />
      ) : null}
      {bankDialog?.kind === 'form' ? (
        <BankAccountDialog
          whitelabelName={whitelabel.name}
          account={bankDialog.account}
          onCancel={() => setBankDialog(null)}
          onSave={(draft) => saveBank(draft, bankDialog.account)}
          onDirtyChange={onBankDirty}
        />
      ) : null}
      {bankDialog && bankDialog.kind !== 'form' ? (
        <ConfirmBankAccountDialog
          account={bankDialog.account}
          action={bankDialog.kind}
          onCancel={() => setBankDialog(null)}
          onConfirm={() => (bankDialog.kind === 'remove' ? removeBank(bankDialog.account) : setBankStatus(bankDialog.account, 'inactive'))}
          fallbackFocus={focusCreateBank}
        />
      ) : null}
      {pendingGateway ? (
        <UnsavedChangesDialog
          sections={gatewayDirtyKeys.map((key) => FINANCE_DRAFT_LABEL[key])}
          destination="selecionar outro gateway"
          onStay={() => setPendingGateway(null)}
          onDiscard={() => {
            const id = pendingGateway
            setPendingGateway(null)
            gatewayDirtyKeys.forEach((key) => onDirtyChange(key, false))
            setSelectedId(id)
            setDetailTab('overview')
          }}
        />
      ) : null}
    </>
  )
}
