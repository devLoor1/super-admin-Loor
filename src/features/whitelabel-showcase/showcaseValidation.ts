import { parseShowcaseMarkdown } from './showcaseMarkdown'
import {
  isHexColor,
  isUuid,
  MAX_IMAGES,
  MIN_IMAGES,
  whiteTextContrast,
  type CardInstance,
  type ImageAssociation,
  type ShowcaseDocument,
} from './showcaseModel'

/**
 * Save rules of the prototype (PROPOSTA.md §6, approved for V1): complete
 * configuration, 1–4 images per context, essential content, informative text
 * alternatives, safe Markdown and at least one valid card. Incomplete drafts stay
 * editable; these issues only explain why saving is blocked.
 */

export type ShowcaseTab = 'banner' | 'introducao' | 'cards'

export type ShowcaseIssue = {
  tab: ShowcaseTab
  /** Card concerned, when any. */
  instanceId?: string
  /** DOM id of the field to focus (editor convention). */
  fieldId?: string
  message: string
}

export type ShowcaseWarning = { tab: ShowcaseTab; instanceId?: string; message: string }

/** Resolves whether an asset reference is still available in this tab. */
export type AssetResolver = (assetRef: string) => boolean

export const fieldIds = {
  bannerList: 'vitrine-banner-imagens',
  imageAlt: (associationId: string) => `vitrine-alt-${associationId}`,
  introTitle: 'vitrine-intro-titulo',
  introBody: 'vitrine-intro-corpo',
  cardsList: 'vitrine-cards-lista',
  cardDisplayName: 'vitrine-card-nome',
  cardDescription: 'vitrine-card-descricao',
  cardLogo: 'vitrine-card-logo',
  cardLogoAlt: 'vitrine-card-logo-alt',
  cardColors: 'vitrine-card-cores',
  cardImages: 'vitrine-card-imagens',
}

function imageIssues(images: readonly ImageAssociation[], tab: ShowcaseTab, context: string, resolve: AssetResolver, listField: string, instanceId?: string): ShowcaseIssue[] {
  const issues: ShowcaseIssue[] = []
  if (images.length < MIN_IMAGES) issues.push({ tab, instanceId, fieldId: listField, message: `${context}: adicione ao menos ${MIN_IMAGES} fotografia.` })
  if (images.length > MAX_IMAGES) issues.push({ tab, instanceId, fieldId: listField, message: `${context}: use no máximo ${MAX_IMAGES} imagens.` })
  images.forEach((image, index) => {
    if (!image.assetRef || !resolve(image.assetRef)) issues.push({ tab, instanceId, fieldId: listField, message: `${context}, imagem ${index + 1}: arquivo indisponível nesta sessão; substitua a imagem.` })
    if (!image.decorative && !image.alt.trim()) issues.push({ tab, instanceId, fieldId: fieldIds.imageAlt(image.associationId), message: `${context}, imagem ${index + 1}: descreva a imagem ou marque-a como decorativa.` })
  })
  return issues
}

export function validateCard(card: CardInstance, resolve: AssetResolver, label = card.displayName.trim() || 'Card sem nome'): ShowcaseIssue[] {
  const id = card.instanceId
  const issues: ShowcaseIssue[] = []
  if (!isUuid(card.instanceId)) issues.push({ tab: 'cards', instanceId: id, message: `${label}: identificador da instância inválido.` })
  if (!card.source.whitelabelId || !card.source.slug) issues.push({ tab: 'cards', instanceId: id, message: `${label}: origem não qualificada.` })
  if (!card.displayName.trim()) issues.push({ tab: 'cards', instanceId: id, fieldId: fieldIds.cardDisplayName, message: `${label}: informe o nome exibido.` })
  if (!card.shortDescription.trim()) issues.push({ tab: 'cards', instanceId: id, fieldId: fieldIds.cardDescription, message: `${label}: informe a descrição curta.` })
  if (!card.logo) issues.push({ tab: 'cards', instanceId: id, fieldId: fieldIds.cardLogo, message: `${label}: adicione o logotipo.` })
  else {
    if (!resolve(card.logo.assetRef)) issues.push({ tab: 'cards', instanceId: id, fieldId: fieldIds.cardLogo, message: `${label}: logotipo indisponível nesta sessão; substitua o arquivo.` })
    if (!card.logo.alt.trim()) issues.push({ tab: 'cards', instanceId: id, fieldId: fieldIds.cardLogoAlt, message: `${label}: informe o texto alternativo do logotipo.` })
  }
  if (!isHexColor(card.colors.panel) || !isHexColor(card.colors.divider)) issues.push({ tab: 'cards', instanceId: id, fieldId: fieldIds.cardColors, message: `${label}: use cores no formato #RRGGBB.` })
  issues.push(...imageIssues(card.images, 'cards', label, resolve, fieldIds.cardImages, id))
  return issues
}

export function cardWarnings(card: CardInstance): ShowcaseWarning[] {
  const warnings: ShowcaseWarning[] = []
  if (isHexColor(card.colors.panel) && whiteTextContrast(card.colors.panel) < 4.5) {
    warnings.push({ tab: 'cards', instanceId: card.instanceId, message: `Contraste do texto branco sobre ${card.colors.panel} abaixo de 4,5:1. Considere uma cor de painel mais escura.` })
  }
  return warnings
}

export function validateShowcase(document: ShowcaseDocument, resolve: AssetResolver): ShowcaseIssue[] {
  const issues: ShowcaseIssue[] = []
  issues.push(...imageIssues(document.banner.images, 'banner', 'Banner principal', resolve, fieldIds.bannerList))
  const intro = document.introduction
  if (intro) {
    if (!intro.title.trim()) issues.push({ tab: 'introducao', fieldId: fieldIds.introTitle, message: 'Conteúdo introdutório: informe o título ou remova a seção.' })
    if (!intro.bodyMarkdown.trim()) issues.push({ tab: 'introducao', fieldId: fieldIds.introBody, message: 'Conteúdo introdutório: informe o texto ou remova a seção.' })
    for (const issue of parseShowcaseMarkdown(intro.bodyMarkdown).issues) {
      issues.push({ tab: 'introducao', fieldId: fieldIds.introBody, message: `Texto em Markdown, linha ${issue.line}: ${issue.message}` })
    }
  }
  if (document.cards.length === 0) issues.push({ tab: 'cards', fieldId: fieldIds.cardsList, message: 'Adicione ao menos um card válido para salvar a vitrine.' })
  const seen = new Set<string>()
  document.cards.forEach((card, index) => {
    if (seen.has(card.instanceId)) issues.push({ tab: 'cards', instanceId: card.instanceId, message: `Card ${index + 1}: identificador de instância repetido.` })
    seen.add(card.instanceId)
    issues.push(...validateCard(card, resolve, `Card ${String(index + 1).padStart(2, '0')} · ${card.displayName.trim() || 'sem nome'}`))
  })
  return issues
}

export const issuesForTab = (issues: readonly ShowcaseIssue[], tab: ShowcaseTab) => issues.filter(issue => issue.tab === tab)
export const issuesForCard = (issues: readonly ShowcaseIssue[], instanceId: string) => issues.filter(issue => issue.instanceId === instanceId)
