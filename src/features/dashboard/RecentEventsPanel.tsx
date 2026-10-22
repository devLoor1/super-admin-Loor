import { ArrowRight, CircleAlert, FileText } from 'lucide-react'
import { Panel } from '../../components/ui/Panel'
import { EmptyState } from '../../components/ui/EmptyState'
import { OutlineButton } from '../../components/ui/OutlineButton'
import { StatusPill } from '../../components/ui/StatusPill'
import { formatDateTime } from '../operation/shared/operationModel'
import { recentAuditView, type RecentAuditView } from './recentAuditEvents'
import { useRecentAuditEvents } from './useRecentAuditEvents'
import styles from './RecentEventsPanel.module.css'

const COLUMNS = [
  { id: 'event', label: 'Evento' },
  { id: 'resource', label: 'Recurso' },
  { id: 'whitelabel', label: 'Whitelabel' },
  { id: 'operator', label: 'Operador' },
  { id: 'result', label: 'Resultado' },
  { id: 'datetime', label: 'Data e hora' },
]

/** Pure view accepts only the safe projection, never raw Audit payloads or detail links. */
export function RecentAuditContent({ view, onRetry }: { view: RecentAuditView; onRetry: () => void }) {
  return (
    <div className={styles.content} data-recent-audit={view.status} aria-busy={view.status === 'loading'}>
      {view.status === 'ready' && view.rows.length > 0 ? <p className={styles.scrollHint}>Role a tabela horizontalmente para ver todas as colunas. No teclado, foque a tabela e use as setas.</p> : null}
      <div className={styles.tableRegion} role="region" aria-label="Últimos eventos de auditoria: tabela" tabIndex={0}>
      <table className={styles.table}>
        <caption className="visually-hidden">Até oito registros recentes de auditoria do Control Plane, mais recentes primeiro. Datas em America/Sao_Paulo (Brasília).</caption>
        <thead>
          <tr>
            {COLUMNS.map((column) => (
              <th key={column.id} scope="col">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {view.status === 'loading' ? Array.from({ length: 8 }, (_, index) => <tr key={index} aria-hidden="true" data-recent-audit-skeleton>
            {COLUMNS.map((column) => <td key={column.id}><span className={styles.skeleton} /></td>)}
          </tr>) : view.status === 'ready' ? view.rows.map((row) => <tr key={row.id} data-recent-audit-row>
            <th scope="row">{row.event}</th>
            <td>{row.resource}</td><td>{row.whitelabel}</td><td>{row.operator}</td>
            <td><StatusPill tone={row.result.tone} label={row.result.label} /></td>
            <td><time dateTime={row.createdAt}>{row.dateTime}</time></td>
          </tr>) : null}
        </tbody>
      </table>
      </div>
      {view.status === 'loading' ? <p className={styles.note} role="status">Consultando os eventos de auditoria…</p>
        : view.status === 'unavailable' ? <div className={styles.feedback} role="status">
          <EmptyState className={styles.empty} icon={CircleAlert} title={view.title} description={view.description} />
          {view.correlationId ? <p className={styles.note}>Código de diagnóstico: <code>{view.correlationId}</code></p> : null}
          {view.retryable ? <OutlineButton onClick={onRetry} aria-label="Tentar novamente: eventos de auditoria">Tentar novamente</OutlineButton> : null}
        </div> : <>
          {view.total === 0 ? <div role="status"><EmptyState className={styles.empty} icon={FileText} title="Nenhum evento de auditoria registrado." description="Consulta somente leitura do Control Plane." /></div> : null}
          <p className={styles.note}>
            {view.rows.length} de {new Intl.NumberFormat('pt-BR').format(view.total)} registros. Consulta em {formatDateTime(view.consultedAt)} (Brasília).
            {' '}Sem atualização contínua. Auditoria não representa atividade operacional.
          </p>
        </>}
    </div>
  )
}

export function RecentEventsPanel({ className }: { className?: string }) {
  const resource = useRecentAuditEvents()
  return (
    <Panel className={className} title="Últimos eventos de auditoria" subtitle="Registros recentes de autenticação e ações administrativas."
      actions={<OutlineButton onClick={() => window.location.assign('#/audit')} data-recent-events-all>
        Ver todos<ArrowRight size={15} strokeWidth={1.8} aria-hidden="true" />
      </OutlineButton>}>
      <RecentAuditContent view={recentAuditView(resource.state)} onRetry={resource.reload} />
    </Panel>
  )
}
