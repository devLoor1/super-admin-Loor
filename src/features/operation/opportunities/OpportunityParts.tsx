import { Landmark, TrendingUp } from 'lucide-react'
import { StatusPill } from '../../../components/ui/StatusPill'
import shared from '../shared/Operation.module.css'
import { modalityLabel, opportunityStatusMeta } from './opportunityPresent'

/** Modality chip for a Backend token (Equity / Debt); an unknown token is shown as sent, with a neutral icon. */
export function ModalityChip({ modality }: { modality: string }) {
  const Icon = modality === 'debt' ? Landmark : TrendingUp
  return (
    <span className={shared.modalityChip} data-modality={modality}>
      <Icon size={13} strokeWidth={1.9} aria-hidden="true" />
      {modalityLabel(modality)}
    </span>
  )
}

/** Status pill: label text always present (status is never conveyed by colour alone). */
export function OpportunityStatusPill({ status }: { status: string }) {
  const meta = opportunityStatusMeta(status)
  return <StatusPill tone={meta.tone} label={meta.label} />
}

/** Core Whitelabel name (from the Whitelabel read) with its id; never a prototype tenant. */
export function TenantName({ whitelabelId, name }: { whitelabelId: string; name: string }) {
  return (
    <span className={shared.wlCell} data-tenant={whitelabelId}>
      <span className={shared.wlMark} data-tone="neutral" aria-hidden="true">
        {name.replace(/^Whitelabel\s+/i, '').charAt(0).toLocaleUpperCase('pt-BR') || '·'}
      </span>
      <span>{name}</span>
    </span>
  )
}
