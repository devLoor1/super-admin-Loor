# Refinamento estrutural operacional V1

## Base e separação

Base operacional: `fe7a9a839c5f5595825661c136aa1107c5071c6f`, obtida da `dev` remota em 27/10/2026. Trabalho isolado em `feature/operational-ux-structural-v1`.

O candidato AST `9228af6958e9e6f64ddd150e43656a83181a6972`, Core PR #50 e Nest PR #1 permanecem separados. Esta entrega não ativa contratos pendentes. Não altera Backend, permissões, preferências de Menu Visibility, modelos ou transportes de negócio.

## Diagnóstico e alteração por tarefa

| Superfície | Problema observado | Mudança | Benefício esperado |
| --- | --- | --- | --- |
| Dashboard | Painel explicativo alto antes das análises; atalhos no fim | Atalhos no início, indicadores a seguir, análises em duas colunas e auditoria em largura integral | Iniciar uma consulta sem atravessar conteúdo promocional; tabela recente com mais espaço |
| Whitelabels | Quatro KPIs sem dados, filtro de status repetido, detalhe com caixas vazias | Contagem real junto à lista, filtro único, identidade/domínio agrupados, detalhe sem minicards indisponíveis | Encontrar e selecionar o tenant com menos ruído, mantendo valores ausentes honestos |
| Contas | Contexto do tenant somente sobre a lista; detalhe compete com filtros; empilhamento longo no celular | Tenant sobre ambas as colunas, títulos de lista/detalhe, legenda consultável, detalhe móvel com retorno à lista | Entender qual conta está selecionada e navegar sem perder filtros/página |
| Operação: Oportunidades, Investidores, Empreendedores, Empresas | Resumos altos e controles sem rótulos visíveis; ação de criação separada | Indicadores compactos com proveniência consultável, labels visíveis, ação junto ao contexto, separação de identidade/metadados | Filtrar com clareza e chegar aos registros mais cedo |
| Financeiro: Investimentos, Pagamentos/PIX, Wallet | Resumos e filtros consomem altura; status e linhagem competem | Mesma hierarquia de consulta e resumo compacto; modelos e valores preservados | Consultar domínios independentes sem sugerir operação financeira |
| KYC, Auditoria e Operadores | Avisos extensos antes da consulta; contexto técnico concorre com resultados | Limites preservados junto ao conteúdo, títulos e filtros claros, indicadores compactos | Consultar registros mantendo explícito o caráter de supervisão/leitura |
| Configurações e SMTP | Edição qualificada depois de várias telas de dados | Seletor e ações existentes antes da leitura, com título de tarefa | Acessar a edição já homologada sem percorrer toda a projeção |
| Cabeçalho | Título e localização competem na mesma linha | Título com maior hierarquia; trilha abaixo; revelação breve, sem remontar formulário | Contexto consistente entre módulos e textos longos legíveis |

Login mantém a composição já aprovada. E-mail/SMTP mantém os campos, editor e confirmação já existentes; apenas sua ação foi aproximada do contexto. Platform App, publicação legal e branding pendente não recebem novos controles operacionais. Finance configuração permanece no protótipo; nenhuma rota foi promovida por esta revisão.

## Evidência visual e isolamento

Capturas locais: `C:/Users/User/Desktop/Loor/tmp/operational-ux-20261027/`. A base de produção anterior foi congelada em `baseline-dist`; comparação usa a mesma largura e os mesmos fixtures sintéticos. Capturas com dados do ambiente oficial ficam somente no diretório local, fora do Git.

Harness externo ao runtime: autenticação sintética local, CSP `connect-src 'self'`, toda escrita de negócio bloqueada com 405. Não constitui E2E com Backend real. O dataset de Whitelabels inclui tenants adicionais de Settings/SMTP e seu total difere do agregado sintético original do Dashboard; qualquer diagnóstico de divergência deve ser tratado como limite da fixture, não como regressão do produto.

## Mocks elegíveis, antes de qualquer alteração

| Módulo/rota | Dependência ativa | Arquivos elegíveis |
| --- | --- | --- |
| Settings de `wl_proto_01`, experiência de entrada | APP-01/AST-01; Core PR #50 | `MockConfigurationStudio.tsx` e CSS local; montagem pontual somente se necessária |
| E-mails de `wl_proto_01`, templates/identidade | EML-01/EMB-01; Core PR #50 + Nest PR #1 | Mesmo Studio e CSS local; montagem pontual somente se necessária |
| Contas de tenant 1, criação de investidores/empreendedores | `docs/account-creation-backend-handoff-v1.md`; criação Control Plane ainda pendente | `src/mock/account-creation/MockAccountCreateAction.tsx`, `MockAccountOnboarding.tsx`, `MockAccountCreation.module.css` |

