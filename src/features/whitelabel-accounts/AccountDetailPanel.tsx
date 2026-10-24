import type { ReactNode } from 'react'
import { ArrowUpRight, CircleAlert, Clock3, Info, Lock, RotateCw, UserX, UsersRound } from 'lucide-react'
import { DetailTransition } from '../../components/ui/DetailTransition'
import { EmptyState } from '../../components/ui/EmptyState'
import { OutlineButton } from '../../components/ui/OutlineButton'
import { StatusPill } from '../../components/ui/StatusPill'
import type { ApiErrorView } from '../../lib/apiErrors'
import { formatWhitelabelDate, whitelabelAvatar, type WhitelabelRecord } from '../whitelabels/whitelabelApi'
import { maskPhone as maskEntrepreneurPhone } from '../operation/entrepreneurs/entrepreneurApi'
import { entrepreneurHref } from '../operation/entrepreneurs/entrepreneurRoute'
import { accessMeta, investorTypeLabel, maskPhone as maskInvestorPhone } from '../operation/investors/investorApi'
import { investorHref } from '../operation/investors/investorRoute'
import states from '../operation/shared/ReadStates.module.css'
import { AccountAvatar, BusinessBadge } from './AccountBadges'
import { BreakableEmail } from './AccountListPanel'
import { accountDisplayName, kindMeta, rawTokenMeta, type AccountDetail, type AccountKind } from './accountsApi'
import { BUSINESS_HEADING, accountInitials, businessView } from './accountsPresent'
import styles from './AccountDetailPanel.module.css'
import { AccountAccessActions } from './access/AccountAccessActions'
import { AdminLifecycleActions } from './admin/AdminLifecycleActions'

/*
 * Selected account, read from `GET /whitelabels/:id/accounts/:accountId?tipo=…`.
 * Only fields of the real contract are shown (absent → "—"); tokens without a
 * defined meaning (admin `businessState`, `isSuperAdmin`) are shown as sent.
 * No KYC, Company, role or permission is inferred. The separate access action
 * component qualifies Investor/Entrepreneur pause and reactivate only; Admin stays read-only.
 */

type DisplayedAccount = { id: string; detail: AccountDetail }

export function AccountDetailPanel({ detail, whitelabel }: { detail: AccountDetail; whitelabel: WhitelabelRecord }) {
  // Ids are per domain: the identity of the displayed account is (kind, id).
  const item: DisplayedAccount = { id: `${detail.kind}:${detail.record.id}`, detail }
  return (
    <DetailTransition item={item} className={styles.panel} sectionId="account-detail" labelledBy="acc-detail-title">
      {(displayed) => <DetailContents detail={displayed.detail} whitelabel={whitelabel} actionsCurrent={displayed.id === item.id} />}
    </DetailTransition>
  )
}

