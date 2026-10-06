import { useEffect, useRef, useState } from 'react'
import { AlertCircle, AlertTriangle, ArrowRight, ArrowRightLeft, ClipboardCheck } from 'lucide-react'
import { Dialog } from '../../../components/ui/Dialog'
import { IconTile } from '../../../components/ui/IconTile'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import { PrimaryButton } from '../../../components/ui/PrimaryButton'
import { StatusPill } from '../../../components/ui/StatusPill'
import { EntityAvatar } from '../../../components/ui/EntityAvatar'
import { STATUS_META, type Whitelabel } from '../../whitelabels/prototypeWhitelabels'
import { BusinessBadge } from '../AccountBadges'
import { DEPENDENCY_DEFS, DEPENDENCY_TONE, type Account } from '../accountModel'
import { AccountSummary, MIN_REASON_LENGTH } from './AccessDialogs'
import styles from './AccountDialogs.module.css'

type Step = 1 | 2 | 3 | 'done'

const STEPS: { id: 1 | 2 | 3; label: string }[] = [
  { id: 1, label: 'Destino' },
  { id: 2, label: 'Impacto' },
  { id: 3, label: 'Confirmação' },
]

type Props = {
  account: Account
  whitelabel: Whitelabel
  whitelabels: Whitelabel[]
  onCancel: () => void
  /** Records the local simulation; no account is moved. */
  onConfirm: (destinationId: string, reason: string) => void
  fallbackFocus: () => HTMLElement | null
}

/**
 * "Alterar Whitelabel" — advanced, multi-step confirmation. It explains the
 * dependencies and records only a local simulation: reassignment is not
 * supported by any backend and nothing is migrated.
 */
