import { useMemo } from 'react'
import { Building2, CircleAlert, Info, Link2, RotateCw, ScanFace, SearchX, Target, UserRound, Wallet, type LucideIcon } from 'lucide-react'
import type { Breadcrumb } from '../../../components/shell/TopHeader'
import { EmptyState } from '../../../components/ui/EmptyState'
import outline from '../../../components/ui/OutlineButton.module.css'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import fin from '../../finance-gateways/sections/FinanceSections.module.css'
import { formatPhone } from '../shared/businessPresentation'
import { entrepreneurHref } from '../entrepreneurs/entrepreneurRoute'
import { crumbLabel } from '../shared/operationModel'
import { BackLink, DetailList, InfoNote, OperationShell } from '../shared/OperationUi'
import { operationReadErrorView } from '../shared/readErrors'
import { useWhitelabelRecord } from '../shared/whitelabelContext'
import shared from '../shared/Operation.module.css'
import participants from '../shared/Participants.module.css'
import states from '../shared/ReadStates.module.css'
import type { CompanyDetail } from './companyApi'
import { companyDate, companyDisplayName, formatCnpj, validationSourceLabel } from './companyPresent'
import { companyListReturnHash, parseCompanyRoute } from './companyRoute'
import { CompanyStatusBadge, CompanyTenant } from './CompanyParts'
import { useCompanyDetail } from './useCompanyData'
import styles from './Companies.module.css'

/**
 * `#/operation/companies/:companyId` — read-only Company from
 * `GET /companies/:id`. Sections: Empresa, Contato, Relacionamentos, Sistema.
 * KYC, Oportunidades and Finanças are not part of the Company record and stay
 * pending: no fake KYC, opportunity, investment or payment data. The
 * Entrepreneur link is `company.entrepreneurId` (never inferred from names).
 */
export function CompanyDetailPage({ companyId, returnTo, previa }: { companyId: string; returnTo?: string; previa?: string }) {
  // The prototype-era `?previa=` state preview no longer exists: reported, never applied.
  const ignored = useMemo(() => (previa === undefined ? [] : parseCompanyRoute({ previa }).ignored), [previa])
  const detail = useCompanyDetail(companyId)
  const listHref = companyListReturnHash(returnTo)
  const listCrumb: Breadcrumb = { label: 'Empresas', href: listHref }
  const error = detail.state.status === 'error' ? operationReadErrorView(detail.state.error, 'a empresa') : null
  const back = (
    <div>
      <BackLink href={listHref} label="Voltar para Empresas" />
    </div>
  )

  if (error?.notFound) {
    return (
      <OperationShell section="entrepreneurs" title="Empresas" trail={[listCrumb, 'Não encontrada']}>
        <div className={shared.notFound} data-company-state="not-found">
          <EmptyState
            icon={SearchX}
            title="Empresa não encontrada"
            description={
              <>
                Nenhuma empresa do Control Plane usa o ID “{companyId}”.{' '}
                <a href={listHref} className={shared.inlineLink}>
                  Voltar para Empresas
                </a>
              </>
            }
          />
        </div>
      </OperationShell>
    )
  }

  if (error) {
    return (
      <OperationShell section="entrepreneurs" title="Empresas" trail={[listCrumb, `ID ${companyId}`]}>
        {back}
        <section className={`${fin.card} ${states.feedback}`} role="alert" data-company-state="error">
          <EmptyState icon={CircleAlert} title={error.title} description={error.description} />
          {error.correlationId ? (
            <p className={states.diagnostic}>
              Código de diagnóstico: <code className={states.code}>{error.correlationId}</code>
            </p>
          ) : null}
          {error.retryable ? (
            <OutlineButton onClick={detail.reload} data-retry>
              <RotateCw size={14} strokeWidth={1.8} aria-hidden="true" />
              Tentar novamente
            </OutlineButton>
          ) : null}
        </section>
      </OperationShell>
    )
  }

  if (detail.state.status !== 'success') {
    return (
      <OperationShell section="entrepreneurs" title="Empresas" trail={[listCrumb, `ID ${companyId}`]}>
        {back}
        <section className={`${fin.card} ${shared.hero}`} aria-busy="true" aria-label="Carregando empresa" data-company-state="loading">
          <span className={participants.heroAvatar} aria-hidden="true" />
          <div className={states.heroSkeleton} aria-hidden="true">
            <span className={states.skeleton} />
            <span className={states.skeleton} />
            <span className={states.skeleton} />
          </div>
          <p className="visually-hidden" role="status">
            Carregando empresa…
          </p>
        </section>
      </OperationShell>
    )
  }

  const company = detail.state.data
  return (
    <OperationShell section="entrepreneurs" title="Empresas" trail={[listCrumb, crumbLabel(companyDisplayName(company))]}>
      {back}
      {ignored.length ? (
        <p className={states.ignoredNote} role="status" data-ignored-params>
          <Info size={14} strokeWidth={1.9} aria-hidden="true" />
          Parâmetro da URL não reconhecido e ignorado: {ignored.join(', ')}.
        </p>
      ) : null}
      <CompanyProfile company={company} />
    </OperationShell>
  )
}


