import { useState } from 'react'
import {
  Building,
  CircleAlert,
  Copy,
  LayoutGrid,
  Link,
  Lock,
  Pencil,
  RotateCw,
  SearchX,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useNotice } from '../../components/shell/notice'
import { EmptyState } from '../../components/ui/EmptyState'
import { IconTile, type Tone } from '../../components/ui/IconTile'
import { OutlineButton } from '../../components/ui/OutlineButton'
import { StatusPill } from '../../components/ui/StatusPill'
import { Tabs } from '../../components/ui/Tabs'
import { tabId, tabPanelId } from '../../components/ui/tabIds'
import { EntityAvatar } from '../../components/ui/EntityAvatar'
import { DetailTransition } from '../../components/ui/DetailTransition'
import type { ApiErrorView } from '../../lib/apiErrors'
import { WhitelabelActionsMenu } from './crud/WhitelabelActionsMenu'
import { WRITE_ACCESS_NOTE, type WhitelabelWriteAccess, type LifecycleOperation } from './crud/whitelabelMutationContract'
import { WHITELABEL_STATUS_META, formatWhitelabelDate, whitelabelAvatar, type WhitelabelRecord } from './whitelabelApi'
import styles from './WhitelabelDetailPanel.module.css'

type DetailTab = 'overview'

const TABS: { value: DetailTab; label: string; icon: LucideIcon }[] = [
  { value: 'overview', label: 'Visão geral', icon: LayoutGrid },
]

const ID_PREFIX = 'wl-detail'

/**
 * Detail of the selected Whitelabel, from `GET /whitelabels/:id`.
 *
 * Backend-authoritative: name, ID, status, domain, base URL, slug, created /
 * updated dates, administrators count. Frontend-only: avatar initial / tone
 * (decoration), tabs other than "Visão geral", quick actions, and the
 * Aplicações / Integrações cards (the Control Plane returns no value → "—").
 * The accessible region stays mounted during selection transitions.
 *
 * Whitelabel CRUD Safe Preparation V1: "Editar nome" (SUPER_ADMIN) opens the
 * name-only review (`crud/`); lifecycle has its own guarded confirmation.
 * The record shown here is never changed by those flows.
 */
export function WhitelabelDetailPanel({
  whitelabel,
  access,
  onEditName,
  onLifecycle,
  onDisplay,
}: {
  whitelabel: WhitelabelRecord
  /** Role-aware presentation only; the Backend guard is the authority. */
  access: WhitelabelWriteAccess
  onEditName: (record: WhitelabelRecord) => void
  onLifecycle?: (record: WhitelabelRecord, operation: LifecycleOperation) => void
  /** Called once a selected identity is displayed (focus handoff to its actions). */
  onDisplay?: (id: string) => void
}) {
  return (
    <DetailTransition item={whitelabel} className={styles.panel} onDisplay={onDisplay}>
      {(displayed) => <DetailContents key={displayed.id} whitelabel={displayed} access={access} onEditName={onEditName} onLifecycle={onLifecycle} />}
    </DetailTransition>
  )
}

type DetailStatusProps =
  | { kind: 'loading' }
  | { kind: 'not-found'; id: string }
  | { kind: 'error'; error: ApiErrorView; onRetry: () => void }
  | { kind: 'unavailable' }

/**
 * Same region (id, heading, focus target) as the loaded detail, for the
 * loading, not-found and error states — never a blank panel.
 */
