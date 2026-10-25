import type { ReactNode } from 'react'
import { AppShell } from '../../components/shell/AppShell'
import type { Breadcrumb } from '../../components/shell/TopHeader'
import { DotMatrixBackground } from '../whitelabels/visuals/DotMatrixBackground'
import shared from '../operation/shared/Operation.module.css'

const LIST_HREF = '#/compliance/kyc'

/**
 * Compliance › KYC page frame: the approved App Shell (Compliance active, KYC
 * current) with the shared Dot Matrix behind the main content only.
 */
export function KycShell({ trail = [], children }: { trail?: string[]; children: ReactNode }) {
  const breadcrumbs: Breadcrumb[] = [
    { label: 'Compliance' },
    trail.length ? { label: 'KYC', href: LIST_HREF } : { label: 'KYC' },
    ...trail.map((label) => ({ label })),
  ]
  return (
    <AppShell activeNav="compliance" activeSubNav="compliance-kyc" title="KYC" location="Compliance" breadcrumbs={breadcrumbs}>
      <div className={shared.page}>
        <DotMatrixBackground />
        <div className={shared.layout}>{children}</div>
      </div>
    </AppShell>
  )
}