function DetailContents({ detail, whitelabel, actionsCurrent }: { detail: AccountDetail; whitelabel: WhitelabelRecord; actionsCurrent: boolean }) {
  const { record } = detail
  const meta = kindMeta(detail.kind)
  const access = accessMeta(record.accessState)
  const business = businessView(detail)
  const wlAvatar = whitelabelAvatar(whitelabel)

  return (
    <>
      <header className={styles.header} data-detail-stage="identity">
        <AccountAvatar initials={accountInitials(record)} size="lg" />
        <div className={styles.identity}>
          <div className={styles.nameRow}>
            <h2 id="acc-detail-title" className={styles.name} data-account-id={record.id} data-account-kind={detail.kind}>
              {record.fullName ? accountDisplayName(detail) : <BreakableEmail text={accountDisplayName(detail)} />}
            </h2>
            {access ? <StatusPill tone={access.tone} label={access.label} /> : null}
          </div>
          <p className={styles.meta}>
            {meta.singular}
            <span className={styles.metaDot} aria-hidden="true">
              •
            </span>
            ID {record.id}
          </p>
        </div>
      </header>

      <div className={styles.overview}>
        <section className={styles.card} aria-labelledby="acc-info-title" data-detail-stage="information">
          <h3 id="acc-info-title" className={styles.cardTitle}>
            Informações principais
          </h3>
          <dl className={styles.fields}>
            <Field label="E-mail" name="email">
              <OptionalValue value={record.email} />
            </Field>
            <Field label="Whitelabel" name="whitelabel">
              <span className={styles.whitelabel}>
                <span className={styles.whitelabelMark} data-tone={wlAvatar.tone} aria-hidden="true">
                  {wlAvatar.initial ?? '·'}
                </span>
                <a href={`#/whitelabels?id=${encodeURIComponent(whitelabel.id)}`} className={styles.inlineLink} data-link="whitelabel">
                  {whitelabel.name}
                  <span className="visually-hidden"> (ver Whitelabel, ID {whitelabel.id})</span>
                </a>
              </span>
            </Field>
            <Field label="Acesso" name="access">
              {access ? <StatusPill tone={access.tone} label={access.label} /> : <OptionalValue value={null} />}
            </Field>
            <Field label={BUSINESS_HEADING[detail.kind]} name="business">
              {business ? <BusinessBadge tone={business.tone} label={business.label} /> : <OptionalValue value={null} />}
            </Field>
            <Field label="Criada em" name="createdAt">
              <DateValue iso={record.createdAt} />
            </Field>
            <Field label="Atualizada em" name="updatedAt">
              <DateValue iso={record.updatedAt} />
            </Field>
          </dl>
          {detail.kind === 'admin' ? null : (
            <p className={styles.cardFootnote}>
              {BUSINESS_HEADING[detail.kind]} é o estado do cadastro informado pelo Control Plane — independente do acesso e
              diferente do KYC.
            </p>
          )}
        </section>

        {detail.kind === 'admin' ? <AdminData detail={detail} /> : <RegistrationData detail={detail} />}

        <Links detail={detail} />

        {detail.kind !== 'admin' ? <AccountAccessActions key={`${whitelabel.id}:${detail.kind}:${record.id}`} detail={detail} tenantId={whitelabel.id} current={actionsCurrent} /> : null}
        {detail.kind === 'admin' && <AdminLifecycleActions record={detail.record} tenantId={whitelabel.id} current={actionsCurrent} />}
        <section className={styles.card} aria-labelledby="acc-actions-title" data-detail-stage="actions" data-write-actions="disabled">
          <h3 id="acc-actions-title" className={styles.cardTitle}>
            Ações da conta
          </h3>
          <div className={styles.note}>
            <Lock size={16} strokeWidth={1.8} aria-hidden="true" />
            <p>
              <strong>Outras ações indisponíveis.</strong> Alterar Whitelabel, convidar, alterar função e redefinir senha não estão disponíveis nesta integração.
              {detail.kind !== 'admin' && ' Editar cadastro também está indisponível. A gestão de acesso acima é independente destas ações.'}
            </p>
          </div>
        </section>
      </div>
    </>
  )
}

function RegistrationData({ detail }: { detail: Extract<AccountDetail, { kind: 'investor' | 'entrepreneur' }> }) {
  const { record } = detail
  const phone = detail.kind === 'investor' ? maskInvestorPhone(record.phone) : maskEntrepreneurPhone(record.phone)
  return (
    <section className={styles.card} aria-labelledby="acc-data-title" data-detail-stage="data">
      <h3 id="acc-data-title" className={styles.cardTitle}>
        Dados do cadastro
      </h3>
      <dl className={styles.fields}>
        <Field label="Nome completo" name="fullName">
          <OptionalValue value={record.fullName} empty="Não informado" />
        </Field>
        <Field label="Telefone" name="phone">
          <OptionalValue value={phone} />
        </Field>
        <Field label="E-mail verificado em" name="emailVerifiedAt">
          <DateValue iso={record.emailVerifiedAt} />
        </Field>
        {detail.kind === 'investor' ? (
          <>
            <Field label="Tipo de investidor" name="investorType">
              <OptionalValue value={investorTypeLabel(detail.record.investorType)} />
            </Field>
            <Field label="Dados pessoais preenchidos" name="personalInformationFilled">
              <OptionalValue
                value={detail.record.personalInformationFilled === null ? null : detail.record.personalInformationFilled ? 'Sim' : 'Não'}
              />
            </Field>
            {detail.record.reasonForDeny ? (
              <Field label="Motivo da negativa" name="reasonForDeny">
                <OptionalValue value={detail.record.reasonForDeny} />
              </Field>
            ) : null}
            <Field label="Termos aceitos em" name="termsAcceptedAt">
              <DateValue iso={detail.record.termsAcceptedAt} />
            </Field>
            <Field label="Revisão dos termos" name="termsRevisionId">
              <OptionalValue value={detail.record.termsRevisionId} />
            </Field>
          </>
        ) : null}
      </dl>
      <p className={styles.cardFootnote}>Telefone parcialmente mascarado. Documentos (CPF/CNPJ) não fazem parte deste contrato.</p>
    </section>
  )
}

