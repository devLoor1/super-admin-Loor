import {
  normalizeEmailTemplateVariables,
  type AdminEmailTemplate,
  type AdminEmailTemplateType,
  type EmailTemplateOrigin,
} from "./emailConfirmationTemplateModel";

export type LinkedTemplateType =
  | "welcome_approved"
  | "terms_and_privacy_policy"
  | "investment_refund_started"
  | "investment_refund_confirmation"
  | "password_recovery"
  | "registration_denied"
  | "bank_account_update"
  | "bank_account_update_success"
  | "debt_investment_contract"
  | "investment_refund_divergence"
  | "debt_refund_started"
  | "debt_refund_confirmation"
  | "tax_document_income_tax"
  | "tax_document_refund"
  | "forum_new_comment";
export type LinkedTemplateField = "subjectLine" | "greeting" | "opening" | "message" | "signoff";
export type LinkedTemplateDraft = Record<LinkedTemplateField, string>;

const REFUND_VARIABLES = [
  "nome",
  "email",
  "oportunidade",
  "data",
  "cotas",
  "participacao",
  "chavePix",
  "motivo",
] as const;
const REFUND_PREVIEW_VARIABLES = {
  nome: "Marina Alves",
  email: "marina@example.test",
  oportunidade: "Oferta Exemplo S.A.",
  data: "01/10/2026",
  cotas: "3",
  participacao: "0,0150",
  chavePix: "marina@example.test",
  motivo: "pagamento realizado por CPF/CNPJ diferente do investidor",
};
const REFUND_DETAILS = [
  { label: "Oportunidade", variable: "oportunidade" },
  { label: "Data do pagamento", variable: "data" },
  { label: "Cotas", variable: "cotas" },
  { label: "Participação (%)", variable: "participacao" },
  { label: "Chave Pix", variable: "chavePix" },
  { label: "Motivo", variable: "motivo" },
] as const;

const DEBT_REFUND_VARIABLES = [
  "nome",
  "email",
  "oportunidade",
  "data",
  "valor",
  "chavePix",
  "motivo",
] as const;
const DEBT_REFUND_PREVIEW_VARIABLES = {
  nome: "Marina Alves",
  email: "marina@example.test",
  oportunidade: "CCB Exemplo S.A.",
  data: "01/10/2026",
  valor: "5.000,00",
  chavePix: "marina@example.test",
  motivo: "a campanha não atingiu a meta mínima",
};
const DEBT_REFUND_DETAILS = [
  { label: "Oportunidade", variable: "oportunidade" },
  { label: "Data do pagamento", variable: "data" },
  { label: "Valor investido (R$)", variable: "valor" },
  { label: "Chave Pix", variable: "chavePix" },
  { label: "Motivo", variable: "motivo" },
] as const;

const TAX_DOCUMENT_VARIABLES = [
  "nome",
  "email",
  "ano",
  "tipo",
  "valorTotal",
  "quantidadeInvestimentos",
] as const;
const TAX_DOCUMENT_DETAILS = [
  { label: "Ano", variable: "ano" },
  { label: "Registros", variable: "quantidadeInvestimentos" },
  { label: "Total (R$)", variable: "valorTotal" },
] as const;

