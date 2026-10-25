import { CreditCard, Link, Mail, ShieldCheck, Wallet, type LucideIcon } from 'lucide-react'
import { Panel } from '../../components/ui/Panel'
import { IconTile } from '../../components/ui/IconTile'
import styles from './OperationalStatusPanel.module.css'

const SERVICES: { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'payments', label: 'Pagamentos', icon: CreditCard },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
  { id: 'compliance', label: 'Compliance', icon: ShieldCheck },
  { id: 'smtp', label: 'E-mail/SMTP', icon: Mail },
  { id: 'gateways', label: 'Gateways', icon: Link },
]

/**
 * Conceptual status list. Every service shows the same neutral
 * "Aguardando integração" state — no health checks exist, so no green/red
 * status colours are used.
 */
export function OperationalStatusPanel({ className }: { className?: string }) {
  return (
    <Panel className={className} title="Status operacional" subtitle="Serviços e integrações principais.">
      <ul className={styles.list}>
        {SERVICES.map((service) => (
          <li key={service.id} className={styles.row}>
            <IconTile icon={service.icon} size="sm" className={styles.icon} />
            <span className={styles.label}>{service.label}</span>
            <span className={styles.pill}>
              <span className={styles.dot} aria-hidden="true" />
              Aguardando integração
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
