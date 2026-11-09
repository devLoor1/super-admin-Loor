# Demonstração local — vitrine configurável de White Labels

Repositório: https://github.com/devLoor1/super-admin-Loor

Branch temporária: `demo/whitelabel-showcase-handoff`

Link: https://github.com/devLoor1/super-admin-Loor/tree/demo/whitelabel-showcase-handoff

Esta branch contém a aplicação mock completa: renderer público, editor, fontes e imagens locais. Não é necessário clonar FRONT-WEB. A fonte é o protótipo de `feature/mock-whitelabel-showcase-config-v1`, baseline `405bd704468c12b1e21bc88d5f3372bcd3418cf7`, incluindo os 12 arquivos modificados e 66 novos que estavam fora do commit.

O transporte usa um snapshot sem ancestrais operacionais. Documentos históricos/evidências de contas foram omitidos exclusivamente desta cópia; a fonte e seus worktrees foram preservados. Não fazer merge desta branch em main/dev. O SHA do checkout pode ser conferido com `git rev-parse HEAD`; o recibo da preparação acompanha esta documentação.

## Preparar o PC da empresa

Requisitos: Windows, Git, Node.js e npm. Versões efetivamente usadas: **Node 24.15.0 / npm 11.12.1**. O projeto aceita Node `^20.19.0 || >=22.12.0`; preferir a versão validada. Não atualizar dependências ou lockfile. A primeira instalação pode precisar de internet para baixar pacotes.

No PowerShell, em uma pasta de trabalho disponível:

```powershell
git clone --single-branch --branch demo/whitelabel-showcase-handoff https://github.com/devLoor1/super-admin-Loor.git loor-vitrine-demo
cd loor-vitrine-demo
git rev-parse HEAD
npm ci --prefer-offline --no-audit --no-fund
.\demo-local.cmd
```

O comando único de inicialização é `demo-local.cmd`: instala as dependências se estiverem ausentes, executa os scripts existentes de build e preview e mantém o servidor em **127.0.0.1:5192**. Não abre outro navegador automaticamente. Não usa `.env`, junctions, diretórios de outro checkout ou assets externos ao repositório.

Se a porta 5192 estiver ocupada, o script falha com `--strictPort`: não encerre um processo de outra frente. Codex deve identificar uma porta livre e usar `npm run preview -- --host 127.0.0.1 --port PORTA --strictPort` após o build, ajustando ambos os links. Execute apenas um servidor da apresentação.

## Abrir e entrar

- **Vitrine pública:** http://127.0.0.1:5192/#/mock/vitrine-publica/4
- **Editor:** http://127.0.0.1:5192/#/whitelabels/4/settings/plataforma/vitrine
- Login fictício: **`demo@example.invalid` / `demo`**.
- Perfis alternativos de consulta: `readonly@example.invalid` / `demo` e `support@example.invalid` / `demo`. Não são necessários ao roteiro principal.

Nunca usar credenciais reais. Se o editor abrir o login, entre com os valores acima e abra novamente o link do editor. A vitrine pública dispensa login. `localhost`/127.0.0.1 só funciona no computador onde o servidor está rodando; não é uma URL publicada.

## Roteiro de três minutos

1. Abra a vitrine e apresente CONECTA e IMPULSO. Use os pontos dos carrosséis: três fotos locais por card; o banner tem duas fotos.
2. Na **mesma aba**, clique em **Voltar ao editor**. Entre com o login fictício se necessário e abra o editor.
3. Em **Cards de White Labels**, abra **Editar CONECTA (Institucional)**. Troque a **Descrição curta**, por exemplo por “Conexões que transformam municípios.”.
4. Clique **Aplicar ao rascunho** → **Ir para a vitrine** → **Salvar alterações**. Aguarde **Salvo · revisão 2**.
5. Clique **Página pública simulada** e mostre a descrição alterada. Não recarregue entre salvar e conferir: o estado é da memória desta aba.
6. Restaure os exemplos pelo controle **MOCK · dados sintéticos · telas** → **Restaurar dados da demonstração**. Confirme revisão 1 e as descrições originais “Investimentos municipais.” e “Desenvolvimento regional.”.

