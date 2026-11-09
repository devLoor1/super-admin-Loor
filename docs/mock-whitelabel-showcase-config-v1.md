# Vitrine de White Labels — protótipo configurável (mock)

**Etapa 2 · 06/11/2026 · branch local `feature/mock-whitelabel-showcase-config-v1` sobre `405bd704468c12b1e21bc88d5f3372bcd3418cf7` (`origin/mock`).** Protótipo **offline e simulado**. Nenhuma API operacional, upload real, banco, Backend ou publicação. Nada aqui comprova contrato, persistência ou autorização reais.

Referências aprovadas: `design-output/configurable-whitelabel-showcase-proposal-20261105/` (PROPOSTA, MAPA-FUNCIONAL-E-DEPENDENCIAS, COMPORTAMENTO-E-MIDIA, EVIDENCIAS-E-BASELINES e os quadros `visuals/01`–`07`). Vitrine aceita: `FRONT-WEB/src/views/mock/whitelabels/` (somente leitura).

## Rotas

| Rota | Conteúdo |
| --- | --- |
| `#/whitelabels/4/settings` | Configurações (leitura do mock) da fixture **Homolog Loor · Demo**; bloco **Plataforma → Vitrine de White Labels**, visível somente para o proprietário mapeado. |
| `#/whitelabels/4/settings/plataforma/vitrine?aba=banner\|introducao\|cards` | Editor da vitrine (padrão: `cards`). |
| `#/whitelabels/4/settings/plataforma/vitrine/cards/<instanceId>` | Editor de um card. `?campo=<id>` foca um campo pendente. |
| `#/mock/vitrine-publica/4` | Projeção pública **simulada**: somente a última versão salva. Não exige sessão. |
| `#/mock/vitrine-publica/4?versao=rascunho` | Página completa do rascunho da aba (exige sessão de leitura). |
| Qualquer outro tenant (ex.: `1`, `6`, `wl_proto_01`) | “Indisponível neste contexto”, sem carregar dados. |

A galeria **MOCK · dados sintéticos · telas** inclui os dois atalhos e o seletor **Ambiente simulado da Vitrine** (Homologação / Outro ambiente).

## Mapeamento de simulação (WL6 → fixture)

`src/features/whitelabel-showcase/showcaseMapping.ts` é o único ponto de tradução. O alvo lógico aprovado é **Homolog Loor · WL6 · `homologacao` · ambiente homolog**. No mock ele é representado pela linha fictícia **#4 · `homolog-loor-demo` · “Homolog Loor · Demo”** (domínio `.example.invalid`), acrescentada em `src/mock/mockFixtures.ts` depois das carteiras, sem contas, oportunidades ou dados financeiros. O ID 6 e o slug `homologacao` reais **não** existem na base do mock. Digitar `homologacao` na busca por slug é traduzido para a fixture e o card guarda as duas identidades (`source.whitelabelId/slug` mock + `source.logical`). O mapeamento não é contrato de API, resolvedor de tenant nem autorização.

Três identidades permanecem separadas: **proprietário da configuração** (`document.owner`, lógico WL6), **origem do card** (`card.source`) e **instância** (`card.instanceId`, UUID v4).

## Arquitetura

```text
src/features/whitelabel-showcase/
  showcaseModel.ts          documento versionado (PROPOSTA), operações puras, cores, restauração
  showcaseValidation.ts     regras de salvamento e pendências por aba/card/campo
  showcaseMarkdown.ts       parser do Markdown limitado → dados (sem HTML)
  showcaseAccess.ts         gates de apresentação (contexto, papéis); não é autorização
  showcaseMapping.ts        mapeamento WL6 → fixture #4, rotas da família da vitrine
  showcaseMedia.ts          registro de mídia da aba, validação de upload, blob: e liberação
  showcaseRepository.ts     PERSISTÊNCIA SIMULADA (único adapter a substituir na integração)
  showcaseStore.ts          rascunho editorial da aba, salvar/conflito/leitura de conferência
  showcaseSourceLookup.ts   busca por slug: adapter EXISTENTE findWhitelabelBySlug + defaults simulados
  showcaseSimulation.ts     controles do mock (ambiente, próximos resultados)
  fixtures/                 semente (refs), defaults simulados, registro dos assets aprovados
  editor/                   telas do Super Admin (abas, card, diálogos, prévia, guarda de saída)
  public/                   renderizador da vitrine portado do FRONT-WEB + página pública simulada
  assets/                   cópias byte a byte dos assets aprovados (ASSETS.md com SHA-256)
```

