import { useState } from 'react'
import { ArrowLeft, CircleAlert, RotateCw, SearchX } from 'lucide-react'
import { AppShell } from '../../components/shell/AppShell'
import { EmptyState } from '../../components/ui/EmptyState'
import { OutlineButton } from '../../components/ui/OutlineButton'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { isAbortError } from '../../lib/api'
import { describeApiError } from '../../lib/apiErrors'
import { useSessionOperator } from '../../lib/authSession'
import { formatWhitelabelDate } from '../whitelabels/whitelabelApi'
import {
  canStartProvisioning,
  isManualGate,
  isTerminalProvisioningStatus,
  retryProvisioning,
  type ProvisioningRecord,
  type ProvisioningStep,
} from './provisioningApi'
import { STEP_LABELS, STEP_STATUS_GLYPH } from './provisioningLabels'
import { DeliveryPanel } from './ProvisioningDelivery'
import { ManualGatePanel } from './ProvisioningManualGate'
import { ProvisioningStatusBadge, ProvisioningStepBadge } from './ProvisioningUi'
import { useProvisioningPoll } from './useProvisioningPoll'
import styles from './Provisioning.module.css'

const ERROR_TEXT_MAX = 300

export function ProvisioningProgressPage({ id }: { id: string }) {
  return (
    <AppShell
      activeNav="plataformas"
      activeSubNav="whitelabels"
      title="Implantação de Whitelabel"
      location="Whitelabels"
      breadcrumbs={[{ label: 'Whitelabels', href: '#/whitelabels' }, { label: 'Implantação' }]}
    >
      <ProgressContent key={id} id={id} />
    </AppShell>
  )
}

function BackLink() {
  return (
    <a className={styles.backLink} href="#/whitelabels">
      <ArrowLeft size={14} aria-hidden="true" /> Voltar aos Whitelabels
    </a>
  )
}

function safeText(value: string) {
  return value.length > ERROR_TEXT_MAX ? `${value.slice(0, ERROR_TEXT_MAX)}…` : value
}

