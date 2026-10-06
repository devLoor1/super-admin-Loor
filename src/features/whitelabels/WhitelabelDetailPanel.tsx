import { useState } from 'react'
import {
  ChartColumnIncreasing,
  ChevronRight,
  Copy,
  EllipsisVertical,
  LayoutGrid,
  Link,
  Pencil,
  Settings,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { usePrototypeNotice } from '../../components/shell/prototypeNotice'
import { EmptyState } from '../../components/ui/EmptyState'
import { IconTile, type Tone } from '../../components/ui/IconTile'
import { OutlineButton } from '../../components/ui/OutlineButton'
import { StatusPill } from '../../components/ui/StatusPill'
import { Tabs } from '../../components/ui/Tabs'
import { tabId, tabPanelId } from '../../components/ui/tabIds'
import { EntityAvatar } from '../../components/ui/EntityAvatar'
import { DetailTransition } from '../../components/ui/DetailTransition'
import { STATUS_META, type Whitelabel } from './prototypeWhitelabels'
import styles from './WhitelabelDetailPanel.module.css'

type DetailTab = 'overview' | 'admins' | 'applications' | 'integrations'

const TABS: { value: DetailTab; label: string; icon: LucideIcon }[] = [
  { value: 'overview', label: 'Visão geral', icon: LayoutGrid },
  { value: 'admins', label: 'Administradores', icon: Users },
  { value: 'applications', label: 'Aplicações', icon: LayoutGrid },
  { value: 'integrations', label: 'Integrações', icon: Link },
]

const SUMMARY: { label: string; icon: LucideIcon; tone: Tone }[] = [
  { label: 'Administradores', icon: Users, tone: 'blue' },
  { label: 'Aplicações vinculadas', icon: LayoutGrid, tone: 'indigo' },
  { label: 'Integrações', icon: Link, tone: 'violet' },
]

/** `path` actions open an existing prototype screen for the selected Whitelabel. */
const QUICK_ACTIONS: { title: string; description: string; icon: LucideIcon; tone: Tone; path?: string }[] = [
  { title: 'Configurações', description: 'Domínio, identidade e preferências', icon: Settings, tone: 'indigo' },
  { title: 'Administradores', description: 'Gerenciar usuários e permissões', icon: Users, tone: 'violet', path: '/accounts?tipo=administradores' },
  { title: 'Aplicações', description: 'Conceito visual — escopo a definir', icon: LayoutGrid, tone: 'indigo' },
  { title: 'Integrações', description: 'Gateway e SMTP — destinos futuros', icon: Link, tone: 'violet' },
  { title: 'Indicadores', description: 'Acessar métricas e relatórios', icon: ChartColumnIncreasing, tone: 'blue' },
  { title: 'Contas', description: 'Controle de acesso das contas', icon: UsersRound, tone: 'blue', path: '/accounts' },
]

const ID_PREFIX = 'wl-detail'

/**
 * Detail of the selected whitelabel. Only "Visão geral" has content; the other
 * tabs, quick actions, edit and overflow actions are prototype placeholders.
 * The accessible region stays mounted during selection transitions; only its
 * inner contents reset tabs when the next identity appears.
 */
export function WhitelabelDetailPanel({ whitelabel }: { whitelabel: Whitelabel }) {
  return (
    <DetailTransition item={whitelabel} className={styles.panel}>
      {(displayed) => <DetailContents key={displayed.id} whitelabel={displayed} />}
    </DetailTransition>
  )
}

function DetailContents({ whitelabel }: { whitelabel: Whitelabel }) {
  const notify = usePrototypeNotice()
  const [tab, setTab] = useState<DetailTab>('overview')
  const status = STATUS_META[whitelabel.status]

  function copy(value: string, what: string) {
    if (!navigator.clipboard) {
      notify(`Não foi possível copiar o ${what} neste navegador.`)
      return
    }
    navigator.clipboard.writeText(value).then(
      () => notify(`${what.charAt(0).toUpperCase()}${what.slice(1)} copiado: ${value}`),
      () => notify(`Não foi possível copiar o ${what}. Selecione o texto e copie manualmente.`),
    )
  }

  return (
    <>
      <header className={styles.header} data-detail-stage="identity">
        <EntityAvatar initial={whitelabel.initial} tone={whitelabel.avatarTone} size="lg" />
        <div className={styles.identity}>
          <h2 id="wl-detail-title" className={styles.name}>
            {whitelabel.name}
          </h2>
          <p className={styles.meta}>
            Whitelabel ilustrativo
            <span className={styles.metaDot} aria-hidden="true">
              •
            </span>
            {/* Prototype identifier only — not a backend contract. */}
            ID: {whitelabel.id}
          </p>
        </div>
        <button
          type="button"
          className={styles.kebab}
          onClick={() => notify(`Protótipo visual: as ações de ${whitelabel.name} ainda não estão disponíveis.`)}
          aria-label={`Mais ações para ${whitelabel.name}`}
        >
          <EllipsisVertical size={18} strokeWidth={1.9} aria-hidden="true" />
        </button>
      </header>

      <Tabs
        idPrefix={ID_PREFIX}
        label={`Seções de ${whitelabel.name}`}
        tabs={TABS}
        value={tab}
        onChange={setTab}
        className={styles.tabs}
      />

      <p className={styles.tabsHint}>Mais seções: deslize ou use as setas ← →</p>

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
          {tab !== item.value ? null : item.value === 'overview' ? (
            <Overview whitelabel={whitelabel} statusLabel={status.label} statusTone={status.tone} onCopy={copy} onNotify={notify} />
          ) : (
            <div className={styles.placeholder}>
              <EmptyState
                icon={item.icon}
                title={item.label}
                description={item.value === 'applications'
                  ? 'Conceito visual: o significado de Aplicações ainda precisa de definição de Produto. Nenhum módulo foi implementado.'
                  : 'Destino previsto na arquitetura, ainda não implementado. Nenhum dado é exibido neste protótipo.'}
              />
            </div>
          )}
        </div>
      ))}
    </>
  )
}

