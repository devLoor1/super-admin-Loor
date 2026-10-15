import { useMemo, type ReactNode } from 'react'
import { Building2, CircleAlert, Info, Link2, RotateCw, ScanFace, SearchX, Target, Unplug, Wallet, type LucideIcon } from 'lucide-react'
import type { Breadcrumb } from '../../../components/shell/TopHeader'
import { EmptyState } from '../../../components/ui/EmptyState'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import { describeApiError } from '../../../lib/apiErrors'
import fin from '../../finance-gateways/sections/FinanceSections.module.css'
import { formatWhitelabelDate } from '../../whitelabels/whitelabelApi'
import { crumbLabel } from '../shared/operationModel'
import { BackLink, DetailList, InfoNote, OperationShell } from '../shared/OperationUi'
import shared from '../shared/Operation.module.css'
import participants from '../shared/Participants.module.css'
import states from '../shared/ReadStates.module.css'
import type { CompanyRelationView, CompanyView } from './companyPresent'
import { companyDetailPreviewHref, companyListReturnHash, parseCompanyPreview, type CompanyPreview } from './companyRoute'
import { OfficialStatus, PreviewNotice, ProvenanceNotice, RelationValue } from './CompanyParts'
import { useCompanyDetail } from './useCompanyData'
import styles from './Companies.module.css'

const DETAIL_PREVIEWS: readonly CompanyPreview[] = ['loading', 'unavailable', 'error']

/**
 * `#/operation/companies/:companyId` — read-only Company detail (prototype).
 * Sections: Empresa, Relacionamentos, Sistema. KYC, Oportunidades and
 * Finanças are not part of the Company record and stay pending: no fake
 * finance, opportunity, KYC, investment or payment data. Illustrative
 * Entrepreneur / Whitelabel references are never linked or requested.
 */
