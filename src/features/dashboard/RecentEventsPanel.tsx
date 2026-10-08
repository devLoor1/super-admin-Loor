import { ArrowRight, FileText } from 'lucide-react'
import { Panel } from '../../components/ui/Panel'
import { EmptyState } from '../../components/ui/EmptyState'
import { OutlineButton } from '../../components/ui/OutlineButton'
import styles from './RecentEventsPanel.module.css'

const COLUMNS = [
  { id: 'event', label: 'Evento' },
  { id: 'whitelabel', label: 'Whitelabel', secondary: true },
  { id: 'module', label: 'Módulo', secondary: true },
  { id: 'user', label: 'Usuário', secondary: true },
  { id: 'datetime', label: 'Data e hora' },
]

/**
 * Table structure prepared for future audit/activity entries. It renders the
 * header and an empty state only — no audit records are fabricated (the
 * Auditoria module's illustrative events are not dashboard data). "Ver todos"
 * opens Auditoria.
 */
export function RecentEventsPanel({ className }: { className?: string }) {
  return (
    <Panel
      className={className}
      title="Últimos eventos"
      subtitle="Atividade recente em todas as whitelabels."
      actions={
        <OutlineButton onClick={() => window.location.assign('#/audit')} data-recent-events-all>
          Ver todos
          <ArrowRight size={15} strokeWidth={1.8} aria-hidden="true" />
        </OutlineButton>
      }
    >
      <table className={styles.table}>
        <caption className="visually-hidden">Últimos eventos em todas as whitelabels</caption>
        <thead>
          <tr>
            {COLUMNS.map((column) => (
              <th key={column.id} scope="col" className={column.secondary ? styles.secondary : undefined}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        {/* No rows: audit/activity data is not integrated yet. */}
        <tbody />
      </table>
      <EmptyState
        className={styles.empty}
        icon={FileText}
        title="Sem eventos recentes"
        description="Os eventos aparecerão aqui assim que as integrações estiverem ativas."
      />
    </Panel>
  )
}
