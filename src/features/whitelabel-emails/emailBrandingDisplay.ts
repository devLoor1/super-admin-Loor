import { record, valueAt, type ConfigCell, type Json } from '../whitelabel-settings/configurationContract'
import type { EmailPreviewCommand } from './emailTemplatesApi'

/** Match Core's canonical ?? legacy alias resolution for display only.
 * Stored nulls/aliases stay unchanged; edits target only the canonical key. */
export function configurationDisplayValue(cell: ConfigCell, value: Json, path: string[]): Json | undefined {
  const canonical = valueAt(value, path)
  if (cell !== 'email_branding.config' || path.length !== 1 || canonical !== undefined && canonical !== null) return canonical
  const alias = path[0] === 'primary_color' ? 'primaryColor' : path[0] === 'logo_url' ? 'logoUrl' : undefined
  return alias ? valueAt(value, [alias]) ?? canonical : canonical
}

/** Normalize only the render command using Core EmailBrandingService.normalizeHex.
 * The stored/draft object, including legacy aliases and alpha, stays untouched. */
export function emailBrandingPreviewDraft(value: Json): EmailPreviewCommand['brandingDraft'] | null {
  if (value === null) return { primary_color: null, logo_url: null }
  if (!record(value)) return null
  const color = configurationDisplayValue('email_branding.config', value, ['primary_color'])
  const logo = configurationDisplayValue('email_branding.config', value, ['logo_url'])
  const branding: NonNullable<EmailPreviewCommand['brandingDraft']> = {}
  if (color !== undefined) {
    if (color === null) branding.primary_color = null
    else {
      const match = typeof color === 'string' ? color.trim().match(/^#?([\da-f]{6})([\da-f]{2})?$/i) : null
      if (!match) return null
      branding.primary_color = `#${match[1].toLowerCase()}`
    }
  }
  if (logo !== undefined) {
    if (logo !== null && typeof logo !== 'string') return null
    branding.logo_url = logo
  }
  return branding
}
