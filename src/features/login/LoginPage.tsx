import { LoginForm } from './LoginForm'
import { LoginVisualPanel } from './LoginVisualPanel'
import styles from './LoginPage.module.css'

/**
 * Super Admin login — visual prototype.
 *
 * Desktop: dark institutional panel (left) + light surface with the login card (right).
 * Below 1024px the panel collapses into a compact header so the form stays first.
 */
export function LoginPage() {
  return (
    <div className={styles.page}>
      <LoginVisualPanel />
      <main className={styles.main}>
        <LoginForm />
      </main>
    </div>
  )
}
