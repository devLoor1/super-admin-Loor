/** Presentation of explicit, authorized business fields. Never use on raw API objects. */
const CREDENTIAL_TEXT = /\bbearer\s+\S+|(?:^|[^\w-])eyJ[\w-]+\.[\w-]+\.[\w-]*|-----BEGIN [A-Z0-9 ]+-----/i

export function businessText(value: unknown, max = 512): string | null {
  if (typeof value !== 'string' || !value.trim() || value.length > max || CREDENTIAL_TEXT.test(value)) return null
  if ([...value].some(char => { const code = char.charCodeAt(0); return code === 127 || code < 32 && ![9, 10, 13].includes(code) })) return null
  return value.trim()
}

/** Format complete Brazilian numbers without replacing digits or completing partial values. */
export function formatPhone(value: unknown): string | null {
  const text = businessText(value)
  if (!text) return null
  if (!/^\+?[\d\s().-]+$/.test(text)) return text
  const digits = text.replace(/\D/g, '')
  const brazilPrefix = (digits.length === 12 || digits.length === 13) && digits.startsWith('55')
  if (text.startsWith('+') && !brazilPrefix) return text
  const local = brazilPrefix ? digits.slice(2) : digits
  if (local.length !== 10 && local.length !== 11) return text
  return `${brazilPrefix ? '+55 ' : ''}(${local.slice(0, 2)}) ${local.slice(2, -4)}-${local.slice(-4)}`
}
