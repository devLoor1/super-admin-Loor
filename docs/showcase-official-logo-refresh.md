# Renovação automática de logos oficiais — editor

Implementação de 14/11/2026, isolada em `feature/showcase-logo-refresh`, sobre `4d9e8d53eaa7802c2e542ea3112b41c55f899736`. A atualização automática, inclusive quando a fonte mantém a URL e muda os bytes, é requisito autorizado; não é decisão de produto pendente.

## Comportamento

- O vínculo editorial continua somente `kind: official`, source, variantId e alt. `custom`, assetRef, CAS, revisão e conteúdo permanecem intactos. Não há migração, upload, copy, novo endpoint ou armazenamento durável de imagens.
- Editor de card e prévias compartilham um GET de renovação com cooldown de 60 segundos; a página oculta não inicia consultas. Foco/online/retorno respeitam o mesmo cooldown. A resposta alimenta somente o registro transitório de logos oficiais, sem adotar revisão ou conteúdo de outro operador e sem substituir mídia personalizada.
- Uma seleção ainda não salva renova sua fonte pelo mesmo cadastro canônico e manifesto já suportados; somente bindings ativos são consultados. O seletor aberto também renova a descoberta. Consultas são agrupadas por origem; mudança de sessão, consulta mais nova, fechamento e abort descartam resultados tardios.
- O módulo `src/features/official-logo-refresh/officialLogoRefresh.ts` é idêntico ao consumidor público. Revalida HTTP com `cache: no-cache`, `credentials: omit` e sem Referer; lê bytes com CORS, calcula SHA256 e decodifica antes de trocar a URL Blob efêmera. A mesma URL com digest diferente troca a imagem sem gravar o documento. Há deduplicação por URL, retenção por consumidores, abort e revogação de URLs na liberação.
- O intervalo de 60 segundos é cadência do consumidor; o resolver possui seu próprio cache histórico 60s/15s. Não se promete atualização instantânea. Timeout de 10s e orçamento de leitura de 5MiB são limites defensivos de recurso no navegador, não novo contrato de upload ou Backend.
- Falha HTTP/CORS/decode mantém a última imagem carregável e marca a atualização como `unverified`. O editor informa que não conseguiu verificar a atualização; isso não equivale a confirmar frescor. Logos indisponíveis continuam sem fallback para outra marca. Fontes futuras precisam suportar a leitura CORS para garantia de bytes sob a mesma URL.

## Validação e limitações

`scripts/check-official-logo-refresh.mjs` exercita o módulo físico com bytes/relógio/transporte controlados: hash A→B na mesma URL, bytes iguais, cooldown, deduplicação, visibilidade, falhas, abort e limpeza. Não altera o relógio do sistema nem marcas reais.

`scripts/check-showcase-official-logos.mjs` preserva a matriz anterior e acrescenta renovação do GET sem alterar rascunho/revisão/CAS/custom, resposta tardia após sessão/reload/abort, ciclo visível e renovação de seleção ainda não salva. O transporte é simulado; não representa teste integrado publicado.

A primeira instalação independente `npm ci --no-audit --no-fund` falhou por ENOSPC. Os arquivos parciais foram preservados, sem alteração de package/lockfile e sem junction. A recuperação e os checks finais serão registrados abaixo; a instalação parcial não será apresentada como instalação completa.

Não houve commit, push, deploy, browser, chamada operacional nem mutação editorial por este implementador. A coordenação deve revisar o diff, confirmar hosting/gatilhos e verificar o bundle publicado com o navegador integrado. Frentes de contas, CRUD e mock permanecem preservadas.

## Resultados intermediários da revisão focada

A descoberta ativa do seletor tem prioridade sobre a renovação em segundo plano da mesma origem. Se a consulta manual começar depois, apenas a leitura de fundo é descartada. A seleção acompanha a mesma origem/variantId quando URL ou versão mudam; uma variante removida ou origem diferente invalida a escolha. Dois cenários controlados cobrem as duas ordens da concorrência, sem enviar operações editoriais.

Módulo compartilhado então revisado SHA256: `71646a70699785dc8a17f1d4976c14b0b41ad7b6572744f82d079393e843b8f9`, idêntico ao candidato público daquela revisão. Incluiu liberação idempotente depois de dispose para não revogar a mesma URL Blob duas vezes.

