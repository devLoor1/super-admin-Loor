import { ShieldCheck } from 'lucide-react'
import styles from './SecurityNotice.module.css'

/** Subtle, static reassurance block at the bottom of the login card. */
export function SecurityNotice({ className }: { className?: string }) {
  return (
    <div className={[styles.notice, className].filter(Boolean).join(' ')}>
      <span className={styles.badge} aria-hidden="true">
        <ShieldCheck size={20} strokeWidth={1.6} />
      </span>
      <p className={styles.text}>
        <strong className={styles.title}>Acesso seguro e protegido</strong>
        <span className={styles.body}>Seus dados são criptografados e tratados com total sigilo.</span>
      </p>
    </div>
  )
}
