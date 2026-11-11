# Vitrine WL6 — consolidação atual para revisão

## Estado vigente — 10/11/2026, 22h UTC−03

Mensagem preparada, não enviada. A entrega reportada pelo Backend (Core AWS497e93f/Nest Render721f617, gateWL6, upload201, revisão2 e CAS409) foi incorporada. **Retirados os pedidos de implementar/publicar novamente o contrato, informar os mesmos SHAs ou acrescentar documento ao409 como pré-requisito.** Preservar as ressalvas de evidência: os writes do smoke são reportados; não foram repetidos por nós.

Confirmamos por leitura própria, antes de qualquer edição:

- Admin `/api/whitelabels/6/showcase`200, `2026-11-11T01:15:42Z` (10/11 22:15:42 UTC−03), correlationId `f5c1b832-4aba-47ef-a36f-baca8bbcd402`: data/configured=true/schema1/revisão2/owner6-homologacao. Documento anterior protegido.
- Público `/service/showcase`200 em01:17:23Z (22:17:23 local), sem credenciais, mesma revisão, projeção sem source/internalTitle/assetRef/warnings; `Cache-Control: private, no-store` presente. Correlação não disponível.
- QA9 recusada404 `E_SHOWCASE_NOT_AVAILABLE` em ambos. Admin correlationId `b9c7c077-24bf-43ca-8796-10dc6fbc614c`; não repetir CRUD ou usar QA9 como owner.

**Única divergência Backend confirmada nesta leitura:** resposta administrativa não contém Cache-Control, embora o Core de fonte o defina e o contrato o preveja. O público está correto. Não observamos stale read: a resposta foi de rede, sem disk cache/service worker. Antes de tratar isso como bloqueador, falta exercitar save/readback e renovação real. Eventual mensagem específica para revisão: “No GET administrativo acima, conferir a propagação de `Cache-Control: private, no-store` pelo bridge Nest; esperado pelo contrato, ausente na resposta observada. Evidência sanitizada: `http-read-headers.json`. Não solicitamos alteração do caminho público nem do corpo409.”

Normalização NFC/trim do Core foi localizada e reproduzida com consumer real em teste local interceptado; o ajuste necessário é frontend, não novo contrato Backend. Upload/CAS/renovação reais continuam sem nova cobertura própria por limitações da execução local/controlador, não por ausência presumida de Backend. GET não configurado não foi provocado porque já existe documento na revisão2; primeira gravação permanece coberta pelo smoke reportado/testes controlados.

Evidências: `C:/Users/User/Desktop/Loor/tmp/whitelabel-showcase-integration-20261110/`. Zero gravações reais, mensagem externa, mudança Backend/infraestrutura/flags/deploy nesta retomada. Não há solicitação genérica de nova entrega Backend. Publicação frontend aguarda validação própria e qualificação final do hosting; participantes continuam encerrados.

Pedidos anteriores preservados em `tmp/whitelabel-showcase-integration-20261110/handoff-historical-before-readback.md` e nos checkpoints históricos; não são solicitações atuais.