function Overview({
  whitelabel,
  statusLabel,
  statusTone,
  onCopy,
  onNotify,
}: {
  whitelabel: Whitelabel
  statusLabel: string
  statusTone: Parameters<typeof StatusPill>[0]['tone']
  onCopy: (value: string, what: string) => void
  onNotify: (message: string) => void
}) {
  return (
    <div className={styles.overview}>
      <section className={styles.card} aria-labelledby="wl-info-title" data-detail-stage="information">
        <div className={styles.cardHeader}>
          <h3 id="wl-info-title" className={styles.cardTitle}>
            Informações principais
          </h3>
          <OutlineButton
            className={styles.editButton}
            onClick={() => onNotify('Protótipo visual: a edição de Whitelabel ainda não está disponível.')}
          >
            <Pencil size={14} strokeWidth={1.8} aria-hidden="true" />
            Editar
          </OutlineButton>
        </div>
        <dl className={styles.fields}>
          <div className={styles.field}>
            <dt>Status proposto</dt>
            <dd>
              <StatusPill tone={statusTone} label={statusLabel} />
            </dd>
          </div>
          <div className={styles.field}>
            <dt>Domínio</dt>
            <dd>
              <span className={styles.value}>{whitelabel.domain}</span>
              <CopyButton label="Copiar domínio" onClick={() => onCopy(whitelabel.domain, 'domínio')} />
            </dd>
          </div>
          <div className={styles.field}>
            <dt>Slug</dt>
            <dd>
              <span className={styles.value}>{whitelabel.slug}</span>
              <CopyButton label="Copiar slug" onClick={() => onCopy(whitelabel.slug, 'slug')} />
            </dd>
          </div>
          <div className={styles.field}>
            <dt>Última atualização</dt>
            <dd>
              <span className={styles.value} aria-hidden="true">
                —
              </span>
              <span className="visually-hidden">sem dados</span>
            </dd>
          </div>
        </dl>
      </section>

      <ul className={styles.summary} aria-label="Resumo do Whitelabel ilustrativo" data-detail-stage="summary">
        {SUMMARY.map((item) => (
          <li key={item.label} className={styles.summaryCard}>
            <IconTile icon={item.icon} tone={item.tone} size="sm" className={styles.summaryIcon} />
            <p className={styles.summaryLabel}>{item.label}</p>
            <p className={styles.summaryValue}>
              <span aria-hidden="true">—</span>
              <span className="visually-hidden">sem dados</span>
            </p>
            <p className={styles.summaryStatus}>{item.label === 'Aplicações vinculadas' ? 'Conceito visual' : 'Aguardando dados'}</p>
          </li>
        ))}
      </ul>

      <section className={styles.card} aria-labelledby="wl-actions-title" data-detail-stage="actions">
        <h3 id="wl-actions-title" className={styles.cardTitle}>
          Ações rápidas
        </h3>
        <p className={styles.cardSubtitle}>Contas e Administradores abrem o protótipo de Contas; demais destinos futuros.</p>
        <ul className={styles.actions}>
          {QUICK_ACTIONS.map((action) => {
            const body = (
              <>
                <IconTile icon={action.icon} tone={action.tone} size="md" />
                <span className={styles.actionText}>
                  <span className={styles.actionTitle}>{action.title}</span>
                  <span className={styles.actionDescription}>{action.description}</span>
                </span>
                <ChevronRight className={styles.actionChevron} size={16} strokeWidth={1.8} aria-hidden="true" />
              </>
            )
            return (
              <li key={action.title}>
                {action.path ? (
                  <a className={styles.action} href={`#/whitelabels/${whitelabel.id}${action.path}`}>
                    {body}
                  </a>
                ) : (
                  <button
                    type="button"
                    className={styles.action}
                    onClick={() =>
                      onNotify(`Protótipo visual: a área "${action.title}" de ${whitelabel.name} ainda não está disponível.`)
                    }
                  >
                    {body}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

function CopyButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className={styles.copyButton} onClick={onClick} aria-label={label}>
      <Copy size={15} strokeWidth={1.8} aria-hidden="true" />
    </button>
  )
}
