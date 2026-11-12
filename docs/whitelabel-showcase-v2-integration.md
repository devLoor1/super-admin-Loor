# Vitrine WL6 — integração sections V2 e imagens da origem

## Estado deste registro — 12/11/2026, Brasília (UTC−03)

Candidato em preparação na branch isolada `feature/showcase-v2`, worktree `C:/Users/User/Desktop/Loor/worktrees/super-admin-showcase-v2`, a partir do editor `7d9dc65f9790066ed1aa8cecbf81c4c291170d35`. Candidato público separado em `C:/Users/User/Desktop/Loor/worktrees/public-showcase-v2`, mesma denominação de branch em outro repositório, a partir de `bbd6334df3b7d5d693a69e04b536ba5dc68f590d`. Este registro não declara publicação dos candidatos, gravação V2, copy real ou conclusão da validação integrada.

O usuário aprovou visualmente o mock Card/Texto e sua organização de conteúdo. Arraste por mouse e READ_ONLY foram validados no navegador integrado; toque não exercitado. A persistência do mock continua simulada. Essas evidências e a revisão operacional 8 são preservadas; o mock inteiro não será promovido. Participantes e CRUD permanecem encerrados.

**Relato Backend:** Core homolog `c78371b` e Nest homolog `3f50a43`. O contrato `docs/whitelabel-showcase-v1-contract.md` foi efetivamente lido no objeto Git Nest `3f50a4361016a948c3c0035caa71c9b742ada558`. Seu cabeçalho histórico diz que o deploy aguardava operação; isso não invalida o relato posterior nem comprova o SHA em execução. A leitura do contrato comprova a especificação no código, separada da observação de runtime.

## Leitura real anterior a qualquer escrita

Evidências sanitizadas em `C:/Users/User/Desktop/Loor/tmp/showcase-v2-integration-20261112/`:

- `readers-before.json`, leitura registrada em **2026-11-12T17:37:21.618Z / 14:37:21.618 UTC−03**.
- `admin-before.sanitized.json` e `public-before.sanitized.json`, sem parâmetros das URLs assinadas.
- `admin-before.jpg` e `public-before.jpg`, erros dos leitores publicados.

GET administrativo e público responderam **HTTP 200, schemaVersion 2, revisão 8**. O administrativo confirmou owner `whitelabelId=6`, slug `homologacao`; correlationId `e0af31f8-f2ef-4c78-a899-5cbfed30b6aa`. Não há correlationId público no recibo preservado. Os dois frontends publicados exibiram erro de carregamento, sem substituir por fixtures ou classificar o documento como não configurado.

A resposta contém banner separado e duas seções: texto introdutório `c457bfbb-bc47-5ead-be14-e9b96c7e33e3`, seguido do card `a6cbf585-ebd2-4291-9f79-c779498c626a`, cuja origem é WL6/`homologacao`. O ID introdutório veio do Backend e deve ser preservado.

**Distinção obrigatória:** schemaVersion retornada = 2; revisão de conteúdo observada = 8; formato persistido não foi determinado por essas leituras. O contrato projeta um documento V1 armazenado para V2 em memória, sem alteração de revisão ou persistência. Portanto, GET V2 sozinho não comprova migração persistida. A contagem do recibo inicial é zero mutações.

## Contrato V2 aplicado ao candidato

- Envelope PUT e documento usam `schemaVersion=2`; `banner` permanece separado de `sections[]`.
- Seções ordenadas `type=text|card`, com `instanceId` UUID único no mesmo namespace. Preservar IDs recebidos, ordem, origem, personalizações, associationIds e assetRefs; não gerar outra introdução a cada GET.
- Limites: 1–50 seções, pelo menos um card; título textual 1–240, subtítulo opcional 1–500 ou null, Markdown 1–20000. **50 é restrição técnica introduzida pelo contrato, não um limite comercial previamente aprovado.** Dados não são truncados para caber.
- Tipo/versão desconhecidos produzem erro claro; não descartar silenciosamente seções ou transformar falha de parsing em ausência de configuração.
- Comparação de readback considera tipo, instanceId, ordem, texto/Markdown, origem, associações, assetRefs e revisão. Somente normalizações conhecidas são equivalentes; URLs temporárias não integram o documento editorial.
- Projeção pública V2 mantém banner/seções, sem source, internalTitle, assetRef ou campos administrativos. Navegação operacional, BASE_PATH, VITE_WALLET_PREFIX e gate WL6/homologação permanecem independentes do novo formato.

## Imagens existentes: alcance e identidade

`GET /api/whitelabels/:sourceId/logo-options` consulta a **origem real** do card, inclusive por READ_ONLY; consultar não habilita a vitrine nessa origem. O retorno é `data { whitelabelId, slug, name, variants[] }`. Cada variante identifica `kind=main_area`, `slot=main_area`, `assetRef`, `page`, `pages`, `previewUrl`, `mime` e `originalName`. O Core admite preview e metadados de arquivo nulos; a interface mostra prévia indisponível ou rótulo de fallback sem descartar as demais opções.