Arquivos existentes alterados (mínimo): `src/app/App.tsx` (duas rotas), `src/mock/MockApp.tsx` (+ `.module.css`: rota pública, atalhos, seletor de ambiente), `src/mock/mockFixtures.ts` (fixture #4), `src/features/whitelabel-settings/OperationalSettingsPage.tsx` (entrada Plataforma), `src/app/presentationAvailability.ts` (novas views como mock-only), `src/styles/global.css` (fundo escuro das novas views), `package.json` (`check:mock` inclui `scripts/check-mock-showcase.mjs`), `MOCK.md`. Dependências e lockfile inalterados.

### Renderizador e prévia

`public/ShowcaseView.tsx` porta `WhitelabelShowcase.tsx` dirigido pelo documento: hero com texto/CTAs fixos, nova seção introdutória entre hero e cards, cards, fechamento, header/footer e diálogos demonstrativos. Preservados: geometria, sombras, trapézio, divisor, autoplay 5 s/crossfade 600 ms após decodificação, pausas (hover, foco, aba oculta, fora da tela, explícita), reduced motion, parallax 6 px, dots/teclado/swipe e hero manual. Adaptações: uma imagem → imagem estática sem região de carrossel, dots, pausa ou anúncios (banner e cards); IDs/keys por `instanceId`; ícones `lucide-react`; âncoras internas rolam dentro da vitrine (o roteador usa hash); níveis de título deslocados nas prévias e `<main>` só na página completa.

A CSP proíbe frames, então a prévia é DOM no mesmo documento. `public/showcase.css` tem todas as regras escopadas em `.wl-showcase` via `:where()` (mantém as especificidades originais), e os breakpoints viraram **container queries** sobre `.wl-page` (unidades `vw` → `cqw`). A prévia renderiza em largura lógica (1280 desktop / 390 mobile) e é reduzida visualmente (`transform: scale`) quando o painel é menor, de modo que a composição responde à largura realmente renderizada.

## Persistência simulada e reinício

- **Rascunho:** memória da aba (`showcaseStore.ts`). Sobrevive à navegação entre editor, card, página do rascunho e versão salva simulada, sem confirmação. Sair da família da vitrine com alterações pede confirmação e descarta (somente perfil de edição; um perfil sem edição não descarta nada, então não é perguntado). **Recarregar ou fechar a aba** perde o rascunho: enquanto ele diferir da versão salva, o navegador pergunta antes **em qualquer tela da aba** — a proteção acompanha o rascunho (`installDraftUnloadProtection`, instalada uma vez em `MockApp`), não a tela exibida. Não há `localStorage`, persistência real nem salvamento automático.
- **Logout:** o rascunho já aplicado continua na memória da aba depois do logout (inclusive ao entrar com outro perfil na mesma aba). Campos editados no card e ainda não aplicados seriam perdidos: com eles, “Sair” pergunta **antes** de limpar a sessão; cancelar mantém sessão, rota e valores; confirmar descarta só esses campos e sai. Sem campos pendentes, o logout é imediato.
- **Versão salva × rascunho:** a rota `#/mock/vitrine-publica/4` mostra somente a versão salva na simulação (revisão N). Se houver rascunho pendente na aba e a sessão puder consultá-lo, uma segunda faixa informa que ele existe, que não aparece ali e que recarregar ou fechar o descarta, com link para a prévia do rascunho (`?versao=rascunho`).
- **Limites do navegador:** o texto e a aparência do aviso de recarga/fechamento são do navegador e não podem ser personalizados; navegadores podem omiti-lo sem interação prévia do usuário com a página ou quando a recarga é disparada por automação. Voltar/Avançar dentro da família não pergunta (nada se perde). Na página pública simulada, que fica fora do roteador do shell, Voltar/Avançar para fora da família também não pergunta: o rascunho continua na memória da aba e reaparece no editor; a recarga posterior continua protegida.
- **“Salvar alterações”:** envia o documento **completo** ao repositório simulado com a revisão esperada. Sucesso informa “salva na simulação local (revisão N). Nenhum servidor foi contatado”.
- **Card:** “Aplicar ao rascunho” leva as alterações locais do card ao rascunho; nada é salvo até “Salvar alterações”.
- **Uploads:** o arquivo escolhido fica no navegador e é exibido por `blob:` (`upload-simulado:<uuid>`). Nada é transmitido, serializado ou convertido em Base64. URLs são revogadas quando nenhuma versão salva, rascunho ou editor aberto as referencia.
- **Reiniciar (intencional):** recarregar a página ou usar **Restaurar dados da demonstração** na galeria MOCK. Volta a semente (revisão 1, CONECTA e IMPULSO, introdução aprovada) e os defaults simulados. Com rascunho pendente, o navegador pergunta antes; confirmar descarta o rascunho de propósito. Sem rascunho pendente, o reinício é imediato.

## Comportamentos demonstráveis

1. Entrar: Plataformas → Whitelabels → Homolog Loor · Demo → ação rápida **Configurações** (abre `#/whitelabels/4/settings`) → bloco **Plataforma · Vitrine de White Labels** (ou atalho da galeria). A ação rápida segue a mesma regra do bloco: perfil de leitura, fixture mapeada e ambiente simulado homolog; nos demais casos mantém o aviso anterior.
2. Banner: adicionar (arquivo JPG/PNG ou exemplo aprovado), substituir, remover, reordenar (arrastar pela alça ou setas), texto alternativo ou “Decorativa”; prévia desktop/mobile e exemplo com uma imagem.
3. Introdução: título, subtítulo opcional, Markdown com barra (negrito, itálico, lista, link), pendências por linha; remover e readicionar a seção.
4. Cards: lista vazia; adicionar por slug (`homologacao`, `finapop-demo`, `loor-demo`, `nova-plataforma-demo`), repetir a mesma origem, editar título interno, nome exibido, descrição, cores, logo (e seu alt sugerido pelo nome), 1–4 fotos; mover pelo menu ou arrastando; remover com confirmação.
5. Defaults: `nova-plataforma-demo` traz defaults completos simulados (logo copiado para o proprietário); `finapop-demo` parciais; proprietária e `loor-demo` sem defaults. “Restaurar padrões da origem” consulta de novo, lista campos e afeta só o card.
6. Estados: busca carregando, slug não encontrado, falha de consulta (mensagem própria), busca inconclusiva, origem inativa, imagem ausente, configuração incompleta (salvar explica e leva ao campo), falha ao salvar, resultado incerto conferido por leitura, conflito (rascunho preservado, sem sobrescrita), somente leitura, contexto indisponível.
7. Página pública simulada (versão salva) e página completa do rascunho.

Controles da simulação (painel no fim do editor): próximo salvamento (sucesso, falha, incerto aplicado/não aplicado), próximo envio de arquivo, próxima busca, “Simular edição em outra sessão” (gera conflito real de revisão) e “Simular nova versão do branding de nova-plataforma-demo”. São comandos de escrita da simulação: exigem o perfil de edição na própria função chamada (`setNextOutcomes`, `simulateConcurrentEdit`, `simulateSourceBrandingChange`); para READ_ONLY o painel fica em modo de consulta (revisão salva visível, controles desabilitados e recusados se acionados). O seletor **Ambiente simulado** da galeria MOCK é seletor de contexto (como o perfil de login): não altera documento, revisão, rascunho nem defaults. Origem inativa: desativar a White Label em Plataformas → Whitelabels (comando local do mock; o transporte recusa escrita de READ_ONLY) e voltar à vitrine.

## Regras e decisões do protótipo (a alinhar; não são contrato Backend)

| Tema | Comportamento simulado |
| --- | --- |
| Origens elegíveis | Somente origens **ativas** com slug **exato**, inclusive a proprietária. Busca incompleta nunca vira “não encontrado”. Origem que ficar inativa preserva as personalizações e mostra aviso; restaurar fica indisponível. O resultado pertence ao slug pesquisado: alterar o slug descarta o resultado e a busca pendente; resposta antiga não substitui a mais recente; “Adicionar card” só usa resultado elegível do slug atual. A mesma origem válida pode ser repetida em cards independentes. |
| Defaults | Logo, paleta e descrição vêm de fixture simulada. Nome exibido e título interno iniciam com o nome cadastrado (campo real do contrato de leitura). Mudanças posteriores da origem não sobrescrevem cards. Fotos nunca são copiadas. |
| Logo canônico | Copiado como **nova referência do proprietário** (`copia-proprietario:*`), com origem/versão anotadas — modelo da cópia ou versão imutável proposta, não capacidade comprovada. |
| Mídia | 1–4 imagens por contexto; PNG/JPEG, não vazio, ≤ 20 MiB, assinatura compatível (premissa do pipeline de imagens de entrada, ainda não qualificada para a vitrine). Proporção e resolução só orientam. |
| Acessibilidade | Imagem informativa exige texto alternativo; imagem marcada como decorativa usa alt vazio. Alt do logo sugerido pelo nome exibido e editável. Aviso (não bloqueio) de contraste < 4,5:1 no painel. |
| Markdown | Parágrafos (quebras preservadas), negrito, itálico, listas simples, links HTTP(S) com texto. HTML, imagens, títulos, tabelas, código, citações e listas aninhadas são apontados e exibidos como texto. Mesmo parser no editor e na página. |
| Salvamento | Documento completo, configuração válida e ao menos um card válido. Rascunho incompleto continua editável e explica as pendências. Conflito: rascunho preservado, sem sobrescrita forçada; recarregar a versão atual. Resultado incerto: leitura de conferência antes de permitir novo envio. |
| Papéis | Mesmos papéis do mock. Leitura: SUPER_ADMIN e READ_ONLY (regra existente de leitura de Settings). Edição/salvamento: SUPER_ADMIN, conferido nas funções que alteram estado — rascunho, descarte, salvamento, upload, comandos da simulação e mudança simulada de branding da origem — e não só nos controles. Consulta (versão salva, prévia, largura da prévia, seletor de contexto) continua disponível. SUPPORT_ADMIN: sem acesso. Os editores legados não foram alterados. É proteção simulada de frontend, não autorização Backend. |
| Contexto | Disponível só para a fixture mapeada no ambiente simulado homolog, por navegação e por URL direta. O bloqueio definitivo precisa existir no servidor. |
| Responsividade | Mesmos breakpoints e declarações da vitrine aprovada (1320/1150, 1149, 700), avaliados pela **largura útil** de `.wl-page` (container query), na página completa e nas prévias. Detalhe na seção “Pendências D2, D3 e upload”. |
| CTAs | Demonstrativos (diálogos), como na vitrine aceita. Sem ilustração na V1. |
| Texto longo | Sem limite artificial de caracteres. Palavras, URLs e tokens sem espaço quebram dentro da geometria aprovada (`overflow-wrap: anywhere` nos textos configuráveis; mínimo zero nas trilhas dos cards). Limites reais de texto/payload dependem do Backend. |

## Verificação

`npm run check:mock` inclui `scripts/check-mock-showcase.mjs`: identidade/repetição/ordem, defaults e restauração, mídia 1–4, validação, Markdown, gates, repositório/rascunho/conflito/leitura de conferência, upload, escopo do CSS e hashes dos assets aprovados, mais as regressões da Etapa 3 (seção abaixo). Não usa rede nem navegador e não monta componentes React. Validação no navegador e build local ficam com o Codex.

## Etapa 3 — correções da revisão local de 06/11/2026

Referência: relatório do Codex `design-output/configurable-whitelabel-showcase-proposal-20261105/stage2-review-20261106/REVIEW-STAGE2.md` (preservado; evidências originais não foram alteradas). Somente os quatro problemas autorizados foram tratados.

| Achado | Causa | Correção | Regressão |
| --- | --- | --- | --- |
| **B1** READ_ONLY alterava a versão salva pelos controles da simulação | `SimulationPanel` exibia os comandos a todos os perfis e `simulateConcurrentEdit`, `simulateSourceBrandingChange` e `setSimulation` gravavam sem conferir ator; `discardDraft` e `ingestUpload` também não conferiam. | Guarda `assertCanEdit(actor)` nessas funções; `setSimulation` dividido em `setSimulatedEnvironment` (contexto) e `setNextOutcomes(actor, …)`; upload consome o resultado simulado só depois da guarda; painel em modo de consulta para READ_ONLY. | Doze tentativas de escrita READ_ONLY (simulação, descarte, introdução, cards) + salvamento + upload recusados, com documento, revisão, snapshot, rascunho, resultados simulados e defaults da origem idênticos; transporte recusa desativar origem por READ_ONLY; controle positivo SUPER_ADMIN. |
| **B2** Rascunho perdido ao recarregar a versão salva | A proteção de recarga dependia da tela: `PublicShowcasePage` só a ativava na prévia do rascunho (`showDraft && isDraftDirty`). | `installDraftUnloadProtection` instalada uma vez em `MockApp`, decidida apenas pelo rascunho; telas só acrescentam estado local (campos de card não aplicados). Faixa na versão salva informa o rascunho pendente. | Cenário registrado (subtítulo editado → rascunho → versão salva → recarga) pede confirmação; navegação dentro da família não pergunta; sair pergunta (perfil de edição); descarte e salvamento liberam a recarga. |
| **B3** Texto contínuo longo expandia toda a coleção | Trilhas `fr` e itens de grade com mínimo automático (min-content) e parágrafo do card sem quebra: um token definia a largura de todos os cards. | Mínimo zero nos itens de `.wl-platforms`, `.wl-platform`, `.wl-platform-info`, `.wl-platform-details`; `overflow-wrap: anywhere` na descrição do card e no diálogo demonstrativo; no editor, linha do card, chip do título interno e lista de restauração. Proporções e formas mantidas. | Verificação estática das regras (não prova layout). Medição no navegador pendente com o Codex. |
| **D1** Resultado antigo continuava adicionável após editar o slug | O diálogo guardava o slug digitado e o resultado separadamente; “Adicionar card” usava o último resultado encontrado. | Sessão de busca pura (`editLookupInput`, `startLookup`, `receiveLookup`, `eligibleLookupSelection`): resultado amarrado à consulta normalizada, invalidação ao editar, respostas de tentativas superadas ignoradas, inclusão só com resultado elegível do slug atual. | A encontrado → B; entrada vazia e inexistente; resposta tardia de A depois de B e durante B; inativa, não encontrada, falha, inconclusiva e resultado de outro slug nunca adicionáveis; origem repetida em cards independentes. |

Demais achados mantêm o status do relatório: **D2** (entrada pela ação rápida da lista termina no toast legado) e **D3** (limiar de 700 px pela largura útil do contêiner) continuam abertos; refinamentos recomendados (densidade desktop, identificação “Homolog Loor” + Demo, carregamento de imagens por proximidade, posição do badge MOCK, corrida no fechamento do upload) não foram tratados nesta etapa.

### Complemento da Etapa 3 — revalidação local de 06/11/2026

Referência: `design-output/configurable-whitelabel-showcase-proposal-20261105/stage3-revalidation-20261106/REVALIDACAO-ETAPA3.md` (preservado). B1 e D1 foram encerrados naquela revalidação e não mudaram. B2 e B3 tinham uma lacuna cada; continuam **pendentes de confirmação local**.

| Achado | Causa remanescente | Correção | Regressão |
| --- | --- | --- | --- |
| **B2** logout com campos do card não aplicados | “Sair” (`TopHeader`) chamava `logout()`, que limpa a sessão antes da troca de rota; o editor desmontava sem consultar a guarda, que só via links, histórico e unload. | Guarda de logout **opt-in** em `src/app/prototypeNavigation.ts` (`registerPrototypeLogoutGuard`, `requestPrototypeLogout`); o menu do shell passa por ela e, sem guarda registrada, o logout continua imediato. Só o editor de card registra (`useShowcaseLeaveGuard`, terceiro parâmetro), perguntando apenas quando há campos não aplicados (`cardLogoutPrompt`). Confirmar descarta somente esses campos; o rascunho aplicado permanece (política em memória). | Node: logout retido com sessão/rota/campo intactos; texto do aviso; cancelar; confirmar (sessão encerrada, `#/login`, campo descartado, rascunho aplicado preservado); editor sem alterações e telas sem guarda saem sem confirmação. |
| **B3** título do shell na rota do card | O `h1` compartilhado usa `white-space: nowrap` e mínimo automático; “Editar card · <nome contínuo>” alargava a página (2446/1425 px em 1440). | Regra opt-in em `editor/ShowcaseEditor.module.css`, limitada a `html[data-view^='settings-showcase']`: o título completo encolhe até a coluna e quebra dentro de palavras só quando a linha não cabe. Demais telas mantêm o padrão do shell. | Verificação estática de presença e escopo (não comprova ausência de overflow; medição com o Codex). |

### Roteiro de revalidação (Codex)

1. Locais: `npm run check:mock`, `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check`, `git status --short --branch`.
2. **B1:** `readonly@example.invalid` → editor #4 → Controles da simulação: controles desabilitados com nota; revisão continua 1; página pública salva sem “(editado em outra sessão)”. Repetir com SUPER_ADMIN: comandos funcionam.
3. **B2:** SUPER_ADMIN → editar subtítulo → Página completa (rascunho) → `#/mock/vitrine-publica/4` (faixa azul de rascunho pendente) → recarregar: aviso nativo; Cancelar mantém o rascunho. Repetir no editor, no card (campo não aplicado) e com “Restaurar dados da demonstração”. Voltar/Avançar entre editor, rascunho e versão salva sem confirmação; link para fora pede “Descartar e sair”.
4. **D1:** Adicionar card → `finapop-demo` → Buscar → trocar para `nao-existe-qa` sem buscar: resultado some e “Adicionar card” fica desabilitado. Buscar `finapop-demo` e, durante o carregamento, trocar para `nova-plataforma-demo` e buscar: resultado final Nova Plataforma. Adicionar duas vezes `homologacao`: duas instâncias.
5. **B2 (complemento):** card CONECTA → editar descrição sem aplicar → menu do usuário → Sair: aviso “Sair com alterações não aplicadas neste card?”; Continuar editando mantém sessão, rota e valor; Sair → “Descartar alterações do card e sair” leva ao login; entrar de novo (inclusive READ_ONLY) mostra a descrição do rascunho, e um rascunho aplicado antes continua. Sem alterações no card, Sair é imediato.
6. **B3 (título):** nome exibido contínuo longo → rota do card em 1440, 390 e 320 px e com a prévia mobile no desktop: `scrollWidth` = `clientWidth`, título completo quebrado dentro do cabeçalho, controles e trilha utilizáveis; título normal (“Editar card · CONECTA”) inalterado; outras telas sem mudança.
7. **B3:** descrição curta de CONECTA = `https://example.invalid/` + 30 × `texto` (sem espaços) e, em outro card, nome exibido sem logo com token longo → Aplicar → público rascunho em 1440 e 390 (e 320): `scrollWidth` = `clientWidth`, cards na largura do contêiner, texto quebrado dentro do painel; prévia mobile 390 no editor em viewport desktop; diálogo “Conhecer plataforma”; lista de cards e diálogo de restauração no editor. Conferir que conteúdo normal mantém a geometria aprovada.

## Pendências D2, D3 e upload — 06/11/2026

Referência: `design-output/configurable-whitelabel-showcase-proposal-20261105/stage3-complement-revalidation-20261106/REVALIDACAO-COMPLEMENTO-ETAPA3.md` (preservado). B1, B2, B3 e D1 permanecem encerrados e não foram reabertos. As seções anteriores desta página continuam como registro das rodadas em que foram escritas.

### D2 — ação rápida da lista de White Labels

- **Causa:** em `features/whitelabels/WhitelabelDetailPanel.tsx`, todas as ações rápidas (Configurações, Administradores, Aplicações, Integrações, Indicadores, Contas) só exibiam o aviso “ainda não está integrada ao Control Plane”, inclusive para a fixture mapeada.
- **Correção:** somente a ação **Configurações** passa a abrir `#/whitelabels/4/settings` quando `showcaseSettingsEntryHref` permite: mesma regra do bloco Plataforma (perfil SUPER_ADMIN ou READ_ONLY, fixture #4 com slug `homolog-loor-demo`, ambiente simulado homolog). As outras ações, os outros registros, o outro ambiente e perfis sem leitura (SUPPORT_ADMIN) mantêm o aviso. READ_ONLY chega às configurações e à vitrine em consulta; nenhuma edição é liberada (as guardas de escrita não mudaram). Nenhum ID real é mapeado.
- **Não alterado:** o link lateral “Config. do Whitelabel” (navegação compartilhada) continua com o destino anterior; não fazia parte desta pendência.

### D3 — limiar de 700 px

Comparação de `public/showcase.css` com `FRONT-WEB/src/views/mock/whitelabels/showcase.css` (somente leitura): os três blocos responsivos têm as **mesmas condições e as mesmas declarações** (6, 23 e 51 regras); as diferenças são nomes de seletor (títulos com nível deslocado nas prévias) e as regras novas da introdução. A única diferença é a base de avaliação:

| Superfície | Aprovada (FRONT-WEB) | Protótipo |
| --- | --- | --- |
| Página completa (pública/rascunho) | `@media`: largura da viewport, **incluindo** a barra de rolagem clássica | `@container`: largura útil de `.wl-page` (viewport − barra) |
| Prévia desktop | — | 1280 lógicos, sem barra → foto visível, igual à aprovada em 1280 |
| Prévia mobile | — | 390 lógicos → foto oculta, igual à aprovada em 390 |
| Menu móvel do cabeçalho | fecha por `matchMedia(min-width: 1150px)` | fecha por medição da largura do cabeçalho (≥ 1150), mesma base dos estilos |

**Qualificação:** coerente; o CSS não foi alterado. Cada largura útil recebe exatamente a composição aprovada para aquela largura, todos os limiares usam a mesma base (sem estado misto) e as prévias, que não têm barra de rolagem, coincidem com a referência. Com barra de sobreposição (celulares, macOS padrão) os limiares são idênticos aos aprovados. Com barra clássica de largura *s* (15 px no navegador integrado), a página completa troca de composição em 700 + *s*, 1149 + *s* e 1320 + *s* px de viewport — a faixa observada pelo Codex (viewport 701–715 → foto oculta). Nessa faixa a composição mostrada é a aprovada para o espaço realmente disponível, sem espaço vazio no hero.

Se Produto exigir o limiar literal pela viewport na página completa, seria preciso duplicar os blocos responsivos em `@media` só para ela, mantendo as container queries nas prévias — mudança maior que uma correção mínima e decisão de Produto, não aplicada aqui.

### Upload em andamento

- **Reproduzido (DOM emulado na nuvem, com decodificação simulada; não é navegador):**
  1. Fechar o seletor (X, Escape ou fundo) durante o processamento: o resultado tardio ainda era aplicado — uma imagem aparecia no banner depois do fechamento.
  2. Substituir a imagem 1 por um arquivo, fechar, reabrir e escolher um exemplo aprovado: o upload abandonado chegava depois e **sobrescrevia** a escolha válida.
  3. Arquivo ilegível (falha de leitura): erro não tratado e seletor preso em “Enviando…”, com botões desabilitados.
- **Causa:** `MediaPickerDialog` entregava o resultado de `ingestUpload` sem verificar se o seletor continuava aberto ou se outra escolha já fora feita (o callback usava o estado do momento da abertura), e só tratava o erro de permissão.
- **Correção (mais simples compatível):** contador de tentativas por seletor (`createUploadAttempts`) e `runUploadAttempt` em `showcaseMedia.ts`. Fechar o seletor ou escolher um exemplo invalida a tentativa pendente; só a última tentativa de um seletor aberto entrega resultado; a referência `blob:` não entregue é liberada; qualquer falha termina em mensagem de erro. A imagem anterior só muda quando uma substituição válida é entregue. Sem dependência nova nem armazenamento.
- **Não confirmado:** duas seleções de arquivo no mesmo seletor ao mesmo tempo não são possíveis pela interface (botões desabilitados durante o envio); a regra “última tentativa vence” cobre o caso nas verificações Node.

### Verificação desta rodada

- Node (`check:mock`): 526 verificações da vitrine (+22): matriz de contexto/papel da ação rápida; conjunto de breakpoints igual ao aprovado (estática); tentativas de upload — controle aplicado, seletor fechado, substituída por exemplo, A tardio depois de B, última tentativa vence, ciclo do StrictMode, falha esperada, arquivo ilegível pelo `ingestUpload` real, READ_ONLY recusado.
- Nuvem, complementar (DOM emulado, fora do repositório): antes/depois de D2 e dos três cenários de upload. Sem medição de layout; D3 depende do navegador do Codex.

### Roteiro de revalidação (Codex)

1. Rodar `check:mock`, `typecheck`, `lint`, `build`, `git diff --check` e `git status`.
2. **D2:** `#/whitelabels?id=4` como SUPER_ADMIN → Configurações → `#/whitelabels/4/settings` com o bloco da Vitrine. Repetir como READ_ONLY: abre em consulta e a vitrine continua somente leitura. Com `?id=1`, com Outro ambiente na galeria ou como SUPPORT_ADMIN: o aviso anterior continua. As outras ações rápidas não mudam.
3. **Upload:** Banner → Adicionar imagem → escolher PNG e fechar com X ou Escape antes de concluir → nenhuma imagem nova. Substituir imagem 1 → escolher arquivo → fechar → reabrir → escolher exemplo → a imagem 1 continua o exemplo. Upload normal com o seletor aberto continua funcionando. No logotipo do card, repetir fechar durante o envio.
4. **D3 (medição):** página pública em 700, 701, 715 e 716 px de viewport, anotando a largura útil de `.wl-page`: a foto aparece acima de 700 px **de largura útil**. Prévias desktop/mobile do banner no editor: foto visível em Desktop e oculta em Mobile.

## Dependências para a integração real

Contrato canônico de branding (logo, paleta, descrição) e sua projeção; capability/schema da vitrine em Settings com revisão esperada e conflito atômico; slots/associações múltiplas de mídia para banner, fotos e logo, cópia/versão imutável de logo entre tenants, retenção e limpeza de órfãos; autorização por proprietário, papel e ambiente em leitura, escrita, referências de mídia e projeção pública; projeção pública allowlisted e consumidor no repositório público operacional (`giallanzah/loor-capital-suite`), incluindo o renderer Markdown seguro; política de elegibilidade de origens e de CTAs reais; limites de texto/payload e desempenho com muitos cards (carregamento por proximidade).