export function WhitelabelDetailStatus(props: DetailStatusProps) {
  const title =
    props.kind === 'loading'
      ? 'Carregando detalhes'
      : props.kind === 'not-found'
        ? 'Whitelabel não encontrado'
        : props.kind === 'error'
          ? props.error.title
          : 'Detalhes indisponíveis'
  return (
    <section
      id="whitelabel-detail"
      className={styles.panel}
      aria-labelledby="wl-detail-title"
      aria-busy={props.kind === 'loading' || undefined}
      tabIndex={-1}
      data-detail-state={props.kind}
    >
      {props.kind === 'loading' ? (
        <>
          <h2 id="wl-detail-title" className="visually-hidden">
            {title}
          </h2>
          <div className={styles.skeletonHeader} aria-hidden="true">
            <span className={styles.skeletonAvatar} />
            <span className={styles.skeletonLines}>
              <span className={styles.skeletonLine} data-width="wide" />
              <span className={styles.skeletonLine} />
            </span>
          </div>
          <div className={styles.skeletonCard} aria-hidden="true">
            {Array.from({ length: 5 }, (_, index) => (
              <span key={index} className={styles.skeletonLine} data-width={index % 2 ? undefined : 'wide'} />
            ))}
          </div>
        </>
      ) : (
        <div className={styles.statusBody}>
          <h2 id="wl-detail-title" className="visually-hidden">
            {title}
          </h2>
          {props.kind === 'not-found' ? (
            <EmptyState
              icon={SearchX}
              title={title}
              description={
                <>
                  Nenhum Whitelabel com o ID <code className={styles.inlineCode}>{props.id}</code> foi encontrado no Control Plane.
                </>
              }
            />
          ) : props.kind === 'error' ? (
            <>
              <EmptyState icon={CircleAlert} title={title} description={props.error.description} />
              {props.error.correlationId ? (
                <p className={styles.diagnostic}>
                  Código de diagnóstico: <code className={styles.inlineCode}>{props.error.correlationId}</code>
                </p>
              ) : null}
              {props.error.retryable ? (
                <OutlineButton onClick={props.onRetry}>
                  <RotateCw size={14} strokeWidth={1.8} aria-hidden="true" />
                  Tentar novamente
                </OutlineButton>
              ) : null}
            </>
          ) : (
            <EmptyState icon={Building} title={title} description="Selecione um Whitelabel quando a lista estiver disponível." />
          )}
        </div>
      )}
    </section>
  )
}

function DetailContents({
  whitelabel,
  access,
  onEditName,
  onLifecycle,
}: {
  whitelabel: WhitelabelRecord
  access: WhitelabelWriteAccess
  onEditName: (record: WhitelabelRecord) => void
  onLifecycle?: (record: WhitelabelRecord, operation: LifecycleOperation) => void
}) {
  const notify = useNotice()
  const [tab, setTab] = useState<DetailTab>('overview')
  const avatar = whitelabelAvatar(whitelabel)

  function copy(value: string, label: string) {
    if (!navigator.clipboard) {
      notify(`Não foi possível copiar (${label}) neste navegador.`)
      return
    }
    navigator.clipboard.writeText(value).then(
      () => notify(`Copiado (${label}): ${value}`),
      () => notify(`Não foi possível copiar (${label}). Selecione o texto e copie manualmente.`),
    )
  }

  return (
    <>
      <header className={styles.header} data-detail-stage="identity">
        <EntityAvatar initial={avatar.initial} tone={avatar.tone} size="lg" />
        <div className={styles.identity}>
          <h2 id="wl-detail-title" className={styles.name}>
            {whitelabel.name}
          </h2>
          <p className={styles.meta}>
            Whitelabel
            <span className={styles.metaDot} aria-hidden="true">
              •
            </span>
            ID: {whitelabel.id}
          </p>
        </div>
        <WhitelabelActionsMenu
          name={whitelabel.name}
          status={whitelabel.status}
          access={access}
          triggerClassName={styles.kebab}
          onEditName={() => onEditName(whitelabel)}
          onLifecycle={onLifecycle ? operation => onLifecycle(whitelabel, operation) : undefined}
        />
      </header>

      <Tabs
        idPrefix={ID_PREFIX}
        label={`Seções de ${whitelabel.name}`}
        tabs={TABS}
        value={tab}
        onChange={setTab}
        className={styles.tabs}
      />


      {TABS.map((item) => (
        <div
          key={item.value}
          role="tabpanel"
          id={tabPanelId(ID_PREFIX, item.value)}
          aria-labelledby={tabId(ID_PREFIX, item.value)}
          hidden={tab !== item.value}
          tabIndex={0}
          className={styles.tabPanel}
        >
          {tab !== item.value ? null : (
            <Overview whitelabel={whitelabel} onCopy={copy} onNotify={notify} access={access} onEditName={() => onEditName(whitelabel)} />
          )}
        </div>
      ))}
    </>
  )
}

