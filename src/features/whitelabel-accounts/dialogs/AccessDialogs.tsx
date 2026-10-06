import { useRef, useState, type FormEvent } from 'react'
import { AlertCircle, CheckCircle2, Pause, RotateCcw } from 'lucide-react'
import { Dialog } from '../../../components/ui/Dialog'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import { StatusPill } from '../../../components/ui/StatusPill'
import type { Whitelabel } from '../../whitelabels/prototypeWhitelabels'
import { AccountAvatar, BusinessBadge } from '../AccountBadges'
import { ACCESS_META, ACCOUNT_TYPE_LABEL, businessState, initials, type Account } from '../accountModel'
import styles from './AccountDialogs.module.css'

export const MIN_REASON_LENGTH = 10

/** Identity block shown at the top of every account dialog. */
export function AccountSummary({ account, whitelabel }: { account: Account; whitelabel: Whitelabel }) {
  const access = ACCESS_META[account.accessState]
  const state = businessState(account)
  return (
    <div className={styles.summary}>
      <AccountAvatar initials={initials(account.name)} />
      <div>
        <p className={styles.summaryName}>{account.name}</p>
        <p className={styles.summaryMeta}>
          {ACCOUNT_TYPE_LABEL[account.type].singular} · ID: {account.id} · Whitelabel: {whitelabel.name}
        </p>
        <p className={styles.summaryStates}>
          <span>Acesso:</span>
          <StatusPill tone={access.tone} label={access.label} />
          <span>{account.type === 'admin' ? 'Função:' : account.type === 'investor' ? 'Validação:' : 'Empresa:'}</span>
          <BusinessBadge tone={state.tone} label={state.label} />
        </p>
      </div>
    </div>
  )
}

/** What pausing/reactivating never changes, per account type. */
function preserved(account: Account): string[] {
  if (account.type === 'investor') {
    return ['Validação da conta e KYC', 'Perfil do investidor e Termos aceitos', 'Investimentos, pagamentos e histórico']
  }
  if (account.type === 'entrepreneur') {
    return ['Dados e validação da empresa', 'Oportunidades e captação', 'Documentos, dados bancários e histórico']
  }
  return ['Função e permissões conceituais', 'Vínculo com o Whitelabel', 'Registros administrativos']
}

type PauseProps = {
  account: Account
  whitelabel: Whitelabel
  onCancel: () => void
  onConfirm: (reason: string) => void
  fallbackFocus: () => HTMLElement | null
}

