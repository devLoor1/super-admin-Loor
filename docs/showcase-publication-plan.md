# Vitrine WL6 — plano de publicação e reversão

## Retomada vigente: 10/11/2026, 23h54 UTC−03

Esta seção atualiza o plano; o corte anterior permanece abaixo como histórico. **Ainda não houve publicação, integração em dev ou push nesta retomada.** Houve somente a configuração autorizada da flag da vitrine no site SA, descrita abaixo; ela não comprova disponibilização do novo bundle. Participantes continuam encerrados no escopo aceito; preservar contas, QA9, mock/FRONT-WEB e demais worktrees.

O usuário autorizou a alternativa de publicar exclusivamente nos destinos de homologação qualificados antes do E2E local, se a execução local continuar inviável e a segurança/preservação estiverem demonstradas. Portanto, DEV local não é mais precondição absoluta nesta rodada: é uma exceção expressa, restrita à entrega da vitrine, cuja validação funcional deverá ocorrer sequencialmente na aplicação publicada. Não equivale a dispensar gates, flags, checks, isolamento de tenant, revisão do deployment ou confirmação posterior do funcionamento real.

O navegador integrado voltou a responder após o reinício. O conector Netlify continuou indisponível, mas o painel foi consultado pelo navegador integrado. Uma única nova tentativa do comando DEV exato, expressamente reautorizada, foi rejeitada pela revisão automática com `blocked by policy`, antes de iniciar o processo e sem motivo adicional disponível. Não houve retry, mudança de comando/porta/ferramenta, execução manual ou atribuição da falha à aplicação/Backend/RAM. Não iniciar novo contorno.

### Candidatos e integridade requalificados

Leituras `git ls-remote` e das árvores locais em 11/11/2026, aproximadamente 02h55 UTC (10/11, 23h55 UTC−03), sem fetch ou alteração de refs:

| Repositório | Candidato local limpo | Feature remota | Dev remoto / referência anterior à integração |
| --- | --- | --- | --- |
| `devLoor1/super-admin-Loor` | `2db3f3ea5d654738922ba211e12e2ba8d713d962` | `27138b39ba24b0dd3a5978b6f1b3a6de549f596c` | `d49815d7fa3decd7f255c94b8826d64822d5b883` |
| `giallanzah/loor-capital-suite` | `d35507d3d9456f2958b63ab6c3679645e92a8c4c` | `95fde1fe07152712720c1df0c2cccc7c303bcb8a` | `1112321794bc58a080fe7d47664e6679ef52ede8` |

Ambos candidatos são descendentes FF de seus devs remotos: zero commits atrás e três à frente; cada candidato tem um commit ainda não enviado à feature remota. O checkout original SA está limpo em `dev@d49815d`. O checkout público original continua preservado em outra frente; a integração pública precisa de worktree dedicado, verificando antes disponibilidade do caminho/branch. Não usar reset, força ou alteração de main para obter FF.

Os 66 hashes atuais do manifesto SA conferem (texto CRLF→LF; binários sem transformação), assim como os dez recibos de `candidate-review/integrity-review.json`. Bundles preservados:

- SA `dist/assets/index-BP83KjWA.js`: SHA256 `b15793a42e2d785bba4a2347312cb75ca247b98570ed3b1dcef950976605fb96`.
- Público `artifacts/loor/dist/public/assets/main-BTpMbNa-.js`: SHA256 `74c3267559a51af5b25c70be4da9f7e56ed5200340ecf8a14abb2a2fae418f2c`.

Reutilizam-se os checks do mesmo código: 63 operacionais interceptados, 151 navegação, 59 fronteira, suites legadas, TypeScript/lint/build e checks públicos. O runtime/configuração pública não mudou desde `8d27d4f`; o último commit público é documental. Não executar novamente toda a suíte apenas por causa do reinício. Esses resultados não provam gravação/CAS/renovação de mídia reais. Uma nova alteração de runtime ou build inputs deve ser qualificada antes de reaproveitar sua evidência.

Main remoto SA é `c2235ac5d0d65408e9d39bf836a1a717da3d95ae`; público é `61de8c1d4000cc223537f1b240c1b612163f4781`. No público, `origin/main=b322665` e `main=06e9e22` são referências locais distintas; não tratá-las como estado remoto nem atualizá-las por automatismo.

### Destinos e referências de reversão atuais

Recibo do painel integrado: `C:/Users/User/Desktop/Loor/tmp/whitelabel-showcase-integration-20261110/restart-20261110-2354/hosting-before.json`, observado em `2026-11-11T02:57:04.207Z`. A consulta cobriu 16 sites da equipe `hugo-foj6wjs`; não afirma inventário de outras equipes.

| Destino | Site ID | Deploy atual ready | Fonte / alcance observado |
| --- | --- | --- | --- |
| SA `https://loor-super-admin.netlify.app` | `25e47255-95dc-4ed6-a22a-8bce03017ee7` | `6aeb0403fa9df580771946fb` | `dev@d49815d`; único site consultado deste repo, branch permitida dev, aliases vazios; `npm run build`, `dist`. Developer settings mostra Node24.x, mas a variável existente `NODE_VERSION=22` em todos os contextos tem precedência; não alterada. |
| Homolog LOØR `https://homolog.loor.vc` | `200662bc-9973-4a97-9e77-eb2bffc3aa0d` | `6aee2d68be8338b7bece5a75` | `dev@1112321`; branch permitida dev, aliases vazios. Alvo da ativação pública WL6. |
| Laguna Investor `https://laguna.investor.loor.vc` | `c81bad49-9d36-4114-ae0b-ba35a2da6eb1` | `6aee2d68f586195ff45f6db0` | Mesmo repo/dev1112321; branch permitida dev, aliases vazios. Recebe build compartilhado, mas não pode ter a vitrine ativada. |

