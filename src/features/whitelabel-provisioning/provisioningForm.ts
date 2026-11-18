import {
  BASE_URL_MAX,
  NAME_MAX,
  NAME_MIN,
  SLUG_MAX,
  SLUG_PATTERN,
  baseUrlError,
  dtoLength,
  nameError,
  slugError,
  tidy,
  tidyName,
} from '../whitelabels/crud/whitelabelForm'
import {
  MAIN_AREA_IMAGE_MAX_BYTES,
  MAIN_AREA_IMAGE_TYPES,
  MAIN_AREA_PAGES,
  type CreateProvisioningBody,
  type MainAreaPage,
  type ProvisioningBranding,
} from './provisioningApi'

export type WizardStep = 'client' | 'environments' | 'template' | 'admin' | 'optional' | 'review'

export const WIZARD_STEPS: readonly WizardStep[] = Object.freeze([
  'client',
  'environments',
  'template',
  'admin',
  'optional',
  'review',
])

export const ENVIRONMENT_CAPABILITIES = ['INVESTOR', 'ENTREPRENEUR', 'ADMIN'] as const
export type EnvironmentCapability = (typeof ENVIRONMENT_CAPABILITIES)[number]

export type ProvisioningDraft = {
  name: string
  slug: string
  baseUrl: string
  /** Contracted FE environments — at least one required. */
  envInvestor: boolean
  envEntrepreneur: boolean
  envAdmin: boolean
  templateFromWhitelabelId: string
  adminEnabled: boolean
  adminName: string
  adminEmail: string
  /** Required by Nest CreateProvisioningDto.initialAdmin when admin is enabled. */
  adminTemporaryPassword: string
  termsEnabled: boolean
  termsTitle: string
  termsMarkdown: string
  smtpEnabled: boolean
  smtpHost: string
  smtpPort: string
  smtpSecure: boolean
  smtpUsername: string
  smtpPassword: string
  smtpFromEmail: string
  smtpFromName: string
  /** Optional client branding (UPLOAD_BRAND). Build-time assets (logo/favicon/PWA) are out of scope. */
  brandingEnabled: boolean
  brandEmailPrimaryColor: string
  brandEmailLogoUrl: string
  brandLoginTextColor: string
  /** Bytes live only in the browser draft; sent as multipart `mainAreaImage`, never in the JSON. */
  brandMainAreaFile: File | null
  brandMainAreaPages: MainAreaPage[]
  skipFeDeployCheck: boolean
  skipDnsCheck: boolean
}

