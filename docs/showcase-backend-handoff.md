# Vitrine WL6 — solicitação técnica para revisão

Mensagem preparada, não enviada. Esta frente não reabre testes de participantes.

O CRUD básico foi conferido na homologação pelo Super Admin publicado: criamos somente o White Label QA **#9** (`qa-vitrine-20261110-1600`) e editamos somente seu nome, com POST201, PATCH200 e GET200 após recarga. Ele permanece ativo e pode servir como uma origem; o proprietário da vitrine continua sendo **WL6 / ID6 / homologacao**.

Estamos adaptando o editor e a vitrine pública ao contrato `docs/whitelabel-showcase-v1-contract.md` de `backend-super-admin-Loor@61b8591`. O documento informa “Backend not yet implemented”; o dev consultado permanece nesse SHA e a branch homolog em `c5deb279`. No Core dev `5590d11`, o upload AST ainda aceita apenas `main_area`. O Swagger publicado, consultado em **2026-11-10T19:09:47.818Z (16:09:47.818 UTC−03)**, não expõe operações showcase e descreve o upload como `main_area`. Essa consulta é evidência do contrato exposto, não uma prova isolada da ausência de qualquer rota não documentada.

Precisamos da implementação e publicação em homologação do contrato já acordado:

1. GET/PUT `/api/whitelabels/6/showcase`, documento completo, primeira revisão JSON null, compare-and-swap atômico e409 `E_SHOWCASE_REVISION_CONFLICT`. GET para conferência de resultados incertos. READ_ONLY consulta; SUPER_ADMIN escreve; SUPPORT_ADMIN não acessa.
2. Upload POST multipart `slot=showcase`, novo assetRef a cada arquivo, GET da referência restrito ao proprietário e URLs resolvidas. Preservar comportamento de `main_area` e referências existentes; editor não substitui bytes nem exclui arquivos. Informar tratamento suportado para upload com resposta perdida, sem presumir idempotência ou repetir POST.
3. Projeção GET `/service/showcase`, restrita ao ambiente de homologação e ID6/slug homologacao. Sem configuração:200 com configured:false/revision:null/document:null. Outro tenant/ambiente:404 conforme contrato. Retornar apenas conteúdo público e URLs renováveis, sem dados administrativos/credenciais.
4. Validação de origem ativa na inclusão, identidade independente de card/associação, origens repetidas permitidas, personalizações independentes, ordem, Markdown e imagens conforme contrato. Não usar fixture4 nem transformar baseUrl da origem em destino de CTA.

Ao entregar, informar os SHAs/deployments efetivos e a configuração que limita a capacidade à WL6 em homologação, além de exemplos sanitizados dos envelopes reais GET/PUT/assets/public. A fonte canônica atual para nome/slug é o registro White Label; logo e descrição permanecem manuais, cores iniciais são editoriais. Busca paginada existente é reutilizada, e seleção por ID faz consulta direta.

Até a entrega e validação real, a capacidade frontend permanece desabilitada por padrão. Testes locais com respostas interceptadas não serão apresentados como persistência Backend ou aceite funcional publicado. Não é necessário criar contas de participantes nem refazer etapas aceitas.