As variantes são arquivos de áreas de página, com login/register/quick_profile quando esse vínculo existe. Isso **não garante logo institucional**. A interface informa miniatura, origem e página(s) de uso; nunca seleciona automaticamente o primeiro resultado. `email_branding.logo_url` pertence a outro plano e não é descoberto por esse endpoint. Lista vazia não significa ausência de marca e não remove as variantes LOØR, referências elegíveis da vitrine ou upload manual.

**Finapop:** a associação do ID real 4 à Finapop foi informada pelo Backend no pedido. O contrato genérico lido não contém um catálogo fixo id→nome e não confirma sozinho a identidade ou o conteúdo visual de suas variantes. Esta revisão documental não consultou API ou navegador. Confirmar identificação real retornada e inspecionar miniaturas antes de classificar seus arquivos. Não confundir o ID real 4 com a fixture #4 do mock e não alterar a origem WL6 do card atual para encaixar uma imagem. Nenhuma descoberta universal de logos institucionais está sendo declarada.

Ao confirmar explicitamente uma imagem da origem, a operação é `POST /api/whitelabels/6/platform/assets/copy`, corpo `{ sourceWhitelabelId, sourceAssetRef }`, sucesso HTTP 201. Usar somente o novo `asset_ref` retornado e qualificado com `wtlb_id=6`, `slot=showcase`; não gravar a referência de origem diretamente. O contrato determina cópia dos bytes no servidor, nova referência e preservação do asset/configurações da origem. Essa garantia contratual ainda exige conferência real no ciclo integrado.

Abrir o seletor, consultar, alternar seleção e visualizar não executam copy. O candidato impede submissão duplicada em andamento. READ_ONLY consulta, mas não copia, envia, aplica ou salva. Cancelar/fechar impede aplicação tardia na interface; **não comprova cancelamento no servidor**. Uma resposta incerta bloqueia nova mutação de mídia na sessão; sem retry automático, exclusão compensatória ou reutilização de referência não qualificada.

### Renovação antes de salvar a cópia

`copySourceMedia` marca a mídia recém-copiada com o marcador interno legado `origin='upload'`. Nesse cache local, o nome significa ingresso recente por upload **ou copy**, não transporte multipart nem campo enviado ao Backend. Isso permite a mesma recuperação limitada já usada por uploads ainda ausentes do documento persistido.

Após falha de URL, a recuperação compartilhada faz GET do documento; se a cópia ainda não salva estiver ausente, permite no máximo um GET do asset WL6 solicitado, sem fan-out. Não executa novo copy/PUT, não adota revisão editorial concorrente e não sobrescreve o rascunho. O teste focal `Unsaved copied media renews by owner asset GET without a repeated copy or draft mutation` comprova esse comportamento com transporte interceptado. Não é evidência de expiração natural em homologação.

## Publicação coordenada e condição do primeiro PUT

1. Reconfirmar refs remotas, sites, domínios, configurações e gatilhos antes de qualquer push. As evidências de hospedagem desta rodada estão em `hosting-before-complete.json`, observação de 2026-11-12T17:51:48.377Z / 14:51:48.377 UTC−03; representam um instante, não garantia de estado futuro.
2. Preparar e validar editor e renderer compatíveis com V2. O candidato inicial conserva `SHOWCASE_V2_WRITES_ENABLED=false` em `showcaseRelease.ts`: PUT/POST são bloqueados antes do transporte; consulta permanece disponível. A trava de cutover não substitui owner/ambiente/RBAC.
3. Publicar um leitor por vez pelo fluxo dev/Git CD autorizado e verificar leitura real do conteúdo/revisão vigente, sem PUT/copy. Guardar os SHAs/deploys compatíveis como base mínima de reversão. Não considerar o SHA antigo V1 uma base suficiente.
4. Somente após **ambos** os leitores publicados estarem compatíveis, habilitar a escrita no candidato do editor, executar checks afetados e publicar a mudança coordenada. Registrar seu SHA/deploy real; não antecipar valores.
5. Antes do primeiro PUT V2, reler e preservar snapshot sanitizado atual. Usar a expectedRevision dessa leitura, sem fixar 8. Preservar conteúdo e IDs, comparar o readback e conferir projeção pública. O primeiro PUT V2 bem-sucedido persiste a transição.

Referências anteriores verificadas na leitura de hospedagem:

| Destino | Branch | SHA anterior | Deploy anterior |
| --- | --- | --- | --- |
| loor-super-admin — `https://loor-super-admin.netlify.app` | dev | `7d9dc65f9790066ed1aa8cecbf81c4c291170d35` | `6af4ba2c35ac62fbe63b6d2f` |
| homolog-loor — `https://homolog.loor.vc` | dev | `bbd6334df3b7d5d693a69e04b536ba5dc68f590d` | `6af5af84ab5b02a32d2e19ad` |
| laguna-investor — `https://laguna.investor.loor.vc` | dev | mesmo SHA público | `6af5af84f4b8ec88902fa698` |

