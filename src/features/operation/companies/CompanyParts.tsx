import { BusinessBadge } from '../../whitelabel-accounts/AccountBadges'
import shared from '../shared/Operation.module.css'
import { companyStatusMeta } from './companyPresent'

/** "—" for a value the Control Plane does not provide (announced as "não informado"). */
export function NoData({ label = 'não informado' }: { label?: string }) {
  return (
    <>
      <span aria-hidden="true">—</span>
      <span className="visually-hidden">{label}</span>
    </>
  )
}

/** Validation status badge: the label text is always present (never colour alone); unknown tokens shown as sent. */
export function CompanyStatusBadge({ status }: { status: string }) {
  const meta = companyStatusMeta(status)
  return <BusinessBadge tone={meta.tone} label={meta.label} />
}

/** Core Whitelabel name with its first letter; the name comes from the Whitelabel read (fallback "Whitelabel #ID"). */
export function CompanyTenant({ whitelabelId, name }: { whitelabelId: string; name: string }) {
  return (
    <span className={shared.wlCell} data-tenant={whitelabelId}>
      <span className={shared.wlMark} data-tone="neutral" aria-hidden="true">
        {name.replace(/^Whitelabel\s+/i, '').charAt(0).toLocaleUpperCase('pt-BR') || '·'}
      </span>
      <span>{name}</span>
    </span>
  )
}
