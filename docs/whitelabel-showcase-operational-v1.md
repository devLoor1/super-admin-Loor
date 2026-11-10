# White Labels — CRUD e integração da vitrine

## Checkpoint 10/11/2026 — lote 1 encerrado

Esta frente é independente dos testes de participantes, encerrados por decisão do usuário. Não retomar contas, onboarding ou Termos.

Baseline verificado: `devLoor1/super-admin-Loor`, `dev` local/remoto em `d49815d7fa3decd7f255c94b8826d64822d5b883`, checkout limpo. Preparação isolada em `feature/showcase-operational-v1`, worktree `C:/Users/User/Desktop/Loor/worktrees/super-admin-showcase-operational-v1`. Mock, demo, FRONT-WEB e demais worktrees preservados.

### Publicação e configuração verificadas

- Netlify `loor-super-admin`, site `25e47255-95dc-4ed6-a22a-8bce03017ee7`, `https://loor-super-admin.netlify.app`.
- Deploy publicado `6aeb0403fa9df580771946fb`, ready, branch dev, SHA `d49815d7fa3decd7f255c94b8826d64822d5b883`.
- Lista atual dos 16 projetos da equipe consultada: somente esse site referencia `devLoor1/super-admin-Loor`; aliases vazios; branch dev; branches permitidas `[dev]`; builds ativos; comando `npm run build`, saída `dist`.
- Valores atuais, lidos da resposta recebida pelo painel integrado: `VITE_WHITELABEL_WRITES_ENABLED=true` e `VITE_WHITELABEL_LIFECYCLE_ENABLED=true` no contexto técnico production desse site de homologação. Demais contextos retornados false. API `https://backend-super-admin-loor.onrender.com/api`, Node22.
- Ambas as flags já estavam assim. **Zero mudanças de configuração, zero novo deploy, zero push para o lote 1.** Lifecycle preservado e não exercitado. Não confundir o nome do contexto Netlify com produção de negócio.

### Validação publicada, uma identidade QA

Sessão restaurada: GET `/api/auth/me` HTTP200, papel SUPER_ADMIN. Listagem completa antes da criação: sete registros, uma página; slug e URL sintéticos escolhidos não presentes.

| Operação | Horário UTC (Brasília UTC−03) | Resultado | Correlação |
| --- | --- | --- | --- |
| POST `/api/whitelabels` | 2026-11-10T19:00:18.514Z (16:00:18.514) | 201, ID9, ativo | `73174f04-5f2c-4787-9021-7daf1db503f6` |
| GET do ID retornado | após criação | 200 | `df1a0c59-e88f-48ef-afb1-9646b263900b` |
| PATCH `/api/whitelabels/9` | 2026-11-10T19:01:02.732Z (16:01:02.732) | 200, somente campo name | `46c5e835-d131-4988-9ab3-b609bd9e7b0e` |
| GET após recarga | evidência coletada 2026-11-10T19:01:46.795Z (16:01:46.795) | 200, nome e identidade persistidos | `5a91e413-6ab5-4995-a99c-deccded4fccd` |

Registro preservado: **ID9**, nome `QA Vitrine Homolog 20261110 — Revisado`, slug `qa-vitrine-20261110-1600`, baseUrl `https://qa-vitrine-20261110-1600.example.invalid`, ativo, zero administradores. Pode ser origem de um card quando a vitrine estiver disponível; não é proprietário da vitrine. Proprietário real continua **ID6 / homologacao**.

Contagem: **1 criação + 1 alteração de nome**. Nenhuma repetição, lifecycle, participante ou administrador criado. Confirmação da lista e detalhe por GET, sem registros otimistas fabricados. Não houve teste destrutivo de conflito em API: cobertura complementar executada sobre o código atual, com rede interceptada, `check-whitelabel-operational` **37 PASS** e `check-whitelabel-crud` **69 PASS** (409, erros, incerteza, identidade, dupla submissão). Evidência anterior de frontend não alterado reaproveitada; não houve rebuild desnecessário do lote já publicado.

Evidências locais: `C:/Users/User/Desktop/Loor/tmp/whitelabel-crud-showcase-20261110/`: `crud-plan.json`, `crud-ledger.json`, `crud-created-9.png`, `crud-persisted-9.png`, logs dos dois checks. O ledger contém somente dados QA e metadados de resposta, sem credenciais.

## Lote 2 — preparação em andamento; Backend ainda indisponível na fonte

Contrato canônico `devLoor1/backend-super-admin-Loor/docs/whitelabel-showcase-v1-contract.md`, dev `61b8591e1784566af624f9c12ba32400b83350f9`; branch homolog `c5deb279eab68f44ab07e94eb459a575308b9a79`. O documento informa expressamente Backend ainda não implementado. Core dev consultado `5590d118ebbce14e93baba91775f980fa68ef32a`; AST atual só aceita slot main_area, recusando showcase com validação422. Não inferir disponibilidade runtime a partir de documentação ou branch.

