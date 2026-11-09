import { Building2, CircleAlert, ExternalLink, RotateCw, UserX } from 'lucide-react'
import { EmptyState } from '../../../components/ui/EmptyState'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import { BusinessBadge } from '../../whitelabel-accounts/AccountBadges'
import fin from '../../finance-gateways/sections/FinanceSections.module.css'
import { DetailList } from '../shared/OperationUi'
import { operationReadErrorView } from '../shared/readErrors'
import shared from '../shared/Operation.module.css'
import states from '../shared/ReadStates.module.css'
import type { CompanyDetail } from './companyApi'
import { companyDisplayName, companyStatusMeta, formatCnpj } from './companyPresent'
import { companyHref } from './companyRoute'
import { companyRelationState, type CompanyRemote } from './companyRelation'
import styles from './Companies.module.css'

/*
 * Entrepreneur → Company (0..1) from `GET /entrepreneurs/:id/company`, shared
 * by the Entrepreneur profile and the Opportunity detail. The four Backend
 * outcomes stay distinct:
 *   - Company present        → the authoritative Company (linked by its own id);
 *   - `data: null`           → "Sem empresa vinculada" (a real, confirmed absence);
 *   - 404 E_ENTREPRENEUR_NOT_FOUND → the Entrepreneur is not confirmed (never "no Company");
 *   - any other failure      → an error with retry where it can succeed (never "no Company").
 * No Company is ever synthesized, and nothing from the Entrepreneur record is reused.
 */

/** Compact value for a hero / summary row. */
export function CompanyRelationValue({ remote }: { remote: CompanyRemote }) {
  const state = companyRelationState(remote)
  if (state === 'present' && remote.state.status === 'success' && remote.state.data) {
    const company = remote.state.data
    return (
      <a href={companyHref(company.id)} className={shared.inlineLink} data-company-value="present">
        {companyDisplayName(company)}
      </a>
    )
  }
  if (state === 'absent') return <BusinessBadge tone="neutral" label="Sem empresa vinculada" />
  if (state === 'loading') {
    return (
      <span className={shared.muted} data-company-value="loading">
        Carregando…
      </span>
    )
  }
  return <BusinessBadge tone="negative" label={state === 'entrepreneur-not-found' ? 'Vínculo não confirmado' : 'Empresa indisponível'} />
}

export function EntrepreneurCompanyPanel({
  remote,
  variant,
  entrepreneurId,
}: {
  remote: CompanyRemote
  variant: 'entrepreneur' | 'opportunity'
  entrepreneurId: string
}) {
  const state = companyRelationState(remote)
  const title = variant === 'entrepreneur' ? 'Empresa' : 'Empresa do empreendedor responsável'
  const intro =
    variant === 'entrepreneur'
      ? 'Empresa vinculada a este empreendedor no Control Plane (no máximo uma). Somente leitura.'
      : `O contrato de Oportunidades não traz empresa. Esta é a empresa vinculada ao empreendedor #${entrepreneurId} (no máximo uma).`

  return (
    <section className={fin.card} aria-labelledby="entrepreneur-company-title" data-company-panel={state} aria-busy={state === 'loading' || undefined}>
      <h3 id="entrepreneur-company-title" className={fin.cardTitleSm}>
        {title}
      </h3>
      <p className={fin.cardSubtitle}>{intro}</p>
      {state === 'loading' ? (
        <div className={states.heroSkeleton} aria-hidden="true">
          <span className={states.skeleton} />
          <span className={states.skeleton} />
        </div>
      ) : null}
      {state === 'loading' ? (
        <p className="visually-hidden" role="status">
          Carregando empresa…
        </p>
      ) : null}
      {state === 'present' && remote.state.status === 'success' && remote.state.data ? <CompanySummary company={remote.state.data} /> : null}
      {state === 'absent' ? (
        <div className={states.unavailable} data-company-absent>
          <EmptyState
            icon={Building2}
            title="Sem empresa vinculada"
            description="O Control Plane confirma que este empreendedor existe e não tem empresa cadastrada. Nenhuma empresa é exibida ou inferida."
          />
        </div>
      ) : null}
      {state === 'entrepreneur-not-found' ? (
        <div className={states.feedback} role="alert" data-company-entrepreneur-missing>
          <EmptyState
            icon={UserX}
            title="Vínculo não confirmado"
            description={`O Control Plane não reconhece o empreendedor #${entrepreneurId} neste Whitelabel. Isto não significa que ele não tenha empresa; nada foi exibido.`}
          />
        </div>
      ) : null}
      {state === 'error' && remote.state.status === 'error' ? <CompanyError error={remote.state.error} onRetry={remote.reload} /> : null}
    </section>
  )
}

function CompanyError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const base = operationReadErrorView(error, 'a empresa do empreendedor')
  // Only 404 E_ENTREPRENEUR_NOT_FOUND has a meaning here (handled above); any other 404 confirms nothing.
  const view = base.notFound
    ? { ...base, title: 'Vínculo não confirmado', description: 'O Control Plane respondeu 404 sem identificar o motivo; nem o empreendedor nem a empresa foram confirmados.' }
    : base
  return (
    <div className={states.feedback} role="alert" data-company-error>
      <EmptyState icon={CircleAlert} title={view.title} description={`${view.description} A empresa não é dada como inexistente.`} />
      {view.correlationId ? (
        <p className={states.diagnostic}>
          Código de diagnóstico: <code className={states.code}>{view.correlationId}</code>
        </p>
      ) : null}
      {view.retryable ? (
        <OutlineButton onClick={onRetry} data-retry>
          <RotateCw size={14} strokeWidth={1.8} aria-hidden="true" />
          Tentar novamente
        </OutlineButton>
      ) : null}
    </div>
  )
}

function CompanySummary({ company }: { company: CompanyDetail }) {
  const status = companyStatusMeta(company.status)
  const href = companyHref(company.id)
  return (
    <div data-company-present={company.id}>
      <DetailList
        rows={[
          {
            label: 'Razão social',
            value: (
              <a href={href} className={shared.inlineLink}>
                {companyDisplayName(company)}
              </a>
            ),
          },
          { label: 'Nome fantasia', value: company.tradeName ?? 'Não informado' },
          { label: 'CNPJ', value: <span className={styles.mono}>{formatCnpj(company.cnpj) ?? 'Não informado'}</span> },
          { label: 'Validação', value: <BusinessBadge tone={status.tone} label={status.label} /> },
          { label: 'ID da empresa', value: <span className={styles.code}>{company.id}</span> },
        ]}
      />
      <div className={styles.panelActions}>
        <a href={href} className={shared.inlineLink} data-open-company={company.id}>
          Ver empresa
          <ExternalLink size={13} strokeWidth={1.8} aria-hidden="true" />
        </a>
      </div>
    </div>
  )
}