Na versão intermediária, 14 checks do registry, 34 checks de bindings/renovação e 66 checks da fronteira revisada passaram. Logs `official-refresh-reviewed.log`, `official-bindings-reviewed.log` e `boundary-reviewed.log` em `C:/Users/User/Desktop/Loor/tmp/showcase-logo-refresh-20261114/editor-checks/`. Logs anteriores foram preservados. Os três resultados são testes locais controlados, sem HTTP real ou mutação de conta/documento.

Após liberação de espaço pelo usuário, a árvore parcial foi preservada em `C:/Users/User/Desktop/Loor/tmp/showcase-logo-refresh-20261114/editor-node_modules-install-incomplete`. Uma nova instalação independente foi autorizada pela coordenação, com cache e lockfile existentes. Ela não cria junction nem altera outra instalação. Naquele momento, as demais verificações obrigatórias aguardavam seu resultado.

## Estado vigente do candidato — encerramento local

- Registry final SHA256 `ef2d0499bfdf5f84bd487db0d3b898e359be6da6a4d6ba2618929813f1b3ac0a`, igual ao público. O último ajuste preserva fragmentos de URL SVG na decodificação/apresentação e revoga apenas a URL Blob base.
- Revisão independente identificou uma corrida concreta: um erro de mídia custom durante uma leitura official podia compartilhar a promessa de hidratação parcial e deixar a URL assinada expirada. A pendência official agora é separada. A recuperação completa aguarda a leitura official e, se ainda necessária e com a mesma sessão/geração/URL, executa um único GET completo. Mantém o orçamento existente, o rascunho e a revisão/CAS; não repete PUT. Um teste controlado comprova a sequência e a URL custom recuperada. A coordenação também releu o fechamento, independentemente do teste.
- `npm ci --prefer-offline --no-audit --no-fund` terminou com exit0: 35 pacotes, instalação independente, sem alteração de dependências/lockfile. Hash do lockfile mantido: `2d44bd53e7c80702a8fcc07590a1ca887e751d8a53104fb0f500068efa01d9a6`. O log ENOSPC e a árvore parcial continuam preservados; não houve limpeza de trabalhos.
- **54 suítes mantidas aprovadas:** 53 execuções exit0 em `maintained-results.json`, mais a suíte de bindings executada separadamente após a correção da corrida (**35 checks**, `official-bindings-recovery-race.log`). Incluem **15 checks do registry**, **66 da fronteira** e readiness. Os checks não afetados já aprovados foram preservados. O índice e todos os logs estão em `C:/Users/User/Desktop/Loor/tmp/showcase-logo-refresh-20261114/editor-checks/`.
- Typecheck, lint, build e diff-check finais: exit0. Build homolog usa a flag e a API canônica somente no processo; nenhum arquivo de configuração foi alterado. Avisos de tamanho do chunk e timings de plugins não impediram o build.
- Lint conserva **2 warnings legados** (`SettingsWriteEditor.tsx` e `SmtpMetadataEditor.tsx`) e registra **1 novo** em `useOfficialLogoMedia.ts:27`. O novo `setEntries` sincroniza handles de um registry externo: recursos são adquiridos/assinados no effect, nunca durante render, e a coleção precisa ser publicada ao React para um novo consumidor exibir imediatamente a imagem já resolvida/coalescida. O efeito é limitado à mudança das URLs únicas ou da sessão. A justificativa foi aceita na revisão local; o warning não foi classificado como legado nem suprimido. Nenhuma configuração de lint foi alterada.

**Validação no navegador/publicação continuam pendentes.** A evidência central está em [BROWSER-RESULTS.md](C:/Users/User/Desktop/Loor/tmp/showcase-logo-refresh-20261114/BROWSER-RESULTS.md): A foi observada decodificada no harness; B foi requisitada na mesma URL, mas sua renderização não foi observada antes de `js execution timed out; kernel reset, rerun your request` (45,176s). Não se declara o cenário visual A→B completo, nem se atribui o timeout ao Frontend, Backend ou RAM. A rodada não realizou publicação.

Os arquivos estão estáveis para o commit local pela coordenação. O recibo `final-summary.json` e `git-final.txt` consolidam o candidato antes desse commit. O próximo passo depende de restabelecer a observação integrada e requalificar publicação/estado vivo; não reabre participantes, CRUD ou aceites anteriores.
