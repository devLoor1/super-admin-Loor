import { AlertTriangle, FileText, LayoutGrid, SlidersHorizontal, type LucideIcon } from 'lucide-react'
import { IconTile, type Tone } from '../../../components/ui/IconTile'
import type { WhitelabelFinanceSettings } from '../../finance-gateways/financeModel'
import fin from '../../finance-gateways/sections/FinanceSections.module.css'
import {
  CHOICE_CONCEPTS,
  MODALITY_CATALOG,
  gatewayDependency,
  isEnabled,
  localOverrides,
  type ModalityId,
  type ModalityRuleConfig,
} from '../modalitiesModel'

type Card = { label: string; value: string; detail: string; icon: LucideIcon; tone: Tone; empty?: boolean }

/**
 * Counts derived strictly from this Whitelabel's local prototype state. The
 * official rule catalog has no local source, so it stays "—".
 */
export function ModalitySummaryCards({
  settings,
  rules,
}: {
  settings: WhitelabelFinanceSettings
  rules: Record<ModalityId, ModalityRuleConfig>
}) {
  const total = MODALITY_CATALOG.length
  const enabled = MODALITY_CATALOG.filter((modality) => isEnabled(settings, modality.id)).length
  const pending = MODALITY_CATALOG.filter((modality) => gatewayDependency(settings, modality.id) === 'pending').length
  const overrides = MODALITY_CATALOG.reduce((sum, modality) => sum + localOverrides(rules[modality.id]), 0)
  const editable = total * CHOICE_CONCEPTS.length

  const cards: Card[] = [
    {
      label: 'Modalidades habilitadas',
      value: String(enabled),
      detail: `de ${total} no catálogo atual`,
      icon: LayoutGrid,
      tone: 'violet',
    },
    {
      label: 'Dependências pendentes',
      value: String(pending),
      detail: pending ? 'Modalidade habilitada sem gateway ativo' : 'Nenhuma pendência local',
      icon: AlertTriangle,
      tone: pending ? 'amber' : 'neutral',
    },
    {
      label: 'Regras com configuração local',
      value: String(overrides),
      detail: `de ${editable} conceitos editáveis (protótipo)`,
      icon: SlidersHorizontal,
      tone: 'teal',
    },
    {
      label: 'Catálogo oficial de regras',
      value: '—',
      detail: 'Aguardando Produto e Backend',
      icon: FileText,
      tone: 'neutral',
      empty: true,
    },
  ]

  return (
    <section className={fin.summary} aria-labelledby="mod-summary-title" data-detail-stage>
      <h2 id="mod-summary-title" className="visually-hidden">
        Resumo da configuração local
      </h2>
      {cards.map((card) => (
        <article key={card.label} className={fin.summaryCard}>
          <IconTile icon={card.icon} tone={card.tone} size="lg" />
          <div className={fin.summaryText}>
            <h3 className={fin.summaryLabel}>{card.label}</h3>
            <p className={fin.summaryValue}>
              {card.value}
              {card.empty ? <span className="visually-hidden"> (sem dados)</span> : null}
            </p>
            <p className={fin.summaryDetail}>{card.detail}</p>
          </div>
        </article>
      ))}
      <p className={fin.summaryNote}>Contagens da configuração local deste protótipo — não são dados de produção.</p>
    </section>
  )
}
