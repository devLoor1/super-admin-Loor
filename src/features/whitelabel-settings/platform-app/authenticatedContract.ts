export const PLATFORM_APP_AUTHENTICATED_CAPABILITY_ID =
  "platform.app.authenticated-content" as const;
export const PLATFORM_APP_AUTHENTICATED_VERSION = 1 as const;
export const PLATFORM_APP_AUTHENTICATED_LOCALE = "pt-BR" as const;
export const PLATFORM_APP_AUTHENTICATED_PAGE = "app_authenticated" as const;
export const PLATFORM_APP_AUTHENTICATED_KEY = "content" as const;

export type PlatformAppAuthenticatedContent = {
  wallet: {
    investedOpportunitiesTitle: string;
    availableOpportunitiesTitle: string;
    availableOpportunitiesMoreLabel: string;
    availableOpportunitiesInfoTitle: string;
    availableOpportunitiesInfoDescription: string;
  };
  opportunities: {
    searchPlaceholder: string;
    emptyStateHelper: string;
    detailProgressTitle: string;
    detailResourcesLabel: string;
    detailProfileLabel: string;
    detailTeamTitle: string;
  };
  investments: {
    searchPlaceholder: string;
    emptyStateHelper: string;
  };
};

export type PlatformAppAuthenticatedPayloadV1 = {
  capabilityId: typeof PLATFORM_APP_AUTHENTICATED_CAPABILITY_ID;
  version: typeof PLATFORM_APP_AUTHENTICATED_VERSION;
  locale: typeof PLATFORM_APP_AUTHENTICATED_LOCALE;
  screens: Record<string, unknown> & PlatformAppAuthenticatedContent;
};

export type PlatformAppAuthenticatedAreaId = keyof PlatformAppAuthenticatedContent;
export type PlatformAppAuthenticatedFieldPath =
  | `wallet.${keyof PlatformAppAuthenticatedContent["wallet"]}`
  | `opportunities.${keyof PlatformAppAuthenticatedContent["opportunities"]}`
  | `investments.${keyof PlatformAppAuthenticatedContent["investments"]}`;

export const PLATFORM_APP_AUTHENTICATED_DEFAULTS: PlatformAppAuthenticatedContent = {
  wallet: {
    investedOpportunitiesTitle: "Oportunidades investidas",
    availableOpportunitiesTitle: "Oportunidades disponíveis",
    availableOpportunitiesMoreLabel: "veja mais",
    availableOpportunitiesInfoTitle: "Novas oportunidades",
    availableOpportunitiesInfoDescription:
      "Apresenta o valor total investido, detalhando todos os custos envolvidos.",
  },
  opportunities: {
    searchPlaceholder: "Pesquisar",
    emptyStateHelper: "Ajuste sua busca ou os filtros para tentar novamente.",
    detailProgressTitle: "Progresso",
    detailResourcesLabel: "Aplicação dos recursos",
    detailProfileLabel: "Perfil",
    detailTeamTitle: "Equipe",
  },
  investments: {
    searchPlaceholder: "Pesquisar",
    emptyStateHelper: "Ajuste sua busca ou os filtros para tentar novamente.",
  },
};

export const PLATFORM_APP_AUTHENTICATED_AREAS = [
  {
    id: "wallet",
    label: "Carteira",
    description: "Títulos e apoio editorial do resumo e da seleção de oportunidades.",
    fields: [
      { key: "investedOpportunitiesTitle", label: "Título do resumo investido", kind: "short", maxLength: 100 },
      { key: "availableOpportunitiesTitle", label: "Título da seleção disponível", kind: "short", maxLength: 100 },
      { key: "availableOpportunitiesMoreLabel", label: "Ação para ver mais", kind: "short", maxLength: 60 },
      { key: "availableOpportunitiesInfoTitle", label: "Título informativo", kind: "short", maxLength: 100 },
      { key: "availableOpportunitiesInfoDescription", label: "Descrição informativa", kind: "long", maxLength: 280 },
    ],
  },
  {
    id: "opportunities",
    label: "Oportunidades",
    description: "Busca, ajuda do estado vazio e títulos editoriais do detalhe.",
    fields: [
      { key: "searchPlaceholder", label: "Placeholder de busca", kind: "short", maxLength: 80 },
      { key: "emptyStateHelper", label: "Ajuda do estado vazio", kind: "long", maxLength: 180 },
      { key: "detailProgressTitle", label: "Título da seção de progresso", kind: "short", maxLength: 80 },
      { key: "detailResourcesLabel", label: "Label de aplicação dos recursos", kind: "short", maxLength: 100 },
      { key: "detailProfileLabel", label: "Label de perfil", kind: "short", maxLength: 80 },
      { key: "detailTeamTitle", label: "Título da seção de equipe", kind: "short", maxLength: 80 },
    ],
  },
  {
    id: "investments",
    label: "Investimentos",
    description: "Busca e ajuda do estado vazio da lista de investimentos.",
    fields: [
      { key: "searchPlaceholder", label: "Placeholder de busca", kind: "short", maxLength: 80 },
      { key: "emptyStateHelper", label: "Ajuda do estado vazio", kind: "long", maxLength: 180 },
    ],
  },
] as const;