Preparar integração frontend e checks com contrato, sem mocks no runtime. Não habilitar nem publicar interface de persistência sem GET/PUT com revisão, upload showcase e autorização efetivos. Confirmação funcional depende de Backend real. Mock aprovado foi copiado seletivamente como ponto de partida; fixtures, simulação e transporte em memória serão excluídos da cadeia operacional. Não promover sua branch integralmente.

Próxima ação: concluir preparação/testes frontend do lote2; registrar dependência objetiva de Backend. Lote3 preservará baseline público, BASE_PATH e VITE_WALLET_PREFIX, sem assumir raiz livre. Nenhuma pendência de D3/uploads não executada será tratada como aprovada.

### Corte de preparação do lote2 — 10/11/2026, 16:31 UTC−03

Editor adaptado ao contrato real: owner6, busca ativa paginada/consulta direta por ID, codec de documento completo/revisão nula, conflitos e leitura de conferência, proteção de sessão/rascunho, novo upload slot showcase e renovação de URL. Fixtures e controles de simulação foram retirados do módulo operacional. Flag nova `VITE_SHOWCASE_ENABLED=false` por padrão, combinada com API homolog exata; não alterada no Netlify. Logo/descrição manuais, cores editoriais, CTAs demonstrativos e composição preservados.

Checks focados atuais:32 cenários de contrato/transporte interceptado,148 de navegação/guards,59 de fronteira, typecheck e build PASS; suíte mantida completa em andamento neste corte. Build normal: `dist/assets/index-DF9lxEV8.js`, SHA256 `E0CBF0C95D46F5C7F0BED76B423C02B72F9A177484B12F4D70B4CF3974A20C5A`. Aviso de chunk grande permanece, sem erro de build. Novo manifesto de revisão preserva os manifests históricos e os23 IDs de Menu Visibility.

#### Navegador integrado — cobertura local parcial, não Backend

Harness explícito em `scripts/fixtures/showcase-browser/`, configuração própria fora da entrada operacional, CSP restrita a self, respostas de API interceptadas, identidade sintética. Nenhuma operação desse harness atinge o serviço. Build separado em cache de dependências. O primeiro DEV teve falha de import/carregamento do próprio harness durante a migração; o caminho foi corrigido e o build compilado carregou o editor. Não classificar isso como defeito de Backend.

- Banner válido: passou no compilado; assinatura inválida: erro visível, controle liberado, tentativa válida seguinte aplicada.
- Fechar pelo X durante upload: interface `Enviando…` e controle desabilitado capturados antes do fechamento; resposta retida liberada depois; associação e texto anterior preservados. Controle temporal é uma Promise do transporte de teste liberada por botão, sem congelar relógio do produto. Não comprova latência/cancelamento do provedor real.
- Operações interceptadas concluídas nesse corte:3 POSTs de mídia (duas aplicações e um resultado tardio ignorado), zero PUT do documento. Não somar essas simulações às duas gravações reais do lote1.
- Logo, imagens do card, fechamento Escape/fundo, resultado antigo após nova seleção, D3 e matriz responsiva: **não concluídos no navegador desta rodada**. Preservados os testes sintéticos complementares e aceites anteriores sem convertê-los em nova cobertura real.
- Ao iniciar o cenário de logo, o seletor de arquivos falhou: `Timed out after 3000ms waiting for file chooser.; kernel reset`. Uma única recuperação de aba via `getTab('4')` retornou `js execution timed out; kernel reset, rerun your request`. A interação foi interrompida, sem navegador externo, nova operação automática ou atribuição à aplicação/RAM/Backend. A seleção do arquivo da logo não foi concluída e nenhum resultado desse cenário foi assumido.

Evidências incrementais: `editor-browser-progress.json`, `editor-invalid-file.png`, `editor-upload-pending.png`, `editor-build.log`, `harness-build.log`, `deployed-contract-read.json`. A confirmação final do controlador/aba fica pendente de disponibilidade; não repetir recuperação indefinidamente. Servidores desta tarefa DEV PID9368 e preview compilado PID328 foram encerrados após verificar seus comandos; demais servidores preservados.

**Estado funcional:** lote2 preparado, não encerrado funcionalmente e não publicado. Backend real e validação integrada ainda necessários. Solicitação objetiva em `docs/showcase-backend-handoff.md`, não enviada. Avançar apenas no trabalho independente do lote3; não ativar capacidade nem promover mock para compensar o bloqueio.

## Preparação independente do lote3

