import { useRef, useState, type FormEvent } from 'react'
import { ArrowRight, Mail } from 'lucide-react'
import { FormField } from '../../components/form/FormField'
import { PasswordField } from '../../components/form/PasswordField'
import { SecurityNotice } from './SecurityNotice'
import { TypeOnceHeading } from './TypeOnceHeading'
import { ApiError } from '../../lib/api'
import { loginWithCredentials } from '../../lib/authSession'
import styles from './LoginForm.module.css'

type FieldErrors = {
  email?: string
  password?: string
}

/** Nest Control Plane login. Dev seed: superadmin@loor.local / ChangeMeDevOnly!123 */
export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextErrors: FieldErrors = {}
    if (!email.trim()) nextErrors.email = 'Informe seu e-mail.'
    else if (emailRef.current?.validity.typeMismatch) nextErrors.email = 'Informe um e-mail válido.'
    if (!password) nextErrors.password = 'Informe sua senha.'
    setErrors(nextErrors)

    if (nextErrors.email || nextErrors.password) {
      setNotice('')
      ;(nextErrors.email ? emailRef : passwordRef).current?.focus()
      return
    }

    setSubmitting(true)
    setNotice('')
    try {
      await loginWithCredentials(email.trim(), password)
      window.location.hash = '#/dashboard'
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setNotice('Credenciais inválidas. Verifique e-mail e senha.')
      } else if (error instanceof TypeError) {
        setNotice('Não foi possível conectar ao Control Plane. Confira se o Nest está em :3334.')
      } else {
        setNotice(error instanceof Error ? error.message : 'Falha no login.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  function handleForgotPassword() {
    setNotice('Recuperação de senha do Super Admin ainda não está disponível.')
  }

  return (
    <section className={styles.card} aria-labelledby="login-title">
      <header className={styles.header}>
        <TypeOnceHeading />
        <p className={styles.subtitle}>Entre com suas credenciais para continuar</p>
      </header>

      <form className={styles.form} noValidate onSubmit={handleSubmit}>
        <div className={styles.fields}>
          <FormField
            ref={emailRef}
            id="login-email"
            name="email"
            label="E-mail"
            icon={Mail}
            type="email"
            required
            inputMode="email"
            autoComplete="username"
            spellCheck={false}
            placeholder="seu@e-mail.com"
            value={email}
            error={errors.email}
            onChange={(event) => {
              setEmail(event.target.value)
              if (errors.email) setErrors((current) => ({ ...current, email: undefined }))
            }}
          />
          <PasswordField
            ref={passwordRef}
            id="login-password"
            name="password"
            label="Senha"
            required
            autoComplete="current-password"
            placeholder="Sua senha"
            value={password}
            error={errors.password}
            onChange={(event) => {
              setPassword(event.target.value)
              if (errors.password) setErrors((current) => ({ ...current, password: undefined }))
            }}
          />
        </div>

        <button type="submit" className={styles.submit} disabled={submitting}>
          {submitting ? 'Entrando…' : 'Entrar'}
          <ArrowRight size={20} strokeWidth={1.8} aria-hidden="true" />
        </button>

        <button type="button" className={styles.forgot} onClick={handleForgotPassword}>
          Esqueci minha senha
        </button>

        <p className={styles.notice} role="status">
          {notice}
        </p>
      </form>

      <SecurityNotice className={styles.security} />
    </section>
  )
}