function Overview({
  whitelabel,
  onCopy,
  onNotify,
  access,
  onEditName,
}: {
  whitelabel: WhitelabelRecord
  onCopy: (value: string, label: string) => void
  onNotify: (message: string) => void
  access: WhitelabelWriteAccess
  onEditName: () => void
}) {
  const status = WHITELABEL_STATUS_META[whitelabel.status]
  const summary: { label: string; icon: LucideIcon; tone: Tone; value: number | null; note: string }[] = [
    { label: 'Administradores', icon: Users, tone: 'blue', value: whitelabel.admins, note: 'Control Plane' },
    {
      label: 'Aplicações vinculadas',
      icon: LayoutGrid,
      tone: 'indigo',
      value: whitelabel.applications,
      note: whitelabel.applications === null ? 'Sem dados no Control Plane' : 'Control Plane',
    },
    {
      label: 'Integrações',
      icon: Link,
      tone: 'violet',
      value: whitelabel.integrations,
      note: whitelabel.integrations === null ? 'Sem dados no Control Plane' : 'Control Plane',
    },
  ]

  return (
    <div className={styles.overview}>
      <section className={styles.card} aria-labelledby="wl-info-title" data-detail-stage="information">
        <div className={styles.cardHeader}>
          <h3 id="wl-info-title" className={styles.cardTitle}>
            Informações principais
          </h3>
          {access === 'super-admin' ? (
            <OutlineButton className={styles.editButton} onClick={onEditName} data-wl-edit>
              <Pencil size={14} strokeWidth={1.8} aria-hidden="true" />
              Editar nome
            </OutlineButton>
          ) : (
            <>
              <OutlineButton
                className={styles.editButton}
                aria-disabled="true"
                aria-describedby="wl-edit-access-note"
                data-wl-edit
                data-restricted={access}
                onClick={() => onNotify(WRITE_ACCESS_NOTE[access])}
              >
                <Lock size={14} strokeWidth={1.8} aria-hidden="true" />
                Editar nome
              </OutlineButton>
              <span id="wl-edit-access-note" className="visually-hidden">
                {WRITE_ACCESS_NOTE[access]}
              </span>
            </>
          )}
        </div>
        <dl className={styles.fields}>
          <div className={styles.field}>
            <dt>Status</dt>
            <dd>
              <StatusPill tone={status.tone} label={status.label} />
            </dd>
          </div>
          <CopyField label="Domínio" value={whitelabel.domain} onCopy={onCopy} />
          <CopyField label="URL base" value={whitelabel.baseUrl} onCopy={onCopy} />
          <CopyField label="Slug" value={whitelabel.slug || null} onCopy={onCopy} />
          <DateField label="Criado em" value={whitelabel.createdAt} />
          <DateField label="Última atualização" value={whitelabel.updatedAt} />
        </dl>
      </section>

      <ul className={styles.summary} aria-label={`Resumo de ${whitelabel.name}`} data-detail-stage="summary">
        {summary.map((item) => (
          <li key={item.label} className={styles.summaryCard}>
            <IconTile icon={item.icon} tone={item.tone} size="sm" className={styles.summaryIcon} />
            <p className={styles.summaryLabel}>{item.label}</p>
            <p className={styles.summaryValue}>
              {item.value !== null ? (
                item.value
              ) : (
                <>
                  <span aria-hidden="true">—</span>
                  <span className="visually-hidden">sem dados</span>
                </>
              )}
            </p>
            <p className={styles.summaryStatus}>{item.note}</p>
          </li>
        ))}
      </ul>

    </div>
  )
}

function NoValue() {
  return (
    <>
      <span className={styles.value} aria-hidden="true">
        —
      </span>
      <span className="visually-hidden">sem dados</span>
    </>
  )
}

function CopyField({
  label,
  value,
  onCopy,
}: {
  label: string
  value: string | null
  onCopy: (value: string, label: string) => void
}) {
  return (
    <div className={styles.field}>
      <dt>{label}</dt>
      <dd>
        {value ? (
          <>
            <span className={styles.value}>{value}</span>
            <button type="button" className={styles.copyButton} onClick={() => onCopy(value, label)} aria-label={`Copiar ${label.toLocaleLowerCase('pt-BR')}`}>
              <Copy size={15} strokeWidth={1.8} aria-hidden="true" />
            </button>
          </>
        ) : (
          <NoValue />
        )}
      </dd>
    </div>
  )
}

function DateField({ label, value }: { label: string; value: string | null }) {
  const formatted = formatWhitelabelDate(value, true)
  return (
    <div className={styles.field}>
      <dt>{label}</dt>
      <dd>
        {formatted ? (
          <time className={styles.value} dateTime={value!}>
            {formatted}
          </time>
        ) : (
          <NoValue />
        )}
      </dd>
    </div>
  )
}
