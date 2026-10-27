export const EMAIL_CONFIRMATION_TYPE = "email_confirmation" as const;
export const EMAIL_CONFIRMATION_NAME = "Confirmação de cadastro";
export const EMAIL_CONFIRMATION_STRUCTURED_FORMAT = "loor.email-confirmation.structured@1" as const;

export const EMAIL_CONFIRMATION_FALLBACK = {
  subject: "{{nome}}, confirme seu e-mail",
  bodyHtml: [
    "<p>Olá, <strong>{{nome}}</strong>!</p>",
    "<p>Falta pouco para concluir seu cadastro.</p>",
    "<p>Clique no link abaixo para confirmar seu e-mail:</p>",
    '<p><a href="{{url}}">{{url}}</a></p>',
    "<p>Abraços,<br>Equipe de suporte</p>",
  ].join("\n"),
} as const;

export const EMAIL_CONFIRMATION_STRUCTURED_DEFAULTS = {
  subjectLine: "confirme seu e-mail",
  greeting: "Olá,",
  opening: "Falta pouco para concluir seu cadastro.",
  message: "Clique no botão abaixo para confirmar seu e-mail e ativar sua conta na plataforma.",
  actionLabel: "Confirmar meu e-mail",
  alternativeLinkCopy:
    "Caso não consiga usar o botão, copie e cole o link abaixo diretamente no navegador:",
  signoff: "Abraços,\nEquipe de suporte",
} as const;

export const EMAIL_CONFIRMATION_FALLBACK_VARIABLES = ["nome", "email", "url", "token"] as const;

export const EMAIL_CONFIRMATION_VARIABLE_PRESENTATION = [
  { key: "nome", label: "Nome", usage: "Incluído no assunto e na saudação" },
  { key: "email", label: "E-mail", usage: "Disponível no contrato Backend" },
  { key: "url", label: "URL de confirmação", usage: "Incluída no botão e no link alternativo" },
  { key: "token", label: "Token", usage: "Disponível no contrato Backend" },
] as const;

export const EMAIL_CONFIRMATION_PREVIEW_VARIABLES = {
  nome: "Marina Alves",
  email: "marina@example.test",
  url: "https://plataforma.exemplo/verification-email/token-seguro",
  token: "token-seguro",
} as const;

export type EmailConfirmationDraft = {
  subjectLine: string;
  greeting: string;
  opening: string;
  message: string;
  actionLabel: string;
  alternativeLinkCopy: string;
  signoff: string;
};

export type EmailConfirmationFieldErrors = Partial<Record<keyof EmailConfirmationDraft, string>>;

export type EmailTemplateOrigin = "custom" | "default" | "fallback";
export type EmailConfirmationContentFormat = "canonical" | "known-default" | "legacy";