export const LINKED_TEMPLATE_CONFIG = {
  welcome_approved: {
    label: "Aprovação da conta do investidor",
    marker: "loor.investor-approval.structured@1",
    subjectPrefix: "{{nome}}, ",
    variables: ["nome", "email", "url"],
    previewVariables: {
      nome: "Marina Alves",
      email: "marina@example.test",
      url: "https://investidor.exemplo.test/wallet",
    },
    defaults: {
      subjectLine: "cadastro aprovado",
      greeting: "Olá,",
      opening: "Seu cadastro de investidor foi aprovado.",
      message: "Sua conta está pronta para acessar a plataforma.",
      signoff: "Atenciosamente,\nEquipe de suporte",
    },
    fallback: {
      subject: "{{nome}}, cadastro aprovado",
      body_html:
        '<p>Olá, <strong>{{nome}}</strong>!</p><p>Seu cadastro foi aprovado.</p><p><a href="{{url}}">Acessar a plataforma</a></p>',
    },
    systemLinks: [{ label: "Acessar a plataforma", variable: "url" }],
    systemDetails: [],
    scope: "Enviado ao investidor após aprovação da conta.",
  },
  terms_and_privacy_policy: {
    label: "Termos de Uso e Política de Privacidade",
    marker: "loor.terms-privacy.structured@1",
    variables: ["nome", "email", "termsUrl", "privacyPolicyUrl"],
    previewVariables: {
      nome: "Marina Alves",
      email: "marina@example.test",
      termsUrl: "https://exemplo.test/termos",
      privacyPolicyUrl: "https://exemplo.test/privacidade",
    },
    defaults: {
      subjectLine: "Termos de Uso e Política de Privacidade",
      greeting: "Olá,",
      opening: "Conheça os documentos da plataforma.",
      message: "Os links para os Termos de Uso e a Política de Privacidade estão abaixo.",
      signoff: "Atenciosamente,\nEquipe de suporte",
    },
    fallback: {
      subject: "Termos de Uso e Política de Privacidade",
      body_html:
        '<p>Olá, <strong>{{nome}}</strong>!</p><p>Consulte os <a href="{{termsUrl}}">Termos de Uso</a> e a <a href="{{privacyPolicyUrl}}">Política de Privacidade</a>.</p>',
    },
    systemLinks: [
      { label: "Termos de Uso", variable: "termsUrl" },
      { label: "Política de Privacidade", variable: "privacyPolicyUrl" },
    ],
    systemDetails: [],
    scope: "Notificação ao investidor com links, sem registro de aceite ou versão legal.",
  },
  investment_refund_started: {
    label: "Estorno iniciado (equity)",
    marker: "loor.refund-started.structured@1",
    subjectSuffix: " — {{oportunidade}}",
    variables: REFUND_VARIABLES,
    previewVariables: { ...REFUND_PREVIEW_VARIABLES },
    defaults: {
      subjectLine: "Estorno do seu investimento",
      greeting: "Olá,",
      opening: "Informamos que o estorno do seu investimento foi iniciado.",
      message:
        "O valor será creditado nos próximos dias úteis. Quando o pagamento foi feito por outra conta, a devolução vai para a conta que pagou.",
      signoff:
        "Caso tenha alguma dúvida, nossa equipe de suporte está à disposição.\nEquipe de suporte",
    },
    fallback: {
      subject: "Estorno do seu investimento na {{oportunidade}}",
      body_html:
        "<p>Olá, <strong>{{nome}}</strong>!</p><p>O estorno do seu investimento na {{oportunidade}} foi iniciado. Motivo: {{motivo}}.</p><p>Chave Pix: {{chavePix}}</p>",
    },
    systemLinks: [],
    systemDetails: REFUND_DETAILS,
    scope:
      "Enviado ao investidor de oportunidade de equity quando um estorno é solicitado: campanha sem meta, pagador diferente ou pedido do investidor.",
  },
  investment_refund_confirmation: {
    label: "Estorno concluído (equity)",
    marker: "loor.refund-confirmation.structured@1",
    subjectSuffix: " — {{oportunidade}}",
    variables: REFUND_VARIABLES,
    previewVariables: { ...REFUND_PREVIEW_VARIABLES },
    defaults: {
      subjectLine: "Confirmação de estorno",
      greeting: "Olá,",
      opening: "O estorno referente ao seu investimento foi concluído com sucesso.",
      message: "O valor já foi devolvido. Confira os dados do estorno abaixo.",
      signoff:
        "Caso tenha alguma dúvida, nossa equipe de suporte está à disposição.\nEquipe de suporte",
    },
    fallback: {
      subject: "Confirmação de estorno — {{oportunidade}}",
      body_html:
        "<p>Olá, <strong>{{nome}}</strong>!</p><p>O estorno do seu investimento na {{oportunidade}} foi concluído. Motivo: {{motivo}}.</p><p>Chave Pix: {{chavePix}}</p>",
    },
    systemLinks: [],
    systemDetails: REFUND_DETAILS,
    scope:
      "Enviado ao investidor de oportunidade de equity quando o provedor confirma a devolução do valor.",
  },
  password_recovery: {
    label: "Recuperação de senha",
    marker: "loor.password-recovery.structured@1",
    recipientName: false,
    variables: ["email", "url", "token"],
    previewVariables: {
      email: "marina@example.test",
      url: "https://investidor.exemplo.test/investor/change-password/token",
      token: "token",
    },
    defaults: {
      subjectLine: "Recuperar senha",
      greeting: "Olá!",
      opening: "Recebemos um pedido para redefinir a senha da sua conta.",
      message:
        "Use o botão abaixo para criar uma nova senha. Se você não fez esse pedido, ignore este e-mail.",
      signoff: "Atenciosamente,\nEquipe de suporte",
    },
    fallback: {
      subject: "Recuperar senha",
      body_html:
        '<p>Olá!</p><p>Clique no link para redefinir sua senha:</p><p><a href="{{url}}">{{url}}</a></p>',
    },
    systemLinks: [{ label: "Redefinir senha", variable: "url" }],
    systemDetails: [],
    scope: "Enviado ao investidor ou empreendedor que pede para redefinir a senha.",
  },
  registration_denied: {
    label: "Cadastro não aprovado",
    marker: "loor.registration-denied.structured@1",
    subjectPrefix: "{{nome}}, ",
    variables: ["nome", "email"],
    previewVariables: { nome: "Marina Alves", email: "marina@example.test" },
    defaults: {
      subjectLine: "cadastro não aprovado",
      greeting: "Olá,",
      opening: "Agradecemos seu interesse em investir pela plataforma.",
      message: "Analisamos seu cadastro com atenção e, neste momento, ele não foi aprovado.",
      signoff: "Atenciosamente,\nEquipe de suporte",
    },
    fallback: {
      subject: "{{nome}}, cadastro não aprovado",
      body_html: "<p>Olá, <strong>{{nome}}</strong>!</p><p>Seu cadastro não foi aprovado.</p>",
    },
    systemLinks: [],
    systemDetails: [],
    scope: "Enviado ao investidor quando o admin reprova o cadastro em validação manual.",
  },
  bank_account_update: {
    label: "Pedido de alteração de dados bancários",
    marker: "loor.bank-account-update.structured@1",
    variables: ["nome", "email", "url", "token"],
    previewVariables: {
      nome: "Marina Alves",
      email: "marina@example.test",
      url: "https://investidor.exemplo.test/investor/update-bank-information?token=token",
      token: "token",
    },
    defaults: {
      subjectLine: "Solicitação de alteração dos dados bancários",
      greeting: "Olá,",
      opening: "Recebemos sua solicitação para alterar os dados bancários.",
      message:
        "Use o botão abaixo para continuar. O link vale por 15 minutos. Se você não fez esse pedido, ignore este e-mail.",
      signoff: "Atenciosamente,\nEquipe de suporte",
    },
    fallback: {
      subject: "Solicitação de alteração dos dados bancários",
      body_html:
        '<p>Olá, <strong>{{nome}}</strong>!</p><p><a href="{{url}}">Alterar dados bancários</a></p>',
    },
    systemLinks: [{ label: "Alterar dados bancários", variable: "url" }],
    systemDetails: [],
    scope: "Enviado ao investidor que pede para alterar a conta bancária.",
  },
  bank_account_update_success: {
    label: "Dados bancários alterados",
    marker: "loor.bank-account-update-success.structured@1",
    variables: ["nome", "email"],
    previewVariables: { nome: "Marina Alves", email: "marina@example.test" },
    defaults: {
      subjectLine: "Seus dados bancários foram alterados com sucesso",
      greeting: "Olá,",
      opening: "Seus dados bancários foram alterados com sucesso.",
      message: "Se você não reconhece essa alteração, fale com o suporte imediatamente.",
      signoff: "Atenciosamente,\nEquipe de suporte",
    },
    fallback: {
      subject: "Seus dados bancários foram alterados com sucesso",
      body_html:
        "<p>Olá, <strong>{{nome}}</strong>!</p><p>Seus dados bancários foram alterados.</p>",
    },
    systemLinks: [],
    systemDetails: [],
    scope: "Enviado ao investidor depois que a nova conta bancária é salva.",
  },
  debt_investment_contract: {
    label: "Contrato após pagamento (dívida)",
    marker: "loor.debt-investment-contract.structured@1",
    subjectSuffix: " {{oportunidade}}",
    variables: ["nome", "email", "oportunidade", "valor", "data", "pdfNome"],
    previewVariables: {
      nome: "Marina Alves",
      email: "marina@example.test",
      oportunidade: "CCB Exemplo S.A.",
      valor: "5.000,00",
      data: "01/10/2026",
      pdfNome: "Contrato_de_Investimento_ccb_exemplo_s.a..pdf",
    },
    defaults: {
      subjectLine: "Seu Contrato de Investimento na",
      greeting: "Olá,",
      opening: "Obrigado pelo seu investimento.",
      message:
        "O contrato referente ao seu investimento segue em anexo. Guarde este documento para consultas futuras.",
      signoff: "Atenciosamente,\nEquipe de suporte",
    },
    fallback: {
      subject: "Seu Contrato de Investimento na {{oportunidade}}",
      body_html:
        "<p>Olá, <strong>{{nome}}</strong>!</p><p>Segue o contrato da oportunidade {{oportunidade}}. Valor investido: {{valor}}. Data: {{data}}.</p><p>O PDF do contrato ({{pdfNome}}) segue em anexo.</p>",
    },
    systemLinks: [],
    systemDetails: [
      { label: "Oportunidade", variable: "oportunidade" },
      { label: "Valor investido", variable: "valor" },
      { label: "Data", variable: "data" },
      { label: "Contrato anexado", variable: "pdfNome" },
    ],
    scope:
      "Enviado ao investidor de oportunidade de dívida após a liquidação do Pix. O PDF do contrato vai anexado pelo sistema.",
  },
  investment_refund_divergence: {
    label: "Pagamento não aprovado (pagador diferente)",
    marker: "loor.refund-divergence.structured@1",
    variables: ["nome", "email", "url"],
    previewVariables: {
      nome: "Marina Alves",
      email: "marina@example.test",
      url: "https://investidor.exemplo.test/investor/opportunities/1",
    },
    defaults: {
      subjectLine: "Pagamento não aprovado",
      greeting: "Olá,",
      opening: "Infelizmente seu pagamento não foi aprovado.",
      message:
        "Por segurança, a plataforma só aceita pagamentos feitos pelo próprio investidor. Confira se o titular da conta pagadora é o mesmo do cadastro.",
      signoff: "Atenciosamente,\nEquipe de suporte",
    },
    fallback: {
      subject: "Estorno devido a divergência no pagamento",
      body_html:
        '<p>Olá, <strong>{{nome}}</strong>!</p><p>Seu pagamento não foi aprovado.</p><p><a href="{{url}}">Investir novamente</a></p>',
    },
    systemLinks: [{ label: "Investir novamente", variable: "url" }],
    systemDetails: [],
    scope: "Enviado ao investidor quando o Pix foi pago por CPF/CNPJ diferente do dele.",
  },
  debt_refund_started: {
    label: "Estorno iniciado (dívida)",
    marker: "loor.debt-refund-started.structured@1",
    subjectSuffix: " — {{oportunidade}}",
    variables: DEBT_REFUND_VARIABLES,
    previewVariables: { ...DEBT_REFUND_PREVIEW_VARIABLES },
    defaults: {
      subjectLine: "Estorno do seu investimento",
      greeting: "Olá,",
      opening: "Informamos que o estorno do seu investimento foi iniciado.",
      message:
        "O valor será creditado nos próximos dias úteis. Quando o pagamento foi feito por outra conta, a devolução vai para a conta que pagou.",
      signoff:
        "Caso tenha alguma dúvida, nossa equipe de suporte está à disposição.\nEquipe de suporte",
    },
    fallback: {
      subject: "Estorno do seu investimento na {{oportunidade}}",
      body_html:
        "<p>Olá, <strong>{{nome}}</strong>!</p><p>O estorno do seu investimento de R$ {{valor}} na {{oportunidade}} foi iniciado. Motivo: {{motivo}}.</p><p>Chave Pix: {{chavePix}}</p>",
    },
    systemLinks: [],
    systemDetails: DEBT_REFUND_DETAILS,
    scope:
      "Enviado ao investidor de oportunidade de dívida quando um estorno é solicitado: campanha sem meta, pagador diferente ou pedido do investidor.",
  },
  debt_refund_confirmation: {
    label: "Estorno concluído (dívida)",
    marker: "loor.debt-refund-confirmation.structured@1",
    subjectSuffix: " — {{oportunidade}}",
    variables: DEBT_REFUND_VARIABLES,
    previewVariables: { ...DEBT_REFUND_PREVIEW_VARIABLES },
    defaults: {
      subjectLine: "Confirmação de estorno",
      greeting: "Olá,",
      opening: "O estorno referente ao seu investimento foi concluído com sucesso.",
      message: "O valor já foi devolvido. Confira os dados do estorno abaixo.",
      signoff:
        "Caso tenha alguma dúvida, nossa equipe de suporte está à disposição.\nEquipe de suporte",
    },
    fallback: {
      subject: "Confirmação de estorno — {{oportunidade}}",
      body_html:
        "<p>Olá, <strong>{{nome}}</strong>!</p><p>O estorno do seu investimento de R$ {{valor}} na {{oportunidade}} foi concluído. Motivo: {{motivo}}.</p><p>Chave Pix: {{chavePix}}</p>",
    },
    systemLinks: [],
    systemDetails: DEBT_REFUND_DETAILS,
    scope:
      "Enviado ao investidor de oportunidade de dívida quando o provedor confirma a devolução do valor.",
  },
  tax_document_income_tax: {
    label: "Comprovante para imposto de renda",
    marker: "loor.tax-document-income-tax.structured@1",
    subjectSuffix: " {{ano}}",
    variables: TAX_DOCUMENT_VARIABLES,
    previewVariables: {
      nome: "Marina Alves",
      email: "marina@example.test",
      ano: "2025",
      tipo: "imposto de renda",
      valorTotal: "15.000,00",
      quantidadeInvestimentos: "3",
    },
    defaults: {
      subjectLine: "Comprovante para imposto de renda",
      greeting: "Olá,",
      opening: "Segue em anexo o seu comprovante para a declaração de imposto de renda.",
      message: "Confira abaixo o resumo dos investimentos considerados no documento.",
      signoff: "Atenciosamente,\nEquipe de suporte",
    },
    fallback: {
      subject: "Comprovante para imposto de renda {{ano}}",
      body_html:
        "<p>Olá, <strong>{{nome}}</strong>!</p><p>Segue em anexo o seu comprovante de {{tipo}} referente a {{ano}}.</p>",
    },
    systemLinks: [],
    systemDetails: TAX_DOCUMENT_DETAILS,
    scope:
      "Enviado ao investidor que solicita o comprovante de IR do ano. O PDF vai anexado pelo sistema.",
  },
  tax_document_refund: {
    label: "Comprovante de reembolso",
    marker: "loor.tax-document-refund.structured@1",
    subjectSuffix: " {{ano}}",
    variables: TAX_DOCUMENT_VARIABLES,
    previewVariables: {
      nome: "Marina Alves",
      email: "marina@example.test",
      ano: "2025",
      tipo: "reembolso",
      valorTotal: "2.000,00",
      quantidadeInvestimentos: "1",
    },
    defaults: {
      subjectLine: "Comprovante de reembolso",
      greeting: "Olá,",
      opening: "Segue em anexo o seu comprovante de reembolso.",
      message: "Confira abaixo o resumo dos reembolsos considerados no documento.",
      signoff: "Atenciosamente,\nEquipe de suporte",
    },
    fallback: {
      subject: "Comprovante de reembolso {{ano}}",
      body_html:
        "<p>Olá, <strong>{{nome}}</strong>!</p><p>Segue em anexo o seu comprovante de {{tipo}} referente a {{ano}}.</p>",
    },
    systemLinks: [],
    systemDetails: TAX_DOCUMENT_DETAILS,
    scope:
      "Enviado ao investidor que solicita o comprovante de reembolsos do ano. O PDF vai anexado pelo sistema.",
  },
  forum_new_comment: {
    label: "Novo comentário no fórum (admins)",
    marker: "loor.forum-new-comment.structured@1",
    recipientName: false,
    subjectSuffix: ": {{oportunidade}}",
    variables: ["email", "oportunidade", "autor", "comentario", "data"],
    previewVariables: {
      email: "admin@example.test",
      oportunidade: "Oferta Exemplo S.A.",
      autor: "Investidor 12 (investidor)",
      comentario: "Qual o prazo previsto para a primeira distribuição?",
      data: "01/10/2026 às 14:30",
    },
    defaults: {
      subjectLine: "Novo comentário no fórum",
      greeting: "Olá!",
      opening: "O fórum de uma oferta recebeu um novo comentário.",
      message: "Acesse o painel para responder ou moderar o comentário.",
      signoff: "Notificação automática da plataforma",
    },
    fallback: {
      subject: "Novo comentário no fórum: {{oportunidade}}",
      body_html:
        "<p>Novo comentário no fórum da oportunidade <strong>{{oportunidade}}</strong>.</p><p>{{autor}} em {{data}}:</p><blockquote>{{comentario}}</blockquote>",
    },
    systemLinks: [],
    systemDetails: [
      { label: "Oportunidade", variable: "oportunidade" },
      { label: "Autor", variable: "autor" },
      { label: "Data", variable: "data" },
      { label: "Comentário", variable: "comentario" },
    ],
    scope:
      "Enviado aos admins da plataforma quando um investidor ou a venture comenta no fórum de uma oferta.",
  },
} as const satisfies Record<
  LinkedTemplateType,
  {
    label: string;
    marker: string;
    /** System-owned subject personalization around the editorial subject line. */
    subjectPrefix?: string;
    subjectSuffix?: string;
    /** false for mails without a recipient name (password recovery, admin notices). */
    recipientName?: false;
    variables: readonly string[];
    previewVariables: Record<string, string>;
    defaults: LinkedTemplateDraft;
    fallback: { subject: string; body_html: string };
    systemLinks: readonly { label: string; variable: string }[];
    /** Backend data rendered as a table the editor cannot change (refund details). */
    systemDetails: readonly { label: string; variable: string }[];
    scope: string;
  }