function AdminData({ detail }: { detail: Extract<AccountDetail, { kind: 'admin' }> }) {
  const { record } = detail
  const situation = rawTokenMeta(record.businessState)
  return (
    <section className={styles.card} aria-labelledby="acc-data-title" data-detail-stage="data">
      <h3 id="acc-data-title" className={styles.cardTitle}>
        Dados do administrador
      </h3>
      <dl className={styles.fields}>
        <Field label="Nome completo" name="fullName">
          <OptionalValue value={record.fullName} empty="Não informado" />
        </Field>
        <Field label="Situação (valor do Core)" name="businessState">
          {situation ? <BusinessBadge tone={situation.tone} label={situation.label} /> : <OptionalValue value={null} />}
        </Field>
        <Field label="Sinalizador isSuperAdmin (Core)" name="isSuperAdmin">
          <OptionalValue value={record.isSuperAdmin === null ? null : record.isSuperAdmin ? 'Sim' : 'Não'} />
        </Field>
      </dl>
      <p className={styles.cardFootnote}>
        Nome completo é o alias fullName do nome persistido. Ausência de campo não comprova nome vazio. Situação active/disabled deriva do acesso; não representa convite. isSuperAdmin não atribui funções do Control Plane; permissões não são expostas.
      </p>
    </section>
  )
}

function Links({ detail }: { detail: AccountDetail }) {
  const { record } = detail
  return (
    <section className={styles.card} aria-labelledby="acc-links-title" data-detail-stage="links">
      <h3 id="acc-links-title" className={styles.cardTitle}>
        Vínculos
      </h3>
      <ul className={styles.linkList}>
        {detail.kind === 'investor' ? (
          <>
            <LinkRow label="Perfil de investidor" description="Mesmo ID no módulo Operação › Investidores.">
              <a href={investorHref(record.id)} className={styles.linkAction} data-link="investor-profile">
                Abrir perfil
                <span className="visually-hidden"> do investidor {record.id} em Operação › Investidores</span>
                <ArrowUpRight size={14} strokeWidth={1.8} aria-hidden="true" />
              </a>
            </LinkRow>
            <PendingRow label="KYC" text="Aguardando integração (Compliance › KYC)" />
            <PendingRow label="Investimentos" text="Aguardando integração (Financeiro)" />
          </>
        ) : detail.kind === 'entrepreneur' ? (
          <>
            <LinkRow label="Perfil de empreendedor" description="Mesmo ID no módulo Operação › Empreendedores.">
              <a href={entrepreneurHref(record.id)} className={styles.linkAction} data-link="entrepreneur-profile">
                Abrir perfil
                <span className="visually-hidden"> do empreendedor {record.id} em Operação › Empreendedores</span>
                <ArrowUpRight size={14} strokeWidth={1.8} aria-hidden="true" />
              </a>
            </LinkRow>
            <PendingRow label="Empresa" text="Aguardando integração da empresa" />
            <PendingRow label="KYC" text="Aguardando integração (Compliance › KYC)" />
          </>
        ) : (
          <PendingRow label="Função e permissões" text="Não expostas pelo Control Plane" />
        )}
      </ul>
    </section>
  )
}

