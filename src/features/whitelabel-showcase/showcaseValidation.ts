import { parseShowcaseMarkdown } from './showcaseMarkdown'
import {
  isHexColor,
  isUuid,
  MAX_IMAGES,
  MAX_SECTIONS,
  MIN_IMAGES,
  MARKDOWN_VERSION,
  showcaseCards,
  whiteTextContrast,
  type CardInstance,
  type ImageAssociation,
  type ShowcaseDocument,
  type TextSection,
} from './showcaseModel'

/**
 * Canonical showcase V2 save rules: complete
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

/** Resolves whether an owner-scoped durable asset reference is known. */
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
  sectionsList: 'vitrine-conteudo-lista',
  textTitle: 'vitrine-texto-titulo',
  textSubtitle: 'vitrine-texto-subtitulo',
  textBody: 'vitrine-texto-corpo',
}

function imageIssues(images: readonly ImageAssociation[], tab: ShowcaseTab, context: string, resolve: AssetResolver, listField: string, instanceId?: string): ShowcaseIssue[] {
  const issues: ShowcaseIssue[] = []
  if (images.length < MIN_IMAGES) issues.push({ tab, instanceId, fieldId: listField, message: `${context}: adicione ao menos ${MIN_IMAGES} fotografia.` })
  if (images.length > MAX_IMAGES) issues.push({ tab, instanceId, fieldId: listField, message: `${context}: use no máximo ${MAX_IMAGES} imagens.` })
  images.forEach((image, index) => {
    if (!isUuid(image.assetRef) || !resolve(image.assetRef)) issues.push({ tab, instanceId, fieldId: listField, message: `${context}, imagem ${index + 1}: arquivo indisponível nesta sessão; substitua a imagem.` })
    if (!isUuid(image.associationId)) issues.push({ tab, instanceId, fieldId: listField, message: `${context}: associação de imagem inválida.` })
    if (image.decorative && image.alt !== '') issues.push({ tab, instanceId, fieldId: fieldIds.imageAlt(image.associationId), message: 'Imagem decorativa deve ter alternativa vazia.' })
    if (!image.decorative && !image.alt.trim()) issues.push({ tab, instanceId, fieldId: fieldIds.imageAlt(image.associationId), message: `${context}, imagem ${index + 1}: descreva a imagem ou marque-a como decorativa.` })
  })
  return issues
}

