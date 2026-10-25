import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { AlertCircle, AlertTriangle, Info, Landmark, Trash2 } from 'lucide-react'
import { Dialog } from '../../../components/ui/Dialog'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import { PrimaryButton } from '../../../components/ui/PrimaryButton'
import dialogStyles from '../../whitelabel-settings/dialogs/SettingsDialogs.module.css'
import {
  ACCOUNT_TYPE_LABEL,
  BANKS,
  PIX_TYPE_LABEL,
  bankName,
  maskedAccount,
  validateBankAccount,
  type BankAccount,
  type BankAccountDraft,
  type BankAccountType,
  type PixKeyType,
} from '../financeModel'
import styles from './FinanceDialogs.module.css'

const emptyDraft = (holder: string): BankAccountDraft => ({
  bankCode: '',
  agency: '',
  account: '',
  accountDigit: '',
  type: 'checking',
  holder,
  pixType: '',
  pixKey: '',
})

const draftOf = (account: BankAccount): BankAccountDraft => ({
  bankCode: account.bankCode,
  agency: account.agency,
  account: '',
  accountDigit: account.accountDigit,
  type: account.type,
  holder: account.holder,
  pixType: account.pixType ?? '',
  pixKey: '',
})

/**
 * Create / edit a Whitelabel bank account (local prototype). The full account
 * number and Pix key are write-only: on edit they start empty ("keep current")
 * and only masked hints are stored after saving.
 */