O repo público está ligado a cinco sites consultados: dois dev acima e três main (`finapop-plataforma`, `homolpog-finapop`, `dashing-queijadas-ed36da`). Os três main ficam fora do acionamento autorizado; main e produção de negócio permanecem intocados. `skip_prs=null` não comprova configuração de Deploy Previews; não criar PR. Contexto técnico Netlify `production` nos três destinos dev acima é o contexto de publicação desses sites, não classificação de produção de negócio.

**Lacunas restantes para a sequência:** confirmar valores efetivos das flags públicas, concluir a qualificação da saída pública e preservar os gates operacionais. A leitura atual mantém no painel público `base=artifacts/loor` e `dir=../../dist/public`; o `netlify.toml` versionado declara `publish=dist/public` e o Vite produz `artifacts/loor/dist/public`. A precedência/saída efetivamente usada continua em verificação pelo responsável; não editar configuração por suposição nem anunciar esse conflito como resolvido. A pendência pública não dispensa a qualificação do editor, nem demonstra por si só impedimento à etapa SA independente.

Flag SA criada pela interface, com HTTP201 e leitura posterior HTTP200: `VITE_SHOWCASE_ENABLED=true` no contexto técnico `production` do site SA/dev de homologação; `false` nos contextos `dev`, `branch-deploy`, `deploy-preview` e `dev-server`. Recibo `restart-20261110-2354/sa-flag-result.json`, às `2026-11-11T02:58:43.639Z`; configuração anterior em `sa-env-before.json`. O plano da plataforma não disponibilizou scopes específicos; foram usados os scopes padrão `builds`, `functions`, `post_processing` e `runtime`, somente nesse site. Nenhum deploy foi acionado por push até este corte.

Ativação pública ainda a qualificar: `VITE_SHOWCASE_ENABLED=true` somente Homolog LOØR, no contexto efetivo do build autorizado; Laguna deve manter a flag ausente/false. Preservar valores existentes de API, slug, BASE_PATH, VITE_WALLET_PREFIX, CRUD/lifecycle e todos os demais clientes. Gate SA: flag/API homolog exatos, owner real6/homologacao e papel; gate público: flag/API/slug exatos e hostname `homolog.loor.vc`. A fixture4 não participa desse contrato. O quadro de destinos não comprova sozinho configuração de ambiente nem disponibilidade funcional.

### Sequência vigente com validação na homologação

1. Encerrar as lacunas de configuração/gatilhos do destino da etapa; reconfirmar dev, deploy e árvore limpa imediatamente antes da integração. Ler identidade SUPER_ADMIN e owner6/homologacao, revisão corrente e snapshot sanitizado antes de qualquer gravação. A revisão2 histórica não é valor fixo para salvar.
2. Editor primeiro: integrar somente o candidato qualificado por FF em dev SA e acionar o Git CD existente no site SA. Se documentos forem commitados depois de `2db3f3e`, registrar o SHA final exato e distinguir esse delta documental do runtime validado. Nenhuma integração foi executada até este corte.
3. Confirmar novo deploy ready, SHA/bundle servido, flag/gates e UI autenticada publicada. Exercitar uma alteração editorial mínima, resposta/revisão, GET e recarga; conferir CAS sem overwrite/retry, mídia real/renovação e preservação do conteúdo existente. Não substituir documento por fixture nem apagar dados para repetir uma primeira gravação. Resposta incerta interrompe dependentes e exige leitura/reconciliação.
4. Só após qualificar o editor, integrar o público por FF em worktree dedicado. Reconfirmar que o push dev aciona somente os destinos homologados conhecidos e que Laguna permanece sem ativação da vitrine. Validar `/vitrine`, assets, acesso direto, composição, GET público sanitizado e preservação de rotas existentes com checks não mutantes. Não retomar participantes.
5. Registrar separadamente o que foi comprovado no runtime publicado e o que continua somente sintético/local. A exceção de DEV não transforma tentativas incompletas em aprovação nem dispensa registrar uma falha encontrada.

### Reversão restrita e preservação

Os SHAs dev e deploys da tabela são referências concretas do estado anterior; reconfirmá-los se mudar o estado antes da publicação. Um build que falha não publica: o deploy anterior continua ativo, sem restauração necessária. Para um defeito no bundle já publicado, reverter somente os commits específicos da feature por novos commits no mesmo dev/Git CD, preservando mudanças posteriores. Não usar restoreSiteDeploy/publishDeploy, reset/force, main ou restauração cruzada de sites. Registrar a alternativa efetivamente executada; nenhuma reversão foi feita.

Revert público pode recompilar Homolog LOØR e Laguna: ambos exigem conferência, preservando os três sites main. Desativação da flag, se necessária, limita-se ao site autorizado que a recebeu e deve produzir novo bundle pelo fluxo suportado, pois é variável de build. Não alterar flags de Laguna como atalho. Rollback frontend não restaura documento ou assets do Backend: qualquer restauração editorial deve ler a revisão vigente e usar CAS normal, restrita à alteração QA, sem sobrescrever concorrência nem excluir mídia.

## Histórico preservado — corte de revisão: 10/11/2026, 23h UTC−03

As condições de indisponibilidade e a exigência de DEV abaixo descrevem o corte anterior; a alternativa autorizada e os recibos novos acima prevalecem nesta retomada.

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