>;

export type LinkedTemplateSnapshot = {
  customTemplateId: number | null;
  draft: LinkedTemplateDraft;
  origin: EmailTemplateOrigin;
  contentFormat: "canonical" | "legacy";
  effectiveSubject: string;
  effectiveBodyHtml: string;
  availableVariables: string[];
  updatedAt: string | null;
  missingRequiredLinks: boolean;
};

const LIMITS: Record<LinkedTemplateField, number> = {
  subjectLine: 460,
  greeting: 80,
  opening: 240,
  message: 600,
  signoff: 180,
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function editorialHtml(value: string): string {
  return escapeHtml(value.trim()).replace(/\r?\n/g, "<br>");
}

export function greetsRecipientByName(type: LinkedTemplateType): boolean {
  return (LINKED_TEMPLATE_CONFIG[type] as { recipientName?: false }).recipientName !== false;
}

export function defaultLinkedTemplateDraft(type: LinkedTemplateType): LinkedTemplateDraft {
  return { ...LINKED_TEMPLATE_CONFIG[type].defaults };
}

export function validateLinkedTemplateDraft(
  draft: LinkedTemplateDraft,
): Partial<Record<LinkedTemplateField, string>> {
  const errors: Partial<Record<LinkedTemplateField, string>> = {};
  for (const field of Object.keys(LIMITS) as LinkedTemplateField[]) {
    const value = draft[field].trim();
    if (!value) errors[field] = "Campo obrigatório.";
    else if (value.length > LIMITS[field])
      errors[field] = `Use no máximo ${LIMITS[field]} caracteres.`;
    else if (value.includes("{{") || value.includes("}}"))
      errors[field] = "As variáveis são inseridas pelo sistema.";
    else if (/<\/?[a-z][^>]*>/i.test(value))
      errors[field] = "Use somente texto; o HTML é controlado pelo sistema.";
  }
  return errors;
}

export function serializeLinkedTemplate(type: LinkedTemplateType, draft: LinkedTemplateDraft) {
  const config = LINKED_TEMPLATE_CONFIG[type];
  const normalized = Object.fromEntries(
    (Object.keys(LIMITS) as LinkedTemplateField[]).map((field) => [field, draft[field].trim()]),
  ) as LinkedTemplateDraft;
  const marker = `<!-- ${config.marker}:${encodeURIComponent(JSON.stringify(normalized))} -->`;
  const subjectConfig = config as { subjectPrefix?: string; subjectSuffix?: string };
  const subject = `${subjectConfig.subjectPrefix ?? ""}${normalized.subjectLine}${subjectConfig.subjectSuffix ?? ""}`;
  const details = config.systemDetails.length
    ? [
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:0 0 24px;border-collapse:collapse;">',
        ...config.systemDetails.map(
          ({ label, variable }) =>
            `<tr><td style="padding:9px 0;border-bottom:1px solid #e2e8f0;font-size:14px;line-height:20px;color:#64748b;">${escapeHtml(label)}</td><td align="right" style="padding:9px 0 9px 16px;border-bottom:1px solid #e2e8f0;font-size:14px;line-height:20px;font-weight:700;color:#0f172a;">{{${variable}}}</td></tr>`,
        ),
        "</table>",
      ].join("\n")
    : "";
  const links = config.systemLinks
    .map(({ label, variable }) =>
      [
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;border-collapse:separate;">',
        '<tr><td bgcolor="#1652f0" style="border-radius:6px;">',
        `<a href="{{${variable}}}" style="display:inline-block;padding:14px 24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">${escapeHtml(label)}</a>`,
        "</td></tr></table>",
        `<p style="margin:0 0 24px;font-size:13px;line-height:20px;word-break:break-all;"><a href="{{${variable}}}" style="color:#1652f0;text-decoration:underline;">{{${variable}}}</a></p>`,
      ].join("\n"),
    )
    .join("\n");
  return {
    subject,
    body_html: [
      marker,
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:0;padding:0;background:#f4f6f8;border-collapse:collapse;">',
      '<tr><td align="center" style="padding:32px 12px;">',
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-collapse:separate;border-spacing:0;">',
      '<tr><td style="height:6px;background:#1652f0;font-size:0;line-height:0;">&nbsp;</td></tr>',
      '<tr><td style="padding:40px;font-family:Arial,Helvetica,sans-serif;color:#334155;">',
      greetsRecipientByName(type)
        ? `<h1 style="margin:0 0 22px;font-size:26px;line-height:34px;color:#0f172a;">${editorialHtml(normalized.greeting)} <strong>{{nome}}</strong>!</h1>`
        : `<h1 style="margin:0 0 22px;font-size:26px;line-height:34px;color:#0f172a;">${editorialHtml(normalized.greeting)}</h1>`,
      `<p style="margin:0 0 14px;font-size:16px;line-height:25px;">${editorialHtml(normalized.opening)}</p>`,
      `<p style="margin:0 0 26px;font-size:15px;line-height:24px;">${editorialHtml(normalized.message)}</p>`,
      details,
      links,
      `<p style="margin:28px 0 0;font-size:14px;line-height:22px;">${editorialHtml(normalized.signoff)}</p>`,
      "</td></tr></table></td></tr></table>",
    ]
      // Empty system blocks are dropped so types without links/details stay byte-stable.
      .filter((part) => part !== "")
      .join("\n"),
  };
}

export function deserializeLinkedTemplate(
  type: LinkedTemplateType,
  subject: string,
  bodyHtml: string,
): LinkedTemplateDraft | undefined {
  const marker = LINKED_TEMPLATE_CONFIG[type].marker;
  const match = bodyHtml
    .trim()
    .match(new RegExp(`^<!-- ${marker.replaceAll(".", "\\.")}:([^\\r\\n]+) -->\\n`));
  if (!match) return undefined;
  try {
    const candidate: unknown = JSON.parse(decodeURIComponent(match[1]));
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return undefined;
    const record = candidate as Record<string, unknown>;
    if (Object.keys(record).length !== Object.keys(LIMITS).length) return undefined;
    if (
      !(Object.keys(LIMITS) as LinkedTemplateField[]).every(
        (field) => typeof record[field] === "string",
      )
    )
      return undefined;
    const draft = record as LinkedTemplateDraft;
    if (Object.keys(validateLinkedTemplateDraft(draft)).length) return undefined;
    const serialized = serializeLinkedTemplate(type, draft);
    return serialized.subject === subject.trim() && serialized.body_html === bodyHtml.trim()
      ? draft
      : undefined;
  } catch {
    return undefined;
  }
}

export function resolveLinkedTemplateSnapshot(
  type: LinkedTemplateType,
  templates: AdminEmailTemplate[],
  types: AdminEmailTemplateType[],
): LinkedTemplateSnapshot {
  const matching = templates.filter((item) => item.type === type).sort((a, b) => b.id - a.id);
  const custom = matching.find((item) => item.active && !item.is_default && item.wtlb_id !== null);
  const systemDefault = matching.find(
    (item) => item.active && item.is_default && item.wtlb_id === null,
  );
  const effective = custom ?? systemDefault;
  const config = LINKED_TEMPLATE_CONFIG[type];
  const effectiveSubject = effective?.subject.trim() ?? config.fallback.subject;
  const effectiveBodyHtml = effective?.body_html.trim() ?? config.fallback.body_html;
  const canonical = deserializeLinkedTemplate(type, effectiveSubject, effectiveBodyHtml);
  const recordVariables = normalizeEmailTemplateVariables(effective?.available_variables);
  const typeVariables = normalizeEmailTemplateVariables(
    types.find((item) => item.type === type)?.available_variables,
  );
  return {
    customTemplateId: custom?.id ?? null,
    draft: canonical ?? defaultLinkedTemplateDraft(type),
    origin: custom ? "custom" : systemDefault ? "default" : "fallback",
    contentFormat: canonical ? "canonical" : "legacy",
    effectiveSubject,
    effectiveBodyHtml,
    availableVariables: recordVariables.length
      ? recordVariables
      : typeVariables.length
        ? typeVariables
        : [...config.variables],
    updatedAt: effective?.updated_at ?? null,
    missingRequiredLinks: config.systemLinks.some(
      ({ variable }) => !effectiveBodyHtml.includes(`{{${variable}}}`),
    ),
  };
}

export function createLinkedTemplatePayload(type: LinkedTemplateType, draft: LinkedTemplateDraft) {
  return {
    name: LINKED_TEMPLATE_CONFIG[type].label,
    type,
    ...serializeLinkedTemplate(type, draft),
    active: true as const,
  };
}

export function updateLinkedTemplatePayload(type: LinkedTemplateType, draft: LinkedTemplateDraft) {
  return { ...serializeLinkedTemplate(type, draft), active: true as const };
}

export function linkedTemplatePreviewPayload(type: LinkedTemplateType, draft: LinkedTemplateDraft) {
  return {
    ...serializeLinkedTemplate(type, draft),
    variables: { ...LINKED_TEMPLATE_CONFIG[type].previewVariables },
  };
}
