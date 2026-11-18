import { createEmailConfirmationStructuredDraft, deserializeEmailConfirmationDraft, serializeEmailConfirmationDraft, getEmailConfirmationFieldErrors, EMAIL_CONFIRMATION_FALLBACK, type EmailConfirmationDraft } from './editorial/emailConfirmationTemplateModel'
import { createInvestmentContractStructuredDraft, deserializeInvestmentContractDraft, serializeInvestmentContractDraft, getInvestmentContractFieldErrors, INVESTMENT_CONTRACT_FALLBACK, type InvestmentContractDraft } from './editorial/investmentContractTemplateModel'
import { defaultLinkedTemplateDraft, deserializeLinkedTemplate, LINKED_TEMPLATE_CONFIG, serializeLinkedTemplate, validateLinkedTemplateDraft, type LinkedTemplateDraft, type LinkedTemplateType } from './editorial/linkedTemplateModel'

// Admin editorial serializers are reused; Core remains the email renderer.
export type EditorialDraft = Record<string, string>
export const supportsEditorial = (type: string) => type === 'email_confirmation' || type === 'investment_contract' || Object.hasOwn(LINKED_TEMPLATE_CONFIG, type)
export function defaultEditorial(type: string): EditorialDraft | null {
  if (type === 'email_confirmation') return createEmailConfirmationStructuredDraft()
  if (type === 'investment_contract') return createInvestmentContractStructuredDraft()
  return Object.hasOwn(LINKED_TEMPLATE_CONFIG, type) ? defaultLinkedTemplateDraft(type as LinkedTemplateType) : null
}
export function readEditorial(type: string, subject: string, body: string): EditorialDraft | null {
  // The tenant Admin offers a structured version of these two exact Core defaults.
  const known = type === 'email_confirmation' ? EMAIL_CONFIRMATION_FALLBACK : type === 'investment_contract' ? INVESTMENT_CONTRACT_FALLBACK : undefined
  if (known && known.subject === subject.trim() && known.bodyHtml === body.trim()) return defaultEditorial(type)
  if (type === 'email_confirmation') return deserializeEmailConfirmationDraft(subject, body) ?? null
  if (type === 'investment_contract') return deserializeInvestmentContractDraft(subject, body) ?? null
  return Object.hasOwn(LINKED_TEMPLATE_CONFIG, type) ? deserializeLinkedTemplate(type as LinkedTemplateType, subject, body) ?? null : null
}
type TemplateContent = { type: string; subject: string; body_html: string; is_default?: boolean }
export function readTemplateModel(template: TemplateContent) {
  const draft = readEditorial(template.type, template.subject, template.body_html)
  // LinkedTemplateEditor uses the catalog model for global defaults, preserving an unknown custom body.
  if (!draft && template.is_default && Object.hasOwn(LINKED_TEMPLATE_CONFIG, template.type)) return defaultEditorial(template.type)
  return draft
}
export function templateForBrandingPreview(template: TemplateContent, sampleActionLabel?: string) {
  const { type, subject, body_html } = template
  const draft = readTemplateModel(template)
  if (sampleActionLabel && draft?.actionLabel) {
    const sample = serializeEditorial(type, { ...draft, actionLabel: sampleActionLabel })
    return sample && { type, ...sample }
  }
  const content = draft ? serializeEditorial(type, draft) : null
  return { type, ...(content ?? { subject, body_html }) }
}
export function editorialErrors(type: string, draft: EditorialDraft): Record<string, string | undefined> {
  if (type === 'email_confirmation') return getEmailConfirmationFieldErrors(draft as EmailConfirmationDraft)
  if (type === 'investment_contract') return getInvestmentContractFieldErrors(draft as InvestmentContractDraft)
  return Object.hasOwn(LINKED_TEMPLATE_CONFIG, type) ? validateLinkedTemplateDraft(draft as LinkedTemplateDraft) : { type: 'Tipo sem editor qualificado.' }
}
export function serializeEditorial(type: string, draft: EditorialDraft) {
  if (Object.keys(editorialErrors(type, draft)).length) return null
  if (type === 'email_confirmation') return serializeEmailConfirmationDraft(draft as EmailConfirmationDraft)
  if (type === 'investment_contract') return serializeInvestmentContractDraft(draft as InvestmentContractDraft)
  return Object.hasOwn(LINKED_TEMPLATE_CONFIG, type) ? serializeLinkedTemplate(type as LinkedTemplateType, draft as LinkedTemplateDraft) : null
}
export const editorialLabels: Record<string, string> = { subjectLine: 'Assunto', greeting: 'Saudação', opening: 'Abertura', message: 'Mensagem principal', actionLabel: 'Texto do botão', alternativeLinkCopy: 'Orientação do link alternativo', signoff: 'Encerramento', messageBeforeDetails: 'Introdução ao resumo', messageAfterDetails: 'Mensagem após o resumo', detailsHeading: 'Título do resumo', supportText: 'Orientação de suporte' }