function LinkRow({ label, description, children }: { label: string; description: string; children: ReactNode }) {
  return (
    <li className={styles.linkRow}>
      <span className={styles.linkText}>
        <span className={styles.linkLabel}>{label}</span>
        <span className={styles.linkDescription}>{description}</span>
      </span>
      {children}
    </li>
  )
}

function PendingRow({ label, text }: { label: string; text: string }) {
  return (
    <li className={styles.linkRow} data-pending-link={label}>
      <span className={styles.linkText}>
        <span className={styles.linkLabel}>{label}</span>
        <span className={styles.linkDescription}>
          <Clock3 size={13} strokeWidth={1.9} aria-hidden="true" />
          {text}
        </span>
      </span>
    </li>
  )
}

/* ---------------- Read states ---------------- */

type StatusProps =
  | { kind: 'loading' }
  | { kind: 'empty'; description: string }
  | { kind: 'unavailable' }
  | { kind: 'not-found'; accountKind: AccountKind; id: string; whitelabelName: string; onClose: () => void }
  | { kind: 'error'; error: ApiErrorView; onRetry: () => void }

/** The same `#account-detail` region while no account can be shown. */
export function AccountDetailStatus(props: StatusProps) {
  return (
    <section
      id="account-detail"
      className={`${styles.panel} ${styles.statusPanel}`}
      aria-label="Detalhes da conta"
      aria-busy={props.kind === 'loading' || undefined}
      tabIndex={-1}
      data-detail-status={props.kind}
    >
      {props.kind === 'loading' ? (
        <div className={styles.skeleton} aria-hidden="true">
          <span className={styles.skeletonAvatar} />
          <span className={`${states.skeleton} ${states.skeletonWide}`} />
          <span className={states.skeleton} />
          <span className={styles.skeletonCard} />
          <span className={styles.skeletonCard} />
        </div>
      ) : props.kind === 'empty' ? (
        <EmptyState icon={UsersRound} title="Nenhuma conta em exibição" description={props.description} />
      ) : props.kind === 'unavailable' ? (
        <EmptyState icon={Info} title="Detalhes indisponíveis" description="A lista de contas não pôde ser carregada." />
      ) : props.kind === 'not-found' ? (
        <div className={states.feedback}>
          <EmptyState
            icon={UserX}
            title="Conta não encontrada"
            description={`Nenhum ${kindMeta(props.accountKind).singular.toLowerCase()} com o ID “${props.id}” existe em ${props.whitelabelName}.`}
          />
          <OutlineButton onClick={props.onClose}>Ver a primeira conta da lista</OutlineButton>
        </div>
      ) : (
        <div className={states.feedback} role="alert">
          <EmptyState icon={CircleAlert} title={props.error.title} description={props.error.description} />
          {props.error.correlationId ? (
            <p className={states.diagnostic}>
              Código de diagnóstico: <code className={states.code}>{props.error.correlationId}</code>
            </p>
          ) : null}
          {props.error.retryable ? (
            <OutlineButton onClick={props.onRetry}>
              <RotateCw size={14} strokeWidth={1.8} aria-hidden="true" />
              Tentar novamente
            </OutlineButton>
          ) : null}
        </div>
      )}
    </section>
  )
}

/* ---------------- Small helpers ---------------- */

function Field({ label, name, children }: { label: string; name: string; children: ReactNode }) {
  return (
    <div className={styles.field} data-field={name}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function OptionalValue({ value, empty }: { value: string | null; empty?: string }) {
  if (value) return <span className={styles.value}>{value}</span>
  if (empty) return <span className={`${styles.value} ${styles.muted}`}>{empty}</span>
  return (
    <span className={styles.value}>
      <span aria-hidden="true">—</span>
      <span className="visually-hidden">sem dados</span>
    </span>
  )
}

function DateValue({ iso }: { iso: string | null }) {
  const text = formatWhitelabelDate(iso, true)
  if (!text) return <OptionalValue value={null} />
  return <span className={styles.value}>{text}</span>
}
