import { Pencil, Search, SearchX, SlidersHorizontal } from 'lucide-react'
import { EmptyState } from '../../../components/ui/EmptyState'
import { PrimaryButton } from '../../../components/ui/PrimaryButton'
import { StatusPill } from '../../../components/ui/StatusPill'
import type { WhitelabelFinanceSettings } from '../../finance-gateways/financeModel'
import fin from '../../finance-gateways/sections/FinanceSections.module.css'
import {
  CATALOG_NAMES,
  CHOICE_CONCEPTS,
  GATEWAY_DEPENDENCY_META,
  MODALITY_CATALOG,
  MODALITY_DISPLAY_META,
  gatewayDependency,
  localOverrides,
  modalityDisplay,
  type ModalityDisplay,
  type ModalityId,
  type ModalityMeta,
  type ModalityRuleConfig,
  type ModalityStatusFilter,
} from '../modalitiesModel'
import styles from './ModalitySections.module.css'

const FILTERS: ModalityDisplay[] = ['enabled', 'dependency_pending', 'disabled', 'not_configured']

type Props = {
  whitelabelName: string
  settings: WhitelabelFinanceSettings
  rules: Record<ModalityId, ModalityRuleConfig>
  rows: ModalityMeta[]
  selectedId: ModalityId
  /** Modality whose rules have an unsaved local draft ("Alterado localmente"). */
  editedId: ModalityId | null
  query: string
  onQueryChange: (value: string) => void
  status: ModalityStatusFilter
  onStatusChange: (value: ModalityStatusFilter) => void
  onSelect: (id: ModalityId) => void
  onEditRules: (id: ModalityId) => void
}

/**
 * Modalidades — the current catalog (Equity, Debt) with this Whitelabel's
 * local state. Row selection drives the detail panel. No bulk actions.
 */
export function ModalityList({
  whitelabelName,
  settings,
  rules,
  rows,
  selectedId,
  editedId,
  query,
  onQueryChange,
  status,
  onStatusChange,
  onSelect,
  onEditRules,
}: Props) {
  const selectedName = MODALITY_CATALOG.find((item) => item.id === selectedId)?.name ?? ''
  return (
    <section className={fin.card} aria-labelledby="mod-list-title">
      <header className={fin.cardHeader}>
        <div className={fin.cardHeading}>
          <h2 id="mod-list-title" className={fin.cardTitle}>
            Modalidades
          </h2>
          <p className={fin.cardSubtitle}>Modalidades financeiras do catálogo atual e o estado local em {whitelabelName}.</p>
        </div>
        <PrimaryButton className={fin.headerButton} onClick={() => onEditRules(selectedId)} data-configure-modality>
          <SlidersHorizontal size={16} strokeWidth={1.9} aria-hidden="true" />
          Configurar {selectedName}
        </PrimaryButton>
      </header>

      <div className={fin.listControls}>
        <label className={fin.search}>
          <Search size={16} strokeWidth={1.8} aria-hidden="true" />
          <span className="visually-hidden">Buscar por modalidade</span>
          <input type="search" value={query} placeholder="Buscar por modalidade…" onChange={(event) => onQueryChange(event.target.value)} />
        </label>
        <label className={fin.filter}>
          <span className="visually-hidden">Filtrar por status</span>
          <select value={status} onChange={(event) => onStatusChange(event.target.value as ModalityStatusFilter)}>
            <option value="all">Todos os status</option>
            {FILTERS.map((key) => (
              <option key={key} value={key}>
                {MODALITY_DISPLAY_META[key].label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={fin.tableArea}>
        <table className={`${fin.table} ${styles.modTable}`}>
          <caption className="visually-hidden">Modalidades financeiras de {whitelabelName}</caption>
          <thead>
            <tr>
              <th scope="col">Modalidade</th>
              <th scope="col" className={styles.colDesc}>
                Descrição
              </th>
              <th scope="col" className={styles.colStatus}>
                Status
              </th>
              <th scope="col" className={styles.colDeps}>
                Dependências
              </th>
              <th scope="col" className={styles.colRules}>
                Regras
              </th>
              <th scope="col" className={styles.colActions}>
                <span className="visually-hidden">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((modality) => {
              const Icon = modality.icon
              const display = MODALITY_DISPLAY_META[modalityDisplay(settings, modality.id)]
              const dependency = gatewayDependency(settings, modality.id)
              const overrides = localOverrides(rules[modality.id])
              const selected = modality.id === selectedId
              const edited = modality.id === editedId
              const statusPills = (
                <>
                  <StatusPill tone={display.tone} label={display.label} />
                  {edited ? <StatusPill tone="warning" label="Alterado localmente" /> : null}
                </>
              )
              return (
                <tr key={modality.id} className={fin.row} data-active={selected || undefined}>
                  <td>
                    <button
                      type="button"
                      className={fin.rowButton}
                      onClick={() => onSelect(modality.id)}
                      aria-current={selected ? 'true' : undefined}
                      aria-controls="mod-detail"
                      data-modality-row={modality.id}
                    >
                      <span className={`${fin.avatar} ${styles.avatarIcon}`} data-tone={modality.tone} aria-hidden="true">
                        <Icon size={18} strokeWidth={1.9} />
                      </span>
                      <span className={fin.rowName}>
                        {modality.name}
                        <span className={styles.descInline}>{modality.description}</span>
                      </span>
                      <span className="visually-hidden">, ver detalhes</span>
                    </button>
                    <span className={styles.statusInline}>{statusPills}</span>
                  </td>
                  <td className={styles.colDesc}>{modality.description}</td>
                  <td className={styles.colStatus}>
                    <span className={fin.statusStack}>{statusPills}</span>
                  </td>
                  <td className={styles.colDeps}>
                    <span className={styles.depCell} data-state={dependency}>
                      <span className={styles.depDot} aria-hidden="true" />
                      {GATEWAY_DEPENDENCY_META[dependency].short}
                    </span>
                  </td>
                  <td className={styles.colRules}>
                    <span className={styles.rulesCell}>
                      <span>
                        <strong>{overrides}</strong> de {CHOICE_CONCEPTS.length} locais
                      </span>
                    </span>
                  </td>
                  <td className={styles.colActions}>
                    <button
                      type="button"
                      className={fin.iconButton}
                      onClick={() => onEditRules(modality.id)}
                      aria-label={`Editar regras de ${modality.name}`}
                      data-edit-rules={modality.id}
                    >
                      <Pencil size={15} strokeWidth={1.8} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {rows.length === 0 ? (
          <div className={fin.emptyBox}>
            <EmptyState icon={SearchX} title="Nenhuma modalidade encontrada" description="Ajuste a busca ou o filtro de status." />
          </div>
        ) : null}
      </div>

      <p className={fin.listFooter}>
        Mostrando {rows.length} de {MODALITY_CATALOG.length} · Catálogo atual do protótipo: {CATALOG_NAMES}. Novas modalidades
        dependem de escopo de Produto.
      </p>
    </section>
  )
}
