import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Lock, Rocket } from 'lucide-react'
import { AppShell } from '../../components/shell/AppShell'
import { useNotice } from '../../components/shell/notice'
import { EmptyState } from '../../components/ui/EmptyState'
import { OutlineButton } from '../../components/ui/OutlineButton'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { ApiError, isAbortError } from '../../lib/api'
import { describeApiError } from '../../lib/apiErrors'
import { useSessionOperator } from '../../lib/authSession'
import {
  WHITELABEL_MUTATIONS,
  WRITE_ACCESS_NOTE,
  whitelabelWriteAccess,
} from '../whitelabels/crud/whitelabelMutationContract'
import { listWhitelabels, type WhitelabelRecord } from '../whitelabels/whitelabelApi'
import { canStartProvisioning, createProvisioning } from './provisioningApi'
import {
  EMPTY_PROVISIONING_DRAFT,
  WIZARD_STEPS,
  buildCreateBody,
  buildMainAreaFile,
  scrubBodyForReview,
  validateWizardStep,
  type DraftErrors,
  type ProvisioningDraft,
  type WizardStep,
} from './provisioningForm'
import { WIZARD_STEP_LABELS } from './provisioningLabels'
import { provisioningHref } from './provisioningRoute'
import { AdminStep, ClientStep, EnvironmentsStep, OptionalStep, TemplateStep, type TemplateOptions } from './ProvisioningWizardSteps'
import styles from './Provisioning.module.css'

const STEP_INTRO: Record<WizardStep, string> = {
  client: 'Dados cadastrais do novo tenant.',
  environments: 'Ambientes frontend contratados (Investidor, Empreendedor, Admin).',
  template: 'Opcionalmente, parta das configurações de um Whitelabel ativo.',
  admin: 'Administrador inicial do tenant.',
  optional: 'Termos, SMTP, marca do cliente e conferências manuais — todos opcionais.',
  review: 'Revise antes de iniciar. Senhas não são exibidas.',
}

const TEMPLATE_PAGE_LIMIT = 10

export function ProvisioningWizardPage() {
  return (
    <AppShell
      activeNav="plataformas"
      activeSubNav="whitelabels"
      title="Implantar Whitelabel"
      location="Whitelabels"
      breadcrumbs={[{ label: 'Whitelabels', href: '#/whitelabels' }, { label: 'Implantar Whitelabel' }]}
    >
      <WizardContent />
    </AppShell>
  )
}

function WizardContent() {
  const operator = useSessionOperator()
  const access = whitelabelWriteAccess(operator?.roles)
  const allowed = canStartProvisioning(operator?.roles)

  return (
    <div className={styles.page}>
      <a className={styles.backLink} href="#/whitelabels">
        <ArrowLeft size={14} aria-hidden="true" /> Voltar aos Whitelabels
      </a>
      {allowed ? <Wizard /> : <LockedState access={access} />}
    </div>
  )
}

function LockedState({ access }: { access: ReturnType<typeof whitelabelWriteAccess> }) {
  const description =
    access === 'super-admin'
      ? `${WHITELABEL_MUTATIONS.create.pendingLabel} A implantação exige o perfil SUPER_ADMIN e a liberação de escrita (VITE_WHITELABEL_WRITES_ENABLED) neste ambiente.`
      : `${WRITE_ACCESS_NOTE[access]} A implantação exige o perfil SUPER_ADMIN e a liberação de escrita (VITE_WHITELABEL_WRITES_ENABLED) neste ambiente.`
  return (
    <section className={styles.panel} aria-labelledby="prov-locked-title">
      <h1 id="prov-locked-title" className="visually-hidden">Implantar Whitelabel indisponível</h1>
      <div className={styles.state} data-prov-locked>
        <EmptyState icon={Lock} title="Implantação indisponível" description={description} />
        <OutlineButton onClick={() => (window.location.hash = '#/whitelabels')}>Voltar aos Whitelabels</OutlineButton>
      </div>
    </section>
  )
}

/** Active Whitelabels for the template select (pages of the existing list read, capped). */
async function loadActiveWhitelabels(signal: AbortSignal) {
  const rows: WhitelabelRecord[] = []
  let truncated = false
  for (let page = 1; ; page += 1) {
    const result = await listWhitelabels({ page, search: '', status: 'active' }, signal)
    rows.push(...result.rows)
    if (page >= result.lastPage) break
    if (page >= TEMPLATE_PAGE_LIMIT) {
      truncated = true
      break
    }
  }
  return { rows, truncated }
}

