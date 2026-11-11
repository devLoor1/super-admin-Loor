# Vitrine WL6 — plano de publicação e reversão

## Corte de revisão: 10/11/2026, 23h UTC−03

Publicação autorizada, mas ainda condicionada à validação real pendente. Este plano não é execução nem autorização para ultrapassar os bloqueios registrados. Lote1 e participantes encerrados; preservar QA9, todas as contas, mock/FRONT-WEB e demais worktrees.

## Candidato e evidência de comparação

Editor: `devLoor1/super-admin-Loor`, `feature/showcase-operational-v1`; base da correção `27138b39ba24b0dd3a5978b6f1b3a6de549f596c`, dev remoto `d49815d7fa3decd7f255c94b8826d64822d5b883`. Público: `giallanzah/loor-capital-suite`, `feature/public-showcase-wl6-v1@95fde1fe07152712720c1df0c2cccc7c303bcb8a`, código8d27d4f e dev remoto1112321794bc58a080fe7d47664e6679ef52ede8. Refs dev/feature reconfirmados por ls-remote nesta revisão, sem fetch/checkout/update de branches existentes. Consolidação permitida em commits locais dessas features; nenhum push é necessário para os checks pendentes.

Normalização não foi inferida de um PUT real: as respostas reais preservadas são GETs200 da revisão2. O defeito foi reproduzido com consumer real e `reqString` extraído do Git Core497e93f, usando transporte interceptado. O encoder aplica somente NFC/trim conhecidos e representação dos opcionais; mantém comparação de conteúdo significativo, Markdown, ordem, IDs e assetRefs. A revisão é conferida separadamente no repository/store, exigindo incremento exato, sem reenvio automático. Não equiparar URLs temporárias/metadados de apresentação a conteúdo editorial persistido.

63 checks operacionais passaram (47 anteriores +16 novos):14 alterações semânticas em documentos válidos e2 revisões divergentes preservam draft e impedem falso aceite. Conferência offline do GET real salvo preserva IDs/documento, removendo apenas URLs temporárias. Runtime/bundle iguais ao corte anterior; checks151/59, TypeScript/lint/build reaproveitados, lint do teste e diff-check aprovados. Recibo de consolidação dos commits locais: `tmp/whitelabel-showcase-integration-20261110/candidate-review/consolidation-final.json`. Não representa publicação ou execução dos cenários reais pendentes.

## Destinos, flags e grau de confirmação

| Destino | Evidência conhecida | Reconfirmação ainda necessária |
| --- | --- | --- |
| SA `loor-super-admin`, site25e47255-95dc-4ed6-a22a-8bce03017ee7, `https://loor-super-admin.netlify.app` | Overview integrado da rodada anterior: publicado6aeb0403fa9df580771946fb/devd49815d. Painel anterior: único site do repo na equipe consultada; npm run build/dist; branch dev; branch deploys somente dev; previews por PR; API Render homolog. | Projeto/deploy atuais, aliases, build/flags e alcance de gatilhos imediatamente antes do push. Não há netlify.toml no repo para provar esses valores. |
| Homolog LOØR `homolog-loor`, site200662bc-9973-4a97-9e77-eb2bffc3aa0d, `https://homolog.loor.vc` | Painel anterior: dev1112321/deploy6aee2d68be8338b7bece5a75; slug homologacao; APIhttps://back.loor.vc/service. | Deploy/configuração/aliases atuais e saída efetiva do build. |
| Laguna Investor, sitec81bad49-9d36-4114-ae0b-ba35a2da6eb1, `https://laguna.investor.loor.vc` | Painel anterior: mesmo repo/dev1112321; recebe build por push dev. Capacidade deve ficar desabilitada. | Reconfirmar gatilho e ausência/false da flag; smoke não mutante após publicação compartilhada. Não alterar configuração de Laguna. |
| Sites de main, incluindo produção `loor.vc` | Fora da autorização. Main remoto SA=c2235ac; público=61de8c1 por ls-remote nesta revisão. | Não tocar main nem usar seus sites. `origin/main` público local=b322665 é cache antigo, distinto do remoto; não atualizá-lo por automatismo. |

Netlify connector get-project voltou a retornar indisponível. GitHub status/check-runs/workflows consultados por leitura não apresentam jobs nessas refs; listas vazias **não comprovam ausência de gatilhos Netlify**. Configurações históricas não são prova atual de isolamento. Sem nova condição de recuperação informada, o controlador não foi reinicializado nesta revisão. Não repetir servidor DEV rejeitado por comando, porta, ferramenta ou execução manual.

