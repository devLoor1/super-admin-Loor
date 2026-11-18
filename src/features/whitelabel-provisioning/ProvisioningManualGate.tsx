import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, TriangleAlert } from 'lucide-react'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { isAbortError } from '../../lib/api'
import { describeApiError } from '../../lib/apiErrors'
import {
  completeProvisioningStep,
  isHttpsOrigin,
  suggestedFrontendUrls,
  type CompleteManualBody,
  type FrontendEnvironment,
  type ManualGateKey,
  type ProvisioningRecord,
} from './provisioningApi'
import { STEP_LABELS } from './provisioningLabels'
import { CheckField, TextAreaField, TextField } from './ProvisioningUi'
import styles from './Provisioning.module.css'

export const GATE_NOTE_MAX = 500

type ChecklistKey = keyof CompleteManualBody['checklist']

type Item = { key: ChecklistKey; label: string }

const ENV_LABEL: Record<FrontendEnvironment, string> = {
  investor: 'Investidor',
  entrepreneur: 'Empreendedor',
  admin: 'Admin',
}

const ALL_ENVS: FrontendEnvironment[] = ['investor', 'entrepreneur', 'admin']

const CAP_TO_FE: Record<string, FrontendEnvironment> = {
  INVESTOR: 'investor',
  ENTREPRENEUR: 'entrepreneur',
  ADMIN: 'admin',
  investor: 'investor',
  entrepreneur: 'entrepreneur',
  admin: 'admin',
}

function enabledFromRecord(record: ProvisioningRecord): FrontendEnvironment[] {
  const tenant = record.steps.find((s) => s.key === 'CREATE_TENANT')
  const payload = tenant?.payload
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const raw = (payload as { enabledEnvironments?: unknown }).enabledEnvironments
    if (Array.isArray(raw) && raw.length > 0) {
      const out: FrontendEnvironment[] = []
      for (const item of raw) {
        if (typeof item !== 'string') continue
        const fe = CAP_TO_FE[item] ?? CAP_TO_FE[item.toUpperCase()]
        if (fe && !out.includes(fe)) out.push(fe)
      }
      if (out.length) return out
    }
  }
  return [...ALL_ENVS]
}

const DNS_ITEMS: Item[] = [
  { key: 'resolves', label: 'Os hosts contratados resolvem para o frontend publicado' },
  { key: 'https', label: 'HTTPS funciona com certificado válido nos hosts contratados' },
]

type Props = {
  record: ProvisioningRecord
  stepKey: ManualGateKey
  onCompleted: (record: ProvisioningRecord) => void
  disabled?: boolean
}

function urlsFromFeStep(record: ProvisioningRecord, enabled: FrontendEnvironment[]): Record<FrontendEnvironment, string> | null {
  const step = record.steps.find((s) => s.key === 'FE_DEPLOY_CHECK')
  const result = step?.result
  if (!result || typeof result !== 'object' || Array.isArray(result)) return null
  const urls = (result as { urls?: unknown }).urls
  if (!urls || typeof urls !== 'object' || Array.isArray(urls)) return null
  const out = {} as Record<FrontendEnvironment, string>
  for (const env of enabled) {
    const cell = (urls as Record<string, unknown>)[env]
    const raw =
      cell && typeof cell === 'object' && !Array.isArray(cell)
        ? (cell as { url?: unknown }).url
        : cell
    if (typeof raw !== 'string' || !isHttpsOrigin(raw)) return null
    out[env] = new URL(raw.trim()).origin.toLowerCase()
  }
  return out
}

