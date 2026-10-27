import {
  extractEmailTemplatePlaceholders,
  normalizeEmailTemplateVariables,
  type AdminEmailTemplate,
  type AdminEmailTemplateType,
  type EmailTemplateOrigin,
} from "./emailConfirmationTemplateModel";

export const INVESTMENT_CONTRACT_TYPE = "investment_contract" as const;
export const INVESTMENT_CONTRACT_NAME = "Contrato pós-Pix";
export const INVESTMENT_CONTRACT_STRUCTURED_FORMAT =
  "loor.investment-contract.structured@1" as const;

export const INVESTMENT_CONTRACT_FALLBACK = {
  subject: "Seu Contrato de Investimento na {{oportunidade}}",
  bodyHtml: [
    "<p>Olá, <strong>{{nome}}</strong>!</p>",
    "<p>Obrigado pelo seu investimento.</p>",
    "<p>Segue o resumo do contrato da oportunidade <strong>{{oportunidade}}</strong>:</p>",
    "<ul>",
    "  <li>Valor investido: {{valor}}</li>",
    "  <li>Cotas: {{cotas}}</li>",
    "  <li>Data: {{data}}</li>",
    "</ul>",
    "<p>O PDF do contrato ({{pdfNome}}) segue em anexo.</p>",
    "<p>Abraços,<br>Equipe de suporte</p>",
  ].join("\n"),
} as const;

export const INVESTMENT_CONTRACT_STRUCTURED_DEFAULTS = {
  subjectLine: "Seu Contrato de Investimento na",
  greeting: "Olá,",
  opening: "Obrigado por realizar um investimento conosco!",
  messageBeforeDetails: "Segue o resumo do contrato da oportunidade",
  messageAfterDetails: "Guarde este documento para suas referências futuras.",
  detailsHeading: "Detalhes do investimento",
  supportText:
    "Se tiver qualquer dúvida ou precisar de suporte, entre em contato com nossa equipe.",
  signoff: "Atenciosamente,\nEquipe de suporte",
} as const;

export const INVESTMENT_CONTRACT_FALLBACK_VARIABLES = [
  "nome",
  "email",
  "oportunidade",
  "valor",
  "cotas",
  "data",
  "pdfNome",
] as const;

export const INVESTMENT_CONTRACT_VARIABLE_PRESENTATION = [
  { key: "nome", label: "Nome", usage: "Incluído automaticamente na saudação" },
  { key: "email", label: "E-mail", usage: "Usado pelo Backend como destinatário" },
  {
    key: "oportunidade",
    label: "Oportunidade",
    usage: "Incluída no assunto e no resumo obrigatório",
  },
  { key: "valor", label: "Valor", usage: "Valor real formatado pelo Backend" },
  { key: "cotas", label: "Cotas", usage: "Quantidade real do investimento" },
  { key: "data", label: "Data", usage: "Data relevante fornecida pelo fluxo" },
  { key: "pdfNome", label: "Nome do PDF", usage: "Nome do contrato realmente anexado" },
] as const;

export const INVESTMENT_CONTRACT_PREVIEW_VARIABLES = {
  nome: "Marina Alves",
  email: "marina@example.test",
  oportunidade: "Oferta Horizonte",
  valor: "R$ 2.500,00",
  cotas: "25",
  data: "18/08/2026",
  pdfNome: "Contrato_de_Investimento_oferta_horizonte.pdf",
} as const;

export type InvestmentContractDraft = {
  subjectLine: string;
  greeting: string;
  opening: string;
  messageBeforeDetails: string;
  messageAfterDetails: string;
  detailsHeading: string;
  supportText: string;
  signoff: string;
};

export type InvestmentContractFieldErrors = Partial<Record<keyof InvestmentContractDraft, string>>;

export type InvestmentContractContentFormat = "canonical" | "known-default" | "legacy";

export interface InvestmentContractSnapshot {
  customTemplateId: number | null;
  customTemplateName: string | null;
  draft: InvestmentContractDraft;
  origin: EmailTemplateOrigin;
  contentFormat: InvestmentContractContentFormat;
  effectiveSubject: string;
  effectiveBodyHtml: string;
  availableVariables: string[];
  updatedAt: string | null;
  needsVisualUpgrade: boolean;
}

export interface CreateInvestmentContractPayload {
  name: string;
  type: typeof INVESTMENT_CONTRACT_TYPE;
  subject: string;
  body_html: string;
  active: true;
}

export interface UpdateInvestmentContractPayload {
  subject: string;
  body_html: string;
  active: true;
}

const STRUCTURED_MARKER_PATTERN = /^<!-- loor\.investment-contract\.structured@1:([^\r\n]+) -->\n/;
const HTML_LIKE_PATTERN = /<\/?[a-z][^>]*>/i;