export function ChangeWhitelabelDialog({ account, whitelabel, whitelabels, onCancel, onConfirm, fallbackFocus }: Props) {
  const [step, setStep] = useState<Step>(1)
  const [destinationId, setDestinationId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)
  const [errors, setErrors] = useState<{ destination?: string; reason?: string; ack?: string }>({})
  const headingRef = useRef<HTMLHeadingElement>(null)
  const firstOptionRef = useRef<HTMLInputElement>(null)
  const reasonRef = useRef<HTMLTextAreaElement>(null)
  const ackRef = useRef<HTMLInputElement>(null)
  const firstRender = useRef(true)

  const destinations = whitelabels.filter((item) => item.id !== whitelabel.id)
  const destination = destinations.find((item) => item.id === destinationId)

  // Move focus to the new step's heading so its context is announced.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    headingRef.current?.focus()
  }, [step])

  function next() {
    if (step === 1) {
      if (!destination) {
        setErrors({ destination: 'Escolha o Whitelabel de destino.' })
        firstOptionRef.current?.focus()
        return
      }
      setErrors({})
      setStep(2)
      return
    }
    if (step === 2) {
      setStep(3)
      return
    }
    if (step === 3) {
      const value = reason.trim()
      const nextErrors: typeof errors = {}
      if (value.length < MIN_REASON_LENGTH) {
        nextErrors.reason = value.length === 0 ? 'Informe o motivo da alteração.' : `O motivo precisa ter pelo menos ${MIN_REASON_LENGTH} caracteres.`
      }
      if (!acknowledged) nextErrors.ack = 'Confirme que entende que esta é apenas uma simulação.'
      setErrors(nextErrors)
      if (nextErrors.reason) {
        reasonRef.current?.focus()
        return
      }
      if (nextErrors.ack) {
        ackRef.current?.focus()
        return
      }
      onConfirm(destination!.id, value)
      setStep('done')
    }
  }

  const footer =
    step === 'done' ? (
      <PrimaryButton className={styles.footerButton} onClick={onCancel}>
        Fechar
      </PrimaryButton>
    ) : (
      <>
        <OutlineButton className={styles.footerButton} onClick={onCancel}>
          Cancelar
        </OutlineButton>
        {step !== 1 ? (
          <OutlineButton className={styles.footerButton} onClick={() => setStep(step === 3 ? 2 : 1)}>
            Voltar
          </OutlineButton>
        ) : null}
        <PrimaryButton className={styles.footerButton} onClick={next}>
          {step === 3 ? 'Registrar simulação' : 'Continuar'}
          {step !== 3 ? <ArrowRight size={16} strokeWidth={1.9} aria-hidden="true" /> : null}
        </PrimaryButton>
      </>
    )

  return (
    <Dialog
      title="Alterar Whitelabel"
      description="Simulação com validação de impacto. A reatribuição de contas não é suportada atualmente."
      icon={ArrowRightLeft}
      tone="violet"
      size="lg"
      onClose={onCancel}
      initialFocusRef={firstOptionRef}
      fallbackFocus={fallbackFocus}
      footer={footer}
    >
      {step !== 'done' ? (
        <ol className={styles.steps} aria-label="Etapas">
          {STEPS.map((item) => (
            <li
              key={item.id}
              className={styles.step}
              aria-current={item.id === step ? 'step' : undefined}
              data-state={item.id < step ? 'done' : undefined}
            >
              {item.label}
            </li>
          ))}
        </ol>
      ) : null}

      {step === 1 ? (
        <>
          <h3 ref={headingRef} tabIndex={-1} className={styles.stepTitle}>
            1. Conta e destino
          </h3>
          <div className={styles.text}>
            <AccountSummary account={account} whitelabel={whitelabel} />
          </div>
          <fieldset className={`${styles.field} ${styles.form}`} aria-describedby={errors.destination ? 'transfer-dest-error' : undefined}>
            <legend className={styles.label}>
              Whitelabel de destino <span className={styles.required}>(obrigatório)</span>
            </legend>
            <div className={styles.options}>
              {destinations.map((item, index) => {
                const status = STATUS_META[item.status]
                return (
                  <label key={item.id} className={styles.option}>
                    <input
                      ref={index === 0 ? firstOptionRef : undefined}
                      type="radio"
                      name="transfer-destination"
                      value={item.id}
                      checked={destinationId === item.id}
                      onChange={() => {
                        setDestinationId(item.id)
                        setErrors({})
                      }}
                    />
                    <span className={styles.optionText}>
                      <span className={styles.optionTitle}>
                        {item.name}
                        <StatusPill tone={status.tone} label={status.label} />
                      </span>
                      <span className={styles.optionDescription}>
                        {item.domain} · ID: {item.id}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
            {errors.destination ? (
              <p id="transfer-dest-error" className={styles.error}>
                <AlertCircle size={14} strokeWidth={2} aria-hidden="true" />
                {errors.destination}
              </p>
            ) : null}
          </fieldset>
        </>
      ) : null}

      {step === 2 && destination ? (
        <>
          <h3 ref={headingRef} tabIndex={-1} className={styles.stepTitle}>
            2. Dependências e impacto
          </h3>
          <Route from={whitelabel} to={destination} />
          <div className={styles.callout} data-tone="warning">
            <AlertTriangle size={16} strokeWidth={1.9} aria-hidden="true" />
            <p>
              <strong>Recursos vinculados podem exigir validação do Backend.</strong> A reatribuição de Whitelabel não é
              suportada atualmente: nenhum histórico, vínculo ou registro financeiro seria movido por inferência.
            </p>
          </div>
          <ul className={styles.impactList} aria-label={`Vínculos da conta de ${account.name}`}>
            {account.dependencies.map((dependency) => {
              const def = DEPENDENCY_DEFS[dependency.key]
              return (
                <li key={dependency.key} className={styles.impact}>
                  <IconTile icon={def.icon} tone="indigo" size="sm" />
                  <div>
                    <div className={styles.impactHead}>
                      <span className={styles.impactLabel}>{def.label}</span>
                      <BusinessBadge tone={DEPENDENCY_TONE[dependency.status]} label={dependency.value} />
                    </div>
                    <p className={styles.impactText}>{def.impact}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      ) : null}

      {step === 3 && destination ? (
        <>
          <h3 ref={headingRef} tabIndex={-1} className={styles.stepTitle}>
            3. Motivo e confirmação
          </h3>
          <Route from={whitelabel} to={destination} />
          <div className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="transfer-reason" className={styles.label}>
                Motivo da alteração <span className={styles.required}>(obrigatório)</span>
              </label>
              <textarea
                ref={reasonRef}
                id="transfer-reason"
                className={styles.textarea}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                aria-invalid={errors.reason ? true : undefined}
                aria-describedby={`transfer-reason-hint${errors.reason ? ' transfer-reason-error' : ''}`}
                maxLength={500}
              />
              <p id="transfer-reason-hint" className={styles.hint}>
                Mínimo de {MIN_REASON_LENGTH} caracteres. Fica apenas no histórico local desta sessão.
              </p>
              {errors.reason ? (
                <p id="transfer-reason-error" className={styles.error}>
                  <AlertCircle size={14} strokeWidth={2} aria-hidden="true" />
                  {errors.reason}
                </p>
              ) : null}
            </div>
            <div className={styles.field}>
              <label className={styles.checkRow}>
                <input
                  ref={ackRef}
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(event) => setAcknowledged(event.target.checked)}
                  aria-invalid={errors.ack ? true : undefined}
                  aria-describedby={errors.ack ? 'transfer-ack-error' : undefined}
                />
                <span>
                  Entendo que esta é uma simulação local: nenhuma conta, histórico ou vínculo será movido, e uma alteração
                  real depende de validação e implementação no Backend.
                </span>
              </label>
              {errors.ack ? (
                <p id="transfer-ack-error" className={styles.error}>
                  <AlertCircle size={14} strokeWidth={2} aria-hidden="true" />
                  {errors.ack}
                </p>
              ) : null}
            </div>
          </div>
        </>
      ) : null}

      {step === 'done' && destination ? (
        <div className={styles.outcome}>
          <span className={styles.outcomeIcon} aria-hidden="true">
            <ClipboardCheck size={22} strokeWidth={1.8} />
          </span>
          <h3 ref={headingRef} tabIndex={-1} className={styles.stepTitle}>
            Simulação registrada
          </h3>
          <p className={styles.text}>
            <strong>Nenhuma migração foi executada.</strong> A conta continua em {whitelabel.name}. A alteração simulada
            para {destination.name} aparece no painel da conta e no histórico desta sessão.
          </p>
        </div>
      ) : null}
    </Dialog>
  )
}

function Route({ from, to }: { from: Whitelabel; to: Whitelabel }) {
  return (
    <div className={styles.route}>
      <div className={styles.routeEnd}>
        <EntityAvatar initial={from.initial} tone={from.avatarTone} />
        <span>
          <span className={styles.routeLabel}>Whitelabel atual</span>
          <span className={styles.routeName}>{from.name}</span>
        </span>
      </div>
      <ArrowRight className={styles.routeArrow} size={18} strokeWidth={1.9} aria-label="para" role="img" />
      <div className={styles.routeEnd}>
        <EntityAvatar initial={to.initial} tone={to.avatarTone} />
        <span>
          <span className={styles.routeLabel}>Destino (simulação)</span>
          <span className={styles.routeName}>{to.name}</span>
        </span>
      </div>
    </div>
  )
}