Flags estritamente necessárias, somente depois dos gates: `VITE_SHOWCASE_ENABLED=true` no SA de homolog e na Homolog LOØR. Gate SA combina flag exata/API homolog/owner6-homologacao/papel; Backend continua autoritativo. Gate público exige flag/API/slug/hostname homolog.loor.vc. Não mudar CRUD/lifecycle, BASE_PATH, VITE_WALLET_PREFIX, API, slug ou flags de outros clientes. Contexto técnico Netlify production desses sites não é produção de negócio. Não promover mock inteiro nem usar fixture4 como proprietário real.

Configuração pública versionada: raiz netlify.toml, base artifacts/loor, comando pnpm install --ignore-scripts && pnpm run build, publish dist/public. Vite produz artifacts/loor/dist/public. O painel histórico exibiu ../../dist/public: conferir Resolved config/log do deploy antes de qualquer publicação, sem editar por suposição. Preservar redirects, carteira e autenticação existentes.

## Sequência permitida quando a capacidade de validação estiver disponível

1. Revalidar identidade SUPER_ADMIN/tenant6/homologacao e ler a revisão corrente; revisão2 é recibo histórico, não precondição fixa. Proteger novo snapshot sanitizado e comparar com o preservado antes de qualquer write.
2. Pela UI candidata real, exercitar alteração editorial mínima, registrar uma gravação e seu retorno/revisão, GET e recarga; preservar conteúdo e refs existentes. Não apagar documento para repetir primeira gravação.
3. Em sessão/aba controlada, provar CAS com versão obsoleta;409 deve preservar draft, executar GET de conferência e não repetir PUT. Nunca forçar overwrite ou substituir documento por fixtures.
4. Upload real slot=showcase e renovação de URL, preservando conteúdo editorial/main_area. Resultado incerto exige leitura/reconciliação, sem retry automático; não excluir assets. Confirmar projeção pública sem campos administrativos após a gravação.
5. Conferir código/artefatos candidatos, checks reaproveitados versus novos, DEV e compilado. Sem bypass da negativa automática de inicialização. Reconfirmar refs e configuração dos destinos; árvore dev deve continuar limpa e FF deve ser possível.
6. Editor primeiro: integrar apenas a feature qualificada por FF no dev SA e publicar pelo Git CD existente, com a flag da vitrine no destino autorizado. Capturar SHA/deploy/versão servida e validar UI autenticada antes de avançar.
7. Público depois: usar worktree dev dedicado disponível, FF origin/dev e feature qualificada, sem trocar checkout original. Push dev aciona destinos compartilhados conhecidos; flag somente Homolog LOØR. Confirmar `/vitrine`, assets, deep link, responsividade, GET público e rotas existentes por leituras não mutantes. Laguna continua sem a capacidade. Não retomar participantes.

Qualquer mudança de baseline/destino requer requalificação; falha de FF não autoriza reset/rebase de trabalho alheio/force-push. Não criar PR enquanto o processo acordado não o exigir; PR também poderia disparar preview.

## Reversão restrita ao mesmo fluxo

- Antes de publicar, registrar SHA remoto dev e deploy atual de cada destino realmente acionado. D49815d/1112321 são referências conhecidas, não valores para reset automático futuro.
- Se necessário, reverter somente os commits da feature por novos commits revert em dev, preservando mudanças posteriores; testar e seguir o mesmo Git CD. Nunca reset/force/main nem restaurar um site diferente. O revert público também recompila os destinos dev compartilhados; qualificar esse efeito.
- Eventual desativação emergencial da flag deve atingir somente o site autorizado que a recebeu e passar pelo processo suportado; não alterar Backend, CRUD/lifecycle ou outros clientes. Não executada nesta revisão.
- Reversão frontend não restaura o documento do Backend. Se uma mudança QA precisar ser desfeita, ler revisão atual e usar fluxo normal/CAS para restaurar somente o conteúdo alterado, sem sobrescrever edições concorrentes e sem reaplicar snapshot inteiro automaticamente.

## Capacidades ainda indisponíveis e contagens

DEV real foi bloqueado pela revisão automática (`blocked by policy`, sem detalhe adicional). Não há validação real liberada por esta revisão. O controlador integrado falhou na rodada anterior e não foi retestado sem condição nova; conector Netlify não permitiu ler configuração atual. Não atribuir as limitações a Backend, aplicação ou RAM.

Nesta revisão: nenhuma chamada operacional, gravação/upload real, nova simulação no navegador, configuração, integração dev ou deploy. Oito uploads do harness anterior permanecem sintéticos. Checks Node adicionais são respostas interceptadas. Evidências em `tmp/whitelabel-showcase-integration-20261110/candidate-review/`; checkpoint e contexto distinguem os cortes. Mensagem Backend somente para divergência concreta: cache administrativo ausente continua observação anterior, sem nova prova de stale read ou novo pedido de implementação.
