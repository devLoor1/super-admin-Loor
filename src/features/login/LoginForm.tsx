import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowRight, Mail } from 'lucide-react'
import { FormField } from '../../components/form/FormField'
import { PasswordField } from '../../components/form/PasswordField'
import { SecurityNotice } from './SecurityNotice'
import { TypeOnceHeading } from './TypeOnceHeading'
import { ApiError } from '../../lib/api'
import { describeApiError } from '../../lib/apiErrors'
import { clearAuthNotice, loginWithCredentials, peekAuthNotice } from '../../lib/authSession'
import styles from './LoginForm.module.css'

type FieldErrors = {
  email?: string
  password?: string
}

/** Nest Control Plane login. Credentials are entered only in the normal form. */
export function LoginForm() {
  const [email, setEmail] = useState('demo@example.invalid')
  const [password, setPassword] = useState('demo')
  const [errors, setErrors] = useState<FieldErrors>({})
  // A session ended by the server (401) explains itself once on the Login screen.
  const [notice, setNotice] = useState(() =>
    peekAuthNotice() === 'session_expired' ? 'Sua sessão expirou ou não é mais válida. Entre novamente.' : '',
  )
  const [submitting, setSubmitting] = useState(false)

  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  useEffect(() => clearAuthNotice(), [])

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
      } else if (error instanceof ApiError && (error.kind === 'network' || error.kind === 'timeout')) {
        setNotice(describeApiError(error, 'o acesso administrativo').description)
      } else {
        setNotice(describeApiError(error, 'o acesso administrativo').description)
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
        <p className={styles.subtitle}>Demonstração offline. Use os valores de exemplo; nunca informe credenciais reais.</p>
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
            autoComplete="off"
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
            autoComplete="off"
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
