import { EMAIL_EVENTS, type EmailEventId, type SmtpSettings, type WhitelabelEmailSettings } from './emailModel'

/*
 * ILLUSTRATIVE PROTOTYPE E-MAIL SETTINGS — not production data, not a backend
 * contract. SMTP hosts use reserved example domains (RFC 2606) and are not real
 * providers. No secret exists anywhere in this file: `secretConfigured` is a flag.
 */

function events(enabled: Partial<Record<EmailEventId, boolean>>) {
  return EMAIL_EVENTS.map((event) => ({ ...event, enabled: enabled[event.id] ?? false }))
}

const NOT_CONFIGURED: SmtpSettings = {
  host: '',
  port: null,
  security: 'starttls',
  username: '',
  secretConfigured: false,
  senderEmail: '',
  senderName: '',
  status: 'not_configured',
}

export const PROTOTYPE_EMAIL_SETTINGS: Record<string, WhitelabelEmailSettings> = {
  wl_proto_01: {
    whitelabelId: 'wl_proto_01',
    smtp: {
      host: 'smtp.example.com',
      port: 587,
      security: 'starttls',
      username: 'finapop-envios',
      secretConfigured: true,
      senderEmail: 'nao-responda@finapop.com.br',
      senderName: 'Finapop',
      status: 'configured',
    },
    eventPreferences: events({
      registrationCompleted: true,
      passwordRecovery: true,
      investmentEquity: true,
      investmentDebt: false,
      accountApproved: true,
      termsUpdated: false,
    }),
    templateSummary: { source: 'platform_default' },
  },
  wl_proto_02: {
    whitelabelId: 'wl_proto_02',
    smtp: {
      host: 'smtp.example.net',
      port: 465,
      security: 'ssl_tls',
      username: 'loor-envios',
      secretConfigured: true,
      senderEmail: 'contato@loor.com.br',
      senderName: 'Loor',
      status: 'configured',
    },
    eventPreferences: events({
      registrationCompleted: true,
      passwordRecovery: true,
      investmentEquity: true,
      investmentDebt: true,
      accountApproved: false,
      termsUpdated: true,
    }),
    templateSummary: { source: 'platform_default' },
  },
  wl_proto_03: {
    whitelabelId: 'wl_proto_03',
    smtp: NOT_CONFIGURED,
    eventPreferences: events({ registrationCompleted: true, passwordRecovery: true }),
    templateSummary: { source: 'platform_default' },
  },
}
