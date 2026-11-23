import type { ProvisioningStatus, ProvisioningStepKey, ProvisioningStepStatus } from './provisioningApi'

export const STEP_LABELS: Readonly<Record<ProvisioningStepKey, string>> = Object.freeze({
  CREATE_TENANT: 'Cadastro do tenant',
  APPLY_SETTINGS_TEMPLATE: 'Copiar configurações do template',
  UPLOAD_BRAND: 'Upload de marca',
  INITIAL_ADMIN: 'Administrador inicial',
  TERMS: 'Termos de uso',
  SMTP: 'SMTP',
  GATEWAY_CONFIG: 'Gateway de pagamento',
  CONFIGURE_FRONTEND_DOMAINS: 'Domínios frontend (Netlify)',
  FE_DEPLOY_CHECK: 'Frontend compartilhado (readiness)',
  DNS_CHECK: 'DNS / HTTPS / tenant (readiness)',
  VALIDATE: 'Validação final',
  DELIVER: 'Entrega',
})

export const STATUS_LABELS: Readonly<Record<ProvisioningStatus, string>> = Object.freeze({
  PENDING: 'Pendente',
  RUNNING: 'Em execução',
  WAITING_MANUAL_ACTION: 'Aguardando ação manual',
  FAILED: 'Falhou',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
})

export const STEP_STATUS_LABELS: Readonly<Record<ProvisioningStepStatus, string>> = Object.freeze({
  PENDING: 'Pendente',
  RUNNING: 'Em execução',
  WAITING_MANUAL_ACTION: 'Aguardando ação',
  SUCCESS: 'Concluído',
  FAILED: 'Falhou',
  SKIPPED: 'Ignorado',
})

export const STEP_STATUS_GLYPH: Readonly<Record<ProvisioningStepStatus, string>> = Object.freeze({
  SUCCESS: '✓',
  RUNNING: '⟳',
  PENDING: '○',
  WAITING_MANUAL_ACTION: '!',
  FAILED: '✕',
  SKIPPED: '—',
})

export const WIZARD_STEP_LABELS = Object.freeze({
  client: 'Cliente',
  environments: 'Ambientes',
  template: 'Template',
  admin: 'Admin inicial',
  optional: 'Opcionais',
  review: 'Revisão',
})