function submitMessage(error: unknown) {
  if (error instanceof ApiError && error.kind === 'http') {
    if (error.status === 409) return 'Já existe um Whitelabel ou implantação com este slug ou URL base. Revise os dados do cliente.'
    if (error.status === 400 || error.status === 422) return 'O Control Plane recusou os dados informados. Revise os campos e tente novamente.'
    if (error.status === 403) return 'Seu perfil não tem permissão para iniciar implantações.'
  }
  return describeApiError(error, 'a implantação').description
}

function Wizard() {
  const notify = useNotice()
  const [index, setIndex] = useState(0)
  const [draft, setDraft] = useState<ProvisioningDraft>({ ...EMPTY_PROVISIONING_DRAFT })
  const [errors, setErrors] = useState<DraftErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [templates, setTemplates] = useState<TemplateOptions>({ status: 'loading' })
  const [templateAttempt, setTemplateAttempt] = useState(0)
  const submitController = useRef<AbortController | null>(null)

  const step = WIZARD_STEPS[index]
  const lastIndex = WIZARD_STEPS.length - 1

  useEffect(() => {
    const controller = new AbortController()
    loadActiveWhitelabels(controller.signal).then(
      ({ rows, truncated }) => {
        if (!controller.signal.aborted) setTemplates({ status: 'ready', rows, truncated })
      },
      (error: unknown) => {
        if (controller.signal.aborted || isAbortError(error)) return
        setTemplates({
          status: 'error',
          message: describeApiError(error, 'os Whitelabels').description,
          retry: () => {
            setTemplates({ status: 'loading' })
            setTemplateAttempt((value) => value + 1)
          },
        })
      },
    )
    return () => controller.abort()
  }, [templateAttempt])

  useEffect(() => () => submitController.current?.abort(), [])

  function set<K extends keyof ProvisioningDraft>(key: K, value: ProvisioningDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current))
  }

  function next() {
    const found = validateWizardStep(step, draft)
    setErrors(found)
    if (Object.values(found).some(Boolean)) return
    setIndex((value) => Math.min(lastIndex, value + 1))
  }

  function back() {
    setErrors({})
    setSubmitError(null)
    setIndex((value) => Math.max(0, value - 1))
  }

  async function submit() {
    if (submitting) return
    const found = validateWizardStep('review', draft)
    if (Object.values(found).some(Boolean)) {
      // Send the operator back to the first step that has an error.
      const order: WizardStep[] = ['client', 'environments', 'template', 'admin', 'optional']
      const target = order.findIndex((item) => Object.values(validateWizardStep(item, draft)).some(Boolean))
      setErrors(found)
      setIndex(Math.max(0, target))
      return
    }
    const controller = new AbortController()
    submitController.current = controller
    setSubmitting(true)
    setSubmitError(null)
    try {
      const created = await createProvisioning(buildCreateBody(draft), controller.signal, buildMainAreaFile(draft))
      if (controller.signal.aborted) return
      notify('Implantação iniciada. Acompanhe o progresso nesta página.')
      window.location.hash = provisioningHref(created.id)
    } catch (error) {
      if (controller.signal.aborted || isAbortError(error)) return
      setSubmitError(submitMessage(error))
      setSubmitting(false)
    }
  }

  return (
    <section className={styles.panel} aria-labelledby="prov-wizard-title">
      <div className={styles.panelHeader}>
        <div>
          <span className={styles.accentBar} aria-hidden="true" />
          <h1 id="prov-wizard-title" className={styles.title}>Implantar Whitelabel</h1>
          <p className={styles.subtitle}>{STEP_INTRO[step]}</p>
        </div>
      </div>

      <ol className={styles.stepper} aria-label="Etapas da implantação" style={{ marginTop: 16 }}>
        {WIZARD_STEPS.map((item, position) => (
          <li key={item} className={styles.stepperItem} aria-current={position === index ? 'step' : undefined} data-done={position < index || undefined}>
            <span className={styles.stepperIndex} aria-hidden="true">{position < index ? '✓' : position + 1}</span>
            {WIZARD_STEP_LABELS[item]}
          </li>
        ))}
      </ol>

      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          if (step === 'review') void submit()
          else next()
        }}
      >
        <fieldset disabled={submitting} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
          <legend className="visually-hidden">{WIZARD_STEP_LABELS[step]}</legend>
          {step === 'client' ? <ClientStep draft={draft} errors={errors} set={set} /> : null}
          {step === 'environments' ? <EnvironmentsStep draft={draft} errors={errors} set={set} /> : null}
          {step === 'template' ? <TemplateStep draft={draft} errors={errors} set={set} options={templates} /> : null}
          {step === 'admin' ? <AdminStep draft={draft} errors={errors} set={set} /> : null}
          {step === 'optional' ? <OptionalStep draft={draft} errors={errors} set={set} /> : null}
          {step === 'review' ? <Review draft={draft} templates={templates} /> : null}
        </fieldset>

        {submitError ? <p className={styles.submitError} role="alert">{submitError}</p> : null}

        <div className={styles.actions}>
          <OutlineButton onClick={back} disabled={index === 0 || submitting}>
            <ArrowLeft size={14} aria-hidden="true" /> Voltar
          </OutlineButton>
          <div className={styles.actionsGroup}>
            {step === 'review' ? (
              <PrimaryButton type="submit" disabled={submitting} aria-busy={submitting || undefined}>
                <Rocket size={16} aria-hidden="true" />
                {submitting ? 'Iniciando implantação…' : 'Iniciar implantação'}
              </PrimaryButton>
            ) : (
              <PrimaryButton type="submit">
                Avançar <ArrowRight size={16} aria-hidden="true" />
              </PrimaryButton>
            )}
          </div>
        </div>
      </form>
    </section>
  )
}

