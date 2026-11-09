/** Branch-only interaction model. These proposed fields are not a live Control Plane contract. */
export type ParticipantKind = 'investor' | 'entrepreneur'
export type InvestorRegistrationType = 'pessoa_fisica' | 'pessoa_juridica'
export type AccountCreationDraft = { full_name: string; email: string; phone: string; investor_type: InvestorRegistrationType }
export type AccountCreationErrors = Partial<Record<keyof AccountCreationDraft | 'form', string>>
export const EMPTY_ACCOUNT_DRAFT: Readonly<AccountCreationDraft> = Object.freeze({ full_name: '', email: '', phone: '', investor_type: 'pessoa_fisica' })
export const participantLabel = (kind: ParticipantKind) => kind === 'investor' ? 'investidor' : 'empreendedor'
export function validateAccountCreation(kind: ParticipantKind, raw: unknown): { values: AccountCreationDraft; errors: AccountCreationErrors } {
  const body = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {}
  const allowed = kind === 'investor' ? ['full_name', 'email', 'phone', 'investor_type'] : ['full_name', 'email', 'phone']
  const errors: AccountCreationErrors = {}
  if (Object.keys(body).some(key => !allowed.includes(key))) errors.form = 'Há campos que não pertencem ao cadastro inicial.'
  const full_name = typeof body.full_name === 'string' ? body.full_name.trim().replace(/\s+/g, ' ') : ''
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const rawPhone = typeof body.phone === 'string' ? body.phone.trim() : ''
  const phone = rawPhone.replace(/[\s().-]/g, '')
  const investor_type = body.investor_type === 'pessoa_juridica' ? 'pessoa_juridica' : 'pessoa_fisica'
  if (full_name.length < 3 || full_name.length > 256) errors.full_name = 'Informe um nome entre 3 e 256 caracteres.'
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Informe um e-mail válido.'
  if (!/^\+?\d{5,18}$/.test(phone)) errors.phone = 'Informe um telefone válido, entre 5 e 18 dígitos.'
  if (kind === 'investor' && !['pessoa_fisica', 'pessoa_juridica'].includes(String(body.investor_type))) errors.investor_type = 'Selecione o tipo de investidor.'
  return { values: { full_name, email, phone, investor_type }, errors }
}
