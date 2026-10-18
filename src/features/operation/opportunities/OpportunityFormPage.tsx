import { Lock } from 'lucide-react'
import { EmptyState } from '../../../components/ui/EmptyState'
import { isPositiveCoreId } from '../shared/coreIds'
import { OperationShell } from '../shared/OperationUi'
import shared from '../shared/Operation.module.css'
import { opportunityHref } from './opportunityRoute'

/**
 * `#/operation/opportunities/new` and `#/operation/opportunities/:id/edit`
 * (existing routes, kept so direct links and bookmarks land on a clear state).
 * Opportunities Read V1 is READ-ONLY: creating or editing an Opportunity is
 * not available, nothing is saved locally and nothing is sent. The former
 * prototype form and its in-memory store were removed.
 */
export function OpportunityFormPage({ mode, opportunityId }: { mode: 'create' | 'edit'; opportunityId?: string; focusClassification?: boolean }) {
  const detailHref = mode === 'edit' && isPositiveCoreId(opportunityId) ? opportunityHref(opportunityId) : null
  return (
    <OperationShell section="opportunities" title="Oportunidades" trail={[mode === 'create' ? 'Nova oportunidade' : 'Editar']}>
      <div className={shared.notFound} data-opportunity-write="unavailable">
        <EmptyState
          icon={Lock}
          title={mode === 'create' ? 'Criação de oportunidades indisponível' : 'Edição de oportunidades indisponível'}
          description={
            <>
              A integração de Oportunidades com o Control Plane é somente leitura: nenhuma oportunidade é criada, editada ou salva nesta tela.{' '}
              {detailHref ? (
                <a href={detailHref} className={shared.inlineLink}>
                  Ver a oportunidade
                </a>
              ) : (
                <a href="#/operation/opportunities" className={shared.inlineLink}>
                  Voltar para Oportunidades
                </a>
              )}
            </>
          }
        />
      </div>
    </OperationShell>
  )
}
