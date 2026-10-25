import { OpportunityWritePage } from './write/OpportunityWritePage'
import { OpportunityEditorialPage } from './write/OpportunityEditorialPage'

/**
 * `#/operation/opportunities/new` and `#/operation/opportunities/:id/edit`
 * (existing routes, kept so direct links and bookmarks land on a clear state).
 * DEV retains the complete workbench. Official homolog supports no-warranty
 * creation and keeps editing limited to the accepted review/about/archive unit.
 */
export function OpportunityFormPage({ mode, opportunityId }: { mode: 'create' | 'edit'; opportunityId?: string; focusClassification?: boolean }) {
  if (import.meta.env.DEV || mode === 'create') return <OpportunityWritePage mode={mode} opportunityId={opportunityId} />
  return <OpportunityEditorialPage opportunityId={opportunityId} />
}