Para encerrar, volte ao terminal e pressione **Ctrl+C**. Se o CMD perguntar se deseja finalizar o arquivo em lotes, confirme. Não é necessário excluir branch, contas ou arquivos.

## Escopo e limitações

- A fixture **#4** representa logicamente WL6/`homologacao` somente na demonstração; não é o ID operacional. O editor não altera a WL6 real.
- Salvamento, revisão, conflitos, busca de origem e mídia são simulados. Dados ficam em memória e são perdidos ao recarregar. Não há persistência, publicação nem upload operacional.
- O transporte é exclusivamente mock, com CSP `connect-src 'none'`, sessão separada e bloqueio de links externos. Não configurar APIs reais nem enfraquecer a CSP.
- Na apresentação, preferir os exemplos locais. As medições finais D3 por largura útil e as corridas/recuperação de upload permanecem incompletas no navegador. Não declarar essas pendências resolvidas com este smoke.
- Link lateral “Config. do Whitelabel”, carregamento de imagens e refinamentos de densidade/identificação Demo/badge MOCK continuam documentados; usar os links diretos acima ou o percurso aprovado. Nenhum redesign foi feito.
- B1/B2/B3/D1/D2 mantêm os resultados anteriores. O novo smoke conferiu imagens, paginação, editor, aplicação/salvamento, projeção e restauração; não repete toda a auditoria funcional.
- Os testes de participantes e demais frentes permanecem pausados. Não abrir destinos operacionais, não testar contas ou alterar Termos/configuração administrativa.

## Validação local e publicação

Os 78 arquivos do protótipo foram comparados por SHA-256 com a evidência anterior e permaneceram iguais. Checks anteriores reaproveitados: 526 verificações da vitrine, typecheck, lint, build e diff-check dos arquivos então rastreados aprovados. Ao incluir os arquivos novos no índice Git, o diff-check apontou somente uma linha vazia final preexistente em `ShowcaseFrame.tsx` e `showcaseCrumbs.ts`; esses arquivos foram preservados sem correção de produto. Nesta preparação, instalação independente pelo lockfile e inicialização pelo script Windows recompilaram o mesmo JS/CSS, sem mudança de aplicação/dependências. Smoke no navegador integrado: todas as mídias de exemplo carregadas, revisão 2 simulada conferida e revisão 1 restaurada; 45 requisições observadas, todas GET locais, nenhum erro de console nessa janela. Isso não é garantia universal de rede.

Para uma alteração futura relevante, os comandos disponíveis são:

```powershell
npm run check:mock
npm run typecheck
npm run lint
npm run build
git diff --check
```

Este envio é transporte de código, **sem PR e sem deploy**. Na equipe Netlify consultada, somente `loor-super-admin` usa este repositório; produção e branch deploys estão limitados a `dev`; Deploy Previews dependem de PR. O `netlify.toml` do mock continua bloqueando builds Netlify. Não alterar essas configurações, não abrir PR e não publicar este mock.

## Prompt de retomada no segundo computador

> Prepare apenas a demonstração local da vitrine LOØR. Use o repositório https://github.com/devLoor1/super-admin-Loor e a branch demo/whitelabel-showcase-handoff. Leia AGENTS.md, MOCK.md e HANDOFF-DEMO.md. Confira o SHA e o estado local antes de alterar qualquer arquivo; preserve mudanças existentes. Instale pelo package-lock.json com Node 24.15.0/npm 11.12.1 ou versão compatível já disponível. Execute demo-local.cmd, reutilizando um servidor correto se já existir e sem encerrar outras frentes. Abra a vitrine e o editor exclusivamente no navegador integrado do Codex. Faça somente o smoke curto do handoff e restaure os exemplos. Não refaça o projeto, não use APIs operacionais, não retome participantes, não implemente persistência ou Backend e não faça PR/merge/deploy. D3/uploads continuam com as limitações documentadas. Informe URLs locais e qualquer bloqueio concreto.
