import type { ProvisioningRecord, ProvisioningStep } from './provisioningApi'
import styles from './Provisioning.module.css'

const ENV_LABEL: Record<string, string> = {
  investor: 'INVESTIDOR',
  entrepreneur: 'EMPREENDEDOR',
  admin: 'ADMIN',
  INVESTOR: 'INVESTIDOR',
  ENTREPRENEUR: 'EMPREENDEDOR',
  ADMIN: 'ADMIN',
}

type EnvRow = {
  environment?: string
  capability?: string
  url?: string
  host?: string
  resolves?: boolean
  httpsOk?: boolean
  https?: boolean
  bootstrapOk?: boolean
  bootstrapSlug?: string | null
  status?: string
  error?: string | null
}

function asEnvRows(step: ProvisioningStep | undefined): EnvRow[] {
  const result = step?.result
  if (!result || typeof result !== 'object' || Array.isArray(result)) return []
  const envs = (result as { environments?: unknown }).environments
  if (Array.isArray(envs)) return envs as EnvRow[]
  return []
}

function pickReadinessStep(record: ProvisioningRecord): ProvisioningStep | undefined {
  const failed = record.steps.find(
    (s) =>
      (s.key === 'FE_DEPLOY_CHECK' || s.key === 'DNS_CHECK') && s.status === 'FAILED',
  )
  if (failed) return failed
  const fe = record.steps.find((s) => s.key === 'FE_DEPLOY_CHECK')
  if (fe?.result) return fe
  return record.steps.find((s) => s.key === 'DNS_CHECK' && s.result)
}

function CheckLine({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className={styles.muted} style={{ listStyle: 'none', margin: '2px 0' }}>
      <span aria-hidden="true">{ok ? '✓' : '✕'} </span>
      {label}
    </li>
  )
}

export function ReadinessPanel({ record }: { record: ProvisioningRecord }) {
  const step = pickReadinessStep(record)
  const rows = asEnvRows(step)
  if (!rows.length) return null

  return (
    <section className={styles.panel} aria-labelledby="prov-readiness-title">
      <h2 id="prov-readiness-title" className={styles.title} style={{ fontSize: 16 }}>
        Frontends compartilhados
      </h2>
      <p className={styles.muted}>
        Mesmo build por app. Verificação automática: DNS, HTTPS e tenant via bootstrap.
      </p>
      <ul className={styles.steps} style={{ marginTop: 12 }}>
        {rows.map((row) => {
          const key = row.environment ?? row.capability ?? 'env'
          const title = ENV_LABEL[key] ?? key.toUpperCase()
          const https = row.httpsOk ?? row.https ?? false
          const ok = row.status === 'ok'
          return (
            <li key={key} className={styles.step} data-status={ok ? 'SUCCESS' : 'FAILED'}>
              <span className={styles.stepGlyph} aria-hidden="true">
                {ok ? '✓' : '✕'}
              </span>
              <div>
                <p className={styles.stepName}>{title}</p>
                {row.url ? (
                  <p className={styles.muted}>
                    <a href={row.url} target="_blank" rel="noreferrer">
                      {row.url}
                    </a>
                  </p>
                ) : null}
                <ul style={{ margin: '6px 0 0', padding: 0 }}>
                  <CheckLine ok={true} label="Frontend compartilhado disponível" />
                  <CheckLine ok={Boolean(row.resolves)} label="DNS" />
                  <CheckLine ok={Boolean(https)} label="HTTPS" />
                  <CheckLine
                    ok={Boolean(row.bootstrapOk)}
                    label={
                      row.bootstrapOk
                        ? `Tenant identificado${row.bootstrapSlug ? ` (${row.bootstrapSlug})` : ''}`
                        : row.error?.includes('mismatch')
                          ? 'Tenant retornado não corresponde ao provisioning'
                          : 'Tenant identificado'
                    }
                  />
                </ul>
                {!ok && row.error ? (
                  <p className={styles.submitError} role="alert">
                    {row.error}
                  </p>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