Repositório público operacional `giallanzah/loor-capital-suite`, branch isolada `feature/public-showcase-wl6-v1` em `C:/Users/User/Desktop/Loor/worktrees/public-showcase-wl6-v1`, baseline `1112321794bc58a080fe7d47664e6679ef52ede8`. Consulta Netlify confirmou Homolog LOØR/site200662bc e Laguna Investor/sitec81bad49 vinculados a dev; os demais destinos desse repositório usam main, fora do escopo. Nenhum push em dev ou alteração de configuração foi feito.

Renderer adaptado ao DTO público, rota `/vitrine` antes do catch-all, preservando BASE_PATH, wallet prefix e autenticação. Gate por flag explícita, API canônica, slug homologacao e hostname homolog.loor.vc; flag ausente bloqueia. Sem editor/admin/fixtures no runtime público. URLs temporárias renovadas por GET limitado, inclusive na mesma revisão; erro/ausência sem conteúdo fictício.

Checks públicos:37 do contrato,12 do loader e9 de renderização SSR, TypeScript real do app, build e diff-check passaram. Build usou a configuração candidata apenas no processo local, sem publicar. Bundle `main-BTpMbNa-.js`, SHA256 `74C3267559A51AF5B25C70BE4DA9F7E56ED5200340ECF8A14ABB2A2FAE418F2C`. Documentação e limites em `docs/whitelabel-showcase-public-v1.md` desse worktree; logs `public-*.log` no diretório de evidência desta frente.

A composição aprovada e assets vieram seletivamente de `demo/whitelabel-showcase-handoff@aae5a910aab27fc71ceead1225bba9f1a574b68e`, preservado limpo. Não promover essa branch integralmente. Nenhuma nova imagem gerada, licença de fontes preservada. A publicação do editor deverá preceder a página pública após Backend real e validação integrada; o trabalho independente do lote3 não equivale a encerrar funcionalmente o lote2.

## Fechamento da preparação — 10/11/2026

**Todos os51 scripts mantidos `check-*.mjs` do Super Admin passaram:**47 no runner consolidado, CRUD69 executado separadamente e três novos checks da vitrine (32 contrato/transporte,151 navegação/guards,59 fronteira). TypeScript, lint, build e diff-check passaram. Lint preserva dois avisos em arquivos existentes não alterados. Resultados e horários por script em `tmp/whitelabel-crud-showcase-20261110/maintained-checks/results.json`; não confundir número de scripts com número de asserções.

O novo manifesto fixa66 arquivos da integração e do módulo (seis compartilhados e60 do módulo, incluindo assets/procedência); textos normalizados LF e binários por bytes. Manifests históricos e23 IDs de Menu Visibility preservados. Não há exceção genérica por pasta: mudanças futuras ou novos arquivos fora da lista falham. Revisões independentes não encontraram bloqueador concreto nos gates, rotas, logout, DTO, loader público ou isolamento CSS. Harness/testes não fazem parte da entrada/build operacional; marcadores do harness ausentes do dist oficial inspecionado.

O catálogo `assets/ASSETS.md` permanece como registro de procedência do mock original, inclusive seus comandos históricos. Nesta adaptação, fotografias e logos CONECTA/IMPULSO não são importados pelo runtime: as referências estão somente no harness explícito em scripts. Exemplares preservados no repositório não representam dados salvos nem fonte canônica; o build operacional utiliza a configuração real e resolve a mídia pelo serviço. Header/footer/fontes aprovados continuam compartilhados pela apresentação.

Preparação pública registrada no commit `8d27d4fbabe2efcd3d8c052c6f0f731c1d4c4372`, branch `feature/public-showcase-wl6-v1`. Apenas branches de preparação serão enviadas; não integrar dev nem habilitar flags enquanto os bloqueios funcionais persistirem. O recibo final de Git, incluindo SHA local/remoto de ambos os repositórios, será preservado em `C:/Users/User/Desktop/Loor/tmp/whitelabel-crud-showcase-20261110/git-final.json` e no contexto permanente após o envio. Nenhum workflow versionado `.github/workflows` foi encontrado nesses dois baselines; a configuração Netlify consultada limita builds de branch a dev. Não criar PR.

**Estado por lote:**1 concluído no deploy existente;2 e3 preparados com checks locais, não encerrados funcionalmente e não publicados. Mutações reais permanecem somente1 POST de White Label e1 PATCH de nome, registroQA9 preservado. Testes locais interceptados não são gravações no Backend. Flags remotas, deployments, main, produção, Laguna, participantes e demais worktrees não foram alterados por esta preparação.

**Próxima ação concreta:** Backend implementar/publicar o contrato acordado e informar SHA/configuração efetivos (handoff anexo, sem envio externo). Com o serviço disponível e controlador integrado funcional, confirmar gates reais, documento/CAS, mídia/URLs e completar as verificações de upload/responsividade; depois publicar editor e página pública em sequência pelo fluxo autorizado. Não reabrir CRUD concluído nem testes de participantes. Não exigir nova autorização geral para o escopo já concedido, mas não tratar ausência de evidência como segurança para publicar.