/** Pause access: identity, explanation, mandatory reason, local confirmation. */
export function PauseAccessDialog({ account, whitelabel, onCancel, onConfirm, fallbackFocus }: PauseProps) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const reasonRef = useRef<HTMLTextAreaElement>(null)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = reason.trim()
    if (value.length < MIN_REASON_LENGTH) {
      setError(
        value.length === 0
          ? 'Informe o motivo da pausa.'
          : `O motivo precisa ter pelo menos ${MIN_REASON_LENGTH} caracteres.`,
      )
      reasonRef.current?.focus()
      return
    }
    onConfirm(value)
  }

  return (
    <Dialog
      title="Pausar acesso"
      description={`Conta de ${account.name} em ${whitelabel.name}.`}
      icon={Pause}
      tone="warning"
      onClose={onCancel}
      initialFocusRef={reasonRef}
      fallbackFocus={fallbackFocus}
      footer={
        <>
          <OutlineButton className={styles.footerButton} onClick={onCancel}>
            Cancelar
          </OutlineButton>
          <button type="submit" form="pause-form" className={styles.confirmPause}>
            <Pause size={16} strokeWidth={2} aria-hidden="true" />
            Pausar acesso
          </button>
        </>
      }
    >
      <AccountSummary account={account} whitelabel={whitelabel} />
      <p className={styles.text}>
        <strong>Pausar acesso suspende temporariamente o acesso do usuário, preservando os dados e o histórico da conta.</strong>{' '}
        Nada é excluído e nenhum estado de negócio é alterado:
      </p>
      <ul className={styles.keepList}>
        {preserved(account).map((item) => (
          <li key={item}>
            <CheckCircle2 size={15} strokeWidth={2} aria-hidden="true" />
            {item} permanecem iguais
          </li>
        ))}
      </ul>

      <form id="pause-form" className={styles.form} onSubmit={submit} noValidate>
        <div className={styles.field}>
          <label htmlFor="pause-reason" className={styles.label}>
            Motivo da pausa <span className={styles.required}>(obrigatório)</span>
          </label>
          <textarea
            ref={reasonRef}
            id="pause-reason"
            className={styles.textarea}
            value={reason}
            onChange={(event) => {
              setReason(event.target.value)
              if (error && event.target.value.trim().length >= MIN_REASON_LENGTH) setError(null)
            }}
            placeholder="Ex.: solicitação do usuário, análise de segurança em andamento…"
            aria-invalid={error ? true : undefined}
            aria-describedby={`pause-reason-hint${error ? ' pause-reason-error' : ''}`}
            required
            maxLength={500}
          />
          <p id="pause-reason-hint" className={styles.hint}>
            Mínimo de {MIN_REASON_LENGTH} caracteres. O motivo fica apenas no histórico local desta sessão.
          </p>
          {error ? (
            <p id="pause-reason-error" className={styles.error}>
              <AlertCircle size={14} strokeWidth={2} aria-hidden="true" />
              {error}
            </p>
          ) : null}
        </div>
      </form>

      <p className={styles.backendNote}>
        Frontend: protótipo · Backend: implementação pendente · Integração: pendente. A confirmação altera apenas o
        estado local deste protótipo.
      </p>
    </Dialog>
  )
}

type ReactivateProps = {
  account: Account
  whitelabel: Whitelabel
  onCancel: () => void
  onConfirm: (note: string) => void
  fallbackFocus: () => HTMLElement | null
}

/** Reactivate access: restores "Ativa" only; business states are untouched. */
export function ReactivateAccessDialog({ account, whitelabel, onCancel, onConfirm, fallbackFocus }: ReactivateProps) {
  const [note, setNote] = useState('')
  const cancelRef = useRef<HTMLButtonElement>(null)
  const state = businessState(account)

  return (
    <Dialog
      title="Reativar acesso"
      description={`Conta de ${account.name} em ${whitelabel.name}.`}
      icon={RotateCcw}
      tone="teal"
      onClose={onCancel}
      initialFocusRef={cancelRef}
      fallbackFocus={fallbackFocus}
      footer={
        <>
          <OutlineButton ref={cancelRef} className={styles.footerButton} onClick={onCancel}>
            Cancelar
          </OutlineButton>
          <button type="button" className={styles.confirmTeal} onClick={() => onConfirm(note.trim())}>
            <RotateCcw size={16} strokeWidth={2} aria-hidden="true" />
            Reativar acesso
          </button>
        </>
      }
    >
      <AccountSummary account={account} whitelabel={whitelabel} />
      <p className={styles.text}>
        O status de acesso volta para <strong>Ativa</strong>. Os demais estados não mudam — por exemplo,{' '}
        {account.type === 'admin' ? 'a função' : account.type === 'investor' ? 'a validação' : 'a validação da empresa'}{' '}
        continua <strong>{state.label}</strong>.
        {account.type === 'investor' && account.validation === 'denied'
          ? ' Reativar não aprova a validação negada.'
          : ''}
      </p>
      <div className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="reactivate-note" className={styles.label}>
            Observação <span className={styles.required}>(opcional)</span>
          </label>
          <textarea
            id="reactivate-note"
            className={styles.textarea}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={500}
          />
        </div>
      </div>
      <p className={styles.backendNote}>
        Frontend: protótipo · Backend: implementação pendente · Integração: pendente.
      </p>
    </Dialog>
  )
}
