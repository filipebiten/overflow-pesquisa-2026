# Pesquisa de satisfação — Overflow 2026

App estático (sem build) com duas pesquisas em uma única página — a pessoa é
direcionada pelo filtro inicial (retirante ou liderança/organização). Respostas
vão pro Firebase Realtime Database (fonte de verdade do dashboard ao vivo) e,
em paralelo, pro Google Sheets (tabulação). Hospedado no GitHub Pages.

## Links

- Pesquisa: `https://filipebiten.github.io/overflow-pesquisa-2026/`
- Dashboard: `https://filipebiten.github.io/overflow-pesquisa-2026/dashboard/`

## Stack

- HTML/CSS/JS puro, sem framework, sem build.
- Firebase Realtime Database — projeto próprio `overflow-pesquisa-2026` (dedicado
  a esta pesquisa, não compartilhado com TalkFlow/Velhos Fins).
- Google Sheets via Apps Script Web App (`apps-script/Code.gs`).
- Gráficos do dashboard com Chart.js (CDN).
- Identidade visual da Rede Flow (skill `rede-flow-brand`).

## Como funciona

- As perguntas inteiras estão em `js/perguntas.js` (único lugar pra editar
  texto/opções — nada de string solta no HTML).
- `js/responder.js` é o motor: uma pergunta por tela, barra de progresso,
  pulos condicionais (`mostrarSe`), rascunho salvo em `localStorage` (retoma
  se a pessoa fechar o navegador no meio).
- O envio só acontece UMA vez, no fim: grava um nó novo em
  `respostas/<id>` no Firebase (chave gerada por `push`, não há
  identificação de quem respondeu) e, se `SHEETS_WEBAPP_URL` estiver
  configurado, também posta a mesma resposta pro Apps Script.
- Depois de enviar, `localStorage` grava uma flag (`overflow2026_enviado`) que
  bloqueia reenvio no mesmo navegador/aparelho.
- O dashboard (`dashboard/`) lê `respostas/` em tempo real e calcula NPS,
  satisfação média, médias por culto/logística, distribuição de faixa etária
  etc. Tem filtro pra ver só líderes ou só retirantes.

## Configurar o Google Sheets (uma vez)

1. Abra a planilha de tabulação (já criada):
   `https://docs.google.com/spreadsheets/d/1drU_S1UlxskQLTP0eM0jfejmB_3ernJTi43uhwwJMQk/edit`
2. Extensões → Apps Script.
3. Apague o conteúdo padrão e cole tudo de `apps-script/Code.gs`.
4. Implantar → Nova implantação → tipo "App da Web". Executar como "Eu",
   quem pode acessar "Qualquer pessoa". Implantar, copie a URL do Web App.
5. Cole essa URL em `js/config.js`, na constante `SHEETS_WEBAPP_URL`, e
   publique (commit + push).

O segredo compartilhado (`SHEETS_SECRET` em `config.js` / `SEGREDO` no
`Code.gs`) é só pra filtrar POSTs aleatórios — não protege dado sensível (a
pesquisa é anônima e pública por natureza). Se algum dia aparecer spam na
planilha, troque o valor dos dois lados.

## Publicar no GitHub Pages

1. Criar o repositório `overflow-pesquisa-2026` em
   `github.com/filipebiten` e dar push neste código.
2. Settings → Pages → Deploy from branch → `main` / raiz.
3. A pesquisa fica em `/` e o dashboard em `/dashboard/`.

## Publicar em flow.1b.org.br/pesquisa

Redirecionar (ou embutir via iframe num widget HTML do Elementor, "Modelo da
Página" = Elementor Canvas) apontando pra URL do GitHub Pages. Ver
`references/codigo-web.md` da skill `rede-flow-brand` pras notas de
Elementor/WordPress já usadas nas páginas da Flow.

## Apagar respostas de teste

O app nunca apaga nada sozinho. Teste à vontade (as respostas de teste somem
junto com as reais, então antes do evento valer, limpe pelo Firebase Console
→ Realtime Database → nó `respostas` → excluir as de teste manualmente, ou
apague o nó inteiro e comece do zero no dia do evento).