const REVIEW_LABELS: Record<string, string> = {
  name: 'Nome',
  slug: 'Slug',
  baseUrl: 'URL base',
  templateFromWhitelabelId: 'Template',
  'initialAdmin.name': 'Admin · nome',
  'initialAdmin.email': 'Admin · e-mail',
  'initialAdmin.temporaryPassword': 'Admin · senha temporária',
  'terms.title': 'Termos · título',
  'terms.contentMarkdown': 'Termos · conteúdo',
  'smtp.host': 'SMTP · host',
  'smtp.port': 'SMTP · porta',
  'smtp.secure': 'SMTP · TLS',
  'smtp.username': 'SMTP · usuário',
  'smtp.password': 'SMTP · senha',
  'smtp.fromEmail': 'SMTP · remetente',
  'smtp.fromName': 'SMTP · nome do remetente',
  'branding.email.primary_color': 'Marca · e-mail · cor primária',
  'branding.email.logo_url': 'Marca · e-mail · URL do logo',
  'branding.loginBrandPanelTextColor': 'Marca · login · cor do texto',
  'branding.mainArea.file': 'Marca · imagem principal (arquivo)',
  'branding.mainArea.pages': 'Marca · imagem principal (páginas)',
  skipFeDeployCheck: 'Pular conferência dos frontends',
  skipDnsCheck: 'Pular conferência de DNS / HTTPS',
}

function flatten(value: Record<string, unknown>, prefix = ''): [string, unknown][] {
  return Object.entries(value).flatMap(([key, item]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return item !== null && typeof item === 'object' && !Array.isArray(item)
      ? flatten(item as Record<string, unknown>, path)
      : [[path, item] as [string, unknown]]
  })
}

function reviewValue(path: string, value: unknown, templates: TemplateOptions) {
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não'
  if (value === undefined || value === null || value === '') return '—'
  if (path === 'templateFromWhitelabelId' && templates.status === 'ready') {
    const row = templates.rows.find((item) => item.id === String(value))
    return row ? `${row.name} (ID ${row.id})` : `ID ${String(value)}`
  }
  const text = String(value)
  return path === 'terms.contentMarkdown' && text.length > 240 ? `${text.slice(0, 240)}… (${text.length} caracteres)` : text
}

function Review({ draft, templates }: { draft: ProvisioningDraft; templates: TemplateOptions }) {
  const entries = flatten(scrubBodyForReview(buildCreateBody(draft), buildMainAreaFile(draft)))
  return (
    <dl className={styles.reviewList} aria-label="Resumo da implantação">
      {entries.map(([path, value]) => (
        <div key={path} className={styles.reviewRow}>
          <dt>{REVIEW_LABELS[path] ?? path}</dt>
          <dd>{reviewValue(path, value, templates)}</dd>
        </div>
      ))}
      {draft.templateFromWhitelabelId.trim() === '' ? (
        <div className={styles.reviewRow}>
          <dt>Template</dt>
          <dd>Sem template</dd>
        </div>
      ) : null}
      {draft.brandingEnabled ? (
        <div className={styles.reviewRow}>
          <dt>Marca · fora desta etapa</dt>
          <dd>Logo institucional, favicon e ícones PWA são definidos no build do frontend.</dd>
        </div>
      ) : null}
      {!draft.adminEnabled ? (
        <div className={styles.reviewRow}>
          <dt>Administrador inicial</dt>
          <dd>Não será criado</dd>
        </div>
      ) : null}
    </dl>
  )
}
