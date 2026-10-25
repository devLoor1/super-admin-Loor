import { BackLink, InfoNote } from '../operation/shared/OperationUi'
import { KeyValueList } from '../finance-core/shared/FinanceCoreUi'
import fin from '../finance-gateways/sections/FinanceSections.module.css'
import { isOperatorId } from './operatorApi'
import { OperatorFeedback, OperatorShell, OperatorStatus } from './OperatorUi'
import { operatorDateText } from './operatorPresent'
import { operatorReturnHref } from './operatorRoute'
import { useOperatorDetail } from './useOperators'
import styles from './Operators.module.css'

export function OperatorDetailPage({ id, returnTo, invalidQuery = false }: { id: string; returnTo?: string; invalidQuery?: boolean }) {
  const remote = useOperatorDetail(invalidQuery ? '' : id)
  const row = remote.state.status === 'success' ? remote.state.data : null
  return <OperatorShell detail>
    <div><BackLink href={operatorReturnHref(returnTo)} label="Voltar para operadores" /></div>
    {!remote.allowed ? <OperatorFeedback denied /> : !isOperatorId(id) || invalidQuery ? <OperatorFeedback invalid /> : !row ? <OperatorFeedback error={remote.state.status === 'error' ? remote.state.error : undefined} retry={remote.reload} /> : <>
      <section className={fin.card} data-operator-state="loaded"><h2 className={styles.name}>{row.name}</h2><OperatorStatus value={row.status} /><KeyValueList rows={[
        { label: 'Identificador do Control Plane', value: row.id }, { label: 'E-mail', value: row.email },
        { label: 'Último acesso (Brasília)', value: operatorDateText(row.lastLoginAt) }, { label: 'Criado em (Brasília)', value: operatorDateText(row.createdAt) }, { label: 'Atualizado em (Brasília)', value: operatorDateText(row.updatedAt) },
      ]} /><p className={styles.hint}>Último acesso ausente não comprova que o operador nunca se autenticou.</p></section>
      <section className={fin.card} aria-label="Perfis atribuídos"><h2 className={fin.cardTitleSm}>Perfis de acesso atribuídos</h2><ul className={styles.roleDetails}>{row.roleDetails.length ? row.roleDetails.map(role => <li key={role.slug}><code>{role.slug}</code><span>{role.name}</span></li>) : <li>Nenhum perfil atribuído.</li>}</ul><p className={styles.hint}>Nomes dos perfis fornecidos pelo Backend. Descrições e permissões granulares não são disponibilizadas nesta projeção.</p></section>
      <InfoNote>Consulta autoritativa somente leitura. Não altera acesso, conta, roles ou senha. Este operador não é vinculado automaticamente a um administrador de Whitelabel.</InfoNote>
    </>}
  </OperatorShell>
}