export const EMPTY_PROVISIONING_DRAFT: Readonly<ProvisioningDraft> = Object.freeze({
  name: '',
  slug: '',
  baseUrl: '',
  envInvestor: false,
  envEntrepreneur: false,
  envAdmin: false,
  templateFromWhitelabelId: '',
  adminEnabled: true,
  adminName: '',
  adminEmail: '',
  adminTemporaryPassword: '',
  termsEnabled: false,
  termsTitle: '',
  termsMarkdown: '',
  smtpEnabled: false,
  smtpHost: '',
  smtpPort: '587',
  smtpSecure: true,
  smtpUsername: '',
  smtpPassword: '',
  smtpFromEmail: '',
  smtpFromName: '',
  brandingEnabled: false,
  brandEmailPrimaryColor: '',
  brandEmailLogoUrl: '',
  brandLoginTextColor: '',
  brandMainAreaFile: null,
  brandMainAreaPages: ['login'] as MainAreaPage[],
  skipFeDeployCheck: false,
  skipDnsCheck: false,
})

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/
export const BRAND_LOGO_URL_MAX = 2048
const HTTP_URL_NO_CREDENTIALS = /^https?:\/\/[^/\s@]+(?:[/?#]\S*)?$/i

export function brandLogoUrlError(value: string): string | undefined {
  if (!value) return undefined
  if (value.length > BRAND_LOGO_URL_MAX) return `Use no máximo ${BRAND_LOGO_URL_MAX} caracteres.`
  if (!HTTP_URL_NO_CREDENTIALS.test(value)) return 'Informe uma URL http(s) completa, sem usuário/senha.'
  return undefined
}

export function brandColorError(value: string): string | undefined {
  if (!value) return undefined
  return HEX_COLOR.test(value) ? undefined : 'Use o formato #rrggbb (ex.: #1a2b3c).'
}

export function brandImageError(file: File | null): string | undefined {
  if (!file) return undefined
  if (!(MAIN_AREA_IMAGE_TYPES as readonly string[]).includes(file.type)) return 'Use uma imagem JPG ou PNG.'
  if (file.size <= 0) return 'O arquivo está vazio.'
  if (file.size > MAIN_AREA_IMAGE_MAX_BYTES) return 'A imagem excede 20 MB.'
  return undefined
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type DraftErrors = Partial<Record<keyof ProvisioningDraft, string>>

export function validateClient(draft: ProvisioningDraft): DraftErrors {
  const name = nameError(tidyName(draft.name))
  const slug = slugError(tidy(draft.slug))
  const baseUrl = baseUrlError(tidy(draft.baseUrl))
  return {
    ...(name ? { name } : {}),
    ...(slug ? { slug } : {}),
    ...(baseUrl ? { baseUrl } : {}),
  }
}

export function validateTemplate(draft: ProvisioningDraft): DraftErrors {
  const raw = tidy(draft.templateFromWhitelabelId)
  if (!raw) return {}
  if (!/^[1-9]\d*$/.test(raw)) return { templateFromWhitelabelId: 'Informe um ID numérico de Whitelabel existente.' }
  return {}
}

export function validateAdmin(draft: ProvisioningDraft): DraftErrors {
  if (!draft.adminEnabled) return {}
  const errors: DraftErrors = {}
  const email = tidy(draft.adminEmail)
  if (!email) errors.adminEmail = 'Informe o e-mail do administrador inicial.'
  else if (!EMAIL.test(email) || email.length > 191) errors.adminEmail = 'Informe um e-mail válido.'
  const name = tidyName(draft.adminName)
  if (name && dtoLength(name) > 191) errors.adminName = 'Use no máximo 191 caracteres.'
  const password = draft.adminTemporaryPassword
  if (!password) errors.adminTemporaryPassword = 'Informe a senha temporária (exigida pelo Control Plane).'
  else if (password.length < 8) errors.adminTemporaryPassword = 'Use pelo menos 8 caracteres.'
  else if (password.length > 128) errors.adminTemporaryPassword = 'Use no máximo 128 caracteres.'
  return errors
}

export function validateOptional(draft: ProvisioningDraft): DraftErrors {
  const errors: DraftErrors = {}
  if (draft.termsEnabled) {
    const title = tidyName(draft.termsTitle)
    const markdown = draft.termsMarkdown.trim()
    if (!title) errors.termsTitle = 'Informe o título dos Termos.'
    else if (dtoLength(title) > 240) errors.termsTitle = 'Use no máximo 240 caracteres.'
    if (!markdown) errors.termsMarkdown = 'Informe o Markdown dos Termos.'
    else if (markdown.length > 200000) errors.termsMarkdown = 'Conteúdo acima do limite aceito.'
  }
  if (draft.smtpEnabled) {
    if (!tidy(draft.smtpHost)) errors.smtpHost = 'Informe o host SMTP.'
    const port = Number(tidy(draft.smtpPort))
    if (!Number.isInteger(port) || port < 1 || port > 65535) errors.smtpPort = 'Informe uma porta entre 1 e 65535.'
    if (!tidy(draft.smtpFromEmail) || !EMAIL.test(tidy(draft.smtpFromEmail))) {
      errors.smtpFromEmail = 'Informe o e-mail remetente.'
    }
    if (!draft.smtpPassword) errors.smtpPassword = 'Informe a senha SMTP (apenas em memória no Control Plane).'
    if (!tidy(draft.smtpUsername)) errors.smtpUsername = 'Informe o usuário SMTP.'
  }
  if (draft.brandingEnabled) {
    const primary = brandColorError(tidy(draft.brandEmailPrimaryColor))
    if (primary) errors.brandEmailPrimaryColor = primary
    const logo = brandLogoUrlError(tidy(draft.brandEmailLogoUrl))
    if (logo) errors.brandEmailLogoUrl = logo
    const login = brandColorError(tidy(draft.brandLoginTextColor))
    if (login) errors.brandLoginTextColor = login
    const image = brandImageError(draft.brandMainAreaFile)
    if (image) errors.brandMainAreaFile = image
    else if (draft.brandMainAreaFile && draft.brandMainAreaPages.length === 0) {
      errors.brandMainAreaPages = 'Selecione ao menos uma página para a imagem.'
    }
  }
  return errors
}

export function validateEnvironments(draft: ProvisioningDraft): DraftErrors {
  if (!draft.envInvestor && !draft.envEntrepreneur && !draft.envAdmin) {
    return { envInvestor: 'Selecione ao menos um ambiente contratado.' }
  }
  return {}
}

export function selectedEnvironments(draft: ProvisioningDraft): EnvironmentCapability[] {
  const out: EnvironmentCapability[] = []
  if (draft.envInvestor) out.push('INVESTOR')
  if (draft.envEntrepreneur) out.push('ENTREPRENEUR')
  if (draft.envAdmin) out.push('ADMIN')
  return out
}

export function validateWizardStep(step: WizardStep, draft: ProvisioningDraft): DraftErrors {
  if (step === 'client') return validateClient(draft)
  if (step === 'environments') return validateEnvironments(draft)
  if (step === 'template') return validateTemplate(draft)
  if (step === 'admin') return validateAdmin(draft)
  if (step === 'optional') return validateOptional(draft)
  return {
    ...validateClient(draft),
    ...validateEnvironments(draft),
    ...validateTemplate(draft),
    ...validateAdmin(draft),
    ...validateOptional(draft),
  }
}

export function firstDraftError(errors: DraftErrors): keyof ProvisioningDraft | null {
  const key = (Object.keys(errors) as (keyof ProvisioningDraft)[]).find((item) => errors[item])
  return key ?? null
}

/** Build the exact POST body. Omits disabled optional blocks. Never includes empty gateway. */
export function buildCreateBody(draft: ProvisioningDraft): CreateProvisioningBody {
  const body: CreateProvisioningBody = {
    name: tidyName(draft.name),
    slug: tidy(draft.slug),
    baseUrl: tidy(draft.baseUrl),
  }
  const template = tidy(draft.templateFromWhitelabelId)
  if (template) body.templateFromWhitelabelId = Number(template)
  if (draft.adminEnabled) {
    body.initialAdmin = {
      email: tidy(draft.adminEmail),
      temporaryPassword: draft.adminTemporaryPassword,
      ...(tidyName(draft.adminName) ? { name: tidyName(draft.adminName) } : {}),
    }
  }
  if (draft.termsEnabled) {
    body.terms = {
      title: tidyName(draft.termsTitle),
      contentMarkdown: draft.termsMarkdown.trim(),
    }
  }
  if (draft.smtpEnabled) {
    body.smtp = {
      host: tidy(draft.smtpHost),
      port: Number(tidy(draft.smtpPort)),
      secure: draft.smtpSecure,
      username: tidy(draft.smtpUsername),
      password: draft.smtpPassword,
      fromEmail: tidy(draft.smtpFromEmail),
      ...(tidyName(draft.smtpFromName) ? { fromName: tidyName(draft.smtpFromName) } : {}),
    }
  }
  const branding = buildBranding(draft)
  if (branding) body.branding = branding
  body.enabledEnvironments = selectedEnvironments(draft)
  if (draft.skipFeDeployCheck) body.skipFeDeployCheck = true
  if (draft.skipDnsCheck) body.skipDnsCheck = true
  return body
}

/** JSON-safe branding (no File). `undefined` when the section is off or has nothing to apply. */
export function buildBranding(draft: ProvisioningDraft): ProvisioningBranding | undefined {
  if (!draft.brandingEnabled) return undefined
  const branding: ProvisioningBranding = {}
  const email: NonNullable<ProvisioningBranding['email']> = {}
  const primary = tidy(draft.brandEmailPrimaryColor)
  const logo = tidy(draft.brandEmailLogoUrl)
  if (primary) email.primary_color = primary.toLowerCase()
  if (logo) email.logo_url = logo
  if (Object.keys(email).length > 0) branding.email = email
  const login = tidy(draft.brandLoginTextColor)
  if (login) branding.loginBrandPanelTextColor = login.toLowerCase()
  if (draft.brandMainAreaFile && draft.brandMainAreaPages.length > 0) {
    branding.mainArea = { pages: MAIN_AREA_PAGES.filter((page) => draft.brandMainAreaPages.includes(page)) }
  }
  return Object.keys(branding).length > 0 ? branding : undefined
}

/** The File to upload as `mainAreaImage` (null when branding is off or no image was chosen). */
export function buildMainAreaFile(draft: ProvisioningDraft): File | null {
  return draft.brandingEnabled ? draft.brandMainAreaFile : null
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function scrubBodyForReview(body: CreateProvisioningBody, mainAreaFile?: File | null): Record<string, unknown> {
  const clone: Record<string, unknown> = { ...body }
  // Review shows colors / URLs / file name+size only — never file contents.
  if (mainAreaFile && body.branding) {
    clone.branding = {
      ...body.branding,
      mainArea: { ...body.branding.mainArea, file: `${mainAreaFile.name} (${formatFileSize(mainAreaFile.size)})` },
    }
  }
  if (body.initialAdmin) {
    clone.initialAdmin = {
      ...body.initialAdmin,
      temporaryPassword: '••••••••',
    }
  }
  if (body.smtp && typeof body.smtp === 'object') {
    clone.smtp = {
      ...body.smtp,
      password: '••••••••',
      username: body.smtp.username ? String(body.smtp.username) : undefined,
    }
  }
  return clone
}

export { NAME_MIN, NAME_MAX, SLUG_MAX, SLUG_PATTERN, BASE_URL_MAX }
