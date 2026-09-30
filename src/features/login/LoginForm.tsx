import { useRef, useState, type FormEvent } from 'react'
import { ArrowRight, Mail } from 'lucide-react'
import { FormField } from '../../components/form/FormField'
import { PasswordField } from '../../components/form/PasswordField'
import { SecurityNotice } from './SecurityNotice'
import styles from './LoginForm.module.css'

type FieldErrors = {
  email?: string
  password?: string
}

/**
 * Login card.
 *
 * VISUAL PROTOTYPE ONLY — nothing here authenticates or leaves the browser.
 * Submitting only runs a local "required fields" check and then shows a
 * neutral notice. Backend integration is intentionally out of scope.
 */
export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [notice, setNotice] = useState('')

  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextErrors: FieldErrors = {}
    if (!email.trim()) nextErrors.email = 'Informe seu e-mail.'
    else if (emailRef.current?.validity.typeMismatch) nextErrors.email = 'Informe um e-mail válido.'
    if (!password) nextErrors.password = 'Informe sua senha.'
    setErrors(nextErrors)

    if (nextErrors.email || nextErrors.password) {
      setNotice('')
      // Move focus to the first invalid field so keyboard users land on the problem.
      ;(nextErrors.email ? emailRef : passwordRef).current?.focus()
      return
    }

    setNotice('Protótipo visual: a autenticação ainda não está conectada.')
  }

  function handleForgotPassword() {
    setNotice('Protótipo visual: a recuperação de senha ainda não está disponível.')
  }

  return (
    <section className={styles.card} aria-labelledby="login-title">
      <header className={styles.header}>
        <h1 id="login-title" className={styles.title}>
          Acesso administrativo
        </h1>
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

        <button type="submit" className={styles.submit}>
          Entrar
          <ArrowRight size={20} strokeWidth={1.8} aria-hidden="true" />
        </button>

        <button type="button" className={styles.forgot} onClick={handleForgotPassword}>
          Esqueci minha senha
        </button>

        {/* Live region is always mounted so screen readers announce updates. */}
        <p className={styles.notice} role="status">
          {notice}
        </p>
      </form>

      <SecurityNotice className={styles.security} />
    </section>
  )
}
