import { CircleAlert, RotateCw } from 'lucide-react'
import type { ReactNode } from 'react'
import { EmptyState } from '../../components/ui/EmptyState'
import { OutlineButton } from '../../components/ui/OutlineButton'
import { StatusPill } from '../../components/ui/StatusPill'
import { describeApiError } from '../../lib/apiErrors'
import fin from '../finance-gateways/sections/FinanceSections.module.css'
import styles from './KycRead.module.css'
import { kycReadStatus } from './kycReadApi'

export const KycReadStatus = ({ value }: { value: string | null }) => <StatusPill {...kycReadStatus(value)} />
export function KycReadFeedback({ error, retry }: { error?: unknown; retry?: () => void }) {
  if (!error) return <section className={fin.card} aria-busy="true" role="status" data-kyc-state="loading">Carregando casos KYC…</section>
  const view = describeApiError(error, 'os casos KYC')
  return <section className={`${fin.card} ${styles.feedback}`} role="alert" data-kyc-state={view.notFound ? 'not-found' : 'error'}>
    <EmptyState icon={CircleAlert} title={view.title} description={view.description} />
    {view.correlationId ? <p>Código de diagnóstico: {view.correlationId}</p> : null}
    {view.retryable && retry ? <OutlineButton onClick={retry}><RotateCw size={14} aria-hidden="true" />Tentar novamente</OutlineButton> : null}
  </section>
}
export function KycReadSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className={fin.card} aria-label={title}><h3 className={fin.cardTitleSm}>{title}</h3>{children}</section>
}
