import { createEmailConfirmationStructuredDraft, deserializeEmailConfirmationDraft, serializeEmailConfirmationDraft, getEmailConfirmationFieldErrors, type EmailConfirmationDraft } from './editorial/emailConfirmationTemplateModel'
import { createInvestmentContractStructuredDraft, deserializeInvestmentContractDraft, serializeInvestmentContractDraft, getInvestmentContractFieldErrors, type InvestmentContractDraft } from './editorial/investmentContractTemplateModel'
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
  if (type === 'email_confirmation') return deserializeEmailConfirmationDraft(subject, body) ?? null
  if (type === 'investment_contract') return deserializeInvestmentContractDraft(subject, body) ?? null
  return Object.hasOwn(LINKED_TEMPLATE_CONFIG, type) ? deserializeLinkedTemplate(type as LinkedTemplateType, subject, body) ?? null : null
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
