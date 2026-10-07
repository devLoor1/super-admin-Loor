import { FileSearch, Info, Landmark, Link2, ListChecks, type LucideIcon } from 'lucide-react'
import { StatusPill } from '../../../components/ui/StatusPill'
import { MODALITIES, MODALITY_DISPLAY_META, modalityDisplay, type WhitelabelFinanceSettings } from '../financeModel'
import styles from './FinanceSections.module.css'

/** Modalidades e dependências — summary only; the editor is a future module. */
export function ModalitiesSummary({ settings }: { settings: WhitelabelFinanceSettings }) {
  return (
    <section className={styles.card} aria-labelledby="fin-modalities-title" data-detail-stage>
      <div className={styles.cardHeading}>
        <h2 id="fin-modalities-title" className={styles.cardTitleSm}>
          Modalidades e dependências
        </h2>
        <p className={styles.cardSubtitle}>Resumo conceitual: quais modalidades contam com um gateway ativo.</p>
      </div>
      <ul className={styles.modalityList}>
        {MODALITIES.map((modality) => {
          const display = modalityDisplay(settings, modality.id)
          const meta = MODALITY_DISPLAY_META[display]
          return (
            <li key={modality.id} className={styles.modality} data-modality={modality.id}>
              <span className={styles.modalityName}>{modality.label}</span>
              <StatusPill tone={meta.tone} label={meta.label} />
              {display === 'dependency_pending' ? <span className={styles.modalityNote}>Sem gateway ativo que a atenda</span> : null}
            </li>
          )
        })}
      </ul>
      <p className={styles.footnote}>
        <Info size={14} strokeWidth={1.8} aria-hidden="true" />
        Estados do protótipo, não flags confirmadas no Backend. Nesta demonstração, qualquer gateway local ativo — inclusive
        Sandbox — conta como dependência atendida. A regra real fica pendente de Produto e Backend.
      </p>
    </section>
  )
}

type QuickAction = { label: string; description: string; icon: LucideIcon } & ({ onClick: () => void } | { href: string })

/** Shortcuts: existing local flows and screens, or a notice for modules that do not exist yet. */
export function QuickActions({
  modalitiesHref,
  onConfigureGateway,
  onCreateBank,
  onNotice,
}: {
  /** Modalidades e regras of the displayed Whitelabel (existing screen). */
  modalitiesHref: string
  onConfigureGateway: () => void
  onCreateBank: () => void
  onNotice: (message: string) => void
}) {
  const actions: QuickAction[] = [
    { label: 'Configurar gateway', description: 'Nova configuração local', icon: Link2, onClick: onConfigureGateway },
    { label: 'Cadastrar banco', description: 'Conta do Whitelabel', icon: Landmark, onClick: onCreateBank },
    { label: 'Modalidades e regras', description: 'Governança por modalidade', icon: ListChecks, href: modalitiesHref },
    {
      label: 'Auditoria',
      description: 'Módulo futuro',
      icon: FileSearch,
      onClick: () => onNotice('Protótipo visual: o módulo Auditoria ainda não está disponível. A atividade desta tela é apenas da sessão.'),
    },
  ]
  return (
    <section className={styles.card} aria-labelledby="fin-quick-title" data-detail-stage>
      <h2 id="fin-quick-title" className={styles.cardTitleSm}>
        Ações rápidas
      </h2>
      <ul className={styles.quickGrid}>
        {actions.map((action) => {
          const Icon = action.icon
          const content = (
            <>
              <span className={styles.quickIcon} aria-hidden="true">
                <Icon size={16} strokeWidth={1.8} />
              </span>
              <span className={styles.quickText}>
                {action.label}
                <span className={styles.quickMeta}>{action.description}</span>
              </span>
            </>
          )
          return (
            <li key={action.label}>
              {'href' in action ? (
                <a href={action.href} className={styles.quick}>
                  {content}
                </a>
              ) : (
                <button type="button" className={styles.quick} onClick={action.onClick}>
                  {content}
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
