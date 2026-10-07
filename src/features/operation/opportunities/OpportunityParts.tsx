import type { ModalityId } from '../../finance-gateways/financeModel'
import { modalityMeta } from '../../finance-modalities/modalitiesModel'
import { StatusPill } from '../../../components/ui/StatusPill'
import styles from '../shared/Operation.module.css'
import type { ResolvedRef } from './classification'
import { OPPORTUNITY_STATUS_META, type OpportunityStatus } from './opportunityModel'

/** Modality chip — consumes the Finance catalog (Equity / Debt). */
export function ModalityChip({ modality }: { modality: ModalityId }) {
  const meta = modalityMeta(modality)
  const Icon = meta.icon
  return (
    <span className={styles.modalityChip} data-modality={modality}>
      <Icon size={13} strokeWidth={1.9} aria-hidden="true" />
      {meta.name}
    </span>
  )
}

export function OpportunityStatusPill({ status }: { status: OpportunityStatus }) {
  const meta = OPPORTUNITY_STATUS_META[status]
  return <StatusPill tone={meta.tone} label={meta.label} />
}

const STATE_LABEL = { inactive: 'Inativo no catálogo', missing: 'Fora do catálogo' } as const

/** One catalog reference; inactive / removed records stay visible and labelled. */
export function CatalogChip({ item, catalog }: { item: ResolvedRef; catalog: 'segment' | 'resource_use' }) {
  return (
    <span className={styles.catalogChip} data-catalog={catalog} data-state={item.state}>
      {item.state === 'missing' ? item.id : item.name}
      {item.state !== 'active' ? <span className={styles.chipState}>{STATE_LABEL[item.state]}</span> : null}
    </span>
  )
}

/** Compact list cell: first reference + "+N" (the full list is on the detail page). */
export function CatalogCell({
  items,
  catalog,
  emptyLabel,
}: {
  items: ResolvedRef[]
  catalog: 'segment' | 'resource_use'
  emptyLabel: string
}) {
  if (!items.length) return <span className={styles.muted}>{emptyLabel}</span>
  const [first, ...rest] = items
  return (
    <span className={styles.chipRow}>
      <CatalogChip item={first} catalog={catalog} />
      {rest.length ? (
        <span className={styles.moreTag} title={rest.map((item) => item.name).join(', ')}>
          +{rest.length}
          <span className="visually-hidden"> ({rest.map((item) => item.name).join(', ')})</span>
        </span>
      ) : null}
    </span>
  )
}
