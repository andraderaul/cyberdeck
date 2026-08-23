# Context Map — CYBERDECK

**CYBERDECK** é o guarda-chuva de ferramentas criativas cyberpunk, 100% client-side. Cada
app é um "programa" que roda no deck e compartilha a linguagem visual e os padrões de
código, mas é versionado e deployado de forma independente (ver ADR 0011 e ADR 0012).

Nem todo workspace em `apps/` é um programa. O deck tem três categorias — **ferramenta**, **peça**
e **casca** — e a última é o hub (`apps/deck`, decidido na ADR 0025, construído em #323): a porta de
entrada, que não consome material do usuário, não produz artefato e é sobre o próprio deck. Ver
"Ferramenta vs. peça vs. casca" em Relationships.

As decisões arquiteturais de todo o deck vivem em [`docs/adr/`](./docs/adr/). ADRs novos seguem o
template padrão em [`docs/adr/TEMPLATE.md`](./docs/adr/TEMPLATE.md) — uma decisão por arquivo, em
inglês.

## Contexts

- [ASCII//Convert](./apps/ascii/CONTEXT.md) — converte uma Source Image ou Live Source num
  canvas de arte ASCII interativo, com preview em tempo real e Export.
- [GLITCH//Studio](./apps/glitch/CONTEXT.md) — aplica um pipeline de efeitos de glitch
  (pixel sort, RGB split, scanlines, corrupção de blocos) sobre uma imagem ou webcam, com
  preview em tempo real, presets e Export.
- [GOLEM//Console](./apps/golem/CONTEXT.md) — um *fantasy computer* de 32 bits: assembler,
  emulador e um Console de linha de comando, com registradores, memória e Terminal visíveis
  ao vivo durante a execução. **v3 completo** — v1 (#133) trouxe as 42 instruções, o assembler e o
  Console; v2 (#203) fechou a unidade 2 inteira, com interrupções despachando para ISRs escritas
  pelo usuário e os dispositivos memory-mapped (Watchdog, FPU) no painel DEVICES; v3 (#233) fechou a
  unidade 3 e o projeto, com o cache como *lente de classificador* — não dá nada novo à máquina, não
  custa tempo, nunca serve um valor, só classifica cada acesso como Hit ou Miss (ADR 0023). O teto é
  princípio, não pendência: **sem oráculo, sem feature** (ADR 0019).
- **SPRAWL//Atlas** (`apps/sprawl`) — o mapa de capacidade de troca de dados do mundo como luz:
  cada pixel vale N gigabytes, a janela logarítmica é contínua, e em `1 px = 1 GB` a tela satura
  em branco (OVERFLOW) até você reescalar mais grosso e a estrutura emergir. Inspirado na passagem
  do *Neuromancer*. É a **primeira peça, não ferramenta**, do deck — não consome material do
  usuário, e a régua de sucesso é a primeira tela, não a retenção (ADR 0021). Dado real via
  snapshot vendorizado do PeeringDB (ADR 0022). **v1 completo** (`apps/sprawl`, #225–#230): abre em
  OVERFLOW sobre o snapshot real, você reescreve a escala mais grossa (wheel/drag/setas) e a
  estrutura emerge; labels de cidade + hover orientam sem basemap; `B` liga o gabarito de costa
  conquistado; e o export é um link que abre o outro na mesma escala. Eixo de tempo e viewport
  pan/zoom ficam adiados (ADR 0021).

## Shared package

- [Deck Kit](./packages/deck-kit/CONTEXT.md) (`@cyberdeck/deck-kit`) — a casca compartilhada sobre a
  qual todo programa do deck é montado: a linguagem visual (design tokens + Tailwind preset), os
  primitivos de `ui/`, os hooks e utils neutros de framework, e a plumbing genérica de browser
  (mecanismo de erro operacional, core de Recording). **Não** é um core de domínio — o pipeline de
  cada app (conversão ASCII, Effects de glitch) fica no app. Escopo e fronteiras em ADR 0014;
  `EmptyStateHero` e `Tooltip` cruzaram numa segunda leva (ADR 0015). A linguagem visual deixou de
  ser uma paleta só e virou um conjunto nomeado de **Themes** — sete: `ice`, `construct`, `chiba`,
  `kuang`, `ougou`, `solitude`, `onyx` — com um contrato de contraste que todo Theme precisa cumprir
  (ADR 0024). O roster com o caráter de cada um está no `CONTEXT.md` do Deck Kit.

## Relationships

- **Linguagem visual compartilhada** — ambos os apps herdam do Deck Kit os design tokens
  (`tokens.css`), o Tailwind preset, os primitivos de `ui/`, `cn()` e o sistema de toast.
- **Só a superfície com diff vazio + dois callers foi extraída** — ADR 0011 tolerou a duplicação
  como sinal até o segundo app tornar as junções óbvias; ADR 0014 registra que o gatilho disparou
  e move só o que estava provado. O que diverge de propósito fica copiado (webcam-state, os nomes
  de `outputFilename`) — sinal, não dívida.
- **Paridade de interação entre os programas** — GLITCH//Studio provou um modelo de Source mais
  limpo (entrada única pelo empty state, controles ao vivo no overlay do canvas), e ADR 0015 o
  torna canônico e converge o ASCII//Convert nele. A convergência tornou `EmptyStateHero` e
  `Tooltip` diff-vazio, que então cruzaram pro Deck Kit — o `EmptyStateHero` por convergência
  deliberada antes da extração, o `Tooltip` como o "segundo caller" que ADR 0014 já previa. A
  paridade é de *casca e padrão*, não de features: AI Analyze (ASCII) e Presets/Seed (GLITCH)
  divergem de propósito. **Mirror** deixou de ser divergência e virou feature compartilhada
  (ADR 0016) — e desde #124 também no *mecanismo*: os dois espelham os pixels no `drawImage` de
  amostragem, antes da conversão, não o preview via CSS. Preview, PNG e TXT saem iguais. A convergência do control
  panel (Presets na frente, tweaks atrás de um `advanced` disclosure) também passou a valer pro
  ASCII, casando com o modelo que o GLITCH já usava.
- **Mesmo padrão de núcleo** — ambos os pipelines são funções puras sobre `ImageData`
  (imperative shell / functional core), com o único ponto de escrita no canvas visível
  isolado no passo de Paint. O GOLEM//Console segue o mesmo padrão com outra moeda: o core
  puro é `step(machine) → machine` e o assembler (`Source → Image`), e a casca é o driver de
  rAF que dirige o `step` no Clock escolhido.
- **O GOLEM//Console diverge na gramática de controle, de propósito** — não tem control panel
  nem `advanced` disclosure: todo controle passa pelo Console, e os painéis são read-only
  (ADR 0018). A paridade continua sendo de *casca e padrão*, não de widget — o Console **é** o
  control panel desse programa, e os painéis de estado são o seu canvas. Ele também rompe com
  a forma dos outros dois em algo mais fundo: ASCII e GLITCH são *stateless* (mesma entrada,
  mesma saída, sem tempo), enquanto o GOLEM é uma máquina de estados no tempo. Por isso o
  Export não é um artefato visual — é um link compartilhável com o Source, e `.hex`/trace como
  comandos.
- **Ferramenta vs. peça vs. casca — o deck admite uma exceção, e só uma** — ASCII, GLITCH e GOLEM são
  *ferramentas*: cada um consome material do usuário e vale `f(seu_input)`, e a régua é a
  retenção. SPRAWL//Atlas é a primeira **peça**: não tem entrada de usuário, o "material" é a
  função de mapeamento (onde a janela log cai, o viewport), e a régua é a *primeira tela* (ADR
  0021). Ele ainda obedece ao padrão de núcleo do deck — o core puro é `project(dataset, escala,
  viewport) → RenderInstruction[]`, stateless-no-tempo como ASCII/GLITCH — e por isso o Export é
  um link que codifica escala+viewport, na mesma moeda do GOLEM. A fronteira é dura: uma segunda
  peça é o deck perdendo identidade; o default para "mais uma peça" é não. O dado real chega por
  um pipeline novo pro deck — snapshot vendorizado do PeeringDB, commitado e datado (ADR 0022) —
  que fica no app, não no Deck Kit, até um segundo consumidor provar a junção.
  A **casca** é a terceira categoria, e ela não gasta essa exceção. O hub (`apps/deck`) não é
  ferramenta nem peça por **três cláusulas, todas necessárias**: não consome material do usuário,
  não produz artefato, e **é sobre o próprio deck**. As duas primeiras sozinhas não bastariam, e a
  história do deck é a prova — peça não precisa de entrada nem de artefato (a régua dela é a primeira
  tela), e o SPRAWL//Atlas *como a ADR 0021 o admitiu* passava nas duas: o link e o PNG só chegaram
  depois (#230). Uma definição feita só de ausências chamaria a peça de casca no dia em que ela foi
  admitida. **A terceira cláusula é a que separa:** peça é sobre um *assunto* — o SPRAWL é sobre a
  capacidade de troca do mundo, e é por isso que a função de mapeamento é material de verdade —
  enquanto casca não tem assunto nenhum além do deck. Por isso o hub fica *fora* da cerca da ADR 0021
  em vez de passar por ela, e SPRAWL//Atlas continua sendo a única peça (ADR 0025). O teste que uma
  proposta futura responde não é estético e sim seco: *pega material do usuário, devolve artefato, ou
  é sobre outra coisa que não este deck?* Qualquer um dos três e é programa — a cerca da ADR 0021
  vale inteira e o default continua sendo não. A casca também se cerca: o hub nunca pode ganhar
  upload, drop zone, webcam, export, download, link que codifica algo montado nele, core de domínio
  (domínio é assunto), programa rodando dentro (iframe, "mini mode") nem maquinaria de retenção
  (favoritos, histórico, contas). Galeria de output de usuário não entra nessa lista porque não é
  item novo e sim a terceira cláusula mordendo — mas é a forma que a proposta vai tomar de verdade,
  então vale dizer: ela parece casca, consome material do usuário por procuração, e transforma esse
  material na coisa que você veio ver.
- **O Theme para onde começam os pixels do usuário** — a linguagem visual virou um conjunto nomeado
  de Themes (sete deles, do `ice` ao `onyx`), e a fronteira do que eles alcançam não é nova: é a mesma
  linha que a ADR 0013 traçou pros overlays de canvas, reusada pra outro fim. **O deck pode
  recolorir o que ele desenhou; não pode recolorir o que você trouxe.** Casca, painéis, o fósforo do
  Terminal e os badges seguem o Theme; a Source, a saída da Chain do GLITCH e os Color Modes do
  ASCII não. SPRAWL//Atlas fica **fora por decisão registrada** — os pixels dele não são casca nem
  do usuário, são a peça, e a ADR 0021 diz que a peça *é* luz ciano contra o escuro (ADR 0024). O
  hub é o caso mais fácil da régua, não o mais difícil: ele é *inteiro* aquilo que o deck desenhou,
  então **seta o atributo** como as três ferramentas, com o mesmo script de pre-paint inline e o
  mesmo controle (ADR 0025). E é ele que torna visível uma coisa que a ADR 0024 pôde supor: a
  seleção persiste **por origem** porque "nenhum programa linka pro outro" — o hub é exatamente o
  que linka. Escolher `chiba` na porta e abrir o ASCII em `ice` é consequência registrada, não bug.
- **Color Mode (ASCII) ≠ Theme (deck)** — os dois são "o esquema de cores", e o ASCII é o único
  programa onde os dois controles ficam à vista. Color Mode pinta a arte do usuário; Theme pinta a
  casca. Nenhum Theme do roster se chama `matrix` ou `neon` porque esses dois já são Color Modes —
  nomes vêm do vocabulário interno das ficções, nunca do título delas.
- **"Shell" e "Console" não são sinônimos aqui** — *shell* continua significando a camada
  impura do código (imperative shell / functional core) em todo o deck; **Console** é o painel
  de linha de comando do GOLEM. E, dentro do GOLEM, **Terminal** é o dispositivo de saída da
  máquina simulada, não a linha de comando.
- **"Casca" tem três sentidos, e a pergunta que os separa é *o que tem dentro*** — em inglês os ADRs
  escrevem *chrome* e o vocabulário fica limpo (`chrome` ≠ `shell` ≠ `Console`); em português a
  palavra acumulou três usos e todos os três estão neste arquivo. **(1)** O **Deck Kit** é "a casca
  compartilhada sobre a qual todo programa do deck é montado" — casca como *código*, aquilo em que
  você monta em cima (ADR 0014). **(2)** Dentro de um programa, casca é o que o deck **desenhou em
  volta** dos pixels do usuário, por oposição a eles — casca como *fronteira de pintura*, e é essa
  que o Theme alcança (ADR 0013, ADR 0024). **(3)** No nível do deck, casca é a **categoria** do hub:
  casca **sem nada dentro**, nem pixel de usuário nem assunto próprio (ADR 0025). Ou seja: o Kit é
  casca que se monta em cima, a casca de um programa envolve a obra do usuário, e a do hub não
  envolve nada — é justamente o vazio que faz dela uma terceira categoria.