function CompanyProfile({ company }: { company: CompanyDetail }) {
  const whitelabel = useWhitelabelRecord(company.whitelabelId)
  const tenant = whitelabel.state.status === 'success' ? whitelabel.state.data.name : `Whitelabel #${company.whitelabelId}`
  const date = (value: string | null) => companyDate(value, true) ?? 'Não informado'
  const name = companyDisplayName(company)
  const cnpj = formatCnpj(company.cnpj)


  const entrepreneurLink = (
    <a href={entrepreneurHref(company.entrepreneurId)} className={shared.inlineLink} data-relation="entrepreneur">
      Empreendedor #{company.entrepreneurId}
    </a>
  )

  return (
    <>
      <section className={`${fin.card} ${shared.hero}`} aria-labelledby="company-title" data-company-state="loaded">
        <span className={shared.heroIcon} aria-hidden="true">
          <Building2 size={24} strokeWidth={1.6} />
        </span>
        <div className={shared.heroHeading}>
          <div className={shared.heroTitleRow}>
            <h2 id="company-title" className={shared.heroTitle}>
              {name}
            </h2>
            <CompanyStatusBadge status={company.status} />
          </div>
          {company.tradeName && company.legalName ? <p className={styles.heroSub}>{company.tradeName}</p> : null}
          <p className={shared.heroId}>ID da empresa (Control Plane): {company.id}</p>
          <div className={shared.heroMeta}>
            <div className={shared.heroMetaItem}>
              <span className={shared.heroMetaLabel}>Empreendedor</span>
              <span className={shared.heroMetaValue}>{entrepreneurLink}</span>
            </div>
            <div className={shared.heroMetaItem}>
              <span className={shared.heroMetaLabel}>Whitelabel</span>
              <span className={shared.heroMetaValue}>
                <CompanyTenant whitelabelId={company.whitelabelId} name={tenant} />
              </span>
            </div>
            <div className={shared.heroMetaItem}>
              <span className={shared.heroMetaLabel}>CNPJ</span>
              <span className={`${shared.heroMetaValue} ${styles.mono}`}>{cnpj ?? 'Não informado'}</span>
            </div>
          </div>
        </div>
        <div className={shared.heroActions}>
          <a href={entrepreneurHref(company.entrepreneurId)} className={`${outline.button} ${shared.secondaryButton}`} data-hero="entrepreneur">
            <UserRound size={15} strokeWidth={1.8} aria-hidden="true" />
            Ver empreendedor
          </a>
        </div>
      </section>

      <div className={shared.panelGrid}>
        <section className={fin.card} aria-labelledby="company-section-company" data-company-section="company">
          <h3 id="company-section-company" className={fin.cardTitleSm}>
            Empresa
          </h3>
          <p className={fin.cardSubtitle}>Dados do Control Plane — somente leitura.</p>
          <DetailList
            rows={[
              { label: 'Razão social', value: company.legalName ?? 'Não informada' },
              { label: 'Nome fantasia', value: company.tradeName ?? 'Não informado' },
              { label: 'CNPJ', value: <span className={styles.mono}>{cnpj ?? 'Não informado'}</span> },
              { label: 'Status da validação', value: <CompanyStatusBadge status={company.status} /> },
              { label: 'Fonte da validação', value: validationSourceLabel(company.validationSource) },
              { label: 'Validada em', value: date(company.validatedAt) },
            ]}
          />
        </section>

        <section className={fin.card} aria-labelledby="company-section-contact" data-company-section="contact">
          <h3 id="company-section-contact" className={fin.cardTitleSm}>
            Contato
          </h3>
          <p className={fin.cardSubtitle}>Contato da empresa informado pelo Control Plane.</p>
          <DetailList
            rows={[
              { label: 'E-mail', value: company.email ?? 'Não informado' },
              { label: 'Telefone', value: formatPhone(company.phone) ?? 'Não informado' },
            ]}
          />
        </section>
      </div>

      <div className={shared.panelGrid}>
        <section className={fin.card} aria-labelledby="company-section-relationships" data-company-section="relationships">
          <h3 id="company-section-relationships" className={fin.cardTitleSm}>
            Relacionamentos
          </h3>
          <p className={fin.cardSubtitle}>Empreendedor e Whitelabel aos quais a empresa está vinculada.</p>
          <DetailList
            rows={[
              { label: 'Empreendedor', value: entrepreneurLink },
              {
                label: 'Whitelabel',
                value: (
                  <span className={shared.cellText}>
                    <CompanyTenant whitelabelId={company.whitelabelId} name={tenant} />
                    <a href={`#/whitelabels?id=${encodeURIComponent(company.whitelabelId)}`} className={shared.inlineLink} data-relation="whitelabel">
                      Ver Whitelabel (ID {company.whitelabelId})
                    </a>
                  </span>
                ),
              },
            ]}
          />
          <p className={`${shared.callout} ${styles.sectionCallout}`}>
            <Link2 size={15} strokeWidth={1.8} aria-hidden="true" />
            <span>
              O vínculo oficial é <code className={styles.code}>company.entrepreneurId</code>: cada empresa pertence a exatamente um empreendedor, e cada
              empreendedor tem no máximo uma empresa. Empresa, empreendedor e Whitelabel têm identidades independentes.
            </span>
          </p>
        </section>

        <section className={fin.card} aria-labelledby="company-section-system" data-company-section="system">
          <h3 id="company-section-system" className={fin.cardTitleSm}>
            Sistema
          </h3>
          <DetailList
            rows={[
              { label: 'ID da empresa', value: <span className={styles.code}>{company.id}</span> },
              { label: 'Origem dos dados', value: 'Control Plane' },
              { label: 'Criada em', value: date(company.createdAt) },
              { label: 'Atualizada em', value: date(company.updatedAt) },
            ]}
          />
        </section>
      </div>

      <section className={fin.card} aria-labelledby="company-section-domains" data-company-section="pending-domains">
        <h3 id="company-section-domains" className={fin.cardTitleSm}>
          Outros domínios
        </h3>
        <p className={fin.cardSubtitle}>Não fazem parte do cadastro da empresa.</p>
        <ul className={styles.domains}>
          <PendingDomain icon={ScanFace} title="KYC" note="Aguardando integração do KYC" />
          <PendingDomain icon={Target} title="Oportunidades" note="O Control Plane não oferece consulta de oportunidades por empresa ou empreendedor" />
          <PendingDomain icon={Wallet} title="Finanças" note="Sem dados financeiros — nenhum total ou valor é exibido" />
        </ul>
      </section>

      <InfoNote>
        <strong>Somente leitura.</strong> Criação, edição e remoção de Empresas não fazem parte desta integração. Nenhum dado desta tela é derivado do
        perfil do empreendedor.
      </InfoNote>
    </>
  )
}

function PendingDomain({ icon: Icon, title, note }: { icon: LucideIcon; title: string; note: string }) {
  return (
    <li className={styles.domain} data-pending-domain={title}>
      <span className={styles.domainIcon} aria-hidden="true">
        <Icon size={16} strokeWidth={1.7} />
      </span>
      <span className={styles.domainText}>
        {title}
        <span className={styles.domainNote}>{note}</span>
      </span>
      <span className={`${shared.pendingTag} ${styles.domainTag}`}>Indisponível</span>
    </li>
  )
}