export function ManualGatePanel({ record, stepKey, onCompleted, disabled = false }: Props) {
  const enabled = useMemo(() => enabledFromRecord(record), [record])
  const disabledEnvs = ALL_ENVS.filter((e) => !enabled.includes(e))
  const suggested = useMemo(() => suggestedFrontendUrls(record.slug), [record.slug])
  const fromFe = useMemo(() => urlsFromFeStep(record, enabled), [record, enabled])
  const initialUrls = useMemo(() => {
    const base = fromFe ?? suggested
    const next = {} as Record<FrontendEnvironment, string>
    for (const env of ALL_ENVS) next[env] = enabled.includes(env) ? base[env] ?? '' : ''
    return next
  }, [fromFe, suggested, enabled])

  const feItems: Item[] = enabled.map((env) => ({
    key: env,
    label: `Frontend ${ENV_LABEL[env]} publicado e funcionando`,
  }))
  const items = stepKey === 'FE_DEPLOY_CHECK' ? feItems : DNS_ITEMS

  const [checked, setChecked] = useState<Partial<Record<ChecklistKey, boolean>>>({})
  const [urls, setUrls] = useState<Record<FrontendEnvironment, string>>(initialUrls)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const controller = useRef<AbortController | null>(null)

  useEffect(() => () => controller.current?.abort(), [])

  const urlErrors = useMemo(() => {
    const next: Partial<Record<FrontendEnvironment, string>> = {}
    for (const env of enabled) {
      if (!urls[env]?.trim()) next[env] = 'Informe a URL https.'
      else if (!isHttpsOrigin(urls[env])) next[env] = 'Use uma origem https válida (sem usuário/senha).'
    }
    return next
  }, [urls, enabled])

  const urlsOk = enabled.every((env) => !urlErrors[env])
  const complete = items.every((item) => checked[item.key] === true)
  const noteError = note.length > GATE_NOTE_MAX ? `Use no máximo ${GATE_NOTE_MAX} caracteres.` : undefined
  const canSubmit = complete && urlsOk && !noteError && !disabled && !submitting

  async function submit() {
    if (!canSubmit) return
    const normalized = Object.fromEntries(
      enabled.map((env) => [env, new URL(urls[env].trim()).origin.toLowerCase()]),
    ) as Record<FrontendEnvironment, string>

    const body: CompleteManualBody =
      stepKey === 'FE_DEPLOY_CHECK'
        ? {
            checklist: Object.fromEntries(items.map((item) => [item.key, true])),
            urls: normalized,
            ...(note.trim() ? { note: note.trim() } : {}),
          }
        : {
            checklist: Object.fromEntries(items.map((item) => [item.key, true])),
            hosts: Object.fromEntries(
              enabled.map((env) => [env, { url: normalized[env], status: 'ok' as const, https: true as const }]),
            ) as CompleteManualBody['hosts'],
            ...(note.trim() ? { note: note.trim() } : {}),
          }

    const request = new AbortController()
    controller.current = request
    setSubmitting(true)
    setError(null)
    try {
      const next = await completeProvisioningStep(record.id, stepKey, body, request.signal)
      if (request.signal.aborted) return
      setSubmitting(false)
      onCompleted(next)
    } catch (failure) {
      if (request.signal.aborted || isAbortError(failure)) return
      setError(describeApiError(failure, 'a conferência').description)
      setSubmitting(false)
    }
  }

  return (
    <section className={`${styles.panel} ${styles.gate}`} aria-labelledby="prov-gate-title" data-gate={stepKey}>
      <h2 id="prov-gate-title" className={styles.title}>Ação manual: {STEP_LABELS[stepKey]}</h2>
      <p className={styles.subtitle}>
        {stepKey === 'FE_DEPLOY_CHECK'
          ? 'Informe as URLs https dos ambientes contratados. Ambientes não contratados não bloqueiam a implantação.'
          : 'Confirme host/HTTPS apenas para os ambientes contratados. O Control Plane não consulta DNS.'}
      </p>
      {disabledEnvs.length ? (
        <p className={styles.hint} role="note">
          Não contratado: {disabledEnvs.map((e) => ENV_LABEL[e]).join(', ')}
        </p>
      ) : null}
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <fieldset disabled={disabled || submitting} className={styles.gateList} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
          <legend className="visually-hidden">Checklist de {STEP_LABELS[stepKey]}</legend>

          <div style={{ display: 'grid', gap: 12, marginBottom: 12 }}>
            {enabled.map((env) => (
              <TextField
                key={env}
                id={`prov-gate-${stepKey}-url-${env}`}
                label={`URL ${ENV_LABEL[env]}`}
                type="url"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                value={urls[env]}
                error={urlErrors[env]}
                hint={
                  stepKey === 'DNS_CHECK'
                    ? `Host: ${isHttpsOrigin(urls[env]) ? new URL(urls[env]).host : '—'}`
                    : `Sugestão: ${suggested[env]}`
                }
                onChange={(event) => setUrls((current) => ({ ...current, [env]: event.target.value }))}
                full
              />
            ))}
          </div>

          {items.map((item) => (
            <CheckField
              key={item.key}
              id={`prov-gate-${stepKey}-${item.key}`}
              label={item.label}
              checked={checked[item.key] === true}
              onChange={(event) => setChecked((current) => ({ ...current, [item.key]: event.target.checked }))}
            />
          ))}
          <TextAreaField
            id={`prov-gate-${stepKey}-note`}
            label="Observação (opcional)"
            value={note}
            error={noteError}
            hint={`${note.length}/${GATE_NOTE_MAX}`}
            onChange={(event) => setNote(event.target.value)}
          />
        </fieldset>
        {disabled ? (
          <p className={styles.warning} role="note" style={{ marginTop: 14 }}>
            <TriangleAlert size={16} aria-hidden="true" />
            <span>Confirmar esta etapa exige o perfil SUPER_ADMIN e a liberação de escrita (VITE_WHITELABEL_WRITES_ENABLED).</span>
          </p>
        ) : null}
        {error ? <p className={styles.submitError} role="alert">{error}</p> : null}
        <div className={styles.actions}>
          <span className={styles.muted}>
            {complete && urlsOk ? 'Checklist e URLs prontos.' : 'Preencha as URLs contratadas e marque todos os itens.'}
          </span>
          <PrimaryButton type="submit" disabled={!canSubmit} aria-busy={submitting || undefined}>
            <Check size={16} aria-hidden="true" />
            {submitting ? 'Confirmando…' : 'Confirmar e continuar'}
          </PrimaryButton>
        </div>
      </form>
    </section>
  )
}
