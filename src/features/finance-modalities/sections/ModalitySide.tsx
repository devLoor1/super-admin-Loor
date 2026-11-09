import { FileSearch, Info, ListChecks, Network, SlidersHorizontal, type LucideIcon } from 'lucide-react'
import fin from '../../finance-gateways/sections/FinanceSections.module.css'
import { CATALOG_NAMES } from '../modalitiesModel'
import styles from './ModalitySections.module.css'

/** Sobre modalidades e regras — scope and boundaries in plain words. */
export function AboutModalities({ catalogsHref }: { catalogsHref: string }) {
  return (
    <section className={fin.card} aria-labelledby="mod-about-title">
      <div className={styles.about}>
        <span className={styles.aboutIcon} aria-hidden="true">
          <Info size={17} strokeWidth={1.8} />
        </span>
        <div className={styles.aboutText}>
          <h2 id="mod-about-title" className={fin.cardTitleSm}>
            Sobre modalidades e regras
          </h2>
          <p>
            Modalidades financeiras definem o tipo de investimento que as Oportunidades deste Whitelabel poderão usar. O catálogo
            atual do protótipo tem apenas {CATALOG_NAMES}.
          </p>
          <p>
            Esta tela trata da governança no nível do Whitelabel. Criação de Oportunidades, valores, contratos, documentos e limites de
            cada Oportunidade ficam fora deste escopo.
          </p>
          <p>
            Segmentos e Usos dos recursos são catálogos separados, ligados à criação de Oportunidades — não são modalidades. Ver{' '}
            <a href={catalogsHref} className={styles.aboutLink}>
              Segmentos e usos dos recursos
            </a>
            .
          </p>
        </div>
      </div>
    </section>
  )
}

type QuickAction = { label: string; description: string; icon: LucideIcon; onClick: () => void; data?: string }

/** Shortcuts: local flows of this screen and the Auditoria consultation. */
export function ModalityQuickActions({
  selectedName,
  auditHref,
  onConfigure,
  onGeneralRules,
  onDependencies,
}: {
  selectedName: string
  /** Auditoria filtered by this Whitelabel (read-only, illustrative events). */
  auditHref: string
  onConfigure: () => void
  onGeneralRules: () => void
  onDependencies: () => void
}) {
  const actions: QuickAction[] = [
    { label: 'Configurar regras', description: `Modalidade ${selectedName}`, icon: SlidersHorizontal, onClick: onConfigure, data: 'rules' },
    { label: 'Regras gerais', description: 'Categorias estruturais', icon: ListChecks, onClick: onGeneralRules, data: 'general' },
    { label: 'Ver dependências', description: 'Gateway, conta, regras', icon: Network, onClick: onDependencies, data: 'dependencies' },
    // Ações locais desta tela não geram eventos na Auditoria; o atalho só consulta eventos ilustrativos.
    {
      label: 'Auditoria',
      description: 'Eventos deste Whitelabel',
      icon: FileSearch,
      onClick: () => window.location.assign(auditHref),
      data: 'audit',
    },
  ]
  return (
    <section className={fin.card} aria-labelledby="mod-quick-title">
      <h2 id="mod-quick-title" className={fin.cardTitleSm}>
        Ações rápidas
      </h2>
      <ul className={fin.quickGrid}>
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <li key={action.label}>
              <button type="button" className={fin.quick} onClick={action.onClick} data-quick={action.data}>
                <span className={fin.quickIcon} aria-hidden="true">
                  <Icon size={16} strokeWidth={1.8} />
                </span>
                <span className={fin.quickText}>
                  {action.label}
                  <span className={fin.quickMeta}>{action.description}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