const FIELD_LIMITS: Record<keyof InvestmentContractDraft, number> = {
  subjectLine: 180,
  greeting: 80,
  opening: 320,
  messageBeforeDetails: 420,
  messageAfterDetails: 420,
  detailsHeading: 100,
  supportText: 420,
  signoff: 220,
};

const FIELD_REQUIRED_MESSAGES: Record<keyof InvestmentContractDraft, string> = {
  subjectLine: "Informe o assunto do e-mail.",
  greeting: "Informe a saudação.",
  opening: "Informe a abertura.",
  messageBeforeDetails: "Informe a mensagem anterior ao resumo.",
  messageAfterDetails: "Informe a mensagem posterior ao resumo.",
  detailsHeading: "Informe o título dos detalhes.",
  supportText: "Informe o texto de suporte.",
  signoff: "Informe o encerramento ou a assinatura.",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isInvestmentContractDraft(value: unknown): value is InvestmentContractDraft {
  if (!isRecord(value)) return false;
  const fields = Object.keys(FIELD_LIMITS) as Array<keyof InvestmentContractDraft>;
  const receivedFields = Object.keys(value);
  return (
    receivedFields.length === fields.length &&
    receivedFields.every((field) => fields.includes(field as keyof InvestmentContractDraft)) &&
    fields.every((field) => typeof value[field] === "string")
  );
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatCopy(value: string): string {
  return escapeHtml(value.trim()).replace(/\r?\n/g, "<br>");
}

function encodeStructuredDraft(draft: InvestmentContractDraft): string {
  return encodeURIComponent(
    JSON.stringify({
      format: INVESTMENT_CONTRACT_STRUCTURED_FORMAT,
      content: draft,
    }),
  );
}

function decodeStructuredDraft(value: string): InvestmentContractDraft | undefined {
  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as unknown;
    if (
      !isRecord(parsed) ||
      parsed.format !== INVESTMENT_CONTRACT_STRUCTURED_FORMAT ||
      !isInvestmentContractDraft(parsed.content)
    ) {
      return undefined;
    }

    const draft = parsed.content;
    return validateInvestmentContractDraft(draft).length === 0 ? draft : undefined;
  } catch {
    return undefined;
  }
}

export function createInvestmentContractStructuredDraft(): InvestmentContractDraft {
  return { ...INVESTMENT_CONTRACT_STRUCTURED_DEFAULTS };
}

export function serializeInvestmentContractDraft(
  draft: InvestmentContractDraft,
): Pick<CreateInvestmentContractPayload, "subject" | "body_html"> {
  const normalized = Object.fromEntries(
    (Object.keys(FIELD_LIMITS) as Array<keyof InvestmentContractDraft>).map((field) => [
      field,
      draft[field].trim(),
    ]),
  ) as InvestmentContractDraft;
  const marker = `<!-- ${INVESTMENT_CONTRACT_STRUCTURED_FORMAT}:${encodeStructuredDraft(normalized)} -->`;

  return {
    subject: `${normalized.subjectLine} {{oportunidade}}`,
    body_html: [
      marker,
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:0;padding:0;background:#f4f6f8;border-collapse:collapse;">',
      '  <tr><td align="center" style="padding:32px 12px;">',
      '    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-collapse:separate;border-spacing:0;border-radius:8px;overflow:hidden;">',
      '      <tr><td style="height:6px;background:#1652f0;font-size:0;line-height:0;">&nbsp;</td></tr>',
      '      <tr><td style="padding:40px 40px 32px;font-family:Arial,Helvetica,sans-serif;color:#334155;">',
      `        <h1 style="margin:0 0 22px;font-size:26px;line-height:34px;font-weight:700;color:#0f172a;">${formatCopy(normalized.greeting)} <strong>{{nome}}</strong>!</h1>`,
      `        <p style="margin:0 0 14px;font-size:16px;line-height:25px;color:#334155;">${formatCopy(normalized.opening)}</p>`,
      `        <p style="margin:0 0 26px;font-size:15px;line-height:24px;color:#475569;">${formatCopy(normalized.messageBeforeDetails)} <strong style="color:#0f172a;">{{oportunidade}}</strong>.</p>`,
      '        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#f8fafc;border:1px solid #e2e8f0;border-collapse:separate;border-spacing:0;border-radius:6px;">',
      `          <tr><td colspan="2" style="padding:16px 18px;border-bottom:1px solid #e2e8f0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:18px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#475569;">${formatCopy(normalized.detailsHeading)}</td></tr>`,
      '          <tr><td style="padding:13px 18px;border-bottom:1px solid #e2e8f0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#64748b;">Oportunidade</td><td align="right" style="padding:13px 18px;border-bottom:1px solid #e2e8f0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;font-weight:700;color:#0f172a;">{{oportunidade}}</td></tr>',
      '          <tr><td style="padding:13px 18px;border-bottom:1px solid #e2e8f0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#64748b;">Valor investido</td><td align="right" style="padding:13px 18px;border-bottom:1px solid #e2e8f0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;font-weight:700;color:#0f172a;">{{valor}}</td></tr>',
      '          <tr><td style="padding:13px 18px;border-bottom:1px solid #e2e8f0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#64748b;">Cotas</td><td align="right" style="padding:13px 18px;border-bottom:1px solid #e2e8f0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;font-weight:700;color:#0f172a;">{{cotas}}</td></tr>',
      '          <tr><td style="padding:13px 18px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#64748b;">Data</td><td align="right" style="padding:13px 18px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;font-weight:700;color:#0f172a;">{{data}}</td></tr>',
      "        </table>",
      '        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-top:18px;background:#eef4ff;border:1px solid #cdddfd;border-collapse:separate;border-spacing:0;border-radius:6px;">',
      '          <tr><td style="width:54px;padding:16px 0 16px 18px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;font-weight:700;color:#1652f0;">PDF</td><td style="padding:16px 18px 16px 10px;font-family:Arial,Helvetica,sans-serif;"><p style="margin:0 0 3px;font-size:13px;line-height:18px;font-weight:700;color:#1e3a8a;">Contrato anexado</p><p style="margin:0;font-size:12px;line-height:18px;word-break:break-all;color:#475569;">{{pdfNome}}</p></td></tr>',
      "        </table>",
      `        <p style="margin:24px 0 0;font-size:14px;line-height:22px;color:#475569;">${formatCopy(normalized.messageAfterDetails)}</p>`,
      `        <p style="margin:14px 0 0;font-size:14px;line-height:22px;color:#64748b;">${formatCopy(normalized.supportText)}</p>`,
      `        <p style="margin:24px 0 0;font-size:14px;line-height:22px;font-weight:600;color:#475569;">${formatCopy(normalized.signoff)}</p>`,
      "      </td></tr>",
      '      <tr><td style="padding:18px 40px;border-top:1px solid #e2e8f0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#64748b;text-align:center;">Este e-mail acompanha o contrato do investimento confirmado.</td></tr>',
      "    </table>",
      "  </td></tr>",
      "</table>",
    ].join("\n"),
  };
}

function serializeLegacyInvestmentContractDraft(draft: InvestmentContractDraft) {
  const normalized = Object.fromEntries(
    (Object.keys(FIELD_LIMITS) as Array<keyof InvestmentContractDraft>).map((field) => [
      field,
      draft[field].trim(),
    ]),
  ) as InvestmentContractDraft;
  const marker = `<!-- ${INVESTMENT_CONTRACT_STRUCTURED_FORMAT}:${encodeStructuredDraft(normalized)} -->`;
  return {
    subject: `${normalized.subjectLine} {{oportunidade}}`,
    body_html: [
      marker,
      `<p>${formatCopy(normalized.greeting)} <strong>{{nome}}</strong>!</p>`,
      `<p>${formatCopy(normalized.opening)}</p>`,
      `<p>${formatCopy(normalized.messageBeforeDetails)} <strong>{{oportunidade}}</strong>.</p>`,
      `<p><strong>${formatCopy(normalized.detailsHeading)}</strong></p>`,
      "<ul>",
      "  <li>Oportunidade: <strong>{{oportunidade}}</strong></li>",
      "  <li>Valor investido: {{valor}}</li>",
      "  <li>Cotas: {{cotas}}</li>",
      "  <li>Data: {{data}}</li>",
      "</ul>",
      "<p><strong>Contrato anexado:</strong> {{pdfNome}}</p>",
      `<p>${formatCopy(normalized.messageAfterDetails)}</p>`,
      `<p>${formatCopy(normalized.supportText)}</p>`,
      `<p>${formatCopy(normalized.signoff)}</p>`,
    ].join("\n"),
  };
}

export function deserializeInvestmentContractDraft(
  subject: string,
  bodyHtml: string,
): InvestmentContractDraft | undefined {
  const normalizedBody = bodyHtml.trim();
  const marker = normalizedBody.match(STRUCTURED_MARKER_PATTERN);
  if (!marker) return undefined;

  const draft = decodeStructuredDraft(marker[1]);
  if (!draft) return undefined;

  const candidates = [
    serializeInvestmentContractDraft(draft),
    serializeLegacyInvestmentContractDraft(draft),
  ];
  if (
    !candidates.some(
      (candidate) => candidate.subject === subject.trim() && candidate.body_html === normalizedBody,
    )
  ) {
    return undefined;
  }

  return draft;
}

export function resolveInvestmentContractSnapshot(
  templates: AdminEmailTemplate[],
  types: AdminEmailTemplateType[],
): InvestmentContractSnapshot {
  const matching = templates
    .filter((template) => template.type === INVESTMENT_CONTRACT_TYPE)
    .sort((left, right) => right.id - left.id);
  const custom = matching.find(
    (template) => template.active && !template.is_default && template.wtlb_id !== null,
  );
  const systemDefault = matching.find(
    (template) => template.active && template.is_default && template.wtlb_id === null,
  );
  const effective = custom ?? systemDefault;
  const effectiveSubject = effective?.subject.trim() ?? INVESTMENT_CONTRACT_FALLBACK.subject;
  const effectiveBodyHtml = effective?.body_html.trim() ?? INVESTMENT_CONTRACT_FALLBACK.bodyHtml;
  const canonicalDraft = deserializeInvestmentContractDraft(effectiveSubject, effectiveBodyHtml);
  const needsVisualUpgrade = Boolean(
    canonicalDraft &&
    serializeInvestmentContractDraft(canonicalDraft).body_html !== effectiveBodyHtml,
  );
  const knownDefault =
    effectiveSubject === INVESTMENT_CONTRACT_FALLBACK.subject &&
    effectiveBodyHtml === INVESTMENT_CONTRACT_FALLBACK.bodyHtml;
  const type = types.find((item) => item.type === INVESTMENT_CONTRACT_TYPE);
  const recordVariables = normalizeEmailTemplateVariables(effective?.available_variables);
  const typeVariables = normalizeEmailTemplateVariables(type?.available_variables);
  const availableVariables =
    recordVariables.length > 0
      ? recordVariables
      : typeVariables.length > 0
        ? typeVariables
        : [...INVESTMENT_CONTRACT_FALLBACK_VARIABLES];

  return {
    customTemplateId: custom?.id ?? null,
    customTemplateName: custom?.name ?? null,
    draft: canonicalDraft ?? createInvestmentContractStructuredDraft(),
    origin: custom ? "custom" : systemDefault ? "default" : "fallback",
    contentFormat: canonicalDraft ? "canonical" : knownDefault ? "known-default" : "legacy",
    effectiveSubject,
    effectiveBodyHtml,
    availableVariables,
    updatedAt: effective?.updated_at ?? null,
    needsVisualUpgrade,
  };
}

export function investmentContractDraftsAreEqual(
  left: InvestmentContractDraft,
  right: InvestmentContractDraft,
): boolean {
  return (Object.keys(FIELD_LIMITS) as Array<keyof InvestmentContractDraft>).every(
    (field) => left[field] === right[field],
  );
}

export function validateInvestmentContractDraft(
  draft: InvestmentContractDraft,
): Array<[keyof InvestmentContractDraft, string]> {
  const errors: Array<[keyof InvestmentContractDraft, string]> = [];

  (Object.keys(FIELD_LIMITS) as Array<keyof InvestmentContractDraft>).forEach((field) => {
    const value = draft[field].trim();
    if (!value) {
      errors.push([field, FIELD_REQUIRED_MESSAGES[field]]);
      return;
    }
    if (value.length > FIELD_LIMITS[field]) {
      errors.push([field, `Use no máximo ${FIELD_LIMITS[field]} caracteres.`]);
      return;
    }
    if (value.includes("{{") || value.includes("}}")) {
      errors.push([field, "As variáveis são inseridas automaticamente pelo sistema."]);
      return;
    }
    if (HTML_LIKE_PATTERN.test(value)) {
      errors.push([field, "Use somente texto. A estrutura HTML é controlada pelo sistema."]);
    }
  });

  return errors;
}

export function getInvestmentContractFieldErrors(
  draft: InvestmentContractDraft,
): InvestmentContractFieldErrors {
  return Object.fromEntries(validateInvestmentContractDraft(draft));
}

export function getInvestmentContractGeneratedPlaceholders(
  draft: InvestmentContractDraft,
): string[] {
  const serialized = serializeInvestmentContractDraft(draft);
  return extractEmailTemplatePlaceholders(`${serialized.subject}\n${serialized.body_html}`);
}

export function createInvestmentContractPayload(
  draft: InvestmentContractDraft,
): CreateInvestmentContractPayload {
  return {
    name: INVESTMENT_CONTRACT_NAME,
    type: INVESTMENT_CONTRACT_TYPE,
    ...serializeInvestmentContractDraft(draft),
    active: true,
  };
}

export function createInvestmentContractUpdatePayload(
  draft: InvestmentContractDraft,
): UpdateInvestmentContractPayload {
  return {
    ...serializeInvestmentContractDraft(draft),
    active: true,
  };
}

export type { AdminEmailTemplate, AdminEmailTemplateType, EmailTemplateOrigin };
