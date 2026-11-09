import { ArrowRight, Pencil } from 'lucide-react'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import { StatusPill } from '../../../components/ui/StatusPill'
import type { WhitelabelFinanceSettings } from '../../finance-gateways/financeModel'
import fin from '../../finance-gateways/sections/FinanceSections.module.css'
import fields from '../../whitelabel-settings/sections/fields.module.css'
import {
  CHOICE_LABEL,
  MODALITY_CATALOG,
  MODALITY_DISPLAY_META,
  RULE_CATEGORIES,
  RULE_CONCEPTS,
  modalityDisplay,
  type ModalityId,
  type ModalityRuleConfig,
  type RuleConcept,
} from '../modalitiesModel'
import styles from './ModalitySections.module.css'

/**
 * Regras gerais — the structural rule categories shared by every modality,
 * with each modality's local state per category. Read-only overview: editing
 * happens in each modality's Regras tab. Not a confirmed rule catalog.
 */
export function GeneralRules({
  settings,
  rules,
  onEditRules,
}: {
  settings: WhitelabelFinanceSettings
  rules: Record<ModalityId, ModalityRuleConfig>
  onEditRules: (id: ModalityId) => void
}) {
  function value(concept: RuleConcept, id: ModalityId) {
    if (concept.kind === 'derived') {
      const meta = MODALITY_DISPLAY_META[modalityDisplay(settings, id)]
      return <StatusPill tone={meta.tone} label={meta.label} />
    }
    if (concept.kind === 'pending') return <span className={fields.source}>Aguardando Backend</span>
    const choice = rules[id][concept.key]
    return choice === 'default' ? (
      <span className={fields.source}>Padrão não definido</span>
    ) : (
      <>
        <span>{CHOICE_LABEL[choice]}</span>
        <span className={fields.source} data-source="tenant">
          Override do Whitelabel
        </span>
      </>
    )
  }

  return (
    <section className={fin.card} aria-labelledby="mod-general-title">
      <div className={fin.cardHeading}>
        <h2 id="mod-general-title" className={fin.cardTitle}>
          Regras gerais
        </h2>
        <p className={fin.cardSubtitle}>
          Categorias estruturais usadas para organizar as regras de cada modalidade. Não são contratos confirmados de Produto ou
          Backend.
        </p>
      </div>

      <ol className={styles.concept} aria-label="Modelo conceitual de configuração">
        <li className={styles.conceptStep}>
          <span className={styles.conceptLabel}>Padrão da plataforma</span>
          <span className={fields.source}>Padrão não definido</span>
          <span className={styles.conceptNote}>Nenhum padrão de plataforma existe ainda.</span>
        </li>
        <li className={styles.conceptArrow} aria-hidden="true">
          <ArrowRight size={18} strokeWidth={1.8} />
        </li>
        <li className={styles.conceptStep}>
          <span className={styles.conceptLabel}>Override do Whitelabel</span>
          <span className={fields.source} data-source="tenant">
            Configuração local
          </span>
          <span className={styles.conceptNote}>Herança real e persistência: aguardando Backend.</span>
        </li>
      </ol>

      <ul className={styles.categoryGrid}>
        {RULE_CATEGORIES.map((category) => {
          const concept = RULE_CONCEPTS.find((item) => item.category === category.id)
          if (!concept) return null
          return (
            <li key={category.id} className={styles.category} data-category={category.id}>
              <h3 className={styles.categoryTitle}>{category.label}</h3>
              <p className={styles.categoryDescription}>
                {category.description} Conceito: “{concept.label}”.
              </p>
              <dl className={styles.categoryValues}>
                {MODALITY_CATALOG.map((modality) => (
                  <div key={modality.id}>
                    <dt>{modality.name}</dt>
                    <dd>{value(concept, modality.id)}</dd>
                  </div>
                ))}
              </dl>
              <span className={styles.markers}>
                {concept.kind !== 'pending' ? 'Configuração de protótipo · ' : ''}Decisão de Produto pendente · Contrato de Backend
                pendente
              </span>
            </li>
          )
        })}
      </ul>

      <div className={styles.generalActions}>
        {MODALITY_CATALOG.map((modality) => (
          <OutlineButton key={modality.id} className={fin.actionButton} onClick={() => onEditRules(modality.id)}>
            <Pencil size={14} strokeWidth={1.8} aria-hidden="true" />
            Editar regras de {modality.name}
          </OutlineButton>
        ))}
      </div>
    </section>
  )
}
