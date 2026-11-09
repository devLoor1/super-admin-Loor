import type { ReactNode } from 'react'
import { CircleAlert, SearchX } from 'lucide-react'
import { AppShell } from '../../components/shell/AppShell'
import { EmptyState } from '../../components/ui/EmptyState'
import { OutlineButton } from '../../components/ui/OutlineButton'
import { StatusPill } from '../../components/ui/StatusPill'
import { useSessionOperator } from '../../lib/authSession'
import { describeApiError } from '../../lib/apiErrors'
import { DotMatrixBackground } from '../whitelabels/visuals/DotMatrixBackground'
import shared from '../operation/shared/Operation.module.css'
import fin from '../finance-gateways/sections/FinanceSections.module.css'
import { canReadOperators } from './operatorApi'
import { OPERATORS_HREF } from './operatorRoute'
import { operatorStatus } from './operatorPresent'
import styles from './Operators.module.css'

export function OperatorsEntry() {
  if (!canReadOperators(useSessionOperator()?.roles)) return null
  return <section className={fin.card} aria-label="Administração do Control Plane" data-operators-entry>
    <h2 className={fin.cardTitleSm}>Operadores do Control Plane</h2>
    <p>Consulte identidades administrativas e perfis de acesso. Somente leitura; não são administradores de Whitelabel.</p>
    <a className={shared.inlineLink} href={OPERATORS_HREF}>Consultar operadores</a>
  </section>
}
export function OperatorShell({ detail = false, children }: { detail?: boolean; children: ReactNode }) {
  return <AppShell activeNav="configuracoes" title="Operadores do Control Plane" location="Configurações"
    breadcrumbs={[{ label: 'Configurações', href: '#/settings/menu-visibility' }, { label: 'Operadores do Control Plane', href: detail ? OPERATORS_HREF : undefined }, ...(detail ? [{ label: 'Consulta do operador' }] : [])]}>
    <div className={shared.page}><DotMatrixBackground /><div className={shared.layout}>{children}</div></div>
  </AppShell>
}
export const OperatorStatus = ({ value }: { value: string }) => <StatusPill {...operatorStatus(value)} />
export function OperatorFeedback({ error, retry, denied = false, invalid = false }: { error?: unknown; retry?: () => void; denied?: boolean; invalid?: boolean }) {
  const view = denied ? { title: 'Acesso não permitido', description: 'Somente SUPER_ADMIN pode consultar operadores do Control Plane. Nenhum dado de operador foi carregado.', retryable: false } : invalid ? { title: 'Operador indisponível', description: 'Endereço inválido. Use um identificador do Control Plane; nenhuma consulta foi enviada.', retryable: false } : error ? describeApiError(error, 'os operadores do Control Plane') : null
  if (!view) return <section className={fin.card} aria-busy="true" role="status" data-operator-state="loading">Carregando operadores…</section>
  return <section className={fin.card} role="alert" data-operator-state={denied ? 'denied' : invalid ? 'invalid' : 'error'}>
    <EmptyState icon={invalid ? SearchX : CircleAlert} title={view.title} description={view.description} />
    {view.retryable && retry ? <OutlineButton onClick={retry}>Tentar novamente</OutlineButton> : null}
  </section>
}
export const OperatorRoles = ({ roles }: { roles: string[] }) => <ul className={styles.roles}>{roles.length ? roles.map(role => <li key={role}><code>{role}</code></li>) : <li>Nenhum perfil atribuído</li>}</ul>
