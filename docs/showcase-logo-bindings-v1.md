# Logos vinculadas e personalizadas — candidato do editor

Data: 2026-11-13. Worktree `super-admin-showcase-logo-bindings`, branch `feature/showcase-logo-bindings`, baseline `c7d896022548fd7e1f1646db7261c3b5bb238762`.

## Contrato e comportamento

O documento permanece em `schemaVersion: 2`. A leitura aceita a logo legada `{assetRef, alt}` como personalizada; toda nova gravação explicita `kind: custom`. A escolha oficial grava somente `kind: official`, `source: {whitelabelId, slug}`, `variantId` e `alt`. A origem deve corresponder exatamente à origem do card. URL resolvida, versão, digest, estado de resolução e avisos nunca entram no conteúdo editorial.

A descoberta atualiza o cadastro canônico da origem por GET e deriva o manifesto da origem de seu `baseUrl` atual, removendo o caminho. Confere ambiente/ID/slug e contrato de variantes; não usa mapa de marcas, imagens `main_area` como logos, nem catálogo do owner como fonte oficial. Metadados opcionais de um produtor não são requisitos extras para um manifesto aceito pelo resolver. Selecionar uma variante oficial apenas altera a edição local: não baixa binário, não copia e não envia arquivo. SVG/WebP oficiais não passam pela restrição PNG/JPEG do upload personalizado.

`url: null` preserva vínculo, conteúdo e página com indicação de indisponibilidade. A recuperação usa o GET da vitrine, compartilhando o limite de uma recuperação por documento carregado; não consulta assetRef fictício, não muda revisão-base e não sobrescreve o rascunho. O aviso acompanha a mídia resolvida atual. A interface explica o limite após a consulta. O cache do resolver pode durar 60 segundos em sucesso e 15 segundos em falha; versão de configuração não comprova atualização instantânea dos bytes remotos.

A opção “Usar última logo personalizada desta sessão” conserva exclusivamente a referência personalizada deste card/origem conhecida na memória da aba. É uma escolha explícita, sem novo upload. Não sobrevive à recarga/logout e não cria armazenamento ou catálogo paralelo. Permite restaurar o mesmo assetRef quando a aba original foi preservada durante uma consulta/reload em outra aba.

Cancelamento, mudança de origem, substituição de consulta e troca de sessão invalidam escolhas atrasadas. READ_ONLY consulta, mas não escolhe/grava; handlers e Backend RBAC continuam protegendo as operações. Erros 409 mantêm o rascunho e conferem a revisão por GET, sem re-PUT. Resposta incerta exige reconciliação. `422 E_SHOWCASE_OFFICIAL_LOGO_DOWNGRADE` preserva o rascunho e orienta escolha personalizada explícita, sem downgrade silencioso.

## Verificação e publicação

O teste mantido `scripts/check-showcase-official-logos.mjs` cobre módulos físicos, transportes simulados e JSX/SSR dos controles; não representa E2E em homologação nem mudança real de marca. Testes de versão A→B usam respostas simuladas, mantendo o vínculo editorial estável. A descoberta/seleção simula cada origem isoladamente.

Publicar e verificar primeiro o leitor público compatível. Somente então publicar o editor compatível e exercer a primeira gravação `official`. Não promover o mock nem gravar fixtures. O gate existente continua WL6/id=6/slug `homologacao` no ambiente habilitado. A publicação e validação integrada reais são coordenadas separadamente; este documento não declara que ocorreram.

O baseline operacional foi preservado em worktree isolado. Dependências instaladas com `npm ci --no-audit --no-fund`, sem alteração de lockfile/pacotes. Nenhum servidor iniciado nesta frente. Os resultados finais dos checks e a eventual exceção à validação DEV local serão registrados no checkpoint de publicação pelo coordenador, distinguindo simulação, build e execução publicada.

## Resultado local do candidato

- 53 suites mantidas `scripts/check-*.mjs`: aprovadas no resultado final, incluindo readiness. Duas primeiras execuções acusaram corretamente pins em transição durante o último ajuste revisado; somente `check-account-access` e `check-account-ux` foram repetidos com os pins finais e passaram. Os logs iniciais foram preservados.
- Logos oficiais: 28 checks focados aprovados; integração operacional: 71 checks aprovados com transporte interceptado. Os testes exercitam o JSX real dos controles e das imagens, incluindo aviso após resolução, fallback por URL quebrada e renderização de URL nova, além de binding, readback, restauração personalizada, 409/422 e resultado incerto.
- `npm run typecheck`, `npm run lint`, `npm run build` e `git diff --check`: aprovados. Typecheck/lint foram reexecutados somente após os guards finais revisados. Build mantém aviso de chunk maior que 500 kB, sem falha.
- Somente os 11 hashes dos arquivos runtime revisados foram atualizados no manifesto de revisão; autenticação, permissões compartilhadas, dependências e seus registros históricos permanecem preservados.
- Evidências locais: `C:/Users/User/Desktop/Loor/tmp/showcase-logo-bindings-20261113/editor-checks/`, com resumo consolidado em `final-summary.json`. Logs distinguem a execução inicial de pin e sua revalidação.

O coordenador registrou indisponibilidade do controlador integrado nesta rodada. Não houve teste real de seleção/gravação/restauração pelo novo editor, nem publicação deste candidato. Os testes simulados não substituem essa cobertura. Permanece a limitação de bytes remotos alterados sob a mesma URL: versão do manifesto/build e cache do resolver não comprovam atualização do arquivo no navegador. A referência para conteúdo operacional é o GET preservado pelo coordenador, não as fixtures do harness.