export function BankAccountDialog({
  whitelabelName,
  account,
  onCancel,
  onSave,
  onDirtyChange,
}: {
  whitelabelName: string
  /** Existing account to edit; undefined creates a new one. */
  account?: BankAccount
  onCancel: () => void
  onSave: (draft: BankAccountDraft) => void
  onDirtyChange: (dirty: boolean) => void
}) {
  const editing = Boolean(account)
  const [initial] = useState(() => (account ? draftOf(account) : emptyDraft(`${whitelabelName} (titular ilustrativo)`)))
  const [draft, setDraft] = useState(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const firstRef = useRef<HTMLSelectElement>(null)
  const keepRef = useRef<HTMLButtonElement>(null)

  const dirty = JSON.stringify(draft) !== JSON.stringify(initial)
  useEffect(() => {
    onDirtyChange(dirty)
  }, [dirty, onDirtyChange])
  useEffect(() => () => onDirtyChange(false), [onDirtyChange])
  useEffect(() => {
    if (confirmDiscard) keepRef.current?.focus()
  }, [confirmDiscard])

  function set<K extends keyof BankAccountDraft>(key: K, value: BankAccountDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
    if (errors[key]) setErrors((current) => ({ ...current, [key]: '' }))
  }

  function requestClose() {
    if (dirty) setConfirmDiscard(true)
    else onCancel()
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = validateBankAccount(draft, editing)
    // Changing the Pix key type needs the new key (the current one is not readable).
    if (account && draft.pixType && draft.pixType !== account.pixType && !draft.pixKey.trim()) next.pixKey = 'Informe a nova chave Pix.'
    setErrors(next)
    const firstInvalid = Object.keys(next).find((key) => next[key])
    if (firstInvalid) {
      document.getElementById(`fin-bank-${firstInvalid}`)?.focus()
      return
    }
    onSave(draft)
  }

  const field = (key: keyof BankAccountDraft, label: string, control: ReactNode, hint?: string) => (
    <div className={dialogStyles.field}>
      <label htmlFor={`fin-bank-${key}`} className={dialogStyles.label}>
        {label}
      </label>
      {control}
      {hint ? (
        <p id={`fin-bank-${key}-hint`} className={dialogStyles.hint}>
          {hint}
        </p>
      ) : null}
      {errors[key] ? (
        <p id={`fin-bank-${key}-error`} className={dialogStyles.error}>
          <AlertCircle size={14} strokeWidth={2} aria-hidden="true" />
          {errors[key]}
        </p>
      ) : null}
    </div>
  )
  const describe = (key: keyof BankAccountDraft, hint = false) =>
    [hint ? `fin-bank-${key}-hint` : null, errors[key] ? `fin-bank-${key}-error` : null].filter(Boolean).join(' ') || undefined
  const invalid = (key: keyof BankAccountDraft) => (errors[key] ? true : undefined)

  return (
    <Dialog
      title={editing ? 'Editar conta bancária' : 'Cadastrar conta bancária'}
      description={`Conta de recebimentos e pagamentos de ${whitelabelName} (protótipo local).`}
      icon={Landmark}
      size="lg"
      onClose={requestClose}
      initialFocusRef={firstRef}
      footer={
        confirmDiscard ? (
          <>
            <p className={dialogStyles.footerNote} role="alert">
              Descartar os dados digitados?
            </p>
            <OutlineButton ref={keepRef} className={dialogStyles.footerButton} onClick={() => setConfirmDiscard(false)}>
              Continuar editando
            </OutlineButton>
            <button type="button" className={dialogStyles.confirmWarning} onClick={onCancel}>
              Descartar
            </button>
          </>
        ) : (
          <>
            <OutlineButton className={dialogStyles.footerButton} onClick={requestClose}>
              Cancelar
            </OutlineButton>
            <PrimaryButton type="submit" form="fin-bank-form" className={dialogStyles.footerButton}>
              {editing ? 'Salvar conta' : 'Cadastrar conta'}
            </PrimaryButton>
          </>
        )
      }
    >
      <form id="fin-bank-form" className={dialogStyles.form} onSubmit={submit} noValidate>
        <div className={styles.twoCols}>
          {field(
            'bankCode',
            'Banco',
            <select
              ref={firstRef}
              id="fin-bank-bankCode"
              className={`${dialogStyles.input} ${styles.select}`}
              value={draft.bankCode}
              onChange={(event) => set('bankCode', event.target.value)}
              aria-invalid={invalid('bankCode')}
              aria-describedby={describe('bankCode', true)}
            >
              <option value="">Selecione…</option>
              {BANKS.map((bank) => (
                <option key={bank.code} value={bank.code}>
                  {bank.code} · {bank.name}
                </option>
              ))}
            </select>,
            'Bancos fictícios do protótipo.',
          )}
          {field(
            'type',
            'Tipo de conta',
            <select
              id="fin-bank-type"
              className={`${dialogStyles.input} ${styles.select}`}
              value={draft.type}
              onChange={(event) => set('type', event.target.value as BankAccountType)}
            >
              {(Object.keys(ACCOUNT_TYPE_LABEL) as BankAccountType[]).map((type) => (
                <option key={type} value={type}>
                  {ACCOUNT_TYPE_LABEL[type]}
                </option>
              ))}
            </select>,
          )}
        </div>
        <div className={styles.threeCols}>
          {field(
            'agency',
            'Agência',
            <input
              id="fin-bank-agency"
              className={dialogStyles.input}
              value={draft.agency}
              onChange={(event) => set('agency', event.target.value.replace(/\D/g, '').slice(0, 4))}
              inputMode="numeric"
              autoComplete="off"
              aria-invalid={invalid('agency')}
              aria-describedby={describe('agency')}
            />,
          )}
          {field(
            'account',
            editing ? 'Nova conta (opcional)' : 'Conta',
            <input
              id="fin-bank-account"
              className={dialogStyles.input}
              value={draft.account}
              onChange={(event) => set('account', event.target.value.slice(0, 16))}
              inputMode="numeric"
              autoComplete="off"
              placeholder={account ? `Atual: ${maskedAccount(account)}` : undefined}
              aria-invalid={invalid('account')}
              aria-describedby={describe('account', true)}
            />,
            editing ? 'Deixe em branco para manter a conta atual.' : 'Apenas os 4 últimos dígitos ficam visíveis depois de salvar.',
          )}
          {field(
            'accountDigit',
            'Dígito',
            <input
              id="fin-bank-accountDigit"
              className={dialogStyles.input}
              value={draft.accountDigit}
              onChange={(event) => set('accountDigit', event.target.value.slice(0, 1))}
              autoComplete="off"
              aria-invalid={invalid('accountDigit')}
              aria-describedby={describe('accountDigit')}
            />,
          )}
        </div>
        {field(
          'holder',
          'Titular',
          <input
            id="fin-bank-holder"
            className={dialogStyles.input}
            value={draft.holder}
            onChange={(event) => set('holder', event.target.value)}
            maxLength={90}
            autoComplete="off"
            aria-invalid={invalid('holder')}
            aria-describedby={describe('holder', true)}
          />,
          'Titularidade no nível do Whitelabel é uma premissa do protótipo.',
        )}
        <div className={styles.twoCols}>
          {field(
            'pixType',
            'Tipo de chave Pix (opcional)',
            <select
              id="fin-bank-pixType"
              className={`${dialogStyles.input} ${styles.select}`}
              value={draft.pixType}
              onChange={(event) => set('pixType', event.target.value as PixKeyType | '')}
            >
              <option value="">Sem chave Pix</option>
              {(Object.keys(PIX_TYPE_LABEL) as PixKeyType[]).map((type) => (
                <option key={type} value={type}>
                  {PIX_TYPE_LABEL[type]}
                </option>
              ))}
            </select>,
          )}
          {draft.pixType
            ? field(
                'pixKey',
                editing && account?.pixType === draft.pixType ? 'Nova chave Pix (opcional)' : 'Chave Pix',
                <input
                  id="fin-bank-pixKey"
                  className={dialogStyles.input}
                  value={draft.pixKey}
                  onChange={(event) => set('pixKey', event.target.value.slice(0, 80))}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={editing && account?.pixHint && account.pixType === draft.pixType ? `Atual: ${account.pixHint}` : undefined}
                  aria-invalid={invalid('pixKey')}
                  aria-describedby={describe('pixKey', true)}
                />,
                'A chave é exibida mascarada depois de salvar.',
              )
            : null}
        </div>
      </form>
      <p className={dialogStyles.callout}>
        <Info size={15} strokeWidth={1.8} aria-hidden="true" />
        <span>
          Use apenas dados fictícios. Nada é validado com o banco nem enviado a um Backend; nenhum Pix ou transferência é
          gerado.
        </span>
      </p>
    </Dialog>
  )
}

/** Deactivate or remove a bank account (local); always confirmed. */
export function ConfirmBankAccountDialog({
  account,
  action,
  onCancel,
  onConfirm,
  fallbackFocus,
}: {
  account: BankAccount
  action: 'deactivate' | 'remove'
  onCancel: () => void
  onConfirm: () => void
  fallbackFocus: () => HTMLElement | null
}) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const remove = action === 'remove'
  return (
    <Dialog
      title={remove ? 'Remover conta bancária?' : 'Desativar conta bancária?'}
      description={`${bankName(account.bankCode)} · Ag. ${account.agency} · ${maskedAccount(account)}`}
      icon={remove ? Trash2 : AlertTriangle}
      tone="warning"
      onClose={onCancel}
      initialFocusRef={cancelRef}
      fallbackFocus={fallbackFocus}
      footer={
        <>
          <OutlineButton ref={cancelRef} className={dialogStyles.footerButton} onClick={onCancel}>
            Cancelar
          </OutlineButton>
          <button type="button" className={styles.dangerConfirm} onClick={onConfirm}>
            {remove ? 'Remover do protótipo' : 'Desativar conta'}
          </button>
        </>
      }
    >
      <p className={`${dialogStyles.callout} ${styles.warningCallout}`}>
        <AlertTriangle size={15} strokeWidth={1.8} aria-hidden="true" />
        <span>
          <strong>Altera apenas o estado local do protótipo.</strong>{' '}
          {remove
            ? 'A conta sai desta lista e de vínculos com gateways nesta sessão.'
            : 'A conta continua listada como inativa e pode ser reativada.'}{' '}
          O efeito real sobre recebimentos e pagamentos depende das regras do Backend.
        </span>
      </p>
    </Dialog>
  )
}
