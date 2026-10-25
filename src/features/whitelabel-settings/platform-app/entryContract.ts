export const PLATFORM_APP_ENTRY_CAPABILITY_ID = "platform.app.entry-content" as const;
export const PLATFORM_APP_ENTRY_VERSION = 1 as const;
export const PLATFORM_APP_ENTRY_LOCALE = "pt-BR" as const;
export const PLATFORM_APP_ENTRY_PAGE = "app_entry" as const;
export const PLATFORM_APP_ENTRY_KEY = "content" as const;

export type PlatformAppEntryContent = {
  login: {
    submitLabel: string;
    recoverPasswordLabel: string;
    registrationPrompt: string;
    registrationActionLabel: string;
  };
  registration: {
    detailsTitle: string;
    fullNameHelper: string;
    detailsContinueLabel: string;
    passwordTitle: string;
    passwordDescription: string;
    passwordContinueLabel: string;
  };
  passwordRecovery: {
    title: string;
    description: string;
    continueLabel: string;
    backToLoginLabel: string;
  };
  completeRegistration: {
    personalDataTitle: string;
    issuingEntityHelper: string;
    nationalityHelper: string;
    annualIncomeHelper: string;
    addressTitle: string;
    bankDataTitle: string;
  };
};

export type PlatformAppEntryPayloadV1 = {
  capabilityId: typeof PLATFORM_APP_ENTRY_CAPABILITY_ID;
  version: typeof PLATFORM_APP_ENTRY_VERSION;
  locale: typeof PLATFORM_APP_ENTRY_LOCALE;
  screens: Record<string, unknown> & PlatformAppEntryContent;
};

export type PlatformAppEntryScreenId = keyof PlatformAppEntryContent;
export type PlatformAppEntryFieldPath =
  | `login.${keyof PlatformAppEntryContent["login"]}`
  | `registration.${keyof PlatformAppEntryContent["registration"]}`
  | `passwordRecovery.${keyof PlatformAppEntryContent["passwordRecovery"]}`
  | `completeRegistration.${keyof PlatformAppEntryContent["completeRegistration"]}`;

export const PLATFORM_APP_ENTRY_DEFAULTS: PlatformAppEntryContent = {
  login: {
    submitLabel: "Entrar",
    recoverPasswordLabel: "Esqueci minha senha",
    registrationPrompt: "Não tem uma conta?",
    registrationActionLabel: "Criar conta",
  },
  registration: {
    detailsTitle: "Seus dados",
    fullNameHelper: 'Ex.: Daniel, não "Dani"',
    detailsContinueLabel: "Continuar",
    passwordTitle: "Escolha sua senha",
    passwordDescription:
      "Defina uma senha de acesso à plataforma. Atente-se para os requisitos de uma senha segura.",
    passwordContinueLabel: "Continuar",
  },
  passwordRecovery: {
    title: "Recuperar senha",
    description: "Esqueceu a sua senha? Não se preocupe, vamos recuperá-la.",
    continueLabel: "Continuar",
    backToLoginLabel: "Ir para a Home",
  },
  completeRegistration: {
    personalDataTitle: "Dados Pessoais",
    issuingEntityHelper: "Ex.: SSP, DETRAN, etc.",
    nationalityHelper: "Ex.: Brasileira, Americana, etc.",
    annualIncomeHelper: "Ex.: R$ 50.000,00",
    addressTitle: "Endereço",
    bankDataTitle: "Dados bancários",
  },
};

export const PLATFORM_APP_ENTRY_SCREENS = [
  {
    id: "login",
    label: "Login",
    description: "Ações textuais de acesso, recuperação e criação de conta.",
    fields: [
      { key: "submitLabel", label: "Ação principal", kind: "short", maxLength: 60 },
      { key: "recoverPasswordLabel", label: "Ação de recuperação", kind: "short", maxLength: 80 },
      { key: "registrationPrompt", label: "Convite para cadastro", kind: "short", maxLength: 100 },
      { key: "registrationActionLabel", label: "Ação de cadastro", kind: "short", maxLength: 60 },
    ],
  },
  {
    id: "registration",
    label: "Cadastro inicial",
    description: "Criação pública da conta: títulos e apoio editorial das etapas de dados e senha.",
    fields: [
      { key: "detailsTitle", label: "Título da etapa de dados", kind: "short", maxLength: 80 },
      { key: "fullNameHelper", label: "Ajuda do nome completo", kind: "long", maxLength: 160 },
      { key: "detailsContinueLabel", label: "Ação da etapa de dados", kind: "short", maxLength: 60 },
      { key: "passwordTitle", label: "Título da etapa de senha", kind: "short", maxLength: 80 },
      { key: "passwordDescription", label: "Orientação introdutória da senha", kind: "long", maxLength: 320 },
      { key: "passwordContinueLabel", label: "Ação da etapa de senha", kind: "short", maxLength: 60 },
    ],
  },
  {
    id: "passwordRecovery",
    label: "Recuperação de senha",
    description: "Introdução e ações da solicitação de recuperação.",
    fields: [
      { key: "title", label: "Título", kind: "short", maxLength: 80 },
      { key: "description", label: "Texto de apoio", kind: "long", maxLength: 320 },
      { key: "continueLabel", label: "Ação principal", kind: "short", maxLength: 60 },
      { key: "backToLoginLabel", label: "Ação de retorno", kind: "short", maxLength: 80 },
    ],
  },
  {
    id: "completeRegistration",
    label: "Completar cadastro",
    description: "Pós-cadastro autenticado: títulos e exemplos editoriais das etapas de dados, endereço e banco.",
    fields: [
      { key: "personalDataTitle", label: "Título de dados pessoais", kind: "short", maxLength: 80 },
      { key: "issuingEntityHelper", label: "Exemplo de órgão emissor", kind: "long", maxLength: 120 },
      { key: "nationalityHelper", label: "Exemplo de nacionalidade", kind: "long", maxLength: 120 },
      { key: "annualIncomeHelper", label: "Exemplo de renda anual", kind: "long", maxLength: 100 },
      { key: "addressTitle", label: "Título de endereço", kind: "short", maxLength: 80 },
      { key: "bankDataTitle", label: "Título de dados bancários", kind: "short", maxLength: 80 },
    ],
  },
] as const;

export const PLATFORM_APP_TERMINOLOGY_USAGE = [
  { tokenId: "investmentPortfolio.label.singular", label: "Carteira — singular", applied: true },
  { tokenId: "investmentPortfolio.label.plural", label: "Carteira — plural", applied: false },
  { tokenId: "investmentOffering.label.singular", label: "Oportunidade — singular", applied: true },
  { tokenId: "investmentOffering.label.plural", label: "Oportunidade — plural", applied: true },
  { tokenId: "investorRole.label.singular", label: "Investidor — singular", applied: false },
  { tokenId: "investorRole.label.plural", label: "Investidor — plural", applied: true },
] as const;