function ProgressContent({ id }: { id: string }) {
  const poll = useProvisioningPoll(id)
  const { record, error, loading, refreshing, reload, applyRecord, busyAction, setBusyAction } = poll
  const operator = useSessionOperator()
  const canWrite = canStartProvisioning(operator?.roles)
  const [retryError, setRetryError] = useState<string | null>(null)

  if (loading) {
    return (
      <div className={styles.page}>
        <BackLink />
        <section className={styles.panel} aria-busy="true" aria-label="Carregando implantação">
          <div className={styles.skeletonStack} aria-hidden="true">
            <span className={styles.skeleton} style={{ width: '40%' }} />
            <span className={styles.skeleton} style={{ width: '70%' }} />
            <span className={styles.skeleton} />
            <span className={styles.skeleton} style={{ width: '55%' }} />
          </div>
          <p className="visually-hidden" role="status">Carregando implantação…</p>
        </section>
      </div>
    )
  }

  if (!record) {
    const view = describeApiError(error, 'a implantação')
    return (
      <div className={styles.page}>
        <BackLink />
        <section className={styles.panel} role="alert" data-prov-error>
          <div className={styles.state}>
            <EmptyState
              icon={view.notFound ? SearchX : CircleAlert}
              title={view.notFound ? 'Implantação não encontrada' : view.title}
              description={view.notFound ? 'Nenhuma implantação com este identificador foi encontrada no Control Plane.' : view.description}
            />
            {view.correlationId ? <p className={styles.muted}>Código de diagnóstico: <code className={styles.mono}>{view.correlationId}</code></p> : null}
            {view.retryable ? (
              <OutlineButton onClick={reload}>
                <RotateCw size={14} aria-hidden="true" /> Tentar novamente
              </OutlineButton>
            ) : null}
          </div>
        </section>
      </div>
    )
  }

  const failedStep = record.steps.find((step) => step.status === 'FAILED')
  const waitingStep = record.steps.find((step) => step.status === 'WAITING_MANUAL_ACTION')
  const gateKey = record.status === 'WAITING_MANUAL_ACTION' ? (waitingStep?.key ?? record.currentStep) : null
  const percentage = Math.min(100, Math.max(0, Math.round(record.progress.percentage)))
  const live = !isTerminalProvisioningStatus(record.status)
  const pollError = error ? describeApiError(error, 'a implantação') : null

  async function retry() {
    if (busyAction || !canWrite) return
    setBusyAction('retry')
    setRetryError(null)
    try {
      applyRecord(await retryProvisioning(id))
    } catch (failure) {
      if (!isAbortError(failure)) setRetryError(describeApiError(failure, 'a implantação').description)
    } finally {
      setBusyAction(null)
    }
  }

  return (
    <div className={styles.page}>
      <BackLink />

      <section className={styles.panel} aria-labelledby="prov-progress-title">
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.accentBar} aria-hidden="true" />
            <h1 id="prov-progress-title" className={styles.title}>{record.name}</h1>
            <p className={styles.subtitle}>
              Slug <code className={styles.mono}>{record.slug}</code>
              {record.whitelabelId !== null ? <> · Whitelabel ID {record.whitelabelId}</> : null}
            </p>
          </div>
          <ProvisioningStatusBadge status={record.status} />
        </div>

        <div className={styles.progressWrap}>
          <div className={styles.progressMeta}>
            <span>{record.progress.completed} de {record.progress.total} etapas</span>
            <span>{percentage}%</span>
          </div>
          <div className={styles.progressBar} role="progressbar" aria-label="Progresso da implantação" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}>
            <div className={styles.progressFill} data-status={record.status} style={{ width: `${percentage}%` }} />
          </div>
        </div>

        <div className={styles.metaRow}>
          {record.currentStep ? <span>Etapa atual: {STEP_LABELS[record.currentStep]}</span> : null}
          {formatWhitelabelDate(record.updatedAt, true) ? <span>Atualizado em {formatWhitelabelDate(record.updatedAt, true)}</span> : null}
          {live ? <span className={styles.refreshing} role="status">{refreshing ? 'Atualizando…' : 'Atualização automática ativa'}</span> : null}
        </div>

        {record.errorMessage ? (
          <p className={styles.submitError} role="alert">
            {safeText(record.errorMessage)}
            {record.errorCode ? <> <span className={styles.mono}>({record.errorCode})</span></> : null}
          </p>
        ) : null}

        {pollError ? (
          <p className={styles.submitError} role="alert">
            Não foi possível atualizar o andamento: {pollError.description}{' '}
            {pollError.retryable ? <OutlineButton onClick={reload}>Tentar novamente</OutlineButton> : null}
          </p>
        ) : null}
      </section>

      <section className={styles.panel} aria-labelledby="prov-steps-title">
        <h2 id="prov-steps-title" className={styles.title} style={{ fontSize: 16 }}>Etapas</h2>
        <ol className={styles.steps}>
          {record.steps.map((step) => (
            <StepRow key={step.key} step={step} current={record.currentStep === step.key} />
          ))}
        </ol>

        {record.status === 'FAILED' && failedStep ? (
          <>
            {retryError ? <p className={styles.submitError} role="alert">{retryError}</p> : null}
            <div className={styles.actions}>
              <span className={styles.muted}>
                {canWrite ? 'Corrija a causa e reexecute a etapa que falhou.' : 'Reexecutar exige o perfil SUPER_ADMIN e a liberação de escrita (VITE_WHITELABEL_WRITES_ENABLED).'}
              </span>
              <PrimaryButton onClick={() => void retry()} disabled={!canWrite || busyAction !== null} aria-busy={busyAction === 'retry' || undefined}>
                <RotateCw size={16} aria-hidden="true" />
                {busyAction === 'retry' ? 'Reenviando…' : `Tentar novamente: ${STEP_LABELS[failedStep.key]}`}
              </PrimaryButton>
            </div>
          </>
        ) : null}
      </section>

      {gateKey && isManualGate(gateKey) ? (
        <ManualGatePanel key={gateKey} record={record} stepKey={gateKey} disabled={!canWrite || busyAction !== null} onCompleted={(next: ProvisioningRecord) => applyRecord(next)} />
      ) : null}

      {record.status === 'COMPLETED' && record.delivery ? <DeliveryPanel delivery={record.delivery} /> : null}
    </div>
  )
}

function StepRow({ step, current }: { step: ProvisioningStep; current: boolean }) {
  const done = formatWhitelabelDate(step.completedAt, true)
  return (
    <li className={styles.step} data-status={step.status} aria-current={current ? 'step' : undefined}>
      <span className={styles.stepGlyph} aria-hidden="true">{STEP_STATUS_GLYPH[step.status]}</span>
      <div>
        <p className={styles.stepName}>
          {STEP_LABELS[step.key]}
          {current ? <span className={styles.stepCurrent}>etapa atual</span> : null}
        </p>
        <p className={styles.stepDetail}>
          Tentativas: {step.attempts}
          {done ? ` · Concluída em ${done}` : ''}
        </p>
        {step.lastErrorMessage ? (
          <p className={`${styles.stepDetail} ${styles.stepError}`}>
            {safeText(step.lastErrorMessage)}
            {step.lastErrorCode ? <> <span className={styles.mono}>({step.lastErrorCode})</span></> : null}
          </p>
        ) : null}
      </div>
      <ProvisioningStepBadge status={step.status} />
    </li>
  )
}