export function CompanyDetailPage({ companyId, returnTo, previa }: { companyId: string; returnTo?: string; previa?: string }) {
  const { preview, ignored } = useMemo(() => {
    const ignoredParams: string[] = []
    return { preview: parseCompanyPreview(previa, DETAIL_PREVIEWS, ignoredParams), ignored: ignoredParams }
  }, [previa])
  const detail = useCompanyDetail(companyId, preview)
  const listHref = companyListReturnHash(returnTo)
  const listCrumb: Breadcrumb = { label: 'Empresas', href: listHref }
  const error = detail.state.status === 'error' ? describeApiError(detail.state.error, 'a empresa') : null
  const previewNotice = preview ? <PreviewNotice preview={preview} exitHref={companyDetailPreviewHref(companyId, undefined, returnTo)} /> : null
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
                Nenhuma empresa ilustrativa usa o ID “{companyId}”. A integração de Empresas está pendente: nenhum dado do Control Plane foi
                consultado.{' '}
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

  if (detail.state.status === 'unavailable') {
    return (
      <OperationShell section="entrepreneurs" title="Empresas" trail={[listCrumb, `ID ${companyId}`]}>
        {back}
        {previewNotice}
        <section className={`${fin.card} ${states.feedback}`} data-company-state="unavailable">
          <EmptyState
            icon={Unplug}
            title="Contrato de Empresas indisponível"
            description="O Control Plane ainda não oferece o detalhe de Empresas. Nenhum dado é exibido e nenhuma requisição foi feita."
          />
        </section>
      </OperationShell>
    )
  }

  if (error) {
    return (
      <OperationShell section="entrepreneurs" title="Empresas" trail={[listCrumb, `ID ${companyId}`]}>
        {back}
        {previewNotice}
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
        {previewNotice}
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
    <OperationShell section="entrepreneurs" title="Empresas" trail={[listCrumb, crumbLabel(company.displayName)]}>
      {back}
      {company.provenance === 'prototype' ? <ProvenanceNotice detail /> : null}
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

function CompanyProfile({ company }: { company: CompanyView }) {
  const illustrative = company.provenance === 'prototype'
  const date = (value: string | null) => formatWhitelabelDate(value, true) ?? 'Não informado'

  return (
    <>
      <section className={`${fin.card} ${shared.hero}`} aria-labelledby="company-title" data-company-state="loaded" data-provenance={company.provenance}>
        <span className={shared.heroIcon} aria-hidden="true">
          <Building2 size={24} strokeWidth={1.6} />
        </span>
        <div className={shared.heroHeading}>
          <div className={shared.heroTitleRow}>
            <h2 id="company-title" className={shared.heroTitle}>
              {company.displayName}
            </h2>
          </div>
          {company.tradeName && company.legalName ? <p className={styles.heroSub}>{company.tradeName}</p> : null}
          <p className={shared.heroId}>
            {illustrative ? 'ID ilustrativo da empresa' : 'ID da empresa (Control Plane)'}: {company.id}
          </p>
          <div className={shared.heroMeta}>
            <div className={shared.heroMetaItem}>
              <span className={shared.heroMetaLabel}>Empreendedor</span>
              <span className={shared.heroMetaValue}>
                <RelationValue relation={company.entrepreneur} kind="entrepreneur" />
              </span>
            </div>
            <div className={shared.heroMetaItem}>
              <span className={shared.heroMetaLabel}>Whitelabel</span>
              <span className={shared.heroMetaValue}>
                <RelationValue relation={company.whitelabel} kind="whitelabel" />
              </span>
            </div>
            <div className={shared.heroMetaItem}>
              <span className={shared.heroMetaLabel}>Status oficial</span>
              <span className={shared.heroMetaValue} data-official-status>
                <OfficialStatus status={company.officialStatus} />
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className={shared.panelGrid}>
        <section className={fin.card} aria-labelledby="company-section-company" data-company-section="company">
          <h3 id="company-section-company" className={fin.cardTitleSm}>
            Empresa
          </h3>
          <p className={fin.cardSubtitle}>
            {illustrative ? 'Identificação ilustrativa — somente leitura.' : 'Dados do Control Plane — somente leitura.'}
          </p>
          <DetailList
            rows={[
              { label: 'Razão social', value: company.legalName ?? 'Não informada' },
              { label: 'Nome fantasia', value: company.tradeName ?? 'Não informado' },
              {
                label: 'CNPJ',
                value: (
                  <span className={styles.valueStack}>
                    <span className={styles.mono}>{company.taxIdMasked ?? 'Não informado'}</span>
                    {company.taxIdMasked ? (
                      <span className={styles.valueNote}>
                        {illustrative ? 'Valor sintético, exibido mascarado. ' : 'Exibido mascarado. '}
                        Formato, validação e unicidade aguardam definição.
                      </span>
                    ) : null}
                  </span>
                ),
              },
              { label: 'Status oficial', value: <OfficialStatus status={company.officialStatus} /> },
            ]}
          />
        </section>

        <section className={fin.card} aria-labelledby="company-section-relationships" data-company-section="relationships">
          <h3 id="company-section-relationships" className={fin.cardTitleSm}>
            Relacionamentos
          </h3>
          <p className={fin.cardSubtitle}>
            {illustrative ? 'Referências ilustrativas, sem vínculo com registros do Control Plane.' : 'Empreendedor e Whitelabel aos quais a empresa está vinculada.'}
          </p>
          <DetailList
            rows={[
              { label: 'Empreendedor', value: <RelationDetail relation={company.entrepreneur} kind="entrepreneur" /> },
              { label: 'Whitelabel', value: <RelationDetail relation={company.whitelabel} kind="whitelabel" /> },
            ]}
          />
          <p className={`${shared.callout} ${styles.sectionCallout}`}>
            <Link2 size={15} strokeWidth={1.8} aria-hidden="true" />
            <span>
              No contrato futuro, o vínculo oficial será <code className={styles.code}>company.entrepreneurId</code> (e{' '}
              <code className={styles.code}>company.whitelabelId</code>). Empresa e empreendedor são entidades distintas, com identidades
              independentes; a quantidade de empresas por empreendedor ainda não foi definida.
            </span>
          </p>
        </section>
      </div>

      <div className={shared.panelGrid}>
        <section className={fin.card} aria-labelledby="company-section-system" data-company-section="system">
          <h3 id="company-section-system" className={fin.cardTitleSm}>
            Sistema
          </h3>
          <DetailList
            rows={[
              { label: 'ID da empresa', value: <span className={styles.code}>{company.id}</span> },
              { label: 'Origem dos dados', value: illustrative ? 'Ilustrativa (protótipo)' : 'Control Plane' },
              { label: 'Criado em', value: date(company.createdAt) },
              { label: 'Atualizado em', value: date(company.updatedAt) },
            ]}
          />
        </section>

        <section className={fin.card} aria-labelledby="company-section-domains" data-company-section="pending-domains">
          <h3 id="company-section-domains" className={fin.cardTitleSm}>
            Outros domínios
          </h3>
          <p className={fin.cardSubtitle}>Não fazem parte do cadastro da empresa e aguardam integração nos módulos responsáveis.</p>
          <ul className={styles.domains}>
            <PendingDomain icon={ScanFace} title="KYC" note="Aguardando integração do KYC" />
            <PendingDomain icon={Target} title="Oportunidades" note="Aguardando integração — nenhuma oportunidade é exibida" />
            <PendingDomain icon={Wallet} title="Finanças" note="Sem dados financeiros — nenhum total ou valor é exibido" />
          </ul>
        </section>
      </div>

      <InfoNote>
        <strong>Somente leitura.</strong> Criação, edição e remoção de Empresas não fazem parte desta versão. Empresa e empreendedor são
        cadastros distintos: nenhum dado desta tela é derivado do perfil de um empreendedor.
      </InfoNote>
    </>
  )
}

function RelationDetail({ relation, kind }: { relation: CompanyRelationView; kind: 'entrepreneur' | 'whitelabel' }) {
  if (relation.kind === 'missing') return <span data-relation-detail={kind}>Não informado</span>
  const note: ReactNode =
    relation.kind === 'illustrative'
      ? `Referência ilustrativa — sem vínculo com ${kind === 'entrepreneur' ? 'um empreendedor' : 'um Whitelabel'} do Control Plane.`
      : null
  return (
    <span className={styles.valueStack} data-relation-detail={kind}>
      <RelationValue relation={relation} kind={kind} />
      {note ? <span className={styles.valueNote}>{note}</span> : null}
    </span>
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
      <span className={`${shared.pendingTag} ${styles.domainTag}`}>Pendente</span>
    </li>
  )
}
