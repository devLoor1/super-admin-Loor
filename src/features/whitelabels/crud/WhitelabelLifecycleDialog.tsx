import { useId, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, CircleDashed, HelpCircle, ShieldAlert } from 'lucide-react'
import { Dialog } from '../../../components/ui/Dialog'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import dialogStyles from '../../whitelabel-settings/dialogs/SettingsDialogs.module.css'
import finDialogs from '../../finance-gateways/dialogs/FinanceDialogs.module.css'
import { WHITELABEL_STATUS_META, type WhitelabelRecord } from '../whitelabelApi'
import { MutationErrorNotice, PendingActionButton, PendingBackendNotice } from './MutationStates'
import { DEPENDENCY_DOMAINS, type MutationErrorView } from './whitelabelMutationContract'
import styles from './WhitelabelCrud.module.css'

/**
 * Deactivate / remove a Whitelabel — confirmation UX that does NOT assume
 * the final Backend rule (deactivation, soft delete or hard delete, possibly
 * blocked by dependencies). Typing the identifier confirms intent; the final
 * button stays `aria-disabled` until the contract exists. Nothing is sent and
 * the Whitelabel is never removed from the authoritative list.
 */
export function WhitelabelLifecycleDialog({
  record,
  onClose,
  fallbackFocus,
  failure,
}: {
  record: WhitelabelRecord
  onClose: () => void
  fallbackFocus?: () => HTMLElement | null
  /** Prepared slot for a future Backend refusal (e.g. 409 dependencies). Not set in this version. */
  failure?: MutationErrorView
}) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const inputId = useId()
  const [typed, setTyped] = useState('')
  const token = record.slug || record.id
  const matches = typed.trim() === token
  const status = WHITELABEL_STATUS_META[record.status]
  const pendingId = `${inputId}-pending`

  return (
    <Dialog
      title="Desativar ou remover Whitelabel"
      description={`${record.name} · ID ${record.id} · status atual: ${status.label}`}
      icon={ShieldAlert}
      tone="warning"
      onClose={onClose}
      initialFocusRef={cancelRef}
      fallbackFocus={fallbackFocus}
      size="lg"
      footer={
        <>
          <OutlineButton ref={cancelRef} className={dialogStyles.footerButton} onClick={onClose}>
            Cancelar
          </OutlineButton>
          <PendingActionButton label="Desativar ou remover" describedBy={pendingId} tone="danger" />
        </>
      }
    >
      <div className={`${dialogStyles.form} ${styles.flush}`} data-wl-lifecycle={record.id}>
        <div className={`${dialogStyles.callout} ${finDialogs.warningCallout}`}>
          <AlertTriangle size={15} strokeWidth={1.8} aria-hidden="true" />
          <div>
            <strong>A regra definitiva ainda não foi definida pelo Backend.</strong> Esta tela não presume nenhuma delas:
            <ul className={styles.options}>
              <li>
                <HelpCircle size={14} strokeWidth={1.9} aria-hidden="true" />
                <span>
                  <strong>Desativação</strong> — o Whitelabel continuaria existindo, com status Inativo.
                </span>
              </li>
              <li>
                <HelpCircle size={14} strokeWidth={1.9} aria-hidden="true" />
                <span>
                  <strong>Exclusão lógica</strong> — o registro seria ocultado, preservando o histórico.
                </span>
              </li>
              <li>
                <HelpCircle size={14} strokeWidth={1.9} aria-hidden="true" />
                <span>
                  <strong>Exclusão definitiva</strong> — o registro seria removido.
                </span>
              </li>
            </ul>
          </div>
        </div>

        <section aria-labelledby={`${inputId}-deps`}>
          <h3 id={`${inputId}-deps`} className={styles.sectionTitle}>
            Vínculos verificados pelo Backend
          </h3>
          <p className={dialogStyles.hint}>
            Se houver vínculos, o Backend poderá bloquear a operação. Nenhuma contagem ou decisão é calculada nesta tela.
          </p>
          <ul className={styles.chips} aria-label="Domínios que podem ter vínculos">
            {DEPENDENCY_DOMAINS.map((domain) => (
              <li key={domain} className={styles.chip}>
                {domain}
              </li>
            ))}
          </ul>
        </section>

        <div className={dialogStyles.field}>
          <label htmlFor={inputId} className={dialogStyles.label}>
            Para confirmar a intenção, digite <span className={styles.confirmToken}>{token}</span>
          </label>
          <input
            id={inputId}
            className={`${dialogStyles.input} ${styles.inputMono}`}
            value={typed}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            onChange={(event) => setTyped(event.target.value)}
            aria-describedby={`${inputId}-status`}
            data-confirm-input
          />
          <p id={`${inputId}-status`} className={styles.confirmStatus} data-match={matches || undefined} aria-live="polite">
            {matches ? (
              <>
                <CheckCircle2 size={14} strokeWidth={2} aria-hidden="true" />
                Confirmação conferida. A ação será liberada quando o contrato do Backend estiver integrado.
              </>
            ) : (
              <>
                <CircleDashed size={14} strokeWidth={2} aria-hidden="true" />
                {record.slug ? 'Digite o identificador (slug) exatamente como mostrado.' : 'Digite o ID exatamente como mostrado.'}
              </>
            )}
          </p>
        </div>

        {failure ? <MutationErrorNotice error={failure} /> : null}
        <PendingBackendNotice action="lifecycle" id={pendingId}>
          <p className={styles.pendingText}>O Whitelabel continua listado com os dados atuais do Control Plane.</p>
        </PendingBackendNotice>
      </div>
    </Dialog>
  )
}
