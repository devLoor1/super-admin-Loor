import { Lock } from 'lucide-react'
import { EmptyState } from '../../../components/ui/EmptyState'
import { OperationShell } from '../shared/OperationUi'
import shared from '../shared/Operation.module.css'
import { OpportunityWritePage } from './write/OpportunityWritePage'
import { OpportunityEditorialPage } from './write/OpportunityEditorialPage'

/**
 * `#/operation/opportunities/new` and `#/operation/opportunities/:id/edit`
 * (existing routes, kept so direct links and bookmarks land on a clear state).
 * DEV retains the complete candidate. Official homolog releases only the
 * accepted review/about/archive subset; creation remains unavailable.
 */
export function OpportunityFormPage({ mode, opportunityId }: { mode: 'create' | 'edit'; opportunityId?: string; focusClassification?: boolean }) {
  if (import.meta.env.DEV) return <OpportunityWritePage mode={mode} opportunityId={opportunityId} />
  if (mode === 'edit') return <OpportunityEditorialPage opportunityId={opportunityId} />
  return (
    <OperationShell section="opportunities" title="Oportunidades" trail={[mode === 'create' ? 'Nova oportunidade' : 'Editar']}>
      <div className={shared.notFound} data-opportunity-write="unavailable">
        <EmptyState
          icon={Lock}
          title={mode === 'create' ? 'Criação de oportunidades indisponível' : 'Edição de oportunidades indisponível'}
          description={
            <>
              A criação ainda não está disponível nesta integração. Nenhuma oportunidade é criada ou enviada por esta tela.{' '}
              <a href="#/operation/opportunities" className={shared.inlineLink}>
                Voltar para Oportunidades
              </a>
            </>
          }
        />
      </div>
    </OperationShell>
  )
}