Todos os demais mocks ficam congelados, inclusive Finance configuração, galeria legacy de contas, SMTP test-send, eventos e publicação legal. Não alterar tokens, shell ou componentes globais da branch `mock`. Publicação seletiva e independente; sem merge integral em `dev`.

## Validação e publicação

### Evidência local concluída

- TypeScript, oxlint, produção Vite e `git diff --check`: aprovados. Permanecem os dois avisos históricos de `set-state-in-effect` nos editores Settings/SMTP e o aviso de bundle acima de 500 kB. Não há alegação de ganho de performance.
- Build local comparável: `index-D9IliLDB.js` (1.064,49 kB; gzip 305,92 kB) e `index-NAGndpBn.css` (212,76 kB; gzip 38,08 kB). O build oficial usa sua configuração existente, portanto seu identificador de JS pode diferir do build com API sintética local.
- Produção inspecionada nas 15 rotas representativas de Dashboard, Whitelabels, Contas, quatro listas de Operação, três de Financeiro, KYC, Auditoria, Operadores, Settings e SMTP, em 1672/1440/900/390/320 px. Sem overflow horizontal do documento; tabelas densas usam rolagem interna. Matriz e capturas em `responsive-matrix.json` e `before/after` no diretório local de evidências.
- Comparações principais em 1440 × 810: `dashboard-1440.png` e `whitelabels-1440.png`, mesmas fixtures, viewport e estado carregado. Também existem comparações de Contas, Oportunidades, Settings, SMTP, KYC, Auditoria e Operadores.
- Em 390 px, seleção/detalhe/retorno de Contas e Whitelabels preservaram consulta e devolveram foco ao título da lista. No caso Whitelabels, `search=Finapop` permaneceu após o retorno.
- Settings e SMTP: rascunho local, confirmação de descarte e retorno ao acionador verificados; nenhum Save foi enviado. Troca 6 → 7 trouxe a identidade e textos do tenant 7 sem reaproveitar o rascunho; SMTP 8 mostrou ausência de configuração.
- Erro 500 e lista vazia de Investidores, carregamento e valores ausentes foram verificados com o harness local, sem fallback de registros. Papel sintético de leitura apresentou Settings sem controles de escrita. O teste correto usa novo documento ao trocar de papel; navegação apenas por hash não resemeia uma sessão do harness.
- Movimento reduzido: título sem animação e opacidade 1. Login/OriginKit e seus fallbacks não foram alterados. DEV também carregou sem overlay Vite ou overflow; a máquina sob carga apresentou latência no helper local, separada de falhas do produto.
- Limite de acessibilidade: contenção de Tab no modal aninhado de descarte SMTP ficou inconclusiva no controlador. O `Dialog.tsx` e seus handlers estão intactos; descarte e retorno de foco foram observados. Não registrar esse caso como aprovado.
- Revisão independente do diff confirmou preservação de API/auth/RBAC/modelos/dependências/registry e das proteções históricas. O novo overlay de comparação usa hashes exatos de arquivos revisados; testes de comportamento continuam lendo o candidato real.

### Gates de publicação

As 42 suítes `scripts/check-*.mjs` passaram: 40 na execução completa e duas após ajustes de composição restritos aos testes. Em Oportunidades, o stub de `PageIntro` passou a renderizar `actions`, mantendo os cinco perfis de autorização (138 checks). Em Whitelabel CRUD, a expectativa acompanha a seleção explícita no mobile e inclui seis cenários executando o handler real (69 checks). Nenhum assert de permissão foi removido; runtime e pins permaneceram iguais. A suíte nova de UX passou 61 checks.

Leitura oficial pré-release de Menu Visibility: HTTP 200 após uma tentativa delimitada de recuperação de timeout; versão 5, 23 preferências, todas visíveis, sem rascunho. SHA-256 da serialização recebida: `c6f45c1541a15e3d18eb7ed6508f8c85331e6790d73178b803bf36d7e97a130f`. A comparação pós-release deve usar a mesma serialização. Nenhum PUT de preferências foi enviado.

Publicação pelo fluxo Git conectado existente; SHA, deploy e assets efetivamente servidos são registrados no manifesto local `release-evidence.json` após a verificação, sem presumir sucesso antes da publicação. O mock recebe commit separado e não pode ser publicado no site operacional. O candidato AST e os PRs Core/Nest permanecem inalterados; a aparência sintética não constitui homologação dos contratos pendentes.