export function validateCard(card: CardInstance, resolve: AssetResolver, label = card.displayName.trim() || 'Card sem nome'): ShowcaseIssue[] {
  const id = card.instanceId
  const issues: ShowcaseIssue[] = []
  if (!isUuid(card.instanceId)) issues.push({ tab: 'cards', instanceId: id, message: `${label}: identificador da instância inválido.` })
  if (!/^[1-9]\d*$/.test(card.source.whitelabelId) || !Number.isSafeInteger(Number(card.source.whitelabelId)) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(card.source.slug)) issues.push({ tab: 'cards', instanceId: id, message: `${label}: origem não qualificada.` })
  if (!card.displayName.trim()) issues.push({ tab: 'cards', instanceId: id, fieldId: fieldIds.cardDisplayName, message: `${label}: informe o nome exibido.` })
  if (!card.shortDescription.trim()) issues.push({ tab: 'cards', instanceId: id, fieldId: fieldIds.cardDescription, message: `${label}: informe a descrição curta.` })
  if (!card.logo) issues.push({ tab: 'cards', instanceId: id, fieldId: fieldIds.cardLogo, message: `${label}: adicione o logotipo.` })
  else {
    if (card.logo.kind === 'official') {
      if ('assetRef' in card.logo || card.logo.source.whitelabelId !== Number(card.source.whitelabelId) || card.logo.source.slug !== card.source.slug || !card.logo.variantId.trim() || card.logo.variantId.length > 80) issues.push({ tab: 'cards', instanceId: id, fieldId: fieldIds.cardLogo, message: `${label}: o vínculo da logo deve corresponder exatamente à origem deste card.` })
    } else if ((card.logo.kind !== undefined && card.logo.kind !== 'custom') || !isUuid(card.logo.assetRef) || !resolve(card.logo.assetRef)) issues.push({ tab: 'cards', instanceId: id, fieldId: fieldIds.cardLogo, message: `${label}: logotipo indisponível nesta sessão; substitua o arquivo.` })
    if (!card.logo.alt.trim() || card.logo.alt.length > 500) issues.push({ tab: 'cards', instanceId: id, fieldId: fieldIds.cardLogoAlt, message: `${label}: informe o texto alternativo do logotipo (até 500 caracteres).` })
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

/** Limits mirror the V2 contract; no truncation or Markdown stripping. */
export function validateText(section: TextSection): ShowcaseIssue[] {
  const issues: ShowcaseIssue[] = []
  const add = (message: string, fieldId?: string) => issues.push({ tab: 'cards', instanceId: section.instanceId, fieldId, message })
  const title = section.title.normalize('NFC').trim(), subtitle = section.subtitle.normalize('NFC').trim(), body = section.bodyMarkdown.normalize('NFC').trim()
  if (!title || title.length > 240) add('Texto: informe um título de até 240 caracteres.', fieldIds.textTitle)
  if (subtitle.length > 500) add('Texto: o subtítulo admite até 500 caracteres.', fieldIds.textSubtitle)
  if (!body || body.length > 20000) add('Texto: informe conteúdo de até 20000 caracteres.', fieldIds.textBody)
  if (section.markdownVersion !== MARKDOWN_VERSION) add('Versão de Markdown não suportada.', fieldIds.textBody)
  for (const issue of parseShowcaseMarkdown(section.bodyMarkdown).issues) add(`Texto em Markdown, linha ${issue.line}: ${issue.message}`, fieldIds.textBody)
  return issues
}

export function validateShowcase(document: ShowcaseDocument, resolve: AssetResolver): ShowcaseIssue[] {
  const issues: ShowcaseIssue[] = []
  if (document.schemaVersion !== 2 || document.owner.whitelabelId !== 6 || document.owner.slug !== 'homologacao' || document.owner.environmentKey !== 'homolog') issues.push({ tab: 'banner', message: 'Proprietário ou versão inválidos.' })
  if (!Array.isArray(document.sections)) return [...issues, { tab: 'cards', message: 'A sequência de conteúdo é inválida; os dados foram preservados.' }]
  const cards = showcaseCards(document)
  const associations = [...document.banner.images, ...cards.flatMap(card => card.images)].map(image => image.associationId)
  if (new Set(associations).size !== associations.length) issues.push({ tab: 'banner', message: 'Identificadores de associação repetidos.' })
  issues.push(...imageIssues(document.banner.images, 'banner', 'Banner principal', resolve, fieldIds.bannerList))
  if (document.sections.length < 1 || document.sections.length > MAX_SECTIONS) issues.push({ tab: 'cards', fieldId: fieldIds.sectionsList, message: `O contrato admite de 1 a ${MAX_SECTIONS} seções de conteúdo.` })
  if (cards.length === 0) issues.push({ tab: 'cards', fieldId: fieldIds.sectionsList, message: 'Adicione ao menos um card válido para salvar a vitrine.' })
  const seen = new Set<string>()
  document.sections.forEach((section, index) => {
    if (!isUuid(section.instanceId) || seen.has(section.instanceId)) issues.push({ tab: 'cards', instanceId: section.instanceId, message: `Seção ${index + 1}: identificador de instância inválido ou repetido.` })
    seen.add(section.instanceId)
    if (section.type === 'text') issues.push(...validateText(section))
    else if (section.type === 'card') issues.push(...validateCard(section, resolve, `Card · ${section.displayName.trim() || 'sem nome'}`))
    else issues.push({ tab: 'cards', message: `Seção ${index + 1}: tipo não suportado; conteúdo preservado.` })
  })
  return issues
}

export const issuesForTab = (issues: readonly ShowcaseIssue[], tab: ShowcaseTab) => issues.filter(issue => issue.tab === tab)
export const issuesForCard = (issues: readonly ShowcaseIssue[], instanceId: string) => issues.filter(issue => issue.instanceId === instanceId)