export interface AdminEmailTemplate {
  id: number;
  wtlb_id: number | null;
  name: string;
  type: string;
  subject: string;
  body_html: string;
  available_variables: unknown;
  active: boolean;
  is_default: boolean;
  created_by: number | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface AdminEmailTemplateType {
  type: string;
  label: string;
  description: string;
  available_variables: unknown;
  fallback_view: string;
}

export interface EmailConfirmationSnapshot {
  customTemplateId: number | null;
  customTemplateName: string | null;
  draft: EmailConfirmationDraft;
  origin: EmailTemplateOrigin;
  contentFormat: EmailConfirmationContentFormat;
  effectiveSubject: string;
  effectiveBodyHtml: string;
  availableVariables: string[];
  updatedAt: string | null;
  needsVisualUpgrade: boolean;
}

export interface CreateEmailConfirmationPayload {
  name: string;
  type: typeof EMAIL_CONFIRMATION_TYPE;
  subject: string;
  body_html: string;
  active: true;
}

export interface UpdateEmailConfirmationPayload {
  subject: string;
  body_html: string;
  active: true;
}

const PLACEHOLDER_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
const STRUCTURED_MARKER_PATTERN = /^<!-- loor\.email-confirmation\.structured@1:([^\r\n]+) -->\n/;
const HTML_LIKE_PATTERN = /<\/?[a-z][^>]*>/i;

const FIELD_LIMITS: Record<keyof EmailConfirmationDraft, number> = {
  subjectLine: 460,
  greeting: 80,
  opening: 240,
  message: 600,
  actionLabel: 80,
  alternativeLinkCopy: 320,
  signoff: 180,
};

const FIELD_REQUIRED_MESSAGES: Record<keyof EmailConfirmationDraft, string> = {
  subjectLine: "Informe o assunto do e-mail.",
  greeting: "Informe a saudação.",
  opening: "Informe a abertura.",
  message: "Informe a mensagem principal.",
  actionLabel: "Informe o texto do botão de confirmação.",
  alternativeLinkCopy: "Informe a orientação para o link alternativo.",
  signoff: "Informe o encerramento ou a assinatura.",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isEmailConfirmationDraft(value: unknown): value is EmailConfirmationDraft {
  if (!isRecord(value)) return false;
  const fields = Object.keys(FIELD_LIMITS) as Array<keyof EmailConfirmationDraft>;
  const receivedFields = Object.keys(value);
  return (
    receivedFields.length === fields.length &&
    receivedFields.every((field) => fields.includes(field as keyof EmailConfirmationDraft)) &&
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

function encodeStructuredDraft(draft: EmailConfirmationDraft): string {
  return encodeURIComponent(
    JSON.stringify({
      format: EMAIL_CONFIRMATION_STRUCTURED_FORMAT,
      content: draft,
    }),
  );
}

function decodeStructuredDraft(value: string): EmailConfirmationDraft | undefined {
  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as unknown;
    if (
      !isRecord(parsed) ||
      parsed.format !== EMAIL_CONFIRMATION_STRUCTURED_FORMAT ||
      !isEmailConfirmationDraft(parsed.content)
    ) {
      return undefined;
    }

    const draft = parsed.content;
    return validateEmailConfirmationDraft(draft).length === 0 ? draft : undefined;
  } catch {
    return undefined;
  }
}

export function createEmailConfirmationStructuredDraft(): EmailConfirmationDraft {
  return { ...EMAIL_CONFIRMATION_STRUCTURED_DEFAULTS };
}

export function normalizeEmailTemplateVariables(value: unknown): string[] {
  let candidate = value;

  if (typeof candidate === "string") {
    try {
      candidate = JSON.parse(candidate);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(candidate)) return [];
  return [
    ...new Set(
      candidate.filter((item): item is string => typeof item === "string" && item.length > 0),
    ),
  ];
}

export function extractEmailTemplatePlaceholders(value: string): string[] {
  return [...new Set([...value.matchAll(PLACEHOLDER_PATTERN)].map((match) => match[1]))];
}

export function serializeEmailConfirmationDraft(
  draft: EmailConfirmationDraft,
): Pick<CreateEmailConfirmationPayload, "subject" | "body_html"> {
  const normalized = Object.fromEntries(
    (Object.keys(FIELD_LIMITS) as Array<keyof EmailConfirmationDraft>).map((field) => [
      field,
      draft[field].trim(),
    ]),
  ) as EmailConfirmationDraft;
  const marker = `<!-- ${EMAIL_CONFIRMATION_STRUCTURED_FORMAT}:${encodeStructuredDraft(normalized)} -->`;

  return {
    subject: `{{nome}}, ${normalized.subjectLine}`,
    body_html: [
      marker,
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:0;padding:0;background:#f4f6f8;border-collapse:collapse;">',
      '  <tr><td align="center" style="padding:32px 12px;">',
      '    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-collapse:separate;border-spacing:0;border-radius:8px;overflow:hidden;">',
      '      <tr><td style="height:6px;background:#1652f0;font-size:0;line-height:0;">&nbsp;</td></tr>',
      '      <tr><td style="padding:40px 40px 32px;font-family:Arial,Helvetica,sans-serif;color:#334155;">',
      `        <h1 style="margin:0 0 22px;font-size:26px;line-height:34px;font-weight:700;color:#0f172a;">${formatCopy(normalized.greeting)} <strong>{{nome}}</strong>!</h1>`,
      `        <p style="margin:0 0 14px;font-size:16px;line-height:25px;color:#334155;">${formatCopy(normalized.opening)}</p>`,
      `        <p style="margin:0 0 26px;font-size:15px;line-height:24px;color:#475569;">${formatCopy(normalized.message)}</p>`,
      '        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;border-collapse:separate;"><tr><td align="center" bgcolor="#1652f0" style="border-radius:6px;">',
      `          <a href="{{url}}" style="display:inline-block;padding:14px 24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:20px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:6px;">${formatCopy(normalized.actionLabel)}</a>`,
      "        </td></tr></table>",
      '        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#f8fafc;border:1px solid #e2e8f0;border-collapse:separate;border-spacing:0;border-radius:6px;">',
      '          <tr><td style="padding:16px 18px;font-family:Arial,Helvetica,sans-serif;">',
      `            <p style="margin:0 0 8px;font-size:13px;line-height:20px;color:#64748b;">${formatCopy(normalized.alternativeLinkCopy)}</p>`,
      '            <p style="margin:0;font-size:13px;line-height:20px;word-break:break-all;"><a href="{{url}}" style="color:#1652f0;text-decoration:underline;">{{url}}</a></p>',
      "          </td></tr>",
      "        </table>",
      `        <p style="margin:28px 0 0;font-size:14px;line-height:22px;font-weight:600;color:#475569;">${formatCopy(normalized.signoff)}</p>`,
      "      </td></tr>",
      '      <tr><td style="padding:18px 40px;border-top:1px solid #e2e8f0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#64748b;text-align:center;">Mensagem transacional enviada para confirmar seu cadastro.</td></tr>',
      "    </table>",
      "  </td></tr>",
      "</table>",
    ].join("\n"),
  };
}

function serializeLegacyEmailConfirmationDraft(draft: EmailConfirmationDraft) {
  const normalized = Object.fromEntries(
    (Object.keys(FIELD_LIMITS) as Array<keyof EmailConfirmationDraft>).map((field) => [
      field,
      draft[field].trim(),
    ]),
  ) as EmailConfirmationDraft;
  const marker = `<!-- ${EMAIL_CONFIRMATION_STRUCTURED_FORMAT}:${encodeStructuredDraft(normalized)} -->`;
  return {
    subject: `{{nome}}, ${normalized.subjectLine}`,
    body_html: [
      marker,
      `<p>${formatCopy(normalized.greeting)} <strong>{{nome}}</strong>!</p>`,
      `<p>${formatCopy(normalized.opening)}</p>`,
      `<p>${formatCopy(normalized.message)}</p>`,
      `<p><a href="{{url}}">${formatCopy(normalized.actionLabel)}</a></p>`,
      `<p>${formatCopy(normalized.alternativeLinkCopy)}</p>`,
      '<p><a href="{{url}}">{{url}}</a></p>',
      `<p>${formatCopy(normalized.signoff)}</p>`,
    ].join("\n"),
  };
}

export function deserializeEmailConfirmationDraft(
  subject: string,
  bodyHtml: string,
): EmailConfirmationDraft | undefined {
  const normalizedBody = bodyHtml.trim();
  const marker = normalizedBody.match(STRUCTURED_MARKER_PATTERN);
  if (!marker) return undefined;

  const draft = decodeStructuredDraft(marker[1]);
  if (!draft) return undefined;

  const candidates = [
    serializeEmailConfirmationDraft(draft),
    serializeLegacyEmailConfirmationDraft(draft),
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

export function resolveEmailConfirmationSnapshot(
  templates: AdminEmailTemplate[],
  types: AdminEmailTemplateType[],
): EmailConfirmationSnapshot {
  const matching = templates
    .filter((template) => template.type === EMAIL_CONFIRMATION_TYPE)
    .sort((left, right) => right.id - left.id);
  const custom = matching.find(
    (template) => template.active && !template.is_default && template.wtlb_id !== null,
  );
  const systemDefault = matching.find(
    (template) => template.active && template.is_default && template.wtlb_id === null,
  );
  const effective = custom ?? systemDefault;
  const effectiveSubject = effective?.subject.trim() ?? EMAIL_CONFIRMATION_FALLBACK.subject;
  const effectiveBodyHtml = effective?.body_html.trim() ?? EMAIL_CONFIRMATION_FALLBACK.bodyHtml;
  const canonicalDraft = deserializeEmailConfirmationDraft(effectiveSubject, effectiveBodyHtml);
  const needsVisualUpgrade = Boolean(
    canonicalDraft &&
    serializeEmailConfirmationDraft(canonicalDraft).body_html !== effectiveBodyHtml,
  );
  const knownDefault =
    effectiveSubject === EMAIL_CONFIRMATION_FALLBACK.subject &&
    effectiveBodyHtml === EMAIL_CONFIRMATION_FALLBACK.bodyHtml;
  const type = types.find((item) => item.type === EMAIL_CONFIRMATION_TYPE);
  const recordVariables = normalizeEmailTemplateVariables(effective?.available_variables);
  const typeVariables = normalizeEmailTemplateVariables(type?.available_variables);
  const availableVariables =
    recordVariables.length > 0
      ? recordVariables
      : typeVariables.length > 0
        ? typeVariables
        : [...EMAIL_CONFIRMATION_FALLBACK_VARIABLES];

  return {
    customTemplateId: custom?.id ?? null,
    customTemplateName: custom?.name ?? null,
    draft: canonicalDraft ?? createEmailConfirmationStructuredDraft(),
    origin: custom ? "custom" : systemDefault ? "default" : "fallback",
    contentFormat: canonicalDraft ? "canonical" : knownDefault ? "known-default" : "legacy",
    effectiveSubject,
    effectiveBodyHtml,
    availableVariables,
    updatedAt: effective?.updated_at ?? null,
    needsVisualUpgrade,
  };
}

export function emailConfirmationDraftsAreEqual(
  left: EmailConfirmationDraft,
  right: EmailConfirmationDraft,
): boolean {
  return (Object.keys(FIELD_LIMITS) as Array<keyof EmailConfirmationDraft>).every(
    (field) => left[field] === right[field],
  );
}

export function validateEmailConfirmationDraft(
  draft: EmailConfirmationDraft,
): Array<[keyof EmailConfirmationDraft, string]> {
  const errors: Array<[keyof EmailConfirmationDraft, string]> = [];

  (Object.keys(FIELD_LIMITS) as Array<keyof EmailConfirmationDraft>).forEach((field) => {
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

export function getEmailConfirmationFieldErrors(
  draft: EmailConfirmationDraft,
): EmailConfirmationFieldErrors {
  return Object.fromEntries(validateEmailConfirmationDraft(draft));
}

export function createEmailConfirmationPayload(
  draft: EmailConfirmationDraft,
): CreateEmailConfirmationPayload {
  return {
    name: EMAIL_CONFIRMATION_NAME,
    type: EMAIL_CONFIRMATION_TYPE,
    ...serializeEmailConfirmationDraft(draft),
    active: true,
  };
}

export function createEmailConfirmationUpdatePayload(
  draft: EmailConfirmationDraft,
): UpdateEmailConfirmationPayload {
  return {
    ...serializeEmailConfirmationDraft(draft),
    active: true,
  };
}
