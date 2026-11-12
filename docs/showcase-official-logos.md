# Logos por origem — correção compatível e dependência dinâmica

## Escopo

Correção autorizada em homologação/dev em 12/11/2026, sobre editor566ab0d e público27a879e. Sections V2, gate owner6/slughomologacao/ambientehomolog, RBAC, CAS, carteira e navegação são preservados. A revisão9 foi relida, sem gravação editorial nesta preparação; não é um valor fixo para qualquer futura escrita. Main, produção de negócio, participantes e CRUD estão fora desta rodada.

## Causas e fontes comprovadas

O catálogo anterior reunia referências de todos os cards e dois arquivos LOØR; a origem servia apenas para ordenar. O seletor ainda concatenava opções de `logo-options`, cujo contrato atual é `kind=slot=main_area`. Essas imagens são áreas de login/cadastro, não um cadastro oficial de logos. Uma cópia independente WL6 não acompanha a marca. A conclusão assíncrona da seleção também precisava ser invalidada quando o contexto do seletor mudasse, além do GET já cancelável.

| Origem real | Homepage canônica | Fonte efetiva do Header |
| --- | --- | --- |
| 6 / homologacao | https://homolog.loor.vc | `VITE_APP_LOGO_URL=https://i.imgur.com/zYnjY3u.png` |
| 7 / laguna-homologacao | https://laguna.investor.loor.vc | `VITE_APP_LOGO_URL=https://i.imgur.com/ufOKqMq.png` |
| 4 / finapop-homologacao | https://finapop.investidor.loor.vc | `VITE_APP_LOGO_URL=https://i.imgur.com/6JAhWhe.png` |

O rastreamento foi feito por cadastro real, DOM da homepage, inspeção visual e configuração efetiva do Netlify. A cadeia é Header→AppLogo→config/brand.ts→configuração de build, com fallback PNG importado. Não há variante clara/escura ou desktop/mobile distinta comprovada no Header. A logo clara já salva na vitrine permanece personalização, sem reclassificação automática.

Laguna aparece no seletor real de origens (7 resultados ativos, página1/1); não houve exclusão por paginação nem ativação de tenant. Sua eventual falta no catálogo legado não demonstra ausência da marca. A consulta `logo-options` de Laguna não chegou a ser exercitada nesta rodada por deadline do controlador antes de adicionar o card local; não se declara que retornou vazio.

Fina Pop é identificada no Control Plane como4/finapop-homologacao, com o domínio acima. Seu build atual informa slugfinapop/API `https://back.loor.vc` e pertence à linhagem main61de8c1. Essa diferença é registrada sem alterar configuração ou deduzir outro owner. A publicação dev desta rodada não alcança esse site.

## Correção

- Logos consultam somente o metadado oficial da origem exata. O mapa local associa identidade/ambiente a homepage; não contém arquivos/URLs de logo.
- O novo manifesto frontend é gerado pelo mesmo resolvedor do Header, no repositório público. Não é endpoint Backend existente, scraping ou segundo catálogo manual. Seu produtor está qualificado para os dois destinos dev atuais, LOØR/Laguna.
- Main_area permanece disponível somente na seleção de fotografias. Logos de outros cards e arquivos LOØR independentes deixam de ser promovidos a oficiais.
- Consulta nova invalida autorização de importação anterior; cache separa identidade/ambiente/variante/versão/sessão. Troca de origem remonta o seletor; encerramento, sessão trocada e resultado atrasado não aplicam conteúdo antigo.
- READ_ONLY consulta sem ingestão/aplicação. Falha e ausência preservam imagem/rascunho, sem outra marca. Leituras públicas têm timeout; POST já enviado não é abortado para fingir cancelamento no servidor.
- A seleção explícita baixa os bytes e usa o upload PNG/JPEG vigente, gerando novo assetRef WL6. Não exige que o usuário localize/envie um arquivo. Não amplia formatos do upload manual. SVG/WebP oficiais continuam qualificáveis para prévia; sua ingestão exige compatibilidade contratual.

## O que não está concluído pelo contrato atual

`card.logo` continua `{assetRef,alt}`. A seleção oficial nesta versão salva um **snapshot**. Não envia modo novo, identidade de variante oculta, URL ou metadado desconhecido ao Backend. Não converte logos antigas nem regrava a vitrine ao mudar uma marca.

O manifesto distingue variante estável `header`, versão da configuração/build, URL e revisão editorial. Em fonte externa, não conhece o digest dos bytes; alteração dos bytes sob a mesma URL não é comprovada por sua versão de configuração. A atualização observada na fixture é de descoberta da fonte, não de vínculo persistido em produção.

Fina Pop ainda precisa de fonte oficial consultável pelo contrato compartilhado ou publicação autorizada em sua linhagem atual; não usamos fallback LOØR nem lista manual paralela. O vínculo oficial persistido requer contrato Backend que diferencie oficial/personalizada, preserve V2, proteja writers antigos e resolva a versão atual na projeção pública. Handoff único em `tmp/showcase-official-logos-20261112/HANDOFF-BACKEND-LOGOS.md` no workspace, sem envio externo.

## Validação e publicação

24 checks focados do consumidor e15 regressões passaram com transporte simulado/SSR. Produtor:10 checks puros/hooks,31 navegação, typecheck e build. O editor concluiu53suítes mantidas, typecheck,lint,build,diff-check (57/57 comandos exit0); dois avisos legados de lint, sem falha. READ_ONLY real autenticado e dinâmica persistida não são comprovados por esses testes.

Fluxo autorizado: publicar primeiro o produtor público em dev (Homolog LOØR + Laguna), confirmar manifesto/Header/gates, depois o editor no único site Super Admin dev. Sem PR/main ou alteração de env. Os checks locais são executados; a revisão interativa usa o build homologado conforme alternativa autorizada, sem retomar a inicialização DEV anteriormente bloqueada.

Produtor efetivamente publicado: `c6b57932293fd17f053152198c8677b613c477a3`; Homolog deploy6af61853565394db09ed2f7f e Laguna6af61853f7a07a68199d1a94, ambosready. Manifestos HTTP200/identidade correta/CORS Super Admin conferidos no navegador; Header preservado. Vitrine Laguna indisponível; GET público WL6 mantém schema2/revisão9. O editor deste commit ainda precisa de confirmação do deploy e transferência binária pela interface; não se presume esse resultado.

Reversão: novo commit sobre dev desfazendo somente esta correção, mantendo leitores/writer V2 e conteúdo. Referências anteriores: público27a879e (Homolog deploy6af5fe50dcd94dbf5b1ebfdf; Laguna6af5fe502c1680244604c2e1), editor566ab0d (deploy6af602537670d6a884ca43a7). Não usar downgradeV1, reset, exclusão de assets ou restauração do documento para reverter código. Para retirar o manifesto após liberar consumidor, coordenar primeiro o editor para evitar uma fonte indisponível.

Índice de evidências e contagens atuais: `C:/Users/User/Desktop/Loor/tmp/showcase-official-logos-20261112/README.md`. Os marcos de publicação real serão acrescentados após observação; não presumir sucesso pela existência deste candidato.
