import { Box, Building, ChevronRight, CreditCard, FileSearch, type LucideIcon } from 'lucide-react'
import { Panel } from '../../components/ui/Panel'
import { IconTile, type Tone } from '../../components/ui/IconTile'
import { moduleUnavailable, usePrototypeNotice } from '../../components/shell/prototypeNotice'
import styles from './QuickActionsPanel.module.css'

const ACTIONS: { id: string; title: string; description: string; module: string; icon: LucideIcon; tone: Tone }[] = [
  { id: 'whitelabels', title: 'Ver Whitelabels', description: 'Gerencie todas as plataformas', module: 'Plataformas', icon: Building, tone: 'blue' },
  { id: 'operacao', title: 'Abrir Operação', description: 'Acompanhe a operação global', module: 'Operação', icon: Box, tone: 'violet' },
  { id: 'pagamentos', title: 'Consultar Pagamentos', description: 'Acesse transações e repasses', module: 'Financeiro', icon: CreditCard, tone: 'amber' },
  { id: 'auditoria', title: 'Acessar Auditoria', description: 'Consulte logs e histórico', module: 'Auditoria', icon: FileSearch, tone: 'plum' },
]

/** Shortcuts into the main domains. Destinations are out of scope: each shows a prototype notice. */
export function QuickActionsPanel({ className }: { className?: string }) {
  const notify = usePrototypeNotice()

  return (
    <Panel className={className} title="Ações rápidas" subtitle="Acesse as principais áreas do sistema.">
      <ul className={styles.grid}>
        {ACTIONS.map((action) => (
          <li key={action.id}>
            <button type="button" className={styles.action} onClick={() => notify(moduleUnavailable(action.module))}>
              <IconTile icon={action.icon} tone={action.tone} size="md" />
              <span className={styles.text}>
                <span className={styles.title}>{action.title}</span>
                <span className={styles.description}>{action.description}</span>
              </span>
              <ChevronRight className={styles.chevron} size={15} strokeWidth={1.8} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
