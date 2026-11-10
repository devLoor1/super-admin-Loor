# Vitrine WL6 — solicitação técnica para revisão

Mensagem preparada, não enviada. Esta frente não reabre testes de participantes.

O CRUD básico foi conferido na homologação pelo Super Admin publicado: criamos somente o White Label QA **#9** (`qa-vitrine-20261110-1600`) e editamos somente seu nome, com POST201, PATCH200 e GET200 após recarga. Ele permanece ativo e pode servir como uma origem; o proprietário da vitrine continua sendo **WL6 / ID6 / homologacao**.

Editor e renderer foram preparados inicialmente contra `docs/whitelabel-showcase-v1-contract.md` em `61b8591`. Na conferência final, em torno de **2026-11-10T20:03:45Z (17:03:45 UTC−03)**, dev avançou para **`721f617307e34fb2b94b8c3246ebcdda8c3da825`**, com ponte Nest registrada e contrato refinado: implementação em fonte, deploy homolog pendente de operação. A branch homolog continua `c5deb279` e Core dev remoto `5590d11`. Não solicitamos reimplementar a ponte já entregue.

O Swagger foi consultado antes dessa atualização, em **2026-11-10T19:09:47.818Z (16:09:47.818 UTC−03)**: não expunha showcase e descrevia upload main_area. É uma observação histórica do contrato exposto, não prova do runtime posterior nem da ausência de toda rota não documentada. O controlador integrado ficou indisponível; a implementação e disponibilidade efetivas no Core ainda precisam de qualificação.

Precisamos concluir a disponibilização e qualificar em homologação o contrato acordado:

1. GET/PUT `/api/whitelabels/6/showcase`, documento completo, primeira revisão JSON null, compare-and-swap atômico e409 `E_SHOWCASE_REVISION_CONFLICT`. GET para conferência de resultados incertos. READ_ONLY consulta; SUPER_ADMIN escreve; SUPPORT_ADMIN não acessa.
2. Upload POST multipart `slot=showcase`, novo assetRef a cada arquivo, GET da referência restrito ao proprietário e URLs resolvidas. Preservar comportamento de `main_area` e referências existentes; editor não substitui bytes nem exclui arquivos. Informar tratamento suportado para upload com resposta perdida, sem presumir idempotência ou repetir POST.
3. Projeção GET `/service/showcase`, restrita ao ambiente de homologação e ID6/slug homologacao. Sem configuração:200 com configured:false/revision:null/document:null. Outro tenant/ambiente:404 conforme contrato. Retornar apenas conteúdo público e URLs renováveis, sem dados administrativos/credenciais.
4. Validação de origem ativa na inclusão, identidade independente de card/associação, origens repetidas permitidas, personalizações independentes, ordem, Markdown e imagens conforme contrato. Não usar fixture4 nem transformar baseUrl da origem em destino de CTA.

Ao entregar, informar os SHAs/deployments efetivos e a configuração que limita a capacidade à WL6 em homologação, além de exemplos sanitizados dos envelopes reais GET/PUT/assets/public. A fonte canônica atual para nome/slug é o registro White Label; logo e descrição permanecem manuais, cores iniciais são editoriais. Busca paginada existente é reutilizada, e seleção por ID faz consulta direta.

Pontos objetivos da revisão de721f617: o contrato exige `Cache-Control: private, no-store`, mas a ponte inspecionada não define nem propaga esse cabeçalho; favor disponibilizá-lo nas respostas administrativas e públicas. O status/código409 são preservados, porém os dados de revisão/documento do conflito são filtrados pela ponte; alinhar implementação e contrato. O frontend já faz GET de conferência, preservando o rascunho e sem repetir PUT, portanto não depende de um overwrite de contorno. Confirmar os envelopes administrativos e o envelope público não configurado com respostas sanitizadas; o exemplo abreviado novo não será usado para inventar formatos alternativos.

Refinamentos reconhecidos: TTL de URL15min, URLs administrativas enriquecidas, renovação independente da revisão, Markdown fora do subconjunto recusado422, fonte ativa também quando trocada em instância existente, projeção sem source/internalTitle/assetRef/warnings. Não assumir que flags `SHOWCASE_ENABLED`/owner estão efetivas só porque constam no documento.

Até a entrega e validação real, a capacidade frontend permanece desabilitada por padrão. Testes locais com respostas interceptadas não serão apresentados como persistência Backend ou aceite funcional publicado. Não é necessário criar contas de participantes nem refazer etapas aceitas.