O push público em dev aciona Homolog LOØR e Laguna Investor; manter a vitrine indisponível em Laguna e demais tenants. Main, produção de negócio, Backend e configuração compartilhada não integram esta autorização. O contexto técnico `production` do Netlify nos sites homologados não muda a identificação do ambiente de negócio. Reconfirmar alcance atual, sem presumir que a consulta de uma equipe cobre todas as equipes.

## Conflitos, incerteza e reversão V2

CAS409 `E_SHOWCASE_REVISION_CONFLICT` é avaliado antes do downgrade. Preservar o rascunho, reler a revisão atual e reconciliar; nenhum re-PUT automático. Transporte incerto requer leitura de conferência antes de decidir nova escrita. Resposta de copy com owner/slot incorretos ou referência de origem reaproveitada não é qualificada como sucesso e não pode alimentar o documento.

Depois de persistido V2, PUT V1 retorna **422 `E_SHOWCASE_SCHEMA_DOWNGRADE`**. Não restaurar um frontend que só lê V1 como suposta reversão suficiente, mesmo que o conteúdo anterior tivesse sido V1. Também não diminuir revision, forçar downgrade, resetar branches ou excluir assets para desfazer o teste.

Reversão de frontend: preparar novo commit sobre dev atual que desfaça somente o comportamento defeituoso, **mantendo leitores/modelo/renderer compatíveis com V2**. Se necessário, voltar a bloquear escrita/copy pelo latch sem perder consulta V2. Testar o candidato e publicá-lo pelo mesmo Git CD, um aplicativo por vez; conferir destinos homologados e isolamento. Identificar os SHAs compatíveis efetivamente publicados antes de executar qualquer reversão; este documento ainda não contém esse marco futuro.

Restauração editorial, se necessária e autorizada: converter o snapshot preservado para o contrato V2 vigente sem perder IDs/conteúdo, reler a revisão atual e aplicar CAS normal. Em conflito, preservar o rascunho e reconciliar. Reverter código não restaura documento ou mídia. Sem DELETE ou sobrescrita de arquivo; referências antigas permanecem preservadas.

## Cobertura atual e lacunas que não devem ser confundidas

- Leitura real: HTTP200 administrativo/público, schemaVersion2/revisão8, incompatibilidade dos leitores anteriores, snapshot sanitizado preservado.
- Automação focal da seleção/cópia: 29 checks de código físico com transporte interceptado e SSR; latch de escrita habilitado **somente no harness Node**. Cobrem cópia explícita, READ_ONLY, lista vazia/erro, metadados nulos, owner/slot/ref, duplicação, resultado tardio, incerteza e renovação de cópia não salva. Não são uploads/copies reais.
- `oxlint` focal e diff-check aprovados. Os checks consolidados e o build final serão registrados pela coordenação; não presumir aprovação da versão final por resultados intermediários.
- Pendente neste corte: publicação compatível, primeiro PUT V2/readback/reload, CAS real V2, copy real e preservação da origem, interface de opções/READ_ONLY em homologação, recuperação de URLs V2 e validação visual do conteúdo real.
- Finapop: identidade/mídia precisam de evidência real qualificada; main_area selecionável não equivale à descoberta de todas as logos institucionais.

Próxima ação: concluir a validação consolidada e os leitores compatíveis, registrar SHAs/deploys reais, então avançar sequencialmente pelos testes autorizados com nova leitura antes de cada gravação. Sem reabrir participantes, CRUD ou aprovação visual do mock já aceita.

## Marco de publicação do leitor público — 12/11/2026

Leitor público `27a879e4eff899138fb4212940b704a853cedad7` integrado e enviado a dev. Homolog LOØR: deploy `6af5fe50dcd94dbf5b1ebfdf`, ready, publicado em 2026-11-12T17:59:28.284Z; Laguna Investor: `6af5fe502c1680244604c2e1`, ready, 18:00:19.955Z. Navegador integrado confirmou GET HTTP200/schema2/revisão8 e conteúdo real renderizado em /vitrine; Laguna mostrou indisponibilidade e zero requests /service/showcase no intervalo observado. Nenhuma mutação editorial/copy/upload nesta fase.

O candidato do editor passou pelas 52 suítes mantidas, typecheck, lint, build e diff-check. O assert legado de contagem de POST de mídia foi atualizado para exigir exatamente upload e copy autorizados da WL6; não foi relaxado para aceitar outros writes. Há dois warnings legados de lint e aviso de tamanho de bundle, sem falhas. Recibos em `tmp/showcase-v2-integration-20261112/editor-checks/`. A checagem DEV local não foi repetida: conforme autorização explícita do usuário, a validação real usa o build publicado em homologação, com escrita bloqueada até leitura dos dois leitores. A validação Node/SSR não é rotulada como navegador real.

O leitor do editor neste commit mantém SHOWCASE_V2_WRITES_ENABLED=false. Após verificar sua leitura publicada, uma mudança separada habilitará escrita e passará pelos checks afetados. Esta versão V2 com escrita bloqueada é a referência mínima para uma reversão segura do editor após migração; registrar seu SHA/deploy no próximo marco. Main e demais referências históricas permanecem preservados.
