import { useRef, useState, type FormEvent } from 'react'
import { AlertCircle, Info, UserPlus } from 'lucide-react'
import { Dialog } from '../../../components/ui/Dialog'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import { PrimaryButton } from '../../../components/ui/PrimaryButton'
import { EntityAvatar } from '../../../components/ui/EntityAvatar'
import type { Whitelabel } from '../../whitelabels/prototypeWhitelabels'
import { ADMIN_ROLE_META, normalize, type AccessState, type AdminRole } from '../accountModel'
import styles from './AccountDialogs.module.css'

export type NewAdminInput = { name: string; email: string; role: AdminRole; accessState: AccessState }

type Props = {
  whitelabel: Whitelabel
  /** E-mails already used in this Whitelabel (illustrative uniqueness check). */
  existingEmails: string[]
  onCancel: () => void
  onCreate: (input: NewAdminInput) => void
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * "Novo administrador" — local form for the conceptual fields only. No
 * provisioning, invitation e-mail, password or permission grant happens.
 */
export function NewAdminDialog({ whitelabel, existingEmails, onCancel, onCreate }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<AdminRole>('operator')
  const [accessState, setAccessState] = useState<AccessState>('active')
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({})
  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = name.trim()
    const trimmedEmail = email.trim().toLowerCase()
    const nextErrors: typeof errors = {}
    if (trimmedName.length < 3) nextErrors.name = 'Informe o nome completo.'
    if (!EMAIL.test(trimmedEmail)) nextErrors.email = 'Informe um e-mail válido.'
    else if (existingEmails.some((value) => normalize(value) === normalize(trimmedEmail))) {
      nextErrors.email = 'Já existe uma conta com este e-mail neste Whitelabel (dados ilustrativos).'
    }
    setErrors(nextErrors)
    if (nextErrors.name) {
      nameRef.current?.focus()
      return
    }
    if (nextErrors.email) {
      emailRef.current?.focus()
      return
    }
    onCreate({ name: trimmedName, email: trimmedEmail, role, accessState })
  }

  return (
    <Dialog
      title="Novo administrador"
      description={`Protótipo de cadastro conceitual para ${whitelabel.name}. Nenhum convite é enviado.`}
      icon={UserPlus}
      tone="violet"
      onClose={onCancel}
      initialFocusRef={nameRef}
      footer={
        <>
          <OutlineButton className={styles.footerButton} onClick={onCancel}>
            Cancelar
          </OutlineButton>
          <PrimaryButton type="submit" form="new-admin-form" className={styles.footerButton}>
            <UserPlus size={16} strokeWidth={1.9} aria-hidden="true" />
            Adicionar ao protótipo
          </PrimaryButton>
        </>
      }
    >
      <form id="new-admin-form" className={styles.form} style={{ marginTop: 0 }} onSubmit={submit} noValidate>
        <div className={styles.field}>
          <label htmlFor="admin-name" className={styles.label}>
            Nome completo <span className={styles.required}>(obrigatório)</span>
          </label>
          <input
            ref={nameRef}
            id="admin-name"
            className={styles.input}
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="off"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? 'admin-name-error' : undefined}
            maxLength={120}
          />
          {errors.name ? (
            <p id="admin-name-error" className={styles.error}>
              <AlertCircle size={14} strokeWidth={2} aria-hidden="true" />
              {errors.name}
            </p>
          ) : null}
        </div>

        <div className={styles.field}>
          <label htmlFor="admin-email" className={styles.label}>
            E-mail <span className={styles.required}>(obrigatório)</span>
          </label>
          <input
            ref={emailRef}
            id="admin-email"
            type="email"
            inputMode="email"
            className={styles.input}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="nome@example.com"
            autoComplete="off"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={`admin-email-hint${errors.email ? ' admin-email-error' : ''}`}
            maxLength={160}
          />
          <p id="admin-email-hint" className={styles.hint}>
            Use um endereço fictício: os dados ficam apenas nesta sessão do navegador.
          </p>
          {errors.email ? (
            <p id="admin-email-error" className={styles.error}>
              <AlertCircle size={14} strokeWidth={2} aria-hidden="true" />
              {errors.email}
            </p>
          ) : null}
        </div>

        <div className={styles.field}>
          <span className={styles.label} id="admin-whitelabel-label">
            Whitelabel
          </span>
          <div className={styles.readonly} aria-labelledby="admin-whitelabel-label" role="group">
            <EntityAvatar initial={whitelabel.initial} tone={whitelabel.avatarTone} />
            <span>
              {whitelabel.name} <span className={styles.required}>· definido pelo contexto selecionado</span>
            </span>
          </div>
        </div>

        <fieldset className={styles.field}>
          <legend className={styles.label}>Função e permissões (conceitual)</legend>
          <div className={styles.options}>
            {(Object.keys(ADMIN_ROLE_META) as AdminRole[]).map((value) => (
              <label key={value} className={styles.option}>
                <input
                  type="radio"
                  name="admin-role"
                  value={value}
                  checked={role === value}
                  onChange={() => setRole(value)}
                />
                <span className={styles.optionText}>
                  <span className={styles.optionTitle}>{ADMIN_ROLE_META[value].label}</span>
                  <span className={styles.optionDescription}>{ADMIN_ROLE_META[value].description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className={styles.field}>
          <legend className={styles.label}>Convite e acesso inicial (conceitual)</legend>
          <div className={styles.options}>
            <label className={styles.option}>
              <input
                type="radio"
                name="admin-access"
                value="active"
                checked={accessState === 'active'}
                onChange={() => setAccessState('active')}
              />
              <span className={styles.optionText}>
                <span className={styles.optionTitle}>Convite pendente · acesso Ativa</span>
                <span className={styles.optionDescription}>Poderia acessar após aceitar o convite</span>
              </span>
            </label>
            <label className={styles.option}>
              <input
                type="radio"
                name="admin-access"
                value="paused"
                checked={accessState === 'paused'}
                onChange={() => setAccessState('paused')}
              />
              <span className={styles.optionText}>
                <span className={styles.optionTitle}>Convite pendente · acesso Pausada</span>
                <span className={styles.optionDescription}>Cadastro preparado, acesso suspenso até reativação</span>
              </span>
            </label>
          </div>
        </fieldset>
      </form>

      <div className={styles.callout}>
        <Info size={16} strokeWidth={1.8} aria-hidden="true" />
        <p>
          Protótipo de frontend: nenhum provisionamento, e-mail de convite, senha ou permissão real é criado. A política de
          convite e definição de senha ainda depende de decisão de Produto e Backend.
        </p>
      </div>
    </Dialog>
  )
}
